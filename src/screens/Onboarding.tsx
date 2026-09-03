import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../state/store";
import type { Units } from "../data/types";
import { InfoBanner } from "../components/UI";

export default function Onboarding() {
  const { state, dispatch } = useStore();
  const nav = useNavigate();
  const [units, setUnits] = useState<Units>("lb");
  const [height, setHeight] = useState("5' 11\"");
  const [weight, setWeight] = useState("196 lb");

  function finish() {
    dispatch({
      type: "ONBOARD",
      profile: {
        units,
        smallestPlate: "2.5 lb",
        heightLabel: height,
        bodyweight: parseFloat(weight) || 196,
      },
    });
    nav("/block", { replace: true });
  }

  return (
    <div className="screen">
      <div className="hdr" style={{ paddingBottom: 6 }}>
        <div style={{ flex: 1 }}>
          <div className="k">Step 1 of 1 · {state.profile.name}</div>
          <div className="h1">Pounds or kilos?</div>
        </div>
      </div>
      <div className="screen-scroll" style={{ gap: 16 }}>
        <div className="progress-steps">
          <div className="done" />
          <div className="done" />
          <div className="done" />
        </div>
        <p className="mu" style={{ lineHeight: 1.6, fontSize: 12.5 }}>
          Everything you see uses this — loads, plate maths, bodyweight and your history. Change it any time in settings.
        </p>
        <div>
          <div className="sh">Units</div>
          <div className="row" style={{ gap: 9 }}>
            <button
              className={`pill-opt${units === "lb" ? " on" : ""}`}
              onClick={() => setUnits("lb")}
              style={{ position: "relative", height: 76, display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <span style={{ fontFamily: "var(--font-heading)", fontSize: 16, fontWeight: 700 }}>lb</span>
              <span style={{ position: "absolute", top: 10, right: 10, display: "flex" }}>
                {units === "lb" ? (
                  <i className="ph-fill ph-check-circle" style={{ fontSize: 16 }} />
                ) : (
                  <div style={{ width: 16, height: 16, borderRadius: "50%", border: "1.5px solid currentColor", opacity: 0.4 }} />
                )}
              </span>
            </button>
            <button
              className={`pill-opt${units === "kg" ? " on" : ""}`}
              onClick={() => setUnits("kg")}
              style={{ position: "relative", height: 76, display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <span style={{ fontFamily: "var(--font-heading)", fontSize: 16, fontWeight: 700 }}>kg</span>
              <span style={{ position: "absolute", top: 10, right: 10, display: "flex" }}>
                {units === "kg" ? (
                  <i className="ph-fill ph-check-circle" style={{ fontSize: 16 }} />
                ) : (
                  <div style={{ width: 16, height: 16, borderRadius: "50%", border: "1.5px solid currentColor", opacity: 0.4 }} />
                )}
              </span>
            </button>
          </div>
        </div>

        <div>
          <div className="sh">Height &amp; bodyweight</div>
          <div className="row" style={{ gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div className="cell" style={{ padding: "10px 12px" }}>
                <div className="scr" style={{ marginBottom: 4 }}>Height</div>
                <input className="input" style={{ padding: 0, border: "none", background: "none", fontSize: 16, fontFamily: "var(--font-heading)" }} value={height} onChange={(e) => setHeight(e.target.value)} />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div className="cell" style={{ padding: "10px 12px" }}>
                <div className="scr" style={{ marginBottom: 4 }}>Bodyweight</div>
                <input className="input" style={{ padding: 0, border: "none", background: "none", fontSize: 16, fontFamily: "var(--font-heading)" }} value={weight} onChange={(e) => setWeight(e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <InfoBanner icon="ph-arrows-left-right">
          {state.program.coachName === state.profile.name
            ? "We convert both ways, so nothing has to be re-entered if you switch units later."
            : `${state.program.coachName} writes programs in kg. We convert both ways, so nothing has to be re-entered.`}
        </InfoBanner>

        <div style={{ marginTop: "auto", paddingBottom: 8 }}>
          <button className="btn btn-solid btn-block" style={{ height: 50 }} onClick={finish}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
