import React, { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useStore } from "../state/store";
import { useAuth } from "../lib/auth";
import { TabBar } from "../components/TabBar";
import { InfoBanner } from "../components/UI";
import { canSelfBuildProgram } from "../shared/canBuild";

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

  const target = allDays.find((d) => d.status === "today") ?? allDays.find((d) => d.status !== "done") ?? (allDone && state.nextProgram ? undefined : allDays[0]);

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
          {canBuild ? (
            <>
              <InfoBanner icon="ph-hourglass">Nothing built yet — start your own program from scratch, or clone one of {state.program.coachName}'s templates.</InfoBanner>
              <button className="btn btn-primary btn-block" style={{ height: 46 }} onClick={() => nav("/build")}>
                <i className="ph ph-plus-circle" style={{ fontSize: 15 }} />
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
