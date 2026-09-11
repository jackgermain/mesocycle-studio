# Program engine prototype

The Python engine behind the review pages Jack approves before any rule goes into the app. It builds whole
programs for made-up people, simulates what they log, and shows every week's decision with its reason.

| File | What it is |
|---|---|
| `progress.py`, `build.py`, `people.py`, `subs.py` | v1 — the twenty programs |
| `progress2.py`, `build2.py`, `people4.py` | v2 — the four programs (3×–6× a week), with the twenty-program critique applied |
| `meta.py` | muscle, systemic cost and priority for every exercise the templates use |
| `templates.json` | the base men's and women's templates, 2–6 days |

`python3 build2.py` writes `four-programs.html` next to it. The HTML is generated, so it is not kept here.

**This is not the code the app runs.** The app's progression rules are in `src/shared/progressionProposal.ts`
and `src/generator/`, and the rules in words are in `src/generator/doctrine/`. A rule is tried here first, and
moves into the app once Jack has reviewed it.

The working copy lives in `~/Desktop/Jacked-Brain/programs20/`. This folder is its backup, so it is not
only on one laptop.
