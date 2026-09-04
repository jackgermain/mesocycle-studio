-- The client -> coach signal loop. Until now every piece of session feedback (pump, joint pain, soreness)
-- was collected in the UI, shown a "your coach was notified" toast, and then dropped -- nothing was
-- stored and no coach ever saw it. These are the two channels that were missing.

-- 1. client_signals: session feedback that a client's own coach needs to act on.
create table public.client_signals (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.accounts(id) on delete cascade,
  coach_id uuid not null references public.accounts(id) on delete cascade,
  kind text not null check (kind in ('pump', 'joint', 'soreness')),
  muscle text,
  severity int not null,
  note text,
  day_label text,
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz
);

create index client_signals_coach_idx on public.client_signals (coach_id, created_at desc);

alter table public.client_signals enable row level security;

-- A client writes only their own signals, and only ever addressed to their own coach -- they can't
-- fabricate one for someone else or send it to a coach who isn't theirs.
create policy "client_signals_insert_own" on public.client_signals
  for insert with check (
    client_id = auth.uid()
    and coach_id = (select coach_id from public.accounts where id = auth.uid())
  );

-- Readable by the client who sent it and the coach it was sent to, nobody else.
create policy "client_signals_select" on public.client_signals
  for select using (client_id = auth.uid() or coach_id = auth.uid());

-- Only the coach acts on them (marking one acknowledged).
create policy "client_signals_update_by_coach" on public.client_signals
  for update using (coach_id = auth.uid()) with check (coach_id = auth.uid());

-- 2. feedback: app/bug feedback from anyone using the app, to the platform owner. Deliberately separate
-- from client_signals -- this is cross-tenant (an independent coach isn't anyone's client, so the
-- coach_id-scoped policies above can't carry it) and it's read by the platform admin, not by a coach.
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.accounts(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index feedback_created_idx on public.feedback (created_at desc);

alter table public.feedback enable row level security;

-- Anyone signed in can send feedback about the app, but only as themselves.
create policy "feedback_insert_own" on public.feedback
  for insert with check (author_id = auth.uid());

-- You can see what you sent; the platform admin can see all of it.
create policy "feedback_select" on public.feedback
  for select using (
    author_id = auth.uid()
    or exists (select 1 from public.accounts adm where adm.id = auth.uid() and adm.is_platform_admin)
  );

-- Sender's display name alongside each note, without exposing the accounts table more broadly.
create or replace function public.list_feedback_for_admin()
returns table(id uuid, body text, created_at timestamptz, author_name text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.accounts adm where adm.id = auth.uid() and adm.is_platform_admin) then
    raise exception 'Not authorized';
  end if;
  return query
    select f.id, f.body, f.created_at, a.display_name
    from public.feedback f
    join public.accounts a on a.id = f.author_id
    order by f.created_at desc;
end;
$$;

grant execute on function public.list_feedback_for_admin() to authenticated;
