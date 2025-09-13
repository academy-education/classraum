-- Performance Optimization Indexes
-- Run these in your Supabase SQL Editor
-- These are safe to add and will provide immediate performance improvements

-- Critical indexes for assignments page performance
CREATE INDEX IF NOT EXISTS idx_assignments_classroom_session_academy 
ON assignments(classroom_session_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_classrooms_academy_teacher 
ON classrooms(academy_id, teacher_id);

CREATE INDEX IF NOT EXISTS idx_classroom_sessions_classroom_date 
ON classroom_sessions(classroom_id, date) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_assignment_grades_assignment_status 
ON assignment_grades(assignment_id, status);

CREATE INDEX IF NOT EXISTS idx_assignment_attachments_assignment 
ON assignment_attachments(assignment_id);

CREATE INDEX IF NOT EXISTS idx_classroom_students_classroom 
ON classroom_students(classroom_id);

-- Critical indexes for attendance page performance
CREATE INDEX IF NOT EXISTS idx_attendance_session_status 
ON attendance(classroom_session_id, status);

CREATE INDEX IF NOT EXISTS idx_users_id_name 
ON users(id) INCLUDE (name);

-- Composite index for the most common query pattern
CREATE INDEX IF NOT EXISTS idx_assignments_full_lookup 
ON assignments(classroom_session_id, assignment_categories_id) 
WHERE deleted_at IS NULL;

-- Index for date-based queries (common in both pages)
CREATE INDEX IF NOT EXISTS idx_classroom_sessions_date_classroom 
ON classroom_sessions(date, classroom_id) WHERE deleted_at IS NULL;

-- Analyze tables to update query planner statistics
ANALYZE assignments;
ANALYZE classrooms;
ANALYZE classroom_sessions;
ANALYZE assignment_grades;
ANALYZE assignment_attachments;
ANALYZE attendance;
ANALYZE users;