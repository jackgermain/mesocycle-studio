# Exercise doctrine — v1

How Jack uses individual exercises, in his words. The companion to `v1.md`: that file says how to build the
shape of a session, this one says what goes in the slots and why.

This exists because exercise selection was the one layer of the generator with nothing behind it. Every
other rule in `v1.md` came from Jack; selection was inferred from muscle tags and equipment heuristics,
which is guessing.

Source list is **the app's exercise library** (163 exercises), not just the 23 movements found in his own
ten programs — the generator can prescribe anything in the library, so it needs to know how to use anything
in the library. Usage counts from those ten programs are shown where they exist, because "never prescribed
in 3,490 sets" is itself a strong signal.

---

## Naming convention — read this before reading any entry

> *"When you see it written down, that refers to a chest press machine, specifically a **flat** chest press
> machine. If it's an inclined chest press machine it will have the word incline in front of it."*

**A bare exercise name means the flat / standard / seated version. Any deviation is named explicitly.**
`Chest Press` is the flat machine; `Incline Chest Press` is the incline one. This holds library-wide and
matters for the generator: an unqualified name is not a wildcard to be resolved by preference, it is a
specific piece of equipment.

---

## What gets asked about each exercise

Derived from how Jack actually answers, not from a template imposed on him:

1. **What is it exactly** — which piece of equipment does the bare name mean?
2. **Main lift or accessory?** Does it lead a session, or fill it in?
3. **What has to be true to use it at all** — and what has to be true for it to go *first*?
4. **Rep range** — the floor and ceiling it works in.
5. **What's it for** — hypertrophy, strength, maintenance, health?
6. **Who's it right for, and who's it wrong for?**
7. **What replaces it** when the gym doesn't have it, in order of preference.
8. **How do you progress it, and what do you do when it stalls?**
9. **What goes wrong** — the cue you always end up giving.

Anything he hasn't said is left blank rather than guessed. Where something is inferred it is marked
**(inferred)** so a later reader can tell the difference.

---

## General rules, stated while talking about specific exercises

These came up inside individual entries but are not about one exercise. Recorded here so the generator
applies them everywhere rather than only where they happened to be said.

**G1 — An exercise's rep range is not the block's rep trajectory.** Stated twice, unprompted, on two
different exercises:

> *"What I'm not saying is — I don't mean that you have to start every block at the eight rep range and
> then finish at the 15 range."* (chest press machine)
>
> *"That doesn't mean that you have to start at the six rep range and end at the 15 rep range. Remember,
> we sort of grouped different ways how we could progress — whether that's keeping the reps the same the
> entire block, or adding reps over the course of the block."*  (incline dumbbell press)

Two separate things are being confused when this goes wrong:

- **The exercise's rep range** — which reps are legal on this movement at all. `8-15` on the chest press
  machine, `1-15` on the barbell bench.
- **The block's rep trajectory** — what actually happens week to week, which is chosen from the progression
  models in `v1.md` §3.

**Rule: the range's endpoints are not the block's endpoints.** An exercise legal from 8 to 15 does not
imply a block that starts at 8 and finishes at 15.

Ramping is emphatically *not* forbidden — it is half of the recorded doctrine. `v1.md` §3 Model B walks
reps **down** across a block as load rises (3x10 → 3x8 → 4x6 → 4x5), and Jack describes walking them **up**
on the cable fly (*"you can even start at 12 and end at 15, it doesn't really matter"*). Model A holds them
flat. All three are legal; which one runs is a block-level decision, and the exercise's range only says
which of them will fit inside it.

**G2 — The five rep bands.** Stated while talking about the bench press, and explicitly scoped to
everything:

> *"Remember this is an absolute staple and you can apply this to every single exercise… the 1 to 3 rep
> range, the 4 to 6 rep range, the 7 to 9 rep range, the 10 to 13 rep range, the 14 to 20 rep range, and
> then the 20 and above reserved for special cases."*

| Reps | Band |
|---|---|
| 1-3 | Peak strength |
| 4-6 | Middle strength |
| 7-9 | Bottom hypertrophy |
| 10-13 | Middle hypertrophy |
| 14-20 | Upper hypertrophy |
| 20+ | Special cases only |

This is a coordinate system, not a preference. Every per-exercise rep range in this file should be read as
naming which of these bands the exercise is allowed to occupy — the incline dumbbell press's 6-12 spans
the top of middle-strength through middle-hypertrophy; the chest press machine's 8-15 spans bottom through
upper hypertrophy and never touches strength at all.

*Squared with `v1.md` C3 — there is no conflict.* Asked which wins:

> *"This is all range — anything between six and 30 reps grows the same amount of muscle if the set is
> taken close to failure. I'm just dividing that 6 to 30 rep range into smaller groups to make it easier to
> categorize."*

**Rule:** C3 stands. **6-30 reps all grow the same amount of muscle, provided the set is taken close to
failure.** The bands are a naming scheme for talking about that span, not a claim that some part of it
builds more muscle than another.

This has a consequence the generator has to respect: **rep selection inside 6-30 is not a hypertrophy
decision, because hypertrophy is flat across it.** So reps get chosen on everything else — what the
exercise tolerates, joint stress, the load available, how long the session can run, what the person will
actually do. Anything that picks reps by chasing a "best hypertrophy range" is optimising a variable that
is already flat.

**G3 — Set cap falls as reps rise. (Stated for the bench press; generality unconfirmed.)**

> *"If I'm gonna be doing singles for bench press, the most I would do is working up to six. If I was doing
> doubles, no more than probably five or six. Three reps per set, no more than five or six triples. Four
> reps, no more than five sets. Five reps, no more than five sets. Six reps, no more than four sets. Seven
> reps, no more than four. Eight reps, no more than four. Nine reps or anything above, no more than four at
> the top of the boundary."*

| Reps per set | Max sets | Min sets |
|---|---|---|
| 1 | 6 | 2-3 |
| 2 | 5-6 | 2 |
| 3 | 5-6 | 2 |
| 4 | 5 | 2 |
| 5 | 5 | 2 |
| 6 | 4 | 2 |
| 7 | 4 | 2 |
| 8 | 4 | 2 |
| 9+ | 4 | 2 |

And a floor that holds everywhere:

> *"Doing one set is never enough… I would pretty much keep the bottom range of set volume at two sets
> minimum."*

**Rule:** never prescribe a single set of anything. Two is the floor.

This is consistent with `v1.md` C1 rather than in conflict with it — C1 caps the 6-15 rep range at 4 sets,
and G3 agrees there while extending the curve below 6 reps, where the cap rises to 5 and then 6.

**Scope: compounds only.** Asked whether the curve generalises:

> *"No, this does not generalize for every exercise, but it does generalize for every compound… The bench
> gets more sets at low reps because it's an exercise that is used for peak strength, and that's the only
> time. Heavy compounds — as in the group of compound exercises I've just listed — are ones that can get
> more sets at low reps, and the reason for that is they produce a ton of strength."*

**Rule:** the extended low-rep portion of the curve (5 reps and below, 5-6 sets) is available **only to the
compounds in G4**. Everything else stays capped at 4 sets, and in practice everything else also floors at
6-8 reps anyway, so it never reaches the part of the curve that would matter.

**G4 — What counts as a compound.** Given as an explicit list, not a definition:

> *"Your compounds are your barbell presses, your front squat, back squat, Zercher squat if you choose to
> do that, your Olympic lifts — so your cleans, pulls, snatches, hang cleans, any version of any Olympic
> lift — and that also includes deadlifts, and hex bar deadlifts or trap bar deadlifts."*

- Barbell presses (bench, incline, overhead)
- Back squat, front squat, Zercher squat
- Every Olympic lift and its variants — clean, snatch, hang clean, pulls
- Deadlift, hex/trap bar deadlift

Worth noting what is **absent**: no Smith machine, no dumbbell press, no machine, no lunge, no RDL. This is
a barbell-only list. Membership grants an exercise the low-rep set allowance in G3 and the ordering
priority in G5, so the boundary matters.

**Amendment — compound status can be elective.** Added while discussing rows:

> *"If you're trying to get really strong on these — this is another exercise that could arguably be a
> compound exercise, including barbell rows. T-bar rows are also compound exercises, if you want them to
> be. So in that case I would put them in that category, meaning you could do them first or second."*

**Rule:** the list above is the set of *unconditional* compounds. A second group — **seated cable row,
barbell row, T-bar row** — becomes compound **when the intent is to get strong on it**, and then takes
compound treatment including the first-or-second slot.

So compound is not purely a property of the movement. For this second group it is a property of *how the
exercise is being used*, decided by the client's goal. That is the same intent-dependence already seen in
G5, where power training moves an exercise to the front of the session — the generator cannot classify
these from the exercise name alone.

**G5 — Ordering when a session has more than one compound.** Four rules, applied in order:

> *"If you're going to bench press, do it first. There are some cases in which you don't, but I think
> that's a pretty good rule of thumb."*

1. **Power work always goes first.** *"If you're training for the attribute of power and you have to move
   the bar quickly — like if you're doing a clean or an Olympic lift — you're always gonna do those
   exercises first."* Speed of movement outranks everything; a bar that has to move fast has to move first.

   Restated independently on the landmine press, this time with the reason: *"All power exercises are done
   early on in the lift when you're not fatigued, because you have to be able to move something quickly in
   order to develop power."*

   **This applies to intent, not to exercises.** The landmine press is a late accessory when trained for
   hypertrophy and an opening exercise when trained for power — same movement, opposite ends of the
   session. So the generator cannot slot an exercise from its identity alone; it needs to know **why** the
   exercise is there. Any movement trained for power moves to the front.
2. **Otherwise, hardest first.** *"If you're going to do two compounds in the same day, I would do
   whichever one is hardest first."* Between a squat and a bench, the squat.
3. **Client priority can override.** *"It also comes down to what's more important to the person. If they
   care more about their chest, I might consider doing the bench press first."*
4. **Rotate across sessions.** *"You also have to take into consideration what they did last time. If
   you're gonna make them squat second, what did they do first for legs last time — because you wanna make
   sure that everything gets a lot of stimulus."*

Rule 4 is the one a generator would never invent. Session order is not a per-session decision made fresh
each time; it is a decision made **across** sessions, so that a movement repeatedly relegated to second
gets its turn in the opening slot. Whatever always goes second is always trained tired.

**G6 — Mutual exclusion: two exercises of the same pattern don't share a session.** First stated of the
flies:

> *"Pretty much in no cases would I ever do dumbbell flies and cable flies in the same day — unless I was
> doing like four exercises for chest, and even then it would still be unlikely."*

**Rule:** two fly-pattern movements in one session is effectively never. It requires **4+ chest exercises**
to even be considered, and is unlikely even then.

This is a different *kind* of rule from everything above it. Every other rule so far constrains an exercise
on its own — its reps, its sets, its slot, who it suits. This one constrains a **pair**: two exercises can
each be individually correct and still be wrong together. A generator filling slots one at a time, each
one locally optimal, produces exactly the session this rule forbids.

**(inferred, worth confirming)** Jack named dumbbell and cable flies specifically. The natural reading is
that it is about the movement pattern rather than those two implements — that a pec deck, which inherits
the dumbbell fly entry, is equally excluded alongside either. Not yet confirmed, and the generalisation to
non-fly patterns (two rows, two curls) is entirely unasked.

**G7 — Arm work sits in the last two-thirds of a session.** Given while placing bench dips:

> *"…probably closer to the end, or about the same time where I would start doing biceps and triceps, which
> usually occurs in the later 3/4 of the session, or later 2/3 of the session."*

**Rule:** direct biceps and triceps work belongs in the final **2/3 to 3/4** of a session. It is a
position defined against the session's length rather than a fixed slot number, so it scales with a 6-
exercise day and a 10-exercise day alike.

**G8 — Triceps implement ranking: cable first, dumbbell second.** Stated while dismissing bench dips:

> *"I think the best tricep exercises are, for sure, done with cables, and in second place I'd rate
> dumbbells."*

**Rule:** for triceps, cable > dumbbell > everything else. Recorded here rather than in a triceps entry
because it is a claim about the whole muscle group, and it will govern selection across every triceps
exercise in the library.

Worth noting it runs *opposite* to the chest hierarchy, where the implement order is barbell > dumbbell >
Smith > machine and cables barely feature. So implement preference is **per muscle group**, not a global
ranking — a generator must not carry the chest ordering across to the arms.

**G9 — Some library exercises are never to be prescribed.** The library is a catalogue of what exists, not
a list of what is endorsed. The first entry on the denylist:

> *"Decline pressing is a terrible exercise. I've never ever ever given somebody it, ever… we're never
> gonna use decline dumbbell presses, or barbell presses, or flies for that matter."*

**Rule — the decline angle is excluded** on presses and on dumbbell flies:

- `Decline Barbell Bench Press` — never
- `Decline Dumbbell Press` — never
- Decline **dumbbell** flies — never

**Second denylist entry — the rack pull:**

> *"Rack pulls are terrible. I never do them, ever, and I will never program them."*

- `Rack Pull` — never

**Cables are not covered by this.** Asked directly whether `Cable Fly — High to Low` falls under it:

> *"Don't worry about the cable flies. There's nothing wrong with high-low cable flies. I'm just referring
> to [decline] dumbbell flies specifically."*

So all three cable fly angles stand as recorded, high-to-low included. The exclusion is about the decline
**bench** and the dumbbell fly done at that angle — not about training the lower chest, which the cable
does from the same direction and is fine.

This is a harder rule than "avoid by default". The chest dip is avoided but unlocked by client request; the
decline has no unlock. The generator should treat these as absent from the library rather than as
low-ranked options, and the validator should reject them outright.

**G10 — No entry, no prescription.** On the Svend press:

> *"I have no idea what a Svend press is, so we'll skip that."*

**Rule:** an exercise with no entry in this file is **not generatable**. Not because it is bad — the Svend
press is not on the G9 denylist and nothing here says it is a poor exercise — but because there is no
doctrine for how to use it, and a generator with no rules for an exercise cannot prescribe it responsibly.

This makes the file itself the effective allowlist, and it matters at the scale involved: the library holds
163 exercises and this document will never cover all of them. So the default for an uncovered exercise has
to be defined, and the default is **exclude**. It also means the practical way to widen what the generator
can build with is to add entries here, not to add exercises to the library.

Three categories, and they are distinct:

| Category | Meaning | Generator behaviour |
|---|---|---|
| Has an entry | Doctrine exists | Prescribable under its rules |
| No entry (G10) | No doctrine yet | Not prescribed; add an entry to unlock |
| Denylisted (G9) | Judged bad | Never prescribed, at all |

This aligns with `v1.md` C5 — "only approved exercises" — and gives that constraint a concrete definition
of *approved*.

**G11 — The load/rep exchange rate: 5 lb costs 2-3 reps.** Given on push-ups, scoped wider by him:

> *"As a good rule of thumb, every 5 pounds that you put on their back is going to decrease their rep count
> by two or three reps. That is a pretty universal standard for a lot of lifts, but especially push-ups."*

**Rule:** +5 lb ≈ -2 to -3 reps. This is the first stated conversion between load and reps, and it gives
the generator something it can actually compute with when swapping one for the other — particularly on
bodyweight movements, where the relative-intensity table in `v1.md` has no 1RM to anchor to.

Note it is a rule of thumb on *absolute* pounds, so it is only sensible near the loads it was given for. On
a movement where 5 lb is a rounding error it will not hold.

**G12 — A rep is a proportion, not a unit.** The reason low-rep sets progress differently:

> *"Going from 5 to 6 reps is much different from going from 10 to 11 reps."*
>
> *"If you can only do one, what you have to do is you have to make the second rep easier in load, because
> it's a 100% increase in volume. So you have to make the load a little bit lighter so that you can be able
> to complete a second one, and then you have another one after that that's even a little bit lighter."*

**Rule:** adding one rep is a *percentage* jump, not a fixed one. 1→2 is +100%, 5→6 is +20%, 10→11 is +10%.
So the same "+1 rep" progression is aggressive at the bottom of the ladder and trivial at the top.

**Rule:** at very low rep counts, **load must come down to allow the extra rep**, and come down again for
the rep after that. A descending-load ladder is the correct shape for a beginner who can manage one or two
reps — not a flat load repeated across sets.

This is the mechanism behind a beginner's whole first block, and a generator applying "+1 rep per week"
uniformly would be prescribing a 100% jump to the person least able to take it.

**G13 — Non-antagonistic supersets.** His own term, and his favourite example:

> *"One of my favourite supersets ever is cable flies for chest supersetted with push-ups. This is called a
> non-antagonistic superset, because both of the exercises back to back — even though different exercises —
> are for the same body part. After I do a set of flies and I get close to failure, I drop on the ground and
> I do push-ups. I may do between four and eight push-ups and they feel amazing, because I'm already
> fatigued."*

**Rule:** a non-antagonistic superset pairs two exercises for the **same** body part back to back. This is
distinct from the antagonistic pairing (push/pull) that supersets usually mean.

**Rule — the trigger is strength, not preference:** *"for people who are really strong, or advanced people,
or anybody who bench presses or dumbbell presses anything more than maybe 75 pound dumbbells."*

The mechanism is pre-exhaustion, and it is the same idea as the 315 lb bench rule but arrived at from the
other side: there, a strong lifter is pre-exhausted to keep absolute load down. Here, a bodyweight exercise
that has become too easy for a strong lifter is made hard again by fatiguing the muscle first. Both solve
"this person is too strong for this exercise."

**G14 — Back work spends biceps recovery.** The first cross-muscle interaction recorded:

> *"When you're doing chin-ups you're gonna use your biceps a little bit more, so that might affect your
> other bicep volume throughout the whole week. And in general with back training you have to be mindful of
> your biceps, just because every time you pull you use your biceps a little bit as well. So depending on
> what exercises you're doing for your back, that might affect your maximum recoverable volume for your
> biceps when you train them individually."*

**Rule:** pulling volume draws down the biceps' recoverable volume. Direct biceps work must be counted
*against* the week's back work, not budgeted independently of it. Chin-ups cost more than pull-ups.

**And it cuts both ways — the same work also *provides* stimulus.** On rear delts:

> *"Whenever you do a lot of rowing exercises for your back, your rear delts get some work, so you don't
> always have to isolate them like that."*

**Rule:** a compound both **fatigues** and **trains** the small muscles it involves. So direct small-muscle
work is adjusted against compound volume in two directions at once: less of it is *needed*, because the
stimulus is partly already delivered, and less of it is *affordable*, because the recovery is partly
already spent.

**The indirect-work table, as it stands.** Three instances have now been given, which makes this systematic
rather than incidental:

| Compound work | Also trains and fatigues | Consequence |
|---|---|---|
| Any pulling — rows, pulldowns, pull-ups | **Biceps** (chin-ups most) | Direct biceps work counts against the week's back volume |
| Rowing specifically | **Rear delts** | *"You don't always have to isolate them like that"* |
| Chest pressing | **Front delts** | *"Your front delt gets a lot of work already from chest"* — direct front delt work is usually redundant |

**Rule:** before allocating direct work to a small muscle, check what the week's compounds have already
spent and already delivered. In practice this means the front delts and rear delts rarely need isolation at
all, and the biceps need less than their nominal target.

This breaks an assumption the volume model would otherwise make. `weeklyVolume.ts` counts sets per muscle
from the `muscle` tag, one tag per exercise — so a week of heavy rowing books zero biceps sets and zero
rear delt sets, a week of heavy pressing books zero front delt sets, and the generator would happily add
full allocations of all three on top of a budget already partly spent and a stimulus already partly
delivered.

**G18 — Small muscle groups are a function of training frequency.**

> *"The frequency of rear delt training specifically becomes less and less with the amount of days per week
> you get to train. The more days you train, the more of a chance you have for little muscle groups."*

**Rule:** direct work for small muscle groups scales with **training days per week**. At low frequency the
slots go to the muscles that matter most and the small groups are dropped first; as frequency rises they
become affordable.

This is the allocation rule behind the shape of his own programs, and it explains an absence noted at the
top of this file: rear delt work appears in only five of ten programs, and those ten are mostly 2- and
3-day splits. It is not a judgement about rear delts, it is what fits.

**Two overrides put small-muscle work back regardless of frequency:**

- **Bad posture** — *"if somebody's got bad posture or things like that nature, then doing some rear delts
  might help."*
- **Sex** — *"girls will definitely do way more hamstrings."*

**G15 — Past a point, another exercise beats more sets.** On the fifth and sixth set of pull-ups:

> *"There's nothing wrong with five or six. It's just excessive — like, you can do another lat exercise."*

**Rule:** when an exercise is at its useful set ceiling, additional volume for that muscle should come from
a **different exercise**, not from more sets of the same one. The set caps throughout this file are
therefore not volume caps: they cap *this exercise*, and the muscle's remaining volume is spent elsewhere.

**G16 — Interchangeable pairs rotate between blocks.** Given for pull-ups and chin-ups, and extended by him:

> *"You can switch them interchangeably, so I might like to rotate exercises each block. If somebody really
> wants to get good at pull-ups, on the first day I might start with a chin-up grip — a neutral grip chin —
> with a band, and then on the other day I do a regular pull-up on the assisted pull-up machine. I might run
> those two for the block, and then maybe the next block I swap it: so instead of the pull-up on the assisted
> machine, I'm doing the chin-up on the assisted machine, and I'm doing the regular pull-up with the band."*

> *"The variation in stimulus is very similar, so it will transfer to the other exercise, but it's enough of
> a change that it won't get stale. And the same thing goes between front squat and back squat — I like to
> use them interchangeably like that."*

**Rule:** certain exercises form **interchangeable pairs**, and the pair is rotated block to block rather
than one member being chosen and kept. Confirmed pairs so far:

- Pull-up ↔ chin-up (including neutral grip)
- Front squat ↔ back squat

**The criterion is a balance of two things:** stimulus close enough that progress on one carries to the
other, and different enough that neither goes stale. Both halves matter — an exercise too different would
not transfer, and an identical one would not refresh.

**What actually rotates is the pairing, not the exercise.** In the example there are two variables — grip
(pull vs chin) and assistance (band vs machine) — held across two weekly slots. The block swaps *which grip
goes with which assistance*, so both grips and both assistance methods are present in every block; only
their pairing changes.

This does not violate `v1.md` C4 (*one variable at a time*). C4 governs change **within** a block, week to
week. G16 is a change **between** blocks, which is where variation is supposed to happen.

**G17 — Transfer runs one way.** Stated for two different pairs in the same breath:

> *"They will not help you get better at your pull-ups. Pull-ups have an incredibly high transfer to how
> much you can do a pulldown with, but it's not the other way around. And same with barbell pressing to
> dumbbell pressing — barbell pressing is massive for increasing your dumbbell press, but increasing your
> dumbbell press is not massive for your barbell press."*

**Rule:** transfer between related exercises is **asymmetric**. The harder, less-supported, more-stabilising
variant transfers *down* to the easier one. The easier one does not transfer back up.

| Trains | Improves | Does not improve |
|---|---|---|
| Pull-up | Lat pulldown | — |
| Lat pulldown | — | Pull-up |
| Barbell press | Dumbbell press | — |
| Dumbbell press | — | Barbell press |

**Consequence for goal-driven selection:** to improve at an exercise, the generator must prescribe *that
exercise, or something above it in the transfer order*. Substituting downward — pulldowns for someone whose
goal is pull-ups, dumbbell pressing for someone whose goal is a bigger bench — trains the muscle and fails
the goal. Muscle-tag equivalence says these swaps are free. They are not.

**This also bounds G16.** An interchangeable pair requires transfer to run **both** ways: pull-up ↔ chin-up
qualifies, pull-up ↔ pulldown does not, despite both being vertical pulls for the same muscle. So G16 pairs
are not simply "two similar exercises" — they are two exercises of *equivalent difficulty*, which is why
progress on either carries to the other.

**G19 — Width comes from vertical pulls, thickness from horizontal pulls.**

> *"Pulldowns will get your back to be a lot wider, and then rows — specifically rows — will get your back
> to be a lot thicker."*

**Rule:** the two back patterns build different things and are not substitutes for one another.

| Pattern | Builds |
|---|---|
| Vertical pull — pull-up, chin-up, pulldown | Width |
| Horizontal pull — every row | Thickness |

This is the second reason not to treat back exercises as interchangeable. G17 already said transfer runs
one way *within* the vertical pull family; G19 says the vertical and horizontal families do different jobs
entirely. A back allocation that satisfies its set count purely from rows produces a thick, narrow back.

**G20 — Elbow flare selects upper versus mid back.**

> *"Depending on where you're pulling the bar to will also affect what part of your back is working. If
> you're trying to work your mid back, these exercises — all of them we've talked about — are amazing for
> that. But if you wanted to work your upper back more, you'd have to flare your elbows out a little bit
> more, so your elbows are a little bit closer to horizontal rather than vertical at the end of the pull."*

**Rule:** on any row, elbow path is the regional selector.

- **Elbows tucked, travelling vertically** → mid back. This is the default, and every row covered so far is
  a mid-back exercise as normally performed.
- **Elbows flared toward horizontal** → upper back.

So "upper back" is not a separate list of exercises — it is the same exercises cued differently. That is a
prescription the model has no way to express today: the program model has no per-exercise note field, which
`TEMPLATE-ANALYSIS.md` already flagged when Jasper's sheet turned out to carry cues like "ELBOWS VERTICAL"
as their own rows.

**Both of these are invisible to the library.** All 24 back exercises carry the single tag `Back`. Nothing
in the data distinguishes vertical from horizontal, width from thickness, or upper from mid — so the
generator currently cannot tell that a session of five rows has trained one thing five times.

**G21 — Resistance peaking at long muscle length is the risky profile.** The reasoning behind several
choices that looked unrelated:

> *"Especially T-bars — because T-bar rows, the lever is so long at the bottom of the rep. The force curve
> is favoured to it being the heaviest when your muscles are the longest in length that are contributing to
> that exercise. And muscles, when they're lengthened, are weaker — the force output they're able to
> produce is less. So you're in a bit more of a vulnerable spot than the barbell row, where it's consistent
> throughout."*

**Rule:** an exercise is riskier when its resistance is **greatest where the muscle is longest**, because a
lengthened muscle produces less force. Even resistance through the range is safer than resistance that
peaks at the stretch.

This is the principle behind three separate things already recorded, which is why it is worth stating once:

| Where it appears | How it applies |
|---|---|
| T-bar row vs barbell row | T-bar peaks at the stretch, barbell is even → T-bar is riskier, especially for older clients |
| Band vs machine pull-up assistance | The band gives **most** help at the bottom, where the muscle is longest and weakest → which is exactly why it works for beginners |
| Machines and cables generally | Even resistance is why they suit the older, general-population roster |

The band-assisted pull-up and the T-bar row are the same physics with opposite signs. The T-bar loads the
stretched position hardest and that is its danger; the band unloads the stretched position hardest and that
is its value. A generator that understood only "assistance" and "resistance" as magnitudes would see
neither.

**Consequence:** matching a force curve to a population is a real selection axis, and it is not derivable
from muscle tags, equipment names, or anything else in the library.

**G22 — Enjoyment is a legitimate input.** It has now decided three separate things:

> *"No more than probably four sets, unless you're just really in love with the exercise, then maybe you do
> five."* (Smith bench)
>
> *"Maybe even six if you're crazy about them."* (pull-ups)
>
> *"Exercises like this can be fun… they're a bit unique so people find them fun."* (Meadows row)

**Rule:** how much someone likes an exercise legitimately affects what is prescribed — it can buy an extra
set past the normal cap, and it can justify selecting a merely-good exercise over a better one.

This is not a softness in the doctrine. Adherence is the thing every other rule depends on, and an exercise
someone will actually do hard beats a better one they resent. But it only ever operates at the **margins**:
it moves a set count by one, or picks between comparable options. It has never overridden a slot rule, a
rep floor, or a safety restriction.

**G23 — Almost every back exercise uses the biceps. Three don't.** The counterpart to G14, and the reason
the straight-arm family exists:

> *"There are only a couple of back exercises that you can do that don't use your biceps — and a straight-arm
> pulldown, pullover, or a lat prayer, they all kind of have the same name, but they accomplish that goal.
> The only other exercises that you can do that won't engage your biceps are cleans and snatches."*

**Rule:** the bicep-free back exercises are:

1. **Straight-arm pulldown / pullover / lat prayer** — one movement under three names
2. **Cleans**
3. **Snatches**

Everything else — every row, every pulldown, every pull-up — spends biceps.

**Rule — this is a selection trigger, not trivia.** G14 says back volume draws down the biceps' recoverable
volume. G23 names the exercises that let the generator **add back volume without spending any of it.** When
biceps are the binding constraint — heavy pulling week, direct arm work still to come, or a biceps injury —
this family is the only way to keep training the back.

**Rule — cleans and snatches are not available in practice.** *"I like muscle snatches a lot, but they're
very complicated, so I don't program them for people."* Not a denylist entry (G9) — they are good — but
excluded on coaching cost. That leaves the straight-arm family as the *only* usable bicep-free back
exercise.

**G24 — General-population clients do not train below 6 reps.** The rule that explains the shape of all ten
of his programs:

> *"I don't really lift heavy at all with people who are just trying to look good, feel good, work out, get
> some muscle. They don't need to do it. They don't need to lift in that [range] ever."*

> *"Definitely keep the reps higher when people start getting older. No less than six reps — and if it is a
> six, then I would say an RIR of at least two, or an RPE of eight. And if I am working that hard, I'm only
> gonna do four sets max."*

**Rule — a floor of 6 reps** for anyone training to look and feel good rather than to get strong, and for
older clients generally. The peak-strength (1-3) and most of the middle-strength (4-6) bands from G2 are
simply not used for this population.

**Rule — effort is capped at the floor.** At 6 reps, stop at **RIR ≥ 2 / RPE ≤ 8**. The closer to the rep
floor, the further from failure — the two constraints tighten together rather than independently.

**Rule — and sets cap at 4 when working that hard.** Heavy, near-failure and high-volume are not permitted
to coincide.

This is the single biggest constraint on the generator's output for Jack's actual clientele, and it
retroactively explains `TEMPLATE-ANALYSIS.md`'s finding that all ten programs sit at 10-20 reps with
sub-10 rare. That was not a stylistic habit. It is this rule.

**It also bounds every rep range in this file.** An exercise's range says what is legal *for the exercise*;
G24 says what is legal *for the person*, and the prescription is the intersection. The barbell bench's 1-15
becomes 6-15 for a 55-year-old general-population client — which is how a roster with zero barbell benching
and zero sub-6 work is generated from a doctrine that permits both.

**G25 — There are only three ways to train the spinal erectors.**

> *"The only way that you work your spinal erectors is from either heavy hinging, resisting flexion through
> a row, or doing either back extensions or reverse hypers."*

**Rule:** erector work comes from exactly three sources:

1. **Heavy hinging** — deadlift, RDL
2. **Resisting flexion in a row** — the bent-over family (see the spinal-demand table below)
3. **Back extensions and reverse hypers** — the only *direct* option

**Consequence:** the erectors are the one muscle whose training is a side effect of other choices. A program
built entirely from chest-supported rows, cable rows, machines and pulldowns — which is what the
joint-friendly selection this doctrine favours tends to produce — trains them **not at all**. If they are
wanted, route 3 has to be added deliberately, because routes 1 and 2 are exactly what gets removed for a
client with a bad back.

That is the tension worth naming: the client most likely to need erector work is the client whose program
has had every source of it stripped out.

**And route 3 is narrower than it looks.** Of the two direct options, the reverse hyper is deprioritised on
equipment grounds — *"a bit of a niche machine, especially if you want to load it."* So for a client whose
back rules out hinging and bent-over rowing, direct erector work comes down to the **back extension alone**,
and only if the gym has one.

**G26 — Cluster sets.** A set-execution technique not previously recorded anywhere in the doctrine:

> *"Say I'm gonna do a set of 18 reps. I'm gonna do that set in two mini-sets of nine, with however much
> time in between — usually about 10 to 15 seconds. That's called a cluster set: two clusters of nine for a
> total of 18 reps. Clusters are an unbelievably good way, because you divided that little set into two
> sets of nine, you can lift just a little bit more weight than you normally would and still get the same
> volume in terms of set-reps."*

**Definition:** one prescribed set of N reps, executed as mini-sets with **10-15 seconds** of rest between
them. 18 reps becomes 9 + 9.

**Rule — what it buys:** more load at the same total reps. The short intra-set rest restores enough to hold
a heavier weight across the whole set than a straight set would allow.

**Rule — it raises the rep ceiling.** The lateral raise has no upper rep limit *when clustered* — *"I've
heard of people doing clusters of 30."* A rep count that would be absurd as a straight set is reasonable as
a cluster, so a clustered prescription must be read as a different exercise for ceiling purposes.

*"That's actually one of my favourite blocks to run ever."*

**Nothing in the app can currently express this.** A set is a rep count and a load; there is no field for
intra-set rest, and no way to mark one prescribed set as several mini-sets. A clustered 18 would either be
written as 18 straight — which is the wrong prescription at that load — or as 2x9, which loses the
short-rest instruction that is the entire point.

**G27 — For a priority muscle, rotate the parameters, not the exercises.** The counterpoint to G16:

> *"My favourite lateral delt exercises are the Freemotion Y raise, the seated lateral raise machine, and
> what's called a Super ROM lateral raise… I pretty much run these three exercises year-round, with
> different combinations of sets, clusters, rest times, all that sort of stuff. But that's pretty much all
> I do for lateral delts, and I've done that forever. I just rotate the stimulus. Those are my three
> absolute bread and butter."*

**Rule:** for a muscle that is a genuine priority, the exercises stay fixed and the **variables** rotate —
sets, clusters (G26), rest times. Not year-to-year exercise turnover.

**This is not in conflict with G16, but it is a different tool.** G16 rotates *between* two interchangeable
exercises to keep a stimulus fresh. G27 keeps the best exercises permanently and refreshes the stimulus by
changing how they are executed. The choice between them appears to be priority: for the muscle that matters
most, you do not rotate away from the best exercise for it — you find another axis to vary.

A generator told only "vary the stimulus between blocks" would swap the exercise, which is exactly wrong
for a priority muscle.

**G28 — Anything that is not a compound goes later in the workout.** Stated as a general principle while
placing front raises:

> *"These are accessories, so once again, anything that's not a compound should be occurring later in the
> workout — and is just part of the list of priorities of what the person you're training wants."*

**Rule:** compound status (G4) determines the front of the session; everything else fills the back of it,
ordered by the client's priorities.

This unifies most of the individual slot rules already recorded — the chest press machine at 2nd-3rd, the
flies never first, the straight-arm pulldown at 3rd, back extensions second-to-last. They are all one rule.

**The known exception is a priority muscle.** The lateral raise is not a compound and may still open a
session — *"as a true bodybuilder, if you have an isolated shoulder day, it would not be crazy at all to
start with lateral raises."* So G28 is the default and a strong enough priority overrides it. Ordering is
compound status first, client priority second, and priority can win.

**G30 — Ordering is decided by the client's goal.**

> *"When choosing what's first you have to think of your compounds of course, and the whole day schedule —
> but you also have to prioritise. What's most important? Is it aesthetics? Is it strength? Is it feeling
> good? Is it being really strong?"*

**Rule:** after compound status and the shape of the training week, the tiebreaker is the client's goal:

| Goal | What it prioritises |
|---|---|
| **Aesthetics** | The muscles the client wants to look bigger — lateral delts for "bigger shoulders" (see lateral raise), chest for a man wanting a bigger chest |
| **Strength** | Compounds, and the strength bands of G2 |
| **Feeling good** | The general-population case of G24 — nothing below 6 reps, effort capped, joint-friendly selection |
| **Being really strong** | Peak strength: the 1-3 band, the athletic unlocks on the standing press and barbell row |

The third and fourth are the poles this doctrine mostly runs between. **"Feeling good" is the goal all ten
of his real programs serve**, and it is the goal G24 was written for. **"Being really strong"** is what
unlocks the barbell bench, the standing military press, singles and doubles, and the extended set caps of
G3 — and it is what almost none of his clients want.

So a generator needs the goal *before* it can order a session, and arguably before it can select anything
at all: the same client, same equipment, same days per week produces a different program under each goal.

**The list is illustrative, not exhaustive** — he ended it with *"etc."* Four were named; there are more. So
this must not be implemented as a closed enum, and the four above are examples of the axis rather than the
axis itself. Worth returning to in order to enumerate the rest, since goal is turning out to be the single
input the most other rules depend on: G24 keys off it, G3 and G4's set allowances key off it, the barbell
bench and standing press unlock from it, and G28's ordering resolves through it.

**G29 — Direct volume for an indirectly-trained muscle is small.** The first explicit weekly set target
given for any muscle, and it is far below the general band:

> *"Even for a lot of people I don't really do much front delt — maybe four sets a week. Unless it's a big
> priority of theirs and they're training at least four days a week or even more, then it's appropriate for
> it to be a little bit higher, so maybe around 4 to 8 sets per week. I've heard of cases where 12, or 16 as
> well, if you're just crazy about it — but I'm not like that, and I don't think programming should be like
> that."*

| Case | Front delt sets / week |
|---|---|
| Most people | **~4** |
| Big priority **and** training 4+ days/week | **4-8** |
| Reported but rejected | 12-16 |

**Rule:** a muscle that receives substantial indirect work (G14) needs only a fraction of the direct volume
that a primary muscle does. Four sets a week is a complete front delt allocation for most clients.

**Confirmed: weekly volume is two-tier.** Put to him directly — whether the 10-25 band holds for chest,
back and quads with the small indirectly-fed muscles exempt at 4-8 — he answered *"definitely, so I'll make
a note of it if anything else isn't like that."*

| Tier | Muscles | Direct sets / week |
|---|---|---|
| **Primary** — trained mainly by their own direct work | Chest, back, quads, hamstrings, glutes | **10-25** |
| **Indirectly fed** — substantially trained by compounds (G14) | Front delts, rear delts, and arguably biceps | **~4, up to 8** with priority and frequency |

**Rule:** `weeklyVolume.ts` applies its 10-25 band to every muscle group equally. That is wrong for tier 2
by a factor of three or more, and it is the reason a naively-generated program would bury a client in
isolation work for muscles their compounds already covered.

Tier membership is not final — he undertook to flag any other muscle that belongs in tier 2, so treat the
lists above as what is confirmed rather than as complete. The lateral delts are notably **not** in tier 2
despite being a small muscle: nothing else trains them, which is exactly why they need their own volume.

### Biceps are not a tier, they are a function of back volume

> *"I've heard of less biceps depending on how much back you do — like if you're really crazy about back,
> just because your back musculature is so big. I've heard of people doing 20 sets per session for back, and
> training your back at least twice per week. So in that case it would definitely affect your bicep volume a
> lot."*

**Rule:** direct biceps volume is **derived from back volume**, not allocated as a fixed number. The more
back work in a week, the less direct biceps work — and at the extreme (a reported 20 sets per session,
twice a week) it comes down a great deal.

So the model has three shapes, not two:

| Shape | Muscles | How volume is set |
|---|---|---|
| Fixed band | Chest, back, quads, hamstrings, glutes, lateral delts | 10-25 sets/week in its own right |
| Small fixed allocation | Front delts, rear delts | ~4, up to 8 with priority and frequency |
| **Derived** | **Biceps** | A function of the week's back volume; falls as back volume rises |

The 20-sets-per-session figure is reported, not endorsed — *"I've heard of people doing"* — and at twice a
week it implies roughly 40 back sets weekly, well above the 10-25 band. It is recorded as the scale at which
the biceps effect becomes large, not as a recommendation.

Note the second row is conjunctive: higher volume needs the priority **and** the frequency. Wanting bigger
front delts on a 2-day split does not unlock 8 sets — G18 again.

---

# Entries

## Chest Press Machine — *flat, seated, selectorized or plate-loaded*

**Library:** `Life Fitness Chest Press Machine` · `Cybex Eagle Chest Press` · `Hammer Strength Chest Press`
**His usage:** 71 prescriptions across the ten programs.

### Role — accessory, not a main lift

> *"I like the chest press machine as an accessory. I would not use this as a main heavy hitter for chest
> unless you were training chest three times a week."*

**Rule:** the chest press machine is an accessory by default. It is not the primary chest movement.

### When it may lead a session

> *"I would not start out with this exercise unless chest is being done three times a week."*

**Rule:** it may only occupy the first chest slot of a session if **chest frequency ≥ 3×/week**. Below that
frequency it goes later in the session, behind a real primary press.

The logic, as far as it goes: at 3×/week there are enough chest sessions that one of them can afford to be
led by a machine — the heavy work is covered elsewhere in the week. At 1–2×/week every session's opening
slot is too valuable to spend on an accessory.

### Reps — 8 to 15

> *"I would use this exercise in the 8 to 15 rep range, so any sort of rep scheme that falls anywhere
> within those parameters will work fantastic, with the same sort of rep schemes that we've talked about."*

**Rule:** 8–15 reps. Any scheme already legal under `v1.md` that fits inside that window is fine here.

**And explicitly not a ramp across the block:**

> *"What I'm not saying is — I don't mean that you have to start every block at the eight rep range and
> then finish at the 15 range."*

**Rule:** 8–15 is a **boundary, not a trajectory.** The generator must not read a rep range as an
instruction to walk from one end of it to the other over a block. This is a correction worth holding onto,
because walking a range end-to-end is exactly the mistake a progression engine drifts into.

### Sets — four is the ceiling, and it sits second or third

> *"I would do no more than four sets of this exercise. Given that it's an accessory you'll probably be
> doing it either second or third, if you were to do two or three chest exercises in one day."*

**Rule:** maximum **4 sets**. Consistent with `v1.md` C1 (4 sets is a ceiling approached, not a target),
and here it is stated for the exercise specifically.

**Rule:** slot **2nd or 3rd** among the chest exercises in a session. Together with the frequency rule
above, the machine's position is fully determined: first only when chest is trained 3x/week, otherwise
second or third behind a primary press.

### What it's for

> *"This machine would mostly be used for hypertrophy, or just to maintain some chest volume."*

**Rule:** hypertrophy, or volume maintenance. Not a strength movement — it is never the lift that a chest
session is built around.

### Still open on this one

- Who is it *wrong* for?
- What replaces it when the gym has no chest press machine — incline dumbbell? Smith bench? Push-up?
- How do you progress it, and what do you do when someone stalls on it?
- Any cue you always end up giving on it?

---

## Incline Dumbbell Press — *compound or accessory*

**Library:** `Incline Dumbbell Press`
**His usage:** 118 prescriptions — his single most-prescribed chest movement, in nearly every program.

### Role — either a compound or an accessory

> *"This can either be a compound or an accessory."*

**Rule:** dual role. Unlike the chest press machine, which is accessory-only, this one can lead a session
or fill it in. Which it is depends on what else is in the session — see ordering below.

### Who it's for — everyone

> *"It's one of the few exercises — unbelievably good exercise. I use it all the time. It pretty much
> works for anybody, all ages, all demographics, all goals."*

**Rule:** no population restriction. This is the safe default chest movement, and the one to reach for
when nothing about the client argues for something more specific.

### Ordering — first, unless a barbell bench is present

> *"If I'm doing dumbbell presses and I'm not doing any bench press — as in barbell bench press, whether
> that's flat or incline — dumbbell press will be done first. Maybe second, but most of the time first."*

**Rule:** with **no barbell bench press (flat or incline) in the session**, the incline dumbbell press
takes the first chest slot. Second is allowed but first is the default.

*Open:* where it goes when a barbell bench **is** in the session.

### Reps — floor 6, ceiling 15, sweet spot 6-12

> *"If it's going to be done first — if you're gonna be training for more strength — I would never use
> this exercise anything less than six reps at the lowest, maybe even five reps at the lowest in this
> context at least, unless the person really specifically says they want to get really really strong on
> their dumbbell presses. Even then I would still not go under six reps for the most part. On the upper
> end of the range I would keep it around 15 at the highest, although I would say that the sweet spot for
> sure is the 6 to 12 rep range."*

**Rule:** 6-15 legal, **6-12 preferred**. Below 6 is off the table, with one narrow exception: a client who
explicitly asks to get strong on dumbbell pressing may see 5 — and even then Jack would mostly still hold
at 6. Treat 5 as a request-only floor, never a default.

Note the asymmetry with the chest press machine: the machine floors at 8, this floors at 6. A dumbbell
press can carry heavier relative work; a machine accessory is not asked to.

### Sets — two to four, when done first

> *"If you're gonna do these first I would do no more than four sets and no less than two, with the same
> sort of rep schemes as what we've discussed already."*

**Rule:** 2-4 sets in the leading slot. Same scheme vocabulary as `v1.md`.

### Still open on this one

- Where does it sit when a barbell bench press **is** in the session?
- What replaces it when there are no adjustable dumbbells heavy enough?
- How do you progress it, and what happens at a stall?
- Any cue you always end up giving?

---

## Barbell Bench Press — *flat; incline barbell is a separate entry*

**Library:** `Barbell Bench Press`
**His usage:** **zero.** Not prescribed once in 3,490 sets across ten programs.

### Role — a staple, but only for getting strong

> *"This exercise is an absolute staple if the person is really trying to get strong."*

**Rule:** the barbell bench earns its slot on a strength goal. It is not the default chest builder.

### The risk that keeps it off most programs

> *"Even though it's this good, there is some benefit-risk that comes with it, and that is sometimes you
> have more shoulder pain, and pec injuries. It is a very common exercise people can get hurt on, so I like
> to use it with people that are usually younger."*

**Rule:** skew young. Shoulder and pec injury risk is the deciding factor, and it is why a roster of
middle-aged general-population clients has zero barbell bench between them — the Smith and the machine
carry that work instead.

> *"That's not a golden rule of thumb. For guys who are serious about wanting to get their chest to grow I
> would encourage it, but it's not mandatory."*

**Rule:** for a younger man serious about chest growth, encouraged — never mandatory. The generator should
treat it as an option that a goal unlocks, not a requirement any goal imposes.

### Default: use dumbbells instead

> *"Usually I would opt in doing a dumbbell press instead of a barbell bench press, but there's a very
> specific reason to be doing barbell pressing."*

**Rule:** dumbbell press is the default; the barbell needs a reason. This closes the loop with the incline
dumbbell press entry, whose ordering rule is written against "if I'm not doing any barbell bench press" —
that condition is the normal case, not the exception.

### Reps — the full ladder, 1 to 15

> *"It can be used in all rep ranges, so if somebody wants to train for max strength, that's amazing —
> anywhere between the one rep range to even the 15 rep range, which is a very wide boundary."*

**Rule:** 1-15. The only exercise so far that reaches into the peak-strength band at all. Which band to
pick inside that span is a goal decision, read off G2.

### Sets — see G3

The full set-cap curve above was given while talking about this exercise: 6 singles down to 4 sets at 9+
reps, never fewer than 2.

### Ordering — first, unless something faster is in the way

> *"I would pretty much always do this first if you're going to do it, unless there's another compound
> exercise that you're doing before that has to be done."*

**Rule:** the bench takes the first slot whenever it appears, yielding only to power work. See G5 for the
full ordering, which was given while talking about this exercise.

### The reason the barbell earns it

> *"The very specific reason is if the person is really trying to get everything that they can out of their
> lifting, and the risk-to-reward of them using it is high enough that being really risky isn't that big of
> an issue."*

**Rule:** the trigger is a person maximising — someone who wants everything available from their training
and for whom the risk is worth it. Not a goal setting, an attitude to risk.

The gate is joint history and age, not experience:

> *"If the person doesn't have any shoulder pain or anything like that, they're not really old or anything
> like that — unless the load is really light and they don't have to work very hard relatively. There's
> nothing wrong with bench pressing, you just have to be mindful about who's doing it."*

**Rule:** shoulder pain or advanced age rules it out **at meaningful loads**. It does not rule it out at
light loads and low relative effort — the risk lives in the load, not the movement.

And once past that gate, it is broadly encouraged rather than reserved:

> *"If we're talking to somebody who is an intermediate lifter, or even a beginner, I would strongly
> encourage bench pressing, just because it's a very foundational exercise that should be used very
> often."*

**Rule:** for a healthy beginner or intermediate, strongly encouraged. This widens the earlier "staple if
they're trying to get strong" — the strength goal makes it a staple, but foundational value alone is
enough to prescribe it.

### The one reason not to put it first — pre-exhaustion as load management

> *"The only time I would ever use bench press not first is if the person I'm working with is super strong
> already — as in, if they did it first they'd have to be lifting 315+ pounds on the bar, and I don't want
> them to have to lift that much load, so I have something before that to pre-exhaust them."*

**Rule:** if benching first would put roughly **315 lb or more** on the bar, put something before it to
pre-exhaust, so the working load lands lower.

This is worth flagging as a principle, because it inverts the usual reason for pre-exhaustion. It is not
being done to bias a muscle or chase a pump — it is being done to **keep absolute load off a strong
lifter's joints** while still getting a hard set. The generator would otherwise only ever order by priority
and difficulty (G5) and would never think to demote a lift because the person is too strong for it.

### The substitution when it hurts — dumbbells, not incline

> *"Immediately after the pain from flat pressing, I wouldn't switch to incline pressing. Most of the time
> I would just switch to a dumbbell press. It matters how bad the pain is too, and what's kind of been
> going on with it — but for the most part, incline pressing causes less shoulder pain than the flat bar
> press."*

**Rule:** shoulder pain on the flat barbell bench substitutes to a **dumbbell press**, not to an incline
barbell press. Incline is genuinely lower-risk, but lower-risk is not the same as the remedy, and the fix
for a bar problem is to stop using a bar.

This is the first substitution rule recorded, and the shape of it is worth keeping: the substitute is not
the next-safest thing in the same family, it is the thing that removes the cause.

### Still open on this one

- Where's the age line — what counts as "really old"?
- What counts as "really light" for the exception — a band from G2, or a percentage?
- What do you put in front of it to pre-exhaust?

---

## Incline Barbell Bench Press — *inherits from flat barbell bench*

**Library:** `Incline Barbell Bench Press`
**His usage:** zero across the ten programs, same as the flat barbell.

> *"Incline barbell press is amazing. I would apply the same rules to it as flat barbell pressing, with a
> little bit less risk on the shoulder-pain sort of thing. But the only thing that I would change is that
> below three reps on incline barbell press is very unusual, so I would gauge the rep range or boundary
> between three reps and 15 at the most. But yeah, everything else should hold with it."*

**Rule:** inherits the flat barbell bench entry in full — compound status (G4), the set-cap curve (G3),
first-slot ordering (G5), the maximiser trigger, the joint/age gate, and the 315 lb pre-exhaust rule.

**Two changes:**

1. **Reps 3-15**, not 1-15. Below 3 is very unusual on an incline. In G2 terms it gives up the bottom of
   the peak-strength band — it can be a strength lift, but not a true singles lift.
2. **Slightly lower shoulder risk** than the flat bench.

*Open:* whether that lower risk actually moves the gate — i.e. whether someone with mild shoulder pain who
is excluded from flat barbell benching can do incline barbell instead, or whether the gate is the same and
the difference only matters at the margins.

### A note on the shape of this entry

This is the first **inheriting** entry, and most of the remaining 160 exercises will be this shape: a
parent, plus the two or three things that differ. That is what makes going through the whole library
tractable — the expensive entries are the ones that establish a pattern, and the rest are deltas against
one.

---

## Smith Machine Bench Press — *flat; a bodybuilding lift, not a strength lift*

**Library:** `Smith Machine Bench Press`
**His usage:** 27 prescriptions. With `Incline Smith Press` (65) it is how his roster presses, against zero
barbell bench of any kind.

> *"I would say that this is more of a bodybuilding type exercise… I would give it the same sort of
> parameters as dumbbell presses in regards to the rep range, that being six at the lowest and probably
> about 15 at the highest, with all the same rep progressions that we've talked about for each subcategory
> of the 6-15 rep range. I would do no more than probably four sets, unless you're just really in love with
> the exercise, then maybe you do five. But yeah, this is an unbelievably good exercise."*

**Rule — role:** a bodybuilding exercise. Hypertrophy, not strength.

**Rule — reps 6-15.** The same window as the dumbbell presses, and pointedly *not* the barbell bench's
1-15. The Smith gives up the entire strength half of the ladder despite being a bar you can load heavily.
That is consistent with G4, which admits only free barbells as compounds — the Smith is not one, so it does
not get the low-rep allowance, and here Jack applies that independently rather than by appeal to the rule.

**Rule — sets: 4, or 5 by preference.**

> *"No more than probably four sets, unless you're just really in love with the exercise, then maybe you do
> five."*

Consistent with C1 and G3 for a non-compound. The exception is notable for what licenses it: **enjoyment**,
not a physiological argument. A fifth set is allowed because someone likes the exercise, which is a real
adherence consideration and not something a generator would grant itself.

### Slot — first or second, never third

Given for both the flat and incline Smith:

> *"You can do it first, nothing wrong with doing that. If the person is really really really strong, like
> I said before, I might ease away from it. But there's nothing wrong with doing it second. I wouldn't, in
> most cases, do it third if you're gonna do three chest exercises in one day. But yeah, I would usually do
> it first or second."*

**Rule:** slots **1st or 2nd**. Third is ruled out. The same strength-based demotion that applies to the
barbell bench applies here — a very strong lifter gets it moved off the opening slot.

---

## Incline Smith Press — *inherits the flat Smith, and preferred over it*

**Library:** `Incline Smith Machine Press`
**His usage:** 65 prescriptions — his most-used Smith variant, and more than twice the flat Smith's 27.

> *"I would give incline Smith press an even higher rating than flat Smith press — I just like it more. I
> usually almost never do flat Smith press, to be honest, but there's nothing wrong with it, it's still
> great. But I am a massive fan of the incline Smith specifically. I would give it the exact same
> parameters as the flat."*

**Rule:** identical parameters to the flat Smith — 6-15 reps, 4 sets (5 by preference), bodybuilding role,
slot 1st or 2nd.

**The only difference is preference, and it is a strong one.** Incline Smith is the default of the two;
flat Smith is almost never prescribed despite being perfectly acceptable. The usage backs it: 65 to 27.

This is a preference specific to the Smith, **not** a general incline bias — he rates the flat and incline
dumbbell presses as equal ("just as good in every single way"). So incline beats flat on the Smith and
nowhere else so far, and the generator should not generalise an incline preference across implements.

---

## Flat Dumbbell Bench Press — *inherits incline dumbbell, and equal to it*

**Library:** `Dumbbell Bench Press`

> *"For flat dumbbell press I would give this the exact same parameters as incline dumbbell press. It's
> just as good in every single way. Although the only difference to note is, if you've got a client with
> pain in the front of their shoulder from flat barbell pressing — usually pretty heavy — sometimes the
> flat dumbbell press can still be a little bit irritating. Although most of the time this doesn't happen."*

**Rule:** identical to the incline dumbbell press — 6-15 reps with a 6-12 sweet spot, 2-4 sets, dual
compound/accessory role, no population restriction, first slot when no barbell bench is present.

**Rule:** the two are **equal in value**. Neither is the better exercise; this is the parent that the Smith
entries mean when they say "same parameters as dumbbell presses."

### The one exception, and it refines the substitution rule

**Anterior shoulder pain is the case where "switch to dumbbells" is not automatically enough.** For a
client whose front-of-shoulder pain came from heavy flat barbell pressing, the flat dumbbell press can
still irritate it — usually not, but sometimes.

**(inferred, worth confirming)** That implies the substitution recorded under the barbell bench should be
more specific when the pain is anterior: *flat barbell → **incline** dumbbell*, rather than to the flat
dumbbell, since the incline is the one that changes the shoulder angle rather than just removing the bar.
Jack said the flat dumbbell may still irritate; he did not say to go incline instead, so this is a
reasonable reading and not his instruction.

The general shape still holds — the substitute removes the cause — but the cause here is the pressing angle
as well as the bar, and only the incline changes both.

---

## Dumbbell Fly — *flat and incline together; accessory, never first*

**Library:** `Dumbbell Fly` · `Incline Dumbbell Fly`
**His usage:** flat 42, incline 3.

Covered as a pair at his instruction. The flies as a whole are **not** one group — *"there's intricacies of
all of them"* — so the cable variants and the pec deck get their own entries.

> *"These are accessories, obviously. On these accessory exercises I would do no more than 15 reps at the
> most, maybe 20, but that's really pushing it. On the lowest end of the rep range I would go at eight
> reps, never anything lower than that. The most amount of sets I would do on this exercise is four and the
> least amount is two, same rep ranges and rep progressions as all the other things we've talked about."*

**Rule — role:** accessory. Never a primary.

**Rule — reps 8-15**, with 20 as a stretch ceiling that is "really pushing it". Never below 8.

**Rule — sets 2-4.**

### Slot — never first, ever

> *"If I was only doing two chest exercises in one day, this probably wouldn't be one of the two choices.
> And I would never, in any cases, do either one of these exercises first. Ever."*

**Rule:** never the first chest exercise. This is the hardest slot restriction recorded so far — the chest
press machine merely needs a condition met to lead, while the fly is excluded outright.

**Rule:** with only two chest exercises in a session, the fly is probably not one of them. It effectively
requires a third slot to exist before it is worth picking.

---

## Cable Fly — *all three angles; accessory, third or last*

**Library:** `Cable Fly — Mid` · `Cable Fly — Low to High` · `Cable Fly — High to Low`
**His usage:** zero across the ten programs.

Answered for the cable flies in general rather than per angle.

> *"If we're talking cable flies in general, I would do no more than four sets, usually two or three is the
> sweet spot. I would do no less than 10 reps pretty much ever, although I would still encourage the higher
> rep range — 15 reps being a really good place for these. You can even start at 12 and end at 15, it
> doesn't really matter. But I would put the upper parameter on 20 and the lower parameter on 10."*

**Rule — reps 10-20**, and the useful part of that window is the top of it. 15 is called out as a really
good place; the encouragement runs high, not low.

**Rule — sets 2-4, with 2-3 the sweet spot.** The first entry to name a sweet spot inside its own set range
rather than just a ceiling.

### Slot — never first, third or last

> *"I would never do these first, and if I would group them I'd probably do them third or last."*

**Rule:** never first; **3rd or last** by default. A shade more restrictive than the dumbbell fly, which is
merely never-first.

### Its floor is higher than the dumbbell fly's

Cable flies floor at **10**; dumbbell flies floor at **8**. Both are accessories for the same muscle, so
the difference is the implement — constant cable tension has even less use for a low-rep set than a
dumbbell does. This extends the pattern below rather than breaking it.

---

## Pec Deck — *inherits the dumbbell fly*

**Library:** `Pec Deck Machine`
**His usage:** zero across the ten programs.

> *"Pec deck, I would give the exact same parameters as a dumbbell fly."*

**Rule:** identical to the dumbbell fly — 8-15 reps (20 a stretch), 2-4 sets, accessory, **never first**.

Note that it does *not* inherit the cable fly, despite both being cable-resisted and looking near-identical
on paper. The dumbbell fly floors at 8, the cable fly at 10, and Jack put the pec deck with the dumbbell.

---

## Chest Dip — *bodyweight, not on a bench; largely avoided*

**Library:** `Weighted Dip` · `Nautilus Chest Dip Machine` · `Matrix Assisted Pull-Up/Dip Machine`
**His usage:** zero across the ten programs.

Naming, consistent with the convention at the top of this file: a **dip** is the chest version, done between
bars. A dip *on a bench* is a different exercise entirely — see bench dip below.

> *"I honestly don't like them very much, unless somebody specifically really wants to get better at them.
> I've noticed that they cause a lot of problems with shoulder pain, and I just think that there are other
> chest exercises that will help out more, so I tend not to use it very much unless people really want
> it."*

**Rule:** avoid by default. Shoulder pain is the reason, and the judgement is that other chest exercises do
the job better — so it is not a risk being taken for a unique benefit.

**Rule:** prescribe only on **client request** — someone who specifically wants to get better at dips. Same
shape as the barbell bench's trigger: an unlocked option, never an imposed one.

**Rule — reps 6-15**, unweighted. Never below 6.
**Rule — sets 2-4.**
**Rule — slot 2nd or 3rd.** Never first. *"If I were to use dips, I would not do them first."*

*Open:* weighted dips are *"totally different as well"* and were not covered. The 6-rep floor is explicitly
"assuming they aren't weighted", so a weighted dip presumably floors lower.

---

## Bench Dip — *triceps; an equipment-limited fallback*

**Library:** `Bench Dip`
**His usage:** zero across the ten programs.

> *"I still don't use them that often… but there's nothing wrong with bench dips. I think they're amazing
> for if you're limited on equipment. So that's pretty much the only time I would ever use them."*

**Rule:** a triceps exercise, not a chest one.
**Rule:** prescribe **only when equipment is limited.** This is the first exercise whose trigger is a
property of the gym rather than of the person — it is what you use when the cables and dumbbells that G8
prefers aren't there.

**Rule — reps 8-15.** Two higher at the floor than the chest dip, which is the loading difference: a bench
dip carries a fraction of bodyweight, a chest dip carries all of it.
**Rule — sets 2-4.**
**Rule — slot:** late, in the last 2/3 to 3/4 of the session, with the rest of the arm work (G7).

---

## The rep floor tracks the implement — (inferred)

Six chest entries in, the low end of each rep range lines up with what the exercise is, not with what it
trains:

| Floor | Exercises |
|---|---|
| 1 | Flat barbell bench |
| 3 | Incline barbell bench |
| 6 | Dumbbell presses (flat and incline), Smith presses (flat and incline) |
| 8 | Chest press machine, dumbbell flies, pec deck |
| 10 | Cable flies |

The chest dip floors at **6** despite being an accessory, and the bench dip at **8**. Both are bodyweight,
so the implement is identical — what differs is how much of the body is being lifted. That suggests the
floor tracks **how heavily loaded the movement is**, with implement being a proxy for that rather than the
cause: a bodyweight dip is a heavy set for most people, a bench dip is not.

The ceiling barely moves — almost everything tops out at 15. **It is the floor that carries the
information**, and it falls as the exercise gets more loadable and more stable. Free barbell reaches the
peak-strength band; dumbbells and the Smith stop at the top of middle-strength; accessories never leave
hypertrophy at all.

Marked inferred because Jack gave these numbers one exercise at a time and has not stated the pattern
himself. If it holds, it is a useful default for exercises not yet covered — but it should be confirmed
before the generator leans on it.

---

## The chest slot hierarchy, as it stands

Enough chest entries now exist to see the ordering rule they collectively encode. This is synthesis, not a
quote — but every line traces to an entry above.

| Exercise | Slot | Condition |
|---|---|---|
| Barbell bench (flat / incline) | 1st | Yields only to power work. Demoted if benching first means 315+ lb. |
| Incline dumbbell press | 1st | When no barbell bench is in the session. 2nd otherwise. |
| Smith bench (flat / incline) | 1st or 2nd | Never 3rd. Demoted off 1st if very strong. |
| Chest press machine | 2nd or 3rd | 1st only when chest is trained 3x/week. |
| Dumbbell fly (flat / incline) | Never 1st | Needs a 3rd slot to exist before it is worth picking. |
| Cable fly (all angles) | 3rd or last | Never 1st. |
| Pec deck | Never 1st | As the dumbbell fly. |
| Chest dip | 2nd or 3rd | Never 1st, and only on client request. |

Two things fall out of it:

**The hierarchy is by implement, not by muscle.** Barbell outranks dumbbell outranks Smith outranks
machine, and that ordering holds regardless of which part of the chest is being trained. Incline versus
flat never changes the slot — only the implement does.

**"Too strong" demotes, twice.** Both the barbell bench and the Smith press get moved off the opening slot
for a lifter who is very strong, for the same reason: the opening slot means the heaviest absolute load,
and past a point that load is the risk. This is the opposite of how a generator would order by default.

---

## Decline Press — *excluded; see G9*

**Library:** `Decline Barbell Bench Press` · `Decline Dumbbell Press`
**His usage:** zero, and by his own account zero in his entire coaching career.

> *"Decline pressing is a terrible exercise. I've never ever ever given somebody it, ever."*

Never prescribed, on any implement, to anyone. No rep range, no slot, no conditions — there is no case in
which it is selected.

**Scope, settled.** The exclusion covers the decline bench on both implements, and the dumbbell fly done at
a decline. It does **not** cover `Cable Fly — High to Low`, which was raised directly and cleared — *"there's
nothing wrong with high-low cable flies."*

That distinction is worth holding onto: the objection is to the decline **bench**, not to training the
lower chest. The same fibres worked from the same direction on a cable are fine. A generator that
generalised this to "avoid lower-chest work" would be drawing the wrong lesson from it.

---

## Landmine Press — *a shoulder exercise, mis-filed under Chest*

**Library:** `Landmine Press` — **currently tagged `Chest`** in `exerciseLibrary.ts:62`
**His usage:** zero across the ten programs.

> *"I don't know if we're talking kneeling or standing, but it doesn't matter, they're very similar. I
> guess you could use them from a bodybuilding perspective as a replacement for some sort of military
> press — whether that's a standing or seated dumbbell press, standing press, doesn't matter. The landmine
> makes it nice, I like them a lot."*

**This is an overhead-press substitute, not a chest exercise.** Kneeling and standing are the same entry.

**Rule — it is a second choice.** *"I wouldn't use them super often. No, I'd still rather use one of the
others, but they're really good nonetheless."* Behind the real overhead presses, but genuinely good.

**Rule — reps 8-12.** A narrower window than most, and no strength band at all.
**Rule — sets 2-4.**
**Rule — purpose:** anterior shoulder work. *"A little bit more anterior shoulder work, which isn't a
massive priority, but still can be nonetheless."*

### Two slots, depending on why it is there

**Rule — as hypertrophy: never first.** *"I would never do them first, these are a late accessory that I
would do later in the lift."*

**Rule — as power: first.** *"They can also be great in a power setting, of trying to get more explosive
for push presses and things like that, or a split push where you kind of jump into it… unless I was doing
it for the purpose of generating power, then all power exercises are done early on in the lift."*

Same exercise, opposite ends of the session, decided entirely by intent. See G5.

### This corrects the "no overhead press" finding

The absence noted at the top of this file — zero overhead presses in 3,490 prescriptions — should not be
read as Jack rejecting overhead pressing. He names the military press and the seated and standing dumbbell
presses as the things he would *rather* use than the landmine. They are absent from his ten programs
because of who those ten clients are, not because the movement is off the table.

---

## Library correction needed

`Landmine Press` is tagged **`Chest`** in `src/coach/exerciseLibrary.ts:62`, and by this entry it is a
shoulder movement — an overhead-press substitute doing anterior deltoid work.

This is not cosmetic. The muscle tag is what the coverage and weekly-volume modules count, so every
landmine press currently books its sets to chest and none to front delts. A session built to hit a shoulder
target could satisfy it with an exercise the generator believes is chest work, and the volume report would
be wrong in both directions.

`Svend Press` at line 63 is tagged Chest too. It falls under G10 — *"I have no idea what a Svend press is"*
— so it is not generatable, and its tag does not matter until that changes.

---

## Weighted Dip — *request-only, and narrower than the bodyweight version*

**Library:** `Weighted Dip`
**His usage:** zero across the ten programs.

> *"That is pretty much the only time somebody should be doing weighted dips — if they're already strong
> enough to do several bodyweight dips, or a noted goal of theirs is that they want to increase their
> dips."*

**Rule — two triggers, either sufficient:** already strong enough for several bodyweight dips, or dips are
a stated goal.

**Rule — reps 6-10.** *"I'd go no more than 10 reps at the highest."* The floor matches the bodyweight
chest dip; the **ceiling drops from 15 to 10**, which is the only place so far a ceiling has moved rather
than a floor. Adding external load to a movement already heavy at bodyweight closes the top of the range.

**Rule — sets 2-4, "maybe five if you're really pushing it."**

> *"I still don't like these very much, but some people do use them anyway."*

Inherits the chest dip's shoulder-risk reservation. Not denylisted, but not offered unprompted.

---

## Push-Up — *a progression ladder, not an exercise*

**Library:** `Push-Up`
**His usage:** zero in the ten programs — but this is the most detailed entry so far, because it is the
chest movement that survives when nothing else does.

> *"Push-ups are something that people very commonly want to get better at, and most people are really bad
> at them… If you can do one push-up and that's it, it's gonna be totally different from somebody who can
> do 10 push-ups."*

**The governing idea: the push-up is not one exercise, it is a ladder**, and where someone stands on it
changes everything about how it is programmed. Going 0 → 1 is much harder than going 1 → 20.

### The ladder, rung by rung

1. **Kneeling push-up.** *"Your whole torso straight and your knees are just on the ground instead of your
   toes, so the lever of your body height is basically decreased, thus the torques on your upper body are
   smaller."* Start at whatever reps they can manage and add reps.
2. **Weighted kneeling push-up.** At around **7-8 kneeling reps**, add a plate — 5 or 10 lb on the back.
   Hold the weight and add a rep or two the following week, possibly spread across two sets.
3. **Full push-up.** The transition is brutal and must be planned for: *"I've seen people who can do 12
   kneeling push-ups, and then you give them the full bodyweight push-up and maybe they can only do one of
   them, maybe two, the most I've ever seen is probably like three."*

   **Rule: budget roughly 12 kneeling reps → 1-3 full reps.** A generator carrying rep counts across that
   transition unchanged would prescribe something impossible.
4. **Weighted full push-up** — but see the ceiling below.

### At one rep, load descends across sets

Covered by G12. Someone who can do exactly one full push-up cannot be progressed by adding a rep — that is
+100%. The second set is *lighter* (back to knees, or an incline), and the third lighter still. The aim is
enough total stress, not a flat load held across sets.

### Programming when the count is low (≤10 reps) and improving it is the goal

**Rule — sets 3-6.** *"No more than five sets and as little as two, but I would urge on more, because
you're trying to get your push-up count up. A minimum of three sets and a maximum of maybe five or six."*
The floor rises from the usual 2 to **3** precisely because improving the movement is the goal.

**Rule — rep range is wide open.** *"If your total push-up count is really really low, then doing sets of
one to three, or 5 to 8, or 7 to 10, or 10 to 12 — any range pretty much is good."* Unusually, this
exercise does not constrain reps; the person's capacity does.

### The ceiling — push-ups expire

> *"The more advanced you get, the stronger you get, push-ups become less and less good for you because
> they're too easy. So you either have to weight them ridiculously, which isn't very practical, because you
> have to put a weight plate on your back and doing push-ups like that isn't fun. If you're training by
> yourself, I would not program weighted push-ups for people — unless it's a small plate on your back, of
> course, and it's OK."*

**Rule:** the push-up stops being useful as strength rises, and **weighting it is not the answer** —
impractical to load, and unpleasant to do. A small plate is acceptable; loading it seriously is not.

**Rule:** for a strong lifter, the way to keep using push-ups is the non-antagonistic superset in G13 —
fatigue the chest first with flies, then 4-8 push-ups. That restores the difficulty without loading the
movement.

---

## Pull-Up and Chin-Up — *treated together; an assistance ladder*

**Library:** `Pull-Up` · `Chin-Up` · `Cybex Assisted Pull-Up Machine` · `Matrix Assisted Pull-Up/Dip Machine`
**His usage:** 157 assisted pull-ups, 29 unassisted, 14 assisted chin-ups — his most-prescribed back
movement.

> *"We'll talk about pull-ups and chin-ups kind of at the same time, because they work very similarly."*

**The one difference:** chin-ups use more biceps, which spends more of the week's biceps budget. See G14.

### Most people cannot do one, and that is the main case

> *"A lot of people, most people, can't do a single pull-up, and that is a whole process of itself."*

Two assistance methods, and the order between them is the point:

1. **Band-assisted pull-up first.** *"When a band is tied to the pull-up bar above you and you put your
   foot in it, at the bottom of the rep you get the most assistance — when your muscles are the most
   stretched out, and that helps you quite a lot in the earlier phases."*
2. **Then the assisted pull-up machine**, once the band goes stale after *"several weeks, or a block or two
   blocks."* *"The way that the load is given is completely different, because the weight is even
   throughout the whole rep. It's not easier at the bottom."*

**Rule: bands first, machine second, and the reason is the force curve.** A band gives most help exactly
where the movement is hardest, which is what a beginner needs. The machine assists evenly, which is the
harder and more honest version of the same exercise. The progression is not band → less band → nothing; it
is band → machine, a change in the *shape* of the assistance rather than only its size.

**Sequential for a beginner, concurrent for a goal.** The two assistance methods are used two different
ways, and they should not be confused:

- **Getting a first pull-up:** band for a block or two, then switch to the machine when it goes stale. One
  method at a time, in sequence.
- **Training pull-ups as a goal, 2x/week:** both methods in the *same* block, one per day — band on one
  day, machine on the other — with the grips swapped between blocks per G16.

This is the second time a force curve has decided something, and a generator has no access to that
reasoning from muscle tags and equipment alone.

**The results claimed:** *"I've had insane results… I've gotten people from zero pull-ups to 10 pull-ups.
People in their 50s and 60s have done that."*

### Progressing from zero, and the ceiling

Follows the push-up method exactly — G12, descending load across sets.

> *"If you can't do one, you need to be working as high as you can. You're still doing sets of one to
> three, sets of two, sets of one in some cases if that's all you can do — but nonetheless probably sets of
> three I like the most. You stay around there and you just keep adding weight each time, pretty much the
> same way as push-ups."*

**Rule:** sets of ~3 is the preferred working point when assistance is heavy.

**The ceiling is low, even for the advanced:** *"Even when you get really advanced at pull-ups, most of the
time people can't do more than 10, maybe 15 really good pull-ups — for multiple sets especially."* So
unlike the push-up, the pull-up does **not** expire with strength; its useful range simply never gets long.

### Slot and frequency

> *"If you're really trying to get good at pull-ups and that's a big priority of yours, you should probably
> do them first as your vertical pull for your back. I would prioritise it earlier in the session, if not
> first one day if it's that important. But I would try to do a minimum of twice a week if you're trying to
> get better at pull-ups."*

**Rule — slot:** first, or early, **when improving at pull-ups is the goal.** Otherwise early-ish as the
vertical pull. Same intent-dependent slotting as the landmine press (G5).

**Rule — frequency: minimum 2x/week** when it is a goal. The first frequency rule tied to a goal rather
than to a muscle.

### Reps and sets

**Rule — all rep ranges are legal.** *"It kind of just depends where you're at. If you can only do one
pull-up, then you can only do one pull-up."* Capacity constrains it, not doctrine — same as the push-up.

**Rule — sets by rep count:**

| Reps | Sets |
|---|---|
| 2 | 3-4, working up to 5 by the end of a block |
| 3 | 4, or 5 |
| 5 | 4 |
| 6+ | 4 |

Ceiling 4-5, *"maybe even six if you're crazy about them"* — but see G15: past four, another lat exercise
is the better spend.

---

## Lat Pulldown — *a staple, but not a route to pull-ups*

**Library:** `Lat Pulldown — Wide Grip` · `Lat Pulldown — Close Grip` · `Hammer Strength Plate-Loaded Lat
Pulldown` · `Seated Row Machine`-adjacent variants
**His usage:** 84 prescriptions across nine of ten programs.

> *"Pulldowns are good, I like them a lot… they're a staple. I think everybody should do them, should use
> them with different handles, different bars. I think they're fantastic."*

**Rule:** a staple, for everyone. Grip and handle variation is encouraged rather than merely tolerated.

### But it ranks below the pull-up, and for a specific reason

> *"The only reason I would do a pulldown over a pull-up is if they're already doing a lot of pull-ups and
> they still want more volume for their lats."*

**Rule:** the pull-up is preferred. The pulldown's role is **additional lat volume once the pull-up's own
sets are spent** — which is exactly the case G15 describes, where more volume should come from a different
exercise rather than more sets of the same one. The two rules meet here.

**Rule:** it is *not* a substitute for the pull-up when improving at pull-ups is the goal. See G17 — the
transfer runs pull-up → pulldown and not back.

### Reps and sets

**Rule — reps 6-15, sweet spot 8-12.** Other ranges within that span are fine.

**Rule — sets: 2 minimum, 3-4 typical, 6 at the absolute high end.** *"No more than six sets at the very
high end, but ideally four. Usually three is good, but no less than two."*

**Rule — a beginner gets 2-3 easy sets.** *"If I was just starting somebody out and they were trained, I'd
probably pick two or three really easy ones — depends how easy it is for them."*

### Slot

> *"Around the same time as when you would do a pull-up. So first if it's incredibly important, if not
> second or third, maybe even fourth — it all depends on how tired you are by the time you get to them. But
> usually the third or the second."*

**Rule — slot 2nd or 3rd** by default; 1st only when it is the priority; as late as 4th depending on
accumulated fatigue.

---

## Seated Cable Row — *one of the best exercises there is, and elective-compound*

**Library:** `Seated Cable Row` · `Seated Row Machine`
**His usage:** 106 prescriptions — his most-used row and second-most-used back movement.

> *"Seated cable rows, in my opinion, are one of the greatest exercises around, for people of all ages —
> honestly, especially when you start bringing the weight forward, you start hinging a little bit as well.
> It'll really help with people who have stiff backs, like lower back pain, just from their spinal erectors
> being really tight."*

**Rule:** suitable at **all ages**, and one of the highest-rated exercises in the file.

**Rule — the forward lean is therapeutic, not sloppy form.** Letting the torso travel forward at the
stretch, hinging slightly, is *deliberate* and is prescribed for people with stiff lower backs and erector
tightness. A generator or validator treating torso movement on a row as an error would be removing the
reason he picked it.

### Slot — depends on whether it is being treated as a compound

**Rule:** when the goal is to get strong on it, it is a compound (see G4 amendment) and goes **1st or 2nd**.
When horizontal pulling is a lower priority, **3rd**. *"I probably wouldn't do them fourth or fifth, unless
you're working with somebody who's not that crazy about that exercise or that day."*

**Rule — sets: 2 minimum, 4 is the good spot, 6 absolute maximum.**

*Open:* rep range was not given.

*Unclear in the recording:* a caveat about clients around **50+** and whether being in good shape and active
exempts them from it. The sentence did not survive transcription and is worth restating — it may be the
condition under which the forward-lean version is or isn't appropriate.

---

## Chest Supported Row — *the row that spares the erectors*

**Library:** `Hammer Strength Chest-Supported Row` · `Chest Supported Row Machine`
**His usage:** 74 prescriptions across two spellings.

> *"Chest supported rows, those are amazing as well, but they're in their own category as the back exercise
> that doesn't use your spinal erectors."*

**Rule:** its defining property is what it *doesn't* tax — the spinal erectors. That makes it the row for
someone whose lower back is already spent, fatigued, or unable to brace, and it is a different tool from
the seated cable row rather than a safer version of it.

The two rows sit either side of the same problem. The seated cable row **uses** the erectors and, with the
forward lean, is prescribed to help a stiff back. The chest-supported row **avoids** them entirely. A
generator picking between them on muscle tag alone sees one choice; there are two, and which is right
depends on the state of the person's lower back.

**Rule — slot: never first**, *"unless you're just really trying to grow a certain part of your back."*

**Rule — reps: same as the seated cable row.** *"I'd keep the rep ranges pretty similar on the chest
supported row."*

*Open:* that inheritance points at a number that has not been given yet — the seated cable row's own rep
range is still unstated, so both entries are waiting on the same answer.

---

## Barbell Bent-Over Row and T-Bar Row — *compounds, and the main thickness builders*

**Library:** `Barbell Bent-Over Row` · `T-Bar Row`
**His usage:** zero across the ten programs.

> *"I'll talk about bent-over rows and T-bar rows at the same time because they're very similar. But these
> are both compound exercises. They can be loaded really heavy."*

**Rule:** both are compounds — stated flatly here, not electively as with the seated cable row.

**Rule — slot 1st or 2nd.** *"I definitely would want to do them first or second. I would not want to do
them third for the most part — I guess it's not that big of a deal, but I definitely would never do them
anything later than that in the session."* So 3rd is tolerable, 4th is not.

**Rule — reps, and the two differ:**

| Exercise | Reps |
|---|---|
| Barbell bent-over row | **1-15** |
| T-Bar row | **6-15** |

The barbell row reaches the full peak-strength band; the T-bar floors at 6. Same pattern as the barbell
bench (1-15) against the Smith (6-15) — the freer, more loadable implement gets the bottom of the ladder.

**Rule — in practice, triples are the floor.** *"It's not uncommon to see, for guys looking for peak peak
peak strength — a lot of athletes do things like this — but they'll be doing sets of even 1 to 3, maybe a
single by the end of a block. But I would say triples for the most part, or sets of three, as the lowest.
Although it's not the most ridiculous thing I've heard to do singles."*

So 1 is legal and 3 is the practical floor, with singles reserved for genuine peak-strength work on
athletes.

**Rule — grip does not change any of this.** *"That goes for both a supinated grip and a pronated grip."*

**Rule — purpose:** *"a major mass builder for thickness in your back."* See G19.

### Age restriction, and why the T-bar is the worse of the two

> *"For the most part I wouldn't have people who are like very old doing barbell rows and T-bars a lot —
> especially T-bars."*

**Rule:** restrict both for very old clients, and the **T-bar more strictly than the barbell row.** The
reason is the force curve — see G21. The T-bar's long lever puts peak resistance at the bottom of the rep,
where the working muscles are longest and therefore weakest; the barbell row's resistance is even through
the range.

**Rule:** the barbell row remains available to this group with a caveat — *"nonetheless doing barbell rows
is fine, especially if you keep them light at first."*

Confirmed as **light**, not late — the slot rule above still stands, and the caveat is about load.

---

## Pendlay Row — *inherits the barbell bent-over row*

**Library:** `Pendlay Row`
**His usage:** zero across the ten programs.

> *"Pendlay, I'd give them the same category as a barbell row. They're pretty much the exact same thing."*

**Rule:** identical to the barbell bent-over row — compound, 1-15 reps with triples the practical floor,
slot 1st or 2nd, restricted for very old clients, thickness builder.

---

## Meadows Row — *the landmine press of back work*

**Library:** `Meadows Row`
**His usage:** zero across the ten programs.

> *"Meadows rows are cool. I would group them in the same kind of category as a landmine press, but for
> your back — use them the exact same way. Exercises like this can be fun, and I would use them in a
> context of like functional fitness, and they're a bit unique so people find them fun."*

**Rule:** inherits the **landmine press** entry, redirected at the back. Literally as well as
figuratively — the Meadows row is performed on a landmine.

That carries over:

- **A second choice.** Good, but behind the real rows.
- **Reps 8-12**, no strength band.
- **Sets 2-4.**
- **Never first** when trained for hypertrophy; first if trained for power (G5).

**Rule — two additional reasons to pick it:** a **functional fitness** context, and **novelty**. Per G22
that novelty is a real input, not a tiebreaker of last resort.

---

## Single-Arm Dumbbell Row — *heavy free-weight rowing without the spinal load*

**Library:** `Single-Arm Dumbbell Row`
**His usage:** 25 prescriptions across two-arm and one-arm dumbbell row spellings.

> *"Single-arm dumbbell rows can be an absolute staple. They're one of the other ways that you can get a
> free weight, a dumbbell, and do a heavy row without loading your spinal erectors in the way that they
> would have to resist sagittal spinal flexion."*

**Rule:** a staple. It is the way to row **heavy with a free weight** while sparing the erectors the
flexion demand that a bent-over row imposes.

### But it trades one spinal demand for another

> *"You do have to resist the torque pulling your body to rotate a little bit, so you have to be a little
> bit mindful of that. If you've got somebody who hurt their spinal erectors, they might re-irritate that
> area from the single-arm row — pulling that side of your body down towards the ground, and thus you
> having to resist that. But if that's not an issue, then this exercise is amazing."*

**Rule:** it removes the **sagittal flexion** demand and adds an **anti-rotation** demand. So it is not
simply the safer bent-over row. A client with an erector injury may still be irritated by it, and the
question to ask is which demand their back tolerates, not how heavy the exercise is.

**Rule — reps: 6 at the floor** (uncommon), **8-12 is the sweet spot**, up to 15 without hesitation.
**Rule — sets: 2 minimum, 4 the sweet spot, 6 maximum.**

---

## Smith Machine Row — *inherits the barbell row, minus the strength band*

**Library:** `Smith Machine Row`
**His usage:** zero across the ten programs.

> *"Smith machine rows get a very similar place to the barbell row, other than the fact that the lowest rep
> range I would put on it is six reps."*

**Rule:** identical to the barbell bent-over row except **reps 6-15** rather than 1-15.

This is the third time the Smith has given up the bottom of the ladder and landed on exactly 6 — Smith
bench, incline Smith, and now the Smith row, each against a free-barbell parent that reaches 1 or 3. The
pattern is consistent enough to be a default: **a Smith version of a barbell lift keeps everything except
the strength band, and floors at 6.**

---

## Straight-Arm Pulldown — *also the pullover and the "lat prayer"*

**Library:** `Cable Straight-Arm Pulldown` · `Nautilus Pullover Machine` · `Lat Prayer`
**His usage:** 8 prescriptions as `Lat Prayer`.

> *"A straight-arm pulldown, pullover, or a lat prayer — they all kind of have the same name."*

**One entry, three names.** This resolves the open question about what a "Lat Prayer" is: it is his name for
the straight-arm pulldown. *"And same thing goes for the machine"* — the Nautilus pullover machine takes the
identical treatment.

**Rule — implement is free.** Straight bar or rope. *"I like doing them with a rope a little bit more, but
that doesn't matter at all."*

**Rule — reps 8-15, and push toward the top.** *"Eight reps at the lowest, but even then I would still urge
on keeping them higher — probably closer to 10 or even 15. Definitely wouldn't go higher than that."*

**Rule — sets: 2 minimum, 3 a good spot, 4 maximum.**

**Rule — slot 3rd.** *"These are a major accessory in my back day. I would do these third."*

### Why it would ever be chosen over a pulldown

> *"I still wouldn't favour them over a pulldown. I would never choose this over a pulldown, unless for one
> reason."*

**Rule:** the pulldown wins by default. The single exception is G23 — this is a back exercise that does not
use the biceps. That is the only reason to select it over a pulldown, and it is a strong one when biceps
are the constraint.

### The shoulder indication

> *"These can be great for people who have dislocated shoulders before — although, if you're going to do
> that, make sure that the reps are higher, because it's a vulnerable area."*

**Rule:** indicated for a history of shoulder dislocation, **conditional on higher reps.** The rep range is
not just a hypertrophy choice here; it is what makes the exercise appropriate for that client. A generator
prescribing it at the bottom of its range to a dislocation history would be using the right exercise in the
wrong way.

---

## Barbell Deadlift — *a major compound he rarely uses*

**Library:** `Barbell Deadlift`
**His usage:** zero across the ten programs.

> *"The barbell deadlift is a major compound. I don't do it that much, but there's nothing wrong with them
> nonetheless — some people really like them."*

**Rule:** unconditional compound (G4). Not avoided on risk grounds the way the decline or the rack pull are,
simply not often the right pick for his roster.

**Rule — reps 1-12, sweet spot 6-10.** *"No more than 10 reps, 12 at the highest. It's not inappropriate to
have the lowest being one rep, but I don't use that often, if ever… I would say the sweet spot for the rep
range is between six and 10 reps, I like that a lot. But there's nothing wrong with the 1 to 3 range or the
4 to 6 rep range."*

Note the ceiling: **12**, the lowest ceiling of any exercise recorded so far. Almost everything else tops at
15. The deadlift is the one lift where high reps are ruled out rather than encouraged.

**Rule — sets up to 6.** *"The most amount of sets I would do deadlifting is six, probably. But I've heard
of eight — like I've heard of people doing eight singles or 10 singles, but that's on the crazy end of the
spectrum, for peak strength powerlifting sort of stuff. That's not very practical."* Eight to ten singles is
named as real but out of scope.

**Rule — for max strength, it follows the squat pattern.** *"If somebody's looking for max strength and they
want to improve their deadlift significantly, it kind of follows the same pattern as squatting and front
squatting."*

### For older and general-population clients

This is where G24 was stated, and the deadlift is its sharpest case: *"especially on a deadlift, I would
never have somebody who is of age actually work crazy crazy hard on a deadlift."*

- Reps **≥ 6**
- At 6 reps, **RIR ≥ 2 / RPE ≤ 8**
- **≤ 4 sets** when working that hard

---

## Back Extension and Reverse Hyperextension — *the only direct erector work*

**Library:** `Back Extension` · `Reverse Hyperextension`
**His usage:** zero across the ten programs.

> *"Back extensions and reverse hypers are both amazing accessories that all just help with your spinal
> erectors."*

**Rule:** both are accessories, and they are the only **direct** route to the erectors (G25).

**Rule — slot late.** *"If I do these at all, they're usually done later in the lift — usually second to
last or last."*

**Rule — reps 8-15 on both.** *"I would keep the reps above eight at all times… nothing higher than 15 on
either one of those."*

Six is mentioned twice and rejected twice: *"unless you're doing some heavy back extensions for sets of six
— which I still wouldn't do. I've heard of it before, but that's not really something I would do."* And on
the reverse hyper: *"six is not the most ridiculous thing I've heard of, but eight for the most part."*
So 6 is real, known, and declined.

**Rule — sets 2-6**, with 2 or 3 the usual. *"The most amount of sets I would do is probably six, and the
least I would do is two or three — probably two."*

### The reverse hyper is deprioritised on availability

> *"The reverse hyper is a bit of a niche machine, especially if you want to load it, so I would urge away
> from using it as much as possible."*

**Rule:** prefer the **back extension**. The reverse hyper takes the same parameters but should be avoided
where possible — the machine is uncommon, and loading it is worse than uncommon.

Same shape as the bench dip, whose trigger was also a property of the gym rather than the person — but
inverted. The bench dip is unlocked *by* limited equipment; the reverse hyper is locked *out* by the
equipment it needs being rare.

---

## Rowing and the spine — the real selection axis

Four rows, four different demands on the lower back. This is the axis that actually separates them, and
none of it is visible in the library, where all four carry the tag `Back`.

| Exercise | Erector demand | Right for |
|---|---|---|
| Seated cable row *with forward lean* | **Uses them deliberately** | Stiff lower back, tight erectors — it is prescribed *to help* |
| Barbell / T-bar / Pendlay row | Full sagittal flexion resistance | Healthy backs; restricted for the very old (G21) |
| Single-arm dumbbell row | No flexion demand, but **anti-rotation** demand | Backs that can't take flexion but can brace against rotation |
| Chest supported row | **None** | Backs that are spent, injured, or can't brace at all |

The generator currently picks between these four on muscle tag, which makes them interchangeable. They are
not — they are four answers to the question *what can this person's lower back do today*, and the seated
cable row is at the opposite end from where its "safe cable machine" appearance would place it.

---

# Shoulders

## Lateral Raise — *the gold standard, and his most-prescribed exercise*

**Library:** `Dumbbell Lateral Raise` · `Cable Lateral Raise` · `Cybex Lateral Raise Machine`
**His usage:** 280 prescriptions — the single most-prescribed exercise across all ten programs, roughly 7%
of every set he has ever written.

> *"The lateral raise is the absolute gold standard of lateral delt training, which is unbelievably
> important for guys. Most girls really care about shoulders too."*

### Why it outranks everything else in the shoulder

> *"When people are talking about getting bigger shoulders, they're mostly referring to their lateral delts.
> So lateral delts should get a huge priority — probably the biggest priority out of any other part of the
> shoulder by far, when it's specified that you want bigger shoulders. Which is arguably tied for first
> place for the most important body part aesthetically on a guy."*

**Rule:** "bigger shoulders" means **lateral delts**. Front and rear delt work does not satisfy that
request. Within the shoulder, the lateral delt takes priority by a wide margin.

**Rule — frequency: at least 2x/week** when shoulders matter, and higher is better. *"Lateral delt frequency
should be very high if you care about shoulders."*

### Slot — the first exercise with no restriction

> *"You can do them first, you can do them in the middle, you can do them at the end. Although because
> they're so important for most people, I would usually do them in the middle. But as a true bodybuilder, if
> you have an isolated shoulder day, it would not be crazy at all to start with lateral raises — I've heard
> of that all the time in bodybuilding splits. I did that for years, it worked great."*

**Rule — any slot is legal**, middle is the default, first is legitimate on a dedicated shoulder day. Every
other exercise recorded so far carries a slot constraint; this one does not.

**Rule — reps: 8 at the floor** (6 is the absolute bottom of the threshold, and unusual), **no ceiling when
clustered** — see G26, where clusters of 30 are cited.

**But the floor is not the prescription.** Legal and intended are different here:

> *"For me personally, I really like [high] reps for shoulders. I think they work amazingly, so I would even
> urge on most of the time programming high rep lateral delts, as in 12 reps and higher."*
>
> *"Even the 15 to 20 rep range is amazing."*

**Rule — default to 12+, and 15-20 is excellent.** The 8-rep floor exists, but most prescriptions should sit
well above it. In G2 terms the lateral raise lives in **middle-to-upper hypertrophy** and is one of the few
exercises Jack actively pushes toward the top of the ladder rather than the middle.

This makes the lateral raise the clearest case of a distinction running through the whole file: an
exercise's rep *range* says what is permitted, and is not the same as where inside it the work should
normally be prescribed.

**Rule — sets: 3-4 for most people**, up to 8 at the extreme. *"The most I've heard of is like eight,
although I would still say three or four is usually a good place for most people."*

### His three bread-and-butter lateral delt exercises

> *"Those are my three absolute bread and butter."*

1. **Freemotion Y Raise**
2. **Seated lateral raise machine** — `Cybex Lateral Raise Machine`
3. **Super ROM Lateral Raise** — *"pretty much just a lateral raise with dumbbells, past horizontal"*

Run **year-round**, with variation coming from sets, clusters and rest times rather than from swapping
exercises. See G27.

This also answers a question left open from the first pass over his programs: a **Super ROM lateral raise**
is a dumbbell lateral raise taken past horizontal.

### Correction — the Freemotion Y Raise is lateral delt work, not rear delt

The initial analysis of his ten programs classified `Freemotion Y Raise` (30 uses) and the various
`Circles` under a **rear delt** grouping, and that produced the finding that only five of ten clients get
any rear delt work.

He names the Y raise here as one of his three primary **lateral** delt exercises. So that classification
was wrong, the rear delt usage figure is overstated by roughly 34 prescriptions, and the real amount of
direct rear delt work in those programs is lower than recorded.

**(inferred)** The `Infinity Circles`, `Top Circles` and `Bottom Circles` remain unclassified and may
belong with the Y raise rather than with rear delts. They have not been discussed and should not be assumed
either way.

### A worked illustration of G18

> *"I even did that two or three times a week, even four times a week, doing lateral raises a lot, just
> because I cared about them so much. But I was also training six days a week, so I had the ability to have
> extra volume because I didn't jeopardise anything else."*

Four sessions a week of one small-muscle exercise was affordable **only because training frequency was
six days**. This is G18 stated from the inside: the frequency creates the room, and the room is what allows
a priority to be expressed as volume.

---

## Overhead / Shoulder Press — *usually redundant, and ranked by stability*

**Library:** `Barbell Overhead Press` · `Seated Barbell Press` · `Dumbbell Shoulder Press` · `Seated
Dumbbell Press` · `Arnold Press` · `Smith Machine Overhead Press` · `Life Fitness Shoulder Press Machine`
**His usage:** zero across the ten programs.

> *"Overhead press is cool, I don't have anything against it. It's just, a lot of the time, your front delt
> gets a lot of work already from chest. So if your front delt is actually small or weak — which I highly
> doubt — but if it's small, doing shoulder presses are great, especially if the person likes them."*

**Rule:** direct front delt work is **usually redundant**, because chest pressing already trains it (G14).
The exercise is unlocked by a genuinely underdeveloped front delt, which he considers rare — or by the
person simply liking it (G22).

**Rule — he would rather substitute.** *"I'd rather just do a front raise with a dumbbell or a rope, or I
would rather do a shoulder press machine and just do it there, and keep the reps high, like eight and
above."*

### The variant ranking

> *"If I were to pick one, I would probably pick [the dumbbell shoulder press] over anything, out of any of
> the variations other than the machine. But I would still choose for other people the dumbbells, just
> because a lot of people really really like them."*

**Rule:** machine first, dumbbells second, everything else behind. But **for other people, dumbbells** — a
clean case of G22, where adherence overrides his own ranking at the margin.

**Rule — the machine wins on stability, and that decides high-rep work.** *"There's nothing wrong with the
10 to 15, 10 to 20 range. If I were to do that, I would much rather do that with a machine, just for the
stability component."* So the higher the reps, the stronger the case for the machine.

**Rule — reps:** 6 is the lowest heard of, but **8+ at all times with age**, and **8-12 for most people**.
10-20 is fine on a machine.

**Rule — sets 2-4**, four being the top. Six is the most he has heard of, for someone who really cares
about their press.

---

## Arnold Press — *between the dumbbell press and the machine*

**Library:** `Arnold Press`

> *"Arnold press kind of gets the same group as a machine press. It's kind of like an in-between of the
> regular dumbbell shoulder press, because you can't lift quite as heavy on an Arnold press as you can on
> the dumbbell shoulder press."*

**Rule:** grouped with the machine press, and understood as a lighter dumbbell press — the rotation costs
load. Takes the machine's parameters.

---

## Barbell Standing / Military Press — *athletes only*

**Library:** `Barbell Overhead Press` · `Seated Barbell Press`

> *"The barbell standing press, I wouldn't really program that much at all — unless you're a powerlifter,
> or you're an Olympic lifter and you care about your clean and jerk, or if you're an athlete and you're
> really trying to work on your vertical press production. Doing standing military press is not uncommon
> [then]. I've heard of people doing up to sets of three, sets of one, two, three, five."*

**Rule:** three unlocks, all of them athletic — powerlifter, Olympic lifter, or an athlete training vertical
pressing power. Absent one of those, it is not programmed.

**Rule — reps 1-5** in that context. One of only a handful of exercises reaching the peak-strength band, and
it does so only for a population G24 explicitly excludes from that band. The two rules do not conflict; they
partition the roster.

---

## Front Raise — *his go-to front delt exercise*

**Library:** `Front Raise — Dumbbell` · `Front Raise — Cable`
**His usage:** 3 prescriptions.

> *"Front raises are amazing. These are my go-to for my front delt training — even though I don't train them
> that much, way less than lateral delts, but I still do them."*

**Rule:** the preferred front delt exercise, ahead of overhead pressing. *"This goes for cable also"* — the
dumbbell and cable versions are one entry.

**Rule — reps 8-15.** *"Even 20's not the craziest thing I've ever heard, but it's kind of junk volume after
that point."* So 20 is legal and explicitly poor value — the first time a rep ceiling has been justified by
diminishing returns rather than by risk or suitability.

**Rule — sets: 2 minimum.** The maximum did not survive the recording.

**Rule — accessory, so late in the session** (G28).

**Rule — weekly volume ~4 sets, or 4-8 for a priority at 4+ days/week** (G29).

**Rule — it is counted against chest volume.** *"It also matters how much chest you're doing as well, how
much incline you're doing already, just because that will affect how much shoulder volume you're doing."*

---

## Upright Row — *avoided about 90% of the time*

**Library:** `Barbell Upright Row` · `Cable Upright Row`
**His usage:** zero across the ten programs.

> *"Upright rows are cool. I would keep the reps high on them, as in above 10. I don't like them more than
> lateral raises — I'd rather just do a lateral raise. I don't really use upright rows that much."*

**The reason, and it is mechanical:**

> *"When you're at the top of the rep, your shoulder is very internally rotated, which isn't the most
> comfortable position for your shoulder to be in, so a lot of people don't like these that much. They can
> cause a lot of shoulder pain."*

**Rule — avoid roughly 90% of the time.** *"I would still avoid them probably 90% of the time… we won't use
them that much for now, unless somebody really wants them."*

**Rule — contraindicated for existing shoulder pain.**
**Rule — reps above 10** when used at all.

Not denylisted (G9) — it is a real exercise with a real use — but it sits below the lateral raise on every
axis and needs a client asking for it. Position on the scale: stronger discouragement than the chest dip,
weaker than the decline press.

---

## Rear Delt Work — *one entry: flies, face pulls, reverse pec deck*

**Library:** `Rear Delt Fly — Dumbbell` · `Hammer Strength Reverse Pec Deck` · `Cable Face Pull`
**His usage:** roughly 50 prescriptions across five of ten programs, once the Freemotion Y Raise is
reclassified as lateral delt work.

> *"Rear delt flies are a staple for rear delt training. If you're going to do rear delt training, this is
> one of the best things you've got. You've got these, you've got face pulls, and then you've got the
> reverse pec deck — that's pretty much the go-to. Or a single-arm rear delt cable fly. All these follow the
> same thing."*

**Rule:** one entry for the whole family. The **reverse pec deck is the go-to** of the four; the rest are
equivalent.

**Rule — a major accessory.** *"They're a major accessory, like forearms."*

**Rule — reps 10-20.** *"I would keep the reps high on these, as in above 10 pretty much at all times. Eight
is not crazy, but for the most part I would say 10+ for sure. Definitely less than 20."* So 8 is the outlier
floor and 20 the hard ceiling.

**Rule — sets 2-4.**

**Rule — slot: towards the end of the workout.** Consistent with G28.

### The indications are postural and health, not aesthetic

> *"If you have really bad posture, or like shoulder issues, it's usually a good idea to start training
> stuff like this. They're good for your shoulder health, so I wouldn't ignore them completely."*

**Rule — two triggers: bad posture, and shoulder issues.** This is the second time rear delt work has been
unlocked by posture (G18), and it now adds shoulder health.

Note what is *not* a trigger: wanting bigger shoulders. That request means lateral delts (see the lateral
raise entry), so rear delt work is prescribed for how the shoulder *functions*, not for how it looks. It
sits alongside the straight-arm pulldown's dislocation indication as one of the few exercises in this file
selected primarily for joint health.

---

## Deferred — raised, not yet answered

- **Hammer Strength / Cybex / Life Fitness chest presses.** Asked twice and passed over both times, so
  recorded as **(inferred)**: they inherit the chest press machine entry — accessory, 8-15 reps, 4 sets max,
  slot 2nd or 3rd unless chest is trained 3x/week. Plate-loaded versus selectorized is assumed not to
  matter. Cheap to correct later if it does.

---

*Entries continue as we go.*
