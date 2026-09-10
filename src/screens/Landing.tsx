import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { AuthHero as Hero, InfoBanner } from "../components/UI";
import InstallPrompt from "../components/InstallPrompt";
import { pendingInvite } from "../shared/pendingInvite";

export default function Landing() {
  const { loading, session, account, recovering, clearRecovering, revoked, clearRevoked } = useAuth();
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

  // Clicked a "reset your password" email link — this session is only good for setting a new password,
  // not for using the app, even though technically it's a real signed-in session.
  if (recovering) {
    return <ResetPassword onDone={clearRecovering} />;
  }

  if (revoked) {
    return (
      <Hero>
        <div className="h1" style={{ textAlign: "center" }}>Access revoked</div>
        <InfoBanner icon="ph-lock-simple">Your coach has revoked access to this account. Reach out to them if you think that's a mistake.</InfoBanner>
        <button className="btn btn-secondary btn-block" style={{ height: 44 }} onClick={clearRevoked}>
          Back to sign in
        </button>
      </Hero>
    );
  }

  if (account) {
    return <Navigate to={account.role === "coach" ? "/coach/desk" : "/block"} replace />;
  }

  if (session) {
    return <NoAccountYet />;
  }

  return <SignIn />;
}

function ResetPassword({ onDone }: { onDone: () => void }) {
  const { signOut } = useAuth();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setError(error.message);
    else onDone();
  }

  return (
    <Hero>
      <div className="h1" style={{ textAlign: "center", fontSize: 21 }}>Set a new password</div>
      <div className="field">
        <label>New password</label>
        <input
          className="input"
          style={{ height: 50, fontSize: 14 }}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 6 characters"
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && password.length >= 6 && !busy && save()}
        />
      </div>
      {error && <InfoBanner icon="ph-warning">{error}</InfoBanner>}
      <button className="btn btn-solid btn-block" style={{ height: 54, fontSize: 14, opacity: password.length >= 6 && !busy ? 1 : 0.5 }} disabled={password.length < 6 || busy} onClick={save}>
        {busy ? "Saving…" : "Save password"}
      </button>
      {/* Clicking a reset email by mistake used to strand you here: the only control set a new password,
          and this session is not usable for anything else. Signing out rather than only clearing the flag,
          because a recovery session should not quietly become a real one. */}
      <button className="btn btn-ghost" style={{ fontSize: 12.5 }} disabled={busy} onClick={() => void signOut()}>
        Cancel and sign in instead
      </button>
    </Hero>
  );
}

/** Sign-in only. Creating an account happens on an invite link and nowhere else -- a client's, a
 * friend's, or now a coach's, all of which carry the person's name so nothing has to be typed in
 * afterwards. A "create an account" button here would produce a signed-in session with no account and
 * no invite attached to it, which is the dead end this whole change exists to remove. */
function SignIn() {
  const nav = useNavigate();
  const [step, setStep] = useState<"welcome" | "form">("welcome");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showInviteField, setShowInviteField] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [resetSent, setResetSent] = useState(false);

  async function submit() {
    setError(null);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setError(error.message);
    // On success, AuthProvider's onAuthStateChange picks up the session and Landing re-renders itself
    // into the right place -- coach desk or client app.
  }

  async function sendReset() {
    setError(null);
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}${window.location.pathname}` });
    setBusy(false);
    if (error) setError(error.message);
    else setResetSent(true);
  }

  function goToInvite() {
    const code = inviteCode.trim();
    if (code) nav(`/invite/${code}`);
  }

  if (step === "welcome") {
    return (
      <Hero>
        <div className="h1" style={{ textAlign: "center", fontSize: 21 }}>Welcome!</div>
        <button className="btn btn-solid btn-block" style={{ height: 54, fontSize: 16, marginTop: 6 }} onClick={() => setStep("form")}>
          Sign in
        </button>
        <button className="btn btn-ghost" style={{ fontSize: 12.5 }} onClick={() => { setStep("form"); setShowInviteField(true); }}>
          Have an invite code instead?
        </button>
        {/* Shown before sign-in on purpose: a new client arrives here from a link on their phone, in a
            browser tab, which is exactly the moment to say this. */}
        <InstallPrompt compact />
      </Hero>
    );
  }

  return (
    <Hero>
      {!showInviteField ? (
        <>
          {resetSent ? (
            <InfoBanner icon="ph-envelope-simple-open" tone="accent">
              Check {email} for a password reset link.
            </InfoBanner>
          ) : (
            <>
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
                  placeholder="••••••••"
                  onKeyDown={(e) => e.key === "Enter" && email.trim() && password.length >= 6 && !busy && submit()}
                />
              </div>
              {error && <InfoBanner icon="ph-warning">{error}</InfoBanner>}
              <button className="btn btn-solid btn-block" style={{ height: 54, fontSize: 14, opacity: email.trim() && password.length >= 6 && !busy ? 1 : 0.5 }} disabled={!email.trim() || password.length < 6 || busy} onClick={submit}>
                {busy ? "Working…" : "Sign in"}
              </button>
              <button className="btn btn-ghost" style={{ fontSize: 12.5 }} disabled={!email.trim() || busy} onClick={sendReset}>
                Forgot password?
              </button>

              <div style={{ height: 1, background: "var(--color-divider)", margin: "6px 0" }} />

              <button className="btn btn-ghost" style={{ fontSize: 12.5 }} onClick={() => setShowInviteField(true)}>
                Have an invite code instead?
              </button>
            </>
          )}
        </>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="field">
            <label>Invite code</label>
            <input
              className="input"
              style={{ height: 46, fontSize: 14, textTransform: "uppercase", letterSpacing: 1 }}
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="ABC123"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && goToInvite()}
            />
          </div>
          <button className="btn btn-solid btn-block" style={{ height: 54, opacity: inviteCode.trim() ? 1 : 0.5 }} disabled={!inviteCode.trim()} onClick={goToInvite}>
            Continue with code
          </button>
          <button className="btn btn-ghost" style={{ fontSize: 12.5 }} onClick={() => setShowInviteField(false)}>
            Sign in with email instead
          </button>
        </div>
      )}
    </Hero>
  );
}

/** The screen that is left after account creation moved entirely onto invite links.
 *
 * This used to be a form: an invite-code field, a name field, a coach signup code, and two buttons --
 * because it had to serve a coach setting themselves up and an invited client whose claim had been
 * interrupted, at the same time, and there is no wording that speaks to both. In beta it read as the app
 * demanding an invite code from the platform owner, who had never been given one.
 *
 * Every account now comes from a named invite link, coaches included, so there is nothing to ask for. A
 * signed-in session with no account is no longer a state anyone is meant to reach: a live invite is
 * remembered and redirected to above, the root offers sign-in only, and a coach arrives through a link
 * carrying their name. What is left is the genuine dead end -- an email that was never invited, or a
 * claim abandoned on a link that has since been used -- and the only honest thing to do with it is say
 * so and offer the way out. */
function NoAccountYet() {
  const { signOut } = useAuth();

  // The invite this session started on, remembered when AcceptInvite first resolved it. Confirming an
  // email, reopening the installed app, or closing the tab all lose the URL, and the code lives nowhere
  // else -- so without this the person is looking at the dead end below with a perfectly good invite
  // sitting unclaimed. No coach-signup exception any more: coaches arrive on an invite link too, so a
  // stored code is now the only thing that can be true here and it always wins.
  const stored = pendingInvite();
  if (stored) return <Navigate to={`/invite/${stored}`} replace />;

  return (
    <Hero>
      <InfoBanner icon="ph-info">
        Nothing is set up for this email. Accounts here are created from an invite link — open the one your
        coach sent you, or ask them for a new one.
      </InfoBanner>
      <button className="btn btn-ghost" style={{ fontSize: 12.5 }} onClick={() => void signOut()}>
        Use a different email
      </button>
    </Hero>
  );
}
