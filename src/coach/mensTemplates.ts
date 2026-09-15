import type { TemplateSpec } from "./womensTemplates";

/** Thirty men's templates: six kinds at five frequencies.
 *
 * Written to the MALE doctrine, which differs from the female set in three ways that matter. Building these
 * off the women's rules with the names changed would have produced thirty wrong programs.
 *
 * - **G99 — a man's program carries no hip thrust work.** Not the barbell hip thrust, not the Smith version,
 *   not the glute bridge. *"Don't give guys hip thrusts much if ever really."* That rules out most of the
 *   Glutes list, and a man's glutes get what they need from squatting and hinging instead.
 * - **G58 — legs on one day, for men especially.** *"I usually like to try to do legs all on the same day, at
 *   least for guys especially. And then if you want to do some more accessories afterwards for other body
 *   parts, there's nothing wrong with that."* This is the opposite of G101's female shape, which puts legs on
 *   nearly every day. It applies at the lower frequencies; at six days there is no single leg day to
 *   consolidate into, so it is not applied there.
 * - **The male frequency targets.** Chest twice and back twice are mandatory; biceps, triceps and shoulders
 *   at least twice; legs at least once, ideally two; hamstrings at least once. Glutes are OPTIONAL for men,
 *   where they are the female priority.
 *
 * Everything else carries across: muscles run in consecutive blocks (G106/G124), the small muscle is the
 * divider at the leg/upper seam (G102/G110), a four-day week is two session types run twice on
 * Mon/Tue/Thu/Fri (G111), and every day closes on a small muscle — the shape Jack approved in G127.
 */

/* ----------------------------------------------------------------- full body */

const FULL_BODY: TemplateSpec[] = [
  {
    name: "Full Body — Two Day (Men)",
    category: "full-body",
    sex: "men",
    emphasis: "Full body",
    dows: [0, 3],
    days: [
      {
        name: "Full Body A",
        slots: [
          ["Barbell Back Squat", 3, 8],
          ["Romanian Deadlift", 3, 10],
          ["Standing Calf Raise Machine", 3, 15],
          ["Barbell Bench Press", 3, 8],
          ["Barbell Bent-Over Row", 3, 10],
          ["Dumbbell Shoulder Press", 3, 10],
          ["Barbell Curl", 3, 12],
          ["Tricep Rope Pushdown", 3, 12],
        ],
      },
      {
        name: "Full Body B",
        slots: [
          ["Leg Press — 45°", 3, 12],
          ["Lying Leg Curl", 3, 12],
          ["Seated Calf Raise Machine", 3, 15],
          ["Incline Dumbbell Press", 3, 10],
          ["Lat Pulldown — Wide Grip", 3, 10],
          ["Dumbbell Lateral Raise", 3, 15],
          ["Hammer Curl", 3, 12],
          ["Overhead Cable Tricep Extension", 3, 12],
        ],
      },
    ],
  },
  {
    name: "Full Body — Three Day (Men)",
    category: "full-body",
    sex: "men",
    emphasis: "Full body",
    dows: [0, 2, 4],
    days: [
      {
        name: "Full Body A",
        slots: [
          ["Barbell Back Squat", 3, 8],
          ["Leg Extension Machine", 3, 12],
          ["Standing Calf Raise Machine", 3, 15],
          ["Barbell Bench Press", 3, 8],
          ["Seated Cable Row", 3, 10],
          ["Dumbbell Lateral Raise", 3, 15],
          ["Barbell Curl", 3, 12],
        ],
      },
      {
        name: "Full Body B",
        slots: [
          ["Romanian Deadlift", 3, 10],
          ["Seated Leg Curl", 3, 12],
          ["Leg Press Calf Raise", 3, 15],
          ["Incline Dumbbell Press", 3, 10],
          ["Lat Pulldown — Wide Grip", 3, 10],
          ["Dumbbell Shoulder Press", 3, 10],
          ["EZ-Bar Skull Crusher", 3, 12],
        ],
      },
      {
        name: "Full Body C",
        slots: [
          ["Hack Squat Machine", 3, 10],
          ["Standing Leg Curl", 3, 12],
          ["Smith Machine Calf Raise", 3, 15],
          ["Chest Press", 3, 10],
          ["T-Bar Row", 3, 10],
          ["Cable Face Pull", 3, 15],
          ["Cable Curl", 3, 12],
        ],
      },
    ],
  },
  {
    name: "Full Body — Four Day (Men)",
    category: "full-body",
    sex: "men",
    emphasis: "Full body",
    dows: [0, 1, 3, 4],
    days: [
      {
        name: "Full Body A",
        slots: [
          ["Barbell Back Squat", 3, 8],
          ["Leg Extension Machine", 3, 12],
          ["Standing Calf Raise Machine", 3, 15],
          ["Barbell Bench Press", 3, 8],
          ["Barbell Bent-Over Row", 3, 10],
          ["Barbell Curl", 3, 12],
        ],
      },
      {
        name: "Full Body B",
        slots: [
          ["Romanian Deadlift", 3, 10],
          ["Lying Leg Curl", 3, 12],
          ["Seated Calf Raise Machine", 3, 15],
          ["Incline Dumbbell Press", 3, 10],
          ["Lat Pulldown — Wide Grip", 3, 10],
          ["Tricep Rope Pushdown", 3, 12],
        ],
      },
      {
        name: "Full Body C",
        slots: [
          ["Leg Press — 45°", 3, 12],
          ["Bulgarian Split Squat", 3, 10],
          ["Leg Press Calf Raise", 3, 15],
          ["Incline Press", 3, 10],
          ["Seated Cable Row", 3, 10],
          ["Hammer Curl", 3, 12],
        ],
      },
      {
        name: "Full Body D",
        slots: [
          ["Stiff-Leg Deadlift", 3, 10],
          ["Seated Leg Curl", 3, 12],
          ["Donkey Calf Raise", 3, 15],
          ["Dumbbell Bench Press", 3, 10],
          ["Chin-Up", 3, 8],
          ["Overhead Cable Tricep Extension", 3, 12],
        ],
      },
    ],
  },
  {
    name: "Full Body — Five Day (Men)",
    category: "full-body",
    sex: "men",
    emphasis: "Full body",
    dows: [0, 1, 2, 3, 4],
    days: [
      {
        name: "Squat & Push",
        slots: [
          ["Barbell Back Squat", 3, 8],
          ["Leg Extension Machine", 3, 12],
          ["Standing Calf Raise Machine", 3, 15],
          ["Barbell Bench Press", 3, 8],
          ["Cable Fly — Mid", 3, 12],
          ["Tricep Rope Pushdown", 3, 12],
        ],
      },
      {
        name: "Hinge & Pull",
        slots: [
          ["Romanian Deadlift", 3, 10],
          ["Lying Leg Curl", 3, 12],
          ["Cable Crunch", 3, 15],
          ["Lat Pulldown — Wide Grip", 3, 10],
          ["Seated Cable Row", 3, 10],
          ["Barbell Curl", 3, 12],
        ],
      },
      {
        name: "Legs & Shoulders",
        slots: [
          ["Leg Press — 45°", 3, 12],
          ["Bulgarian Split Squat", 3, 10],
          ["Seated Calf Raise Machine", 3, 15],
          ["Dumbbell Shoulder Press", 3, 10],
          ["Dumbbell Lateral Raise", 3, 15],
          ["Cable Face Pull", 3, 15],
        ],
      },
      {
        name: "Upper Push",
        slots: [
          ["Incline Dumbbell Press", 3, 10],
          ["Pec Deck Machine", 3, 12],
          ["Lateral Raise Machine", 3, 15],
          ["EZ-Bar Skull Crusher", 3, 12],
          ["Dumbbell Kickback", 3, 15],
          ["Hanging Leg Raise", 3, 12],
        ],
      },
      {
        name: "Upper Pull",
        slots: [
          ["Chin-Up", 3, 8],
          ["T-Bar Row", 3, 10],
          ["Cable Straight-Arm Pulldown", 3, 12],
          ["Hammer Curl", 3, 12],
          ["Incline Dumbbell Curl", 3, 12],
          ["Russian Twist", 3, 20],
        ],
      },
    ],
  },
  {
    name: "Full Body — Six Day (Men)",
    category: "full-body",
    sex: "men",
    emphasis: "Full body",
    dows: [0, 1, 2, 3, 4, 5],
    days: [
      {
        name: "Push A",
        slots: [
          ["Barbell Bench Press", 3, 8],
          ["Incline Dumbbell Press", 3, 10],
          ["Dumbbell Lateral Raise", 3, 15],
          ["Tricep Rope Pushdown", 3, 12],
          ["Cable Crunch", 3, 15],
        ],
      },
      {
        name: "Pull A",
        slots: [
          ["Barbell Bent-Over Row", 3, 8],
          ["Lat Pulldown — Wide Grip", 3, 10],
          ["Cable Face Pull", 3, 15],
          ["Barbell Curl", 3, 12],
          ["Dumbbell Wrist Curl", 3, 15],
        ],
      },
      {
        name: "Legs A",
        slots: [
          ["Barbell Back Squat", 3, 8],
          ["Leg Extension Machine", 3, 12],
          ["Lying Leg Curl", 3, 12],
          ["Standing Calf Raise Machine", 3, 15],
        ],
      },
      {
        name: "Push B",
        slots: [
          ["Incline Press", 3, 10],
          ["Chest Press Machine", 3, 12],
          ["Cable Fly — Mid", 3, 15],
          ["Dumbbell Shoulder Press", 3, 10],
          ["Overhead Cable Tricep Extension", 3, 12],
          ["Hanging Leg Raise", 3, 12],
        ],
      },
      {
        name: "Pull B",
        slots: [
          ["Chin-Up", 3, 8],
          ["Seated Cable Row", 3, 10],
          ["Reverse Pec Deck", 3, 15],
          ["Hammer Curl", 3, 12],
          ["Dumbbell Reverse Wrist Curl", 3, 15],
        ],
      },
      {
        name: "Legs B",
        slots: [
          ["Romanian Deadlift", 3, 10],
          ["Seated Leg Curl", 3, 12],
          ["Leg Press — 45°", 3, 12],
          ["Seated Calf Raise Machine", 3, 15],
        ],
      },
    ],
  },
];

/* ----------------------------------------------------- lower body emphasis */

const LOWER_EMPHASIS: TemplateSpec[] = [
  {
    name: "Lower Body Emphasis — Two Day (Men)",
    category: "lower-emphasis",
    sex: "men",
    emphasis: "Lower Body",
    dows: [0, 3],
    days: [
      {
        name: "Squat Day",
        slots: [
          ["Barbell Back Squat", 3, 6],
          ["Leg Press — 45°", 3, 12],
          ["Leg Extension Machine", 3, 15],
          ["Standing Calf Raise Machine", 3, 15],
          ["Barbell Bench Press", 3, 8],
          ["Seated Cable Row", 3, 10],
          ["Dumbbell Lateral Raise", 3, 15],
        ],
      },
      {
        name: "Hinge Day",
        slots: [
          ["Romanian Deadlift", 3, 8],
          ["Lying Leg Curl", 3, 12],
          ["Bulgarian Split Squat", 3, 10],
          ["Seated Calf Raise Machine", 3, 15],
          ["Incline Dumbbell Press", 3, 10],
          ["Lat Pulldown — Wide Grip", 3, 10],
          ["Barbell Curl", 3, 12],
        ],
      },
    ],
  },
  {
    name: "Lower Body Emphasis — Three Day (Men)",
    category: "lower-emphasis",
    sex: "men",
    emphasis: "Lower Body",
    dows: [0, 2, 4],
    days: [
      {
        name: "Quads",
        slots: [
          ["Barbell Back Squat", 3, 6],
          ["Hack Squat Machine", 3, 10],
          ["Leg Extension Machine", 3, 15],
          ["Standing Calf Raise Machine", 3, 15],
          ["Barbell Bench Press", 3, 8],
          ["Seated Cable Row", 3, 10],
        ],
      },
      {
        name: "Hamstrings",
        slots: [
          ["Romanian Deadlift", 3, 8],
          ["Lying Leg Curl", 3, 12],
          ["Glute Ham Raise", 3, 10],
          ["Leg Press Calf Raise", 3, 15],
          ["Incline Dumbbell Press", 3, 10],
          ["Lat Pulldown — Wide Grip", 3, 10],
        ],
      },
      {
        name: "Legs & Upper",
        slots: [
          ["Leg Press — 45°", 3, 12],
          ["Walking Lunge", 3, 12],
          ["Seated Leg Curl", 3, 12],
          ["Smith Machine Calf Raise", 3, 15],
          ["Dumbbell Shoulder Press", 3, 10],
          ["Barbell Curl", 3, 12],
        ],
      },
    ],
  },
  {
    name: "Lower Body Emphasis — Four Day (Men)",
    category: "lower-emphasis",
    sex: "men",
    emphasis: "Lower Body",
    dows: [0, 1, 3, 4],
    days: [
      {
        name: "Quads A",
        slots: [
          ["Barbell Back Squat", 3, 6],
          ["Leg Press — 45°", 3, 12],
          ["Leg Extension Machine", 3, 15],
          ["Standing Calf Raise Machine", 3, 15],
        ],
      },
      {
        name: "Upper A",
        slots: [
          ["Barbell Bench Press", 3, 8],
          ["Incline Dumbbell Press", 3, 10],
          ["Seated Cable Row", 3, 10],
          ["Dumbbell Lateral Raise", 3, 15],
          ["Tricep Rope Pushdown", 3, 12],
        ],
      },
      {
        name: "Hamstrings A",
        slots: [
          ["Romanian Deadlift", 3, 8],
          ["Lying Leg Curl", 3, 12],
          ["Bulgarian Split Squat", 3, 10],
          ["Seated Calf Raise Machine", 3, 15],
        ],
      },
      {
        name: "Upper B",
        slots: [
          ["Lat Pulldown — Wide Grip", 3, 10],
          ["T-Bar Row", 3, 10],
          ["Dumbbell Shoulder Press", 3, 10],
          ["Barbell Curl", 3, 12],
          ["Hanging Leg Raise", 3, 12],
        ],
      },
    ],
  },
  {
    name: "Lower Body Emphasis — Five Day (Men)",
    category: "lower-emphasis",
    sex: "men",
    emphasis: "Lower Body",
    dows: [0, 1, 2, 4, 5],
    days: [
      {
        name: "Squat",
        slots: [
          ["Barbell Back Squat", 3, 6],
          ["Hack Squat Machine", 3, 10],
          ["Leg Extension Machine", 3, 15],
          ["Standing Calf Raise Machine", 3, 15],
        ],
      },
      {
        name: "Upper Push",
        slots: [
          ["Barbell Bench Press", 3, 8],
          ["Incline Press", 3, 10],
          ["Dumbbell Lateral Raise", 3, 15],
          ["EZ-Bar Skull Crusher", 3, 12],
          ["Cable Crunch", 3, 15],
        ],
      },
      {
        name: "Hinge",
        slots: [
          ["Romanian Deadlift", 3, 8],
          ["Seated Leg Curl", 3, 12],
          ["Glute Ham Raise", 3, 10],
          ["Leg Press Calf Raise", 3, 15],
        ],
      },
      {
        name: "Upper Pull",
        slots: [
          ["Chin-Up", 3, 8],
          ["Barbell Bent-Over Row", 3, 10],
          ["Cable Face Pull", 3, 15],
          ["Hammer Curl", 3, 12],
          ["Russian Twist", 3, 20],
        ],
      },
      {
        name: "Legs Accessory",
        slots: [
          ["Leg Press — 45°", 3, 12],
          ["Walking Lunge", 3, 12],
          ["Standing Leg Curl", 3, 12],
          ["Smith Machine Calf Raise", 3, 15],
        ],
      },
    ],
  },
  {
    name: "Lower Body Emphasis — Six Day (Men)",
    category: "lower-emphasis",
    sex: "men",
    emphasis: "Lower Body",
    dows: [0, 1, 2, 3, 4, 5],
    days: [
      {
        name: "Quads A",
        slots: [
          ["Barbell Back Squat", 3, 6],
          ["Leg Extension Machine", 3, 15],
          ["Standing Calf Raise Machine", 3, 15],
        ],
      },
      {
        name: "Chest & Triceps",
        slots: [
          ["Barbell Bench Press", 3, 8],
          ["Incline Dumbbell Press", 3, 10],
          ["Tricep Rope Pushdown", 3, 12],
          ["Cable Crunch", 3, 15],
        ],
      },
      {
        name: "Hamstrings",
        slots: [
          ["Romanian Deadlift", 3, 8],
          ["Lying Leg Curl", 3, 12],
          ["Seated Calf Raise Machine", 3, 15],
        ],
      },
      {
        name: "Back & Biceps",
        slots: [
          ["Lat Pulldown — Wide Grip", 3, 10],
          ["Seated Cable Row", 3, 10],
          ["Barbell Curl", 3, 12],
          ["Hanging Leg Raise", 3, 12],
        ],
      },
      {
        name: "Quads B",
        slots: [
          ["Hack Squat Machine", 3, 10],
          ["Bulgarian Split Squat", 3, 10],
          ["Leg Press Calf Raise", 3, 15],
        ],
      },
      {
        name: "Shoulders",
        slots: [
          ["Dumbbell Shoulder Press", 3, 10],
          ["Dumbbell Lateral Raise", 3, 15],
          ["Cable Face Pull", 3, 15],
          ["Russian Twist", 3, 20],
        ],
      },
    ],
  },
];

/* ----------------------------------------------------- upper body emphasis */

const UPPER_EMPHASIS: TemplateSpec[] = [
  {
    name: "Upper Body Emphasis — Two Day (Men)",
    category: "upper-emphasis",
    sex: "men",
    emphasis: "Upper Body",
    dows: [0, 3],
    days: [
      {
        name: "Push & Legs",
        slots: [
          ["Barbell Bench Press", 3, 8],
          ["Incline Dumbbell Press", 3, 10],
          ["Cable Fly — Mid", 3, 12],
          ["Dumbbell Shoulder Press", 3, 10],
          ["Dumbbell Lateral Raise", 3, 15],
          ["Tricep Rope Pushdown", 3, 12],
          ["Barbell Back Squat", 3, 10],
        ],
      },
      {
        name: "Pull & Legs",
        slots: [
          ["Chin-Up", 3, 8],
          ["Barbell Bent-Over Row", 3, 10],
          ["Lat Pulldown — Wide Grip", 3, 10],
          ["Cable Face Pull", 3, 15],
          ["Barbell Curl", 3, 12],
          ["Hammer Curl", 3, 12],
          ["Romanian Deadlift", 3, 10],
        ],
      },
    ],
  },
  {
    name: "Upper Body Emphasis — Three Day (Men)",
    category: "upper-emphasis",
    sex: "men",
    emphasis: "Upper Body",
    dows: [0, 2, 4],
    days: [
      {
        name: "Chest & Arms",
        slots: [
          ["Barbell Bench Press", 3, 8],
          ["Incline Dumbbell Press", 3, 10],
          ["Pec Deck Machine", 3, 12],
          ["EZ-Bar Skull Crusher", 3, 12],
          ["Barbell Curl", 3, 12],
          ["Leg Extension Machine", 3, 15],
        ],
      },
      {
        name: "Back & Shoulders",
        slots: [
          ["Lat Pulldown — Wide Grip", 3, 10],
          ["Seated Cable Row", 3, 10],
          ["Dumbbell Shoulder Press", 3, 10],
          ["Dumbbell Lateral Raise", 3, 15],
          ["Cable Face Pull", 3, 15],
          ["Lying Leg Curl", 3, 12],
        ],
      },
      {
        name: "Upper & Legs",
        slots: [
          ["Incline Press", 3, 10],
          ["T-Bar Row", 3, 10],
          ["Lateral Raise Machine", 3, 15],
          ["Hammer Curl", 3, 12],
          ["Overhead Cable Tricep Extension", 3, 12],
          ["Barbell Back Squat", 3, 10],
        ],
      },
    ],
  },
  {
    name: "Upper Body Emphasis — Four Day (Men)",
    category: "upper-emphasis",
    sex: "men",
    emphasis: "Upper Body",
    dows: [0, 1, 3, 4],
    days: [
      {
        name: "Push A",
        slots: [
          ["Barbell Bench Press", 3, 8],
          ["Incline Dumbbell Press", 3, 10],
          ["Cable Fly — Mid", 3, 12],
          ["Dumbbell Lateral Raise", 3, 15],
          ["Tricep Rope Pushdown", 3, 12],
        ],
      },
      {
        name: "Pull A",
        slots: [
          ["Chin-Up", 3, 8],
          ["Barbell Bent-Over Row", 3, 10],
          ["Cable Straight-Arm Pulldown", 3, 12],
          ["Barbell Curl", 3, 12],
          ["Hanging Leg Raise", 3, 12],
        ],
      },
      {
        name: "Push B",
        slots: [
          ["Incline Press", 3, 10],
          ["Dumbbell Bench Press", 3, 10],
          ["Dumbbell Shoulder Press", 3, 10],
          ["Lateral Raise Machine", 3, 15],
          ["Barbell Back Squat", 3, 10],
        ],
      },
      {
        name: "Pull B",
        slots: [
          ["Lat Pulldown — Wide Grip", 3, 10],
          ["Seated Cable Row", 3, 10],
          ["Reverse Pec Deck", 3, 15],
          ["Hammer Curl", 3, 12],
          ["Romanian Deadlift", 3, 10],
        ],
      },
    ],
  },
  {
    name: "Upper Body Emphasis — Five Day (Men)",
    category: "upper-emphasis",
    sex: "men",
    emphasis: "Upper Body",
    dows: [0, 1, 2, 3, 4],
    days: [
      {
        name: "Chest",
        slots: [
          ["Barbell Bench Press", 3, 8],
          ["Incline Dumbbell Press", 3, 10],
          ["Pec Deck Machine", 3, 12],
          ["Cable Fly — Low to High", 3, 12],
          ["Cable Crunch", 3, 15],
        ],
      },
      {
        name: "Back",
        slots: [
          ["Chin-Up", 3, 8],
          ["Barbell Bent-Over Row", 3, 10],
          ["Lat Pulldown — Close Grip", 3, 10],
          ["Cable Straight-Arm Pulldown", 3, 12],
          ["Hanging Leg Raise", 3, 12],
        ],
      },
      {
        name: "Legs",
        slots: [
          ["Barbell Back Squat", 3, 8],
          ["Leg Press — 45°", 3, 12],
          ["Romanian Deadlift", 3, 10],
          ["Lying Leg Curl", 3, 12],
          ["Standing Calf Raise Machine", 3, 15],
        ],
      },
      {
        name: "Shoulders",
        slots: [
          ["Dumbbell Shoulder Press", 3, 10],
          ["Dumbbell Lateral Raise", 3, 15],
          ["Lateral Raise Machine", 3, 15],
          ["Cable Face Pull", 3, 15],
          ["Russian Twist", 3, 20],
        ],
      },
      {
        name: "Arms",
        slots: [
          ["Barbell Curl", 3, 10],
          ["Incline Dumbbell Curl", 3, 12],
          ["Hammer Curl", 3, 12],
          ["EZ-Bar Skull Crusher", 3, 12],
          ["Tricep Rope Pushdown", 3, 12],
        ],
      },
    ],
  },
  {
    name: "Upper Body Emphasis — Six Day (Men)",
    category: "upper-emphasis",
    sex: "men",
    emphasis: "Upper Body",
    dows: [0, 1, 2, 3, 4, 5],
    days: [
      {
        name: "Chest A",
        slots: [
          ["Barbell Bench Press", 3, 8],
          ["Incline Dumbbell Press", 3, 10],
          ["Cable Fly — Mid", 3, 12],
          ["Cable Crunch", 3, 15],
        ],
      },
      {
        name: "Back A",
        slots: [
          ["Chin-Up", 3, 8],
          ["Barbell Bent-Over Row", 3, 10],
          ["Cable Straight-Arm Pulldown", 3, 12],
          ["Leg Extension Machine", 3, 15],
        ],
      },
      {
        name: "Shoulders & Arms A",
        slots: [
          ["Dumbbell Shoulder Press", 3, 10],
          ["Dumbbell Lateral Raise", 3, 15],
          ["Barbell Curl", 3, 12],
          ["Tricep Rope Pushdown", 3, 12],
        ],
      },
      {
        name: "Chest B",
        slots: [
          ["Incline Press", 3, 10],
          ["Dumbbell Bench Press", 3, 10],
          ["Pec Deck Machine", 3, 12],
          ["Hanging Leg Raise", 3, 12],
        ],
      },
      {
        name: "Back B",
        slots: [
          ["Lat Pulldown — Wide Grip", 3, 10],
          ["Seated Cable Row", 3, 10],
          ["Reverse Pec Deck", 3, 15],
          ["Lying Leg Curl", 3, 12],
        ],
      },
      {
        name: "Shoulders & Arms B",
        slots: [
          ["Arnold Press", 3, 10],
          ["Lateral Raise Machine", 3, 15],
          ["Hammer Curl", 3, 12],
          ["Overhead Cable Tricep Extension", 3, 12],
        ],
      },
    ],
  },
];

/* --------------------------------------------------- lower body specialty
 * A specialty split gives one region the whole program rather than merely the most of it: the emphasised
 * muscles take two or three consecutive slots and lead nearly every day, and the rest of the body is kept
 * ticking over rather than trained (G109/G110).
 */

const LOWER_SPECIALTY: TemplateSpec[] = [
  {
    name: "Quad Specialty — Two Day (Men)",
    category: "lower-specialty",
    sex: "men",
    emphasis: "Lower Body",
    dows: [0, 3],
    days: [
      {
        name: "Squat Focus",
        slots: [
          ["Barbell Back Squat", 3, 6],
          ["Hack Squat Machine", 3, 10],
          ["Leg Press — 45°", 3, 12],
          ["Leg Extension Machine", 3, 15],
          ["Standing Calf Raise Machine", 3, 15],
          ["Barbell Bench Press", 3, 8],
          ["Seated Cable Row", 3, 10],
        ],
      },
      {
        name: "Hinge Focus",
        slots: [
          ["Romanian Deadlift", 3, 8],
          ["Stiff-Leg Deadlift", 3, 10],
          ["Lying Leg Curl", 3, 12],
          ["Glute Ham Raise", 3, 10],
          ["Seated Calf Raise Machine", 3, 15],
          ["Incline Dumbbell Press", 3, 10],
          ["Lat Pulldown — Wide Grip", 3, 10],
        ],
      },
    ],
  },
  {
    name: "Quad Specialty — Three Day (Men)",
    category: "lower-specialty",
    sex: "men",
    emphasis: "Lower Body",
    dows: [0, 2, 4],
    days: [
      {
        name: "Heavy Squat",
        slots: [
          ["Barbell Back Squat", 3, 6],
          ["Hack Squat Machine", 3, 8],
          ["Leg Extension Machine", 3, 15],
          ["Standing Calf Raise Machine", 3, 15],
          ["Barbell Bench Press", 3, 8],
        ],
      },
      {
        name: "Posterior Chain",
        slots: [
          ["Romanian Deadlift", 3, 8],
          ["Seated Leg Curl", 3, 12],
          ["Glute Ham Raise", 3, 10],
          ["Leg Press Calf Raise", 3, 15],
          ["Lat Pulldown — Wide Grip", 3, 10],
        ],
      },
      {
        name: "Single Leg",
        slots: [
          ["Bulgarian Split Squat", 3, 10],
          ["Walking Lunge", 3, 12],
          ["Leg Press — 45°", 3, 12],
          ["Smith Machine Calf Raise", 3, 15],
          ["Dumbbell Shoulder Press", 3, 10],
        ],
      },
    ],
  },
  {
    name: "Quad Specialty — Four Day (Men)",
    category: "lower-specialty",
    sex: "men",
    emphasis: "Lower Body",
    dows: [0, 1, 3, 4],
    days: [
      {
        name: "Quads A",
        slots: [
          ["Barbell Back Squat", 3, 6],
          ["Hack Squat Machine", 3, 10],
          ["Leg Extension Machine", 3, 15],
          ["Standing Calf Raise Machine", 3, 15],
        ],
      },
      {
        name: "Hamstrings A",
        slots: [
          ["Romanian Deadlift", 3, 8],
          ["Lying Leg Curl", 3, 12],
          ["Glute Ham Raise", 3, 10],
          ["Seated Calf Raise Machine", 3, 15],
        ],
      },
      {
        name: "Quads B",
        slots: [
          ["Barbell Front Squat", 3, 8],
          ["Leg Press — 45°", 3, 12],
          ["Bulgarian Split Squat", 3, 10],
          ["Leg Press Calf Raise", 3, 15],
        ],
      },
      {
        name: "Upper Maintenance",
        slots: [
          ["Barbell Bench Press", 3, 8],
          ["Lat Pulldown — Wide Grip", 3, 10],
          ["Dumbbell Lateral Raise", 3, 15],
          ["Barbell Curl", 3, 12],
          ["Cable Crunch", 3, 15],
        ],
      },
    ],
  },
  {
    name: "Quad Specialty — Five Day (Men)",
    category: "lower-specialty",
    sex: "men",
    emphasis: "Lower Body",
    dows: [0, 1, 2, 4, 5],
    days: [
      {
        name: "Heavy Squat",
        slots: [
          ["Barbell Back Squat", 3, 6],
          ["Leg Extension Machine", 3, 15],
          ["Standing Calf Raise Machine", 3, 15],
        ],
      },
      {
        name: "Hamstrings",
        slots: [
          ["Romanian Deadlift", 3, 8],
          ["Seated Leg Curl", 3, 12],
          ["Leg Press Calf Raise", 3, 15],
        ],
      },
      {
        name: "Upper Maintenance",
        slots: [
          ["Barbell Bench Press", 3, 8],
          ["Seated Cable Row", 3, 10],
          ["Dumbbell Lateral Raise", 3, 15],
          ["Barbell Curl", 3, 12],
        ],
      },
      {
        name: "Volume Quads",
        slots: [
          ["Hack Squat Machine", 3, 10],
          ["Leg Press — 45°", 3, 12],
          ["Walking Lunge", 3, 12],
          ["Smith Machine Calf Raise", 3, 15],
        ],
      },
      {
        name: "Single Leg & Abs",
        slots: [
          ["Bulgarian Split Squat", 3, 10],
          ["Reverse Lunge", 3, 12],
          ["Standing Leg Curl", 3, 12],
          ["Hanging Leg Raise", 3, 12],
        ],
      },
    ],
  },
  {
    name: "Quad Specialty — Six Day (Men)",
    category: "lower-specialty",
    sex: "men",
    emphasis: "Lower Body",
    dows: [0, 1, 2, 3, 4, 5],
    days: [
      {
        name: "Heavy Squat",
        slots: [
          ["Barbell Back Squat", 3, 6],
          ["Leg Extension Machine", 3, 15],
          ["Standing Calf Raise Machine", 3, 15],
        ],
      },
      {
        name: "Chest & Triceps",
        slots: [
          ["Barbell Bench Press", 3, 8],
          ["Incline Dumbbell Press", 3, 10],
          ["Tricep Rope Pushdown", 3, 12],
        ],
      },
      {
        name: "Hamstrings",
        slots: [
          ["Romanian Deadlift", 3, 8],
          ["Lying Leg Curl", 3, 12],
          ["Seated Calf Raise Machine", 3, 15],
        ],
      },
      {
        name: "Back & Biceps",
        slots: [
          ["Lat Pulldown — Wide Grip", 3, 10],
          ["Seated Cable Row", 3, 10],
          ["Barbell Curl", 3, 12],
        ],
      },
      {
        name: "Volume Quads",
        slots: [
          ["Hack Squat Machine", 3, 10],
          ["Bulgarian Split Squat", 3, 10],
          ["Leg Press Calf Raise", 3, 15],
        ],
      },
      {
        name: "Posterior & Abs",
        slots: [
          ["Stiff-Leg Deadlift", 3, 10],
          ["Glute Ham Raise", 3, 10],
          ["Hanging Leg Raise", 3, 12],
        ],
      },
    ],
  },
];

/* --------------------------------------------------- upper body specialty */

const UPPER_SPECIALTY: TemplateSpec[] = [
  {
    name: "Chest & Back Specialty — Two Day (Men)",
    category: "upper-specialty",
    sex: "men",
    emphasis: "Chest & Back",
    dows: [0, 3],
    days: [
      {
        name: "Chest Led",
        slots: [
          ["Barbell Bench Press", 3, 6],
          ["Incline Dumbbell Press", 3, 10],
          ["Pec Deck Machine", 3, 12],
          ["Cable Fly — Low to High", 3, 12],
          ["Seated Cable Row", 3, 10],
          ["Tricep Rope Pushdown", 3, 12],
          ["Barbell Back Squat", 3, 10],
        ],
      },
      {
        name: "Back Led",
        slots: [
          ["Barbell Bent-Over Row", 3, 6],
          ["Chin-Up", 3, 8],
          ["Lat Pulldown — Wide Grip", 3, 10],
          ["Cable Straight-Arm Pulldown", 3, 12],
          ["Dumbbell Bench Press", 3, 10],
          ["Barbell Curl", 3, 12],
          ["Romanian Deadlift", 3, 10],
        ],
      },
    ],
  },
  {
    name: "Arms & Shoulders Specialty — Three Day (Men)",
    category: "upper-specialty",
    sex: "men",
    emphasis: "Arms & Shoulders",
    dows: [0, 2, 4],
    days: [
      {
        name: "Shoulders Led",
        slots: [
          ["Dumbbell Shoulder Press", 3, 8],
          ["Arnold Press", 3, 10],
          ["Dumbbell Lateral Raise", 3, 15],
          ["Cable Face Pull", 3, 15],
          ["Barbell Back Squat", 3, 10],
        ],
      },
      {
        name: "Biceps Led",
        slots: [
          ["Barbell Curl", 3, 10],
          ["Incline Dumbbell Curl", 3, 12],
          ["Hammer Curl", 3, 12],
          ["Lat Pulldown — Wide Grip", 3, 10],
          ["Lying Leg Curl", 3, 12],
        ],
      },
      {
        name: "Triceps Led",
        slots: [
          ["Close-Grip Bench Press", 3, 8],
          ["EZ-Bar Skull Crusher", 3, 12],
          ["Overhead Cable Tricep Extension", 3, 12],
          ["Barbell Bench Press", 3, 8],
          ["Cable Crunch", 3, 15],
        ],
      },
    ],
  },
  {
    // "Focus" rather than "Specialty": the systematic specialty set in specialtyTemplates.ts now owns that
    // name at this pairing and frequency, and two templates sharing a name share an id.
    name: "Chest & Triceps Focus — Four Day (Men)",
    category: "upper-specialty",
    sex: "men",
    emphasis: "Chest & Triceps",
    dows: [0, 1, 3, 4],
    days: [
      {
        name: "Chest & Triceps A",
        slots: [
          ["Barbell Bench Press", 3, 6],
          ["Incline Dumbbell Press", 3, 10],
          ["Cable Fly — Mid", 3, 12],
          ["EZ-Bar Skull Crusher", 3, 12],
          ["Tricep Rope Pushdown", 3, 12],
        ],
      },
      {
        name: "Back & Biceps A",
        slots: [
          ["Barbell Bent-Over Row", 3, 8],
          ["Lat Pulldown — Wide Grip", 3, 10],
          ["Barbell Curl", 3, 12],
          ["Hammer Curl", 3, 12],
          ["Leg Extension Machine", 3, 15],
        ],
      },
      {
        name: "Chest & Triceps B",
        slots: [
          ["Incline Press", 3, 8],
          ["Dumbbell Bench Press", 3, 10],
          ["Pec Deck Machine", 3, 12],
          ["Overhead Cable Tricep Extension", 3, 12],
          ["Dumbbell Kickback", 3, 15],
        ],
      },
      {
        name: "Back & Shoulders B",
        slots: [
          ["Chin-Up", 3, 8],
          ["Seated Cable Row", 3, 10],
          ["Dumbbell Shoulder Press", 3, 10],
          ["Dumbbell Lateral Raise", 3, 15],
          ["Lying Leg Curl", 3, 12],
        ],
      },
    ],
  },
  {
    name: "Back & Biceps Focus — Five Day (Men)",
    category: "upper-specialty",
    sex: "men",
    emphasis: "Back & Biceps",
    dows: [0, 1, 2, 3, 4],
    days: [
      {
        name: "Back Width",
        slots: [
          ["Chin-Up", 3, 8],
          ["Lat Pulldown — Wide Grip", 3, 10],
          ["Cable Straight-Arm Pulldown", 3, 12],
          ["Barbell Curl", 3, 12],
        ],
      },
      {
        name: "Back Thickness",
        slots: [
          ["Barbell Bent-Over Row", 3, 6],
          ["T-Bar Row", 3, 10],
          ["Meadows Row", 3, 12],
          ["Hammer Curl", 3, 12],
        ],
      },
      {
        name: "Legs",
        slots: [
          ["Barbell Back Squat", 3, 8],
          ["Romanian Deadlift", 3, 10],
          ["Lying Leg Curl", 3, 12],
          ["Standing Calf Raise Machine", 3, 15],
        ],
      },
      {
        name: "Chest & Shoulders",
        slots: [
          ["Barbell Bench Press", 3, 8],
          ["Incline Dumbbell Press", 3, 10],
          ["Dumbbell Shoulder Press", 3, 10],
          ["Dumbbell Lateral Raise", 3, 15],
        ],
      },
      {
        name: "Arms & Abs",
        slots: [
          ["Incline Dumbbell Curl", 3, 12],
          ["Cable Curl", 3, 12],
          ["EZ-Bar Skull Crusher", 3, 12],
          ["Hanging Leg Raise", 3, 12],
        ],
      },
    ],
  },
  {
    name: "Arms & Shoulders Specialty — Six Day (Men)",
    category: "upper-specialty",
    sex: "men",
    emphasis: "Arms & Shoulders",
    dows: [0, 1, 2, 3, 4, 5],
    days: [
      {
        name: "Shoulders A",
        slots: [
          ["Dumbbell Shoulder Press", 3, 8],
          ["Dumbbell Lateral Raise", 3, 15],
          ["Cable Face Pull", 3, 15],
        ],
      },
      {
        name: "Arms A",
        slots: [
          ["Barbell Curl", 3, 10],
          ["Hammer Curl", 3, 12],
          ["EZ-Bar Skull Crusher", 3, 12],
          ["Tricep Rope Pushdown", 3, 12],
        ],
      },
      {
        name: "Legs",
        slots: [
          ["Barbell Back Squat", 3, 8],
          ["Romanian Deadlift", 3, 10],
          ["Standing Calf Raise Machine", 3, 15],
        ],
      },
      {
        name: "Shoulders B",
        slots: [
          ["Arnold Press", 3, 10],
          ["Lateral Raise Machine", 3, 15],
          ["Reverse Pec Deck", 3, 15],
        ],
      },
      {
        name: "Arms B",
        slots: [
          ["Incline Dumbbell Curl", 3, 12],
          ["Cable Curl", 3, 12],
          ["Overhead Cable Tricep Extension", 3, 12],
          ["Dumbbell Kickback", 3, 15],
        ],
      },
      {
        name: "Chest & Back",
        slots: [
          ["Barbell Bench Press", 3, 8],
          ["Pec Deck Machine", 3, 12],
          ["Lat Pulldown — Wide Grip", 3, 10],
          ["Cable Crunch", 3, 15],
        ],
      },
    ],
  },
];

/* ------------------------------------------------------- dumbbells at home
 * No machines, no cables, no barbell -- a pair of dumbbells and a bench. The library gained the leg and
 * pressing variants these need, because a home program that could not train legs was not a home program.
 * G99 still applies: no hip thrust or glute bridge work in a man's template.
 */

const DUMBBELL_HOME: TemplateSpec[] = [
  {
    name: "Dumbbells at Home — Two Day (Men)",
    category: "dumbbell-home",
    sex: "men",
    emphasis: "Full body",
    dows: [0, 3],
    days: [
      {
        name: "Full Body A",
        slots: [
          ["Dumbbell Front Squat", 3, 10],
          ["Dumbbell Romanian Deadlift", 3, 10],
          ["Dumbbell Calf Raise", 3, 15],
          ["Dumbbell Bench Press", 3, 10],
          ["Single-Arm Dumbbell Row", 3, 12],
          ["Dumbbell Shoulder Press", 3, 10],
          ["Dumbbell Curl", 3, 12],
          ["Dumbbell Overhead Extension", 3, 12],
        ],
      },
      {
        name: "Full Body B",
        slots: [
          ["Dumbbell Split Squat", 3, 10],
          ["Dumbbell Stiff-Leg Deadlift", 3, 10],
          ["Single-Leg Calf Raise", 3, 15],
          ["Incline Dumbbell Press", 3, 10],
          ["Dumbbell Pullover", 3, 12],
          ["Dumbbell Lateral Raise", 3, 15],
          ["Hammer Curl", 3, 12],
          ["Bench Dip", 3, 12],
        ],
      },
    ],
  },
  {
    name: "Dumbbells at Home — Three Day (Men)",
    category: "dumbbell-home",
    sex: "men",
    emphasis: "Full body",
    dows: [0, 2, 4],
    days: [
      {
        name: "Full Body A",
        slots: [
          ["Dumbbell Front Squat", 3, 10],
          ["Dumbbell Step-Up", 3, 12],
          ["Dumbbell Calf Raise", 3, 15],
          ["Dumbbell Bench Press", 3, 10],
          ["Single-Arm Dumbbell Row", 3, 12],
          ["Dumbbell Curl", 3, 12],
        ],
      },
      {
        name: "Full Body B",
        slots: [
          ["Dumbbell Romanian Deadlift", 3, 10],
          ["Bulgarian Split Squat", 3, 10],
          ["Single-Leg Calf Raise", 3, 15],
          ["Incline Dumbbell Press", 3, 10],
          ["Dumbbell Pullover", 3, 12],
          ["Dumbbell Overhead Extension", 3, 12],
        ],
      },
      {
        name: "Full Body C",
        slots: [
          ["Goblet Squat", 3, 12],
          ["Dumbbell Reverse Lunge", 3, 12],
          ["Plank", 3, 45],
          ["Dumbbell Floor Press", 3, 10],
          ["Dumbbell Shoulder Press", 3, 10],
          ["Hammer Curl", 3, 12],
        ],
      },
    ],
  },
  {
    name: "Dumbbells at Home — Four Day (Men)",
    category: "dumbbell-home",
    sex: "men",
    emphasis: "Full body",
    dows: [0, 1, 3, 4],
    days: [
      {
        name: "Lower A",
        slots: [
          ["Dumbbell Front Squat", 3, 10],
          ["Dumbbell Split Squat", 3, 10],
          ["Dumbbell Romanian Deadlift", 3, 10],
          ["Dumbbell Calf Raise", 3, 15],
        ],
      },
      {
        name: "Upper A",
        slots: [
          ["Dumbbell Bench Press", 3, 10],
          ["Incline Dumbbell Press", 3, 10],
          ["Single-Arm Dumbbell Row", 3, 12],
          ["Dumbbell Lateral Raise", 3, 15],
          ["Dumbbell Curl", 3, 12],
        ],
      },
      {
        name: "Lower B",
        slots: [
          ["Dumbbell Sumo Squat", 3, 12],
          ["Dumbbell Step-Up", 3, 12],
          ["Dumbbell Stiff-Leg Deadlift", 3, 10],
          ["Single-Leg Calf Raise", 3, 15],
        ],
      },
      {
        name: "Upper B",
        slots: [
          ["Dumbbell Floor Press", 3, 10],
          ["Dumbbell Pullover", 3, 12],
          ["Dumbbell Shoulder Press", 3, 10],
          ["Hammer Curl", 3, 12],
          ["Bench Dip", 3, 12],
        ],
      },
    ],
  },
  {
    name: "Dumbbells at Home — Five Day (Men)",
    category: "dumbbell-home",
    sex: "men",
    emphasis: "Full body",
    dows: [0, 1, 2, 3, 4],
    days: [
      {
        name: "Chest & Triceps",
        slots: [
          ["Dumbbell Bench Press", 3, 10],
          ["Incline Dumbbell Press", 3, 10],
          ["Dumbbell Fly", 3, 12],
          ["Dumbbell Overhead Extension", 3, 12],
          ["Bench Dip", 3, 12],
        ],
      },
      {
        name: "Back & Biceps",
        slots: [
          ["Single-Arm Dumbbell Row", 3, 12],
          ["Dumbbell Pullover", 3, 12],
          ["Dumbbell Curl", 3, 12],
          ["Incline Dumbbell Curl", 3, 12],
          ["Dumbbell Wrist Curl", 3, 15],
        ],
      },
      {
        name: "Legs",
        slots: [
          ["Dumbbell Front Squat", 3, 10],
          ["Dumbbell Split Squat", 3, 10],
          ["Dumbbell Romanian Deadlift", 3, 10],
          ["Dumbbell Calf Raise", 3, 15],
        ],
      },
      {
        name: "Shoulders",
        slots: [
          ["Dumbbell Shoulder Press", 3, 10],
          ["Arnold Press", 3, 10],
          ["Dumbbell Lateral Raise", 3, 15],
          ["Rear Delt Fly — Dumbbell", 3, 15],
          ["Dumbbell Shrug", 3, 15],
        ],
      },
      {
        name: "Legs & Core",
        slots: [
          ["Dumbbell Sumo Squat", 3, 12],
          ["Dumbbell Step-Up", 3, 12],
          ["Single-Leg Calf Raise", 3, 15],
          ["Plank", 3, 45],
          ["Mountain Climber", 3, 30],
        ],
      },
    ],
  },
  {
    name: "Dumbbells at Home — Six Day (Men)",
    category: "dumbbell-home",
    sex: "men",
    emphasis: "Full body",
    dows: [0, 1, 2, 3, 4, 5],
    days: [
      {
        name: "Push A",
        slots: [
          ["Dumbbell Bench Press", 3, 10],
          ["Incline Dumbbell Press", 3, 10],
          ["Dumbbell Lateral Raise", 3, 15],
          ["Dumbbell Overhead Extension", 3, 12],
        ],
      },
      {
        name: "Pull A",
        slots: [
          ["Single-Arm Dumbbell Row", 3, 12],
          ["Dumbbell Pullover", 3, 12],
          ["Dumbbell Curl", 3, 12],
          ["Dumbbell Wrist Curl", 3, 15],
        ],
      },
      {
        name: "Legs A",
        slots: [
          ["Dumbbell Front Squat", 3, 10],
          ["Dumbbell Romanian Deadlift", 3, 10],
          ["Dumbbell Calf Raise", 3, 15],
        ],
      },
      {
        name: "Push B",
        slots: [
          ["Dumbbell Floor Press", 3, 10],
          ["Dumbbell Fly", 3, 12],
          ["Dumbbell Shoulder Press", 3, 10],
          ["Bench Dip", 3, 12],
        ],
      },
      {
        name: "Pull B",
        slots: [
          ["Dumbbell Pullover", 3, 12],
          ["Rear Delt Fly — Dumbbell", 3, 15],
          ["Hammer Curl", 3, 12],
          ["Dumbbell Reverse Wrist Curl", 3, 15],
        ],
      },
      {
        name: "Legs B",
        slots: [
          ["Dumbbell Split Squat", 3, 10],
          ["Dumbbell Step-Up", 3, 12],
          ["Single-Leg Calf Raise", 3, 15],
        ],
      },
    ],
  },
];

/** All thirty men's templates: six kinds at five frequencies. */
export const MENS_TEMPLATE_SPECS: readonly TemplateSpec[] = [
  ...FULL_BODY,
  ...LOWER_EMPHASIS,
  ...UPPER_EMPHASIS,
  ...LOWER_SPECIALTY,
  ...UPPER_SPECIALTY,
  ...DUMBBELL_HOME,
];
