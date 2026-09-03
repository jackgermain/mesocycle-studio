import { supabase } from "../lib/supabase";
import type { Program } from "../data/types";

/** Writes a real Program straight into a client's own client_state row -- the same place their live
 * training data already lives, so it shows up exactly like anything the client built themselves. RLS
 * already allows a coach to update a client_state row belonging to one of their own clients, so this is
 * a plain read-merge-write rather than needing a SECURITY DEFINER function. Only the `program` field is
 * touched; everything else (profile, weigh-ins, meals, onboarded) is preserved untouched. */
export async function writeProgramToClient(clientAccountId: string, program: Program): Promise<void> {
  const { data, error: readError } = await supabase.from("client_state").select("data").eq("account_id", clientAccountId).maybeSingle();
  if (readError) throw readError;
  const existing = (data?.data as Record<string, unknown>) ?? {};
  // Replacing the active program also clears any previously queued one -- it was queued to follow the
  // program that's now being replaced, so it no longer makes sense to auto-start it later.
  const next = { ...existing, program, nextProgram: null };
  const { error } = await supabase.from("client_state").upsert({ account_id: clientAccountId, data: next, updated_at: new Date().toISOString() });
  if (error) throw error;
}

/** Queues a program to start automatically once the client's current one finishes (its last day gets
 * logged/removed), rather than replacing what they're on right now. See PROMOTE_NEXT_PROGRAM in
 * src/state/store.tsx for the client-side promotion. */
export async function queueProgramForClient(clientAccountId: string, program: Program): Promise<void> {
  const { data, error: readError } = await supabase.from("client_state").select("data").eq("account_id", clientAccountId).maybeSingle();
  if (readError) throw readError;
  const existing = (data?.data as Record<string, unknown>) ?? {};
  const next = { ...existing, nextProgram: program };
  const { error } = await supabase.from("client_state").upsert({ account_id: clientAccountId, data: next, updated_at: new Date().toISOString() });
  if (error) throw error;
}
