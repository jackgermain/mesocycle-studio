import React, { useState } from "react";
import type { ClientSignal } from "../../shared/signals";
import { InfoBanner } from "../../components/UI";
import { addWarmupSetForClient } from "../clientProgramEdits";

/** What a coach can do about a report without leaving the desk. Adding a warm-up set is the one response
 * that's genuinely a single decision -- it costs no training volume and needs no choice about what to put
 * in its place -- so it happens right here. Swapping or dropping the movement is a judgement call that
 * wants the session in front of you, so it lives one tap away in the day itself, which "Open their
 * session" now goes straight to. Both need the client to have named the exercise (migration 0014); an
 * older report, or one where they said it wasn't any single movement, can only be opened and read. */
export function SignalActionSheet({
  signal,
  clientName,
  onOpenSession,
  onApplied,
  onClose,
}: {
  signal: ClientSignal;
  clientName: string;
  onOpenSession: () => void;
  onApplied: (message: string) => void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const exercise = signal.exercise ?? null;
  const first = clientName.split(" ")[0];

  function describe(touched: number | null, done: string): string | null {
    if (touched === null) return `Couldn't update ${first}'s program — check your connection and try again.`;
    if (touched === 0) return `${exercise} isn't in any of ${first}'s remaining sessions, so there was nothing to change.`;
    return `${done} — ${touched} session${touched === 1 ? "" : "s"} updated.`;
  }

  async function addWarmup() {
    if (!exercise) return;
    setBusy("warmup");
    setFailed(null);
    const touched = await addWarmupSetForClient(signal.client_id, exercise);
    setBusy(null);
    const msg = describe(touched, `Warm-up set added to ${exercise}`);
    if (touched === null || touched === 0) return setFailed(msg);
    onApplied(msg!);
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "85%", overflowY: "auto" }}>
        <div className="row" style={{ marginBottom: 4 }}>
          <div style={{ flex: 1 }}>
            <div className="scr">{clientName}</div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>
              {signal.kind === "joint" ? "Joint pain" : signal.kind === "soreness" ? "Still sore" : "Low pump"}
              {signal.note ? ` — ${signal.note}` : ""}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-neutral-500)" }}>
            <i className="ph ph-x" style={{ fontSize: 16 }} />
          </button>
        </div>

        <div className="cell" style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {exercise && (
            <div style={{ fontSize: 12.5 }}>
              <span className="mu">On </span>
              {exercise}
            </div>
          )}
          {signal.detail && <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>{signal.detail}</div>}
          <div className="mu">
            {signal.day_label ?? "Session"} · reported {new Date(signal.created_at).toLocaleDateString()}
          </div>
        </div>

        {failed && <InfoBanner icon="ph-warning">{failed}</InfoBanner>}

        <button className="link-row" style={{ padding: "12px 12px" }} disabled={!!busy} onClick={onOpenSession}>
          <i className="ph ph-arrow-square-out" style={{ fontSize: 16, color: "var(--color-accent-300)" }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12.5 }}>Open their session</div>
            <div className="mu" style={{ marginTop: 1 }}>
              {exercise
                ? `Goes straight to ${exercise} on the day it happened, where you can swap or drop it.`
                : "Opens the day it was reported on, where you can say which exercise it was and act on it."}
            </div>
          </div>
        </button>

        {exercise ? (
          <button className="link-row" style={{ padding: "12px 12px" }} disabled={!!busy} onClick={addWarmup}>
            <i className="ph ph-thermometer-simple" style={{ fontSize: 16, color: "var(--color-accent-300)" }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5 }}>{busy === "warmup" ? "Adding…" : "Add a warm-up set"}</div>
              <div className="mu" style={{ marginTop: 1 }}>One more warm-up on {exercise}, every session that's left. Keeps the working volume.</div>
            </div>
          </button>
        ) : (
          <div className="mu" style={{ lineHeight: 1.55 }}>
            {signal.kind === "joint"
              ? `${first} didn't name an exercise, so there's nothing to add a warm-up to from here — open the session and you can pick which one it was.`
              : "Open the session to see what they logged."}
          </div>
        )}
      </div>
    </div>
  );
}
