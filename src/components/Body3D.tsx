import React from "react";
import { PARTS, project, pick, labelFor, type Part } from "./bodyModel";

/** The body, drawn on a canvas and turned with your finger.
 *
 * Each capsule is painted as a run of shaded ellipses along its axis, back to front. Depth sorting is per
 * ellipse rather than per part, which is what lets an arm pass in front of the torso from one angle and
 * behind it from another without any special cases.
 *
 * Shading is a single light from the upper left. Each ellipse gets a radial gradient offset toward the
 * light, so a limb has a highlight running down its lit side and falls away on the other — that gradient,
 * more than the silhouette, is what makes it read as a solid rather than a sticker.
 */
export function Body3D({
  selectedId,
  selectedColor,
  openId,
  onTap,
  onYaw,
}: {
  selectedId: string | null;
  selectedColor: string;
  openId: string | null;
  onTap: (part: Part) => void;
  onYaw?: (yaw: number) => void;
}) {
  const canvas = React.useRef<HTMLCanvasElement | null>(null);
  const yaw = React.useRef(0);
  const drag = React.useRef<{ x: number; yaw: number; moved: boolean } | null>(null);
  const [, force] = React.useReducer((n: number) => n + 1, 0);

  const draw = React.useCallback(() => {
    const el = canvas.current;
    if (!el) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (el.width !== Math.round(w * dpr)) {
      el.width = Math.round(w * dpr);
      el.height = Math.round(h * dpr);
    }
    const ctx = el.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Every ellipse from every part, then one sort. Sorting parts instead would draw a whole arm in front
    // of or behind the whole torso, and there is no angle where that is right for both ends of it.
    type Blob = { x: number; y: number; rx: number; ry: number; z: number; part: Part };
    const blobs: Blob[] = [];
    for (const part of PARTS) {
      const len = Math.hypot(part.b[0] - part.a[0], part.b[1] - part.a[1], part.b[2] - part.a[2]);
      const steps = Math.max(2, Math.ceil(len / 1.6));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const p: [number, number, number] = [
          part.a[0] + (part.b[0] - part.a[0]) * t,
          part.a[1] + (part.b[1] - part.a[1]) * t,
          part.a[2] + (part.b[2] - part.a[2]) * t,
        ];
        const q = project(p, yaw.current, w, h);
        const rx = part.r * q.scale;
        // `flatten` is how deep the part is relative to how wide, so a chest is a slab: full width
        // head-on, thin from the side. face is 1 looking at the front or back and 0 from the side, so the
        // drawn width runs from the full radius to `flatten` of it as the body turns.
        //
        // This was the other way round at first, which drew the torso narrow head-on and wide in profile
        // -- the figure came out as a plank facing you and a barrel side-on.
        const f = part.flatten ?? 1;
        const face = Math.abs(Math.cos(yaw.current));
        blobs.push({ x: q.x, y: q.y, rx: rx * (f + (1 - f) * face), ry: rx, z: q.z, part });
      }
    }
    blobs.sort((a, b) => a.z - b.z);

    for (const bl of blobs) {
      const isSel = bl.part.id === selectedId;
      const isOpen = bl.part.id === openId;
      const base = isSel ? selectedColor : isOpen ? "#6d7684" : "#2b323a";
      const grad = ctx.createRadialGradient(
        bl.x - bl.rx * 0.45, bl.y - bl.ry * 0.55, bl.rx * 0.12,
        bl.x, bl.y, Math.max(bl.rx, bl.ry) * 1.25,
      );
      grad.addColorStop(0, shade(base, isSel ? 1.32 : 1.55));
      grad.addColorStop(0.55, base);
      grad.addColorStop(1, shade(base, 0.42));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(bl.x, bl.y, Math.max(0.5, bl.rx), Math.max(0.5, bl.ry), 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [selectedId, selectedColor, openId]);

  React.useEffect(() => {
    draw();
    const ro = new ResizeObserver(draw);
    if (canvas.current) ro.observe(canvas.current);
    return () => ro.disconnect();
  }, [draw]);

  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    drag.current = { x: e.clientX, yaw: yaw.current, moved: false };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 4) d.moved = true;
    // A drag across the full width is a bit more than half a turn, which is what makes the body feel
    // attached to the finger rather than geared to it.
    yaw.current = d.yaw + (dx / (e.currentTarget.clientWidth || 320)) * Math.PI * 1.15;
    draw();
    onYaw?.(yaw.current);
  }
  function up(e: React.PointerEvent<HTMLCanvasElement>) {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    if (d.moved) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const hit = pick(e.clientX - rect.left, e.clientY - rect.top, yaw.current, rect.width, rect.height);
    if (hit) onTap(hit);
    force();
  }

  return (
    <canvas
      ref={canvas}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      style={{ width: "100%", height: 380, display: "block", touchAction: "pan-y", cursor: "grab" }}
      aria-label="Body model — drag to turn, tap where it hurts"
      role="img"
    />
  );
}

export { labelFor };

/** Lighten or darken a hex or css colour by a factor. Hex only for the model's own greys; a selected part
 * is handed a resolved colour by the caller, since a CSS variable cannot be multiplied. */
function shade(c: string, f: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(c);
  if (!m) return c;
  const n = parseInt(m[1], 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v * f))));
  return `rgb(${ch[0]}, ${ch[1]}, ${ch[2]})`;
}
