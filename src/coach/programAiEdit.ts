import type { BuilderDay, BuilderExercise, BuilderSet } from "./types";
import { defaultRestSec } from "./rest";

/** The edit vocabulary the AI is allowed to speak.
 *
 * The model returns *operations*, never a rewritten program. Handing back a whole edited program would
 * mean trusting it to reproduce 16 exercises and 48 sets verbatim except for the one thing that changed --
 * and anything it silently dropped or "improved" on the way through would be a real prescription quietly
 * going wrong. Operations are small, checkable, and applied by code, so the worst a bad response can do is
 * be rejected or produce a change the coach sees in the preview and discards.
 *
 * Targets are explicit id lists rather than phrases like "all chest exercises". The model can see every id
 * in the program summary, so resolving scope is its job, and doing it up front means the operation itself
 * is unambiguous. */
export type EditOp =
  | { op: "set_set_count"; exerciseIds: string[]; count: number }
  | { op: "set_reps"; exerciseIds: string[]; reps: number }
  | { op: "adjust_reps"; exerciseIds: string[]; delta: number }
  | { op: "set_load"; exerciseIds: string[]; value: number }
  | { op: "adjust_load"; exerciseIds: string[]; delta: number }
  | { op: "set_rest"; exerciseIds: string[]; seconds: number }
  | { op: "rename_exercise"; exerciseIds: string[]; name: string }
  | { op: "remove_exercise"; exerciseIds: string[] }
  | { op: "rename_day"; dayId: string; name: string }
  | { op: "swap_exercise"; exerciseIds: string[]; name: string; muscle?: string }
  | { op: "add_exercise"; dayIds: string[]; name: string; muscle: string; sets?: number; reps?: number; load?: number }
  | { op: "reorder_day"; dayId: string; exerciseIds: string[] }
  | { op: "set_warmup_count"; exerciseIds: string[]; count: number }
  | { op: "set_reps_per_set"; exerciseIds: string[]; repsPerSet: number[] };

export interface AiEditResult {
  ops: EditOp[];
  /** The model's own description of what it did, shown above the computed diff. */
  summary?: string;
  /** Anything it couldn't do, or had to interpret. */
  notes?: string[];
}

const MAX_SETS = 12;

function cloneDays(days: BuilderDay[]): BuilderDay[] {
  return structuredClone(days);
}

/** Grows or shrinks an exercise's set list, keeping warm-ups and copying the last working set when adding. */
function resize(ex: BuilderExercise, count: number): void {
  const target = Math.max(1, Math.min(MAX_SETS, count));
  const warmups = ex.sets.filter((s) => s.warmup);
  const working = ex.sets.filter((s) => !s.warmup);
  if (working.length === 0) return;

  while (working.length > target) working.pop();
  while (working.length < target) {
    const last = working[working.length - 1];
    working.push({ ...structuredClone(last), id: `${ex.id}-s${working.length + 1}-${Math.random().toString(36).slice(2, 7)}` });
  }
  ex.sets = [...warmups, ...working];
}

/** Applies the model's operations to a copy of the week template. Unknown ops and unknown ids are skipped
 * rather than throwing: a partially-understood instruction should still do the part it understood, and the
 * preview shows exactly what that came to. */
export function applyOps(days: BuilderDay[], ops: EditOp[]): BuilderDay[] {
  const next = cloneDays(days);
  const byId = new Map<string, BuilderExercise>();
  for (const day of next) for (const ex of day.exercises) byId.set(ex.id, ex);

  for (const op of ops) {
    if (op.op === "rename_day") {
      const day = next.find((d) => d.id === op.dayId);
      if (day && op.name.trim()) day.name = op.name.trim();
      continue;
    }
    if (op.op === "remove_exercise") {
      const doomed = new Set(op.exerciseIds);
      for (const day of next) day.exercises = day.exercises.filter((ex) => !doomed.has(ex.id));
      continue;
    }
    if (op.op === "add_exercise") {
      for (const dayId of op.dayIds ?? []) {
        const day = next.find((d) => d.id === dayId);
        if (!day || !op.name.trim()) continue;
        const id = `ai-${Math.random().toString(36).slice(2, 9)}`;
        const count = Math.max(1, Math.min(MAX_SETS, op.sets ?? 3));
        const sets: BuilderSet[] = Array.from({ length: count }, (_, i) => ({
          id: `${id}-s${i + 1}`,
          reps: Math.max(1, Math.round(op.reps ?? 10)),
          loadValue: Math.max(0, op.load ?? 0),
          warmup: false,
          restSec: defaultRestSec(op.name),
        }));
        day.exercises.push({ id, name: op.name.trim(), muscle: op.muscle, kind: "strength", sets });
        byId.set(id, day.exercises[day.exercises.length - 1]);
      }
      continue;
    }
    if (op.op === "reorder_day") {
      const day = next.find((d) => d.id === op.dayId);
      if (day) {
        // Anything the model left out keeps its place at the end rather than vanishing -- a reorder
        // should never be able to silently delete an exercise.
        const wanted = op.exerciseIds.map((id) => day.exercises.find((ex) => ex.id === id)).filter((ex): ex is BuilderExercise => !!ex);
        const rest = day.exercises.filter((ex) => !wanted.includes(ex));
        day.exercises = [...wanted, ...rest];
      }
      continue;
    }

    for (const id of op.exerciseIds ?? []) {
      const ex = byId.get(id);
      if (!ex) continue;
      switch (op.op) {
        case "set_set_count":
          resize(ex, op.count);
          break;
        case "set_reps":
          for (const s of ex.sets) s.reps = Math.max(1, Math.round(op.reps));
          break;
        case "adjust_reps":
          for (const s of ex.sets) s.reps = Math.max(1, Math.round(s.reps + op.delta));
          break;
        case "set_load":
          for (const s of ex.sets) s.loadValue = Math.max(0, op.value);
          break;
        case "adjust_load":
          for (const s of ex.sets) s.loadValue = Math.max(0, s.loadValue + op.delta);
          break;
        case "set_rest":
          for (const s of ex.sets) s.restSec = Math.max(0, Math.round(op.seconds));
          break;
        case "rename_exercise":
          if (op.name.trim()) ex.name = op.name.trim();
          break;
        case "swap_exercise":
          // A swap keeps the prescription and changes the movement -- that's what makes it a swap rather
          // than a delete plus an add, and it's why the sets are left exactly as they were.
          if (op.name.trim()) {
            ex.name = op.name.trim();
            if (op.muscle) ex.muscle = op.muscle;
            for (const s of ex.sets) s.restSec = defaultRestSec(ex.name);
          }
          break;
        case "set_warmup_count": {
          const target = Math.max(0, Math.min(6, op.count));
          const working = ex.sets.filter((s) => !s.warmup);
          const warmups = ex.sets.filter((s) => s.warmup);
          if (working.length === 0) break;
          while (warmups.length > target) warmups.pop();
          while (warmups.length < target) {
            const first = working[0];
            warmups.push({
              ...structuredClone(first),
              id: `${ex.id}-w${warmups.length + 1}-${Math.random().toString(36).slice(2, 7)}`,
              warmup: true,
              loadValue: Math.round(first.loadValue * 0.5),
            });
          }
          ex.sets = [...warmups, ...working];
          break;
        }
        case "set_reps_per_set": {
          // Per-set reps ("12/10/8") also fixes the number of working sets, since a rep for every set is
          // exactly what was specified.
          const wanted = (op.repsPerSet ?? []).filter((n) => Number.isFinite(n)).map((n) => Math.max(1, Math.round(n)));
          if (wanted.length === 0) break;
          resize(ex, wanted.length);
          const working = ex.sets.filter((s) => !s.warmup);
          working.forEach((s, i) => (s.reps = wanted[Math.min(i, wanted.length - 1)]));
          break;
        }
      }
    }
  }
  return next;
}

export interface DiffLine {
  label: string;
  detail: string;
}

const repsOf = (ex: BuilderExercise) => ex.sets.map((s) => s.reps).join("/");
const loadOf = (ex: BuilderExercise) => ex.sets.map((s) => s.loadValue).join("/");
const restOf = (ex: BuilderExercise) => ex.sets[0]?.restSec ?? 0;

/** What actually changed, computed from before and after rather than taken from the model's word for it.
 * The point of the review step is that the coach checks the program, not the explanation -- so this reads
 * the real result. Identical changes across many exercises collapse into one line. */
export function diffDays(before: BuilderDay[], after: BuilderDay[]): DiffLine[] {
  const beforeById = new Map<string, { ex: BuilderExercise; day: string }>();
  for (const d of before) for (const ex of d.exercises) beforeById.set(ex.id, { ex, day: d.name });
  const afterIds = new Set<string>();
  for (const d of after) for (const ex of d.exercises) afterIds.add(ex.id);

  const grouped = new Map<string, string[]>();
  const add = (change: string, exName: string) => {
    const list = grouped.get(change) ?? [];
    list.push(exName);
    grouped.set(change, list);
  };

  for (const day of after) {
    for (const ex of day.exercises) {
      const prev = beforeById.get(ex.id)?.ex;
      if (!prev) {
        add("added", ex.name);
        continue;
      }
      if (prev.name !== ex.name) add(`renamed from "${prev.name}"`, ex.name);
      if (prev.sets.length !== ex.sets.length) add(`sets ${prev.sets.length} → ${ex.sets.length}`, ex.name);
      if (repsOf(prev) !== repsOf(ex)) add(`reps ${repsOf(prev)} → ${repsOf(ex)}`, ex.name);
      if (loadOf(prev) !== loadOf(ex)) add(`load ${loadOf(prev)} → ${loadOf(ex)}`, ex.name);
      if (restOf(prev) !== restOf(ex)) add(`rest ${restOf(prev)}s → ${restOf(ex)}s`, ex.name);
    }
  }
  for (const [id, { ex }] of beforeById) if (!afterIds.has(id)) add("removed", ex.name);

  const beforeDayNames = new Map(before.map((d) => [d.id, d.name]));
  for (const d of after) {
    const was = beforeDayNames.get(d.id);
    if (was !== undefined && was !== d.name) add(`day renamed from "${was}"`, d.name);
  }

  return Array.from(grouped.entries()).map(([change, names]) => ({
    label: names.length === 1 ? names[0] : `${names.length} exercises`,
    detail: change,
  }));
}
