import { supabase } from "../lib/supabase";
import { encodeProgressionPayload, type ProgressionPayload } from "./progressionProposal";

/** Writes a progression signal's payload back after a Good/Bad or an approval. The verdicts ride inside the
 * same payload as the numbers they judged, so a review can never end up attached to the wrong proposal.
 *
 * Returns the stored detail, or null if it didn't save. Same read-back as acknowledgeSignal: an update RLS
 * refuses reports success with zero rows, so the absence of an error proves nothing. */
export async function saveProgressionPayload(signalId: string, payload: ProgressionPayload): Promise<string | null> {
  const detail = encodeProgressionPayload(payload);
  const { data, error } = await supabase.from("client_signals").update({ detail }).eq("id", signalId).select("id");
  if (error || !data || data.length === 0) {
    console.error("Failed to save progression review", error ?? "no rows updated");
    return null;
  }
  return detail;
}
