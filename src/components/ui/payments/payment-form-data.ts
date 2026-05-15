/**
 * Shared `PaymentFormData` shape and its empty-default constant.
 *
 * Lives outside `AddPaymentModal.tsx` so consumers (notably the parent
 * `payments-page.tsx`, which holds the form state in a `useState`) can
 * import the type/default without dragging the 690-line modal — and its
 * heavy modal/select/date-input deps — into their bundles. The modal
 * still re-exports both names for backward compat.
 */

export interface PaymentFormData {
  payment_type: string
  recurring_template_id: string
  selected_students: string[]
  invoice_name: string
  amount: string
  due_date: string
  description: string
  status: string
  discount_amount: string
  discount_reason: string
  paid_at: string
  payment_method: string
  refunded_amount: string
  student_amount_overrides: { [studentId: string]: { enabled: boolean; amount: string; reason?: string } }
  student_discount_overrides: { [studentId: string]: { enabled: boolean; amount: string; reason: string } }
}

export const emptyPaymentFormData: PaymentFormData = {
  payment_type: 'one_time',
  recurring_template_id: '',
  selected_students: [],
  invoice_name: '',
  amount: '',
  due_date: '',
  description: '',
  status: 'pending',
  discount_amount: '',
  discount_reason: '',
  paid_at: '',
  payment_method: '',
  refunded_amount: '',
  student_amount_overrides: {},
  student_discount_overrides: {},
}
