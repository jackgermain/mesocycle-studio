/** The arithmetic behind swipe-to-remove.
 *
 * Untestable from a script as a gesture, but the three decisions inside it are pure and are where it
 * goes wrong in ways you can only feel: a roster that drags sideways while you scroll, a row that opens
 * from a twitch, or one that springs back after a deliberate swipe. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { decideAxis, dragOffset, shouldSnapOpen, ACTION_WIDTH } from "../src/coach/components/swipeMath.ts";

test("small movement commits to no axis at all", () => {
  // Anything else and a stationary finger resting on a row starts dragging it.
  assert.equal(decideAxis(0, 0), "none");
  assert.equal(decideAxis(3, 4), "none");
  assert.equal(decideAxis(-5, 2), "none");
});

test("a scroll down the roster is vertical, even when it drifts sideways", () => {
  assert.equal(decideAxis(6, 40), "v");
  assert.equal(decideAxis(-12, 60), "v");
});

test("a deliberate sideways swipe is horizontal", () => {
  assert.equal(decideAxis(-40, 6), "h");
  assert.equal(decideAxis(-90, 20), "h");
});

test("dragging left tracks the finger, and stops rubber-banding well past the button", () => {
  assert.equal(dragOffset(0, -50), -50);
  assert.ok(dragOffset(0, -400) >= -ACTION_WIDTH * 1.25, "should not be draggable arbitrarily far left");
});

test("dragging right from closed barely moves — there is nothing on that side", () => {
  const moved = dragOffset(0, 60);
  assert.ok(moved > 0 && moved < 20, `expected a heavily damped ${moved}`);
});

test("an already-open row closes by dragging back right", () => {
  assert.equal(dragOffset(-ACTION_WIDTH, ACTION_WIDTH), 0);
});

test("a twitch springs back; a real swipe stays open", () => {
  assert.equal(shouldSnapOpen(-10), false, "a 10px twitch should not open a delete button");
  assert.equal(shouldSnapOpen(-ACTION_WIDTH), true);
  assert.equal(shouldSnapOpen(0), false);
});

test("the snap threshold sits inside the button's own width", () => {
  // If it were past ACTION_WIDTH you could never open it; at 0 every tap would.
  let opensAt = 0;
  for (let px = 0; px <= ACTION_WIDTH; px++) if (shouldSnapOpen(-px)) { opensAt = px; break; }
  assert.ok(opensAt > 5 && opensAt < ACTION_WIDTH, `opens at ${opensAt}px, outside a sane range`);
});
