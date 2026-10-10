/** Forward only: what a hand edit may reach, and what is a record of what happened.
 *
 * Jack, asked whether a coach's edit should apply to days already logged: *"forward only."* These pin the
 * rule rather than the screen, because the reducer enforces it independently — a screen that forgets to ask
 * is how this kind of rule gets lost, and this app has already had to hand-repair damage (stray exercises,
 * rewritten exercise order) written by a caller that did not know about a rule living somewhere else.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { dayIsAhead, lockReason, prescriptionIsOpen } from "../src/shared/forwardOnly.ts";

const TODAY = "2026-10-09";

test("a finished session is closed, whatever its date says", () => {
  // The case that matters most: a session logged EARLY, so its date is still in the future.
  assert.equal(prescriptionIsOpen({ status: "done" }, { checked: false }), false);
  assert.equal(dayIsAhead({ status: "done", date: "2026-10-20" }, TODAY), false);
  assert.equal(lockReason({ status: "done", date: "2026-10-20" }, TODAY), "logged");
});

test("a ticked set inside a session still open is history too", () => {
  /* A client three exercises into Monday has real logged sets sitting in a day whose status is still
   * `today`. Checking the day alone would let a coach rewrite what was already performed. */
  assert.equal(prescriptionIsOpen({ status: "today" }, { checked: true }), false);
  assert.equal(prescriptionIsOpen({ status: "today" }, { checked: false }), true);
});

test("today's session is editable — forward only includes today", () => {
  assert.equal(dayIsAhead({ status: "today", date: TODAY }, TODAY), true);
  assert.equal(lockReason({ status: "today", date: TODAY }, TODAY), null);
  assert.equal(prescriptionIsOpen({ status: "today" }, { checked: false }), true);
});

test("a session in the future is editable", () => {
  assert.equal(dayIsAhead({ status: "visible", date: "2026-10-16" }, TODAY), true);
  assert.equal(lockReason({ status: "visible", date: "2026-10-16" }, TODAY), null);
});

test("a missed day in the past is refused, and says 'past' rather than 'logged'", () => {
  // It never happened, so prescribing into it changes nothing anyone will see -- but calling it "logged"
  // would be a lie about why, and a wrong reason on screen reads as a typo rather than as a rule.
  assert.equal(dayIsAhead({ status: "visible", date: "2026-10-02" }, TODAY), false);
  assert.equal(lockReason({ status: "visible", date: "2026-10-02" }, TODAY), "past");
});

test("dates are compared as ISO strings, so month and year boundaries hold", () => {
  // Lexical comparison on yyyy-mm-dd is the whole trick, and it is only correct zero-padded.
  assert.equal(dayIsAhead({ status: "visible", date: "2026-11-01" }, "2026-10-31"), true);
  assert.equal(dayIsAhead({ status: "visible", date: "2026-09-30" }, "2026-10-01"), false);
  assert.equal(dayIsAhead({ status: "visible", date: "2027-01-01" }, "2026-12-31"), true);
  assert.equal(dayIsAhead({ status: "visible", date: "2026-10-09" }, "2026-10-09"), true);
});

test("the reducer's check never consults a date, so it cannot drift with the clock", () => {
  /* prescriptionIsOpen is deliberately date-free: a reducer that read today's date would give a different
   * answer for the same state depending on when it ran, which is untestable and unreproducible. The date
   * half lives in dayIsAhead, where only the screen needs it. */
  const open = { status: "visible" } as const;
  assert.equal(prescriptionIsOpen(open, { checked: false }), true);
  assert.equal(prescriptionIsOpen(open, { checked: true }), false);
});
