import { test } from "node:test";
import assert from "node:assert/strict";
import { parseWeekBlockLayoutToDraftDays, rowsToDraftDays, resolveDraftDays } from "../src/coach/csvProgram";
import { buildProgramFromDraft } from "../src/shared/programConvert";

/** The spreadsheet importer had no test at all, which is how it came to be unable to read a single one of
 * this project's own spreadsheets while reporting a problem the user did not have.
 *
 * A friend uploaded a 5-day program and got "Missing required columns: day, exercise, muscle. First row must
 * be a header." Checked against three real files — two client sheets and Jack's own 47-week log — all three
 * produced zero days from the flat parser AND zero days from the grid parser, with the grid parser returning
 * no error at all. That silent failure is why the flat parser's message was the only thing left to show.
 *
 * Fixtures here are cut down from those real files rather than invented. The column spacing is deliberately
 * uneven — one sheet puts its days 4 columns apart with Sets/Reps, another 6 apart with Sets/Reps/Weight/RIR
 * — so nothing here can pass by assuming a fixed block width. */

/** Two days side by side, then a second week block below. Modelled on "Colin Morfit 3x.xlsx". */
const TWO_DAYS: string[][] = [
  [],
  [],
  ["", "D1 (Monday)", "Sets", "Reps", "", "D2 (Wednesday)", "Sets", "Reps"],
  ["", "Lat Pulldown", "2.0", "16,13", "", "2 Arm Dumbbell Row", "3.0", "14,11"],
  ["", "Hack Squat Machine", "3.0", "13,10", "", "Dumbbell Skullcrusher", "3.0", "15,13"],
  ["", "Seated Leg Curls", "2.0", "14,11", "", "", "", ""],
  [],
  // Week two: the same split with different numbers. It must not be appended to week one.
  ["", "D1 (Monday)", "Sets", "Reps", "", "D2 (Wednesday)", "Sets", "Reps"],
  ["", "Lat Pulldown", "3.0", "16,13", "", "2 Arm Dumbbell Row", "3.0", "14,11"],
];

/** Wider blocks with Weight and RIR between the days, and a day that is scheduled but empty in this block —
 * Jack's own sheet carries an empty Friday for nine straight weeks. Modelled on "Bella 4x.xlsx". */
const WIDE_WITH_EMPTY_DAY: string[][] = [
  ["", "D1 (Wednesday)", "Sets", "Reps", "Weight", "RIR", "", "D2 (Friday)", "Sets", "Reps", "Weight", "RIR"],
  ["", "Hip Thrust", "2.0", "12", "185", "2", "", "", "", "", "", ""],
  ["", "RDL", "3.0", "10", "135", "2", "", "", "", "", "", ""],
];

test("reads days laid out side by side, which is what every real sheet here does", () => {
  const r = parseWeekBlockLayoutToDraftDays(TWO_DAYS);
  assert.equal(r.days.length, 2);
  assert.equal(r.days[0].exercises.length, 3);
  assert.equal(r.days[1].exercises.length, 2);
});

test("only the first week block is read", () => {
  // Every week in a block repeats the same split (G116) and the app runs its own progression, so a sheet
  // only has to supply a starting point. Reading further would double every exercise.
  const r = parseWeekBlockLayoutToDraftDays(TWO_DAYS);
  assert.equal(r.days[0].exercises.filter((e) => /pulldown/i.test(e.name)).length, 1);
});

test("the weekday in the heading becomes the training day", () => {
  // A Mon/Wed program that imports onto two consecutive days is a different program (G119, G122).
  const r = parseWeekBlockLayoutToDraftDays(TWO_DAYS);
  assert.deepEqual(r.dows, [0, 2]);
  assert.equal(r.days[0].name, "Monday");
  assert.equal(r.days[1].name, "Wednesday");
});

test("sets and reps survive the shapes real sheets store them in", () => {
  const r = parseWeekBlockLayoutToDraftDays(TWO_DAYS);
  const lat = r.days[0].exercises[0];
  assert.equal(lat.sets, 2, '"2.0" should be 2 sets, not 2.0');
  assert.equal(lat.reps, 16, '"16,13" should seed from the top set');
});

test("muscle is inferred from the name, because this layout has no muscle column", () => {
  const r = parseWeekBlockLayoutToDraftDays(TWO_DAYS);
  for (const day of r.days) {
    for (const ex of day.exercises) {
      assert.ok(ex.muscle.length > 0, `${ex.name} came through with no muscle to book volume against`);
    }
  }
});

test("a day heading with nothing under it is dropped, and dows stays aligned with days", () => {
  // buildProgramFromDraft pairs days and dows by index, so a length mismatch silently shifts every session
  // onto the wrong weekday.
  const r = parseWeekBlockLayoutToDraftDays(WIDE_WITH_EMPTY_DAY);
  assert.equal(r.days.length, 1);
  assert.equal(r.days[0].name, "Wednesday");
  assert.deepEqual(r.dows, [2]);
});

test("wider blocks with Weight and RIR are read by heading, not by fixed column width", () => {
  const r = parseWeekBlockLayoutToDraftDays(WIDE_WITH_EMPTY_DAY);
  const hip = r.days[0].exercises[0];
  assert.equal(hip.sets, 2);
  assert.equal(hip.reps, 12);
  assert.equal(hip.load, 185);
});

test("it does not hijack the tier-code dialect the other grid parser handles", () => {
  // "DAY 1" with T1/T2 tier codes and a SET sub-header belongs to parseGridLayoutToDraftDays. This parser
  // must decline it rather than half-read it, which is why a Sets/Reps heading beside the day is required.
  const tiered = [
    ["", "DAY 1"],
    ["", "Squat", "SET", "REP", "LOAD"],
    ["T1", "Squat", "1", "8", "100"],
  ];
  assert.equal(parseWeekBlockLayoutToDraftDays(tiered).days.length, 0);
});

test("the plain flat format still works", () => {
  const flat = rowsToDraftDays([
    ["Day", "Exercise", "Muscle", "Sets", "Reps", "Load"],
    ["Day 1", "Bench Press", "Chest", "3", "8", "135"],
  ]);
  assert.equal(flat.days.length, 1);
  assert.equal(flat.days[0].exercises[0].sets, 3);
});

test("the regression: a day-block sheet no longer reports a missing header row", () => {
  // This is the exact failure the friend hit. resolveDraftDays used to fall back to the flat parser's error
  // for any unreadable file, because the grid parser failed without saying anything.
  const r = resolveDraftDays(TWO_DAYS);
  assert.equal(r.days.length, 2);
  assert.deepEqual(r.errors, []);
});

test("a genuinely unreadable sheet says what was actually expected", () => {
  const r = resolveDraftDays([["some notes"], ["nothing useful here"]]);
  assert.equal(r.days.length, 0);
  assert.equal(r.errors.length, 1);
  assert.match(r.errors[0], /D1 \(Monday\)/, "the error should describe the layout that actually works");
});

test("end to end: the weekdays in the sheet are the weekdays the program is scheduled on", () => {
  // Reading the chain -- parser to ScratchSeed to buildProgramFromDraft to scheduleWeeks -- says the days
  // carry through. That is not evidence: if any link drops `dows`, a Mon/Wed sheet silently becomes two
  // consecutive days and the imported program is not the one that was uploaded. Asserted on the dates the
  // built program actually holds, not on what was passed in.
  const parsed = resolveDraftDays(TWO_DAYS);
  assert.deepEqual(parsed.dows, [0, 2], "precondition: the sheet named Monday and Wednesday");

  const program = buildProgramFromDraft("Imported", parsed.days, 2, "Jack", parsed.dows);
  const week1 = program.weeks[0];
  assert.equal(week1.days.length, 2);

  // Program dates are absolute, so compare weekday rather than the date itself. getDay() is Sunday-based;
  // this project counts from Monday, which is the same shift dowsFromProgram applies.
  const scheduled = week1.days.map((d) => (new Date(`${d.date}T00:00:00`).getDay() + 6) % 7);
  assert.deepEqual(scheduled, [0, 2], `sessions landed on ${scheduled} instead of Monday and Wednesday`);
});
