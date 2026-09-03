/** Rough compound-lift detection by name, matching the pattern already used for equipment inference — good enough for a sensible default, not a certification. */
const COMPOUND_KEYWORDS = [
  "press",
  "squat",
  "deadlift",
  "row",
  "pull-up",
  "pull up",
  "chin-up",
  "chin up",
  "clean",
  "snatch",
  "jerk",
  "thrust",
  "lunge",
  "dip",
  "pulldown",
  "push-up",
  "push up",
  "carry",
  "swing",
];

export function isCompoundExercise(name: string): boolean {
  const n = name.toLowerCase();
  return COMPOUND_KEYWORDS.some((k) => n.includes(k));
}

/** Compound lifts default to a longer rest; isolation/accessory work defaults to 90s. */
export function defaultRestSec(name: string): number {
  return isCompoundExercise(name) ? 150 : 90;
}
