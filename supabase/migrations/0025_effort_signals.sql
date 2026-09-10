-- Set-level effort feedback becomes a fourth kind of signal.
--
-- The three existing kinds are all end-of-session: pump, soreness, joint. This one is asked twice per
-- exercise, in the moment -- once after the second-to-last set and once after the last -- so it arrives
-- far more often and carries a different meaning.
--
-- Severity runs 1..5 as easy -> could not have done another rep, so HIGH is the noteworthy end. That is
-- the opposite of pump and soreness (where low is bad) and the same direction as joint. Only a 5 is sent
-- to the coach: anything below it is normal training and would bury a roster in notifications.

alter table public.client_signals drop constraint if exists client_signals_kind_check;
alter table public.client_signals add constraint client_signals_kind_check
  check (kind in ('pump', 'joint', 'soreness', 'effort'));
