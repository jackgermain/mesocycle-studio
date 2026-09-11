/** The body picker. What you see is a rendered model and what you tap is a set of capsules built from that
 * model's joints -- these pin that the two agree, from the front and from behind, because a tap that lands
 * on the wrong side sends a coach to the wrong knee. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { PARTS, pick, project, labelFor } from "../src/components/bodyModel.ts";
import { JOINTS } from "../src/components/bodyJoints.ts";

// A phone-width card at the panel's fixed height.
const W = 324;
const H = 380;

test("every tap area sits inside the window the pictures were rendered for, from every side", () => {
  const w = 108 * 4;
  const h = 178 * 4;
  for (const yaw of [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]) {
    for (const part of PARTS) {
      for (const end of [part.a, part.b]) {
        const q = project(end, yaw, w, h);
        assert.ok(q.x > 0 && q.x < w && q.y > 0 && q.y < h, `${part.id} at yaw ${yaw.toFixed(2)} falls outside the frame`);
      }
    }
  }
});

test("tapping a joint in the picture picks that joint, from the front and from behind", () => {
  const cases = [
    ["rKnee", "r-knee"], ["lKnee", "l-knee"],
    ["rElbow", "r-elbow"], ["lElbow", "l-elbow"],
    ["rShoulder", "r-shoulder"], ["lShoulder", "l-shoulder"],
    ["rWrist", "r-wrist"], ["lAnkle", "l-ankle"],
  ] as const;
  for (const yaw of [0, Math.PI]) {
    for (const [joint, id] of cases) {
      const q = project(JOINTS[joint], yaw, W, H);
      assert.equal(pick(q.x, q.y, yaw, W, H)?.id, id, `${joint} at yaw ${yaw.toFixed(2)}`);
    }
  }
});

test("the lifter's right is on the viewer's left from the front, and on the right from behind", () => {
  assert.ok(project(JOINTS.rShoulder, 0, W, H).x < W / 2);
  assert.ok(project(JOINTS.rShoulder, Math.PI, W, H).x > W / 2);
});

test("the torso renames itself from behind, and a knee does not", () => {
  const chest = PARTS.find((p) => p.id === "chest")!;
  const knee = PARTS.find((p) => p.id === "r-knee")!;
  assert.equal(labelFor(chest, 0), "Chest");
  assert.equal(labelFor(chest, Math.PI), "Upper back");
  assert.equal(labelFor(knee, Math.PI), "R knee");
});

test("a tap on empty space beside the body picks nothing", () => {
  assert.equal(pick(4, 4, 0, W, H), null);
});
