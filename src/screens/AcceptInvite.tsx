import React, { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { getInvite } from "../shared/invites";
import type { PublicInvite } from "../shared/invites";
import { claimInvite } from "../lib/accountSetup";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { InfoBanner } from "../components/UI";

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
      <div className="screen">
        <div className="hdr" style={{ paddingBottom: 8 }}>
          <div className="h1">Loading…</div>
        </div>
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="screen">
        <div className="hdr" style={{ paddingBottom: 8 }}>
          <div>
            <div className="k">Mesocycle Studio</div>
            <div className="h1">Invite not found</div>
          </div>
        </div>
        <div className="screen-scroll">
          <InfoBanner icon="ph-link-break">This invite link isn't valid. Ask your coach to send you a new one.</InfoBanner>
        </div>
      </div>
    );
  }

  if (invite.usedAt) {
    return (
      <div className="screen">
        <div className="hdr" style={{ paddingBottom: 8 }}>
          <div>
            <div className="k">Mesocycle Studio</div>
            <div className="h1">Already used</div>
          </div>
        </div>
        <div className="screen-scroll">
          <InfoBanner icon="ph-check-circle" tone="accent">
            This invite has already been claimed. If that was you, just sign in from the home page instead.
          </InfoBanner>
        </div>
      </div>
    );
  }

  if (account) {
    // Already has an account (e.g. reopened an old invite link) — just go to the app.
    return <Navigate to={account.role === "coach" ? "/coach/desk" : "/block"} replace />;
  }

  if (session) {
    return <ClaimStep code={code} invite={invite} onClaimed={refreshAccount} />;
  }

  return <SignInStep code={code} invite={invite} />;
}

function SignInStep({ code, invite }: { code: string; invite: PublicInvite }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send() {
    setError(null);
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}${window.location.pathname}#/invite/${code}` },
    });
    setBusy(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <div className="screen">
      <div className="hdr" style={{ paddingBottom: 8 }}>
        <div>
          <div className="k">You're invited</div>
          <div className="h1">{invite.clientName}</div>
        </div>
      </div>
      <div className="screen-scroll" style={{ gap: 16 }}>
        {sent ? (
          <InfoBanner icon="ph-envelope-simple-open" tone="accent">
            Check {email} for a sign-in link — open it on this device to finish setting up.
          </InfoBanner>
        ) : (
          <>
            <p className="mu" style={{ fontSize: 12.5, lineHeight: 1.6 }}>
              {invite.coachName} sent you this link
              {invite.role === "friend"
                ? " — once you're in, you can build your own programs from scratch or clone one of their saved templates, plus full nutrition tracking."
                : " — once you're in, you'll only ever see the program they build for you."}
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
    <div className="screen">
      <div className="hdr" style={{ paddingBottom: 8 }}>
        <div>
          <div className="k">You're invited</div>
          <div className="h1">Finish setting up</div>
        </div>
      </div>
      <div className="screen-scroll" style={{ gap: 16 }}>
        <p className="mu" style={{ fontSize: 12.5, lineHeight: 1.6 }}>
          You're signed in as {invite.clientName} — finish setting up your account with {invite.coachName}.
        </p>
        {error && <InfoBanner icon="ph-warning">{error}</InfoBanner>}
        <button className="btn btn-primary btn-block" style={{ height: 48, opacity: busy ? 0.5 : 1 }} disabled={busy} onClick={claim}>
          {busy ? "Setting up…" : "Create account & start"}
        </button>
      </div>
    </div>
  );
}
