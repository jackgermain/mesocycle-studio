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
export async function bootstrapCoach(displayName: string): Promise<Account> {
  const { data, error } = await supabase.rpc("bootstrap_coach", { p_display_name: displayName });
  if (error) throw error;
  return data as Account;
}
