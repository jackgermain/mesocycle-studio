import type { Program, WorkExercise, WorkSet } from "../data/types";
import type { EditOp } from "../coach/programAiEdit";
import type { DiffLine } from "../coach/programAiEdit";

/** The same edit vocabulary as the template builder, applied to a client's *live* program.
 *
 * The difference that makes this worth its own module: a live program has real, separate weeks. The
 * coach's CoachProgram is one week repeated N times, so "add five reps next week" is unrepresentable
 * there -- but here week 2 exists as its own days with its own sets, so it's just a matter of targeting.
 *
 * Two things are never touched, anywhere below: a set that's already been logged, and a day marked done.
 * Editing a session someone has trained would rewrite their history into something that didn't happen. */

const MAX_SETS = 12;

/** Reps can be a string for AMRAP targets ("6+"). Adjusting one means moving the number inside it and
 * keeping the notation, rather than turning "6+" into "11" and quietly dropping the instruction. */
function bumpReps(current: number | string, delta: number): number | string {
  if (typeof current === "number") return Math.max(1, Math.round(current + delta));
  const match = current.match(/^(\d+)(.*)$/);
  if (!match) return current;
  return `${Math.max(1, Math.round(Number(match[1]) + delta))}${match[2]}`;
}

function editableSets(ex: WorkExercise): WorkSet[] {
  return ex.sets.filter((s) => !s.checked);
}

function resize(ex: WorkExercise, count: number): void {
  const target = Math.max(1, Math.min(MAX_SETS, count));
  const warmups = ex.sets.filter((s) => s.isWarmup);
  const working = ex.sets.filter((s) => !s.isWarmup);
  if (working.length === 0) return;

  // Logged sets set the floor: you can't cut a session below what was already done.
  const logged = working.filter((s) => s.checked);
  const spare = working.filter((s) => !s.checked);
  const keep = Math.max(logged.length, target);

  while (spare.length > 0 && logged.length + spare.length > keep) spare.pop();
  while (logged.length + spare.length < keep) {
    const template = spare[spare.length - 1] ?? working[working.length - 1];
    spare.push({
      ...structuredClone(template),
      id: `${ex.id}-ai${spare.length + 1}-${Math.random().toString(36).slice(2, 7)}`,
      checked: false,
      actual: null,
      removed: undefined,
    });
  }
  const next = [...warmups, ...logged, ...spare];
  next.forEach((s, i) => {
    if (!s.isWarmup) s.index = i + 1 - warmups.length;
  });
  ex.sets = next;
}

function refreshMeta(ex: WorkExercise): void {
  const topLoad = ex.sets.find((s) => !s.isWarmup)?.prescribed.load ?? ex.sets[0]?.prescribed.load;
  ex.metaLine = `${ex.sets.length} sets · ${topLoad == null ? "bodyweight" : `${topLoad} lb`}`;
}

export function applyOpsToProgram(program: Program, ops: EditOp[]): Program {
  const next = structuredClone(program);
  const byId = new Map<string, { ex: WorkExercise; dayId: string }>();
  for (const week of next.weeks) {
    for (const day of week.days) {
      if (day.status === "done") continue; // never rewrite a session that's been trained
      for (const [key, ex] of Object.entries(day.exercises)) byId.set(key, { ex, dayId: day.id });
    }
  }

  for (const op of ops) {
    if (op.op === "rename_day") {
      for (const week of next.weeks) {
        const day = week.days.find((d) => d.id === op.dayId);
        if (day && day.status !== "done" && op.name.trim()) day.label = op.name.trim();
      }
      continue;
    }
    if (op.op === "remove_exercise") {
      const doomed = new Set(op.exerciseIds);
      for (const week of next.weeks) {
        for (const day of week.days) {
          if (day.status === "done") continue;
          for (const key of Object.keys(day.exercises)) {
            if (!doomed.has(key)) continue;
            delete day.exercises[key];
            day.order = day.order.filter((id) => id !== key);
          }
          day.setCount = Object.values(day.exercises).reduce((n, e) => n + e.sets.length, 0);
        }
      }
      continue;
    }

    for (const id of op.exerciseIds ?? []) {
      const found = byId.get(id);
      if (!found) continue;
      const ex = found.ex;
      switch (op.op) {
        case "set_set_count":
          resize(ex, op.count);
          break;
        case "set_reps":
          for (const s of editableSets(ex)) s.prescribed.reps = Math.max(1, Math.round(op.reps));
          break;
        case "adjust_reps":
          for (const s of editableSets(ex)) s.prescribed.reps = bumpReps(s.prescribed.reps, op.delta);
          break;
        case "set_load":
          for (const s of editableSets(ex)) s.prescribed.load = Math.max(0, op.value);
          break;
        case "adjust_load":
          // A bodyweight set has no load to adjust; giving it one would change what the exercise is.
          for (const s of editableSets(ex)) if (s.prescribed.load !== null) s.prescribed.load = Math.max(0, s.prescribed.load + op.delta);
          break;
        case "set_rest":
          for (const s of editableSets(ex)) s.prescribed.restSec = Math.max(0, Math.round(op.seconds));
          break;
        case "rename_exercise":
          if (op.name.trim()) ex.name = op.name.trim();
          break;
      }
      refreshMeta(ex);
    }
  }

  for (const week of next.weeks) {
    for (const day of week.days) {
      if (day.status === "done") continue;
      day.setCount = Object.values(day.exercises).reduce((n, e) => n + e.sets.length, 0);
    }
  }
  return next;
}

/** What the model sees. Week numbers are the point: they're what makes "next week" a thing it can target.
 * Logged sets are marked so it knows which ones can't move. */
export function summarizeProgramForAi(program: Program, currentWeek: number | null) {
  return {
    name: program.name,
    currentWeek,
    note: "Each exercise id belongs to one specific week and day. Target them individually.",
    weeks: program.weeks.map((w) => ({
      week: w.number,
      days: w.days
        .filter((d) => d.status !== "done")
        .map((d) => ({
          dayId: d.id,
          name: d.label,
          date: d.date,
          exercises: d.order
            .map((id) => ({ id, ex: d.exercises[id] }))
            .filter((e): e is { id: string; ex: WorkExercise } => !!e.ex)
            .map(({ id, ex }) => ({
              exerciseId: id,
              name: ex.name,
              muscle: ex.muscle,
              sets: ex.sets.length,
              loggedSets: ex.sets.filter((s) => s.checked).length,
              reps: ex.sets.map((s) => s.prescribed.reps),
              load: ex.sets.map((s) => s.prescribed.load),
              restSec: ex.sets[0]?.prescribed.restSec ?? null,
            })),
        })),
    })),
  };
}

const repsOf = (ex: WorkExercise) => ex.sets.map((s) => s.prescribed.reps).join("/");
const loadOf = (ex: WorkExercise) => ex.sets.map((s) => (s.prescribed.load == null ? "bw" : s.prescribed.load)).join("/");
const restOf = (ex: WorkExercise) => ex.sets[0]?.prescribed.restSec ?? 0;

/** Computed from the real before and after, and labelled by week so a change that only touches week 2
 * reads as a change that only touches week 2. */
export function diffProgram(before: Program, after: Program): DiffLine[] {
  const prev = new Map<string, { ex: WorkExercise; week: number }>();
  for (const w of before.weeks) for (const d of w.days) for (const [k, ex] of Object.entries(d.exercises)) prev.set(k, { ex, week: w.number });
  const seen = new Set<string>();

  const grouped = new Map<string, Set<string>>();
  const add = (change: string, label: string) => {
    const set = grouped.get(change) ?? new Set<string>();
    set.add(label);
    grouped.set(change, set);
  };

  for (const w of after.weeks) {
    for (const d of w.days) {
      for (const [key, ex] of Object.entries(d.exercises)) {
        seen.add(key);
        const was = prev.get(key);
        if (!was) continue;
        const where = `wk ${w.number} · ${ex.name}`;
        if (was.ex.name !== ex.name) add(`renamed from "${was.ex.name}"`, where);
        if (was.ex.sets.length !== ex.sets.length) add(`sets ${was.ex.sets.length} → ${ex.sets.length}`, where);
        if (repsOf(was.ex) !== repsOf(ex)) add(`reps ${repsOf(was.ex)} → ${repsOf(ex)}`, where);
        if (loadOf(was.ex) !== loadOf(ex)) add(`load ${loadOf(was.ex)} → ${loadOf(ex)}`, where);
        if (restOf(was.ex) !== restOf(ex)) add(`rest ${restOf(was.ex)}s → ${restOf(ex)}s`, where);
      }
    }
  }
  for (const [key, { ex, week }] of prev) if (!seen.has(key)) add("removed", `wk ${week} · ${ex.name}`);

  return Array.from(grouped.entries()).map(([change, labels]) => {
    const list = Array.from(labels);
    return { label: list.length === 1 ? list[0] : `${list.length} exercises`, detail: change };
  });
}
