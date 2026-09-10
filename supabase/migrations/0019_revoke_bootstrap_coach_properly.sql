-- The revoke at the end of 0018 does not do anything, and self-serve coach signup is still wide open.
--
-- 0018 ends with:
--     revoke execute on function public.bootstrap_coach(text) from authenticated;
--
-- which looks like it closes the old un-coded signup function. It does not. Postgres grants EXECUTE on
-- every new function to PUBLIC by default, so the explicit `grant ... to authenticated` in 0001 was
-- always redundant, and revoking that redundant grant leaves the PUBLIC one untouched. The function
-- stayed callable by everybody, including `anon`.
--
-- Confirmed against the live database rather than assumed: calling bootstrap_coach with only the
-- publishable key and no session got past every permission check and failed on
-- `null value in column "id"` -- that is the INSERT running, stopped only because an anonymous caller
-- has no auth.uid() to put in the row. A signed-in caller has one. Any account on the platform can
-- therefore promote itself to coach with a single RPC call and no signup code, which is exactly the
-- hole 0018 was written to close and the reason its own comment gives for closing it:
-- "the only thing standing in the way is which button the UI happens to render, which is not access
-- control."
--
-- Revoke from PUBLIC, which is the grant that actually exists. The role-specific revokes are harmless
-- and are kept so the intent survives if someone later re-grants to a named role.

revoke execute on function public.bootstrap_coach(text) from public;
revoke execute on function public.bootstrap_coach(text) from anon;
revoke execute on function public.bootstrap_coach(text) from authenticated;

-- Same defect, same fix, for every other SECURITY DEFINER function that is meant to be reachable only
-- by a signed-in caller. None of these is as serious as the one above -- they all check auth.uid() or
-- go through RLS -- but a default PUBLIC grant on a definer function is not something to leave lying
-- around once you know it is there.
revoke execute on function public.claim_invite(text, text) from public;
revoke execute on function public.bootstrap_coach_with_code(text, text) from public;

grant execute on function public.claim_invite(text, text) to authenticated;
grant execute on function public.bootstrap_coach_with_code(text, text) to authenticated;

-- get_invite() is deliberately public: it is the safe-fields-only preview an invited person sees before
-- they have signed in, so it must stay callable by `anon`. Left alone on purpose.
