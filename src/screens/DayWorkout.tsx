import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { findDay, useStore } from "../state/store";
import { useAuth } from "../lib/auth";
import { BackHeader, InfoBanner } from "../components/UI";
import { DayNavControls } from "../components/DayNavControls";
import { TabBar } from "../components/TabBar";
import { dayDisplayTitle, dayKicker } from "../data/dayNumbering";
import { ExerciseSection } from "./ExerciseSection";

type ConfirmAction = "session" | "mesocycle" | null;

export default function DayWorkout({ dayId }: { dayId: string }) {
  const { state, dispatch } = useStore();
  const nav = useNavigate();
  const { account, previewingAsClient } = useAuth();
  const found = findDay(state.program, dayId);
  if (!found) return <div className="screen-scroll">Not found.</div>;
  const { day, week } = found;
  const exIds = day.order.length ? day.order : Object.keys(day.exercises);

  const totalSets = exIds.reduce((n, id) => n + (day.exercises[id]?.sets.length ?? 0), 0);
  const doneSets = exIds.reduce((n, id) => n + (day.exercises[id]?.sets.filter((s) => s.checked).length ?? 0), 0);
  const allResolved = totalSets > 0 && doneSets === totalSets;

  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [confirmText, setConfirmText] = useState("");

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
        {allResolved && (
          <InfoBanner icon="ph-check-circle" tone="accent">
            Every set is logged or removed. Finish the session to answer feedback and unlock next time.
          </InfoBanner>
        )}

        <div className="row" style={{ gap: 6 }}>
          <button className="link-row" style={{ flex: 1, padding: "9px 12px", color: "var(--color-neutral-400)" }} onClick={() => nav(`/block/day/${dayId}/reorder`)}>
            <i className="ph ph-arrows-down-up" style={{ fontSize: 15 }} />
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
              onRemoveSet={() => {
                setOpenMenu(null);
                const target = ex.sets.find((s) => !s.checked) ?? ex.sets[ex.sets.length - 1];
                nav(`/block/day/${dayId}/exercise/${id}/remove/${target.id}`);
              }}
            />
          );
        })}

        <div style={{ paddingBottom: 8 }}>
          <button
            className="btn btn-primary btn-block"
            style={{ height: 48, opacity: allResolved ? 1 : 0.45, cursor: allResolved ? "pointer" : "not-allowed" }}
            disabled={!allResolved}
            onClick={() => allResolved && nav(`/block/day/${dayId}/finish`)}
          >
            Finish session
          </button>
          {!allResolved && <div className="mu" style={{ textAlign: "center", marginTop: 7 }}>Log or remove every set to finish · {totalSets - doneSets} left</div>}
        </div>
      </div>
      <TabBar />

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
                    <i className="ph ph-x" style={{ fontSize: 18 }} />
                  </button>
                </div>

                <button className="link-row" style={{ padding: "11px 12px" }} onClick={() => setConfirmAction("session")}>
                  <i className="ph ph-flag-checkered" style={{ fontSize: 16, color: "var(--color-accent-300)" }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13 }}>End session</div>
                    <div className="mu" style={{ marginTop: 1 }}>Close out today, even with sets left unlogged.</div>
                  </div>
                </button>

                {selfDirected && (
                  <button className="link-row" style={{ padding: "11px 12px" }} onClick={() => nav("/build?edit=1")}>
                    <i className="ph ph-pencil-simple" style={{ fontSize: 16, color: "var(--color-accent-300)" }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13 }}>Edit mesocycle</div>
                      <div className="mu" style={{ marginTop: 1 }}>Change exercises on days you haven't done yet.</div>
                    </div>
                  </button>
                )}

                {selfDirected && (
                  <button className="link-row" style={{ padding: "11px 12px" }} onClick={() => setConfirmAction("mesocycle")}>
                    <i className="ph ph-x-circle" style={{ fontSize: 16, color: "var(--color-neutral-400)" }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: "var(--color-neutral-300)" }}>End mesocycle</div>
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
                    <i className="ph ph-x" style={{ fontSize: 18 }} />
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
                  style={{ height: 46, opacity: confirmText.trim().toLowerCase() === confirmPhrase(confirmAction) ? 1 : 0.4 }}
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
