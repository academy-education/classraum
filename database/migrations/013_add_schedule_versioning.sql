-- Add effective dates to classroom_schedules for schedule versioning
-- This allows tracking schedule history and applying changes from specific dates

-- Add new columns to classroom_schedules
ALTER TABLE classroom_schedules
ADD COLUMN IF NOT EXISTS effective_from DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS effective_until DATE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

-- Create index for performance when querying schedules for specific dates
CREATE INDEX IF NOT EXISTS idx_schedules_effective_dates
ON classroom_schedules(classroom_id, effective_from, effective_until);

-- Create index for date range queries
CREATE INDEX IF NOT EXISTS idx_schedules_effective_from
ON classroom_schedules(effective_from) WHERE effective_until IS NULL;

-- Add comment explaining the versioning system
COMMENT ON COLUMN classroom_schedules.effective_from IS 'Date from which this schedule version is active (inclusive)';
COMMENT ON COLUMN classroom_schedules.effective_until IS 'Date until which this schedule version is active (inclusive). NULL means ongoing.';
COMMENT ON COLUMN classroom_schedules.created_at IS 'Timestamp when this schedule version was created';
