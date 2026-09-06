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
 */

import type { Equipment } from "../data/types";
import { DUMBBELL_WEIGHTS, BARBELL_WEIGHT, stepForEquipment } from "../screens/exerciseHelpers";

export interface WarmupSet {
  load: number | null;
  reps: number;
  /** What fraction of the working load this rung is, before snapping to real equipment. */
  pctOfWorking: number;
}

/** Where an exercise sits relative to the muscle it trains, which is what sets the number of rungs. */
export type WarmupContext =
  /** The first exercise for this body part in this session. */
  | "first-for-muscle"
  /** A later exercise for a body part already warmed up. */
  | "subsequent"
  /** A heavy barbell squat or bench -- more load on the frame, so more rungs. */
  | "big";

/** The ramps, as fractions of the working load and reps at each rung.
 *
 * The three-rung version is his stated default. The four-rung version is his own worked example, and the
 * extra rung goes in near the top rather than the bottom -- the singles and doubles are what get denser
 * as the bar gets heavy, not the light work. */
const RAMPS: Record<WarmupContext, { pct: number; reps: number }[]> = {
  "first-for-muscle": [
    { pct: 0.5, reps: 10 },
    { pct: 0.75, reps: 6 },
    { pct: 0.9, reps: 2 },
  ],
  big: [
    { pct: 0.5, reps: 10 },
    { pct: 0.75, reps: 6 },
    { pct: 0.85, reps: 2 },
    { pct: 0.95, reps: 1 },
  ],
  subsequent: [{ pct: 0.75, reps: 5 }],
};

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
    if (load <= previous || load >= workingLoad || load <= 0) continue;
    out.push({ load, reps: rung.reps, pctOfWorking: rung.pct });
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
  return exercises.map((ex) => {
    const context: WarmupContext = ex.big
      ? "big"
      : warmed.has(ex.muscle)
        ? "subsequent"
        : "first-for-muscle";
    warmed.add(ex.muscle);
    return warmupFor(ex.workingLoad, ex.equipment, context);
  });
}

export function describeWarmup(sets: WarmupSet[]): string {
  if (!sets.length) return "no warm-up";
  return sets.map((s) => `${s.load}x${s.reps}`).join(", ");
}
