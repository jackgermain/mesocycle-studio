/** Layer 4: the bridge from a planned, filled week to something the app can actually open.
 *
 * The three layers below this already existed and none of them was reachable. `planWeek` decides the shape
 * of the week, `selectForWeek` puts a named exercise in each slot, and `profileFor` says how many sets and
 * reps that slot gets. What was missing was the last hop: turning that into `DraftDay[]`, which is the shape
 * the CSV importer and the AI importer already produce and which `buildProgramFromDraft` already turns into
 * a real Program.
 *
 * Emitting a draft rather than a Program is the whole point. Everything downstream — the review step, the
 * edit-before-you-accept, the save path, assignment to a client — exists and is used by two other importers.
 * A generator that wrote a Program directly would have to reinvent all of it and would skip the review.
 *
 * Nothing here decides anything about training. It is a translation, and it is deliberately dull.
 */

import type { FilledSlot } from "./select";
import { profileFor } from "./sessionStructure";
import type { DraftDay, DraftExercise } from "../shared/programConvert";

/** What a slot came out as when no exercise could be found for it.
 *
 * `selectForWeek` leaves `selection` undefined when the equipment does not cover the slot, and `unfilled()`
 * reports those. They are carried into the draft as a named placeholder rather than dropped: a generator
 * that silently omits a slot produces a program that looks complete and is not, and the person reviewing it
 * would have no way to see what went missing. */
export const UNFILLED_NAME = "— pick an exercise —";

export interface ToDraftOptions {
  /** Day names, in order. Defaults to "Day 1", "Day 2"… which is what the from-scratch builder uses. */
  dayNames?: readonly string[];
  /** Pushes the opening slots toward lower reps. Passed straight through to `profileFor`. */
  strengthBias?: number;
  strengthEmphasis?: boolean;
}

function nameFor(slot: FilledSlot): string {
  return slot.selection?.exercise.name ?? UNFILLED_NAME;
}

/** The muscle to file the exercise under.
 *
 * The library's answer wins when there is one, because that is what the rest of the app books volume
 * against. Falling back to the slot's own muscle matters for the accessory and finisher slots, which are
 * chosen BY muscle rather than by pattern -- and for an unfilled slot, where it is the only thing known. */
function muscleFor(slot: FilledSlot): string {
  return slot.selection?.exercise.muscle ?? slot.muscle ?? "";
}

/** One planned, filled week to the draft the builder and the coach's assign screen both already accept. */
export function weekToDraftDays(week: FilledSlot[][], opts: ToDraftOptions = {}): DraftDay[] {
  return week.map((day, dayIndex) => {
    const exercises: DraftExercise[] = day.map((slot) => {
      const profile = profileFor(slot, day.length, {
        strengthBias: opts.strengthBias,
        strengthEmphasis: opts.strengthEmphasis,
      });
      return {
        name: nameFor(slot),
        muscle: muscleFor(slot),
        sets: profile.sets,
        reps: profile.reps,
        // Deliberately no `load`. The generator knows the shape of the week, not what this person can
        // lift, and inventing a number here would put a confident fiction in front of a coach. Left for
        // the builder's own default, exactly as a from-scratch build behaves.
        loadMode: "lb",
      };
    });
    return { name: opts.dayNames?.[dayIndex] ?? `Day ${dayIndex + 1}`, exercises };
  });
}

/** The slots that came back without an exercise, as day/slot positions into the draft.
 *
 * Returned separately rather than folded into the draft so a caller can show "three slots need an exercise"
 * without walking the structure itself looking for a magic string. */
export function unfilledPositions(week: FilledSlot[][]): { day: number; index: number; muscle: string }[] {
  const out: { day: number; index: number; muscle: string }[] = [];
  week.forEach((day, d) =>
    day.forEach((slot, i) => {
      if (!slot.selection) out.push({ day: d, index: i, muscle: slot.muscle ?? slot.pattern ?? "" });
    }),
  );
  return out;
}
