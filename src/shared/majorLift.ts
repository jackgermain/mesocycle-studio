/** Whether an exercise is a major lift, for the rule that a set never comes off one.
 *
 * > *"I wouldn't take a set away from a major exercise. No matter what. I would take it away from one of the
 * > smaller accessories."*
 *
 * `patternOf` already answers most of this and answers it from Jack's own words — a movement with a
 * pattern is a compound, and one without is "in a category of their own", which is how shrugs stay
 * accessories. Run over the whole 202-exercise library it gets Chest, Back, Quads, Biceps, Triceps, the
 * delts, Abs and Traps right.
 *
 * **The gaps below are fixed HERE rather than in `patterns.ts` on purpose.** That table also decides which
 * movements may open a session in the generator, so widening it would change generated programs — and a
 * generator change has to be measured across all 125 templates and rendered, not assumed. This rule needs
 * none of that: it only ever protects an exercise from losing a set.
 */
import { patternOf } from "../generator/patterns";

/** Real majors in the library that `patternOf` misses, each one checked against the actual names:
 *
 * - `Seated Barbell Press` — the vertical-push rule wants "overhead/shoulder/military/arnold/push press"
 * - `Incline Smith Machine Press` — the horizontal-push rule wants "incline press" adjacent
 * - `Dumbbell Floor Press`
 * - `Power Clean`, `Clean and Jerk`, `Snatch`, `Kettlebell Swing` — filed under Full body, no pattern at all
 * - `Glute Ham Raise` — filed as a hamstrings accessory, but it is the heaviest thing in that list
 */
const ALSO_MAJOR = /barbell press|smith machine.*press|floor press|clean|snatch|jerk|kettlebell swing|glute ham raise/;

/** And one `patternOf` over-claims: `Leg Press Calf Raise` matches /leg press/ and comes back a squat
 * pattern. It is a calf raise, and calves are exactly where a set should be able to come off. */
const NEVER_MAJOR = /calf raise/;

export function isMajorLift(name: string): boolean {
  const n = name.toLowerCase();
  if (NEVER_MAJOR.test(n)) return false;
  return patternOf(n) !== undefined || ALSO_MAJOR.test(n);
}
