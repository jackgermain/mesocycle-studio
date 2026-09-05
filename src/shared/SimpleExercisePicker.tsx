import React, { useState } from "react";
import { libraryExercises, MUSCLE_GROUPS } from "../coach/exerciseLibrary";
import type { LibraryExercise } from "../coach/types";

/** The built-in exercise library picker, with no coach state behind it -- the coach's own
 * ExercisePickerSheet reads customExercises out of useCoachStore, which isn't mounted on the client
 * routes, so it can't be reused there. Lives here rather than inside a screen because both the
 * self-directed builder and the workout screen's swap need it. */
export function SimpleExercisePicker({ onPick, onClose }: { onPick: (e: LibraryExercise) => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState<string | null>(null);
  const filtered = libraryExercises.filter((e) => e.name.toLowerCase().includes(query.toLowerCase()) && (!muscle || e.muscle === muscle) && e.kind !== "cardio");

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" style={{ maxHeight: "82%", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <div className="scr">Add</div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>Pick an exercise</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-neutral-500)" }}>
            <i className="ph ph-x" style={{ fontSize: 16 }} />
          </button>
        </div>

        <div className="input row" style={{ height: 38, gap: 8, color: "var(--color-neutral-600)", flex: "none" }}>
          <i className="ph ph-magnifying-glass" style={{ fontSize: 14 }} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search exercises" style={{ flex: 1, background: "none", border: "none", outline: "none", color: "var(--color-text)", fontSize: 14 }} autoFocus />
        </div>
        <div className="row hscroll" style={{ gap: 6, flex: "none", marginTop: 8 }}>
          <button className={`chip${muscle === null ? " on" : ""}`} onClick={() => setMuscle(null)}>All</button>
          {MUSCLE_GROUPS.map((m) => (
            <button key={m} className={`chip${muscle === m ? " on" : ""}`} onClick={() => setMuscle(m)}>{m}</button>
          ))}
        </div>

        <div style={{ overflowY: "auto", marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
          {filtered.map((e) => (
            <button key={e.id} className="cell row" style={{ textAlign: "left", cursor: "pointer" }} onClick={() => onPick(e)}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="trunc" style={{ fontSize: 12.5 }}>{e.name}</div>
                <div className="mu" style={{ marginTop: 2 }}>{e.muscle}</div>
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
