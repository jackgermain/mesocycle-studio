import { findInviteForClient } from "./invites";
import { DEFAULT_PROFILE_ID } from "../state/store";

/** Whether this profile is free to build their own program from scratch or clone a coach template —
 * true for a "friend/family" invite and for anyone training themself with no coach relationship at all
 * (no invite on file), false for Marcus and any explicitly "client" invite, who wait on their coach to
 * prescribe a program. */
export function canSelfBuildProgram(profileId: string): boolean {
  if (profileId === DEFAULT_PROFILE_ID) return false;
  const invite = findInviteForClient(profileId);
  return invite ? invite.role === "friend" : true;
}
