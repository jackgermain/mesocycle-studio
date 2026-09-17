-- A coach training themselves may address ANY feedback signal to their own desk, not only progression.
--
-- 0027 let a coach send themselves a `progression` signal, and nothing else, because their coach_id is null
-- and 0012's policy only allows a signal addressed to the sender's own coach. Every other kind a coach's own
-- sessions produce -- soreness, pump, joint pain, effort, nutrition -- therefore had nowhere it was allowed to
-- go, and the app did not even try: sendSignals returns early when there is no coach.
--
-- Jack, after the soreness check went unanswered for his own training: "those notifications need to be being
-- sent no matter what. They're incredibly important. It completely breaks our algorithm for training if they
-- don't work."
--
-- Still only to THEMSELVES, and still only for an account whose role is coach. A client or General account
-- sends to its own coach exactly as before; nobody may address a signal to anyone else.

drop policy if exists "client_signals_insert_own" on public.client_signals;
create policy "client_signals_insert_own" on public.client_signals
  for insert with check (
    client_id = auth.uid()
    and (
      coach_id = (select coach_id from public.accounts where id = auth.uid())
      or (
        coach_id = auth.uid()
        and exists (select 1 from public.accounts where id = auth.uid() and role = 'coach')
      )
    )
  );
