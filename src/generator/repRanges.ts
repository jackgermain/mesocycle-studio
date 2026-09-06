/** The rep zones, and what each one is for.
 *
 * This replaces a working assumption that ran through the whole engine for a while -- that 8-12 was the
 * band for everything. Asked directly, Jack: *"eight to twelve rep band for everything is not, uh, true
 * at all."*
 *
 * > *"If we're talking peak strength rep range, we're looking at one to five reps, and in most cases one
 * > to three. Our middle strength range is between three and six reps. Then I would call the lower
 * > hypertrophy phase -- discluding seven -- but **eight to twelve is a gold standard for hypertrophy,
 * > which is a very common goal for most individuals.** The middle hypertrophy range is between twelve
 * > and fifteen, and the upper hypertrophy range is fifteen to twenty. And twenty to thirty is reserved
 * > pretty much strictly for cluster sets, or crazy forearm training, or calf raises."*
 *
 * **Seven belongs to no zone**, which is not the same as being forbidden -- an earlier version of this
 * file had it as a rep count he avoids, and that was wrong. It sits between the top of middle strength
 * and the bottom of lower hypertrophy and is named by neither, but he writes it freely in transit: his
 * ascending hypertrophy block runs 3x6, **3x7**, 4x8, 4x10. So a set of seven is a legal, ordinary thing
 * to prescribe; it just isn't the name of a training zone.
 */

export type RepZone =
  | "peak-strength"
  | "strength"
  | "lower-hypertrophy"
  | "mid-hypertrophy"
  | "upper-hypertrophy"
  | "metabolic";

export interface ZoneSpec {
  zone: RepZone;
  label: string;
  min: number;
  max: number;
  /** Where inside the band he actually spends most of the time, when he narrowed it. */
  typical?: [number, number];
  /** True where the zone also trains muscular endurance. Not a separate zone -- a second quality the
   * same sets buy. *"Add to the upper hypertrophy range as muscular endurance. And metabolic as well is
   * definitely some endurance, that being the twenty-thirty rep range."* */
  endurance?: boolean;
  note: string;
}

/** Ordered light-to-heavy is the wrong way round for reps, so this runs low reps first, which is the
 * order he said them in and the order they sit on the intensity table. */
export const REP_ZONES: ZoneSpec[] = [
  {
    zone: "peak-strength",
    label: "Peak strength",
    min: 1,
    max: 5,
    typical: [1, 3],
    note: "Below C3's hypertrophy floor. Load is high enough that C6's cap binds -- a triple stops at RPE 9.",
  },
  {
    zone: "strength",
    label: "Middle strength",
    min: 3,
    max: 6,
    note: "Overlaps peak strength at 3-5. Where Model B's bridge block finishes.",
  },
  {
    zone: "lower-hypertrophy",
    label: "Lower hypertrophy",
    min: 8,
    max: 12,
    note: "The gold standard, and the common goal for most people. Seven is deliberately excluded.",
  },
  {
    zone: "mid-hypertrophy",
    label: "Middle hypertrophy",
    min: 12,
    max: 15,
    note: "",
  },
  {
    zone: "upper-hypertrophy",
    label: "Upper hypertrophy / muscular endurance",
    min: 15,
    max: 20,
    endurance: true,
    note: "Where his own sessions finish -- the last slot averages 20.6 reps. Also trains muscular endurance.",
  },
  {
    zone: "metabolic",
    label: "Cluster / metabolic / endurance",
    min: 20,
    max: 30,
    endurance: true,
    note: "Reserved for cluster sets, forearms and calves. Definitely endurance work too.",
  },
];

/** Rep counts that belong to no named zone. Seven is the only one. Legal to prescribe -- it simply has
 * no zone name, so `zoneFor` returns undefined rather than a label. */
export const UNZONED_REPS = [7];

export function isUnzonedRepCount(reps: number): boolean {
  return UNZONED_REPS.includes(reps);
}

/** Which zone a rep count belongs to.
 *
 * The bands overlap at their edges -- 3 to 5 is in both peak strength and middle strength, 12 is in both
 * lower and middle hypertrophy -- and the **lower** zone wins, because that is the order he named them
 * in and it keeps the two headline claims intact: "one to five, and in most cases one to three" for peak
 * strength, and "eight to twelve is a gold standard" for hypertrophy. Preferring the narrower band
 * instead would put a triple in middle strength and a set of twelve outside the gold standard. */
export function zoneFor(reps: number): RepZone | undefined {
  if (isUnzonedRepCount(reps)) return undefined;
  return REP_ZONES.find((z) => reps >= z.min && reps <= z.max)?.zone;
}

export function specFor(zone: RepZone): ZoneSpec {
  return REP_ZONES.find((z) => z.zone === zone)!;
}

/** Is this rep count hypertrophy work at all? C3 says 6-30; the zones say the useful part is 8-20. */
export function isHypertrophy(reps: number): boolean {
  const z = zoneFor(reps);
  return z === "lower-hypertrophy" || z === "mid-hypertrophy" || z === "upper-hypertrophy";
}

/** Which lever to pull, decided by what one rep actually costs.
 *
 * > *"The five rep range and below, you can't just add a rep, because the percentage increase in that is
 * > so high. If you're doing four reps and you try to add a rep next time, and you're already at, like,
 * > RPE eight, that's a twenty percent increase in stress that you're adding in one session with a very
 * > heavy load, and you can very easily hurt yourself. But it's easier just to add a little bit more
 * > weight on it and have the total stress significantly less with a similar amount of volume in terms of
 * > total reps from the last session. Being able to use reps as a modality is a bit better in the rep
 * > range of six and up, and even more so from the ten up, and definitely so the fifteen to twenty --
 * > just because the percentage increase is so much smaller."*
 *
 * This is the exchange rate from Model C turned into a safety rule. One rep is `100/reps` percent of the
 * set, so at five reps it is a **20% jump in a single session under a heavy bar**, and at twenty reps it
 * is 5%. The rep lever is not merely less useful at low reps -- it is the dangerous one.
 *
 * It also explains C8's floors from the stress side rather than as a list: the exercises allowed below
 * six reps are exactly the ones where the load lever is available in small enough increments to be used
 * instead. */
export function repCostPct(reps: number): number {
  return reps > 0 ? 100 / reps : Infinity;
}

/** Above this, adding a rep is too large a single-session jump to be the default lever. */
export const REP_LEVER_MAX_COST_PCT = 20;

export function isRepLeverSafe(reps: number): boolean {
  return repCostPct(reps) < REP_LEVER_MAX_COST_PCT;
}

export type LeverPreference = "load-only" | "either" | "reps-preferred" | "reps-strongly-preferred";

export function leverPreferenceFor(reps: number): LeverPreference {
  if (reps <= 5) return "load-only";
  if (reps < 10) return "either";
  if (reps < 15) return "reps-preferred";
  return "reps-strongly-preferred";
}

/** Zones that train muscular endurance alongside their primary quality. */
export function isEndurance(reps: number): boolean {
  const z = zoneFor(reps);
  return !!z && !!specFor(z).endurance;
}

/** The band to write for a given goal, when nothing more specific is known. Lower hypertrophy is the
 * default because it is his stated gold standard and "a very common goal for most individuals";
 * endurance maps to the upper hypertrophy band, which is where that quality actually lives. */
export function defaultBandFor(goal: "strength" | "hypertrophy" | "endurance"): [number, number] {
  if (goal === "strength") return [3, 6];
  if (goal === "endurance") return [15, 20];
  return [8, 12];
}
