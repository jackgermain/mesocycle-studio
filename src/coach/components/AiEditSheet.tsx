import React, { useState } from "react";
import { supabase } from "../../lib/supabase";
import { InfoBanner } from "../../components/UI";
import { applyOps, diffDays, type AiEditResult, type DiffLine, type EditOp } from "../programAiEdit";
import { useDictation } from "../../shared/useDictation";
import type { BuilderDay, CoachProgram } from "../types";

const EXAMPLES = [
  "Make every exercise one set",
  "Add 5 reps to every exercise",
  "Take the rest down to 60 seconds",
  "Drop the last exercise on each day",
];

/** Only what the model needs to make the decision: ids so it can target, and the current numbers so it
 * can reason about them. Sending the whole CoachProgram would ship internal bookkeeping (assignedCount,
 * visibility, phase weights) that has nothing to do with the edit and only adds noise. */
function summarizeForAi(program: CoachProgram) {
  return {
    name: program.name,
    loadUnit: program.effortScale,
    weeks: program.weeks,
    days: program.days.map((d) => ({
      dayId: d.id,
      name: d.name,
      exercises: d.exercises.map((ex) => ({
        exerciseId: ex.id,
        name: ex.name,
        muscle: ex.muscle,
        sets: ex.sets.length,
        reps: ex.sets.map((s) => s.reps),
        load: ex.sets.map((s) => s.loadValue),
        restSec: ex.sets[0]?.restSec ?? null,
      })),
    })),
  };
}

/** Ask for a change in plain English, see exactly what it would do, then accept or throw it away.
 *
 * The preview is not the model's description of its own work -- it's a diff computed from the real before
 * and after. A coach reviewing an explanation is reviewing the wrong thing; this way what they approve is
 * what they get. Nothing is written until they press Apply. */
export function AiEditSheet({
  program,
  onApply,
  onClose,
}: {
  program: CoachProgram;
  onApply: (days: BuilderDay[]) => void;
  onClose: () => void;
}) {
  return (
    <AiEditShell
      title={program.name}
      examples={EXAMPLES}
      buildPayload={() => summarizeForAi(program)}
      applyOps={(ops) => applyOps(program.days, ops)}
      diff={(next) => diffDays(program.days, next)}
      onApply={onApply}
      onClose={onClose}
    />
  );
}

/** The shared shell. Both the week template and a client's live program are edited by the same loop --
 * describe it, see a real diff, accept or discard -- and only the shapes differ, so those are props. */
export function AiEditShell<T>({
  title,
  examples,
  buildPayload,
  applyOps: apply,
  diff,
  onApply,
  onClose,
  context,
  placeholder,
}: {
  title: string;
  examples: string[];
  buildPayload: () => unknown;
  applyOps: (ops: EditOp[]) => T;
  diff: (next: T) => DiffLine[];
  onApply: (next: T) => void;
  onClose: () => void;
  /** What the coach is looking at, in words -- an open pain report, say. Sent alongside the program so
   * "swap this for something easier on his shoulder" resolves without them having to restate any of it.
   * Availability is the easy half of making this useful; knowing what "this" refers to is the other half. */
  context?: string;
  placeholder?: string;
}) {
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<{ next: T; diff: DiffLine[]; result: AiEditResult } | null>(null);
  // Appends rather than replaces, so several bursts of speech build one instruction.
  const dictation = useDictation((text) => setInstruction((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text)));

  async function run() {
    if (!instruction.trim()) return;
    setBusy(true);
    setError(null);
    setProposal(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Sign in again — your session expired.");

      const res = await fetch("/api/edit-program", {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ instruction, program: buildPayload(), context }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "That didn't work. Try again.");
      }
      const result = (await res.json()) as AiEditResult;
      const next = apply(result.ops ?? []);
      setProposal({ next, diff: diff(next), result });
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't work. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sheet-backdrop" onClick={busy ? undefined : onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "88%", overflowY: "auto" }}>
        <div className="row" style={{ marginBottom: 4 }}>
          <div style={{ flex: 1 }}>
            <div className="scr">Edit with AI</div>
            <div className="trunc" style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>{title}</div>
          </div>
          <button onClick={onClose} disabled={busy} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-neutral-500)" }}>
            <i className="ph ph-x" style={{ fontSize: 18 }} />
          </button>
        </div>

        {error && <InfoBanner icon="ph-warning">{error}</InfoBanner>}

        {context && (
          <div className="cell" style={{ padding: 11, borderLeft: "2px solid var(--color-accent)" }}>
            <div className="scr" style={{ color: "var(--color-accent-300)", marginBottom: 3 }}>It knows about</div>
            <div style={{ fontSize: 13, lineHeight: 1.5 }}>{context}</div>
          </div>
        )}

        <div className="field">
          <label>What would you like changed?</label>
          <textarea
            className="input"
            style={{ minHeight: 78, lineHeight: 1.5 }}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder={placeholder ?? "e.g. make every exercise one set — or tap the mic and say it"}
            disabled={busy}
            autoFocus
          />
          {dictation.supported && (
            <button
              className={`btn ${dictation.listening ? "btn-solid" : "btn-secondary"}`}
              style={{ height: 38, marginTop: 8, width: "100%" }}
              disabled={busy}
              onClick={dictation.toggle}
            >
              <i className={dictation.listening ? "ph-fill ph-microphone" : "ph ph-microphone"} style={{ fontSize: 15 }} />
              {dictation.listening ? "Listening — tap when you're done" : "Say it instead"}
            </button>
          )}
          {dictation.error && <div className="mu" style={{ marginTop: 6 }}>{dictation.error}</div>}
        </div>

        {!proposal && (
          <div>
            <div className="sh">Or tap an example</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {examples.map((ex) => (
                <button key={ex} className="chip" disabled={busy} onClick={() => setInstruction(ex)}>
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {proposal && (
          <>
            {proposal.result.summary && (
              <div className="mu" style={{ lineHeight: 1.55 }}>{proposal.result.summary}</div>
            )}

            <div>
              <div className="sh">What this changes · {proposal.diff.length === 0 ? "nothing" : proposal.diff.length}</div>
              {proposal.diff.length === 0 ? (
                <div className="mu">Nothing would change. Try saying it a different way.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {proposal.diff.map((line, i) => (
                    <div key={i} className="cell row" style={{ padding: "9px 11px" }}>
                      <span className="trunc" style={{ flex: 1, fontSize: 13 }}>{line.label}</span>
                      <span style={{ flex: "none", fontSize: 12, color: "var(--color-accent-300)", fontFamily: "var(--font-heading)" }}>{line.detail}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {proposal.result.notes && proposal.result.notes.length > 0 && (
              <InfoBanner icon="ph-eyes">{proposal.result.notes.join(" · ")}</InfoBanner>
            )}

            {proposal.diff.length > 0 && (
              <div className="row" style={{ gap: 8 }}>
                <button className="btn btn-secondary" style={{ flex: 1, height: 46 }} onClick={() => setProposal(null)}>
                  Discard
                </button>
                <button className="btn btn-primary" style={{ flex: 1, height: 46 }} onClick={() => onApply(proposal.next)}>
                  Apply
                </button>
              </div>
            )}
          </>
        )}

        {!proposal && (
          <button
            className="btn btn-primary btn-block"
            style={{ height: 46, opacity: instruction.trim() && !busy ? 1 : 0.5 }}
            disabled={!instruction.trim() || busy}
            onClick={run}
          >
            <i className={busy ? "ph ph-circle-notch" : "ph ph-sparkle"} style={{ fontSize: 15 }} />
            {busy ? "Working…" : "Show me the change"}
          </button>
        )}

        {proposal && (
          <button className="btn btn-secondary btn-block" style={{ height: 40, marginTop: 2 }} disabled={busy} onClick={run}>
            Ask again with the same wording
          </button>
        )}

        <div className="mu" style={{ textAlign: "center", marginTop: 6, lineHeight: 1.5 }}>
          Nothing is saved until you press Apply.
        </div>
      </div>
    </div>
  );
}
