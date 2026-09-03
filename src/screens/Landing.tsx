import React from "react";
import { useNavigate } from "react-router-dom";
import { setActiveProfileId } from "../state/activeProfile";
import { hasAccount } from "../state/accounts";

export default function Landing() {
  const nav = useNavigate();

  function enterClient(profileId: string) {
    setActiveProfileId(profileId);
    nav("/block");
  }

  return (
    <div className="screen">
      <div className="hdr" style={{ paddingBottom: 8 }}>
        <div>
          <div className="k">Mesocycle Studio</div>
          <div className="h1">Choose a view</div>
        </div>
      </div>
      <div className="screen-scroll" style={{ gap: 16 }}>
        <p className="mu" style={{ fontSize: 12.5, lineHeight: 1.6 }}>
          One backend, two apps. The coach authors and monitors; the client logs and verifies. Nothing here changes a prescription on its own.
        </p>

        {hasAccount("marcus") ? (
          <button
            className="cell elev-md"
            style={{ padding: 18, textAlign: "left", cursor: "pointer", border: "1px solid var(--color-accent)", background: "var(--color-accent-900)" }}
            onClick={() => enterClient("marcus")}
          >
            <div className="row" style={{ marginBottom: 8 }}>
              <i className="ph-fill ph-barbell" style={{ fontSize: 22, color: "var(--color-accent)" }} />
              <span className="tag tag-outline" style={{ marginLeft: "auto" }}>Client</span>
            </div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 18, color: "var(--color-accent-100)" }}>Continue as Marcus</div>
            <div className="mu" style={{ marginTop: 4, color: "var(--color-accent-300)", lineHeight: 1.5 }}>
              Log today's session, verify every set, track progress and macros.
            </div>
          </button>
        ) : (
          <div className="cell" style={{ padding: 18 }}>
            <div className="row" style={{ marginBottom: 8 }}>
              <i className="ph ph-envelope-simple" style={{ fontSize: 22, color: "var(--color-neutral-400)" }} />
              <span className="tag tag-neutral" style={{ marginLeft: "auto" }}>Client</span>
            </div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 18 }}>Waiting on an invite</div>
            <div className="mu" style={{ marginTop: 4, lineHeight: 1.5 }}>
              A coach has to send you a link to get started — you can't just walk in and pick a program.
            </div>
          </div>
        )}

        <button className="cell elev-md" style={{ padding: 18, textAlign: "left", cursor: "pointer" }} onClick={() => nav("/coach/desk")}>
          <div className="row" style={{ marginBottom: 8 }}>
            <i className="ph-fill ph-squares-four" style={{ fontSize: 22, color: "var(--color-neutral-300)" }} />
            <span className="tag tag-neutral" style={{ marginLeft: "auto" }}>Coach</span>
          </div>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 18 }}>Continue as Dana</div>
          <div className="mu" style={{ marginTop: 4, lineHeight: 1.5 }}>
            Triage the roster, write next week's numbers, review feedback and flags.
          </div>
        </button>

        <button className="cell elev-md" style={{ padding: 18, textAlign: "left", cursor: "pointer" }} onClick={() => enterClient("dana")}>
          <div className="row" style={{ marginBottom: 8 }}>
            <i className="ph-fill ph-person-simple-run" style={{ fontSize: 22, color: "var(--color-neutral-300)" }} />
            <span className="tag tag-neutral" style={{ marginLeft: "auto" }}>Personal</span>
          </div>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 18 }}>Train yourself</div>
          <div className="mu" style={{ marginTop: 4, lineHeight: 1.5 }}>
            Your own program and log, separate from your clients — not part of the roster.
          </div>
        </button>
      </div>
    </div>
  );
}
