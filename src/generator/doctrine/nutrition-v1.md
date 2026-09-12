# Nutrition doctrine, v1

The **N** series. Training doctrine lives in `v1.md` (C and P rules) and `exercises-v1.md` (G rules); nothing
about food had been written down before this file, so the numbers below are the first of them.

Every rule here is Jack's, quoted. Where a threshold was needed that he has not ruled on, it is marked
**MY CALL** and it is his to overturn.

---

**N1 — Everything is an offset from maintenance, so maintenance is the first number.**

> *"To put into context, after finding maintenance calories — which we will make a calculator for — 500
> calories below that number 7 days per week will result in 1 pound weight per week."*

There is no such thing as a target calorie number in the abstract. A target is maintenance plus or minus a
deliberate amount, which means a wrong maintenance estimate makes every downstream number wrong in the same
direction.

**Rule — nothing is prescribed until maintenance is estimated.** The estimate is a starting point, not a
measurement, which is why N6 exists.

**N2 — 3,500 kcal is one pound of tissue, in either direction.**

> *"3500 calories is = 1lb of tissue fat or muscle... 500 calories above that maintenance will be 1lb gain
> per week."*

**Rule — a steady daily delta compounds at 3,500 kcal per pound.** 500 under, seven days a week, is a pound
off. 500 over is a pound on. The arithmetic is symmetric and the app should never present it as though losing
and gaining obey different maths.

**Rule — the unit that matters is the *daily* delta,** because that is the number a person acts on. The
weekly pound is the consequence, not the instruction.

**N3 — A cut runs at no more than 0.5% of bodyweight per week.**

> *"Anytime someone is losing weight and is not very overweight, to lose no more than 0.5% total bodyweight
> per week."*

**Rule — cap the loss rate at 0.5% of bodyweight per week.** Not a fixed pound-per-week number: half a percent
is 0.7 lb at 140 lb and 1.25 lb at 250 lb, and a flat "1 lb a week" is a gentle cut for one person and an
aggressive one for the other.

**Rule — the cap binds on the *request*, not just on the advice.** A rate set past the cap is brought back to
it and the person is told it was, rather than being allowed to prescribe something the doctrine forbids.

**N4 — The cap exists to keep muscle, which is what makes it a hypertrophy rule rather than a diet rule.**

> *"This is for people trying to cut and preserve muscle mass."*

**Rule — the faster the cut, the more of the loss is lean tissue.** N2 is deliberately blunt that 3,500 kcal
is a pound of "fat or muscle" — the body chooses which, and rate is the main thing tipping that choice.

**Rule — a cut that outruns the cap is failing at its own goal.** Somebody losing 1.5% a week is not ahead of
schedule; they are spending muscle to get there.

**N5 — "Very overweight" lifts the cap, because there is more fat available to lose.**

> *"...and is not very overweight..."*

Somebody carrying a lot of fat can run a steeper deficit without the same muscle cost, because the fat itself
supplies more of the energy.

**Rule — above the threshold the cap rises to 1% of bodyweight per week. MY CALL: 30% body fat is the
threshold, and 1% is the raised cap.** Neither number is Jack's. Two things make this the weakest rule in the
file and both are worth his ruling:

- **Body fat, not BMI.** BMI calls a muscular lifter obese, which would hand exactly the wrong person a
  faster cut. Body-fat percentage is already collected by the protein calculator, so it costs no new intake.
- **One threshold for everyone.** The honest version is sex-split — roughly 25% for men and 32% for women —
  but **the app stores no sex anywhere**, so a split threshold cannot be computed today. A single 30% figure
  is the compromise; adding sex to intake is the fix.

**N6 — The estimate is checked against the scale, and the scale wins.**

An estimated maintenance is a guess built on population averages. The person's own weigh-ins are a
measurement of the same quantity, and they disagree often.

**Rule — compare the rate actually observed against the rate intended.** If someone aimed at −0.5%/week and
the scale says −1.1%/week, maintenance was under-estimated and the target is too low.

**Rule — correct maintenance from the observed rate, not the target.** The gap between intended and observed
loss, converted back through N2's 3,500 kcal, *is* the error in the maintenance estimate.

**Rule — measure the rate against dates, never against the number of weigh-ins.** Someone who misses half
their weigh-ins has fewer data points over the same elapsed time, and counting entries instead of days makes
their loss look slower than it is — which would then feed a correction in the wrong direction.

**Rule — do not correct on noise.** Daily bodyweight swings on water and food volume are larger than a week
of real loss. A correction needs a window long enough and a fit across all the points in it, not a comparison
of the first weigh-in to the last.

---

## Still to rule on

1. **The N5 threshold and raised cap** — 30% body fat and 1%/week are both mine.
2. **No sex is stored**, which forces both the single N5 threshold and the choice of maintenance formula
   (Katch-McArdle from lean mass, since Mifflin-St Jeor needs sex).
3. **Gaining has no cap.** Jack specified the arithmetic for a surplus but no ceiling on it, so nothing
   currently stops a bulk being set at +2%/week. A lean-gain cap is the obvious counterpart to N3.
4. **Protein in a deficit.** The app already sets protein at ~1 g per lb of lean mass. A hard cut is where
   that matters most, and whether it should rise when the deficit is steeper is unruled.
