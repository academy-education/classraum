-- =====================================================
-- Update Attendance Status Constraint Migration
-- =====================================================
-- Purpose: Add 'pending', 'excused', and 'other' to allowed attendance status values
-- This allows for more flexible attendance tracking

-- Drop the existing check constraint
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_status_check;

-- Add the new check constraint with all status values
ALTER TABLE attendance ADD CONSTRAINT attendance_status_check 
CHECK (status IN ('pending', 'present', 'absent', 'late', 'excused', 'other'));

-- Comment for documentation
COMMENT ON CONSTRAINT attendance_status_check ON attendance IS 'Ensures attendance status is one of: pending, present, absent, late, excused, other';