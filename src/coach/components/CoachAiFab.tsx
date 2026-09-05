import React, { useState } from "react";
import { useCoachStore } from "../store";
import { AiFab, useAiScopeRef, type AiScope } from "../../shared/aiScope";
import { AiEditShell } from "./AiEditSheet";
import { useDictation } from "../../shared/useDictation";
import { InfoBanner } from "../../components/UI";
import { listTargets, resolveTarget, type AiTarget } from "../aiTargets";
import { readClientProgram, saveClientProgram } from "../clientProgramEdits";
import { reconcileTemplateDays, diffTemplate, type ChangeEntry } from "../programAiEdit";
import { reconcileLiveProgram, diffProgram, summarizeProgramForAi } from "../../shared/liveProgramAiEdit";
import type { BuilderDay } from "../types";
import type { Program } from "../../data/types";

const idsOf = (changes: ChangeEntry[]) => changes.map((c) => c.exerciseId).filter((id): id is string => !!id);

/** The always-on button for the coach side.
 *
 * When a program is open, it edits that. When nothing is, it still opens straight into a text box rather
 * than sending you off to find something first -- an instruction like "add 5 reps to Jay's next week"
 * already says who it's about, so making the coach navigate there and repeat themselves is asking for
 * information they've just given. The name is matched against the roster locally; only when that's
 * genuinely unclear does it ask, and then it asks with a list rather than a shrug. */
export function CoachAiFab() {
  const ref = useAiScopeRef();
  const { state, dispatch } = useCoachStore();

  const [composing, setComposing] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [choices, setChoices] = useState<AiTarget[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<{ scope: AiScope; initial: string } | null>(null);

  const dictation = useDictation((text) => setInstruction((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text)));

  function toast(message: string) {
    dispatch({ type: "SHOW_TOAST", message });
    setTimeout(() => dispatch({ type: "CLEAR_TOAST" }), 2600);
  }

  function reset() {
    setComposing(false);
    setInstruction("");
    setChoices(null);
    setError(null);
    setLoading(false);
  }

  function open() {
    const current = ref?.current?.() ?? null;
    if (current) setScope({ scope: current, initial: "" });
    else setComposing(true);
  }

  function templateScope(target: AiTarget): AiScope | null {
    const program = state.programs.find((p) => p.id === target.id);
    if (!program) return null;
    return {
      title: program.name,
      buildPayload: () => ({
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
            sets: ex.sets.map((st) => ({ reps: st.reps, load: st.loadValue, restSec: st.restSec ?? null, warmup: st.warmup })),
          })),
        })),
      }),
      build: (result) => (result.days ? reconcileTemplateDays(program.days, result.days) : program.days),
      diff: (next) => diffTemplate(program.days, next as BuilderDay[]),
      apply: (next, changes, summary) => {
        dispatch({
          type: "SET_PROGRAM_DAYS",
          programId: program.id,
          days: next as BuilderDay[],
          aiEdit: { at: new Date().toISOString(), summary, exerciseIds: idsOf(changes) },
        });
        toast(`${program.name} — ${changes.length} change${changes.length === 1 ? "" : "s"} applied.`);
      },
    };
  }

  function liveScope(target: AiTarget, program: Program): AiScope {
    const currentWeek = program.weeks.find((w) => w.days.some((d) => d.status === "today"))?.number ?? null;
    return {
      title: `${target.name} · ${program.name}`,
      buildPayload: () => summarizeProgramForAi(program, currentWeek),
      build: (result) => (result.weeks ? reconcileLiveProgram(program, result.weeks) : program),
      diff: (next) => diffProgram(program, next as Program),
      apply: (next, changes, summary) => {
        const stamped: Program = {
          ...(next as Program),
          lastAiEdit: { at: new Date().toISOString(), summary, exerciseIds: idsOf(changes) },
        };
        void saveClientProgram(target.accountId!, stamped).then((ok) =>
          toast(ok ? `${target.name} — ${changes.length} change${changes.length === 1 ? "" : "s"} applied.` : `Couldn't save ${target.name}'s program — check your connection.`),
        );
      },
    };
  }

  async function go(target: AiTarget, text: string) {
    setError(null);
    if (target.kind === "template") {
      const next = templateScope(target);
      if (!next) return setError("That program isn't loaded any more.");
      reset();
      setScope({ scope: next, initial: text });
      return;
    }
    setLoading(true);
    const program = await readClientProgram(target.accountId!);
    setLoading(false);
    if (!program || program.weeks.length === 0) {
      setError(`${target.name.split(" ")[0]} doesn't have a program to change yet.`);
      return;
    }
    reset();
    setScope({ scope: liveScope(target, program), initial: text });
  }

  function submit() {
    const text = instruction.trim();
    if (!text) return;
    const targets = listTargets(state.programs, state.clients);
    if (targets.length === 0) {
      setError("There's nothing to edit yet — build a program or assign a client first.");
      return;
    }
    const { match, ambiguous } = resolveTarget(text, targets);
    if (match) return void go(match, text);
    // Never guess between two people. Offer the near-misses if there were any, the whole list otherwise.
    setChoices(ambiguous.length > 0 ? ambiguous : targets);
  }

  return (
    <>
      <AiFab onOpen={open} />

      {scope && (
        <AiEditShell
          title={scope.scope.title}
          buildPayload={scope.scope.buildPayload}
          build={scope.scope.build}
          diff={scope.scope.diff}
          context={scope.scope.context}
          placeholder={scope.scope.placeholder}
          initialInstruction={scope.initial}
          autoRun={!!scope.initial}
          onApply={(next, changes, summary) => {
            scope.scope.apply(next, changes, summary);
            setScope(null);
          }}
          onClose={() => setScope(null)}
        />
      )}

      {composing && !scope && (
        <div className="sheet-backdrop" onClick={loading ? undefined : reset}>
          <div className="sheet" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "88%", overflowY: "auto" }}>
            <div className="row" style={{ marginBottom: 4 }}>
              <div style={{ flex: 1 }}>
                <div className="scr">AI</div>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>
                  {choices ? "Which one?" : "Tell it what to do"}
                </div>
              </div>
              <button onClick={reset} disabled={loading} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-neutral-500)" }}>
                <i className="ph ph-x" style={{ fontSize: 16 }} />
              </button>
            </div>

            {error && <InfoBanner icon="ph-warning">{error}</InfoBanner>}

            {choices ? (
              <>
                <div className="mu" style={{ lineHeight: 1.55 }}>
                  "{instruction.trim()}" — but it's not clear who that's about. Pick one and it'll carry on.
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {choices.map((t) => (
                    <button key={`${t.kind}-${t.id}`} className="link-row" style={{ padding: "11px 12px" }} disabled={loading} onClick={() => go(t, instruction.trim())}>
                      <i className={t.kind === "client" ? "ph ph-user" : "ph ph-stack"} style={{ fontSize: 16, color: "var(--color-accent-300)" }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="trunc" style={{ fontSize: 12.5 }}>{t.name}</div>
                        <div className="mu trunc" style={{ marginTop: 1 }}>{t.detail}</div>
                      </div>
                    </button>
                  ))}
                </div>
                <button className="btn btn-secondary btn-block" style={{ height: 44 }} disabled={loading} onClick={() => setChoices(null)}>
                  Back
                </button>
              </>
            ) : (
              <>
                <div className="field">
                  <label>Respond to feedback, or edit a program</label>
                  <textarea
                    className="input"
                    style={{ minHeight: 84, lineHeight: 1.5 }}
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    placeholder="e.g. add 5 reps to everything in Jay's next week"
                    autoFocus
                  />
                  {dictation.supported && (
                    <button
                      className={`btn ${dictation.listening ? "btn-solid" : "btn-secondary"}`}
                      style={{ height: 36, marginTop: 8, width: "100%" }}
                      onClick={dictation.toggle}
                    >
                      <i className={dictation.listening ? "ph-fill ph-microphone" : "ph ph-microphone"} style={{ fontSize: 14 }} />
                      {dictation.listening ? "Listening — tap when you're done" : "Say it instead"}
                    </button>
                  )}
                  {dictation.error && <div className="mu" style={{ marginTop: 6 }}>{dictation.error}</div>}
                </div>

                <button
                  className="btn btn-primary btn-block"
                  style={{ height: 48, opacity: instruction.trim() && !loading ? 1 : 0.5 }}
                  disabled={!instruction.trim() || loading}
                  onClick={submit}
                >
                  <i className={loading ? "ph ph-circle-notch" : "ph ph-sparkle"} style={{ fontSize: 14 }} />
                  {loading ? "Opening…" : "Show me the change"}
                </button>
                <div className="mu" style={{ textAlign: "center", marginTop: 6, lineHeight: 1.5 }}>
                  Name the client or program. You'll review every change before it saves.
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
