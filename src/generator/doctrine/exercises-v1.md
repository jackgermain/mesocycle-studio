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

*Entries continue as we go.*
