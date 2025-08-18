-- =====================================================
-- Dashboard Materialized Views Migration
-- =====================================================
-- Purpose: Create materialized views for high-performance dashboard metrics
-- These views pre-compute expensive aggregations for real-time dashboard performance

-- 1. Academy Statistics Materialized View
-- =====================================================
CREATE MATERIALIZED VIEW mv_academy_stats AS
SELECT 
    a.id as academy_id,
    a.name as academy_name,
    
    -- Student metrics
    COUNT(DISTINCT s.user_id) as total_students,
    COUNT(DISTINCT CASE WHEN s.active = true THEN s.user_id END) as active_students,
    COUNT(DISTINCT CASE WHEN s.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN s.user_id END) as new_students_30d,
    
    -- Teacher metrics  
    COUNT(DISTINCT t.user_id) as total_teachers,
    COUNT(DISTINCT CASE WHEN t.active = true THEN t.user_id END) as active_teachers,
    
    -- Parent metrics
    COUNT(DISTINCT p.user_id) as total_parents,
    COUNT(DISTINCT CASE WHEN p.active = true THEN p.user_id END) as active_parents,
    
    -- Classroom metrics
    COUNT(DISTINCT c.id) as total_classrooms,
    COUNT(DISTINCT CASE WHEN c.deleted_at IS NULL THEN c.id END) as active_classrooms,
    COUNT(DISTINCT CASE WHEN c.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN c.id END) as new_classrooms_30d,
    
    -- Family metrics
    COUNT(DISTINCT f.id) as total_families,
    
    -- Update timestamp
    NOW() as last_updated
FROM academies a
LEFT JOIN students s ON a.id = s.academy_id
LEFT JOIN teachers t ON a.id = t.academy_id  
LEFT JOIN parents p ON a.id = p.academy_id
LEFT JOIN classrooms c ON a.id = c.academy_id
LEFT JOIN families f ON a.id = f.academy_id
GROUP BY a.id, a.name;

-- Create unique index for fast lookups
CREATE UNIQUE INDEX idx_mv_academy_stats_academy_id ON mv_academy_stats(academy_id);

-- 2. Session Analytics Materialized View
-- =====================================================
CREATE MATERIALIZED VIEW mv_session_analytics AS
SELECT 
    c.academy_id,
    DATE_TRUNC('month', cs.date) as month_year,
    DATE_TRUNC('week', cs.date) as week_year,
    cs.date,
    
    -- Session counts by status
    COUNT(*) as total_sessions,
    COUNT(CASE WHEN cs.status = 'completed' THEN 1 END) as completed_sessions,
    COUNT(CASE WHEN cs.status = 'scheduled' THEN 1 END) as scheduled_sessions,
    COUNT(CASE WHEN cs.status = 'cancelled' THEN 1 END) as cancelled_sessions,
    COUNT(CASE WHEN cs.status = 'in_progress' THEN 1 END) as in_progress_sessions,
    
    -- Attendance metrics
    COUNT(DISTINCT a.student_id) as total_attendees,
    COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count,
    COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_count,
    COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late_count,
    
    -- Attendance rate calculation
    ROUND(
        CASE 
            WHEN COUNT(a.id) > 0 THEN 
                (COUNT(CASE WHEN a.status = 'present' THEN 1 END)::decimal / COUNT(a.id)) * 100
            ELSE 0 
        END, 2
    ) as attendance_rate,
    
    -- Classroom diversity
    COUNT(DISTINCT c.id) as classrooms_with_sessions,
    COUNT(DISTINCT c.teacher_id) as teachers_with_sessions,
    
    -- Update timestamp
    NOW() as last_updated
FROM classroom_sessions cs
INNER JOIN classrooms c ON cs.classroom_id = c.id
LEFT JOIN attendance a ON cs.id = a.classroom_session_id
WHERE cs.deleted_at IS NULL
  AND c.deleted_at IS NULL
GROUP BY c.academy_id, DATE_TRUNC('month', cs.date), DATE_TRUNC('week', cs.date), cs.date;

-- Create indexes for performance
CREATE INDEX idx_mv_session_analytics_academy_month ON mv_session_analytics(academy_id, month_year);
CREATE INDEX idx_mv_session_analytics_academy_week ON mv_session_analytics(academy_id, week_year);
CREATE INDEX idx_mv_session_analytics_academy_date ON mv_session_analytics(academy_id, date);

-- 3. Assignment Analytics Materialized View
-- =====================================================
CREATE MATERIALIZED VIEW mv_assignment_analytics AS
SELECT 
    c.academy_id,
    DATE_TRUNC('month', a.created_at) as month_year,
    DATE_TRUNC('week', a.created_at) as week_year,
    a.created_at::date as date,
    
    -- Assignment counts by type and status
    COUNT(*) as total_assignments,
    COUNT(CASE WHEN a.assignment_type = 'homework' THEN 1 END) as homework_assignments,
    COUNT(CASE WHEN a.assignment_type = 'project' THEN 1 END) as project_assignments,
    COUNT(CASE WHEN a.assignment_type = 'quiz' THEN 1 END) as quiz_assignments,
    COUNT(CASE WHEN a.assignment_type = 'exam' THEN 1 END) as exam_assignments,
    
    -- Grade statistics
    COUNT(DISTINCT ag.student_id) as students_with_grades,
    COUNT(ag.id) as total_grades,
    COUNT(CASE WHEN ag.status = 'completed' THEN 1 END) as completed_grades,
    COUNT(CASE WHEN ag.status = 'pending' THEN 1 END) as pending_grades,
    COUNT(CASE WHEN ag.status = 'late' THEN 1 END) as late_grades,
    
    -- Score analytics
    ROUND(AVG(ag.score), 2) as average_score,
    ROUND(MIN(ag.score), 2) as min_score,
    ROUND(MAX(ag.score), 2) as max_score,
    ROUND(STDDEV(ag.score), 2) as score_stddev,
    
    -- Performance metrics
    COUNT(CASE WHEN ag.score >= 90 THEN 1 END) as excellent_scores,
    COUNT(CASE WHEN ag.score >= 80 AND ag.score < 90 THEN 1 END) as good_scores,
    COUNT(CASE WHEN ag.score >= 70 AND ag.score < 80 THEN 1 END) as satisfactory_scores,
    COUNT(CASE WHEN ag.score < 70 THEN 1 END) as needs_improvement_scores,
    
    -- Submission timing
    COUNT(CASE WHEN a.due_date IS NOT NULL AND ag.created_at <= a.due_date THEN 1 END) as on_time_submissions,
    COUNT(CASE WHEN a.due_date IS NOT NULL AND ag.created_at > a.due_date THEN 1 END) as late_submissions,
    
    -- Update timestamp
    NOW() as last_updated
FROM assignments a
INNER JOIN classroom_sessions cs ON a.classroom_session_id = cs.id
INNER JOIN classrooms c ON cs.classroom_id = c.id
LEFT JOIN assignment_grades ag ON a.id = ag.assignment_id
WHERE a.deleted_at IS NULL
  AND cs.deleted_at IS NULL
  AND c.deleted_at IS NULL
GROUP BY c.academy_id, DATE_TRUNC('month', a.created_at), DATE_TRUNC('week', a.created_at), a.created_at::date;

-- Create indexes for performance
CREATE INDEX idx_mv_assignment_analytics_academy_month ON mv_assignment_analytics(academy_id, month_year);
CREATE INDEX idx_mv_assignment_analytics_academy_week ON mv_assignment_analytics(academy_id, week_year);
CREATE INDEX idx_mv_assignment_analytics_academy_date ON mv_assignment_analytics(academy_id, date);

-- 4. User Growth Trends Materialized View
-- =====================================================
CREATE MATERIALIZED VIEW mv_user_growth_trends AS
WITH daily_registrations AS (
    SELECT 
        u.created_at::date as registration_date,
        CASE 
            WHEN s.user_id IS NOT NULL THEN s.academy_id
            WHEN t.user_id IS NOT NULL THEN t.academy_id
            WHEN p.user_id IS NOT NULL THEN p.academy_id
            WHEN m.user_id IS NOT NULL THEN m.academy_id
        END as academy_id,
        u.role,
        COUNT(*) as daily_registrations
    FROM users u
    LEFT JOIN students s ON u.id = s.user_id
    LEFT JOIN teachers t ON u.id = t.user_id
    LEFT JOIN parents p ON u.id = p.user_id
    LEFT JOIN managers m ON u.id = m.user_id
    WHERE u.created_at IS NOT NULL
    GROUP BY u.created_at::date, academy_id, u.role
)
SELECT 
    academy_id,
    registration_date,
    DATE_TRUNC('month', registration_date) as month_year,
    DATE_TRUNC('week', registration_date) as week_year,
    
    -- Daily counts by role
    SUM(CASE WHEN role = 'student' THEN daily_registrations ELSE 0 END) as new_students,
    SUM(CASE WHEN role = 'teacher' THEN daily_registrations ELSE 0 END) as new_teachers,
    SUM(CASE WHEN role = 'parent' THEN daily_registrations ELSE 0 END) as new_parents,
    SUM(CASE WHEN role = 'manager' THEN daily_registrations ELSE 0 END) as new_managers,
    SUM(daily_registrations) as total_new_users,
    
    -- Running totals (calculated via window functions)
    SUM(SUM(CASE WHEN role = 'student' THEN daily_registrations ELSE 0 END)) 
        OVER (PARTITION BY academy_id ORDER BY registration_date) as cumulative_students,
    SUM(SUM(CASE WHEN role = 'teacher' THEN daily_registrations ELSE 0 END)) 
        OVER (PARTITION BY academy_id ORDER BY registration_date) as cumulative_teachers,
    SUM(SUM(CASE WHEN role = 'parent' THEN daily_registrations ELSE 0 END)) 
        OVER (PARTITION BY academy_id ORDER BY registration_date) as cumulative_parents,
    SUM(SUM(daily_registrations)) 
        OVER (PARTITION BY academy_id ORDER BY registration_date) as cumulative_total,
    
    -- Update timestamp
    NOW() as last_updated
FROM daily_registrations
WHERE academy_id IS NOT NULL
GROUP BY academy_id, registration_date, month_year, week_year
ORDER BY academy_id, registration_date;

-- Create indexes for performance
CREATE INDEX idx_mv_user_growth_trends_academy_date ON mv_user_growth_trends(academy_id, registration_date);
CREATE INDEX idx_mv_user_growth_trends_academy_month ON mv_user_growth_trends(academy_id, month_year);

-- 5. Classroom Utilization Materialized View
-- =====================================================
CREATE MATERIALIZED VIEW mv_classroom_utilization AS
SELECT 
    c.academy_id,
    c.id as classroom_id,
    c.name as classroom_name,
    c.teacher_id,
    u.name as teacher_name,
    
    -- Enrollment metrics
    COUNT(DISTINCT cs_students.student_id) as enrolled_students,
    COUNT(DISTINCT cs.id) as total_sessions,
    COUNT(DISTINCT CASE WHEN cs.status = 'completed' THEN cs.id END) as completed_sessions,
    COUNT(DISTINCT CASE WHEN cs.date >= CURRENT_DATE THEN cs.id END) as upcoming_sessions,
    
    -- Time-based utilization
    COUNT(DISTINCT CASE WHEN cs.date >= CURRENT_DATE - INTERVAL '7 days' THEN cs.id END) as sessions_last_7d,
    COUNT(DISTINCT CASE WHEN cs.date >= CURRENT_DATE - INTERVAL '30 days' THEN cs.id END) as sessions_last_30d,
    
    -- Attendance analytics
    COUNT(a.id) as total_attendance_records,
    COUNT(CASE WHEN a.status = 'present' THEN 1 END) as total_present,
    COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as total_absent,
    
    -- Average attendance rate
    ROUND(
        CASE 
            WHEN COUNT(a.id) > 0 THEN 
                (COUNT(CASE WHEN a.status = 'present' THEN 1 END)::decimal / COUNT(a.id)) * 100
            ELSE 0 
        END, 2
    ) as overall_attendance_rate,
    
    -- Session frequency metrics
    CASE 
        WHEN COUNT(DISTINCT cs.id) > 0 THEN 
            ROUND(
                COUNT(DISTINCT cs.id)::decimal / 
                GREATEST(1, EXTRACT(days FROM (MAX(cs.date) - MIN(cs.date) + INTERVAL '1 day'))::integer), 
                2
            )
        ELSE 0 
    END as sessions_per_day,
    
    -- Last activity
    MAX(cs.date) as last_session_date,
    MIN(cs.date) as first_session_date,
    
    -- Update timestamp
    NOW() as last_updated
FROM classrooms c
INNER JOIN users u ON c.teacher_id = u.id
LEFT JOIN classroom_sessions cs ON c.id = cs.classroom_id AND cs.deleted_at IS NULL
LEFT JOIN classroom_students cs_students ON c.id = cs_students.classroom_id
LEFT JOIN attendance a ON cs.id = a.classroom_session_id
WHERE c.deleted_at IS NULL
GROUP BY c.academy_id, c.id, c.name, c.teacher_id, u.name;

-- Create indexes for performance
CREATE UNIQUE INDEX idx_mv_classroom_utilization_classroom_id ON mv_classroom_utilization(classroom_id);
CREATE INDEX idx_mv_classroom_utilization_academy_id ON mv_classroom_utilization(academy_id);
CREATE INDEX idx_mv_classroom_utilization_teacher_id ON mv_classroom_utilization(teacher_id);

-- 6. Notification Analytics Materialized View
-- =====================================================
CREATE MATERIALIZED VIEW mv_notification_analytics AS
SELECT 
    -- We need to join with users to get academy_id through role-specific tables
    CASE 
        WHEN s.academy_id IS NOT NULL THEN s.academy_id
        WHEN t.academy_id IS NOT NULL THEN t.academy_id
        WHEN p.academy_id IS NOT NULL THEN p.academy_id
        WHEN m.academy_id IS NOT NULL THEN m.academy_id
    END as academy_id,
    
    DATE_TRUNC('month', n.created_at) as month_year,
    DATE_TRUNC('week', n.created_at) as week_year,
    n.created_at::date as date,
    
    -- Notification counts by type
    COUNT(*) as total_notifications,
    COUNT(CASE WHEN n.type = 'info' THEN 1 END) as info_notifications,
    COUNT(CASE WHEN n.type = 'warning' THEN 1 END) as warning_notifications,
    COUNT(CASE WHEN n.type = 'error' THEN 1 END) as error_notifications,
    COUNT(CASE WHEN n.type = 'success' THEN 1 END) as success_notifications,
    
    -- Read status
    COUNT(CASE WHEN n.is_read = true THEN 1 END) as read_notifications,
    COUNT(CASE WHEN n.is_read = false OR n.is_read IS NULL THEN 1 END) as unread_notifications,
    
    -- Read rate
    ROUND(
        CASE 
            WHEN COUNT(*) > 0 THEN 
                (COUNT(CASE WHEN n.is_read = true THEN 1 END)::decimal / COUNT(*)) * 100
            ELSE 0 
        END, 2
    ) as read_rate,
    
    -- User engagement
    COUNT(DISTINCT n.user_id) as users_with_notifications,
    ROUND(COUNT(*)::decimal / NULLIF(COUNT(DISTINCT n.user_id), 0), 2) as avg_notifications_per_user,
    
    -- Update timestamp
    NOW() as last_updated
FROM notifications n
INNER JOIN users u ON n.user_id = u.id
LEFT JOIN students s ON u.id = s.user_id
LEFT JOIN teachers t ON u.id = t.user_id
LEFT JOIN parents p ON u.id = p.user_id
LEFT JOIN managers m ON u.id = m.user_id
WHERE (s.academy_id IS NOT NULL OR t.academy_id IS NOT NULL OR p.academy_id IS NOT NULL OR m.academy_id IS NOT NULL)
GROUP BY 
    CASE 
        WHEN s.academy_id IS NOT NULL THEN s.academy_id
        WHEN t.academy_id IS NOT NULL THEN t.academy_id
        WHEN p.academy_id IS NOT NULL THEN p.academy_id
        WHEN m.academy_id IS NOT NULL THEN m.academy_id
    END,
    DATE_TRUNC('month', n.created_at),
    DATE_TRUNC('week', n.created_at),
    n.created_at::date;

-- Create indexes for performance
CREATE INDEX idx_mv_notification_analytics_academy_date ON mv_notification_analytics(academy_id, date);
CREATE INDEX idx_mv_notification_analytics_academy_month ON mv_notification_analytics(academy_id, month_year);

-- =====================================================
-- Create Refresh Functions
-- =====================================================

-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_dashboard_materialized_views()
RETURNS void AS $$
BEGIN
    -- Refresh all dashboard materialized views concurrently where possible
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_academy_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_session_analytics;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_assignment_analytics;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_growth_trends;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_classroom_utilization;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_notification_analytics;
    
    -- Log the refresh
    RAISE NOTICE 'Dashboard materialized views refreshed at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to refresh specific academy's data
CREATE OR REPLACE FUNCTION refresh_academy_materialized_views(p_academy_id UUID)
RETURNS void AS $$
BEGIN
    -- Note: Materialized views are global, so we refresh all views
    -- In the future, we could implement partial refresh strategies
    PERFORM refresh_dashboard_materialized_views();
    
    RAISE NOTICE 'Academy % materialized views refreshed at %', p_academy_id, NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Create Automatic Refresh Schedule (Optional)
-- =====================================================

-- Create a function to be called by a cron job or scheduled task
CREATE OR REPLACE FUNCTION scheduled_refresh_materialized_views()
RETURNS void AS $$
BEGIN
    -- Refresh during off-peak hours for better performance
    PERFORM refresh_dashboard_materialized_views();
    
    -- Insert refresh log
    INSERT INTO public.system_logs (
        operation,
        message,
        created_at
    ) VALUES (
        'materialized_view_refresh',
        'Dashboard materialized views refreshed automatically',
        NOW()
    );
EXCEPTION
    WHEN OTHERS THEN
        -- Log any errors
        INSERT INTO public.system_logs (
            operation,
            message,
            error_details,
            created_at
        ) VALUES (
            'materialized_view_refresh_error',
            'Failed to refresh dashboard materialized views',
            SQLERRM,
            NOW()
        );
        RAISE;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_dashboard_materialized_views() TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_academy_materialized_views(UUID) TO authenticated;

-- Comments for documentation
COMMENT ON MATERIALIZED VIEW mv_academy_stats IS 'Pre-computed academy statistics for dashboard performance';
COMMENT ON MATERIALIZED VIEW mv_session_analytics IS 'Session and attendance analytics by academy and time period';
COMMENT ON MATERIALIZED VIEW mv_assignment_analytics IS 'Assignment and grading analytics with performance metrics';
COMMENT ON MATERIALIZED VIEW mv_user_growth_trends IS 'User registration trends and growth analytics';
COMMENT ON MATERIALIZED VIEW mv_classroom_utilization IS 'Classroom usage and utilization metrics';
COMMENT ON MATERIALIZED VIEW mv_notification_analytics IS 'Notification engagement and analytics';

COMMENT ON FUNCTION refresh_dashboard_materialized_views() IS 'Refreshes all dashboard materialized views';
COMMENT ON FUNCTION refresh_academy_materialized_views(UUID) IS 'Refreshes materialized views for a specific academy';
COMMENT ON FUNCTION scheduled_refresh_materialized_views() IS 'Scheduled refresh function with error logging';