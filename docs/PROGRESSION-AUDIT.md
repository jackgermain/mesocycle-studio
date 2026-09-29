# Week-over-week progression: what Jack said, and what the app does

Written 2026-09-28 after Jack asked, following three bad progressions in a row:

> *"I want you to tell me right now everything that you know about progressions for changes week over week.
> These progressions that you are suggesting are absolutely unacceptable."*

Produced by a 42-agent audit over `v1.md`, `exercises-v1.md`, `doubleProgression.ts`, `repRanges.ts`,
`progressionProposal.ts`, `progressionGrid.ts`, `recoveryWindow.ts` and the raw transcripts in
`Jacked-Brain/MY-WORDS.md`. Every rule was adversarially re-checked against its cited source.

**36 rules examined. 4 survived. 32 failed** — on provenance, on being broader than their quote, or because
the running code does something different from the rule it claims to implement.

---

## 1. His rules, verbatim

These are traced to `MY-WORDS.md` with timestamps, not to a previous session's paraphrase.

### The band — the core of Model C

> *"Usually I try to find a balance between rep count and when I increase load, so I may, with a client,
> **keep the reps above eight reps at all times regardless of whether I make a weight jump**. So what I might
> do is I might start at three sets of ten with the thirties. And then **by the time that they can do eleven
> or twelve reps for three sets, I might jump** the thirty fives. Thirty to thirty five is a relatively small
> jump compared to going from fifteen pounds to twenty pounds on some exercise, as that's a twenty five
> percent increase."*

Three separate rules in one breath:

1. **The band is chosen by the coach and fixed.** 8–12 for that client on that exercise.
2. **Load moves only at the TOP of the band** — 11–12 for all sets.
3. **The floor is never breached.** *"Regardless of whether I make a weight jump."*

### The stagger

> *"If I've got three sets of ten with the thirties and they move pretty well, I might say, let's do two sets
> of eight with the thirty fives and then one set of eight with the thirties. That way the load increase,
> even though it's not very small relatively in percentage, is slightly offsetted by the volume being ever so
> slightly lower."*

### The same move at the top of the band — and it is NOT the same

> *"If she's doing three sets of twelve at thirty fives and is grinding hard, what I would do is go to forties
> for **one set of eight**, and then **one set of twelve** with the thirty fives and **one set of ten** with
> the thirty fives. You don't literally have to do that, but I'm playing around with the reps and the relative
> intensities."*

**One** set promoted, not all-but-one. And the sets left behind **keep real reps** (12 and 10) — they are not
reset to anything.

### Why the promoted set drops reps at all

> *"A lot of strength is a central nervous system adaptation. When you go from thirty fives to forties, the
> percentage load increase is very high even if it's only five pounds. Your body doesn't recognise that…
> they will send an inhibitory signal to the muscle fibre to not contract as hard, to protect itself, just
> because the load on the tendon is unfamiliar. So that is why I would drop the reps from twelve to eight
> even though it's only a five pound increase."*

### The exchange rate between the levers

> *"As a good rule of thumb, every 5 pounds that you put on their back is going to decrease their rep count by
> two or three reps."*

> *"If I'm doing a set of ten reps and more, if I just add a rep week over week with the same weight, you're
> increasing the total workload by ten percent each set. So that won't necessarily promote a strength
> adaptation as much… But what you won't downplay from that at all is hypertrophy. So this can be helpful for
> **exercises after your big heavy hitters**, which are usually done earlier in the session."*

**Position in the session picks the lever.** Early = load. Late = reps.

### Direction

> *"Where load comes down, volume goes up. And as load goes up, volume comes down."*

> *"Why is the load going down and the volume going down? Those two things are contrary. That's how you lose
> gains."*

### Something must change

> *"Each week on that exercise… there is an increase in stress, and you can either get that from adding a rep,
> adding a little bit of load on the bar, or introducing another way or variation of doing something similar."*

---

## 2. The single root cause of the bad progressions

**`bandForReps()` in `repRanges.ts` invents a rep range from the current rep count.** It has no quote behind
it. Jack's band is *chosen and fixed*; this one is *derived and floating*. Both failures he reported come
straight out of it.

### The bench: 4×6 @ 225 → `230×3, 230×3, 230×3, 225×6`

`bandForReps(6)` returns **[3, 6]** — the 3–6 "middle strength" zone.

- 6 reps is therefore read as **the top of the band**, so the load jumps.
- The promoted sets land on the band **floor of 3**.

Both conclusions are artefacts of a band nobody chose. He programmed 4×6; the app decided that meant
"3 to 6" and that he had earned a jump. Against his own rule the reps should never have gone below the
floor, and the floor should never have been 3.

### The leg curl: 2×14, and the load never moves

`bandForReps` deliberately *"prefers the zone this rep count has ROOM TO GROW IN"*. So:

- at 12 reps the band becomes 12–15, not 8–12;
- at 14 reps it is still 12–15, so there is still room, so **reps climb again**;
- the load lever never fires.

The band chases the reps upward forever. Jack's rule is the opposite: **the band is fixed, and hitting 11–12
is the trigger to add weight.** Hence his question, which is exactly the right one:

> *"I did two sets of 14 last time… why not add a little bit of load and keep the volume the same?"*

At 14 reps he is two reps past where his own rule says the weight should already have moved.

### What is actually missing

**The app stores no per-exercise rep range.** `proposeNextWeek` gets a single `targetReps` number and has to
guess a range around it. G1 — which survived the audit — says the range is a real per-exercise property and
that the block's trajectory is chosen from the models in §3. Neither exists in the running code.

---

## 3. Other divergences the audit found

| What the code does | What he said |
|---|---|
| `jumpLoad` promotes **all but one** set | *"Go to forties for **one set of eight**"* — one set |
| Sets left behind are held as-is | He gives them **different** reps (12 and 10) deliberately |
| Lever chosen by rep count (`leverPreferenceFor`) | Lever chosen by **position in the session** (P3) |
| Only Model C is implemented | G1: Models A, B and C are **all legal**; A is "reps flat all block" |
| Deload decided by `sessionsPerWeek >= 5` alone | The coach's own `hasDeload` flag exists and is never read |
| `rolesFor` / `FOUR_WEEK_ROLES` | Zero callers — unwired |
| Models A and B in `relativeIntensity.ts` | Zero callers from the progression path — unwired |

---

## 4. What I got wrong, precisely

Every failure was the same error: **taking a worked example and applying it outside the range it came from.**

- "Promoted sets land on the band floor" came from a **dumbbell** example, 30→35 lb, a **16%** jump, where
  dropping 12 reps to 8 is proportionate. I applied it to a barbell at **2.2%** and charged three reps.
- "Two clear readings, add a set" is his rule, but I applied it to a 2-set accessory where a third set is
  **+50%** volume for that exercise.
- The nutrition stall threshold (0.1%/week) was reused as the *maintenance drift* threshold, where it means
  the opposite thing.

The doctrine files were closer to right than the code in every case. **The code is where the over-generalising
happened.**

---

## 5. Open, and needs his ruling

1. **Per-exercise rep range.** The fix for both bugs. Where does it come from — the coach types it, or it is
   inferred once at program build and then frozen?
2. **Does the band floor apply to a 6-rep strength lift?** His quote says "above eight reps at all times" for
   a general-population client on an 8–12 band. His own bench runs at 6.
3. **One set promoted or all-but-one?** His two examples differ, and he said so himself.
4. **Session position as the lever chooser** (P3) — not implemented at all.
