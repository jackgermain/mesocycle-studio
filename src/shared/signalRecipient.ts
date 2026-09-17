/** Who a piece of client feedback is addressed to.
 *
 * Normally the sender's own coach. A coach training themselves has no coach above them, and for a long time
 * that meant their feedback went nowhere at all: `sendSignals` returns early when there is no recipient, so
 * every soreness answer, pump rating, joint report and failure flag from their own sessions was silently
 * dropped. Jack, after the soreness check produced nothing for his own training: "those notifications need to
 * be being sent no matter what. They're incredibly important."
 *
 * Migration 0027 established the rule for progression signals -- a coach may address one to themselves -- and
 * 0033 widened it to every kind. This is that rule, in one place, so a call site cannot get it wrong: the four
 * feedback screens each passed `account.coach_id` straight through, which is null for a coach.
 *
 * Null means nobody: a client or General account whose coach_id is somehow unset. Sending stays a no-op then,
 * which is correct -- the database would refuse the row anyway.
 *
 * Pure, and no Supabase import, so it can be tested.
 */
export function signalRecipient(account: { id: string; role: string; coach_id: string | null }): string | null {
  return account.coach_id ?? (account.role === "coach" ? account.id : null);
}
