/** Who owns their own training progressions.
 *
 * This is read in two places that must agree — the auto-programming switch decides whether to render from
 * it, and ClientLayout decides from it whether finishing a session writes next week or only proposes it. A
 * drift between them is invisible to the build and shows up as either a switch that does nothing or
 * behaviour with no switch. Jack found the first half of that the hard way: "the auto programming button in
 * the train tab, which is actually gone for some reason."
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { ownsTheirProgressions } from "../src/shared/selfDirected.ts";

test("a General account owns its own progressions", () => {
  // The regression that started this: gated coach-only, the switch never rendered on the account Jack
  // actually trains on, and the auto programming he had turned on was unreachable.
  assert.equal(ownsTheirProgressions({ role: "friend" }, false), true);
});

test("a coach training themselves owns theirs, and only while training", () => {
  assert.equal(ownsTheirProgressions({ role: "coach" }, true), true);
  // On the coach side of the app they are reviewing other people's numbers, not producing their own.
  assert.equal(ownsTheirProgressions({ role: "coach" }, false), false);
});

test("a prescribed client does not — their block is their coach's", () => {
  assert.equal(ownsTheirProgressions({ role: "client" }, false), false);
  assert.equal(ownsTheirProgressions({ role: "client" }, true), false, "no flag makes a client self-directed");
});

test("no account owns nothing", () => {
  assert.equal(ownsTheirProgressions(null, true), false);
  assert.equal(ownsTheirProgressions(undefined, false), false);
});
