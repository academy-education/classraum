-- =====================================================
-- Payment Analytics Materialized Views Migration
-- =====================================================
-- Purpose: Create materialized views for payment and revenue analytics
-- These views handle billing, recurring payments, and financial metrics

-- Create the payment-related tables if they don't exist
-- (These might not be in the main schema but are referenced in the API)

-- 1. Payment Analytics Materialized View
-- =====================================================
CREATE MATERIALIZED VIEW mv_payment_analytics AS
WITH academy_payments AS (
    -- We need to derive academy_id through student relationships
    SELECT 
        i.*,
        s.academy_id,
        u.name as student_name,
        u.email as student_email
    FROM invoices i
    INNER JOIN students s ON i.student_id = s.user_id
    INNER JOIN users u ON s.user_id = u.id
    WHERE s.academy_id IS NOT NULL
)
SELECT 
    ap.academy_id,
    DATE_TRUNC('month', ap.created_at) as month_year,
    DATE_TRUNC('week', ap.created_at) as week_year,
    ap.created_at::date as date,
    
    -- Payment counts by status
    COUNT(*) as total_invoices,
    COUNT(CASE WHEN ap.status = 'pending' THEN 1 END) as pending_invoices,
    COUNT(CASE WHEN ap.status = 'paid' THEN 1 END) as paid_invoices,
    COUNT(CASE WHEN ap.status = 'overdue' THEN 1 END) as overdue_invoices,
    COUNT(CASE WHEN ap.status = 'cancelled' THEN 1 END) as cancelled_invoices,
    COUNT(CASE WHEN ap.status = 'failed' THEN 1 END) as failed_invoices,
    
    -- Revenue metrics
    SUM(ap.amount) as total_billed_amount,
    SUM(CASE WHEN ap.status = 'paid' THEN ap.final_amount ELSE 0 END) as total_revenue,
    SUM(CASE WHEN ap.status = 'pending' THEN ap.final_amount ELSE 0 END) as pending_revenue,
    SUM(CASE WHEN ap.status = 'overdue' THEN ap.final_amount ELSE 0 END) as overdue_revenue,
    
    -- Discount analysis
    SUM(ap.discount_amount) as total_discounts,
    AVG(ap.discount_amount) as avg_discount,
    COUNT(CASE WHEN ap.discount_amount > 0 THEN 1 END) as discounted_invoices,
    
    -- Payment timing
    COUNT(CASE WHEN ap.due_date IS NOT NULL AND ap.created_at::date <= ap.due_date THEN 1 END) as on_time_payments,
    COUNT(CASE WHEN ap.due_date IS NOT NULL AND ap.created_at::date > ap.due_date THEN 1 END) as late_payments,
    
    -- Student diversity
    COUNT(DISTINCT ap.student_id) as unique_paying_students,
    
    -- Average metrics
    ROUND(AVG(ap.amount), 2) as avg_invoice_amount,
    ROUND(AVG(ap.final_amount), 2) as avg_final_amount,
    ROUND(AVG(CASE WHEN ap.status = 'paid' THEN ap.final_amount END), 2) as avg_paid_amount,
    
    -- Collection rate
    ROUND(
        CASE 
            WHEN SUM(ap.amount) > 0 THEN 
                (SUM(CASE WHEN ap.status = 'paid' THEN ap.final_amount ELSE 0 END) / SUM(ap.amount)) * 100
            ELSE 0 
        END, 2
    ) as collection_rate,
    
    -- Update timestamp
    NOW() as last_updated
FROM academy_payments ap
GROUP BY ap.academy_id, DATE_TRUNC('month', ap.created_at), DATE_TRUNC('week', ap.created_at), ap.created_at::date;

-- Create indexes for performance
CREATE INDEX idx_mv_payment_analytics_academy_month ON mv_payment_analytics(academy_id, month_year);
CREATE INDEX idx_mv_payment_analytics_academy_week ON mv_payment_analytics(academy_id, week_year);
CREATE INDEX idx_mv_payment_analytics_academy_date ON mv_payment_analytics(academy_id, date);

-- 2. Recurring Payment Template Analytics
-- =====================================================
CREATE MATERIALIZED VIEW mv_recurring_template_analytics AS
WITH template_academy AS (
    -- Get academy_id through student relationships
    SELECT DISTINCT
        rpts.template_id,
        s.academy_id
    FROM recurring_payment_template_students rpts
    INNER JOIN students s ON rpts.student_id = s.user_id
)
SELECT 
    ta.academy_id,
    rpt.id as template_id,
    rpt.name as template_name,
    rpt.recurrence_type,
    rpt.amount as template_amount,
    rpt.is_active,
    
    -- Student enrollment
    COUNT(DISTINCT rpts.student_id) as enrolled_students,
    COUNT(DISTINCT CASE WHEN s.active = true THEN rpts.student_id END) as active_enrolled_students,
    
    -- Amount calculations
    SUM(COALESCE(rpts.amount_override, rpt.amount)) as total_monthly_revenue,
    AVG(COALESCE(rpts.amount_override, rpt.amount)) as avg_student_payment,
    MIN(COALESCE(rpts.amount_override, rpt.amount)) as min_student_payment,
    MAX(COALESCE(rpts.amount_override, rpt.amount)) as max_student_payment,
    
    -- Override analysis
    COUNT(CASE WHEN rpts.amount_override IS NOT NULL THEN 1 END) as students_with_override,
    ROUND(
        CASE 
            WHEN COUNT(rpts.student_id) > 0 THEN 
                (COUNT(CASE WHEN rpts.amount_override IS NOT NULL THEN 1 END)::decimal / COUNT(rpts.student_id)) * 100
            ELSE 0 
        END, 2
    ) as override_percentage,
    
    -- Timing metrics
    rpt.start_date,
    rpt.end_date,
    rpt.next_due_date,
    CASE 
        WHEN rpt.next_due_date < CURRENT_DATE THEN 'overdue'
        WHEN rpt.next_due_date = CURRENT_DATE THEN 'due_today'
        WHEN rpt.next_due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'due_soon'
        ELSE 'future'
    END as due_status,
    
    -- Template health
    CASE 
        WHEN NOT rpt.is_active THEN 'inactive'
        WHEN COUNT(CASE WHEN s.active = true THEN rpts.student_id END) = 0 THEN 'no_active_students'
        WHEN rpt.end_date IS NOT NULL AND rpt.end_date < CURRENT_DATE THEN 'expired'
        ELSE 'healthy'
    END as template_health,
    
    -- Update timestamp
    NOW() as last_updated
FROM recurring_payment_templates rpt
INNER JOIN template_academy ta ON rpt.id = ta.template_id
LEFT JOIN recurring_payment_template_students rpts ON rpt.id = rpts.template_id
LEFT JOIN students s ON rpts.student_id = s.user_id
GROUP BY 
    ta.academy_id, rpt.id, rpt.name, rpt.recurrence_type, rpt.amount, 
    rpt.is_active, rpt.start_date, rpt.end_date, rpt.next_due_date;

-- Create indexes for performance
CREATE INDEX idx_mv_recurring_template_analytics_academy ON mv_recurring_template_analytics(academy_id);
CREATE INDEX idx_mv_recurring_template_analytics_template ON mv_recurring_template_analytics(template_id);
CREATE INDEX idx_mv_recurring_template_analytics_due_status ON mv_recurring_template_analytics(due_status);
CREATE INDEX idx_mv_recurring_template_analytics_health ON mv_recurring_template_analytics(template_health);

-- 3. Revenue Trends Materialized View
-- =====================================================
CREATE MATERIALIZED VIEW mv_revenue_trends AS
WITH daily_revenue AS (
    SELECT 
        s.academy_id,
        i.created_at::date as revenue_date,
        SUM(CASE WHEN i.status = 'paid' THEN i.final_amount ELSE 0 END) as daily_revenue,
        SUM(i.amount) as daily_billed,
        COUNT(CASE WHEN i.status = 'paid' THEN 1 END) as daily_payments,
        COUNT(*) as daily_invoices
    FROM invoices i
    INNER JOIN students s ON i.student_id = s.user_id
    WHERE s.academy_id IS NOT NULL
    GROUP BY s.academy_id, i.created_at::date
)
SELECT 
    academy_id,
    revenue_date,
    DATE_TRUNC('month', revenue_date) as month_year,
    DATE_TRUNC('week', revenue_date) as week_year,
    
    -- Daily metrics
    daily_revenue,
    daily_billed,
    daily_payments,
    daily_invoices,
    
    -- Running totals
    SUM(daily_revenue) OVER (
        PARTITION BY academy_id 
        ORDER BY revenue_date 
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) as cumulative_revenue,
    
    -- Weekly aggregates
    SUM(daily_revenue) OVER (
        PARTITION BY academy_id, DATE_TRUNC('week', revenue_date)
        ORDER BY revenue_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) as week_to_date_revenue,
    
    -- Monthly aggregates
    SUM(daily_revenue) OVER (
        PARTITION BY academy_id, DATE_TRUNC('month', revenue_date)
        ORDER BY revenue_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) as month_to_date_revenue,
    
    -- Moving averages (7-day and 30-day)
    AVG(daily_revenue) OVER (
        PARTITION BY academy_id 
        ORDER BY revenue_date 
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) as revenue_7day_avg,
    
    AVG(daily_revenue) OVER (
        PARTITION BY academy_id 
        ORDER BY revenue_date 
        ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
    ) as revenue_30day_avg,
    
    -- Growth calculations (day-over-day, week-over-week)
    LAG(daily_revenue, 1) OVER (PARTITION BY academy_id ORDER BY revenue_date) as prev_day_revenue,
    LAG(daily_revenue, 7) OVER (PARTITION BY academy_id ORDER BY revenue_date) as prev_week_revenue,
    LAG(daily_revenue, 30) OVER (PARTITION BY academy_id ORDER BY revenue_date) as prev_month_revenue,
    
    -- Update timestamp
    NOW() as last_updated
FROM daily_revenue
ORDER BY academy_id, revenue_date;

-- Create indexes for performance
CREATE INDEX idx_mv_revenue_trends_academy_date ON mv_revenue_trends(academy_id, revenue_date);
CREATE INDEX idx_mv_revenue_trends_academy_month ON mv_revenue_trends(academy_id, month_year);
CREATE INDEX idx_mv_revenue_trends_academy_week ON mv_revenue_trends(academy_id, week_year);

-- 4. Student Payment Behavior Analytics
-- =====================================================
CREATE MATERIALIZED VIEW mv_student_payment_behavior AS
SELECT 
    s.academy_id,
    s.user_id as student_id,
    u.name as student_name,
    u.email as student_email,
    
    -- Payment counts
    COUNT(i.id) as total_invoices,
    COUNT(CASE WHEN i.status = 'paid' THEN 1 END) as paid_invoices,
    COUNT(CASE WHEN i.status = 'pending' THEN 1 END) as pending_invoices,
    COUNT(CASE WHEN i.status = 'overdue' THEN 1 END) as overdue_invoices,
    
    -- Payment amounts
    SUM(i.amount) as total_billed,
    SUM(CASE WHEN i.status = 'paid' THEN i.final_amount ELSE 0 END) as total_paid,
    SUM(CASE WHEN i.status = 'pending' THEN i.final_amount ELSE 0 END) as total_pending,
    SUM(CASE WHEN i.status = 'overdue' THEN i.final_amount ELSE 0 END) as total_overdue,
    
    -- Payment behavior metrics
    ROUND(
        CASE 
            WHEN COUNT(i.id) > 0 THEN 
                (COUNT(CASE WHEN i.status = 'paid' THEN 1 END)::decimal / COUNT(i.id)) * 100
            ELSE 0 
        END, 2
    ) as payment_success_rate,
    
    -- Average payment amounts
    ROUND(AVG(i.amount), 2) as avg_invoice_amount,
    ROUND(AVG(CASE WHEN i.status = 'paid' THEN i.final_amount END), 2) as avg_payment_amount,
    
    -- Payment timing
    AVG(
        CASE 
            WHEN i.status = 'paid' AND i.due_date IS NOT NULL THEN 
                EXTRACT(days FROM (i.created_at::date - i.due_date))
            ELSE NULL 
        END
    ) as avg_payment_delay_days,
    
    -- Recent activity
    MAX(i.created_at) as last_invoice_date,
    MAX(CASE WHEN i.status = 'paid' THEN i.created_at END) as last_payment_date,
    
    -- Student classification based on payment behavior
    CASE 
        WHEN COUNT(i.id) = 0 THEN 'no_invoices'
        WHEN COUNT(CASE WHEN i.status = 'paid' THEN 1 END)::decimal / COUNT(i.id) >= 0.95 THEN 'excellent_payer'
        WHEN COUNT(CASE WHEN i.status = 'paid' THEN 1 END)::decimal / COUNT(i.id) >= 0.80 THEN 'good_payer'
        WHEN COUNT(CASE WHEN i.status = 'paid' THEN 1 END)::decimal / COUNT(i.id) >= 0.60 THEN 'average_payer'
        WHEN COUNT(CASE WHEN i.status = 'overdue' THEN 1 END) > 0 THEN 'at_risk'
        ELSE 'needs_attention'
    END as payment_tier,
    
    -- Recurring payment enrollment
    COUNT(DISTINCT rpts.template_id) as enrolled_recurring_templates,
    
    -- Update timestamp
    NOW() as last_updated
FROM students s
INNER JOIN users u ON s.user_id = u.id
LEFT JOIN invoices i ON s.user_id = i.student_id
LEFT JOIN recurring_payment_template_students rpts ON s.user_id = rpts.student_id
WHERE s.active = true
GROUP BY s.academy_id, s.user_id, u.name, u.email;

-- Create indexes for performance
CREATE UNIQUE INDEX idx_mv_student_payment_behavior_student ON mv_student_payment_behavior(student_id);
CREATE INDEX idx_mv_student_payment_behavior_academy ON mv_student_payment_behavior(academy_id);
CREATE INDEX idx_mv_student_payment_behavior_tier ON mv_student_payment_behavior(payment_tier);

-- =====================================================
-- Update the main refresh function to include payment views
-- =====================================================

-- Update the main refresh function
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
    
    -- Refresh payment-related views
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_payment_analytics;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_recurring_template_analytics;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_revenue_trends;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_student_payment_behavior;
    
    -- Log the refresh
    RAISE NOTICE 'All dashboard materialized views refreshed at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to refresh only payment-related views
CREATE OR REPLACE FUNCTION refresh_payment_materialized_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_payment_analytics;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_recurring_template_analytics;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_revenue_trends;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_student_payment_behavior;
    
    RAISE NOTICE 'Payment materialized views refreshed at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT ON mv_payment_analytics TO authenticated;
GRANT SELECT ON mv_recurring_template_analytics TO authenticated;
GRANT SELECT ON mv_revenue_trends TO authenticated;
GRANT SELECT ON mv_student_payment_behavior TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_payment_materialized_views() TO authenticated;

-- Comments for documentation
COMMENT ON MATERIALIZED VIEW mv_payment_analytics IS 'Payment and invoice analytics by academy and time period';
COMMENT ON MATERIALIZED VIEW mv_recurring_template_analytics IS 'Recurring payment template performance and health metrics';
COMMENT ON MATERIALIZED VIEW mv_revenue_trends IS 'Revenue trends with moving averages and growth calculations';
COMMENT ON MATERIALIZED VIEW mv_student_payment_behavior IS 'Individual student payment behavior and classification';

COMMENT ON FUNCTION refresh_payment_materialized_views() IS 'Refreshes only payment-related materialized views';