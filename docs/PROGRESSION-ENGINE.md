# Individualised progressions — the plan

The idea, in one sentence: **Jack picks the template; the algorithm individualises the progressions inside
it; simulations prove it behaves before a real person ever sees it.**

Template selection stays a human decision. That is what bounds every mistake the engine can make — it
cannot put someone on the wrong program, only tune volume badly inside one that already fits, and every
tune is a proposal that gets reviewed before it applies.

---

## The one architectural rule

**The progression decision is deterministic code. The model never picks the numbers.**

Same inputs → same output, every time, forever, and assertable in a test. An LLM asked "how many sets next
week?" returns a defensible number that quietly differs next Tuesday, and consistency is the specific thing
we are trying to achieve.

The model earns its place on the edges:

| Job | Who does it |
|---|---|
| How many sets next week, hold, back off, deload | **Rules engine** |
| Reading free-text questionnaire answers into structured fields | Model |
| Reading free-text session feedback ("shoulder felt weird at the bottom") | Model |
| Writing the explanation attached to a proposal, in Jack's voice | Model |
| Helping author and stress-test the rules, offline | Model |

---

## Where this lives

**In this repo, not a separate project.** The engine needs `Program`, `TrainingWeek`, `ClientSignal` and
`ClientProfile`, has to run inside the app to be useful, and the simulator needs the real program shapes.
A second repo buys nothing today and costs a types-duplication problem immediately.

The reuse Jack actually wants — *"assign algorithms to templates specifically"* — is not a repo question.
It's a registry:

```
src/progression/
  strategies/
    rpHypertrophyV1.ts     ← one named, versioned strategy
    lowVolumeReturnV1.ts
  registry.ts              ← id → strategy
  engine.ts                ← runs a strategy over a client's history
  simulate.ts              ← the harness
```

A `CoachProgram` carries `progressionId: "rp-hypertrophy-v1"`. Many templates share one strategy. Strategies
are versioned by id and never edited in place once a real client is running on them, so a client's history
always says which rules produced it.

---

## What already exists

Worth knowing before building anything — roughly 70% of the substrate is already here.

- **`client_signals`** — pump, soreness and joint pain per muscle per session, with severity. Real data.
- **Every set** stores prescribed vs actual reps, load and RIR/RPE.
- **`programAiEdit.ts` / `liveProgramAiEdit.ts`** — AI proposes → diff → human reviews → then it saves, with
  invariants enforced in code. Proposals ride this exact path.
- **The Desk** already renders `volume-proposal` flags with an **Apply** button that adjusts next week.
  The screen exists; today it is fed a hardcoded string from `coach/mockData.ts`.
- **`api/parse-program.ts`** proves the Anthropic call path works end to end.

What does not exist: any real intake questionnaire (`Onboarding.tsx` asks units and bodyweight), and any
week whose phase is not `"accumulation"` — no program has ever actually *been* a deload.

---

## The checklist

### Phase 0 — don't lose what can't be reconstructed
- [x] Record which template was assigned, when, cloned from what, and **why**, against the client
      (`ProgramAssignment`, append-only). Done — this is the dataset that eventually says whether template
      selection could be automated.
- [ ] Add `answers` to that record once the questionnaire exists (the slot is already there).

### Phase 1 — templates
- [ ] Build the first real template properly, end to end.
- [ ] Build 3–5 more covering the obvious demographic spread (days available, training age, equipment).
- [ ] Decide what actually differs between them — that difference is what the questionnaire has to detect.

### Phase 2 — the questionnaire
- [ ] Structured fields: training age, injury history, equipment, days available, goal, prior volume
      tolerance, per-muscle recovery tendencies.
- [ ] One or two free-text boxes, parsed by the model into the same structured shape.
- [ ] Stored on the client, snapshotted into `ProgramAssignment.answers` at assignment time.
- [ ] Shown to Jack when he picks a template — this is a decision aid, not an automatic selector.

### Phase 3 — the engine, one muscle
- [ ] Write the progression spec for **one template, one muscle group**. Starting volume, weekly increment,
      the conditions that trigger hold / add / back off, landmarks, how questionnaire answers move the
      starting point.
- [ ] `engine.ts`: `(profile, spec, last N weeks of signals + logs) → proposal[]`. Pure. No network.
- [ ] Emit the `volume-proposal` shape the Desk already renders.
- [ ] Run it against the Test Client's real logged data. Does it propose what Jack would have done by hand?

### Phase 4 — the simulator
- [ ] **Persona generator** — synthetic questionnaire answers across the demographic space.
- [ ] **Responder model** — given prescribed volume, what does this person report back (pump, soreness,
      performance, reps hit)? This is the hard half and the one people skip.
- [ ] Run engine × responder over 8–12 weeks, many personas, and assert:
      - no absurd outputs (40 sets for a novice, zero for someone recovering fine)
      - no oscillation (add 2, remove 2, add 2, forever)
      - convergence — volume does not drift up without a ceiling
      - edge cases hold (55-year-old novice, shoulder history, three days a week)
      - **consistency** — identical inputs give identical proposals
- [ ] Tune the rules against the simulator, not against real clients.

### Phase 5 — ship it behind review
- [ ] Proposals appear on the Desk with the model's explanation attached.
- [ ] Jack reviews every one before it applies. Nothing auto-applies, at least until it has been right for
      a long time.
- [ ] Log every proposal, whether it was applied, and what Jack changed it to. That disagreement log is the
      best training signal there will ever be for improving the rules.

---

## The honest limits

- **The responder model is Jack's own assumptions.** The simulator cannot tell him whether his coaching is
  right — only whether the algorithm is stable, consistent, and free of absurd outputs. That is still worth
  enormously more than waiting six weeks per iteration.
- **Cold start is the weakest point.** A new client has no feedback. Week 1 comes entirely from the
  questionnaire, the least reliable input in the system. Treat the first block as calibration and say so.
- **Volume landmarks per muscle per person are the actual expertise.** That part is Jack, encoded. There is
  nothing to look up and no model that knows it better than he does.
