import type { Program } from "../data/types";
import { dayDisplayTitle } from "../data/dayNumbering";
import { sendSignals } from "./signals";
import {
  encodeProgression, encodeProgressionPayload, progressionRecipient, proposalsForDay,
  type ProgressionPayload,
} from "./progressionProposal";

/** Sends one finished session's proposals for review, as a single signal.
 *
 * One per session rather than one per exercise: the reviewer approves a week by reading the whole day
 * side by side, and six separate rows for one session would bury everything else on the desk. */
export async function sendProgressionProposals(
  account: { id: string; role: string; coach_id: string | null },
  program: Program,
  dayId: string,
  units: string,
): Promise<void> {
  const to = progressionRecipient(account);
  if (!to) return;
  const result = proposalsForDay(program, dayId, units);
  if (!result || result.proposals.length === 0) return;
  const day = program.weeks.flatMap((w) => w.days).find((d) => d.id === dayId);
  await sendSignals(account.id, to, [
    {
      kind: "progression",
      severity: result.proposals.length,
      dayLabel: day ? dayDisplayTitle(day) : null,
      dayId,
      detail: encodeProgression(result),
    },
  ]);
}

/** The same signal for a session the app has already programmed itself — a record, not a request.
 *
 * It still goes to the desk. A coach seeing nothing at all would have no idea what their General account's
 * block now says, and a coach training themselves keeps a written history of every week's decision with the
 * numbers it was made from. The payload arrives with every verdict already filled in as `auto`, so the desk
 * can say what was applied rather than asking for an approval that has already been bypassed. */
export async function sendProgressionRecord(
  account: { id: string; role: string; coach_id: string | null },
  program: Program,
  dayId: string,
  payload: ProgressionPayload,
): Promise<void> {
  const to = progressionRecipient(account);
  if (!to || payload.proposals.length === 0) return;
  const day = program.weeks.flatMap((w) => w.days).find((d) => d.id === dayId);
  await sendSignals(account.id, to, [
    {
      kind: "progression",
      severity: payload.proposals.length,
      dayLabel: day ? dayDisplayTitle(day) : null,
      dayId,
      detail: encodeProgressionPayload(payload),
    },
  ]);
}
