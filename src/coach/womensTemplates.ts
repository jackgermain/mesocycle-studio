import type { BuilderDay, BuilderExercise, BuilderSet, CoachProgram } from "./types";
import { libraryExercises } from "./exerciseLibrary";

/** Twenty-two women's templates, written to the doctrine drawn from Jack's own approved set.
 *
 * Jack: "lets make some templates.. I want you to make a similar amount of ones like ALL the ones I've
 * submitted and taught you.. Make all the womens templates first... Just 1 week because it gets repeated."
 *
 * So each is ONE week. G116: the split is fixed for the whole block, weeks 2..N repeat week 1 exactly, and
 * what varies is load and reps rather than structure. There is nothing structurally new in week two to write.
 *
 * The distribution matches what he sent: 4 six-day, 7 five-day, 4 four-day, 3 three-day, 4 two-day.
 *
 * ## The rules these are built to, and where each comes from
 *
 * - **G107** — leg leads per week by frequency, counted off his templates: 2-day **2 of 2** (all four),
 *   3-day 2-3 of 3, 4-day 2-3 of 4, 5-day **3-5 of 5**, 6-day 3-6 of 6. This is the rule the app's own
 *   LEAD_ROTATION gets wrong at three frequencies, so these are written to the observed counts, not to it.
 * - **G104** — glutes lead, and hip thrusts belong in a female program.
 * - **G106 / G124** — an emphasised muscle takes **consecutive** slots, never spread ones. No session here
 *   alternates chest/back/chest; muscles run in blocks.
 * - **G102 / G110** — the small muscle is a **divider at the leg/upper seam**, not a finisher. On a pure leg
 *   day the seam is the end of the session, so it finishes there; on a mixed day it lands mid-session. One
 *   rule, both placements.
 * - **G103** — on a mixed day, legs open and the upper body follows.
 * - **G101** — a six-day week carries leg work on nearly every day, and never two consecutive days of the
 *   same emphasis.
 * - **G111** — a four-day week is two session types run twice, on **Mon/Tue/Thu/Fri** (two on, one off, two
 *   on, two off), not four consecutive days and not four distinct sessions.
 * - **G107** again — the three-day female template is **full body every day**, 7-9 exercises, opening on legs.
 * - **G118** — abs and calves are in by default rather than opt-in.
 *
 * ## What the library could not supply
 *
 * G104 records that the opening movement is "usually a deadlift variant with the stance or range varied --
 * sumo, deficit, sumo-plus-deficit, plain". The library carries **none** of those as distinct entries, and
 * only eight Glutes exercises in total. Rather than invent names -- which resolve to muscle "General" and
 * silently mis-book volume, exactly how "Deadlifts" became "Romanian Deadlift" in the importer -- these lean
 * on the hamstring hinges and the quad list for that work. Worth adding the stance variants to the library
 * if these templates are to read the way his do.
 */

/** One exercise in a template: the library's own name, then sets and reps. Muscle is looked up rather than
 * written, so a template can never disagree with the library about what it is training. */
type Slot = readonly [name: string, sets: number, reps: number];

interface TemplateDay {
  readonly name: string;
  readonly slots: readonly Slot[];
}

interface TemplateSpec {
  readonly name: string;
  /** The emphasis, in Jack's own vocabulary (G108, G112). Becomes `intendedFor`. */
  readonly emphasis: string;
  /** Weekdays as offsets from Monday, 0=Mon .. 6=Sun (G111 for the four-day shape). */
  readonly dows: readonly number[];
  readonly days: readonly TemplateDay[];
}

const MUSCLE_BY_NAME = new Map(libraryExercises.map((e) => [e.name, e.muscle]));

/** Expands the compact authoring form into a real CoachProgram.
 *
 * The compact form exists so twenty-two templates stay readable and diffable. Writing these as literal
 * CoachProgram objects would mean roughly two thousand hand-numbered BuilderSet objects and a wall of
 * bookkeeping fields, and nobody would ever review it.
 *
 * Throws on an unknown exercise name. That is deliberate: a name the library does not have would otherwise
 * pass silently, take muscle "General", and book its volume against nothing. Failing loudly at build time
 * is the only version of this that stays correct as the library changes. */
export function buildTemplate(spec: TemplateSpec): CoachProgram {
  const id = `wt-${spec.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;

  const days: BuilderDay[] = spec.days.map((day, di) => {
    const exercises: BuilderExercise[] = day.slots.map(([name, setCount, reps], xi) => {
      const muscle = MUSCLE_BY_NAME.get(name);
      if (!muscle) throw new Error(`womensTemplates: "${name}" is not in the exercise library (${spec.name}, ${day.name})`);
      const sets: BuilderSet[] = Array.from({ length: setCount }, (_, si) => ({
        id: `${id}-d${di + 1}-x${xi + 1}-s${si + 1}`,
        reps,
        // Load is deliberately zero. The template is a muscle-order skeleton (G113); what someone lifts is
        // theirs, and a number invented here would be a confident fiction in front of a coach.
        loadValue: 0,
        warmup: false,
      }));
      return { id: `${id}-d${di + 1}-x${xi + 1}`, name, muscle, kind: "strength", sets };
    });
    return { id: `${id}-d${di + 1}`, name: day.name, exercises };
  });

  const weeklySets = days.reduce((n, d) => n + d.exercises.reduce((m, e) => m + e.sets.length, 0), 0);

  return {
    id,
    name: spec.name,
    status: "published",
    // One week, because the split repeats unchanged for the whole block (G116).
    weeks: 1,
    hasDeload: false,
    daysPerWeek: spec.days.length,
    trainingDows: [...spec.dows],
    effortScale: "rir",
    assignedCount: 0,
    weeklySets,
    phaseWeights: [1, 0, 0],
    progressPct: 0,
    days,
    isTemplate: true,
    intendedFor: spec.emphasis,
    // Off until Jack says the generator may build from these -- a template becomes a candidate because its
    // author said so, not because it happened to exist.
    automatable: false,
    visibility: "private",
  };
}

/* ------------------------------------------------------------------ six days
 * G101: legs on nearly every day, never two consecutive days of the same emphasis.
 * G107: 3-6 leg leads of 6.
 */

const SIX_DAY: TemplateSpec[] = [
  {
    name: "Glute Focus — Six Day",
    emphasis: "Glutes",
    dows: [0, 1, 2, 3, 4, 5],
    days: [
      {
        name: "Glutes & Hamstrings",
        slots: [
          ["Barbell Hip Thrust", 4, 10],
          ["Glute Bridge", 3, 12],
          ["Romanian Deadlift", 3, 10],
          ["Seated Leg Curl (Cybex)", 3, 12],
          ["Standing Calf Raise Machine", 3, 15],
        ],
      },
      {
        name: "Back & Shoulders",
        slots: [
          ["Lat Pulldown — Wide Grip", 3, 10],
          ["Seated Cable Row", 3, 10],
          ["Cable Lateral Raise", 3, 15],
          ["Rear Delt Fly — Dumbbell", 3, 15],
          ["Hanging Leg Raise", 3, 12],
        ],
      },
      {
        name: "Quads & Glutes",
        slots: [
          ["Barbell Back Squat", 4, 8],
          ["Leg Press — 45° (Cybex)", 3, 12],
          ["Bulgarian Split Squat", 3, 10],
          ["Cable Glute Kickback", 3, 15],
          ["Seated Calf Raise Machine (Cybex)", 3, 15],
        ],
      },
      {
        name: "Chest & Arms",
        slots: [
          ["Incline Dumbbell Press", 3, 10],
          ["Pec Deck Machine", 3, 12],
          ["Dumbbell Curl", 3, 12],
          ["Tricep Rope Pushdown", 3, 12],
          ["Cable Crunch", 3, 15],
        ],
      },
      {
        name: "Glutes & Adductors",
        slots: [
          ["Smith Machine Hip Thrust", 4, 10],
          ["Cable Pull-Through", 3, 12],
          ["Life Fitness Hip Abduction Machine", 3, 15],
          ["Hip Adduction Machine", 3, 15],
          ["Leg Press Calf Raise", 3, 15],
        ],
      },
      {
        name: "Upper Body",
        slots: [
          ["Hammer Strength Chest-Supported Row", 3, 10],
          ["Lat Prayer", 3, 12],
          ["Dumbbell Shoulder Press", 3, 10],
          ["Dumbbell Lateral Raise", 3, 15],
          ["Russian Twist", 3, 20],
        ],
      },
    ],
  },
  {
    name: "Lower Body Emphasis — Six Day",
    emphasis: "Lower Body",
    dows: [0, 1, 2, 3, 4, 5],
    days: [
      {
        name: "Glutes",
        slots: [
          ["Barbell Hip Thrust", 4, 10],
          ["Cable Pull-Through", 3, 12],
          ["Hammer Strength Glute Kickback Machine", 3, 15],
          ["Standing Calf Raise Machine", 3, 15],
        ],
      },
      {
        name: "Back & Biceps",
        slots: [
          ["Lat Pulldown — Close Grip", 3, 10],
          ["Seated Row Machine", 3, 10],
          ["Single-Arm Dumbbell Row", 3, 12],
          ["EZ-Bar Curl", 3, 12],
          ["Hammer Curl", 3, 12],
        ],
      },
      {
        name: "Quads",
        slots: [
          ["Hack Squat Machine", 4, 10],
          ["Leg Extension Machine (Cybex)", 3, 15],
          ["Walking Lunge", 3, 12],
          ["Smith Machine Calf Raise", 3, 15],
        ],
      },
      {
        name: "Chest & Shoulders",
        slots: [
          ["Dumbbell Bench Press", 3, 10],
          ["Cable Fly — Mid", 3, 12],
          ["Seated Dumbbell Press", 3, 10],
          ["Cybex Lateral Raise Machine", 3, 15],
          ["V-Up", 3, 15],
        ],
      },
      {
        name: "Hamstrings & Glutes",
        slots: [
          ["Romanian Deadlift", 4, 10],
          ["Lying Leg Curl (Nautilus)", 3, 12],
          ["Glute Bridge", 3, 12],
          ["Donkey Calf Raise", 3, 15],
        ],
      },
      {
        name: "Arms & Abs",
        slots: [
          ["Cable Curl", 3, 12],
          ["Incline Dumbbell Curl", 3, 12],
          ["Overhead Cable Tricep Extension", 3, 12],
          ["Tricep Bar Pushdown — Straight Bar", 3, 12],
          ["Ab Wheel Rollout", 3, 12],
        ],
      },
    ],
  },
  {
    name: "Legs & Pull / Legs & Push — Six Day",
    emphasis: "Lower Body",
    dows: [0, 1, 2, 3, 4, 5],
    days: [
      {
        name: "Legs & Pull A",
        slots: [
          ["Barbell Hip Thrust", 4, 10],
          ["Romanian Deadlift", 3, 10],
          ["Standing Calf Raise Machine", 3, 15],
          ["Lat Pulldown — Wide Grip", 3, 10],
          ["Seated Cable Row", 3, 12],
          ["Dumbbell Curl", 3, 12],
        ],
      },
      {
        name: "Legs & Push A",
        slots: [
          ["Barbell Back Squat", 4, 8],
          ["Leg Extension Machine (Cybex)", 3, 15],
          ["Cable Crunch", 3, 15],
          ["Incline Dumbbell Press", 3, 10],
          ["Dumbbell Lateral Raise", 3, 15],
          ["Tricep Rope Pushdown", 3, 12],
        ],
      },
      {
        name: "Legs & Pull B",
        slots: [
          ["Glute Deadlift", 4, 10],
          ["Seated Leg Curl (Cybex)", 3, 12],
          ["Seated Calf Raise Machine (Cybex)", 3, 15],
          ["Chest Supported Row Machine", 3, 10],
          ["Cable Straight-Arm Pulldown", 3, 12],
          ["Cable Curl", 3, 12],
        ],
      },
      {
        name: "Legs & Push B",
        slots: [
          ["Bulgarian Split Squat", 3, 10],
          ["Leg Press — 45° (Cybex)", 3, 12],
          ["Hanging Leg Raise", 3, 12],
          ["Dumbbell Bench Press", 3, 10],
          ["Cable Lateral Raise", 3, 15],
          ["Dumbbell Overhead Extension", 3, 12],
        ],
      },
      {
        name: "Legs & Pull C",
        slots: [
          ["Smith Machine Hip Thrust", 4, 10],
          ["Single-Leg Romanian Deadlift", 3, 10],
          ["Leg Press Calf Raise", 3, 15],
          ["Hammer Strength Plate-Loaded Lat Pulldown", 3, 10],
          ["Meadows Row", 3, 12],
          ["Preacher Curl — Barbell", 3, 12],
        ],
      },
      {
        name: "Legs & Push C",
        slots: [
          ["Goblet Squat", 3, 12],
          ["Cable Glute Kickback", 3, 15],
          ["Starfish Crunch", 3, 15],
          ["Pec Deck Machine", 3, 12],
          ["Rear Delt Fly — Dumbbell", 3, 15],
          ["Cable Kickback", 3, 15],
        ],
      },
    ],
  },
  {
    name: "Quad & Glute Split — Six Day",
    emphasis: "Lower Body",
    dows: [0, 1, 2, 3, 4, 5],
    days: [
      {
        name: "Quads & Chest",
        slots: [
          ["Barbell Front Squat", 4, 8],
          ["Leg Press — Horizontal (Life Fitness)", 3, 12],
          ["Standing Calf Raise Machine", 3, 15],
          ["Incline Smith Machine Press", 3, 10],
          ["Cable Fly — Low to High", 3, 12],
        ],
      },
      {
        name: "Back & Abs",
        slots: [
          ["Barbell Bent-Over Row", 3, 10],
          ["Lat Pulldown — Wide Grip", 3, 10],
          ["Nautilus Pullover Machine", 3, 12],
          ["Decline Sit-Up", 3, 15],
          ["Cable Woodchopper", 3, 15],
        ],
      },
      {
        name: "Glutes & Hamstrings",
        slots: [
          ["Barbell Hip Thrust", 4, 10],
          ["Glute Bridge", 3, 12],
          ["Stiff-Leg Deadlift", 3, 10],
          ["Standing Leg Curl", 3, 12],
          ["Seated Calf Raise Machine (Cybex)", 3, 15],
        ],
      },
      {
        name: "Shoulders & Arms",
        slots: [
          ["Seated Dumbbell Press", 3, 10],
          ["Dumbbell Lateral Raise", 3, 15],
          ["Cable Face Pull", 3, 15],
          ["Alternating Dumbbell Curl", 3, 12],
          ["EZ-Bar Skull Crusher", 3, 12],
        ],
      },
      {
        name: "Quads & Glutes",
        slots: [
          ["Smith Machine Squat", 4, 10],
          ["Reverse Lunge", 3, 12],
          ["Life Fitness Hip Abduction Machine", 3, 15],
          ["Smith Machine Calf Raise", 3, 15],
        ],
      },
      {
        name: "Upper & Abs",
        slots: [
          ["Seated Cable Row", 3, 10],
          ["Dumbbell Bench Press", 3, 10],
          ["Cybex Lateral Raise Machine", 3, 15],
          ["Captain's Chair Knee Raise", 3, 15],
          ["Plank Hip Twist", 3, 20],
        ],
      },
    ],
  },
];

/* ----------------------------------------------------------------- five days
 * G107: 3-5 leg leads of 5. G110: at five days the non-emphasised region is not thinned -- it gets a whole
 * block on fewer days.
 */

const FIVE_DAY: TemplateSpec[] = [
  {
    name: "Glute Focus — Five Day",
    emphasis: "Glutes",
    dows: [0, 1, 2, 3, 4],
    days: [
      {
        name: "Glutes",
        slots: [
          ["Barbell Hip Thrust", 4, 10],
          ["Cable Pull-Through", 3, 12],
          ["Hammer Strength Glute Kickback Machine", 3, 15],
          ["Cable Crunch", 3, 15],
        ],
      },
      {
        name: "Back & Biceps",
        slots: [
          ["Lat Pulldown — Wide Grip", 3, 10],
          ["Seated Cable Row", 3, 10],
          ["Single-Arm Dumbbell Row", 3, 12],
          ["Dumbbell Curl", 3, 12],
        ],
      },
      {
        name: "Quads & Calves",
        slots: [
          ["Barbell Back Squat", 4, 8],
          ["Leg Press — 45° (Cybex)", 3, 12],
          ["Leg Extension Machine (Cybex)", 3, 15],
          ["Standing Calf Raise Machine", 3, 15],
        ],
      },
      {
        name: "Chest & Shoulders",
        slots: [
          ["Incline Dumbbell Press", 3, 10],
          ["Pec Deck Machine", 3, 12],
          ["Dumbbell Shoulder Press", 3, 10],
          ["Cable Lateral Raise", 3, 15],
        ],
      },
      {
        name: "Hamstrings & Glutes",
        slots: [
          ["Romanian Deadlift", 4, 10],
          ["Lying Leg Curl (Nautilus)", 3, 12],
          ["Glute Bridge", 3, 12],
          ["Seated Calf Raise Machine (Cybex)", 3, 15],
        ],
      },
    ],
  },
  {
    name: "Glutes & Hamstrings — Five Day",
    emphasis: "Glutes",
    dows: [0, 1, 3, 4, 5],
    days: [
      {
        name: "Glutes A",
        slots: [
          ["Smith Machine Hip Thrust", 4, 10],
          ["Glute Bridge", 3, 12],
          ["Cable Glute Kickback", 3, 15],
          ["Hanging Leg Raise", 3, 12],
        ],
      },
      {
        name: "Hamstrings",
        slots: [
          ["Romanian Deadlift", 4, 10],
          ["Seated Leg Curl (Cybex)", 3, 12],
          ["Glute Ham Raise", 3, 10],
          ["Standing Calf Raise Machine", 3, 15],
        ],
      },
      {
        name: "Upper Pull",
        slots: [
          ["Chin-Up", 3, 8],
          ["Hammer Strength Chest-Supported Row", 3, 10],
          ["Cable Straight-Arm Pulldown", 3, 12],
          ["Cable Curl", 3, 12],
        ],
      },
      {
        name: "Glutes B",
        slots: [
          ["Barbell Hip Thrust", 4, 10],
          ["Cable Pull-Through", 3, 12],
          ["Life Fitness Hip Abduction Machine", 3, 15],
          ["Leg Press Calf Raise", 3, 15],
        ],
      },
      {
        name: "Upper Push",
        slots: [
          ["Dumbbell Bench Press", 3, 10],
          ["Cable Fly — Mid", 3, 12],
          ["Seated Dumbbell Press", 3, 10],
          ["Tricep Rope Pushdown", 3, 12],
        ],
      },
    ],
  },
  {
    name: "Lower Body Emphasis — Five Day",
    emphasis: "Lower Body",
    dows: [0, 2, 4, 1, 3],
    days: [
      {
        name: "Legs A",
        slots: [
          ["Barbell Back Squat", 4, 8],
          ["Leg Press — 45° (Cybex)", 3, 12],
          ["Bulgarian Split Squat", 3, 10],
          ["Standing Calf Raise Machine", 3, 15],
        ],
      },
      {
        name: "Upper A",
        slots: [
          ["Lat Pulldown — Wide Grip", 3, 10],
          ["Seated Row Machine", 3, 10],
          ["Incline Dumbbell Press", 3, 10],
          ["Dumbbell Lateral Raise", 3, 15],
        ],
      },
      {
        name: "Legs B",
        slots: [
          ["Barbell Hip Thrust", 4, 10],
          ["Romanian Deadlift", 3, 10],
          ["Lying Leg Curl (Nautilus)", 3, 12],
          ["Seated Calf Raise Machine (Cybex)", 3, 15],
        ],
      },
      {
        name: "Upper B",
        slots: [
          ["Dumbbell Bench Press", 3, 10],
          ["Pec Deck Machine", 3, 12],
          ["Cable Face Pull", 3, 15],
          ["Hammer Curl", 3, 12],
        ],
      },
      {
        name: "Legs C",
        slots: [
          ["Hack Squat Machine", 4, 10],
          ["Walking Lunge", 3, 12],
          ["Cable Glute Kickback", 3, 15],
          ["Smith Machine Calf Raise", 3, 15],
        ],
      },
    ],
  },
  {
    name: "Glutes & Back — Five Day",
    emphasis: "Back & Biceps",
    dows: [0, 1, 2, 4, 5],
    days: [
      {
        name: "Glutes & Abs",
        slots: [
          ["Barbell Hip Thrust", 4, 10],
          ["Glute Bridge", 3, 12],
          ["Cable Crunch", 3, 15],
          ["Russian Twist", 3, 20],
        ],
      },
      {
        name: "Back A",
        slots: [
          ["Barbell Bent-Over Row", 3, 10],
          ["Lat Pulldown — Close Grip", 3, 10],
          ["Meadows Row", 3, 12],
          ["EZ-Bar Curl", 3, 12],
        ],
      },
      {
        name: "Quads & Calves",
        slots: [
          ["Barbell Front Squat", 4, 8],
          ["Leg Extension Machine (Cybex)", 3, 15],
          ["Reverse Lunge", 3, 12],
          ["Standing Calf Raise Machine", 3, 15],
        ],
      },
      {
        name: "Back B",
        slots: [
          ["Chin-Up", 3, 8],
          ["Seated Cable Row", 3, 10],
          ["Nautilus Pullover Machine", 3, 12],
          ["Incline Dumbbell Curl", 3, 12],
        ],
      },
      {
        name: "Hamstrings & Shoulders",
        slots: [
          ["Romanian Deadlift", 4, 10],
          ["Seated Leg Curl (Cybex)", 3, 12],
          ["Leg Press Calf Raise", 3, 15],
          ["Dumbbell Lateral Raise", 3, 15],
        ],
      },
    ],
  },
  {
    name: "Upper Body Emphasis — Five Day",
    emphasis: "Upper Body",
    dows: [0, 1, 3, 4, 5],
    days: [
      {
        name: "Chest & Triceps",
        slots: [
          ["Incline Dumbbell Press", 4, 10],
          ["Dumbbell Bench Press", 3, 10],
          ["Cable Fly — Mid", 3, 12],
          ["Tricep Rope Pushdown", 3, 12],
          ["Leg Extension Machine (Cybex)", 3, 15],
        ],
      },
      {
        name: "Back & Biceps",
        slots: [
          ["Lat Pulldown — Wide Grip", 4, 10],
          ["Seated Cable Row", 3, 10],
          ["Single-Arm Dumbbell Row", 3, 12],
          ["Dumbbell Curl", 3, 12],
          ["Lying Leg Curl (Nautilus)", 3, 12],
        ],
      },
      {
        name: "Legs",
        slots: [
          ["Barbell Back Squat", 4, 8],
          ["Barbell Hip Thrust", 3, 10],
          ["Romanian Deadlift", 3, 10],
          ["Standing Calf Raise Machine", 3, 15],
        ],
      },
      {
        name: "Shoulders & Arms",
        slots: [
          ["Seated Dumbbell Press", 4, 10],
          ["Dumbbell Lateral Raise", 3, 15],
          ["Rear Delt Fly — Dumbbell", 3, 15],
          ["Hammer Curl", 3, 12],
          ["Overhead Cable Tricep Extension", 3, 12],
        ],
      },
      {
        name: "Chest & Back",
        slots: [
          ["Pec Deck Machine", 3, 12],
          ["Incline Smith Machine Press", 3, 10],
          ["Chest Supported Row Machine", 3, 10],
          ["Lat Prayer", 3, 12],
          ["Cable Crunch", 3, 15],
        ],
      },
    ],
  },
  {
    name: "Glutes & Shoulders — Five Day",
    emphasis: "Arms & Shoulders",
    dows: [0, 1, 2, 3, 5],
    days: [
      {
        name: "Glutes",
        slots: [
          ["Barbell Hip Thrust", 4, 10],
          ["Cable Pull-Through", 3, 12],
          ["Hammer Strength Glute Kickback Machine", 3, 15],
          ["Standing Calf Raise Machine", 3, 15],
        ],
      },
      {
        name: "Shoulders",
        slots: [
          ["Dumbbell Shoulder Press", 4, 10],
          ["Cable Lateral Raise", 3, 15],
          ["Cybex Lateral Raise Machine", 3, 15],
          ["Cable Face Pull", 3, 15],
        ],
      },
      {
        name: "Quads & Hamstrings",
        slots: [
          ["Hack Squat Machine", 4, 10],
          ["Walking Lunge", 3, 12],
          ["Seated Leg Curl (Cybex)", 3, 12],
          ["Seated Calf Raise Machine (Cybex)", 3, 15],
        ],
      },
      {
        name: "Arms",
        slots: [
          ["EZ-Bar Curl", 3, 12],
          ["Cable Curl", 3, 12],
          ["EZ-Bar Skull Crusher", 3, 12],
          ["Tricep Bar Pushdown — Straight Bar", 3, 12],
        ],
      },
      {
        name: "Glutes & Back",
        slots: [
          ["Smith Machine Hip Thrust", 4, 10],
          ["Glute Bridge", 3, 12],
          ["Hanging Leg Raise", 3, 12],
          ["Seated Row Machine", 3, 10],
          ["Lat Pulldown — Close Grip", 3, 10],
        ],
      },
    ],
  },
  {
    name: "Full Lower & Upper — Five Day",
    emphasis: "Lower Body",
    dows: [0, 1, 2, 4, 5],
    days: [
      {
        name: "Glutes & Hamstrings",
        slots: [
          ["Glute Deadlift", 4, 10],
          ["Barbell Hip Thrust", 3, 10],
          ["Standing Leg Curl", 3, 12],
          ["Standing Calf Raise Machine", 3, 15],
        ],
      },
      {
        name: "Upper Pull",
        slots: [
          ["Lat Pulldown — Wide Grip", 3, 10],
          ["T-Bar Row", 3, 10],
          ["Cable Straight-Arm Pulldown", 3, 12],
          ["Alternating Dumbbell Curl", 3, 12],
        ],
      },
      {
        name: "Quads",
        slots: [
          ["Barbell Back Squat", 4, 8],
          ["Leg Press — Horizontal (Life Fitness)", 3, 12],
          ["Sissy Squat", 3, 12],
          ["Smith Machine Calf Raise", 3, 15],
        ],
      },
      {
        name: "Upper Push",
        slots: [
          ["Dumbbell Bench Press", 3, 10],
          ["Incline Dumbbell Fly", 3, 12],
          ["Arnold Press", 3, 10],
          ["Dumbbell Kickback", 3, 15],
        ],
      },
      {
        name: "Glutes & Abs",
        slots: [
          ["Smith Machine Hip Thrust", 4, 10],
          ["Life Fitness Hip Abduction Machine", 3, 15],
          ["Hip Adduction Machine", 3, 15],
          ["Ab Wheel Rollout", 3, 12],
        ],
      },
    ],
  },
];

/* ----------------------------------------------------------------- four days
 * G111: two session types run twice, on Mon/Tue/Thu/Fri. Not four distinct days.
 */

const FOUR_DAY_DOWS = [0, 1, 3, 4];

const FOUR_DAY: TemplateSpec[] = [
  {
    name: "Glutes & Upper — Four Day",
    emphasis: "Glutes",
    dows: FOUR_DAY_DOWS,
    days: [
      {
        name: "Glutes A",
        slots: [
          ["Barbell Hip Thrust", 4, 10],
          ["Glute Bridge", 3, 12],
          ["Romanian Deadlift", 3, 10],
          ["Standing Calf Raise Machine", 3, 15],
          ["Cable Crunch", 3, 15],
        ],
      },
      {
        name: "Upper A",
        slots: [
          ["Lat Pulldown — Wide Grip", 3, 10],
          ["Seated Cable Row", 3, 10],
          ["Incline Dumbbell Press", 3, 10],
          ["Dumbbell Lateral Raise", 3, 15],
          ["Dumbbell Curl", 3, 12],
        ],
      },
      {
        name: "Glutes B",
        slots: [
          ["Smith Machine Hip Thrust", 4, 10],
          ["Cable Pull-Through", 3, 12],
          ["Seated Leg Curl (Cybex)", 3, 12],
          ["Seated Calf Raise Machine (Cybex)", 3, 15],
          ["Hanging Leg Raise", 3, 12],
        ],
      },
      {
        name: "Upper B",
        slots: [
          ["Chin-Up", 3, 8],
          ["Chest Supported Row Machine", 3, 10],
          ["Dumbbell Bench Press", 3, 10],
          ["Cable Lateral Raise", 3, 15],
          ["Tricep Rope Pushdown", 3, 12],
        ],
      },
    ],
  },
  {
    name: "Quads & Glutes — Four Day",
    emphasis: "Lower Body",
    dows: FOUR_DAY_DOWS,
    days: [
      {
        name: "Quads",
        slots: [
          ["Barbell Back Squat", 4, 8],
          ["Leg Press — 45° (Cybex)", 3, 12],
          ["Leg Extension Machine (Cybex)", 3, 15],
          ["Bulgarian Split Squat", 3, 10],
          ["Standing Calf Raise Machine", 3, 15],
        ],
      },
      {
        name: "Upper A",
        slots: [
          ["Lat Pulldown — Wide Grip", 3, 10],
          ["Seated Cable Row", 3, 10],
          ["Incline Dumbbell Press", 3, 10],
          ["Dumbbell Lateral Raise", 3, 15],
          ["Dumbbell Curl", 3, 12],
        ],
      },
      {
        name: "Glutes & Hamstrings",
        slots: [
          ["Barbell Hip Thrust", 4, 10],
          ["Cable Glute Kickback", 3, 15],
          ["Romanian Deadlift", 3, 10],
          ["Lying Leg Curl (Nautilus)", 3, 12],
          ["Leg Press Calf Raise", 3, 15],
        ],
      },
      {
        name: "Upper B",
        slots: [
          ["Chest Supported Row Machine", 3, 10],
          ["Lat Prayer", 3, 12],
          ["Dumbbell Bench Press", 3, 10],
          ["Cable Lateral Raise", 3, 15],
          ["Tricep Rope Pushdown", 3, 12],
        ],
      },
    ],
  },
  {
    name: "Lower & Upper — Four Day",
    emphasis: "Lower Body",
    dows: FOUR_DAY_DOWS,
    days: [
      {
        name: "Lower A",
        slots: [
          ["Barbell Hip Thrust", 4, 10],
          ["Barbell Back Squat", 3, 10],
          ["Seated Leg Curl (Cybex)", 3, 12],
          ["Standing Calf Raise Machine", 3, 15],
          ["V-Up", 3, 15],
        ],
      },
      {
        name: "Upper A",
        slots: [
          ["Seated Row Machine", 3, 10],
          ["Lat Pulldown — Close Grip", 3, 10],
          ["Pec Deck Machine", 3, 12],
          ["Seated Dumbbell Press", 3, 10],
          ["Hammer Curl", 3, 12],
        ],
      },
      {
        name: "Lower B",
        slots: [
          ["Romanian Deadlift", 4, 10],
          ["Leg Press — 45° (Cybex)", 3, 12],
          ["Glute Bridge", 3, 12],
          ["Seated Calf Raise Machine (Cybex)", 3, 15],
          ["Russian Twist", 3, 20],
        ],
      },
      {
        name: "Upper B",
        slots: [
          ["Hammer Strength Chest-Supported Row", 3, 10],
          ["Cable Straight-Arm Pulldown", 3, 12],
          ["Incline Dumbbell Press", 3, 10],
          ["Cable Lateral Raise", 3, 15],
          ["Overhead Cable Tricep Extension", 3, 12],
        ],
      },
    ],
  },
  {
    name: "Glute Specialisation — Four Day",
    emphasis: "Glutes",
    dows: FOUR_DAY_DOWS,
    days: [
      {
        name: "Glutes Heavy",
        slots: [
          ["Barbell Hip Thrust", 5, 8],
          ["Glute Deadlift", 3, 10],
          ["Cable Pull-Through", 3, 12],
          ["Hammer Strength Glute Kickback Machine", 3, 15],
          ["Standing Calf Raise Machine", 3, 15],
        ],
      },
      {
        name: "Upper & Abs",
        slots: [
          ["Lat Pulldown — Wide Grip", 3, 10],
          ["Seated Cable Row", 3, 10],
          ["Dumbbell Bench Press", 3, 10],
          ["Dumbbell Lateral Raise", 3, 15],
          ["Captain's Chair Knee Raise", 3, 15],
        ],
      },
      {
        name: "Glutes Volume",
        slots: [
          ["Smith Machine Hip Thrust", 4, 12],
          ["Glute Bridge", 3, 15],
          ["Cable Glute Kickback", 3, 15],
          ["Life Fitness Hip Abduction Machine", 3, 15],
          ["Leg Press Calf Raise", 3, 15],
        ],
      },
      {
        name: "Upper & Hamstrings",
        slots: [
          ["Chin-Up", 3, 8],
          ["Single-Arm Dumbbell Row", 3, 12],
          ["Incline Dumbbell Press", 3, 10],
          ["Romanian Deadlift", 3, 10],
          ["Lying Leg Curl (Nautilus)", 3, 12],
        ],
      },
    ],
  },
];

/* ---------------------------------------------------------------- three days
 * G107: full body every day, 7-9 exercises, opening on legs. All three of his carried legs, chest and back
 * in every session.
 */

const THREE_DAY: TemplateSpec[] = [
  {
    name: "Full Body — Three Day A",
    emphasis: "Glutes",
    dows: [0, 2, 4],
    days: [
      {
        name: "Full Body A",
        slots: [
          ["Barbell Hip Thrust", 4, 10],
          ["Barbell Back Squat", 3, 10],
          ["Romanian Deadlift", 3, 10],
          ["Standing Calf Raise Machine", 3, 15],
          ["Lat Pulldown — Wide Grip", 3, 10],
          ["Incline Dumbbell Press", 3, 10],
          ["Dumbbell Lateral Raise", 3, 15],
          ["Cable Crunch", 3, 15],
        ],
      },
      {
        name: "Full Body B",
        slots: [
          ["Glute Bridge", 4, 12],
          ["Leg Press — 45° (Cybex)", 3, 12],
          ["Seated Leg Curl (Cybex)", 3, 12],
          ["Seated Calf Raise Machine (Cybex)", 3, 15],
          ["Seated Cable Row", 3, 10],
          ["Pec Deck Machine", 3, 12],
          ["Dumbbell Curl", 3, 12],
          ["Hanging Leg Raise", 3, 12],
        ],
      },
      {
        name: "Full Body C",
        slots: [
          ["Smith Machine Hip Thrust", 4, 10],
          ["Bulgarian Split Squat", 3, 10],
          ["Lying Leg Curl (Nautilus)", 3, 12],
          ["Leg Press Calf Raise", 3, 15],
          ["Chest Supported Row Machine", 3, 10],
          ["Dumbbell Bench Press", 3, 10],
          ["Tricep Rope Pushdown", 3, 12],
          ["Russian Twist", 3, 20],
        ],
      },
    ],
  },
  {
    name: "Full Body — Three Day B",
    emphasis: "Lower Body",
    dows: [0, 2, 4],
    days: [
      {
        name: "Legs, Push, Pull A",
        slots: [
          ["Barbell Back Squat", 4, 8],
          ["Leg Extension Machine (Cybex)", 3, 15],
          ["Barbell Hip Thrust", 3, 10],
          ["Standing Calf Raise Machine", 3, 15],
          ["Dumbbell Bench Press", 3, 10],
          ["Seated Row Machine", 3, 10],
          ["Cable Lateral Raise", 3, 15],
        ],
      },
      {
        name: "Legs, Push, Pull B",
        slots: [
          ["Romanian Deadlift", 4, 10],
          ["Standing Leg Curl", 3, 12],
          ["Walking Lunge", 3, 12],
          ["Smith Machine Calf Raise", 3, 15],
          ["Incline Dumbbell Press", 3, 10],
          ["Lat Pulldown — Close Grip", 3, 10],
          ["EZ-Bar Curl", 3, 12],
        ],
      },
      {
        name: "Legs, Push, Pull C",
        slots: [
          ["Hack Squat Machine", 4, 10],
          ["Cable Pull-Through", 3, 12],
          ["Glute Ham Raise", 3, 10],
          ["Seated Calf Raise Machine (Cybex)", 3, 15],
          ["Cable Fly — Mid", 3, 12],
          ["T-Bar Row", 3, 10],
          ["Overhead Cable Tricep Extension", 3, 12],
        ],
      },
    ],
  },
  {
    name: "Full Body — Three Day C",
    emphasis: "Glutes",
    dows: [0, 2, 5],
    days: [
      {
        name: "Full Body A",
        slots: [
          ["Glute Deadlift", 4, 10],
          ["Goblet Squat", 3, 12],
          ["Standing Calf Raise Machine", 3, 15],
          ["Seated Cable Row", 3, 10],
          ["Push-Up", 3, 15],
          ["Dumbbell Shoulder Press", 3, 10],
          ["Cable Curl", 3, 12],
          ["V-Up", 3, 15],
        ],
      },
      {
        name: "Full Body B",
        slots: [
          ["Barbell Hip Thrust", 4, 10],
          ["Reverse Lunge", 3, 12],
          ["Leg Press Calf Raise", 3, 15],
          ["Lat Pulldown — Wide Grip", 3, 10],
          ["Incline Dumbbell Press", 3, 10],
          ["Rear Delt Fly — Dumbbell", 3, 15],
          ["Hammer Curl", 3, 12],
          ["Plank Leg Lift", 3, 20],
        ],
      },
      {
        name: "Full Body C",
        slots: [
          ["Glute Bridge", 4, 12],
          ["Single-Leg Romanian Deadlift", 3, 10],
          ["Donkey Calf Raise", 3, 15],
          ["Single-Arm Dumbbell Row", 3, 12],
          ["Pec Deck Machine", 3, 12],
          ["Cybex Lateral Raise Machine", 3, 15],
          ["Dumbbell Kickback", 3, 15],
          ["Heel Tap", 3, 20],
        ],
      },
    ],
  },
];

/* ------------------------------------------------------------------ two days
 * G107, the clearest case in the whole set: all four of his two-day templates lead legs on BOTH days and run
 * full body at eight to nine exercises, in a shape that barely varies -- legs x3-4, then a small muscle, then
 * shoulders, back, chest, arms. That small muscle is the divider (G102), not a finisher.
 */

const TWO_DAY: TemplateSpec[] = [
  {
    name: "Full Body — Two Day A",
    emphasis: "Glutes",
    dows: [0, 3],
    days: [
      {
        name: "Full Body A",
        slots: [
          ["Barbell Hip Thrust", 4, 10],
          ["Barbell Back Squat", 3, 10],
          ["Romanian Deadlift", 3, 10],
          ["Standing Calf Raise Machine", 3, 15],
          ["Dumbbell Shoulder Press", 3, 10],
          ["Seated Cable Row", 3, 10],
          ["Incline Dumbbell Press", 3, 10],
          ["Dumbbell Curl", 3, 12],
        ],
      },
      {
        name: "Full Body B",
        slots: [
          ["Glute Bridge", 4, 12],
          ["Leg Press — 45° (Cybex)", 3, 12],
          ["Seated Leg Curl (Cybex)", 3, 12],
          ["Cable Crunch", 3, 15],
          ["Cable Lateral Raise", 3, 15],
          ["Lat Pulldown — Wide Grip", 3, 10],
          ["Pec Deck Machine", 3, 12],
          ["Tricep Rope Pushdown", 3, 12],
        ],
      },
    ],
  },
  {
    name: "Full Body — Two Day B",
    emphasis: "Lower Body",
    dows: [0, 3],
    days: [
      {
        name: "Full Body A",
        slots: [
          ["Barbell Back Squat", 4, 8],
          ["Barbell Hip Thrust", 3, 10],
          ["Lying Leg Curl (Nautilus)", 3, 12],
          ["Leg Press Calf Raise", 3, 15],
          ["Seated Dumbbell Press", 3, 10],
          ["Chest Supported Row Machine", 3, 10],
          ["Dumbbell Bench Press", 3, 10],
          ["EZ-Bar Curl", 3, 12],
        ],
      },
      {
        name: "Full Body B",
        slots: [
          ["Romanian Deadlift", 4, 10],
          ["Hack Squat Machine", 3, 10],
          ["Cable Pull-Through", 3, 12],
          ["Hanging Leg Raise", 3, 12],
          ["Dumbbell Lateral Raise", 3, 15],
          ["T-Bar Row", 3, 10],
          ["Cable Fly — Mid", 3, 12],
          ["Overhead Cable Tricep Extension", 3, 12],
        ],
      },
    ],
  },
  {
    name: "Full Body — Two Day C",
    emphasis: "Glutes",
    dows: [1, 4],
    days: [
      {
        name: "Full Body A",
        slots: [
          ["Smith Machine Hip Thrust", 4, 10],
          ["Bulgarian Split Squat", 3, 10],
          ["Stiff-Leg Deadlift", 3, 10],
          ["Standing Calf Raise Machine", 3, 15],
          ["Arnold Press", 3, 10],
          ["Lat Pulldown — Close Grip", 3, 10],
          ["Incline Dumbbell Press", 3, 10],
          ["Hammer Curl", 3, 12],
        ],
      },
      {
        name: "Full Body B",
        slots: [
          ["Glute Deadlift", 4, 10],
          ["Walking Lunge", 3, 12],
          ["Standing Leg Curl", 3, 12],
          ["Russian Twist", 3, 20],
          ["Cable Face Pull", 3, 15],
          ["Seated Row Machine", 3, 10],
          ["Dumbbell Bench Press", 3, 10],
          ["Cable Kickback", 3, 15],
        ],
      },
    ],
  },
  {
    name: "Full Body — Two Day D",
    emphasis: "Lower Body",
    dows: [0, 4],
    days: [
      {
        name: "Full Body A",
        slots: [
          ["Barbell Hip Thrust", 4, 10],
          ["Life Fitness Hip Abduction Machine", 3, 15],
          ["Goblet Squat", 3, 12],
          ["Seated Leg Curl (Cybex)", 3, 12],
          ["Seated Calf Raise Machine (Cybex)", 3, 15],
          ["Dumbbell Shoulder Press", 3, 10],
          ["Single-Arm Dumbbell Row", 3, 12],
          ["Push-Up", 3, 15],
        ],
      },
      {
        name: "Full Body B",
        slots: [
          ["Romanian Deadlift", 4, 10],
          ["Leg Press — Horizontal (Life Fitness)", 3, 12],
          ["Glute Bridge", 3, 12],
          ["Hip Adduction Machine", 3, 15],
          ["Smith Machine Calf Raise", 3, 15],
          ["Cable Lateral Raise", 3, 15],
          ["Lat Pulldown — Wide Grip", 3, 10],
          ["Incline Dumbbell Fly", 3, 12],
        ],
      },
    ],
  },
];

/** All twenty-two, in the order Jack's own batches arrived: six days first, then five, four, three, two. */
export const WOMENS_TEMPLATE_SPECS: readonly TemplateSpec[] = [
  ...SIX_DAY,
  ...FIVE_DAY,
  ...FOUR_DAY,
  ...THREE_DAY,
  ...TWO_DAY,
];

export function womensTemplates(): CoachProgram[] {
  return WOMENS_TEMPLATE_SPECS.map(buildTemplate);
}
