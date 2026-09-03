import React, { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import { clients as initialClients, programs as initialPrograms, threads as initialThreads } from "./mockData";
import type { CoachClient, CoachProgram, CoachThread, ExerciseKind, LibraryExercise, LoadMode } from "./types";
import { LOAD_DEFAULT } from "./loadMode";
import { CARDIO_DEFAULT } from "./cardio";
import { defaultRestSec } from "./rest";

const STORAGE_KEY = "mesocycle-coach-state-v6";

export interface CoachState {
  clients: CoachClient[];
  programs: CoachProgram[];
  threads: CoachThread[];
  customExercises: LibraryExercise[];
  toast: string | null;
}

function loadInitial(): CoachState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore corrupt storage
  }
  return { clients: initialClients, programs: initialPrograms, threads: initialThreads, customExercises: [], toast: null };
}

type Action =
  | { type: "ADD_CLIENT"; client: CoachClient }
  | { type: "APPLY_FLAG"; clientId: string; flagId: string }
  | { type: "DISMISS_FLAG"; clientId: string; flagId: string }
  | { type: "PUBLISH_PROGRAM"; programId: string; visibility: "private" | "public" }
  | { type: "ADD_PROGRAM"; program: CoachProgram }
  | { type: "SET_PROGRAM_NAME"; programId: string; name: string }
  | { type: "SET_PROGRAM_TEMPLATE"; programId: string; isTemplate: boolean }
  | { type: "SEND_MESSAGE"; threadId: string; text: string }
  | { type: "MARK_READ"; threadId: string }
  | { type: "ADD_CUSTOM_EXERCISE"; exercise: LibraryExercise }
  | { type: "SET_DAYS_PER_WEEK"; programId: string; count: number }
  | { type: "RENAME_PROGRAM_DAY"; programId: string; dayId: string; name: string }
  | { type: "ADD_PROGRAM_EXERCISE"; programId: string; dayId: string; exercise: { name: string; muscle: string; kind?: ExerciseKind } }
  | { type: "REMOVE_PROGRAM_EXERCISE"; programId: string; dayId: string; exerciseId: string }
  | { type: "SET_PROGRAM_LOAD_MODE"; programId: string; loadMode: LoadMode }
  | { type: "SET_EXERCISE_LOAD_OVERRIDE"; programId: string; dayId: string; exerciseId: string; loadMode: LoadMode | null }
  | { type: "SET_EXERCISE_REST"; programId: string; dayId: string; exerciseId: string; restSec: number }
  | { type: "REORDER_PROGRAM_EXERCISES"; programId: string; dayId: string; order: string[] }
  | { type: "ADD_PROGRAM_SET"; programId: string; dayId: string; exerciseId: string; warmup?: boolean }
  | { type: "REMOVE_PROGRAM_SET"; programId: string; dayId: string; exerciseId: string; setId: string }
  | { type: "EDIT_PROGRAM_SET"; programId: string; dayId: string; exerciseId: string; setId: string; reps?: number; loadValue?: number; warmup?: boolean; workSec?: number; restSec?: number }
  | { type: "SHOW_TOAST"; message: string }
  | { type: "CLEAR_TOAST" };

function reducer(state: CoachState, action: Action): CoachState {
  switch (action.type) {
    case "ADD_CLIENT":
      return { ...state, clients: [action.client, ...state.clients] };
    case "APPLY_FLAG":
    case "DISMISS_FLAG": {
      const clients = state.clients.map((c) => (c.id === action.clientId ? { ...c, flags: c.flags.filter((f) => f.id !== action.flagId) } : c));
      return { ...state, clients };
    }
    case "PUBLISH_PROGRAM": {
      const programs = state.programs.map((p) =>
        p.id === action.programId ? { ...p, status: "published" as const, visibility: p.isTemplate ? "private" : action.visibility } : p
      );
      return { ...state, programs };
    }
    case "ADD_PROGRAM":
      return { ...state, programs: [action.program, ...state.programs] };
    case "SET_PROGRAM_NAME": {
      const programs = state.programs.map((p) => (p.id === action.programId ? { ...p, name: action.name } : p));
      return { ...state, programs };
    }
    case "SET_PROGRAM_TEMPLATE": {
      const programs = state.programs.map((p) =>
        p.id === action.programId ? { ...p, isTemplate: action.isTemplate, visibility: action.isTemplate ? ("private" as const) : p.visibility } : p
      );
      return { ...state, programs };
    }
    case "SEND_MESSAGE": {
      const threads = state.threads.map((t) =>
        t.id === action.threadId ? { ...t, bubbles: [...t.bubbles, { from: "coach" as const, text: action.text, time: "now" }], preview: action.text, unread: false } : t
      );
      return { ...state, threads };
    }
    case "MARK_READ": {
      const threads = state.threads.map((t) => (t.id === action.threadId ? { ...t, unread: false } : t));
      return { ...state, threads };
    }
    case "ADD_CUSTOM_EXERCISE":
      return { ...state, customExercises: [...state.customExercises, action.exercise] };
    case "SET_DAYS_PER_WEEK": {
      const programs = structuredClone(state.programs);
      const p = programs.find((x) => x.id === action.programId);
      if (!p) return state;
      const count = Math.max(1, Math.min(7, action.count));
      if (p.days.length < count) {
        for (let i = p.days.length; i < count; i++) p.days.push({ id: `bday-${Date.now()}-${i}`, name: `Day ${i + 1}`, exercises: [] });
      } else if (p.days.length > count) {
        p.days.length = count;
      }
      p.daysPerWeek = count;
      return { ...state, programs };
    }
    case "RENAME_PROGRAM_DAY": {
      const programs = structuredClone(state.programs);
      const day = programs.find((p) => p.id === action.programId)?.days.find((d) => d.id === action.dayId);
      if (day) day.name = action.name;
      return { ...state, programs };
    }
    case "ADD_PROGRAM_EXERCISE": {
      const programs = structuredClone(state.programs);
      const program = programs.find((p) => p.id === action.programId);
      const day = program?.days.find((d) => d.id === action.dayId);
      if (day && program) {
        const kind = action.exercise.kind ?? "strength";
        const firstSet =
          kind === "cardio"
            ? { id: `bset-${Date.now()}`, reps: 0, loadValue: 0, warmup: false, workSec: CARDIO_DEFAULT.workSec, restSec: CARDIO_DEFAULT.restSec }
            : { id: `bset-${Date.now()}`, reps: 10, loadValue: LOAD_DEFAULT[program.effortScale], warmup: false, restSec: defaultRestSec(action.exercise.name) };
        day.exercises.push({ id: `bex-${Date.now()}`, name: action.exercise.name, muscle: action.exercise.muscle, kind, sets: [firstSet] });
      }
      return { ...state, programs };
    }
    case "REMOVE_PROGRAM_EXERCISE": {
      const programs = structuredClone(state.programs);
      const day = programs.find((p) => p.id === action.programId)?.days.find((d) => d.id === action.dayId);
      if (day) day.exercises = day.exercises.filter((e) => e.id !== action.exerciseId);
      return { ...state, programs };
    }
    case "SET_PROGRAM_LOAD_MODE": {
      const programs = structuredClone(state.programs);
      const program = programs.find((p) => p.id === action.programId);
      if (program) {
        program.effortScale = action.loadMode;
        const defaultValue = LOAD_DEFAULT[action.loadMode];
        for (const day of program.days) {
          for (const ex of day.exercises) {
            if (ex.kind === "cardio") continue;
            if (ex.loadModeOverride) continue; // has its own mode, program-wide change doesn't touch it
            for (const set of ex.sets) set.loadValue = defaultValue;
          }
        }
      }
      return { ...state, programs };
    }
    case "SET_EXERCISE_LOAD_OVERRIDE": {
      const programs = structuredClone(state.programs);
      const program = programs.find((p) => p.id === action.programId);
      const ex = program?.days.find((d) => d.id === action.dayId)?.exercises.find((e) => e.id === action.exerciseId);
      if (ex && program) {
        ex.loadModeOverride = action.loadMode ?? undefined;
        const effectiveMode = action.loadMode ?? program.effortScale;
        const defaultValue = LOAD_DEFAULT[effectiveMode];
        for (const set of ex.sets) set.loadValue = defaultValue;
      }
      return { ...state, programs };
    }
    case "REORDER_PROGRAM_EXERCISES": {
      const programs = structuredClone(state.programs);
      const day = programs.find((p) => p.id === action.programId)?.days.find((d) => d.id === action.dayId);
      if (day) {
        const byId = new Map(day.exercises.map((e) => [e.id, e]));
        day.exercises = action.order.map((id) => byId.get(id)).filter((e): e is (typeof day.exercises)[number] => !!e);
      }
      return { ...state, programs };
    }
    case "SET_EXERCISE_REST": {
      const programs = structuredClone(state.programs);
      const ex = programs.find((p) => p.id === action.programId)?.days.find((d) => d.id === action.dayId)?.exercises.find((e) => e.id === action.exerciseId);
      if (ex) for (const set of ex.sets) set.restSec = action.restSec;
      return { ...state, programs };
    }
    case "ADD_PROGRAM_SET": {
      const programs = structuredClone(state.programs);
      const ex = programs.find((p) => p.id === action.programId)?.days.find((d) => d.id === action.dayId)?.exercises.find((e) => e.id === action.exerciseId);
      if (ex) {
        const last = ex.sets[ex.sets.length - 1];
        const set =
          ex.kind === "cardio"
            ? { id: `bset-${Date.now()}`, reps: 0, loadValue: 0, warmup: false, workSec: last?.workSec ?? CARDIO_DEFAULT.workSec, restSec: last?.restSec ?? CARDIO_DEFAULT.restSec }
            : { id: `bset-${Date.now()}`, reps: last?.reps ?? 10, loadValue: last?.loadValue ?? 0, warmup: action.warmup ?? false, restSec: last?.restSec ?? defaultRestSec(ex.name) };
        if (action.warmup && ex.kind !== "cardio") {
          const firstWorkIdx = ex.sets.findIndex((s) => !s.warmup);
          ex.sets.splice(firstWorkIdx === -1 ? ex.sets.length : firstWorkIdx, 0, set);
        } else {
          ex.sets.push(set);
        }
      }
      return { ...state, programs };
    }
    case "REMOVE_PROGRAM_SET": {
      const programs = structuredClone(state.programs);
      const ex = programs.find((p) => p.id === action.programId)?.days.find((d) => d.id === action.dayId)?.exercises.find((e) => e.id === action.exerciseId);
      if (ex) ex.sets = ex.sets.filter((s) => s.id !== action.setId);
      return { ...state, programs };
    }
    case "EDIT_PROGRAM_SET": {
      const programs = structuredClone(state.programs);
      const set = programs
        .find((p) => p.id === action.programId)
        ?.days.find((d) => d.id === action.dayId)
        ?.exercises.find((e) => e.id === action.exerciseId)
        ?.sets.find((s) => s.id === action.setId);
      if (set) {
        if (action.reps !== undefined) set.reps = action.reps;
        if (action.loadValue !== undefined) set.loadValue = action.loadValue;
        if (action.warmup !== undefined) set.warmup = action.warmup;
        if (action.workSec !== undefined) set.workSec = action.workSec;
        if (action.restSec !== undefined) set.restSec = action.restSec;
      }
      return { ...state, programs };
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
  state: CoachState;
  dispatch: React.Dispatch<Action>;
}

const Ctx = createContext<StoreCtx | null>(null);

export function CoachStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitial);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCoachStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCoachStore must be used within CoachStoreProvider");
  return ctx;
}
