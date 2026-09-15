import { useMemo } from "react";
import { useStore } from "./store";
import type { ClientProfile } from "../data/types";
import { deriveNutritionTargets } from "../shared/derivedTargets";

/** The active account's own profile, with auto nutrition's targets actually worked out.
 *
 * The coach edits a client's nutrition settings by writing straight into that same client_state row (via
 * StoreProvider accountId), so there is nothing left to merge between two profiles. What IS applied here
 * is `autoNutrition`: when it is on, calories and macros are derived from the stored inputs rather than
 * read back frozen from the last time somebody opened the settings form. See derivedTargets.ts for why
 * that is a read and not a migration.
 *
 * Every screen that shows a calorie target goes through this hook, which is the reason the fix lives here
 * rather than in the Nutrition screen: Progress reads the same profile and would otherwise disagree with
 * the Nutrition tab about the same person's numbers. */
export function useEffectiveProfile(): ClientProfile {
  const { state } = useStore();
  return useMemo(() => deriveNutritionTargets(state.profile), [state.profile]);
}
