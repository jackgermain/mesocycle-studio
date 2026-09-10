/** A humanoid as 3D geometry, and the maths to draw and pick it. No WebGL and no library.
 *
 * The figure is a set of capsules and spheres in body space — x right, y down, z forward — projected
 * through a perspective camera onto a 2D canvas. A capsule is painted as a run of shaded ellipses along
 * its axis, which is the cheap way to get a rounded limb that still reads as solid from any angle.
 *
 * Why not three.js: it is ~600KB into a bundle with no code splitting, so every screen in the app would
 * pay for one panel in the feedback flow, and a procedural mannequin needs no mesh loading, no materials
 * and no scene graph. The whole projection is one matrix-free rotate-and-divide.
 *
 * The thing this buys beyond looks: **left and right stop flipping.** A flat front/back pair needs two
 * separate label tables because the viewer's left is the lifter's right from the front and their left
 * from behind. In 3D the label belongs to the part, and the part turns with the body.
 */

export interface Part {
  id: string;
  label: string;
  /** Capsule from a to b. A sphere is a capsule with a === b. */
  a: [number, number, number];
  b: [number, number, number];
  r: number;
  /** Squash across the body's depth, so a torso is a slab and a limb is round. */
  flatten?: number;
}

const P = (id: string, label: string, a: [number, number, number], b: [number, number, number], r: number, flatten = 1): Part =>
  ({ id, label, a, b, r, flatten });

/** Mirror a part to the body's other side. Authored on the lifter's right (negative x on screen when
 * facing you) and mirrored, so the halves can never drift apart. */
const mir = (p: Part, id: string, label: string): Part =>
  ({ ...p, id, label, a: [-p.a[0], p.a[1], p.a[2]], b: [-p.b[0], p.b[1], p.b[2]] });

// Proportions are the classic figure-drawing ones rather than anything measured: about seven and a half
// heads tall, shoulders a shade over two heads wide, hips narrower than shoulders. The first pass had the
// shoulders at ±19 and the arms hanging inside the silhouette, which read as a bowling pin -- a body is
// mostly recognisable from the shoulder-to-waist taper, and there wasn't one.
const R_SHOULDER = P("r-shoulder", "R shoulder", [-24, -50, 0], [-24, -50, 0], 9.5);
const R_BICEPS   = P("r-biceps", "R biceps", [-26, -45, 0], [-29, -25, 1], 6.4);
const R_ELBOW    = P("r-elbow", "R elbow", [-29, -23, 1], [-29, -23, 1], 5.6);
const R_FOREARM  = P("r-forearm", "R forearm", [-30, -21, 1], [-32, -1, 2], 5.2);
const R_WRIST    = P("r-wrist", "R wrist / hand", [-33, 4, 2], [-33, 10, 2], 4.8);
const R_QUAD     = P("r-quad", "R quad", [-11, 14, 0], [-11, 38, 0], 8.6);
const R_KNEE     = P("r-knee", "R knee", [-11, 41, 0], [-11, 41, 0], 7);
const R_SHIN     = P("r-shin", "R shin", [-11, 44, 0], [-10, 66, 1], 5.8);
const R_ANKLE    = P("r-ankle", "R ankle / foot", [-10, 69, 1], [-10, 73, -5], 5.2);
const R_HIP      = P("r-hip", "R hip", [-10, 7, 0], [-10, 13, 0], 9.5, 0.8);

/** Front and back are the same solid, so a torso part carries both names and the caller decides which to
 * show — or rather, does not have to: the label is chosen by which side of the body the camera is on. */
export const PARTS: Part[] = [
  P("head", "Head / neck", [0, -76, 0], [0, -70, 0], 11, 0.9),
  P("neck", "Head / neck", [0, -64, 0], [0, -57, 0], 5.4),
  // Two capsules rather than one, so the torso tapers from shoulders to waist. A single uniform capsule
  // is the difference between a body and a bollard.
  P("chest", "Chest", [0, -52, 0], [0, -40, 0], 18, 0.58),
  P("chest", "Chest", [0, -40, 0], [0, -30, 0], 15.5, 0.58),
  P("abs", "Abs", [0, -30, 0], [0, -18, 0], 13, 0.6),
  P("abs", "Abs", [0, -18, 0], [0, -10, 0], 12, 0.62),
  R_HIP, mir(R_HIP, "l-hip", "L hip"),
  R_SHOULDER, mir(R_SHOULDER, "l-shoulder", "L shoulder"),
  R_BICEPS, mir(R_BICEPS, "l-biceps", "L biceps"),
  R_ELBOW, mir(R_ELBOW, "l-elbow", "L elbow"),
  R_FOREARM, mir(R_FOREARM, "l-forearm", "L forearm"),
  R_WRIST, mir(R_WRIST, "l-wrist", "L wrist / hand"),
  R_QUAD, mir(R_QUAD, "l-quad", "L quad"),
  R_KNEE, mir(R_KNEE, "l-knee", "L knee"),
  R_SHIN, mir(R_SHIN, "l-shin", "L shin"),
  R_ANKLE, mir(R_ANKLE, "l-ankle", "L ankle / foot"),
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

/** Rotate about the body's vertical axis, then divide by depth. `dist` is how far the camera sits back —
 * large enough that the perspective reads as a body rather than a fisheye. */
export function project(
  p: [number, number, number],
  yaw: number,
  w: number,
  h: number,
): Projected {
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  const x = p[0] * cos + p[2] * sin;
  const z = p[2] * cos - p[0] * sin;
  const dist = 340;
  const k = dist / (dist - z);
  // 190 units of body mapped to the shorter of the two axes, with room around it.
  const unit = Math.min(w / 120, h / 190);
  return { x: w / 2 + x * unit * k, y: h / 2 + p[1] * unit * k, scale: unit * k, z };
}

/** Which part a tap landed on: the nearest one whose projected circle contains the point, breaking ties
 * toward whatever is closest to the camera — the thing you can actually see is the thing you meant. */
export function pick(px: number, py: number, yaw: number, w: number, h: number): Part | null {
  let best: { part: Part; z: number } | null = null;
  for (const part of PARTS) {
    // Sample along the capsule so a long limb is hit anywhere down its length, not just at its ends.
    for (let t = 0; t <= 1.0001; t += 0.1) {
      const p: [number, number, number] = [
        part.a[0] + (part.b[0] - part.a[0]) * t,
        part.a[1] + (part.b[1] - part.a[1]) * t,
        part.a[2] + (part.b[2] - part.a[2]) * t,
      ];
      const q = project(p, yaw, w, h);
      // Generous: a finger is wider than a wrist. 1.6x, floored so the smallest parts stay reachable.
      const rad = Math.max(part.r * q.scale * 1.6, 22);
      if ((px - q.x) ** 2 + (py - q.y) ** 2 <= rad * rad) {
        if (!best || q.z > best.z) best = { part, z: q.z };
        break;
      }
    }
  }
  return best?.part ?? null;
}
