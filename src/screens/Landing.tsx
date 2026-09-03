import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { bootstrapCoach } from "../lib/accountSetup";
import { AuthHero as Hero, InfoBanner } from "../components/UI";

export default function Landing() {
  const { loading, session, account, refreshAccount } = useAuth();

  // Coming back from a magic-link email sent from the invite-accept screen — forward to it (it handles
  // its own loading/auth state) rather than falling through to the plain sign-in form here.
  const inviteCode = new URLSearchParams(window.location.search).get("invite");
  if (inviteCode) return <Navigate to={`/invite/${inviteCode}`} replace />;

  if (loading) {
    return (
      <Hero>
        <div className="mu" style={{ textAlign: "center" }}>Loading…</div>
      </Hero>
    );
  }

  if (account) {
    return <Navigate to={account.role === "coach" ? "/coach/desk" : "/block"} replace />;
  }

  if (session) {
    return <NoAccountYet onBootstrapped={refreshAccount} />;
  }

  return <SignIn />;
}

function SignIn() {
  const nav = useNavigate();
  const [step, setStep] = useState<"welcome" | "form">("welcome");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showInviteField, setShowInviteField] = useState(false);
  const [inviteCode, setInviteCode] = useState("");

  async function submit() {
    setError(null);
    setBusy(true);
    const { error } = mode === "signin" ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (error) setError(error.message);
    // On success, AuthProvider's onAuthStateChange picks up the new session and Landing re-renders
    // itself into the right place (coach desk, client app, or the "set up as coach" bootstrap step).
  }

  function goToInvite() {
    const code = inviteCode.trim();
    if (code) nav(`/invite/${code}`);
  }

  if (step === "welcome") {
    return (
      <Hero>
        <div className="h1" style={{ textAlign: "center", fontSize: 22 }}>Welcome!</div>
        <button className="btn btn-solid btn-block" style={{ height: 54, fontSize: 16, marginTop: 6 }} onClick={() => setStep("form")}>
          Sign in
        </button>
        <button className="btn btn-ghost" style={{ height: 36, fontSize: 13 }} onClick={() => { setStep("form"); setShowInviteField(true); }}>
          Have an invite code instead?
        </button>
      </Hero>
    );
  }

  return (
    <Hero>
      {!showInviteField ? (
        <>
          <div className="field">
            <label>Email</label>
            <input className="input" style={{ height: 50, fontSize: 15 }} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" autoFocus />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              className="input"
              style={{ height: 50, fontSize: 15 }}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "signup" ? "At least 6 characters" : "••••••••"}
              onKeyDown={(e) => e.key === "Enter" && email.trim() && password.length >= 6 && !busy && submit()}
            />
          </div>
          {error && <InfoBanner icon="ph-warning">{error}</InfoBanner>}
          <button className="btn btn-solid btn-block" style={{ height: 52, fontSize: 15, opacity: email.trim() && password.length >= 6 && !busy ? 1 : 0.5 }} disabled={!email.trim() || password.length < 6 || busy} onClick={submit}>
            {busy ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
          <button
            className="btn btn-ghost"
            style={{ height: 34, fontSize: 12.5 }}
            onClick={() => {
              setMode((m) => (m === "signin" ? "signup" : "signin"));
              setError(null);
            }}
          >
            {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
          </button>

          <div style={{ height: 1, background: "var(--color-divider)", margin: "6px 0" }} />

          <button className="btn btn-ghost" style={{ height: 40, fontSize: 13 }} onClick={() => setShowInviteField(true)}>
            Have an invite code instead?
          </button>
        </>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="field">
            <label>Invite code</label>
            <input
              className="input"
              style={{ height: 46, fontSize: 15, textTransform: "uppercase", letterSpacing: 1 }}
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="ABC123"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && goToInvite()}
            />
          </div>
          <button className="btn btn-solid btn-block" style={{ height: 46, opacity: inviteCode.trim() ? 1 : 0.5 }} disabled={!inviteCode.trim()} onClick={goToInvite}>
            Continue with code
          </button>
          <button className="btn btn-ghost" style={{ height: 36, fontSize: 13 }} onClick={() => setShowInviteField(false)}>
            Sign in with email instead
          </button>
        </div>
      )}
    </Hero>
  );
}

function NoAccountYet({ onBootstrapped }: { onBootstrapped: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");

  async function setUpAsCoach() {
    setBusy(true);
    setError(null);
    try {
      await bootstrapCoach(name.trim() || "Coach");
      onBootstrapped();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't set this up.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Hero>
      <InfoBanner icon="ph-info">
        You're signed in, but nothing's set up for this email yet. If a coach invited you, open the invite link they sent (or enter its code) instead of signing in here directly.
      </InfoBanner>
      <p className="mu" style={{ fontSize: 12.5, lineHeight: 1.6, textAlign: "center" }}>
        Setting this up for yourself as the coach for the first time? Name yourself below.
      </p>
      <div className="field">
        <label>Your name</label>
        <input className="input" style={{ height: 50, fontSize: 15 }} value={name} onChange={(e) => setName(e.target.value)} placeholder="Dana" autoFocus onKeyDown={(e) => e.key === "Enter" && setUpAsCoach()} />
      </div>
      {error && <InfoBanner icon="ph-warning">{error}</InfoBanner>}
      <button className="btn btn-solid btn-block" style={{ height: 52, fontSize: 15, opacity: busy ? 0.5 : 1 }} disabled={busy} onClick={setUpAsCoach}>
        {busy ? "Setting up…" : "Set up as the coach"}
      </button>
    </Hero>
  );
}
