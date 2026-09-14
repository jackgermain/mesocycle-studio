import React, { useEffect, useMemo, useState } from "react";
import { libraryExercises, MUSCLE_GROUPS } from "../coach/exerciseLibrary";
import type { LibraryExercise } from "../coach/types";
import { useAuth } from "../lib/auth";
import { canAddOwnExercise } from "./canBuild";
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
  // Adding one for everybody. The name is its own field rather than being taken from the search box: the
  // button is on screen the whole time now, so the common case is tapping it with nothing searched, and
  // reading the name off an empty search box would leave nothing to save.
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
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

  // Gated on the ROLE, not on is_platform_admin, and that was a real mistake worth not repeating. The admin
  // flag is set only in SQL and never surfaced anywhere a person can see it, so when the button failed to
  // appear there was no way to tell a false flag from a stale bundle -- they look identical on screen, and
  // it cost three rounds of "there's no button". A role is loaded on every session, visible in the app, and
  // true for the person who asked for this. 0031 moves the insert policy to match; update and delete stay
  // with the platform owner, since changing or removing an exercise other people's programs point at is a
  // different act from adding one. The database is still the real gate either way.
  const canAddToLibrary = canAddOwnExercise(account?.role);

  function openCreate() {
    setErr(null);
    // Whatever was searched for is the name they were looking for, so carry it across. Same for the muscle
    // filter: if they narrowed to Glutes and found nothing, the thing they want to add is a glute exercise.
    setNewName(query.trim());
    setNewMuscle(muscle);
    setCreating(true);
  }

  async function create() {
    const check = validateNewExercise(newName, newMuscle, options);
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
      setNewName("");
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
            <div className="scr">{creating ? "New exercise" : "Add"}</div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>{creating ? "Add a custom exercise" : "Pick an exercise"}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-neutral-500)" }}>
            <i className="ph ph-x" style={{ fontSize: 16 }} />
          </button>
        </div>

        {creating ? (
          <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="field">
              <label>Name</label>
              <input
                className="input"
                style={{ height: 46, fontSize: 14 }}
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  setErr(null);
                }}
                placeholder="e.g. Hip Clean"
                autoFocus
                autoCapitalize="words"
              />
            </div>

            {/* A muscle is required, not optional. Weekly volume, the soreness check and the synergist table
                all key off this, and an exercise without a real muscle books its work against nothing at
                all -- silently, which is how "Deadlifts" became a Romanian deadlift and nobody noticed. */}
            <div>
              <div className="sh" style={{ marginBottom: 7 }}>Which muscle does it train?</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {MUSCLE_GROUPS.map((m) => (
                  <button key={m} className={`chip${newMuscle === m ? " on" : ""}`} onClick={() => setNewMuscle(m)}>{m}</button>
                ))}
              </div>
            </div>

            {err && (
              <div className="cell" style={{ borderColor: "var(--color-accent-300)" }}>
                <div className="mu">{err}</div>
              </div>
            )}

            <div className="mu" style={{ lineHeight: 1.5 }}>
              This adds it to the library on every account, not just yours, and drops it straight into
              today's session.
            </div>

            <div className="row" style={{ gap: 6 }}>
              <button
                className="btn btn-secondary"
                style={{ height: 42, flex: 1, fontSize: 12.5, opacity: newName.trim() && newMuscle && !busy ? 1 : 0.5 }}
                disabled={!newName.trim() || !newMuscle || busy}
                onClick={() => void create()}
              >
                {busy ? "Saving…" : "Add for everyone"}
              </button>
              <button
                className="btn btn-primary"
                style={{ height: 42, flex: 1, fontSize: 12.5 }}
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
        ) : (
          <>
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

            {/* On screen the whole time, not only when a search comes up empty. Jack: "I want a button there
                that says add custom exercise that when I click on it, it takes me to the screen where I can
                add an exercise." Hidden in the empty state it was unreachable unless you first searched for
                something that does not exist. */}
            {canAddToLibrary && (
              <button
                className="btn btn-secondary btn-block"
                style={{ height: 40, marginTop: 8, fontSize: 12.5, flex: "none" }}
                onClick={openCreate}
              >
                <i className="ph ph-plus-circle" style={{ fontSize: 15, marginRight: 6 }} />
                Add custom exercise
              </button>
            )}

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

              {err && (
                <div className="cell" style={{ borderColor: "var(--color-accent-300)" }}>
                  <div className="mu">{err}</div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
