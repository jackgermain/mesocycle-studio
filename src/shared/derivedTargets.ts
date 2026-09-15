import type { ClientProfile } from "../data/types";
import { buildPlan } from "./nutritionPlan";

/** Auto nutrition, actually applied.
 *
 * `autoNutrition` promises, in its own switch text, that "calories and macros are worked out from your
 * maintenance and rate". Nothing worked them out. `macroTargets` is written in exactly one place —
 * NutritionForm's save — so the numbers on the Nutrition tab were whatever was computed the last time
 * somebody opened that form and pressed save, frozen from then on. An account that set nutrition up once
 * and never went back kept its first answer forever, and every later fix to the maintenance formula
 * reached nobody.
 *
 * That is how Jack ended up looking at a 2,699 target with a 2,700 maintenance while his real maintenance
 * is about 3,350: the figure was seeded by a call that passed only bodyweight and body fat, so it could
 * not take the Mifflin-St Jeor branch and fell through to Katch-McArdle at a 1.375 multiplier. Fixing that
 * seed fixed the next person to press save and nobody else. Jack: "this is displaying the incorrect
 * calorie amount so every single person who uses this is going to not make any progress".
 *
 * So the targets are derived on READ instead. Nothing is written and nothing is migrated: the stored
 * numbers stay exactly as they are, and if this derivation is ever wrong the original is still sitting
 * there untouched.
 *
 * The line is drawn where the switch itself draws it. Auto ON means the app works the numbers out, so they
 * are recomputed from the inputs actually stored on the profile — which is the literal meaning of "worked
 * out from your maintenance and rate", and the only reading under which a stale target is a bug rather
 * than a preference. Auto OFF means "the targets you typed stand", so nothing here touches them.
 *
 * When N6's weigh-in correction is wired, it belongs here: pass the corrected figure to buildPlan as
 * `maintenanceKcal` and the rest of this function is unchanged.
 */
export function deriveNutritionTargets(profile: ClientProfile): ClientProfile {
  // "The targets you typed stand." Absent counts as off — HYDRATE replaces `profile` wholesale, so every
  // account saved before this field existed arrives undefined, and those people never opted into derived
  // numbers.
  if (profile.autoNutrition !== true) return profile;
  // Portions mode has no calorie target to derive; its targets are hand sizes.
  if (profile.nutritionMode !== "macros") return profile;
  // Without a rate there is no goal to offset maintenance by, and guessing someone's phase would be worse
  // than showing them the number they last saved.
  if (profile.rateTargetPct == null || !profile.bodyweight) return profile;

  const plan = buildPlan({
    bodyweightLb: profile.bodyweight,
    bodyFatPct: profile.bodyFatPct,
    // All four of N10's inputs, which is the whole point: the old seed omitted them and so could never
    // reach Mifflin-St Jeor, whatever the person had actually entered.
    sex: profile.sex,
    ageYears: profile.ageYears,
    heightCm: profile.heightCm,
    activity: profile.activityLevel,
    ratePctPerWeek: profile.rateTargetPct,
    // Deliberately NOT passing profile.maintenanceKcal: that stored figure is the stale one being
    // corrected. Overriding the estimate with it would derive the same wrong answer, carefully.
  });

  const macroTargets = {
    kcal: plan.macros.kcal,
    protein: plan.macros.protein,
    carbs: plan.macros.carbs,
    fat: plan.macros.fat,
    // Not derived. The training-day bonus is a coaching choice about when to eat the carbs, not an output
    // of the rate, and the plan has no opinion on it.
    trainingDayCarbBonus: profile.macroTargets.trainingDayCarbBonus,
  };

  const unchanged =
    profile.maintenanceKcal === plan.maintenanceKcal &&
    profile.rateTargetLabel === plan.label &&
    profile.macroTargets.kcal === macroTargets.kcal &&
    profile.macroTargets.protein === macroTargets.protein &&
    profile.macroTargets.carbs === macroTargets.carbs &&
    profile.macroTargets.fat === macroTargets.fat;
  // The SAME object when nothing moved, so a profile that is already right stays referentially stable and
  // no consumer re-renders for a recomputation that changed nothing.
  if (unchanged) return profile;

  return { ...profile, maintenanceKcal: plan.maintenanceKcal, rateTargetLabel: plan.label, macroTargets };
}
