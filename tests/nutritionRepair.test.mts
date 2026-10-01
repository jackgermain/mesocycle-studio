/** Undoing calories the weekly review took off a maintenance goal that was never drifting.
 *
 * > "Why are my calories at 3090? My weight stayed pretty much the same all of last week and I've inputted
 * > in the same number every time. I should not be having a calorie decrease… my goal is to maintain, so
 * > why the hell is it changing?"
 *
 * The drift branch reused the STALL threshold — 0.1%/week, about 0.2 lb at his bodyweight — so holding
 * steady read as drifting and he was charged the full 150 kcal stall step twice. Fixing the threshold did
 * nothing about the number already written into his profile. That was the third time in one day I fixed a
 * rule and left its damage in place, after the exercise order and the stray exercises.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { undoDriftAdjustments, NUTRITION_REPAIR_VERSION } from "../src/shared/nutritionRepair.ts";
import type { ClientProfile } from "../src/data/types.ts";

const profile = (over: Partial<ClientProfile> = {}): ClientProfile => ({
  name: "Jax",
  nutritionMode: "macros",
  autoNutrition: true,
  bodyweight: 203,
  maintenanceKcal: 3090,
  maintenanceKcalManual: true,
  rateTargetPct: 0,
  lastNutritionAdjustment: { date: "2026-09-28", kind: "stall", deltaKcal: -150 },
  ...over,
}) as ClientProfile;

test("where the total is on record, the exact calories go back and stay pinned", () => {
  const { profile: fixed, undone } = undoDriftAdjustments(profile({ autoMaintenanceDelta: -300 }));
  assert.equal(undone?.restored, 3390, "3090 + the 300 that was taken");
  assert.equal(fixed.maintenanceKcal, 3390);
  assert.equal(fixed.maintenanceKcalManual, true, "pinned, so the formula does not overwrite it");
  assert.equal(fixed.autoMaintenanceDelta, undefined, "the debt is settled");
  assert.equal(fixed.lastNutritionAdjustment, undefined);
  assert.equal(fixed.nutritionRepairVersion, NUTRITION_REPAIR_VERSION);
});

test("where the total is NOT on record, the number is left alone rather than guessed at", () => {
  /* The first version of this cleared the pin so the formula would rebuild the figure, and that threw away
   * a number Jack had typed: "whenever I enable the auto programming it decreases my calories from 3200 to
   * 3090." A repair for an unasked-for change must not make another one. Only the LAST adjustment was ever
   * stored, so after two firings there is nothing to reconstruct from. */
  const { profile: fixed, undone } = undoDriftAdjustments(profile({ maintenanceKcal: 3200 }));
  assert.equal(undone?.restored, null, "says plainly that it could not be recovered");
  assert.equal(fixed.maintenanceKcal, 3200, "untouched");
  assert.equal(fixed.maintenanceKcalManual, true, "and still pinned — the formula never overrides a typed figure");
});

test("it runs once, so a number he types afterwards is never clawed back", () => {
  const once = undoDriftAdjustments(profile({ autoMaintenanceDelta: -300 })).profile;
  const his: ClientProfile = { ...once, maintenanceKcal: 3350, maintenanceKcalManual: true };
  const again = undoDriftAdjustments(his);
  assert.equal(again.undone, null);
  assert.equal(again.profile.maintenanceKcal, 3350);
  assert.equal(again.profile.maintenanceKcalManual, true, "his own figure stands");
});

test("a cut or a gain corrected from the scale is left completely alone", () => {
  // N6 working as intended. Only the maintenance branch was broken, so only it is undone.
  for (const rate of [-0.5, -0.25, 0.3]) {
    const { profile: out, undone } = undoDriftAdjustments(profile({ rateTargetPct: rate }));
    assert.equal(undone, null, `rate ${rate}`);
    assert.equal(out.maintenanceKcalManual, true, `rate ${rate} keeps its correction`);
  }
});

test("a profile the review never touched keeps the maintenance he typed", () => {
  const typed = profile({ lastNutritionAdjustment: undefined, maintenanceKcal: 3350 });
  const { profile: out, undone } = undoDriftAdjustments(typed);
  assert.equal(undone, null);
  assert.equal(out.maintenanceKcal, 3350);
  assert.equal(out.maintenanceKcalManual, true, "not mine to clear — no algorithm wrote it");
});

test("a rate just off zero still counts as holding", () => {
  // The same band weeklyIntakeReview uses to decide a goal has no direction.
  assert.ok(undoDriftAdjustments(profile({ rateTargetPct: 0.04 })).undone);
  assert.equal(undoDriftAdjustments(profile({ rateTargetPct: 0.2 })).undone, null);
});
