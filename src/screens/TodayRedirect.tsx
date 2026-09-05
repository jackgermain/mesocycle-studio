import React, { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useStore } from "../state/store";
import { useAuth } from "../lib/auth";
import { TabBar } from "../components/TabBar";
import { InfoBanner } from "../components/UI";
import { canSelfBuildProgram } from "../shared/canBuild";
import { repeatProgram } from "../shared/programConvert";
import { WeighInDue } from "../components/WeighInDue";

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

  // A finished block used to fall through to allDays[0] -- day one of the block they just completed,
  // every set already ticked, with no way to tell that's what had happened. A finished block now gets its
  // own screen instead.
  const target = allDays.find((d) => d.status === "today") ?? allDays.find((d) => d.status !== "done") ?? (allDone ? undefined : allDays[0]);

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
        </div>
        <TabBar />
      </div>
    );
  }

  return <Navigate to={`/block/day/${target.id}`} replace />;
}
