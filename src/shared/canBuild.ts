import type { AccountRole } from "../lib/auth";

/** Only a "friend/family" account is free to build their own program from scratch or clone a coach
 * template — a prescribed "client" waits on their coach to build it for them. */
export function canSelfBuildProgram(role: AccountRole | null | undefined): boolean {
  return role === "friend" || role === "coach";
}
