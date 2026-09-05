import React from "react";
import { DOW_LABELS, DOW_NAMES, toggleDow } from "./trainingDays";

/** Which weekdays a program trains on. Used by both builders -- the coach's program editor and the
 * self-directed one -- so a program built either way schedules the same. Selecting is what sets how many
 * sessions a week there are, so the caller is expected to keep its day count in step with the selection
 * (the coach store's SET_TRAINING_DOWS does this in the reducer). */
export function DayOfWeekPicker({ value, onChange }: { value: number[]; onChange: (dows: number[]) => void }) {
  return (
    <div>
      <div className="row" style={{ gap: 5 }}>
        {DOW_LABELS.map((label, dow) => {
          const on = value.includes(dow);
          return (
            <button
              key={dow}
              onClick={() => onChange(toggleDow(value, dow))}
              aria-label={DOW_NAMES[dow]}
              aria-pressed={on}
              style={{
                flex: 1,
                height: 38,
                borderRadius: 9,
                cursor: "pointer",
                fontFamily: "var(--font-heading)",
                fontSize: 12.5,
                border: `1px solid ${on ? "var(--color-accent)" : "var(--color-divider)"}`,
                background: on ? "var(--color-accent-900)" : "transparent",
                color: on ? "var(--color-accent-200)" : "var(--color-neutral-500)",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
      <div className="mu" style={{ marginTop: 6, lineHeight: 1.5 }}>
        {value.length} session{value.length === 1 ? "" : "s"} a week · {value.map((d) => DOW_NAMES[d]).join(", ")}
      </div>
    </div>
  );
}
