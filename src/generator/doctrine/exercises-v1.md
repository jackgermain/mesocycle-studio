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

**G5 — Ordering when a session has more than one compound.** Four rules, applied in order:

> *"If you're going to bench press, do it first. There are some cases in which you don't, but I think
> that's a pretty good rule of thumb."*

1. **Power work always goes first.** *"If you're training for the attribute of power and you have to move
   the bar quickly — like if you're doing a clean or an Olympic lift — you're always gonna do those
   exercises first."* Speed of movement outranks everything; a bar that has to move fast has to move first.
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

**Rule — the decline angle is excluded outright**, on every implement:

- `Decline Barbell Bench Press` — never
- `Decline Dumbbell Press` — never
- Decline flies, on any implement — never

This is a harder rule than "avoid by default". The chest dip is avoided but unlocked by client request; the
decline has no unlock. The generator should treat these as absent from the library rather than as
low-ranked options, and the validator should reject them outright.

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

*Open — and it matters for the library as it stands:* the exclusion was stated to cover flies as well, but
the library has no exercise named "decline fly." It does have **`Cable Fly — High to Low`**, which trains
the same lower-sternal fibres from the same downward angle and is a decline fly in everything but name.
That exercise was covered under the cable fly entry at 10-20 reps with no exclusion attached. One of the
two records is wrong and it needs settling.

---

## Deferred — raised, not yet answered

- **Push-Up.** *"Push-ups are really interesting… it depends a lot on the person, there's a lot of variance
  with push-ups. Let's actually come back to push-ups later."* Worth returning to specifically for
  equipment-limited clients, where it is one of very few chest options that survive.
- **Weighted Dip.** *"Totally different as well"* from the bodyweight chest dip, and not covered. The chest
  dip's 6-rep floor was given as "assuming they aren't weighted", so the weighted version floors lower.
- **Hammer Strength / Cybex / Life Fitness chest presses.** Presumed to inherit the chest press machine
  entry, unconfirmed.

---

*Entries continue as we go.*
