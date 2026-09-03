import type { BuilderDay, BuilderExercise, BuilderSet, ClientFlag, CoachClient, CoachProgram, CoachThread } from "./types";
import { defaultRestSec } from "./rest";

export const coachName = "Dana";

function flag(type: ClientFlag["type"], note: string, tagLabel: string, evidence?: string): ClientFlag {
  return { id: `${type}-${Math.random().toString(36).slice(2, 8)}`, type, note, tagLabel, evidence };
}

export const clients: CoachClient[] = [
  {
    id: "marcus",
    name: "Marcus Kell",
    initials: "MK",
    status: "on-track",
    programName: "Hypertrophy 8",
    week: 3,
    totalWeeks: 7,
    adherencePct: 96,
    flags: [flag("volume-proposal", "Back pump 2, healed 5, RIR 3 for three sessions straight — headroom to MRV.", "+2 sets", "Back sits 4 sets under MRV with pump reported low twice.")],
    lastSessionSummary: "Upper A · 17 of 18 sets · pump 4 avg",
    loadHistory: [52, 58, 64, 70, 78, 86, 100],
    recentSessions: [
      { label: "Upper A · Mon", status: "Complete" },
      { label: "Lower A · Tue", status: "Complete" },
      { label: "Upper B · Thu", status: "Partial" },
    ],
  },
  {
    id: "amara",
    name: "Amara Osei",
    initials: "AO",
    status: "at-risk",
    programName: "PPL Intermediate",
    week: 5,
    totalWeeks: 10,
    adherencePct: 71,
    flags: [flag("joint", "R knee 3/4 on hack squat, twice this week.", "Swap", "Reported limited-a-set pain both Tuesday and Friday on the same lift.")],
    lastSessionSummary: "Lower A · knee flagged on set 2",
    loadHistory: [40, 44, 48, 46, 50, 47, 45],
    recentSessions: [
      { label: "Push A · Sun", status: "Complete" },
      { label: "Pull A · Mon", status: "Complete" },
      { label: "Legs A · Wed", status: "Partial" },
    ],
  },
  {
    id: "jonas",
    name: "Jonas Vidal",
    initials: "JV",
    status: "behind",
    programName: "Hypertrophy 8",
    week: 3,
    totalWeeks: 7,
    adherencePct: 58,
    flags: [flag("weigh-in-missed", "No weigh-in since Thursday.", "")],
    lastSessionSummary: "No session logged since Sunday",
    loadHistory: [60, 62, 58, 55, 50, 48, 44],
    recentSessions: [
      { label: "Upper A · Mon", status: "Partial" },
      { label: "Lower A · Tue", status: "Partial" },
    ],
  },
  {
    id: "sofia",
    name: "Sofia Reyes",
    initials: "SR",
    status: "on-track",
    programName: "Hypertrophy 8",
    week: 7,
    totalWeeks: 7,
    adherencePct: 100,
    flags: [],
    lastSessionSummary: "Deload week · Lower B · all sets complete",
    loadHistory: [70, 76, 82, 88, 94, 98, 60],
    recentSessions: [
      { label: "Upper A · Mon", status: "Complete" },
      { label: "Lower A · Tue", status: "Complete" },
    ],
  },
  {
    id: "theo",
    name: "Theo Nakamura",
    initials: "TN",
    status: "on-track",
    programName: "PPL Intermediate",
    week: 2,
    totalWeeks: 10,
    adherencePct: 92,
    flags: [],
    lastSessionSummary: "Macros hit every day this week",
    loadHistory: [30, 35, 40, 44, 48, 50, 55],
    recentSessions: [{ label: "Push A · Sun", status: "Complete" }],
  },
  {
    id: "priya",
    name: "Priya Nair",
    initials: "PN",
    status: "paused",
    programName: "—",
    week: 0,
    totalWeeks: 0,
    adherencePct: 0,
    flags: [],
    loadHistory: [40, 38, 30, 20, 10, 5, 0],
    recentSessions: [],
  },
  {
    id: "wes",
    name: "Wes Calder",
    initials: "WC",
    status: "unassigned",
    programName: "—",
    week: 0,
    totalWeeks: 0,
    adherencePct: 0,
    flags: [],
    loadHistory: [],
    recentSessions: [],
  },
];

function builderSet(reps: number, loadValue: number, warmup = false): BuilderSet {
  return { id: `bset-${Math.random().toString(36).slice(2, 9)}`, reps, loadValue, warmup };
}
function builderExercise(name: string, muscle: string, sets: BuilderSet[]): BuilderExercise {
  const rest = defaultRestSec(name);
  return { id: `bex-${Math.random().toString(36).slice(2, 9)}`, name, muscle, kind: "strength", sets: sets.map((s) => ({ ...s, restSec: rest })) };
}
function builderDay(name: string, exercises: BuilderExercise[] = []): BuilderDay {
  return { id: `bday-${Math.random().toString(36).slice(2, 9)}`, name, exercises };
}
function blankDays(count: number): BuilderDay[] {
  return Array.from({ length: count }, (_, i) => builderDay(`Day ${i + 1}`));
}

/** A brand-new, empty program for "build from scratch" — nothing prescribed yet, just a shell the coach fills in. */
export function buildBlankProgram(name: string): CoachProgram {
  return {
    id: `prog-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    status: "draft",
    weeks: 4,
    daysPerWeek: 4,
    effortScale: "lb",
    assignedCount: 0,
    weeklySets: 0,
    phaseWeights: [1, 0, 0],
    progressPct: 0,
    days: blankDays(4),
    isTemplate: false,
  };
}

export const programs: CoachProgram[] = [
  {
    id: "hyp8",
    name: "Hypertrophy 8",
    status: "published",
    weeks: 7,
    daysPerWeek: 4,
    effortScale: "lb",
    assignedCount: 18,
    weeklySets: 68,
    phaseWeights: [4, 2, 1],
    progressPct: 43,
    days: [
      builderDay("Day 1", [
        builderExercise("Barbell Bench Press", "Chest", [builderSet(8, 85), builderSet(8, 85), builderSet(6, 90)]),
        builderExercise("Incline Dumbbell Press", "Chest", [builderSet(10, 35), builderSet(10, 35), builderSet(10, 30)]),
      ]),
      builderDay("Day 2", [builderExercise("Hack Squat", "Quads", [builderSet(10, 90), builderSet(8, 110), builderSet(8, 100)])]),
      builderDay("Day 3", [builderExercise("Seated Overhead Press", "Front delts", [builderSet(8, 45), builderSet(8, 45)])]),
      builderDay("Day 4", [builderExercise("Romanian Deadlift", "Hamstrings", [builderSet(10, 135), builderSet(10, 135)])]),
    ],
  },
  { id: "ppl", name: "PPL Intermediate", status: "published", weeks: 10, daysPerWeek: 6, effortScale: "rpe", assignedCount: 9, weeklySets: 84, phaseWeights: [6, 3, 1], progressPct: 20, days: blankDays(6) },
  { id: "strength12", name: "Strength Base 12", status: "draft", weeks: 12, daysPerWeek: 4, effortScale: "pct1rm", assignedCount: 0, weeklySets: 48, phaseWeights: [8, 3, 1], progressPct: 0, days: blankDays(4) },
];

export { libraryExercises } from "./exerciseLibrary";

export const threads: CoachThread[] = [
  {
    id: "amara",
    clientId: "amara",
    clientName: "Amara Osei",
    context: "PPL Intermediate · wk 5 · knee flag",
    unread: true,
    time: "08:12",
    preview: "Knee felt worse on the second set — should I skip hack squat today?",
    bubbles: [
      { from: "client", text: "Knee felt worse on the second set — should I skip hack squat today?", time: "08:12" },
      { from: "client", text: "Hack Squat · set 2", time: "08:12", attached: "110 kg × 8 · RIR 1 · joint 3/4" },
    ],
  },
  {
    id: "marcus",
    clientId: "marcus",
    clientName: "Marcus Kell",
    context: "Hypertrophy 8 · wk 3",
    unread: true,
    time: "07:44",
    preview: "Sent a clip of my last bench set, form check when you get a sec 🎥",
    bubbles: [{ from: "client", text: "Sent a clip of my last bench set, form check when you get a sec 🎥", time: "07:44" }],
  },
  {
    id: "sofia",
    clientId: "sofia",
    clientName: "Sofia Reyes",
    context: "Hypertrophy 8 · wk 7 · deload",
    unread: false,
    time: "Yesterday",
    preview: "Deload week feels too easy, is that normal?",
    bubbles: [{ from: "client", text: "Deload week feels too easy, is that normal?", time: "Yesterday" }],
  },
  {
    id: "jonas",
    clientId: "jonas",
    clientName: "Jonas Vidal",
    context: "Hypertrophy 8 · wk 3 · behind",
    unread: false,
    time: "Yesterday",
    preview: "You: no problem — log what you can this week and we'll…",
    bubbles: [
      { from: "client", text: "Been slammed at work, missed two sessions this week.", time: "Yesterday" },
      { from: "coach", text: "No problem — log what you can this week and we'll re-plan Monday.", time: "Yesterday" },
    ],
  },
  {
    id: "broadcast-hyp8",
    clientId: "hyp8",
    clientName: "Broadcast · Hypertrophy 8",
    context: "To all 18 assigned clients",
    unread: false,
    time: "Sun",
    preview: "Week 4 is the last accumulation week — push it.",
    isBroadcast: true,
    bubbles: [{ from: "coach", text: "Week 4 is the last accumulation week — push it.", time: "Sun 09:02" }],
  },
];
