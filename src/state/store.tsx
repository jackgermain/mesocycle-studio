import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { buildSelfProfile } from "../data/mockData";
import type { ClientProfile, Equipment, LoggedFoodItem, MealSection, Program, RemovalRecord, WeighIn, WorkSet } from "../data/types";
import type { FoodItem } from "../data/foodDatabase";
import { nearestValidLoad } from "../screens/exerciseHelpers";
import { dayDisplayTitle } from "../data/dayNumbering";
import { supabase } from "../lib/supabase";
import { withDerivedStatuses } from "../shared/dayStatus";
import { insertWarmupSet } from "../shared/programEdits";

export interface AppState {
  onboarded: boolean;
  profile: ClientProfile;
  program: Program;
  /** Set by the coach when they queue a new program to start once the current one's block ends, instead
   * of replacing it immediately. Promoted to `program` automatically once every day in the current one
   * is done or removed — see PROMOTE_NEXT_PROGRAM. */
  nextProgram: Program | null;
  removals: RemovalRecord[];
  meals: MealSection[];
  weighIns: WeighIn[];
  /** Foods this person has manually entered themselves (name + macros, no database match) -- searchable
   * alongside the built-in list and live database results from then on. */
  customFoods: FoodItem[];
  toast: string | null;
}

/** A brand-new account's starting state — nothing prescribed yet, waiting on either the coach to build a
 * program or (for a friend/family account) the person to build/clone their own from /build. */
function buildBlankState(ownerName: string, coachName: string): AppState {
  return {
    onboarded: false,
    profile: buildSelfProfile(ownerName),
    program: { name: "Your program", totalWeeks: 0, coachName, weeks: [] },
    nextProgram: null,
    removals: [],
    meals: [],
    weighIns: [],
    customFoods: [],
    toast: null,
  };
}

type Action =
  | { type: "HYDRATE"; state: AppState }
  | { type: "ONBOARD"; profile: Partial<ClientProfile> }
  | { type: "SET_PROGRAM"; program: Program }
  | { type: "RENAME_PROGRAM"; name: string }
  | { type: "PROMOTE_NEXT_PROGRAM" }
  | { type: "SET_NUTRITION_PROTOCOL"; protocol: Pick<ClientProfile, "weighInsPerWeek" | "weighInDays" | "nutritionMode" | "macroTargets" | "portionTargets" | "rateTargetLabel"> }
  | { type: "TICK_SET"; dayId: string; exerciseId: string; setId: string; actual: { reps: number; load: number | null; clusterBlocks?: number[]; assistanceSplit?: { unassisted: number; assisted: number } } }
  | { type: "EDIT_SET_TARGET"; dayId: string; exerciseId: string; setId: string; reps?: number; load?: number }
  | { type: "SET_EXERCISE_REST"; dayId: string; exerciseId: string; restSec: number }
  | { type: "SET_CHECKED"; dayId: string; exerciseId: string; setId: string; checked: boolean }
  | { type: "REMOVE_SET"; dayId: string; exerciseId: string; setId: string; reason: string }
  | { type: "REORDER_EXERCISES"; dayId: string; order: string[] }
  | { type: "ADD_SET"; dayId: string; exerciseId: string; warmup?: boolean }
  | { type: "SWAP_EXERCISE"; exerciseKey: string; replacement: { name: string; muscle: string; equipment: Equipment; hasVideo: boolean }; scope: "day" | "mesocycle"; dayId?: string }
  | { type: "SET_FEEDBACK_DONE"; dayId: string }
  | { type: "SET_SORENESS_DONE"; dayId: string }
  | { type: "ADD_FOOD_ITEM"; mealId: string; item: LoggedFoodItem }
  | { type: "REMOVE_FOOD_ITEM"; mealId: string; itemId: string }
  | { type: "ADD_MEAL"; name: string }
  | { type: "REMOVE_MEAL"; mealId: string }
  | { type: "ADD_CUSTOM_FOOD"; food: FoodItem }
  | { type: "REMOVE_CUSTOM_FOOD"; foodId: string }
  | { type: "LOG_WEIGHIN"; date: string; weight: number }
  | { type: "TOGGLE_PORTION"; mealId: string; category: import("../data/types").PortionCategory }
  | { type: "SHOW_TOAST"; message: string }
  | { type: "CLEAR_TOAST" };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "HYDRATE":
      return action.state;
    case "ONBOARD":
      return { ...state, onboarded: true, profile: { ...state.profile, ...action.profile } };
    case "SET_PROGRAM":
      return { ...state, program: action.program };
    case "RENAME_PROGRAM":
      return { ...state, program: { ...state.program, name: action.name } };
    case "PROMOTE_NEXT_PROGRAM":
      if (!state.nextProgram) return state;
      return { ...state, program: state.nextProgram, nextProgram: null };
    case "SET_NUTRITION_PROTOCOL":
      return { ...state, profile: { ...state.profile, ...action.protocol } };
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
    case "SET_EXERCISE_REST": {
      const program = structuredClone(state.program);
      for (const week of program.weeks) {
        const day = week.days.find((d) => d.id === action.dayId);
        if (!day) continue;
        const ex = day.exercises[action.exerciseId];
        if (!ex) continue;
        for (const set of ex.sets) set.prescribed.restSec = action.restSec;
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
          insertWarmupSet(ex, String(Date.now()));
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
          // "day" swaps just today's session and leaves the rest of the block on the original exercise --
          // the right call for a one-off (equipment taken, a tweak) as opposed to a lasting change.
          if (action.scope === "day" && day.id !== action.dayId) continue;
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
      // Date.now() alone collides when several ADD_MEAL actions dispatch in the same tick (e.g. seeding
      // Breakfast/Lunch/Dinner at once on nutrition setup) -- both land in the same millisecond.
      const meals = [...state.meals, { id: `meal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: action.name, items: [] }];
      return { ...state, meals };
    }
    case "REMOVE_MEAL": {
      const meals = state.meals.filter((m) => m.id !== action.mealId);
      return { ...state, meals };
    }
    case "ADD_CUSTOM_FOOD": {
      return { ...state, customFoods: [action.food, ...state.customFoods] };
    }
    case "REMOVE_CUSTOM_FOOD": {
      return { ...state, customFoods: state.customFoods.filter((f) => f.id !== action.foodId) };
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
    default:
      return state;
  }
}

interface StoreCtx {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  /** False until the initial fetch from Supabase has resolved (either hydrated with real data or confirmed blank). */
  ready: boolean;
}

const Ctx = createContext<StoreCtx | null>(null);
const AccountIdCtx = createContext<string>("");

/** Backs the client app with a specific account's real, cross-device data in Supabase — the account being
 * viewed (yourself, or a specific client when the coach is looking at their page) rather than a
 * localStorage key. `ownerName`/`coachName` only matter the very first time this account is opened, to
 * seed a sensible blank starting state. */
export function StoreProvider({
  children,
  accountId,
  ownerName,
  coachName,
}: {
  children: React.ReactNode;
  accountId: string;
  ownerName: string;
  coachName: string;
}) {
  const [state, dispatch] = useReducer(reducer, undefined, () => buildBlankState(ownerName, coachName));
  const [ready, setReady] = useState(false);
  const readyRef = useRef(false);

  useEffect(() => {
    let active = true;
    setReady(false);
    readyRef.current = false;
    supabase
      .from("client_state")
      .select("data")
      .eq("account_id", accountId)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        const remote = data?.data as Partial<AppState> | undefined;
        if (remote && remote.profile && remote.program) {
          // Merge onto buildBlankState() rather than trusting `remote` to have every field — a row saved
          // before a field existed would otherwise hydrate as undefined and crash the first reader of it.
          dispatch({ type: "HYDRATE", state: { ...buildBlankState(ownerName, coachName), ...remote } });
        }
        readyRef.current = true;
        setReady(true);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  useEffect(() => {
    if (!readyRef.current) return;
    supabase
      .from("client_state")
      .upsert({ account_id: accountId, data: state, updated_at: new Date().toISOString() })
      .then(({ error }) => {
        if (error) console.error("Failed to save client_state", error);
      });
  }, [state, accountId]);

  // Day status is derived from the calendar on read rather than trusted from the stored blob -- see
  // shared/dayStatus.ts. Done here so every consumer (TodayRedirect, DayDetail, Progress, the calendar,
  // the nutrition tab's training-day check) sees the corrected program without each having to know.
  const program = useMemo(() => withDerivedStatuses(state.program), [state.program]);
  const value = useMemo(() => ({ state: { ...state, program }, dispatch, ready }), [state, program, ready]);
  return (
    <AccountIdCtx.Provider value={accountId}>
      <Ctx.Provider value={value}>{children}</Ctx.Provider>
    </AccountIdCtx.Provider>
  );
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

/** The account id of whichever person the enclosing StoreProvider is backed by. */
export function useProfileId() {
  return useContext(AccountIdCtx);
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
