import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { bootstrapCoach } from "../lib/accountSetup";
import { InfoBanner } from "../components/UI";

export default function Landing() {
  const { loading, session, account, refreshAccount } = useAuth();

  // Coming back from a magic-link email sent from the invite-accept screen — forward to it (it handles
  // its own loading/auth state) rather than falling through to the plain sign-in form here.
  const inviteCode = new URLSearchParams(window.location.search).get("invite");
  if (inviteCode) return <Navigate to={`/invite/${inviteCode}`} replace />;

  if (loading) {
    return (
      <div className="screen">
        <div className="hdr" style={{ paddingBottom: 8 }}>
          <div>
            <div className="k">Mesocycle Studio</div>
            <div className="h1">Loading…</div>
          </div>
        </div>
      </div>
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
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send() {
    setError(null);
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      // No "#/…" here — this app uses hash-based routing, and Supabase appends its own auth tokens as
      // a URL fragment on the way back, which collides with a literal route hash in the redirect URL.
      options: { emailRedirectTo: `${window.location.origin}${window.location.pathname}` },
    });
    setBusy(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <div className="screen">
      <div className="hdr" style={{ paddingBottom: 8 }}>
        <div>
          <div className="k">Mesocycle Studio</div>
          <div className="h1">Sign in</div>
        </div>
      </div>
      <div className="screen-scroll" style={{ gap: 16 }}>
        {sent ? (
          <InfoBanner icon="ph-envelope-simple-open" tone="accent">
            Check {email} for a sign-in link — open it on this device to continue.
          </InfoBanner>
        ) : (
          <>
            <p className="mu" style={{ fontSize: 12.5, lineHeight: 1.6 }}>
              Enter your email and we'll send you a link to sign in — no password needed. If you're a client or friend/family, use the same email your coach sent your invite to (or open your invite link directly).
            </p>
            <div className="field">
              <label>Email</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" autoFocus />
            </div>
            {error && <InfoBanner icon="ph-warning">{error}</InfoBanner>}
            <button className="btn btn-primary btn-block" style={{ height: 48, opacity: email.trim() && !busy ? 1 : 0.5 }} disabled={!email.trim() || busy} onClick={send}>
              {busy ? "Sending…" : "Send sign-in link"}
            </button>
          </>
        )}
      </div>
    </div>
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
    <div className="screen">
      <div className="hdr" style={{ paddingBottom: 8 }}>
        <div>
          <div className="k">Mesocycle Studio</div>
          <div className="h1">Almost there</div>
        </div>
      </div>
      <div className="screen-scroll" style={{ gap: 16 }}>
        <InfoBanner icon="ph-info">
          You're signed in, but nothing's set up for this email yet. If a coach invited you, open the invite link they sent instead of signing in here directly.
        </InfoBanner>
        <p className="mu" style={{ fontSize: 12.5, lineHeight: 1.6 }}>
          If you're setting this up for yourself as the coach for the first time, name yourself below.
        </p>
        <div className="field">
          <label>Your name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Dana" autoFocus />
        </div>
        {error && <InfoBanner icon="ph-warning">{error}</InfoBanner>}
        <button className="btn btn-primary btn-block" style={{ height: 48, opacity: busy ? 0.5 : 1 }} disabled={busy} onClick={setUpAsCoach}>
          {busy ? "Setting up…" : "Set up as the coach"}
        </button>
      </div>
    </div>
  );
}
