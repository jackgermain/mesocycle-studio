import type { LoadMode } from "./types";
import type { WorkSet } from "../data/types";

export const LOAD_LABELS: Record<LoadMode, string> = { lb: "LB", pct1rm: "%1RM", rpe: "RPE", rir: "RIR" };

/** Which unit an exercise's sets were prescribed in, falling back to reading it off the sets themselves.
 *
 * Lives here rather than in a screen because two surfaces now have to agree about it: the live session
 * (`ExerciseSection`) and the coach's program editor (`ClientProgram`). A second copy would be a second
 * answer, and the failure is silent — the editor would put "LB" over a number that is really an RPE.
 *
 * `loadMode` is absent on every program built before that field existed, hence the fallback. A set with a
 * real load is pounds; a set with no load is prescribed by effort, and the effort SCALE says which one.
 * Reading `effort` alone would not do — `effortForLoadMode` fills in {RIR, 2} as a placeholder for pounds,
 * which would print "RIR 2" under every barbell lift in the app. */
export function loadModeOf(ex: { loadMode?: LoadMode; sets: WorkSet[] }): LoadMode {
  if (ex.loadMode) return ex.loadMode;
  const first = ex.sets.find((s) => !s.removed) ?? ex.sets[0];
  if (!first || first.prescribed.load !== null) return "lb";
  const scale = first.prescribed.effort?.scale;
  return scale === "RPE" ? "rpe" : scale === "%1RM" ? "pct1rm" : scale === "RIR" ? "rir" : "lb";
}

/** Every valid load value for a mode sits on one of these grids — e.g. RPE only ever lands on 1, 1.25, 1.5 … 10. */
export const LOAD_RANGE: Record<LoadMode, { min: number; max: number; step: number }> = {
  lb: { min: 0, max: 999, step: 5 },
  pct1rm: { min: 40, max: 100, step: 2.5 },
  rpe: { min: 1, max: 10, step: 0.25 },
  rir: { min: 0, max: 6, step: 1 },
};

/** A sane starting value when a set is created or a program switches load modes — the old number is a different unit, so it can't just carry over. */
export const LOAD_DEFAULT: Record<LoadMode, number> = { lb: 45, pct1rm: 70, rpe: 7, rir: 2 };

export function clampLoadValue(value: number, mode: LoadMode): number {
  const { min, max, step } = LOAD_RANGE[mode];
  const snapped = Math.round(value / step) * step;
  return Math.max(min, Math.min(max, +snapped.toFixed(2)));
}
