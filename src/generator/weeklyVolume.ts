/** Sets per week per muscle group -- the number a coach actually judges a program by.
 *
 * > *"Think about how many sets per week are being done for each body part. The literature suggests the
 * > sweet spot is between **10 and 25 sets per week per muscle group**. So start on the lower end for
 * > caution, and use the feedback week over week to add more or take away as you get to learn their body.
 * > Over time you'll remember and save things like -- it seems Chris, for example, can't do much more
 * > than twelve sets of triceps a week."*
 *
 * Three ideas in that, and they are separate:
 *
 *   1. A **band**, from the literature: 10 to 25 sets a week.
 *   2. A **starting position** inside it: the low end, because the cost of too little is a slow week and
 *      the cost of too much is section 21's tendon problem.
 *   3. A **per-client memory** that overrides both. The band is where you start when you know nothing;
 *      once you have watched someone for a few blocks you know their real ceiling, and it is theirs
 *      rather than the literature's.
 *
 * The third is the one an app can do better than a spreadsheet, and it is why this stores a per-muscle
 * override rather than only a number.
 */

/** Synergist credit. A set of bench is not a set of triceps, but it is not zero either -- counting only
 * primary movers understates arm and delt volume badly in a program built on compounds. Deliberately
 * conservative, and matching the table `computeSorenessDue` already uses. */
const SECONDARY: Record<string, [string, number][]> = {
  Chest: [["Triceps", 0.5], ["Front delts", 0.5]],
  Back: [["Biceps", 0.5], ["Rear delts", 0.3], ["Forearms", 0.3]],
  "Front delts": [["Triceps", 0.3]],
  Quads: [["Glutes", 0.3]],
  Hamstrings: [["Glutes", 0.5]],
  Glutes: [["Hamstrings", 0.3]],
  Traps: [["Back", 0.3]],
};

export const WEEKLY_SETS = { min: 10, startAt: 12, max: 25 } as const;

export interface MuscleVolume {
  muscle: string;
  /** Sets where this muscle is the primary mover. */
  direct: number;
  /** Direct plus fractional credit from compounds that work it as a synergist. */
  effective: number;
  verdict: "under" | "low" | "in range" | "over";
}

export function weeklySetVolume(
  exercises: { muscle: string; sets: number }[],
  limits: Record<string, number> = {},
): MuscleVolume[] {
  const direct: Record<string, number> = {};
  const effective: Record<string, number> = {};
  for (const ex of exercises) {
    direct[ex.muscle] = (direct[ex.muscle] ?? 0) + ex.sets;
    effective[ex.muscle] = (effective[ex.muscle] ?? 0) + ex.sets;
    for (const [m, weight] of SECONDARY[ex.muscle] ?? []) {
      effective[m] = (effective[m] ?? 0) + ex.sets * weight;
    }
  }
  return Object.keys(effective)
    .map((muscle) => {
      const eff = Math.round(effective[muscle] * 10) / 10;
      // A client-specific ceiling, learned from their own history, beats the literature's.
      const ceiling = limits[muscle] ?? WEEKLY_SETS.max;
      const verdict: MuscleVolume["verdict"] =
        eff > ceiling ? "over" : eff < WEEKLY_SETS.min ? "under" : eff < WEEKLY_SETS.startAt ? "low" : "in range";
      return { muscle, direct: direct[muscle] ?? 0, effective: eff, verdict };
    })
    .sort((a, b) => b.effective - a.effective);
}

/** Which muscles get the volume first, in tiers.
 *
 * Two orderings, and the difference is the client's goal rather than their sex:
 *
 * > *"If you were to list body parts in order of importance for most guys: 1. chest / shoulders / arms.
 * > 2. back. 3. legs. 4. abs. For general public / functional strength / fitness: 1. chest / back / legs.
 * > 2. shoulders / arms. 3. abs."*
 *
 * > *"For girls, if I were to list body parts in order of importance: 1. glutes / quads / hamstrings.
 * > 2. back / core. 3. chest / shoulders / arms."*
 *
 * Named for what they emphasise rather than for who he named them after, the same way the emphasis
 * profile is -- the variable doing the work is what the client wants, and an intake preference should be
 * able to pick any of the three.
 *
 * This is what the sets band is spent against. Spreading evenly across fourteen muscle groups puts
 * everything under the 10-set minimum at once, which is what a flat priority list produced; concentrating
 * on tier one and letting tier three take what is left is what actually gets anything into range.
 */
export type GoalPriority = "upper-aesthetic" | "general" | "lower-aesthetic";

export const PRIORITY_TIERS: Record<GoalPriority, string[][]> = {
  // "Most guys" -- the look-focused ordering.
  "upper-aesthetic": [
    ["Chest", "Front delts", "Side delts", "Rear delts", "Biceps", "Triceps"],
    ["Back", "Traps"],
    ["Quads", "Hamstrings", "Glutes", "Adductors", "Calves"],
    ["Abs", "Obliques", "Forearms"],
  ],
  // General population, functional strength -- the compounds come first.
  general: [
    ["Chest", "Back", "Quads", "Hamstrings", "Glutes"],
    ["Side delts", "Rear delts", "Front delts", "Biceps", "Triceps", "Traps"],
    ["Abs", "Obliques", "Calves", "Forearms", "Adductors"],
  ],
  // Lower body and posterior chain first, then back and core, then upper.
  "lower-aesthetic": [
    ["Glutes", "Quads", "Hamstrings", "Adductors"],
    ["Back", "Abs", "Obliques", "Traps"],
    ["Chest", "Side delts", "Rear delts", "Front delts", "Biceps", "Triceps"],
    ["Calves", "Forearms"],
  ],
};

/** The default ordering for an emphasis profile, when the intake says nothing more specific. */
export function defaultGoalPriority(emphasis: "upper-priority" | "glute-priority"): GoalPriority {
  return emphasis === "glute-priority" ? "lower-aesthetic" : "upper-aesthetic";
}

/** The flat spend order for a goal, tier by tier. */
export function spendOrderFor(goal: GoalPriority): string[] {
  return PRIORITY_TIERS[goal].flat();
}

/** Minimum *exercises* per week, which is a separate question from sets.
 *
 * > *"I would add a bit more chest for guys — at least four exercises per week for chest minimum. For
 * > back, two different vertical pull variations ideally and one to two horizontal rows, one of which can
 * > be a heavy hinge or deadlift. If squatting heavy with full depth, maybe just one day with a
 * > non-chest-supported row. For lateral delts, at least two variations. No more than one a week of heavy
 * > RDLs if done."*
 *
 * Note these are **variations**, not repeats -- two vertical pulls means two different ones. */
export const WEEKLY_EXERCISE_MINIMUMS: Record<string, number> = {
  Chest: 4,
  "Side delts": 2,
};

export const PATTERN_MINIMUMS: Record<string, { min: number; max?: number }> = {
  "vertical pull": { min: 2 },
  "horizontal pull": { min: 1, max: 2 },
};

/** At most one heavy hinge a week. *"No more than one a week of heavy RDLs if done."* */
export const MAX_HEAVY_HINGE_PER_WEEK = 1;

/** And the same again for an unsupported row when the squatting is already heavy and deep. */
export const MAX_UNSUPPORTED_ROW_WHEN_SQUATTING_HEAVY = 1;
