/** What colour a muscle label is drawn in. Pure -- no imports beyond the taxonomy.
 *
 * Jack, after showing me RP Hypertrophy's exercise list: "lets make ours color coded also", then picking
 * the region scheme -- "A, keep the three delts separate, everywhere".
 *
 * **Colour carries the REGION, the word carries the muscle.** That is how RP's list reads and why it works
 * at a glance: quads, hamstrings and glutes are all one green, chest and triceps one pink. Seventeen
 * distinguishable colours on a dark ground at 10px is not achievable -- five is, and the muscle name is
 * already written next to the dot, so the colour never has to carry information the text is missing.
 *
 * **Rear delts sit with PULL, not with the other two delts.** A rear delt is trained by rowing and face
 * pulls; a front delt by pressing. Grouping the three delts by name rather than by what trains them would
 * make the colour say something untrue about the session. They stay three separate GROUPS either way --
 * that was Jack's instruction, and it is a distinction his own doctrine leans on (G29's front-delt
 * allocation, the lateral-raise rules). If he wants the three to read as one family visually, this is the
 * single line to change.
 */

export type MuscleRegion = "legs" | "push" | "pull" | "core" | "other";

const REGION_OF_MUSCLE: Record<string, MuscleRegion> = {
  Quads: "legs",
  Hamstrings: "legs",
  Glutes: "legs",
  Adductors: "legs",
  Calves: "legs",

  Chest: "push",
  "Front delts": "push",
  "Side delts": "push",
  Triceps: "push",

  Back: "pull",
  "Rear delts": "pull",
  Biceps: "pull",
  Forearms: "pull",
  Traps: "pull",

  Abs: "core",
  Obliques: "core",

  "Full body": "other",
};

/** The region a muscle belongs to. Anything unrecognised -- a custom exercise carrying a muscle from
 * outside MUSCLE_GROUPS, or older data -- falls to "other" rather than throwing or rendering colourless. */
export function regionOf(muscle: string): MuscleRegion {
  return REGION_OF_MUSCLE[muscle] ?? "other";
}

/** Whether this muscle is mapped deliberately, as opposed to landing on the fallback.
 *
 * Distinct from `regionOf(m) !== "other"`, and the distinction matters: "Full body" IS mapped, and it is
 * mapped TO "other", because an olympic lift is a movement classification rather than a body part. A check
 * that treats the fallback value as "unmapped" reports the one deliberate case as a hole -- which is
 * exactly what the first version of the test for this did. */
export function hasRegion(muscle: string): boolean {
  return Object.prototype.hasOwnProperty.call(REGION_OF_MUSCLE, muscle);
}

/** The CSS variable for a muscle's colour, ready to drop into a style prop.
 *
 * Returns a `var(...)` rather than a hex so the palette stays defined in one place in styles.css and moves
 * with the theme -- the same reason nothing outside :root names a typeface. */
export function muscleColorVar(muscle: string): string {
  return `var(--muscle-${regionOf(muscle)})`;
}

/** The faint tinted background for a muscle chip, where a label needs more presence than coloured text. */
export function muscleTintVar(muscle: string): string {
  return `var(--muscle-${regionOf(muscle)}-tint)`;
}

/** Every region with a human label, for a legend. Ordered as a session reads: legs, push, pull, core. */
export const REGION_LABELS: { region: MuscleRegion; label: string }[] = [
  { region: "legs", label: "Legs" },
  { region: "push", label: "Push" },
  { region: "pull", label: "Pull" },
  { region: "core", label: "Core" },
  { region: "other", label: "Full body" },
];
