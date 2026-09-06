/** Model C -- how Jack actually progresses a general-population client, week to week.
 *
 * Models A and B in the doctrine both start from a percentage of 1RM. This one never does, and that is
 * the point. Asked what he looks at to write Carolyn's next session, the answer contained no maximum,
 * no percentage and no table lookup: *"if I've got three sets of ten with the thirties and they move
 * pretty well, I might say, okay, let's either do... two sets of eight with the thirty fives and then
 * one set of eight with the thirties."* The input is last week's log. Nothing else.
 *
 * So the relative intensity table is not a load calculator for this model. It is a check on the answer
 * and an explanation of it. That is a much weaker dependency than it looked, and it means the engine can
 * run for a client who has never tested a maximum in their life -- which is all ten of them.
 */

import type { Equipment } from "../data/types";
import { DUMBBELL_WEIGHTS, BARBELL_WEIGHT, stepForEquipment } from "../screens/exerciseHelpers";

export interface PerformedSet {
  reps: number;
  /** null is bodyweight, which has no load lever at all. */
  load: number | null;
}

/** Which of the two levers to pull. Jack splits these by position in the session:
 *
 * *"If I'm doing a set of ten reps and more, if I just add a rep week over week with the same weight,
 * you're increasing the total workload by ten percent each set. So that won't necessarily promote a
 * strength adaptation as much, because in order to get stronger you have to put more load on the bar.
 * But what you won't downplay from that at all is hypertrophy... So this can be helpful for exercises
 * after your big heavy hitters, which are usually done earlier in the session."*
 *
 * Which sharpens P3 considerably. P3 said earlier exercises get the progression; this says earlier
 * exercises get the **load**, and later ones get the **reps**. */
export type Lever = "reps" | "load";

/** The rep band a lift floats inside before the load is allowed to move.
 *
 * *"I may, with a client, keep the reps above eight reps at all times regardless of whether I make a
 * weight jump."* The floor is what the load jump is allowed to drop you back to; the ceiling is what
 * triggers the jump in the first place. */
export interface RepBand {
  min: number;
  max: number;
}

export const DEFAULT_REP_BAND: RepBand = { min: 8, max: 12 };

/** Sessions per week below which a deload is simply not scheduled.
 *
 * *"I definitely wouldn't deload anybody who is training anything less than four times a week. Even four
 * times a week, it's not really needed."* This is why two real clients ran 41 and 47 weeks unbroken --
 * not because the deload was hidden somewhere the analysis missed, but because there wasn't one. Most of
 * the roster trains 2-4x, so for most of the roster the answer to "when do we deload" is "we don't". */
export const DELOAD_FREQUENCY_THRESHOLD = 5;

export function needsScheduledDeload(sessionsPerWeek: number): boolean {
  return sessionsPerWeek >= DELOAD_FREQUENCY_THRESHOLD;
}

/** The next load the equipment actually has. Dumbbells are a rack with irregular gaps at the bottom, not
 * an arithmetic series -- 2.5, 5, 10, 12.5, 17.5 -- so this walks the real lattice. */
export function nextLoadUp(equipment: Equipment, current: number): number {
  if (equipment === "dumbbell") {
    return DUMBBELL_WEIGHTS.find((w) => w > current + 0.01) ?? current;
  }
  const step = stepForEquipment(equipment);
  const floor = equipment === "barbell" ? BARBELL_WEIGHT : 0;
  return Math.max(floor, Math.floor((current - floor) / step + 1e-6) * step + floor + step);
}

/** What a load jump costs, as a percentage of what is on the bar now.
 *
 * This is the whole reason the stagger below exists. *"Thirty to thirty five is a relatively small jump
 * compared to going from, like, fifteen pounds to twenty pounds on some exercise, as that's a twenty
 * five percent increase."* The rack's step is fixed; its relative cost is not, and it is punishing at
 * the light end where most general-population accessory work lives. */
export function loadJumpPct(from: number, to: number): number {
  if (from <= 0) return 0;
  return ((to - from) / from) * 100;
}

/** What one extra rep is worth, as a percentage of the set's work.
 *
 * *"If I just add a rep week over week with the same weight, you're increasing the total workload or
 * stress by ten percent each set."* At ten reps that is exactly 1/10. This is the exchange rate between
 * the two levers, and it is the only reason they can be compared at all. */
export function repWorthPct(reps: number): number {
  return reps > 0 ? 100 / reps : 0;
}

/** How many reps have to come off to pay for a load jump.
 *
 * 30 -> 35 lb at ten reps is a 16.7% rise against 10% a rep, so 1.7 reps -- and Jack drops two, which
 * slightly overpays. 15 -> 20 lb is 33%, or 3.3 reps, which is why he would rather add reps than jump
 * load on a light accessory movement. */
export function repsToOffsetJump(from: number, to: number, reps: number): number {
  const worth = repWorthPct(reps);
  return worth > 0 ? loadJumpPct(from, to) / worth : 0;
}

/** Total work in the crude sense -- reps x load, summed. Deliberately *not* the thing being maximised:
 * P7 says reps near failure are worth more, so a week may drop on this measure and still be harder. It
 * is reported so that drop is visible rather than accidental. */
export function tonnage(sets: PerformedSet[]): number {
  return sets.reduce((n, s) => n + s.reps * (s.load ?? 0), 0);
}

/** Add a rep to every set still under the ceiling. The plain hypertrophy lever. */
export function addReps(sets: PerformedSet[], band: RepBand = DEFAULT_REP_BAND): PerformedSet[] {
  return sets.map((s) => (s.reps < band.max ? { ...s, reps: s.reps + 1 } : s));
}

/** Jump the load on some of the sets, and pay for it in reps.
 *
 * The stagger is the part worth having. Jack does not move all three sets at once -- he moves some and
 * leaves the rest behind: *"two sets of eight with the thirty fives and then one set of eight with the
 * thirties. That way, the load increase, even though it's not very small relatively in percentage, is
 * slightly offsetted by the volume being ever so slightly lower."*
 *
 * That is how you get an increment finer than the rack has. A 5 lb dumbbell step applied to two of three
 * sets is an effective 3.3 lb, and the leftover sets are what next week promotes. `promote` defaults to
 * all-but-one for that reason; pass the set count to move everything at once.
 *
 * **The promoted sets always land on the band floor**, however big the jump, because of P11 -- the first
 * exposure to an unfamiliar load is inhibited and simply will not produce the reps the arithmetic says
 * it should. *"They'd probably only be able to do eight partly because of this."*
 *
 * What happens to the sets left behind is `holdRemainder`, and Jack has done it both ways:
 *   - 3x10 @ 30  ->  2x8 @ 35, **1x8** @ 30   (dropped them too)
 *   - 3x12 @ 35  ->  1x8 @ 40, **1x12, 1x10** @ 35   (held them)
 * Holding defaults on, because it protects the session's total work (P5) and the second example is both
 * the more recent and the more detailed. His own comment on it: *"you don't literally have to do that,
 * but I'm playing around with the reps and the relative intensities."* Which rule applies when is an
 * open question, not a solved one. */
export function jumpLoad(
  sets: PerformedSet[],
  opts: { equipment: Equipment; band?: RepBand; promote?: number; holdRemainder?: boolean },
): PerformedSet[] {
  const band = opts.band ?? DEFAULT_REP_BAND;
  const hold = opts.holdRemainder ?? true;
  if (!sets.length || sets.some((s) => s.load === null)) return sets;
  const heaviest = Math.max(...sets.map((s) => s.load ?? 0));
  const target = nextLoadUp(opts.equipment, heaviest);
  if (target <= heaviest) return sets;

  const n = opts.promote ?? Math.max(1, sets.length - 1);
  return sets.map((s, i) => {
    if (i < n) return { load: target, reps: band.min };
    return hold ? { ...s } : { load: s.load, reps: band.min };
  });
}

/** One week of Model C.
 *
 * The lever is chosen by the caller, not guessed here, because Jack's own answer to which one to use was
 * *"it depends on the goal of the client, period."* The one rule he did give is positional and lives in
 * `Lever` above. Load only actually moves once the band's ceiling is reached; asking for the load lever
 * earlier still adds reps, which is what keeps a jump from landing on a set that has not earned it. */
export function progress(
  sets: PerformedSet[],
  opts: {
    equipment: Equipment;
    lever: Lever;
    band?: RepBand;
    promote?: number;
    holdRemainder?: boolean;
  },
): PerformedSet[] {
  const band = opts.band ?? DEFAULT_REP_BAND;
  if (!sets.length) return sets;
  const atCeiling = sets.every((s) => s.reps >= band.max);
  if (opts.lever === "load" && atCeiling) return jumpLoad(sets, { ...opts, band });
  return addReps(sets, band);
}

/** Render a week the way Jack says it out loud: "2x8 @ 35, 1x8 @ 30". */
export function describe(sets: PerformedSet[]): string {
  const groups: { reps: number; load: number | null; count: number }[] = [];
  for (const s of sets) {
    const last = groups[groups.length - 1];
    if (last && last.reps === s.reps && last.load === s.load) last.count++;
    else groups.push({ reps: s.reps, load: s.load, count: 1 });
  }
  return groups.map((g) => `${g.count}x${g.reps} @ ${g.load === null ? "BW" : g.load}`).join(", ");
}
