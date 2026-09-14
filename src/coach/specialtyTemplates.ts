import type { TemplateCategory, TemplateSex, TemplateSpec } from "./womensTemplates";

/** Specialty templates, named by the muscle PAIRING they emphasise.
 *
 * Jack, giving the list:
 *
 *   men   — Chest & Back · Shoulders & Arms · Back & Biceps · Chest & Triceps · Legs
 *   women — Back & Biceps · Back & Shoulders · Back & Glutes · Glutes & Shoulders ·
 *           Glutes & Quads · Glutes & Hamstrings · Chest & Shoulders · Chest & Triceps
 *
 * At three, four, five and six days a week. Not two: a specialty split has to give the emphasised pair
 * two or three consecutive slots on most days, and across two sessions there is nowhere to put the rest
 * of the body. 5 x 4 = 20 men's and 8 x 4 = 32 women's, so 52.
 *
 * ## This is G112 arriving as a feature
 *
 * G112 recorded that "the emphasis taxonomy is muscle PAIRS, and there are at least seven" -- that Chest &
 * Triceps and Back & Biceps are agonist pairings, Chest & Back is push/pull, and none of them is a region,
 * so a widened enum of regions could never express them. `EmphasisProfile` is still two values wide. These
 * templates carry the pairing in `emphasis`, which is what the card shows, so the taxonomy is real in the
 * product even though the generator's type has not caught up.
 *
 * **Mixed pairings are filed by the FIRST-named muscle.** "Back, Glutes" leads back and is an upper
 * specialty; "Glutes, Shoulders" leads glutes and is a lower one. That follows G105 -- order outranks
 * muscle size, and whatever is emphasised leads the session.
 *
 * ## Why these are skeletons
 *
 * What makes a specialty template that specialty is which muscles lead and in what order. That is authored
 * here, explicitly, per pairing and per frequency. Bringing each day up to Jack's own exercise count
 * (EXERCISES_PER_SESSION: 3d 8, 4d 7, 5d 6, 6d 6) is the job `deepen` in templateDensity.ts already does,
 * correctly and under test -- it adds work INSIDE existing muscle blocks rather than appending. Writing the
 * filled-out version by hand across fifty-two templates would be fifteen hundred lines in which the ordering
 * would drift, which is the one thing these are judged on.
 */

/** Ordered preference per muscle. First choice is the heaviest, most compound expression of the muscle,
 * since the emphasised muscle opens the day (G105/G109). Every name is in the library. */
const PICK: Record<string, string[]> = {
  Chest: ["Barbell Bench Press", "Incline Dumbbell Press", "Pec Deck Machine"],
  Back: ["Barbell Bent-Over Row", "Lat Pulldown — Wide Grip", "Seated Cable Row"],
  Quads: ["Barbell Back Squat", "Leg Press — 45° (Cybex)", "Leg Extension Machine (Cybex)"],
  Hamstrings: ["Romanian Deadlift", "Lying Leg Curl (Nautilus)", "Seated Leg Curl (Cybex)"],
  Glutes: ["Barbell Hip Thrust", "Cable Pull-Through", "Glute Bridge"],
  "Front delts": ["Dumbbell Shoulder Press", "Seated Dumbbell Press", "Arnold Press"],
  "Side delts": ["Dumbbell Lateral Raise", "Cable Lateral Raise", "Cybex Lateral Raise Machine"],
  "Rear delts": ["Cable Face Pull", "Rear Delt Fly — Dumbbell"],
  Biceps: ["Barbell Curl", "Incline Dumbbell Curl", "Hammer Curl"],
  Triceps: ["Tricep Rope Pushdown", "EZ-Bar Skull Crusher", "Overhead Cable Tricep Extension"],
  Calves: ["Standing Calf Raise Machine", "Seated Calf Raise Machine (Cybex)", "Leg Press Calf Raise"],
  Abs: ["Cable Crunch", "Hanging Leg Raise", "Captain's Chair Knee Raise"],
};

/** G99: a man's program carries no hip thrust or glute bridge work, so male glute work is hinging. */
const MENS_GLUTES = ["Romanian Deadlift", "Barbell Back Squat", "Stiff-Leg Deadlift"];

interface Pairing {
  label: string;
  sex: TemplateSex;
  category: TemplateCategory;
  /** The muscles this specialises in, in the order Jack named them. The first leads. */
  lead: string[];
  /** What keeps ticking over on the days the pair does not own. */
  support: string[];
}

const PAIRINGS: Pairing[] = [
  // --- men, in the order he listed them ---
  { label: "Chest & Back", sex: "men", category: "upper-specialty", lead: ["Chest", "Back"], support: ["Front delts", "Quads", "Hamstrings"] },
  { label: "Chest & Shoulders", sex: "men", category: "upper-specialty", lead: ["Chest", "Side delts"], support: ["Back", "Triceps", "Quads"] },
  { label: "Chest & Triceps", sex: "men", category: "upper-specialty", lead: ["Chest", "Triceps"], support: ["Back", "Front delts", "Quads"] },
  { label: "Shoulders & Arms", sex: "men", category: "upper-specialty", lead: ["Front delts", "Biceps"], support: ["Side delts", "Triceps", "Quads"] },
  { label: "Back & Biceps", sex: "men", category: "upper-specialty", lead: ["Back", "Biceps"], support: ["Chest", "Quads", "Hamstrings"] },
  { label: "Legs", sex: "men", category: "lower-specialty", lead: ["Quads", "Hamstrings"], support: ["Chest", "Back", "Front delts"] },

  // --- women ---
  { label: "Back & Biceps", sex: "women", category: "upper-specialty", lead: ["Back", "Biceps"], support: ["Glutes", "Chest", "Side delts"] },
  { label: "Back & Shoulders", sex: "women", category: "upper-specialty", lead: ["Back", "Side delts"], support: ["Glutes", "Chest", "Biceps"] },
  { label: "Back & Glutes", sex: "women", category: "upper-specialty", lead: ["Back", "Glutes"], support: ["Hamstrings", "Chest", "Side delts"] },
  { label: "Glutes & Shoulders", sex: "women", category: "lower-specialty", lead: ["Glutes", "Side delts"], support: ["Hamstrings", "Back", "Chest"] },
  { label: "Glutes & Quads", sex: "women", category: "lower-specialty", lead: ["Glutes", "Quads"], support: ["Hamstrings", "Back", "Chest"] },
  { label: "Glutes & Hamstrings", sex: "women", category: "lower-specialty", lead: ["Glutes", "Hamstrings"], support: ["Quads", "Back", "Chest"] },
  { label: "Chest & Shoulders", sex: "women", category: "upper-specialty", lead: ["Chest", "Side delts"], support: ["Back", "Glutes", "Triceps"] },
  { label: "Chest & Triceps", sex: "women", category: "upper-specialty", lead: ["Chest", "Triceps"], support: ["Back", "Glutes", "Front delts"] },
];

/** Which muscle owns each day, at each frequency.
 *
 * `a` and `b` are the pairing's two muscles; `s0..s2` are its support muscles. The shapes follow the
 * doctrine: a four-day week is two session types run twice (G111), and at five and six days the pair leads
 * most days with the rest of the body given whole days of its own rather than a slot each (G110).
 */
const DAY_PLANS: Record<number, string[]> = {
  3: ["a", "b", "s0"],
  4: ["a", "b", "a", "b"],
  5: ["a", "b", "s0", "a", "b"],
  6: ["a", "b", "s0", "a", "b", "s1"],
};

/** Mon/Tue/Thu/Fri at four days (G111); otherwise consecutive from Monday with the weekend free. */
const DOWS: Record<number, number[]> = {
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 3, 4],
  6: [0, 1, 2, 3, 4, 5],
};

function pick(muscle: string, sex: TemplateSex, index: number): string {
  const pool = muscle === "Glutes" && sex === "men" ? MENS_GLUTES : PICK[muscle] ?? [];
  return pool[index % pool.length];
}

/** One day: the owning muscle takes two consecutive slots, its partner one, then the divider.
 *
 * Two slots rather than one because the emphasised muscle takes CONSECUTIVE slots and opens the day
 * (G106/G109). The divider closes it -- on a leg day that is the end of the session, on a mixed day it
 * marks the leg/upper seam (G102/G110). `deepen` adds the rest. */
function dayFor(p: Pairing, owner: string, partner: string, variant: number): { name: string; slots: (readonly [string, number, number])[] } {
  const divider = owner === "Quads" || owner === "Hamstrings" || owner === "Glutes" ? "Calves" : "Abs";
  return {
    name: owner === partner ? owner : `${owner} & ${partner}`,
    slots: [
      [pick(owner, p.sex, variant), 4, 8],
      [pick(owner, p.sex, variant + 1), 3, 10],
      [pick(partner, p.sex, variant), 3, 12],
      [pick(divider, p.sex, variant), 3, 15],
    ],
  };
}

function build(p: Pairing, frequency: number): TemplateSpec {
  const [a, b] = p.lead;
  const slotFor = (key: string) => (key === "a" ? a : key === "b" ? b : p.support[Number(key.slice(1))]);

  let variant = 0;
  const days = DAY_PLANS[frequency].map((key, i) => {
    const owner = slotFor(key);
    // The partner rotates so the second run of a session type is not a copy of the first: G111 records
    // that the exercises vary between the two runs while the muscle order does not.
    const partner = key === "a" ? b : key === "b" ? a : p.support[(i + 1) % p.support.length];
    const day = dayFor(p, owner, partner, variant);
    variant += 1;
    return day;
  });

  return {
    // "Specialty" in the name, so what kind of program this is survives out of context -- in a saved
    // program list, on a client's screen, anywhere the category heading is not sitting above it.
    name: `${p.label} Specialty — ${["", "", "Two", "Three", "Four", "Five", "Six"][frequency]} Day (${p.sex === "men" ? "Men" : "Women"})`,
    category: p.category,
    sex: p.sex,
    emphasis: p.label,
    dows: DOWS[frequency],
    days,
  };
}

/** Fifty-two specialty templates: every pairing at three, four, five and six days a week. */
export const SPECIALTY_TEMPLATE_SPECS: readonly TemplateSpec[] = PAIRINGS.flatMap((p) =>
  [3, 4, 5, 6].map((frequency) => build(p, frequency)),
);
