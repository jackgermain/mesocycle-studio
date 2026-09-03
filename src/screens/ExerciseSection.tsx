import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../state/store";
import type { WorkExercise, WorkSet } from "../data/types";
import { isSpecialSet, specialSummary, stepLoad, typeLabel } from "./exerciseHelpers";

/** A set's weight/reps value, editable by tapping the +/- buttons OR tapping the number itself and typing
 * a value directly -- the +/- alone made sense on a phone, but not once this app also needs to work with a
 * keyboard on a desktop/web build. Keeps its own draft text while focused so a mid-edit "" or "1" isn't
 * immediately fought back to the last committed number; commits on blur/Enter, parseFloat-based like the
 * bodyweight input on the Progress tab already does. */
function InlineNumberInput({ value, onCommit, placeholder, color }: { value: number | null; onCommit: (n: number) => void; placeholder?: string; color: string }) {
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
      style={{ width: 38, textAlign: "center", background: "none", border: "none", outline: "none", fontSize: 14, fontFamily: "var(--font-heading)", color, padding: 0 }}
    />
  );
}

/** The per-exercise weight/rep/checkbox editor used on both the client's own workout screen and the coach's in-person session logger — same component, same store, so a set logged from either side looks identical everywhere. */
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
}: {
  index: number;
  dayId: string;
  ex: WorkExercise;
  menuOpen: boolean;
  onToggleMenu: (e: React.MouseEvent) => void;
  onAddSet: () => void;
  onAddWarmup: () => void;
  onRemoveSet: () => void;
  /** Coach-only: swapping the exercise itself is a prescription change, so this is left undefined on the client's own workout screen and only wired up from the coach's session logger. */
  onSwap?: () => void;
}) {
  const { dispatch } = useStore();
  const nav = useNavigate();
  const doneCount = ex.sets.filter((s) => s.checked).length;
  const allDone = doneCount === ex.sets.length;
  function toggle(s: WorkSet) {
    dispatch({ type: "SET_CHECKED", dayId, exerciseId: ex.id, setId: s.id, checked: !s.checked });
  }
  function editReps(s: WorkSet, delta: number) {
    const current = s.actual?.reps ?? (typeof s.prescribed.reps === "number" ? s.prescribed.reps : 0);
    dispatch({ type: "EDIT_SET_TARGET", dayId, exerciseId: ex.id, setId: s.id, reps: Math.max(0, current + delta) });
  }
  function editLoad(s: WorkSet, direction: 1 | -1) {
    const current = s.actual?.load ?? s.prescribed.load ?? 0;
    const next = stepLoad(ex, current, direction);
    dispatch({ type: "EDIT_SET_TARGET", dayId, exerciseId: ex.id, setId: s.id, load: next });
  }

  let workCounter = 0;
  let warmCounter = 0;

  return (
    <div className="cell elev-sm" style={{ padding: "11px 12px 10px", position: "relative" }}>
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
            fontSize: 12,
            fontFamily: "var(--font-heading)",
          }}
        >
          {allDone ? <i className="ph-fill ph-check" style={{ fontSize: 13 }} /> : index}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontFamily: "var(--font-heading)", fontWeight: 500 }}>{ex.name}</div>
          <div className="mu" style={{ marginTop: 1 }}>{ex.metaLine}</div>
        </div>
        {ex.hasVideo && <i className="ph-fill ph-play-circle" style={{ fontSize: 19, color: "var(--color-accent)", flex: "none", marginTop: 2 }} />}
        <div style={{ position: "relative" }}>
          <button className="btn btn-secondary btn-icon" style={{ width: 30, height: 30 }} onClick={onToggleMenu} aria-label="Exercise options">
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
            </div>
          )}
        </div>
      </div>

      <div className="scr" style={{ display: "grid", gridTemplateColumns: "16px 1fr 1fr 34px", gap: 8, alignItems: "center", padding: "6px 0" }}>
        <span />
        <span style={{ textAlign: "center" }}>weight</span>
        <span style={{ textAlign: "center" }}>reps</span>
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
              <span style={{ fontSize: 12, color: "var(--color-neutral-500)" }}>{label}</span>
              <span style={{ gridColumn: "2 / span 2", fontSize: 12, color: "var(--color-neutral-500)" }}>Removed · {s.removed.reason}</span>
              <i className="ph ph-x-circle" style={{ fontSize: 15, color: "var(--color-neutral-600)", justifySelf: "center" }} />
            </div>
          );
        }

        if (special) {
          return (
            <div key={s.id} className="setrow" style={{ gridTemplateColumns: "16px 1fr 34px" }}>
              <span className="mu">{label}</span>
              <button className="link-row" style={{ padding: "8px 0", justifyContent: "space-between" }} onClick={() => nav(`/block/day/${dayId}/exercise/${ex.id}/live/${s.id}`)}>
                <span style={{ fontSize: 12.5, color: s.checked ? "var(--color-neutral-300)" : "var(--color-neutral-400)" }}>
                  {s.checked ? specialSummary(s) : typeLabel(s.type, s)}
                </span>
                <span style={{ fontSize: 12, color: "var(--color-accent)" }}>{s.checked ? "Edit" : "Start"}</span>
              </button>
              {s.checked ? (
                <div style={{ width: 26, height: 26, borderRadius: 7, background: "var(--color-accent)", display: "flex", alignItems: "center", justifyContent: "center", justifySelf: "center" }}>
                  <i className="ph-fill ph-check" style={{ fontSize: 14, color: "#123726" }} />
                </div>
              ) : (
                <div style={{ width: 26, height: 26, borderRadius: 7, border: "1.5px solid var(--color-neutral-700)", justifySelf: "center" }} />
              )}
            </div>
          );
        }

        const rowBg = s.checked ? (s.isWarmup ? "var(--color-neutral-800)" : "var(--color-accent-900)") : undefined;
        const numColor = s.checked ? (s.isWarmup ? "var(--color-neutral-300)" : "var(--color-accent-300)") : warmupTint ? "var(--color-neutral-400)" : "var(--color-neutral-500)";
        const valueColor = s.checked ? (s.isWarmup ? "var(--color-neutral-100)" : "var(--color-accent-100)") : "var(--color-text)";
        const controlColor = s.checked ? (s.isWarmup ? "var(--color-neutral-400)" : "var(--color-accent-400)") : "var(--color-neutral-500)";
        const checkboxBorder = s.checked ? "none" : warmupTint ? "1.5px solid var(--color-neutral-500)" : "1.5px solid var(--color-accent)";
        const checkboxBg = s.checked ? (s.isWarmup ? "var(--color-neutral-600)" : "var(--color-accent)") : "none";

        return (
          <div key={s.id} className="setrow" style={{ gridTemplateColumns: "22px 1fr 1fr 34px", background: rowBg, borderRadius: s.checked ? 8 : 0, padding: s.checked ? "0 6px" : 0, margin: s.checked ? "2px -6px" : 0 }}>
            <span style={{ fontSize: 11, color: numColor }}>{label}</span>
            <div className="row" style={{ justifyContent: "center", gap: 6, color: controlColor }}>
              <button onClick={() => editLoad(s, -1)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", display: "flex" }}>
                <i className="ph ph-minus" style={{ fontSize: 12 }} />
              </button>
              <InlineNumberInput
                value={displayLoad ?? null}
                placeholder="BW"
                color={valueColor}
                onCommit={(n) => dispatch({ type: "EDIT_SET_TARGET", dayId, exerciseId: ex.id, setId: s.id, load: n })}
              />
              <button onClick={() => editLoad(s, 1)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", display: "flex" }}>
                <i className="ph ph-plus" style={{ fontSize: 12 }} />
              </button>
            </div>
            <div className="row" style={{ justifyContent: "center", gap: 6, color: controlColor }}>
              <button onClick={() => editReps(s, -1)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", display: "flex" }}>
                <i className="ph ph-minus" style={{ fontSize: 12 }} />
              </button>
              <InlineNumberInput
                value={typeof displayReps === "number" ? displayReps : null}
                color={valueColor}
                onCommit={(n) => dispatch({ type: "EDIT_SET_TARGET", dayId, exerciseId: ex.id, setId: s.id, reps: Math.max(0, n) })}
              />
              <button onClick={() => editReps(s, 1)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", display: "flex" }}>
                <i className="ph ph-plus" style={{ fontSize: 12 }} />
              </button>
            </div>
            <button
              onClick={() => toggle(s)}
              style={{
                width: 26,
                height: 26,
                borderRadius: 7,
                border: checkboxBorder,
                background: checkboxBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                justifySelf: "center",
                cursor: "pointer",
              }}
              aria-label={`Tick set ${label}`}
            >
              {s.checked && <i className="ph-fill ph-check" style={{ fontSize: 14, color: s.isWarmup ? "var(--color-neutral-100)" : "#123726" }} />}
            </button>
          </div>
        );
      })}

      <div className="row" style={{ gap: 14, paddingTop: 9, borderTop: "1px solid var(--color-neutral-900)", marginTop: 4 }}>
        <button onClick={onAddSet} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12.5, color: "var(--color-accent)", display: "flex", alignItems: "center", gap: 5, padding: 0 }}>
          <i className="ph ph-plus-circle" style={{ fontSize: 14 }} />
          Extra set
        </button>
        {ex.sets[0]?.prescribed.restSec ? (
          <span style={{ fontSize: 12.5, color: "var(--color-neutral-500)", display: "flex", alignItems: "center", gap: 5 }}>
            <i className="ph ph-timer" style={{ fontSize: 14 }} />
            Rest {Math.floor((ex.sets[0].prescribed.restSec ?? 0) / 60)}:{String((ex.sets[0].prescribed.restSec ?? 0) % 60).padStart(2, "0")}
          </span>
        ) : null}
      </div>
    </div>
  );
}
