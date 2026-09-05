import type { BuilderDay, BuilderExercise, BuilderSet } from "./types";
import { defaultRestSec } from "./rest";

/** The AI returns a whole program, not a list of permitted moves.
 *
 * An earlier version had it emit operations from a fixed vocabulary, on the theory that a constrained
 * output can't mangle anything. That was belt and braces, and the belt was the expensive half: every new
 * thing a coach might ask for needed a new operation before it could be asked for at all.
 *
 * What actually keeps this safe is the review step, so that's where the effort goes instead. The model
 * rewrites the program freely; then code re-imposes the invariants it isn't allowed to break, and diffs
 * the real before against the real after. Anything it changed shows up -- including things nobody asked
 * for -- so a bad rewrite is visible rather than silent, which is the property that actually matters. */

/** The shape the model hands back. Ids are how an edit is told apart from a replacement: keep the id and
 * it's the same exercise changed, omit it and it's a new one. */
export interface AiDayDraft {
  dayId?: string | null;
  name: string;
  exercises: AiExerciseDraft[];
}
export interface AiExerciseDraft {
  exerciseId?: string | null;
  name: string;
  muscle: string;
  sets: AiSetDraft[];
}
export interface AiSetDraft {
  reps?: number;
  load?: number;
  restSec?: number;
  warmup?: boolean;
}

/** Everything a model returns is a suggestion about shape, not a guarantee of one.
 *
 * The schema asks for notes as an array of strings and it came back as a single string, which crashed the
 * review sheet on `.join` -- and got past the guard because a string has a `.length` too. Rather than fix
 * that one call site, every field is coerced here, once, at the boundary. Nothing downstream should have
 * to wonder whether it got what it asked for. */
export function toStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
  if (typeof v === "string" && v.trim().length > 0) return [v];
  return [];
}

export function sanitizeAiResult(raw: unknown): AiEditResult {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    days: Array.isArray(r.days) ? (r.days as AiDayDraft[]) : undefined,
    weeks: Array.isArray(r.weeks)
      ? (r.weeks as { week: number; days: AiDayDraft[] }[]).filter((w) => w && Array.isArray(w.days))
      : undefined,
    summary: typeof r.summary === "string" ? r.summary : undefined,
    notes: toStringArray(r.notes),
  };
}

export interface AiEditResult {
  days?: AiDayDraft[];
  weeks?: { week: number; days: AiDayDraft[] }[];
  summary?: string;
  notes?: string[];
}

const MAX_SETS = 20;
const MAX_EXERCISES = 40;

const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/** Rebuilds real BuilderDays from the model's draft, reusing the originals wherever an id matches.
 *
 * Reuse matters for more than tidiness: set ids that survive mean the diff can tell "this set's reps
 * changed" from "every set was replaced", and anything the model didn't think to mention (a cardio
 * exercise's kind, a per-exercise load-mode override) is carried across rather than quietly lost. */
export function reconcileTemplateDays(before: BuilderDay[], draft: AiDayDraft[]): BuilderDay[] {
  const oldDays = new Map(before.map((d) => [d.id, d]));
  const oldExercises = new Map<string, BuilderExercise>();
  for (const d of before) for (const ex of d.exercises) oldExercises.set(ex.id, ex);

  return draft.slice(0, 20).map((dd) => {
    const prevDay = dd.dayId ? oldDays.get(dd.dayId) : undefined;
    const day: BuilderDay = {
      id: prevDay?.id ?? uid("day"),
      name: (dd.name ?? prevDay?.name ?? "Day").trim() || "Day",
      exercises: (dd.exercises ?? []).slice(0, MAX_EXERCISES).map((de) => {
        const prev = de.exerciseId ? oldExercises.get(de.exerciseId) : undefined;
        const name = (de.name ?? prev?.name ?? "Exercise").trim() || "Exercise";
        const sets = (de.sets ?? []).slice(0, MAX_SETS);
        const built: BuilderSet[] = (sets.length ? sets : [{}]).map((s, i) => {
          const prevSet = prev?.sets[i];
          return {
            id: prevSet?.id ?? uid("set"),
            reps: clampInt(s.reps ?? prevSet?.reps ?? 10, 1, 500),
            loadValue: Math.max(0, Number.isFinite(s.load as number) ? (s.load as number) : (prevSet?.loadValue ?? 0)),
            warmup: s.warmup ?? prevSet?.warmup ?? false,
            restSec: clampInt(s.restSec ?? prevSet?.restSec ?? defaultRestSec(name), 0, 3600),
          };
        });
        return {
          // Everything the model has no opinion about is inherited, not defaulted.
          ...(prev ?? { kind: "strength" as const }),
          id: prev?.id ?? uid("ex"),
          name,
          muscle: (de.muscle ?? prev?.muscle ?? "Full body").trim() || "Full body",
          sets: built,
        };
      }),
    };
    return day;
  });
}

function clampInt(v: number, lo: number, hi: number): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

export interface ChangeEntry {
  /** Where it happened, e.g. "Day 1" or "wk 2 · Day 1". */
  scope: string;
  /** What changed — usually an exercise name. */
  target: string;
  kind: "added" | "removed" | "renamed" | "muscle" | "sets" | "reps" | "load" | "rest" | "warmups" | "moved" | "day";
  detail: string;
  exerciseId?: string;
}

const repsOf = (ex: BuilderExercise) => ex.sets.filter((s) => !s.warmup).map((s) => s.reps).join("/");
const loadOf = (ex: BuilderExercise) => ex.sets.filter((s) => !s.warmup).map((s) => s.loadValue).join("/");
const restOf = (ex: BuilderExercise) => ex.sets[0]?.restSec ?? 0;
const warmOf = (ex: BuilderExercise) => ex.sets.filter((s) => s.warmup).length;
const workOf = (ex: BuilderExercise) => ex.sets.filter((s) => !s.warmup).length;

/** Every difference between two versions of a week, not only the ones that were asked for.
 *
 * Completeness is the whole point. This is the only thing standing between a freely-rewriting model and a
 * silently corrupted program, so it reports movement and renames and muscle reassignments too -- not just
 * the numbers -- and it never summarises by sampling. */
export function diffTemplate(before: BuilderDay[], after: BuilderDay[], scopeLabel = ""): ChangeEntry[] {
  const out: ChangeEntry[] = [];
  const scopeFor = (dayName: string) => (scopeLabel ? `${scopeLabel} · ${dayName}` : dayName);

  const beforeDays = new Map(before.map((d) => [d.id, d]));
  const afterDays = new Map(after.map((d) => [d.id, d]));

  for (const [id, d] of beforeDays) {
    if (!afterDays.has(id)) out.push({ scope: scopeFor(d.name), target: d.name, kind: "day", detail: "day removed" });
  }
  for (const d of after) {
    const prev = beforeDays.get(d.id);
    if (!prev) {
      out.push({ scope: scopeFor(d.name), target: d.name, kind: "day", detail: "day added" });
      continue;
    }
    if (prev.name !== d.name) out.push({ scope: scopeFor(d.name), target: d.name, kind: "day", detail: `renamed from "${prev.name}"` });

    const prevById = new Map(prev.exercises.map((e) => [e.id, e]));
    const nowIds = new Set(d.exercises.map((e) => e.id));
    const prevOrder = prev.exercises.map((e) => e.id).filter((id) => nowIds.has(id));
    const nowOrder = d.exercises.map((e) => e.id).filter((id) => prevById.has(id));
    const reordered = prevOrder.join(",") !== nowOrder.join(",");

    for (const [id, ex] of prevById) {
      if (!nowIds.has(id)) out.push({ scope: scopeFor(d.name), target: ex.name, kind: "removed", detail: "removed", exerciseId: id });
    }
    for (const ex of d.exercises) {
      const was = prevById.get(ex.id);
      const scope = scopeFor(d.name);
      if (!was) {
        out.push({ scope, target: ex.name, kind: "added", detail: `added · ${workOf(ex)}×${repsOf(ex) || "?"}`, exerciseId: ex.id });
        continue;
      }
      if (was.name !== ex.name) out.push({ scope, target: ex.name, kind: "renamed", detail: `was "${was.name}"`, exerciseId: ex.id });
      if (was.muscle !== ex.muscle) out.push({ scope, target: ex.name, kind: "muscle", detail: `${was.muscle} → ${ex.muscle}`, exerciseId: ex.id });
      if (workOf(was) !== workOf(ex)) out.push({ scope, target: ex.name, kind: "sets", detail: `sets ${workOf(was)} → ${workOf(ex)}`, exerciseId: ex.id });
      if (warmOf(was) !== warmOf(ex)) out.push({ scope, target: ex.name, kind: "warmups", detail: `warm-ups ${warmOf(was)} → ${warmOf(ex)}`, exerciseId: ex.id });
      if (repsOf(was) !== repsOf(ex)) out.push({ scope, target: ex.name, kind: "reps", detail: `reps ${repsOf(was)} → ${repsOf(ex)}`, exerciseId: ex.id });
      if (loadOf(was) !== loadOf(ex)) out.push({ scope, target: ex.name, kind: "load", detail: `load ${loadOf(was)} → ${loadOf(ex)}`, exerciseId: ex.id });
      if (restOf(was) !== restOf(ex)) out.push({ scope, target: ex.name, kind: "rest", detail: `rest ${restOf(was)}s → ${restOf(ex)}s`, exerciseId: ex.id });
    }
    if (reordered) out.push({ scope: scopeFor(d.name), target: d.name, kind: "moved", detail: "exercise order changed" });
  }
  return out;
}
