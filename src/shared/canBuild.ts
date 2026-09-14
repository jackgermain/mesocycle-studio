import type { AccountRole } from "../lib/auth";

/** Only a "friend/family" account is free to build their own program from scratch or clone a coach
 * template — a prescribed "client" waits on their coach to build it for them. */
export function canSelfBuildProgram(role: AccountRole | null | undefined): boolean {
  return role === "friend" || role === "coach";
}

/** Who has a Messages tab: everyone except a General account.
 *
 * Jack: "For my account and for coaching accounts and for client accounts, there should be a Messages tab.
 * Only general accounts which have their own special invite code does not have a Messages tab."
 *
 * Deliberately a SEPARATE predicate from canSelfBuildProgram, not a reuse of it. That one answers "may you
 * build your own program", which is true for a coach and a General account alike. This one answers "do you
 * have anyone to message", which is true for a coach and a client but not a General account. The two
 * questions have different answers for a coach, and collapsing them into one test is exactly what removed
 * the Messages tab from coach accounts. */
export function hasInbox(role: AccountRole | null | undefined): boolean {
  return role !== "friend";
}
