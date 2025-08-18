# Apply Attendance Status Migration

## Instructions

To enable 'pending' status for attendance, you need to run this SQL command in your Supabase SQL Editor:

```sql
-- Drop the existing check constraint
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_status_check;

-- Add the new check constraint with all status values
ALTER TABLE attendance ADD CONSTRAINT attendance_status_check 
CHECK (status IN ('pending', 'present', 'absent', 'late', 'excused', 'other'));

-- Comment for documentation
COMMENT ON CONSTRAINT attendance_status_check ON attendance IS 'Ensures attendance status is one of: pending, present, absent, late, excused, other';
```

## Steps to Apply:

1. Go to your Supabase Dashboard
2. Navigate to the SQL Editor
3. Copy and paste the SQL above
4. Run the query
5. Verify the constraint was updated successfully

## What This Does:

- Removes the old constraint that only allowed 'present', 'absent', 'late'
- Adds a new constraint that allows: 'pending', 'present', 'absent', 'late', 'excused', 'other'
- Now sessions can be created with 'pending' attendance status by default
- Teachers can update attendance to the appropriate status during/after class

## After Running:

- New sessions will have attendance records with 'pending' status
- No more errors when creating sessions
- Full attendance workflow will work as expected