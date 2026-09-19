/** Who owns their own training progressions.
 *
 * One rule, in one place, because it is read twice and the two readings must agree: `ProgressionToggle`
 * decides whether to show the auto-programming switch, and `ClientLayout` decides whether finishing a
 * session writes next week or only proposes it. If those two ever drift, the switch is either present and
 * inert or absent while the behaviour runs anyway — both of which look like the app is broken and neither
 * of which shows up in a build.
 *
 * **A General account counts.** It was coach-only for a while, reading "for general accounts they do not
 * approve the loads, I do" as meaning a General account should have no switch at all. That made the switch
 * invisible on the one account Jack tests on — *"the auto programming button in the train tab, which is
 * actually gone for some reason. It should be there."* Approving someone else's loads is a different
 * question from having the app do the arithmetic: a General account directs its own training, and its
 * nutrition switch already works exactly this way.
 *
 * **A prescribed client does not.** Their block belongs to their coach, so for them the app proposes and
 * the coach reviews. That is the difference between the two roles and no switch should be able to erase it.
 */
export function ownsTheirProgressions(
  account: { role: string } | null | undefined,
  previewingAsClient: boolean,
): boolean {
  if (!account) return false;
  // A coach only trains on this side of the app while previewing as a client, which is also the one case
  // where the athlete and the reviewer are the same person.
  if (account.role === "coach") return previewingAsClient;
  return account.role === "friend";
}
