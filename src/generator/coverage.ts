/** What gets trained, and what gets dropped when there isn't time.
 *
 * > *"When you have three days a week, you need to make sure you hit your most important parts first
 * > before accessories get covered. If you've got five or six days a week, you've got more time for real
 * > customisation in prioritising small body parts... No matter what, you have to have your pushes, you
 * > have to have your pulls, you have to have your compound exercises, and you need to do those well,
 * > because they provide so much stimulus for the time you spend doing them."*
 *
 * So session count is a **budget**, and the budget is spent in a fixed order. The compounds are bought
 * first at every frequency; small muscles are what the leftover buys.
 *
 * The order below is measured, not guessed. Counting exercises per week by muscle across nine client
 * programs (146 weeks) plus his own 6x program (16 weeks):
 *
 * | Muscle | 2x/week | 3x/week | 6x/week |
 * |---|---|---|---|
 * | Back | 3.10 | 4.37 | 5.38 |
 * | Quads | 3.13 | 3.46 | 2.00 |
 * | Chest | 2.20 | 1.26 | 3.25 |
 * | Abs | 2.39 | 2.72 | 2.25 |
 * | Biceps | 2.59 | 2.31 | 4.50 |
 * | Triceps | 1.87 | 2.18 | 2.12 |
 * | Side delts | 1.27 | 2.38 | 1.75 |
 * | Obliques | 1.01 | 1.49 | 1.00 |
 * | Glutes | 0.10 | 0.97 | 0.12 |
 * | Hamstrings | 0.37 | 0.46 | 1.00 |
 * | **Rear delts** | **0.00** | 0.46 | 1.00 |
 * | **Traps** | **0.00** | 0.17 | 0.50 |
 * | **Forearms** | 0.08 | 0.00 | 0.62 |
 * | **Calves** | 0.03 | 0.00 | 2.25 |
 *
 * The four in bold are the luxury tier and they are the exact four he named — *"if you've got six days a
 * week you can spend a lot of time training things like forearms, traps, calves"*, and at two days
 * *"you're not gonna be doing much posterior deltoid, lower traps. Some things will be neglected."* At
 * two sessions a week rear delts and traps are **literally zero** across 71 weeks of real programming.
 */

/** The frequency at which each muscle starts getting deliberate accessory work.
 *
 * 2 and 3 and 6 are measured. **4 and 5 are his verbal ordering, not data** -- the four-day sample is
 * only ten weeks from two clients and is too thin to rank: *"if you've got four, you're gonna start
 * losing out on things like front deltoid, forearms."* */
export const ADMITTED_AT: Record<string, number> = {
  // Bought first at every frequency -- these are the compounds and their direct accessories.
  Chest: 2, Back: 2, Quads: 2, Abs: 2, Triceps: 2, Biceps: 2, "Side delts": 2, Obliques: 2,
  // Affordable from three sessions. Hamstrings and glutes do appear at two (0.37 and 0.10 a week) but
  // that is roughly one week in three, which is incidental rather than deliberate coverage.
  Glutes: 3, Hamstrings: 3, "Rear delts": 3,
  // The luxury tier, in the order he drops them.
  Traps: 4,
  Calves: 5,
  Forearms: 6, "Front delts": 6, Adductors: 6,
};

/** Priority order within whatever is admitted -- biggest and most stimulus-dense first, per P3 and the
 * session shape in section 7 of the doctrine. */
const PRIORITY = [
  "Chest", "Back", "Quads", "Hamstrings", "Glutes",
  "Triceps", "Biceps", "Side delts", "Rear delts", "Traps",
  "Abs", "Obliques", "Calves", "Forearms", "Front delts", "Adductors",
];

/** Which muscles get deliberate work at this training frequency, in the order they should be filled. */
export function coverageBudget(daysPerWeek: number): string[] {
  return PRIORITY.filter((m) => (ADMITTED_AT[m] ?? 99) <= daysPerWeek);
}

/** What this frequency gives up relative to training six days a week. Worth surfacing to a coach at
 * program-creation time, since it is a real cost of the schedule rather than a flaw in the plan. */
export function neglectedAt(daysPerWeek: number): string[] {
  return coverageBudget(6).filter((m) => !coverageBudget(daysPerWeek).includes(m));
}

/** Muscles small enough to close a session with. Matches the observed final slot -- high reps, low load,
 * and nothing that competes with a compound for energy. */
export const FINISHER_MUSCLES = ["Abs", "Obliques", "Calves", "Forearms"];

/** Fill the accessory and finisher slots of one day.
 *
 * `alreadyThisWeek` is what earlier days have already used, so the week spreads across the budget rather
 * than hammering the first few entries every session. The two compound slots are chosen by pattern
 * elsewhere; this only fills what is left. */
export function fillAccessories(
  count: number,
  daysPerWeek: number,
  alreadyThisWeek: Map<string, number>,
  finisherCount: number,
): { accessories: string[]; finishers: string[] } {
  const budget = coverageBudget(daysPerWeek);
  const pick = (pool: string[], n: number): string[] => {
    const out: string[] = [];
    for (let i = 0; i < n; i++) {
      // Least-used first; PRIORITY order breaks ties, so the important things come round again sooner.
      let best = pool[0];
      let bestN = Infinity;
      for (const m of pool) {
        const used = (alreadyThisWeek.get(m) ?? 0) + out.filter((x) => x === m).length;
        if (used < bestN) {
          best = m;
          bestN = used;
        }
      }
      if (!best) break;
      out.push(best);
    }
    return out;
  };
  const finisherPool = budget.filter((m) => FINISHER_MUSCLES.includes(m));
  const accessoryPool = budget.filter((m) => !FINISHER_MUSCLES.includes(m));
  const finishers = pick(finisherPool.length ? finisherPool : ["Abs"], finisherCount);
  const accessories = pick(accessoryPool, count);
  for (const m of [...accessories, ...finishers]) {
    alreadyThisWeek.set(m, (alreadyThisWeek.get(m) ?? 0) + 1);
  }
  return { accessories, finishers };
}
