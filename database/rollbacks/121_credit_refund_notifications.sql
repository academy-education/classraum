-- Rollback for 121. Deletes the in-app refund notices (they cannot satisfy the
-- old constraint) and the once-only claim column.
delete from public.notifications where type = 'study_credits_refunded';
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type = any (array[
  'session','attendance','billing','assignment','alert','grade','success','report','system','level_test',
  'study_league_promoted','study_league_demoted','study_weekly_recap','study_streak_milestone',
  'study_streak_at_risk','study_streak_saved','study_daily_challenge','study_duel_won','study_duel_lost',
  'study_response_graded','study_payment_failed','study_subscription_expired','study_payment_receipt'
]::text[]));
alter table public.study_credit_ledger drop column if exists refund_notified_at;
