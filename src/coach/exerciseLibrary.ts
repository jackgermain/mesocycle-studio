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
 * A broad, gym-realistic library — free weight, cable, and plate-loaded /
 * selectorized machines.
 *
 * **No manufacturer names.** Jack: "in the exercise library, remove any brand
 * from an exercise. Just have the name of the exercise." Twenty-four entries
 * carried one (Hammer Strength, Cybex, Life Fitness, Nautilus, Matrix), either
 * as a prefix or a parenthetical, and they are gone.
 *
 * The header used to claim these sat "alongside the generic version of each
 * movement." That was never true: none of the branded entries had a generic
 * twin, which is why de-branding was a rename rather than a merge — with two
 * exceptions that DID collide and were dropped outright, their template slots
 * repointed at the survivor:
 *   - Nautilus Leg Extension Machine  → Leg Extension Machine
 *   - Cybex Ab Crunch Machine         → Ab Crunch Machine
 *
 * A name here is load-bearing, not cosmetic. `buildTemplate` throws on an
 * exercise it cannot find, so all 125 templates reference these strings exactly
 * and any rename has to move both sides in one pass. The equipment heuristic in
 * screens/exerciseHelpers.ts still matches brand words on purpose — it reads
 * names people type in, not names from this list.
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
  ex("Chest Press", "Chest", true),
  ex("Incline Press", "Chest", false),
  ex("Smith Machine Bench Press", "Chest", false),
  ex("Chest Press Machine", "Chest", false),
  ex("Eagle Chest Press", "Chest", false),
  ex("Push-Up", "Chest", false),
  ex("Weighted Dip", "Chest", true),
  ex("Chest Dip Machine", "Chest", false),
  ex("Landmine Press", "Chest", false),
  ex("Svend Press", "Chest", false),

  // Back
  ex("Pull-Up", "Back", false),
  ex("Chin-Up", "Back", false),
  ex("Lat Pulldown — Wide Grip", "Back", true),
  ex("Lat Pulldown — Close Grip", "Back", false),
  ex("Plate-Loaded Lat Pulldown", "Back", false),
  ex("Seated Cable Row", "Back", true),
  ex("Chest-Supported Row", "Back", true),
  ex("T-Bar Row", "Back", true),
  ex("Barbell Bent-Over Row", "Back", true),
  ex("Pendlay Row", "Back", false),
  ex("Single-Arm Dumbbell Row", "Back", true),
  ex("Cable Straight-Arm Pulldown", "Back", false),
  ex("Assisted Pull-Up Machine", "Back", false),
  ex("Assisted Pull-Up/Dip Machine", "Back", false),
  ex("Smith Machine Row", "Back", false),
  ex("Barbell Deadlift", "Back", true),
  ex("Rack Pull", "Back", false),
  ex("Reverse Hyperextension", "Back", false),
  ex("Back Extension", "Back", false),
  ex("Pullover Machine", "Back", false),
  ex("Meadows Row", "Back", false),

  // Shoulders
  ex("Barbell Overhead Press", "Front delts", true),
  ex("Seated Barbell Press", "Front delts", false),
  ex("Dumbbell Shoulder Press", "Front delts", true),
  ex("Seated Dumbbell Press", "Front delts", false),
  ex("Arnold Press", "Front delts", true),
  ex("Shoulder Press Machine", "Front delts", false),
  ex("Smith Machine Overhead Press", "Front delts", false),
  ex("Cable Lateral Raise", "Side delts", true),
  ex("Dumbbell Lateral Raise", "Side delts", true),
  ex("Lateral Raise Machine", "Side delts", false),
  ex("Front Raise — Dumbbell", "Front delts", false),
  ex("Front Raise — Cable", "Front delts", false),
  ex("Rear Delt Fly — Dumbbell", "Rear delts", true),
  ex("Reverse Pec Deck", "Rear delts", true),
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
  ex("Preacher Curl Machine", "Biceps", false),
  ex("Cable Curl", "Biceps", false),
  ex("Hammer Curl", "Biceps", true),
  ex("Concentration Curl", "Biceps", false),
  ex("Bicep Curl Machine", "Biceps", false),
  ex("Spider Curl", "Biceps", false),

  // Triceps
  ex("Tricep Rope Pushdown", "Triceps", true),
  ex("Tricep Bar Pushdown — Straight Bar", "Triceps", false),
  ex("Overhead Cable Tricep Extension", "Triceps", true),
  ex("EZ-Bar Skull Crusher", "Triceps", true),
  ex("Dumbbell Overhead Extension", "Triceps", false),
  ex("Close-Grip Bench Press", "Triceps", true),
  // "Triceps Dip Machine", not "Dip Machine": the bare name is a strict subset of
  // "Chest Dip Machine" above, so the matcher resolved it to that entry and booked triceps work
  // as chest volume -- and the triceps entry could never be reached by name at all. Two different
  // machines in the doctrine, so they need two names that are not prefixes of each other.
  ex("Triceps Dip Machine", "Triceps", false),
  ex("Tricep Extension Machine", "Triceps", false),
  ex("Dumbbell Kickback", "Triceps", false),
  ex("Cable Kickback", "Triceps", false),
  ex("Tricep Press", "Triceps", false),
  ex("Bench Dip", "Triceps", false),

  // Quads
  ex("Barbell Back Squat", "Quads", true),
  ex("Barbell Front Squat", "Quads", true),
  ex("Hack Squat Machine", "Quads", true),
  ex("Leg Press — 45°", "Quads", true),
  ex("Leg Press — Horizontal", "Quads", false),
  ex("Leg Extension Machine", "Quads", true),
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
  ex("Single-Leg Romanian Deadlift", "Hamstrings", false),
  ex("Seated Leg Curl", "Hamstrings", true),
  ex("Lying Leg Curl", "Hamstrings", true),
  ex("Standing Leg Curl", "Hamstrings", false),
  ex("Barbell Hip Thrust", "Glutes", true),
  ex("Glute Bridge", "Glutes", false),
  ex("Cable Pull-Through", "Glutes", false),
  ex("Glute Kickback Machine", "Glutes", false),
  ex("Hip Abduction Machine", "Glutes", false),
  ex("Hip Adduction Machine", "Adductors", false),
  ex("Nordic Hamstring Curl", "Hamstrings", false),
  ex("Glute Ham Raise", "Hamstrings", false),
  ex("Cable Glute Kickback", "Glutes", false),

  // Calves
  ex("Standing Calf Raise Machine", "Calves", true),
  ex("Seated Calf Raise Machine", "Calves", true),
  ex("Leg Press Calf Raise", "Calves", false),
  ex("Donkey Calf Raise", "Calves", false),
  ex("Smith Machine Calf Raise", "Calves", false),

  // Core
  ex("Cable Crunch", "Abs", true),
  ex("Hanging Leg Raise", "Abs", true),
  ex("Captain's Chair Knee Raise", "Abs", false),
  ex("Ab Crunch Machine", "Abs", false),
  ex("Weighted Sit-Up", "Abs", false),
  ex("Plank", "Abs", false),
  ex("Cable Woodchopper", "Obliques", false),
  // Chops and anti-rotation work, which the library was missing entirely.
  //
  // Jack: "the low to high cable chop does not work your chest. It works your core or abs." It was being
  // reported as Chest, and not because anything was mis-tagged: no chop existed here at all, so the name
  // fell through to the fuzzy matcher, which scored "Low to High Cable Chop" against "Cable Fly — Low to
  // High" on four shared words (low, to, high, cable) out of six and returned Chest. The movement word --
  // the only one that says what the exercise IS -- carried no more weight than the direction it travels in.
  //
  // "Cable Chop" is the entry that actually fixes it: {cable, chop} is a SUBSET of every variant anyone
  // writes ("Low to High Cable Chop", "Half Kneeling Cable Chop"), and the subset pass returns before the
  // fuzzy scorer ever runs. The two directional entries follow the same "Cable Fly — Low to High" naming
  // the chest rows use, so an exact match is available for the spellings people actually type.
  ex("Cable Chop", "Obliques", false),
  ex("Cable Chop — Low to High", "Obliques", false),
  ex("Cable Chop — High to Low", "Obliques", false),
  ex("Pallof Press", "Obliques", false),
  ex("Landmine Twist", "Obliques", false),
  ex("Russian Twist", "Obliques", false),
  ex("Ab Wheel Rollout", "Abs", false),
  ex("Decline Sit-Up", "Abs", false),
  ex("Rotary Torso Machine", "Obliques", false),
  ex("Landmine Rotation", "Obliques", false),

  // Forearms / Traps
  ex("Barbell Shrug", "Traps", true),
  ex("Dumbbell Shrug", "Traps", false),
  ex("Trap Bar Shrug", "Traps", false),
  ex("Barbell Wrist Curl", "Forearms", false),
  ex("Reverse Wrist Curl", "Forearms", false),
  ex("Dumbbell Reverse Curl", "Forearms", false),
  ex("Barbell Reverse Curl", "Forearms", false),
  ex("Standing Dumbbell Wrist Curl", "Forearms", false),
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

  // Dumbbell and bodyweight movements, added for the at-home templates. The library had 19 dumbbell
  // entries and almost all of them upper body, so a home program could not train legs without borrowing a
  // machine that isn't there. Every one of these is a movement someone can do with a pair of dumbbells and
  // a bench, which is the whole constraint of that category.
  ex("Dumbbell Romanian Deadlift", "Hamstrings", false),
  ex("Dumbbell Stiff-Leg Deadlift", "Hamstrings", false),
  ex("Dumbbell Step-Up", "Quads", false),
  ex("Dumbbell Front Squat", "Quads", false),
  ex("Dumbbell Split Squat", "Quads", false),
  ex("Dumbbell Sumo Squat", "Quads", false),
  ex("Dumbbell Floor Press", "Chest", false),
  ex("Dumbbell Pullover", "Back", false),
  ex("Dumbbell Upright Row", "Front delts", false),
  // No Dumbbell Shrug here: the library already had one, and a second entry is a duplicate the name
  // matcher would have to choose between. Caught by tests/exerciseLibrary's uniqueness check.
  ex("Dumbbell Calf Raise", "Calves", false),
  ex("Dumbbell Glute Bridge", "Glutes", false),
  ex("Dumbbell Hip Thrust", "Glutes", false),
  ex("Dumbbell Wrist Curl", "Forearms", false),
  ex("Dumbbell Reverse Wrist Curl", "Forearms", false),
  ex("Bodyweight Squat", "Quads", false),
  ex("Bodyweight Split Squat", "Quads", false),
  ex("Glute Bridge — Bodyweight", "Glutes", false),
  ex("Single-Leg Calf Raise", "Calves", false),
  // No Bench Dip here either: like Dumbbell Shrug, the library already had one. Both duplicates came from
  // me writing an at-home list from scratch instead of checking what was there, and the uniqueness test
  // only reports the FIRST duplicate it finds -- which is why this one surfaced a round after the shrug.
  ex("Incline Push-Up", "Chest", false),
  ex("Pike Push-Up", "Front delts", false),
  ex("Side Plank", "Obliques", false),
  ex("Mountain Climber", "Abs", false),
  ex("Bird Dog", "Back", false),
];

export function normalizeExerciseName(s: string): string {
  return s
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    // Compounds that are one word in the library and two in the wild. This has to happen at string level
    // rather than in the token map below, because joining two words is not something a per-word lookup
    // can do -- "lat pull down" tokenises to three words and never meets "pulldown".
    .replace(/\bpull down\b/g, "pulldown")
    .replace(/\bpush down\b/g, "pushdown")
    .replace(/\blay down\b/g, "lying");
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
  // Written short in almost every real sheet. "Inc" was the one that made "DB Inc Press" resolve to a
  // flat Dumbbell Bench Press -- the wrong exercise, and the wrong half of the chest.
  inc: "incline", dec: "decline", rev: "reverse",
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
/** How sure the match is, because the two ends of this scale deserve opposite treatment.
 *
 * "exact" and "subset" are safe enough to rename an imported exercise with -- they mean every word of one
 * name appears in the other. "fuzzy" is a scored token overlap that is right often enough to pick a muscle
 * group from and *not* right often enough to silently retitle a coach's exercise with. */
export type MatchConfidence = "exact" | "subset" | "fuzzy";

/** Resolve a written exercise name to the library entry it means.
 *
 * `guessMuscleFromLibrary` has always done this work and then thrown the entry away, returning only the
 * muscle -- which is all the soreness check and the volume counter need. But anything that reasons about
 * *which movement this is* (rep range, set cap, where it belongs in a session, what it shouldn't be
 * stacked with) is keyed on the library entry itself, and an imported "DB Inc Press" that stays a
 * free-text string is invisible to all of it. Same matcher, fuller answer. */
export function resolveLibraryExercise(name: string): { exercise: LibraryExercise; confidence: MatchConfidence } | undefined {
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
  let subset: { exercise: LibraryExercise; matched: number; generic: number } | undefined;
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
      subset = { exercise: ex, matched: smaller.size, generic };
    }
  }
  if (subset) return { exercise: subset.exercise, confidence: "subset" };

  let best: { exercise: LibraryExercise; score: number } | undefined;
  for (const ex of libraryExercises) {
    const exNorm = normalizeExerciseName(ex.name);
    if (!exNorm) continue;
    if (exNorm === norm) return { exercise: ex, confidence: "exact" };

    const exTokens = [...words(ex.name)];
    const overlap = exTokens.filter((t) => tokens.has(t)).length;
    // Requiring 2+ shared words (not just a single generic one like "press" or "raise") before counting
    // it as a match keeps this from confidently mislabeling an exercise the library doesn't actually have.
    if (overlap < 2) continue;
    // Scored against the union of both names rather than the library entry's own length. Dividing by the
    // entry alone quietly rewards short names: for the input "Hip Abduction Machine", "Hip Adduction
    // Machine" scored 2/3 and beat "Hip Abduction Machine" at 3/5 -- picking the opposite
    // movement, and the opposite muscle, on the strength of the words "hip" and "machine".
    const union = new Set([...exTokens, ...tokens]).size;
    const score = overlap / union;
    if (!best || score > best.score) best = { exercise: ex, score };
  }
  return best ? { exercise: best.exercise, confidence: "fuzzy" } : undefined;
}

/** Turn a name written on a spreadsheet into the library's own name for the same movement.
 *
 * Renames only on an "exact" or "subset" match -- every word of one name appearing in the other. A fuzzy
 * score is right often enough to pick a muscle group and not right often enough to retitle a coach's
 * exercise behind their back: silently turning "Banana Split Squat" into "Bulgarian Split Squat" is worse
 * than leaving it alone, because the coach has no way to see it happened.
 *
 * The written name is kept in `sourceName` whenever it is replaced, so the sheet stays auditable and the
 * rename is reversible. */
export function canonicalizeImportedName(raw: string, sheetMuscle?: string): { name: string; muscle: string; sourceName?: string } {
  const written = raw.trim();
  const hit = resolveLibraryExercise(written);
  const muscle = hit?.exercise.muscle || (sheetMuscle ?? "").trim() || "General";
  if (!hit || hit.confidence === "fuzzy" || hit.exercise.name === written) return { name: written, muscle };
  return { name: hit.exercise.name, muscle, sourceName: written };
}

/** The muscle group a written exercise name belongs to. Unchanged in behaviour -- it is the same matcher
 * it always was, now reading the answer off `resolveLibraryExercise` instead of computing it inline. */
export function guessMuscleFromLibrary(name: string): string | undefined {
  return resolveLibraryExercise(name)?.exercise.muscle;
}
