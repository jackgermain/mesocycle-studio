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

**G1 — A rep range is a boundary, not a trajectory.** Stated twice, unprompted, on two different
exercises:

> *"What I'm not saying is — I don't mean that you have to start every block at the eight rep range and
> then finish at the 15 range."* (chest press machine)
>
> *"That doesn't mean that you have to start at the six rep range and end at the 15 rep range. Remember,
> we sort of grouped different ways how we could progress — whether that's keeping the reps the same the
> entire block, or adding reps over the course of the block."*  (incline dumbbell press)

An exercise's rep range says which schemes are **legal** for it. Choosing among them is the job of the
progression models in `v1.md` §3, which include holding reps constant for a whole block. The generator
must never read a range as an instruction to walk from its floor to its ceiling across a block.

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

*Reconciliation needed with `v1.md`:* C3 there states the hypertrophy range as 6-30. G2 puts hypertrophy at
7-20 with 20+ as special cases, and calls 4-6 middle **strength**. G2 is later and more specific, but the
two should be squared explicitly rather than left to whichever a reader hits first.

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
and G3 agrees there while extending the curve below 6 reps, where the cap rises to 5 and then 6. Whether
the curve applies to every exercise or only to the bench is **still open**.

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

### Still open on this one

- What is the "very specific reason to be doing barbell pressing"? That reason is the trigger the generator
  needs, and it is the one thing here I do not have.
- Where's the age line — what counts as "younger"?
- Does an existing shoulder or pec issue rule it out outright, or just push it down the list?
- What replaces it for someone who wants to bench but shouldn't — Smith, or dumbbells?

---

*Entries continue as we go.*
