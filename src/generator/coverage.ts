/** How often each muscle should be trained in a week, and what happens when there isn't room.
 *
 * Two rules that compose. The **targets** are what to aim for; the **budget** is what the schedule can
 * actually buy. A client training twice a week cannot hit two chest days, two back days, two leg days
 * and two arm days -- that is eight days of work in two sessions -- so the targets get spent in order
 * and the tail is what gets dropped.
 *
 * ## The targets
 *
 * > *"Pretty much the goal each week for each person is that every muscle gets trained at least two
 * > times. At least two, and at most four -- four is pushing it. But for muscles that are much more of a
 * > priority, ideally three, assuming they're training five or six days a week, maybe even four."*
 *
 * And then, specifically:
 *
 * > *"Guys: pretty much mandatory, have to train chest twice per week, have to train back twice per
 * > week, have to train legs at least once per week, ideally two. Biceps, triceps and shoulders at least
 * > two times per week. Some guys don't care about abs, but if you do, train abs somewhere between two
 * > and four times a week at most. For hamstrings I would say at least once per week. For calves, they
 * > don't have to unless they really want to -- same with traps and forearms."*
 *
 * > *"For girls, I always have at least two leg days -- a lot of them want three. And what that entails
 * > is two of the leg days being very glute focused, so glute exercises early on. Usually one of them is
 * > some type of a hip thrust, or a heavy lunge or a squat, and then some RDLs. Back at least twice per
 * > week, chest once per week, maybe twice if they like it. And then biceps, triceps and shoulders --
 * > some of them want a little bit, usually once a week, maybe twice if they really want to."*
 *
 * ## On naming
 *
 * Jack states these as "guys" and "girls", and they are recorded here as he gave them. They are modelled
 * as an **emphasis profile** rather than as sex directly, because the variable actually doing the work is
 * what the client wants trained -- glutes and legs forward, or chest and arms forward. `defaultProfile`
 * maps his defaults; an intake preference should override it, so a woman who wants to bench heavily gets
 * that rather than a glute program she did not ask for.
 *
 * ## How it checks out
 *
 * Days per week each muscle is actually trained, measured across nine client programs (45 client-weeks of
 * men, 101 of women), against the targets above:
 *
 * | Muscle | Men, measured | target | Women, measured | target |
 * |---|---|---|---|---|
 * | Chest | 1.91 | 2 | 1.89 | 1-2 |
 * | Back | 2.09 | 2 | 2.34 | 2 |
 * | Quads | 1.98 | 1-2 | 2.34 | 2-3 |
 * | Glutes | **0.00** | — | **1.27** | 2 |
 * | Biceps | 1.93 | 2 | 1.72 | 1-2 |
 * | Triceps | 1.33 | 2 | 1.89 | 1-2 |
 * | Hamstrings | **0.29** | 1 | **0.45** | 2-3 |
 *
 * Chest, back, quads and biceps land on target. The glute split is exactly as described -- zero for the
 * men, 1.27 for the women.
 *
 * **Hamstrings and rear delts were put to him, and the answer was "those are just errors on both of
 * those ends."** So the targets stand and the programs were the mistake -- which means a generator built
 * on these numbers will write more hamstring and rear delt work than his own files contain, and that is
 * the point rather than a divergence to flag. Recorded because it is the one case so far where the data
 * was wrong and the stated rule was right, and a later reader might otherwise "correct" the targets back
 * down to match the files.
 */

export type EmphasisProfile = "upper-priority" | "glute-priority";

export function defaultProfile(sex: "male" | "female" | undefined): EmphasisProfile {
  return sex === "female" ? "glute-priority" : "upper-priority";
}

export interface FrequencyTarget {
  /** Sessions a week this muscle must appear in for the program to be considered complete. */
  min: number;
  /** What to give it when there is room. */
  ideal: number;
  /** Above this is counterproductive. Four is his ceiling for everything. */
  max: number;
  /** Trained only if the client asks -- "they don't have to unless they really want to". */
  optional?: boolean;
}

/** The global envelope, before any per-muscle detail. */
export const GLOBAL_FREQUENCY = { min: 2, priorityIdeal: 3, max: 4 } as const;

const t = (min: number, ideal: number, max = 4, optional = false): FrequencyTarget => ({
  min,
  ideal,
  max,
  ...(optional ? { optional: true } : {}),
});

export const WEEKLY_TARGETS: Record<EmphasisProfile, Record<string, FrequencyTarget>> = {
  "upper-priority": {
    Chest: t(2, 2), Back: t(2, 2),
    Quads: t(1, 2), Hamstrings: t(1, 2), Glutes: t(0, 1, 4, true),
    Biceps: t(2, 2), Triceps: t(2, 2),
    "Side delts": t(2, 2), "Rear delts": t(2, 2), "Front delts": t(0, 1, 4, true),
    Abs: t(0, 2, 4, true), Obliques: t(0, 2, 4, true),
    Calves: t(0, 1, 4, true), Traps: t(0, 1, 4, true), Forearms: t(0, 1, 4, true),
    Adductors: t(0, 1, 4, true),
  },
  "glute-priority": {
    // "I always have at least two leg days -- a lot of them want three... two of the leg days being
    // very glute focused, so glute exercises early on."
    Glutes: t(2, 3), Quads: t(2, 3), Hamstrings: t(2, 3),
    Back: t(2, 2),
    Chest: t(1, 2),
    Biceps: t(1, 2), Triceps: t(1, 2), "Side delts": t(1, 2), "Rear delts": t(1, 2),
    "Front delts": t(0, 1, 4, true),
    Abs: t(0, 2, 4, true), Obliques: t(0, 2, 4, true),
    Calves: t(0, 1, 4, true), Traps: t(0, 1, 4, true), Forearms: t(0, 1, 4, true),
    Adductors: t(0, 1, 4, true),
  },
};

/** Spend order when the schedule cannot buy every target. Mandatory before optional, then by how much of
 * the session's stimulus the muscle carries -- which is P3's ordering, and matches "no matter what, you
 * have to have your pushes, you have to have your pulls, you have to have your compound exercises". */
const SPEND_ORDER = [
  "Chest", "Back", "Quads", "Glutes", "Hamstrings",
  "Triceps", "Biceps", "Side delts", "Rear delts",
  "Abs", "Obliques", "Traps", "Calves", "Forearms", "Front delts", "Adductors",
];

export interface Coverage {
  /** Muscle -> how many sessions a week it gets, after the budget is applied. */
  plan: Map<string, number>;
  /** Muscles whose `min` could not be met at this training frequency. */
  short: string[];
}

/** Work out what this many sessions a week can actually cover.
 *
 * `slotsPerSession` counts only the slots available to a muscle -- the two compound slots plus the
 * accessories. The compounds are bought first at every frequency; what is left buys the tail. */
export function planCoverage(
  daysPerWeek: number,
  slotsPerSession: number,
  profile: EmphasisProfile = "upper-priority",
  wants: readonly string[] = [],
): Coverage {
  const targets = WEEKLY_TARGETS[profile];
  let budget = daysPerWeek * slotsPerSession;
  const plan = new Map<string, number>();
  const short: string[] = [];

  const included = SPEND_ORDER.filter((m) => {
    const spec = targets[m];
    return spec && (!spec.optional || wants.includes(m));
  });

  // Pass one: everyone's minimum, in spend order. Pass two: top up toward ideal with what is left.
  for (const m of included) {
    const spec = targets[m];
    const want = Math.min(spec.min, daysPerWeek);
    const give = Math.min(want, budget);
    if (give < spec.min) short.push(m);
    if (give > 0) {
      plan.set(m, give);
      budget -= give;
    }
  }
  for (const m of included) {
    const spec = targets[m];
    const have = plan.get(m) ?? 0;
    const room = Math.min(spec.ideal, spec.max, daysPerWeek) - have;
    if (room <= 0) continue;
    const give = Math.min(room, budget);
    if (give > 0) {
      plan.set(m, have + give);
      budget -= give;
    }
  }
  return { plan, short };
}

/** What a given schedule gives up.
 *
 * Asks for **everything** -- every optional muscle included -- and reports what the budget could not
 * buy. That is the honest form of the question: the mandatory list is affordable at almost any
 * frequency, and what a two-day week really costs you is the tail. Which is exactly what the programs
 * show: at two sessions a week rear delts and traps are zero across 71 weeks, while chest and back sit
 * on target at 1.91 and 2.09.
 *
 * Worth putting in front of a coach at program-creation time. Choosing two days a week is choosing what
 * to neglect, and they should see which rather than find out a year later. */
export function neglectedAt(
  daysPerWeek: number,
  slotsPerSession: number,
  profile: EmphasisProfile = "upper-priority",
): string[] {
  const targets = WEEKLY_TARGETS[profile];
  const everything = Object.keys(targets);
  const full = planCoverage(daysPerWeek, slotsPerSession, profile, everything);
  const missing = everything.filter((m) => {
    const spec = targets[m];
    const got = full.plan.get(m) ?? 0;
    return got < Math.min(spec.ideal, daysPerWeek);
  });
  return SPEND_ORDER.filter((m) => missing.includes(m)).reverse();
}

/** Muscles small enough to close a session with -- high reps, low load, nothing that competes with a
 * compound for energy. */
export const FINISHER_MUSCLES = ["Abs", "Obliques", "Calves", "Forearms"];

/** Fill one day's accessory and finisher slots from the week's coverage plan, least-served first so the
 * week spreads across the plan instead of hammering the front of it every session. */
export function fillAccessories(
  count: number,
  coverage: Coverage,
  used: Map<string, number>,
  finisherCount: number,
): { accessories: string[]; finishers: string[] } {
  const owed = (m: string) => (coverage.plan.get(m) ?? 0) - (used.get(m) ?? 0);
  // Shared across both picks below, so a finisher drawn from the accessory pool cannot land on a muscle
  // this day has already used. Each pick alone would not catch that.
  const placedToday = new Set<string>();
  const pick = (pool: string[], n: number): string[] => {
    const out: string[] = [];
    for (let i = 0; i < n; i++) {
      const ranked = pool
        .filter((m) => !placedToday.has(m))
        .sort((a, b) => owed(b) - owed(a) || SPEND_ORDER.indexOf(a) - SPEND_ORDER.indexOf(b));
      const best = ranked.find((m) => owed(m) > 0) ?? ranked[0];
      if (!best) break;
      out.push(best);
      placedToday.add(best);
      used.set(best, (used.get(best) ?? 0) + 1);
    }
    return out;
  };
  const inPlan = [...coverage.plan.keys()];
  const finisherPool = inPlan.filter((m) => FINISHER_MUSCLES.includes(m));
  const accessoryPool = inPlan.filter((m) => !FINISHER_MUSCLES.includes(m));
  // Abs and obliques are optional -- a client who never asked for core work has an empty finisher pool,
  // and the session must not silently shrink below the number of exercises it was asked for. Fall back
  // to the accessory pool so the slot is still filled with something the week owes.
  const accessories = pick(accessoryPool, count);
  const finishers = pick(finisherPool.length ? finisherPool : accessoryPool, finisherCount);
  return { accessories, finishers };
}
