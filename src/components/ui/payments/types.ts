// Shared types and interfaces for Payments components

export interface Invoice {
  id: string
  student_id: string
  student_name: string
  student_email: string
  template_id?: string
  amount: number
  discount_amount: number
  final_amount: number
  discount_reason?: string
  due_date: string
  status: 'pending' | 'paid' | 'failed' | 'refunded'
  paid_at?: string
  payment_method?: string
  transaction_id?: string
  refunded_amount: number
  created_at: string
}

export interface PaymentTemplate {
  id: string
  academy_id: string
  name: string
  amount: number
  recurrence_type: 'monthly' | 'weekly'
  day_of_month?: number
  day_of_week?: number
  interval_weeks?: number
  semester_months?: number
  next_due_date: string
  start_date: string
  end_date?: string
  is_active: boolean
  created_at: string
  student_count?: number
}

export interface Student {
  id: string
  name: string
  email: string
  academy_id: string
  created_at: string
}

export interface RecurringStudent {
  id: string
  student_id: string
  student_name: string
  student_email: string
  template_id: string
  template_name: string
  template_amount: number
  amount_override?: number
  status: 'active' | 'paused'
  created_at: string
}

export interface PaymentStats {
  totalRevenue: number
  pendingAmount: number
  paidAmount: number
  refundedAmount: number
  totalInvoices: number
  pendingInvoices: number
  paidInvoices: number
  failedInvoices: number
}

export interface PaymentFilters {
  searchQuery: string
  statusFilter: string
  dateRange?: {
    from: string
    to: string
  }
  sortField?: string
  sortDirection?: 'asc' | 'desc'
}

export interface PaymentModalState {
  isOpen: boolean
  mode: 'add' | 'edit' | 'view'
  data?: Invoice | PaymentTemplate | null
}

export interface BulkAction {
  type: 'status_update' | 'delete' | 'export'
  selectedIds: string[]
  newStatus?: string
}

export type PaymentTab = 'one_time' | 'recurring' | 'plans'

export interface PaymentsPageProps {
  academyId: string
}

// Form validation types
export interface PaymentFormData {
  student_id: string
  amount: string
  discount_amount: string
  discount_reason: string
  due_date: string
  status: string
  payment_method: string
}

export interface TemplateFormData {
  name: string
  amount: string
  recurrence_type: 'monthly' | 'weekly'
  day_of_month?: number
  day_of_week?: number
  interval_weeks?: number
  semester_months?: number
  start_date: string
  end_date?: string
}

// Event handler types
export interface PaymentEventHandlers {
  onEdit: (invoice: Invoice) => void
  onDelete: (invoiceId: string) => void
  onView: (invoiceId: string) => void
  onStatusChange: (invoiceId: string, status: string) => void
  onBulkAction: (action: BulkAction) => void
}

export interface TemplateEventHandlers {
  onEdit: (template: PaymentTemplate) => void
  onDelete: (templateId: string) => void
  onPauseResume: (templateId: string, isActive: boolean) => void
  onViewPayments: (templateId: string, templateName: string) => void
}

// API response types
export interface PaymentApiResponse {
  data: Invoice[]
  total: number
  page: number
  limit: number
}

export interface TemplateApiResponse {
  data: PaymentTemplate[]
  total: number
  page: number
  limit: number
}

// Error handling
export interface PaymentError {
  code: string
  message: string
  field?: string
}