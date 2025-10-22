-- Migrate from separate student_limit and teacher_limit to total_user_limit
-- This migration adds a new column and migrates existing data

-- Add total_user_limit column
ALTER TABLE academy_subscriptions
ADD COLUMN IF NOT EXISTS total_user_limit INTEGER NOT NULL DEFAULT 22;

-- Migrate existing data: total_user_limit = student_limit + teacher_limit
UPDATE academy_subscriptions
SET total_user_limit = COALESCE(student_limit, 0) + COALESCE(teacher_limit, 0);

-- For free tier subscriptions, ensure it's 22
UPDATE academy_subscriptions
SET total_user_limit = 22
WHERE plan_tier = 'free';

-- For basic tier subscriptions, ensure it's 150
UPDATE academy_subscriptions
SET total_user_limit = 150
WHERE plan_tier = 'basic';

-- For pro tier subscriptions, ensure it's 320
UPDATE academy_subscriptions
SET total_user_limit = 320
WHERE plan_tier = 'pro';

-- For enterprise tier subscriptions, ensure it's 650
UPDATE academy_subscriptions
SET total_user_limit = 650
WHERE plan_tier = 'enterprise';

-- Drop old columns (comment out if you want to keep for backwards compatibility)
-- ALTER TABLE academy_subscriptions DROP COLUMN IF EXISTS student_limit;
-- ALTER TABLE academy_subscriptions DROP COLUMN IF EXISTS teacher_limit;
