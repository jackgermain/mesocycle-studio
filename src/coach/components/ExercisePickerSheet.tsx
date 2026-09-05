import React, { useMemo, useState } from "react";
import { useCoachStore } from "../store";
import { libraryExercises, MUSCLE_GROUPS } from "../exerciseLibrary";
import type { LibraryExercise } from "../types";

/** Shared library picker — used both to swap a logged exercise and to add one to a program day. Always includes the coach's custom exercises alongside the built-in library. */
export function ExercisePickerSheet({
  kicker,
  title,
  excludeName,
  initialMuscle,
  onPick,
  onClose,
}: {
  kicker: string;
  title: string;
  excludeName?: string;
  /** Pre-selects a muscle filter. Used when replacing an exercise has to keep the same slot in the week,
   * so the whole library isn't a useful starting point — the coach can still clear it. */
  initialMuscle?: string;
  onPick: (e: LibraryExercise) => void;
  onClose: () => void;
}) {
  const { state } = useCoachStore();
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState<string | null>(initialMuscle ?? null);

  const options = useMemo(() => [...libraryExercises, ...state.customExercises], [state.customExercises]);
  const filtered = options.filter((e) => e.name !== excludeName && e.name.toLowerCase().includes(query.toLowerCase()) && (!muscle || e.muscle === muscle));

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" style={{ maxHeight: "82%", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <div className="scr">{kicker}</div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>{title}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-neutral-500)" }}>
            <i className="ph ph-x" style={{ fontSize: 16 }} />
          </button>
        </div>

        <div className="input row" style={{ height: 38, gap: 8, color: "var(--color-neutral-600)", flex: "none" }}>
          <i className="ph ph-magnifying-glass" style={{ fontSize: 14 }} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search exercises" style={{ flex: 1, background: "none", border: "none", outline: "none", color: "var(--color-text)", fontSize: 14 }} autoFocus />
        </div>
        <div className="row hscroll" style={{ gap: 6, marginTop: 8 }}>
          <button className={`chip${muscle === null ? " on" : ""}`} onClick={() => setMuscle(null)}>All</button>
          {MUSCLE_GROUPS.map((m) => (
            <button key={m} className={`chip${muscle === m ? " on" : ""}`} onClick={() => setMuscle(m)}>{m}</button>
          ))}
        </div>

        <div style={{ overflowY: "auto", marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
          {filtered.map((e) => (
            <button key={e.id} className="cell row" style={{ padding: "10px 11px", textAlign: "left", cursor: "pointer" }} onClick={() => onPick(e)}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="trunc" style={{ fontSize: 12.5 }}>{e.name}</div>
                <div className="mu" style={{ marginTop: 2 }}>
                  {e.muscle}
                  {e.kind === "cardio" ? " · cardio" : ""}
                </div>
              </div>
              <i className="ph ph-arrow-right" style={{ fontSize: 14, color: "var(--color-accent)" }} />
            </button>
          ))}
          {filtered.length === 0 && <div className="mu" style={{ padding: "8px 2px" }}>No exercises match.</div>}
        </div>
      </div>
    </div>
  );
}
