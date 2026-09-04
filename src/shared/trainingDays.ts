/** Training days are stored as offsets from Monday: 0=Mon, 1=Tue … 6=Sun. That matches how the whole
 * scheduler already thinks (every weekly pattern is anchored to Monday -- see scheduleWeeks), so a slot's
 * weekday is just its offset and no timezone or Date object is involved. */
export const DOW_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
export const DOW_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** What a program gets when nobody has picked days explicitly: n sessions spread as evenly as 7 days
 * allow, which is exactly what the scheduler did for every program before picking was possible. Keeping
 * the same formula means an existing program's dates don't shift the moment this feature ships. */
export function defaultDows(daysPerWeek: number): number[] {
  const n = Math.max(1, Math.min(7, daysPerWeek));
  return Array.from({ length: n }, (_, i) => Math.floor((i * 7) / n));
}

/** Keeps a day-of-week selection the same length as the program's day count, whichever control changed.
 * Growing picks the earliest unused weekdays so the result still reads in order; shrinking drops from the
 * end, which is also the day slot SET_DAYS_PER_WEEK removes. */
export function resizeDows(dows: number[] | undefined, daysPerWeek: number): number[] {
  const n = Math.max(1, Math.min(7, daysPerWeek));
  const current = [...(dows ?? defaultDows(n))].sort((a, b) => a - b);
  if (current.length === n) return current;
  if (current.length > n) return current.slice(0, n);
  const out = [...current];
  for (let d = 0; d < 7 && out.length < n; d++) if (!out.includes(d)) out.push(d);
  return out.sort((a, b) => a - b);
}

/** Toggling a weekday on or off, kept sorted and never allowed to empty out -- a program with no training
 * days has nothing to schedule. */
export function toggleDow(dows: number[], dow: number): number[] {
  if (dows.includes(dow)) {
    if (dows.length === 1) return dows;
    return dows.filter((d) => d !== dow);
  }
  return [...dows, dow].sort((a, b) => a - b);
}
