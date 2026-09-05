import React, { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { getInvite } from "../shared/invites";
import type { PublicInvite } from "../shared/invites";
import { claimInvite } from "../lib/accountSetup";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { AuthHero as Hero, InfoBanner } from "../components/UI";

export default function AcceptInvite() {
  const { code = "" } = useParams();
  const { loading: authLoading, session, account, refreshAccount } = useAuth();
  const [invite, setInvite] = useState<PublicInvite | null | "loading">("loading");

  useEffect(() => {
    let active = true;
    getInvite(code).then((i) => active && setInvite(i));
    return () => {
      active = false;
    };
  }, [code]);

  if (invite === "loading" || authLoading) {
    return (
      <Hero>
        <div className="mu" style={{ textAlign: "center" }}>Loading…</div>
      </Hero>
    );
  }

  if (!invite) {
    return (
      <Hero>
        <div className="h1" style={{ textAlign: "center" }}>Invite not found</div>
        <InfoBanner icon="ph-link-break">This invite link isn't valid. Ask your coach to send you a new one.</InfoBanner>
      </Hero>
    );
  }

  if (invite.usedAt) {
    return (
      <Hero>
        <div className="h1" style={{ textAlign: "center" }}>Already used</div>
        <InfoBanner icon="ph-check-circle" tone="accent">
          This invite has already been claimed. If that was you, just sign in from the home page instead.
        </InfoBanner>
      </Hero>
    );
  }

  if (account) {
    // Already has an account (e.g. reopened an old invite link) — just go to the app.
    return <Navigate to={account.role === "coach" ? "/coach/desk" : "/block"} replace />;
  }

  if (session) {
    return <ClaimStep code={code} invite={invite} onClaimed={refreshAccount} />;
  }

  return <SignInStep invite={invite} />;
}

function SignInStep({ invite }: { invite: PublicInvite }) {
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    setBusy(true);
    const { error } = mode === "signup" ? await supabase.auth.signUp({ email, password }) : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setError(error.message);
    // On success, AuthProvider picks up the new session and AcceptInvite re-renders into ClaimStep.
  }

  return (
    <Hero>
      <div className="h1" style={{ textAlign: "center" }}>You're invited, {invite.clientName.split(" ")[0]}</div>
      <p className="mu" style={{ fontSize: 12.5, lineHeight: 1.6, textAlign: "center" }}>
        {invite.coachName} sent you this link
        {invite.role === "friend"
          ? " — once you're in, you can build your own programs from scratch or clone one of their saved templates, plus full nutrition tracking."
          : " — once you're in, you'll only ever see the program they build for you."}
      </p>
      <div className="field">
        <label>Email</label>
        <input className="input" style={{ height: 50, fontSize: 14 }} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" autoFocus />
      </div>
      <div className="field">
        <label>Password</label>
        <input
          className="input"
          style={{ height: 50, fontSize: 14 }}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={mode === "signup" ? "At least 6 characters" : "••••••••"}
          onKeyDown={(e) => e.key === "Enter" && email.trim() && password.length >= 6 && !busy && submit()}
        />
      </div>
      {error && <InfoBanner icon="ph-warning">{error}</InfoBanner>}
      <button className="btn btn-solid btn-block" style={{ height: 48, fontSize: 14, opacity: email.trim() && password.length >= 6 && !busy ? 1 : 0.5 }} disabled={!email.trim() || password.length < 6 || busy} onClick={submit}>
        {busy ? "Working…" : mode === "signup" ? "Create account" : "Sign in"}
      </button>
      <button
        className="btn btn-ghost"
        style={{ fontSize: 12.5 }}
        onClick={() => {
          setMode((m) => (m === "signup" ? "signin" : "signup"));
          setError(null);
        }}
      >
        {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
      </button>
    </Hero>
  );
}

function ClaimStep({ code, invite, onClaimed }: { code: string; invite: PublicInvite; onClaimed: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function claim() {
    setBusy(true);
    setError(null);
    try {
      await claimInvite(code, invite.clientName);
      await onClaimed();
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't finish setting up.");
    } finally {
      setBusy(false);
    }
  }

  if (done) return <Navigate to="/onboarding" replace />;

  return (
    <Hero>
      <div className="h1" style={{ textAlign: "center" }}>Finish setting up</div>
      <p className="mu" style={{ fontSize: 12.5, lineHeight: 1.6, textAlign: "center" }}>
        You're signed in as {invite.clientName} — finish setting up your account with {invite.coachName}.
      </p>
      {error && <InfoBanner icon="ph-warning">{error}</InfoBanner>}
      <button className="btn btn-solid btn-block" style={{ height: 48, fontSize: 14, opacity: busy ? 0.5 : 1 }} disabled={busy} onClick={claim}>
        {busy ? "Setting up…" : "Create account & start"}
      </button>
    </Hero>
  );
}
