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
import { fillAccessories, planCoverage, type EmphasisProfile } from "./coverage";
import type { GoalPriority } from "./weeklyVolume";

/** What a compound slot already covers, so the accessory slots do not buy it a second time. */
const PATTERN_MUSCLE: Record<Pattern, string> = {
  "horizontal push": "Chest",
  "vertical push": "Front delts",
  "horizontal pull": "Back",
  "vertical pull": "Back",
  squat: "Quads",
  hinge: "Hamstrings",
  "single leg": "Quads",
};

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
  /** Which muscle an accessory or finisher slot is for, from the frequency-dependent coverage budget. */
  muscle?: string;
}

export type WeekPlan = Slot[][];

/** Which region leads each day. Three days is the case Jack described in full; the others are extended
 * from the same idea and are the least confident thing in this file. */
const LEAD_ROTATION: Record<EmphasisProfile, Record<number, Region[]>> = {
  "upper-priority": {
    2: ["push", "pull"],
    3: ["push", "pull", "legs"],
    4: ["push", "pull", "legs", "push"],
    5: ["push", "pull", "legs", "push", "pull"],
    6: ["push", "pull", "legs", "push", "pull", "legs"],
  },
  // "For girls, I always have at least two leg days -- a lot of them want three." So legs lead twice
  // even in a three-day week, and chest drops to one exposure, which is what he prescribes.
  "glute-priority": {
    2: ["legs", "pull"],
    3: ["legs", "pull", "legs"],
    4: ["legs", "pull", "legs", "push"],
    5: ["legs", "pull", "legs", "push", "pull"],
    6: ["legs", "pull", "legs", "push", "pull", "legs"],
  },
};

/** A *hint* at how many exercises a session gets. Deliberately not a rule.
 *
 * Jack's correction, after seeing this derived from training frequency: *"definitely don't measure [it]
 * for the amount of days per week, because that just goes with how serious you are about training."* The
 * causal variable is commitment; frequency is only correlated with it.
 *
 * The correlation is nonetheless strong enough to seed a default, across his ten clients plus his own
 * 6x program:
 *
 * | Days/week | Mean exercises/session | Weekly total |
 * |---|---|---|
 * | 2 | 9.8 | 19.6 |
 * | 3 | 8.4 | 25.2 |
 * | 4 | 6.8 | 27.2 |
 * | 6 (his own) | **5.5** | **33.0** |
 *
 * Per-session count falls, weekly total climbs. So this is what to *offer*, and the caller overrides it
 * from what the person will actually do. */
export const EXERCISES_PER_SESSION: Record<number, number> = { 2: 10, 3: 8, 4: 7, 5: 6, 6: 6 };

/** The last N slots of a session go to small muscles -- abs, calves, forearms. */
const FINISHERS = 2;

/** Patterns kept out of the compound slots by default.
 *
 * Overhead pressing, and now for a stated reason rather than an inference from one example:
 *
 * > *"There's nothing wrong with overhead pressing, but I don't like it very much, because it primarily
 * > just works the anterior deltoid, which gets a lot of work from regular chest work -- especially
 * > incline pressing, which will get your upper chest. And it's not going to cosmetically change that
 * > much. It's more of a very strength-based exercise. If I was working with an athlete, we might be
 * > doing some shoulder presses if he's a basketball player and he needs strength in that specific
 * > motion. But the chest is just of much more importance."*
 *
 * So it is excluded on a **cost-benefit** basis, not a safety one: the anterior delt is already paid for
 * by incline work, and the marginal cosmetic return does not justify the slot. That makes the exception
 * precise -- restore it when the goal is sport strength in that motion, not when the client is younger
 * or healthier. With it excluded this planner reproduces his worked week on all six compound slots.
 */
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
  opts: {
    exercisesPerSession?: number;
    exclude?: readonly Pattern[];
    profile?: EmphasisProfile;
    /** Which priority ordering the sets band is spent against. */
    goal?: GoalPriority;
    /** Optional muscles the client has actually asked for -- calves, traps, forearms, abs. */
    wants?: readonly string[];
  } = {},
): WeekPlan | undefined {
  const profile = opts.profile ?? "upper-priority";
  const leads = LEAD_ROTATION[profile][daysPerWeek];
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

  // Spread the week's coverage plan across its days rather than repeating the same accessories daily.
  const coverage = planCoverage(daysPerWeek, count, profile, opts.wants ?? []);
  const muscleLedger = new Map<string, number>();
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
    for (const p of [lead, second]) {
      const m = PATTERN_MUSCLE[p];
      muscleLedger.set(m, (muscleLedger.get(m) ?? 0) + 1);
    }
    const { accessories, finishers } = fillAccessories(
      Math.max(0, count - 2 - FINISHERS),
      coverage,
      muscleLedger,
      FINISHERS,
      { goal: opts.goal },
    );
    for (const m of accessories) {
      slots.push({ index: slots.length, role: "accessory", muscleTier: 1, muscle: m });
    }
    for (const m of finishers) {
      slots.push({ index: slots.length, role: "finisher", muscleTier: 2, muscle: m });
    }
    week.push(slots);
  }
  return week;
}


/** Reps, sets and rest as a function of where in the session a slot sits.
 *
 * Measured off Jack's own 6x program -- 41 sessions, tiered T1 through T7 in his own notation, which is
 * the same "top down by importance" idea written out explicitly:
 *
 * | Slot | Mean reps | Mean sets |
 * |---|---|---|
 * | 1 | **5.6** | 3.1 |
 * | 2 | 10.4 | 2.7 |
 * | 3 | 10.6 | 2.1 |
 * | 4-5 | ~11 | 2.3 |
 * | last | **20.6** | 2.1 |
 *
 * Three distinct zones, not a smooth gradient: **one heavy low-rep opener, a long middle around ten to
 * twelve, and a high-rep finisher.** Sets descend monotonically.
 *
 * Note the opener is 5.6 reps in *his* training and would be higher for a general-population client --
 * C3 puts hypertrophy at 6-30 and his clients' programs run 10-20. The shape transfers; the absolute
 * numbers are an advanced lifter's. `strengthBias` scales the opener toward it. */
export interface SlotProfile {
  reps: number;
  sets: number;
  restSec: number;
}

/** Rest, which is a range rather than a number, and is prescribed for a reason.
 *
 * > *"I usually don't go too crazy about rest times -- it's usually when the other person is ready... In
 * > your first two exercises, maybe your first three, those are the ones you're trying to get pretty
 * > strong on, so you want rest to be a little bit longer. I usually err on the side of a minute thirty
 * > at the lowest to three minutes, or three thirty even on occasions. The reason for that is the ATP
 * > regeneration between sets -- for strength specifically, stressing your ATP-creatine phosphate
 * > system. It takes about 3 to 5 minutes to fully replenish it, so somewhere around two, two and a
 * > half is around 80%, which is decent."*
 *
 * So the number is not arbitrary and it is not a comfort setting: **it is buying phosphocreatine back.**
 * Full replenishment takes 3-5 minutes; roughly 2:00-2:30 recovers about 80% of it, and that is the
 * trade he is making on the exercises where strength matters.
 *
 * > *"But it also really depends on the client. If they don't care about that as much, I might keep it
 * > between 45 seconds at the very lowest -- and that's pretty uncommon -- to somewhere around two
 * > minutes... And then as the session goes on the rest can come down a little bit, so probably around a
 * > minute to a minute and a half, for smaller muscles that don't require as much energy and are more
 * > accessory-type muscles."*
 *
 * Note what is *not* here: a rule that pins the second down. His actual instruction is "when the other
 * person is ready", and these are the bounds he keeps that inside. */
export const REST_BANDS = {
  /** First two or three exercises, for someone who wants to get strong on them. */
  strength: { min: 90, target: 150, max: 210 },
  /** The same slots, for a client who does not care about strength as much. */
  general: { min: 45, target: 90, max: 120 },
  /** Later in the session -- smaller, accessory muscles that cost less energy. */
  accessory: { min: 60, target: 75, max: 90 },
} as const;

/** How many opening slots count as the strength end of the session. *"Your first two exercises, maybe
 * your first three."* */
export const STRENGTH_SLOTS = 2;

export function restFor(slotIndex: number, strengthEmphasis = false): number {
  if (slotIndex >= STRENGTH_SLOTS) return REST_BANDS.accessory.target;
  return strengthEmphasis ? REST_BANDS.strength.target : REST_BANDS.general.target;
}

/** How many sets an exercise needs, which depends on what else the session does for that muscle.
 *
 * > *"One set isn't enough of any exercise. If you're gonna have two sets on an exercise, they better be
 * > really, really unbelievably hard and heavy, or it's because you're doing another exercise afterwards
 * > that works the same muscle. **If this is the only exercise for that muscle you're doing that day, you
 * > should be doing a minimum of three sets.** Assuming you train it only twice a week -- if you train it
 * > twice a week you should be doing three or four for sure. If you're training that muscle three times a
 * > week, you might be able to get away with three, maybe four at most."*
 *
 * The default of two sets was wrong for any muscle a session touches once, which in a three-day full-body
 * split is most of them. */
export function minSetsFor(opts: {
  onlyExerciseForMuscleToday: boolean;
  weeklyFrequency: number;
}): number {
  if (!opts.onlyExerciseForMuscleToday) return 2;
  return 3;
}

export function maxSetsFor(weeklyFrequency: number): number {
  return weeklyFrequency >= 3 ? 4 : 4;
}

export function profileFor(
  slot: Slot,
  total: number,
  opts: { strengthBias?: number; strengthEmphasis?: boolean } = {},
): SlotProfile {
  const bias = opts.strengthBias ?? 0;
  const i = slot.index;
  const restSec = restFor(i, opts.strengthEmphasis ?? bias > 0.5);
  if (i === 0) return { reps: Math.round(12 - 6 * bias), sets: 3, restSec };
  if (i === 1) return { reps: Math.round(12 - 2 * bias), sets: 3, restSec };
  if (i === total - 1) return { reps: 20, sets: 2, restSec };
  return { reps: 12, sets: 2, restSec };
}

export function describeWeek(week: WeekPlan): string {
  return week
    .map((day, i) =>
      [
        `Day ${i + 1}`,
        ...day.map((s) => {
          const p = profileFor(s, day.length);
          const what = s.pattern
            ? `${s.pattern}${s.wantsErectors ? " (erectors)" : ""}`
            : `${s.muscle ?? (s.role === "finisher" ? "small muscle" : "accessory")}`;
          return `  ${s.index + 1}. ${what.padEnd(28)} ${p.sets}x${p.reps}, rest ${p.restSec}s`;
        }),
      ].join("\n"),
    )
    .join("\n");
}
