import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AiFab, useAiScopeRef, type AiScope } from "./aiScope";
import { AiEditShell } from "../coach/components/AiEditSheet";

/** The button, plus what happens when there's nothing on screen for it to act on.
 *
 * It's deliberately still there on the desk and the roster. "Available except sometimes" is a worse
 * promise than "available, and it tells you what it needs" -- and the fallback does real work by handing
 * over the two routes that lead somewhere editable, rather than just apologising. */
export function AiFabHost({ hidden }: { hidden?: boolean }) {
  const ref = useAiScopeRef();
  const nav = useNavigate();
  const [scope, setScope] = useState<AiScope | null>(null);
  const [stuck, setStuck] = useState(false);

  function open() {
    const next = ref?.current?.() ?? null;
    if (next) setScope(next);
    else setStuck(true);
  }

  return (
    <>
      <AiFab hidden={hidden} onOpen={open} />

      {scope && (
        <AiEditShell
          title={scope.title}
          buildPayload={scope.buildPayload}
          build={scope.build}
          diff={scope.diff}
          context={scope.context}
          placeholder={scope.placeholder}
          onApply={(next, changes, summary) => {
            scope.apply(next, changes, summary);
            setScope(null);
          }}
          onClose={() => setScope(null)}
        />
      )}

      {stuck && (
        <div className="sheet-backdrop" onClick={() => setStuck(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="row" style={{ marginBottom: 4 }}>
              <div style={{ flex: 1 }}>
                <div className="scr">Edit with AI</div>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>Nothing open to change</div>
              </div>
              <button onClick={() => setStuck(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-neutral-500)" }}>
                <i className="ph ph-x" style={{ fontSize: 18 }} />
              </button>
            </div>
            <div className="mu" style={{ lineHeight: 1.55 }}>
              This edits whatever program you're looking at. Open one and the button works on it.
            </div>
            <button
              className="link-row"
              style={{ padding: "12px 12px" }}
              onClick={() => {
                setStuck(false);
                nav("/coach/programs");
              }}
            >
              <i className="ph ph-stack" style={{ fontSize: 16, color: "var(--color-accent-300)" }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13 }}>Open a program</div>
                <div className="mu" style={{ marginTop: 1 }}>Edit a template or a draft.</div>
              </div>
            </button>
            <button
              className="link-row"
              style={{ padding: "12px 12px" }}
              onClick={() => {
                setStuck(false);
                nav("/coach/clients");
              }}
            >
              <i className="ph ph-users-three" style={{ fontSize: 16, color: "var(--color-accent-300)" }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13 }}>Open a client's session</div>
                <div className="mu" style={{ marginTop: 1 }}>Change their real numbers, week by week.</div>
              </div>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
