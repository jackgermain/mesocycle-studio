# How the answer has to come back

Read this before designing anything. It constrains what you produce.

Your output is going to be handed to an engineer who will apply it directly to `src/styles.css`. They
will not have you available to ask follow-up questions. **Anything you leave to interpretation gets
interpreted, and probably not the way you meant.**

So: no mood boards, no adjectives standing in for values, no "consider using more whitespace."
Every visual decision arrives as a number or a colour.

Produce exactly these five sections, in this order.

---

## Section 1 — The idea, in five sentences or fewer

What the redesign is doing and why. This is the only prose in the document. It exists so the
engineer can tell whether a later decision is being applied faithfully or not.

---

## Section 2 — Tokens

A complete `:root` block, ready to paste. **Every token in `02-CURRENT-SYSTEM.md` must appear**, even
if unchanged, so nothing silently disappears. Add new ones freely — just define them here.

```css
:root {
  --color-bg: #______;
  /* …every existing token, with its new value… */
  /* …plus any you're adding… */
}
```

Then, immediately after: a short table of **only what changed**, with a reason each.

| Token | Was | Now | Why |
|---|---|---|---|
| `--color-surface` | `#232532` | `#______` | |

If you add a token, say where it gets used. An undefined token referenced from a class is a broken
build, not a design.

---

## Section 3 — Classes

For every class you're changing, the **complete replacement rule** — not a diff, not "add
`border-radius: 12px`". The whole block, so it can be swapped in wholesale.

```css
/* .cell — [one line: what this is now for] */
.cell {
  /* every declaration */
}
```

Group them: Layout, Surfaces, Type, Controls, Navigation.

**The surface problem needs an explicit answer.** `02` explains that `.card`/`.cell` is currently
doing five jobs. Either split it into named variants (`.cell`, `.cell-raised`, `.cell-alert`, …) or
say plainly that one surface is correct and how hierarchy is carried instead. Don't leave it.

**Say which classes you deliberately did not touch**, so their absence reads as a decision.

---

## Section 4 — Inline overrides to replace

Several components set `style={{ … }}` inline, and those beat anything in the stylesheet. Where your
design depends on changing one, list it:

| Where | Current inline value | Should become |
|---|---|---|
| set rows in `ExerciseSection.tsx` | `padding: "6px 0"` | |

If you don't need any changed, say so — it's a meaningful answer and saves a hunt.

---

## Section 5 — Anything needing a component change

Some ideas can't be done in CSS: a new element, a reordered layout, a split component. List them
separately with a one-line description each, and **do not attempt them** — that's a different job
with different risks, and mixing it in makes the CSS pass unsafe to apply.

---

## Hard constraints — a design that breaks any of these can't be used

1. `.app-root` gets **no height property**. No `vh`, `dvh`, `%` or `height`. It is
   `position: fixed; inset: 0` and must stay that way.
2. `.tb` background must equal `--color-bg` exactly.
3. Keep `env(safe-area-inset-bottom)` in `.tb` and `env(safe-area-inset-top)` in `.hdr`.
4. Dark only. No light theme, no `prefers-color-scheme` block.
5. Body text no smaller than 12px; numbers in set rows no smaller than 15px.
6. Anything tapped mid-workout keeps a ≥44px touch target.
7. Text on a surface: ≥4.5:1 contrast. Muted text ≥3:1. It gets read in bad light.
8. `--color-accent` keeps its meaning: progress, done, confirm, AI. Not decoration.

## Two things to get right that are easy to miss

**Density.** A lifter's set row and a coach's program builder want opposite spacing. If your answer
is one spacing scale everywhere, say why that's right. If it's two, define both.

**`.mu`.** It appears 187 times and carries most of the app's explanatory text. Whatever you do to
it changes the feel of the whole product more than any other single decision. Treat it as a major
one, not a footnote.
