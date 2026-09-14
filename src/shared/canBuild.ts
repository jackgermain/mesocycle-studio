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

/** Who may change their own session as they train it -- add a movement to today, or to the rest of the block.
 *
 * A THIRD predicate rather than a reuse of either above, for the same reason those two are separate. The
 * question here is "is the person training this session also the person who prescribes it", and the answer
 * is yes for a General account (self-directed by definition) and yes for a coach training themselves, who
 * is both athlete and reviewer -- the one case the progression rules already carve out. It is no for a
 * client, whose block is authored and owned by their coach; a client who wants different work asks for it.
 *
 * DayWorkout's own `selfDirected` answers a narrower question -- "is this screen being driven by someone
 * without a coach above them" -- and excludes coaches, which is why Jack could not add an exercise on his
 * own account. Collapsing the two would hand every client the same button. */
export function canAddOwnExercise(role: AccountRole | null | undefined): boolean {
  return role === "friend" || role === "coach";
}
