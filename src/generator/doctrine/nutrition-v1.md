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

**N7 — Protein is per pound of bodyweight, and the phase moves it.**

> *"Make it 1 g per pound, and if they're in a cutting phase suggest about 1.1-1.2 g protein/lb bodyweight
> for cutting"* … *"0.85 minimum for bulking."*

| Phase | g per lb of bodyweight |
|---|---|
| Bulking | **0.85** |
| Maintenance | **1.0** |
| Cutting | **1.1 → 1.2**, steeper meaning more |

**Rule — bodyweight, not lean mass.** This overturns the app's previous rule, which set protein from lean
mass so a higher-body-fat person was not over-prescribed. Scale weight is the number now.

**Rule — the ordering is the substance.** A surplus **spares** protein: there are calories to burn, so less
of it gets used for fuel and less lean tissue is at risk. A deficit is the opposite — it is exactly where
muscle is spent (N4), and protein is the main thing defending it. **So bulking needs the least and cutting
the most.** Any implementation where a bulk demands more protein than a cut has the rule upside down.

**Rule — 1.2 is the top of the band.** A steeper cut climbs toward it and stops there; nothing goes past it.

**Rule — read protein off the *capped* rate,** not the requested one. A "fast cut" that N3 held back to 0.5%
is not actually running a steep deficit, and should not be fed as though it were.

**N8 — Calories are not a number you set. They are what the grams come to.**

> *"When setting up nutrition macros, for every gram, have the current inputted grams of protein, fat and
> carbs total the correct calorie count. If someone bumps their protein by 10 g, make sure that reflects a
> [40] cal increase in the setup."*

**The figure in that sentence was 50; it is 40.** A gram of protein is 4 calories, so ten of them are forty.
Carbs are 4 as well and fat is 9 — the Atwater factors, which is what every food label and both food
databases this app reads are built on. Building 5 kcal per gram of protein because the sentence said 50
would have put every target permanently out of step with the meal log that has to fill it. The instruction
is right and the arithmetic in the example is a slip; the instruction is what was built.

**Rule — calories = 4×protein + 4×carbs + 9×fat, with no exceptions and no second opinion.** A target of
2,500 kcal made of grams that come to 2,350 is a target nobody can hit, because the log adds food up at
4/4/9 and always will. Before this rule the setup screen held four independent numbers and the shipped
defaults were already 130 and 150 kcal out of step with their own grams.

**Rule — touch a macro and the calorie line follows it.** That is the direction the rule is stated in and
the one that matters: a person adds protein and sees what it costs.

**Rule — touch the calorie line and carbs give.** Protein is prescribed from bodyweight (N7) and fat is a
share of the budget, so carbs are the remainder — the same order the targets are built in to begin with.
Protein is never silently moved to make a calorie figure work.

**Rule — when the grams cannot reach the figure, the grams win and the screen says what they come to.**
Carbs are whole grams worth 4 kcal each, so only totals 4 apart exist: ask for 1,800 on top of 180 g protein
and 70 g fat and it lands on 1,802. Showing the 1,800 that was typed while the grams said 1,802 is precisely
the thing this rule forbids. The same holds at the floor — below protein and fat alone, carbs stop at zero
and the calorie line reads the real total, which is higher than what was asked for.

**N9 — Five named phases, and the rate that defines each one.**

> *"0.75% total bodyweight per week is a fast cut… 0.5% is a regular cut… 0 is maintenance, +0.25% = lean
> bulk, +0.5% = bulk."*

| Phase | % of bodyweight per week |
|---|---|
| Fast cut | **−0.75** |
| Cut | **−0.5** |
| Maintenance | **0** |
| Lean bulk | **+0.25** |
| Bulk | **+0.5** |

**Rule — these five are the phases the app offers.** They are the preset buttons on the rate card, and the
stepper underneath still sets anything in between.

**Rule — naming a tier is not the same as permitting it.** N3's cap is separate doctrine and still binds: a
fast cut asks for 0.75% and is held at 0.5% for anyone under N5's body-fat threshold, who is told it was
held. **Which means that today "Fast cut" and "Cut" produce identical numbers for a lean person,** and only
someone at 30%+ body fat — whose cap is 1% — actually gets 0.75%. Whether 0.75% should instead *become* the
cap for everyone is the open question below; N3's own words are "no more than 0.5%", so it is not mine to
assume either way.

**Rule — the top bulk tier is +0.5%, not the +2% the stepper allows.** Gaining still has no cap in the code
(see below), but the offered ceiling is now named.

---

## Still to rule on

1. **The N5 threshold and raised cap** — 30% body fat and 1%/week are both mine.
2. **No sex is stored**, which forces both the single N5 threshold and the choice of maintenance formula
   (Katch-McArdle from lean mass, since Mifflin-St Jeor needs sex).
3. **Gaining has no cap.** Jack specified the arithmetic for a surplus but no ceiling on it, so nothing
   currently stops a bulk being set at +2%/week. N9 now names +0.5% as the top *offered* tier, which is a
   strong hint but not a stated ceiling — the stepper still goes past it. A lean-gain cap is the obvious
   counterpart to N3.
6. **Does N9's fast cut raise N3's cap?** N9 names 0.75%/week as a fast cut; N3 says a cut runs at "no more
   than 0.5%" unless body fat is high. Both cannot be fully true for a lean person. Either the cap becomes
   0.75% and the fast cut is genuinely available, or the cap stays at 0.5% and the Fast cut button is
   identical to Cut for everyone under 30% body fat. The code currently does the latter, because that is
   what the older explicit rule says.
4. **Whether the cut band should widen.** N7 settles the numbers, but 1.1–1.2 is a narrow band and the top
   of it is reached at the ordinary 0.5%/week cap — so an aggressive cut and a standard one are prescribed
   the same protein. Whether a genuinely hard cut deserves more than 1.2 is open.
5. **The training-day carb bonus is outside N8.** It adds grams — 40 g of carbs is 160 kcal — on training
   days only, and nothing on screen says what that does to the day's calories. N8 makes the four target
   numbers agree with each other; it does not yet say whether a training day's calorie target is supposed to
   rise by the bonus, or whether the bonus is meant to be swapped in against something else.
