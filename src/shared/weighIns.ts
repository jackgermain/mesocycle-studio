/** Which weigh-ins were owed, and which of those never happened.
 *
 * The same rules run on both sides, from one place on purpose: the client's app decides what to ask for,
 * and the coach's Desk decides what to chase. If those two disagree by even a day, a client gets nagged
 * for something their coach doesn't think is missing, or a coach chases something the client was never
 * asked for. */

export const WEIGH_IN_DAY_KEYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export interface WeighInProfileLike {
  weighInsPerWeek: number;
  weighInDays: string[];
}

export interface WeighInSkip {
  date: string; // ISO yyyy-mm-dd
  reason: string;
}

export interface MissedWeighIn {
  date: string;
  /** "skipped" -- they said why. "missed" -- the day came and went with no answer at all. */
  kind: "missed" | "skipped";
  reason?: string;
}

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Mon=0 .. Sun=6, matching WEIGH_IN_DAY_KEYS. JS puts Sunday at 0, which would silently shift every
 * weekday by one if used directly against that list. */
function dayKeyOf(d: Date): string {
  return WEIGH_IN_DAY_KEYS[(d.getDay() + 6) % 7];
}

export function weighInsEnabled(profile: WeighInProfileLike | undefined | null): boolean {
  return !!profile && profile.weighInsPerWeek > 0 && profile.weighInDays.length > 0;
}

/** Every date in the last `days` days (today last) that this person was supposed to weigh in on. */
export function dueDates(profile: WeighInProfileLike, days: number, from = new Date()): string[] {
  if (!weighInsEnabled(profile)) return [];
  const out: string[] = [];
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  for (let back = days - 1; back >= 0; back--) {
    const d = new Date(start);
    d.setDate(start.getDate() - back);
    if (profile.weighInDays.includes(dayKeyOf(d))) out.push(iso(d));
  }
  return out;
}

export function isDueToday(profile: WeighInProfileLike, from = new Date()): boolean {
  return weighInsEnabled(profile) && profile.weighInDays.includes(dayKeyOf(from));
}

/** True when today is a weigh-in day and they have neither weighed in nor said why not. */
export function isOutstandingToday(
  profile: WeighInProfileLike,
  weighIns: { date: string }[],
  skips: WeighInSkip[],
  from = new Date(),
): boolean {
  if (!isDueToday(profile, from)) return false;
  const today = iso(from);
  return !weighIns.some((w) => w.date === today) && !skips.some((s) => s.date === today);
}

/** What the coach chases. Today is deliberately excluded -- the day isn't over, and a coach being told at
 * 9am that someone missed a weigh-in they still have all day to do is noise that teaches them to ignore
 * the whole list. */
export function missedWeighIns(
  profile: WeighInProfileLike,
  weighIns: { date: string }[],
  skips: WeighInSkip[],
  days = 14,
  from = new Date(),
): MissedWeighIn[] {
  if (!weighInsEnabled(profile)) return [];
  const today = iso(from);
  const logged = new Set(weighIns.map((w) => w.date));
  const skipped = new Map(skips.map((s) => [s.date, s.reason]));

  return dueDates(profile, days, from)
    .filter((date) => date !== today && !logged.has(date))
    .map((date) =>
      skipped.has(date)
        ? { date, kind: "skipped" as const, reason: skipped.get(date) }
        : { date, kind: "missed" as const },
    );
}
