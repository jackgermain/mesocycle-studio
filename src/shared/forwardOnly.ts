/** Forward only: what a coach may still prescribe into, and what is a record of something that happened.
 *
 * Jack, asked whether a hand edit to a block should reach days already logged: *"forward only."* A finished
 * session is evidence — what was actually lifted, on what date, at what effort — and it is the input every
 * progression, every volume rule and every chart reads. Rewriting it would not change the past, it would
 * change the record of the past, and then nothing downstream could be trusted.
 *
 * Two predicates rather than one, because the reducer and the editor can answer different amounts:
 *
 * - `prescriptionIsOpen` depends only on the data in front of it, so the REDUCER can enforce it. That is
 *   deliberate: the guard belongs where the write happens, not at the call sites. `alignBlockShape` and the
 *   stray-exercise damage in this app both came from a rule that lived in a caller, where the next caller
 *   did not know about it.
 * - `dayIsAhead` additionally needs today's date, which is not in the program, so it is the EDITOR's rule
 *   for what to present as editable versus locked.
 *
 * A day can therefore be refused by either one, and the reducer's refusal is the one that cannot be
 * bypassed by a screen that forgot to ask.
 */
import type { TrainingDay, WorkSet } from "../data/types";

/** Whether this set's prescription may still be rewritten, from the data alone.
 *
 * Checked at the reducer. A `done` day is a finished session; a `checked` set is one that was performed,
 * even inside a session that is still open — a client three exercises into Monday has three exercises of
 * real history sitting in a day whose status is still `today`. Both are records.
 */
export function prescriptionIsOpen(
  day: Pick<TrainingDay, "status">,
  set: Pick<WorkSet, "checked">,
): boolean {
  return day.status !== "done" && !set.checked;
}

/** Whether a whole day is still ahead of the person, which is what the editor shows as editable.
 *
 * Date-compared as ISO strings, which sort correctly and avoid constructing a Date in a timezone that
 * might not be the client's. A day in the past that was never completed is still refused: the session did
 * not happen, so prescribing into it changes nothing anyone will ever see.
 */
export function dayIsAhead(
  day: Pick<TrainingDay, "status" | "date">,
  today: string,
): boolean {
  return day.status !== "done" && day.date >= today;
}

/** Why a day is locked, in the words the editor puts on screen. `null` means it is editable.
 *
 * Here rather than in the component so the reason and the refusal come from one place — a screen that says
 * "logged" about a day the reducer refused for a different reason is how a real bug gets read as a typo. */
export function lockReason(
  day: Pick<TrainingDay, "status" | "date">,
  today: string,
): "logged" | "past" | null {
  if (day.status === "done") return "logged";
  if (day.date < today) return "past";
  return null;
}
