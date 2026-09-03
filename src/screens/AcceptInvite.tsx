import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getInvite, markInviteUsed } from "../shared/invites";
import { activateAccount } from "../state/accounts";
import { setActiveProfileId } from "../state/activeProfile";
import { InfoBanner } from "../components/UI";

export default function AcceptInvite() {
  const { code = "" } = useParams();
  const nav = useNavigate();
  const invite = getInvite(code);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
          <InfoBanner icon="ph-link-break">This invite link isn't valid or has already been used. Ask your coach to send you a new one.</InfoBanner>
        </div>
      </div>
    );
  }

  function accept() {
    if (!invite) return;
    activateAccount(invite.clientId);
    markInviteUsed(invite.code);
    setActiveProfileId(invite.clientId);
    nav("/onboarding", { replace: true });
  }

  return (
    <div className="screen">
      <div className="hdr" style={{ paddingBottom: 8 }}>
        <div>
          <div className="k">You're invited</div>
          <div className="h1">Set up your account</div>
        </div>
      </div>
      <div className="screen-scroll" style={{ gap: 16 }}>
        <p className="mu" style={{ fontSize: 12.5, lineHeight: 1.6 }}>
          {invite.role === "friend"
            ? "Finish setting up and you can build your own programs from scratch or clone one of your coach's saved templates — plus full nutrition tracking."
            : "Finish setting up and you'll only ever see the program built for you."}
        </p>

        <InfoBanner icon="ph-info">
          This is a prototype — this screen simulates account creation. There's no real password security here, and no email is actually sent.
        </InfoBanner>

        <div className="field">
          <label>Name</label>
          <input className="input" value={invite.clientName} disabled />
        </div>
        <div className="field">
          <label>Email</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
        </div>
        <div className="field">
          <label>Password</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a password" />
        </div>

        <div style={{ marginTop: "auto", paddingBottom: 8 }}>
          <button className="btn btn-primary btn-block" style={{ height: 48 }} onClick={accept}>
            Create account & start
          </button>
        </div>
      </div>
    </div>
  );
}
