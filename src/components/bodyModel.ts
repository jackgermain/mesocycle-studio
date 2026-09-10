/** A humanoid as 3D geometry, and the maths to draw and pick it. No WebGL and no library.
 *
 * The figure is a set of tapered capsules in body space — x right, y down, z forward — projected through
 * a perspective camera onto a 2D canvas. A capsule is painted as a run of shaded ellipses along its axis,
 * which is the cheap way to get a rounded limb that still reads as solid from any angle.
 *
 * Why not three.js: it is ~600KB into a bundle with no code splitting, so every screen in the app would
 * pay for one panel in the feedback flow, and a procedural figure needs no mesh, no materials and no
 * scene graph. The whole projection is one rotate-and-divide.
 *
 * Two things make it read as a person rather than a stack of balloons:
 *
 * **Limbs taper.** A thigh is thick at the hip and half that at the knee; a forearm narrows to the wrist.
 * Constant-radius tubes are what the Michelin man is made of, and it was the single biggest tell.
 *
 * **Detail lives in 3D and hides itself.** The eyes sit in front of the skull and the spine behind it, so
 * depth sorting reveals a face from the front and a back from behind with no special-casing anywhere —
 * turn the body and the right details occlude on their own.
 */

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
  /** Surface detail — a brow, the spine, a kneecap. Drawn darker and never tappable: they exist to say
   * which way the body is facing, and a tap near one means the part underneath. */
  detail?: boolean;
}

const P = (
  id: string, label: string,
  a: [number, number, number], b: [number, number, number],
  r: number, r2?: number, flatten = 1, detail = false,
): Part => ({ id, label, a, b, r, r2, flatten, detail });

const D = (a: [number, number, number], b: [number, number, number], r: number, r2?: number): Part =>
  P("detail", "", a, b, r, r2, 1, true);

/** Mirror to the body's other side. Authored on the lifter's right and mirrored, so the halves cannot
 * drift apart. */
const mir = (p: Part, id: string, label: string): Part =>
  ({ ...p, id, label, a: [-p.a[0], p.a[1], p.a[2]], b: [-p.b[0], p.b[1], p.b[2]] });

// Roughly seven and a half heads tall, shoulders a shade over two heads wide, waist narrower than both
// shoulders and hips. The taper from shoulder to waist to hip is most of what makes a silhouette human.
const R_SHOULDER = P("r-shoulder", "R shoulder", [-20, -52, 0], [-24, -46, 0], 8.6, 7.4);
const R_BICEPS   = P("r-biceps", "R biceps", [-26, -45, 0], [-29, -26, 1], 7, 5.4);
const R_ELBOW    = P("r-elbow", "R elbow", [-29, -24, 1], [-29, -22, 1], 5.2);
const R_FOREARM  = P("r-forearm", "R forearm", [-29, -21, 1], [-31, -2, 2], 5.4, 3.6);
const R_WRIST    = P("r-wrist", "R wrist / hand", [-31, 1, 2], [-32, 9, 3], 3.4, 4.4);
const R_QUAD     = P("r-quad", "R quad", [-10, 13, 0], [-11, 38, 0], 9, 6);
const R_KNEE     = P("r-knee", "R knee", [-11, 40, 0], [-11, 43, 0], 5.8, 5.4);
const R_SHIN     = P("r-shin", "R shin", [-11, 44, 0], [-10, 66, 1], 5.8, 3.6);
const R_ANKLE    = P("r-ankle", "R ankle / foot", [-10, 68, 0], [-10, 72, -7], 3.4, 4.2);
const R_HIP      = P("r-hip", "R hip", [-7, 4, 0], [-10, 13, 0], 9, 9.5, 0.8);

export const PARTS: Part[] = [
  // Skull: wider at the cranium, narrowing to the jaw, which is what stops a head reading as a ball.
  P("head", "Head / neck", [0, -77, -1], [0, -68, 1], 10, 7.5, 0.92),
  P("neck", "Head / neck", [0, -66, 0], [0, -58, 0], 5.2, 6),
  // Chest to waist to hip, as three tapered sections rather than one tube.
  P("chest", "Chest", [0, -55, 0], [0, -42, 0], 15, 18, 0.52),
  P("chest", "Chest", [0, -42, 0], [0, -31, 0], 18, 14, 0.52),
  P("abs", "Abs", [0, -31, 0], [0, -18, 0], 14, 11.5, 0.56),
  P("abs", "Abs", [0, -18, 0], [0, -8, 0], 11.5, 13, 0.62),
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

  // ——— which way they are facing ———————————————————————————————————————
  // In front of the skull, so they vanish the moment the head turns away. Small: these are cues, not a
  // portrait, and eyes drawn any larger tip the whole figure into a cartoon.
  D([-3.2, -73, 8], [-3.2, -73, 8], 1.2),
  D([3.2, -73, 8], [3.2, -73, 8], 1.2),
  D([0, -69.5, 9], [0, -68.5, 9], 0.9),
  // Collarbones as two short segments angling down from the throat, not one bar across the chest -- a
  // straight line plus a sternum drew a literal letter T on the front of the body.
  D([-1, -54, 8.5], [-10, -51, 7], 1.1, 0.8),
  D([1, -54, 8.5], [10, -51, 7], 1.1, 0.8),
  // Behind the spine, so they only show once you have turned them round. The spine tapers away at the
  // small of the back; the blades are short and angled rather than two vertical slashes.
  D([0, -52, -8.5], [0, -20, -7.5], 1.2, 0.6),
  D([-5, -49, -8.5], [-11, -42, -7], 1.3, 0.7),
  D([5, -49, -8.5], [11, -42, -7], 1.3, 0.7),
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
export function project(p: [number, number, number], yaw: number, w: number, h: number): Projected {
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  const x = p[0] * cos + p[2] * sin;
  const z = p[2] * cos - p[0] * sin;
  const dist = 340;
  const k = dist / (dist - z);
  const unit = Math.min(w / 108, h / 178);
  return { x: w / 2 + x * unit * k, y: h / 2 + p[1] * unit * k, scale: unit * k, z };
}

/** Which part a tap landed on: the nearest one whose projected circle contains the point, breaking ties
 * toward whatever is closest to the camera — the thing you can see is the thing you meant. Details are
 * skipped, so tapping someone's eye selects their head. */
export function pick(px: number, py: number, yaw: number, w: number, h: number): Part | null {
  let best: { part: Part; z: number } | null = null;
  for (const part of PARTS) {
    if (part.detail) continue;
    for (let t = 0; t <= 1.0001; t += 0.1) {
      const p: [number, number, number] = [
        part.a[0] + (part.b[0] - part.a[0]) * t,
        part.a[1] + (part.b[1] - part.a[1]) * t,
        part.a[2] + (part.b[2] - part.a[2]) * t,
      ];
      const q = project(p, yaw, w, h);
      const r = part.r + ((part.r2 ?? part.r) - part.r) * t;
      // Generous: a finger is wider than a wrist. Floored so the smallest parts stay reachable.
      const rad = Math.max(r * q.scale * 1.5, 22);
      if ((px - q.x) ** 2 + (py - q.y) ** 2 <= rad * rad) {
        if (!best || q.z > best.z) best = { part, z: q.z };
        break;
      }
    }
  }
  return best?.part ?? null;
}
