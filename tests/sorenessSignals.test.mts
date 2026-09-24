/** What a soreness check sends.
 *
 * The property that matters, because it went wrong silently: EVERY answer is sent. This used to send only
 * "still sore" and "healed early", so an on-time recovery reached nobody. Jack: "those notifications need to
 * be being sent no matter what… it completely breaks our algorithm for training if they don't work."
 *
 * The follow-up question these tests used to carry — "how long did the soreness last?", asked under every
 * healed answer — is gone. Jack: *"There's too much feedback. When I click on fully healed it asks me
 * another button after that, so let's remove that second button altogether. We don't need that on every
 * body part."* One tap per muscle is the whole check now, so a signal's note says the answer and the gap
 * and nothing more.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSorenessSignals } from "../src/shared/sorenessSignals";

const due = (muscle: string, lastTrainedDaysAgo: number) => ({ muscle, lastTrainedDaysAgo });

test("every answered muscle sends exactly one signal, whatever the answer", () => {
  const signals = buildSorenessSignals(
    [due("Biceps", 2), due("Forearms", 2), due("Back", 3)],
    { Biceps: 5, Forearms: 3, Back: 2 },
    "Day 3",
  );
  assert.deepEqual(signals.map((s) => s.muscle), ["Biceps", "Forearms", "Back"]);
  assert.ok(signals.every((s) => s.kind === "soreness" && s.dayLabel === "Day 3"));
});

test("a healed answer is sent — the case that used to reach nobody", () => {
  const [s] = buildSorenessSignals([due("Biceps", 2)], { Biceps: 5 }, null);
  assert.ok(s, "an answer that is not alarming must still produce a signal");
  assert.equal(s.note, "Fully healed, 2 days after training it");
  assert.equal(s.detail, "gapDays=2");
});

test("severity is the real answer, not forced to 5", () => {
  const [s] = buildSorenessSignals([due("Biceps", 4)], { Biceps: 4 }, null);
  assert.equal(s.severity, 4);
});

test("each answer says which it is, in the words the client picked from", () => {
  const signals = buildSorenessSignals(
    [due("Back", 3), due("Chest", 4), due("Quads", 2), due("Glutes", 2)],
    { Back: 2, Chest: 5, Quads: 4, Glutes: 3 },
    null,
  );
  const by = Object.fromEntries(signals.map((s) => [s.muscle, s.note]));
  // Still sore when the muscle comes round again is the one reading that is unambiguous on its own, so it
  // keeps its own wording rather than echoing the label.
  assert.equal(by.Back, "Still sore 3 days after training it");
  assert.equal(by.Chest, "Fully healed, 4 days after training it");
  assert.equal(by.Quads, "No soreness, 2 days after training it");
  assert.equal(by.Glutes, "Slightly sore, 2 days after training it");
});

test("a muscle nobody answered is not sent", () => {
  const signals = buildSorenessSignals([due("Biceps", 2), due("Triceps", 2)], { Biceps: 5 }, null);
  assert.deepEqual(signals.map((s) => s.muscle), ["Biceps"]);
});
