-- Messaging is for coached clients only. General accounts were never meant to have it.
--
-- Jack: "general accounts do not have a coach who can message them... that's only client accounts and
-- coaching accounts." The Inbox tab was removed from General accounts on the strength of that, but the
-- two RPCs behind it were never gated: both key off `coach_id` alone, and a General account (stored role
-- `friend`) has a coach_id too -- that is how their coach views and edits their work. So the capability
-- stayed fully open and only the button went away.
--
-- Hiding a UI control is not access control. A General account could still read and append to a coach's
-- thread by calling these directly with their own session.
--
-- WHAT IS DELIBERATELY NOT HERE: any grant or revoke.
--
-- 0022 already revoked both of these from `anon, public` and re-granted them to `authenticated`, and
-- `create or replace function` PRESERVES a function's existing privileges -- only dropping and recreating
-- resets them. Re-issuing grants here would at best be noise and at worst re-open what 0022 closed, which
-- is the exact mistake 0018 and 0019 each shipped once. The bodies change; the ACLs are left alone.
--
-- VERIFY BY PROBING, NOT BY READING. Sign in as a General (friend) account and call both:
--   get_my_thread()        should return null
--   send_client_message()  should raise "Messaging is only available to coached client accounts"
-- Then do the same as a real client account and confirm both still work as before. Reading the SQL back
-- is not evidence -- 0018 and 0019 both read as though they had worked.
--
-- APPLIED 2026-09-13 by Jack in the Supabase SQL editor. Recorded here because the absence of this line is
-- what cost this project months once already: 0002 was written, committed, and never run, and
-- get_coach_templates silently returned [] the whole time. A migration file in this repo proves nothing
-- about the live database unless someone says so.
--
-- VERIFIED so far, by probe with the publishable key and no session:
--   get_my_thread()        -> 42501 permission denied for function get_my_thread
--   send_client_message()  -> 42501 permission denied for function send_client_message
-- That is the ANON path, and it confirms something worth knowing generally: `create or replace function`
-- preserved the privileges 0022 set. Replacing a function body does NOT reset its ACLs, so a migration that
-- only rewrites bodies must not re-issue grants -- and this one did not.
--
-- NOT YET VERIFIED: the role gate itself. Confirming that a `friend` account gets null and a `client`
-- account is unaffected needs a real authenticated session for each, which only Jack can produce from the
-- app. Until he reports back, treat the gate as applied-but-unconfirmed.

-- get_my_thread: unchanged except for the role gate. A non-client gets null, which is the same answer the
-- function already gave anyone without a coach, so every caller already handles it.
create or replace function public.get_my_thread()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coach_id uuid;
  v_role text;
  v_data jsonb;
  v_threads jsonb;
  v_result jsonb;
begin
  select coach_id, role into v_coach_id, v_role from public.accounts where id = auth.uid();
  if v_coach_id is null or v_role is distinct from 'client' then
    return null;
  end if;

  select data into v_data from public.coach_state where account_id = v_coach_id;
  v_threads := coalesce(v_data->'threads', '[]'::jsonb);

  select elem into v_result
  from jsonb_array_elements(v_threads) elem
  where elem->>'clientId' = auth.uid()::text
  limit 1;

  return v_result;
end;
$$;

-- send_client_message: the body below is 0006's (the ISO-timestamp version that superseded 0004's
-- clock-time one), with only the role gate added. 0004's copy of this function is stale -- replacing from
-- it would silently revert message timestamps to "HH24:MI" and lose the date again.
--
-- This raises rather than returning quietly: a message that vanishes without explanation is worse than one
-- that reports why it could not be sent, and the Inbox screen already surfaces the error.
create or replace function public.send_client_message(p_text text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coach_id uuid;
  v_client_name text;
  v_role text;
  v_data jsonb;
  v_threads jsonb;
  v_idx int;
  v_now_iso text := to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  v_new_bubble jsonb;
begin
  select coach_id, display_name, role into v_coach_id, v_client_name, v_role from public.accounts where id = auth.uid();
  if v_coach_id is null then
    raise exception 'No coach on file for this account';
  end if;
  if v_role is distinct from 'client' then
    raise exception 'Messaging is only available to coached client accounts';
  end if;

  v_new_bubble := jsonb_build_object('from', 'client', 'text', p_text, 'time', v_now_iso);

  select data into v_data from public.coach_state where account_id = v_coach_id for update;
  v_threads := coalesce(v_data->'threads', '[]'::jsonb);

  select (i - 1) into v_idx
  from jsonb_array_elements(v_threads) with ordinality as t(elem, i)
  where elem->>'clientId' = auth.uid()::text
  limit 1;

  if v_idx is null then
    v_threads := jsonb_build_array(
      jsonb_build_object(
        'id', auth.uid()::text,
        'clientId', auth.uid()::text,
        'clientName', v_client_name,
        'context', '',
        'unread', true,
        'time', v_now_iso,
        'preview', p_text,
        'bubbles', jsonb_build_array(v_new_bubble)
      )
    ) || v_threads;
  else
    v_threads := jsonb_set(v_threads, array[v_idx::text, 'bubbles'], (v_threads->v_idx->'bubbles') || jsonb_build_array(v_new_bubble));
    v_threads := jsonb_set(v_threads, array[v_idx::text, 'unread'], 'true'::jsonb);
    v_threads := jsonb_set(v_threads, array[v_idx::text, 'time'], to_jsonb(v_now_iso));
    v_threads := jsonb_set(v_threads, array[v_idx::text, 'preview'], to_jsonb(p_text));
  end if;

  v_data := jsonb_set(coalesce(v_data, '{}'::jsonb), '{threads}', v_threads);
  update public.coach_state set data = v_data, updated_at = now() where account_id = v_coach_id;
end;
$$;
