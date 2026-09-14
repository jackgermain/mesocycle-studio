import React, { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useStore } from "../state/store";
import { useAuth } from "../lib/auth";
import { TabBar } from "../components/TabBar";
import { InfoBanner } from "../components/UI";
import { canSelfBuildProgram } from "../shared/canBuild";
import { repeatProgram } from "../shared/programConvert";
import { WeighInDue } from "../components/WeighInDue";
import { ProgressionToggle } from "../shared/AutomationToggles";

/** The "Train" tab's landing spot — always today's lift, no overview page in between. */
export default function TodayRedirect() {
  const { state, dispatch } = useStore();
  const { account } = useAuth();
  const nav = useNavigate();
  const allDays = state.program.weeks.flatMap((w) => w.days);
  const allDone = allDays.length > 0 && allDays.every((d) => d.status === "done");

  // The current block is fully logged and a coach queued what comes next — start it automatically rather
  // than leaving the client stuck on "nothing scheduled" until someone notices and reassigns by hand.
  useEffect(() => {
    if (allDone && state.nextProgram) dispatch({ type: "PROMOTE_NEXT_PROGRAM" });
  }, [allDone, state.nextProgram, dispatch]);

  // G120: a block asked for as "keep going until I end it" extends itself instead of ending.
  //
  // Same mechanism as the manual "Add 4 more weeks" on the workout screen's options sheet -- this only fires
  // it automatically, because extending is what the person chose when they built the block. A coach's queued
  // next block still wins: the two effects are mutually exclusive on `state.nextProgram`, so an explicitly
  // assigned program is never overridden by an automatic extension.
  //
  // This hook sits above every early return below on purpose. Those returns are reached on the first render
  // of a store that has not hydrated yet, and a hook placed after them runs on the second render but not the
  // first -- React error #310, which has shipped from this codebase before.
  useEffect(() => {
    if (allDone && !state.nextProgram && state.program.openEnded) {
      dispatch({ type: "EXTEND_PROGRAM", weeks: 4 });
    }
  }, [allDone, state.nextProgram, state.program.openEnded, dispatch]);

  // A finished block used to fall through to allDays[0] -- day one of the block they just completed,
  // every set already ticked, with no way to tell that's what had happened. A finished block now gets its
  // own screen instead.
  const target = allDays.find((d) => d.status === "today") ?? allDays.find((d) => d.status !== "done") ?? (allDone ? undefined : allDays[0]);

  // One render passes between the last session being logged and the effect above adding more weeks. Render
  // nothing for that frame rather than flashing "Block complete" or "Nothing scheduled yet" -- on an
  // open-ended block neither is true, and both would be gone again immediately.
  if (allDone && !state.nextProgram && state.program.openEnded) return null;

  if (allDone && !state.nextProgram) {
    const canBuild = canSelfBuildProgram(account?.role);
    const weeks = state.program.totalWeeks || state.program.weeks.length;
    return (
      <div className="screen">
        <div className="hdr" style={{ paddingBottom: 8 }}>
          <div>
            <div className="k">{state.program.name}</div>
            <div className="h1">Block complete</div>
          </div>
        </div>
        <div className="screen-scroll">
          <InfoBanner icon="ph-check-circle" tone="accent">
            Every session in this block is logged — <span className="mono">{weeks}</span> weeks done.
          </InfoBanner>

          {canBuild ? (
            <>
              <button
                className="btn btn-primary btn-block"
                style={{ height: 48 }}
                onClick={() => {
                  // Rebuilt through the draft path, so it starts on the right upcoming days with nothing
                  // logged rather than replaying the old block's dates.
                  dispatch({ type: "SET_PROGRAM", program: repeatProgram(state.program) });
                  dispatch({ type: "SHOW_TOAST", message: "Running it again, starting this week." });
                  setTimeout(() => dispatch({ type: "CLEAR_TOAST" }), 3000);
                }}
              >
                <i className="ph ph-arrow-counter-clockwise" style={{ fontSize: 14 }} />
                Run this block again
              </button>
              <button className="btn btn-secondary btn-block" style={{ height: 44, fontSize: 12.5 }} onClick={() => nav("/build?repeat=1")}>
                Change it first, then run it
              </button>
              <button className="btn btn-ghost" style={{ fontSize: 12.5 }} onClick={() => nav("/build")}>
                Start something different
              </button>
            </>
          ) : (
            <InfoBanner icon="ph-hourglass">
              Nice work. {state.program.coachName} will set your next block — message them if you haven't heard.
            </InfoBanner>
          )}
          <ProgressionToggle />
        </div>
        <TabBar />
      </div>
    );
  }

  if (!target) {
    const canBuild = canSelfBuildProgram(account?.role);
    return (
      <div className="screen">
        <div className="hdr" style={{ paddingBottom: 8 }}>
          <div>
            <div className="k">{state.program.coachName}</div>
            <div className="h1">Nothing scheduled yet</div>
          </div>
        </div>
        <div className="screen-scroll">
        <WeighInDue />

          {canBuild ? (
            <>
              <InfoBanner icon="ph-hourglass">Nothing built yet — start your own program from scratch, or clone one of {state.program.coachName}'s templates.</InfoBanner>
              <button className="btn btn-primary btn-block" style={{ height: 48 }} onClick={() => nav("/build")}>
                <i className="ph ph-plus-circle" style={{ fontSize: 14 }} />
                Build your own program
              </button>
            </>
          ) : (
            <InfoBanner icon="ph-hourglass">{state.program.coachName} hasn't built your program yet — check back once they've published it.</InfoBanner>
          )}
          <ProgressionToggle />
        </div>
        <TabBar />
      </div>
    );
  }

  return <Navigate to={`/block/day/${target.id}`} replace />;
}
