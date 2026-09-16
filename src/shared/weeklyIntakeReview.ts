import type { ClientProfile } from "../data/types";
import {
  intakeAdjustment,
  mondayOfWeek,
  phaseWeekOf,
  weekAverages,
  weekOverWeekRate,
  MIN_POINTS_PER_WEEK,
  LATE_PHASE_FROM_WEEK,
  LATE_STALL_ADJUST_KCAL,
  STALL_ADJUST_KCAL,
  STALL_PCT_PER_WEEK,
  round,
  type AdjustmentKind,
  type ObservedRate,
  type WeekAverage,
} from "./nutritionPlan";

/** The weekly check that moves somebody's calories, N13.
 *
 * Jack: "make sure that since I have auto nutrition enabled, that the algorithm is taking my weigh-ins that
 * I have inputted so far and is formulating a week-over-week average which will be compared to after all of
 * the weigh-ins next week. And then that is when the new macros will come in."
 *
 * That sentence settles what `nutrition-v1.md` listed as undecided — "N12 is written but wired to nothing…
 * what is undecided is *when* it runs and whether it applies itself or is offered for approval." It runs
 * when a week is complete, and with auto nutrition on it applies itself.
 *
 * ## Why the delta lands on maintenance rather than on the macros
 *
 * `deriveNutritionTargets` recomputes the macros from maintenance and the rate on every read. Anything
 * written straight to `macroTargets` is overwritten on the next render — so an adjustment applied there
 * would appear to work and be gone by the time the screen repainted. Folding it into `maintenanceKcal` is
 * also the truthful place for it: a stall MEANS the maintenance estimate was wrong, which is N6's whole
 * premise. The macros then follow on their own, through one path, and the two can never disagree.
 *
 * ## Two rates, both hand-checkable
 *
 * `recent` is Jack's week-over-week average — last complete week against the one before it. `overall` is
 * the first qualifying week against the last, per week. N12 needs both: a stall is judged on the fuller
 * trend, a taper on the recent one having fallen to under half of it. Building both out of weekly averages
 * rather than the 28-day least-squares fit keeps the whole decision checkable with a calculator, which is
 * the property Jack asked for and the one `observedRate` cannot offer.
 *
 * Nothing here is written by this module. It returns a decision; the caller dispatches it.
 */

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00`) - Date.parse(`${a}T00:00:00`)) / 86400000);
}

export interface WeeklyRates {
  /** Complete weeks with enough weigh-ins to average, oldest first. */
  weeks: WeekAverage[];
  /** Last complete week against the one before it. */
  recent: ObservedRate | null;
  /** First qualifying week against the last, expressed per week. */
  overall: ObservedRate | null;
}

export function weeklyRates(weighIns: { date: string; weight: number }[], today = new Date()): WeeklyRates {
  // Only COMPLETE weeks: today's own week is excluded, because a week judged on Tuesday is two mornings
  // being compared against seven. That exclusion is also the trigger Jack described — the comparison
  // happens once the week's weigh-ins are all in, which is to say once the week is over.
  const thisWeekStart = mondayOfWeek(isoOf(today));
  const weeks = weekAverages(weighIns).filter((w) => w.weekStart < thisWeekStart && w.points >= MIN_POINTS_PER_WEEK);
  const recent = weekOverWeekRate(weighIns, today);
  if (weeks.length < 2) return { weeks, recent, overall: null };

  const first = weeks[0];
  const last = weeks[weeks.length - 1];
  const weeksApart = daysBetween(first.weekStart, last.weekStart) / 7;
  const lbPerWeek = round((last.average - first.average) / weeksApart, 2);
  return {
    weeks,
    recent,
    overall: {
      lbPerWeek,
      pctPerWeek: round((lbPerWeek / (first.average || last.average)) * 100, 2),
      // Two complete weeks IS fourteen days of scale, so the span counts whole weeks of data rather than
      // the distance between their Mondays. Measuring Monday-to-Monday would report 7 for two full weeks
      // and fall a day short of STALL_MIN_SPAN_DAYS, so a stall could never be called on the second week —
      // which is exactly when Jack expects the first change.
      spanDays: daysBetween(first.weekStart, last.weekStart) + 7,
      points: weeks.reduce((n, w) => n + w.points, 0),
      from: first.weekStart,
      to: last.weekStart,
    },
  };
}

function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export interface WeeklyReview {
  kind: AdjustmentKind | "drift";
  /** Signed: negative pulls calories, positive adds them. */
  deltaKcal: number;
  /** What `maintenanceKcal` should become. The macros are derived from it, so this is the only write. */
  maintenanceKcal: number;
  observed: ObservedRate;
  weeks: { prior: WeekAverage; latest: WeekAverage };
  phaseWeek?: number;
  note: string;
}

/** Whether this week's scale should move the intake, and to what.
 *
 * Null means leave it alone, which is the answer most weeks. */
export function weeklyIntakeReview(
  profile: ClientProfile,
  weighIns: { date: string; weight: number }[],
  today = new Date(),
): WeeklyReview | null {
  // This is the one rule in the app that changes what somebody eats without being asked each time, so it
  // runs only where they have asked for it standing.
  if (profile.autoNutrition !== true) return null;
  if (profile.nutritionMode !== "macros") return null;
  if (profile.maintenanceKcal == null || profile.rateTargetPct == null) return null;

  const { weeks, recent, overall } = weeklyRates(weighIns, today);
  if (!recent || !overall || weeks.length < 2) return null;

  const prior = weeks[weeks.length - 2];
  const latest = weeks[weeks.length - 1];
  const phaseWeek = phaseWeekOf(profile.nutritionPhaseStartedAt, today);
  const finish = (kind: WeeklyReview["kind"], deltaKcal: number, observed: ObservedRate, note: string) => ({
    kind,
    deltaKcal,
    maintenanceKcal: Math.round((profile.maintenanceKcal! + deltaKcal) / 10) * 10,
    observed,
    weeks: { prior, latest },
    phaseWeek,
    note,
  });

  const rate = profile.rateTargetPct;
  const goal = rate < -0.05 ? "lose" : rate > 0.05 ? "gain" : null;

  /* MY CALL, and flagged to Jack as one: N12 has no rule for a maintenance goal.
   *
   * Every branch of it is written for "lose" or "gain" — a stall is a problem only when you meant to be
   * moving. Someone holding steady whose scale is flat is succeeding, and must not be nudged. But someone
   * holding steady who has drifted past the flat band is off their target in exactly the way N12 exists to
   * catch, and a literal wiring would ignore them forever. Jack's own account sits at rate 0, so without
   * this the whole feature would do nothing for him.
   *
   * The correction opposes the drift and takes the stall step, since a drift off maintenance is the same
   * size of error as a stall on a cut. It is deliberately NOT routed through intakeAdjustment: that would
   * read the drift as "moving the wrong way" and decline to act, which is the right answer for a goal that
   * has a direction and the wrong one for a goal that does not. */
  if (goal === null) {
    if (Math.abs(overall.pctPerWeek) < STALL_PCT_PER_WEEK) return null;
    if (recentlyAdjusted(profile, today)) return null;
    const late = (phaseWeek ?? 0) >= LATE_PHASE_FROM_WEEK;
    const step = late ? LATE_STALL_ADJUST_KCAL : STALL_ADJUST_KCAL;
    const drifting = overall.lbPerWeek > 0;
    const deltaKcal = drifting ? -step : step;
    return finish(
      "drift",
      deltaKcal,
      overall,
      `Holding steady, but the scale is ${drifting ? "up" : "down"} ${Math.abs(overall.lbPerWeek)} lb a week — ` +
        `${drifting ? "pull" : "add"} ${step} calories.`,
    );
  }

  const adj = intakeAdjustment({
    goal,
    weighIns,
    today,
    lastAdjustment: profile.lastNutritionAdjustment,
    phaseWeek,
    rates: { overall, recent },
  });
  if (!adj) return null;
  return finish(adj.kind, adj.deltaKcal, adj.observed, adj.note);
}

/** The cooldown, for the drift branch. `intakeAdjustment` enforces its own for the N12 branches; this is
 * the same week of scale under a change before it can be judged. */
function recentlyAdjusted(profile: ClientProfile, today: Date): boolean {
  const last = profile.lastNutritionAdjustment;
  return !!last && daysBetween(last.date, isoOf(today)) < 7;
}
