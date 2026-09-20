/** Reordering a session's exercises, across the rest of the block rather than in one week.
 *
 * > *"Why the hell are all my exercises in different places? The split is selected in week one, and it
 * > stays like that throughout the whole program, unless an exercise needs to be changed because it hurts,
 * > or because the machine isn't available."*
 *
 * The reducer used to write `day.order` on the one day whose id matched. `TrainingDay.id` is unique per
 * week, so that was always exactly one session — reorder Monday of week 1 and Monday of week 2 keeps the
 * order it was generated with. The loop read as if it spanned weeks (`for (const week of program.weeks)`)
 * and could not, which is why it survived.
 *
 * **Matched by NAME, not by key.** Two of the three ways a program is built key exercises by week
 * (`w1-d1-e1`, `w2-d1-e1`), so a key from week 1 exists in no other week and a key-matched reorder would
 * silently do nothing everywhere else — the same trap CLAUDE.md records for scoped edits.
 *
 * Forward only, and never a finished session: history stays exactly as it was trained. An exercise a later
 * week has and the reordered day does not keeps its place at the end, in the order it already had, rather
 * than being dropped from `order` and disappearing from the screen.
 */
import type { Program } from "../data/types";

export function reorderAcrossBlock(program: Program, dayId: string, order: string[]): Program {
  const next = structuredClone(program);
  const days = next.weeks.flatMap((w) => w.days);
  const anchor = days.find((d) => d.id === dayId);
  if (!anchor) return program;

  anchor.order = order;

  // The sequence the person actually chose, as names.
  const rank = new Map<string, number>();
  order.forEach((key, i) => {
    const name = anchor.exercises[key]?.name;
    if (name !== undefined && !rank.has(name)) rank.set(name, i);
  });
  if (rank.size === 0) return next;

  for (const day of days) {
    if (day.id === dayId) continue;
    if (day.code !== anchor.code || day.date <= anchor.date) continue;
    if (day.status === "done") continue;
    // A session someone has already started is mid-flight; moving the cards under them is not a reorder.
    if (Object.values(day.exercises).some((ex) => ex.sets.some((s) => s.checked))) continue;

    const current = day.order.length ? day.order : Object.keys(day.exercises);
    // Stable: anything the chosen order does not mention keeps its existing relative position, after the
    // exercises that were placed.
    day.order = current
      .map((key, i) => ({ key, i, at: rank.get(day.exercises[key]?.name ?? "") ?? Infinity }))
      .sort((a, b) => a.at - b.at || a.i - b.i)
      .map((x) => x.key);
  }
  return next;
}
