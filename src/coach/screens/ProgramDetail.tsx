import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AiEditSheet } from "../components/AiEditSheet";
import { useCoachStore } from "../store";
import { BackHeader, InfoBanner, Seg, StatCell, Stepper } from "../../components/UI";
import { ExercisePickerSheet } from "../components/ExercisePickerSheet";
import { LOAD_LABELS, LOAD_RANGE, clampLoadValue } from "../loadMode";
import { DayOfWeekPicker } from "../../shared/DayOfWeekPicker";
import { resizeDows } from "../../shared/trainingDays";
import { CARDIO_DEFAULT, REST_STEP, formatDuration, workStep } from "../cardio";
import { defaultRestSec } from "../rest";
import { isPendingProgram } from "../programOps";
import type { BuilderExercise, BuilderSet, CoachProgram, LibraryExercise, LoadMode } from "../types";

/** Weekly volume landmarks (RP-style MEV/MRV) for the muscle groups coaches actually program direct volume for. */
const MUSCLE_LANDMARKS: Record<string, { mev: number; mrv: number }> = {
  Chest: { mev: 8, mrv: 18 },
  Back: { mev: 10, mrv: 20 },
  "Front delts": { mev: 4, mrv: 12 },
  "Side delts": { mev: 8, mrv: 20 },
  "Rear delts": { mev: 6, mrv: 16 },
  Biceps: { mev: 8, mrv: 20 },
  Triceps: { mev: 6, mrv: 16 },
  Forearms: { mev: 2, mrv: 12 },
  Quads: { mev: 8, mrv: 18 },
  Hamstrings: { mev: 6, mrv: 16 },
  Glutes: { mev: 4, mrv: 12 },
  Calves: { mev: 8, mrv: 20 },
  Abs: { mev: 6, mrv: 20 },
};

export default function ProgramDetail() {
  const { programId = "" } = useParams();
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const assignToId = searchParams.get("assignTo");
  const { state, dispatch } = useCoachStore();
  const program = state.programs.find((p) => p.id === programId);
  const assignToClient = assignToId ? state.clients.find((c) => c.id === assignToId) : null;
  const [week, setWeek] = useState(1);
  const [showAiEdit, setShowAiEdit] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => (program?.days[0] ? { [program.days[0].id]: true } : {}));
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // A working copy that's never actually been assigned to anyone yet is genuinely ambiguous to just
  // leave — deserves an explicit choice rather than silently sitting around forever. One that's already
  // live for a client (or queued to be) isn't: backing that out here would break their real assignment,
  // so leaving it alone is just the normal back button.
  const isUnfinishedWorkingCopy =
    !!program && isPendingProgram(program) && !state.clients.some((c) => c.assignedProgramId === program.id || c.queuedProgramId === program.id);

  const volumeByMuscle = useMemo(() => {
    if (!program) return [];
    const totals: Record<string, number> = {};
    for (const day of program.days) {
      for (const ex of day.exercises) {
        if (ex.kind === "cardio") continue; // cardio work doesn't count against strength MEV/MRV
        totals[ex.muscle] = (totals[ex.muscle] ?? 0) + ex.sets.length;
      }
    }
    return Object.entries(MUSCLE_LANDMARKS).map(([muscle, landmark]) => ({ muscle, sets: totals[muscle] ?? 0, ...landmark }));
  }, [program]);

  if (!program) return <div className="screen-scroll">Not found.</div>;

  const deloadWeek = program.weeks;

  return (
    <div className="screen">
      <BackHeader
        kicker={program.isTemplate ? (program.visibility === "public" ? "Public template" : "Private template") : "Draft"}
        title={program.name}
        onBack={isUnfinishedWorkingCopy ? () => setShowLeaveConfirm(true) : undefined}
        // In the header rather than only inline, so it's reachable from anywhere in the builder --
        // the header sits outside the scroll area, so it stays put however far down you are.
        right={
          <button
            className="btn btn-secondary btn-icon"
            style={{ width: 38, height: 38 }}
            aria-label="Edit with AI"
            onClick={() => setShowAiEdit(true)}
          >
            <i className="ph ph-sparkle" style={{ fontSize: 17, color: "var(--color-accent-300)" }} />
          </button>
        }
      />
      <div className="screen-scroll">
        {program.lastAiEdit && (
          <div className="cell" style={{ padding: 12, borderLeft: "2px solid var(--color-accent)" }}>
            <div className="row" style={{ marginBottom: 4 }}>
              <div className="scr" style={{ flex: 1, color: "var(--color-accent-300)" }}>
                Changed by AI · {new Date(program.lastAiEdit.at).toLocaleDateString()}
              </div>
              <button
                onClick={() => dispatch({ type: "CLEAR_AI_EDIT_MARK", programId: program.id })}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11.5, color: "var(--color-neutral-500)", padding: 0 }}
              >
                Dismiss
              </button>
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.5 }}>{program.lastAiEdit.summary}</div>
            <div className="mu" style={{ marginTop: 5 }}>
              {program.lastAiEdit.exerciseIds.length} exercise{program.lastAiEdit.exerciseIds.length === 1 ? "" : "s"} marked below. Dismiss once you've looked them over.
            </div>
          </div>
        )}

        {isPendingProgram(program) && (
          <InfoBanner icon="ph-file-dashed">
            Working copy — lives under the Drafts tab until you check "Save as a personal template" below to make it a real reusable one. Otherwise it's cleaned up automatically once you assign something else.
          </InfoBanner>
        )}
        <div className="cell" style={{ padding: "10px 12px" }}>
          <div className="scr" style={{ marginBottom: 5 }}>Program name</div>
          <input
            className="input"
            value={program.name}
            onChange={(e) => dispatch({ type: "SET_PROGRAM_NAME", programId: program.id, name: e.target.value })}
            style={{ height: 36, fontSize: 14 }}
          />

          <div style={{ borderTop: "1px solid var(--color-neutral-800)", margin: "12px 0 10px" }} />

          <label className="row" style={{ gap: 10, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={!!program.isTemplate}
              onChange={(e) => dispatch({ type: "SET_PROGRAM_TEMPLATE", programId: program.id, isTemplate: e.target.checked })}
              style={{ width: 17, height: 17, flex: "none", accentColor: "var(--color-accent)" }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13 }}>Save as a personal template</div>
              <div className="mu" style={{ marginTop: 1, lineHeight: 1.5 }}>Private by default — only you can see or prescribe it, unless you make it public below.</div>
            </div>
          </label>

          {program.isTemplate && (
            <label className="row" style={{ gap: 10, cursor: "pointer", marginTop: 12 }}>
              <input
                type="checkbox"
                checked={program.visibility === "public"}
                onChange={(e) => dispatch({ type: "SET_PROGRAM_VISIBILITY", programId: program.id, visibility: e.target.checked ? "public" : "private" })}
                style={{ width: 17, height: 17, flex: "none", accentColor: "var(--color-accent)" }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13 }}>Make this template public</div>
                <div className="mu" style={{ marginTop: 1, lineHeight: 1.5 }}>Off by default. Nothing you build is ever public unless you turn this on yourself.</div>
              </div>
            </label>
          )}
        </div>

        <div className="cell row" style={{ gap: 8 }}>
          <StatCell label="Block" value={`${program.weeks} wk`} />
          <StatCell label="Week" value={week} />
          <StatCell label="Scale" value={LOAD_LABELS[program.effortScale]} />
        </div>

        {assignToClient ? (
          <>
            <button className="btn btn-solid btn-block" style={{ height: 44 }} onClick={() => nav(`/coach/clients/${assignToClient.id}/assign?programId=${program.id}`)}>
              <i className="ph ph-check-circle" style={{ fontSize: 15 }} />
              Finish assigning to {assignToClient.name.split(" ")[0]}
            </button>
            <button className="btn btn-secondary btn-block" style={{ height: 38, fontSize: 12.5 }} onClick={() => nav(`/coach/programs/${program.id}/assign`)}>
              Assign to someone else instead
            </button>
          </>
        ) : (
          <button className="btn btn-solid btn-block" style={{ height: 44 }} onClick={() => nav(`/coach/programs/${program.id}/assign`)}>
            <i className="ph ph-user-plus" style={{ fontSize: 15 }} />
            Assign to a client
          </button>
        )}

        <button
          className="btn btn-secondary btn-block"
          style={{ height: 40, color: "var(--color-neutral-400)" }}
          onClick={() => {
            const backing = state.clients.filter((c) => c.assignedProgramId === program.id || c.queuedProgramId === program.id);
            const warning = backing.length
              ? ` ${backing.map((c) => c.name).join(", ")} ${backing.length > 1 ? "are" : "is"} currently on this — deleting it here won't change what they're training, but you'll lose easy access to edit it further.`
              : "";
            if (window.confirm(`Delete "${program.name}"?${warning} This can't be undone.`)) {
              dispatch({ type: "REMOVE_PROGRAM", programId: program.id });
              nav(-1);
            }
          }}
        >
          <i className="ph ph-trash" style={{ fontSize: 15 }} />
          Delete this program
        </button>

        <div className="row" style={{ gap: 3 }}>
          {program.phaseWeights.map((w, i) => (
            <div key={i} style={{ flex: w, height: 8, borderRadius: 4, background: i === 0 ? "var(--color-accent)" : i === 1 ? "var(--color-accent-600)" : "var(--color-accent-800)" }} />
          ))}
        </div>

        <button className="cell row" style={{ padding: "12px 12px", textAlign: "left", cursor: "pointer" }} onClick={() => setShowAiEdit(true)}>
          <i className="ph ph-sparkle" style={{ fontSize: 18, color: "var(--color-accent-300)", marginRight: 4 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 14 }}>Edit with AI</div>
            <div className="mu" style={{ marginTop: 2 }}>Say what you want changed — "make every exercise one set" — and check it before it saves</div>
          </div>
          <i className="ph ph-caret-right" style={{ fontSize: 14, color: "var(--color-neutral-600)" }} />
        </button>

        <div className="cell" style={{ padding: "10px 12px" }}>
          <div className="mu" style={{ marginBottom: 7 }}>Load as — applies to every exercise in this program</div>
          <Seg<LoadMode>
            value={program.effortScale}
            onChange={(loadMode) => dispatch({ type: "SET_PROGRAM_LOAD_MODE", programId: program.id, loadMode })}
            options={[
              { value: "lb", label: "LB" },
              { value: "pct1rm", label: "%1RM" },
              { value: "rpe", label: "RPE" },
              { value: "rir", label: "RIR" },
            ]}
          />
        </div>

        <div className="cell" style={{ padding: "10px 12px" }}>
          <div className="row">
            <span style={{ flex: 1, fontSize: 13 }}>Days per week</span>
            <div className="row" style={{ gap: 8 }}>
              <Stepper
                value={program.daysPerWeek}
                onChange={(v) => dispatch({ type: "SET_DAYS_PER_WEEK", programId: program.id, count: v })}
                min={1}
                max={7}
                width={30}
              />
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--color-neutral-800)", margin: "11px 0 9px" }} />

          <div className="scr" style={{ marginBottom: 7 }}>Training days</div>
          <DayOfWeekPicker
            value={resizeDows(program.trainingDows, program.daysPerWeek)}
            onChange={(dows) => dispatch({ type: "SET_TRAINING_DOWS", programId: program.id, dows })}
          />

          <div style={{ borderTop: "1px solid var(--color-neutral-800)", margin: "11px 0 9px" }} />

          <div className="scr" style={{ marginBottom: 7 }}>Week</div>
          <div style={{ display: "flex", gap: 5 }}>
            {Array.from({ length: program.weeks }, (_, i) => i + 1).map((w) => (
              <button
                key={w}
                onClick={() => setWeek(w)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: 38,
                  borderRadius: 8,
                  border: `1px solid ${w === week ? "var(--color-accent)" : "var(--color-divider)"}`,
                  background: w === week ? "var(--color-accent-900)" : "transparent",
                  color: w === week ? "var(--color-accent-200)" : "var(--color-text)",
                  fontFamily: "var(--font-heading)",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {w === deloadWeek ? "D" : w}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="sh">Days</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {program.days.map((day) => (
              <DayBuilderCard
                key={day.id}
                program={program}
                day={day}
                expanded={!!expanded[day.id]}
                onToggle={() => setExpanded((m) => ({ ...m, [day.id]: !m[day.id] }))}
              />
            ))}
          </div>
        </div>

        <div>
          <div className="sh">Volume vs landmark</div>
          <div className="cell" style={{ display: "flex", flexDirection: "column", gap: 10, padding: 12 }}>
            {volumeByMuscle.map((m) => {
              const pct = Math.min(100, (m.sets / m.mrv) * 100);
              const mevPct = (m.mev / m.mrv) * 100;
              const atCap = m.sets >= m.mrv;
              return (
                <div key={m.muscle}>
                  <div className="row" style={{ marginBottom: 5, fontSize: 12.5 }}>
                    <span style={{ flex: 1 }}>{m.muscle}</span>
                    <span style={{ color: atCap ? "var(--color-neutral-300)" : "var(--color-accent-300)", fontFamily: "var(--font-heading)" }}>{m.sets} sets</span>
                  </div>
                  <div className="meter" style={{ position: "relative" }}>
                    <div className="meter-fill" style={{ width: `${pct}%`, background: atCap ? "var(--color-neutral-400)" : "var(--color-accent)" }} />
                    <div style={{ position: "absolute", top: -2, bottom: -2, left: `${mevPct}%`, width: 1, background: "var(--color-neutral-400)" }} />
                  </div>
                </div>
              );
            })}
            <div className="mu">Tick marks minimum effective volume; bars fill toward maximum recoverable volume.</div>
          </div>
        </div>
      </div>

      {showLeaveConfirm && (
        <div className="sheet-backdrop" onClick={() => setShowLeaveConfirm(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>Leave this program?</div>
            <div className="mu" style={{ lineHeight: 1.5 }}>It hasn't been assigned to anyone yet. Keep it to pick up later, or discard it.</div>
            <button className="btn btn-solid btn-block" style={{ height: 46 }} onClick={() => nav(-1)}>
              Save as draft
            </button>
            <button
              className="btn btn-secondary btn-block"
              style={{ height: 42, color: "var(--color-neutral-300)" }}
              onClick={() => {
                dispatch({ type: "REMOVE_PROGRAM", programId: program.id });
                nav(-1);
              }}
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {showAiEdit && (
        <AiEditSheet
          program={program}
          onClose={() => setShowAiEdit(false)}
          onApply={(days, changes, summary) => {
            dispatch({
              type: "SET_PROGRAM_DAYS",
              programId: program.id,
              days,
              aiEdit: { at: new Date().toISOString(), summary, exerciseIds: changes.map((c) => c.exerciseId).filter((id): id is string => !!id) },
            });
            dispatch({ type: "SHOW_TOAST", message: `Applied — ${changes.length} change${changes.length === 1 ? "" : "s"}.` });
            setTimeout(() => dispatch({ type: "CLEAR_TOAST" }), 2600);
            setShowAiEdit(false);
          }}
        />
      )}
    </div>
  );
}

type DragHandleProps = {
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
};

function DayBuilderCard({ program, day, expanded, onToggle }: { program: CoachProgram; day: CoachProgram["days"][number]; expanded: boolean; onToggle: () => void }) {
  const aiTouched = new Set(program.lastAiEdit?.exerciseIds ?? []);
  const { dispatch } = useCoachStore();
  const [adding, setAdding] = useState(false);
  const totalSets = day.exercises.reduce((n, e) => n + e.sets.length, 0);

  const exerciseIds = day.exercises.map((e) => e.id);
  const orderKey = exerciseIds.join(",");
  const [order, setOrder] = useState(exerciseIds);
  // `order` (state) drives rendering; `orderRef` is the live source of truth read by the drag
  // handlers, so a dispatch on pointerup never reads a value from before React has re-rendered.
  const orderRef = useRef(exerciseIds);
  useEffect(() => {
    orderRef.current = exerciseIds;
    setOrder(exerciseIds);
  }, [orderKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const draggingIdRef = useRef<string | null>(null);
  const [dragY, setDragY] = useState(0);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const startY = useRef(0);

  function onGripPointerDown(id: string, e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    draggingIdRef.current = id;
    setDraggingId(id);
    startY.current = e.clientY;
    setDragY(0);
  }

  // Window-level listeners rather than relying on setPointerCapture staying attached to the grip
  // element for the whole gesture — more robust across browsers, and the up event always arrives
  // even if the pointer ends up over a different element by the time the button is released.
  useEffect(() => {
    if (!draggingId) return;

    function handleMove(e: PointerEvent) {
      const id = draggingIdRef.current;
      if (!id) return;
      const delta = e.clientY - startY.current;
      setDragY(delta);

      const draggedEl = itemRefs.current[id];
      if (!draggedEl) return;
      const rect = draggedEl.getBoundingClientRect();
      const draggedMid = rect.top + rect.height / 2 + delta;
      const current = orderRef.current;
      const currentIndex = current.indexOf(id);

      if (currentIndex > 0) {
        const aboveEl = itemRefs.current[current[currentIndex - 1]];
        if (aboveEl) {
          const aboveRect = aboveEl.getBoundingClientRect();
          if (draggedMid < aboveRect.top + aboveRect.height / 2) {
            const next = [...current];
            [next[currentIndex - 1], next[currentIndex]] = [next[currentIndex], next[currentIndex - 1]];
            orderRef.current = next;
            setOrder(next);
            startY.current = e.clientY;
            setDragY(0);
            return;
          }
        }
      }
      if (currentIndex < current.length - 1) {
        const belowEl = itemRefs.current[current[currentIndex + 1]];
        if (belowEl) {
          const belowRect = belowEl.getBoundingClientRect();
          if (draggedMid > belowRect.top + belowRect.height / 2) {
            const next = [...current];
            [next[currentIndex + 1], next[currentIndex]] = [next[currentIndex], next[currentIndex + 1]];
            orderRef.current = next;
            setOrder(next);
            startY.current = e.clientY;
            setDragY(0);
          }
        }
      }
    }

    function handleUp() {
      draggingIdRef.current = null;
      setDraggingId(null);
      setDragY(0);
      dispatch({ type: "REORDER_PROGRAM_EXERCISES", programId: program.id, dayId: day.id, order: orderRef.current });
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, [draggingId]); // eslint-disable-line react-hooks/exhaustive-deps

  function addExercise(picked: LibraryExercise) {
    dispatch({ type: "ADD_PROGRAM_EXERCISE", programId: program.id, dayId: day.id, exercise: { name: picked.name, muscle: picked.muscle, kind: picked.kind } });
    setAdding(false);
  }

  return (
    <div className="cell elev-sm" style={{ padding: "11px 12px 10px" }}>
      <div className="row" style={{ cursor: "pointer" }} onClick={onToggle}>
        <i className={`ph ${expanded ? "ph-caret-down" : "ph-caret-right"}`} style={{ fontSize: 13, color: "var(--color-neutral-500)", marginRight: 8 }} />
        <input
          value={day.name}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => dispatch({ type: "RENAME_PROGRAM_DAY", programId: program.id, dayId: day.id, name: e.target.value })}
          style={{ flex: 1, minWidth: 0, background: "none", border: "none", outline: "none", fontSize: 14, fontFamily: "var(--font-heading)", color: "var(--color-text)" }}
        />
        <span className="mu">
          {day.exercises.length} ex · {totalSets} sets
        </span>
      </div>

      {expanded && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
          {order.map((id) => {
            const ex = day.exercises.find((e) => e.id === id);
            if (!ex) return null;
            const isDragging = draggingId === id;
            return (
              <div
                key={id}
                ref={(el) => {
                  itemRefs.current[id] = el;
                }}
                style={{
                  position: "relative",
                  zIndex: isDragging ? 10 : 1,
                  transform: isDragging ? `translateY(${dragY}px)` : undefined,
                  boxShadow: isDragging ? "0 10px 26px rgba(0,0,0,0.45)" : undefined,
                  opacity: isDragging ? 0.97 : 1,
                }}
              >
                <BuilderExerciseCard
                  programId={program.id}
                  dayId={day.id}
                  ex={ex}
                  loadMode={program.effortScale}
                  aiChanged={aiTouched.has(ex.id)}
                  dragHandleProps={{
                    onPointerDown: (e) => onGripPointerDown(id, e),
                  }}
                />
              </div>
            );
          })}
          <button
            onClick={() => setAdding(true)}
            className="link-row"
            style={{ border: "1px dashed var(--color-neutral-700)", borderRadius: "var(--radius-md)", padding: 11, justifyContent: "center", color: "var(--color-accent)" }}
          >
            <i className="ph ph-plus-circle" style={{ fontSize: 14 }} />
            <span style={{ fontSize: 12.5 }}>Add exercise</span>
          </button>
        </div>
      )}

      {adding && <ExercisePickerSheet kicker={day.name} title="Add exercise" onPick={addExercise} onClose={() => setAdding(false)} />}
    </div>
  );
}

function BuilderExerciseCard({
  programId,
  dayId,
  ex,
  loadMode,
  aiChanged,
  dragHandleProps,
}: {
  programId: string;
  dayId: string;
  ex: BuilderExercise;
  loadMode: LoadMode;
  /** Touched by the last AI edit and not yet dismissed — marked so it's obvious which numbers weren't
   * put there by hand, once the review sheet is long closed. */
  aiChanged?: boolean;
  dragHandleProps: DragHandleProps;
}) {
  const { dispatch } = useCoachStore();
  const [showOverride, setShowOverride] = useState(false);
  const effectiveLoadMode = ex.loadModeOverride ?? loadMode;

  return (
    <div
      className="cell"
      style={{
        padding: "10px 11px",
        background: "var(--color-neutral-900)",
        borderLeft: aiChanged ? "2px solid var(--color-accent)" : undefined,
      }}
    >
      {aiChanged && (
        <div className="scr" style={{ color: "var(--color-accent-300)", marginBottom: 5 }}>
          <i className="ph ph-sparkle" style={{ fontSize: 11, marginRight: 4 }} />
          Changed by AI
        </div>
      )}
      <div className="row" style={{ marginBottom: 8 }}>
        <div
          {...dragHandleProps}
          aria-label={`Drag to reorder ${ex.name}`}
          style={{ display: "flex", alignItems: "center", flex: "none", padding: "4px 6px 4px 0", marginLeft: -4, color: "var(--color-neutral-600)", cursor: "grab", touchAction: "none" }}
        >
          <i className="ph ph-dots-six-vertical" style={{ fontSize: 18 }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="trunc" style={{ fontSize: 13.5 }}>{ex.name}</div>
          <div className="mu" style={{ marginTop: 1 }}>{ex.muscle}{ex.kind === "cardio" ? " · cardio" : ""}</div>
        </div>
        {ex.kind !== "cardio" && (
          <button
            onClick={() => setShowOverride((v) => !v)}
            aria-label={`Override load type for ${ex.name}`}
            style={{ background: "none", border: "none", cursor: "pointer", color: ex.loadModeOverride ? "var(--color-accent)" : "var(--color-neutral-500)", display: "flex" }}
          >
            <i className="ph ph-sliders-horizontal" style={{ fontSize: 15 }} />
          </button>
        )}
        <button
          onClick={() => dispatch({ type: "REMOVE_PROGRAM_EXERCISE", programId, dayId, exerciseId: ex.id })}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-neutral-500)", display: "flex" }}
          aria-label={`Remove ${ex.name}`}
        >
          <i className="ph ph-trash" style={{ fontSize: 15 }} />
        </button>
      </div>

      {ex.kind !== "cardio" && (showOverride || ex.loadModeOverride) && (
        <div className="row" style={{ gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
          <span className="mu" style={{ flex: "none" }}>{ex.loadModeOverride ? "Overridden to" : "Override to"}</span>
          <Seg<LoadMode>
            value={effectiveLoadMode}
            onChange={(m) => dispatch({ type: "SET_EXERCISE_LOAD_OVERRIDE", programId, dayId, exerciseId: ex.id, loadMode: m })}
            options={[
              { value: "lb", label: "LB" },
              { value: "pct1rm", label: "%1RM" },
              { value: "rpe", label: "RPE" },
              { value: "rir", label: "RIR" },
            ]}
          />
          {ex.loadModeOverride && (
            <button
              onClick={() => {
                dispatch({ type: "SET_EXERCISE_LOAD_OVERRIDE", programId, dayId, exerciseId: ex.id, loadMode: null });
                setShowOverride(false);
              }}
              style={{ fontSize: 11, color: "var(--color-neutral-500)", background: "none", border: "none", cursor: "pointer", flex: "none" }}
            >
              Use program default
            </button>
          )}
        </div>
      )}

      {ex.kind === "cardio" ? <CardioSets programId={programId} dayId={dayId} ex={ex} /> : <StrengthSets programId={programId} dayId={dayId} ex={ex} loadMode={effectiveLoadMode} />}
    </div>
  );
}

function StrengthSets({ programId, dayId, ex, loadMode }: { programId: string; dayId: string; ex: BuilderExercise; loadMode: LoadMode }) {
  const { dispatch } = useCoachStore();
  const { step, min: loadMin, max: loadMax } = LOAD_RANGE[loadMode];
  const restSec = ex.sets[0]?.restSec ?? defaultRestSec(ex.name);

  function editReps(s: BuilderSet, dir: 1 | -1) {
    dispatch({ type: "EDIT_PROGRAM_SET", programId, dayId, exerciseId: ex.id, setId: s.id, reps: Math.max(1, s.reps + dir) });
  }
  function editLoad(s: BuilderSet, dir: 1 | -1) {
    dispatch({ type: "EDIT_PROGRAM_SET", programId, dayId, exerciseId: ex.id, setId: s.id, loadValue: clampLoadValue(s.loadValue + dir * step, loadMode) });
  }

  let workCounter = 0;
  let warmCounter = 0;

  return (
    <>
      <div className="scr" style={{ display: "grid", gridTemplateColumns: "22px 1fr 1fr 30px", gap: 8, padding: "4px 0" }}>
        <span />
        <span style={{ textAlign: "center" }}>reps</span>
        <span style={{ textAlign: "center" }}>{LOAD_LABELS[loadMode]}</span>
        <span />
      </div>

      {ex.sets.map((s) => {
        const label = s.warmup ? `W${++warmCounter}` : `${++workCounter}`;
        return (
          <div key={s.id} className="setrow" style={{ gridTemplateColumns: "22px 1fr 1fr 30px" }}>
            <span style={{ fontSize: 11, color: s.warmup ? "var(--color-neutral-400)" : "var(--color-neutral-500)" }}>{label}</span>
            <Stepper
              value={typeof s.reps === "number" ? s.reps : parseFloat(String(s.reps)) || 0}
              onChange={(v) => dispatch({ type: "EDIT_PROGRAM_SET", programId, dayId, exerciseId: ex.id, setId: s.id, reps: v })}
              min={1}
              width={38}
              fontSize={14}
            />
            {/* min/max keep a typed value inside the mode's real range (an RIR of 225 is nonsense), but
                deliberately don't snap to `step` the way the +/- buttons do -- entering an exact weight
                the 5 lb grid can't reach is the whole reason for typing it. */}
            <Stepper
              value={s.loadValue}
              onChange={(v) => dispatch({ type: "EDIT_PROGRAM_SET", programId, dayId, exerciseId: ex.id, setId: s.id, loadValue: v })}
              step={step}
              min={loadMin}
              max={loadMax}
              width={52}
              fontSize={14}
            />
            <button
              onClick={() => dispatch({ type: "REMOVE_PROGRAM_SET", programId, dayId, exerciseId: ex.id, setId: s.id })}
              style={{ background: "none", border: "none", color: "var(--color-neutral-600)", cursor: "pointer", display: "flex", justifySelf: "center" }}
              aria-label={`Remove set ${label}`}
            >
              <i className="ph ph-x" style={{ fontSize: 13 }} />
            </button>
          </div>
        );
      })}

      <div className="row" style={{ gap: 14, paddingTop: 8, marginTop: 2 }}>
        <button
          onClick={() => dispatch({ type: "ADD_PROGRAM_SET", programId, dayId, exerciseId: ex.id })}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--color-accent)", display: "flex", alignItems: "center", gap: 5, padding: 0 }}
        >
          <i className="ph ph-plus-circle" style={{ fontSize: 13 }} />
          Add set
        </button>
        <button
          onClick={() => dispatch({ type: "ADD_PROGRAM_SET", programId, dayId, exerciseId: ex.id, warmup: true })}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--color-neutral-400)", display: "flex", alignItems: "center", gap: 5, padding: 0 }}
        >
          <i className="ph ph-flame" style={{ fontSize: 13 }} />
          Add warm-up
        </button>
      </div>

      <div className="row" style={{ gap: 8, paddingTop: 8, marginTop: 2, borderTop: "1px solid var(--color-neutral-800)" }}>
        <span className="mu" style={{ flex: 1 }}>Rest between sets</span>
        <div className="row" style={{ gap: 6 }}>
          <button
            onClick={() => dispatch({ type: "SET_EXERCISE_REST", programId, dayId, exerciseId: ex.id, restSec: Math.max(0, restSec - REST_STEP) })}
            style={{ background: "none", border: "none", color: "var(--color-neutral-500)", cursor: "pointer", display: "flex" }}
          >
            <i className="ph ph-minus" style={{ fontSize: 12 }} />
          </button>
          <span style={{ fontSize: 13, fontFamily: "var(--font-heading)", minWidth: 40, textAlign: "center" }}>{formatDuration(restSec)}</span>
          <button
            onClick={() => dispatch({ type: "SET_EXERCISE_REST", programId, dayId, exerciseId: ex.id, restSec: restSec + REST_STEP })}
            style={{ background: "none", border: "none", color: "var(--color-neutral-500)", cursor: "pointer", display: "flex" }}
          >
            <i className="ph ph-plus" style={{ fontSize: 12 }} />
          </button>
        </div>
      </div>
    </>
  );
}

function CardioSets({ programId, dayId, ex }: { programId: string; dayId: string; ex: BuilderExercise }) {
  const { dispatch } = useCoachStore();

  function editWork(s: BuilderSet, dir: 1 | -1) {
    const current = s.workSec ?? CARDIO_DEFAULT.workSec;
    const next = Math.max(5, current + dir * workStep(current));
    dispatch({ type: "EDIT_PROGRAM_SET", programId, dayId, exerciseId: ex.id, setId: s.id, workSec: next });
  }
  function editRest(s: BuilderSet, dir: 1 | -1) {
    const next = Math.max(0, (s.restSec ?? CARDIO_DEFAULT.restSec) + dir * REST_STEP);
    dispatch({ type: "EDIT_PROGRAM_SET", programId, dayId, exerciseId: ex.id, setId: s.id, restSec: next });
  }

  const single = ex.sets.length === 1;

  return (
    <>
      <div className="scr" style={{ display: "grid", gridTemplateColumns: "22px 1fr 1fr 30px", gap: 8, padding: "4px 0" }}>
        <span />
        <span style={{ textAlign: "center" }}>work</span>
        <span style={{ textAlign: "center" }}>rest after</span>
        <span />
      </div>

      {ex.sets.map((s, i) => (
        <div key={s.id} className="setrow" style={{ gridTemplateColumns: "22px 1fr 1fr 30px" }}>
          <span style={{ fontSize: 11, color: "var(--color-neutral-500)" }}>{i + 1}</span>
          <div className="row" style={{ justifyContent: "center", gap: 6 }}>
            <button onClick={() => editWork(s, -1)} style={{ background: "none", border: "none", color: "var(--color-neutral-500)", cursor: "pointer", display: "flex" }}>
              <i className="ph ph-minus" style={{ fontSize: 12 }} />
            </button>
            <span style={{ fontSize: 14, fontFamily: "var(--font-heading)" }}>{formatDuration(s.workSec ?? CARDIO_DEFAULT.workSec)}</span>
            <button onClick={() => editWork(s, 1)} style={{ background: "none", border: "none", color: "var(--color-neutral-500)", cursor: "pointer", display: "flex" }}>
              <i className="ph ph-plus" style={{ fontSize: 12 }} />
            </button>
          </div>
          <div className="row" style={{ justifyContent: "center", gap: 6 }}>
            <button onClick={() => editRest(s, -1)} style={{ background: "none", border: "none", color: "var(--color-neutral-500)", cursor: "pointer", display: "flex" }}>
              <i className="ph ph-minus" style={{ fontSize: 12 }} />
            </button>
            <span style={{ fontSize: 14, fontFamily: "var(--font-heading)" }}>{(s.restSec ?? CARDIO_DEFAULT.restSec) === 0 ? "—" : formatDuration(s.restSec ?? 0)}</span>
            <button onClick={() => editRest(s, 1)} style={{ background: "none", border: "none", color: "var(--color-neutral-500)", cursor: "pointer", display: "flex" }}>
              <i className="ph ph-plus" style={{ fontSize: 12 }} />
            </button>
          </div>
          {ex.sets.length > 1 && (
            <button
              onClick={() => dispatch({ type: "REMOVE_PROGRAM_SET", programId, dayId, exerciseId: ex.id, setId: s.id })}
              style={{ background: "none", border: "none", color: "var(--color-neutral-600)", cursor: "pointer", display: "flex", justifySelf: "center" }}
              aria-label={`Remove interval ${i + 1}`}
            >
              <i className="ph ph-x" style={{ fontSize: 13 }} />
            </button>
          )}
        </div>
      ))}

      <div className="mu" style={{ marginTop: 2 }}>
        {single ? "One block — for a steady jog, ride or row, this is the whole effort." : `${ex.sets.length} intervals · repeat work/rest above.`}
      </div>

      <div className="row" style={{ gap: 14, paddingTop: 8, marginTop: 6 }}>
        <button
          onClick={() => dispatch({ type: "ADD_PROGRAM_SET", programId, dayId, exerciseId: ex.id })}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--color-accent)", display: "flex", alignItems: "center", gap: 5, padding: 0 }}
        >
          <i className="ph ph-plus-circle" style={{ fontSize: 13 }} />
          Add interval
        </button>
      </div>
    </>
  );
}
