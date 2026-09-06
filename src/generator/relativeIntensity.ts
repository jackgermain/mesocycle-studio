/** The relative intensity table, as data.
 *
 * Rows are **relative intensity** — how hard a set was, where 100% is maximal for that rep count and
 * nothing harder exists. Columns are the rep count. Cells are **absolute intensity**, the percentage of
 * 1RM that produces that difficulty at that many reps.
 *
 * Why this is the centre of the whole engine: it is the only thing that makes load and reps comparable.
 * 3×10 at 100 lb and 3×8 at 110 lb cannot be ranked by tonnage or by rep count -- both fall -- but they
 * rank cleanly as relative intensity. That gives "did this week apply more stress" an answer a computer
 * can produce, which raw volume never could.
 *
 * Transcribed from the table Jack works from, and verified against two worked examples he gave:
 *   - 4 weeks of 4x10 at 61.8 / 63.5 / 65.3 / 67.3 %1RM = 85 / 87.5 / 90 / 92.5 relative intensity,
 *     four consecutive rows walked one step a week.
 *   - 4x10 @ 65.3, 4x8 @ 72.0, 4x6 @ 76.5, 4x5 @ 78.8 -- every one of them the 90% row.
 */

export const RELATIVE_INTENSITIES = [
  100, 97.5, 95, 92.5, 90, 87.5, 85, 82.5, 80, 77.5, 75, 72.5, 70, 67.5, 65,
] as const;

export type RelativeIntensity = (typeof RELATIVE_INTENSITIES)[number];

/** Reps -> (relative intensity -> % of 1RM). Reps 1-10 from the first table, 11-20 from the second. */
const TABLE: Record<number, Partial<Record<number, number>>> = {
  1:  { 100: 100, 97.5: 97.5, 95: 95, 92.5: 92.5, 90: 90, 87.5: 87.5, 85: 85, 82.5: 82.5, 80: 80, 77.5: 77.5, 75: 75, 72.5: 72.5, 70: 70, 67.5: 67.5, 65: 65 },
  2:  { 100: 95, 97.5: 92.8, 95: 90.3, 92.5: 88, 90: 85.5, 87.5: 83.3, 85: 80.8, 82.5: 78.5, 80: 76, 77.5: 73.8, 75: 71.3, 72.5: 69, 70: 66.5, 67.5: 64.3, 65: 61.8 },
  3:  { 100: 92.5, 97.5: 90.3, 95: 88, 92.5: 85.8, 90: 83.3, 87.5: 81, 85: 78.5, 82.5: 76.5, 80: 74, 77.5: 71.8, 75: 69.5, 72.5: 67.3, 70: 64.8, 67.5: 62.5, 65: 60.3 },
  4:  { 100: 90, 97.5: 87.8, 95: 85.5, 92.5: 83.3, 90: 81, 87.5: 78.8, 85: 76.5, 82.5: 74.3, 80: 72, 77.5: 69.8, 75: 67.5, 72.5: 65.3, 70: 63, 67.5: 60.8, 65: 58.5 },
  5:  { 100: 87.5, 97.5: 85.5, 95: 83.3, 92.5: 81, 90: 78.8, 87.5: 76.8, 85: 74.5, 82.5: 72.3, 80: 70, 77.5: 68, 75: 65.8, 72.5: 63.5, 70: 61.3, 67.5: 59.3, 65: 57 },
  6:  { 100: 85, 97.5: 83, 95: 80.8, 92.5: 78.8, 90: 76.5, 87.5: 74.5, 85: 72.3, 82.5: 70.3, 80: 68, 77.5: 66, 75: 63.8, 72.5: 61.8, 70: 59.5, 67.5: 57.5, 65: 55.3 },
  8:  { 100: 80, 97.5: 78, 95: 76, 92.5: 74, 90: 72, 87.5: 70, 85: 68, 82.5: 66, 80: 64, 77.5: 62, 75: 60, 72.5: 58, 70: 56, 67.5: 54, 65: 52 },
  10: { 100: 72.5, 97.5: 70.8, 95: 69, 92.5: 67.3, 90: 65.3, 87.5: 63.5, 85: 61.8, 82.5: 60, 80: 58, 77.5: 56.3, 75: 54.5, 72.5: 52.8, 70: 50.8, 67.5: 49, 65: 47.3 },
  11: { 100: 70, 97.5: 68, 95: 67, 92.5: 65, 90: 63, 87.5: 61, 85: 60, 82.5: 58, 80: 56, 77.5: 54, 75: 53, 72.5: 51, 70: 49, 67.5: 47, 65: 46 },
  12: { 100: 67, 97.5: 65, 95: 64, 92.5: 62, 90: 60, 87.5: 59, 85: 57, 82.5: 55, 80: 54, 77.5: 52, 75: 50, 72.5: 49, 70: 47, 67.5: 45, 65: 44 },
  13: { 100: 65, 97.5: 63, 95: 62, 92.5: 60, 90: 59, 87.5: 57, 85: 55, 82.5: 54, 80: 52, 77.5: 50, 75: 49, 72.5: 47, 70: 46, 67.5: 44, 65: 42 },
  14: { 100: 63, 97.5: 61, 95: 60, 92.5: 58, 90: 57, 87.5: 55, 85: 53, 82.5: 52, 80: 50, 77.5: 49, 75: 47, 72.5: 46, 70: 44, 67.5: 43, 65: 41 },
  15: { 100: 62, 97.5: 60, 95: 58, 92.5: 57, 90: 55, 87.5: 54, 85: 52, 82.5: 51, 80: 49, 77.5: 48, 75: 46, 72.5: 45, 70: 43, 67.5: 42, 65: 40 },
  16: { 100: 55, 97.5: 54, 95: 52, 92.5: 51, 90: 50, 87.5: 48, 85: 47, 82.5: 45, 80: 44, 77.5: 43, 75: 41, 72.5: 40, 70: 39, 67.5: 37, 65: 36 },
  17: { 100: 52, 97.5: 51, 95: 49, 92.5: 48, 90: 47, 87.5: 46, 85: 44, 82.5: 43, 80: 42, 77.5: 40, 75: 39, 72.5: 38, 70: 36, 67.5: 35, 65: 34 },
  18: { 100: 49, 97.5: 48, 95: 47, 92.5: 45, 90: 44, 87.5: 43, 85: 42, 82.5: 40, 80: 39, 77.5: 38, 75: 37, 72.5: 36, 70: 34, 67.5: 33, 65: 32 },
  19: { 100: 46, 97.5: 45, 95: 44, 92.5: 43, 90: 41, 87.5: 40, 85: 39, 82.5: 38, 80: 37, 77.5: 36, 75: 35, 72.5: 33, 70: 32, 67.5: 31, 65: 30 },
  20: { 100: 43, 97.5: 42, 95: 41, 92.5: 40, 90: 39, 87.5: 38, 85: 37, 82.5: 35, 80: 34, 77.5: 33, 75: 32, 72.5: 31, 70: 30, 67.5: 29, 65: 28 },
};

/** Reps 7 and 9 aren't in the source table, so they're interpolated from their neighbours rather than
 * silently absent -- a coach writing 4x9 shouldn't fall off the edge of the engine. */
function rowFor(reps: number): Partial<Record<number, number>> | undefined {
  if (TABLE[reps]) return TABLE[reps];
  const below = Object.keys(TABLE).map(Number).filter((r) => r < reps).sort((a, b) => b - a)[0];
  const above = Object.keys(TABLE).map(Number).filter((r) => r > reps).sort((a, b) => a - b)[0];
  if (below === undefined || above === undefined) return undefined;
  const t = (reps - below) / (above - below);
  const out: Partial<Record<number, number>> = {};
  for (const ri of RELATIVE_INTENSITIES) {
    const lo = TABLE[below][ri];
    const hi = TABLE[above][ri];
    if (lo !== undefined && hi !== undefined) out[ri] = Math.round((lo + (hi - lo) * t) * 10) / 10;
  }
  return out;
}

/** What percentage of 1RM produces `relativeIntensity` difficulty at `reps` reps. */
export function absoluteIntensity(reps: number, relativeIntensity: number): number | undefined {
  return rowFor(reps)?.[relativeIntensity];
}

/** The inverse: how hard a set of `reps` at `pctOf1rm` actually was. Snapped to the nearest row, because
 * the table is a ladder rather than a curve and every rule here steps between rungs. */
export function relativeIntensityOf(reps: number, pctOf1rm: number): number | undefined {
  const row = rowFor(reps);
  if (!row) return undefined;
  let best: { ri: number; diff: number } | undefined;
  for (const ri of RELATIVE_INTENSITIES) {
    const v = row[ri];
    if (v === undefined) continue;
    const diff = Math.abs(v - pctOf1rm);
    if (!best || diff < best.diff) best = { ri, diff };
  }
  return best?.ri;
}

/** One week's progression under Model A: same reps, one rung up the ladder.
 *
 * Returns undefined above 100% rather than inventing a rung -- there is no set harder than maximal.
 * Where a block should *stop* is `ceilingRelativeIntensity`, which is usually lower than 100%. */
export function stepUp(relativeIntensity: number, steps = 1): number | undefined {
  const i = RELATIVE_INTENSITIES.indexOf(relativeIntensity as RelativeIntensity);
  if (i < 0) return undefined;
  const next = i - steps;
  return next >= 0 ? RELATIVE_INTENSITIES[next] : undefined;
}

/** A working set, per constraint C2. */
export const MIN_WORKING_RELATIVE_INTENSITY = 80;
/** Constraint C1, in the 6-15 rep range. */
export const MAX_SETS_PER_EXERCISE = 4;

// ---------------------------------------------------------------------------
// Effort scales, and the ceiling
// ---------------------------------------------------------------------------

/** RIR expressed on the relative-intensity ladder.
 *
 * Anchored at both ends by Jack, not interpolated from nothing: 0 RIR is by definition maximal for that
 * rep count (100%), and constraint C2 states RIR 3 / RPE 7 is exactly the 80% working-set floor. Three
 * reps in reserve across twenty points puts each one at 6.67 pp, snapped to the nearest real rung. */
const RIR_LADDER: Record<number, number> = { 0: 100, 1: 92.5, 2: 87.5, 3: 80 };

export function relativeIntensityForRir(rir: number): number | undefined {
  return RIR_LADDER[rir];
}

/** RPE is the same scale read from the other end: RPE 10 is 0 RIR. */
export function relativeIntensityForRpe(rpe: number): number | undefined {
  return RIR_LADDER[10 - rpe];
}

/** The ceiling is a cap on **absolute load**, not on difficulty.
 *
 * Jack's reasoning, verbatim in substance: at three reps the bar is loaded so heavily that going to a
 * true maximum is an injury risk, so a triple stops at RPE 9 / 1 RIR. At twelve reps "the total amount
 * of weight on the bar would have to be significantly less and thus injury won't happen", so a set of
 * twelve may finish a block at a genuine 100%. The variable doing the work in both sentences is pounds
 * on the bar, so that is what the cap is written against.
 *
 * 87.5% of 1RM is the number that reproduces *both* of those statements from the table alone:
 *   - 3 reps: 95% RI would be 88.0% of 1RM (over), 92.5% RI is 85.8% (under) -> ceiling 92.5% = 1 RIR.
 *   - 12 reps: 100% RI is 67.0% of 1RM, nowhere near the cap -> ceiling 100%.
 * Two independent anchors, one parameter, no fudging. Which is also why it is worth distrusting until
 * more of his examples are checked against it. */
export const MAX_ABSOLUTE_INTENSITY = 87.5;

/** The hardest rung a set of `reps` is allowed to finish a block on.
 *
 * Note what this returns across the hypertrophy range of C3 (6-30 reps): 100%, every time. The cap only
 * ever binds at five reps and below, which is strength work. So for the hypertrophy engine the ceiling
 * is simply "maximal", and this function exists for the strength branch and to keep the reasoning
 * visible rather than assumed. */
export function ceilingRelativeIntensity(reps: number): number | undefined {
  for (const ri of RELATIVE_INTENSITIES) {
    const abs = absoluteIntensity(reps, ri);
    if (abs !== undefined && abs <= MAX_ABSOLUTE_INTENSITY) return ri;
  }
  return undefined;
}

/** Where a block has to open so that its last week lands exactly on the ceiling.
 *
 * The ramp is derived, not stored. Jack's rule is that the top of the ramp *is* the final week before a
 * deload -- "I don't think there's anything wrong at all going to a 100% relative intensity set by the
 * end of the mesocycle before a deload" -- so block length and ramp length are the same quantity, and
 * the starting point falls out of counting backwards from the ceiling.
 *
 * Returns undefined when the block is too long to ramp in one piece: at 2.5 pp a week from a 100%
 * ceiling, week one of a ten-week block would open at 77.5%, below the C2 working-set floor. Long blocks
 * need an internal reset, and that reset is not yet specified, so this refuses rather than inventing one. */
export function rampStart(reps: number, weeks: number, stepPp = 2.5): number | undefined {
  const ceiling = ceilingRelativeIntensity(reps);
  if (ceiling === undefined || weeks < 1) return undefined;
  const start = ceiling - (weeks - 1) * stepPp;
  if (start < MIN_WORKING_RELATIVE_INTENSITY) return undefined;
  return RELATIVE_INTENSITIES.includes(start as RelativeIntensity) ? start : undefined;
}

/** How many weeks of unbroken ramp a rep scheme affords before it would break the C2 floor. */
export function maxRampWeeks(reps: number, stepPp = 2.5): number {
  const ceiling = ceilingRelativeIntensity(reps);
  if (ceiling === undefined) return 0;
  return Math.floor((ceiling - MIN_WORKING_RELATIVE_INTENSITY) / stepPp) + 1;
}
