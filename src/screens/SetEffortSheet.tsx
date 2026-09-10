import React from "react";

import { EFFORT_WORDING } from "../shared/signals";

/** Asked once, after the last working set of an exercise.
 *
 * Once and not twice: asking on the second-to-last as well doubled the prompts, and on a short day that
 * is more interruptions than sets. A question people tap through is worse than one that is not asked,
 * because a wrong answer feeds the progression rule and a missing one does not.
 */
export function SetEffortSheet({
  exerciseName,
  onPick,
  onSkip,
}: {
  exerciseName: string;
  onPick: (effort: number) => void;
  onSkip: () => void;
}) {
  return (
    <div className="sheet-backdrop" onClick={onSkip}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div>
          <div className="scr">{exerciseName}</div>
          <div className="h1" style={{ fontSize: 20, marginTop: 3 }}>How hard was that set?</div>
          <div className="mu" style={{ marginTop: 4, lineHeight: 1.55 }}>
            Last set done. This sets next week's numbers.
          </div>
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          {EFFORT_WORDING.map((label, i) => {
            const v = i + 1;
            return (
              <button
                key={v}
                className="pill-opt"
                onClick={() => onPick(v)}
                style={{ height: 68, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, flex: 1, minWidth: 0 }}
              >
                <span className="num" style={{ fontSize: 15, fontWeight: 700 }}>{v}</span>
                <span style={{ fontSize: 10, opacity: 0.85, lineHeight: 1.2, textAlign: "center" }}>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Skippable on purpose. A required prompt between every set turns into something people tap
            through without reading, and a wrong answer is worse for the algorithm than no answer. */}
        <button className="btn btn-ghost" style={{ fontSize: 12.5 }} onClick={onSkip}>
          Skip
        </button>
      </div>
    </div>
  );
}
