/** Movement patterns, and how to read one off an exercise name.
 *
 * The taxonomy for the back is Jack's, stated outright and worth quoting because it is unusually tidy:
 *
 * > *"With back exercises, there's only two types. There's vertical pulling and horizontal pulling, and
 * > then your spinal erectors having to resist spinal flexion, which you can take out of it if it's
 * > chest supported. Those are the only three types of back exercises you can do."*
 *
 * That last clause is the one with teeth. A bent-over row and a chest-supported row are the *same*
 * horizontal pull, and differ only in whether the erectors are working -- which is exactly why he
 * specifies "a type of row that is not chest supported" when he wants that stimulus. So erector loading
 * is a flag on a movement, not a pattern of its own.
 */

export const PATTERNS = [
  "horizontal push",
  "vertical push",
  "horizontal pull",
  "vertical pull",
  "squat",
  "hinge",
  "single leg",
] as const;

export type Pattern = (typeof PATTERNS)[number];

/** Which broad region a pattern belongs to. The lead exercise rotates over these across the week, and
 * the second exercise of a day must not repeat the lead's. */
export type Region = "push" | "pull" | "legs";

export const REGION_OF: Record<Pattern, Region> = {
  "horizontal push": "push",
  "vertical push": "push",
  "horizontal pull": "pull",
  "vertical pull": "pull",
  squat: "legs",
  hinge: "legs",
  "single leg": "legs",
};

export interface PatternInfo {
  pattern: Pattern;
  /** True when the torso is unsupported, so the erectors resist flexion for the duration of the set. */
  loadsErectors: boolean;
}

const RULES: { test: RegExp; pattern: Pattern; erectors?: boolean }[] = [
  // Vertical pull before horizontal, because "pulldown" and "pull-up" would both match a loose /pull/.
  { test: /pull-?up|chin-?up|pulldown|pull-?down|pullover/, pattern: "vertical pull" },
  // Deadlifts are a hinge that happens to be filed under Back in the library.
  { test: /deadlift|rack pull|good ?morning/, pattern: "hinge", erectors: true },
  { test: /romanian|stiff-?leg|pull-?through|hip thrust|glute bridge|hyperextension|back extension|nordic/, pattern: "hinge" },
  { test: /row|shrug/, pattern: "horizontal pull" },
  { test: /overhead press|shoulder press|military press|arnold press|push press/, pattern: "vertical push" },
  { test: /bench press|chest press|incline press|decline press|dumbbell press|dip|push-?up|landmine press|svend press/, pattern: "horizontal push" },
  { test: /split squat|lunge|step-?up|pistol/, pattern: "single leg" },
  { test: /squat|leg press/, pattern: "squat" },
];

/** Movements where the torso is braced against a pad, so the erectors are out of it. Jack's exception. */
const CHEST_SUPPORTED = /chest-?supported|seated cable row|machine row|t-?bar|smith machine row|pec deck|hammer strength/;

/** Rows and hinges done standing or bent over. Everything else leaves the erectors alone. */
const UNSUPPORTED = /bent-?over|pendlay|meadows|single-?arm dumbbell row|barbell.*row/;

export function patternOf(name: string): PatternInfo | undefined {
  const n = name.toLowerCase();
  for (const r of RULES) {
    if (!r.test.test(n)) continue;
    const erectors =
      r.erectors === true
        ? !CHEST_SUPPORTED.test(n)
        : r.pattern === "horizontal pull"
          ? UNSUPPORTED.test(n) && !CHEST_SUPPORTED.test(n)
          : false;
    return { pattern: r.pattern, loadsErectors: erectors };
  }
  return undefined;
}

/** Muscles ordered biggest to smallest, which is the order a session runs in.
 *
 * *"At the end of the session, you're usually finishing with really small body parts, like abs or
 * forearms or calves."* The three tiers are what the accessory slots draw from, in order. */
export const MUSCLE_SIZE: Record<string, 0 | 1 | 2> = {
  Chest: 0, Back: 0, Quads: 0, Hamstrings: 0, Glutes: 0, "Full body": 0,
  Traps: 1, "Front delts": 1, "Side delts": 1, "Rear delts": 1,
  Biceps: 1, Triceps: 1, Adductors: 1,
  Abs: 2, Obliques: 2, Calves: 2, Forearms: 2,
};

export const SMALL_MUSCLES = ["Abs", "Obliques", "Calves", "Forearms"] as const;
