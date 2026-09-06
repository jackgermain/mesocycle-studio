/** Training age, and the one thing it actually changes: how fast exercises have to be replaced.
 *
 * This resolves what looked like a contradiction in the data. Jack rebuilds his own program every two to
 * five weeks -- eight sheets, four lettered blocks, 16-19% exercise overlap across each seam. His clients
 * go far longer: Marco's 41 weeks contain only two rebuild points, with 88% week-to-week continuity
 * everywhere else. Same coach, wildly different turnover.
 *
 * > *"Most of these people that are my clients are mostly beginners when it came to lifting. When they
 * > came to me, I got a lot out of them really fast and I didn't need to swap exercises around much --
 * > they could just keep making gains for almost a full year on end without having to change that much.
 * > That's usually how it is when you're in your first year or two of training. It's called newbie
 * > gains... As somebody starts becoming a bit more intermediate, they're gonna start plateauing on
 * > things a lot sooner, which requires variation with exercises that will correlate to each other."*
 *
 * So the turnover difference is **training age, not coaching style**. And it lines up with P11: a
 * detrained beginner is inhibited on everything, so their first year of progress is largely the
 * inhibition lifting, and that does not need novelty to keep going. An advanced lifter has spent that,
 * and novelty is most of what is left.
 */

export type TrainingAge = "beginner" | "intermediate" | "advanced";

/** Years of consistent training. Jack's own boundary for the top end, given earlier: *"that being
 * somewhere between seven and ten years and above."* The beginner boundary is his "first year or two". */
export function trainingAgeFromYears(years: number): TrainingAge {
  if (years < 2) return "beginner";
  if (years < 7) return "intermediate";
  return "advanced";
}

/** Roughly how long an exercise can stay in the program before it stops paying.
 *
 * Beginner and advanced are measured; intermediate is interpolated and is the least confident number
 * here. Beginners: *"almost a full year on end"*, and Marco's two rebuilds in 41 weeks agree. Advanced:
 * his own blocks run 2-5 weeks and swap 81-84% of their exercises at the seam. */
export const SWAP_INTERVAL_WEEKS: Record<TrainingAge, number> = {
  beginner: 20,
  intermediate: 8,
  advanced: 4,
};

/** True when this week is a block seam -- most exercises change, loads reset, the ramp starts again.
 * Week 1 is not a seam; the program has only just begun. */
export function isSwapWeek(week: number, age: TrainingAge): boolean {
  const n = SWAP_INTERVAL_WEEKS[age];
  return week > 1 && (week - 1) % n === 0;
}

/** What a swap is allowed to swap *to*.
 *
 * *"Variation with exercises that will correlate to each other."* The replacement is the same movement
 * pattern in a different expression -- incline for flat, dumbbell for barbell, pulldown for pull-up --
 * not a different job in the session. Which is exactly why `patternOf` exists: the pattern is the
 * invariant across a swap, and everything else is free to move. */
export const SWAP_PRESERVES_PATTERN = true;
