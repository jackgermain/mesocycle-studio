/** The effort scale's direction, which is the thing that gets read backwards.
 *
 * pump and soreness are bad at the LOW end. joint and effort are bad at the HIGH end. A single helper
 * used against the wrong scale silently reports a great set as a problem, or a client training through
 * pain as fine. */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isEffortAlerting, EFFORT_ALERT_AT, EFFORT_WORDING,
  isPumpAlerting, isSorenessAlerting, isJointAlerting, isJointUrgent,
} from "../src/shared/signalScales.ts";

test("only a 5 alerts on effort", () => {
  for (const v of [1, 2, 3, 4]) assert.equal(isEffortAlerting(v), false, `${v} should not alert`);
  assert.equal(isEffortAlerting(5), true);
  assert.equal(EFFORT_ALERT_AT, 5);
});

test("effort runs the opposite way to pump and soreness", () => {
  // A 1 on effort is an easy set — nothing wrong. A 1 on pump or soreness is the bad end.
  assert.equal(isEffortAlerting(1), false);
  assert.equal(isPumpAlerting(1), true);
  assert.equal(isSorenessAlerting(1), true);
  // And the same way as joint, where high is worse.
  assert.equal(isJointAlerting(4), true);
  assert.equal(isJointUrgent(4), true);
});

test("the scale has exactly five rungs, ending at failure", () => {
  assert.equal(EFFORT_WORDING.length, 5);
  assert.equal(EFFORT_WORDING[0], "Easy");
  assert.equal(EFFORT_WORDING[4], "Nothing left");
});
