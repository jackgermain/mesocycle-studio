/** Who feedback is addressed to.
 *
 * The case that mattered: a coach training themselves has no coach above them, so every screen that passed
 * `account.coach_id` straight into `sendSignals` sent their soreness, pump, joint and effort reports
 * nowhere — `sendSignals` returns early when the recipient is null. Migration 0033 lets a coach address any
 * kind to their own desk; this is the rule that decides it, in one place.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { signalRecipient } from "../src/shared/signalRecipient";
import { progressionRecipient } from "../src/shared/progressionProposal";

test("a client's feedback goes to their coach", () => {
  assert.equal(signalRecipient({ id: "c1", role: "client", coach_id: "k1" }), "k1");
});

test("a General account's feedback goes to their coach too", () => {
  assert.equal(signalRecipient({ id: "f1", role: "friend", coach_id: "k1" }), "k1");
});

test("a coach training themselves sends to their own desk", () => {
  // The whole point. This used to be null, and nothing was sent at all.
  assert.equal(signalRecipient({ id: "k1", role: "coach", coach_id: null }), "k1");
});

test("an account with no coach and no coach role sends nowhere", () => {
  // Correct, not a gap: the database would refuse the row, so a no-op is the honest outcome.
  assert.equal(signalRecipient({ id: "f1", role: "friend", coach_id: null }), null);
});

test("progression uses the same rule, so the two can never drift apart", () => {
  for (const a of [
    { id: "c1", role: "client", coach_id: "k1" },
    { id: "k1", role: "coach", coach_id: null },
    { id: "f1", role: "friend", coach_id: null },
  ]) {
    assert.equal(progressionRecipient(a), signalRecipient(a), `${a.role} should resolve the same way`);
  }
});
