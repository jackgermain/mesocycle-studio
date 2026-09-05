import React, { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { InfoBanner } from "../../components/UI";
import { reconcileTemplateDays, diffTemplate, type AiEditResult, type ChangeEntry } from "../programAiEdit";
import { useDictation } from "../../shared/useDictation";
import type { BuilderDay, CoachProgram } from "../types";

const EXAMPLES = [
  "Make every exercise one set",
  "Add 5 reps to every exercise",
  "Take the rest down to 60 seconds",
  "Drop the last exercise on each day",
];

/** Only what the model needs, and in the shape it has to return. Sending the whole CoachProgram would
 * ship internal bookkeeping (assignedCount, visibility, phase weights) that has nothing to do with the
 * edit and only adds noise -- and giving it fields it can't return invites it to drop them. */
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
        sets: ex.sets.map((s) => ({ reps: s.reps, load: s.loadValue, restSec: s.restSec ?? null, warmup: s.warmup })),
      })),
    })),
  };
}

/** Ask for a change in plain English, see everything it did, then accept or throw it away.
 *
 * The preview is not the model's account of its own work -- it's a diff computed from the real before and
 * after. That distinction is what makes free-form rewriting safe: the model can return whatever it likes,
 * and anything it touched shows up here whether it was asked for or not. Nothing is written until Apply. */
export function AiEditSheet({
  program,
  onApply,
  onClose,
}: {
  program: CoachProgram;
  onApply: (days: BuilderDay[], changes: ChangeEntry[], summary: string) => void;
  onClose: () => void;
}) {
  return (
    <AiEditShell
      title={program.name}
      examples={EXAMPLES}
      buildPayload={() => summarizeForAi(program)}
      build={(result) => (result.days ? reconcileTemplateDays(program.days, result.days) : program.days)}
      diff={(next) => diffTemplate(program.days, next)}
      onApply={onApply}
      onClose={onClose}
    />
  );
}

const KIND_TONE: Record<ChangeEntry["kind"], string> = {
  added: "var(--color-accent-300)",
  removed: "var(--color-neutral-400)",
  renamed: "var(--color-accent-300)",
  muscle: "var(--color-accent-300)",
  sets: "var(--color-accent-300)",
  reps: "var(--color-accent-300)",
  load: "var(--color-accent-300)",
  rest: "var(--color-accent-300)",
  warmups: "var(--color-accent-300)",
  moved: "var(--color-neutral-400)",
  day: "var(--color-neutral-400)",
};

/** The shared shell. Both the week template and a client's live program run the same loop -- describe it,
 * see a real diff, accept or discard -- and only the shapes differ, so those are props. */
export function AiEditShell<T>({
  title,
  examples,
  buildPayload,
  build,
  diff,
  onApply,
  onClose,
  context,
  placeholder,
  initialInstruction,
  autoRun,
}: {
  title: string;
  examples: string[];
  buildPayload: () => unknown;
  build: (result: AiEditResult) => T;
  diff: (next: T) => ChangeEntry[];
  onApply: (next: T, changes: ChangeEntry[], summary: string) => void;
  onClose: () => void;
  /** What the coach is looking at, in words -- an open pain report, say. Sent alongside the program so
   * "swap this for something easier on his shoulder" resolves without them having to restate any of it. */
  context?: string;
  placeholder?: string;
  /** Pre-filled and submitted on mount — used when the instruction was already typed somewhere else (the
   * always-on button's compose box) and this sheet is only taking over to resolve and review it. */
  initialInstruction?: string;
  autoRun?: boolean;
}) {
  const [instruction, setInstruction] = useState(initialInstruction ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<{ next: T; changes: ChangeEntry[]; result: AiEditResult } | null>(null);
  // Appends rather than replaces, so several bursts of speech build one instruction.
  const dictation = useDictation((text) => setInstruction((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text)));

  const started = useRef(false);
  useEffect(() => {
    if (!autoRun || started.current || !(initialInstruction ?? "").trim()) return;
    started.current = true;
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun, initialInstruction]);

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
      const next = build(result);
      setProposal({ next, changes: diff(next), result });
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't work. Try again.");
    } finally {
      setBusy(false);
    }
  }

  // Grouped by where the change landed, so a day you didn't mention standing there with edits under it is
  // immediately obvious rather than buried in a flat list.
  const grouped = new Map<string, ChangeEntry[]>();
  for (const c of proposal?.changes ?? []) {
    const list = grouped.get(c.scope) ?? [];
    list.push(c);
    grouped.set(c.scope, list);
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
            placeholder={placeholder ?? "Say anything — e.g. make every exercise one set, or swap the barbell work for dumbbells"}
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
            {proposal.result.summary && <div className="mu" style={{ lineHeight: 1.55 }}>{proposal.result.summary}</div>}

            <div>
              <div className="sh">
                Everything it changed · {proposal.changes.length === 0 ? "nothing" : proposal.changes.length}
              </div>
              {proposal.changes.length === 0 ? (
                <div className="mu">Nothing would change. Try saying it a different way.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {Array.from(grouped.entries()).map(([scope, list]) => (
                    <div key={scope}>
                      <div className="scr" style={{ marginBottom: 4 }}>{scope}</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {list.map((c, i) => (
                          <div key={i} className="cell row" style={{ padding: "8px 11px", gap: 8 }}>
                            <span className="trunc" style={{ flex: 1, fontSize: 13 }}>{c.target}</span>
                            <span style={{ flex: "none", fontSize: 12, color: KIND_TONE[c.kind], fontFamily: "var(--font-heading)" }}>{c.detail}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {proposal.changes.length > 0 && (
                <div className="mu" style={{ marginTop: 8, lineHeight: 1.5 }}>
                  This is everything that differs, not just what you asked for. Anything here you didn't want is a
                  reason to discard.
                </div>
              )}
            </div>

            {proposal.result.notes && proposal.result.notes.length > 0 && (
              <InfoBanner icon="ph-eyes">{proposal.result.notes.join(" · ")}</InfoBanner>
            )}

            {proposal.changes.length > 0 && (
              <div className="row" style={{ gap: 8 }}>
                <button className="btn btn-secondary" style={{ flex: 1, height: 46 }} onClick={() => setProposal(null)}>
                  Discard
                </button>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1, height: 46 }}
                  onClick={() => onApply(proposal.next, proposal.changes, proposal.result.summary ?? instruction.trim())}
                >
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
