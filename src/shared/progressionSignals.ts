import type { Program } from "../data/types";
import { dayDisplayTitle } from "../data/dayNumbering";
import { sendSignals } from "./signals";
import { encodeProgression, progressionRecipient, proposalsForDay } from "./progressionProposal";

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
