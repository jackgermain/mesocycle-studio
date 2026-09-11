-- Next week's proposed numbers become a sixth signal kind, and a coach may address one to themselves.
--
-- When a session is finished, the app works out a proposal for every exercise in it -- the move, the rep
-- scheme it produces, and why -- and sends the whole session as one signal for review. Nothing is written
-- to the program; whoever reviews it decides. See src/shared/progressionProposal.ts.
--
-- The insert policy is the other half. A coach training themselves has coach_id null, so under 0012's
-- policy their proposals had nowhere they were allowed to go. They are the one person who should review
-- their own, so a coach may now address a *progression* signal to themselves. Only that kind, and only to
-- themselves: every other kind still has to go to the sender's own coach, exactly as before.

alter table public.client_signals drop constraint if exists client_signals_kind_check;
alter table public.client_signals add constraint client_signals_kind_check
  check (kind in ('pump', 'joint', 'soreness', 'effort', 'nutrition', 'progression'));

drop policy if exists "client_signals_insert_own" on public.client_signals;
create policy "client_signals_insert_own" on public.client_signals
  for insert with check (
    client_id = auth.uid()
    and (
      coach_id = (select coach_id from public.accounts where id = auth.uid())
      or (
        kind = 'progression'
        and coach_id = auth.uid()
        and exists (select 1 from public.accounts where id = auth.uid() and role = 'coach')
      )
    )
  );
