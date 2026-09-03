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
        <div style={{ display: "flex", gap: 9 }}>
          <button
            onClick={() => setUnits("lb")}
            style={{
              flex: 1,
              padding: "18px 14px",
              borderRadius: "var(--radius-md)",
              border: `1px solid ${units === "lb" ? "var(--color-accent)" : "var(--color-divider)"}`,
              background: units === "lb" ? "var(--color-accent-900)" : "transparent",
              textAlign: "left",
              cursor: "pointer",
              color: "inherit",
            }}
          >
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span style={{ fontFamily: "var(--font-heading)", fontSize: 24, color: units === "lb" ? "var(--color-accent-100)" : "var(--color-neutral-300)" }}>lb</span>
              {units === "lb" ? (
                <i className="ph-fill ph-check-circle" style={{ fontSize: 18, color: "var(--color-accent)" }} />
              ) : (
                <div style={{ width: 18, height: 18, borderRadius: "50%", border: "1.5px solid var(--color-divider)" }} />
              )}
            </div>
            <div className="mu" style={{ marginTop: 8, lineHeight: 1.5, color: units === "lb" ? "var(--color-accent-300)" : undefined }}>
              Pounds · 5 lb jumps
              <br />
              198.4 lb · 200 lb × 6
            </div>
          </button>
          <button
            onClick={() => setUnits("kg")}
            style={{
              flex: 1,
              padding: "18px 14px",
              borderRadius: "var(--radius-md)",
              border: `1px solid ${units === "kg" ? "var(--color-accent)" : "var(--color-divider)"}`,
              background: units === "kg" ? "var(--color-accent-900)" : "transparent",
              textAlign: "left",
              cursor: "pointer",
              color: "inherit",
            }}
          >
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span style={{ fontFamily: "var(--font-heading)", fontSize: 24, color: units === "kg" ? "var(--color-accent-100)" : "var(--color-neutral-300)" }}>kg</span>
              {units === "kg" ? (
                <i className="ph-fill ph-check-circle" style={{ fontSize: 18, color: "var(--color-accent)" }} />
              ) : (
                <div style={{ width: 18, height: 18, borderRadius: "50%", border: "1.5px solid var(--color-divider)" }} />
              )}
            </div>
            <div className="mu" style={{ marginTop: 8, lineHeight: 1.5, color: units === "kg" ? "var(--color-accent-300)" : undefined }}>
              Kilos · 2.5 kg jumps
              <br />
              90 kg · 90 kg × 6
            </div>
          </button>
        </div>

        <div>
          <div className="sh">Height and bodyweight</div>
          <div className="row" style={{ gap: 8 }}>
            <input className="input" style={{ textAlign: "center" }} value={height} onChange={(e) => setHeight(e.target.value)} />
            <input className="input" style={{ textAlign: "center" }} value={weight} onChange={(e) => setWeight(e.target.value)} />
          </div>
        </div>

        <InfoBanner icon="ph-arrows-left-right">
          {state.program.coachName === state.profile.name
            ? "We convert both ways, so nothing has to be re-entered if you switch units later."
            : `${state.program.coachName} writes programs in kg. We convert both ways, so nothing has to be re-entered.`}
        </InfoBanner>

        <div style={{ marginTop: "auto", paddingBottom: 8 }}>
          <button className="btn btn-primary btn-block" style={{ height: 48 }} onClick={finish}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
