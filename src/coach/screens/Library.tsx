import React, { useMemo, useState } from "react";
import { useCoachStore } from "../store";
import { BackHeader, Seg } from "../../components/UI";
import { libraryExercises, MUSCLE_GROUPS } from "../exerciseLibrary";
import type { ExerciseKind, LibraryExercise } from "../types";

export default function Library() {
  const { state, dispatch } = useCoachStore();
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const allExercises = useMemo(() => [...libraryExercises, ...state.customExercises], [state.customExercises]);
  const filtered = allExercises.filter((e) => e.name.toLowerCase().includes(query.toLowerCase()) && (!muscle || e.muscle === muscle));

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const e of filtered) {
      if (!map.has(e.muscle)) map.set(e.muscle, []);
      map.get(e.muscle)!.push(e);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  function addCustom(exercise: LibraryExercise) {
    dispatch({ type: "ADD_CUSTOM_EXERCISE", exercise });
    dispatch({ type: "SHOW_TOAST", message: `${exercise.name} added to the library.` });
    setTimeout(() => dispatch({ type: "CLEAR_TOAST" }), 2600);
    setAdding(false);
  }

  return (
    <div className="screen">
      <BackHeader
        kicker={`${allExercises.length} exercises`}
        title="Library"
        right={
          <button onClick={() => setAdding(true)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex" }} aria-label="Add a custom exercise">
            <i className="ph ph-plus-circle" style={{ fontSize: 20, color: "var(--color-accent)" }} />
          </button>
        }
      />
      <div className="screen-scroll">
        <div className="input row" style={{ height: 38, gap: 8, color: "var(--color-neutral-600)" }}>
          <i className="ph ph-magnifying-glass" style={{ fontSize: 14 }} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the library" style={{ flex: 1, background: "none", border: "none", outline: "none", color: "var(--color-text)", fontSize: 14 }} />
        </div>
        <div className="row hscroll" style={{ gap: 6 }}>
          <button className={`chip${muscle === null ? " on" : ""}`} onClick={() => setMuscle(null)}>All</button>
          {MUSCLE_GROUPS.map((m) => (
            <button key={m} className={`chip${muscle === m ? " on" : ""}`} onClick={() => setMuscle(m)}>{m}</button>
          ))}
        </div>

        {grouped.map(([m, items]) => (
          <div key={m}>
            <div className="sh">{m} · {items.length}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {items.map((e) => (
                <div key={e.id} className="cell row" style={{ padding: "9px 11px" }}>
                  <div
                    style={{
                      width: 52,
                      height: 38,
                      flex: "none",
                      borderRadius: 6,
                      background: e.hasVideo ? "linear-gradient(#20233a, #161826)" : "var(--color-neutral-900)",
                      border: e.hasVideo ? undefined : "1px dashed var(--color-neutral-700)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <i className={e.hasVideo ? "ph-fill ph-play-circle" : "ph ph-camera"} style={{ fontSize: 16, color: e.hasVideo ? "var(--color-accent)" : "var(--color-neutral-600)" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="trunc" style={{ fontSize: 12.5 }}>{e.name}</div>
                  </div>
                  {e.kind === "cardio" && <span className="tag tag-neutral">Cardio</span>}
                  {e.id.startsWith("custom-") && <span className="tag tag-outline">Custom</span>}
                  {!e.hasVideo && <span style={{ fontSize: 11, color: "var(--color-accent)" }}>Upload</span>}
                  <i className="ph ph-dots-three-vertical" style={{ fontSize: 16, color: "var(--color-neutral-600)" }} />
                </div>
              ))}
            </div>
          </div>
        ))}

        {grouped.length === 0 && <div className="mu">No exercises match &ldquo;{query}&rdquo;.</div>}

        <button
          onClick={() => setAdding(true)}
          style={{ border: "1px dashed var(--color-accent-700)", borderRadius: "var(--radius-md)", padding: "20px 16px", textAlign: "center", background: "var(--color-accent-900)", cursor: "pointer" }}
        >
          <i className="ph ph-plus-circle" style={{ fontSize: 20, color: "var(--color-accent)" }} />
          <div style={{ fontSize: 12.5, marginTop: 7, color: "var(--color-accent-100)" }}>Add a custom exercise</div>
          <div className="mu" style={{ marginTop: 3, color: "var(--color-accent-300)" }}>Not on this list? Add your own — it shows up everywhere the library does.</div>
        </button>
      </div>

      {adding && <AddCustomExercise onAdd={addCustom} onClose={() => setAdding(false)} />}
    </div>
  );
}

function AddCustomExercise({ onAdd, onClose }: { onAdd: (e: LibraryExercise) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [muscle, setMuscle] = useState<string>(MUSCLE_GROUPS[0]);
  const [kind, setKind] = useState<ExerciseKind>("strength");

  function save() {
    if (!name.trim()) return;
    onAdd({ id: `custom-${Date.now()}`, name: name.trim(), muscle, hasVideo: false, kind });
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ marginBottom: 14 }}>
          <div style={{ flex: 1, fontFamily: "var(--font-heading)", fontSize: 16 }}>Add a custom exercise</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-neutral-500)" }}>
            <i className="ph ph-x" style={{ fontSize: 16 }} />
          </button>
        </div>

        <div className="field">
          <label>Exercise name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Larsen Press" autoFocus />
        </div>

        <div style={{ marginTop: 12 }}>
          <div className="sh">Kind</div>
          <Seg<ExerciseKind>
            value={kind}
            onChange={setKind}
            options={[
              { value: "strength", label: "Strength" },
              { value: "cardio", label: "Cardio" },
            ]}
          />
          <div className="mu" style={{ marginTop: 6 }}>
            {kind === "strength" ? "Logged as reps and load." : "Logged as work/rest duration — a steady effort or intervals."}
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <div className="sh">Muscle group</div>
          <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
            {MUSCLE_GROUPS.map((m) => (
              <button key={m} className={`chip${muscle === m ? " on" : ""}`} onClick={() => setMuscle(m)}>{m}</button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 16, paddingBottom: 4 }}>
          <button className="btn btn-primary btn-block" style={{ height: 48, opacity: name.trim() ? 1 : 0.45 }} disabled={!name.trim()} onClick={save}>
            Add to library
          </button>
        </div>
      </div>
    </div>
  );
}
