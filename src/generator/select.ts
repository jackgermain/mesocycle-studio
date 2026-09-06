/** Layer 3: turning a slot into a named exercise.
 *
 * The layers above decide that day two opens with a horizontal pull that loads the erectors, three sets
 * of twelve, 120 seconds rest. This decides that it is a Barbell Bent-Over Row rather than a Seated Cable
 * Row -- and refuses to pick one at all if the person only owns dumbbells.
 *
 * Everything here is deterministic and explainable. Jack's *"I would just go from the top down -- what's
 * the most important? Compounds, bang for your buck"* is a ranking, not a judgement call, so it is scored
 * rather than asked of a model. What a model is genuinely better at -- "which of these three would this
 * particular person enjoy and stick with" -- sits on top of this and reorders a shortlist it cannot leave.
 */

import type { Equipment } from "../data/types";
import { equipmentOf } from "../screens/exerciseHelpers";
import { libraryExercises } from "../coach/exerciseLibrary";
import type { LibraryExercise } from "../coach/types";
import { patternOf } from "./patterns";
import { loadingProfileOf } from "./swap";
import type { Slot } from "./sessionStructure";

export interface SelectionContext {
  /** What the gym actually has. Omit to allow everything. The band-and-dumbbells client is the reason
   * this exists: a program full of cable work is worse than useless to them. */
  equipment?: ReadonlySet<Equipment>;
  /** Names already placed this week -- the same movement twice in a week is almost never wanted. */
  usedThisWeek?: ReadonlySet<string>;
  /** Names used in the block that just ended. P4 and section 10: a new block should look new. */
  usedLastBlock?: ReadonlySet<string>;
  /** Exercises ruled out for this person -- injury, joint pain, or they simply hate it. */
  exclude?: ReadonlySet<string>;
  /** Defaults to the shipped library; a coach's custom exercises can be appended. */
  library?: readonly LibraryExercise[];
}

export interface Selection {
  exercise: LibraryExercise;
  score: number;
  /** Why this one, in a sentence, so a coach reviewing the draft can disagree with the reason rather
   * than only with the result. */
  why: string;
}

const norm = (s: string) => s.trim().toLowerCase();

function has(set: ReadonlySet<string> | undefined, name: string): boolean {
  if (!set) return false;
  for (const s of set) if (norm(s) === norm(name)) return true;
  return false;
}

/** Candidates for a compound slot: the library entries that actually perform that movement pattern. */
function forPattern(lib: readonly LibraryExercise[], slot: Slot): LibraryExercise[] {
  return lib.filter((e) => patternOf(e.name)?.pattern === slot.pattern);
}

/** Candidates for an accessory slot: the right muscle, and *not* a compound.
 *
 * The compound slots are already bought by the time these are filled, and putting a second bench press
 * in slot 5 would spend a slot on something the session has had. Accessories are the isolation work --
 * curls, raises, extensions, machine single-joint movements. */
function forMuscle(lib: readonly LibraryExercise[], muscle: string): LibraryExercise[] {
  return lib.filter((e) => e.muscle === muscle && !patternOf(e.name));
}

/** Second-choice candidates for an accessory slot: a compound for that muscle.
 *
 * Only reached when no isolation movement survives the equipment filter -- which is exactly the
 * dumbbells-and-a-pull-up-bar case, where quad and hamstring isolation is almost entirely machines. The
 * client has no leg extension and no leg curl, but they do have a Bulgarian split squat and a dumbbell
 * RDL, and a coach would obviously write those rather than leave the slot empty. The tiering has to
 * happen *after* filtering for equipment, not before: the library is full of leg extensions, so asking
 * "does isolation exist" of the whole library always says yes and never falls through. */
function compoundsForMuscle(lib: readonly LibraryExercise[], muscle: string): LibraryExercise[] {
  return lib.filter((e) => e.muscle === muscle && !!patternOf(e.name));
}

/** Score a candidate. Higher is better; the reasons are additive and each one is stated. */
function score(e: LibraryExercise, slot: Slot, ctx: SelectionContext): { n: number; why: string[] } {
  const why: string[] = [];
  let n = 0;

  if (slot.wantsErectors) {
    // The day-two lead specifically wants an unsupported row or a hinge -- "a type of row that is not
    // chest supported so that the spinal erectors get stressed".
    if (patternOf(e.name)?.loadsErectors) {
      n += 4;
      why.push("loads the erectors, which this slot asks for");
    } else {
      n -= 4;
    }
  }
  if (has(ctx.usedThisWeek, e.name)) {
    n -= 10;
  } else {
    n += 1;
  }
  if (has(ctx.usedLastBlock, e.name)) {
    n -= 3;
    why.push("was in the last block, so it is a weaker pick for a fresh one");
  } else if (ctx.usedLastBlock?.size) {
    n += 2;
    why.push("new since the last block");
  }
  if (e.hasVideo) {
    n += 1;
    why.push("has a demo video");
  }
  // Free weights first for the compound slots. They are the ones where the loading is least constrained
  // and where P3's "this is where the progression lands" actually pays.
  if (slot.role === "lead" && loadingProfileOf(e.name) === "free") {
    n += 2;
    why.push("free weight, which is where a lead compound belongs");
  }
  return { n, why };
}

/** Pick the exercise for one slot, or nothing if the equipment cannot support it. */
export function selectForSlot(slot: Slot, ctx: SelectionContext = {}): Selection | undefined {
  const lib = ctx.library ?? libraryExercises;
  const usable = (candidates: LibraryExercise[]) => {
    const out = candidates.filter((e) => !has(ctx.exclude, e.name));
    return ctx.equipment ? out.filter((e) => ctx.equipment!.has(equipmentOf(e))) : out;
  };

  // Tiers, best first. Each is filtered for equipment before the next is considered.
  const tiers: LibraryExercise[][] = slot.pattern
    ? [forPattern(lib, slot)]
    : slot.muscle
      ? [forMuscle(lib, slot.muscle), compoundsForMuscle(lib, slot.muscle)]
      : [];

  let pool: LibraryExercise[] = [];
  for (const tier of tiers) {
    pool = usable(tier);
    if (pool.length) break;
  }
  if (!pool.length) return undefined;

  let best: Selection | undefined;
  for (const e of pool) {
    const { n, why } = score(e, slot, ctx);
    if (!best || n > best.score) {
      best = {
        exercise: e,
        score: n,
        why: why.length ? why.join("; ") : "the only sensible fit for this slot",
      };
    }
  }
  return best;
}

export interface FilledSlot extends Slot {
  selection?: Selection;
}

/** Fill a whole week, threading "already used" through so a movement is not repeated across days. */
export function selectForWeek(week: Slot[][], ctx: SelectionContext = {}): FilledSlot[][] {
  const used = new Set<string>(ctx.usedThisWeek ?? []);
  return week.map((day) =>
    day.map((slot) => {
      const selection = selectForSlot(slot, { ...ctx, usedThisWeek: used });
      if (selection) used.add(selection.exercise.name);
      return { ...slot, selection };
    }),
  );
}

/** What could not be filled, and why -- the honest output when the equipment does not cover the plan.
 *
 * A generator that quietly drops a slot produces a program that looks complete and is not. This makes
 * the gap visible so a coach can add an exercise, change the split, or accept it. */
export function unfilled(week: FilledSlot[][]): { day: number; slot: Slot }[] {
  const out: { day: number; slot: Slot }[] = [];
  week.forEach((day, i) =>
    day.forEach((s) => {
      if (!s.selection) out.push({ day: i + 1, slot: s });
    }),
  );
  return out;
}
