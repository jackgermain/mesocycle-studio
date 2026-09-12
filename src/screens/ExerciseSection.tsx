import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../state/store";
import { SetEffortSheet } from "./SetEffortSheet";
import { useRecordEffort } from "./useRecordEffort";
import { effortOwedSet } from "../shared/effortOwed";
import type { WorkExercise, WorkSet } from "../data/types";
import type { LoadMode } from "../coach/types";
import { isSpecialSet, specialSummary, stepLoad, typeLabel } from "./exerciseHelpers";
import { TickButton } from "../components/UI";

/** A set's weight/reps value, editable by tapping the +/- buttons OR tapping the number itself and typing
 * a value directly -- the +/- alone made sense on a phone, but not once this app also needs to work with a
 * keyboard on a desktop/web build. Keeps its own draft text while focused so a mid-edit "" or "1" isn't
 * immediately fought back to the last committed number; commits on blur/Enter, parseFloat-based like the
 * bodyweight input on the Progress tab already does. */
function InlineNumberInput({ value, onCommit, placeholder, color, locked }: { value: number | null; onCommit: (n: number) => void; placeholder?: string; color: string; locked?: boolean }) {
  const [text, setText] = useState(value == null ? "" : String(value));
  useEffect(() => {
    setText(value == null ? "" : String(value));
  }, [value]);

  function commit() {
    const n = parseFloat(text);
    if (Number.isFinite(n)) onCommit(n);
    else setText(value == null ? "" : String(value));
  }

  return (
    <input
      type="number"
      inputMode="decimal"
      value={text}
      placeholder={placeholder}
      readOnly={locked}
      onChange={(e) => setText(e.target.value)}
      onFocus={(e) => e.target.select()}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          commit();
          (e.target as HTMLInputElement).blur();
        }
      }}
      onClick={(e) => e.stopPropagation()}
      className="mono"
      style={{ width: 44, textAlign: "center", background: "none", border: "none", outline: "none", fontSize: 18, fontWeight: 700, color, padding: 0, cursor: locked ? "default" : "text" }}
    />
  );
}

/** The per-exercise weight/rep/checkbox editor used on the client's own workout screen, the coach's
 * in-person session logger, AND now every other day view too (a future day's preview, a past logged day)
 * -- same component, same visual result everywhere, so a day doesn't suddenly look like a different, plainer
 * app depending on when you view it. `readOnly="future"` disables only ticking a set done (you can't
 * complete a workout that hasn't happened yet) -- weight/reps stay editable, since adjusting one day's
 * target ahead of time is harmless. `readOnly="past"` locks everything, matching the existing "logged
 * sessions are read-only after 24 hours" rule -- editing history isn't safe to allow here. Either way the
 * set-count menu and "+Extra set" are hidden, since changing how many sets exist isn't a same-screen action
 * for a day you're not actively logging. */
/** Which unit an exercise was prescribed in.
 *
 * Programs built before WorkExercise carried loadMode have to be read back off their sets, and the tell is
 * `load`: loadForLoadMode only returns a number for lb, so a null load with an RPE/RIR/%1RM scale means
 * that scale was the real prescription. Reading `effort` alone would not do -- effortForLoadMode fills in
 * {RIR, 2} for lb as a placeholder, which would print "RIR 2" under every barbell lift in the app. */
function loadModeOf(ex: { loadMode?: LoadMode; sets: WorkSet[] }): LoadMode {
  if (ex.loadMode) return ex.loadMode;
  const first = ex.sets.find((s) => !s.removed) ?? ex.sets[0];
  if (!first || first.prescribed.load !== null) return "lb";
  const scale = first.prescribed.effort?.scale;
  return scale === "RPE" ? "rpe" : scale === "%1RM" ? "pct1rm" : scale === "RIR" ? "rir" : "lb";
}

export function ExerciseSection({
  index,
  dayId,
  ex,
  menuOpen,
  onToggleMenu,
  onAddSet,
  onAddWarmup,
  onRemoveSet,
  onSwap,
  onRemoveExercise,
  onFormCheck,
  readOnly,
  askEffort = true,
}: {
  index: number;
  dayId: string;
  ex: WorkExercise;
  menuOpen?: boolean;
  onToggleMenu?: (e: React.MouseEvent) => void;
  onAddSet?: () => void;
  onAddWarmup?: () => void;
  onRemoveSet?: () => void;
  /** Coach-only: swapping the exercise itself is a prescription change, so this is left undefined on the client's own workout screen and only wired up from the coach's session logger. */
  onSwap?: () => void;
  /** Same rule as onSwap -- dropping a movement is a change to the prescription, so only whoever owns the
   * program gets it: a coach, or someone training themselves. */
  onRemoveExercise?: () => void;
  /** Absent when there's no coach to send it to -- a coach training themselves has nobody to ask. */
  onFormCheck?: () => void;
  readOnly?: "future" | "past";
  /** False where nobody present can answer for the set -- a coach opening a client's older session to act
   * on a report was being stopped by a rating on sets logged before ratings existed. */
  askEffort?: boolean;
}) {
  const locked = readOnly === "past";
  const { dispatch } = useStore();
  const recordEffort = useRecordEffort();
  const nav = useNavigate();
  const doneCount = ex.sets.filter((s) => s.checked).length;
  const allDone = doneCount === ex.sets.length;

  /** The how-hard rating this exercise still owes: its last working set, once ticked and until rated (G62,
   * last set only). Derived from the logged sets rather than set when a box is ticked -- a cluster, tempo
   * or assisted set is ticked on the live-set screen and never came through here, and a question lost to
   * leaving the screen was never asked again. The sheet has no skip and no backdrop dismiss, so it stays up
   * until the answer is stored. See effortOwed.ts. */
  const owedSet = readOnly || !askEffort ? null : effortOwedSet(ex);

  function toggle(s: WorkSet) {
    dispatch({ type: "SET_CHECKED", dayId, exerciseId: ex.id, setId: s.id, checked: !s.checked });
  }

  function answerEffort(effort: number) {
    if (owedSet) recordEffort(dayId, ex, owedSet.id, effort);
  }
  // On a timed exercise the number is seconds, so the nudge is five at a time -- a one-second step on a
  // plank is not a meaningful adjustment.
  const repStep = ex.timed ? 5 : 1;
  function editReps(s: WorkSet, delta: number) {
    const current = s.actual?.reps ?? (typeof s.prescribed.reps === "number" ? s.prescribed.reps : 0);
    dispatch({ type: "EDIT_SET_TARGET", dayId, exerciseId: ex.id, setId: s.id, reps: Math.max(0, current + delta * repStep) });
  }
  function editLoad(s: WorkSet, direction: 1 | -1) {
    const current = s.actual?.load ?? s.prescribed.load ?? 0;
    const next = stepLoad(ex, current, direction);
    dispatch({ type: "EDIT_SET_TARGET", dayId, exerciseId: ex.id, setId: s.id, load: next });
  }
  function editRest(delta: number) {
    const current = ex.sets[0]?.prescribed.restSec ?? 0;
    const next = Math.max(15, current + delta);
    dispatch({ type: "SET_EXERCISE_REST", dayId, exerciseId: ex.id, restSec: next });
  }

  let workCounter = 0;
  let warmCounter = 0;

  const mode = loadModeOf(ex);
  // RPE and RIR earn a column; %1RM and lb do not.
  const effortColumn = mode === "rpe" ? "RPE" : mode === "rir" ? "RIR" : null;
  const COLS = effortColumn ? "16px 1fr 1fr 46px 34px" : "16px 1fr 1fr 34px";
  const COLS_ROW = effortColumn ? "22px 1fr 1fr 46px 34px" : "22px 1fr 1fr 34px";

  return (
    <div className="cell elev-sm" style={{ position: "relative" }}>
      <div className="row" style={{ marginBottom: 8, alignItems: "flex-start" }}>
        <div
          style={{
            width: 28,
            height: 28,
            flex: "none",
            borderRadius: 7,
            background: allDone ? "var(--color-accent-900)" : "var(--color-neutral-900)",
            color: allDone ? "var(--color-accent-300)" : "var(--color-neutral-400)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12.5,
            fontFamily: "var(--font-heading)",
          }}
        >
          {allDone ? <i className="ph-fill ph-check" style={{ fontSize: 12 }} /> : index}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontFamily: "var(--font-heading)", fontWeight: 500 }}>{ex.name}</div>
          <div className="mu" style={{ marginTop: 1 }}>{ex.metaLine}</div>
        </div>
        {ex.hasVideo && <i className="ph-fill ph-play-circle" style={{ fontSize: 16, color: "var(--color-accent)", flex: "none", marginTop: 2 }} />}
        {!readOnly && (
        <div style={{ position: "relative" }}>
          <button className="btn btn-secondary btn-icon" style={{ width: 34, height: 34 }} onClick={onToggleMenu} aria-label="Exercise options">
            <i className="ph ph-dots-three-vertical" style={{ fontSize: 16 }} />
          </button>
          {menuOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ position: "absolute", top: 34, right: 0, zIndex: 10, width: 168, background: "var(--color-surface-raised)", border: "1px solid var(--color-divider)", borderRadius: 8, boxShadow: "var(--shadow-md)", overflow: "hidden" }}
            >
              <button className="link-row" style={{ padding: "9px 11px", borderRadius: 0 }} onClick={onAddSet}>
                <i className="ph ph-plus-circle" style={{ fontSize: 14, color: "var(--color-accent)" }} />
                <span style={{ fontSize: 12.5 }}>Add a set</span>
              </button>
              <button className="link-row" style={{ padding: "9px 11px", borderRadius: 0 }} onClick={onAddWarmup}>
                <i className="ph ph-flame" style={{ fontSize: 14, color: "var(--color-accent)" }} />
                <span style={{ fontSize: 12.5 }}>Add a warm-up set</span>
              </button>
              <button className="link-row" style={{ padding: "9px 11px", borderRadius: 0, color: "var(--color-neutral-400)" }} onClick={onRemoveSet}>
                <i className="ph ph-minus-circle" style={{ fontSize: 14 }} />
                <span style={{ fontSize: 12.5 }}>Remove a set</span>
              </button>
              {onSwap && (
                <button className="link-row" style={{ padding: "9px 11px", borderRadius: 0 }} onClick={onSwap}>
                  <i className="ph ph-arrows-left-right" style={{ fontSize: 14, color: "var(--color-accent)" }} />
                  <span style={{ fontSize: 12.5 }}>Swap exercise</span>
                </button>
              )}
              {onFormCheck && (
                <button className="link-row" style={{ padding: "9px 11px", borderRadius: 0 }} onClick={onFormCheck}>
                  <i className="ph ph-video-camera" style={{ fontSize: 14, color: "var(--color-accent)" }} />
                  <span style={{ fontSize: 12.5 }}>Ask for a form check</span>
                </button>
              )}
              {onRemoveExercise && (
                <button className="link-row" style={{ padding: "9px 11px", borderRadius: 0, color: "var(--color-neutral-400)" }} onClick={onRemoveExercise}>
                  <i className="ph ph-trash" style={{ fontSize: 14 }} />
                  <span style={{ fontSize: 12.5 }}>Remove exercise</span>
                </button>
              )}
            </div>
          )}
        </div>
        )}
      </div>

      <div className="scr" style={{ display: "grid", gridTemplateColumns: COLS, gap: 8, alignItems: "center", padding: "6px 0" }}>
        <span />
        <span style={{ textAlign: "center" }}>{mode === "pct1rm" ? "weight · %1RM" : "weight"}</span>
        <span style={{ textAlign: "center" }}>{ex.timed ? "time" : "reps"}</span>
        {/* RPE and RIR get their own column: they're the coach's prescription, not something to log
            against, so they read out and cannot be edited here. %1RM instead rides alongside the weight,
            because it IS the weight -- a percentage of a max rather than a separate instruction. */}
        {effortColumn && <span style={{ textAlign: "center" }}>{effortColumn}</span>}
        <span />
      </div>

      {ex.sets.map((s) => {
        const special = isSpecialSet(s);
        const displayReps = s.actual?.reps ?? s.prescribed.reps;
        const displayLoad = s.actual?.load ?? s.prescribed.load;
        const label = s.isWarmup ? `W${++warmCounter}` : `${++workCounter}`;
        const warmupTint = s.isWarmup && !s.checked;

        if (s.removed) {
          return (
            <div key={s.id} className="setrow" style={{ gridTemplateColumns: "16px 1fr 1fr 34px", opacity: 0.5 }}>
              <span className="mono" style={{ fontSize: 12.5, color: "var(--color-neutral-500)" }}>{label}</span>
              <span style={{ gridColumn: "2 / span 2", fontSize: 12.5, color: "var(--color-neutral-500)" }}>Removed · {s.removed.reason}</span>
              <i className="ph ph-x-circle" style={{ fontSize: 14, color: "var(--color-neutral-600)", justifySelf: "center" }} />
            </div>
          );
        }

        if (special) {
          return (
            <div key={s.id} className="setrow" style={{ gridTemplateColumns: "16px 1fr 34px" }}>
              <span className="mu mono">{label}</span>
              <button className="link-row" style={{ padding: "8px 0", justifyContent: "space-between" }} onClick={() => nav(`/block/day/${dayId}/exercise/${ex.id}/live/${s.id}`)}>
                <span className={`tag ${s.type === "dropset" ? "tag-danger" : s.type === "cluster" ? "tag-purple" : s.type === "myo" ? "tag-warning" : s.type === "amrap" ? "tag-info" : "tag-neutral"}`}>
                  {s.checked ? specialSummary(s) : typeLabel(s.type, s)}
                </span>
                <span style={{ fontSize: 12.5, color: "var(--color-accent)" }}>{s.checked ? "Edit" : "Start"}</span>
              </button>
              {/* Not interactive: the row itself opens the live-set screen, which is where a dropset or
                  cluster actually gets ticked. Same control as everywhere else so the state reads the same. */}
              <TickButton checked={s.checked} tone={s.checked ? "accent" : "neutral"} style={{ justifySelf: "center" }} />
            </div>
          );
        }

        const rowBg = s.checked ? (s.isWarmup ? "var(--color-neutral-800)" : "var(--color-accent-tint)") : undefined;
        const numColor = s.checked ? (s.isWarmup ? "var(--color-neutral-300)" : "var(--color-accent-300)") : warmupTint ? "var(--color-neutral-400)" : "var(--color-neutral-500)";
        const valueColor = s.checked ? (s.isWarmup ? "var(--color-neutral-100)" : "var(--color-neutral-300)") : "var(--color-text)";
        const controlColor = s.checked ? (s.isWarmup ? "var(--color-neutral-400)" : "var(--color-accent-400)") : "var(--color-neutral-500)";

        return (
          <div key={s.id} className="setrow" style={{ gridTemplateColumns: COLS_ROW, background: rowBg, borderRadius: s.checked ? 8 : 0, padding: s.checked ? "0 6px" : 0, margin: s.checked ? "2px -6px" : 0 }}>
            <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: numColor }}>{label}</span>
            <div className="row" style={{ justifyContent: "center", gap: 6, color: controlColor }}>
              {!locked && (
                <button onClick={() => editLoad(s, -1)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", display: "flex" }}>
                  <i className="ph ph-minus" style={{ fontSize: 12 }} />
                </button>
              )}
              <InlineNumberInput
                value={displayLoad ?? null}
                placeholder="BW"
                color={valueColor}
                locked={locked}
                onCommit={(n) => dispatch({ type: "EDIT_SET_TARGET", dayId, exerciseId: ex.id, setId: s.id, load: n })}
              />
              {/* A percentage IS the weight -- it says what to put on the bar, not how hard to push -- so it
                  sits against the number rather than in a column of its own. */}
              {mode === "pct1rm" && s.prescribed.effort?.value !== undefined && (
                <span className="mono" style={{ fontSize: 12.5, fontWeight: 700, color: "var(--color-neutral-500)", flex: "none" }}>
                  {s.prescribed.effort.value}%
                </span>
              )}
              {!locked && (
                <button onClick={() => editLoad(s, 1)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", display: "flex" }}>
                  <i className="ph ph-plus" style={{ fontSize: 12 }} />
                </button>
              )}
            </div>
            <div className="row" style={{ justifyContent: "center", gap: 6, color: controlColor }}>
              {!locked && (
                <button onClick={() => editReps(s, -1)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", display: "flex" }}>
                  <i className="ph ph-minus" style={{ fontSize: 12 }} />
                </button>
              )}
              <InlineNumberInput
                value={typeof displayReps === "number" ? displayReps : null}
                color={valueColor}
                locked={locked}
                onCommit={(n) => dispatch({ type: "EDIT_SET_TARGET", dayId, exerciseId: ex.id, setId: s.id, reps: Math.max(0, n) })}
              />
              {ex.timed && (
                <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: valueColor, marginLeft: -4 }}>s</span>
              )}
              {!locked && (
                <button onClick={() => editReps(s, 1)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", display: "flex" }}>
                  <i className="ph ph-plus" style={{ fontSize: 12 }} />
                </button>
              )}
            </div>
            {effortColumn && (
              <span className="mono" style={{ textAlign: "center", fontSize: 15, fontWeight: 700, color: "var(--color-neutral-400)" }}>
                {s.prescribed.effort?.value ?? "—"}
              </span>
            )}
            <TickButton
              checked={s.checked}
              onClick={() => toggle(s)}
              disabled={!!readOnly}
              tone={s.isWarmup ? "neutral" : "accent"}
              label={`Tick set ${label}`}
              style={{ justifySelf: "center" }}
            />
          </div>
        );
      })}

      <div className="row" style={{ gap: 14, paddingTop: 9, borderTop: "1px solid var(--color-neutral-900)", marginTop: 4 }}>
        {!readOnly && (
          <button onClick={onAddSet} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12.5, color: "var(--color-accent)", display: "flex", alignItems: "center", gap: 5, padding: 0 }}>
            <i className="ph ph-plus-circle" style={{ fontSize: 14 }} />
            Extra set
          </button>
        )}
        {ex.sets[0]?.prescribed.restSec ? (
          <span className="mono" style={{ fontSize: 12.5, color: "var(--color-neutral-500)", display: "flex", alignItems: "center", gap: readOnly ? 5 : 2 }}>
            <i className="ph ph-timer" style={{ fontSize: 14 }} />
            {!readOnly && (
              <button onClick={() => editRest(-15)} aria-label="Decrease rest time" style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", display: "flex", padding: 3 }}>
                <i className="ph ph-minus" style={{ fontSize: 12 }} />
              </button>
            )}
            Rest {Math.floor((ex.sets[0].prescribed.restSec ?? 0) / 60)}:{String((ex.sets[0].prescribed.restSec ?? 0) % 60).padStart(2, "0")}
            {!readOnly && (
              <button onClick={() => editRest(15)} aria-label="Increase rest time" style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", display: "flex", padding: 3 }}>
                <i className="ph ph-plus" style={{ fontSize: 12 }} />
              </button>
            )}
          </span>
        ) : null}
      </div>

      {owedSet && (
        <SetEffortSheet exerciseName={ex.name} onPick={answerEffort} />
      )}
    </div>
  );
}
