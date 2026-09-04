import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type AccountRole = "coach" | "client" | "friend";

export interface Account {
  id: string;
  role: AccountRole;
  display_name: string;
  coach_id: string | null;
  /** A platform-owner capability, entirely separate from the coach/client/friend roles that structure
   * actual coaching relationships -- lets this account revoke/restore another independent coach's access
   * without seeing anything else about their roster or data. Set directly in the database, not through any
   * UI (see supabase/migrations/0010_platform_admin.sql). */
  is_platform_admin?: boolean;
}

interface AuthState {
  /** True until we've resolved both the auth session and (if logged in) the accounts row. */
  loading: boolean;
  session: Session | null;
  /** Null while logged out, or logged in but not yet claimed an invite / bootstrapped as coach. */
  account: Account | null;
  /** True right after clicking a "reset your password" email link — a real session, but the only thing
   * it should be used for is setting a new password, not the normal signed-in app. */
  recovering: boolean;
  clearRecovering: () => void;
  /** True right after landing here because the account just loaded turned out to be revoked — shown once
   * on the sign-in screen, then cleared. */
  revoked: boolean;
  clearRevoked: () => void;
  refreshAccount: () => Promise<void>;
  signOut: () => Promise<void>;
  /** A coach previewing the client app as themselves — RequireRole lets a coach through to the member
   * routes while this is on. Gated in the UI to one account (see Desk.tsx); not a real permission
   * boundary, just a client-side toggle for the account's own owner to click around their own product. */
  previewingAsClient: boolean;
  enterClientPreview: () => void;
  exitClientPreview: () => void;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [recovering, setRecovering] = useState(false);
  const [revoked, setRevoked] = useState(false);
  const [previewingAsClient, setPreviewingAsClient] = useState(false);
  // Tracks whose account is currently loaded, so a session change to a *different* user clears the
  // stale account synchronously — otherwise there's a window where `session` already reflects the new
  // person but `account` still shows the previous person's (e.g. the coach's), and anything reading both
  // together mid-transition — like the invite-accept screen's "already have an account" redirect — can
  // act on the wrong one.
  const lastUserIdRef = useRef<string | null>(null);

  async function loadAccount(userId: string) {
    const { data } = await supabase.from("accounts").select("id, role, display_name, coach_id, active, is_platform_admin").eq("id", userId).maybeSingle();
    const row = data as (Account & { active: boolean }) | null;
    if (row && row.active === false) {
      // Revoked — this session is no longer welcome. Sign out immediately rather than leaving them
      // sitting on an authenticated-but-blocked screen.
      setAccount(null);
      setRevoked(true);
      await supabase.auth.signOut();
      return;
    }
    setAccount(row ? { id: row.id, role: row.role, display_name: row.display_name, coach_id: row.coach_id, is_platform_admin: row.is_platform_admin } : null);
  }

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      lastUserIdRef.current = data.session?.user.id ?? null;
      setSession(data.session);
      if (data.session?.user.id) await loadAccount(data.session.user.id);
      if (active) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
      const newUserId = newSession?.user.id ?? null;
      if (newUserId !== lastUserIdRef.current) setAccount(null);
      lastUserIdRef.current = newUserId;
      setSession(newSession);
      if (newUserId) await loadAccount(newUserId);
      setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function refreshAccount() {
    if (session?.user.id) await loadAccount(session.user.id);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setAccount(null);
    setPreviewingAsClient(false);
  }

  return (
    <Ctx.Provider
      value={{
        loading,
        session,
        account,
        recovering,
        clearRecovering: () => setRecovering(false),
        revoked,
        clearRevoked: () => setRevoked(false),
        refreshAccount,
        signOut,
        previewingAsClient,
        enterClientPreview: () => setPreviewingAsClient(true),
        exitClientPreview: () => setPreviewingAsClient(false),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
