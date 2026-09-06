import { supabase } from "./supabase";
import type { Account } from "./auth";

/** Turns a valid, unused invite code into a real account for the currently signed-in user. Throws if the
 * invite is missing/used, or if this user already has an account. */
export async function claimInvite(code: string, displayName: string): Promise<Account> {
  const { data, error } = await supabase.rpc("claim_invite", { p_code: code, p_display_name: displayName });
  if (error) throw error;
  return data as Account;
}

/** The very first person to sign in can claim the coach role — fails if a coach account already exists. */
/** Coach signup, gated by a one-time code (migration 0018).
 *
 * The old `bootstrap_coach` took a name and nothing else, and was granted to every authenticated user --
 * so which button the UI happened to render was the only thing between an ordinary signup and a coach
 * account. That grant is now revoked, and this is the only way in. */
export async function bootstrapCoach(displayName: string, code: string): Promise<Account> {
  const { data, error } = await supabase.rpc("bootstrap_coach_with_code", {
    p_display_name: displayName,
    p_code: code,
  });
  if (error) throw error;
  return data as Account;
}
