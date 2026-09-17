/** What a soreness check sends.
 *
 * The property that matters, because it went wrong silently: EVERY answer is sent. This used to send only
 * "still sore" and "healed early", so an on-time recovery reached nobody. Jack: "those notifications need to
 * be being sent no matter what… it completely breaks our algorithm for training if they don't work."
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSorenessSignals } from "../src/shared/sorenessSignals";

const due = (muscle: string, lastTrainedDaysAgo: number) => ({ muscle, lastTrainedDaysAgo });

test("every answered muscle sends exactly one signal, whatever the answer", () => {
  const signals = buildSorenessSignals(
    [due("Biceps", 2), due("Forearms", 2), due("Back", 3)],
    { Biceps: 5, Forearms: 3, Back: 2 },
    { Biceps: 1 },
    "Day 3",
  );
  assert.deepEqual(signals.map((s) => s.muscle), ["Biceps", "Forearms", "Back"]);
  assert.ok(signals.every((s) => s.kind === "soreness" && s.dayLabel === "Day 3"));
});

test("an on-time recovery is sent — the case that used to reach nobody", () => {
  // Biceps trained Monday, again Wednesday: a 2-day gap, target recovery day 1, healed on day 1.
  const [s] = buildSorenessSignals([due("Biceps", 2)], { Biceps: 5 }, { Biceps: 1 }, null);
  assert.ok(s, "an on-target answer must produce a signal");
  assert.match(s.note, /on target/);
  assert.equal(s.detail, "recoveredOnDay=1;gapDays=2");
});

test("severity is the real answer, not forced to 5", () => {
  const [s] = buildSorenessSignals([due("Biceps", 4)], { Biceps: 4 }, { Biceps: 1 }, null);
  assert.equal(s.severity, 4);
});

test("still sore, healed early, never sore and a little sore each say which they are", () => {
  const signals = buildSorenessSignals(
    [due("Back", 3), due("Chest", 4), due("Quads", 2), due("Glutes", 2)],
    { Back: 2, Chest: 5, Quads: 5, Glutes: 3 },
    { Chest: 1, Quads: 0 },
    null,
  );
  const by = Object.fromEntries(signals.map((s) => [s.muscle, s.note]));
  assert.equal(by.Back, "Still sore 3 days after training it");
  // 4-day gap, target day 3, healed day 1: early.
  assert.equal(by.Chest, "Healed on day 1 of a 4-day gap — room for another set");
  assert.equal(by.Quads, "Never got sore — room for another set");
  assert.equal(by.Glutes, "Slightly sore, 2 days after training it");
});

test("a muscle nobody answered is not sent", () => {
  const signals = buildSorenessSignals([due("Biceps", 2), due("Triceps", 2)], { Biceps: 5 }, {}, null);
  assert.deepEqual(signals.map((s) => s.muscle), ["Biceps"]);
});
