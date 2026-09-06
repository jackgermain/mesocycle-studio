/** The shape of a session, before any exercise is chosen.
 *
 * This is Jack's answer to "how do you write week one", turned into slots. Nothing here picks an
 * exercise; it decides what *kind* of thing goes in each position, which is the part he described as a
 * fixed procedure rather than a judgement call.
 *
 * > *"I would definitely give them a full body split. So on the first day you're starting with a chest
 * > exercise, the second day you're starting with a back exercise, and the third day you're starting
 * > with a leg exercise. But each day you still do a little bit of full body."*
 *
 * > *"As far as exercise selection, I would just go from the top down. So what's the most important?
 * > Compounds. Bang for your buck."*
 *
 * > *"The third exercise, at this point on, I would start trying to prioritise accessories -- smaller
 * > body parts. You don't really need much more compound lifting unless you're really trying to lift
 * > like a bodybuilder, and this specific person and demographic doesn't really need that. At the end of
 * > the session you're usually finishing with really small body parts, like abs or forearms or calves."*
 */

import { PATTERNS, REGION_OF, type Pattern, type Region } from "./patterns";

export type SlotRole = "lead" | "second" | "accessory" | "finisher";

export interface Slot {
  index: number;
  role: SlotRole;
  /** Set for the two compound slots. Accessory and finisher slots are chosen by muscle, not pattern. */
  pattern?: Pattern;
  /** True when this slot specifically wants the erectors working -- an unsupported row or a hinge. */
  wantsErectors?: boolean;
  /** Size tier the accessory slots draw from: 1 is medium, 2 is small. */
  muscleTier?: 1 | 2;
}

export type WeekPlan = Slot[][];

/** Which region leads each day. Three days is the case Jack described in full; the others are extended
 * from the same idea and are the least confident thing in this file. */
const LEAD_ROTATION: Record<number, Region[]> = {
  2: ["push", "pull"],
  3: ["push", "pull", "legs"],
  4: ["push", "pull", "legs", "push"],
};

/** How many exercises a session gets, by how often the person trains.
 *
 * Jack said "somewhere between nine and twelve". His own programs say that is the *two-day* number:
 * across ten real clients the two-day sessions average 9.8 exercises, the three-day 8.4, and the
 * four-day 6.8. Fewer sessions means more work in each one, which is the sensible reading. */
export const EXERCISES_PER_SESSION: Record<number, number> = { 2: 10, 3: 9, 4: 7 };

/** The last N slots of a session go to small muscles -- abs, calves, forearms. */
const FINISHERS = 2;

/** Patterns kept out of the compound slots by default.
 *
 * Overhead pressing is excluded, and the reason is empirical rather than a stated rule. Jack's own week
 * puts a *second horizontal* press on day two -- *"if we did incline dumbbell press on Monday, I'd
 * probably have it be a flat variation"* -- rather than reaching for the untouched vertical push, and
 * the same choice cascades into day three taking the vertical pull he specified. With overhead pressing
 * in the pool this planner disagrees with him on two of six compound slots; with it out, it reproduces
 * his week exactly. Which is a strong hint, not a confirmation: it may be a considered choice about
 * shoulders in a middle-aged general-population client, or it may be an artifact of one example. Flagged
 * in the doctrine as an open question rather than settled here. */
export const DEFAULT_EXCLUDED: readonly Pattern[] = ["vertical push"];

/** Pick the second compound of a day.
 *
 * Jack's stated rule is only that it must be a different body part from the lead: *"the second exercise,
 * since you're still early on in the session, would probably be something that's not the same body
 * part."* What resolves it further is his own worked week -- push day takes a pull second, pull day
 * takes a push second, and the leg day takes whatever has gone longest untrained:
 *
 *   D1 incline dumbbell press (h. push)  ->  vertical pull
 *   D2 unsupported row (h. pull)         ->  a press
 *   D3 squat                             ->  vertical pull, *"because we haven't done one since day one"*
 *
 * So push and pull complement each other, and legs fall through to the gap rule. Within whichever
 * category wins, the sub-pattern is the one longest unscheduled -- which is why D1 takes the *vertical*
 * pull: the horizontal one is already spoken for as day two's lead. */
function secondFor(
  leadRegion: Region,
  scheduled: Map<Pattern, number>,
  day: number,
  exclude: readonly Pattern[],
): Pattern {
  const complement: Partial<Record<Region, Region>> = { push: "pull", pull: "push" };
  const wanted = complement[leadRegion];
  const pool = PATTERNS.filter(
    (p) => !exclude.includes(p) && (wanted ? REGION_OF[p] === wanted : REGION_OF[p] !== leadRegion),
  );
  // Longest unscheduled wins. Never-scheduled beats everything; a pattern already claimed by a later
  // day's lead counts as scheduled, which is what steers day one onto the vertical pull.
  let best = pool[0];
  let bestGap = -Infinity;
  for (const p of pool) {
    const last = scheduled.get(p);
    const gap = last === undefined ? Infinity : day - last;
    if (gap > bestGap) {
      best = p;
      bestGap = gap;
    }
  }
  return best;
}

export function planWeek(
  daysPerWeek: number,
  opts: { exercisesPerSession?: number; exclude?: readonly Pattern[] } = {},
): WeekPlan | undefined {
  const leads = LEAD_ROTATION[daysPerWeek];
  if (!leads) return undefined;
  const exclude = opts.exclude ?? DEFAULT_EXCLUDED;
  const count = opts.exercisesPerSession ?? EXERCISES_PER_SESSION[daysPerWeek] ?? 9;
  if (count < 3) return undefined;

  // Seed the ledger with every day's lead before choosing any second, so a pattern that is about to be
  // a lead later in the week is not also handed to an earlier day's second slot.
  const leadPattern: Pattern[] = leads.map((r) =>
    r === "push" ? "horizontal push" : r === "pull" ? "horizontal pull" : "squat",
  );
  const scheduled = new Map<Pattern, number>();
  leadPattern.forEach((p, d) => {
    if (!scheduled.has(p)) scheduled.set(p, d);
  });

  const week: WeekPlan = [];
  for (let d = 0; d < daysPerWeek; d++) {
    const lead = leadPattern[d];
    const second = secondFor(leads[d], scheduled, d, exclude);
    scheduled.set(second, d);

    const slots: Slot[] = [
      // The back lead is the one place Jack asks for the erectors specifically -- an unsupported row or
      // a hex bar deadlift, "so that the spinal erectors get stressed".
      { index: 0, role: "lead", pattern: lead, wantsErectors: leads[d] === "pull" },
      { index: 1, role: "second", pattern: second },
    ];
    const accessories = count - 2 - FINISHERS;
    for (let i = 0; i < accessories; i++) {
      slots.push({ index: slots.length, role: "accessory", muscleTier: 1 });
    }
    for (let i = 0; i < FINISHERS; i++) {
      slots.push({ index: slots.length, role: "finisher", muscleTier: 2 });
    }
    week.push(slots);
  }
  return week;
}

export function describeWeek(week: WeekPlan): string {
  return week
    .map((day, i) =>
      [
        `Day ${i + 1}`,
        ...day.map((s) => {
          if (s.pattern) return `  ${s.index + 1}. ${s.pattern}${s.wantsErectors ? " (erectors)" : ""}`;
          return `  ${s.index + 1}. ${s.role === "finisher" ? "small muscle" : "accessory"}`;
        }),
      ].join("\n"),
    )
    .join("\n");
}
