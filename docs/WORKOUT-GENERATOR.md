# Workout Program Builder — spec

A new function inside the existing app: **generate a first-draft program for a client, from their intake
plus the coach's direction, and hand it to the coach to approve or change.**

Kept modular on purpose — `src/generator/` — so it can be triggered from a client's page without being
tangled into the screens it's launched from.

---

## What already exists (audited, not assumed)

| Piece | State |
|---|---|
| Approved exercise library | **149 exercises, 17 muscle groups** in `src/coach/exerciseLibrary.ts`, brand-specific machines included |
| Per-coach additions | `coach_state.customExercises` (`LibraryExercise[]`) |
| Templates | `CoachProgram.isTemplate` + `visibility`, `get_coach_templates()` |
| Propose → diff → approve | `AiEditShell` + `diffProgram` / `diffTemplate` / `reconcileLiveProgram` |
| Invariants enforced in code | `liveProgramAiEdit.ts` — logged sets protected, deletions blocked |
| Claude call path | `api/edit-program.ts`, `api/parse-program.ts` (`claude-sonnet-5`) |
| Assignment provenance | `ProgramAssignment` — which template, why, and an `answers` slot |
| **Client intake** | **Missing.** `ClientProfile` holds units, height, bodyweight and macros. No age, goals, injuries, training age, or session frequency. |

**Intake is the blocker.** Everything else is assembly.

---

## The one rule about the exercise library

The model is **not asked** to stick to approved exercises. Its output is **validated** against
`libraryExercises ∪ customExercises`, and anything else is rejected before a coach ever sees it.

A prompt is a request; code is a guarantee. This codebase already works that way — `reconcileLiveProgram`
re-imposes the rules the model isn't allowed to break rather than trusting it to have followed them. Same
here. "Don't hallucinate" stays in the prompt as well, but it is not what makes it true.

---

## The flow

```
client intake + goals
      +
coach's direction (1-3 questions, asked at build time)
      ↓
determine needs        ← deterministic where it can be
      ↓
choose template        ← COACH picks. Not automated.
      ↓
select exercises       ← model, constrained to the library, validated in code
      ↓
apply starting volume  ← rules, from the progression spec for that template
      ↓
generate draft
      ↓
coach reviews the diff → approve, or ask for changes → regenerate
      ↓
assigned, and recorded in ProgramAssignment with the doctrine version
```

**Template selection stays human.** It is the decision with the widest blast radius and the one the coach
is best at. Everything downstream is individualisation inside a program that already fits.

**If the generator can't resolve something, it asks** rather than guessing — a missing piece of intake, an
ambiguous goal, a condition it has no stance on. Surfaced as a question in the review step, not silently
filled in.

---

## The build-time questions

One to three, asked of the **coach**, not the client, at the moment of generation. The trainer's read of a
person that no intake form captures:

- How hard do you want this person pushed to start? (conservative / normal / aggressive)
- Anything you know about them that isn't in their intake?
- Any movement you want in or out of this block?

Cheap, fast, and it is the difference between a generic draft and one that reflects the coach's judgment
about this specific person on this specific day.

---

## Two jobs, two tools

| | Initial draft | Week-to-week progression |
|---|---|---|
| Input space | Unbounded — any intake, any condition | Small, enumerable |
| Frequency | Once per client | Every week, every client |
| Human gate | Coach reviews every one | Most are never read closely |
| Needs | Judgment, breadth | Consistency, auditability |
| **Tool** | **Model, steered by doctrine** | **Rules engine** |

Point 5 of the brief — adjust on the go and have changes propagate downstream — is **recomputation**, not
generation. When a coach changes week 2, weeks 3+ are recalculated by the rules, not re-imagined by the
model. That is what makes it predictable enough to trust without reading every week.

---

## What has to be built, in order

1. **Intake** — the blocker. Structured fields (training age, injuries, goals, age, bodyweight trend,
   sessions per week, equipment) plus free text parsed into the same shape. Stored on the client,
   snapshotted into `ProgramAssignment.answers`.
2. **Doctrine file** — `src/generator/doctrine/v1.md`. The coach's parameters, versioned, injected as
   context, recorded by version against every draft. Not a prompt that gets edited in place.
3. **`src/generator/`** — the machine. `buildDraft(intake, direction, template, doctrine) → CoachProgram`,
   plus the validator that rejects any exercise outside the approved set.
4. **Trigger** — a button on the client page. Runs the flow, lands in the existing review/diff screen.
5. **Regeneration loop** — "ask for changes" re-runs with the coach's note appended, diffed against the
   previous draft rather than against nothing.
6. **Templates flagged automatable** — a toggle per template (the brief's suggestion, and the right one:
   make any template automatable rather than maintaining two kinds).

See also `docs/PROGRESSION-ENGINE.md` for the week-to-week half and the simulation harness.
