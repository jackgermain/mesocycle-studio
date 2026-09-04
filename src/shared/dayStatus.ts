import type { Program, TrainingDay } from "../data/types";

/** Which day is "today" is a fact about the calendar, not something that can be decided once when a
 * program is generated and then stored. It used to be exactly that -- programConvert stamped
 * status: "today" on whichever day matched the generation date, and nothing ever moved it again. Two ways
 * that broke:
 *
 *  - The day after you started a program, the stale marker still pointed at yesterday, and the real
 *    today's day sat at "visible" -- which DayDetail renders as a locked future preview. Every program
 *    became unloggable on its second day.
 *  - Once "week 0" landed, a program generated on a day the pattern doesn't train (start on a Thursday
 *    with a Mon/Tue/Wed/Fri/Sat pattern) produced no matching day at all, so nothing was ever loggable.
 *
 * So it's derived here instead, on read. "done" is the one status that's a real persisted fact -- a
 * session actually happened -- so it always wins. */

function isoToday(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function derive(day: TrainingDay, today: string): TrainingDay {
  if (day.status === "done") return day;
  // On or before today is loggable -- that covers today itself, and also means a session you skipped
  // stays open to log rather than being locked shut the moment its date passes.
  const next: TrainingDay["status"] = day.date <= today ? "today" : "visible";
  return day.status === next ? day : { ...day, status: next };
}

export function withDerivedStatuses(program: Program): Program {
  const today = isoToday();
  let changed = false;

  const weeks = program.weeks.map((week) => {
    let weekChanged = false;
    const days = week.days.map((day) => {
      const out = derive(day, today);
      if (out !== day) weekChanged = true;
      return out;
    });
    if (!weekChanged) return week;
    changed = true;
    return { ...week, days };
  });

  // Nothing scheduled on or before today (a rest day, or a program that starts later this week) would
  // otherwise leave the whole app read-only until that date arrives. Opening the earliest unlogged day
  // keeps training possible -- starting the next session early is always allowed.
  const anyLoggable = weeks.some((w) => w.days.some((d) => d.status === "today"));
  const anyUnlogged = weeks.some((w) => w.days.some((d) => d.status !== "done"));
  if (!anyLoggable && anyUnlogged) {
    let earliest: { wi: number; di: number; date: string } | null = null;
    weeks.forEach((week, wi) =>
      week.days.forEach((day, di) => {
        if (day.status === "done") return;
        if (!earliest || day.date < earliest.date) earliest = { wi, di, date: day.date };
      }),
    );
    if (earliest) {
      const { wi, di } = earliest;
      const week = weeks[wi];
      const days = week.days.slice();
      days[di] = { ...days[di], status: "today" };
      weeks[wi] = { ...week, days };
      changed = true;
    }
  }

  return changed ? { ...program, weeks } : program;
}
