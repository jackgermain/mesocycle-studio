import { supabase } from "../lib/supabase";

/** "client" is fully coach-prescribed. "friend" is self-directed — they build or clone their own
 * programs and still get nutrition tracking, but can't onboard anyone else and can only message this
 * coach. */
export type InviteRole = "client" | "friend";

export interface ClientInvite {
  code: string;
  coachId: string;
  clientName: string;
  role: InviteRole;
}

function randomCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

/** Creates a real, database-backed invite — the only way a "client"/"friend" account can ever come into
 * existence (see claim_invite in the Supabase migration). */
export async function createInvite(coachId: string, clientName: string, role: InviteRole): Promise<ClientInvite> {
  const code = randomCode();
  const { error } = await supabase.from("invites").insert({ code, coach_id: coachId, role, client_name: clientName });
  if (error) throw error;
  return { code, coachId, clientName, role };
}

export interface PublicInvite {
  code: string;
  role: InviteRole;
  clientName: string;
  usedAt: string | null;
  coachName: string;
}

/** Safe-fields-only lookup, callable before the visitor has signed in. */
export async function getInvite(code: string): Promise<PublicInvite | null> {
  const { data, error } = await supabase.rpc("get_invite", { p_code: code });
  if (error || !data || data.length === 0) return null;
  const row = data[0] as { code: string; role: InviteRole; client_name: string; used_at: string | null; coach_name: string };
  return { code: row.code, role: row.role, clientName: row.client_name, usedAt: row.used_at, coachName: row.coach_name };
}

/** Invites this coach has sent that have since been claimed — used to reconcile a roster placeholder
 * with the real account id the person ended up with. */
export async function listClaimedInvites(coachId: string): Promise<{ code: string; accountId: string }[]> {
  const { data, error } = await supabase.from("invites").select("code, claimed_by").eq("coach_id", coachId).not("claimed_by", "is", null);
  if (error || !data) return [];
  return data.map((r) => ({ code: r.code as string, accountId: r.claimed_by as string }));
}
