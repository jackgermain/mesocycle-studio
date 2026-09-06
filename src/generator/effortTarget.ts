/** What a week should feel like, as RIR and RPE.
 *
 * This is a **consequence**, not an independent prescription. P10 says a block opens around RIR 3 / RPE 7
 * and closes near RIR 0, and section 17 explains why that happens on its own: the weekly load steps are
 * deliberately smaller than the rep change would warrant, so every week lands closer to failure without
 * anyone writing an RPE down. *"Note that because of this structure and the weight jumps, your RPE and/or
 * reps in reserve will get closer to zero as you progress."*
 *
 * It is still worth printing. The client reads effort, not percentages, and a target tells them whether
 * the load they were given is behaving as intended -- if week two already feels like RIR 0, the opener
 * was too heavy and the rest of the block has nowhere to go.
 */

import { ceilingRelativeIntensity } from "./relativeIntensity";

/** Where a block opens. C2's working-set floor, and P10's stated start. */
export const OPENING_RIR = 3;

/** The lowest RIR this rep count may finish on.
 *
 * C6 in effort terms: a triple stops at RPE 9 / 1 RIR because the bar is loaded heavily enough that a
 * true maximum is an injury risk. At six reps and above the ceiling is a genuine 0. */
export function floorRirFor(reps: number): number {
  return ceilingRelativeIntensity(reps) === 100 ? 0 : 1;
}

export interface EffortTarget {
  rir: number;
  rpe: number;
}

export function targetEffort(week: number, totalWeeks: number, reps: number): EffortTarget {
  const floor = floorRirFor(reps);
  if (totalWeeks <= 1) return { rir: floor, rpe: 10 - floor };
  const span = OPENING_RIR - floor;
  const raw = OPENING_RIR - (span * (week - 1)) / (totalWeeks - 1);
  const rir = Math.max(floor, Math.round(raw));
  return { rir, rpe: 10 - rir };
}

export function describeEffort(t: EffortTarget): string {
  return `RPE ${t.rpe} · ${t.rir} RIR`;
}
