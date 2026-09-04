import React, { useState } from "react";
import type { ClientSignal } from "../../shared/signals";
import { SimpleExercisePicker } from "../../shared/SimpleExercisePicker";
import { InfoBanner } from "../../components/UI";
import { addWarmupSetForClient, swapExerciseForClient } from "../clientProgramEdits";
import type { LibraryExercise } from "../types";

/** What a coach can actually do about a report, without leaving the desk. The two responses to joint pain
 * that don't cost training volume are warming the movement up more and replacing it, so both are one tap
 * here -- but only when the client named the exercise (see migration 0014); a report from before that, or
 * one where they said it wasn't any single movement, can only be opened and read. */
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
  const [picking, setPicking] = useState(false);
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

  async function swap(replacement: LibraryExercise) {
    if (!exercise) return;
    setPicking(false);
    setBusy("swap");
    setFailed(null);
    const touched = await swapExerciseForClient(signal.client_id, exercise, replacement);
    setBusy(null);
    const msg = describe(touched, `${exercise} → ${replacement.name}`);
    if (touched === null || touched === 0) return setFailed(msg);
    onApplied(msg!);
  }

  if (picking) return <SimpleExercisePicker onPick={swap} onClose={() => setPicking(false)} />;

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
            <i className="ph ph-x" style={{ fontSize: 18 }} />
          </button>
        </div>

        <div className="cell" style={{ padding: 11, display: "flex", flexDirection: "column", gap: 5 }}>
          {exercise && (
            <div style={{ fontSize: 13 }}>
              <span className="mu">On </span>
              {exercise}
            </div>
          )}
          {signal.detail && <div style={{ fontSize: 13, lineHeight: 1.5 }}>{signal.detail}</div>}
          <div className="mu">
            {signal.day_label ?? "Session"} · reported {new Date(signal.created_at).toLocaleDateString()}
          </div>
        </div>

        {failed && <InfoBanner icon="ph-warning">{failed}</InfoBanner>}

        {exercise ? (
          <>
            <button className="link-row" style={{ padding: "12px 12px" }} disabled={!!busy} onClick={addWarmup}>
              <i className="ph ph-thermometer-simple" style={{ fontSize: 16, color: "var(--color-accent-300)" }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13 }}>{busy === "warmup" ? "Adding…" : "Add a warm-up set"}</div>
                <div className="mu" style={{ marginTop: 1 }}>One more warm-up on {exercise}, every session that's left. Keeps the working volume.</div>
              </div>
            </button>

            <button className="link-row" style={{ padding: "12px 12px" }} disabled={!!busy} onClick={() => setPicking(true)}>
              <i className="ph ph-arrows-clockwise" style={{ fontSize: 16, color: "var(--color-accent-300)" }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13 }}>{busy === "swap" ? "Swapping…" : "Change the exercise"}</div>
                <div className="mu" style={{ marginTop: 1 }}>Replaces {exercise} for the rest of the block. Logged sessions stay as they were.</div>
              </div>
            </button>
          </>
        ) : (
          <div className="mu" style={{ lineHeight: 1.55 }}>
            {signal.kind === "joint"
              ? `${first} didn't tie this to a single exercise, so there's nothing to swap automatically.`
              : "Open the session to see what they logged."}
          </div>
        )}

        <button className="link-row" style={{ padding: "12px 12px" }} disabled={!!busy} onClick={onOpenSession}>
          <i className="ph ph-arrow-square-out" style={{ fontSize: 16, color: "var(--color-neutral-400)" }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13 }}>Open their session</div>
            <div className="mu" style={{ marginTop: 1 }}>See everything they logged and edit it by hand.</div>
          </div>
        </button>
      </div>
    </div>
  );
}
