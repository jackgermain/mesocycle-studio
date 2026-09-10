/** Who, if anyone, is actually on the other end.
 *
 * `program.coachName` is a string on the program blob and is very often filled in even when nobody is
 * coaching this person: a coach training themselves carries their own name there, and so does an account
 * with no coach at all. Telling someone "Jack will see this" when nothing was sent anywhere is worse than
 * saying nothing — it promises a reply that is never coming.
 *
 * `accounts.coach_id` is the only thing that settles it. It is null for a coach and for any unattached
 * account, and set only when a real person is on the other end of the signal.
 */
export function coachOnTheOtherEnd(coachId: string | null | undefined, coachName: string | undefined): string | null {
  if (!coachId) return null;
  const name = (coachName ?? "").trim();
  return name.length > 0 ? name : null;
}

/** "Jack will see this before your next session." / "Noted." */
export function confirmSent(coach: string | null, withCoach: string, alone = "Noted."): string {
  return coach ? withCoach.replace("{coach}", coach) : alone;
}
