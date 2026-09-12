/** The nutrition algorithm: maintenance, the rate cap, and the targets that fall out of them.
 *
 * Doctrine is `src/generator/doctrine/nutrition-v1.md` (the N series). The short version:
 *
 *   N1  Every target is an offset from maintenance, so maintenance is computed first.
 *   N2  3,500 kcal is one pound of tissue either way -- 500/day under is a pound off a week.
 *   N3  A cut runs at no more than 0.5% of bodyweight a week...
 *   N5  ...unless they are very overweight, where there is more fat available to spend.
 *   N6  The estimate is checked against the scale, and the scale wins.
 *
 * No Supabase import and no `import.meta.env` on purpose: this is pure arithmetic so it can be tested by
 * `tests/nutritionPlan.test.mts` under Node's runner, the same way progressionProposal.ts is.
 */

/** N2. One pound of tissue -- fat or muscle, the body picks, which is what N4 is about. */
export const KCAL_PER_LB = 3500;

/** N3. The cut cap for anyone who is not very overweight, as a percent of bodyweight per week. */
export const CUT_CAP_PCT = 0.5;

/** N5. MY CALL, not Jack's: the raised cap and the body-fat percentage that unlocks it. Body fat rather
 * than BMI because BMI calls a muscular lifter obese and would hand exactly the wrong person a faster cut.
 * One threshold rather than the honest sex-split (~25% men / ~32% women) because the app stores no sex. */
export const HIGH_BF_CUT_CAP_PCT = 1.0;
export const VERY_OVERWEIGHT_BF_PCT = 30;

/** Protein, per pound of BODYWEIGHT, moving with the phase. Jack: "make it 1 g per pound, and if they're
 * in a cutting phase suggest about 1.1-1.2 g protein/lb bodyweight for cutting" and "0.85 minimum for
 * bulking".
 *
 * Bodyweight, not lean mass: the app used to set protein from lean mass so a higher-body-fat person was not
 * over-prescribed, and this deliberately overrides that.
 *
 * The ordering is the point. A surplus SPARES protein — there are calories to burn, so less of it gets used
 * for fuel and less lean tissue is at risk. A deficit is the opposite: it is exactly where muscle is spent
 * (N4), and protein is the main thing defending it. So bulking needs the least and cutting the most. */
export const PROTEIN_G_PER_LB = 1.0;
export const PROTEIN_G_PER_LB_BULK = 0.85;
export const PROTEIN_G_PER_LB_CUT_LO = 1.1;
export const PROTEIN_G_PER_LB_CUT_HI = 1.2;

/** Grams of protein per pound of bodyweight for a given rate of change. */
export function proteinPerLb(ratePctPerWeek?: number): number {
  const r = ratePctPerWeek ?? 0;
  if (r > 0.05) return PROTEIN_G_PER_LB_BULK;
  if (r >= -0.05) return PROTEIN_G_PER_LB;
  // Inside the cut band, steeper means more: 1.1 at the gentlest, 1.2 at the cap and beyond. 1.2 is the top
  // of the band and nothing goes past it.
  const steepness = Math.min(1, Math.abs(r) / CUT_CAP_PCT);
  return PROTEIN_G_PER_LB_CUT_LO + steepness * (PROTEIN_G_PER_LB_CUT_HI - PROTEIN_G_PER_LB_CUT_LO);
}
/** Fat as a share of total calories. Superseded by the per-pound band below for target-setting (N11) and
 * kept only for the older callers that still split a fixed budget by share. */
export const FAT_SHARE_OF_KCAL = 0.25;

/** N11. Fat is a band in grams per pound of bodyweight, not a share of calories, and carbs take the rest.
 *
 * Jack: "keep fats no less than 0.25g/lb and no more than .6g/lb… ideally keep it somewhere in the middle.
 * If the person gets less than 200g carbs a day keep it closer to the lower limit for fats so more carbs can
 * be stored."
 *
 * Carbs are the priority for the under-40s — "for younger folks as in aged 40 and less, prioritize
 * carbohydrates over fats" — which is spent by starting them lower in the band, not by leaving it. */
export const FAT_G_PER_LB_MIN = 0.25;
export const FAT_G_PER_LB_MAX = 0.6;
/** The "somewhere in the middle" default -- the actual midpoint of the band. */
export const FAT_G_PER_LB_MID = 0.425;
/** MY CALL, not Jack's: where the under-40s start. Roughly halfway between the floor and the middle, so
 * "prioritize carbs" costs fat something real without pinning it to the minimum before the carb rule has
 * even been consulted. */
export const FAT_G_PER_LB_YOUNG = 0.35;
/** Below this many carbs a day, fat drops to its floor to buy more of them back. */
export const CARB_FLOOR_G = 200;
/** "Aged 40 and less." Inclusive. */
export const CARB_PRIORITY_MAX_AGE = 40;

/** Grams of fat per pound of bodyweight for this person at this calorie figure.
 *
 * Two passes, because the carb rule depends on the fat answer: pick the starting point from age, see what
 * carbs that leaves, and if it leaves under 200 g drop fat to the floor and let carbs have the difference. */
export function fatPerLbFor(kcal: number, bodyweightLb: number, proteinG: number, ageYears?: number): number {
  const start = ageYears != null && ageYears <= CARB_PRIORITY_MAX_AGE ? FAT_G_PER_LB_YOUNG : FAT_G_PER_LB_MID;
  const carbsAt = (perLb: number) => carbsToHitKcal(kcal, proteinG, Math.round(perLb * bodyweightLb));
  const chosen = carbsAt(start) < CARB_FLOOR_G ? FAT_G_PER_LB_MIN : start;
  return Math.min(FAT_G_PER_LB_MAX, Math.max(FAT_G_PER_LB_MIN, chosen));
}

/** Atwater factors: what a gram of each macro is worth in calories. These are physiology, not doctrine —
 * every food label, and both food databases this app reads, are built on them. Which is exactly why the
 * targets have to obey them too: a target of 2,500 kcal made of grams that come to 2,350 is a target the
 * meal log can never hit, because the log adds its food up at 4/4/9 and always will. */
export const KCAL_PER_G_PROTEIN = 4;
export const KCAL_PER_G_CARB = 4;
export const KCAL_PER_G_FAT = 9;

/** The calories a set of macros actually is. There is no second opinion about this number: calories are not
 * a fifth thing to be set alongside the grams, they are what the grams come to. */
export function kcalFromMacros(m: { protein: number; carbs: number; fat: number }): number {
  return Math.round(m.protein * KCAL_PER_G_PROTEIN + m.carbs * KCAL_PER_G_CARB + m.fat * KCAL_PER_G_FAT);
}

/** Carbs that make protein + carbs + fat come to `kcal`.
 *
 * Carbs are the give: protein is prescribed from bodyweight (N7) and fat is a share of the budget, so when a
 * calorie figure is what moved, carbs are what absorbs it — the same order macrosFor already fills them in.
 *
 * Floored at zero, which means a calorie figure below protein + fat alone is not reachable. The caller must
 * show the real total in that case rather than the one that was asked for; see NutritionForm.
 *
 * Whole grams are also granular: a carb gram is 4 kcal, so only totals 4 apart are reachable and a request
 * that falls between two of them lands up to 2 kcal away. That difference is visible -- ask for 1,800 and the
 * calorie line reads 1,802 -- and it is meant to be. The line always shows what the grams come to; showing
 * the figure that was typed while the grams said otherwise is the bug this whole file exists to prevent. */
export function carbsToHitKcal(kcal: number, protein: number, fat: number): number {
  return Math.max(0, Math.round((kcal - protein * KCAL_PER_G_PROTEIN - fat * KCAL_PER_G_FAT) / KCAL_PER_G_CARB));
}

/** N6. A correction needs a window long enough that real change outruns daily water swings. */
export const RATE_WINDOW_DAYS = 28;
export const MIN_RATE_SPAN_DAYS = 10;
export const MIN_RATE_POINTS = 4;

export type MaintenanceBasis = "mifflin" | "katch" | "bodyweight";

/** Biological sex, and only ever for the arithmetic that needs it.
 *
 * Mifflin-St Jeor's two forms differ by a flat 166 kcal, so the formula cannot be evaluated without this.
 * The app deliberately stored none until now -- which is exactly why maintenance used Katch-McArdle -- and
 * Jack's ruling to adopt Mifflin-St Jeor is what added it. */
export type Sex = "male" | "female";

export interface BodyInputs {
  bodyweightLb: number;
  /** Percent, 0-100. Absent is common and must stay usable -- it only downgrades the formula. */
  bodyFatPct?: number;
  /** Training sessions per week, from intake. Drives the activity multiplier when no PAL is chosen. */
  sessionsPerWeek?: number;
  /** Mifflin-St Jeor's three extra inputs. All three are needed together or none of them are usable, and
   * every account saved before today arrives without them -- HYDRATE replaces `profile` wholesale. */
  sex?: Sex;
  ageYears?: number;
  heightCm?: number;
  /** The physical-activity level they picked. Overrides the sessions-per-week guess when present. */
  activity?: ActivityLevel;
}

/** Physical Activity Level, the multiplier on BMR that turns it into a day's burn. Jack's five tiers. */
export type ActivityLevel = "sedentary" | "light" | "moderate" | "very" | "extra";

export const PAL: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
  extra: 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Little or no exercise",
  light: "Light exercise, 1–3 days a week",
  moderate: "Moderate exercise, 3–5 days a week",
  very: "Hard exercise, 6–7 days a week",
  extra: "Very hard exercise, or a physical job",
};

export const LB_PER_KG = 2.2046226218;

export function lbToKg(lb: number): number {
  return lb / LB_PER_KG;
}

export function feetInchesToCm(feet: number, inches: number): number {
  return round((feet * 12 + inches) * 2.54, 1);
}

/** Read a height out of the free-text `heightLabel` the app has always stored.
 *
 * That field is an unvalidated string typed by hand in two different screens, so it genuinely arrives as
 * `5' 11"`, `5'11`, `5 ft 11`, `71`, `180cm` or empty. Returns cm, or null when nothing usable is in there --
 * null is a normal answer and the caller must fall back rather than treat it as zero.
 *
 * A bare number is ambiguous, so it is read the way the value's own size implies: under 96 is inches (8 ft
 * is taller than anyone), at or above 96 is centimetres. */
export function parseHeightToCm(label: string | undefined): number | null {
  if (!label) return null;
  const s = label.trim().toLowerCase();
  if (!s) return null;

  const cm = s.match(/^([\d.]+)\s*(?:cm|centimet(?:er|re)s?)$/);
  if (cm) {
    const n = parseFloat(cm[1]);
    return Number.isFinite(n) && n > 0 ? round(n, 1) : null;
  }

  // Feet and inches, in the several shapes the field actually contains.
  const ftIn = s.match(/^(\d+)\s*(?:'|’|ft|feet|f)\s*(\d+(?:\.\d+)?)?\s*(?:"|”|''|in|inch(?:es)?)?$/);
  if (ftIn) {
    const feet = parseInt(ftIn[1], 10);
    const inches = ftIn[2] ? parseFloat(ftIn[2]) : 0;
    return feet > 0 || inches > 0 ? feetInchesToCm(feet, inches) : null;
  }

  const bare = s.match(/^([\d.]+)$/);
  if (bare) {
    const n = parseFloat(bare[1]);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n < 96 ? round(n * 2.54, 1) : round(n, 1);
  }
  return null;
}

/** Mifflin-St Jeor. Jack's ruling, and the two forms differ only by their constant.
 *
 *   men:   10 × kg + 6.25 × cm − 5 × age + 5
 *   women: 10 × kg + 6.25 × cm − 5 × age − 161 */
export function mifflinStJeorBmr(i: { bodyweightLb: number; heightCm: number; ageYears: number; sex: Sex }): number {
  const base = 10 * lbToKg(i.bodyweightLb) + 6.25 * i.heightCm - 5 * i.ageYears;
  return base + (i.sex === "male" ? 5 : -161);
}

export function round(n: number, dp = 0): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

/** Lean body mass. The one input Katch-McArdle needs, and the basis for protein. */
export function leanMassLb(bodyweightLb: number, bodyFatPct: number): number {
  const bf = Math.min(75, Math.max(0, bodyFatPct));
  return round(bodyweightLb * (1 - bf / 100), 1);
}

/** Harris-Benedict style activity factors, keyed on how often they actually train.
 *
 * Unknown deliberately lands on the low side of the middle: over-estimating maintenance produces a "deficit"
 * that is not one and the person simply does not lose, which is harder to diagnose than losing slightly fast.
 * Either way N6 is what fixes it -- this is a starting point, not a measurement. */
export function activityMultiplier(sessionsPerWeek?: number): number {
  if (sessionsPerWeek == null) return 1.375;
  if (sessionsPerWeek <= 1) return 1.2;
  if (sessionsPerWeek <= 3) return 1.375;
  if (sessionsPerWeek <= 5) return 1.55;
  return 1.725;
}

/** Calories per pound of bodyweight, for the fallback when body fat is unknown. */
function kcalPerLbFallback(sessionsPerWeek?: number): number {
  if (sessionsPerWeek == null) return 14;
  if (sessionsPerWeek <= 1) return 12;
  if (sessionsPerWeek <= 3) return 14;
  if (sessionsPerWeek <= 5) return 15;
  return 16;
}

export interface MaintenanceEstimate {
  kcal: number;
  basis: MaintenanceBasis;
  /** Only meaningful on the katch basis. */
  bmr: number | null;
  multiplier: number | null;
  leanMassLb: number | null;
  how: string;
}

/** N1. Maintenance, from whatever we actually know about them.
 *
 * Mifflin-St Jeor first, which is Jack's ruling -- it needs sex, age and height together, and every account
 * saved before those fields existed arrives without them, so the older paths stay as fallbacks rather than
 * being deleted:
 *
 *   1. Mifflin-St Jeor  -- sex, age and height all present.
 *   2. Katch-McArdle    -- body fat known (needs no sex, which is why it was the original choice).
 *   3. Calories per lb  -- nothing but a scale weight.
 *
 * The activity multiplier is the PAL they picked when there is one, and otherwise the old guess from how
 * often they train. */
export function estimateMaintenance(i: BodyInputs): MaintenanceEstimate {
  const mult = i.activity ? PAL[i.activity] : activityMultiplier(i.sessionsPerWeek);

  if (i.sex && i.ageYears != null && i.ageYears > 0 && i.heightCm != null && i.heightCm > 0) {
    const bmr = mifflinStJeorBmr({ bodyweightLb: i.bodyweightLb, heightCm: i.heightCm, ageYears: i.ageYears, sex: i.sex });
    return {
      kcal: Math.round((bmr * mult) / 10) * 10,
      basis: "mifflin",
      bmr: Math.round(bmr),
      multiplier: mult,
      leanMassLb: i.bodyFatPct != null && i.bodyFatPct > 0 ? leanMassLb(i.bodyweightLb, i.bodyFatPct) : null,
      how: `Mifflin-St Jeor, ×${mult} for activity`,
    };
  }

  if (i.bodyFatPct != null && i.bodyFatPct > 0) {
    const lean = leanMassLb(i.bodyweightLb, i.bodyFatPct);
    const bmr = 370 + 21.6 * (lean / 2.2046226218);
    return {
      kcal: Math.round((bmr * mult) / 10) * 10,
      basis: "katch",
      bmr: Math.round(bmr),
      multiplier: mult,
      leanMassLb: lean,
      how: `Katch-McArdle from ${lean} lb lean mass, ×${mult} for training ${i.sessionsPerWeek ?? "?"}× a week`,
    };
  }
  const perLb = kcalPerLbFallback(i.sessionsPerWeek);
  return {
    kcal: Math.round((i.bodyweightLb * perLb) / 10) * 10,
    basis: "bodyweight",
    bmr: null,
    multiplier: null,
    leanMassLb: null,
    how: `${perLb} kcal per lb of bodyweight — add a body-fat estimate for a better number`,
  };
}

/** N3/N5. The fastest a cut may run for this person, as a percent of bodyweight per week. */
export function cutCapPct(bodyFatPct?: number): number {
  return bodyFatPct != null && bodyFatPct >= VERY_OVERWEIGHT_BF_PCT ? HIGH_BF_CUT_CAP_PCT : CUT_CAP_PCT;
}

export interface CappedRate {
  /** The rate actually used, percent of bodyweight per week. Negative loses. */
  pct: number;
  requested: number;
  capped: boolean;
  /** The cap that applied, as a positive percent. */
  cap: number;
}

/** N3. Bring a requested rate back inside the cap.
 *
 * Only losing is capped: Jack specified the arithmetic for a surplus but never a ceiling on one, so nothing
 * here limits a bulk. That gap is listed in the doctrine's "still to rule on". */
export function applyRateCap(requestedPct: number, bodyFatPct?: number): CappedRate {
  const cap = cutCapPct(bodyFatPct);
  if (requestedPct >= 0) return { pct: requestedPct, requested: requestedPct, capped: false, cap };
  const pct = Math.max(requestedPct, -cap);
  return { pct, requested: requestedPct, capped: pct !== requestedPct, cap };
}

/** N2. Pounds a week that a given percent-of-bodyweight rate comes to. */
export function weeklyChangeLb(bodyweightLb: number, ratePct: number): number {
  return round((bodyweightLb * ratePct) / 100, 2);
}

/** N2. The daily calorie delta that produces a given weekly pound change -- the number a person acts on. */
export function dailyDeltaKcal(lbPerWeek: number): number {
  return Math.round((lbPerWeek * KCAL_PER_LB) / 7);
}

export interface Macros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** Protein from lean mass, fat as a share of calories, carbs take the remainder.
 *
 * Protein is floored rather than allowed to squeeze: in a steep deficit the calorie budget can be small
 * enough that a quarter to fat plus a gram per lb lean leaves negative carbs, and the answer there is fewer
 * carbs, never less protein. */
export function macrosFor(kcal: number, bodyweightLb: number, ratePctPerWeek?: number, ageYears?: number): Macros {
  const protein = Math.round(bodyweightLb * proteinPerLb(ratePctPerWeek));
  const fat = Math.round(fatPerLbFor(kcal, bodyweightLb, protein, ageYears) * bodyweightLb);
  const carbs = carbsToHitKcal(kcal, protein, fat);
  // The true sum of the grams above, not the `kcal` that was asked for. Rounding each macro to a whole gram
  // moves the total by a few calories, and floored carbs can move it a lot; reporting the requested figure
  // here would ship a Macros object whose own four numbers disagree. `targetKcal` on the Plan is still what
  // was aimed at -- this is what was actually prescribed.
  return { kcal: kcalFromMacros({ protein, carbs, fat }), protein, carbs, fat };
}

export interface PlanInput extends BodyInputs {
  /** Desired rate, percent of bodyweight per week. Negative loses, positive gains, 0 maintains. */
  ratePctPerWeek: number;
  /** A known maintenance number (from N6's correction, or a coach's own figure) overriding the estimate. */
  maintenanceKcal?: number;
}

export interface Plan {
  maintenance: MaintenanceEstimate;
  maintenanceKcal: number;
  rate: CappedRate;
  lbPerWeek: number;
  dailyDelta: number;
  targetKcal: number;
  macros: Macros;
  direction: "cut" | "gain" | "maintain";
  label: string;
  /** Present when the requested rate was brought back to the cap -- the sentence the person should see. */
  cappedNote?: string;
}

export function rateLabel(ratePct: number, lbPerWeek: number): string {
  if (ratePct === 0) return "Maintenance";
  const s = (n: number) => (n > 0 ? `+${n}` : `${n}`);
  return `${s(round(ratePct, 2))}% BW / wk (${s(lbPerWeek)} lb/wk)`;
}

/** The whole calculation, start to finish. */
export function buildPlan(input: PlanInput): Plan {
  const maintenance = estimateMaintenance(input);
  const maintenanceKcal = input.maintenanceKcal ?? maintenance.kcal;
  const rate = applyRateCap(input.ratePctPerWeek, input.bodyFatPct);
  const lbPerWeek = weeklyChangeLb(input.bodyweightLb, rate.pct);
  const dailyDelta = dailyDeltaKcal(lbPerWeek);
  const targetKcal = Math.max(1000, Math.round((maintenanceKcal + dailyDelta) / 10) * 10);
  return {
    maintenance,
    maintenanceKcal,
    rate,
    lbPerWeek,
    dailyDelta,
    targetKcal,
    // Age is threaded through because N11's fat band starts lower for the under-40s. Without it the plan
    // path would silently prescribe the over-40 split to everybody.
    macros: macrosFor(targetKcal, input.bodyweightLb, rate.pct, input.ageYears),
    direction: rate.pct < 0 ? "cut" : rate.pct > 0 ? "gain" : "maintain",
    label: rateLabel(rate.pct, lbPerWeek),
    cappedNote: rate.capped
      ? `Asked for ${round(rate.requested, 2)}% a week — held at ${rate.cap}% to protect muscle` +
        (rate.cap === CUT_CAP_PCT ? "." : " (raised, since body fat is high enough to spend faster).")
      : undefined,
  };
}

// ---- N6: what the scale actually says -------------------------------------

export interface ObservedRate {
  lbPerWeek: number;
  pctPerWeek: number;
  spanDays: number;
  points: number;
  from: string;
  to: string;
}

function daysBetween(a: string, b: string): number {
  const ms = Date.parse(`${b}T00:00:00`) - Date.parse(`${a}T00:00:00`);
  return Math.round(ms / 86400000);
}

/** N6. The rate the scale says, by least squares against the DATES.
 *
 * Two things here are the rule rather than taste. Dates, not the count of weigh-ins: someone who misses half
 * of theirs has fewer points over the same elapsed time, and dividing by the count makes their loss look
 * slower than it is. And a fit across every point rather than first-versus-last, because a single high
 * morning at either end of the window would otherwise set the whole trend. */
export function observedRate(
  weighIns: { date: string; weight: number }[],
  windowDays = RATE_WINDOW_DAYS,
  today = new Date(),
): ObservedRate | null {
  if (!weighIns.length) return null;
  const sorted = [...weighIns].sort((a, b) => a.date.localeCompare(b.date));
  const last = sorted[sorted.length - 1];
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - windowDays);
  const cutoffIso = cutoff.toISOString().slice(0, 10);
  const win = sorted.filter((w) => w.date >= cutoffIso);
  if (win.length < MIN_RATE_POINTS) return null;

  const first = win[0];
  const span = daysBetween(first.date, win[win.length - 1].date);
  if (span < MIN_RATE_SPAN_DAYS) return null;

  const xs = win.map((w) => daysBetween(first.date, w.date));
  const ys = win.map((w) => w.weight);
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  if (den === 0) return null;
  const slopePerDay = num / den;
  const lbPerWeek = round(slopePerDay * 7, 2);
  const reference = my || last.weight;
  return {
    lbPerWeek,
    pctPerWeek: round((lbPerWeek / reference) * 100, 2),
    spanDays: span,
    points: n,
    from: first.date,
    to: win[win.length - 1].date,
  };
}

export interface MaintenanceCorrection {
  /** What maintenance looks like given what actually happened. */
  correctedKcal: number;
  /** Positive means the old estimate was too low. */
  deltaKcal: number;
  observed: ObservedRate;
  intendedLbPerWeek: number;
  note: string;
}

/** N6. The gap between the loss they intended and the loss they got IS the error in the maintenance
 * estimate, converted back through N2's 3,500 kcal per pound.
 *
 * Losing faster than intended means maintenance was under-estimated, so the corrected number is higher and
 * the target rises with it. */
export function correctMaintenance(
  currentMaintenanceKcal: number,
  intendedLbPerWeek: number,
  observed: ObservedRate | null,
): MaintenanceCorrection | null {
  if (!observed) return null;
  const missLbPerWeek = observed.lbPerWeek - intendedLbPerWeek;
  const deltaKcal = -Math.round((missLbPerWeek * KCAL_PER_LB) / 7);
  if (Math.abs(deltaKcal) < 25) return null;
  const faster = missLbPerWeek < 0;
  return {
    correctedKcal: Math.round((currentMaintenanceKcal + deltaKcal) / 10) * 10,
    deltaKcal,
    observed,
    intendedLbPerWeek,
    note:
      `Scale says ${observed.lbPerWeek > 0 ? "+" : ""}${observed.lbPerWeek} lb/wk over ${observed.spanDays} days, ` +
      `aimed at ${intendedLbPerWeek > 0 ? "+" : ""}${intendedLbPerWeek} — ` +
      (faster ? "losing faster than planned, so maintenance was under-estimated" : "slower than planned, so maintenance was over-estimated"),
  };
}

/** N4. Losing faster than the cap is not being ahead of schedule, it is spending muscle. */
export function isCuttingTooFast(observed: ObservedRate | null, bodyFatPct?: number): boolean {
  if (!observed) return false;
  return observed.pctPerWeek < -cutCapPct(bodyFatPct);
}

export type Phase = "cut" | "gain" | "hold";

export interface PhaseStatus {
  phase: Phase;
  /** "Cutting" / "Gaining" / "Holding" — what to put on the chip. */
  label: string;
  targetPct: number;
  /** What the scale says, or null when there is not enough of it yet to say anything honest. */
  observed: ObservedRate | null;
  capPct: number;
  /** How much of the cap the actual rate is using, 0..1 and beyond. Null unless cutting with data. */
  capUsed: number | null;
  tooFast: boolean;
}

/** Which direction they are going, how fast, and whether that is inside the cap.
 *
 * The direction comes from the rate they SET, not from the scale: someone holding weight on a deliberate
 * cut is failing at a cut, not maintaining, and the screen should say so. The rate comes from the scale,
 * because that is the only honest source for what is actually happening. */
export function phaseStatus(
  ratePctPerWeek: number | undefined,
  bodyFatPct: number | undefined,
  weighIns: { date: string; weight: number }[],
  today: Date = new Date(),
): PhaseStatus {
  const target = ratePctPerWeek ?? 0;
  // A hair either side of zero is maintenance, not a half-hearted cut.
  const phase: Phase = target < -0.05 ? "cut" : target > 0.05 ? "gain" : "hold";
  const capPct = cutCapPct(bodyFatPct);
  const observed = observedRate(weighIns, RATE_WINDOW_DAYS, today);
  return {
    phase,
    label: phase === "cut" ? "Cutting" : phase === "gain" ? "Gaining" : "Holding",
    targetPct: target,
    observed,
    capPct,
    capUsed: observed && phase === "cut" ? Math.max(0, -observed.pctPerWeek) / capPct : null,
    tooFast: isCuttingTooFast(observed, bodyFatPct),
  };
}

// ---- N12: correcting the intake from what the scale actually did -----------

/** N12. How much to move calories by, and when.
 *
 * Jack: "If there is no weight gain or loss after the second week… if the goal is to lose weight, pull 150
 * calories starting from fats and/or carbs. Same thing goes if trying to gain except increase 150… Once they
 * are either gaining or losing, if they taper down on progress 1 week add 75 calories if gaining or pull 75
 * calories if losing."
 *
 * This is the first rule that changes what somebody eats without being asked, which is why it is gated on
 * `autoNutrition` at the call site and why every threshold it needs is named and overturnable here. */
export const STALL_ADJUST_KCAL = 150;
export const TAPER_ADJUST_KCAL = 75;
/** "After the second week" — a stall cannot be called before there are two weeks of scale to call it on. */
export const STALL_MIN_SPAN_DAYS = 14;
/** MY CALL: what counts as "no weight gain or loss". Daily bodyweight swings on water and food volume are
 * larger than a week of real change, so this is a rate band around zero rather than a literal zero. */
export const STALL_PCT_PER_WEEK = 0.1;
/** MY CALL: "taper down on progress" — the recent trend has fallen to under half of the fuller one. */
export const TAPER_FRACTION = 0.5;
/** The shorter window the recent trend is read over, against RATE_WINDOW_DAYS for the fuller one. */
export const TAPER_WINDOW_DAYS = 14;

export type AdjustmentKind = "stall" | "taper";

export interface IntakeAdjustment {
  kind: AdjustmentKind;
  /** Signed, and already pointing the right way: negative pulls calories, positive adds them. */
  deltaKcal: number;
  observed: ObservedRate;
  note: string;
}

/** N12. Whether the intake should move, and by how much. Null means leave it alone. */
export function intakeAdjustment(args: {
  goal: "lose" | "gain";
  weighIns: { date: string; weight: number }[];
  today?: Date;
}): IntakeAdjustment | null {
  const today = args.today ?? new Date();
  const losing = args.goal === "lose";
  const overall = observedRate(args.weighIns, RATE_WINDOW_DAYS, today);
  if (!overall || overall.spanDays < STALL_MIN_SPAN_DAYS) return null;

  // A stall: two weeks in and the scale has not moved either way.
  if (Math.abs(overall.pctPerWeek) < STALL_PCT_PER_WEEK) {
    return {
      kind: "stall",
      deltaKcal: losing ? -STALL_ADJUST_KCAL : STALL_ADJUST_KCAL,
      observed: overall,
      note: `Two weeks with the scale flat, so ${losing ? "pull" : "add"} ${STALL_ADJUST_KCAL} calories.`,
    };
  }

  // Moving the wrong way entirely is not a stall and not a taper -- it is a bigger problem than 150 calories
  // and belongs in front of a person, not in an automatic nudge.
  const movingRightWay = losing ? overall.pctPerWeek < 0 : overall.pctPerWeek > 0;
  if (!movingRightWay) return null;

  const recent = observedRate(args.weighIns, TAPER_WINDOW_DAYS, today);
  if (!recent) return null;
  if (Math.abs(recent.pctPerWeek) < Math.abs(overall.pctPerWeek) * TAPER_FRACTION) {
    return {
      kind: "taper",
      deltaKcal: losing ? -TAPER_ADJUST_KCAL : TAPER_ADJUST_KCAL,
      observed: recent,
      note: `Progress has tapered off this week, so ${losing ? "pull" : "add"} ${TAPER_ADJUST_KCAL} calories.`,
    };
  }
  return null;
}

/** Apply a calorie change to a set of macros without touching protein.
 *
 * "Starting from fats and/or carbs" -- so fat moves first, down to its floor or up to its ceiling, and carbs
 * absorb whatever is left over. Protein is prescribed from bodyweight by N7 and is never what gives. */
export function applyAdjustment(m: Macros, deltaKcal: number, bodyweightLb: number): Macros {
  const targetKcal = Math.max(0, m.kcal + deltaKcal);
  const fatFloor = Math.round(FAT_G_PER_LB_MIN * bodyweightLb);
  const fatCeil = Math.round(FAT_G_PER_LB_MAX * bodyweightLb);
  const wantedFatChange = Math.round(deltaKcal / KCAL_PER_G_FAT);
  const fat = Math.min(fatCeil, Math.max(fatFloor, m.fat + wantedFatChange));
  const carbs = carbsToHitKcal(targetKcal, m.protein, fat);
  return { kcal: kcalFromMacros({ protein: m.protein, carbs, fat }), protein: m.protein, carbs, fat };
}
