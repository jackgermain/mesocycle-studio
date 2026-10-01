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
 * ## It only moves a number it can move correctly
 *
 * The first version cleared `maintenanceKcalManual` so the formula would rebuild the figure. That threw
 * away a number Jack had typed: with the pin gone, turning auto nutrition on recomputed maintenance from
 * body stats and dropped him from 3200 to the formula's 3090. A repair for an unasked-for change must not
 * make another one.
 *
 * So the figure moves only where the amount is KNOWN. `autoMaintenanceDelta` is the running total, added in
 * the same commit that fixed the threshold — present for anything adjusted since, absent for the firings
 * that caused this. Where it is absent, the number is left exactly as it stands and he is asked to check
 * it, because only the LAST adjustment was ever stored and nobody can reconstruct the rest.
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
  /** The figure restored, when the total to reverse was on record. Null when it was not — the number is
   * then left untouched and the person is asked to check it, because nobody can reconstruct it. */
  restored: number | null;
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
  // The cooldown resets either way: the adjustment that set it should never have fired.
  delete next.lastNutritionAdjustment;

  /* THE PIN STAYS. The first version of this cleared `maintenanceKcalManual` so the formula would rebuild
   * the figure — and that threw away a number Jack had typed. With the pin gone, turning auto nutrition on
   * recomputed maintenance from body stats and dropped him from the 3200 he had entered to the formula's
   * 3090: *"I don't know why it's still changing my calories. Whenever I enable the auto programming it
   * decreases my calories from 3200 to 3090."* A repair for an unasked-for change must not make another one.
   *
   * So the number only moves when the amount to move it by is actually KNOWN. `autoMaintenanceDelta` is the
   * running total, added in the same commit that fixed the threshold — present for anything adjusted since,
   * absent for the two firings that caused this. Where it is absent the figure is left exactly as it stands
   * and he is told to check it, which is the honest answer: nobody can reconstruct what to add back. */
  const delta = profile.autoMaintenanceDelta;
  if (delta === undefined || delta === 0) {
    return { profile: next, undone: { from: profile.maintenanceKcal, lastDeltaKcal: last.deltaKcal, restored: null } };
  }
  next.maintenanceKcal = profile.maintenanceKcal - delta;
  next.maintenanceKcalManual = true;
  delete next.autoMaintenanceDelta;
  return {
    profile: next,
    undone: { from: profile.maintenanceKcal, lastDeltaKcal: last.deltaKcal, restored: next.maintenanceKcal },
  };
}
