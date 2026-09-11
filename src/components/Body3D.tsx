import React from "react";
import { PARTS, pick, labelFor, ellipsesOf, type Part } from "./bodyModel";
import { FRAME_COUNT } from "./bodyJoints";

/** The body, turned with your finger.
 *
 * What you see is a real human model rendered from FRAME_COUNT angles (scripts/bake-body.mjs), flipped
 * through as you drag. What you tap is the capsule model in bodyModel.ts, built from that model's joints and
 * projected through the same camera, so the two agree. The chosen part is tinted onto the picture itself,
 * clipped to the body's own pixels, so the colour lies on the skin.
 *
 * Until the pictures have loaded the capsules are drawn instead, so the panel is never empty and a tap
 * already works.
 */

const TAU = Math.PI * 2;
// The window the pictures were rendered for, in body units -- the same numbers as bodyModel.project.
const VIEW_W = 108;
const VIEW_H = 178;

// Loaded once per page and shared, so leaving the joint question and coming back does not fetch them again.
let frames: HTMLImageElement[] | null = null;
function loadFrames(onLoad: () => void): void {
  if (!frames) {
    frames = Array.from({ length: FRAME_COUNT }, (_, i) => {
      const img = new Image();
      img.decoding = "async";
      img.src = `${import.meta.env.BASE_URL}body/frame-${String(i).padStart(2, "0")}.webp`;
      return img;
    });
  }
  for (const img of frames) if (!img.complete) img.addEventListener("load", onLoad, { once: true });
}

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

    const unit = Math.min(w / VIEW_W, h / VIEW_H);
    const turn = ((yaw.current % TAU) + TAU) % TAU;
    const index = Math.round((turn / TAU) * FRAME_COUNT) % FRAME_COUNT;
    const img = frames?.[index];

    if (img && img.complete && img.naturalWidth > 0) {
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, w / 2 - (VIEW_W / 2) * unit, h / 2 - (VIEW_H / 2) * unit, VIEW_W * unit, VIEW_H * unit);
      const marked = PARTS.filter((p) => p.id === selectedId || p.id === openId);
      if (marked.length) {
        ctx.save();
        // source-atop paints only where the body already is, so the tint follows the body's real outline
        // instead of hanging off it as a capsule-shaped blob.
        ctx.globalCompositeOperation = "source-atop";
        for (const part of marked) {
          const isSel = part.id === selectedId;
          ctx.globalAlpha = isSel ? 0.58 : 0.26;
          ctx.fillStyle = isSel ? selectedColor : "#ffffff";
          for (const e of ellipsesOf(part, yaw.current, w, h)) {
            ctx.beginPath();
            ctx.ellipse(e.x, e.y, Math.max(0.5, e.rx * 0.92), Math.max(0.5, e.ry * 0.92), 0, 0, TAU);
            ctx.fill();
          }
        }
        ctx.restore();
      }
      return;
    }

    // Still loading. Every ellipse from every part, then one sort, so an arm can pass in front of the torso
    // from one angle and behind it from another.
    const blobs = PARTS.flatMap((part) => ellipsesOf(part, yaw.current, w, h).map((e) => ({ ...e, part })));
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
      ctx.ellipse(bl.x, bl.y, Math.max(0.5, bl.rx), Math.max(0.5, bl.ry), 0, 0, TAU);
      ctx.fill();
    }
  }, [selectedId, selectedColor, openId]);

  // The load listeners outlive any one render, so they redraw through a ref that always holds the latest
  // draw -- otherwise a picture arriving after a tap would repaint with the selection from before it.
  const drawRef = React.useRef(draw);
  React.useEffect(() => {
    drawRef.current = draw;
    draw();
    const ro = new ResizeObserver(() => drawRef.current());
    if (canvas.current) ro.observe(canvas.current);
    return () => ro.disconnect();
  }, [draw]);

  React.useEffect(() => {
    loadFrames(() => drawRef.current());
  }, []);

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

/** Lighten or darken a hex colour by a factor. A selected part is handed a resolved colour by the caller,
 * since a CSS variable cannot be multiplied. */
function shade(c: string, f: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(c);
  if (!m) return c;
  const n = parseInt(m[1], 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v * f))));
  return `rgb(${ch[0]}, ${ch[1]}, ${ch[2]})`;
}
