-- 108: users.email_verified_at — proof that the account holder can read the
-- mailbox, separate from Supabase's email_confirmed_at, which was auto-set
-- for every one of the 443 password accounts created while "Confirm email"
-- was off (through 2026-09-28) and therefore proves nothing.
--
-- Stamped by /auth/confirm when a signup, email-change or verification
-- (magic-link) token is verified. Backfilled for Google and Apple sign-ins,
-- whose provider vouches for the address; Kakao and password accounts stay
-- NULL until they click a link. Read by the "verify your email" banner and,
-- later, by the OAuth takeover guard (src/lib/auth/oauth-outcome.ts).
alter table public.users add column if not exists email_verified_at timestamptz;

update public.users u
set email_verified_at = a.created_at
from auth.users a
where a.id = u.id
  and u.email_verified_at is null
  and (a.raw_app_meta_data->>'provider') in ('google', 'apple');

comment on column public.users.email_verified_at is
  'When the holder proved they can read this mailbox (link click or provider-verified). NULL = never proven; Supabase email_confirmed_at is not proof for accounts created before 2026-09-28.';
