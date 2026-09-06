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
 * **Seven is a deliberate gap**, not an oversight -- it sits between the top of middle strength and the
 * bottom of lower hypertrophy and belongs to neither. Worth knowing because the relative intensity table
 * interpolates rows for 7 and 9: 9 fills a hole in the source data, but 7 is a rep count he avoids.
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

/** Rep counts he actively avoids. Seven is the only one, and it is a real gap rather than rounding. */
export const AVOIDED_REPS = [7];

export function isAvoidedRepCount(reps: number): boolean {
  return AVOIDED_REPS.includes(reps);
}

/** Which zone a rep count belongs to.
 *
 * The bands overlap at their edges -- 3 to 5 is in both peak strength and middle strength, 12 is in both
 * lower and middle hypertrophy -- and the **lower** zone wins, because that is the order he named them
 * in and it keeps the two headline claims intact: "one to five, and in most cases one to three" for peak
 * strength, and "eight to twelve is a gold standard" for hypertrophy. Preferring the narrower band
 * instead would put a triple in middle strength and a set of twelve outside the gold standard. */
export function zoneFor(reps: number): RepZone | undefined {
  if (isAvoidedRepCount(reps)) return undefined;
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
