import type { LibraryExercise } from "./types";

/** The fixed muscle-group taxonomy for both the library filter and custom-exercise entry — every exercise's `muscle` must be one of these. */
export const MUSCLE_GROUPS = [
  "Abs",
  "Back",
  "Biceps",
  "Calves",
  "Chest",
  "Forearms",
  "Front delts",
  "Side delts",
  "Rear delts",
  "Full body",
  "Glutes",
  "Hamstrings",
  "Adductors",
  "Obliques",
  "Quads",
  "Traps",
  "Triceps",
] as const;

let n = 0;
function ex(name: string, muscle: string, hasVideo: boolean): LibraryExercise {
  n += 1;
  return { id: `lib-${n}`, name, muscle, hasVideo };
}
function exCardio(name: string, muscle: string = "Full body"): LibraryExercise {
  n += 1;
  return { id: `lib-${n}`, name, muscle, hasVideo: false, kind: "cardio" };
}

/**
 * A broad, gym-realistic library — free weight, cable, and named-brand plate-
 * loaded / selectorized machines (Hammer Strength, Cybex, Life Fitness,
 * Nautilus, Matrix, Precor, Panatta, Technogym) alongside the generic version
 * of each movement, so a coach can prescribe exactly what's on their floor.
 */
export const libraryExercises: LibraryExercise[] = [
  // Chest
  ex("Barbell Bench Press", "Chest", true),
  ex("Incline Barbell Bench Press", "Chest", true),
  ex("Decline Barbell Bench Press", "Chest", false),
  ex("Dumbbell Bench Press", "Chest", true),
  ex("Incline Dumbbell Press", "Chest", true),
  ex("Decline Dumbbell Press", "Chest", false),
  ex("Dumbbell Fly", "Chest", true),
  ex("Incline Dumbbell Fly", "Chest", false),
  ex("Cable Fly — Mid", "Chest", true),
  ex("Cable Fly — Low to High", "Chest", false),
  ex("Cable Fly — High to Low", "Chest", false),
  ex("Pec Deck Machine", "Chest", true),
  ex("Hammer Strength Chest Press", "Chest", true),
  ex("Hammer Strength Incline Press", "Chest", false),
  ex("Smith Machine Bench Press", "Chest", false),
  ex("Life Fitness Chest Press Machine", "Chest", false),
  ex("Cybex Eagle Chest Press", "Chest", false),
  ex("Push-Up", "Chest", false),
  ex("Weighted Dip", "Chest", true),
  ex("Nautilus Chest Dip Machine", "Chest", false),
  ex("Landmine Press", "Chest", false),
  ex("Svend Press", "Chest", false),

  // Back
  ex("Pull-Up", "Back", false),
  ex("Chin-Up", "Back", false),
  ex("Lat Pulldown — Wide Grip", "Back", true),
  ex("Lat Pulldown — Close Grip", "Back", false),
  ex("Hammer Strength Plate-Loaded Lat Pulldown", "Back", false),
  ex("Seated Cable Row", "Back", true),
  ex("Hammer Strength Chest-Supported Row", "Back", true),
  ex("T-Bar Row", "Back", true),
  ex("Barbell Bent-Over Row", "Back", true),
  ex("Pendlay Row", "Back", false),
  ex("Single-Arm Dumbbell Row", "Back", true),
  ex("Cable Straight-Arm Pulldown", "Back", false),
  ex("Cybex Assisted Pull-Up Machine", "Back", false),
  ex("Matrix Assisted Pull-Up/Dip Machine", "Back", false),
  ex("Smith Machine Row", "Back", false),
  ex("Barbell Deadlift", "Back", true),
  ex("Rack Pull", "Back", false),
  ex("Reverse Hyperextension", "Back", false),
  ex("Back Extension", "Back", false),
  ex("Nautilus Pullover Machine", "Back", false),
  ex("Meadows Row", "Back", false),

  // Shoulders
  ex("Barbell Overhead Press", "Front delts", true),
  ex("Seated Barbell Press", "Front delts", false),
  ex("Dumbbell Shoulder Press", "Front delts", true),
  ex("Seated Dumbbell Press", "Front delts", false),
  ex("Arnold Press", "Front delts", true),
  ex("Life Fitness Shoulder Press Machine", "Front delts", false),
  ex("Smith Machine Overhead Press", "Front delts", false),
  ex("Cable Lateral Raise", "Side delts", true),
  ex("Dumbbell Lateral Raise", "Side delts", true),
  ex("Cybex Lateral Raise Machine", "Side delts", false),
  ex("Front Raise — Dumbbell", "Front delts", false),
  ex("Front Raise — Cable", "Front delts", false),
  ex("Rear Delt Fly — Dumbbell", "Rear delts", true),
  ex("Hammer Strength Reverse Pec Deck", "Rear delts", true),
  ex("Barbell Upright Row", "Front delts", false),
  ex("Cable Upright Row", "Front delts", false),
  ex("Cable Face Pull", "Rear delts", true),

  // Biceps
  ex("Barbell Curl", "Biceps", true),
  ex("EZ-Bar Curl", "Biceps", true),
  ex("Dumbbell Curl", "Biceps", false),
  ex("Alternating Dumbbell Curl", "Biceps", false),
  ex("Incline Dumbbell Curl", "Biceps", false),
  ex("Preacher Curl — Barbell", "Biceps", true),
  ex("Cybex Preacher Curl Machine", "Biceps", false),
  ex("Cable Curl", "Biceps", false),
  ex("Hammer Curl", "Biceps", true),
  ex("Concentration Curl", "Biceps", false),
  ex("Life Fitness Bicep Curl Machine", "Biceps", false),
  ex("Spider Curl", "Biceps", false),

  // Triceps
  ex("Tricep Rope Pushdown", "Triceps", true),
  ex("Tricep Bar Pushdown — Straight Bar", "Triceps", false),
  ex("Overhead Cable Tricep Extension", "Triceps", true),
  ex("EZ-Bar Skull Crusher", "Triceps", true),
  ex("Dumbbell Overhead Extension", "Triceps", false),
  ex("Close-Grip Bench Press", "Triceps", true),
  ex("Nautilus Dip Machine", "Triceps", false),
  ex("Cybex Tricep Extension Machine", "Triceps", false),
  ex("Dumbbell Kickback", "Triceps", false),
  ex("Cable Kickback", "Triceps", false),
  ex("Hammer Strength Tricep Press", "Triceps", false),
  ex("Bench Dip", "Triceps", false),

  // Quads
  ex("Barbell Back Squat", "Quads", true),
  ex("Barbell Front Squat", "Quads", true),
  ex("Hack Squat Machine", "Quads", true),
  ex("Leg Press — 45° (Cybex)", "Quads", true),
  ex("Leg Press — Horizontal (Life Fitness)", "Quads", false),
  ex("Leg Extension Machine (Cybex)", "Quads", true),
  ex("Nautilus Leg Extension Machine", "Quads", false),
  ex("Smith Machine Squat", "Quads", false),
  ex("Bulgarian Split Squat", "Quads", true),
  ex("Walking Lunge", "Quads", false),
  ex("Goblet Squat", "Quads", false),
  ex("Belt Squat", "Quads", false),
  ex("Sissy Squat", "Quads", false),
  ex("Pendulum Squat Machine", "Quads", false),

  // Hamstrings / Glutes
  ex("Romanian Deadlift", "Hamstrings", true),
  ex("Stiff-Leg Deadlift", "Hamstrings", false),
  ex("Seated Leg Curl (Cybex)", "Hamstrings", true),
  ex("Lying Leg Curl (Nautilus)", "Hamstrings", true),
  ex("Standing Leg Curl", "Hamstrings", false),
  ex("Barbell Hip Thrust", "Glutes", true),
  ex("Glute Bridge", "Glutes", false),
  ex("Cable Pull-Through", "Glutes", false),
  ex("Hammer Strength Glute Kickback Machine", "Glutes", false),
  ex("Life Fitness Hip Abduction Machine", "Glutes", false),
  ex("Hip Adduction Machine", "Adductors", false),
  ex("Nordic Hamstring Curl", "Hamstrings", false),
  ex("Cable Glute Kickback", "Glutes", false),

  // Calves
  ex("Standing Calf Raise Machine", "Calves", true),
  ex("Seated Calf Raise Machine (Cybex)", "Calves", true),
  ex("Leg Press Calf Raise", "Calves", false),
  ex("Donkey Calf Raise", "Calves", false),
  ex("Smith Machine Calf Raise", "Calves", false),

  // Core
  ex("Cable Crunch", "Abs", true),
  ex("Hanging Leg Raise", "Abs", true),
  ex("Captain's Chair Knee Raise", "Abs", false),
  ex("Life Fitness Ab Crunch Machine", "Abs", false),
  ex("Cybex Ab Crunch Machine", "Abs", false),
  ex("Weighted Sit-Up", "Abs", false),
  ex("Plank", "Abs", false),
  ex("Cable Woodchopper", "Obliques", false),
  ex("Russian Twist", "Obliques", false),
  ex("Ab Wheel Rollout", "Abs", false),
  ex("Decline Sit-Up", "Abs", false),
  ex("Cybex Rotary Torso Machine", "Obliques", false),
  ex("Landmine Rotation", "Obliques", false),

  // Forearms / Traps
  ex("Barbell Shrug", "Traps", true),
  ex("Dumbbell Shrug", "Traps", false),
  ex("Trap Bar Shrug", "Traps", false),
  ex("Barbell Wrist Curl", "Forearms", false),
  ex("Reverse Wrist Curl", "Forearms", false),
  ex("Farmer's Carry", "Forearms", false),

  // Olympic / full body / conditioning
  ex("Power Clean", "Full body", false),
  ex("Clean and Jerk", "Full body", false),
  ex("Snatch", "Full body", false),
  ex("Kettlebell Swing", "Full body", false),

  // Cardio — logged as work/rest duration instead of reps and load
  exCardio("Battle Ropes"),
  exCardio("Sled Push"),
  exCardio("Jog / Run"),
  exCardio("Incline Treadmill Walk"),
  exCardio("Assault Bike"),
  exCardio("Rower"),
  exCardio("Stationary Bike"),
  exCardio("Jump Rope"),
  exCardio("Stair Climber"),
  exCardio("Ski Erg"),
];

export function normalizeExerciseName(s: string): string {
  return s
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** A spreadsheet's own muscle-group tag next to an exercise is often stale -- copy-pasted from a previous
 * row and never updated (a real, common issue in hand-maintained templates, not something we can fix by
 * parsing more carefully). Matching the exercise name against the app's own library gives a more reliable
 * answer when the name is recognizable, so this is tried first and the sheet's tag is only a fallback. */
export function guessMuscleFromLibrary(name: string): string | undefined {
  const norm = normalizeExerciseName(name);
  if (!norm) return undefined;
  const tokens = new Set(norm.split(" ").filter(Boolean));

  let best: { muscle: string; score: number } | undefined;
  for (const ex of libraryExercises) {
    const exNorm = normalizeExerciseName(ex.name);
    if (!exNorm) continue;
    if (exNorm === norm) return ex.muscle;

    const exTokens = exNorm.split(" ").filter(Boolean);
    const overlap = exTokens.filter((t) => tokens.has(t)).length;
    // Requiring 2+ shared words (not just a single generic one like "press" or "raise") before counting
    // it as a match keeps this from confidently mislabeling an exercise the library doesn't actually have.
    if (overlap < 2) continue;
    // Scored against the union of both names rather than the library entry's own length. Dividing by the
    // entry alone quietly rewards short names: for the input "Hip Abduction Machine", "Hip Adduction
    // Machine" scored 2/3 and beat "Life Fitness Hip Abduction Machine" at 3/5 -- picking the opposite
    // movement, and the opposite muscle, on the strength of the words "hip" and "machine".
    const union = new Set([...exTokens, ...tokens]).size;
    const score = overlap / union;
    if (!best || score > best.score) best = { muscle: ex.muscle, score };
  }
  return best?.muscle;
}
