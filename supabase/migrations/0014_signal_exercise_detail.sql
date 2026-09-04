-- A joint pain report was only ever "where it hurt, how bad". That's enough to worry a coach and not
-- enough to do anything about it: the two real responses -- warm that movement up more, or swap it --
-- both need to know which exercise caused it, and whether it hurt on every set or only while warming up.
--
-- `exercise` is the movement the client named, kept as its own column because the coach's Desk acts on it
-- (it looks the exercise up in the client's program to add a warm-up set or replace it), not just prints
-- it. `detail` is the free-form "when in the rep / which sets / anything else" text.
--
-- `note` deliberately stays as the body area alone. Recurrence detection keys on it (see recurrenceCount
-- in src/shared/signals.ts), and folding varying free text into it would make the same shoulder reported
-- three weeks running look like three unrelated complaints.
alter table public.client_signals add column if not exists exercise text;
alter table public.client_signals add column if not exists detail text;
