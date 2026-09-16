/** N13: the week-over-week review that moves somebody's calories.
 *
 * Jack: "the algorithm is taking my weigh-ins that I have inputted so far and is formulating a
 * week-over-week average which will be compared to after all of the weigh-ins next week. And then that is
 * when the new macros will come in." And on the step sizes: "#2 but this is for weeks 2-4. after that just
 * 50 cal to -100 cal changes depending."
 *
 * The load-bearing assertions are the gates, not the arithmetic. This is the only rule in the app that
 * changes what somebody eats without being asked each time, so "does nothing" has to be provable for auto
 * off, for an incomplete week, for a goal that is being met, and inside the cooldown.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { weeklyIntakeReview, weeklyRates } from "../src/shared/weeklyIntakeReview";
import { mondayOfWeek, phaseWeekOf, weekAverages, weekOverWeekRate } from "../src/shared/nutritionPlan";
import type { ClientProfile } from "../src/data/types";

/** Monday 2026-09-21. The two complete weeks before it are Sep 7-13 and Sep 14-20. */
const MONDAY = new Date(2026, 8, 21);
const w = (date: string, weight: number) => ({ date, weight });

/** Two complete weeks, scale flat. */
const FLAT = [
  w("2026-09-07", 203), w("2026-09-09", 203.2), w("2026-09-11", 202.9),
  w("2026-09-14", 203.1), w("2026-09-16", 203), w("2026-09-18", 203.1),
];

/** The same two weeks, second one 1.6 lb heavier. */
const DRIFTING_UP = [
  w("2026-09-07", 203), w("2026-09-09", 203.2), w("2026-09-11", 202.9),
  w("2026-09-14", 204.7), w("2026-09-16", 204.6), w("2026-09-18", 204.7),
];

const profile = (over: Partial<ClientProfile> = {}): ClientProfile =>
  ({
    name: "Jax",
    nutritionMode: "macros",
    autoNutrition: true,
    bodyweight: 203,
    maintenanceKcal: 3380,
    rateTargetPct: 0,
    nutritionPhaseStartedAt: "2026-09-07",
    macroTargets: { kcal: 3379, protein: 203, carbs: 482, fat: 71, trainingDayCarbBonus: 0 },
    portionTargets: [],
    weighInsPerWeek: 3,
    weighInDays: ["Mon", "Wed", "Fri"],
    ...over,
  }) as ClientProfile;

test("weeks are Mon-Sun, and built from local parts so no timezone shifts them", () => {
  assert.equal(mondayOfWeek("2026-09-21"), "2026-09-21", "a Monday is its own week start");
  assert.equal(mondayOfWeek("2026-09-20"), "2026-09-14", "Sunday belongs to the week that opened it");
  assert.equal(mondayOfWeek("2026-09-16"), "2026-09-14");
});

test("a week's average is the mean of its weigh-ins, and empty weeks are absent", () => {
  const avgs = weekAverages(FLAT);
  assert.equal(avgs.length, 2);
  assert.deepEqual(avgs.map((a) => a.weekStart), ["2026-09-07", "2026-09-14"]);
  assert.deepEqual(avgs.map((a) => a.points), [3, 3]);
  assert.equal(avgs[0].average, 203.03);
});

test("the week-over-week rate is one average minus the other — checkable by hand", () => {
  const r = weekOverWeekRate(DRIFTING_UP, MONDAY)!;
  // (204.67 - 203.03) = 1.64, and the two weeks are one week apart, so that IS the weekly rate.
  assert.equal(r.lbPerWeek, 1.64);
  assert.equal(r.spanDays, 7);
  assert.equal(r.points, 6);
});

test("the current week is excluded — a week judged on Tuesday is two mornings against seven", () => {
  const withThisWeek = [...FLAT, w("2026-09-21", 300), w("2026-09-22", 300)];
  const r = weekOverWeekRate(withThisWeek, MONDAY)!;
  assert.equal(r.to, "2026-09-14", "the in-progress week is not compared");
  assert.ok(Math.abs(r.lbPerWeek) < 1, "and its absurd numbers do not reach the rate");
});

test("a week with one weigh-in is not an average", () => {
  const thin = [w("2026-09-07", 203), w("2026-09-09", 203.2), w("2026-09-11", 202.9), w("2026-09-14", 210)];
  assert.equal(weekOverWeekRate(thin, MONDAY), null, "one morning is that morning's noise, not a week");
});

test("non-adjacent weeks are not a weekly rate", () => {
  // A fortnight away from the scale: the difference spans more than a week and calling it a weekly rate
  // would overstate it by however long the gap was.
  const gap = [
    w("2026-08-24", 203), w("2026-08-26", 203),
    w("2026-09-14", 199), w("2026-09-16", 199),
  ];
  assert.equal(weekOverWeekRate(gap, MONDAY), null);
});

test("two complete weeks count as fourteen days of scale, so the first change can land", () => {
  // The threshold N12 checks is STALL_MIN_SPAN_DAYS = 14. Measuring Monday-to-Monday would report 7 and
  // a stall could never be called on the second week — which is exactly when Jack expects the first change.
  const { overall } = weeklyRates(FLAT, MONDAY);
  assert.equal(overall!.spanDays, 14);
});

test("phase week counts from the phase start, first week being 1", () => {
  assert.equal(phaseWeekOf("2026-09-21", MONDAY), 1);
  assert.equal(phaseWeekOf("2026-09-15", MONDAY), 1);
  assert.equal(phaseWeekOf("2026-09-14", MONDAY), 2);
  assert.equal(phaseWeekOf("2026-08-31", MONDAY), 4);
  assert.equal(phaseWeekOf(undefined, MONDAY), undefined, "unknown, so the full steps stand");
});

test("auto nutrition off changes nothing, ever", () => {
  assert.equal(weeklyIntakeReview(profile({ autoNutrition: false, rateTargetPct: -0.5 }), FLAT, MONDAY), null);
  assert.equal(weeklyIntakeReview(profile({ autoNutrition: undefined, rateTargetPct: -0.5 }), FLAT, MONDAY), null);
});

test("portions mode has no calorie target to move", () => {
  assert.equal(weeklyIntakeReview(profile({ nutritionMode: "portions", rateTargetPct: -0.5 }), FLAT, MONDAY), null);
});

test("one complete week is not enough to compare", () => {
  const oneWeek = FLAT.slice(3);
  assert.equal(weeklyIntakeReview(profile({ rateTargetPct: -0.5 }), oneWeek, MONDAY), null);
});

test("a cut with the scale flat for two weeks pulls 150 (N12)", () => {
  const r = weeklyIntakeReview(profile({ rateTargetPct: -0.5 }), FLAT, MONDAY)!;
  assert.equal(r.kind, "stall");
  assert.equal(r.deltaKcal, -150);
  assert.equal(r.maintenanceKcal, 3230, "the delta lands on maintenance, which the macros derive from");
});

test("the same stall past week 4 pulls 100, not 150 (N13)", () => {
  // Jack: "#2 but this is for weeks 2-4. after that just 50 cal to -100 cal changes depending."
  const r = weeklyIntakeReview(profile({ rateTargetPct: -0.5, nutritionPhaseStartedAt: "2026-08-03" }), FLAT, MONDAY)!;
  assert.ok(r.phaseWeek! >= 5, `expected a late phase week, got ${r.phaseWeek}`);
  assert.equal(r.deltaKcal, -100);
});

test("a gain goal with a flat scale ADDS rather than pulls", () => {
  const r = weeklyIntakeReview(profile({ rateTargetPct: 0.25 }), FLAT, MONDAY)!;
  assert.equal(r.deltaKcal, 150);
  assert.ok(r.maintenanceKcal > 3380);
});

test("holding steady with a flat scale is success, not a stall", () => {
  // The branch that would be easiest to get backwards: a hold goal being met must never be nudged.
  assert.equal(weeklyIntakeReview(profile({ rateTargetPct: 0 }), FLAT, MONDAY), null);
});

test("holding steady while drifting up pulls calories (MY CALL — N12 has no hold rule)", () => {
  const r = weeklyIntakeReview(profile({ rateTargetPct: 0 }), DRIFTING_UP, MONDAY)!;
  assert.equal(r.kind, "drift");
  assert.equal(r.deltaKcal, -150, "the correction opposes the drift");
  assert.equal(r.maintenanceKcal, 3230);
});

test("nothing fires twice inside the cooldown week", () => {
  const justAdjusted = profile({
    rateTargetPct: -0.5,
    lastNutritionAdjustment: { date: "2026-09-19", kind: "stall", deltaKcal: -150 },
  });
  assert.equal(weeklyIntakeReview(justAdjusted, FLAT, MONDAY), null, "a change needs a week of scale under it");
});

test("the hold branch respects the cooldown too", () => {
  const justAdjusted = profile({
    rateTargetPct: 0,
    lastNutritionAdjustment: { date: "2026-09-19", kind: "stall", deltaKcal: -150 },
  });
  assert.equal(weeklyIntakeReview(justAdjusted, DRIFTING_UP, MONDAY), null);
});

test("a cut losing at the intended rate is left alone", () => {
  const losing = [
    w("2026-09-07", 204), w("2026-09-09", 204), w("2026-09-11", 204),
    w("2026-09-14", 203), w("2026-09-16", 203), w("2026-09-18", 203),
  ];
  // -1 lb/wk on a 203 lb person aiming at -0.5%/wk is roughly the plan.
  assert.equal(weeklyIntakeReview(profile({ rateTargetPct: -0.5 }), losing, MONDAY), null);
});
