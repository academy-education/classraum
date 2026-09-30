alter table public.study_payments drop column if exists receipt_sent_at, drop column if exists receipt_url,
  drop column if exists order_name, drop column if exists paid_at;
alter table public.study_subscriptions drop column if exists renewal_reminded_for;
delete from public.notifications where type = 'study_payment_receipt';
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type = any (array[
  'session','attendance','billing','assignment','alert','grade','success','report','system','level_test',
  'study_league_promoted','study_league_demoted','study_weekly_recap','study_streak_milestone',
  'study_streak_at_risk','study_streak_saved','study_daily_challenge','study_duel_won','study_duel_lost',
  'study_response_graded','study_payment_failed','study_subscription_expired'
]::text[]));
