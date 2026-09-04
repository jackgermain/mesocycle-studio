-- `day_label` is what a person reads ("Day 1"), not something you can navigate to -- every week has a
-- Day 1, so it can't identify the session a report came from. Acting on a report means opening the exact
-- day it happened on, so the day's real id is recorded alongside the label.
alter table public.client_signals add column if not exists day_id text;
