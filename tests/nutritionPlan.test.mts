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
  mifflinStJeorBmr,
  parseHeightToCm,
  feetInchesToCm,
  lbToKg,
  PAL,
  fatPerLbFor,
  FAT_G_PER_LB_MIN,
  FAT_G_PER_LB_MAX,
  FAT_G_PER_LB_MID,
  FAT_G_PER_LB_YOUNG,
  CARB_FLOOR_G,
  intakeAdjustment,
  applyAdjustment,
  STALL_ADJUST_KCAL,
  TAPER_ADJUST_KCAL,
  kcalFromMacros,
  carbsToHitKcal,
  KCAL_PER_G_PROTEIN,
  KCAL_PER_G_CARB,
  KCAL_PER_G_FAT,
  proteinPerLb,
  PROTEIN_G_PER_LB,
  PROTEIN_G_PER_LB_CUT_LO,
  PROTEIN_G_PER_LB_CUT_HI,
  PROTEIN_G_PER_LB_BULK,
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

test("protein is per pound of BODYWEIGHT, not lean mass", () => {
  assert.equal(proteinPerLb(undefined), PROTEIN_G_PER_LB);
  assert.equal(proteinPerLb(0), PROTEIN_G_PER_LB);
  assert.equal(macrosFor(2500, 200, 0).protein, 200);
  // Two people at the same scale weight get the same protein now, whatever their body fat.
  assert.equal(macrosFor(2500, 200, 0).protein, macrosFor(2500, 200, 0).protein);
});

test("a surplus needs the LEAST protein and a deficit the most", () => {
  assert.ok(proteinPerLb(0.5) < proteinPerLb(0), "bulking below maintenance");
  assert.ok(proteinPerLb(0) < proteinPerLb(-0.5), "maintenance below cutting");
  assert.equal(proteinPerLb(0.5), PROTEIN_G_PER_LB_BULK);
  assert.equal(macrosFor(3000, 200, 0.5).protein, Math.round(200 * PROTEIN_G_PER_LB_BULK));
});

test("a cut sits in the 1.1–1.2 band, and steeper means more", () => {
  assert.equal(proteinPerLb(-CUT_CAP_PCT), PROTEIN_G_PER_LB_CUT_HI);
  assert.ok(proteinPerLb(-0.2) >= PROTEIN_G_PER_LB_CUT_LO);
  assert.ok(proteinPerLb(-0.2) < proteinPerLb(-0.4));
});

test("1.2 is the top of the band — nothing goes past it", () => {
  assert.equal(proteinPerLb(-1), PROTEIN_G_PER_LB_CUT_HI);
  assert.equal(proteinPerLb(-3), PROTEIN_G_PER_LB_CUT_HI);
});

test("a steep deficit takes carbs to zero rather than cutting protein", () => {
  const m = macrosFor(1000, 250, -0.5);
  assert.equal(m.protein, Math.round(250 * PROTEIN_G_PER_LB_CUT_HI));
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

// ---- Calories are what the grams come to, not a fifth number to set --------

test("a gram of each macro is worth what every food label says", () => {
  assert.equal(KCAL_PER_G_PROTEIN, 4);
  assert.equal(KCAL_PER_G_CARB, 4);
  assert.equal(KCAL_PER_G_FAT, 9);
});

test("kcalFromMacros adds the grams up at 4/4/9", () => {
  assert.equal(kcalFromMacros({ protein: 180, carbs: 250, fat: 70 }), 2350);
  assert.equal(kcalFromMacros({ protein: 0, carbs: 0, fat: 0 }), 0);
});

test("bumping protein by 10 g moves the calorie line by 40, not by nothing", () => {
  const before = kcalFromMacros({ protein: 180, carbs: 250, fat: 70 });
  const after = kcalFromMacros({ protein: 190, carbs: 250, fat: 70 });
  assert.equal(after - before, 10 * KCAL_PER_G_PROTEIN);
  assert.equal(after - before, 40);
});

test("each macro moves the calorie line by its own factor", () => {
  const base = { protein: 180, carbs: 250, fat: 70 };
  assert.equal(kcalFromMacros({ ...base, carbs: base.carbs + 10 }) - kcalFromMacros(base), 40);
  assert.equal(kcalFromMacros({ ...base, fat: base.fat + 10 }) - kcalFromMacros(base), 90);
});

test("carbsToHitKcal lands exactly on a figure that whole grams can reach", () => {
  // 180 g protein and 70 g fat are 1,350 kcal, and every carb gram adds 4 — so the reachable totals are
  // 1,350 + 4n and nothing between them.
  for (const target of [1750, 2350, 2750, 3350]) {
    const carbs = carbsToHitKcal(target, 180, 70);
    assert.equal(kcalFromMacros({ protein: 180, carbs, fat: 70 }), target);
  }
});

test("carbsToHitKcal gets within one carb gram of a figure that whole grams cannot reach", () => {
  // 1,800 sits between 1,798 and 1,802 and is neither. The calorie line then shows the total the grams
  // really come to, which is the whole point -- showing the 1,800 that was asked for would be the old bug.
  for (const target of [1800, 2000, 2500, 3000]) {
    const carbs = carbsToHitKcal(target, 180, 70);
    const actual = kcalFromMacros({ protein: 180, carbs, fat: 70 });
    assert.ok(Math.abs(actual - target) <= 2, `asked ${target}, landed ${actual}`);
  }
});

test("carbs floor at zero, and the real total is then higher than the figure asked for", () => {
  // 180 g protein and 70 g fat are 1,350 kcal on their own; 1,000 is not reachable without cutting one.
  const carbs = carbsToHitKcal(1000, 180, 70);
  assert.equal(carbs, 0);
  assert.equal(kcalFromMacros({ protein: 180, carbs, fat: 70 }), 1350);
});

test("macrosFor returns four numbers that agree with each other", () => {
  for (const kcal of [1600, 2000, 2500, 3200]) {
    for (const bw of [140, 190, 250]) {
      for (const rate of [-0.5, 0, 0.25]) {
        const m = macrosFor(kcal, bw, rate);
        assert.equal(m.kcal, kcalFromMacros(m), `macrosFor(${kcal}, ${bw}, ${rate}) disagrees with itself`);
      }
    }
  }
});

test("a whole plan's macros agree with their own calorie figure", () => {
  const plan = buildPlan({ bodyweightLb: 200, bodyFatPct: 18, ratePctPerWeek: -0.5 });
  assert.equal(plan.macros.kcal, kcalFromMacros(plan.macros));
  // The target is what was aimed at; whole-gram rounding puts a few calories between the two, which is
  // exactly why the stored figure is the macros' own and not the target.
  assert.ok(Math.abs(plan.macros.kcal - plan.targetKcal) <= 4);
});

// ---- N10: Mifflin-St Jeor, units, and the free-text height field ----------

test("N10: Mifflin-St Jeor, men", () => {
  // 80 kg, 180 cm, 30 years: 800 + 1125 - 150 + 5 = 1780.
  const bmr = mifflinStJeorBmr({ bodyweightLb: 80 * 2.2046226218, heightCm: 180, ageYears: 30, sex: "male" });
  assert.ok(Math.abs(bmr - 1780) < 0.5, `expected ~1780, got ${bmr}`);
});

test("N10: Mifflin-St Jeor, women", () => {
  const bmr = mifflinStJeorBmr({ bodyweightLb: 80 * 2.2046226218, heightCm: 180, ageYears: 30, sex: "female" });
  assert.ok(Math.abs(bmr - 1614) < 0.5, `expected ~1614, got ${bmr}`);
});

test("N10: the two forms differ by exactly 166 kcal, which is why sex had to be stored", () => {
  const common = { bodyweightLb: 190, heightCm: 178, ageYears: 41 };
  const m = mifflinStJeorBmr({ ...common, sex: "male" });
  const f = mifflinStJeorBmr({ ...common, sex: "female" });
  assert.equal(Math.round(m - f), 166);
});

test("N10: pounds convert to kilos and feet/inches to centimetres", () => {
  assert.ok(Math.abs(lbToKg(220.462) - 100) < 0.001);
  assert.equal(feetInchesToCm(5, 11), 180.3);
  assert.equal(feetInchesToCm(6, 0), 182.9);
});

test("N10: the free-text height field is read in every shape it really contains", () => {
  assert.equal(parseHeightToCm(`5' 11"`), 180.3);
  assert.equal(parseHeightToCm("5'11"), 180.3);
  assert.equal(parseHeightToCm("5 ft 11"), 180.3);
  assert.equal(parseHeightToCm("6 ft 1"), 185.4);
  assert.equal(parseHeightToCm("180cm"), 180);
  assert.equal(parseHeightToCm("180 cm"), 180);
  // A bare number is read by its own size: 71 is inches, 180 is centimetres.
  assert.equal(parseHeightToCm("71"), 180.3);
  assert.equal(parseHeightToCm("180"), 180);
});

test("N10: an unusable height is null, never zero", () => {
  assert.equal(parseHeightToCm(""), null);
  assert.equal(parseHeightToCm(undefined), null);
  assert.equal(parseHeightToCm("   "), null);
  assert.equal(parseHeightToCm("tall"), null);
  assert.equal(parseHeightToCm("0"), null);
});

test("N10: PAL is the five tiers Jack gave", () => {
  assert.deepEqual(PAL, { sedentary: 1.2, light: 1.375, moderate: 1.55, very: 1.725, extra: 1.9 });
});

test("N10: Mifflin-St Jeor is used once sex, age and height are all known", () => {
  const m = estimateMaintenance({ bodyweightLb: 208, heightCm: 180.3, ageYears: 34, sex: "male", activity: "moderate" });
  assert.equal(m.basis, "mifflin");
  assert.equal(m.multiplier, 1.55);
});

test("N10: a profile saved before those fields existed still gets a number", () => {
  // HYDRATE replaces `profile` wholesale, so every older account arrives with none of them.
  assert.equal(estimateMaintenance({ bodyweightLb: 208, bodyFatPct: 18 }).basis, "katch");
  assert.equal(estimateMaintenance({ bodyweightLb: 208 }).basis, "bodyweight");
  // Two of the three is not enough to evaluate the formula.
  assert.notEqual(estimateMaintenance({ bodyweightLb: 208, ageYears: 34, heightCm: 180 }).basis, "mifflin");
});

// ---- N11: the fat band and carb priority ----------------------------------

test("N11: fat stays inside 0.25-0.5 g/lb whatever the inputs", () => {
  for (const kcal of [1200, 2000, 2500, 4000]) {
    for (const age of [undefined, 25, 40, 41, 65]) {
      const perLb = fatPerLbFor(kcal, 200, 200, age);
      assert.ok(perLb >= FAT_G_PER_LB_MIN && perLb <= FAT_G_PER_LB_MAX, `${perLb} outside the band`);
    }
  }
});

test("N11: 40 and under start lower in the band than over-40s", () => {
  // A budget roomy enough that the carb floor is not what is driving the answer.
  assert.equal(fatPerLbFor(3400, 200, 200, 30), FAT_G_PER_LB_YOUNG);
  assert.equal(fatPerLbFor(3400, 200, 200, 40), FAT_G_PER_LB_YOUNG, "40 is inclusive");
  assert.equal(fatPerLbFor(3400, 200, 200, 41), FAT_G_PER_LB_MID);
  assert.ok(FAT_G_PER_LB_YOUNG < FAT_G_PER_LB_MID);
});

test("N11: under 200 g of carbs, fat drops to its floor to buy them back", () => {
  const kcal = 2000, bw = 200, protein = 200;
  const perLb = fatPerLbFor(kcal, bw, protein, 30);
  assert.equal(perLb, FAT_G_PER_LB_MIN);
  // And the carbs that buys are more than the starting split would have left.
  const carbsAtFloor = (kcal - protein * 4 - Math.round(FAT_G_PER_LB_MIN * bw) * 9) / 4;
  const carbsAtStart = (kcal - protein * 4 - Math.round(FAT_G_PER_LB_YOUNG * bw) * 9) / 4;
  assert.ok(carbsAtFloor > carbsAtStart);
});

test("N11: macrosFor honours the band and still adds up", () => {
  for (const age of [undefined, 30, 50]) {
    const m = macrosFor(2600, 200, 0, age);
    assert.equal(m.kcal, kcalFromMacros(m));
    assert.ok(m.fat >= Math.round(FAT_G_PER_LB_MIN * 200) - 1);
    assert.ok(m.fat <= Math.round(FAT_G_PER_LB_MAX * 200) + 1);
  }
});

// ---- N12: moving the intake when the scale stalls or tapers ---------------

const N12_TODAY = new Date("2026-03-01T00:00:00Z");

test("N12: two weeks flat pulls 150 when the goal is to lose", () => {
  const flat = series(200, 0, 12, 2);
  const a = intakeAdjustment({ goal: "lose", weighIns: flat, today: N12_TODAY })!;
  assert.ok(a, "a flat fortnight should trigger");
  assert.equal(a.kind, "stall");
  assert.equal(a.deltaKcal, -STALL_ADJUST_KCAL);
});

test("N12: the same stall adds 150 when the goal is to gain", () => {
  const flat = series(200, 0, 12, 2);
  const a = intakeAdjustment({ goal: "gain", weighIns: flat, today: N12_TODAY })!;
  assert.equal(a.kind, "stall");
  assert.equal(a.deltaKcal, STALL_ADJUST_KCAL);
});

test("N12: nothing fires before there are two weeks to judge", () => {
  // Four points over nine days -- enough for a rate, not enough to call a stall.
  const short = series(200, 0, 4, 3);
  assert.equal(intakeAdjustment({ goal: "lose", weighIns: short, today: N12_TODAY }), null);
});

test("N12: losing at the intended rate is left alone", () => {
  const losing = series(200, -1, 12, 2);
  assert.equal(intakeAdjustment({ goal: "lose", weighIns: losing, today: N12_TODAY }), null);
});

test("N12: progress that tapers off pulls 75, not 150", () => {
  const tapering = [
    { date: "2026-02-02", weight: 210.0 },
    { date: "2026-02-05", weight: 209.6 },
    { date: "2026-02-08", weight: 209.1 },
    { date: "2026-02-11", weight: 208.7 },
    { date: "2026-02-14", weight: 208.3 },
    { date: "2026-02-17", weight: 208.2 },
    { date: "2026-02-20", weight: 208.15 },
    { date: "2026-02-23", weight: 208.1 },
    { date: "2026-02-26", weight: 208.05 },
    { date: "2026-02-28", weight: 208.0 },
  ];
  const a = intakeAdjustment({ goal: "lose", weighIns: tapering, today: N12_TODAY })!;
  assert.ok(a, "a tapering trend should trigger");
  assert.equal(a.kind, "taper");
  assert.equal(a.deltaKcal, -TAPER_ADJUST_KCAL);
});

test("N12: gaining when the goal is to lose is not an automatic nudge", () => {
  const wrongWay = series(200, 1, 12, 2);
  assert.equal(intakeAdjustment({ goal: "lose", weighIns: wrongWay, today: N12_TODAY }), null);
});

test("N12: an adjustment never takes it out of protein", () => {
  const before = macrosFor(2600, 200, -0.5, 30);
  const after = applyAdjustment(before, -150, 200);
  assert.equal(after.protein, before.protein);
  assert.equal(after.kcal, kcalFromMacros(after));
  assert.ok(after.kcal < before.kcal);
});

test("N12: fat gives first, and never past its floor or ceiling", () => {
  const bw = 200;
  const floor = Math.round(FAT_G_PER_LB_MIN * bw);
  const ceil = Math.round(FAT_G_PER_LB_MAX * bw);
  const start = macrosFor(2600, bw, 0, 50);
  assert.ok(applyAdjustment(start, -150, bw).fat < start.fat, "fat is what moves first");
  // Repeated pulls cannot drive fat below the floor, or additions above the ceiling.
  let m = start;
  for (let i = 0; i < 12; i++) m = applyAdjustment(m, -150, bw);
  assert.ok(m.fat >= floor, `${m.fat} below the floor`);
  let up = start;
  for (let i = 0; i < 12; i++) up = applyAdjustment(up, 150, bw);
  assert.ok(up.fat <= ceil, `${up.fat} above the ceiling`);
});
