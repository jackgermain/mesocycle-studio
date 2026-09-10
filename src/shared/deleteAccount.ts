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

/** One coach on the platform, as the owner's directory sees them. */
export interface CoachSummary {
  id: string;
  displayName: string;
  createdAt: string;
  active: boolean;
  clientCount: number;
  friendCount: number;
}

/** Every coach on the platform, with the size of each roster.
 *
 * Platform-owner only, enforced inside the RPC rather than here -- a hidden tab is not access control,
 * and the function raises "Not authorized" for anyone else. The counts come from SQL because nothing in
 * this app can read another coach's roster: that isolation is the point of the schema, and a security
 * definer function is the only thing allowed to see across it. */
export async function listCoachesForAdmin(): Promise<CoachSummary[]> {
  const { data, error } = await supabase.rpc("list_coaches_for_admin");
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    displayName: String(r.display_name ?? "Coach"),
    createdAt: String(r.created_at ?? ""),
    active: r.active !== false,
    clientCount: Number(r.client_count ?? 0),
    friendCount: Number(r.friend_count ?? 0),
  }));
}
