# Jacked — state of the product

An honest working assessment of what this app actually is today, written from the codebase rather than
from intent. Purpose: give a reader (human or AI) enough grounding to scope real improvements, and to
know which parts are load-bearing versus which are still scaffolding.

*Generated 2026-09-03. Re-verify against the code before quoting any of this externally — it will drift.*

---

## What it is

A coach + client hypertrophy training and nutrition app, delivered as an installable PWA (iOS home
screen). One codebase serves two distinct apps: a coach-facing side for programming and roster
management, and a client-facing side for logging workouts and food.

The distinguishing bet is the **coaching relationship**, not the logging. Plenty of apps let you log a
workout. This one is built around a coach prescribing, a client executing, feedback flowing back, and the
coach adjusting volume off that feedback.

Three account types, which is a real product decision rather than a permissions detail:

- **Client** — fully prescribed, sees only what their coach builds
- **Friend/family** — self-directed, builds their own programs and sets their own nutrition, still
  attached to a coach who can view and edit
- **Coach** — own fully isolated roster; any number can sign up independently

## Who it's for

Built first for its author (a coach who trains himself and a small circle), with multi-coach isolation
already in place so other coaches can run independent practices on the same deployment.

---

## What is genuinely built and working

Everything below runs on real, persisted, multi-device data:

- **Auth and multi-tenancy.** Supabase-backed, password auth, row-level security. Coaches are genuinely
  isolated from one another — verified at the policy level, not just hidden in the UI. Independent coach
  signup is open and self-serve.
- **Invites.** Real database-backed per-person invite links; client vs friend is a coach-side trust
  decision. Access can be revoked (and restored) without deleting history.
- **Program building.** From scratch, from a saved coach template, or imported from a spreadsheet —
  including real RP-style periodization grid layouts, not just flat tables. Load prescribable as lb,
  %1RM, RPE, or RIR, per program with per-exercise overrides.
- **Scheduling.** Programs authored on a Monday-anchored weekly pattern get correctly placed when started
  mid-week, including a partial "week 0."
- **Workout logging.** Per-set weight/reps, warm-ups, extra sets, set removal with reason, exercise
  reordering, rest timers, special set types (clusters, dropsets, myo, AMRAP).
- **Progress.** Real lift history and trend views computed from logged data.
- **Nutrition.** Macro or hand-portion targets, meal logging, live food search against USDA FoodData
  Central and Open Food Facts, camera barcode scanning, and user-created custom foods.
- **Messaging.** Real two-way coach↔client threads.
- **Platform admin.** Owner-only ability to revoke a coach's access, deliberately scoped so it cannot read
  any coach's client data.

## What looks built but is not wired

This is the most important section in this document. These features are fully designed and rendered in
the UI, and a user would reasonably believe they work — but no real data flows through them.

1. **The coach's decision queue is demo data.** The Desk's "decisions waiting" — volume proposals, joint
   flags, missed weigh-ins — originates entirely from `src/coach/mockData.ts`. Real clients are created
   with `flags: []`, and no code path ever produces a flag from real client activity. The queue is the
   coach app's centerpiece and it is currently a shell.
2. **Soreness feedback is discarded.** The pre-session "has this muscle recovered?" check computes the
   right muscles (including synergists) and collects answers, then drops them on submit. Nothing is
   stored or sent. The stated purpose — telling a coach whether a muscle's volume is too high — is not
   yet possible.
3. **Post-session feedback is discarded.** Pump ratings and joint-pain reports show a toast saying the
   coach was notified. No notification is produced.
4. **Volume auto-regulation doesn't exist.** The UI references applying volume proposals and holding sets
   at last week's number; there is no engine behind it.

None of this is hidden or dishonest in intent — it's a prototype whose UI ran ahead of its backend. But
the gap is systematic and concentrated in exactly the area the product claims as differentiated.

**The common root cause is a single missing primitive:** there is no table or channel for client-generated
signals to reach a coach. Messaging is the only real client→coach path. Adding a `client_events` or
`flags` table plus one narrow RPC would unlock items 1–3 simultaneously — it is one piece of plumbing, not
four features.

---

## Architecture, briefly

React 19 + TypeScript + Vite, HashRouter, Supabase (Postgres + Auth + RLS), Vercel. No CSS framework —
one hand-written design system. See `CLAUDE.md` for the engineering detail.

The notable structural decision: **client and coach state are each stored as a single JSONB blob** keyed
by account, rather than a normalized schema. This was a deliberate tradeoff to let a localStorage
prototype gain a real backend without rewriting the reducer and UI layers.

- **Bought:** very fast migration to a real backend, no ORM, schema changes to app state need no migration.
- **Paid:** you cannot query across clients in SQL. "Show me every client whose back volume is below MRV"
  is not expressible against the database — it requires loading and scanning blobs in application code.
  Any analytics, cross-client insight, or coach dashboard intelligence hits this wall.

That tradeoff is fine today and is the main thing that will need revisiting if the product grows toward
data-driven coaching, which is the direction its own UI already points.

---

## Known technical debt and risks

| Item | Notes |
|---|---|
| **No tests** | Zero. No unit, integration, or e2e. Verification is manual, in a browser, on a real phone. |
| **Migrations are manual** | `supabase/migrations/*.sql` is a hand-kept record, applied by pasting into the Supabase SQL editor. Nothing enforces that a committed migration was ever run — this has silently broken a feature at least once. |
| **Bundle size** | ~1.2 MB (~325 KB gzipped), single chunk. ~40% is the barcode decoder. No code splitting or lazy loading. |
| **JSONB read-modify-write** | Whole-state upsert on every change. Two devices editing the same account concurrently would last-write-wins over each other. |
| **Open Food Facts via JSONP** | Their API sends no CORS headers, so lookups load through a `<script>` tag. Works, but it's an unusual dependency shape. |
| **Food data quality** | USDA branded entries contain real manufacturer data-entry errors. A plausibility filter catches the impossible ones; subtler errors pass through. |
| **No payments, no plan tiers** | Nothing exists for monetization despite the stated intent to sell coach access. |
| **Single environment** | No staging. `main` deploys straight to production. |
| **Cost exposure** | Free tiers throughout (Supabase, Vercel, USDA). Fine now; all become real line items with load. |

---

## Where the leverage is

Roughly ordered by value relative to effort.

**1. Close the client→coach signal loop.** One table plus one RPC turns four hollow features into real
ones and makes the coach app's central screen functional. Highest-value work available, and it is
plumbing rather than invention.

**2. Then build the volume intelligence on top of it.** Once soreness, pump, and joint reports actually
persist, the "your back has headroom to MRV" proposal the UI already promises becomes computable. This is
the actual product differentiator and currently the largest gap between promise and reality.

**3. Add tests around the parts that are hard to verify by hand.** Program scheduling (week-0 math),
spreadsheet import parsing, and load-mode conversion are pure functions with real edge cases that have
already produced bugs. Cheap to cover, disproportionately valuable given manual-only verification.

**4. Automate migrations.** Adopt the Supabase CLI so committed migrations are provably applied. Removes
a class of silent failure that has already occurred.

**5. Code-split the bundle.** Lazy-load the barcode scanner and the spreadsheet importer — both are large
and rarely used. Straightforward, meaningful mobile-load win.

**6. Payments, if the coach-SaaS direction is real.** Multi-coach isolation already works, which is the
hard part. Billing is the missing commercial layer, not a technical blocker.

**Deliberately not on this list:** a rewrite, a native app, or normalizing the schema. None are justified
by current constraints, and the JSONB tradeoff should be revisited only when cross-client querying
actually blocks something (see item 2 — it eventually will, but signal collection comes first).

---

## If this is being shown to someone technical

The honest framing: **the infrastructure is real and the intelligence layer is not yet.** Auth,
multi-tenancy, isolation, programming, logging, and nutrition all genuinely work on real data across
devices. The coaching-intelligence layer — the thing that would make this more than a logging app — is
designed, rendered, and unimplemented.

That is a legible and fixable position, and considerably better than the reverse. But anyone doing
diligence will find it quickly, so it is much stronger to name it than to be caught by it. The specific
credible claim today is a working multi-tenant coaching platform with a well-defined next build, not a
working volume-autoregulation product.
