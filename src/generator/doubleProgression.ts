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
import { bandForReps, leverPreferenceFor } from "./repRanges";

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

/** Add reps to every set still under the ceiling. The plain hypertrophy lever. */
export function addReps(
  sets: PerformedSet[],
  band: RepBand = DEFAULT_REP_BAND,
  by = 1,
): PerformedSet[] {
  return sets.map((s) => (s.reps < band.max ? { ...s, reps: Math.min(band.max, s.reps + by) } : s));
}

/** Add reps to only the first `count` sets, leaving the rest where they are.
 *
 * This is Jack's third option and it is easy to miss as a distinct lever: *"instead of three sets of ten,
 * I'm gonna do ten reps, then eight reps, and then eight reps."* Front-loading the extra work rather than
 * spreading it produces a descending scheme deliberately, which is the same shape fatigue produces on its
 * own (section 10) -- so it reads as normal to the client and still adds volume. */
export function addRepsToFirst(
  sets: PerformedSet[],
  count: number,
  band: RepBand = DEFAULT_REP_BAND,
  by = 2,
): PerformedSet[] {
  return sets.map((s, i) =>
    i < count && s.reps < band.max ? { ...s, reps: Math.min(band.max, s.reps + by) } : s,
  );
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

/** Bring every set up to the heaviest load already in use, without going past it.
 *
 * This is how a staggered jump *finishes*, and it is a different operation from jumping again. After
 * 2x8 @55 + 1x8 @50, Jack's next step is *"instead of doing fifty-fives for one or two sets, I'm going to
 * try to do all three sets with fifty-five. Since you did one or two of them last time, that's a
 * reasonable progression."* The lagging set catches up; nothing moves to 60 yet.
 *
 * `jumpLoad` would take the top set to 60 instead, which is a bigger week and skips a rung the stagger
 * deliberately created. */
export function levelUp(sets: PerformedSet[]): PerformedSet[] {
  if (!sets.length || sets.some((s) => s.load === null)) return sets;
  const top = Math.max(...sets.map((s) => s.load ?? 0));
  return sets.map((s) => ({ ...s, load: top }));
}

/** The most load an accessory should take in a week.
 *
 * > *"If we're talking accessories, which is pretty much the ten rep range and upwards, if you're gonna
 * > take a weight jump it should not be more than five pounds per week in most cases. If we're talking a
 * > cable exercise on a stack or a machine, you might be able to take ten -- but I wouldn't do fifteen,
 * > and I definitely wouldn't try doing ten or fifteen more than one week in a row."*
 *
 * Which lands exactly on `stepForEquipment`: 5 lb for dumbbells and barbells, 10 for machines and cable
 * stacks. **One equipment step a week, and no more** -- the rule and the hardware agree, which is a good
 * sign both are right.
 *
 * The second half of that sentence is a separate rule: a 10 lb machine jump **may not repeat in
 * consecutive weeks**, so a stack has to spend a week consolidating before it moves again. */
export function maxWeeklyLoadStep(equipment: Equipment): number {
  return stepForEquipment(equipment);
}

/** True when this week's jump would be the second big one in a row on a stack. */
export function isRepeatedBigJump(equipment: Equipment, jumpedLastWeek: boolean): boolean {
  return jumpedLastWeek && stepForEquipment(equipment) >= 10;
}

/** Promote some sets to a higher rep count, one at a time -- the rep-axis twin of `jumpLoad`.
 *
 * > *"Week one, all three sets of ten. Week two, one set of twelve and two sets of ten -- maybe with the
 * > set of twelve you increase the weight a little bit, and the last two sets of ten with the same weight
 * > you did in week one. Week three, two sets of twelve and one set of ten. And week four, all three sets
 * > of twelve with your increased weight."*
 *
 * So the stagger he uses for load works on reps too: convert one set a week rather than the whole
 * exercise, and the sets left behind are what next week converts. Same mechanic, other axis.
 *
 * `alsoBumpLoad` is his "maybe" -- the converted set can take a small load jump at the same time. Note
 * that this moves two variables on one set, which sits awkwardly against C4. He offered it as optional
 * rather than standard, so it is off by default and the tension is recorded rather than resolved. */
export function promoteReps(
  sets: PerformedSet[],
  count: number,
  targetReps: number,
  opts: { equipment?: Equipment; alsoBumpLoad?: boolean } = {},
): PerformedSet[] {
  // A set joining the promoted group takes the weight that group is already using -- "two sets of twelve
  // and one set of ten, with the same weight that you did last week on the sets of twelve". Without this
  // the second set of twelve would sit at the old, lighter weight and the group would be inconsistent.
  const existing = sets.find((s) => s.reps >= targetReps);
  let promoted = 0;
  return sets.map((s) => {
    if (promoted >= count || s.reps >= targetReps) return { ...s };
    promoted += 1;
    if (opts.alsoBumpLoad && opts.equipment && s.load !== null) {
      return { reps: targetReps, load: nextLoadUp(opts.equipment, s.load) };
    }
    return { reps: targetReps, load: existing?.load ?? s.load };
  });
}

/** The simplest block there is: never change the scheme, add one equipment step a week.
 *
 * > *"You could just keep it three or four sets of ten the entire block and add five pounds a week. By
 * > the peak week you might miss it, but you'll probably be able to do it for the other ones -- **assuming
 * > you're not training too hard to failure right away in week one.**"*
 *
 * That last clause is P10 stated for the client rather than for the engine: the whole block only works
 * because week one leaves room. Open at RIR 3 and there are three weeks of runway; open at RIR 0 and
 * there is none. */
export function holdAndLoad(sets: PerformedSet[], equipment: Equipment): PerformedSet[] {
  return sets.map((s) => ({
    ...s,
    load: s.load === null ? null : nextLoadUp(equipment, s.load),
  }));
}

/** True when one step on the equipment is a large fraction of what is already loaded.
 *
 * > *"Think about what you're doing in terms of percentage load you're adding each week on a teeny tiny
 * > little muscle. If you're starting at ten pounds for two sets of ten -- second week, two sets of
 * > twelve. Third week, two sets of fifteen. Then you can even keep them next block if you want, and you
 * > just go to twelve point five pounds, two sets of ten."*
 *
 * A 2.5 lb step on a 10 lb dumbbell is 25%, and a 10 lb stack step on a 20 lb cable is 50%. On a rear
 * delt fly or a rotator cuff exercise that is not a progression, it is a different exercise. So on these
 * the **load lever does not exist inside a block**: reps climb to the top of the band, and the load step
 * waits for the block boundary, where the reps reset to the floor. */
export const LIGHT_LOAD_STEP_PCT = 20;

export function isLightLoad(load: number | null, equipment: Equipment): boolean {
  if (load === null || load <= 0) return true;
  return (stepForEquipment(equipment) / load) * 100 >= LIGHT_LOAD_STEP_PCT;
}

/** Muscles small enough that adding a set is a legitimate progression in itself.
 *
 * > *"With little itty bitty baby exercises like this, where you're barely lifting any weight and you're
 * > not coming off an injury, it's pretty reasonable to just add another set. That's only with exercises
 * > that are like super accessory -- like a rotator cuff exercise, or a forearm exercise."* */
export const SET_ADDABLE_MUSCLES = [
  "Rear delts", "Side delts", "Forearms", "Calves", "Abs", "Obliques", "Adductors",
];

export function canAddSet(muscle: string, currentSets: number, maxSets = 4): boolean {
  return SET_ADDABLE_MUSCLES.includes(muscle) && currentSets < maxSets;
}

export function addSet(sets: PerformedSet[]): PerformedSet[] {
  if (!sets.length) return sets;
  // The new set matches the lightest existing one -- a set added at the top weight would be a load jump
  // wearing a different hat.
  const lightest = sets.reduce((a, b) => ((a.load ?? 0) <= (b.load ?? 0) ? a : b));
  return [...sets, { ...lightest }];
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

/** The named weeks of a four-week block.
 *
 * *"We'll talk about four-week programs first -- that being you have your base week, then your load week,
 * then your peak week, and then your deload week."* His own spreadsheet labels its week pairs BASE and
 * LOAD, so this is the same vocabulary he already writes down. The deload is conditional on frequency
 * per C7: below five sessions a week there isn't one, and the block simply ends. */
export type WeekRole = "base" | "load" | "peak" | "deload";

export const FOUR_WEEK_ROLES: WeekRole[] = ["base", "load", "peak", "deload"];

/** The roles for a block of `weeks`, with the deload appended only when C7 says there is one.
 *
 * Jack named four weeks -- base, load, peak, deload -- and then walked a four-week example whose *fourth*
 * week was the peak, with a 20 lb gain by the end of it. Both are true at once if the deload is a fifth
 * week that most clients never see: below five sessions a week there is no scheduled deload at all, so
 * the block is base, load, peak, peak and then simply ends. */
export function rolesFor(weeks: number, withDeload = false): WeekRole[] {
  const working = withDeload ? weeks - 1 : weeks;
  const out: WeekRole[] = [];
  for (let i = 0; i < working; i++) {
    out.push(i === 0 ? "base" : i === 1 ? "load" : "peak");
  }
  if (withDeload) out.push("deload");
  return out;
}

export interface Variation {
  sets: PerformedSet[];
  label: string;
  why: string;
}

/** The legal next weeks from where a client currently is -- **plural, because there are several and they
 * are equivalent.**
 *
 * This is the part of Jack's method that most resists being written as a single formula. Given three sets
 * of eight with the 50s, he offers three next weeks and then says: *"why would you pick one over the
 * other? There isn't really a reason at all. If you care more about load on the bar, I would pick number
 * one. Number one is usually the one I would go with."*
 *
 * So the engine should not produce one answer. It should produce the small set of equivalent ones, in his
 * preference order, and let a coach take the second if they prefer it. *"It's all about the relative
 * intensity and keeping the volume close enough that it's very close in terms of stress."*
 *
 * The three levers, which are genuinely distinct:
 *   1. **load on some sets**, reps held -- 3x8 @50 becomes 2x8 @55 + 1x8 @50
 *   2. **reps on every set**, load held -- 3x8 @50 becomes 3x10 @50
 *   3. **reps on some sets**, load held -- 3x8 @50 becomes 10, 8, 8 @50
 */
export function variationsFor(
  sets: PerformedSet[],
  opts: { equipment: Equipment; band?: RepBand; repStep?: number },
): Variation[] {
  const here = sets[0]?.reps ?? 10;
  const [lo, hi] = bandForReps(here);
  const band = opts.band ?? { min: lo, max: hi };
  const by = opts.repStep ?? 2;
  const out: Variation[] = [];
  if (!sets.length) return out;

  // When the sets are uneven, the first thing to do is finish the jump that is already half-made --
  // bring the laggards up to the weight the rest are already using, before reaching for the next one.
  const levelled = levelUp(sets);
  if (describe(levelled) !== describe(sets)) {
    out.push({
      sets: levelled,
      label: "finish the jump",
      why: "The sets left behind catch up to the weight the others already did. A smaller step than jumping again, and the one the stagger was set up for.",
    });
  }
  const heavier = jumpLoad(sets, { equipment: opts.equipment, band, promote: Math.max(1, sets.length - 1) });
  if (describe(heavier) !== describe(sets) && describe(heavier) !== describe(levelled)) {
    out.push({
      sets: heavier,
      label: "more load",
      why: "Most of the sets move to the next weight and the reps hold. His default when load on the bar is what matters.",
    });
  }
  const moreReps = addReps(sets, band, by);
  if (describe(moreReps) !== describe(sets)) {
    out.push({
      sets: moreReps,
      label: "more reps",
      why: `Every set gains ${by} reps at the same weight.`,
    });
  }
  const frontLoaded = addRepsToFirst(sets, 1, band, by);
  if (describe(frontLoaded) !== describe(sets) && describe(frontLoaded) !== describe(moreReps)) {
    out.push({
      sets: frontLoaded,
      label: "more reps, front-loaded",
      why: "Only the first set gains reps, which produces a descending scheme deliberately.",
    });
  }
  // Section 18: which lever leads depends on what one rep costs. At twelve reps and above, reps are the
  // cheaper and safer move and should be offered before load; below six, load is the only option at all.
  const pref = leverPreferenceFor(here);
  if (pref === "reps-preferred" || pref === "reps-strongly-preferred") {
    out.sort((a, b) => Number(b.label.includes("reps")) - Number(a.label.includes("reps")));
  }
  return out;
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
