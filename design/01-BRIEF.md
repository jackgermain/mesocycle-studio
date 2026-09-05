# Jacked — design brief

## What it is

A training and nutrition app for hypertrophy coaching. Two sides of the same product:

- **Coaches** build programs, assign them to clients, watch feedback come in, and adjust
- **Clients** follow what their coach wrote, log every set, and answer questions afterwards

A third kind of account — **friends & family** — is self-directed: they build their own programs
but a coach can still see and edit their stuff.

Built by a working strength coach, for his own roster first, with the intent of selling access to
other coaches to run their own rosters on the same platform.

## Who is actually holding the phone

**A lifter mid-session.** Standing between sets, one hand free, possibly sweaty, sixty to a hundred
and eighty seconds before the next set. They are tapping numbers up and down and ticking sets off.
This is the single most-used screen in the app and the hardest environment it runs in.

**A coach on the move.** Between sessions, checking who needs something. Scanning, deciding,
moving on. Their screens are dense on purpose — a roster, a list of reports, a program with sixteen
exercises and forty-eight sets.

These two want opposite things from an interface. The lifter wants enormous tap targets and almost
nothing on screen. The coach wants density and everything at a glance. **The design has to serve
both without becoming two apps.** That tension is the core problem to solve.

## How it's used

Installed to the iOS home screen as a PWA — no browser chrome, standalone, dark. **Almost always
a phone, almost always one-handed, frequently in a gym.** Desktop is not a target.

Everything is dark. That is not a preference to revisit: it's used in dim gyms and often late at
night, and a light interface here would be genuinely unpleasant.

## Screens, in rough order of how much they matter

**Client side**
1. `DayWorkout` — the live session. A list of exercises, each with rows of sets; every row has
   weight and reps steppers and a checkbox. Where the most time is spent, under the worst
   conditions.
2. `DayDetail` / `UpcomingDay` / `AllDaysCalendar` — the block, week by week
3. `Feedback` / `Soreness` — a short question flow after a session: rating pills, chips, a text box
4. `Nutrition` — macro targets, meals, food search, a barcode scanner
5. `Progress` / `AllLifts` / `LiftDetail` — charts and history
6. `BuildProgram` — self-directed program building and import
7. `Inbox` — messages with their coach

**Coach side**
1. `Desk` — the home screen. A greeting, a stat block, a roster bar, then client reports needing
   a decision, each with two actions
2. `ProgramDetail` — the program builder. Deeply nested: weeks → days → exercises → sets, with
   drag handles, steppers and menus. The densest screen in the app.
3. `Clients` / `ClientDetail` — the roster
4. `LogSession` — logging a session on a client's behalf; reuses the client workout components
5. `Messages`, `Programs`, `Library`, `AssignProgram`, `NutritionProtocol`, `PlatformAdmin`

## What must survive the redesign

These are constraints, not preferences. Each one is here because something broke.

1. **Never a light theme.** See above.

2. **The bottom of the screen is sacred.** `.app-root` is `position: fixed; inset: 0` and uses no
   `vh`, `dvh` or percentage heights. Every one of those left a strip of background below the tab
   bar on real iOS. The tab bar's background must also match the page background exactly — a
   mismatch there read as a broken seam and took three attempts to diagnose.

3. **Respect the safe area.** `env(safe-area-inset-bottom)` at the bottom, `env(safe-area-inset-top)`
   at the top. There is a preview banner that already clears the notch, and a
   `.has-preview-banner` rule that resets header padding so it isn't doubled.

4. **Tap targets stay big.** Steppers, checkboxes and set rows are operated with tired hands.
   Nothing that gets tapped mid-set should shrink.

5. **Numbers must be legible at a glance.** Weight and reps are the content. If a restyle makes
   them lighter, smaller or lower-contrast, it has failed regardless of how it looks in a mockup.

6. **Green means the accent, and it carries meaning.** `--color-accent` is used for progress,
   confirmation, "this is done", and anything AI-touched. It isn't decoration.

## What's wrong with it now — the honest version

Nobody has designed this. It grew screen by screen over months, and it shows:

- **Everything is a `.cell`.** One flat surface style doing the work of cards, list rows, form
  groups, stat blocks and banners. No hierarchy — a critical alert and a settings row look alike.
- **Spacing is arbitrary.** There's a spacing scale, and inline `style={{ padding: 11 }}` and
  `marginTop: 7` all over the components ignoring it.
- **Type is undifferentiated.** A handful of sizes between 11px and 16px with no clear ladder, and
  much of it is set inline rather than through a class.
- **Density is unmanaged.** The coach's program builder and the lifter's set rows use the same
  spacing values despite wanting opposite things.
- **Depth is inconsistent.** Shadows are defined as rings plus drops, applied unevenly, so some
  raised things look raised and others don't.
- **It reads as functional, not considered.** Correct, legible, unremarkable. It should feel like
  a tool a professional pays for.

## What "better" means here

Not decorative. This is a tool used under load. Better means:

- **Hierarchy** — a glance tells you what matters on the screen
- **Rhythm** — consistent spacing, so density feels deliberate rather than accidental
- **Calm** — fewer competing surfaces and borders; let space do the separating
- **Confidence** — numbers and actions that feel solid to hit
- **A recognisable character** — something that doesn't look like a bootstrap admin panel in dark
  mode. It's a strength app: it can afford to feel sharp and a little severe.

Two references worth having in mind for *feel*, not for copying: **Whoop** for calm dark density,
**Linear** for hierarchy and restraint.
