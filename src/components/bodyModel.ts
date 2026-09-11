/** The body picker's tap areas, and the maths to project and pick them. No WebGL and no library.
 *
 * What you see is not these any more. It is MakeHuman's CC0 base mesh, rendered from every angle by
 * scripts/bake-body.mjs. These capsules are what a tap is tested against, built from that same model's own
 * joint positions (bodyJoints.ts, written by the same script), so a tap on the knee in the picture lands on
 * the knee capsule from every angle. Hand-placed capsules could not line up with a real body.
 *
 * Body space: x toward the viewer's right at yaw 0, y down, z toward the camera. The lifter's right is
 * negative x, so from the front it is on the viewer's left -- a mirror, which is what a person facing you is.
 *
 * The capsules are also drawn flat while the pictures load, and they tint the chosen part on top of the
 * picture once they have.
 */
import { JOINTS as J } from "./bodyJoints";

type V3 = readonly [number, number, number];

export interface Part {
  id: string;
  label: string;
  a: [number, number, number];
  b: [number, number, number];
  /** Radius at `a`, and at `b` when it differs. */
  r: number;
  r2?: number;
  /** Depth relative to width. 1 is round; a torso is a slab, so it is well under. */
  flatten?: number;
}

const mix = (p: V3, q: V3, t: number): [number, number, number] => [
  p[0] + (q[0] - p[0]) * t,
  p[1] + (q[1] - p[1]) * t,
  p[2] + (q[2] - p[2]) * t,
];

const P = (
  id: string, label: string,
  a: [number, number, number], b: [number, number, number],
  r: number, r2?: number, flatten = 1,
): Part => ({ id, label, a, b, r, r2, flatten });

/** One side's limbs, from that side's own joints -- not mirrored, since the model has both. Each part
 * stops short of the joint it meets, and the joint gets its own small capsule, so a tap right on an elbow
 * is the elbow and not the end of the biceps. */
function side(s: "r" | "l"): Part[] {
  const L = s === "r" ? "R" : "L";
  const j = (name: string) => J[`${s}${name}` as keyof typeof J];
  const clavicle = j("Clavicle"), shoulder = j("Shoulder"), elbow = j("Elbow"), wrist = j("Wrist");
  const hip = j("Hip"), knee = j("Knee"), ankle = j("Ankle"), midfoot = j("Midfoot"), toes = j("Toes");
  return [
    P(`${s}-shoulder`, `${L} shoulder`, mix(clavicle, shoulder, 0.6), mix(shoulder, elbow, 0.12), 7.5, 6.5),
    P(`${s}-biceps`, `${L} biceps`, mix(shoulder, elbow, 0.24), mix(shoulder, elbow, 0.86), 6, 4.8),
    P(`${s}-elbow`, `${L} elbow`, mix(shoulder, elbow, 0.94), mix(elbow, wrist, 0.06), 4.6),
    P(`${s}-forearm`, `${L} forearm`, mix(elbow, wrist, 0.16), mix(elbow, wrist, 0.86), 4.6, 3.3),
    P(`${s}-wrist`, `${L} wrist / hand`, mix(elbow, wrist, 0.95), mix(elbow, wrist, 1.35), 3.3, 3.9),
    P(`${s}-hip`, `${L} hip`, mix(J.pelvis, hip, 0.7), mix(hip, knee, 0.08), 8.5, 8, 0.8),
    P(`${s}-quad`, `${L} quad`, mix(hip, knee, 0.18), mix(hip, knee, 0.86), 8, 5.6),
    P(`${s}-knee`, `${L} knee`, mix(hip, knee, 0.94), mix(knee, ankle, 0.06), 5.2),
    P(`${s}-shin`, `${L} shin`, mix(knee, ankle, 0.14), mix(knee, ankle, 0.9), 5, 3.4),
    P(`${s}-ankle`, `${L} ankle / foot`, mix(knee, ankle, 0.97), mix(midfoot, toes, 0.6), 3.3, 3.6),
  ];
}

export const PARTS: Part[] = [
  P("head", "Head / neck", mix(J.head, J.headTop, 0.55), mix(J.neck, J.head, 0.45), 8.6, 7, 0.95),
  P("neck", "Head / neck", mix(J.neck, J.head, 0.25), mix(J.spine1, J.neck, 0.55), 4.6, 5.2),
  P("chest", "Chest", [0, J.rShoulder[1], J.spine1[2] + 1.5], [0, J.spine2[1], J.spine2[2] + 1.5], 15, 14, 0.55),
  P("abs", "Abs", [0, J.spine2[1], J.spine2[2] + 1], [0, J.spine4[1], J.spine4[2] + 1], 13.5, 12.5, 0.6),
  P("abs", "Abs", [0, J.spine4[1], J.spine4[2]], [0, J.pelvis[1], J.pelvis[2]], 12.5, 13.5, 0.65),
  ...side("r"),
  ...side("l"),
];

/** The torso reads as different parts depending on which way round the body is. Everything else keeps one
 * name from every angle, which is the whole point of doing this in 3D. */
const BACK_LABELS: Record<string, string> = { chest: "Upper back", abs: "Lower back", "r-hip": "R glute", "l-hip": "L glute" };

export function labelFor(part: Part, yaw: number): string {
  return facingAway(yaw) ? BACK_LABELS[part.id] ?? part.label : part.label;
}

/** True once the camera has come round past the shoulders. */
export function facingAway(yaw: number): boolean {
  const t = ((yaw % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  return t > Math.PI / 2 && t < (Math.PI * 3) / 2;
}

export interface Projected { x: number; y: number; scale: number; z: number }

/** Rotate about the body's vertical axis, then divide by depth. scripts/bake-body.mjs renders the pictures
 * through a camera built from these same three numbers -- the 108 x 178 window and the 340 distance -- so
 * change them there too, and rebake, or the tap areas slide off the body. */
export function project(p: V3, yaw: number, w: number, h: number): Projected {
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  const x = p[0] * cos + p[2] * sin;
  const z = p[2] * cos - p[0] * sin;
  const dist = 340;
  const k = dist / (dist - z);
  const unit = Math.min(w / 108, h / 178);
  return { x: w / 2 + x * unit * k, y: h / 2 + p[1] * unit * k, scale: unit * k, z };
}

/** Which part a tap landed on.
 *
 * Every part whose projected outline contains the point is a candidate. Of those, only the ones at about
 * the front-most depth compete -- from the side, an arm in front of the torso is what you tapped even if the
 * torso's centre line is nearer the finger -- and among them the nearest centre line wins. Nearest, not
 * front-most, is what makes a tap exactly on an elbow the elbow rather than the end of the forearm.
 * Outlines are generous and floored, because a finger is wider than a wrist. */
export function pick(px: number, py: number, yaw: number, w: number, h: number): Part | null {
  const hits: { part: Part; z: number; score: number }[] = [];
  for (const part of PARTS) {
    let best: { z: number; score: number } | null = null;
    for (let t = 0; t <= 1.0001; t += 0.1) {
      const q = project(mix(part.a, part.b, t), yaw, w, h);
      const r = part.r + ((part.r2 ?? part.r) - part.r) * t;
      const rad = Math.max(r * q.scale * 1.5, 22);
      const score = Math.hypot(px - q.x, py - q.y) / rad;
      if (score <= 1 && (!best || score < best.score)) best = { z: q.z, score };
    }
    if (best) hits.push({ part, ...best });
  }
  if (hits.length === 0) return null;
  const front = Math.max(...hits.map((hit) => hit.z));
  const nearFront = hits.filter((hit) => hit.z >= front - 8);
  return nearFront.reduce((a, b) => (b.score < a.score ? b : a)).part;
}

/** The ellipses a capsule is drawn as, back to front along its axis. Shared by the loading fallback and the
 * tint over the picture. */
export function ellipsesOf(part: Part, yaw: number, w: number, h: number): { x: number; y: number; rx: number; ry: number; z: number }[] {
  const len = Math.hypot(part.b[0] - part.a[0], part.b[1] - part.a[1], part.b[2] - part.a[2]);
  const steps = Math.max(2, Math.ceil(len / 1.2));
  const out: { x: number; y: number; rx: number; ry: number; z: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const q = project(mix(part.a, part.b, t), yaw, w, h);
    const r = (part.r + ((part.r2 ?? part.r) - part.r) * t) * q.scale;
    // `flatten` is how deep the part is relative to how wide, so a chest is a slab: full width head-on,
    // thin from the side.
    const f = part.flatten ?? 1;
    const face = Math.abs(Math.cos(yaw));
    out.push({ x: q.x, y: q.y, rx: r * (f + (1 - f) * face), ry: r, z: q.z });
  }
  return out;
}
