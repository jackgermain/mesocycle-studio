# Jacked

A coach + client hypertrophy training and nutrition app. React SPA, Supabase backend, deployed as an
installable PWA. Built by and for Jack Germain, with the intent of eventually selling access to other
coaches to run their own independent rosters on the same platform.

---

## Where everything lives

| What | Where |
|---|---|
| Local working copy | `~/Desktop/mesocycle-studio` |
| GitHub | `git@github.com:jackgermain/mesocycle-studio.git` (branch `main`) |
| Live app (canonical) | https://jackedapp.vercel.app |
| Live app (old alias, still works) | https://mesocycle-studio.vercel.app |
| Hosting | Vercel — auto-deploys on every push to `main` |
| Database / auth | Supabase project `gugoeovklgrlmyiimxqt` |

The Vercel project is still *named* `mesocycle-studio`; only the domain was rebranded. Both domains serve
the identical deployment. The old one is kept alive deliberately so previously-shared links and any
home-screen icon installed from it keep working.

## Stack

React 19 + TypeScript + Vite 8, React Router (**HashRouter** — hence the `#/` in every URL),
`@supabase/supabase-js`, `@zxing/browser` for barcode scanning. No CSS framework — one hand-written
design system in `src/styles.css` plus inline styles. No test suite.

```bash
npm run dev      # vite dev server
npm run build    # tsc -b && vite build  ← the real gate, see "Build verification" below
npm run lint     # oxlint
```

### Environment variables

Live in `.env` locally (gitignored) **and** must be set separately in Vercel → Settings → Environment
Variables, since `.env` is never committed. Changing one in Vercel requires a redeploy to take effect.

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` — publishable/anon key, not a secret; RLS is the real boundary
- `VITE_USDA_API_KEY` — USDA FoodData Central key (falls back to the rate-limited `DEMO_KEY` if absent)

---

## Accounts and roles

One row per person in `accounts`, 1:1 with Supabase `auth.users`. Sign-in is **password-based**
(`signInWithPassword` / `signUp`), not magic links.

| Role | Can do |
|---|---|
| `coach` | Own roster, own clients, own programs. Fully isolated from other coaches. |
| `client` | Fully prescribed — sees only what their coach builds for them. |
| `friend` | Self-directed friend/family. Builds/clones their own programs, sets their own nutrition targets. Still attached to a coach who can view and edit their stuff. |

Two flags sit on top of the roles:

- **`active`** — set false to revoke access. `src/lib/auth.tsx` checks it on every session load and
  force-signs-out a revoked account. A coach can flip this for their own clients; the platform admin can
  flip it for any coach.
- **`is_platform_admin`** — a platform-owner capability, deliberately separate from the role system.
  Currently only Jack's account. Grants exactly two things: list coach accounts (name / signup date /
  active status only), and revoke or restore one. It cannot read any coach's roster or data — that's
  enforced by the shape of the RPCs, not by UI. Set directly in SQL; there is no UI to grant it.

### Onboarding paths

- **New coach**: just open the app root and hit "Set up as the coach." Open self-serve signup, no invite
  needed. Any number of independent coaches can sign up (migration `0009`).
- **New client / friend**: a coach generates a per-person invite link at Clients → Invite someone.
  Client vs friend is a **trust decision made by the coach**, not something the recipient picks — that's
  why there's no single "pick your own role" link.
- The Coach option on that same screen is just the plain app URL, since coach signup isn't invite-gated.

All shareable links are built by `shareBaseUrl()` in `src/shared/appUrl.ts`, which hardcodes the canonical
`jackedapp.vercel.app` origin so a link generated from the old domain (or an old home-screen icon) still
carries the branded address. Localhost is exempt so dev-generated links stay testable.

---

## Data model

Four tables, all with RLS enabled:

- **`accounts`** — `id`, `role`, `display_name`, `coach_id`, `active`, `is_platform_admin`, `created_at`
- **`client_state`** — `account_id` + one `jsonb` blob. The entire client-side reducer state (program,
  meals, weigh-ins, custom foods, profile) is serialized here wholesale.
- **`coach_state`** — same idea for the coach app (clients, programs, threads, custom exercises).
- **`invites`** — `code`, `coach_id`, `role`, `client_name`, `claimed_by`, `used_at`

The jsonb-blob approach was a deliberate choice to avoid rewriting the existing reducer/UI code when the
backend was added. `StoreProvider` hydrates the blob on mount and upserts the whole state object on every
change. **Consequence worth knowing**: adding a field to `AppState` needs no migration, but adding a
*column* to `accounts` and then selecting it in `loadAccount()` will break sign-in for everyone until the
migration is applied — see "Migrations" below.

Both hydrate paths merge onto a blank state (`{ ...buildBlankState(), ...remote }`) so a row saved before
a field existed doesn't hydrate as `undefined` and crash its first reader.

### RPCs

RLS is kept strict; anything needing a narrow cross-boundary read goes through a `security definer`
function rather than a relaxed policy:

| Function | Purpose |
|---|---|
| `bootstrap_coach(display_name)` | Self-serve coach signup |
| `claim_invite(code, display_name)` | Turns an invite into a real client/friend account |
| `get_invite(code)` | Public, safe-fields-only invite preview before sign-in |
| `get_coach_templates()` | Lets a friend/family account browse only their coach's templates |
| `get_my_thread()` / `send_client_message(text)` | Client side of coach↔client messaging |
| `list_coaches_for_admin()` / `set_coach_active_as_admin(id, active)` | Platform admin only |

---

## Migrations — read this before touching the database

`supabase/migrations/*.sql` is a **hand-maintained record, not an applied migration chain.** There is no
Supabase CLI configured and no automation. Every migration has been applied by Jack pasting it into the
Supabase SQL Editor by hand.

This has bitten the project twice, both times the same way:

1. `0002_coach_templates.sql` was written and committed but never run, so `get_coach_templates()` silently
   returned `[]` for months — the saved-templates list looked empty even though saving worked fine.
2. `0010_platform_admin.sql` had to be applied *before* the frontend that selected its new column could be
   deployed, or `loadAccount()` would have failed for every account and broken sign-in globally.

**So: when a change needs SQL, hand Jack the SQL to run, confirm it succeeded, and only then push the
code that depends on it.** Never assume a migration file in the repo is live.

---

## Build verification — do not skip

The Vite dev server transpiles with esbuild/oxc and **does not type-check.** A change can pass every
dev-server check, work perfectly in the browser, get pushed, and still silently fail the Vercel build,
because Vercel runs `tsc -b && vite build`.

Always run the real build locally before treating anything as verified:

```bash
npm run build
```

If a pushed commit's bundle hash doesn't change on the live site within a minute or two, suspect a failed
build rather than a slow one, and go run `tsc -b` locally to find the error.

To confirm a deploy actually went live, compare the local build's asset hash against production:

```bash
grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' dist/index.html
curl -s https://jackedapp.vercel.app/ | grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' | head -1
```

---

## Feature notes worth knowing

**Programs.** A program is weeks × days × exercises × sets. Load can be prescribed in four modes — `lb`,
`pct1rm`, `rpe`, `rir` — per program with per-exercise overrides (`src/coach/loadMode.ts`). Programs can
be built from scratch, cloned from a coach template, or imported from a spreadsheet
(`src/coach/csvProgram.ts` handles real RP-style grid layouts, not just flat tables).

**Week 0.** Weekly patterns are authored assuming Day 1 is Monday, but programs get started on whatever
day someone presses go. `scheduleWeeks()` in `src/shared/programConvert.ts` puts week 1 on the real
upcoming Monday and runs any slots that would land on-or-after today as a partial "week 0."

**Soreness check.** Before a session, `computeSorenessDue()` (`src/shared/soreness.ts`) works out which
muscles today trains — primary movers *plus* a conservative synergist table (triceps on chest day, biceps
on back day) — and asks whether each has recovered since it was last trained. The exercise library only
tags one primary muscle per movement, hence the separate synergist mapping.

**Nutrition.** Macros or hand-portions mode. Food search hits USDA FoodData Central (primary — real
manufacturer label data, plain `fetch`) plus Open Food Facts (secondary — **JSONP, because their server
sends no CORS headers**). Both sources are filtered by a plausibility check that drops entries where
protein + carbs + fat outweigh the serving itself; USDA's branded data contains real manufacturer
data-entry errors and this catches the worst of them. Users can also create custom foods, stored per
account in `customFoods`.

**Barcode scanning.** Uses `@zxing/browser`, **not** the native `BarcodeDetector` API. That API is
Chromium-only; Safari has never shipped it, and this app's real target is an installed iOS PWA. This was
shipped wrong once and had to be redone — don't "simplify" it back to the native API.

**Viewport sizing.** `.app-root` uses `position: fixed; inset: 0` rather than any `vh`/`dvh`/`%` height.
Every height-unit approach tried previously left a gap of background below the tab bar on real iOS. Don't
reintroduce one.

---

## Conventions

- Comments explain **why**, not what. Several exist specifically to stop a past bug being reintroduced —
  read them before "cleaning up."
- Commit messages are detailed and explain reasoning, tradeoffs, and what was actually verified.
- The user tests on a real iPhone. Things that can't be verified in a sandbox — camera, real viewport
  behavior, installed-PWA behavior — should be called out as needing his check rather than claimed done.
