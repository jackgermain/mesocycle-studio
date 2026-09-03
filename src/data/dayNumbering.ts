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
