-- A fifth signal kind: the day's food log came in off target.
--
-- Sent once per day, when the last meal that has anything in it is submitted -- not per meal. A coach
-- does not need to know that breakfast was light; they need to know the day landed 700 kcal under.
--
-- Severity carries the miss in kcal (absolute), so the coach can see how far off it was without another
-- round trip. `detail` says which direction, since under and over mean opposite things.

alter table public.client_signals drop constraint if exists client_signals_kind_check;
alter table public.client_signals add constraint client_signals_kind_check
  check (kind in ('pump', 'joint', 'soreness', 'effort', 'nutrition'));
