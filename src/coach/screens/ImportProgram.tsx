import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CloseHeader, InfoBanner } from "../../components/UI";

export default function ImportProgram() {
  const nav = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);

  if (step === 1) {
    return (
      <div className="screen">
        <CloseHeader kicker="Step 1 of 2" title="Import a program" />
        <div className="screen-scroll">
          <p className="mu" style={{ fontSize: 12.5, lineHeight: 1.6, margin: 0 }}>
            Drop in a coach's PDF, a spreadsheet export or phone screenshots. We read it into the builder so it can be edited, tracked and monitored like anything else here.
          </p>
          <div style={{ border: "1px dashed var(--color-accent-700)", borderRadius: "var(--radius-md)", padding: "26px 16px", textAlign: "center", background: "var(--color-accent-900)" }}>
            <i className="ph ph-file-arrow-up" style={{ fontSize: 20, color: "var(--color-accent)" }} />
            <div style={{ fontSize: 14, marginTop: 9, color: "var(--color-accent-100)" }}>Choose files</div>
            <div style={{ fontSize: 11, marginTop: 4, color: "var(--color-accent-300)" }}>PDF, PNG, JPG, CSV · up to 20 pages</div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-secondary" style={{ flex: 1, height: 44, fontSize: 12.5 }}>
              <i className="ph ph-camera" style={{ fontSize: 14 }} />
              Scan pages
            </button>
            <button className="btn btn-secondary" style={{ flex: 1, height: 44, fontSize: 12.5 }}>
              <i className="ph ph-images" style={{ fontSize: 14 }} />
              Photo library
            </button>
          </div>

          <div>
            <div className="sh">Attached · 3 files</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              <FileRow icon="ph-file-pdf" name="PHAT_12week_final.pdf" note="8 pages · read, 96% confident" ok />
              <FileRow icon="ph-image" name="IMG_4471.PNG" note="Week 1 table · read, 88%" ok />
              <FileRow icon="ph-image" name="IMG_4472.PNG" note="Handwritten · 6 rows unclear" ok={false} />
            </div>
          </div>

          <InfoBanner icon="ph-shield-check">Imported programs stay private to you. Republishing someone else's work needs their permission.</InfoBanner>

          <div style={{ marginTop: "auto", paddingBottom: 8 }}>
            <button className="btn btn-primary btn-block" style={{ height: 48 }} onClick={() => setStep(2)}>
              Read 3 files
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <CloseHeader kicker="Step 2 of 2 · 6 rows need you" title="Check the import" onClose={() => setStep(1)} />
      <div className="screen-scroll">
        <div className="cell row" style={{ gap: 8 }}>
          <StatCell label="Weeks" value={12} />
          <StatCell label="Days" value={5} />
          <StatCell label="Exercises" value={41} />
          <StatCell label="Matched" value={35} valueColor="var(--color-accent-300)" />
        </div>

        <InfoBanner icon="ph-magic-wand" tone="accent">
          Sets, reps and rest came through. The source used RPE, so we converted to RIR — check week 1 before publishing.
        </InfoBanner>

        <div>
          <div className="sh">Unresolved rows</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="cell elev-sm">
              <div className="row">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="trunc" style={{ fontSize: 12.5 }}>&ldquo;DB incl press (30&deg;)&rdquo;</div>
                  <div className="mu" style={{ marginTop: 2 }}>p.3 · row 4</div>
                </div>
                <span className="tag tag-outline">Match</span>
              </div>
              <div className="row" style={{ gap: 7, marginTop: 9, flexWrap: "wrap" }}>
                <span className="chip on">Incline Dumbbell Press</span>
                <span className="chip">Incline Machine Press</span>
                <span className="chip">New exercise</span>
              </div>
            </div>
            <div className="cell row">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="trunc" style={{ fontSize: 12.5 }}>&ldquo;Face pulls 100 reps&rdquo;</div>
                <div className="mu" style={{ marginTop: 2 }}>p.6 · no sets given</div>
              </div>
              <span style={{ fontSize: 12.5, color: "var(--color-accent)" }}>Fix</span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: "auto", paddingBottom: 8 }}>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-secondary" style={{ flex: "none", height: 44 }} onClick={() => nav("/coach/programs")}>
              Save draft
            </button>
            <button className="btn btn-primary" style={{ flex: 1, height: 44 }} onClick={() => nav("/coach/programs")}>
              Open in builder
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCell({ label, value, valueColor }: { label: string; value: React.ReactNode; valueColor?: string }) {
  return (
    <div style={{ flex: 1 }}>
      <div className="scr">{label}</div>
      <div className="num" style={{ fontWeight: 700, fontSize: 16, marginTop: 2, color: valueColor }}>{value}</div>
    </div>
  );
}

function FileRow({ icon, name, note, ok }: { icon: string; name: string; note: string; ok: boolean }) {
  return (
    <div className="cell row">
      <div style={{ width: 34, height: 42, flex: "none", borderRadius: 4, background: "var(--color-neutral-900)", border: "1px solid var(--color-neutral-800)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-neutral-500)" }}>
        <i className={`ph ${icon}`} style={{ fontSize: 14 }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="trunc" style={{ fontSize: 12.5 }}>{name}</div>
        <div className="mu" style={{ marginTop: 2 }}>{note}</div>
      </div>
      {ok ? (
        <i className="ph-fill ph-check-circle" style={{ fontSize: 16, color: "var(--color-accent)" }} />
      ) : (
        <i className="ph ph-warning-circle" style={{ fontSize: 16, color: "var(--color-neutral-400)" }} />
      )}
    </div>
  );
}
