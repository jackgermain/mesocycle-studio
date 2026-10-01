/** Undoing calories the weekly review took off a maintenance goal that was never drifting.
 *
 * > *"Why are my calories at 3090? My weight stayed pretty much the same all of last week and I've
 * > inputted in the same number every time. I should not be having a calorie decrease… my goal is to
 * > maintain, so why the hell is it changing?"*
 *
 * The maintenance-drift branch was reusing `STALL_PCT_PER_WEEK`, 0.1% a week — about 0.2 lb at his
 * bodyweight, less than one trip to the bathroom. Holding steady read as drifting, and he was charged the
 * full 150 kcal STALL step twice in consecutive weeks. That threshold is fixed. This is the part I missed
 * for the THIRD time today: fixing the rule does nothing about what it has already written into a saved
 * profile. The order repair and the stray-exercise cleanup both needed exactly this and I still did not
 * look for it here.
 *
 * ## Why it clears the pin rather than adding the calories back
 *
 * `APPLY_NUTRITION_ADJUSTMENT` writes `maintenanceKcal` and sets `maintenanceKcalManual`, which is what
 * stops `deriveNutritionTargets` recomputing over it — correct for a real correction, and the reason the
 * reduced figure is stuck rather than drifting back on its own. But only the LAST adjustment is stored, so
 * after two firings there is no record of how much to add back. Clearing the pin is the honest reset: the
 * estimate recomputes from his own bodyweight, body fat, age, height and activity, which is where it came
 * from before the review touched it.
 *
 * ## Narrow on purpose
 *
 * Only a MAINTENANCE goal, and only where an automatic adjustment is actually on record. A cut or a gain
 * that has been corrected from the scale is N6 working as intended and is left alone, and a profile with no
 * `lastNutritionAdjustment` is one the review never touched — its maintenance is his and is not mine to
 * clear. Stamped, so it runs once and never fights a number he types afterwards.
 */
import type { ClientProfile } from "../data/types";

/** Bump to run a new one-time nutrition repair. */
export const NUTRITION_REPAIR_VERSION = 1;

/** Anything inside this of zero is "I want to hold my weight" — the same band weeklyIntakeReview uses to
 * decide a goal has no direction. */
const MAINTENANCE_RATE_BAND = 0.05;

export interface NutritionUndo {
  from: number;
  lastDeltaKcal: number;
}

export function undoDriftAdjustments(
  profile: ClientProfile,
): { profile: ClientProfile; undone: NutritionUndo | null } {
  if ((profile.nutritionRepairVersion ?? 0) >= NUTRITION_REPAIR_VERSION) return { profile, undone: null };

  const stamped = { ...profile, nutritionRepairVersion: NUTRITION_REPAIR_VERSION };
  const last = profile.lastNutritionAdjustment;
  const rate = profile.rateTargetPct;
  const holding = rate != null && Math.abs(rate) <= MAINTENANCE_RATE_BAND;
  if (!last || !holding || profile.maintenanceKcal == null) return { profile: stamped, undone: null };

  const next: ClientProfile = { ...stamped };
  // Unpin, so the estimate is recomputed from his own numbers rather than carrying deltas nobody can total.
  delete next.maintenanceKcalManual;
  delete next.lastNutritionAdjustment;
  // Cleared too, so the first review after this starts from a clean slate rather than treating the repair
  // as its own previous move.
  delete next.autoMaintenanceDelta;

  return { profile: next, undone: { from: profile.maintenanceKcal, lastDeltaKcal: last.deltaKcal } };
}
