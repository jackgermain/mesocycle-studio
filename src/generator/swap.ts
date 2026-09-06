/** What makes one exercise a valid replacement for another.
 *
 * A swap is not "another exercise for the same muscle". Jack's reason for varying an exercise is only
 * half about the muscle:
 *
 * > *"Because I'm very advanced, I need to change stimulus often for certain things in order to keep
 * > progressing, or else I will either hit a plateau on my strength gains, or my connective tissues --
 * > as in my tendon complex -- will start getting irritated from the exercise, because I'm really
 * > strong... Variation in the exercise over time is important because it has a **different wear pattern
 * > on the tendon** even if it works the same muscles. There's a difference between doing a hack squat
 * > versus a leg press even though you both have knee flexion and hip flexion. Even if you were to have
 * > identically the same percentages of hip flexion and knee flexion, it still isn't the same, because
 * > the direction of the load from the machine is placed differently, and the times at which the load is
 * > most stressful are different. **The torques are different.**"*
 *
 * So there are two failure modes an advanced lifter's program has to avoid, and they want different
 * things: a **strength plateau**, which wants a novel stimulus, and **tendon irritation**, which wants a
 * different loading profile through the same range. A swap that keeps the muscle and the joint angles
 * but changes neither the equipment nor the angle of resistance solves neither.
 *
 * Hence: a valid swap **keeps the pattern and changes the torque curve.** The pattern is what the slot
 * is for; the torque curve is the whole point of swapping.
 */

import { patternOf, type Pattern } from "./patterns";

/** Where the resistance comes from, which is what sets the shape of the torque curve.
 *
 * Coarse on purpose. The real quantity is a resistance curve through the range of motion, which nothing
 * in the library records; equipment class is the best available proxy and it separates the case Jack
 * used as his example -- hack squat (fixed path, angled sled) from leg press (fixed path, different
 * sled angle) is a weaker swap than either to a barbell squat (free, gravity-vertical). */
export type LoadingProfile = "free" | "machine" | "cable" | "bodyweight" | "band";

const PROFILE: { test: RegExp; profile: LoadingProfile }[] = [
  { test: /\bband\b|resistance band/, profile: "band" },
  { test: /\bcable\b|pulldown|pushdown|pull-?through|crossover/, profile: "cable" },
  { test: /machine|smith|hammer strength|cybex|nautilus|life fitness|matrix|pec deck|hack squat|leg press|pendulum/, profile: "machine" },
  { test: /push-?up|pull-?up|chin-?up|\bdip\b|bodyweight|\bbw\b|nordic|sissy|plank|hanging/, profile: "bodyweight" },
  { test: /barbell|dumbbell|kettlebell|landmine|goblet|trap bar|hex bar/, profile: "free" },
];

export function loadingProfileOf(name: string): LoadingProfile {
  const n = name.toLowerCase();
  for (const p of PROFILE) if (p.test.test(n)) return p.profile;
  return "free";
}

/** Cues that move where in the range the load peaks, independent of equipment. Two machine exercises
 * with different angle cues are still a real change of torque curve. */
const ANGLE = /incline|decline|flat|seated|standing|lying|prone|supine|high to low|low to high|overhead|bent-?over|single-?arm|neutral|wide|close|reverse|front|back|hack|45/g;

function angleCues(name: string): Set<string> {
  return new Set(name.toLowerCase().match(ANGLE) ?? []);
}

export interface SwapVerdict {
  valid: boolean;
  reason: string;
}

/** Is `to` a legitimate replacement for `from`?
 *
 * Same pattern, because that is the job the slot does in the session and Jack's word for a replacement
 * is *"exercises that will correlate to each other"*. Different torque curve, because otherwise the swap
 * buys nothing -- neither novelty for the plateau nor a new wear pattern for the tendon. */
export function isValidSwap(from: string, to: string): SwapVerdict {
  if (from.trim().toLowerCase() === to.trim().toLowerCase()) {
    return { valid: false, reason: "same exercise" };
  }
  const pf = patternOf(from)?.pattern;
  const pt = patternOf(to)?.pattern;
  if (pf !== pt) {
    return { valid: false, reason: `different pattern (${pf ?? "none"} -> ${pt ?? "none"})` };
  }
  if (loadingProfileOf(from) !== loadingProfileOf(to)) {
    return { valid: true, reason: "same pattern, different loading profile" };
  }
  const a = angleCues(from);
  const b = angleCues(to);
  const differs = [...a].some((x) => !b.has(x)) || [...b].some((x) => !a.has(x));
  if (differs) return { valid: true, reason: "same pattern and equipment, different angle" };
  return {
    valid: false,
    reason: "same pattern, same loading profile, same angle -- the torque curve is unchanged",
  };
}

/** Rank candidate replacements, best first. A different loading profile beats a different angle, since
 * it is the bigger change to the torque curve. */
export function rankSwaps(from: string, candidates: string[]): string[] {
  const score = (c: string): number => {
    const v = isValidSwap(from, c);
    if (!v.valid) return -1;
    return loadingProfileOf(from) !== loadingProfileOf(c) ? 2 : 1;
  };
  return candidates.filter((c) => score(c) > 0).sort((a, b) => score(b) - score(a));
}

export type { Pattern };
