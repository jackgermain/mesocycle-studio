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
/** Fat as a share of total calories, with carbs taking whatever is left. */
export const FAT_SHARE_OF_KCAL = 0.25;

/** N6. A correction needs a window long enough that real change outruns daily water swings. */
export const RATE_WINDOW_DAYS = 28;
export const MIN_RATE_SPAN_DAYS = 10;
export const MIN_RATE_POINTS = 4;

export type MaintenanceBasis = "katch" | "bodyweight";

export interface BodyInputs {
  bodyweightLb: number;
  /** Percent, 0-100. Absent is common and must stay usable -- it only downgrades the formula. */
  bodyFatPct?: number;
  /** Training sessions per week, from intake. Drives the activity multiplier. */
  sessionsPerWeek?: number;
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
 * Katch-McArdle (370 + 21.6 × lean kg) when body fat is known, because it needs no sex -- and the app stores
 * none, which rules out Mifflin-St Jeor entirely. Falls back to calories-per-pound when it isn't. */
export function estimateMaintenance(i: BodyInputs): MaintenanceEstimate {
  const mult = activityMultiplier(i.sessionsPerWeek);
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
export function macrosFor(kcal: number, bodyweightLb: number, ratePctPerWeek?: number): Macros {
  const protein = Math.round(bodyweightLb * proteinPerLb(ratePctPerWeek));
  const fat = Math.round((kcal * FAT_SHARE_OF_KCAL) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { kcal, protein, carbs, fat };
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
    macros: macrosFor(targetKcal, input.bodyweightLb, rate.pct),
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
