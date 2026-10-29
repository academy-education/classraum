-- Where a new account signed up from (owner request 2026-10-29).
--
-- Accounts are created by the handle_new_user() trigger, which never sees the
-- HTTP request, so nothing recorded a location. These columns are filled once,
-- right after the first sign-in, by POST /api/auth/signup-geo from Vercel's
-- x-vercel-ip-* headers (country / region / city of the request IP). The IP
-- itself is NOT stored.
--
-- Not granted to authenticated/anon: like email and phone (migration 120) this
-- is about a person's whereabouts, so only the service role reads it.

begin;

alter table public.users
  add column if not exists signup_country text,
  add column if not exists signup_region text,
  add column if not exists signup_city text,
  add column if not exists signup_geo_at timestamptz;

comment on column public.users.signup_country is
  'ISO 3166-1 alpha-2 country of the first sign-in request (Vercel geo header). Migration 129. Service role only.';

-- users keeps a table-wide UPDATE grant for own-row edits, so a client could
-- otherwise rewrite its own signup location. Only the service role may set it.
create or replace function public.users_signup_geo_guard() returns trigger
language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.signup_country := old.signup_country;
    new.signup_region := old.signup_region;
    new.signup_city := old.signup_city;
    new.signup_geo_at := old.signup_geo_at;
  end if;
  return new;
end $$;

drop trigger if exists users_signup_geo_guard on public.users;
create trigger users_signup_geo_guard before update on public.users
  for each row execute function public.users_signup_geo_guard();

commit;
