/** Who owns their own training progressions.
 *
 * One rule, in one place, because it is read twice and the two readings must agree: `ProgressionToggle`
 * decides whether to show the auto-programming switch, and `ClientLayout` decides whether finishing a
 * session writes next week or only proposes it. If those two ever drift, the switch is either present and
 * inert or absent while the behaviour runs anyway — both of which look like the app is broken and neither
 * of which shows up in a build.
 */

/** The fields this rule reads. Structural rather than the real `Account`, so the tests can call it with a
 * literal and so it stays importable from anywhere without dragging the auth module along. */
export interface AccountLike {
  role: string;
  display_name?: string;
  is_platform_admin?: boolean;
}

/** Display names, lowercased, that auto training programming is switched on for.
 *
 * Jack: *"let's remove the buttons for auto programming on weight lifting for now for anyone other than my
 * 2 accounts, Jax and my admin account… now I'm just talking about using my admin account and me using
 * this app for my clients specifically."*
 *
 * The reason this is an identity list rather than a role rule: the roles cannot express it. His admin
 * account is a `coach` and so is every other coach who signs up; Jax is a `friend` and so is every General
 * account. He is not describing a kind of account, he is describing his own two.
 *
 * **It is matched on display name on purpose, and that is the fragile part.** `is_platform_admin` covers
 * the admin account exactly — it is a flag only his account carries — but there is no equivalent fact about
 * Jax, so the name is the only handle. Renaming that profile silently removes the switch. That is a real
 * tripwire and it is written down here rather than discovered later: if the switch disappears from Jax,
 * this set is the first place to look.
 *
 * A gate on an invisible flag is also exactly what made a missing button undiagnosable in this app once
 * before, which is why the editor states the rule on screen rather than just hiding the row.
 */
const AUTO_PROGRAMMING_NAMES: ReadonlySet<string> = new Set(["jax"]);

/** Whether this account is one of the two that auto training programming is enabled for.
 *
 * Exported so a screen can explain the absence rather than just render nothing. */
export function runsAutoProgramming(account: AccountLike | null | undefined): boolean {
  if (!account) return false;
  // The admin account, identified by the one flag only it carries.
  if (account.is_platform_admin) return true;
  return AUTO_PROGRAMMING_NAMES.has((account.display_name ?? "").trim().toLowerCase());
}

/** Whether finishing a session writes next week automatically, and therefore whether the switch exists.
 *
 * Two gates, and both have to pass:
 *
 * 1. **The account is one of Jack's two** (`runsAutoProgramming`). Everyone else is now proposal-only —
 *    the app works next week out and sends it for review, and a person decides. That is deliberately the
 *    same treatment a prescribed client already gets, because Jack is now doing the programming by hand
 *    for the roster and the algorithm's job is to suggest, not to write.
 *
 * 2. **They are actually training on this side of the app.** A coach only does that while previewing as a
 *    client, which is also the one case where the athlete and the reviewer are the same person. A General
 *    account directs its own training, so it qualifies outright — that part is unchanged, and it was
 *    wrong once in the other direction: the switch went missing from the one account Jack tests on
 *    (*"the auto programming button in the train tab, which is actually gone for some reason"*).
 */
export function ownsTheirProgressions(
  account: AccountLike | null | undefined,
  previewingAsClient: boolean,
): boolean {
  if (!account) return false;
  if (!runsAutoProgramming(account)) return false;
  if (account.role === "coach") return previewingAsClient;
  return account.role === "friend";
}
