# What nine real programs say about the templates

Read from nine spreadsheets Jack wrote for real clients — Palo Alto hills country-club demographic,
middle-aged, wealthy parents. This is the "decide what actually differs between them" step from
`PROGRESSION-ENGINE.md`, done against real programming rather than guesses.

Structure of the sheets: **columns are the days of the split, vertical blocks are successive weeks,
oldest at the top.** Each week was copy-pasted from the one above and then had its weights and reps
adjusted.

---

## The nine

| Program | Days/week | Training days | Exercises per session | Weeks written |
|---|---|---|---|---|
| Carolyn Stuart | 2 | Mon, Fri | 9 / 9 | 6 |
| Marco Borla | 2 | Mon, Fri | 9 / 9 | **41** |
| Teressa Baer | 2 | Mon, Fri | 11 / 12 | **24** |
| Arish | 3 | Tue, Thu, Sat | 8 / 8 / 8 | 2 |
| Vanessa Clark | 3 | Mon, Wed, Fri | 8 / 9 / 9 | 13 |
| Wasiqua | 3 | Mon, Wed, Fri | 7 / 10 / 9 | 13 |
| Jing MiaoMiao | 3 | Tue, Fri, Sun | 9 / 9 / 8 | **47** |
| Bella | 4 | Wed, Fri, Sat, Sun | 9 / 5 / 7 / 6 | 8 |
| Colin Morfit | **4** | Mon, Wed, Fri, Sat | 7 / 7 / 8 / 5 | 2 |

Colin's file is named "3x" but the split has four days. Worth a look — either the name or the split is
wrong.

---

## The three findings that matter

### 1. These aren't 6-week blocks. They're continuous.

Jing has **47 weeks** written. Marco 41. Teressa 24. These programs ran for the better part of a year with
the same split, adjusted weekly.

That is the open-ended block, and it is how this coaching already works. Fixed-length mesocycles with a
deload on the last week were the app's assumption, not the practice — which is why "run until I end it"
mattered and why removing the automatic deload label mattered.

### 2. The programs barely differ structurally.

Across all nine: **8–9 exercises a session** (range 5–12), **2 or 3 sets** almost exclusively, **10–20
reps**, descending across sets — `15,13` / `14,12` / `13,11,9` / `12,10,8`. Sub-10 reps are rare. Core
work appears in nearly every session.

So the generator's job is **not** choosing a structure. The structure is near-constant. It is choosing
*which exercises fill a fixed shape*, which is a much more tractable problem than it looked.

### 3. The equipment is a country-club gym, and the vocabulary is wider than the library.

Most-used across all nine: Dumbbell Lateral Raise, Assisted Pullups (117 uses), Seated Cable Row, Cable
Curls, Incline Dumbbell Press, Lat Pulldown, Seated Leg Curls, Chest Press Machine, Overhead Tricep
Extension, Smith Machine Squat, Incline Smith Press, Leg Extension, Captains Chair Leg Raise.

Machines, cables, Smith machines, dumbbells, assisted and supported variants. Free barbell work appears
almost only as RDLs. That is a joint-friendly, low-skill-floor selection appropriate to the demographic,
and it is a deliberate pattern rather than an accident.

But roughly **400 distinct exercise names** appear across the nine, against **149** in the app's library.
Names like "Super ROM Lateral Raise", "Starfish Crunch", "Top Circles", "Lat Prayer" and "Ball Squat Jump
Toss" have no library entry. Either the library grows or `customExercises` carries the difference — and
the generator can only ever prescribe from what it can name.

---

## What the questionnaire therefore has to detect

Derived from what actually varies above, not from what an intake form usually asks:

1. **Days a week** — the only structural differentiator across all nine. Already captured.
2. **Equipment** — every one of these assumes a full commercial gym with Smith machines, cable stations,
   an assisted pull-up machine, leg curl and hack squat. None would run in a home gym. Already captured,
   and the free-text field matters more than the category.
3. **Volume tolerance** — Teressa carries 11–12 exercises a session, Bella's second day carries 5. That
   spread is real and is not explained by frequency. Worth asking, and currently not asked.
4. **Joint constraints** — the pervasive use of supported and assisted variants is presumably answering
   something. Captured as injuries/age.

What does **not** need asking, because it does not vary: set count, rep range, session length, split
structure. Those belong in the doctrine as defaults, not in an intake form.

---

## Consequences for the build

- **Templates should be open-ended by default** for this demographic, not fixed-length.
- **The generator picks exercises into a fixed shape** — 8–9 per session, 2–3 sets, 10–15 reps
  descending — rather than designing a structure from scratch.
- **Library coverage is the first real blocker for generation.** An exercise the app cannot name is an
  exercise the generator cannot prescribe and the validator will reject.
- These nine are *client programs*, not templates. Turning them into templates means stripping the person
  out and naming what each is for — which is what `intendedFor` on a template is now there to hold.
