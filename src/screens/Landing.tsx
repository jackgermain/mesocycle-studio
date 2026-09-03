import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { bootstrapCoach } from "../lib/accountSetup";
import { InfoBanner } from "../components/UI";

function Hero({ title, tagline, children }: { title: string; tagline: string; children: React.ReactNode }) {
  return (
    <div className="screen">
      <div
        style={{
          flex: "none",
          padding: "calc(52px + env(safe-area-inset-top)) 20px 30px",
          background: "radial-gradient(120% 90% at 50% 0%, #1f2f28, #1b1e2e 45%, #161826)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 66,
            height: 66,
            borderRadius: 18,
            background: "var(--color-accent-900)",
            border: "1px solid var(--color-accent-700)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
            boxShadow: "0 10px 30px -8px rgba(76, 224, 143, 0.35)",
          }}
        >
          <img src="/icons/icon-192.png" alt="" width={40} height={40} style={{ borderRadius: 9, display: "block" }} />
        </div>
        <div style={{ fontFamily: "var(--font-heading)", fontSize: 27, fontWeight: 600, letterSpacing: -0.3 }}>Jacked</div>
        <div className="mu" style={{ marginTop: 5, fontSize: 12.5 }}>{tagline}</div>
        <div className="k" style={{ marginTop: 22 }}>{title}</div>
      </div>
      <div className="screen-scroll" style={{ gap: 16 }}>
        {children}
      </div>
    </div>
  );
}

export default function Landing() {
  const { loading, session, account, refreshAccount } = useAuth();

  // Coming back from a magic-link email sent from the invite-accept screen — forward to it (it handles
  // its own loading/auth state) rather than falling through to the plain sign-in form here.
  const inviteCode = new URLSearchParams(window.location.search).get("invite");
  if (inviteCode) return <Navigate to={`/invite/${inviteCode}`} replace />;

  if (loading) {
    return (
      <Hero title="Loading…" tagline="Coach-programmed training, in your pocket.">
        <div />
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
    <Hero title="Sign in" tagline="Coach-programmed training, in your pocket.">
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
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" autoFocus onKeyDown={(e) => e.key === "Enter" && email.trim() && !busy && send()} />
          </div>
          {error && <InfoBanner icon="ph-warning">{error}</InfoBanner>}
          <button className="btn btn-primary btn-block" style={{ height: 48, opacity: email.trim() && !busy ? 1 : 0.5 }} disabled={!email.trim() || busy} onClick={send}>
            {busy ? "Sending…" : "Send sign-in link"}
          </button>
        </>
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
    <Hero title="Almost there" tagline="Coach-programmed training, in your pocket.">
      <InfoBanner icon="ph-info">
        You're signed in, but nothing's set up for this email yet. If a coach invited you, open the invite link they sent instead of signing in here directly.
      </InfoBanner>
      <p className="mu" style={{ fontSize: 12.5, lineHeight: 1.6 }}>
        If you're setting this up for yourself as the coach for the first time, name yourself below.
      </p>
      <div className="field">
        <label>Your name</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Dana" autoFocus onKeyDown={(e) => e.key === "Enter" && setUpAsCoach()} />
      </div>
      {error && <InfoBanner icon="ph-warning">{error}</InfoBanner>}
      <button className="btn btn-primary btn-block" style={{ height: 48, opacity: busy ? 0.5 : 1 }} disabled={busy} onClick={setUpAsCoach}>
        {busy ? "Setting up…" : "Set up as the coach"}
      </button>
    </Hero>
  );
}
