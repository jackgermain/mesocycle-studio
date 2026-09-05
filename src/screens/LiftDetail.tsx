import React, { useMemo } from "react";
import { useParams } from "react-router-dom";
import { getLiftHistory, useStore } from "../state/store";
import { BackHeader, InfoBanner } from "../components/UI";

export default function LiftDetail() {
  const { name = "" } = useParams();
  const decoded = decodeURIComponent(name);
  const { state } = useStore();
  const history = useMemo(() => getLiftHistory(state.program, decoded), [state.program, decoded]);
  const logged = history.filter((h) => h.setsLogged > 0);

  return (
    <div className="screen">
      <BackHeader kicker={`${history.length} session${history.length === 1 ? "" : "s"} across the block`} title={decoded} />
      <div className="screen-scroll">
        {logged.length === 0 && (
          <InfoBanner icon="ph-info">Nothing logged for this exercise yet — it'll show up here once you tick a set.</InfoBanner>
        )}

        <div>
          <div className="sh">By week</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {history.map((h, i) => (
              <div key={i} className="cell row">
                <div style={{ width: 40, flex: "none" }}>
                  <div className="scr">wk {h.weekNumber}</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="trunc" style={{ fontSize: 12.5 }}>{h.dayLabel}</div>
                  <div className="mu" style={{ marginTop: 1 }}>
                    {h.setsLogged} of {h.setsPrescribed} sets{h.dayStatus === "today" ? " · today" : ""}
                  </div>
                </div>
                <div style={{ textAlign: "right", flex: "none" }}>
                  <div className="num" style={{ fontWeight: 700, fontSize: 12.5, color: h.setsLogged > 0 ? "var(--color-accent-300)" : "var(--color-neutral-600)" }}>
                    {h.topSet}
                  </div>
                  <div className="mu" style={{ fontSize: 11 }}>top set</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
