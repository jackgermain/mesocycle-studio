import type { Program, TrainingWeek } from "./types";

/**
 * Per-week phase names: Base (accumulation), Load (intensification, all but the
 * last week), Peak (the last intensification week), Deload. For a 4-week block
 * with one week per phase, that's exactly Base / Load / Peak / Deload.
 */
export function phaseLabelForWeek(program: Program, week: TrainingWeek): string {
  if (week.phase === "accumulation") return "Base";
  if (week.phase === "deload") return "Deload";
  const intensificationWeeks = program.weeks.filter((w) => w.phase === "intensification");
  const isLast = intensificationWeeks[intensificationWeeks.length - 1]?.number === week.number;
  return isLast ? "Peak" : "Load";
}

export function phaseLabelsShort(program: Program): { label: string; weeks: number }[] {
  const groups: { phase: TrainingWeek["phase"]; weeks: number }[] = [];
  for (const w of program.weeks) {
    const last = groups[groups.length - 1];
    if (last && last.phase === w.phase) last.weeks += 1;
    else groups.push({ phase: w.phase, weeks: 1 });
  }
  return groups.map((g) => ({
    label: g.phase === "accumulation" ? "Base" : g.phase === "deload" ? "Deload" : "Load/Peak",
    weeks: g.weeks,
  }));
}
