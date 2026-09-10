-- Revoking from PUBLIC is not enough on Supabase. You must name anon and authenticated.
--
-- Supabase's project bootstrap grants EXECUTE on everything in schema `public` to `anon`,
-- `authenticated` and `service_role` directly, on top of Postgres's own default grant to PUBLIC. So a
-- `revoke ... from public` removes one grant and leaves the explicit ones behind, and the function stays
-- callable by exactly the roles you thought you had just cut off.
--
-- This is the second time the same mistake has shipped here. 0018 revoked bootstrap_coach from
-- `authenticated` only and the function stayed wide open; 0019 fixed that by naming public, anon AND
-- authenticated -- and did work, confirmed by probe: bootstrap_coach now returns "permission denied for
-- function bootstrap_coach" to an anonymous caller. But the same file revoked claim_invite and
-- bootstrap_coach_with_code from `public` alone, so both are still reachable by anon.
--
-- Impact is small and worth closing anyway. claim_invite reads auth.uid(), which is null for an
-- anonymous caller, so the accounts insert fails on a not-null violation before an account can be made.
-- What it does leak is whether a code exists and whether it has been used -- "Invite not found" versus
-- "Invite already used" -- which is an enumeration oracle on invite codes. Codes are now eight
-- characters from a 32-letter alphabet, so walking them is not practical, but an unauthenticated caller
-- has no business reaching either function at all.

revoke execute on function public.claim_invite(text, text) from anon;
revoke execute on function public.bootstrap_coach_with_code(text, text) from anon;

grant execute on function public.claim_invite(text, text) to authenticated;
grant execute on function public.bootstrap_coach_with_code(text, text) to authenticated;

-- get_invite stays granted to anon on purpose: it is the safe-fields-only preview an invited person sees
-- on the invite screen before they have signed in, so anon MUST be able to call it.
