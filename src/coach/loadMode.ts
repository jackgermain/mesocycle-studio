import type { LoadMode } from "./types";

export const LOAD_LABELS: Record<LoadMode, string> = { lb: "LB", pct1rm: "%1RM", rpe: "RPE", rir: "RIR" };

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
