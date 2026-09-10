import React from "react";
import { Body3D } from "./Body3D";
import { PARTS, labelFor, type Part } from "./bodyModel";

/** A tappable body silhouette for reporting where pain is.
 *
 * Why this exists alongside the text box: a typed location arrives as prose ("front of my shoulder-ish, on
 * the right I think"), which reads fine once and is useless in aggregate -- the coach can't see that it's
 * the third right-shoulder report this month because none of the three are spelled the same. Tapping a
 * region produces one canonical label, so recurrence actually matches.
 *
 * Left/right are the lifter's, not the picture's. In the flat front/back version that needed two separate
 * label tables, because the viewer's left is the lifter's right from the front and their left from behind
 * -- and getting it backwards sends a coach to the wrong shoulder. The 3D model retires the problem: the
 * label belongs to the part and the part turns with the body. Only the torso still renames itself, since
 * "chest" and "upper back" really are the same solid seen from opposite sides. */

export type Tissue = "Muscle belly" | "Tendon" | "Deep in the joint" | "Not sure";

export const TISSUES: { id: Tissue; color: string }[] = [
  { id: "Muscle belly", color: "var(--color-accent)" },
  { id: "Tendon", color: "var(--color-warning)" },
  { id: "Deep in the joint", color: "var(--color-danger)" },
  { id: "Not sure", color: "var(--color-neutral-500)" },
];


/** Every label either view can produce, so callers can tell a tapped region from free text. */
export const BODY_MAP_LABELS: string[] = Array.from(
  new Set(PARTS.flatMap((p) => [labelFor(p, 0), labelFor(p, Math.PI)])),
);

export function BodyMap({
  location, tissue, onPick,
}: {
  location: string;
  tissue: string;
  onPick: (location: string, tissue: Tissue | "") => void;
}) {
  // Which part's bubble is open. Separate from `location`, because tapping only asks the follow-up
  // question -- nothing is recorded until they answer it, so a stray tap records nothing.
  const [open, setOpen] = React.useState<Part | null>(null);
  // Kept in state only so the caption and the open bubble's label follow the body round; the canvas keeps
  // its own copy and redraws itself without React.
  const [yaw, setYaw] = React.useState(0);

  const openLabel = open ? labelFor(open, yaw) : null;
  // The selected part is whichever one currently carries the recorded label, from this angle.
  const selected = PARTS.find((p) => labelFor(p, yaw) === location) ?? null;

  return (
    <div>
      <div className="cell" style={{ position: "relative", padding: 6, overflow: "hidden" }}>
        <Body3D
          selectedId={selected?.id ?? null}
          selectedColor={resolvedTissueColor(tissue)}
          openId={open?.id ?? null}
          onTap={(part) => setOpen((cur) => (cur?.id === part.id ? null : part))}
          onYaw={setYaw}
        />

        {open && openLabel && (
          <TissueBubble
            label={openLabel}
            current={location === openLabel ? tissue : ""}
            // Anchored to the middle of the card rather than to the part: the body turns under the
            // bubble, and a pointer chasing a moving target reads as a glitch.
            xPct={50}
            yPct={46}
            onChoose={(t) => {
              onPick(t ? openLabel : "", t);
              setOpen(null);
            }}
            onDismiss={() => setOpen(null)}
          />
        )}
      </div>

      <div className="mu" style={{ marginTop: 8, textAlign: "center" }}>
        {location
          ? `${location} — ${tissue.toLowerCase()}`
          : "Drag to turn them round. Tap where it hurts — left and right are theirs, so they match yours."}
      </div>
    </div>
  );
}

/** The canvas cannot multiply a CSS variable, so the tissue colours resolve to literals here. Kept beside
 * TISSUES so the two lists cannot drift. */
function resolvedTissueColor(t: string): string {
  switch (t) {
    case "Tendon": return "#ffb84d";
    case "Deep in the joint": return "#ff6b6b";
    case "Not sure": return "#9397ab";
    default: return "#4ce08f";
  }
}

function TissueBubble({
  label, current, xPct, yPct, onChoose, onDismiss,
}: {
  label: string;
  current: string;
  xPct: number;
  yPct: number;
  onChoose: (t: Tissue | "") => void;
  onDismiss: () => void;
}) {
  // Below the tapped part normally, above it once the part is low enough that a bubble underneath would
  // fall off the card.
  const below = yPct < 55;
  // The pointer tracks the body part, but the bubble itself spans the card -- four options don't fit in
  // the ~155px a single body gets on a phone.
  const caretX = Math.min(94, Math.max(6, xPct));

  return (
    <>
      {/* Catches the tap that dismisses without answering. Sits under the bubble, over everything else. */}
      <div style={{ position: "absolute", inset: 0, zIndex: 1 }} onClick={onDismiss} />
      <div
        style={{
          position: "absolute",
          left: 8,
          right: 8,
          zIndex: 2,
          ...(below ? { top: `calc(${yPct}% + 14px)` } : { bottom: `calc(${100 - yPct}% + 14px)` }),
          background: "var(--color-surface-raised)",
          border: "1px solid var(--color-divider)",
          borderRadius: "var(--radius-md)",
          boxShadow: "var(--shadow-md)",
          padding: 10,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: `${caretX}%`,
            [below ? "top" : "bottom"]: -5,
            width: 9,
            height: 9,
            marginLeft: -4,
            background: "var(--color-surface-raised)",
            borderTop: below ? "1px solid var(--color-divider)" : undefined,
            borderLeft: below ? "1px solid var(--color-divider)" : undefined,
            borderBottom: below ? undefined : "1px solid var(--color-divider)",
            borderRight: below ? undefined : "1px solid var(--color-divider)",
            transform: "rotate(45deg)",
          }}
        />
        <div className="row" style={{ marginBottom: 8, alignItems: "baseline" }}>
          <div className="scr" style={{ flex: 1, color: "var(--color-text-muted)" }}>{label} — what does it feel like?</div>
          {/* "Tap the marked one again" was the only way to undo a choice, and nobody found it: tapping the
              highlighted body part reopens this bubble rather than clearing it, and tapping it a second
              time hits the dismiss layer, so it felt like the mark was stuck. This says it plainly. */}
          {current && (
            <button
              type="button"
              onClick={() => onChoose("")}
              style={{
                flex: "none", background: "none", border: "none", cursor: "pointer", padding: "2px 0 2px 8px",
                color: "var(--color-accent)", fontSize: "var(--text-sm)", fontWeight: 700,
              }}
            >
              Clear
            </button>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {TISSUES.map((t) => {
            const on = current === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onChoose(on ? "" : t.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "9px 10px",
                  borderRadius: "var(--radius-sm)",
                  border: `1px solid ${on ? t.color : "var(--color-divider)"}`,
                  background: on ? "var(--color-surface-sunken)" : "transparent",
                  color: on ? "var(--color-text)" : "var(--color-text-muted)",
                  fontSize: "var(--text-sm)",
                  fontWeight: 600,
                  textAlign: "left",
                  cursor: "pointer",
                  minHeight: 38,
                }}
              >
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: t.color, flex: "none" }} />
                {t.id}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

