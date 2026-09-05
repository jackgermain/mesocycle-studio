import { MUSCLE_GROUPS, guessMuscleFromLibrary } from "../coach/exerciseLibrary";

const CANONICAL = new Map<string, string>(MUSCLE_GROUPS.map((m) => [m.toLowerCase(), m]));

/** Words that turn up in a program's muscle column but name a *region of the body* rather than a muscle.
 * They arrive from spreadsheet imports (a "Lower" or "Push" column header copied down the rows) and from
 * hand-typed custom exercises. They're harmless in a program listing, but the pump question asks "how was
 * your ___ pump?", and "how was your Lower pump?" is a question about half a body -- there's no single
 * answer, so people either guess or skip it, and the coach gets a number that means nothing.
 *
 * Only listed here where one muscle is the honest answer. "Lower" and "Legs" mean the whole lower body, so
 * they get resolved from the exercise name instead and are deliberately absent. */
const REGION_ALIASES: Record<string, string> = {
  hamstring: "Hamstrings",
  hams: "Hamstrings",
  quad: "Quads",
  quadriceps: "Quads",
  glute: "Glutes",
  calf: "Calves",
  ab: "Abs",
  core: "Abs",
  lats: "Back",
  lat: "Back",
  "upper back": "Back",
  "lower back": "Back",
  bis: "Biceps",
  bicep: "Biceps",
  tris: "Triceps",
  tricep: "Triceps",
  pecs: "Chest",
  pec: "Chest",
  delts: "Side delts",
  delt: "Side delts",
  shoulders: "Side delts",
  shoulder: "Side delts",
  trap: "Traps",
  oblique: "Obliques",
  adductor: "Adductors",
  forearm: "Forearms",
};

/** The muscle to put in front of someone, given how the program happens to have the exercise tagged.
 *
 * Order matters. The tag wins when it's already a real muscle, because a coach who typed "Rear delts" for a
 * face pull meant it. Otherwise the exercise's own name is the better evidence -- the library knows that a
 * "Side Leg Lift" trains glutes even when the sheet it came from filed it under "Lower". */
export function resolveMuscle(taggedMuscle: string, exerciseName: string): string {
  const tag = (taggedMuscle ?? "").trim();
  const canonical = CANONICAL.get(tag.toLowerCase());
  if (canonical) return canonical;

  const fromName = guessMuscleFromLibrary(exerciseName ?? "");
  if (fromName) return fromName;

  const fromPattern = muscleFromMovement(exerciseName ?? "");
  if (fromPattern) return fromPattern;

  const alias = REGION_ALIASES[tag.toLowerCase()];
  if (alias) return alias;

  // Nothing recognised it. The original tag is still the most honest thing to show -- inventing a muscle
  // here would put a confident wrong label on a real person's pain report.
  return tag;
}

/** The library match needs two shared words with an exercise it already knows, which is the right bar for
 * "is this the same movement" but leaves custom and machine-brand names unmatched -- a hand-added "Side Leg
 * Lift" shares nothing with anything in there. This is the coarser second pass: what the movement plainly
 * is, from the one or two words that give it away.
 *
 * Ordered, and first match wins, because the specific cases have to beat the general ones -- a "leg curl"
 * is hamstrings and must be read before the "curl" that means biceps, and a "side leg lift" is glute
 * medius work that must be read before the "leg raise" that means abs. */
const MOVEMENT_PATTERNS: [RegExp, string][] = [
  [/\bleg curl\b|\bhamstring|\bromanian\b|\bgood ?morning\b|\bnordic\b/, "Hamstrings"],
  [/\bside leg\b|\babduct|\bglute\b|\bhip thrust\b|\bkick ?back\b|\bbridge\b/, "Glutes"],
  [/\badduct|\binner thigh\b/, "Adductors"],
  [/\bcalf\b|\bcalves\b|\bheel raise\b|\bsoleus\b/, "Calves"],
  [/\bleg extension\b|\bsquat\b|\bhack\b|\bleg press\b|\blunge\b|\bstep ?up\b|\bsissy\b/, "Quads"],
  [/\btricep|\bpushdown\b|\bskull ?crusher\b|\bdip\b|\bkickback\b|\boverhead extension\b/, "Triceps"],
  [/\blateral raise\b|\bside raise\b|\blateral\b|\bupright row\b/, "Side delts"],
  [/\brear delt\b|\breverse (fly|flye|pec)\b|\bface pull\b/, "Rear delts"],
  [/\bshrug\b|\btrap\b/, "Traps"],
  [/\bwrist\b|\bgrip\b|\bfarmer|\bforearm\b/, "Forearms"],
  [/\boblique\b|\bwood ?chop\b|\btwist\b|\bside bend\b/, "Obliques"],
  [/\brow\b|\bpulldown\b|\bpull ?up\b|\bchin ?up\b|\bpullover\b|\bdeadlift\b|\blat\b/, "Back"],
  [/\bbench\b|\bchest\b|\bfly\b|\bflye\b|\bpec\b|\bpush ?up\b|\bpress ?up\b/, "Chest"],
  [/\boverhead press\b|\bshoulder press\b|\bmilitary press\b|\bfront raise\b|\barnold\b/, "Front delts"],
  [/\bcrunch\b|\bsit ?up\b|\bplank\b|\bleg raise\b|\bhollow\b|\bab wheel\b/, "Abs"],
  [/\bcurl\b/, "Biceps"],
];

function muscleFromMovement(name: string): string | undefined {
  const n = (name ?? "").toLowerCase();
  if (!n) return undefined;
  for (const [pattern, muscle] of MOVEMENT_PATTERNS) if (pattern.test(n)) return muscle;
  return undefined;
}
