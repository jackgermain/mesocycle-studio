/** Auto nutrition's targets, derived on read.
 *
 * The bug: `macroTargets` is written only by NutritionForm's save, so an account that set nutrition up
 * once kept that first answer forever — including when the answer came from a maintenance seed that could
 * not reach Mifflin-St Jeor. Jack was shown a 2,699 target against a real maintenance near 3,350, with the
 * "Auto nutrition programming: On" card sitting directly above it claiming the numbers were worked out
 * from his maintenance and rate.
 *
 * The load-bearing assertions are the two boundaries: auto OFF must never be touched (those targets were
 * typed on purpose), and a profile that is already correct must come back as the SAME OBJECT so nothing
 * re-renders forever.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveNutritionTargets } from "../src/shared/derivedTargets";
import { estimateMaintenance, kcalFromMacros } from "../src/shared/nutritionPlan";
import type { ClientProfile } from "../src/data/types";

/** A profile carrying the stale, too-low numbers the old seed produced. */
const profile = (over: Partial<ClientProfile> = {}): ClientProfile =>
  ({
    name: "Jax",
    units: "lb",
    smallestPlate: "2.5",
    heightLabel: "6'1\"",
    bodyweight: 200,
    effortScale: "rir",
    weighInsPerWeek: 3,
    weighInDays: ["Mon", "Wed", "Fri"],
    nutritionMode: "macros",
    macroTargets: { kcal: 2699, protein: 203, carbs: 312, fat: 71, trainingDayCarbBonus: 40 },
    portionTargets: [],
    rateTargetLabel: "Maintenance",
    bodyFatPct: 20,
    sex: "male",
    ageYears: 30,
    heightCm: 185,
    activityLevel: "very",
    maintenanceKcal: 2700,
    rateTargetPct: 0,
    autoNutrition: true,
    ...over,
  }) as ClientProfile;

test("auto OFF is never touched — the targets you typed stand", () => {
  const p = profile({ autoNutrition: false });
  assert.equal(deriveNutritionTargets(p), p, "same object, not merely equal");
});

test("a profile from before the switch existed counts as off", () => {
  const p = profile({ autoNutrition: undefined });
  assert.equal(deriveNutritionTargets(p), p);
});

test("portions mode has no calorie target to derive", () => {
  const p = profile({ nutritionMode: "portions" });
  assert.equal(deriveNutritionTargets(p), p);
});

test("no rate means no goal, so nothing is guessed", () => {
  const p = profile({ rateTargetPct: undefined });
  assert.equal(deriveNutritionTargets(p), p);
});

test("the reported bug: a stale maintenance is corrected upward on read", () => {
  const out = deriveNutritionTargets(profile());
  // Mifflin-St Jeor at 200 lb / 185 cm / 30 / male, x1.725 for "very" — nowhere near the 2,700 that a
  // Katch fallback at x1.375 produced.
  assert.ok(out.maintenanceKcal! > 3200, `expected >3200, got ${out.maintenanceKcal}`);
  assert.notEqual(out.maintenanceKcal, 2700);
});

test("holding steady means the target IS maintenance", () => {
  const out = deriveNutritionTargets(profile({ rateTargetPct: 0 }));
  // Within whole-gram rounding: the target is what the grams come to, never the figure asked for.
  assert.ok(Math.abs(out.macroTargets.kcal - out.maintenanceKcal!) <= 12, `${out.macroTargets.kcal} vs ${out.maintenanceKcal}`);
  assert.equal(out.rateTargetLabel, "Maintenance");
});

test("the derived macros agree with their own calorie line at 4/4/9", () => {
  const t = deriveNutritionTargets(profile()).macroTargets;
  assert.equal(t.kcal, kcalFromMacros(t));
});

test("a cut still lands below the corrected maintenance, not below the stale one", () => {
  const out = deriveNutritionTargets(profile({ rateTargetPct: -0.5 }));
  assert.ok(out.macroTargets.kcal < out.maintenanceKcal!);
  assert.ok(out.macroTargets.kcal > 2700, "a cut off a 3,300 maintenance is still well above the old target");
});

test("the training-day carb bonus is a coaching choice and survives", () => {
  assert.equal(deriveNutritionTargets(profile()).macroTargets.trainingDayCarbBonus, 40);
});

test("the stored activity level is honoured, not a default multiplier", () => {
  const lazy = deriveNutritionTargets(profile({ activityLevel: "sedentary" })).maintenanceKcal!;
  const busy = deriveNutritionTargets(profile({ activityLevel: "extra" })).maintenanceKcal!;
  assert.ok(busy > lazy + 800, `${busy} should far exceed ${lazy}`);
});

test("without sex it still beats the old seed, because activity is no longer dropped", () => {
  // Mifflin is unreachable without sex, so this falls to Katch-McArdle — but at the PAL the person chose
  // rather than the 1.375 the old call defaulted to, which is half the error.
  const out = deriveNutritionTargets(profile({ sex: undefined }));
  const oldSeed = estimateMaintenance({ bodyweightLb: 200, bodyFatPct: 20 }).kcal;
  assert.ok(out.maintenanceKcal! > oldSeed, `${out.maintenanceKcal} should beat the old ${oldSeed}`);
});

test("an already-correct profile comes back as the same object", () => {
  const once = deriveNutritionTargets(profile());
  const twice = deriveNutritionTargets(once);
  assert.equal(twice, once, "no churn: a stable profile must not re-render consumers forever");
});

test("a maintenance figure typed by hand is used, not recomputed over", () => {
  const out = deriveNutritionTargets(profile({ maintenanceKcal: 3500, maintenanceKcalManual: true }));
  assert.equal(out.maintenanceKcal, 3500, "the typed figure stands");
  // And the macros follow it, rather than following the estimate it was overriding.
  assert.ok(Math.abs(out.macroTargets.kcal - 3500) <= 12, `macros should come to ~3500, got ${out.macroTargets.kcal}`);
});

test("an ESTIMATED maintenance is still corrected rather than trusted", () => {
  // The same stale 2,700 as before — unflagged, so it is the seed's output and gets recomputed.
  const out = deriveNutritionTargets(profile({ maintenanceKcal: 2700 }));
  assert.ok(out.maintenanceKcal! > 3200, `expected a correction, got ${out.maintenanceKcal}`);
});

test("a typed maintenance still respects the rate — it sets the baseline, not the target", () => {
  const out = deriveNutritionTargets(profile({ maintenanceKcal: 3500, maintenanceKcalManual: true, rateTargetPct: -0.5 }));
  assert.equal(out.maintenanceKcal, 3500);
  assert.ok(out.macroTargets.kcal < 3500, "a cut off a typed maintenance is still a cut");
});

test("deriving is idempotent", () => {
  const a = deriveNutritionTargets(profile());
  const b = deriveNutritionTargets(deriveNutritionTargets(a));
  assert.deepEqual(b.macroTargets, a.macroTargets);
  assert.equal(b.maintenanceKcal, a.maintenanceKcal);
});
