import { test } from "node:test";
import assert from "node:assert/strict";
import {
  KCAL_PER_LB,
  CUT_CAP_PCT,
  HIGH_BF_CUT_CAP_PCT,
  VERY_OVERWEIGHT_BF_PCT,
  leanMassLb,
  activityMultiplier,
  estimateMaintenance,
  cutCapPct,
  applyRateCap,
  weeklyChangeLb,
  dailyDeltaKcal,
  macrosFor,
  buildPlan,
  observedRate,
  correctMaintenance,
  isCuttingTooFast,
  phaseStatus,
} from "../src/shared/nutritionPlan";

// ---- N2: the arithmetic Jack stated outright ------------------------------

test("N2: 500 kcal a day for seven days is a pound", () => {
  assert.equal(dailyDeltaKcal(-1), -500);
  assert.equal(dailyDeltaKcal(1), 500);
  assert.equal(KCAL_PER_LB, 3500);
});

test("N2: the arithmetic is symmetric", () => {
  assert.equal(dailyDeltaKcal(-2), -dailyDeltaKcal(2));
});

test("N2: a 500/day deficit off maintenance is a pound a week, whatever maintenance is", () => {
  const plan = buildPlan({ bodyweightLb: 200, bodyFatPct: 20, sessionsPerWeek: 4, ratePctPerWeek: -0.5, maintenanceKcal: 2800 });
  assert.equal(plan.lbPerWeek, -1);
  assert.equal(plan.dailyDelta, -500);
  assert.equal(plan.targetKcal, 2300);
});

// ---- N3: the cap ----------------------------------------------------------

test("N3: a cut is held at 0.5% of bodyweight a week", () => {
  const r = applyRateCap(-1.5);
  assert.equal(r.pct, -CUT_CAP_PCT);
  assert.equal(r.capped, true);
  assert.equal(r.cap, CUT_CAP_PCT);
});

test("N3: a rate already inside the cap is untouched", () => {
  const r = applyRateCap(-0.3);
  assert.equal(r.pct, -0.3);
  assert.equal(r.capped, false);
});

test("N3: the cap is a percentage, so it is a different pound number at different weights", () => {
  assert.equal(weeklyChangeLb(140, -CUT_CAP_PCT), -0.7);
  assert.equal(weeklyChangeLb(250, -CUT_CAP_PCT), -1.25);
});

test("N3: the cap binds through buildPlan, and says so", () => {
  const plan = buildPlan({ bodyweightLb: 200, bodyFatPct: 18, sessionsPerWeek: 4, ratePctPerWeek: -2 });
  assert.equal(plan.rate.pct, -0.5);
  assert.equal(plan.lbPerWeek, -1);
  assert.ok(plan.cappedNote?.includes("protect muscle"));
});

test("N3: gaining is not capped — Jack gave the surplus arithmetic but no ceiling", () => {
  const r = applyRateCap(1.5);
  assert.equal(r.pct, 1.5);
  assert.equal(r.capped, false);
});

// ---- N5: the raised cap ---------------------------------------------------

test("N5: high body fat lifts the cap to 1%", () => {
  assert.equal(cutCapPct(35), HIGH_BF_CUT_CAP_PCT);
  assert.equal(cutCapPct(20), CUT_CAP_PCT);
  assert.equal(cutCapPct(undefined), CUT_CAP_PCT);
});

test("N5: the threshold is inclusive and unknown body fat gets the strict cap", () => {
  assert.equal(cutCapPct(VERY_OVERWEIGHT_BF_PCT), HIGH_BF_CUT_CAP_PCT);
  assert.equal(cutCapPct(VERY_OVERWEIGHT_BF_PCT - 0.1), CUT_CAP_PCT);
  const plan = buildPlan({ bodyweightLb: 300, ratePctPerWeek: -1, sessionsPerWeek: 3 });
  assert.equal(plan.rate.pct, -CUT_CAP_PCT, "no body fat on file must not unlock the faster cut");
});

// ---- N1: maintenance ------------------------------------------------------

test("N1: Katch-McArdle is used when body fat is known, and needs no sex", () => {
  const m = estimateMaintenance({ bodyweightLb: 200, bodyFatPct: 20, sessionsPerWeek: 4 });
  assert.equal(m.basis, "katch");
  assert.equal(m.leanMassLb, 160);
  // 370 + 21.6 * (160/2.2046) = 370 + 1567.7 = 1937.7 BMR, x1.55
  assert.ok(Math.abs(m.kcal - 3000) < 60, `expected ~3000, got ${m.kcal}`);
});

test("N1: falls back to calories-per-pound when body fat is unknown", () => {
  const m = estimateMaintenance({ bodyweightLb: 200, sessionsPerWeek: 4 });
  assert.equal(m.basis, "bodyweight");
  assert.equal(m.kcal, 3000);
  assert.equal(m.leanMassLb, null);
});

test("activity multiplier rises with training frequency", () => {
  assert.ok(activityMultiplier(1) < activityMultiplier(3));
  assert.ok(activityMultiplier(3) < activityMultiplier(5));
  assert.ok(activityMultiplier(5) < activityMultiplier(6));
  assert.equal(activityMultiplier(undefined), activityMultiplier(3));
});

test("lean mass comes off bodyweight and body fat", () => {
  assert.equal(leanMassLb(200, 25), 150);
  assert.equal(leanMassLb(180, 0), 180);
});

// ---- macros ---------------------------------------------------------------

test("protein is set from lean mass, not scale weight", () => {
  const lean = macrosFor(2500, 250, 30);
  const light = macrosFor(2500, 175, 0.1);
  assert.equal(lean.protein, 175);
  assert.ok(light.protein > lean.protein - 5);
});

test("a steep deficit takes carbs to zero rather than cutting protein", () => {
  const m = macrosFor(1000, 250, 20);
  assert.equal(m.protein, 200);
  assert.ok(m.carbs >= 0);
});

// ---- N6: the scale wins ---------------------------------------------------

function series(startWeight: number, lbPerWeek: number, points: number, everyDays: number, endingDaysAgo = 1) {
  const out: { date: string; weight: number }[] = [];
  const today = new Date("2026-03-01T00:00:00Z");
  for (let i = points - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - endingDaysAgo - i * everyDays);
    // `startWeight` is where they END. Walking backwards, a negative lbPerWeek means they were HEAVIER the
    // further back you go -- hence minus. Getting this sign wrong builds a gaining series and quietly
    // inverts every assertion that depends on the direction of travel.
    const weeks = (i * everyDays) / 7;
    out.push({ date: d.toISOString().slice(0, 10), weight: Math.round((startWeight - lbPerWeek * weeks) * 10) / 10 });
  }
  return out;
}

test("N6: observed rate is measured from dates, not from the number of weigh-ins", () => {
  const today = new Date("2026-03-01T00:00:00Z");
  const dense = series(200, -1, 12, 2);
  const sparse = series(200, -1, 6, 4);
  const a = observedRate(dense, 28, today)!;
  const b = observedRate(sparse, 28, today)!;
  assert.ok(a, "dense series should produce a rate");
  assert.ok(b, "sparse series should produce a rate");
  // Same real-world rate over the same elapsed time, half as many data points.
  assert.ok(Math.abs(a.lbPerWeek - b.lbPerWeek) < 0.15, `${a.lbPerWeek} vs ${b.lbPerWeek}`);
});

test("N6: too few points or too short a span returns nothing rather than a guess", () => {
  const today = new Date("2026-03-01T00:00:00Z");
  assert.equal(observedRate([], 28, today), null);
  assert.equal(observedRate(series(200, -1, 3, 2), 28, today), null, "under the point floor");
  assert.equal(observedRate(series(200, -1, 5, 1), 28, today), null, "under the span floor");
});

test("N6: one noisy morning does not set the trend", () => {
  const today = new Date("2026-03-01T00:00:00Z");
  const clean = series(200, -1, 10, 3);
  const noisy = clean.map((w, i) => (i === 0 ? { ...w, weight: w.weight + 3 } : w));
  const a = observedRate(clean, 28, today)!;
  const b = observedRate(noisy, 28, today)!;
  assert.ok(Math.abs(a.lbPerWeek - b.lbPerWeek) < 0.8, `a spike moved the fit from ${a.lbPerWeek} to ${b.lbPerWeek}`);
});

test("N6: losing faster than intended means maintenance was under-estimated", () => {
  const today = new Date("2026-03-01T00:00:00Z");
  const obs = observedRate(series(200, -2, 10, 3), 28, today)!;
  const c = correctMaintenance(2800, -1, obs)!;
  assert.ok(c.deltaKcal > 0, `expected maintenance to rise, got ${c.deltaKcal}`);
  assert.ok(c.correctedKcal > 2800);
  assert.ok(c.note.includes("under-estimated"));
});

test("N6: losing slower than intended means maintenance was over-estimated", () => {
  const today = new Date("2026-03-01T00:00:00Z");
  const obs = observedRate(series(200, -0.25, 10, 3), 28, today)!;
  const c = correctMaintenance(2800, -1, obs)!;
  assert.ok(c.deltaKcal < 0);
  assert.ok(c.note.includes("over-estimated"));
});

test("N6: a rate on plan produces no correction", () => {
  const today = new Date("2026-03-01T00:00:00Z");
  const obs = observedRate(series(200, -1, 10, 3), 28, today)!;
  assert.equal(correctMaintenance(2800, -1, obs), null);
});

// ---- phase: what the screen says they are doing ---------------------------

test("phase comes from the rate they SET, not from the scale", () => {
  const today = new Date("2026-03-01T00:00:00Z");
  // Holding weight while a cut is set is a failing cut, not maintenance.
  const flat = series(200, 0, 10, 3);
  assert.equal(phaseStatus(-0.5, 20, flat, today).phase, "cut");
  assert.equal(phaseStatus(0.25, 20, flat, today).phase, "gain");
  assert.equal(phaseStatus(0, 20, flat, today).phase, "hold");
});

test("a hair either side of zero is maintenance, not a half-hearted cut", () => {
  assert.equal(phaseStatus(-0.02, 20, [], new Date()).phase, "hold");
  assert.equal(phaseStatus(undefined, 20, [], new Date()).phase, "hold");
});

test("cap usage is null until there is enough scale data to be honest", () => {
  const today = new Date("2026-03-01T00:00:00Z");
  assert.equal(phaseStatus(-0.5, 20, [], today).capUsed, null);
  assert.equal(phaseStatus(-0.5, 20, series(200, -1, 3, 2), today).capUsed, null, "under the point floor");
});

test("cap usage reads as a fraction of the cap, and passes 1 when too fast", () => {
  const today = new Date("2026-03-01T00:00:00Z");
  const onPlan = phaseStatus(-0.5, 20, series(200, -1, 10, 3), today);
  assert.ok(onPlan.capUsed !== null && onPlan.capUsed > 0.8 && onPlan.capUsed <= 1.05, `${onPlan.capUsed}`);
  assert.equal(onPlan.tooFast, false);

  const fast = phaseStatus(-0.5, 20, series(200, -2.4, 10, 3), today);
  assert.ok(fast.capUsed !== null && fast.capUsed > 1);
  assert.equal(fast.tooFast, true);
});

test("gaining never reports cap usage — there is no cap on a surplus", () => {
  const today = new Date("2026-03-01T00:00:00Z");
  const s = phaseStatus(0.5, 20, series(200, 1, 10, 3), today);
  assert.equal(s.capUsed, null);
  assert.equal(s.tooFast, false);
});

test("the raised cap moves the usage fraction, not just the verdict", () => {
  const today = new Date("2026-03-01T00:00:00Z");
  const lean = phaseStatus(-0.5, 18, series(200, -1.6, 10, 3), today);
  const heavy = phaseStatus(-0.5, 35, series(200, -1.6, 10, 3), today);
  assert.ok(lean.capUsed! > heavy.capUsed!, "same loss is a bigger share of a stricter cap");
  assert.equal(lean.tooFast, true);
  assert.equal(heavy.tooFast, false);
});

test("N4: losing past the cap is flagged, not congratulated", () => {
  const today = new Date("2026-03-01T00:00:00Z");
  const fast = observedRate(series(200, -2.4, 10, 3), 28, today)!; // ≈ -1.2 %/wk
  const mid = observedRate(series(200, -1.2, 10, 3), 28, today)!; // ≈ -0.6 %/wk
  const fine = observedRate(series(200, -0.8, 10, 3), 28, today)!; // ≈ -0.4 %/wk
  assert.equal(isCuttingTooFast(fast, 18), true);
  assert.equal(isCuttingTooFast(mid, 18), true);
  assert.equal(isCuttingTooFast(fine, 18), false);
  // Deliberately not a borderline rate: the raised cap has to clearly admit something the strict cap refuses.
  assert.equal(isCuttingTooFast(mid, 35), false, "the raised cap applies to the check too");
  assert.equal(isCuttingTooFast(fast, 35), true, "even the raised cap is still a cap");
});
