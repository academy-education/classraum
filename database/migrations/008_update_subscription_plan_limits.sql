-- Update subscription plan limits to match updated SUBSCRIPTION_PLANS
-- This migration updates existing subscriptions to have the new limits

-- Update basic tier subscriptions (소규모 학원)
-- Old limits: 100 students + 10 teachers + 10GB = 110 total users
-- New limits: 130 students + 20 teachers + 25GB = 150 total users
UPDATE academy_subscriptions
SET
  student_limit = 130,
  teacher_limit = 20,
  storage_limit_gb = 25,
  updated_at = NOW()
WHERE
  plan_tier = 'basic';

-- Update pro tier subscriptions (중형 학원)
-- Old limits: 500 students + 50 teachers = 550 total users
-- New limits: 280 students + 40 teachers + 100GB = 320 total users
UPDATE academy_subscriptions
SET
  student_limit = 280,
  teacher_limit = 40,
  storage_limit_gb = 100,
  updated_at = NOW()
WHERE
  plan_tier = 'pro';

-- Update enterprise tier subscriptions (대형 학원)
-- Old limits: unlimited (-1)
-- New limits: 550 students + 100 teachers + 300GB = 650 total users
UPDATE academy_subscriptions
SET
  student_limit = 550,
  teacher_limit = 100,
  storage_limit_gb = 300,
  updated_at = NOW()
WHERE
  plan_tier = 'enterprise';
