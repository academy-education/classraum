-- Add paused column to classrooms table
-- This allows classrooms to be paused, preventing virtual sessions from being generated

ALTER TABLE classrooms
ADD COLUMN IF NOT EXISTS paused BOOLEAN DEFAULT FALSE;

-- Create index for faster lookups of paused classrooms
CREATE INDEX IF NOT EXISTS idx_classrooms_paused
  ON classrooms(paused);

-- Add comment for documentation
COMMENT ON COLUMN classrooms.paused IS 'Whether the classroom is paused (no virtual sessions will be generated)';
