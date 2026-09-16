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

/** Jack's six template kinds, and the two populations. The library is the product of these with the five
 * training frequencies: 6 categories x 5 frequencies x 2 = 60 cells, which is the target he set.
 *
 * These are AUTHORING metadata, not program data, so they live on the spec and on BuiltInTemplate rather
 * than on CoachProgram -- the app's program type has no business knowing which cell of a content grid a
 * template came from, and adding fields to it would push this through every reader of a program. */
export type TemplateCategory =
  | "full-body"
  | "lower-emphasis"
  | "upper-emphasis"
  | "lower-specialty"
  | "upper-specialty"
  | "dumbbell-home";

export type TemplateSex = "women" | "men";

export const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  "full-body": "Full body",
  "lower-emphasis": "Lower body emphasis",
  "upper-emphasis": "Upper body emphasis",
  "lower-specialty": "Lower body specialty",
  "upper-specialty": "Upper body specialty",
  "dumbbell-home": "Dumbbells only, at home",
};

/** One exercise in a template: the library's own name, then sets and reps. Muscle is looked up rather than
 * written, so a template can never disagree with the library about what it is training. */
type Slot = readonly [name: string, sets: number, reps: number];

interface TemplateDay {
  readonly name: string;
  readonly slots: readonly Slot[];
  /** Muscles `deepen` must not add exercises to on this day — slots placed deliberately as a fixed count.
   *
   * G138's substitution needs it. Swapping a repeated delt head for a different one creates a NEW single-slot
   * block, and `deepen` gives depth to the first block with room, so without this the substitute was inflated
   * to three exercises: one side delt and three front delts, on a day Jack had asked to carry two delt
   * movements in total. Invisible to everything else — `buildTemplate` reads only `name` and `slots`. */
  readonly noDepth?: readonly string[];
  /** Exercise names this template counts as used although no slot names them — G138 again.
   *
   * Swapping an exercise out frees its name, and `deepen` treats every unused name as a candidate for any
   * day. Measured, that rewrote days nobody asked about: Glutes & Shoulders day 1 picked up the displaced
   * lateral raise machine as a second side delt, and three days' glute insertions shifted. Reserving the
   * displaced name keeps a swap local to the day it was made on. */
  readonly reserved?: readonly string[];
}

export interface TemplateSpec {
  readonly name: string;
  /** Which of the six kinds this is. */
  readonly category: TemplateCategory;
  /** Who it is written for. Drives the leg-lead expectations -- G107's counts are the female ones. */
  readonly sex: TemplateSex;
  /** The emphasis, in Jack's own vocabulary (G108, G112). Becomes `intendedFor`. */
  readonly emphasis: string;
  /** Weekdays as offsets from Monday, 0=Mon .. 6=Sun (G111 for the four-day shape). */
  readonly dows: readonly number[];
  readonly days: readonly TemplateDay[];
}

const MUSCLE_BY_NAME = new Map(libraryExercises.map((e) => [e.name, e.muscle]));

/** Movements prescribed in seconds rather than reps.
 *
 * BuilderSet.reps holds seconds when BuilderExercise.timed is set, the same way loadValue means whatever the
 * load mode says it means. Without the flag a 45-second plank renders as "45 reps", which is exactly the
 * confusion Jack's rule guards against -- never show seconds as reps, or reps as seconds, unless the
 * exercise really is done for time. These are. */
const TIMED_EXERCISES = new Set(["Plank", "Side Plank", "Mountain Climber", "Bird Dog"]);

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
      const timed = TIMED_EXERCISES.has(name);
      return { id: `${id}-d${di + 1}-x${xi + 1}`, name, muscle, kind: "strength", sets, ...(timed ? { timed } : {}) };
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
    category: "lower-specialty",
    sex: "women",
    emphasis: "Glutes",
    dows: [0, 1, 2, 3, 4, 5],
    days: [
      {
        name: "Glutes & Hamstrings",
        slots: [
          ["Barbell Hip Thrust", 3, 10],
          ["Glute Bridge", 3, 12],
          ["Romanian Deadlift", 3, 10],
          ["Seated Leg Curl", 3, 12],
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
          ["Barbell Back Squat", 3, 8],
          ["Leg Press — 45°", 3, 12],
          ["Bulgarian Split Squat", 3, 10],
          ["Cable Glute Kickback", 3, 15],
          ["Seated Calf Raise Machine", 3, 15],
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
          ["Smith Machine Hip Thrust", 3, 10],
          ["Cable Pull-Through", 3, 12],
          ["Hip Abduction Machine", 3, 15],
          ["Hip Adduction Machine", 3, 15],
          ["Leg Press Calf Raise", 3, 15],
        ],
      },
      {
        name: "Upper Body",
        slots: [
          ["Chest-Supported Row", 3, 10],
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
    category: "lower-emphasis",
    sex: "women",
    emphasis: "Lower Body",
    dows: [0, 1, 2, 3, 4, 5],
    days: [
      {
        name: "Glutes",
        slots: [
          ["Barbell Hip Thrust", 3, 10],
          ["Cable Pull-Through", 3, 12],
          ["Glute Kickback Machine", 3, 15],
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
          ["Hack Squat Machine", 3, 10],
          ["Leg Extension Machine", 3, 15],
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
          ["Lateral Raise Machine", 3, 15],
          ["V-Up", 3, 15],
        ],
      },
      {
        name: "Hamstrings & Glutes",
        slots: [
          ["Romanian Deadlift", 3, 10],
          ["Lying Leg Curl", 3, 12],
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
          ["Weighted Sit-Up", 3, 12],
        ],
      },
    ],
  },
  {
    name: "Legs & Pull / Legs & Push — Six Day",
    category: "full-body",
    sex: "women",
    emphasis: "Lower Body",
    dows: [0, 1, 2, 3, 4, 5],
    days: [
      {
        name: "Legs & Pull A",
        slots: [
          ["Barbell Hip Thrust", 3, 10],
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
          ["Barbell Back Squat", 3, 8],
          ["Leg Extension Machine", 3, 15],
          ["Cable Crunch", 3, 15],
          ["Incline Dumbbell Press", 3, 10],
          ["Dumbbell Lateral Raise", 3, 15],
          ["Tricep Rope Pushdown", 3, 12],
        ],
      },
      {
        name: "Legs & Pull B",
        slots: [
          ["Glute Deadlift", 3, 10],
          ["Seated Leg Curl", 3, 12],
          ["Seated Calf Raise Machine", 3, 15],
          ["Chest Supported Row Machine", 3, 10],
          ["Cable Straight-Arm Pulldown", 3, 12],
          ["Cable Curl", 3, 12],
        ],
      },
      {
        name: "Legs & Push B",
        slots: [
          ["Bulgarian Split Squat", 3, 10],
          ["Leg Press — 45°", 3, 12],
          ["Hanging Leg Raise", 3, 12],
          ["Dumbbell Bench Press", 3, 10],
          ["Cable Lateral Raise", 3, 15],
          ["Dumbbell Overhead Extension", 3, 12],
        ],
      },
      {
        name: "Legs & Pull C",
        slots: [
          ["Smith Machine Hip Thrust", 3, 10],
          ["Single-Leg Romanian Deadlift", 3, 10],
          ["Leg Press Calf Raise", 3, 15],
          ["Plate-Loaded Lat Pulldown", 3, 10],
          ["Meadows Row", 3, 12],
          ["EZ-Bar Curl", 3, 12],
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
    category: "lower-specialty",
    sex: "women",
    emphasis: "Lower Body",
    dows: [0, 1, 2, 3, 4, 5],
    days: [
      {
        name: "Quads & Chest",
        slots: [
          ["Barbell Front Squat", 3, 8],
          ["Leg Press — Horizontal", 3, 12],
          // Calves LAST, after the chest work, not at the leg/upper seam. Jack: "have the standing calf raise go
          // after the cable flies... even though it violates having all the muscles in the same area. Calves I
          // would put in their own group. They don't have to be trained directly after quads and hamstrings
          // and glutes." Recorded as G140; whether it applies beyond this template is his call.
          ["Incline Smith Machine Press", 3, 10],
          ["Cable Fly — Low to High", 3, 12],
          ["Standing Calf Raise Machine", 3, 15],
        ],
      },
      {
        name: "Back & Abs",
        slots: [
          ["Barbell Bent-Over Row", 3, 10],
          ["Lat Pulldown — Wide Grip", 3, 10],
          ["Pullover Machine", 3, 12],
          ["Decline Sit-Up", 3, 15],
          ["Cable Woodchopper", 3, 15],
        ],
      },
      {
        name: "Glutes & Hamstrings",
        slots: [
          ["Barbell Hip Thrust", 3, 10],
          ["Glute Bridge", 3, 12],
          ["Romanian Deadlift", 3, 10],
          ["Standing Leg Curl", 3, 12],
          ["Seated Calf Raise Machine", 3, 15],
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
          ["Smith Machine Squat", 3, 10],
          ["Reverse Lunge", 3, 12],
          ["Hip Abduction Machine", 3, 15],
          ["Smith Machine Calf Raise", 3, 15],
        ],
      },
      {
        name: "Upper & Abs",
        slots: [
          ["Seated Cable Row", 3, 10],
          ["Dumbbell Bench Press", 3, 10],
          ["Lateral Raise Machine", 3, 15],
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
    category: "lower-specialty",
    sex: "women",
    emphasis: "Glutes",
    dows: [0, 1, 2, 3, 4],
    days: [
      {
        name: "Glutes",
        slots: [
          ["Barbell Hip Thrust", 3, 10],
          ["Cable Pull-Through", 3, 12],
          ["Glute Kickback Machine", 3, 15],
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
          // G141. Written out to the day's full count so `deepen` adds nothing here. It used to fill the two
          // missing slots with a barbell curl and an EZ-bar curl, because biceps was the only block with room
          // — three curls on a week with no triceps work anywhere. Jack: "I'm not sure why there are three
          // bicep exercises when there's no other triceps work during the week. So maybe remove the EZ-bar
          // curls and put down a tricep pushdown… and instead of barbell curls, I would put some lateral
          // raises for shoulders." Each takes the two sets of the curl it replaces, so the day stays at 16.
          ["Dumbbell Lateral Raise", 2, 15],
          ["Tricep Rope Pushdown", 2, 12],
        ],
      },
      {
        name: "Quads & Calves",
        slots: [
          ["Barbell Back Squat", 3, 8],
          ["Leg Press — 45°", 3, 12],
          ["Leg Extension Machine", 3, 15],
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
          ["Romanian Deadlift", 3, 10],
          ["Lying Leg Curl", 3, 12],
          ["Glute Bridge", 3, 12],
          ["Seated Calf Raise Machine", 3, 15],
        ],
      },
    ],
  },
  {
    name: "Glutes & Hamstrings — Five Day",
    category: "lower-specialty",
    sex: "women",
    emphasis: "Glutes",
    dows: [0, 1, 3, 4, 5],
    days: [
      {
        name: "Glutes A",
        slots: [
          ["Smith Machine Hip Thrust", 3, 10],
          ["Glute Bridge", 3, 12],
          ["Cable Glute Kickback", 3, 15],
          ["Hanging Leg Raise", 3, 12],
        ],
      },
      {
        name: "Hamstrings",
        slots: [
          ["Romanian Deadlift", 3, 10],
          ["Seated Leg Curl", 3, 12],
          ["Glute Ham Raise", 3, 10],
          ["Standing Calf Raise Machine", 3, 15],
        ],
      },
      {
        name: "Upper Pull",
        slots: [
          ["Chin-Up", 3, 8],
          ["Chest-Supported Row", 3, 10],
          ["Cable Straight-Arm Pulldown", 3, 12],
          ["Cable Curl", 3, 12],
        ],
      },
      {
        name: "Glutes B",
        slots: [
          ["Barbell Hip Thrust", 3, 10],
          ["Cable Pull-Through", 3, 12],
          ["Hip Abduction Machine", 3, 15],
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
    category: "lower-emphasis",
    sex: "women",
    emphasis: "Lower Body",
    dows: [0, 2, 4, 1, 3],
    days: [
      {
        name: "Legs A",
        slots: [
          ["Barbell Back Squat", 3, 8],
          ["Leg Press — 45°", 3, 12],
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
          ["Barbell Hip Thrust", 3, 10],
          ["Romanian Deadlift", 3, 10],
          ["Lying Leg Curl", 3, 12],
          ["Seated Calf Raise Machine", 3, 15],
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
          ["Hack Squat Machine", 3, 10],
          ["Walking Lunge", 3, 12],
          ["Cable Glute Kickback", 3, 15],
          ["Smith Machine Calf Raise", 3, 15],
        ],
      },
    ],
  },
  {
    name: "Glutes & Back — Five Day",
    category: "upper-specialty",
    sex: "women",
    emphasis: "Back & Biceps",
    dows: [0, 1, 2, 4, 5],
    days: [
      {
        name: "Glutes & Abs",
        slots: [
          ["Barbell Hip Thrust", 3, 10],
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
          ["Barbell Front Squat", 3, 8],
          ["Leg Extension Machine", 3, 15],
          ["Reverse Lunge", 3, 12],
          ["Standing Calf Raise Machine", 3, 15],
        ],
      },
      {
        name: "Back B",
        slots: [
          ["Chin-Up", 3, 8],
          ["Seated Cable Row", 3, 10],
          ["Pullover Machine", 3, 12],
          ["Incline Dumbbell Curl", 3, 12],
        ],
      },
      {
        name: "Hamstrings & Shoulders",
        slots: [
          ["Romanian Deadlift", 3, 10],
          ["Seated Leg Curl", 3, 12],
          ["Leg Press Calf Raise", 3, 15],
          ["Dumbbell Lateral Raise", 3, 15],
        ],
      },
    ],
  },
  {
    name: "Upper Body Emphasis — Five Day",
    category: "upper-emphasis",
    sex: "women",
    emphasis: "Upper Body",
    dows: [0, 1, 3, 4, 5],
    days: [
      {
        name: "Chest & Triceps",
        slots: [
          ["Incline Dumbbell Press", 3, 10],
          ["Dumbbell Bench Press", 3, 10],
          ["Cable Fly — Mid", 3, 12],
          ["Tricep Rope Pushdown", 3, 12],
          ["Leg Extension Machine", 3, 15],
        ],
      },
      {
        name: "Back & Biceps",
        slots: [
          ["Lat Pulldown — Wide Grip", 3, 10],
          ["Seated Cable Row", 3, 10],
          ["Single-Arm Dumbbell Row", 3, 12],
          ["Dumbbell Curl", 3, 12],
          ["Lying Leg Curl", 3, 12],
        ],
      },
      {
        name: "Legs",
        slots: [
          ["Barbell Back Squat", 3, 8],
          ["Barbell Hip Thrust", 3, 10],
          ["Romanian Deadlift", 3, 10],
          ["Standing Calf Raise Machine", 3, 15],
        ],
      },
      {
        name: "Shoulders & Arms",
        slots: [
          ["Seated Dumbbell Press", 3, 10],
          ["Dumbbell Lateral Raise", 3, 15],
          ["Rear Delt Fly — Dumbbell", 3, 15],
          ["Hammer Curl", 3, 12],
          ["Overhead Cable Tricep Extension", 3, 12],
        ],
      },
      {
        name: "Chest & Back",
        slots: [
          ["Chest Press Machine", 3, 12],
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
    category: "upper-specialty",
    sex: "women",
    emphasis: "Arms & Shoulders",
    dows: [0, 1, 2, 3, 5],
    days: [
      {
        name: "Glutes",
        slots: [
          ["Barbell Hip Thrust", 3, 10],
          ["Cable Pull-Through", 3, 12],
          ["Glute Kickback Machine", 3, 15],
          ["Standing Calf Raise Machine", 3, 15],
        ],
      },
      {
        name: "Shoulders",
        slots: [
          ["Dumbbell Shoulder Press", 3, 10],
          ["Cable Lateral Raise", 3, 15],
          ["Lateral Raise Machine", 3, 15],
          ["Cable Face Pull", 3, 15],
        ],
      },
      {
        name: "Quads & Hamstrings",
        slots: [
          ["Hack Squat Machine", 3, 10],
          ["Walking Lunge", 3, 12],
          ["Seated Leg Curl", 3, 12],
          ["Seated Calf Raise Machine", 3, 15],
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
          ["Smith Machine Hip Thrust", 3, 10],
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
    category: "full-body",
    sex: "women",
    emphasis: "Lower Body",
    dows: [0, 1, 2, 4, 5],
    days: [
      {
        name: "Glutes & Hamstrings",
        slots: [
          ["Glute Deadlift", 3, 10],
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
          ["Barbell Back Squat", 3, 8],
          ["Leg Press — Horizontal", 3, 12],
          ["Leg Extension Machine", 3, 12],
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
          ["Smith Machine Hip Thrust", 3, 10],
          ["Hip Abduction Machine", 3, 15],
          ["Hip Adduction Machine", 3, 15],
          ["Weighted Sit-Up", 3, 12],
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
    category: "lower-emphasis",
    sex: "women",
    emphasis: "Glutes",
    dows: FOUR_DAY_DOWS,
    days: [
      {
        name: "Glutes A",
        slots: [
          ["Barbell Hip Thrust", 3, 10],
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
          ["Smith Machine Hip Thrust", 3, 10],
          ["Cable Pull-Through", 3, 12],
          ["Seated Leg Curl", 3, 12],
          ["Seated Calf Raise Machine", 3, 15],
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
    category: "lower-specialty",
    sex: "women",
    emphasis: "Lower Body",
    dows: FOUR_DAY_DOWS,
    days: [
      {
        name: "Quads",
        slots: [
          ["Barbell Back Squat", 3, 8],
          ["Leg Press — 45°", 3, 12],
          ["Leg Extension Machine", 3, 15],
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
          ["Barbell Hip Thrust", 3, 10],
          ["Cable Glute Kickback", 3, 15],
          ["Romanian Deadlift", 3, 10],
          ["Lying Leg Curl", 3, 12],
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
    category: "full-body",
    sex: "women",
    emphasis: "Lower Body",
    dows: FOUR_DAY_DOWS,
    days: [
      {
        name: "Lower A",
        slots: [
          ["Barbell Hip Thrust", 3, 10],
          ["Barbell Back Squat", 3, 10],
          ["Seated Leg Curl", 3, 12],
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
          ["Romanian Deadlift", 3, 10],
          ["Leg Press — 45°", 3, 12],
          ["Glute Bridge", 3, 12],
          ["Seated Calf Raise Machine", 3, 15],
          ["Russian Twist", 3, 20],
        ],
      },
      {
        name: "Upper B",
        slots: [
          ["Chest-Supported Row", 3, 10],
          ["Cable Straight-Arm Pulldown", 3, 12],
          ["Incline Dumbbell Press", 3, 10],
          ["Cable Lateral Raise", 3, 15],
          ["Overhead Cable Tricep Extension", 3, 12],
        ],
      },
    ],
  },
  {
    name: "Glute Specialization — Four Day",
    category: "lower-specialty",
    sex: "women",
    emphasis: "Glutes",
    dows: FOUR_DAY_DOWS,
    days: [
      {
        name: "Glutes Heavy",
        slots: [
          ["Barbell Hip Thrust", 3, 8],
          ["Glute Deadlift", 3, 10],
          ["Cable Pull-Through", 3, 12],
          ["Glute Kickback Machine", 3, 15],
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
          ["Smith Machine Hip Thrust", 3, 12],
          ["Glute Bridge", 3, 15],
          ["Cable Glute Kickback", 3, 15],
          ["Hip Abduction Machine", 3, 15],
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
          ["Lying Leg Curl", 3, 12],
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
    category: "full-body",
    sex: "women",
    emphasis: "Glutes",
    dows: [0, 2, 4],
    days: [
      {
        name: "Full Body A",
        slots: [
          ["Barbell Hip Thrust", 3, 10],
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
          ["Glute Bridge", 3, 12],
          ["Leg Press — 45°", 3, 12],
          ["Seated Leg Curl", 3, 12],
          ["Seated Calf Raise Machine", 3, 15],
          ["Seated Cable Row", 3, 10],
          ["Pec Deck Machine", 3, 12],
          ["Dumbbell Curl", 3, 12],
          ["Hanging Leg Raise", 3, 12],
        ],
      },
      {
        name: "Full Body C",
        slots: [
          ["Smith Machine Hip Thrust", 3, 10],
          ["Bulgarian Split Squat", 3, 10],
          ["Lying Leg Curl", 3, 12],
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
    category: "full-body",
    sex: "women",
    emphasis: "Lower Body",
    dows: [0, 2, 4],
    days: [
      {
        name: "Legs, Push, Pull A",
        slots: [
          ["Barbell Back Squat", 3, 8],
          ["Leg Extension Machine", 3, 15],
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
          ["Romanian Deadlift", 3, 10],
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
          ["Hack Squat Machine", 3, 10],
          ["Cable Pull-Through", 3, 12],
          ["Glute Ham Raise", 3, 10],
          ["Seated Calf Raise Machine", 3, 15],
          ["Cable Fly — Mid", 3, 12],
          ["T-Bar Row", 3, 10],
          ["Overhead Cable Tricep Extension", 3, 12],
        ],
      },
    ],
  },
  {
    name: "Full Body — Three Day C",
    category: "full-body",
    sex: "women",
    emphasis: "Glutes",
    dows: [0, 2, 5],
    days: [
      {
        name: "Full Body A",
        slots: [
          ["Glute Deadlift", 3, 10],
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
          ["Barbell Hip Thrust", 3, 10],
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
          ["Glute Bridge", 3, 12],
          ["Single-Leg Romanian Deadlift", 3, 10],
          ["Donkey Calf Raise", 3, 15],
          ["Single-Arm Dumbbell Row", 3, 12],
          ["Pec Deck Machine", 3, 12],
          ["Lateral Raise Machine", 3, 15],
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
    category: "full-body",
    sex: "women",
    emphasis: "Glutes",
    dows: [0, 3],
    days: [
      {
        name: "Full Body A",
        slots: [
          ["Barbell Hip Thrust", 3, 10],
          ["Barbell Back Squat", 3, 10],
          ["Romanian Deadlift", 3, 10],
          ["Standing Calf Raise Machine", 3, 15],
          ["Dumbbell Shoulder Press", 3, 10],
          // Chest-supported, not a seated cable row. Jack: "the amount of spine erector work already done
          // in the session is very, very high. So this won't be very high quality." This day runs a hip
          // thrust, a cable pull-through, a back squat and an RDL before the row -- four erector movements,
          // the heaviest such day in the library.
          ["Chest-Supported Row", 3, 10],
          ["Incline Dumbbell Press", 3, 10],
          ["Dumbbell Curl", 3, 12],
        ],
      },
      {
        name: "Full Body B",
        slots: [
          ["Glute Bridge", 3, 12],
          ["Leg Press — 45°", 3, 12],
          ["Seated Leg Curl", 3, 12],
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
    category: "full-body",
    sex: "women",
    emphasis: "Lower Body",
    dows: [0, 3],
    days: [
      {
        name: "Full Body A",
        slots: [
          ["Barbell Back Squat", 3, 8],
          ["Barbell Hip Thrust", 3, 10],
          ["Lying Leg Curl", 3, 12],
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
          ["Romanian Deadlift", 3, 10],
          ["Hack Squat Machine", 3, 10],
          ["Cable Pull-Through", 3, 12],
          ["Hanging Leg Raise", 3, 12],
          ["Dumbbell Lateral Raise", 3, 15],
          // Chest-supported, not a T-bar. This day already runs an RDL and a cable pull-through, and Jack
          // ranks the T-bar's erector cost ABOVE the seated cable row's: "even more so than the seated cable
          // row... I would still do something chest supported." Authored, not inserted -- which is why the
          // density pass's erector budget never touched it.
          ["Chest-Supported Row", 3, 10],
          ["Cable Fly — Mid", 3, 12],
          ["Overhead Cable Tricep Extension", 3, 12],
        ],
      },
    ],
  },
  {
    name: "Full Body — Two Day C",
    category: "full-body",
    sex: "women",
    emphasis: "Glutes",
    dows: [1, 4],
    days: [
      {
        name: "Full Body A",
        slots: [
          ["Smith Machine Hip Thrust", 3, 10],
          ["Bulgarian Split Squat", 3, 10],
          ["Romanian Deadlift", 3, 10],
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
          ["Glute Deadlift", 3, 10],
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
    category: "full-body",
    sex: "women",
    emphasis: "Lower Body",
    dows: [0, 4],
    days: [
      {
        name: "Full Body A",
        slots: [
          ["Barbell Hip Thrust", 3, 10],
          ["Hip Abduction Machine", 3, 15],
          ["Goblet Squat", 3, 12],
          ["Seated Leg Curl", 3, 12],
          ["Seated Calf Raise Machine", 3, 15],
          ["Dumbbell Shoulder Press", 3, 10],
          ["Single-Arm Dumbbell Row", 3, 12],
          ["Push-Up", 3, 15],
        ],
      },
      {
        name: "Full Body B",
        slots: [
          ["Romanian Deadlift", 3, 10],
          ["Leg Press — Horizontal", 3, 12],
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

/* ------------------------------------------------------------ the gap fill
 * The first twenty-two were written before the 6 x 5 x 2 grid existed and cluster in the lower-body
 * categories. These seventeen fill the women's cells that were empty: upper emphasis and upper specialty at
 * every frequency but five, lower emphasis and lower specialty at two and three days, and the whole
 * dumbbells-at-home column.
 */

const GAP_FILL: TemplateSpec[] = [
  {
    name: "Lower Body Emphasis — Two Day (Women)",
    category: "lower-emphasis", sex: "women", emphasis: "Lower Body", dows: [0, 3],
    days: [
      { name: "Glutes & Quads", slots: [["Barbell Hip Thrust", 3, 10], ["Glute Bridge", 3, 12], ["Barbell Back Squat", 3, 10], ["Leg Extension Machine", 3, 15], ["Standing Calf Raise Machine", 3, 15], ["Lat Pulldown — Wide Grip", 3, 10], ["Incline Dumbbell Press", 3, 10], ["Dumbbell Lateral Raise", 3, 15]] },
      { name: "Hamstrings & Glutes", slots: [["Romanian Deadlift", 3, 10], ["Lying Leg Curl", 3, 12], ["Cable Pull-Through", 3, 12], ["Cable Glute Kickback", 3, 15], ["Seated Calf Raise Machine", 3, 15], ["Seated Cable Row", 3, 10], ["Dumbbell Shoulder Press", 3, 10], ["Dumbbell Curl", 3, 12]] },
    ],
  },
  {
    name: "Lower Body Emphasis — Three Day (Women)",
    category: "lower-emphasis", sex: "women", emphasis: "Lower Body", dows: [0, 2, 4],
    days: [
      { name: "Glutes", slots: [["Barbell Hip Thrust", 3, 10], ["Cable Pull-Through", 3, 12], ["Standing Calf Raise Machine", 3, 15], ["Seated Cable Row", 3, 10], ["Incline Dumbbell Press", 3, 10], ["Dumbbell Curl", 3, 12], ["Cable Crunch", 3, 15]] },
      { name: "Quads", slots: [["Barbell Back Squat", 3, 8], ["Leg Press — 45°", 3, 12], ["Leg Extension Machine", 3, 15], ["Leg Press Calf Raise", 3, 15], ["Lat Pulldown — Wide Grip", 3, 10], ["Dumbbell Lateral Raise", 3, 15], ["Tricep Rope Pushdown", 3, 12]] },
      { name: "Hamstrings & Glutes", slots: [["Romanian Deadlift", 3, 10], ["Seated Leg Curl", 3, 12], ["Glute Bridge", 3, 12], ["Smith Machine Calf Raise", 3, 15], ["Chest Supported Row Machine", 3, 10], ["Pec Deck Machine", 3, 12], ["Hanging Leg Raise", 3, 12]] },
    ],
  },
  {
    name: "Glute Specialty — Two Day (Women)",
    category: "lower-specialty", sex: "women", emphasis: "Glutes", dows: [0, 3],
    days: [
      { name: "Glutes Heavy", slots: [["Barbell Hip Thrust", 3, 8], ["Glute Deadlift", 3, 10], ["Cable Pull-Through", 3, 12], ["Hip Abduction Machine", 3, 15], ["Standing Calf Raise Machine", 3, 15], ["Lat Pulldown — Wide Grip", 3, 10], ["Incline Dumbbell Press", 3, 10], ["Dumbbell Curl", 3, 12]] },
      { name: "Glutes Volume", slots: [["Smith Machine Hip Thrust", 3, 12], ["Glute Bridge", 3, 15], ["Cable Glute Kickback", 3, 15], ["Romanian Deadlift", 3, 10], ["Seated Calf Raise Machine", 3, 15], ["Seated Cable Row", 3, 10], ["Dumbbell Shoulder Press", 3, 10], ["Cable Crunch", 3, 15]] },
    ],
  },
  {
    name: "Glute Specialty — Three Day (Women)",
    category: "lower-specialty", sex: "women", emphasis: "Glutes", dows: [0, 2, 4],
    days: [
      { name: "Glutes Heavy", slots: [["Barbell Hip Thrust", 3, 8], ["Glute Deadlift", 3, 10], ["Glute Kickback Machine", 3, 15], ["Standing Calf Raise Machine", 3, 15], ["Lat Pulldown — Wide Grip", 3, 10], ["Dumbbell Curl", 3, 12]] },
      { name: "Glutes & Hamstrings", slots: [["Romanian Deadlift", 3, 10], ["Lying Leg Curl", 3, 12], ["Cable Pull-Through", 3, 12], ["Leg Press Calf Raise", 3, 15], ["Incline Dumbbell Press", 3, 10], ["Dumbbell Lateral Raise", 3, 15]] },
      { name: "Glutes & Abduction", slots: [["Smith Machine Hip Thrust", 3, 12], ["Glute Bridge", 3, 15], ["Hip Abduction Machine", 3, 15], ["Hip Adduction Machine", 3, 15], ["Seated Cable Row", 3, 10], ["Hanging Leg Raise", 3, 12]] },
    ],
  },
  {
    name: "Upper Body Emphasis — Two Day (Women)",
    category: "upper-emphasis", sex: "women", emphasis: "Upper Body", dows: [0, 3],
    days: [
      { name: "Push & Legs", slots: [["Incline Dumbbell Press", 3, 10], ["Pec Deck Machine", 3, 12], ["Dumbbell Shoulder Press", 3, 10], ["Dumbbell Lateral Raise", 3, 15], ["Tricep Rope Pushdown", 3, 12], ["Barbell Hip Thrust", 3, 10], ["Cable Crunch", 3, 15]] },
      { name: "Pull & Legs", slots: [["Lat Pulldown — Wide Grip", 3, 10], ["Seated Cable Row", 3, 10], ["Cable Straight-Arm Pulldown", 3, 12], ["Cable Face Pull", 3, 15], ["Dumbbell Curl", 3, 12], ["Romanian Deadlift", 3, 10], ["Russian Twist", 3, 20]] },
    ],
  },
  {
    name: "Upper Body Emphasis — Three Day (Women)",
    category: "upper-emphasis", sex: "women", emphasis: "Upper Body", dows: [0, 2, 4],
    days: [
      { name: "Chest & Arms", slots: [["Incline Dumbbell Press", 3, 10], ["Dumbbell Bench Press", 3, 10], ["Pec Deck Machine", 3, 12], ["Dumbbell Curl", 3, 12], ["Tricep Rope Pushdown", 3, 12], ["Leg Extension Machine", 3, 15]] },
      { name: "Back & Shoulders", slots: [["Lat Pulldown — Wide Grip", 3, 10], ["Seated Cable Row", 3, 10], ["Dumbbell Shoulder Press", 3, 10], ["Dumbbell Lateral Raise", 3, 15], ["Cable Face Pull", 3, 15], ["Lying Leg Curl", 3, 12]] },
      { name: "Upper & Legs", slots: [["Chest Supported Row Machine", 3, 10], ["Lat Prayer", 3, 12], ["Cable Fly — Mid", 3, 12], ["Hammer Curl", 3, 12], ["Barbell Hip Thrust", 3, 10], ["Standing Calf Raise Machine", 3, 15]] },
    ],
  },
  {
    name: "Upper Body Emphasis — Four Day (Women)",
    category: "upper-emphasis", sex: "women", emphasis: "Upper Body", dows: [0, 1, 3, 4],
    days: [
      { name: "Push A", slots: [["Incline Dumbbell Press", 3, 10], ["Pec Deck Machine", 3, 12], ["Dumbbell Lateral Raise", 3, 15], ["Tricep Rope Pushdown", 3, 12], ["Cable Crunch", 3, 15]] },
      { name: "Pull A", slots: [["Lat Pulldown — Wide Grip", 3, 10], ["Seated Cable Row", 3, 10], ["Cable Face Pull", 3, 15], ["Dumbbell Curl", 3, 12], ["Leg Extension Machine", 3, 15]] },
      { name: "Push B", slots: [["Dumbbell Bench Press", 3, 10], ["Cable Fly — Low to High", 3, 12], ["Dumbbell Shoulder Press", 3, 10], ["Overhead Cable Tricep Extension", 3, 12], ["Barbell Hip Thrust", 3, 10]] },
      { name: "Pull B", slots: [["Chest Supported Row Machine", 3, 10], ["Lat Prayer", 3, 12], ["Reverse Pec Deck", 3, 15], ["Hammer Curl", 3, 12], ["Romanian Deadlift", 3, 10]] },
    ],
  },
  {
    name: "Upper Body Emphasis — Six Day (Women)",
    category: "upper-emphasis", sex: "women", emphasis: "Upper Body", dows: [0, 1, 2, 3, 4, 5],
    days: [
      { name: "Chest", slots: [["Incline Dumbbell Press", 3, 10], ["Pec Deck Machine", 3, 12], ["Cable Fly — Mid", 3, 12], ["Cable Crunch", 3, 15]] },
      { name: "Back", slots: [["Lat Pulldown — Wide Grip", 3, 10], ["Seated Cable Row", 3, 10], ["Cable Straight-Arm Pulldown", 3, 12], ["Leg Extension Machine", 3, 15]] },
      { name: "Shoulders", slots: [["Dumbbell Shoulder Press", 3, 10], ["Dumbbell Lateral Raise", 3, 15], ["Cable Face Pull", 3, 15], ["Hanging Leg Raise", 3, 12]] },
      { name: "Arms", slots: [["Dumbbell Curl", 3, 12], ["Hammer Curl", 3, 12], ["Tricep Rope Pushdown", 3, 12], ["Overhead Cable Tricep Extension", 3, 12]] },
      { name: "Legs", slots: [["Barbell Hip Thrust", 3, 10], ["Romanian Deadlift", 3, 10], ["Standing Calf Raise Machine", 3, 15]] },
      { name: "Upper Volume", slots: [["Chest Supported Row Machine", 3, 10], ["Lat Prayer", 3, 12], ["Lateral Raise Machine", 3, 15], ["Russian Twist", 3, 20]] },
    ],
  },
  {
    name: "Arms & Shoulders Specialty — Two Day (Women)",
    category: "upper-specialty", sex: "women", emphasis: "Arms & Shoulders", dows: [0, 3],
    days: [
      { name: "Shoulders Led", slots: [["Dumbbell Shoulder Press", 3, 10], ["Dumbbell Lateral Raise", 3, 15], ["Cable Face Pull", 3, 15], ["Dumbbell Curl", 3, 12], ["Tricep Rope Pushdown", 3, 12], ["Barbell Hip Thrust", 3, 10], ["Cable Crunch", 3, 15]] },
      { name: "Arms Led", slots: [["Incline Dumbbell Curl", 3, 12], ["Cable Curl", 3, 12], ["EZ-Bar Skull Crusher", 3, 12], ["Overhead Cable Tricep Extension", 3, 12], ["Lat Pulldown — Wide Grip", 3, 10], ["Romanian Deadlift", 3, 10], ["Standing Calf Raise Machine", 3, 15]] },
    ],
  },
  {
    name: "Back & Biceps Focus — Three Day (Women)",
    category: "upper-specialty", sex: "women", emphasis: "Back & Biceps", dows: [0, 2, 4],
    days: [
      { name: "Back Width", slots: [["Lat Pulldown — Wide Grip", 3, 10], ["Cable Straight-Arm Pulldown", 3, 12], ["Dumbbell Curl", 3, 12], ["Barbell Hip Thrust", 3, 10], ["Standing Calf Raise Machine", 3, 15]] },
      { name: "Back Thickness", slots: [["Chest Supported Row Machine", 3, 10], ["Seated Cable Row", 3, 10], ["Hammer Curl", 3, 12], ["Romanian Deadlift", 3, 10], ["Cable Crunch", 3, 15]] },
      { name: "Back & Upper", slots: [["Lat Prayer", 3, 12], ["Single-Arm Dumbbell Row", 3, 12], ["Incline Dumbbell Curl", 3, 12], ["Incline Dumbbell Press", 3, 10], ["Dumbbell Lateral Raise", 3, 15]] },
    ],
  },
  {
    name: "Chest & Back Specialty — Four Day (Women)",
    category: "upper-specialty", sex: "women", emphasis: "Chest & Back", dows: [0, 1, 3, 4],
    days: [
      { name: "Chest Led A", slots: [["Incline Dumbbell Press", 3, 10], ["Dumbbell Bench Press", 3, 10], ["Pec Deck Machine", 3, 12], ["Tricep Rope Pushdown", 3, 12], ["Cable Crunch", 3, 15]] },
      { name: "Back Led A", slots: [["Lat Pulldown — Wide Grip", 3, 10], ["Seated Cable Row", 3, 10], ["Cable Straight-Arm Pulldown", 3, 12], ["Dumbbell Curl", 3, 12], ["Leg Extension Machine", 3, 15]] },
      { name: "Chest Led B", slots: [["Chest Press Machine", 3, 12], ["Incline Smith Machine Press", 3, 10], ["Dumbbell Lateral Raise", 3, 15], ["Overhead Cable Tricep Extension", 3, 12], ["Barbell Hip Thrust", 3, 10]] },
      { name: "Back Led B", slots: [["Chest Supported Row Machine", 3, 10], ["Lat Prayer", 3, 12], ["Reverse Pec Deck", 3, 15], ["Hammer Curl", 3, 12], ["Romanian Deadlift", 3, 10]] },
    ],
  },
  {
    name: "Arms & Shoulders Specialty — Six Day (Women)",
    category: "upper-specialty", sex: "women", emphasis: "Arms & Shoulders", dows: [0, 1, 2, 3, 4, 5],
    days: [
      { name: "Shoulders A", slots: [["Dumbbell Shoulder Press", 3, 10], ["Dumbbell Lateral Raise", 3, 15], ["Cable Face Pull", 3, 15]] },
      { name: "Arms A", slots: [["Dumbbell Curl", 3, 12], ["Hammer Curl", 3, 12], ["Tricep Rope Pushdown", 3, 12], ["Cable Crunch", 3, 15]] },
      { name: "Legs", slots: [["Barbell Hip Thrust", 3, 10], ["Romanian Deadlift", 3, 10], ["Standing Calf Raise Machine", 3, 15]] },
      { name: "Shoulders B", slots: [["Lateral Raise Machine", 3, 15], ["Cable Lateral Raise", 3, 15], ["Reverse Pec Deck", 3, 15]] },
      { name: "Arms B", slots: [["Incline Dumbbell Curl", 3, 12], ["Cable Curl", 3, 12], ["Overhead Cable Tricep Extension", 3, 12], ["Hanging Leg Raise", 3, 12]] },
      { name: "Chest & Back", slots: [["Incline Dumbbell Press", 3, 10], ["Pec Deck Machine", 3, 12], ["Lat Pulldown — Wide Grip", 3, 10], ["Russian Twist", 3, 20]] },
    ],
  },
  {
    name: "Dumbbells at Home — Two Day (Women)",
    category: "dumbbell-home", sex: "women", emphasis: "Glutes", dows: [0, 3],
    days: [
      { name: "Full Body A", slots: [["Dumbbell Hip Thrust", 3, 12], ["Dumbbell Glute Bridge", 3, 15], ["Dumbbell Romanian Deadlift", 3, 10], ["Dumbbell Calf Raise", 3, 15], ["Incline Dumbbell Press", 3, 10], ["Single-Arm Dumbbell Row", 3, 12], ["Dumbbell Lateral Raise", 3, 15], ["Dumbbell Curl", 3, 12]] },
      { name: "Full Body B", slots: [["Dumbbell Sumo Squat", 3, 12], ["Dumbbell Split Squat", 3, 10], ["Dumbbell Romanian Deadlift", 3, 10], ["Single-Leg Calf Raise", 3, 15], ["Dumbbell Floor Press", 3, 10], ["Dumbbell Pullover", 3, 12], ["Dumbbell Shoulder Press", 3, 10], ["Hammer Curl", 3, 12]] },
    ],
  },
  {
    name: "Dumbbells at Home — Three Day (Women)",
    category: "dumbbell-home", sex: "women", emphasis: "Glutes", dows: [0, 2, 4],
    days: [
      { name: "Glutes & Upper", slots: [["Dumbbell Hip Thrust", 3, 12], ["Dumbbell Glute Bridge", 3, 15], ["Dumbbell Calf Raise", 3, 15], ["Incline Dumbbell Press", 3, 10], ["Single-Arm Dumbbell Row", 3, 12], ["Dumbbell Curl", 3, 12]] },
      { name: "Quads & Upper", slots: [["Dumbbell Front Squat", 3, 10], ["Dumbbell Step-Up", 3, 12], ["Single-Leg Calf Raise", 3, 15], ["Dumbbell Shoulder Press", 3, 10], ["Dumbbell Lateral Raise", 3, 15], ["Bench Dip", 3, 12]] },
      { name: "Hamstrings & Core", slots: [["Dumbbell Romanian Deadlift", 3, 10], ["Single-Leg Romanian Deadlift", 3, 10], ["Dumbbell Floor Press", 3, 10], ["Dumbbell Pullover", 3, 12], ["Plank", 3, 45], ["Russian Twist", 3, 20]] },
    ],
  },
  {
    name: "Dumbbells at Home — Four Day (Women)",
    category: "dumbbell-home", sex: "women", emphasis: "Glutes", dows: [0, 1, 3, 4],
    days: [
      { name: "Glutes A", slots: [["Dumbbell Hip Thrust", 3, 12], ["Dumbbell Glute Bridge", 3, 15], ["Dumbbell Romanian Deadlift", 3, 10], ["Dumbbell Calf Raise", 3, 15]] },
      { name: "Upper A", slots: [["Incline Dumbbell Press", 3, 10], ["Single-Arm Dumbbell Row", 3, 12], ["Dumbbell Lateral Raise", 3, 15], ["Dumbbell Curl", 3, 12], ["Plank", 3, 45]] },
      { name: "Glutes B", slots: [["Dumbbell Sumo Squat", 3, 12], ["Dumbbell Split Squat", 3, 10], ["Dumbbell Romanian Deadlift", 3, 10], ["Single-Leg Calf Raise", 3, 15]] },
      { name: "Upper B", slots: [["Dumbbell Floor Press", 3, 10], ["Dumbbell Pullover", 3, 12], ["Dumbbell Shoulder Press", 3, 10], ["Hammer Curl", 3, 12], ["Side Plank", 3, 40]] },
    ],
  },
  {
    name: "Dumbbells at Home — Five Day (Women)",
    category: "dumbbell-home", sex: "women", emphasis: "Glutes", dows: [0, 1, 2, 3, 4],
    days: [
      { name: "Glutes", slots: [["Dumbbell Hip Thrust", 3, 12], ["Dumbbell Glute Bridge", 3, 15], ["Dumbbell Calf Raise", 3, 15]] },
      { name: "Upper Push", slots: [["Incline Dumbbell Press", 3, 10], ["Dumbbell Fly", 3, 12], ["Dumbbell Shoulder Press", 3, 10], ["Bench Dip", 3, 12]] },
      { name: "Quads", slots: [["Dumbbell Front Squat", 3, 10], ["Dumbbell Step-Up", 3, 12], ["Single-Leg Calf Raise", 3, 15]] },
      { name: "Upper Pull", slots: [["Single-Arm Dumbbell Row", 3, 12], ["Dumbbell Pullover", 3, 12], ["Rear Delt Fly — Dumbbell", 3, 15], ["Dumbbell Curl", 3, 12]] },
      { name: "Hamstrings & Core", slots: [["Dumbbell Romanian Deadlift", 3, 10], ["Single-Leg Romanian Deadlift", 3, 10], ["Plank", 3, 45], ["Russian Twist", 3, 20]] },
    ],
  },
  {
    name: "Dumbbells at Home — Six Day (Women)",
    category: "dumbbell-home", sex: "women", emphasis: "Glutes", dows: [0, 1, 2, 3, 4, 5],
    days: [
      { name: "Glutes A", slots: [["Dumbbell Hip Thrust", 3, 12], ["Dumbbell Glute Bridge", 3, 15], ["Dumbbell Calf Raise", 3, 15]] },
      { name: "Upper Push", slots: [["Incline Dumbbell Press", 3, 10], ["Dumbbell Lateral Raise", 3, 15], ["Dumbbell Overhead Extension", 3, 12]] },
      { name: "Quads", slots: [["Dumbbell Front Squat", 3, 10], ["Dumbbell Split Squat", 3, 10], ["Single-Leg Calf Raise", 3, 15]] },
      { name: "Upper Pull", slots: [["Single-Arm Dumbbell Row", 3, 12], ["Dumbbell Pullover", 3, 12], ["Dumbbell Curl", 3, 12]] },
      { name: "Glutes B", slots: [["Dumbbell Sumo Squat", 3, 12], ["Dumbbell Romanian Deadlift", 3, 10], ["Plank", 3, 45]] },
      { name: "Shoulders & Core", slots: [["Dumbbell Shoulder Press", 3, 10], ["Rear Delt Fly — Dumbbell", 3, 15], ["Side Plank", 3, 40]] },
    ],
  },
];

/** All thirty-nine women's templates: the original twenty-two, then the seventeen that fill the grid. */
export const WOMENS_TEMPLATE_SPECS: readonly TemplateSpec[] = [
  ...SIX_DAY,
  ...FIVE_DAY,
  ...FOUR_DAY,
  ...THREE_DAY,
  ...TWO_DAY,
  ...GAP_FILL,
];

export function womensTemplates(): CoachProgram[] {
  return WOMENS_TEMPLATE_SPECS.map(buildTemplate);
}
