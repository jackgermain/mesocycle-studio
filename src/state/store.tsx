import React, { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import { buildInitialProgram, clientProfile, buildInitialMeals, buildInitialWeighIns, buildSelfProfile } from "../data/mockData";
import type { ClientProfile, Equipment, LoggedFoodItem, MealSection, Program, RemovalRecord, WeighIn, WorkSet } from "../data/types";
import { nearestValidLoad } from "../screens/exerciseHelpers";
import { dayDisplayTitle } from "../data/dayNumbering";
import { findInviteForClient } from "../shared/invites";

/** The one client with a full mock training history baked in. Every other profile id (e.g. a coach training themself) starts blank. */
export const DEFAULT_PROFILE_ID = "marcus";

function storageKeyFor(profileId: string): string {
  return profileId === DEFAULT_PROFILE_ID ? "mesocycle-client-state-v4" : `mesocycle-client-state-v4-${profileId}`;
}

export interface AppState {
  onboarded: boolean;
  profile: ClientProfile;
  program: Program;
  removals: RemovalRecord[];
  meals: MealSection[];
  weighIns: WeighIn[];
  toast: string | null;
}

function defaultStateFor(profileId: string): AppState {
  if (profileId === DEFAULT_PROFILE_ID) {
    return {
      onboarded: false,
      profile: clientProfile,
      program: buildInitialProgram(),
      removals: [],
      meals: buildInitialMeals(),
      weighIns: buildInitialWeighIns(),
      toast: null,
    };
  }
  const profile = buildSelfProfile(profileId);
  if (findInviteForClient(profileId)) {
    // A real client invited by their coach — nothing prescribed for them yet, unlike the
    // "train yourself" starter below. The coach builds this from the Programs tab.
    return {
      onboarded: false,
      profile,
      program: { name: "Your program", totalWeeks: 0, coachName: "Dana", weeks: [] },
      removals: [],
      meals: [],
      weighIns: [],
      toast: null,
    };
  }
  return {
    onboarded: false,
    profile,
    program: buildInitialProgram({ name: "My Training", coachName: profile.name }),
    removals: [],
    meals: [],
    weighIns: [],
    toast: null,
  };
}

function loadInitial(profileId: string): AppState {
  try {
    const raw = localStorage.getItem(storageKeyFor(profileId));
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore corrupt storage
  }
  return defaultStateFor(profileId);
}

type Action =
  | { type: "ONBOARD"; profile: Partial<ClientProfile> }
  | { type: "SET_PROGRAM"; program: Program }
  | { type: "TICK_SET"; dayId: string; exerciseId: string; setId: string; actual: { reps: number; load: number | null; clusterBlocks?: number[]; assistanceSplit?: { unassisted: number; assisted: number } } }
  | { type: "EDIT_SET_TARGET"; dayId: string; exerciseId: string; setId: string; reps?: number; load?: number }
  | { type: "SET_CHECKED"; dayId: string; exerciseId: string; setId: string; checked: boolean }
  | { type: "REMOVE_SET"; dayId: string; exerciseId: string; setId: string; reason: string }
  | { type: "REORDER_EXERCISES"; dayId: string; order: string[] }
  | { type: "ADD_SET"; dayId: string; exerciseId: string; warmup?: boolean }
  | { type: "SWAP_EXERCISE"; exerciseKey: string; replacement: { name: string; muscle: string; equipment: Equipment; hasVideo: boolean } }
  | { type: "SET_FEEDBACK_DONE"; dayId: string }
  | { type: "SET_SORENESS_DONE"; dayId: string }
  | { type: "ADD_FOOD_ITEM"; mealId: string; item: LoggedFoodItem }
  | { type: "REMOVE_FOOD_ITEM"; mealId: string; itemId: string }
  | { type: "ADD_MEAL"; name: string }
  | { type: "LOG_WEIGHIN"; date: string; weight: number }
  | { type: "TOGGLE_PORTION"; mealId: string; category: import("../data/types").PortionCategory }
  | { type: "SHOW_TOAST"; message: string }
  | { type: "CLEAR_TOAST" }
  | { type: "RESET" };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "ONBOARD":
      return { ...state, onboarded: true, profile: { ...state.profile, ...action.profile } };
    case "SET_PROGRAM":
      return { ...state, program: action.program };
    case "TICK_SET": {
      const program = structuredClone(state.program);
      for (const week of program.weeks) {
        const day = week.days.find((d) => d.id === action.dayId);
        if (!day) continue;
        const ex = day.exercises[action.exerciseId];
        if (!ex) continue;
        const set = ex.sets.find((s) => s.id === action.setId);
        if (!set) continue;
        set.checked = true;
        set.actual = action.actual;
        delete set.removed;
      }
      return { ...state, program };
    }
    case "EDIT_SET_TARGET": {
      const program = structuredClone(state.program);
      for (const week of program.weeks) {
        const day = week.days.find((d) => d.id === action.dayId);
        if (!day) continue;
        const ex = day.exercises[action.exerciseId];
        if (!ex) continue;
        const set = ex.sets.find((s) => s.id === action.setId);
        if (!set) continue;
        if (set.actual) {
          if (action.reps !== undefined) set.actual.reps = action.reps;
          if (action.load !== undefined) set.actual.load = action.load;
        } else {
          set.actual = {
            reps: action.reps ?? (typeof set.prescribed.reps === "number" ? set.prescribed.reps : 0),
            load: action.load ?? set.prescribed.load,
          };
        }
      }
      return { ...state, program };
    }
    case "SET_CHECKED": {
      const program = structuredClone(state.program);
      for (const week of program.weeks) {
        const day = week.days.find((d) => d.id === action.dayId);
        if (!day) continue;
        const ex = day.exercises[action.exerciseId];
        if (!ex) continue;
        const set = ex.sets.find((s) => s.id === action.setId);
        if (!set) continue;
        set.checked = action.checked;
        delete set.removed;
        if (action.checked && !set.actual) {
          set.actual = {
            reps: typeof set.prescribed.reps === "number" ? set.prescribed.reps : parseInt(String(set.prescribed.reps)) || 0,
            load: set.prescribed.load,
          };
        }
      }
      return { ...state, program };
    }
    case "REMOVE_SET": {
      const program = structuredClone(state.program);
      let removal: RemovalRecord | null = null;
      for (const week of program.weeks) {
        const day = week.days.find((d) => d.id === action.dayId);
        if (!day) continue;
        const ex = day.exercises[action.exerciseId];
        if (!ex) continue;
        const set = ex.sets.find((s) => s.id === action.setId);
        if (!set) continue;
        set.checked = true;
        set.removed = { reason: action.reason };
        set.actual = null;
        removal = { exerciseName: ex.name, setIndex: set.index, reason: action.reason, dayLabel: dayDisplayTitle(day) };
      }
      return { ...state, program, removals: removal ? [...state.removals, removal] : state.removals };
    }
    case "ADD_SET": {
      const program = structuredClone(state.program);
      for (const week of program.weeks) {
        const day = week.days.find((d) => d.id === action.dayId);
        if (!day) continue;
        const ex = day.exercises[action.exerciseId];
        if (!ex || ex.sets.length === 0) continue;

        if (action.warmup) {
          const firstWork = ex.sets.find((s) => !s.isWarmup) ?? ex.sets[0];
          const workLoad = firstWork.actual?.load ?? firstWork.prescribed.load;
          const warmupLoad = workLoad === null ? null : nearestValidLoad(ex, workLoad * 0.5);
          const warmupSet: WorkSet = {
            ...structuredClone(firstWork),
            id: `${ex.id}-warmup-${Date.now()}`,
            index: 0,
            type: "straight",
            checked: false,
            actual: null,
            removed: undefined,
            isWarmup: true,
            lastWeek: undefined,
            prescribed: {
              ...structuredClone(firstWork.prescribed),
              reps: typeof firstWork.prescribed.reps === "number" ? Math.max(5, firstWork.prescribed.reps) : 10,
              load: warmupLoad,
              effort: { scale: firstWork.prescribed.effort.scale, value: "warm-up" },
              tempo: undefined,
              cluster: undefined,
            },
          };
          const insertAt = ex.sets.findIndex((s) => !s.isWarmup);
          ex.sets.splice(insertAt === -1 ? ex.sets.length : insertAt, 0, warmupSet);
        } else {
          const last = ex.sets[ex.sets.length - 1];
          const lastLoad = last.actual?.load ?? last.prescribed.load;
          ex.sets.push({
            ...structuredClone(last),
            id: `${ex.id}-extra-${Date.now()}`,
            index: ex.sets.filter((s) => !s.isWarmup).length + 1,
            checked: false,
            actual: null,
            removed: undefined,
            isWarmup: false,
            prescribed: { ...structuredClone(last.prescribed), load: lastLoad === null ? null : nearestValidLoad(ex, lastLoad) },
          });
        }
      }
      return { ...state, program };
    }
    case "SWAP_EXERCISE": {
      const program = structuredClone(state.program);
      for (const week of program.weeks) {
        for (const day of week.days) {
          if (day.status === "done") continue; // never rewrite logged history
          const ex = day.exercises[action.exerciseKey];
          if (!ex) continue;
          ex.name = action.replacement.name;
          ex.muscle = action.replacement.muscle;
          ex.equipment = action.replacement.equipment;
          ex.hasVideo = action.replacement.hasVideo;
          for (const set of ex.sets) {
            if (set.checked) continue; // leave sets already logged this session alone
            if (set.prescribed.load !== null) set.prescribed.load = nearestValidLoad(ex, set.prescribed.load);
          }
          const topLoad = ex.sets[0]?.prescribed.load;
          ex.metaLine = `${ex.sets.length} sets · ${topLoad == null ? "bodyweight" : `${topLoad} lb`}`;
        }
      }
      return { ...state, program };
    }
    case "REORDER_EXERCISES": {
      const program = structuredClone(state.program);
      for (const week of program.weeks) {
        const day = week.days.find((d) => d.id === action.dayId);
        if (!day) continue;
        day.order = action.order;
      }
      return { ...state, program };
    }
    case "SET_FEEDBACK_DONE": {
      const program = structuredClone(state.program);
      for (const week of program.weeks) {
        const day = week.days.find((d) => d.id === action.dayId);
        if (!day) continue;
        day.feedbackDone = true;
        day.status = "done";
        const doneSets = Object.values(day.exercises).reduce((n, e) => n + e.sets.filter((s) => s.checked).length, 0);
        day.log = { sessionSets: doneSets, sessionTotal: doneSets, tonnage: "12.4t", timeMin: 48, pumpAvg: 4 };
      }
      return { ...state, program };
    }
    case "SET_SORENESS_DONE": {
      const program = structuredClone(state.program);
      for (const week of program.weeks) {
        const day = week.days.find((d) => d.id === action.dayId);
        if (!day) continue;
        day.sorenessDone = true;
        if (day.status === "visible") day.status = "today";
      }
      return { ...state, program };
    }
    case "ADD_FOOD_ITEM": {
      const meals = state.meals.map((m) => (m.id === action.mealId ? { ...m, items: [...m.items, action.item] } : m));
      return { ...state, meals };
    }
    case "REMOVE_FOOD_ITEM": {
      const meals = state.meals.map((m) => (m.id === action.mealId ? { ...m, items: m.items.filter((i) => i.id !== action.itemId) } : m));
      return { ...state, meals };
    }
    case "ADD_MEAL": {
      const meals = [...state.meals, { id: `meal-${Date.now()}`, name: action.name, items: [] }];
      return { ...state, meals };
    }
    case "LOG_WEIGHIN": {
      const existing = state.weighIns.find((w) => w.date === action.date);
      const weighIns = existing
        ? state.weighIns.map((w) => (w.date === action.date ? { ...w, weight: action.weight } : w))
        : [...state.weighIns, { date: action.date, weight: action.weight }];
      weighIns.sort((a, b) => a.date.localeCompare(b.date));
      return { ...state, weighIns };
    }
    case "TOGGLE_PORTION": {
      const meals = state.meals.map((m) => {
        if (m.id !== action.mealId) return m;
        const hit = m.portionsHit ?? [];
        const next = hit.includes(action.category) ? hit.filter((c) => c !== action.category) : [...hit, action.category];
        return { ...m, portionsHit: next };
      });
      return { ...state, meals };
    }
    case "SHOW_TOAST":
      return { ...state, toast: action.message };
    case "CLEAR_TOAST":
      return { ...state, toast: null };
    case "RESET":
      return { onboarded: false, profile: clientProfile, program: buildInitialProgram(), removals: [], meals: buildInitialMeals(), weighIns: buildInitialWeighIns(), toast: null };
    default:
      return state;
  }
}

interface StoreCtx {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const Ctx = createContext<StoreCtx | null>(null);
const ProfileIdCtx = createContext<string>(DEFAULT_PROFILE_ID);

/** Which profile's data this StoreProvider is backed by — "marcus" (the seeded demo client) by default, or any other id for a separate, independently-stored identity (e.g. the coach training themself). */
export function StoreProvider({ children, profileId = DEFAULT_PROFILE_ID }: { children: React.ReactNode; profileId?: string }) {
  const [state, dispatch] = useReducer(reducer, profileId, loadInitial);

  useEffect(() => {
    localStorage.setItem(storageKeyFor(profileId), JSON.stringify(state));
  }, [state, profileId]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return (
    <ProfileIdCtx.Provider value={profileId}>
      <Ctx.Provider value={value}>{children}</Ctx.Provider>
    </ProfileIdCtx.Provider>
  );
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

/** The id of whichever profile the enclosing StoreProvider is backed by. */
export function useProfileId() {
  return useContext(ProfileIdCtx);
}

export function findDay(program: Program, dayId: string) {
  for (const week of program.weeks) {
    const day = week.days.find((d) => d.id === dayId);
    if (day) return { day, week };
  }
  return null;
}

export interface LiftSummary {
  name: string;
  muscle: string;
  hasVideo: boolean;
  occurrences: number;
  lastLoggedTopSet: string | null;
}

export interface LiftHistoryEntry {
  weekNumber: number;
  dayLabel: string;
  dayStatus: string;
  topSet: string;
  setsLogged: number;
  setsPrescribed: number;
}

/** Every exercise the program has assigned so far (only days already written appear — future weeks stay unknown until opened). */
export function getAllLifts(program: Program): LiftSummary[] {
  const map = new Map<string, LiftSummary>();
  for (const week of program.weeks) {
    for (const day of week.days) {
      for (const ex of Object.values(day.exercises)) {
        const existing = map.get(ex.name);
        const loggedSets = ex.sets.filter((s) => s.checked && !s.removed && s.actual);
        const top = loggedSets.length
          ? loggedSets.reduce((best, s) => ((s.actual?.load ?? 0) > (best.actual?.load ?? 0) ? s : best))
          : null;
        const topLabel = top ? (top.actual?.load ? `${top.actual.load} × ${top.actual.reps}` : `${top.actual?.reps} reps`) : null;
        if (existing) {
          existing.occurrences += 1;
          if (topLabel) existing.lastLoggedTopSet = topLabel;
        } else {
          map.set(ex.name, { name: ex.name, muscle: ex.muscle, hasVideo: ex.hasVideo, occurrences: 1, lastLoggedTopSet: topLabel });
        }
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => a.muscle.localeCompare(b.muscle) || a.name.localeCompare(b.name));
}

export function getLiftHistory(program: Program, name: string): LiftHistoryEntry[] {
  const entries: LiftHistoryEntry[] = [];
  for (const week of program.weeks) {
    for (const day of week.days) {
      const ex = Object.values(day.exercises).find((e) => e.name === name);
      if (!ex) continue;
      const loggedSets = ex.sets.filter((s) => s.checked && !s.removed && s.actual);
      const top = loggedSets.length ? loggedSets.reduce((best, s) => ((s.actual?.load ?? 0) > (best.actual?.load ?? 0) ? s : best)) : null;
      entries.push({
        weekNumber: week.number,
        dayLabel: `${dayDisplayTitle(day)} · ${day.dow}`,
        dayStatus: day.status,
        topSet: top ? (top.actual?.load ? `${top.actual.load} × ${top.actual.reps}` : `${top.actual?.reps} reps`) : "not logged yet",
        setsLogged: loggedSets.length,
        setsPrescribed: ex.sets.length,
      });
    }
  }
  return entries.sort((a, b) => a.weekNumber - b.weekNumber);
}

export function allSetsResolved(exercise: { sets: WorkSet[] }) {
  return exercise.sets.every((s) => s.checked);
}
