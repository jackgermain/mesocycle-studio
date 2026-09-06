/** Strength blocks: descending rep ladders, and the rep-count gates that police them.
 *
 * *"This is something I would be doing if you were younger, of my age, serious -- you were trying to get
 * strong, you wanted to get bigger as well, but you wanted to get strong."*
 *
 * ## The gates
 *
 * Two hard rules, and neither was anywhere in the engine before:
 *
 * > *"There's pretty much no reason to ever be doing an accessory exercise -- that being not one of our
 * > compounds -- at pretty much anything under the eight rep range. **All accessories should be eight
 * > reps and above.** The eight rep range and below is pretty much reserved for your compounds."*
 *
 * > *"**Sets of five and below are only reserved for** things like a squat, bench, deadlift, power clean,
 * > snatch, front squat, overhead press, hex bar deadlift, or any major power exercise that you're trying
 * > to move something really fast."*
 *
 * So the floor on a rep count is a property of the exercise, in three tiers: accessories stop at 8, ordinary
 * compounds stop at 6, and only the major barbell lifts go to 5 and below.
 */

import { patternOf } from "./patterns";

/** The lifts allowed below six reps. Note "or any major power exercise you're trying to move really
 * fast" -- the list is the shape of the rule, not its whole extent. */
const MAJOR_LIFTS =
  /squat|bench press|deadlift|power clean|\bclean\b|snatch|\bjerk\b|overhead press|military press|push press/i;

export function isMajorLift(name: string): boolean {
  return MAJOR_LIFTS.test(name);
}

/** The fewest reps this exercise should ever be prescribed for.
 *
 * 8 for accessories, 6 for ordinary compounds, 3 for the major lifts. Below three is peak-strength
 * territory and outside anything he has described writing for a client. */
export function minRepsFor(name: string): number {
  if (isMajorLift(name)) return 3;
  if (patternOf(name)) return 6;
  return 8;
}

export function isLegalRepCount(name: string, reps: number): boolean {
  return reps >= minRepsFor(name);
}

export interface LadderWeek {
  week: number;
  sets: number;
  reps: number;
  /** Pounds to add over the previous week. Zero in week one. */
  loadStep: number;
  totalReps: number;
}

/** The descending ladder, which is the strength block's shape.
 *
 * His worked example, opening at three sets of six:
 *
 * | Week | Scheme | Total reps | Load |
 * |---|---|---|---|
 * | 1 | 3x6 | 18 | — |
 * | 2 | 4x5 | 20 | +10 |
 * | 3 | 5x4 | 20 | +10 |
 * | 4 | 5x3 | **15** | +5 to +10 |
 *
 * **Sets rise as reps fall, holding total reps roughly level -- and then volume drops at the end.** The
 * reason is the same one behind P7: *"the same number of reps, but because there's only four of them each
 * set, they're a little bit more stimulative"*, so holding the rep total constant is already an increase
 * in stress, which is what the added load is paid for out of.
 *
 * Sets climb to five and stop. C1's cap of four applies to the 6-15 rep range, so five sets of four and
 * five sets of three do not violate it -- the cap and this ladder never overlap.
 *
 * *"You could pretty much do this for anything other than, like, cleans or snatches."* */
export function descendingLadder(
  startReps: number,
  weeks: number,
  opts: { startSets?: number; maxSets?: number; minReps?: number; loadStep?: number } = {},
): LadderWeek[] {
  const maxSets = opts.maxSets ?? 5;
  const minReps = opts.minReps ?? 3;
  const step = opts.loadStep ?? 10;
  let sets = opts.startSets ?? 3;
  let reps = startReps;
  const out: LadderWeek[] = [];

  for (let w = 1; w <= weeks; w++) {
    out.push({
      week: w,
      sets,
      reps,
      loadStep: w === 1 ? 0 : step,
      totalReps: sets * reps,
    });
    if (reps > minReps) reps -= 1;
    if (sets < maxSets) sets += 1;
  }
  return out;
}

/** The other direction -- opening at six and climbing into hypertrophy.
 *
 * Recorded as the weaker option rather than the symmetric one, because he says so: *"each time you do
 * this you might be able to take a very small weight jump, perhaps ten or fifteen pounds throughout the
 * block. Wouldn't be as much as it would be if you kept the reps the same or dropped them, but you'd
 * still get a bit stronger."*
 *
 * So **climbing in reps costs strength progress**: 10-15 lb across a whole block against the 25-30 lb the
 * descending ladder produces over the same four weeks. Worth stating plainly, because "add a rep" is the
 * cheapest-looking progression and it is the expensive one when strength is the goal. */
export const ASCENDING_BLOCK_LOAD_GAIN_LB: [number, number] = [10, 15];
export const DESCENDING_LADDER_LOAD_GAIN_LB: [number, number] = [25, 30];
