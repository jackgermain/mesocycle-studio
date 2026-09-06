/** The chart behind all the other charts.
 *
 * Jack, after walking six different progressions:
 *
 * > *"If you can picture what I'm saying about the way progressions can work -- it looks like you're
 * > playing around with a conceptually looking chart that's exactly the same as the relative intensity
 * > chart, but it's not percent 1RM. It's all of these other variables we're talking about, like rep
 * > schemes, and decreasing reps in certain sets as compensation for an increase in load... but the
 * > decrease in reps accommodates enough that the increase in load isn't too big of a relative percentage
 * > increase. That's a general rule of thumb."*
 *
 * He is right, and it turns out to be literally true rather than a useful analogy.
 *
 * ## Why the percentages cancel
 *
 * Two sets at different rep counts are equally hard when their loads sit in a fixed ratio -- and that
 * ratio depends **only on the pair of rep counts**, not on how hard the sets are. Measured across the
 * whole intensity ladder from 80% to 100%, the spread is tiny:
 *
 * | Rep pair | Load ratio | Spread across the ladder |
 * |---|---|---|
 * | 10 vs 8 | 0.907 | 0.003 |
 * | 8 vs 6 | 0.941 | 0.001 |
 * | 6 vs 5 | 0.971 | 0.001 |
 * | 4 vs 3 | 0.973 | 0.003 |
 *
 * So the 1RM cancels. **Any two prescriptions can be compared without knowing anyone's maximum** -- which
 * is what makes the whole engine work for clients who have never tested one, and it is the formal version
 * of what he just described.
 */

import { absoluteIntensity, RELATIVE_INTENSITIES } from "./relativeIntensity";
import type { PerformedSet } from "./doubleProgression";
import { isRepLeverSafe } from "./repRanges";
import { stepForEquipment } from "../screens/exerciseHelpers";
import type { Equipment } from "../data/types";

/** Rep count everything is normalised to. Ten is the middle of his practice and the best-populated row. */
export const REFERENCE_REPS = 10;

/** How much lighter a set of `a` reps is than a set of `b` reps, at the same difficulty.
 *
 * Averaged over the ladder rather than read off one rung, because the tiny spread means any single rung
 * would do and the average is the honest summary. */
export function equivalentLoadRatio(a: number, b: number): number | undefined {
  if (a === b) return 1;
  const ratios: number[] = [];
  for (const ri of RELATIVE_INTENSITIES) {
    const x = absoluteIntensity(a, ri);
    const y = absoluteIntensity(b, ri);
    if (x !== undefined && y !== undefined && y > 0) ratios.push(x / y);
  }
  if (!ratios.length) return undefined;
  return ratios.reduce((s, v) => s + v, 0) / ratios.length;
}

/** A set's load restated as the equivalent load at `REFERENCE_REPS`.
 *
 * This is the coordinate that makes everything comparable: 60 lb for 7 reps and 52.7 lb for 10 reps are
 * the same point. */
export function normalisedLoad(set: PerformedSet, ref = REFERENCE_REPS): number | undefined {
  const r = equivalentLoadRatio(ref, set.reps);
  if (r === undefined) return undefined;
  // Bodyweight carries a real load, it just isn't a number anyone writes down. Treating it as one unit
  // keeps the whole grid working for pull-ups and hanging leg raises -- previously a null load made
  // gridPointOf return undefined, judgeMove return undefined, and every candidate get silently skipped,
  // so those exercises could never progress and never explained why.
  return (set.load ?? BODYWEIGHT_UNIT) * r;
}

/** A stand-in load for bodyweight movements, so reps changes are measurable on the same axes. */
export const BODYWEIGHT_UNIT = 1;

export interface GridPoint {
  /** Mean per-set difficulty, in reference-rep pounds. Rises when the sets get harder. */
  intensity: number;
  /** Stimulus-weighted total work -- reps times normalised load, summed. */
  volume: number;
  /** Mean weight actually on the bar. Not normalised -- this is what the client loads. */
  load: number;
  /** Total reps in the session for this exercise. Jack's "very important landmark". */
  totalReps: number;
}

export function gridPointOf(sets: PerformedSet[], ref = REFERENCE_REPS): GridPoint | undefined {
  const loads: number[] = [];
  let volume = 0;
  for (const s of sets) {
    const n = normalisedLoad(s, ref);
    if (n === undefined) return undefined;
    loads.push(n);
    volume += s.reps * n;
  }
  if (!loads.length) return undefined;
  const rawLoads = sets.map((x) => x.load ?? BODYWEIGHT_UNIT);
  return {
    intensity: loads.reduce((a, b) => a + b, 0) / loads.length,
    volume,
    load: rawLoads.reduce((a, b) => a + b, 0) / rawLoads.length,
    totalReps: sets.reduce((n, x) => n + x.reps, 0),
  };
}

export interface Move {
  intensityPct: number;
  volumePct: number;
  /** Change in the weight on the bar. */
  loadPct: number;
  /** Change in total reps for the session -- the landmark that must stay put. */
  repsPct: number;
  verdict: "good" | "too small" | "too big" | "backwards" | "unsafe";
  why: string;
}

/** What a week's change actually costs, on both axes.
 *
 * His rule of thumb, made checkable: *"the decrease in reps accommodates enough that the increase in load
 * isn't too big of a relative percentage increase."* A good move raises difficulty by a little and does
 * not gut the volume doing it. */
/** Beyond this, one equipment step is too big a jump to wave through -- the exercise is simply too light
 * for its own hardware, and reps are the only lever it has. */
export const MAX_SINGLE_STEP_PCT = 30;

/** Total reps per session for an exercise is a landmark, not a free variable.
 *
 * > *"The volume -- as in the total reps per session of that exercise -- should be relatively similar or
 * > even very similar by the end of the block, especially in the ten-plus rep range, for all accessories
 * > for sure... A very important landmark with training is reps per session of that exercise. They need
 * > to be similar."*
 *
 * So a block may not double an exercise's rep count and may not halve it. Generation was doing both --
 * 2x12 becoming 1x15, or 12 reps becoming 30 -- and both are wrong for the same reason. */
export const SESSION_REPS_TOLERANCE_PCT = 20;

/** Load and volume move against each other. This is **linear periodization**, and he names it as such.
 *
 * > *"Where load comes down, volume goes up. And as load goes up, volume comes down."*
 *
 * > *"Why is the load going down and the volume going down? Those two things are contrary. That's how you
 * > lose gains."*
 *
 * The failure this catches is the one he called out hardest: a progression that regresses one axis and
 * restores it the next week, netting nothing. *"All you're doing is regressing and then bringing it back
 * to where it was each week. So there's no upwards increase in stress at all."*
 *
 * ## When both may rise
 *
 * There is one exception, and it is gated on the rep range rather than on the size of the move:
 *
 * > *"Pretty much the only way you can have it where load goes up and volume goes up at the same time is
 * > if you're working in a rep range of **definitely above six reps at the lowest, eight ideally, and
 * > definitely at the ten-plus rep range** -- and you're starting the block at a low enough RPE that you
 * > can continuously add weight every week without missing a session's weight cap by the end, as the
 * > volume is increasing. That is going to mess you up in terms of getting you sore -- not necessarily in
 * > a bad way, but you're gonna get a little bit fried from that."*
 *
 * Two conditions and a stated cost. Below eight reps both axes rising is refused outright however small
 * the move; at eight and above it is allowed but capped, and it depends on P10's opening headroom being
 * real -- start at RIR 0 and there is nothing to spend. */
export const BOTH_RISING_MIN_REPS = 8;
export const BOTH_RISING_IDEAL_REPS = 10;
export const BOTH_RISING_MAX_PCT = 12;

export const GOOD_MOVE = {
  /** Calibrated against his own examples, which span +1.2% to +10.1%. The strength ladder sits at +1.6 to
   * +2% a week, which is P2 -- small and predictable -- with a number attached at last. */
  intensity: { min: 0, max: 12 },
  /** Volume may fall -- P6 says a modest decline is correct as intensity climbs -- but not off a cliff.
   * His own steepest drop is the strength ladder's last week at -24%. */
  volume: { min: -25, max: 40 },
} as const;

export function judgeMove(
  from: PerformedSet[],
  to: PerformedSet[],
  opts: { equipment?: Equipment; repsAreTheOnlyLever?: boolean } = {},
): Move | undefined {
  const a = gridPointOf(from);
  const b = gridPointOf(to);
  if (!a || !b) return undefined;

  // Safety runs before stress. Adding a rep to a set of four is a 25% jump under a heavy bar, and no
  // amount of favourable arithmetic elsewhere makes that the right move (C8, section 18).
  for (let i = 0; i < Math.min(from.length, to.length); i++) {
    if (to[i].reps > from[i].reps && !isRepLeverSafe(from[i].reps)) {
      const rnd = (n: number) => Math.round(n * 10) / 10;
      return {
        intensityPct: rnd(((b.intensity - a.intensity) / a.intensity) * 100),
        volumePct: rnd(((b.volume - a.volume) / a.volume) * 100),
        loadPct: a.load > 0 ? rnd(((b.load - a.load) / a.load) * 100) : 0,
        repsPct: rnd(((b.totalReps - a.totalReps) / a.totalReps) * 100),
        verdict: "unsafe",
        why: `Adding a rep at ${from[i].reps} reps is a ${Math.round(100 / from[i].reps)}% jump in one session. Move the load instead.`,
      };
    }
  }
  const round = (n: number) => Math.round(n * 10) / 10;
  const i = round(((b.intensity - a.intensity) / a.intensity) * 100);
  const v = round(((b.volume - a.volume) / a.volume) * 100);
  const l = a.load > 0 ? round(((b.load - a.load) / a.load) * 100) : 0;
  const r = round(((b.totalReps - a.totalReps) / a.totalReps) * 100);
  const base = { intensityPct: i, volumePct: v, loadPct: l, repsPct: r };

  // The landmark first: total reps for the session must stay put -- unless reps are the only lever the
  // exercise has. On a 10 lb rear delt fly the smallest load step is 25%, so the load axis is closed and
  // the reps have to carry the whole block: 2x10 to 2x12 to 2x15, which is 50% and correct.
  const repsCap = opts.repsAreTheOnlyLever ? 60 : SESSION_REPS_TOLERANCE_PCT;
  if (Math.abs(r) > repsCap) {
    return {
      ...base,
      verdict: "too big",
      why: `Total reps ${r > 0 ? "rise" : "fall"} ${Math.abs(r)}% against week one. Reps per session is a landmark and should stay close.`,
    };
  }
  // Then the direction rule: the two axes move against each other.
  if (l < -1 && r <= 5) {
    return { ...base, verdict: "backwards", why: "Load came down without the reps rising to pay for it." };
  }
  if (r < -5 && l <= 1 && !opts.repsAreTheOnlyLever) {
    return { ...base, verdict: "backwards", why: "Reps came down without the load going up to pay for it." };
  }
  if (l > 1 && r > 1) {
    const reps = Math.round(a.totalReps / from.length);
    if (reps < BOTH_RISING_MIN_REPS) {
      return {
        ...base,
        verdict: "too big",
        why: `Load +${l}% and reps +${r}% at ${reps} reps. Both axes may only rise together above eight reps — below that, load up means volume down.`,
      };
    }
    if (l + r > BOTH_RISING_MAX_PCT) {
      return {
        ...base,
        verdict: "too big",
        why: `Load +${l}% and reps +${r}% in the same week. Both may rise at this rep range, but only a little.`,
      };
    }
  }

  if (i < GOOD_MOVE.intensity.min && v <= 0) {
    return { ...base, verdict: "backwards", why: "Both difficulty and volume fell." };
  }
  if (i > GOOD_MOVE.intensity.max) {
    // One step on the equipment is the smallest move that exists, and on a light dumbbell that step is
    // already a large percentage -- 40 to 45 lb is 12.5% -- so refusing it outright would mean the
    // exercise could never take load. But the exception has a limit: a 10 lb cable step on a 10 lb
    // lateral raise is a 100% jump, and generation produced exactly that before this cap existed. Above
    // MAX_SINGLE_STEP_PCT the honest answer is that this exercise cannot progress on load at all, and
    // the reps have to move instead.
    const singleStep =
      opts.equipment !== undefined &&
      from.length === to.length &&
      from.every((s, k) => s.reps === to[k].reps) &&
      to.every((s, k) => {
        const before = from[k].load;
        if (before === null || s.load === null) return false;
        const delta = s.load - before;
        return (
          delta <= stepForEquipment(opts.equipment!) + 0.01 &&
          (before === 0 || (delta / before) * 100 <= MAX_SINGLE_STEP_PCT)
        );
      });
    if (!singleStep) {
      return {
        ...base,
        verdict: "too big",
        why: `Difficulty jumps ${i}% in one week. The rep drop did not accommodate the load.`,
      };
    }
  }
  // The volume floor scales with what the load did. A 30% volume drop is a collapse when the bar did not
  // move and a fair trade when it went up 25% -- that IS linear periodization, and a flat floor was
  // rejecting the exact move he describes: a light accessory topping out its reps, stepping the load,
  // and resetting to the bottom of the band.
  const volumeFloor = Math.max(-40, GOOD_MOVE.volume.min - Math.max(0, l));
  if (v < volumeFloor) {
    return { ...base, verdict: "too big", why: `Volume falls ${Math.abs(v)}% and the load only rose ${l}%. Too much given up for what was gained.` };
  }
  if (i <= 0.5 && v <= 2) {
    return { ...base, verdict: "too small", why: "Barely a change from last week." };
  }
  return {
    ...base,
    verdict: "good",
    why: `Load ${l > 0 ? "+" : ""}${l}%, reps ${r > 0 ? "+" : ""}${r}%, difficulty ${i > 0 ? "+" : ""}${i}%.`,
  };
}
