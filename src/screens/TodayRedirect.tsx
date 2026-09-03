import React from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useStore, useProfileId } from "../state/store";
import { TabBar } from "../components/TabBar";
import { InfoBanner } from "../components/UI";
import { canSelfBuildProgram } from "../shared/canBuild";

/** The "Train" tab's landing spot — always today's lift, no overview page in between. */
export default function TodayRedirect() {
  const { state } = useStore();
  const profileId = useProfileId();
  const nav = useNavigate();
  const allDays = state.program.weeks.flatMap((w) => w.days);
  const target = allDays.find((d) => d.status === "today") ?? allDays.find((d) => d.status !== "done") ?? allDays[0];

  if (!target) {
    const canBuild = canSelfBuildProgram(profileId);
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
