import type { Program, TrainingDay } from "../data/types";

/** Coarse, muscle-group-level synergist relationships -- e.g. rows and pulldowns on back day meaningfully
 * fatigue biceps too, presses on chest day meaningfully fatigue triceps. Deliberately conservative (only
 * the well-established compound-lift overlaps) rather than exhaustive per-exercise EMG modeling, since the
 * exercise library only tags one primary muscle per movement. */
const SECONDARY_MUSCLES: Record<string, string[]> = {
  Chest: ["Triceps", "Front delts"],
  Back: ["Biceps", "Rear delts", "Forearms"],
  "Front delts": ["Triceps"],
  Quads: ["Glutes", "Adductors"],
  Hamstrings: ["Glutes"],
  Glutes: ["Hamstrings"],
  Traps: ["Back"],
  Forearms: ["Biceps"],
  "Full body": ["Back", "Quads", "Glutes", "Traps"],
};

/** Synergists that belong to a particular EXERCISE rather than to its muscle group.
 *
 * The table above is keyed by muscle, which is right for the broad overlaps — every row trains biceps. It
 * cannot express an overlap that only some exercises for a muscle have. Jack, having done hammer curls on
 * Monday and reverse curls on Wednesday: "hammer curls on Monday and reverse curls work similar muscle
 * groups. I should have been asked about that as well."
 *
 * A hammer curl's neutral grip loads brachialis and brachioradialis — the same forearm flexors a reverse curl
 * is tagged for — while a spider curl barely touches them. So this is matched by name, not added as
 * "Biceps → Forearms" in the table, which would make every curl count forearm work. Library exercises carry
 * no per-exercise secondary muscles of their own (only custom ones do), which is why it has to live here. */
const EXERCISE_SYNERGISTS: [RegExp, string[]][] = [[/hammer curl/i, ["Forearms"]]];

function musclesWorked(day: TrainingDay): Set<string> {
  const set = new Set<string>();
  for (const ex of Object.values(day.exercises)) {
    set.add(ex.muscle);
    for (const secondary of SECONDARY_MUSCLES[ex.muscle] ?? []) set.add(secondary);
    // Muscles the exercise itself was tagged with, which the coarse table above cannot know about. A hip
    // clean tagged with traps has to put traps in the soreness check, or the question never gets asked and
    // the recovery data for that muscle is simply missing.
    for (const declared of ex.secondaryMuscles ?? []) set.add(declared);
    for (const [pattern, muscles] of EXERCISE_SYNERGISTS) {
      if (pattern.test(ex.name)) for (const m of muscles) set.add(m);
    }
  }
  return set;
}

function daysBetween(earlierIso: string, laterIso: string): number {
  const ms = new Date(`${laterIso}T00:00:00`).getTime() - new Date(`${earlierIso}T00:00:00`).getTime();
  return Math.round(ms / 86400000);
}

/** Beyond this many days, a muscle counts as fully recovered by default -- no point asking "is this still
 * sore" about something trained over a week and a half ago. */
const MAX_LOOKBACK_DAYS = 10;

/** Muscles today's session is about to work (as a primary OR secondary mover) that were also worked in a
 * recently-completed day -- e.g. biceps get asked about on back day after being hit as a synergist two
 * days earlier on pull day, triceps on chest day after overhead pressing. Surfaced as a pre-session "is
 * this healed" check so a coach can see when a muscle's actual recovery lags its programmed frequency,
 * which is the real signal for whether that muscle's volume is set too high. */
/* There used to be a week gate here: `SKIP_WEEKS_BEFORE = 2`, so weeks 0 and 1 were never asked, on the
 * reasoning that a new program is sore by definition. That reasoning was an earlier session's, not Jack's —
 * the commit that added it quoted him only on "only that body part, only on the day it is trained again".
 *
 * He then trained biceps on the Monday and Wednesday of week 1 and was asked nothing: "I was supposed to
 * receive a prompt asking me if my biceps were healed… because I trained them on Monday and I trained them
 * today." The gate was the entire cause — Monday had been finished and was found correctly; the question was
 * simply never allowed to exist. Removed for week 0 as well, since its only justification was the identical
 * argument he has just contradicted. The check now runs whenever a muscle comes round again. */

export function computeSorenessDue(program: Program, dayId: string): { muscle: string; lastTrainedDaysAgo: number }[] {
  let target: TrainingDay | null = null;
  const doneDays: TrainingDay[] = [];
  for (const week of program.weeks) {
    for (const day of week.days) {
      if (day.id === dayId) target = day;
      if (day.status === "done") doneDays.push(day);
    }
  }
  if (!target) return [];

  const todayMuscles = musclesWorked(target);
  const priorDays = doneDays.filter((d) => d.date < target!.date).sort((a, b) => b.date.localeCompare(a.date));

  const due: { muscle: string; lastTrainedDaysAgo: number }[] = [];
  for (const muscle of todayMuscles) {
    const lastDay = priorDays.find((d) => musclesWorked(d).has(muscle));
    if (!lastDay) continue;
    const gap = daysBetween(lastDay.date, target.date);
    if (gap <= MAX_LOOKBACK_DAYS) due.push({ muscle, lastTrainedDaysAgo: gap });
  }
  return due.sort((a, b) => a.lastTrainedDaysAgo - b.lastTrainedDaysAgo);
}
