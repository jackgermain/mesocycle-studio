/** Why reps fall across the sets of one exercise, and what that fall tells you.
 *
 * 82% of the multi-set rep entries in the client programs descend -- Jing's `12,10,8`, Marco's `11,8,6`.
 * The question was whether that is a prescription or a record. It is a record, and it is not a defect:
 *
 * > *"There's nothing wrong with having a descending rep scheme at all. You can either have it be three
 * > sets of ten, you can have it be twelve ten eight -- it doesn't matter how you group the sets...
 * > If you do three sets of ten with the same weight, the first set isn't going to be as hard as the
 * > last one. When you have a descending rep scheme of somewhere around two or three reps off each set,
 * > it mostly happens because the relative intensity of each set is really high. They may be training
 * > really close to failure that first set, and because of that they're not fully recovered by the
 * > second set, and therefore they only do ten reps instead of twelve. And then again for the last set
 * > they're a little more fatigued, so they only do eight."*
 *
 * So the descent is **C2 working correctly**. If every set is genuinely near failure, reps must fall.
 * Which makes the size of the fall a free diagnostic, checkable from what a client already logs:
 *
 *   - **no fall at all** -> the first set was not close enough to failure
 *   - **two or three a set** -> right where it should be
 *   - **a collapse** -> the first set was taken too far, and the rest of the exercise paid for it
 *
 * Measured across 2,237 multi-set entries in eight client programs: median drop **exactly 2**, mean 1.89,
 * with 33% of consecutive pairs dropping exactly two reps. His "two or three" is the real distribution,
 * not a rule of thumb. 16% drop nothing at all, which is the band this flags.
 */

export type SetFatigueVerdict = "not-hard-enough" | "on-target" | "too-hard" | "unknown";

/** Measured from the client programs. Consecutive-set drops outside this want a look. */
export const EXPECTED_DROP_PER_SET = { min: 1, ideal: 2, max: 3 } as const;

export function meanDropPerSet(reps: number[]): number | undefined {
  if (reps.length < 2) return undefined;
  return (reps[0] - reps[reps.length - 1]) / (reps.length - 1);
}

/** Read an exercise's logged reps as a statement about how hard the first set was.
 *
 * Deliberately forgiving at the edges: this is a nudge for a coach, not an alarm, and a single session's
 * reps carry a lot of noise -- a missed night's sleep moves this as much as a mis-set load does. */
export function judgeSetFatigue(reps: number[]): SetFatigueVerdict {
  const drop = meanDropPerSet(reps);
  if (drop === undefined) return "unknown";
  if (drop <= 0.25) return "not-hard-enough";
  // >= 4 rather than > 4: a mean drop of four is 12 -> 8 -> 4, which is halving the exercise. In the
  // measured distribution drops of 4 or more are the top 14%, which is the right size for a nudge.
  if (drop >= EXPECTED_DROP_PER_SET.max + 1) return "too-hard";
  return "on-target";
}

/** What a coach should read when the verdict isn't "on-target". */
export function explainSetFatigue(reps: number[]): string {
  switch (judgeSetFatigue(reps)) {
    case "not-hard-enough":
      return "Reps held across every set, so the first one had more in the tank than it should. A working set is RPE 7 or above.";
    case "too-hard":
      return "Reps fell off a cliff after the first set, which usually means set one went to failure and spent the rest of the exercise.";
    case "on-target":
      return "Reps fell about two a set, which is what near-failure sets look like.";
    default:
      return "Not enough sets logged to say.";
  }
}
