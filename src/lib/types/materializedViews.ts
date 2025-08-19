// =====================================================
// Materialized View Types
// =====================================================
// TypeScript types for all materialized views used in dashboard analytics

// 1. Academy Statistics
export interface AcademyStats {
  academy_id: string
  academy_name: string
  
  // Student metrics
  total_students: number
  active_students: number
  new_students_30d: number
  
  // Teacher metrics
  total_teachers: number
  active_teachers: number
  
  // Parent metrics
  total_parents: number
  active_parents: number
  
  // Classroom metrics
  total_classrooms: number
  active_classrooms: number
  new_classrooms_30d: number
  
  // Family metrics
  total_families: number
  
  // Metadata
  last_updated: string
}

// 2. Session Analytics
export interface SessionAnalytics {
  academy_id: string
  month_year: string
  week_year: string
  date: string
  
  // Session counts by status
  total_sessions: number
  completed_sessions: number
  scheduled_sessions: number
  cancelled_sessions: number
  in_progress_sessions: number
  
  // Attendance metrics
  total_attendees: number
  present_count: number
  absent_count: number
  late_count: number
  attendance_rate: number
  
  // Diversity metrics
  classrooms_with_sessions: number
  teachers_with_sessions: number
  
  // Metadata
  last_updated: string
}

// 3. Assignment Analytics
export interface AssignmentAnalytics {
  academy_id: string
  month_year: string
  week_year: string
  date: string
  
  // Assignment counts by type
  total_assignments: number
  homework_assignments: number
  project_assignments: number
  quiz_assignments: number
  exam_assignments: number
  
  // Grade statistics
  students_with_grades: number
  total_grades: number
  completed_grades: number
  pending_grades: number
  late_grades: number
  
  // Score analytics
  average_score: number
  min_score: number
  max_score: number
  score_stddev: number
  
  // Performance distribution
  excellent_scores: number // >= 90
  good_scores: number // 80-89
  satisfactory_scores: number // 70-79
  needs_improvement_scores: number // < 70
  
  // Submission timing
  on_time_submissions: number
  late_submissions: number
  
  // Metadata
  last_updated: string
}

// 4. User Growth Trends
export interface UserGrowthTrends {
  academy_id: string
  registration_date: string
  month_year: string
  week_year: string
  
  // Daily new users by role
  new_students: number
  new_teachers: number
  new_parents: number
  new_managers: number
  total_new_users: number
  
  // Cumulative totals
  cumulative_students: number
  cumulative_teachers: number
  cumulative_parents: number
  cumulative_total: number
  
  // Metadata
  last_updated: string
}

// 5. Classroom Utilization
export interface ClassroomUtilization {
  academy_id: string
  classroom_id: string
  classroom_name: string
  teacher_id: string
  teacher_name: string
  
  // Enrollment metrics
  enrolled_students: number
  total_sessions: number
  completed_sessions: number
  upcoming_sessions: number
  
  // Time-based utilization
  sessions_last_7d: number
  sessions_last_30d: number
  
  // Attendance analytics
  total_attendance_records: number
  total_present: number
  total_absent: number
  overall_attendance_rate: number
  
  // Frequency metrics
  sessions_per_day: number
  
  // Activity dates
  last_session_date: string | null
  first_session_date: string | null
  
  // Metadata
  last_updated: string
}

// 6. Notification Analytics
export interface NotificationAnalytics {
  academy_id: string
  month_year: string
  week_year: string
  date: string
  
  // Notification counts by type
  total_notifications: number
  info_notifications: number
  warning_notifications: number
  error_notifications: number
  success_notifications: number
  
  // Read status
  read_notifications: number
  unread_notifications: number
  read_rate: number
  
  // User engagement
  users_with_notifications: number
  avg_notifications_per_user: number
  
  // Metadata
  last_updated: string
}

// 7. Payment Analytics
export interface PaymentAnalytics {
  academy_id: string
  month_year: string
  week_year: string
  date: string
  
  // Payment counts by status
  total_invoices: number
  pending_invoices: number
  paid_invoices: number
  overdue_invoices: number
  cancelled_invoices: number
  failed_invoices: number
  
  // Revenue metrics
  total_billed_amount: number
  total_revenue: number
  pending_revenue: number
  overdue_revenue: number
  
  // Discount analysis
  total_discounts: number
  avg_discount: number
  discounted_invoices: number
  
  // Payment timing
  on_time_payments: number
  late_payments: number
  
  // Student diversity
  unique_paying_students: number
  
  // Average metrics
  avg_invoice_amount: number
  avg_final_amount: number
  avg_paid_amount: number
  
  // Collection metrics
  collection_rate: number
  
  // Metadata
  last_updated: string
}

// 8. Recurring Template Analytics
export interface RecurringTemplateAnalytics {
  academy_id: string
  template_id: string
  template_name: string
  recurrence_type: string
  template_amount: number
  is_active: boolean
  
  // Student enrollment
  enrolled_students: number
  active_enrolled_students: number
  
  // Amount calculations
  total_monthly_revenue: number
  avg_student_payment: number
  min_student_payment: number
  max_student_payment: number
  
  // Override analysis
  students_with_override: number
  override_percentage: number
  
  // Timing metrics
  start_date: string
  end_date: string | null
  next_due_date: string
  due_status: 'overdue' | 'due_today' | 'due_soon' | 'future'
  
  // Template health
  template_health: 'inactive' | 'no_active_students' | 'expired' | 'healthy'
  
  // Metadata
  last_updated: string
}

// 9. Revenue Trends
export interface RevenueTrends {
  academy_id: string
  revenue_date: string
  month_year: string
  week_year: string
  
  // Daily metrics
  daily_revenue: number
  daily_billed: number
  daily_payments: number
  daily_invoices: number
  
  // Running totals
  cumulative_revenue: number
  week_to_date_revenue: number
  month_to_date_revenue: number
  
  // Moving averages
  revenue_7day_avg: number
  revenue_30day_avg: number
  
  // Growth comparisons
  prev_day_revenue: number | null
  prev_week_revenue: number | null
  prev_month_revenue: number | null
  
  // Metadata
  last_updated: string
}

// 10. Student Payment Behavior
export interface StudentPaymentBehavior {
  academy_id: string
  student_id: string
  student_name: string
  student_email: string
  
  // Payment counts
  total_invoices: number
  paid_invoices: number
  pending_invoices: number
  overdue_invoices: number
  
  // Payment amounts
  total_billed: number
  total_paid: number
  total_pending: number
  total_overdue: number
  
  // Behavior metrics
  payment_success_rate: number
  avg_invoice_amount: number
  avg_payment_amount: number
  avg_payment_delay_days: number | null
  
  // Recent activity
  last_invoice_date: string | null
  last_payment_date: string | null
  
  // Classification
  payment_tier: 'no_invoices' | 'excellent_payer' | 'good_payer' | 'average_payer' | 'at_risk' | 'needs_attention'
  
  // Recurring enrollment
  enrolled_recurring_templates: number
  
  // Metadata
  last_updated: string
}

// =====================================================
// Aggregated Dashboard Types
// =====================================================

// Combined dashboard metrics type
export interface DashboardMetrics {
  academyStats: AcademyStats
  sessionAnalytics: SessionAnalytics[]
  assignmentAnalytics: AssignmentAnalytics[]
  userGrowthTrends: UserGrowthTrends[]
  classroomUtilization: ClassroomUtilization[]
  notificationAnalytics: NotificationAnalytics[]
  paymentAnalytics: PaymentAnalytics[]
  revenueTrends: RevenueTrends[]
  
  // Metadata
  lastRefreshed: string
  dataFreshness: {
    isStale: boolean
    lastRefreshAttempt: string
    nextScheduledRefresh: string
  }
}

// Dashboard filters
export interface DashboardFilters {
  academyId: string
  dateRange: 'day' | 'week' | 'month' | 'quarter' | 'year'
  startDate?: string
  endDate?: string
  includeInactive?: boolean
}

// Performance metrics for materialized views
export interface MaterializedViewPerformance {
  viewName: string
  lastRefresh: string
  refreshDuration: number // milliseconds
  rowCount: number
  sizeBytes: number
  isStale: boolean
  nextScheduledRefresh: string
}

// Refresh status for all views
export interface RefreshStatus {
  isRefreshing: boolean
  lastRefreshAttempt: string
  lastSuccessfulRefresh: string
  refreshErrors: string[]
  estimatedRefreshTime: number // milliseconds
  views: MaterializedViewPerformance[]
}

// =====================================================
// Query Result Types
// =====================================================

// API response wrapper for materialized view queries
export interface MaterializedViewResponse<T> {
  data: T[]
  metadata: {
    query: string
    executionTime: number
    rowCount: number
    fromMaterializedView: boolean
    dataFreshness: {
      lastRefresh: string
      isStale: boolean
      stalenessMinutes: number
    }
  }
  pagination?: {
    page: number
    pageSize: number
    totalPages: number
    totalRows: number
  }
}

// Batch query response for multiple materialized views
export interface BatchMaterializedViewResponse {
  results: {
    [key: string]: MaterializedViewResponse<unknown>
  }
  metadata: {
    totalQueries: number
    totalExecutionTime: number
    allFromMaterializedViews: boolean
    refreshRecommended: boolean
  }
}

// =====================================================
// Helper Types
// =====================================================

// Time period aggregation options
export type TimePeriod = 'day' | 'week' | 'month' | 'quarter' | 'year'

// Metric comparison types
export interface MetricComparison {
  current: number
  previous: number
  change: number
  percentageChange: number
  isPositive: boolean
  trend: 'increasing' | 'decreasing' | 'stable'
}

// Growth calculation helpers
export interface GrowthMetrics {
  dayOverDay: MetricComparison
  weekOverWeek: MetricComparison
  monthOverMonth: MetricComparison
  yearOverYear: MetricComparison
}

// Export utility type for all materialized view names
export type MaterializedViewName = 
  | 'mv_academy_stats'
  | 'mv_session_analytics'
  | 'mv_assignment_analytics'
  | 'mv_user_growth_trends'
  | 'mv_classroom_utilization'
  | 'mv_notification_analytics'
  | 'mv_payment_analytics'
  | 'mv_recurring_template_analytics'
  | 'mv_revenue_trends'
  | 'mv_student_payment_behavior'