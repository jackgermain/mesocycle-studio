import { useStore } from "./store";
import type { ClientProfile } from "../data/types";

/** The active account's own profile — now that the coach edits a client's nutrition settings by writing
 * straight into that same client_state row (via StoreProvider accountId), there's nothing left to merge. */
export function useEffectiveProfile(): ClientProfile {
  const { state } = useStore();
  return state.profile;
}
