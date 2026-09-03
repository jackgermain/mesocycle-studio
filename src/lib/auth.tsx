import React, { createContext, useContext, useEffect, useState } from "react";
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
  refreshAccount: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [account, setAccount] = useState<Account | null>(null);

  async function loadAccount(userId: string) {
    const { data } = await supabase.from("accounts").select("id, role, display_name, coach_id").eq("id", userId).maybeSingle();
    setAccount((data as Account | null) ?? null);
  }

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session?.user.id) await loadAccount(data.session.user.id);
      if (active) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession?.user.id) {
        await loadAccount(newSession.user.id);
      } else {
        setAccount(null);
      }
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

  return <Ctx.Provider value={{ loading, session, account, refreshAccount, signOut }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
