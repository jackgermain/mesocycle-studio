import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { findDay, useStore } from "../state/store";
import { useAuth } from "../lib/auth";
import { WeighInDue } from "../components/WeighInDue";
import { FormCheckSheet } from "../shared/FormCheckSheet";
import { formChecksAvailable } from "../shared/formChecks";
import { BackHeader, InfoBanner } from "../components/UI";
import { DayNavControls } from "../components/DayNavControls";
import { TabBar } from "../components/TabBar";
import { dayDisplayTitle, dayKicker } from "../data/dayNumbering";
import { SimpleExercisePicker } from "../shared/SimpleExercisePicker";
import { SwapScopeSheet } from "../shared/SwapScopeSheet";
import { RemoveExerciseSheet } from "../shared/RemoveExerciseSheet";
import { equipmentOf } from "./exerciseHelpers";
import { ExerciseSection } from "./ExerciseSection";

type ConfirmAction = "session" | "mesocycle" | null;

export default function DayWorkout({ dayId }: { dayId: string }) {
  const { state, dispatch } = useStore();
  const nav = useNavigate();
  const { account, previewingAsClient } = useAuth();
  // Every hook stays above the "not found" return. The program arrives asynchronously, so this component
  // really does render once with no matching day and again once there is one -- and a hook below the
  // return would run on the second render but not the first, which is React error #310.
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [swapKey, setSwapKey] = useState<string | null>(null);
  const [pendingSwap, setPendingSwap] = useState<{ name: string; muscle: string; hasVideo: boolean } | null>(null);
  const [removeKey, setRemoveKey] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [formCheckFor, setFormCheckFor] = useState<string | null>(null);
  // The bucket and table land by hand-run migration, so the button only appears once they exist -- a
  // client tapping into a 404 is worse than the option not being there yet.
  const [canFormCheck, setCanFormCheck] = useState(false);
  useEffect(() => {
    let active = true;
    formChecksAvailable().then((ok) => active && setCanFormCheck(ok));
    return () => {
      active = false;
    };
  }, []);

  const found = findDay(state.program, dayId);
  if (!found) return <div className="screen-scroll">Not found.</div>;
  const { day, week } = found;
  const exIds = day.order.length ? day.order : Object.keys(day.exercises);

  const totalSets = exIds.reduce((n, id) => n + (day.exercises[id]?.sets.length ?? 0), 0);
  const doneSets = exIds.reduce((n, id) => n + (day.exercises[id]?.sets.filter((s) => s.checked).length ?? 0), 0);
  const allResolved = totalSets > 0 && doneSets === totalSets;
  // A day with nothing in it was a dead end. allResolved is false when totalSets is 0, so "Finish
  // session" stayed disabled under the message "Log or remove every set to finish · 0 left" -- nothing
  // to log, nothing to remove, and no way off the screen except the day arrows. A coach can leave a
  // builder day empty and it still gets scheduled (see expandCoachProgramToProgram), so this is reachable
  // by a real client on a real program. Nothing to resolve means it is finishable.
  const nothingProgrammed = totalSets === 0;
  const canFinish = allResolved || nothingProgrammed;

  const swappingEx = swapKey ? day.exercises[swapKey] : null;

  function applySwap(scope: "day" | "mesocycle") {
    if (!swapKey || !pendingSwap) return;
    dispatch({
      type: "SWAP_EXERCISE",
      exerciseKey: swapKey,
      replacement: { name: pendingSwap.name, muscle: pendingSwap.muscle, equipment: equipmentOf({ name: pendingSwap.name }), hasVideo: pendingSwap.hasVideo },
      scope,
      dayId,
    });
    dispatch({
      type: "SHOW_TOAST",
      message: scope === "day" ? `Swapped to ${pendingSwap.name} for today.` : `Swapped to ${pendingSwap.name} for the rest of the block.`,
    });
    setTimeout(() => dispatch({ type: "CLEAR_TOAST" }), 3000);
    setPendingSwap(null);
    setSwapKey(null);
  }

  // Self-directed: a real client's mesocycle is authored and owned by their coach, so only someone
  // training themselves (a "friend" account, or a coach previewing as their own client) can end or
  // restructure it -- a coached client can still end today's session early, just not the whole block.
  const selfDirected = account?.role === "friend" || previewingAsClient;

  function closeOptions() {
    setShowOptions(false);
    setConfirmAction(null);
    setConfirmText("");
  }

  function confirmPhrase(action: ConfirmAction) {
    return action === "session" ? "end session" : "end mesocycle";
  }

  function runConfirmedAction() {
    if (confirmAction === "session") {
      closeOptions();
      nav(`/block/day/${dayId}/finish`);
    } else if (confirmAction === "mesocycle") {
      dispatch({ type: "SET_PROGRAM", program: { name: "Your program", totalWeeks: 0, coachName: state.program.coachName, weeks: [] } });
      closeOptions();
      nav("/build");
    }
  }

  return (
    <div className="screen">
      <BackHeader
        kicker={dayKicker(day, week.number)}
        title={allResolved ? "Session complete" : dayDisplayTitle(day)}
        right={<DayNavControls dayId={dayId} />}
        onBack={selfDirected ? () => nav("/build") : undefined}
      />
      <div className="screen-scroll" onClick={() => openMenu && setOpenMenu(null)}>
        <WeighInDue />

        {allResolved && (
          <InfoBanner icon="ph-check-circle" tone="accent">
            Every set is logged or removed. Finish the session to answer feedback and unlock next time.
          </InfoBanner>
        )}

        {nothingProgrammed && (
          <InfoBanner icon="ph-calendar-x">
            {selfDirected
              ? "Nothing is programmed for this day — a rest day as far as the app is concerned. Nothing to log, and no feedback to fill in."
              : `Nothing is programmed for this day, so there's nothing to log and no feedback to fill in. Message ${state.program.coachName} if you were expecting a session.`}
          </InfoBanner>
        )}

        <div className="row" style={{ gap: 6 }}>
          <button className="link-row" style={{ flex: 1, padding: "9px 12px", color: "var(--color-neutral-400)" }} onClick={() => nav(`/block/day/${dayId}/reorder`)}>
            <i className="ph ph-arrows-down-up" style={{ fontSize: 14 }} />
            <span style={{ flex: 1, fontSize: 12.5 }}>Change the order</span>
            <i className="ph ph-caret-right" style={{ fontSize: 14, color: "var(--color-neutral-600)" }} />
          </button>
          <button
            className="btn btn-secondary btn-icon"
            style={{ width: 34, height: 34, flex: "none" }}
            aria-label="Session options"
            onClick={(e) => {
              e.stopPropagation();
              setShowOptions(true);
            }}
          >
            <i className="ph ph-dots-three-vertical" style={{ fontSize: 16 }} />
          </button>
        </div>

        {exIds.map((id, i) => {
          const ex = day.exercises[id];
          if (!ex) return null;
          return (
            <ExerciseSection
              key={id}
              index={i + 1}
              dayId={dayId}
              ex={ex}
              menuOpen={openMenu === id}
              onToggleMenu={(e) => {
                e.stopPropagation();
                setOpenMenu((m) => (m === id ? null : id));
              }}
              onAddSet={() => {
                dispatch({ type: "ADD_SET", dayId, exerciseId: id });
                setOpenMenu(null);
              }}
              onAddWarmup={() => {
                dispatch({ type: "ADD_SET", dayId, exerciseId: id, warmup: true });
                setOpenMenu(null);
              }}
              // A prescribed client answers for a set they didn't do -- that reason is the whole point of
              // the removal, it's what their coach reads. Someone training themselves is editing their own
              // prescription, so there's nobody to explain it to: the set just goes, and stays gone for the
              // rest of the block.
              onRemoveSet={() => {
                setOpenMenu(null);
                if (selfDirected) {
                  dispatch({ type: "DROP_SET", exerciseKey: id, scope: "mesocycle", dayId });
                  dispatch({ type: "SHOW_TOAST", message: `Dropped a set from ${ex.name} for the rest of the block.` });
                  setTimeout(() => dispatch({ type: "CLEAR_TOAST" }), 2600);
                  return;
                }
                const target = ex.sets.find((s) => !s.checked) ?? ex.sets[ex.sets.length - 1];
                nav(`/block/day/${dayId}/exercise/${id}/remove/${target.id}`);
              }}
              // A prescribed client's program is their coach's to change; a self-directed account owns
              // theirs, so only they get to swap out of it here.
              onSwap={selfDirected ? () => {
                setOpenMenu(null);
                setSwapKey(id);
              } : undefined}
              onRemoveExercise={selfDirected ? () => {
                setOpenMenu(null);
                setRemoveKey(id);
              } : undefined}
              // Offered to anyone with a coach on file, prescribed client or friend/family alike --
              // a self-directed account still has someone to ask.
              onFormCheck={canFormCheck && account?.coach_id ? () => {
                setOpenMenu(null);
                setFormCheckFor(ex.name);
              } : undefined}
            />
          );
        })}

        <div style={{ paddingBottom: 8 }}>
          <button
            className="btn btn-primary btn-block"
            style={{ height: 48, opacity: canFinish ? 1 : 0.45, cursor: canFinish ? "pointer" : "not-allowed" }}
            disabled={!canFinish}
            onClick={() => {
              if (!canFinish) return;
              // A day with no exercises asks for nothing. Sending it through the feedback flow would ask
              // how a session went that never happened -- how was your pump, any joint pain -- about a
              // day off. Mark it done and move on; SET_FEEDBACK_DONE is what closes a day out either way.
              if (nothingProgrammed) {
                dispatch({ type: "SET_FEEDBACK_DONE", dayId });
                nav("/block", { replace: true });
                return;
              }
              nav(`/block/day/${dayId}/finish`);
            }}
          >
            {nothingProgrammed ? "Nothing to log — mark it done" : "Finish session"}
          </button>
          {!canFinish && <div className="mu" style={{ textAlign: "center", marginTop: 7 }}>Log or remove every set to finish · {totalSets - doneSets} left</div>}
        </div>
      </div>
      {formCheckFor && (
        <FormCheckSheet
          exerciseName={formCheckFor}
          dayId={dayId}
          dayLabel={dayDisplayTitle(day)}
          onClose={() => setFormCheckFor(null)}
        />
      )}
      <TabBar />

      {swapKey && swappingEx && !pendingSwap && (
        <SimpleExercisePicker
          onPick={(picked) => setPendingSwap({ name: picked.name, muscle: picked.muscle, hasVideo: picked.hasVideo })}
          onClose={() => setSwapKey(null)}
        />
      )}
      {swapKey && swappingEx && pendingSwap && (
        <SwapScopeSheet
          fromName={swappingEx.name}
          toName={pendingSwap.name}
          onChoose={applySwap}
          onClose={() => setPendingSwap(null)}
        />
      )}
      {removeKey && day.exercises[removeKey] && (
        <RemoveExerciseSheet
          name={day.exercises[removeKey].name}
          onChoose={(scope) => {
            const removed = day.exercises[removeKey].name;
            dispatch({ type: "REMOVE_EXERCISE", exerciseKey: removeKey, scope, dayId });
            dispatch({ type: "SHOW_TOAST", message: scope === "day" ? `Removed ${removed} for today.` : `Removed ${removed} from the rest of the block.` });
            setTimeout(() => dispatch({ type: "CLEAR_TOAST" }), 3000);
            setRemoveKey(null);
          }}
          onClose={() => setRemoveKey(null)}
        />
      )}

      {showOptions && (
        <div className="sheet-backdrop" onClick={closeOptions}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            {!confirmAction ? (
              <>
                <div className="row" style={{ marginBottom: 4 }}>
                  <div style={{ flex: 1 }}>
                    <div className="scr">This session</div>
                    <div style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>Options</div>
                  </div>
                  <button onClick={closeOptions} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-neutral-500)" }}>
                    <i className="ph ph-x" style={{ fontSize: 16 }} />
                  </button>
                </div>

                <button className="link-row" style={{ padding: "11px 12px" }} onClick={() => setConfirmAction("session")}>
                  <i className="ph ph-flag-checkered" style={{ fontSize: 16, color: "var(--color-accent-300)" }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5 }}>End session</div>
                    <div className="mu" style={{ marginTop: 1 }}>Close out today, even with sets left unlogged.</div>
                  </div>
                </button>

                {selfDirected && (
                  <button className="link-row" style={{ padding: "11px 12px" }} onClick={() => nav("/build?edit=1")}>
                    <i className="ph ph-pencil-simple" style={{ fontSize: 16, color: "var(--color-accent-300)" }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12.5 }}>Edit mesocycle</div>
                      <div className="mu" style={{ marginTop: 1 }}>Change exercises on days you haven't done yet.</div>
                    </div>
                  </button>
                )}

                {selfDirected && (
                  <button className="link-row" style={{ padding: "11px 12px" }} onClick={() => setConfirmAction("mesocycle")}>
                    <i className="ph ph-x-circle" style={{ fontSize: 16, color: "var(--color-neutral-400)" }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12.5, color: "var(--color-neutral-300)" }}>End mesocycle</div>
                      <div className="mu" style={{ marginTop: 1 }}>Ends the whole program early — you'll pick a new one next.</div>
                    </div>
                  </button>
                )}
              </>
            ) : (
              <>
                <div className="row" style={{ marginBottom: 4 }}>
                  <div style={{ flex: 1 }}>
                    <div className="scr">Confirm</div>
                    <div style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>{confirmAction === "session" ? "End this session?" : "End this mesocycle?"}</div>
                  </div>
                  <button onClick={closeOptions} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-neutral-500)" }}>
                    <i className="ph ph-x" style={{ fontSize: 16 }} />
                  </button>
                </div>
                <InfoBanner icon="ph-warning">
                  {confirmAction === "session"
                    ? `${totalSets - doneSets} set${totalSets - doneSets === 1 ? "" : "s"} will stay unlogged and today closes out. This can't be undone.`
                    : "Every week from here on is cleared, including anything not yet logged. This can't be undone."}
                </InfoBanner>
                <div className="field">
                  <label>Type "{confirmPhrase(confirmAction)}" to confirm</label>
                  <input className="input" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoFocus autoCapitalize="off" autoCorrect="off" />
                </div>
                <button
                  className="btn btn-primary btn-block"
                  style={{ height: 48, opacity: confirmText.trim().toLowerCase() === confirmPhrase(confirmAction) ? 1 : 0.4 }}
                  disabled={confirmText.trim().toLowerCase() !== confirmPhrase(confirmAction)}
                  onClick={runConfirmedAction}
                >
                  {confirmAction === "session" ? "End session" : "End mesocycle"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
