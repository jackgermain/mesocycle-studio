import type { TrainingDay } from "./types";

const CODE_ORDER: Record<string, number> = { U1: 1, L1: 2, U2: 3, L2: 4 };

/** Client-facing sessions are numbered by position in the week (Day 1..4), not by muscle-group label. Real
 * programs (buildProgramFromDraft, mergeEditedDraftIntoProgram) use plain "D1"/"D2"/... codes, so that's
 * tried first; CODE_ORDER stays as a fallback for the older upper/lower-split demo data's "U1"/"L1" codes.
 * Without the D-number check, every real day silently fell back to 1 -- always "Day 1", never "Day 2". */
export function dayNumberInWeek(day: Pick<TrainingDay, "code">): number {
  const m = day.code.match(/^D(\d+)$/);
  if (m) return Number(m[1]);
  return CODE_ORDER[day.code] ?? 1;
}

export function dayDisplayTitle(day: Pick<TrainingDay, "code">): string {
  return `Day ${dayNumberInWeek(day)}`;
}

/** "Friday, September 4" -- the one date format every day view uses in its kicker, so today's session, an
 * upcoming preview, and a logged day all read the same way. Today's used to show set progress here
 * instead ("Week 1 · 0 of 15 sets"), which made it the odd one out; the remaining-set count is already
 * shown above the Finish button where it's actually actionable. */
export function friendlyDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

/** The shared kicker for every day view: "Friday, September 4 · Week 1". */
export function dayKicker(day: Pick<TrainingDay, "date">, weekNumber: number): string {
  return `${friendlyDate(day.date)} · Week ${weekNumber}`;
}
