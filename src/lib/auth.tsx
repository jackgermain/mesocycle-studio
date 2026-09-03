import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type AccountRole = "coach" | "client" | "friend";

export interface Account {
  id: string;
  role: AccountRole;
  display_name: string;
  coach_id: string | null;
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
  refreshAccount: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [recovering, setRecovering] = useState(false);
  // Tracks whose account is currently loaded, so a session change to a *different* user clears the
  // stale account synchronously — otherwise there's a window where `session` already reflects the new
  // person but `account` still shows the previous person's (e.g. the coach's), and anything reading both
  // together mid-transition — like the invite-accept screen's "already have an account" redirect — can
  // act on the wrong one.
  const lastUserIdRef = useRef<string | null>(null);

  async function loadAccount(userId: string) {
    const { data } = await supabase.from("accounts").select("id, role, display_name, coach_id").eq("id", userId).maybeSingle();
    setAccount((data as Account | null) ?? null);
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
  }

  return <Ctx.Provider value={{ loading, session, account, recovering, clearRecovering: () => setRecovering(false), refreshAccount, signOut }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
