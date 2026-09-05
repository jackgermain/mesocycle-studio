# The system as it exists today

Everything visual lives in **one file: `src/styles.css`, 367 lines.** No Tailwind, no CSS-in-JS, no
component library. Change a token here and every screen changes at once — which is what makes a
redesign of this size a realistic afternoon rather than a rewrite.

The catch: a lot of the app also sets `style={{ … }}` inline in the components. Those overrides win
over anything you change here. Where a class below is marked **⚠ often overridden inline**, expect
to also specify what the inline values should become, or the change won't fully land.

---

## Tokens, exactly as they are now

```css
:root {
  --color-bg: #161826;
  --color-surface: #232532;
  --color-surface-raised: #2a2d3d;
  --color-text: #e9e9ed;
  --color-divider: rgba(233, 233, 237, 0.16);

  --color-accent: #4ce08f;
  --color-accent-100: #effff6;
  --color-accent-200: #d2fbe4;
  --color-accent-300: #a5f4c7;
  --color-accent-400: #71e8a5;
  --color-accent-500: #3ccf82;
  --color-accent-600: #25a969;
  --color-accent-700: #1b8052;
  --color-accent-800: #155b3b;
  --color-accent-900: #123726;

  --color-neutral-100: #f3f5fe;
  --color-neutral-200: #e4e7f5;
  --color-neutral-300: #cfd3e5;
  --color-neutral-400: #b2b6ca;
  --color-neutral-500: #9397ab;
  --color-neutral-600: #75798c;
  --color-neutral-700: #595d6c;
  --color-neutral-800: #3f424d;
  --color-neutral-900: #292b31;

  --font-heading: "Inter", system-ui, sans-serif;
  --font-body: "Inter", system-ui, sans-serif;

  --space-1: 2.8px;
  --space-2: 5.6px;
  --space-3: 8.4px;
  --space-4: 11.2px;
  --space-6: 16.8px;
  --space-8: 22.4px;

  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 14px;

  --shadow-sm: 0 0 0 1px #3f424d;
  --shadow-md: 0 0 0 1px #595d6c, 0 6px 18px rgba(0, 0, 0, 0.55);
  --shadow-lg: 0 0 0 1px #9397ab, 0 16px 40px rgba(0, 0, 0, 0.65);
}
```

`--font-heading` and `--font-body` are the same family, so there is no typographic contrast between
headings and body anywhere in the app. The spacing scale is a 1.4× ramp producing awkward values
(2.8, 5.6, 8.4, 11.2) — which is a large part of why components ignore it and use round numbers inline.

Note: the shadows are **a 1px ring plus a drop**. The ring is doing the visual separating almost
everywhere; the drop barely registers on a dark background. Worth reconsidering as a pair.

---

## Class inventory

Usage counts are approximate occurrences across `src/**/*.tsx`. High counts mean high leverage —
and high blast radius.

### Layout

| Class | Uses | What it does |
|---|---|---|
| `.app-root` | 1 | `position: fixed; inset: 0`. **Do not give this a height.** See constraint 2 in the brief. |
| `.app-shell` | 3 | Column flex inside app-root |
| `.screen` | 122 | A full screen: header + scrolling body + tab bar |
| `.screen-scroll` | 68 | The scrolling body. Owns the gap between stacked children — the main vertical rhythm of the app. |
| `.row` | 255 | Flex row, centred, with a gap. The most-used class in the codebase. |
| `.hdr` / `.hdr.hero` | 13 | Screen header. Has the safe-area top padding. |
| `.hero-box` | — | The big stat block on Desk and other landing screens |

### Surfaces

| Class | Uses | What it does |
|---|---|---|
| `.card`, `.cell` | 100 | **The same rule.** Everything is one of these — list rows, form groups, alerts, stat blocks. **This is the single biggest problem to solve.** |
| `.link-row` | 36 | A tappable row with an icon, label and chevron |
| `.sheet` / `.sheet-backdrop` | 56 / 27 | Bottom sheet and its scrim. Every modal in the app. |
| `.elev-sm` / `.elev-md` | 16 | Adds a shadow on top of a cell |
| `.divider` | — | A 1px rule |
| `.toast` | — | Transient confirmation, bottom of screen |

### Type

| Class | Uses | What it does |
|---|---|---|
| `.h1` | 20 | Screen title |
| `.k` | 16 | Kicker above a title — small, uppercase, muted |
| `.sh` | 54 | Section heading between blocks |
| `.scr` | 66 | A small uppercase label, used inside cells |
| `.mu` | 187 | Muted secondary text. **The most-used type class by far** — it carries most of the app's explanatory writing. |
| `.name` | 38 | A person or exercise name |
| `.trunc` | 43 | Single-line ellipsis |

`.h1`, `.k`, `.sh`, `.scr`, `.mu`, `.name` are the whole type system. There is no defined scale
behind them — sizes were chosen one at a time.

### Controls

| Class | Uses | What it does |
|---|---|---|
| `.btn` | 123 | Base button |
| `.btn-primary` | 35 | Filled green — the main action |
| `.btn-secondary` | 49 | Outlined/neutral |
| `.btn-solid` | 29 | A third, darker-green style. **Overlaps confusingly with primary.** |
| `.btn-ghost` | — | Text-only |
| `.btn-block` | 67 | Full width |
| `.btn-icon` | 13 | Square icon-only |
| `.input` | 42 | Text input and textarea |
| `.field` | 25 | Wrapper around a label + input pair |
| `.field label` | 25 | Label above an input |
| `.chip` / `.chip.on` | ~30 | Small selectable pill. Used heavily in the feedback flow. |
| `.pill-opt` / `.on` | ~15 | Bigger rating option — the 1–5 pump and 1–4 joint scales |
| `.seg` / `.seg-opt` | — | Segmented control |
| `.stepper` | — | The −/+ number control. **⚠ often overridden inline.** Used on every set row. |
| `.setrow` | — | One set's row in a workout. **The most important layout in the app.** ⚠ heavily inline-styled. |
| `.meter` / `.meter-fill` | — | Progress bar, incl. a `.lg` variant |
| `.tag` + `.tag-accent` / `.tag-neutral` / `.tag-outline` | 25 | Small status label |
| `.avatar` | 7 | Circular initials |
| `.progress-steps` | 3 | Step dots in the feedback flow |

### Navigation and other

| Class | Uses | What it does |
|---|---|---|
| `.tb`, `.tbi`, `.tbi.on`, `.tbi-icon` | — | The bottom tab bar. **Its background must equal `--color-bg`** — see constraint 2. |
| `.ai-fab` | 1 | Floating AI button, sits above the tab bar |
| `.hscroll` | 5 | Horizontal scroller for chip rows |
| `.action-row` | — | Row in an action list |
| `.has-preview-banner` | 1 | Resets header padding when the coach is previewing as a client |

### Icons

**Phosphor Icons**, via classes like `ph ph-sparkle` / `ph-fill ph-check-circle`. Sizes are set
inline, usually 11–20px. Assume this library stays.

---

## The specific problems, stated plainly

Solve these and the app looks like a different product:

1. **One surface for everything.** `.card`/`.cell` is a critical alert, a settings row and a stat
   block. There is no visual hierarchy between them. **This is the highest-value thing to fix.**
2. **Three primary-ish buttons.** `.btn-primary`, `.btn-solid` and green-tinted `.btn-secondary`
   compete. It's often unclear which action on a screen is the main one.
3. **No type scale.** Six type classes, sizes picked ad hoc, plus a lot of inline `fontSize`.
4. **Spacing tokens exist and are ignored.** The 1.4× scale produces awkward values (2.8, 5.6,
   8.4, 11.2) and the components use round numbers inline instead. Either make the scale usable or
   admit it's dead and replace it.
5. **One density for two audiences.** A lifter's set row and a coach's program builder row have the
   same padding and want opposite things. A density notion — or a second spacing set for dense
   screens — would help a lot.
6. **Depth is decorative rather than structural.** Ring-plus-drop shadows applied inconsistently;
   nothing reliably signals "this floats above that".
