import { DEFAULT_PROFILE_ID } from "./store";

/**
 * Whether this browser has "created an account" for a given profile — i.e. gone through
 * /invite/:code at least once. Purely a client-side flag for this prototype's UX, not real auth.
 * Marcus is grandfathered in so the existing demo flow keeps working without an invite.
 */
const PREFIX = "mesocycle-account-";

export function hasAccount(profileId: string): boolean {
  if (profileId === DEFAULT_PROFILE_ID) return true;
  try {
    return localStorage.getItem(PREFIX + profileId) === "1";
  } catch {
    return false;
  }
}

export function activateAccount(profileId: string) {
  try {
    localStorage.setItem(PREFIX + profileId, "1");
  } catch {
    // ignore — worst case they're asked to accept the invite again
  }
}
