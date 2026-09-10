import { supabase } from "../lib/supabase";

/** "client" is fully coach-prescribed. "friend" is self-directed — they build or clone their own
 * programs and still get nutrition tracking, but can't onboard anyone else and can only message this
 * coach. "coach" is a fully independent coach with their own walled-off roster, and can only be issued
 * by the platform owner — enforced in the invites insert policy, not here. */
export type InviteRole = "client" | "friend" | "coach";

export interface ClientInvite {
  code: string;
  coachId: string;
  clientName: string;
  role: InviteRole;
}

/** Codes are the only thing standing between a stranger and an account, so they come from the CSPRNG
 * rather than Math.random(), whose output is predictable from prior draws in every engine that matters.
 *
 * Base32 without I, O, 0 or 1 — the four characters people mistype when reading a code off a phone
 * screen and typing it into another. Eight of them is about 10^12 codes, which is not a space anyone
 * walks; the DB's primary key is still what guarantees uniqueness, and the retry below is what turns a
 * collision into a second attempt instead of an error the coach has to interpret. */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/** Creates a real, database-backed invite — the only way a "client"/"friend" account can ever come into
 * existence (see claim_invite in the Supabase migration). */
export async function createInvite(coachId: string, clientName: string, role: InviteRole): Promise<ClientInvite> {
  // Retried rather than assumed unique. A duplicate primary key surfaced as a raw Postgres error the
  // coach could do nothing with, on a screen whose only failure mode should be "try again".
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    const { error } = await supabase.from("invites").insert({ code, coach_id: coachId, role, client_name: clientName });
    if (!error) return { code, coachId, clientName, role };
    // 23505 is unique_violation — the one error worth another draw. Anything else is a real failure
    // (no permission to mint this role, offline, RLS) and retrying just delays the message.
    if (error.code !== "23505") throw new Error(explainInviteError(error, role));
  }
  throw new Error("Couldn't generate a unique invite code. Try again.");
}

/** Say what actually went wrong.
 *
 * Supabase returns a plain `{ code, message, details, hint }` object, not an Error, so an
 * `e instanceof Error` check in the caller is false and the real reason gets replaced with a generic
 * "couldn't do that" — which is what a coach invite looked like on a database where migration 0020 had
 * not been run yet. The two failures worth naming are the two that will actually happen. */
function explainInviteError(error: { code?: string; message?: string }, role: InviteRole): string {
  // 23514 is check_violation: `invites.role` still only allows 'client' and 'friend', so 0020 is not
  // applied. Nothing the coach can do in the app fixes this, and saying so beats saying nothing.
  if (error.code === "23514" && role === "coach") {
    return "Coach invites need database migration 0020 — run it in the Supabase SQL editor, then try again.";
  }
  // 42501 is insufficient_privilege: the RLS policy refused the insert. For a coach invite that means
  // this account is not the platform owner.
  if (error.code === "42501") {
    return role === "coach"
      ? "Only the platform owner can create coach invites."
      : "This account isn't allowed to create invites.";
  }
  return error.message || "Couldn't create that invite.";
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
