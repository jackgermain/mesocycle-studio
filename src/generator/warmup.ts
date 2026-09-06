/** Warm-up sets: a ramp toward the working load, priced as a fraction of it.
 *
 * Note what these percentages are *of*. Not 1RM -- the working load for that day. Which is the same
 * choice Model C makes, and for the same reason: the engine knows what someone is about to lift and does
 * not know their maximum.
 *
 * > *"I really like to have about half as much as your working load for about 10 reps, then about 75% of
 * > your working load for another 5 to 8 reps, then a little bit more weight for a single or a double,
 * > and then I go for my working set from there."*
 *
 * His own, working up to 3x8 with the 100 lb dumbbells on flat press: **50 x10, 75 x5-8, 85 x1-2, 95 x1**.
 * Four rather than three, and he says why: *"this is a little bit repetitive as it's just a high total
 * number of weight, so I like to do singles and doubles for me specifically."* More absolute load on the
 * body means more rungs on the way up.
 *
 * How many, and this is the part that is easy to get wrong -- **warm-ups belong to the body part, not to
 * the exercise.** The first exercise for a muscle gets the full ramp; the second chest movement of the
 * session does not start from scratch:
 *
 * > *"That goes for the first of the first exercise for that body part. So say I'm doing another chest
 * > exercise after that -- I might do one, maybe two at the most, with a similar progression of jumping
 * > up in load. The only thing I would spend more time warming up for are bigger exercises. If I was
 * > going to bench press heavy that day I'd have a different warm-up scheme, and if I was going to squat,
 * > I'd probably do four warm-up sets."*
 *
 * ## What a warm-up is actually for
 *
 * The mechanism, which explains the rules above rather than merely accompanying them:
 *
 * > *"The whole goal of warming up is to stretch out the tissue a little bit so that it's warm --
 * > importantly, because warm things are pliable -- but also to take the muscle through the range of
 * > motion that it's going to be worked in, and then gradually increase the activation of the nervous
 * > system, so that by the time you hit your first set those motor units are already a bit more
 * > stimulated and primed for your working sets. But the most important thing is that the muscle is warm
 * > in temperature and flexible."*
 *
 * Three jobs, and **they are not spread evenly across the rungs**:
 *
 *   - the **first** rung buys temperature and range of motion -- which is why it is ten reps at half the
 *     load, and why it is the one that must never be cut;
 *   - the **top** rungs buy nervous-system priming -- which is why they are singles and doubles near the
 *     working weight, and why more absolute load wants more of them;
 *   - and it is why the count belongs to the **body part**. Once the tissue is warm and has been through
 *     its range, a second exercise for the same muscle does not need to buy that again -- only the
 *     priming for a new movement, which is one rung near the working load.
 */

import type { Equipment } from "../data/types";
import { DUMBBELL_WEIGHTS, BARBELL_WEIGHT, stepForEquipment } from "../screens/exerciseHelpers";
import { patternOf } from "./patterns";

/** What a given rung is buying. Cutting a warm-up short should drop priming, never temperature. */
export type WarmupPurpose = "temperature" | "range" | "priming";

export interface WarmupSet {
  load: number | null;
  reps: number;
  /** What fraction of the working load this rung is, before snapping to real equipment. */
  pctOfWorking: number;
  purpose: WarmupPurpose;
}

/** Where an exercise sits relative to the muscle it trains, which is what sets the number of rungs. */
export type WarmupContext =
  /** The first exercise for this body part in this session. */
  | "first-for-muscle"
  /** A later exercise for a body part already warmed up. */
  | "subsequent"
  /** A big lift that is also the first thing that day -- the only case that gets four rungs. */
  | "big-first"
  /** A big lift, or a row leading a body part. Three rungs. */
  | "big"
  /** Isolation work. Three short rungs, the last a single at the working weight. */
  | "accessory"
  /** A big compound arriving after the body part is already warm. His "one, maybe two at the most". */
  | "subsequent-big";

/** The ramps, as fractions of the working load and reps at each rung.
 *
 * The three-rung version is his stated default. The four-rung version is his own worked example, and the
 * extra rung goes in near the top rather than the bottom -- the singles and doubles are what get denser
 * as the bar gets heavy, not the light work. */
const RAMPS: Record<
  WarmupContext,
  { pct: number; reps: number; purpose: WarmupPurpose; atWorkingWeight?: boolean }[]
> = {
  // "Bench, squat, deadlift get at least three, or even four with a single -- especially if they are the
  // first thing that day."
  "big-first": [
    { pct: 0.5, reps: 10, purpose: "temperature" },
    { pct: 0.75, reps: 6, purpose: "range" },
    { pct: 0.85, reps: 2, purpose: "priming" },
    { pct: 0.95, reps: 1, purpose: "priming" },
  ],
  big: [
    { pct: 0.5, reps: 10, purpose: "temperature" },
    { pct: 0.75, reps: 6, purpose: "range" },
    { pct: 0.9, reps: 2, purpose: "priming" },
  ],
  "first-for-muscle": [
    { pct: 0.5, reps: 10, purpose: "temperature" },
    { pct: 0.75, reps: 6, purpose: "range" },
    { pct: 0.9, reps: 2, purpose: "priming" },
  ],
  // Isolation. His worked example, 3x10 lateral raises with the 30s: "I'd go for the fifteens and do
  // maybe seven reps really quick, then wait a second and another three or four, so totaling about ten.
  // Then I'd go up to twenty two point five if they had them -- most gyms don't, so twenty -- and do
  // another five reps. And then I would maybe do a single or double WITH THE WORKING WEIGHT, since the
  // total amount isn't that high."
  //
  // That last rung is the one that makes this ramp different: it sits *at* the working load, not below
  // it. On a light isolation movement there is nothing to be gained by approaching from underneath.
  accessory: [
    { pct: 0.5, reps: 10, purpose: "temperature" },
    { pct: 0.7, reps: 5, purpose: "range" },
    { pct: 1.0, reps: 2, purpose: "priming", atWorkingWeight: true },
  ],
  // The tissue is already warm and has already been through its range, so the one rung left to buy is
  // priming for a movement the nervous system has not done yet today.
  subsequent: [{ pct: 0.75, reps: 5, purpose: "priming" }],
  // Two, because it is a heavier and more widely-recruiting movement -- but not four, because the
  // temperature and range were already bought by whatever opened the body part.
  "subsequent-big": [
    { pct: 0.6, reps: 6, purpose: "range" },
    { pct: 0.85, reps: 2, purpose: "priming" },
  ],
};

/** The lifts that get the long ramp, named rather than inferred from load.
 *
 * > *"Any of the big compounds -- bench, squat, deadlift, any sort of Olympic lift, even some like super
 * > heavy barbell rows or T-bar rows or cable rows. These require a little bit more warming up, just
 * > because the loads on them especially can get really heavy and they use a lot of different muscles,
 * > so you need to make sure that you feel good going into them and that you're ready to go."*
 *
 * Two criteria in that sentence, not one: the load gets heavy **and** the movement recruits widely. So
 * this is a property of the exercise, not a threshold on the number -- though a caller may still force
 * the long ramp for an unusually strong lifter, which is what Jack does for himself on a dumbbell press
 * at 100 lb a hand. */
const ALWAYS_BIG = /squat|bench press|deadlift|\bclean\b|snatch|\bjerk\b|overhead press|military press|shoulder press|push press|hip thrust/i;
const BIG_WHEN_LEADING = /barbell row|bent-?over row|t-?bar row|pendlay|meadows|cable row|gorilla row/i;

/** Always worth the long ramp, whatever else the session has done. A loaded barbell squat or bench is
 * heavy by definition, and no amount of earlier chest work primes the nervous system for 225 on a bar. */
export function isAlwaysBig(name: string): boolean {
  return ALWAYS_BIG.test(name);
}

/** Worth the long ramp only when it opens the body part. His qualifier was "*super heavy* barbell rows or
 * T-bar rows or cable rows" -- these get very heavy in his own training and are ordinary accessory work
 * in a client's, and the difference shows up in where they sit in the session. */
export function isBigWhenLeading(name: string): boolean {
  return BIG_WHEN_LEADING.test(name);
}

export function isBigCompound(name: string): boolean {
  return isAlwaysBig(name) || isBigWhenLeading(name);
}

/** Snap a warm-up load **down** to something the equipment has, never up.
 *
 * Rounding to nearest would make a warm-up heavier than intended, which is the one direction a warm-up
 * must not err in. Jack's client example shows the same instinct: working up to 75, he opens at 30 rather
 * than the 37.5 that half would be, and 35 is the nearest thing on a rack. */
function snapDown(equipment: Equipment, raw: number): number {
  if (equipment === "bodyweight") return 0;
  if (equipment === "dumbbell") {
    const under = DUMBBELL_WEIGHTS.filter((w) => w <= raw + 0.01);
    return under.length ? under[under.length - 1] : DUMBBELL_WEIGHTS[0];
  }
  const step = stepForEquipment(equipment);
  const floor = equipment === "barbell" ? BARBELL_WEIGHT : 0;
  const snapped = Math.floor((raw - floor) / step) * step + floor;
  return Math.max(floor, snapped);
}

/** The warm-up for one exercise.
 *
 * Returns an empty list where a ramp makes no sense: bodyweight movements, and anything whose working
 * load is already at the bottom of what the equipment offers -- warming up for a 10 lb lateral raise with
 * the 5s is a set nobody does. That floor is a judgement of mine, not a rule he gave. */
export function warmupFor(
  workingLoad: number | null,
  equipment: Equipment,
  context: WarmupContext = "first-for-muscle",
): WarmupSet[] {
  if (workingLoad === null || equipment === "bodyweight") return [];

  const out: WarmupSet[] = [];
  let previous = -1;
  for (const rung of RAMPS[context]) {
    const load = snapDown(equipment, workingLoad * rung.pct);
    // Skip a rung that lands on the same weight as the one before it, or on the working load itself --
    // both are a set that does nothing.
    const tooHigh = rung.atWorkingWeight ? load > workingLoad : load >= workingLoad;
    if (load <= previous || tooHigh || load <= 0) continue;
    out.push({ load, reps: rung.reps, pctOfWorking: rung.pct, purpose: rung.purpose });
    previous = load;
  }
  return out;
}

/** Warm-ups for a whole session, given its exercises in order.
 *
 * The muscle ledger is the point: the first exercise for a body part gets the full ramp and every later
 * one for that same body part gets the short version, which is the rule that is invisible if you only
 * ever look at one exercise at a time. */
export function warmupsForSession(
  exercises: { name: string; muscle: string; equipment: Equipment; workingLoad: number | null; big?: boolean }[],
): WarmupSet[][] {
  const warmed = new Set<string>();
  return exercises.map((ex, i) => {
    // A big compound arriving after the body part is warm still wants more than one rung -- it is
    // heavier and recruits more widely -- but not the full four, because the temperature and range were
    // already bought. His qualifier was "*super heavy* barbell rows or T-bar rows or cable rows", and a
    // moderate cable row after a heavy barbell row is not that. Pass `big` to force the long ramp.
    const alreadyWarm = warmed.has(ex.muscle);
    const isFirstOfDay = i === 0;
    const big = ex.big || isAlwaysBig(ex.name);
    // Isolation -- no movement pattern means no compound. These get the short ramp that finishes at the
    // working weight rather than below it.
    const isolation = !patternOf(ex.name);

    const context: WarmupContext = big
      ? isFirstOfDay
        ? "big-first"
        : "big"
      : alreadyWarm
        ? isBigWhenLeading(ex.name)
          ? "subsequent-big"
          : "subsequent"
        : isBigWhenLeading(ex.name)
          ? "big"
          : isolation
            ? "accessory"
            : "first-for-muscle";
    warmed.add(ex.muscle);
    return warmupFor(ex.workingLoad, ex.equipment, context);
  });
}

export function describeWarmup(sets: WarmupSet[]): string {
  if (!sets.length) return "no warm-up";
  return sets.map((s) => `${s.load}x${s.reps}`).join(", ");
}
