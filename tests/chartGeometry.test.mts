/** Where the Progress tab's charts put their marks.
 *
 * Written because that tab shipped WITHOUT EVER BEING RENDERED — the browser was never opened. A chart is
 * the one thing reading code cannot check: an SVG whose arithmetic is right but whose marks land outside
 * the viewBox looks identical in a diff and is simply missing on the phone. These assert the geometry
 * against its own frame, which is the part that can be checked without a screen.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SPARKLINE_BOX, sparklinePoints, sparklinePath, deltaBar, intakeBarHeight, intakeCeiling,
} from "../src/shared/chartGeometry.ts";

const inside = (p: { x: number; y: number }, box = SPARKLINE_BOX) =>
  p.x >= box.pad - 0.01 && p.x <= box.width - box.pad + 0.01 &&
  p.y >= box.pad - 0.01 && p.y <= box.height - box.pad + 0.01;

test("every point lands inside the box, for every shape of series", () => {
  const series = [
    [215, 225, 230],
    [230, 225, 215],
    [100],
    [225, 225, 225],
    [0, 0],
    [1, 1000000],
    [-5, 5],
    Array.from({ length: 40 }, (_, i) => 100 + (i % 7)),
  ];
  for (const values of series) {
    for (const p of sparklinePoints(values)) {
      assert.ok(inside(p), `${JSON.stringify(values)} put a mark at ${JSON.stringify(p)}`);
      assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y), `${JSON.stringify(values)} produced NaN`);
    }
  }
});

test("a flat series sits on the middle line, not at the top or the bottom", () => {
  /* The naive (v - min) / (max - min) is NaN the moment every value is equal — and a lift held at the same
   * weight for three weeks is the common case, not the edge case. Pinning it to an edge instead would read
   * as a maximum or a collapse. */
  const pts = sparklinePoints([225, 225, 225]);
  const middle = (SPARKLINE_BOX.pad + (SPARKLINE_BOX.height - SPARKLINE_BOX.pad)) / 2;
  for (const p of pts) assert.equal(p.y, middle);
});

test("higher values are drawn higher — SVG's y axis runs the other way", () => {
  // Getting this backwards draws a lift that is going up as a line heading down, and nothing about the
  // output looks wrong until someone sees it on a phone.
  const [first, , last] = sparklinePoints([215, 225, 235]);
  assert.ok(last.y < first.y, `rising series should end higher: ${first.y} -> ${last.y}`);

  const falling = sparklinePoints([235, 225, 215]);
  assert.ok(falling[2].y > falling[0].y, "falling series should end lower");
});

test("points march left to right and span the full width", () => {
  const pts = sparklinePoints([1, 2, 3, 4]);
  assert.equal(pts[0].x, SPARKLINE_BOX.pad);
  assert.equal(pts[pts.length - 1].x, SPARKLINE_BOX.width - SPARKLINE_BOX.pad);
  for (let i = 1; i < pts.length; i++) assert.ok(pts[i].x > pts[i - 1].x);
});

test("a single point draws a mark rather than dividing by zero", () => {
  const pts = sparklinePoints([225]);
  assert.equal(pts.length, 1);
  assert.ok(inside(pts[0]));
});

test("an empty series draws nothing at all, and no broken path", () => {
  assert.deepEqual(sparklinePoints([]), []);
  assert.equal(sparklinePath([]), "", "an empty `d` is ignored; 'MNaN,NaN' is a console error");
});

test("the path string is a real SVG path with no NaN in it", () => {
  const d = sparklinePath([215, 225, 230]);
  assert.match(d, /^M[\d.,\- ]+L[\d.,\- L]+$/);
  assert.ok(!d.includes("NaN"), d);
});

test("a delta bar is never invisible, and never taller than its lane", () => {
  // A 0.0 week still has to read as a mark on the line, not as an absence.
  const flat = deltaBar(0, 0.4);
  assert.equal(flat.height, 4);
  assert.equal(flat.direction, "up");

  const biggest = deltaBar(0.4, 0.4);
  assert.equal(biggest.height, 26);

  const down = deltaBar(-0.2, 0.4);
  assert.equal(down.direction, "down");
  assert.ok(down.height > 4 && down.height < 26);
});

test("a delta bar survives a week where nothing changed at all", () => {
  // biggest === 0 is a division by zero waiting to happen, and a block held perfectly flat is the goal.
  const bar = deltaBar(0, 0);
  assert.ok(Number.isFinite(bar.height));
  assert.equal(bar.height, 4);
});

test("the calorie ceiling always leaves the target line on screen", () => {
  // A week of small days must not push the dashed target line off the top of the box.
  const ceiling = intakeCeiling([1200, 1400, 1100], 3200);
  assert.ok(ceiling > 3200, `target must sit below the ceiling, got ${ceiling}`);

  // And a blowout day is drawn at full height rather than overflowing it.
  const big = intakeCeiling([1200, 6000], 3200);
  assert.equal(big, 6000);
  assert.equal(intakeBarHeight(6000, true, big, 54), 54);
});

test("an unlogged day is a stub, not a zero-height nothing", () => {
  assert.equal(intakeBarHeight(0, false, 4160, 54), 3);
  assert.equal(intakeBarHeight(0, true, 4160, 54), 4, "logged but empty still shows the minimum");
});

test("no target set yet does not produce a NaN bar", () => {
  assert.ok(Number.isFinite(intakeBarHeight(2000, true, intakeCeiling([2000], 0), 54)));
  assert.equal(intakeBarHeight(2000, true, 0, 54), 3);
});
