import React, { useEffect, useMemo, useState } from "react";
import { libraryExercises, MUSCLE_GROUPS } from "../coach/exerciseLibrary";
import type { LibraryExercise } from "../coach/types";
import { useAuth } from "../lib/auth";
import { addSharedExercise, fetchSharedExercises, mergeExercises, validateNewExercise } from "./sharedExercises";

/** The built-in exercise library picker, with no coach state behind it -- the coach's own
 * ExercisePickerSheet reads customExercises out of useCoachStore, which isn't mounted on the client
 * routes, so it can't be reused there. Lives here rather than inside a screen because both the
 * self-directed builder and the workout screen's swap need it.
 *
 * It also shows the shared additions (migration 0030), which is the part coach_state cannot do: those are
 * per-coach and never reach a client's Train tab. */
export function SimpleExercisePicker({ onPick, onClose }: { onPick: (e: LibraryExercise) => void; onClose: () => void }) {
  const { account } = useAuth();
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState<string | null>(null);
  const [shared, setShared] = useState<LibraryExercise[]>([]);
  // Adding one for everybody, opened from the empty state -- which is the moment it is actually wanted.
  const [creating, setCreating] = useState(false);
  const [newMuscle, setNewMuscle] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchSharedExercises().then((x) => active && setShared(x));
    return () => {
      active = false;
    };
  }, []);

  const options = useMemo(() => mergeExercises(libraryExercises, shared), [shared]);
  const filtered = options.filter((e) => e.name.toLowerCase().includes(query.toLowerCase()) && (!muscle || e.muscle === muscle) && e.kind !== "cardio");

  // Only the platform owner adds to the shipped library, because the row lands on every account (0030).
  // The database enforces it too -- hiding the control is not access control.
  const canAddToLibrary = !!account?.is_platform_admin;

  async function create() {
    const check = validateNewExercise(query, newMuscle, options);
    if (!check.ok) {
      setErr(check.reason);
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      await addSharedExercise(check.exercise);
      setShared((prev) => [...prev, check.exercise]);
      setCreating(false);
      setNewMuscle(null);
      // Straight into the day being built. Adding it and then making them find it again is a pointless step.
      onPick(check.exercise);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "That didn't save.");
    } finally {
      setBusy(false);
    }
  }

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
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setErr(null);
            }}
            placeholder="Search exercises"
            style={{ flex: 1, background: "none", border: "none", outline: "none", color: "var(--color-text)", fontSize: 14 }}
            autoFocus
          />
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

          {filtered.length === 0 && !creating && (
            <div style={{ padding: "8px 2px" }}>
              <div className="mu">No exercises match.</div>
              {/* The empty state is where this belongs: searching and finding nothing is the exact moment
                  someone wants to add it, and the name they want is already typed. */}
              {canAddToLibrary && query.trim().length > 0 && (
                <button
                  className="btn btn-secondary btn-block"
                  style={{ height: 42, marginTop: 9, fontSize: 12.5 }}
                  onClick={() => {
                    setErr(null);
                    setNewMuscle(muscle);
                    setCreating(true);
                  }}
                >
                  Add "{query.trim()}" to the library
                </button>
              )}
            </div>
          )}

          {creating && (
            <div className="cell">
              <div className="scr">New exercise</div>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 14, marginTop: 2 }}>{query.trim()}</div>
              {/* A muscle is required, not optional. Weekly volume, the soreness check and the synergist
                  table all key off this, and an exercise without a real muscle books its work against
                  nothing at all -- silently, which is how "Deadlifts" became a Romanian deadlift. */}
              <div className="mu" style={{ marginTop: 7, marginBottom: 6 }}>Which muscle does it train?</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {MUSCLE_GROUPS.map((m) => (
                  <button key={m} className={`chip${newMuscle === m ? " on" : ""}`} onClick={() => setNewMuscle(m)}>{m}</button>
                ))}
              </div>
              <div className="mu" style={{ marginTop: 9, lineHeight: 1.5 }}>
                This adds it for every account, not just yours.
              </div>
              <div className="row" style={{ gap: 6, marginTop: 9 }}>
                <button
                  className="btn btn-secondary"
                  style={{ height: 38, flex: 1, fontSize: 12, opacity: newMuscle && !busy ? 1 : 0.5 }}
                  disabled={!newMuscle || busy}
                  onClick={() => void create()}
                >
                  {busy ? "Saving…" : "Add for everyone"}
                </button>
                <button
                  className="btn btn-primary"
                  style={{ height: 38, flex: 1, fontSize: 12 }}
                  disabled={busy}
                  onClick={() => {
                    setCreating(false);
                    setErr(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {err && (
            <div className="cell" style={{ borderColor: "var(--color-accent-300)" }}>
              <div className="mu">{err}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
