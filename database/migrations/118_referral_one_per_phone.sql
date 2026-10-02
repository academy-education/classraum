-- 118: one referral redemption per PHONE NUMBER, enforced by the database.
-- NOT APPLIED. Must be applied BEFORE the code that writes
-- referee_phone_key deploys — the redeem route inserts that column, and
-- PostgREST rejects an insert naming a column that does not exist, so the
-- route would 500 every redemption.
--
-- WHY: /api/study/referral/redeem checked "has any other account with my
-- phone already redeemed?" with a SELECT and then INSERTed its own row with
-- nothing in between. Two accounts sharing one number, redeeming within the
-- same second, both miss the SELECT and both get paid (CLAUDE.md:
-- "idempotent that is a read followed by a write is not"). The per-ACCOUNT
-- guard (UNIQUE(referee_id)) already existed; the per-PERSON one did not.
--
-- The key is lib/auth/phone.ts phoneKey(): separators stripped, plausible
-- only at 9-15 digits, then the last 9 digits. The route computes it in JS
-- and writes it at insert time; the backfill below reproduces it in SQL.
--
-- Live check 2026-10-02 (before writing this): 20 redemption rows, all 20
-- with a plausible phone. 2 phone keys are shared by more than one
-- redemption — 5 rows, 3 excess, all 3 excess rewarded=true. Both groups
-- are spread over ~5 days (2026-07-17..07-22 and 2026-09-20..09-26), i.e.
-- they predate the phone check, not a race. Nothing is deleted or
-- un-rewarded here: the EARLIEST row of each key gets the key, the later
-- duplicates keep referee_phone_key NULL so the unique index builds.

alter table public.study_referral_redemptions
  add column if not exists referee_phone_key text;

with keyed as (
  select r.id,
         right(regexp_replace(u.phone, '[\s\-().+]', '', 'g'), 9) as k,
         row_number() over (
           partition by right(regexp_replace(u.phone, '[\s\-().+]', '', 'g'), 9)
           order by r.created_at, r.id
         ) as rn
    from public.study_referral_redemptions r
    join public.users u on u.id = r.referee_id
   where regexp_replace(coalesce(u.phone, ''), '[\s\-().+]', '', 'g') ~ '^\d{9,15}$'
)
update public.study_referral_redemptions r
   set referee_phone_key = keyed.k
  from keyed
 where keyed.id = r.id and keyed.rn = 1 and r.referee_phone_key is null;

create unique index if not exists study_referral_redemptions_phone_key_unique
  on public.study_referral_redemptions (referee_phone_key)
  where referee_phone_key is not null;
