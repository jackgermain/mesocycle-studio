import React from "react";

/** A tappable body silhouette for reporting where pain is.
 *
 * Why this exists alongside the text box: a typed location arrives as prose ("front of my shoulder-ish, on
 * the right I think"), which reads fine once and is useless in aggregate -- the coach can't see that it's
 * the third right-shoulder report this month because none of the three are spelled the same. Tapping a
 * region produces one canonical label, so recurrence actually matches.
 *
 * Left/right are labelled from the *lifter's* point of view, which means they flip between views: on the
 * front, the shape on the viewer's left is the lifter's right arm; on the back, you're behind them and it's
 * their left. Getting this backwards would send a coach to the wrong shoulder, so the two views carry
 * separate label tables rather than sharing one. */

type Shape =
  // `flip` mirrors the path about the body's centre line at render time. Mirroring by rewriting the
  // coordinates in `d` means parsing path syntax; a transform is exact and can't drift from the original.
  | { kind: "path"; d: string; flip?: boolean }
  | { kind: "ellipse"; cx: number; cy: number; rx: number; ry: number }
  // Limbs are drawn as thick round-capped strokes rather than outlined shapes: a stroke gives a clean
  // tapered joint where two segments meet, which hand-authored outlines around a knee do not.
  | { kind: "limb"; x1: number; y1: number; x2: number; y2: number; w: number };

type Region = { id: string; label: string; shapes: Shape[] };

const mirror = (s: Shape): Shape => {
  if (s.kind === "ellipse") return { ...s, cx: 220 - s.cx };
  if (s.kind === "limb") return { ...s, x1: 220 - s.x1, x2: 220 - s.x2 };
  // Paths used to fall through here unchanged, which meant the one path-shaped region that gets mirrored
  // -- the hip/glute -- drew both halves on top of each other on the left, and the right side of the body
  // was simply missing on both views.
  return { ...s, flip: !s.flip };
};

// ——— shared skeleton ————————————————————————————————————————————————————
// One set of geometry drives both views; only the labels differ. Anything side-specific is authored on the
// viewer's left and mirrored, so the two halves can never drift apart.

const HEAD: Shape[] = [{ kind: "ellipse", cx: 110, cy: 34, rx: 21, ry: 26 }];
const NECK: Shape[] = [{ kind: "path", d: "M99,52 L121,52 L123,72 L97,72 Z" }];
const DELT_L: Shape[] = [{ kind: "ellipse", cx: 68, cy: 94, rx: 19, ry: 20 }];
const UPPER_TORSO: Shape[] = [{
  kind: "path",
  d: "M73,84 C81,72 93,66 110,66 C127,66 139,72 147,84 C152,102 152,124 149,142 L71,142 C68,124 68,102 73,84 Z",
}];
const MID_TORSO: Shape[] = [{ kind: "path", d: "M71,145 L149,145 C147,164 143,182 140,200 L80,200 C77,182 73,164 71,145 Z" }];
const PELVIS_L: Shape[] = [{ kind: "path", d: "M110,202 L80,202 C72,213 69,233 77,255 L110,255 Z" }];
const UPPER_ARM_L: Shape[] = [{ kind: "limb", x1: 60, y1: 106, x2: 50, y2: 156, w: 23 }];
const ELBOW_L: Shape[] = [{ kind: "ellipse", cx: 48, cy: 169, rx: 12, ry: 12 }];
const FOREARM_L: Shape[] = [{ kind: "limb", x1: 46, y1: 182, x2: 39, y2: 231, w: 19 }];
const HAND_L: Shape[] = [{ kind: "ellipse", cx: 36, cy: 250, rx: 11, ry: 15 }];
const THIGH_L: Shape[] = [{ kind: "limb", x1: 92, y1: 258, x2: 88, y2: 316, w: 33 }];
const KNEE_L: Shape[] = [{ kind: "ellipse", cx: 86, cy: 331, rx: 16, ry: 13 }];
const SHIN_L: Shape[] = [{ kind: "limb", x1: 85, y1: 346, x2: 82, y2: 402, w: 23 }];
const FOOT_L: Shape[] = [{ kind: "ellipse", cx: 80, cy: 419, rx: 12, ry: 13 }];

const M = (s: Shape[]) => s.map(mirror);

/** Reflects about x = 110, the body's centre line. */
const FLIP = "translate(220,0) scale(-1,1)";

/** Front view. Viewer's left is the lifter's right. */
const FRONT: Region[] = [
  { id: "chest", label: "Chest", shapes: UPPER_TORSO },
  { id: "abs", label: "Abs", shapes: MID_TORSO },
  { id: "r-hip", label: "R hip", shapes: PELVIS_L },
  { id: "l-hip", label: "L hip", shapes: M(PELVIS_L) },
  { id: "head", label: "Head / neck", shapes: [...HEAD, ...NECK] },
  { id: "r-shoulder", label: "R shoulder", shapes: DELT_L },
  { id: "l-shoulder", label: "L shoulder", shapes: M(DELT_L) },
  { id: "r-biceps", label: "R biceps", shapes: UPPER_ARM_L },
  { id: "l-biceps", label: "L biceps", shapes: M(UPPER_ARM_L) },
  { id: "r-elbow", label: "R elbow", shapes: ELBOW_L },
  { id: "l-elbow", label: "L elbow", shapes: M(ELBOW_L) },
  { id: "r-forearm", label: "R forearm", shapes: FOREARM_L },
  { id: "l-forearm", label: "L forearm", shapes: M(FOREARM_L) },
  { id: "r-wrist", label: "R wrist / hand", shapes: HAND_L },
  { id: "l-wrist", label: "L wrist / hand", shapes: M(HAND_L) },
  { id: "r-quad", label: "R quad", shapes: THIGH_L },
  { id: "l-quad", label: "L quad", shapes: M(THIGH_L) },
  { id: "r-knee", label: "R knee", shapes: KNEE_L },
  { id: "l-knee", label: "L knee", shapes: M(KNEE_L) },
  { id: "r-shin", label: "R shin", shapes: SHIN_L },
  { id: "l-shin", label: "L shin", shapes: M(SHIN_L) },
  { id: "r-ankle", label: "R ankle / foot", shapes: FOOT_L },
  { id: "l-ankle", label: "L ankle / foot", shapes: M(FOOT_L) },
];

/** Back view. You're behind them now, so the viewer's left is the lifter's LEFT. */
const BACK: Region[] = [
  { id: "upper-back", label: "Upper back", shapes: UPPER_TORSO },
  { id: "lower-back", label: "Lower back", shapes: MID_TORSO },
  { id: "l-glute", label: "L glute", shapes: PELVIS_L },
  { id: "r-glute", label: "R glute", shapes: M(PELVIS_L) },
  { id: "head", label: "Head / neck", shapes: [...HEAD, ...NECK] },
  { id: "l-shoulder", label: "L rear delt", shapes: DELT_L },
  { id: "r-shoulder", label: "R rear delt", shapes: M(DELT_L) },
  { id: "l-triceps", label: "L triceps", shapes: UPPER_ARM_L },
  { id: "r-triceps", label: "R triceps", shapes: M(UPPER_ARM_L) },
  { id: "l-elbow", label: "L elbow", shapes: ELBOW_L },
  { id: "r-elbow", label: "R elbow", shapes: M(ELBOW_L) },
  { id: "l-forearm", label: "L forearm", shapes: FOREARM_L },
  { id: "r-forearm", label: "R forearm", shapes: M(FOREARM_L) },
  { id: "l-wrist", label: "L wrist / hand", shapes: HAND_L },
  { id: "r-wrist", label: "R wrist / hand", shapes: M(HAND_L) },
  { id: "l-hamstring", label: "L hamstring", shapes: THIGH_L },
  { id: "r-hamstring", label: "R hamstring", shapes: M(THIGH_L) },
  { id: "l-knee", label: "L knee", shapes: KNEE_L },
  { id: "r-knee", label: "R knee", shapes: M(KNEE_L) },
  { id: "l-calf", label: "L calf", shapes: SHIN_L },
  { id: "r-calf", label: "R calf", shapes: M(SHIN_L) },
  { id: "l-ankle", label: "L ankle / heel", shapes: FOOT_L },
  { id: "r-ankle", label: "R ankle / heel", shapes: M(FOOT_L) },
];

/** What kind of tissue it feels like. Four options because a coach's first question after "where" is
 * always "what does it feel like" -- muscle pain and joint-line pain lead to opposite decisions, and a
 * report without it is a report they have to chase. "Not sure" is deliberately one of the four: forcing a
 * guess between three confident answers produces confident wrong data, which is worse than a shrug.
 *
 * The colours run least- to most-concerning so a coach can read a report at a glance without the legend. */
export type Tissue = "Muscle belly" | "Tendon" | "Deep in the joint" | "Not sure";

export const TISSUES: { id: Tissue; color: string }[] = [
  { id: "Muscle belly", color: "var(--color-accent)" },
  { id: "Tendon", color: "var(--color-warning)" },
  { id: "Deep in the joint", color: "var(--color-danger)" },
  { id: "Not sure", color: "var(--color-neutral-500)" },
];

const tissueColor = (t: string) => TISSUES.find((x) => x.id === t)?.color ?? "var(--color-accent)";

/** Every label either view can produce, so callers can tell a tapped region from free text. */
export const BODY_MAP_LABELS: string[] = Array.from(
  new Set([...FRONT, ...BACK].map((r) => r.label)),
);

/** Where the bubble's pointer goes: the middle of the region, in viewBox units. */
function centre(r: Region): { x: number; y: number } {
  const pts = r.shapes.map((s) => {
    if (s.kind === "ellipse") return { x: s.cx, y: s.cy, w: s.rx * s.ry };
    if (s.kind === "limb") return { x: (s.x1 + s.x2) / 2, y: (s.y1 + s.y2) / 2, w: s.w * Math.hypot(s.x2 - s.x1, s.y2 - s.y1) };
    const nums = (s.d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
    const xs = nums.filter((_, i) => i % 2 === 0);
    const ys = nums.filter((_, i) => i % 2 === 1);
    const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
    const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
    // A flipped path draws on the other side of the centre line, so its anchor has to move with it.
    return { x: s.flip ? 220 - cx : cx, y: cy, w: 3000 };
  });
  const total = pts.reduce((n, p) => n + p.w, 0) || 1;
  return {
    x: pts.reduce((n, p) => n + p.x * p.w, 0) / total,
    y: pts.reduce((n, p) => n + p.y * p.w, 0) / total,
  };
}

function ShapeEls({ shapes, fill, outline }: { shapes: Shape[]; fill: string; outline: boolean }) {
  // The outline pass is the same geometry drawn slightly fatter in the page colour underneath the fill.
  // It's what separates neighbouring parts, so the silhouette reads as segments rather than one blob.
  const grow = outline ? 2 : 0;
  return (
    <>
      {shapes.map((s, i) => {
        if (s.kind === "ellipse") {
          return <ellipse key={i} cx={s.cx} cy={s.cy} rx={s.rx + grow} ry={s.ry + grow} fill={outline ? "var(--color-bg)" : fill} />;
        }
        if (s.kind === "limb") {
          return (
            <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
              stroke={outline ? "var(--color-bg)" : fill}
              strokeWidth={s.w + grow * 2} strokeLinecap="round" />
          );
        }
        return <path key={i} d={s.d} transform={s.flip ? FLIP : undefined} fill={outline ? "var(--color-bg)" : fill}
          stroke={outline ? "var(--color-bg)" : undefined} strokeWidth={grow * 2} strokeLinejoin="round" />;
      })}
    </>
  );
}

/** Invisible, deliberately oversized copies of the geometry that catch the taps.
 *
 * Two bodies side by side on a phone put a deltoid at roughly 26px across and a wrist at less than 20 --
 * both under the 44px everyone targets for a finger. Growing the *visible* shapes to fix that would turn
 * the silhouette into a blob, so the hit areas are grown instead and left transparent. */
function HitShapes({ shapes }: { shapes: Shape[] }) {
  const pad = 5;
  return (
    <>
      {shapes.map((s, i) => {
        if (s.kind === "ellipse") return <ellipse key={i} cx={s.cx} cy={s.cy} rx={s.rx + pad} ry={s.ry + pad} fill="transparent" />;
        if (s.kind === "limb") {
          return <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke="transparent" strokeWidth={s.w + pad * 2} strokeLinecap="round" />;
        }
        // A path can't be offset outwards cheaply, so it gets a fat transparent stroke on top of its fill,
        // which comes to the same thing.
        return <path key={i} d={s.d} transform={s.flip ? FLIP : undefined} fill="transparent" stroke="transparent" strokeWidth={pad * 2} strokeLinejoin="round" />;
      })}
    </>
  );
}

/** Roughly how much of the body a region covers, used only to decide which hit area sits on top. Small
 * parts have to win: an elbow overlapped by an upper arm's padded hit area is otherwise untappable.
 *
 * Paths are measured by the bounding box of their coordinates. A flat constant was tried first and got the
 * order wrong -- it made head-plus-neck score higher than the whole chest, so the chest's padded hit area
 * was drawn last and swallowed taps on the neck. */
function footprint(r: Region): number {
  return r.shapes.reduce((n, s) => {
    if (s.kind === "ellipse") return n + s.rx * s.ry;
    if (s.kind === "limb") return n + s.w * Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
    const nums = (s.d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
    const xs = nums.filter((_, i) => i % 2 === 0);
    const ys = nums.filter((_, i) => i % 2 === 1);
    if (!xs.length || !ys.length) return n;
    return n + (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
  }, 0);
}

const VIEWS: { regions: Region[]; caption: string }[] = [
  { regions: FRONT, caption: "Front" },
  { regions: BACK, caption: "Back" },
];

export function BodyMap({
  location, tissue, onPick,
}: {
  location: string;
  tissue: string;
  onPick: (location: string, tissue: Tissue | "") => void;
}) {
  // Which region's bubble is open. Separate from `location`, because tapping a part only asks the
  // follow-up question -- nothing is recorded until they answer it, so a stray tap records nothing.
  const [open, setOpen] = React.useState<{ col: number; id: string } | null>(null);

  const openRegion = open ? VIEWS[open.col].regions.find((r) => r.id === open.id) ?? null : null;
  const anchor = openRegion ? centre(openRegion) : null;

  return (
    <div>
      <div className="cell" style={{ display: "flex", gap: 4, position: "relative" }}>
        {VIEWS.map((v, col) => (
          <BodyView
            key={v.caption}
            regions={v.regions}
            caption={v.caption}
            location={location}
            tissue={tissue}
            openId={open?.col === col ? open.id : null}
            onTapRegion={(id) => setOpen(open?.col === col && open.id === id ? null : { col, id })}
          />
        ))}

        {openRegion && anchor && (
          <TissueBubble
            label={openRegion.label}
            current={location === openRegion.label ? tissue : ""}
            // Two equal columns, so a point's horizontal place on the card is its place within its own
            // body, halved, plus half a card for the back view.
            xPct={open!.col * 50 + (anchor.x / 220) * 50}
            yPct={(anchor.y / 445) * 100}
            onChoose={(t) => {
              onPick(t ? openRegion.label : "", t);
              setOpen(null);
            }}
            onDismiss={() => setOpen(null)}
          />
        )}
      </div>

      <div className="mu" style={{ marginTop: 8, textAlign: "center" }}>
        {location
          ? `${location} — ${tissue.toLowerCase()}`
          : "Tap where it hurts. Left and right are yours, not the picture's."}
      </div>
    </div>
  );
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
        <div className="scr" style={{ marginBottom: 8, color: "var(--color-text-muted)" }}>{label} — what does it feel like?</div>
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
        {current && <div className="mu" style={{ marginTop: 7 }}>Tap the marked one again to clear it.</div>}
      </div>
    </>
  );
}

function BodyView({
  regions, caption, location, tissue, openId, onTapRegion,
}: {
  regions: Region[];
  caption: string;
  location: string;
  tissue: string;
  openId: string | null;
  onTapRegion: (id: string) => void;
}) {
  const selected = regions.find((r) => r.label === location);
  // The highlighted part is drawn last so it lands on top. Without this a tapped deltoid comes out as a
  // crescent peeking from behind the chest, which reads as a rendering fault rather than a selection.
  const ordered = selected ? [...regions.filter((r) => r !== selected), selected] : regions;
  // Biggest hit areas first so the smallest end up on top and win the tap.
  const hitOrder = [...regions].sort((a, b) => footprint(b) - footprint(a));
  const fillFor = (r: Region) =>
    r.label === location ? tissueColor(tissue)
    : r.id === openId ? "var(--color-neutral-700)"
    : "var(--color-surface-raised)";

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <svg
        viewBox="0 0 220 445"
        style={{ width: "100%", height: "auto", display: "block", touchAction: "manipulation" }}
        role="group"
        aria-label={`Body map, ${caption.toLowerCase()} view`}
      >
        {/* Outlines first, all of them, then every fill on top. Interleaving the two per region would let
            a later region's outline eat into the neighbour drawn before it. */}
        {ordered.map((r) => <ShapeEls key={`o-${r.id}`} shapes={r.shapes} fill="" outline />)}
        {ordered.map((r) => <ShapeEls key={r.id} shapes={r.shapes} fill={fillFor(r)} outline={false} />)}
        {hitOrder.map((r) => (
          <g
            key={`h-${r.id}`}
            onClick={() => onTapRegion(r.id)}
            style={{ cursor: "pointer" }}
            role="button"
            aria-pressed={r.label === location}
            aria-label={r.label}
          >
            <HitShapes shapes={r.shapes} />
          </g>
        ))}
      </svg>
      <div className="scr" style={{ textAlign: "center", marginTop: 2 }}>{caption}</div>
    </div>
  );
}
