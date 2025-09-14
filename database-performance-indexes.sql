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

-- ========================================
-- ADDITIONAL INDEXES FOR REPORTS SYSTEM
-- ========================================

-- Student Reports Performance Indexes
CREATE INDEX IF NOT EXISTS idx_student_reports_academy_student_date 
ON student_reports (academy_id, student_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_student_reports_ai_feedback_metadata 
ON student_reports (ai_feedback_enabled, ai_feedback_template, ai_feedback_created_at DESC);

-- Enhanced Assignment Grades Indexes for Reports
CREATE INDEX IF NOT EXISTS idx_assignment_grades_student_date_score 
ON assignment_grades (student_id, updated_at DESC) 
WHERE score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assignment_grades_student_status 
ON assignment_grades (student_id, status) 
WHERE status IN ('submitted', 'graded', 'pending', 'overdue');

-- Enhanced Attendance Indexes for Reports  
CREATE INDEX IF NOT EXISTS idx_attendance_student_date 
ON attendance (student_id, created_at DESC);

-- Subjects and Categories for Filtering
CREATE INDEX IF NOT EXISTS idx_subjects_academy_name_active 
ON subjects (academy_id, name) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_assignment_categories_academy_name_active 
ON assignment_categories (academy_id, name) 
WHERE deleted_at IS NULL;

-- Students lookup optimization
CREATE INDEX IF NOT EXISTS idx_students_academy_active 
ON students (academy_id, user_id, name) 
WHERE deleted_at IS NULL;

-- Composite index for complex report queries
CREATE INDEX IF NOT EXISTS idx_assignments_report_lookup 
ON assignments (id, assignment_type, assignment_categories_id) 
WHERE deleted_at IS NULL;

-- Optimized index for classroom session date filtering
CREATE INDEX IF NOT EXISTS idx_classroom_sessions_date_range 
ON classroom_sessions (date, classroom_id, id) 
WHERE deleted_at IS NULL;

-- Update statistics for new indexes
ANALYZE student_reports;
ANALYZE subjects;
ANALYZE assignment_categories;
ANALYZE students;