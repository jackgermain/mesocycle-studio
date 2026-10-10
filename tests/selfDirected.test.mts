/** Who owns their own training progressions.
 *
 * This is read in two places that must agree — the auto-programming switch decides whether to render from
 * it, and ClientLayout decides from it whether finishing a session writes next week or only proposes it. A
 * drift between them is invisible to the build and shows up as either a switch that does nothing or
 * behaviour with no switch. Jack found the first half of that the hard way: "the auto programming button in
 * the train tab, which is actually gone for some reason."
 *
 * It is now also gated to two accounts. Jack: *"let's remove the buttons for auto programming on weight
 * lifting for now for anyone other than my 2 accounts, Jax and my admin account."* He is coaching the
 * roster by hand, so for everyone else the app proposes and a person decides.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { ownsTheirProgressions, runsAutoProgramming } from "../src/shared/selfDirected.ts";

const JAX = { role: "friend", display_name: "Jax" };
const ADMIN = { role: "coach", display_name: "Jack Germain", is_platform_admin: true };

test("Jax owns their own progressions, switch and behaviour both", () => {
  // The account Jack actually trains on. Gated coach-only once before, which made the switch unreachable
  // on exactly this account.
  assert.equal(runsAutoProgramming(JAX), true);
  assert.equal(ownsTheirProgressions(JAX, false), true);
});

test("the admin account owns theirs, and only while actually training", () => {
  assert.equal(runsAutoProgramming(ADMIN), true);
  assert.equal(ownsTheirProgressions(ADMIN, true), true);
  // On the coach side of the app they are writing other people's numbers, not producing their own.
  assert.equal(ownsTheirProgressions(ADMIN, false), false);
});

test("the display-name match ignores case and surrounding space", () => {
  // It is stored prose, typed by a person. "JAX" and " Jax " are the same account.
  for (const name of ["jax", "JAX", " Jax ", "jAx"]) {
    assert.equal(runsAutoProgramming({ role: "friend", display_name: name }), true, name);
  }
});

test("every OTHER General account is now proposal-only", () => {
  /* The rule this replaced. A General account used to qualify on role alone, which is right in principle —
   * they direct their own training — but Jack is now the one writing the numbers for everyone he coaches,
   * and the algorithm's job is to suggest. */
  assert.equal(runsAutoProgramming({ role: "friend", display_name: "Sam Okafor" }), false);
  assert.equal(ownsTheirProgressions({ role: "friend", display_name: "Sam Okafor" }, false), false);
});

test("another coach training themselves does not get it either", () => {
  // The roles cannot express "my two accounts": his admin account is a `coach` and so is every other coach
  // who signs up. Hence the identity list rather than a role rule.
  assert.equal(ownsTheirProgressions({ role: "coach", display_name: "Other Coach" }, true), false);
});

test("a prescribed client does not — their block is their coach's", () => {
  assert.equal(ownsTheirProgressions({ role: "client", display_name: "Someone" }, false), false);
  assert.equal(ownsTheirProgressions({ role: "client", display_name: "Someone" }, true), false);
  // And the allowlist does not override the role: a client named Jax is still a prescribed client.
  assert.equal(ownsTheirProgressions({ role: "client", display_name: "Jax" }, true), false);
});

test("a missing or blank display name is not a match", () => {
  // The fields are optional on the structural type, and a blank name must not fall through to allowed.
  assert.equal(runsAutoProgramming({ role: "friend" }), false);
  assert.equal(runsAutoProgramming({ role: "friend", display_name: "" }), false);
  assert.equal(runsAutoProgramming({ role: "friend", display_name: "   " }), false);
});

test("no account owns nothing", () => {
  assert.equal(runsAutoProgramming(null), false);
  assert.equal(runsAutoProgramming(undefined), false);
  assert.equal(ownsTheirProgressions(null, true), false);
  assert.equal(ownsTheirProgressions(undefined, false), false);
});
