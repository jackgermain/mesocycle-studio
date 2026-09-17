import { isSorenessAlerting } from "./signalScales";
import { judgeVolume } from "../generator/recoveryWindow";
import { sorenessWording } from "../data/mockData";

/** The signals a pre-session soreness check sends: one per muscle answered, whatever the answer.
 *
 * It used to send two cases only — still sore (under 3) and healed early enough to add volume. An on-time
 * recovery, or a muscle that was a little sore, reached nobody, so the coach saw only the extremes and never
 * the readings that say volume is right. Jack: "those notifications need to be being sent no matter what.
 * They're incredibly important. It completely breaks our algorithm for training if they don't work, so the
 * coach needs to be able to see that feedback."
 *
 * Lives here rather than inside Soreness.tsx so it can be tested — a .tsx cannot be run by Node's type
 * stripping, and "does every answer get sent" is exactly the property that went wrong silently.
 *
 * Imports `isSorenessAlerting` from signalScales, NOT signals.ts: that file creates the Supabase client at
 * import time and cannot be reached from a test at all. */

export interface SorenessDue {
  muscle: string;
  lastTrainedDaysAgo: number;
}

export interface SorenessSignal {
  kind: "soreness";
  muscle: string;
  /** The real 1-5 answer. The early case used to be forced to 5; it is not any more. */
  severity: number;
  note: string;
  /** `gapDays=N`, plus `recoveredOnDay=N` when that follow-up was answered. */
  detail: string;
  dayLabel: string | null;
}

export function buildSorenessSignals(
  due: SorenessDue[],
  answers: Record<string, number>,
  recovered: Record<string, number>,
  dayLabel: string | null,
): SorenessSignal[] {
  const days = (n: number) => `${n} day${n === 1 ? "" : "s"}`;
  return due
    .filter((m) => typeof answers[m.muscle] === "number")
    .map((m) => {
      const severity = answers[m.muscle];
      const gap = m.lastTrainedDaysAgo;
      const recoveredOnDay = recovered[m.muscle];
      const base = { kind: "soreness" as const, muscle: m.muscle, severity, dayLabel };

      // Still sore on the day the muscle comes round again: the last session did more damage than the gap
      // could absorb. The one reading that is unambiguous on its own.
      if (isSorenessAlerting(severity)) {
        return { ...base, note: `Still sore ${days(gap)} after training it`, detail: `gapDays=${gap}` };
      }

      // Healed, and they said when — which is what separates "on target" from "a day of growth unbought".
      if (recoveredOnDay !== undefined) {
        const early = judgeVolume(gap, recoveredOnDay) === "add-volume";
        const when = recoveredOnDay === 0 ? "Never got sore" : `Healed on day ${recoveredOnDay} of a ${gap}-day gap`;
        return {
          ...base,
          note: `${when} — ${early ? "room for another set" : "on target"}`,
          detail: `recoveredOnDay=${recoveredOnDay};gapDays=${gap}`,
        };
      }

      // In between — a little sore, not yet healed. Worded with the same labels the client picked from.
      return { ...base, note: `${sorenessWording[severity - 1]}, ${days(gap)} after training it`, detail: `gapDays=${gap}` };
    });
}
