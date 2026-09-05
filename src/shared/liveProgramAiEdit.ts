import type { Program, TrainingDay, WorkExercise, WorkSet } from "../data/types";
import { equipmentOf } from "../screens/exerciseHelpers";
import { defaultRestSec } from "../coach/rest";
import type { AiDayDraft, ChangeEntry } from "../coach/programAiEdit";

/** The same free-rewrite-then-review loop as the template editor, against a client's live program.
 *
 * The difference here is that some of this program is history. A logged set records what somebody
 * actually did; a finished day is a session that happened. Those are not editable by anyone, and because
 * the model is now free to return whatever it likes, that rule can't live in a prompt -- it's re-imposed
 * here, after the fact, over the top of whatever came back. */

const MAX_SETS = 20;
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function clampInt(v: number, lo: number, hi: number): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

/** Merges the model's draft of a week back into the real program.
 *
 * Days already done are never handed to the model and are copied through untouched. Within an editable
 * day, sets that are already logged win over whatever the model proposed for that position -- so an
 * instruction that would have rewritten somebody's third set of bench after they'd done it quietly
 * doesn't, and the diff shows the change that did land rather than the one that was asked for. */
export function reconcileLiveProgram(before: Program, weeks: { week: number; days: AiDayDraft[] }[]): Program {
  const next = structuredClone(before);
  const draftByWeek = new Map(weeks.map((w) => [w.week, w.days]));

  for (const week of next.weeks) {
    const draftDays = draftByWeek.get(week.number);
    if (!draftDays) continue;
    const draftById = new Map(draftDays.filter((d) => d.dayId).map((d) => [d.dayId as string, d]));

    for (let i = 0; i < week.days.length; i++) {
      const day = week.days[i];
      if (day.status === "done") continue; // history, not a draft
      const draft = draftById.get(day.id);
      if (!draft) continue;
      week.days[i] = reconcileDay(day, draft);
    }
  }
  return next;
}

function reconcileDay(day: TrainingDay, draft: AiDayDraft): TrainingDay {
  const prevExercises = day.exercises;
  const nextExercises: Record<string, WorkExercise> = {};
  const order: string[] = [];

  for (const de of draft.exercises ?? []) {
    const key = de.exerciseId && prevExercises[de.exerciseId] ? de.exerciseId : uid("ai");
    const prev = prevExercises[key];
    const name = (de.name ?? prev?.name ?? "Exercise").trim() || "Exercise";
    const drafted = (de.sets ?? []).slice(0, MAX_SETS);

    // Logged sets are immovable. They keep their positions; the model's proposals only fill what's left.
    const logged = (prev?.sets ?? []).filter((s) => s.checked);
    const proposed = drafted.slice(logged.length);
    const spare: WorkSet[] = proposed.map((s, i) => {
      const template = (prev?.sets ?? []).filter((x) => !x.checked)[i];
      const base = template ?? prev?.sets[0];
      return {
        id: template?.id ?? uid("set"),
        index: logged.length + i + 1,
        type: base?.type ?? "straight",
        isWarmup: s.warmup ?? template?.isWarmup ?? false,
        checked: false,
        actual: null,
        prescribed: {
          ...(base ? structuredClone(base.prescribed) : { effort: { scale: "RIR" as const, value: "2" }, tempo: undefined, cluster: undefined }),
          reps: clampInt(s.reps ?? (typeof template?.prescribed.reps === "number" ? template.prescribed.reps : 10), 1, 500),
          // A bodyweight set has no load; leaving it null keeps it bodyweight rather than inventing a weight.
          load: s.load === undefined ? (template?.prescribed.load ?? null) : Math.max(0, Number(s.load)),
          restSec: clampInt(s.restSec ?? template?.prescribed.restSec ?? defaultRestSec(name), 0, 3600),
        },
      };
    });

    const sets = [...logged, ...spare];
    if (sets.length === 0) continue; // an exercise with no sets isn't an exercise

    const topLoad = sets.find((s) => !s.isWarmup)?.prescribed.load ?? sets[0]?.prescribed.load;
    nextExercises[key] = {
      ...(prev ?? { hasVideo: false }),
      id: key,
      name,
      muscle: (de.muscle ?? prev?.muscle ?? "Full body").trim() || "Full body",
      // Only re-derived when the movement actually changed. An exercise that came from the library with
      // its equipment set explicitly must keep it -- running the name heuristic over an unchanged name
      // would quietly overwrite a known value with a guess, and equipment decides the load increment.
      equipment: prev && prev.name === name ? prev.equipment : equipmentOf({ name }),
      metaLine: `${sets.length} sets · ${topLoad == null ? "bodyweight" : `${topLoad} lb`}`,
      sets,
    };
    order.push(key);
  }

  // An exercise the client has already started is never dropped, whatever the draft says -- deleting it
  // would delete the sets they logged against it.
  for (const [key, ex] of Object.entries(prevExercises)) {
    if (nextExercises[key]) continue;
    if (!ex.sets.some((s) => s.checked)) continue;
    nextExercises[key] = ex;
    order.push(key);
  }

  if (order.length === 0) return day; // a draft that emptied the day is rejected wholesale

  return {
    ...day,
    label: (draft.name ?? day.label).trim() || day.label,
    exercises: nextExercises,
    order,
    setCount: Object.values(nextExercises).reduce((n, e) => n + e.sets.length, 0),
  };
}

/** What the model sees. Finished days are withheld entirely, and logged sets are marked, so it knows what
 * it's working with even though the rules are enforced afterwards regardless. */
export function summarizeProgramForAi(program: Program, currentWeek: number | null) {
  return {
    name: program.name,
    currentWeek,
    note: "Return every week and day shown, with the same dayId and exerciseId values, changing only what was asked for.",
    weeks: program.weeks.map((w) => ({
      week: w.number,
      days: w.days
        .filter((d) => d.status !== "done")
        .map((d) => ({
          dayId: d.id,
          name: d.label,
          date: d.date,
          exercises: (d.order.length ? d.order : Object.keys(d.exercises))
            .map((id) => ({ id, ex: d.exercises[id] }))
            .filter((e): e is { id: string; ex: WorkExercise } => !!e.ex)
            .map(({ id, ex }) => ({
              exerciseId: id,
              name: ex.name,
              muscle: ex.muscle,
              loggedSets: ex.sets.filter((s) => s.checked).length,
              sets: ex.sets.map((s) => ({
                reps: s.prescribed.reps,
                load: s.prescribed.load,
                restSec: s.prescribed.restSec,
                warmup: !!s.isWarmup,
                alreadyLogged: !!s.checked,
              })),
            })),
        })),
    })),
  };
}

const repsOf = (ex: WorkExercise) => ex.sets.filter((s) => !s.isWarmup).map((s) => s.prescribed.reps).join("/");
const loadOf = (ex: WorkExercise) => ex.sets.filter((s) => !s.isWarmup).map((s) => (s.prescribed.load == null ? "bw" : s.prescribed.load)).join("/");
const restOf = (ex: WorkExercise) => ex.sets[0]?.prescribed.restSec ?? 0;
const warmOf = (ex: WorkExercise) => ex.sets.filter((s) => s.isWarmup).length;
const workOf = (ex: WorkExercise) => ex.sets.filter((s) => !s.isWarmup).length;

/** Every difference, labelled by week, so a change that only touches week 3 reads as week 3 only. */
export function diffProgram(before: Program, after: Program): ChangeEntry[] {
  const out: ChangeEntry[] = [];
  const afterWeeks = new Map(after.weeks.map((w) => [w.number, w]));

  for (const week of before.weeks) {
    const now = afterWeeks.get(week.number);
    if (!now) continue;
    const nowDays = new Map(now.days.map((d) => [d.id, d]));

    for (const day of week.days) {
      const nd = nowDays.get(day.id);
      if (!nd) continue;
      const scope = `wk ${week.number} · ${nd.label}`;
      if (day.label !== nd.label) out.push({ scope, target: nd.label, kind: "day", detail: `renamed from "${day.label}"` });

      for (const [key, ex] of Object.entries(day.exercises)) {
        if (!nd.exercises[key]) out.push({ scope, target: ex.name, kind: "removed", detail: "removed", exerciseId: key });
      }
      for (const key of nd.order) {
        const ex = nd.exercises[key];
        if (!ex) continue;
        const was = day.exercises[key];
        if (!was) {
          out.push({ scope, target: ex.name, kind: "added", detail: `added · ${workOf(ex)}×${repsOf(ex) || "?"}`, exerciseId: key });
          continue;
        }
        if (was.name !== ex.name) out.push({ scope, target: ex.name, kind: "renamed", detail: `was "${was.name}"`, exerciseId: key });
        if (was.muscle !== ex.muscle) out.push({ scope, target: ex.name, kind: "muscle", detail: `${was.muscle} → ${ex.muscle}`, exerciseId: key });
        if (workOf(was) !== workOf(ex)) out.push({ scope, target: ex.name, kind: "sets", detail: `sets ${workOf(was)} → ${workOf(ex)}`, exerciseId: key });
        if (warmOf(was) !== warmOf(ex)) out.push({ scope, target: ex.name, kind: "warmups", detail: `warm-ups ${warmOf(was)} → ${warmOf(ex)}`, exerciseId: key });
        if (repsOf(was) !== repsOf(ex)) out.push({ scope, target: ex.name, kind: "reps", detail: `reps ${repsOf(was)} → ${repsOf(ex)}`, exerciseId: key });
        if (loadOf(was) !== loadOf(ex)) out.push({ scope, target: ex.name, kind: "load", detail: `load ${loadOf(was)} → ${loadOf(ex)}`, exerciseId: key });
        if (restOf(was) !== restOf(ex)) out.push({ scope, target: ex.name, kind: "rest", detail: `rest ${restOf(was)}s → ${restOf(ex)}s`, exerciseId: key });
      }

      const kept = new Set(nd.order.filter((k) => day.exercises[k]));
      const wasOrder = (day.order.length ? day.order : Object.keys(day.exercises)).filter((k) => kept.has(k));
      const nowOrder = nd.order.filter((k) => kept.has(k));
      if (wasOrder.join(",") !== nowOrder.join(",")) out.push({ scope, target: nd.label, kind: "moved", detail: "exercise order changed" });
    }
  }
  return out;
}
