import React from "react";

import { EFFORT_WORDING } from "../shared/signals";

/** Asked once, after the last working set of an exercise, and it has to be answered.
 *
 * Once and not twice: asking on the second-to-last as well doubled the prompts, and on a short day that
 * is more interruptions than sets.
 *
 * No skip. Every other feedback step in this app is required for the same reason -- the answer is what
 * next week's prescription is computed from, and one exercise with no rating is one exercise the engine
 * has to guess at.
 */
export function SetEffortSheet({
  exerciseName,
  onPick,
}: {
  exerciseName: string;
  onPick: (effort: number) => void;
}) {
  return (
    // No dismiss on the backdrop and no skip. The answer is the input next week's progression runs on,
    // and an exercise with no rating leaves the engine guessing at the one number it most needs.
    <div className="sheet-backdrop">
      <div className="sheet">
        <div>
          <div className="scr">{exerciseName}</div>
          <div className="h1" style={{ fontSize: 20, marginTop: 3 }}>How hard was that set?</div>
          <div className="mu" style={{ marginTop: 4, lineHeight: 1.55 }}>
            Last set done. This sets next week's numbers — pick one to carry on.
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

      </div>
    </div>
  );
}
