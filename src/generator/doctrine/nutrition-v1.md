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

**N3 — A cut runs at no more than 0.75% of bodyweight per week.**

> *"Anytime someone is losing weight and is not very overweight, to lose no more than 0.5% total bodyweight
> per week."* … later: *"Yes, make 0.75 the cap for the fast cut."*

**The cap is 0.75%; 0.5% is the regular cut.** It started at 0.5% — the first quote — and that made N9's
0.75% "fast cut" unreachable for anyone lean, so the Fast cut and Cut presets prescribed identical numbers.
Jack raised the ceiling rather than drop the tier. The rate a normal cut *runs* at is still 0.5%; this is
what is *allowed*.

**Rule — cap the loss rate at 0.75% of bodyweight per week.** Not a fixed pound-per-week number: 0.75% is
1.05 lb at 140 lb and 1.87 lb at 250 lb, and a flat "1 lb a week" is a gentle cut for one person and an
aggressive one for the other.

**Consequence — this moved protein.** N7 scales the 1.1–1.2 cut band against the cap, so a regular 0.5% cut
is no longer the steepest allowed and reads about 1.17 g/lb rather than 1.2. That falls out of N7's own
wording (steeper means more, 1.2 at the cap) rather than being a separate ruling, but it changed every
regular cut's protein by a few grams.

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

**Rule — +0.5% is the gain cap, not merely the top tier offered.** Gaining went uncapped for a long time,
because Jack had given the surplus arithmetic but never a ceiling, so nothing stopped a bulk being set at
+2%. He closed it by pointing back here — *"the gaining caps are already said"* — and Bulk's +0.5% is that
ceiling.

**Rule — the gain cap does not move with body fat.** N5 raises the *cut* cap for someone carrying a lot of
fat, because there is more fat available to spend. Nothing equivalent applies to gaining: a leaner person
has more room to gain, not less, and the reason for the cap — past this rate more of the gain is fat than
muscle — is the same at any body fat. A capped bulk must say *that*, not "to protect muscle", which is why
a cut is capped.

**N10 — Maintenance is Mifflin-St Jeor, which is why the app now stores sex.**

> *"Let's take this as the equation for our maintenance calories calculator… and for all other calculators.
> Convert pounds the person inputs to kg for the formula and height in feet/inches to cm, then finish the BMR
> equation. Then ask about the physical activity question."*

```
men:   BMR = 10 × weight(kg) + 6.25 × height(cm) − 5 × age + 5
women: BMR = 10 × weight(kg) + 6.25 × height(cm) − 5 × age − 161
```

**Rule — maintenance is BMR × PAL**, the activity level they pick: 1.2 sedentary, 1.375 light, 1.55
moderate, 1.725 very active, 1.9 extra active.

**This overturns the app's founding nutrition constraint.** Every earlier rule was shaped by the fact that
**no sex was stored anywhere** — it is what forced Katch-McArdle, and what forced N5's single body-fat
threshold instead of the honest sex-split. The two Mifflin-St Jeor forms differ by a flat 166 kcal, so the
formula simply cannot be evaluated without it. Sex is now a stored field, asked for this reason and used
only here.

**Rule — the older formulas stay as fallbacks, they are not deleted.** `HYDRATE` replaces `profile`
wholesale, so every account saved before these fields existed arrives without them. The order is
Mifflin-St Jeor when sex, age and height are all present; Katch-McArdle when body fat is known; calories per
pound when there is nothing but a scale weight.

**Rule — height is stored in centimetres, separately from the `heightLabel` the app already had.** That
field is unvalidated free text typed by hand on two different screens and really does contain `5' 11"`,
`5'11`, `71`, `180cm` and `""`. A formula cannot depend on parsing prose, so the parser exists to *migrate*
that value, not to be the source of truth.

**N11 — Fat is a band in grams per pound, and carbs are the priority for the under-40s.**

> *"For younger folks as in aged 40 and less, prioritize carbohydrates over fats, but keep fats no less than
> 0.25g/lb and no more than .6g/lb. Ideally keep it somewhere in the middle. If the person gets less than
> 200g carbs a day keep it closer to the lower limit for fats so more carbs can be stored."*

| | g of fat per lb of bodyweight |
|---|---|
| Floor | **0.25** |
| Aged 40 and under, starting point | **0.35** (MY CALL) |
| The middle | **0.425** |
| Ceiling | **0.6** |

**Rule — fat is set per pound of bodyweight, not as a share of calories.** This replaces the old flat "25%
of the budget", which moved fat around whenever the calorie target moved and had no floor at all.

**Rule — under 200 g of carbs, fat drops to the floor to buy them back.** The carb rule is evaluated after
the fat starting point, because it is a response to what that starting point leaves.

**Rule — protein is untouched by all of this.** N7 sets it from bodyweight; fat moves inside its band and
carbs take the remainder.

**N12 — The intake is corrected from what the scale actually did.**

> *"If there is no weight gain or loss after the second week, if the goal is to lose weight, pull 150
> calories starting from fats and/or carbs. Same thing goes if trying to gain except increase 150… Once they
> are either gaining or losing, if they taper down on progress 1 week, add 75 calories if gaining or pull 75
> calories if losing."*

**Rule — a stall, called no earlier than two weeks in, moves the intake by 150 kcal** in whichever direction
serves the goal.

**Rule — a taper, once they are already moving, moves it by 75 kcal.** Half the correction, because the plan
is working and only slowing. Jack: *"75 should be good if they are starting to stall, anything after week 2."*

**Rule — if the 75 has not worked a week later, move another 50.**

> *"If 75 isn't enough by the end of the next week, pull another 50."*

This is the first rule in the file that needs **memory** rather than just the scale: whether to follow up
depends on what was already tried and when, not on the weigh-ins alone. `ClientProfile.lastNutritionAdjustment`
records it.

**Rule — one change at a time, and a week before it is judged.** A correction with no scale under it yet
cannot be evaluated, and firing again inside that week stacks corrections on top of an unread one. This is
also what stops an adjustment being offered every time the screen is opened.

**Rule — the follow-up is for a 75 that fell short, not for a stall.** A stall that is still a stall a week
later takes the full 150 again; Jack tied the 50 specifically to the 75.

**Rule — it comes out of fat first, then carbs, and never out of protein.** "Starting from fats and/or
carbs" — and fat still cannot leave the N11 band.

**Rule — moving the wrong way is not a nudge.** Someone gaining while trying to cut has a problem larger
than 150 calories, and that belongs in front of a person rather than in an automatic adjustment.

Two thresholds here are **MY CALL**: what counts as "no gain or loss" (a rate inside ±0.1%/week, since daily
water swings are bigger than a week of real change) and what counts as "tapering" (the recent trend fallen
below half the fuller one). This is the first rule in the file that changes what somebody eats without being
asked, which is why it runs only when auto nutrition is switched on.

**N13 — The scale is read as a week-over-week average, and the steps shrink as a phase matures.**

> *"Make sure that since I have auto nutrition enabled, that the algorithm is taking my weigh-ins that I have
> inputted so far and is formulating a week-over-week average which will be compared to after all of the
> weigh-ins next week. And then that is when the new macros will come in regarding whether things will be
> increased or decreased."*

> *"[N12's steps] but this is for weeks 2-4. After that just 50 cal to -100 cal changes depending."*

**Rule — the rate that decides an adjustment is one week's average against the previous week's.** Not the
28-day least-squares fit. `observedRate` still draws the Progress trend, which answers a different question
— "how fast am I moving lately" — but the number that moves somebody's calories is two averages and a
subtraction. The decisive property is that it can be checked by hand against the weigh-in list; a fitted
slope cannot, and this app has already cost its owner a day over a number he could not verify.

**Rule — only complete weeks count.** A week judged on Tuesday is two mornings compared against seven. This
is also the trigger: the comparison happens once the week's weigh-ins are all in, which is to say once the
week is over.

**Rule — a week needs at least two weigh-ins to have an average.** Daily swings on water and food volume are
larger than a week of real change, so a single-point "average" is that morning's noise wearing a week's
clothes. Two survives someone on 3x a week missing one, which is the common case.

**Rule — weeks 2-4 take N12's full steps; from week 5 they halve.** A stall moves 150 early and 100 later; a
taper moves 75 early and 50 later. The follow-up stays 50 either way, being already the smallest step there
is. The reasoning is that the full steps exist to find the calorie ballpark while the maintenance estimate is
still a guess — past week four the phase is established, you are fine-tuning, and a 150 swing overshoots and
sets the intake oscillating around the number it was trying to settle on. Week 1 adjusts nothing: N12 cannot
call a stall before there are two weeks of scale to call it on.

**Rule — a phase begins when the RATE changes, and the week counter restarts with it.** A cut and the bulk
after it are different phases. Reopening the settings and pressing save must not restart the clock, or
someone eight weeks into a cut is handed the step sizes meant for week two.

**Rule — the adjustment is written to maintenance, never to the macros.** The macros are derived from
maintenance on every read, so anything written to them is recomputed away before it can be seen. Maintenance
is also the truthful place for it: a stall *means* the maintenance estimate was wrong, which is N6 exactly.
A corrected figure is then marked authoritative, so the formula does not overwrite it next render.

**MY CALL, and flagged for overturning: the hold rule.** N12 is written for "lose" and "gain" only — a stall
is a problem only when you meant to be moving, and someone holding steady with a flat scale is succeeding
and must not be nudged. But someone holding steady who has drifted past the flat band is off target in
exactly the way N12 exists to catch, and a literal wiring would ignore them forever. So a drift past
±0.1%/week on a maintenance goal takes the stall step, opposing the drift. Jack's own account sits at rate 0;
without this the entire feature would do nothing for him.

---

## Still to rule on

1. **The N5 threshold and raised cap** — 30% body fat and 1%/week are both mine.
2. **N5's threshold can now be sex-split, and isn't yet.** Sex was unavailable when N5 was written, which is
   why it uses one 30% body-fat figure for everybody; the honest version is roughly 25% for men and 32% for
   women. N10 stores sex, so the thing that blocked this is gone — it is now a decision rather than a
   limitation.
3. **Whether the cut band should widen past 1.2.** This used to be a sharper complaint: at a 0.5% cap the top
   of the 1.1–1.2 band was reached by every ordinary cut, so an aggressive one and a standard one were
   prescribed identical protein. N3's move to 0.75% is what fixed it — a regular cut now reads about 1.17 and
   only a fast cut reaches 1.2, so the band finally discriminates. What is left is narrower: whether a
   genuinely hard cut deserves more than 1.2 at all.
4. **The training-day carb bonus is outside N8.** It adds grams — 40 g of carbs is 160 kcal — on training
   days only, and nothing on screen says what that does to the day's calories. N8 makes the four target
   numbers agree with each other; it does not yet say whether a training day's calorie target is supposed to
   rise by the bonus, or whether the bonus is meant to be swapped in against something else.
5. ~~**N12 is written but wired to nothing.**~~ **Settled, and wired.** Jack answered both open halves in one
   sentence: it runs when a week's weigh-ins are complete, and with auto nutrition on it applies itself. The
   rule it now runs under is N13 above; the wiring is `weeklyIntakeReview.ts`, pinned by
   `tests/weeklyIntakeReview.test.mts`. One number is still open — the hold-drift band, which currently
   borrows N12's own ±0.1%/week.

Answered since this list was written, and now doctrine above: the gain cap (N9, +0.5%), whether 0.75% becomes
the cut cap (N3, yes), and whether the app may store sex (N10, it does).
