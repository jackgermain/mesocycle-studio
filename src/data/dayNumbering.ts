import type { TrainingDay } from "./types";

const CODE_ORDER: Record<string, number> = { U1: 1, L1: 2, U2: 3, L2: 4 };

/** Client-facing sessions are numbered by position in the week (Day 1..4), not by muscle-group label. */
export function dayNumberInWeek(day: Pick<TrainingDay, "code">): number {
  return CODE_ORDER[day.code] ?? 1;
}

export function dayDisplayTitle(day: Pick<TrainingDay, "code">): string {
  return `Day ${dayNumberInWeek(day)}`;
}
