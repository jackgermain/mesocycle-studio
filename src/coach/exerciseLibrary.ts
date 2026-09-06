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

  // — from nine real client programs —
  // Movements Jack prescribes regularly that the library had no name for. An exercise the app cannot name
  // is one a coach ends up re-typing as a custom every time, and one the generator can never prescribe.
  ex("Reverse Lunge", "Quads", false),
  ex("Dumbbell Reverse Lunge", "Quads", false),
  ex("Smith Machine Lunge", "Quads", false),
  ex("Smith Machine Split Lunge", "Quads", false),
  ex("Elevated Smith Machine Lunge", "Quads", false),
  ex("Smith Machine Reverse Lunge", "Quads", false),
  ex("Incline Smith Machine Press", "Chest", false),
  ex("Smith Machine Hip Thrust", "Glutes", false),
  ex("Chest Supported Row Machine", "Back", false),
  ex("Seated Row Machine", "Back", false),
  ex("Dumbbell Skullcrusher", "Triceps", false),
  ex("Freemotion Y Raise", "Rear delts", false),
  ex("Cable Rotation", "Obliques", false),
  ex("V-Up", "Abs", false),
  ex("Twisted V-Up", "Obliques", false),
  ex("Starfish Crunch", "Abs", false),
  ex("Heel Tap", "Obliques", false),
  ex("Plank Leg Lift", "Abs", false),
  ex("Plank Hip Twist", "Obliques", false),
  ex("Plank Alternating Limb Touch", "Abs", false),
  ex("Lat Prayer", "Back", false),
  ex("Glute Deadlift", "Glutes", false),
  ex("Med Ball Toss", "Full body", false),
  ex("Ball Squat Jump Toss", "Full body", false),
];

export function normalizeExerciseName(s: string): string {
  return s
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Word-level normalisation on top of the string-level pass above.
 *
 * Coaches write the same movement a dozen ways -- "Cable Curls" and "Cable Curl", "PullUps" and
 * "Pull-Up", "Incline DB Press" and "Incline Dumbbell Press". Across nine real programs, 87 of 201 names
 * were already in the library under another spelling and were being missed, which is what turns an import
 * into a pile of unrecognised custom exercises. */
const ABBREV: Record<string, string> = {
  db: "dumbbell", bb: "barbell", kb: "kettlebell", rdl: "romanian deadlift",
  ohp: "overhead press", bw: "bodyweight", "1arm": "single arm", alt: "alternating",
  ext: "extension", raises: "raise", machines: "machine",
  // Written as one word about as often as two, and the hyphen is gone by the time this runs.
  pullup: "pull up", chinup: "chin up", pushup: "push up", situp: "sit up", stepup: "step up",
  // "Abductor Machine" and "Hip Abduction Machine" are the same machine; the stems differ by two letters.
  abductor: "abduction", adductor: "adduction",
};

/** Words that say what you're holding rather than what you're doing. Used only to break ties. */
const GENERIC_WORDS = new Set(["barbell", "dumbbell", "cable", "machine", "smith", "seated", "standing", "bodyweight"]);

function words(name: string): Set<string> {
  const out = new Set<string>();
  for (const raw of normalizeExerciseName(name).split(" ")) {
    if (!raw) continue;
    // Singularise first: "pullups" has to become "pullup" before the map can turn it into "pull up".
    // Length > 2, not > 3: "ups" and "abs" are three letters and both needed singularising. "ss" endings
    // are left alone so "press" and "cross" survive.
    const singular = raw.length > 2 && raw.endsWith("s") && !raw.endsWith("ss") ? raw.slice(0, -1) : raw;
    const expanded = ABBREV[singular] ?? ABBREV[raw] ?? singular;
    for (const w of expanded.split(" ")) {
      // Crude singularisation, enough for exercise names: "curls" -> "curl", "press" stays "press".
      out.add(w.length > 2 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w);
    }
  }
  return out;
}

/** A spreadsheet's own muscle-group tag next to an exercise is often stale -- copy-pasted from a previous
 * row and never updated (a real, common issue in hand-maintained templates, not something we can fix by
 * parsing more carefully). Matching the exercise name against the app's own library gives a more reliable
 * answer when the name is recognizable, so this is tried first and the sheet's tag is only a fallback. */
export function guessMuscleFromLibrary(name: string): string | undefined {
  const norm = normalizeExerciseName(name);
  if (!norm) return undefined;
  const tokens = words(name);
  if (!tokens.size) return undefined;

  // A name that is entirely contained in a library entry, or entirely contains one, is that movement:
  // "Lat Pulldown" against "Lat Pulldown - Wide Grip", or "Seated Leg Curls" against "Seated Leg Curl
  // (Cybex)". Scored matching below never caught these because the extra qualifier drags the ratio down.
  // Most-specific wins. "Barbell RDL" contains both "Barbell Deadlift" and "Romanian Deadlift"; taking
  // whichever came first in the file returned Back instead of Hamstrings -- the right answer is the one
  // that uses more of what was actually written.
  let subset: { muscle: string; matched: number; generic: number } | undefined;
  for (const ex of libraryExercises) {
    const exTokens = words(ex.name);
    if (!exTokens.size) continue;
    const smaller = tokens.size <= exTokens.size ? tokens : exTokens;
    const larger = smaller === tokens ? exTokens : tokens;
    if (![...smaller].every((t) => larger.has(t))) continue;
    // Ties are broken toward the name carrying more meaning. "Barbell RDL" contains both "Romanian
    // Deadlift" and "Barbell Deadlift" at two tokens each; the first is the movement and the second is
    // just the bar it's held with, so the one with fewer equipment words wins.
    const generic = [...exTokens].filter((t) => GENERIC_WORDS.has(t)).length;
    if (!subset || smaller.size > subset.matched || (smaller.size === subset.matched && generic < subset.generic)) {
      subset = { muscle: ex.muscle, matched: smaller.size, generic };
    }
  }
  if (subset) return subset.muscle;

  let best: { muscle: string; score: number } | undefined;
  for (const ex of libraryExercises) {
    const exNorm = normalizeExerciseName(ex.name);
    if (!exNorm) continue;
    if (exNorm === norm) return ex.muscle;

    const exTokens = [...words(ex.name)];
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
