import { supabase } from "../lib/supabase";

export interface AdminAccount {
  id: string;
  display_name: string;
  role: "coach" | "client" | "friend";
  created_at: string;
  active: boolean;
  coach_name: string | null;
}

/** Erases an account: the login, and everything that cascades from it.
 *
 * A coach may do this for their own people; the platform admin may do it for anyone. Both checks live in
 * the function itself (migration 0017), because a UI that only hides the button is not access control.
 *
 * Deleting a COACH takes their whole roster with it -- accounts.coach_id cascades. That is the schema's
 * documented behaviour, not something this wrapper can soften, so callers have to say so before asking. */
export async function deleteAccount(targetId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.rpc("delete_account", { p_target: targetId });
  if (error) {
    console.error("Account deletion failed", error);
    if (/does not exist/i.test(error.message)) {
      return { ok: false, error: "This needs migration 0017 to be run first." };
    }
    // The function raises readable messages for the refusals (not yours, admins can't go, not signed in),
    // so they're worth showing rather than replacing with something generic.
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function listAccountsForAdmin(): Promise<AdminAccount[]> {
  const { data, error } = await supabase.rpc("list_accounts_for_admin");
  if (error) {
    console.error("Failed to list accounts", error);
    return [];
  }
  return (data ?? []) as AdminAccount[];
}
