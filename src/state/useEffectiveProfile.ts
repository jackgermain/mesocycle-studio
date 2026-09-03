import { useStore, useProfileId } from "./store";
import { getSharedProtocol } from "../shared/nutritionSettings";
import type { ClientProfile } from "../data/types";

/** The active profile's own data, with any protocol their coach has since saved layered on top — a no-op merge for a profile no coach has ever set a protocol for (e.g. someone training themself). */
export function useEffectiveProfile(): ClientProfile {
  const { state } = useStore();
  const profileId = useProfileId();
  const shared = getSharedProtocol(profileId);
  if (!shared) return state.profile;
  return {
    ...state.profile,
    weighInsPerWeek: shared.weighInsPerWeek,
    weighInDays: shared.weighInDays,
    nutritionMode: shared.nutritionMode,
    macroTargets: shared.macroTargets,
    portionTargets: shared.portionTargets,
    rateTargetLabel: shared.rateTargetLabel,
  };
}
