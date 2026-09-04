import type { Program, WorkExercise, WorkSet, Equipment } from "../data/types";
import { nearestValidLoad } from "../screens/exerciseHelpers";

/** A warm-up set modelled on the exercise's first working set: same movement and setup, half the load
 * rounded to something the equipment can actually make, and effort marked as a warm-up rather than
 * carrying the working set's RIR/RPE target. */
export function makeWarmupSet(ex: WorkExercise, idSuffix: string): WorkSet {
  const firstWork = ex.sets.find((s) => !s.isWarmup) ?? ex.sets[0];
  const workLoad = firstWork.actual?.load ?? firstWork.prescribed.load;
  return {
    ...structuredClone(firstWork),
    id: `${ex.id}-warmup-${idSuffix}`,
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
      load: workLoad === null ? null : nearestValidLoad(ex, workLoad * 0.5),
      effort: { scale: firstWork.prescribed.effort.scale, value: "warm-up" },
      tempo: undefined,
      cluster: undefined,
    },
  };
}

/** Puts a warm-up set at the front of an exercise's set list, before the first working set. */
export function insertWarmupSet(ex: WorkExercise, idSuffix: string): void {
  if (ex.sets.length === 0) return;
  const insertAt = ex.sets.findIndex((s) => !s.isWarmup);
  ex.sets.splice(insertAt === -1 ? ex.sets.length : insertAt, 0, makeWarmupSet(ex, idSuffix));
}

function refreshMetaLine(ex: WorkExercise): void {
  const topLoad = ex.sets.find((s) => !s.isWarmup)?.prescribed.load ?? ex.sets[0]?.prescribed.load;
  ex.metaLine = `${ex.sets.length} sets · ${topLoad == null ? "bodyweight" : `${topLoad} lb`}`;
}

/** Every still-upcoming occurrence of an exercise, matched by name. The coach acting on a pain report has
 * an exercise *name* out of client_signals rather than an id, and wants the change to hold for the rest of
 * the block -- so this walks every day that isn't already logged. Days marked done are never touched:
 * rewriting a session the client already finished would falsify their history. */
function forEachUpcoming(program: Program, exerciseName: string, fn: (ex: WorkExercise, key: string) => void): number {
  const want = exerciseName.trim().toLowerCase();
  let touched = 0;
  for (const week of program.weeks) {
    for (const day of week.days) {
      if (day.status === "done") continue;
      for (const [key, ex] of Object.entries(day.exercises)) {
        if (ex.name.trim().toLowerCase() !== want) continue;
        fn(ex, key);
        touched++;
      }
    }
  }
  return touched;
}

/** Adds one warm-up set to every remaining session of this exercise. The first answer to "my elbow hurts
 * on the second working set" that doesn't cost any training volume. */
export function addWarmupSetByName(program: Program, exerciseName: string): { program: Program; touched: number } {
  const next = structuredClone(program);
  let n = 0;
  const touched = forEachUpcoming(next, exerciseName, (ex) => {
    insertWarmupSet(ex, `coach-${n++}`);
    refreshMetaLine(ex);
  });
  return { program: next, touched };
}

/** Replaces every remaining occurrence of an exercise with a different movement, keeping the set and rep
 * scheme. Loads are re-rounded because what was a valid weight on a dumbbell press rarely is on a machine. */
export function replaceExerciseByName(
  program: Program,
  exerciseName: string,
  replacement: { name: string; muscle: string; equipment: Equipment; hasVideo: boolean },
): { program: Program; touched: number } {
  const next = structuredClone(program);
  const touched = forEachUpcoming(next, exerciseName, (ex) => {
    ex.name = replacement.name;
    ex.muscle = replacement.muscle;
    ex.equipment = replacement.equipment;
    ex.hasVideo = replacement.hasVideo;
    for (const set of ex.sets) {
      if (set.checked) continue;
      if (set.prescribed.load !== null) set.prescribed.load = nearestValidLoad(ex, set.prescribed.load);
    }
    refreshMetaLine(ex);
  });
  return { program: next, touched };
}
