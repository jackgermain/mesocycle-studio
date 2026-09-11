/** Next week's proposed numbers. These produce weights and reps that a coach approves, so a regression here
 * is silent in exactly the way the rest of tests/ guards against: a jump on a set rated 5, a deload in the
 * wrong week, or a light dumbbell jumping 50% -- all of which still render perfectly. */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  proposeNextWeek, targetEffortFor, proposalsForDay, progressionDueDay, progressionRecipient,
  encodeProgression, decodeProgression, formatSets, type ProposalInput,
} from "../src/shared/progressionProposal.ts";

const base: ProposalInput = {
  name: "Smith Machine Squat", equipment: "barbell", sets: [], targetReps: 10, effort: 3,
  week: 1, totalWeeks: 4, sessionsPerWeek: 4, units: "lb",
};
const sets = (n: number, reps: number, load: number | null) => Array.from({ length: n }, () => ({ reps, load }));

test("the effort curve peaks at 5 in the last training week", () => {
  assert.deepEqual([1, 2, 3, 4].map((w) => targetEffortFor(w, 4)), [3, 3.5, 4.5, 5]);
  assert.deepEqual([1, 2, 3, 4, 5].map((w) => targetEffortFor(w, 5)), [3, 3.5, 4, 4.5, 5]);
});

test("a 5 never adds weight (G62)", () => {
  const p = proposeNextWeek({ ...base, sets: sets(3, 10, 135), effort: 5 });
  assert.equal(p.move, "reps");
  assert.ok(!p.next.includes("140"), p.next);
  assert.ok(p.next.includes("135 lb"), p.next);
});

test("a 1 or 2 moves every set up one step (G62)", () => {
  const p = proposeNextWeek({ ...base, sets: sets(3, 10, 135), effort: 2 });
  assert.equal(p.move, "load");
  assert.equal(p.next, "3 × 10 @ 140 lb");
});

test("a 3 aiming at 4-5 staggers the jump rather than moving every set", () => {
  const p = proposeNextWeek({ ...base, week: 2, sets: sets(3, 10, 135), effort: 3 });
  assert.equal(p.move, "stagger");
  assert.match(p.next, /2 × \d+ @ 140 lb, 1 × 10 @ 135 lb/);
});

test("uneven sets level up before anything jumps again", () => {
  const p = proposeNextWeek({ ...base, week: 2, sets: [{ reps: 8, load: 140 }, { reps: 8, load: 140 }, { reps: 10, load: 135 }], effort: 3 });
  assert.equal(p.move, "level");
  assert.equal(p.next, "2 × 8 @ 140 lb, 1 × 10 @ 140 lb");
});

test("a light dumbbell climbs reps, and only jumps once the top of the range is beaten (G73)", () => {
  const climbing = proposeNextWeek({ ...base, name: "Dumbbell Lateral Raise", equipment: "dumbbell", targetReps: 12, sets: sets(3, 13, 10), effort: 3 });
  assert.equal(climbing.move, "reps");
  assert.ok(climbing.next.includes("10 lb"), climbing.next);

  const beaten = proposeNextWeek({ ...base, name: "Dumbbell Lateral Raise", equipment: "dumbbell", targetReps: 12, sets: sets(3, 16, 10), effort: 3 });
  assert.equal(beaten.move, "load");
  assert.ok(beaten.next.includes("12.5 lb"), beaten.next);
  assert.ok(!beaten.next.includes("15 lb"), "never skips the 12.5s");
});

test("five sessions a week: the week before the last is followed by a deload, not a jump (C7a)", () => {
  const p = proposeNextWeek({ ...base, week: 3, totalWeeks: 4, sessionsPerWeek: 5, sets: sets(4, 10, 135), effort: 2 });
  assert.equal(p.move, "deload");
  assert.equal(p.next, "2 × 10 @ 135 lb");
});

test("four sessions a week has no deload, so week 3 still progresses", () => {
  const p = proposeNextWeek({ ...base, week: 3, totalWeeks: 4, sessionsPerWeek: 4, sets: sets(4, 10, 135), effort: 2 });
  assert.notEqual(p.move, "deload");
});

test("the last week of a block reports where it finished (G65)", () => {
  const p = proposeNextWeek({ ...base, week: 4, totalWeeks: 4, sets: [{ reps: 10, load: 145 }, { reps: 10, load: 135 }], effort: 4 });
  assert.equal(p.move, "finished");
  assert.match(p.why, /10 @ 145 lb at how hard 4/);
});

test("short reps and a missing rating both hold", () => {
  assert.equal(proposeNextWeek({ ...base, sets: sets(3, 7, 135), effort: 3 }).move, "hold");
  assert.equal(proposeNextWeek({ ...base, sets: sets(3, 10, 135), effort: null }).move, "hold");
});

test("bodyweight work progresses on reps only", () => {
  const p = proposeNextWeek({ ...base, name: "Hanging Leg Raise", equipment: "bodyweight", targetReps: 10, sets: sets(3, 10, null), effort: 3 });
  assert.equal(p.move, "reps");
  assert.ok(p.next.includes("BW"), p.next);
});

function day(id: string, date: string, extra: Record<string, unknown> = {}) {
  const set = (i: number, o: Record<string, unknown>) => ({
    id: `${id}-s${i}`, index: i, type: "straight", checked: true, actual: { reps: 10, load: 135 },
    prescribed: { reps: 10, load: 135, effort: { scale: "RIR", value: 2 }, restSec: 90 }, ...o,
  });
  return {
    id, code: "L1", label: "Lower", dow: "Mon", date, status: "done", muscleSummary: "", setCount: 4,
    order: ["e1", "e2"],
    exercises: {
      e1: {
        id: "e1", name: "Smith Machine Squat", muscle: "Quads", metaLine: "", hasVideo: false, equipment: "machine",
        sets: [
          set(0, { isWarmup: true, actual: { reps: 5, load: 95 } }),
          set(1, {}),
          set(2, {}),
          set(3, { removed: { reason: "time" } }),
          set(4, { effort: 4 }),
        ],
      },
      e2: {
        id: "e2", name: "Plank", muscle: "Core", metaLine: "", hasVideo: false, timed: true,
        sets: [set(0, { actual: { reps: 60, load: null }, effort: 3 })],
      },
    },
    feedbackDone: true,
    ...extra,
  };
}

test("a session's proposals use working sets only and the final set's rating, and skip timed work", () => {
  const program = { name: "P", totalWeeks: 4, coachName: "", weeks: [{ number: 2, phase: "accumulation", days: [day("d1", "2026-09-10")] }] };
  const result = proposalsForDay(program as never, "d1", "lb");
  assert.ok(result);
  assert.equal(result.week, 2);
  assert.equal(result.proposals.length, 1, "the plank is timed and left out");
  assert.equal(result.proposals[0].logged, "3 × 10 @ 135 lb", "warm-up and removed sets are not the exercise");
  assert.equal(result.proposals[0].effort, 4);
});

test("only the latest unsent finished session inside the window is due", () => {
  const program = {
    name: "P", totalWeeks: 4, coachName: "", weeks: [{
      number: 1, phase: "accumulation", days: [
        day("old", "2026-09-01"),
        day("sent", "2026-09-10", { progressionSentAt: "2026-09-10T10:00:00Z" }),
        day("recent", "2026-09-09"),
        day("unfinished", "2026-09-10", { feedbackDone: false }),
      ],
    }],
  };
  assert.equal(progressionDueDay(program as never, "2026-09-10"), "recent");
  assert.equal(progressionDueDay(program as never, "2026-09-20"), null, "nothing inside three days");
});

test("proposals go to the coach, or to a coach's own desk, and nowhere else", () => {
  assert.equal(progressionRecipient({ id: "c1", role: "client", coach_id: "k1" }), "k1");
  assert.equal(progressionRecipient({ id: "k1", role: "coach", coach_id: null }), "k1");
  assert.equal(progressionRecipient({ id: "f1", role: "friend", coach_id: null }), null);
});

test("the payload round-trips, and anything else decodes to nothing", () => {
  const p = { dayId: "d1", week: 2, totalWeeks: 4, proposals: [proposeNextWeek({ ...base, sets: sets(3, 10, 135) })] };
  const back = decodeProgression(encodeProgression(p));
  assert.equal(back?.week, 2);
  assert.equal(back?.proposals[0].exercise, "Smith Machine Squat");
  assert.equal(decodeProgression("final set"), null);
  assert.equal(decodeProgression(null), null);
  assert.equal(decodeProgression('{"v":2}'), null);
});

test("sets are written the way a coach says them", () => {
  assert.equal(formatSets([{ reps: 8, load: 140 }, { reps: 8, load: 140 }, { reps: 10, load: 135 }], "lb"), "2 × 8 @ 140 lb, 1 × 10 @ 135 lb");
});
