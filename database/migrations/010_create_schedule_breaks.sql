-- Create schedule_breaks table for managing periods when classroom sessions should not be generated
-- This allows users to define breaks (holidays, vacations, etc.) where virtual sessions should be skipped

CREATE TABLE IF NOT EXISTS schedule_breaks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure start_date is before or equal to end_date
  CONSTRAINT valid_date_range CHECK (start_date <= end_date)
);

-- Create index for faster lookups by classroom_id
CREATE INDEX IF NOT EXISTS idx_schedule_breaks_classroom_id
  ON schedule_breaks(classroom_id);

-- Create index for date range queries
CREATE INDEX IF NOT EXISTS idx_schedule_breaks_dates
  ON schedule_breaks(classroom_id, start_date, end_date);

-- Enable Row Level Security
ALTER TABLE schedule_breaks ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: Users can only see and manage breaks for classrooms they have access to
-- This leverages the existing classroom access control
CREATE POLICY schedule_breaks_access_policy ON schedule_breaks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM classrooms c
      WHERE c.id = schedule_breaks.classroom_id
      AND (
        c.teacher_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM managers m
          WHERE m.user_id = auth.uid()
          AND m.academy_id = c.academy_id
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classrooms c
      WHERE c.id = schedule_breaks.classroom_id
      AND (
        c.teacher_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM managers m
          WHERE m.user_id = auth.uid()
          AND m.academy_id = c.academy_id
        )
      )
    )
  );

-- Add unique constraint to classroom_sessions to prevent duplicate materialized sessions
-- Uses existing columns: classroom_id, date, start_time
ALTER TABLE classroom_sessions
  ADD CONSTRAINT unique_classroom_session_time
  UNIQUE (classroom_id, date, start_time);

-- Add comments for documentation
COMMENT ON TABLE schedule_breaks IS 'Stores date ranges when virtual sessions should not be generated (breaks, holidays, etc.)';
COMMENT ON COLUMN schedule_breaks.classroom_id IS 'Reference to the classroom this break applies to';
COMMENT ON COLUMN schedule_breaks.start_date IS 'First date of the break period (inclusive)';
COMMENT ON COLUMN schedule_breaks.end_date IS 'Last date of the break period (inclusive)';
COMMENT ON COLUMN schedule_breaks.reason IS 'Optional description of why the break exists (e.g., "Summer Vacation", "Holiday")';
COMMENT ON CONSTRAINT unique_classroom_session_time ON classroom_sessions IS 'Ensures no duplicate sessions can be materialized for the same classroom, date, and time';
