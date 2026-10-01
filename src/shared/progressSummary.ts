/** Everything the Progress tab shows, computed from what is already stored.
 *
 * ## Derived on read. Nothing here is saved.
 *
 * This is the one rule that matters in this file, and it is written from how often this project has got it
 * wrong: a value computed once and written into the jsonb blob is frozen at its single write point, so a
 * fix to the formula reaches nobody and a wrong number is stuck forever. Jack's calories sat 300 light for
 * a day because of it; his bench sat at 230x3 after the arithmetic behind it had been corrected.
 *
 * Jack, on the new tab: *"Make sure these graphs live update when data is inputted immediately."* They do,
 * because there is nothing to update — type a weigh-in and the day cell, the week average, the delta bar
 * and the verdict are all recomputed on the next render from the same array that just changed.
 */
import type { MealSection, Program, TrainingDay, WeighIn } from "../data/types";
import { mealsOn } from "./mealDays";
import { mondayOfWeek, weekAverages } from "./nutritionPlan";

/** A week of the block, as the Progress tab needs it. */
export interface BlockWeek {
  number: number;
  /** Monday, ISO. Weeks are keyed on this everywhere weigh-ins are grouped. */
  weekStart: string;
  sessionsDone: number;
  sessionsTotal: number;
  isDeload: boolean;
  isCurrent: boolean;
}

function started(day: TrainingDay): boolean {
  return Object.values(day.exercises).some((ex) => ex.sets.some((s) => s.checked));
}

export function blockWeeks(program: Program, todayIso: string): BlockWeek[] {
  const lastTraining = program.weeks.length;
  return program.weeks.map((week, i) => {
    const days = week.days;
    const dates = days.map((d) => d.date).filter(Boolean).sort();
    return {
      number: week.number,
      weekStart: dates.length ? mondayOfWeek(dates[0]) : "",
      sessionsDone: days.filter((d) => d.status === "done").length,
      sessionsTotal: days.length,
      // Named by the phase the program itself carries rather than guessed from the week number -- a block
      // may have no deload at all (C7: not below five sessions a week).
      isDeload: week.phase === "deload",
      isCurrent: i === lastTraining - 1
        ? days.some((d) => d.status !== "done")
        : days.some((d) => d.date <= todayIso) && days.some((d) => d.status !== "done" || d.date === todayIso),
    };
  });
}

/** One weigh-in slot in a week, Monday first. `weight` is null for a day with no reading.
 *
 * Every day is returned, including the empty ones, because a missing day is the point: an average built
 * from three readings is a different number from one built from seven, and a screen that silently averages
 * around the gaps never says which it is showing. */
export interface DayWeight {
  date: string;
  letter: string;
  weight: number | null;
}

const LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

export function weekWeighIns(weighIns: WeighIn[], weekStart: string): DayWeight[] {
  const [y, m, d] = weekStart.split("-").map(Number);
  const byDate = new Map(weighIns.map((w) => [w.date, w.weight]));
  return LETTERS.map((letter, i) => {
    const date = new Date(Date.UTC(y, m - 1, d + i)).toISOString().slice(0, 10);
    return { date, letter, weight: byDate.get(date) ?? null };
  });
}

export interface WeekDelta {
  weekStart: string;
  average: number;
  /** Change from the previous week's average. Null for the first week, which has nothing to compare to. */
  change: number | null;
  points: number;
}

/** Week-over-week change in the average — the number the calorie rule actually reads.
 *
 * *"It doesn't matter if the scale goes up for one day. What we're comparing is the week over week
 * average."* So it is computed and charted directly rather than left to be inferred from a line of daily
 * weights. */
export function weeklyDeltas(weighIns: WeighIn[]): WeekDelta[] {
  const weeks = weekAverages(weighIns);
  return weeks.map((w, i) => ({
    weekStart: w.weekStart,
    average: w.average,
    change: i === 0 ? null : Math.round((w.average - weeks[i - 1].average) * 100) / 100,
    points: w.points,
  }));
}

export interface DayIntake {
  date: string;
  kcal: number;
  /** False when nothing was logged at all, which is different from a day that came in low. */
  logged: boolean;
}

/** Calories eaten per day across a span. Counts the same items the Nutrition tab counts — anything not
 * explicitly un-ticked — so the two screens can never disagree about what a day came to. */
export function dailyIntake(meals: MealSection[], fromIso: string, days: number): DayIntake[] {
  const [y, m, d] = fromIso.split("-").map(Number);
  return Array.from({ length: Math.max(0, days) }, (_, i) => {
    const date = new Date(Date.UTC(y, m - 1, d + i)).toISOString().slice(0, 10);
    const items = mealsOn(meals, date).flatMap((meal) => meal.items.filter((f) => f.eaten !== false));
    return {
      date,
      kcal: Math.round(items.reduce((n, f) => n + f.kcal, 0)),
      logged: items.length > 0,
    };
  });
}

export interface LiftMove {
  name: string;
  /** The top set of the most recent session, formatted the way the rest of the app says it. */
  topSet: string;
  /** Heaviest load lifted in each session, oldest first — the sparkline. */
  history: number[];
  /** What changed against the session before: load, reps, or neither. */
  change: { label: string; direction: "up" | "flat" } | null;
}

/** How a named lift has moved, session by session.
 *
 * Load first, then reps: a jump in weight is the headline even when the reps came down to pay for it, and
 * saying "-1 rep" about a week the bar went up would read as a regression. */
export function liftMoves(program: Program, names: string[], units: string): LiftMove[] {
  const days = program.weeks
    .flatMap((w) => w.days)
    .filter((d) => d.status === "done")
    .sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? -1 : 1));

  return names.map((name) => {
    const sessions: { load: number; reps: number }[] = [];
    for (const day of days) {
      const ex = Object.values(day.exercises).find((e) => e.name === name);
      if (!ex) continue;
      const done = ex.sets.filter((s) => !s.isWarmup && !s.removed && s.checked && s.actual);
      if (done.length === 0) continue;
      const top = done.reduce((best, s) =>
        (s.actual!.load ?? 0) > (best.actual!.load ?? 0) ? s : best, done[0]);
      sessions.push({ load: top.actual!.load ?? 0, reps: top.actual!.reps });
    }

    const latest = sessions[sessions.length - 1];
    const prior = sessions[sessions.length - 2];
    let change: LiftMove["change"] = null;
    if (latest && prior) {
      const dLoad = Math.round((latest.load - prior.load) * 10) / 10;
      const dReps = latest.reps - prior.reps;
      if (dLoad > 0) change = { label: `+${dLoad} ${units}`, direction: "up" };
      else if (dLoad === 0 && dReps > 0) change = { label: `+${dReps} rep${dReps === 1 ? "" : "s"}`, direction: "up" };
      else change = { label: "held", direction: "flat" };
    }

    return {
      name,
      topSet: latest ? `${latest.reps} × ${latest.load} ${units}` : "—",
      history: sessions.map((s) => s.load),
      change,
    };
  });
}
