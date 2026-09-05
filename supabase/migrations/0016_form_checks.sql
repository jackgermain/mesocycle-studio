-- Form checks: a client sends their coach a video of a set and asks "does this look right?", the coach
-- watches it and answers. This is the thing people actually pay a coach for, and until now it was
-- happening in DMs where it gets lost and can't be tied to the lift it was about.
--
-- Two pieces: a private storage bucket for the video files, and a table for the request and the answer.
-- The video lives in storage rather than in a jsonb blob for the obvious reason -- a phone clip is tens of
-- megabytes, and client_state/coach_state are read whole on every app load.

-- 1. The bucket. Private: every read goes through a signed URL, so a video is never reachable by guessing
-- a path. Files are stored as "<client account id>/<uuid>.<ext>" -- the leading folder is what the
-- policies below check, which is why the path convention is not cosmetic.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('form-checks', 'form-checks', false, 62914560, array['video/mp4','video/quicktime','video/webm'])
on conflict (id) do nothing;

-- A client writes only into their own folder.
create policy "form_check_upload_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'form-checks'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Readable by the person who recorded it and by their coach, nobody else.
create policy "form_check_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'form-checks'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (storage.foldername(name))[1] in (
        select id::text from public.accounts where coach_id = auth.uid()
      )
    )
  );

-- The client can delete their own clip (withdrawing a request); a coach cannot delete someone's video.
create policy "form_check_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'form-checks'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 2. The request and the answer.
create table public.form_checks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.accounts(id) on delete cascade,
  coach_id uuid not null references public.accounts(id) on delete cascade,
  -- What the video is of. exercise_name is what the coach reads; day_id is what they navigate to, the
  -- same split day_label/day_id makes for client_signals in migration 0015.
  exercise_name text not null,
  day_label text,
  day_id text,
  video_path text not null,
  note text,
  coach_reply text,
  created_at timestamptz not null default now(),
  answered_at timestamptz
);

create index form_checks_coach_idx on public.form_checks (coach_id, created_at desc);
create index form_checks_client_idx on public.form_checks (client_id, created_at desc);

alter table public.form_checks enable row level security;

-- Same shape as client_signals_insert_own: a client can only file their own, and only to their own coach.
create policy "form_checks_insert_own" on public.form_checks
  for insert with check (
    client_id = auth.uid()
    and coach_id = (select coach_id from public.accounts where id = auth.uid())
  );

create policy "form_checks_select" on public.form_checks
  for select using (client_id = auth.uid() or coach_id = auth.uid());

-- Only the coach answers one.
create policy "form_checks_update_by_coach" on public.form_checks
  for update using (coach_id = auth.uid()) with check (coach_id = auth.uid());

-- A client can withdraw a request they haven't had answered yet.
create policy "form_checks_delete_own" on public.form_checks
  for delete using (client_id = auth.uid() and answered_at is null);
