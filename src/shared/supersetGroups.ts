/** Supersets in a session: which exercises are performed as one round.
 *
 * > *"I may want to superset tricep pushdowns and cable curls back to back with no rest in between, and
 * > each time I complete one of each that is one set. So I'd like to be able to add one or even more
 * > exercises to be able to superset, and then be able to have rep progressions and set progressions for
 * > them individually."*
 *
 * The doctrine for this was already written from his own words in `generator/superset.ts` — when to pair
 * (*"after your first two exercises, which are usually your heavy hitters"*), what never to pair
 * (*"don't superset lateral raises, ever"*), and the rest rule (*"you don't rest in between sets of a
 * superset, that's why it's called a superset"*). All of it had zero callers and there was nowhere on an
 * exercise to record that it was in one. This is the missing half.
 *
 * ## Why an id on the exercise rather than a group object on the day
 *
 * Everything that walks a session — the progression engine, the volume counter, the soreness check, the
 * logger — iterates `day.exercises` and keys off `day.order`. A separate groups array would be a second
 * source of truth those readers do not consult, and the first edit that removed an exercise without
 * updating it would leave a group pointing at nothing. A shared id on the members cannot go stale: delete
 * the exercise and its membership goes with it.
 *
 * **Each exercise keeps its own sets, reps and load.** A superset changes the ORDER OF EXECUTION and the
 * rest, nothing else — so progressions keep running per exercise, exactly as he asked, with no special
 * case in the engine at all.
 *
 * ## Members must be adjacent
 *
 * A round is performed back to back, so a group that is not contiguous in `day.order` is not a thing you
 * can do. `groupsOf` therefore reads groups off the ORDER, and a shared id that has been split by a
 * reorder resolves to two separate groups rather than one impossible one.
 */
import type { TrainingDay, WorkExercise } from "../data/types";

export interface SupersetGroup {
  /** Shared `supersetId`, or null for an exercise performed on its own. */
  id: string | null;
  /** Exercise keys, in the order they are performed. One entry when not supersetted. */
  keys: string[];
}

export function orderedKeys(day: TrainingDay): string[] {
  return (day.order.length ? day.order : Object.keys(day.exercises)).filter((k) => day.exercises[k]);
}

/** The session as rounds: consecutive exercises sharing a superset id collapse into one group. */
export function groupsOf(day: TrainingDay): SupersetGroup[] {
  const out: SupersetGroup[] = [];
  for (const key of orderedKeys(day)) {
    const id = day.exercises[key]?.supersetId ?? null;
    const last = out[out.length - 1];
    // Only a RUN of the same id joins. A group split apart by a reorder is two groups, because a round you
    // cannot perform back to back is not a round.
    if (id !== null && last && last.id === id) last.keys.push(key);
    else out.push({ id, keys: [key] });
  }
  return out;
}

/** The group a given exercise belongs to, and where it sits in the round. */
export function groupFor(day: TrainingDay, key: string): { group: SupersetGroup; position: number } | null {
  for (const group of groupsOf(day)) {
    const position = group.keys.indexOf(key);
    if (position >= 0) return { group, position };
  }
  return null;
}

/** "A1", "A2", "B1"… for a session with supersets; null for an exercise performed alone.
 *
 * The letter is the round and the number is the position inside it, which is how a superset is written on
 * paper and the only way to tell at a glance that two cards are one piece of work. */
export function roundLabels(day: TrainingDay): Record<string, string> {
  const groups = groupsOf(day);
  const out: Record<string, string> = {};
  // Advanced only by an actual round. Counting solo exercises too made the first superset in a session
  // "B1/B2" because a bench press ahead of it had silently consumed "A" without ever showing it.
  let letter = 0;
  for (const group of groups) {
    if (group.keys.length < 2) continue;
    const prefix = String.fromCharCode(65 + (letter % 26));
    group.keys.forEach((k, i) => { out[k] = `${prefix}${i + 1}`; });
    letter++;
  }
  return out;
}

/** Rest belongs AFTER the round, never inside it.
 *
 * *"You don't rest in between sets of a superset. That's why it's called a superset."* So only the last
 * exercise of a group shows a rest timer; the ones before it run straight into the next movement. */
export function showsRestAfter(day: TrainingDay, key: string): boolean {
  const found = groupFor(day, key);
  if (!found) return true;
  return found.position === found.group.keys.length - 1;
}

/** One round completed is one set of each member, so a group's set count is the longest member's.
 *
 * *"Each time I complete one of each, that is one set."* Members are allowed to differ — a 3x12 paired
 * with a 2x15 is a legitimate thing to write — and the shorter one simply drops out of the last round. */
export function roundsIn(day: TrainingDay, group: SupersetGroup): number {
  return Math.max(
    0,
    ...group.keys.map((k) => (day.exercises[k]?.sets ?? []).filter((s) => !s.isWarmup && !s.removed).length),
  );
}

/** Put `keys` into one superset, or break them out of theirs when `id` is null.
 *
 * Returns a new exercises map; the caller owns writing it back and keeping `order` adjacent. Members that
 * are not contiguous are rejected rather than silently written, because `groupsOf` would read them back as
 * separate groups and the stored id would be a lie. */
export function setSuperset(
  day: TrainingDay,
  keys: string[],
  id: string | null,
): Record<string, WorkExercise> | null {
  if (keys.length === 0) return null;
  if (id !== null && keys.length < 2) return null;
  const order = orderedKeys(day);
  const positions = keys.map((k) => order.indexOf(k));
  if (positions.some((p) => p < 0)) return null;
  const sorted = [...positions].sort((a, b) => a - b);
  if (sorted.some((p, i) => i > 0 && p !== sorted[i - 1] + 1)) return null;

  const next: Record<string, WorkExercise> = {};
  for (const [key, ex] of Object.entries(day.exercises)) {
    if (!keys.includes(key)) {
      next[key] = ex;
      continue;
    }
    const copy = { ...ex };
    if (id === null) delete copy.supersetId;
    else copy.supersetId = id;
    next[key] = copy;
  }
  return next;
}
