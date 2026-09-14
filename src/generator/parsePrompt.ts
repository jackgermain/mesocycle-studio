/** What someone typed or said, turned into options for the generator.
 *
 * Jack's ask: "a text box or a microphone where you can tell the algorithm what you're looking for, and then
 * you click generate, and then it will take the feedback and what you're looking for into account".
 *
 * Deliberately deterministic rather than a model call. `select.ts` already sets out why: the ranking work is
 * "a ranking, not a judgement call, so it is scored rather than asked of a model", and a model sits on top of
 * that reordering a shortlist it cannot leave. The same applies here -- "5 days a week, dumbbells only, focus
 * on glutes" is extraction, not interpretation. It costs nothing per press, it cannot invent a constraint
 * nobody asked for, and it can show its working.
 *
 * That last point is the design rule: `understood` is what the screen shows back BEFORE generating, so a
 * person can see it read "4 days" when they said "for a while" and correct it, rather than being handed a
 * program built on a misreading.
 */

import type { EmphasisProfile } from "./coverage";
import type { GoalPriority } from "./weeklyVolume";
import type { Equipment } from "../data/types";

export interface ParsedPrompt {
  daysPerWeek?: number;
  profile?: EmphasisProfile;
  goal?: GoalPriority;
  /** Restricts what exercises may be chosen. Absent means allow everything. */
  equipment?: Equipment[];
  /** Small muscles asked for by name -- they are opt-in, see WEEKLY_TARGETS. */
  wants: string[];
  /** What was recognised, in plain words, to put in front of the person before anything is generated. */
  understood: string[];
}

const NUMBER_WORDS: Record<string, number> = {
  two: 2, three: 3, four: 4, five: 5, six: 6,
};

/** Days a week, from "5 days", "5x", "five times a week", "5 day split". Clamped to what planWeek supports. */
function readDays(s: string): number | undefined {
  const digit = s.match(/\b([2-6])\s*(?:x|×|\s*-?\s*day|days?|times?)\b/);
  if (digit) return Number(digit[1]);
  for (const [word, n] of Object.entries(NUMBER_WORDS)) {
    if (new RegExp(`\\b${word}\\s*(?:x|×|days?|times?)\\b`).test(s)) return n;
  }
  return undefined;
}

/** Jack's emphasis vocabulary (G108, G112). The app's own type is only two values wide, so each label maps
 * onto the nearest profile AND a goal ordering -- the pairings he actually names cannot be expressed by the
 * profile alone, which is exactly what G112 records. */
const EMPHASES: { match: RegExp; label: string; profile: EmphasisProfile; goal: GoalPriority }[] = [
  { match: /\bglute|\bbutt\b|\blower body\b|\blegs?\b/, label: "lower body", profile: "glute-priority", goal: "lower-aesthetic" },
  { match: /\bchest\b.*\btriceps?\b|\btriceps?\b.*\bchest\b/, label: "chest & triceps", profile: "upper-priority", goal: "upper-aesthetic" },
  { match: /\bback\b.*\bbiceps?\b|\bbiceps?\b.*\bback\b/, label: "back & biceps", profile: "upper-priority", goal: "upper-aesthetic" },
  { match: /\bchest\b.*\bback\b|\bback\b.*\bchest\b/, label: "chest & back", profile: "upper-priority", goal: "upper-aesthetic" },
  { match: /\barms?\b|\bshoulders?\b|\bdelts?\b/, label: "arms & shoulders", profile: "upper-priority", goal: "upper-aesthetic" },
  { match: /\bupper body\b|\bupper\b/, label: "upper body", profile: "upper-priority", goal: "upper-aesthetic" },
];

/** Only read as a restriction when the wording is exclusive. "I have dumbbells" is not "dumbbells only", and
 * narrowing the library on a passing mention would quietly gut the program. */
const EQUIPMENT_WORDS: { match: RegExp; equipment: Equipment; label: string }[] = [
  { match: /\bdumbbells?\b|\bdb\b/, equipment: "dumbbell", label: "dumbbells" },
  { match: /\bbarbells?\b|\bbb\b/, equipment: "barbell", label: "barbell" },
  { match: /\bmachines?\b/, equipment: "machine", label: "machines" },
  { match: /\bcables?\b/, equipment: "cable", label: "cables" },
  { match: /\bbodyweight\b|\bno equipment\b|\bno gym\b/, equipment: "bodyweight", label: "bodyweight" },
];
const EXCLUSIVE = /\bonly\b|\bnothing but\b|\bjust\b|\ball i have\b|\ball i've got\b/;

const WANTS: { match: RegExp; muscle: string }[] = [
  { match: /\babs?\b|\bcore\b|\bstomach\b/, muscle: "Abs" },
  { match: /\bcalves\b|\bcalf\b/, muscle: "Calves" },
  { match: /\bforearms?\b|\bgrip\b/, muscle: "Forearms" },
  { match: /\btraps?\b/, muscle: "Traps" },
];

export function parsePrompt(text: string): ParsedPrompt {
  const s = (text ?? "").toLowerCase();
  const understood: string[] = [];

  const daysPerWeek = readDays(s);
  if (daysPerWeek) understood.push(`${daysPerWeek} days a week`);

  // First match wins, and the pairings are listed before the single-muscle patterns on purpose: "chest and
  // triceps" contains "chest", and the broader rule would otherwise swallow the more specific one.
  const emphasis = EMPHASES.find((e) => e.match.test(s));
  if (emphasis) understood.push(`${emphasis.label} emphasis`);

  const equipment = EXCLUSIVE.test(s)
    ? EQUIPMENT_WORDS.filter((e) => e.match.test(s))
    : [];
  if (equipment.length) understood.push(`${equipment.map((e) => e.label).join(" and ")} only`);

  const wants = WANTS.filter((w) => w.match.test(s)).map((w) => w.muscle);
  if (wants.length) understood.push(`include ${wants.join(" and ").toLowerCase()}`);

  return {
    daysPerWeek,
    profile: emphasis?.profile,
    goal: emphasis?.goal,
    equipment: equipment.length ? equipment.map((e) => e.equipment) : undefined,
    wants,
    understood,
  };
}
