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
  if (set.load === null) return undefined;
  const r = equivalentLoadRatio(ref, set.reps);
  return r === undefined ? undefined : set.load * r;
}

export interface GridPoint {
  /** Mean per-set difficulty, in reference-rep pounds. Rises when the sets get harder. */
  intensity: number;
  /** Stimulus-weighted total work -- reps times normalised load, summed. */
  volume: number;
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
  return { intensity: loads.reduce((a, b) => a + b, 0) / loads.length, volume };
}

export interface Move {
  intensityPct: number;
  volumePct: number;
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
  opts: { equipment?: Equipment } = {},
): Move | undefined {
  const a = gridPointOf(from);
  const b = gridPointOf(to);
  if (!a || !b) return undefined;

  // Safety runs before stress. Adding a rep to a set of four is a 25% jump under a heavy bar, and no
  // amount of favourable arithmetic elsewhere makes that the right move (C8, section 18).
  for (let i = 0; i < Math.min(from.length, to.length); i++) {
    if (to[i].reps > from[i].reps && !isRepLeverSafe(from[i].reps)) {
      const pctA = ((b.intensity - a.intensity) / a.intensity) * 100;
      const pctV = ((b.volume - a.volume) / a.volume) * 100;
      return {
        intensityPct: Math.round(pctA * 10) / 10,
        volumePct: Math.round(pctV * 10) / 10,
        verdict: "unsafe",
        why: `Adding a rep at ${from[i].reps} reps is a ${Math.round(100 / from[i].reps)}% jump in one session. Move the load instead.`,
      };
    }
  }
  const intensityPct = ((b.intensity - a.intensity) / a.intensity) * 100;
  const volumePct = ((b.volume - a.volume) / a.volume) * 100;

  const round = (n: number) => Math.round(n * 10) / 10;
  const i = round(intensityPct);
  const v = round(volumePct);

  if (i < GOOD_MOVE.intensity.min && v <= 0) {
    return { intensityPct: i, volumePct: v, verdict: "backwards", why: "Both difficulty and volume fell." };
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
        intensityPct: i,
        volumePct: v,
        verdict: "too big",
        why: `Difficulty jumps ${i}% in one week. The rep drop did not accommodate the load.`,
      };
    }
  }
  if (v < GOOD_MOVE.volume.min) {
    return {
      intensityPct: i,
      volumePct: v,
      verdict: "too big",
      why: `Volume falls ${Math.abs(v)}%, which is more than a modest decline.`,
    };
  }
  if (i <= 0.5 && v <= 2) {
    return { intensityPct: i, volumePct: v, verdict: "too small", why: "Barely a change from last week." };
  }
  return {
    intensityPct: i,
    volumePct: v,
    verdict: "good",
    why: `Difficulty ${i > 0 ? "+" : ""}${i}%, volume ${v > 0 ? "+" : ""}${v}%.`,
  };
}
