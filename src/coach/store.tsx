import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { BuilderDay, CoachClient, CoachProgram, CoachThread, ExerciseKind, LibraryExercise, LoadMode } from "./types";
import { LOAD_DEFAULT } from "./loadMode";
import { CARDIO_DEFAULT } from "./cardio";
import { defaultRestSec } from "./rest";
import { isPendingProgram } from "./programOps";
import { resizeDows } from "../shared/trainingDays";
import { supabase } from "../lib/supabase";
import { mergeThreads } from "./mergeThreads";
import { useAuth } from "../lib/auth";

export interface CoachState {
  clients: CoachClient[];
  programs: CoachProgram[];
  threads: CoachThread[];
  customExercises: LibraryExercise[];
  /** Compliance gaps the coach has waved off, as `accountId|kind|date` keys.
   *
   * Kept per gap rather than per client on purpose. Dismissing "no session on the 3rd" should not also
   * silence a session missed next week -- a client who goes quiet again is exactly the thing this is for.
   * Stored on coach_state rather than a table because these are computed, not records: there is no row to
   * mark acknowledged, and the judgement is the coach's own. */
  dismissedCompliance: string[];
  toast: string | null;
}

export function blankState(): CoachState {
  return { clients: [], programs: [], threads: [], customExercises: [], dismissedCompliance: [], toast: null };
}

type Action =
  | { type: "HYDRATE"; state: CoachState }
  | { type: "ADD_CLIENT"; client: CoachClient }
  | { type: "RECONCILE_CLIENT"; clientId: string; accountId: string }
  | { type: "SET_CLIENT_INVITE_CODE"; clientId: string; code: string }
  | { type: "REMOVE_CLIENT"; clientId: string }
  | { type: "APPLY_FLAG"; clientId: string; flagId: string }
  | { type: "DISMISS_FLAG"; clientId: string; flagId: string }
  | { type: "DISMISS_COMPLIANCE"; keys: string[] }
  | { type: "ADD_PROGRAM"; program: CoachProgram }
  | { type: "REMOVE_PROGRAM"; programId: string }
  | { type: "ASSIGN_PROGRAM"; clientId: string; programId: string; programName: string; totalWeeks: number; mode: "now" | "queued"; sourceProgramId?: string; reason?: string }
  | { type: "SET_PROGRAM_NAME"; programId: string; name: string }
  | { type: "SET_PROGRAM_TEMPLATE"; programId: string; isTemplate: boolean }
  | { type: "SET_TEMPLATE_META"; programId: string; intendedFor?: string; automatable?: boolean }
  | { type: "SET_PROGRAM_VISIBILITY"; programId: string; visibility: "private" | "public" }
  | { type: "SEND_MESSAGE"; threadId: string; text: string; clientName?: string }
  | { type: "MARK_READ"; threadId: string }
  | { type: "SYNC_THREADS"; threads: CoachThread[] }
  | { type: "ADD_CUSTOM_EXERCISE"; exercise: LibraryExercise }
  | { type: "SET_PROGRAM_SHAPE"; programId: string; hasDeload?: boolean; openEnded?: boolean }
  | { type: "SET_PROGRAM_WEEKS"; programId: string; weeks: number }
  | { type: "SET_DAYS_PER_WEEK"; programId: string; count: number }
  | { type: "SET_TRAINING_DOWS"; programId: string; dows: number[] }
  | { type: "RENAME_PROGRAM_DAY"; programId: string; dayId: string; name: string }
  | { type: "SET_PROGRAM_DAYS"; programId: string; days: BuilderDay[]; aiEdit?: { at: string; summary: string; exerciseIds: string[] } }
  | { type: "CLEAR_AI_EDIT_MARK"; programId: string }
  | { type: "ADD_PROGRAM_EXERCISE"; programId: string; dayId: string; exercise: { name: string; muscle: string; kind?: ExerciseKind } }
  | { type: "REMOVE_PROGRAM_EXERCISE"; programId: string; dayId: string; exerciseId: string }
  | { type: "SET_PROGRAM_LOAD_MODE"; programId: string; loadMode: LoadMode }
  | { type: "SET_EXERCISE_LOAD_OVERRIDE"; programId: string; dayId: string; exerciseId: string; loadMode: LoadMode | null }
  | { type: "SET_EXERCISE_REST"; programId: string; dayId: string; exerciseId: string; restSec: number }
  | { type: "REORDER_PROGRAM_EXERCISES"; programId: string; dayId: string; order: string[] }
  | { type: "ADD_PROGRAM_SET"; programId: string; dayId: string; exerciseId: string; warmup?: boolean }
  | { type: "REMOVE_PROGRAM_SET"; programId: string; dayId: string; exerciseId: string; setId: string }
  | { type: "EDIT_PROGRAM_SET"; programId: string; dayId: string; exerciseId: string; setId: string; reps?: number; loadValue?: number; weightLb?: number; warmup?: boolean; workSec?: number; restSec?: number }
  | { type: "SHOW_TOAST"; message: string }
  | { type: "CLEAR_TOAST" };

function reducer(state: CoachState, action: Action): CoachState {
  switch (action.type) {
    case "HYDRATE":
      return action.state;
    case "ADD_CLIENT": {
      // Guard against duplicate self-heal effects racing each other with a stale view of the roster —
      // the reducer always sees the true current state, so this check is race-proof where an effect's
      // own pre-dispatch check isn't.
      if (action.client.accountId && state.clients.some((c) => c.accountId === action.client.accountId)) return state;
      return { ...state, clients: [action.client, ...state.clients] };
    }
    case "RECONCILE_CLIENT": {
      const clients = state.clients.map((c) => (c.id === action.clientId ? { ...c, accountId: action.accountId, status: "unassigned" as const } : c));
      return { ...state, clients };
    }
    case "SET_CLIENT_INVITE_CODE": {
      const clients = state.clients.map((c) => (c.id === action.clientId ? { ...c, inviteCode: action.code } : c));
      return { ...state, clients };
    }
    case "REMOVE_CLIENT": {
      return { ...state, clients: state.clients.filter((c) => c.id !== action.clientId) };
    }
    case "APPLY_FLAG":
    case "DISMISS_FLAG": {
      const clients = state.clients.map((c) => (c.id === action.clientId ? { ...c, flags: c.flags.filter((f) => f.id !== action.flagId) } : c));
      return { ...state, clients };
    }
    case "DISMISS_COMPLIANCE": {
      const seen = new Set([...(state.dismissedCompliance ?? []), ...action.keys]);
      return { ...state, dismissedCompliance: [...seen] };
    }
    case "SET_PROGRAM_VISIBILITY": {
      const programs = state.programs.map((p) => (p.id === action.programId ? { ...p, visibility: action.visibility } : p));
      return { ...state, programs };
    }
    case "ADD_PROGRAM":
      return { ...state, programs: [action.program, ...state.programs] };
    case "REMOVE_PROGRAM":
      return { ...state, programs: state.programs.filter((p) => p.id !== action.programId) };
    case "ASSIGN_PROGRAM": {
      const client = state.clients.find((c) => c.id === action.clientId);
      // A pending (never explicitly saved) working copy that's about to be superseded by this one has no
      // reason to stick around — only ever clean up copies still marked pending, never anything the coach
      // saved as a real template.
      const toCleanup = new Set<string>();
      if (client?.assignedProgramId && client.assignedProgramId !== action.programId && action.mode === "now") toCleanup.add(client.assignedProgramId);
      if (client?.queuedProgramId && client.queuedProgramId !== action.programId) toCleanup.add(client.queuedProgramId);

      let programs = toCleanup.size ? state.programs.filter((p) => !(toCleanup.has(p.id) && isPendingProgram(p))) : state.programs;
      if (action.sourceProgramId) programs = programs.map((p) => (p.id === action.sourceProgramId ? { ...p, assignedCount: p.assignedCount + 1 } : p));

      const record = {
        at: new Date().toISOString(),
        programId: action.programId,
        programName: action.programName,
        totalWeeks: action.totalWeeks,
        mode: action.mode,
        sourceProgramId: action.sourceProgramId,
        reason: action.reason?.trim() || undefined,
      };

      const clients = state.clients.map((c) => {
        if (c.id !== action.clientId) return c;
        // Append-only: an assignment that was later replaced is still the reason this person trained the
        // way they did for those weeks, and the history is the whole point of keeping it.
        const assignments = [...(c.assignments ?? []), record];
        if (action.mode === "now") {
          return {
            ...c,
            assignments,
            programName: action.programName,
            week: 1,
            totalWeeks: action.totalWeeks,
            status: c.status === "unassigned" ? ("on-track" as const) : c.status,
            assignedProgramId: action.programId,
            queuedProgramId: undefined,
          };
        }
        return { ...c, assignments, queuedProgramId: action.programId };
      });
      return { ...state, clients, programs };
    }
    case "SET_PROGRAM_NAME": {
      const programs = state.programs.map((p) => (p.id === action.programId ? { ...p, name: action.name } : p));
      return { ...state, programs };
    }
    case "SET_TEMPLATE_META": {
      const programs = state.programs.map((p) =>
        p.id === action.programId
          ? {
              ...p,
              ...(action.intendedFor !== undefined ? { intendedFor: action.intendedFor } : {}),
              ...(action.automatable !== undefined ? { automatable: action.automatable } : {}),
            }
          : p,
      );
      return { ...state, programs };
    }
    case "SET_PROGRAM_TEMPLATE": {
      // Checking this is also the coach's explicit "keep this" signal for any working copy still pending
      // (see CoachProgram.pendingForClientId / pendingUnsaved) — moving it from the Drafts tab into the
      // real Templates library, and out of the auto-cleanup path once superseded or discarded.
      const programs = state.programs.map((p) =>
        p.id === action.programId
          ? {
              ...p,
              isTemplate: action.isTemplate,
              visibility: action.isTemplate ? ("private" as const) : p.visibility,
              pendingForClientId: action.isTemplate ? undefined : p.pendingForClientId,
              pendingUnsaved: action.isTemplate ? undefined : p.pendingUnsaved,
            }
          : p
      );
      return { ...state, programs };
    }
    case "SEND_MESSAGE": {
      const now = new Date().toISOString();
      const bubble = { from: "coach" as const, text: action.text, time: now };
      const exists = state.threads.some((t) => t.id === action.threadId);
      if (!exists) {
        const newThread = {
          id: action.threadId,
          clientId: action.threadId,
          clientName: action.clientName ?? "Client",
          context: "",
          unread: false,
          time: now,
          preview: action.text,
          bubbles: [bubble],
        };
        return { ...state, threads: [newThread, ...state.threads] };
      }
      const threads = state.threads.map((t) => (t.id === action.threadId ? { ...t, bubbles: [...t.bubbles, bubble], preview: action.text, unread: false, time: now } : t));
      return { ...state, threads };
    }
    case "SYNC_THREADS": {
      const merged = mergeThreads(state.threads, action.threads);
      return merged === state.threads ? state : { ...state, threads: merged };
    }
    case "MARK_READ": {
      const threads = state.threads.map((t) => (t.id === action.threadId ? { ...t, unread: false } : t));
      return { ...state, threads };
    }
    case "ADD_CUSTOM_EXERCISE":
      return { ...state, customExercises: [...state.customExercises, action.exercise] };
    case "SET_PROGRAM_WEEKS": {
      // Clamped rather than trusted: this is the repeat count the whole expansion runs off, and a zero or
      // a negative would produce a program with no days at all.
      const weeks = Math.max(1, Math.min(52, Math.round(action.weeks)));
      return { ...state, programs: state.programs.map((p) => (p.id === action.programId ? { ...p, weeks } : p)) };
    }
    case "SET_PROGRAM_SHAPE": {
      const programs = state.programs.map((p) =>
        p.id === action.programId
          ? {
              ...p,
              ...(action.hasDeload !== undefined ? { hasDeload: action.hasDeload } : {}),
              // Open-ended has no last week, so it can't have a deload on one.
              ...(action.openEnded !== undefined ? { openEnded: action.openEnded, hasDeload: action.openEnded ? false : p.hasDeload } : {}),
            }
          : p,
      );
      return { ...state, programs };
    }
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
      // Only resize an explicit weekday choice; leaving it undefined keeps the even spread as the default.
      if (p.trainingDows) p.trainingDows = resizeDows(p.trainingDows, count);
      return { ...state, programs };
    }
    case "SET_TRAINING_DOWS": {
      const programs = structuredClone(state.programs);
      const p = programs.find((x) => x.id === action.programId);
      if (!p) return state;
      const dows = [...action.dows].sort((a, b) => a - b).slice(0, 7);
      if (dows.length === 0) return state;
      // The picked weekdays are the source of truth for how many sessions a week there are, so the day
      // slots follow along -- otherwise you could pick four days on a five-day program and the fifth slot
      // would silently share a date with another.
      if (p.days.length < dows.length) {
        for (let i = p.days.length; i < dows.length; i++) p.days.push({ id: `bday-${Date.now()}-${i}`, name: `Day ${i + 1}`, exercises: [] });
      } else if (p.days.length > dows.length) {
        p.days.length = dows.length;
      }
      p.daysPerWeek = dows.length;
      p.trainingDows = dows;
      return { ...state, programs };
    }
    case "SET_PROGRAM_DAYS": {
      // Swaps in a whole edited week template in one go. Used by the AI editor, which produces its result
      // by applying operations to a copy and having the coach approve the diff -- replaying that as dozens
      // of individual actions would be slower, would land half-applied if one were rejected, and would
      // make the approved preview and the saved result two different computations.
      const programs = structuredClone(state.programs);
      const program = programs.find((p) => p.id === action.programId);
      if (program) {
        program.days = structuredClone(action.days);
        if (action.aiEdit) program.lastAiEdit = action.aiEdit;
      }
      return { ...state, programs };
    }
    case "CLEAR_AI_EDIT_MARK": {
      const programs = structuredClone(state.programs);
      const program = programs.find((p) => p.id === action.programId);
      if (program) delete program.lastAiEdit;
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
        if (action.weightLb !== undefined) set.weightLb = action.weightLb;
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
  ready: boolean;
}

const Ctx = createContext<StoreCtx | null>(null);

export function CoachStoreProvider({ children }: { children: React.ReactNode }) {
  const { account } = useAuth();
  const accountId = account?.id ?? "";
  const [state, dispatch] = useReducer(reducer, undefined, blankState);
  const [ready, setReady] = useState(false);
  const readyRef = useRef(false);

  useEffect(() => {
    if (!accountId) return;
    let active = true;
    setReady(false);
    readyRef.current = false;
    supabase
      .from("coach_state")
      .select("data")
      .eq("account_id", accountId)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        const remote = data?.data as Partial<CoachState> | undefined;
        // Merge onto blankState() rather than trusting `remote` to have every field — a row saved before a
        // field existed (e.g. `threads`, added by the messaging feature) would otherwise hydrate as
        // undefined and crash the first component that reads it.
        if (remote && remote.clients) dispatch({ type: "HYDRATE", state: { ...blankState(), ...remote } });
        readyRef.current = true;
        setReady(true);
      });
    return () => {
      active = false;
    };
  }, [accountId]);

  // Clients append to this coach's threads through send_client_message, and nothing tells the coach's
  // open app that it happened. Poll for just the threads -- selecting the JSON path rather than the whole
  // blob, which holds every program and client -- and merge (see SYNC_THREADS). Without this an unread
  // message doesn't show until the app is reopened, and may not survive that either.
  useEffect(() => {
    if (!accountId) return;
    let active = true;
    async function poll() {
      if (!active || !readyRef.current) return;
      const { data, error } = await supabase
        .from("coach_state")
        .select("data->threads")
        .eq("account_id", accountId)
        .maybeSingle();
      if (!active || error || !data) return;
      const threads = (data as unknown as { threads?: CoachThread[] }).threads;
      if (Array.isArray(threads) && threads.length) dispatch({ type: "SYNC_THREADS", threads });
    }
    const id = setInterval(poll, 30000);
    const onFocus = () => void poll();
    window.addEventListener("focus", onFocus);
    void poll();
    return () => {
      active = false;
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [accountId]);

  useEffect(() => {
    if (!readyRef.current || !accountId) return;
    supabase
      .from("coach_state")
      .upsert({ account_id: accountId, data: state, updated_at: new Date().toISOString() })
      .then(({ error }) => {
        if (error) console.error("Failed to save coach_state", error);
      });
  }, [state, accountId]);

  const value = useMemo(() => ({ state, dispatch, ready }), [state, ready]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCoachStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCoachStore must be used within CoachStoreProvider");
  return ctx;
}
