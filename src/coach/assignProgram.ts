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
  const next = { ...existing, program };
  const { error } = await supabase.from("client_state").upsert({ account_id: clientAccountId, data: next, updated_at: new Date().toISOString() });
  if (error) throw error;
}
