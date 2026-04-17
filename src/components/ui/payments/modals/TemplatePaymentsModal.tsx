"use client"

import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  X,
  MoreHorizontal,
  DollarSign,
  CheckCircle,
  Clock,
  XCircle,
  RotateCcw,
  Edit,
  Trash2,
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import type { Invoice, PaymentTemplate } from '../hooks/usePaymentsData'

interface TemplatePaymentsModalProps {
  isOpen: boolean
  onClose: () => void
  selectedTemplate: PaymentTemplate | null
  templatePayments: Invoice[]
  templatePaymentsLoading: boolean
  selectedTemplatePayments: Set<string>
  setSelectedTemplatePayments: React.Dispatch<React.SetStateAction<Set<string>>>
  templateBulkStatus: string
  setTemplateBulkStatus: (value: string) => void
  handleTemplateBulkStatusUpdate: () => void
  handleSelectAllTemplatePayments: (checked: boolean, filteredData: Invoice[]) => void
  handleSelectTemplatePayment: (paymentId: string, checked: boolean) => void
  templateStatusFilter: string
  setTemplateStatusFilter: (value: string) => void
  showTemplateStatusFilter: boolean
  setShowTemplateStatusFilter: (value: boolean) => void
  templateMethodFilter: string
  setTemplateMethodFilter: (value: string) => void
  showTemplateMethodFilter: boolean
  setShowTemplateMethodFilter: (value: boolean) => void
  templateSortField: string | null
  templateSortDirection: 'asc' | 'desc'
  handleTemplateSort: (field: string) => void
  formatCurrency: (amount: number) => string
  formatDate: (dateString: string) => string
  getStatusColor: (status: string) => string
  getStatusIcon: (status: string) => React.ReactNode
  // For edit/delete actions on individual payments within the modal
  openInvoiceDropdownId: string | null
  setOpenInvoiceDropdownId: (id: string | null) => void
  dropdownButtonRefs: React.MutableRefObject<{ [key: string]: HTMLElement | null }>
  setEditingInvoice: (invoice: Invoice) => void
  setEditInvoiceName: (value: string) => void
  setEditAmount: (value: string) => void
  setEditDiscountAmount: (value: string) => void
  setEditDiscountReason: (value: string) => void
  setEditDueDate: (value: string) => void
  setEditStatus: (value: string) => void
  setEditPaidAt: (value: string) => void
  setEditPaymentMethod: (value: string) => void
  setEditRefundedAmount: (value: string) => void
  setShowEditPaymentModal: (value: boolean) => void
  handleDeleteInvoiceClick: (invoice: Invoice) => void
  formatAmountWithCommas: (value: string) => string
  templateStatusFilterRef: React.RefObject<HTMLDivElement | null>
  methodFilterRef: React.RefObject<HTMLDivElement | null>
}

export function TemplatePaymentsModal({
  isOpen,
  onClose,
  selectedTemplate,
  templatePayments,
  templatePaymentsLoading,
  selectedTemplatePayments,
  setSelectedTemplatePayments,
  templateBulkStatus,
  setTemplateBulkStatus,
  handleTemplateBulkStatusUpdate,
  handleSelectAllTemplatePayments,
  handleSelectTemplatePayment,
  templateStatusFilter,
  setTemplateStatusFilter,
  showTemplateStatusFilter,
  setShowTemplateStatusFilter,
  templateMethodFilter,
  setTemplateMethodFilter,
  showTemplateMethodFilter,
  setShowTemplateMethodFilter,
  templateSortField,
  templateSortDirection,
  handleTemplateSort,
  formatCurrency,
  formatDate,
  getStatusColor,
  getStatusIcon,
  openInvoiceDropdownId,
  setOpenInvoiceDropdownId,
  dropdownButtonRefs,
  setEditingInvoice,
  setEditInvoiceName,
  setEditAmount,
  setEditDiscountAmount,
  setEditDiscountReason,
  setEditDueDate,
  setEditStatus,
  setEditPaidAt,
  setEditPaymentMethod,
  setEditRefundedAmount,
  setShowEditPaymentModal,
  handleDeleteInvoiceClick,
  formatAmountWithCommas,
  templateStatusFilterRef,
  methodFilterRef,
}: TemplatePaymentsModalProps) {
  const { t } = useTranslation()

  const renderTemplateSortIcon = (field: string) => {
    const isActiveField = templateSortField === field
    const isAscending = isActiveField && templateSortDirection === 'asc'
    const isDescending = isActiveField && templateSortDirection === 'desc'

    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4"
          stroke={isAscending ? '#2885e8' : 'currentColor'} className={isAscending ? '' : 'text-gray-400'} />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 15l4 4 4-4"
          stroke={isDescending ? '#2885e8' : 'currentColor'} className={isDescending ? '' : 'text-gray-400'} />
      </svg>
    )
  }

  if (!selectedTemplate) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-shrink-0 flex items-center justify-between p-6 pb-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{t('payments.paymentHistory')}</h2>
            <p className="text-gray-500">{t('payments.studentPaymentsForTemplate', { templateName: selectedTemplate?.name })}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="p-1">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          {/* Template Summary */}
          <Card className="mb-6 p-4 bg-blue-50 border-blue-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm font-medium text-blue-900">{t('payments.template')}</div>
                <div className="text-lg font-bold text-blue-800">{selectedTemplate.name}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-blue-900">{t('payments.amount')}</div>
                <div className="text-lg font-bold text-blue-800">{formatCurrency(selectedTemplate.amount)}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-blue-900">{t('payments.recurrence')}</div>
                <div className="text-lg font-bold text-blue-800 capitalize">{t(`payments.${selectedTemplate.recurrence_type}`)}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-blue-900">{t('common.status')}</div>
                <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                  selectedTemplate.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {selectedTemplate.is_active ? t('common.active') : t('payments.paused')}
                </div>
              </div>
            </div>
          </Card>

          {/* Bulk Actions Menu for Payment History */}
          {selectedTemplatePayments.size > 0 && (
            <Card className="mb-4 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-700">
                    {selectedTemplatePayments.size}개 선택됨
                  </span>
                  <Button variant="outline" size="sm" onClick={() => setSelectedTemplatePayments(new Set())}>
                    {t('payments.clearSelection')}
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={templateBulkStatus} onValueChange={setTemplateBulkStatus}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder={t('common.status')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">{t('payments.pending')}</SelectItem>
                      <SelectItem value="paid">{t('payments.paid')}</SelectItem>
                      <SelectItem value="failed">{t('payments.failed')}</SelectItem>
                      <SelectItem value="refunded">{t('payments.refunded')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleTemplateBulkStatusUpdate} className="bg-primary text-white">
                    {t('common.apply')}
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Payments Table */}
          {templatePaymentsLoading ? (
            <Card className="p-4 sm:p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </Card>
          ) : (
            <>
              {templatePayments.length > 0 ? (
                <Card>
                  <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="text-left p-4 font-medium text-gray-900">
                            <div className="flex items-center gap-2">
                              <input type="checkbox" className="rounded border-gray-300 accent-primary"
                                checked={(() => {
                                  const filteredPayments = templatePayments.filter(payment => templateStatusFilter === 'all' || payment.status === templateStatusFilter)
                                  return filteredPayments.length > 0 && selectedTemplatePayments.size === filteredPayments.length
                                })()}
                                onChange={(e) => {
                                  const filteredPayments = templatePayments.filter(payment => templateStatusFilter === 'all' || payment.status === templateStatusFilter)
                                  handleSelectAllTemplatePayments(e.target.checked, filteredPayments)
                                }}
                              />
                            </div>
                          </th>
                          <th className="text-left p-4 font-medium text-gray-900">
                            <div className="flex items-center gap-2">
                              {t('common.roles.student')}
                              <button onClick={() => handleTemplateSort('student')} className="text-gray-400 hover:text-primary">{renderTemplateSortIcon('student')}</button>
                            </div>
                          </th>
                          <th className="text-left p-4 font-medium text-gray-900">
                            <div className="flex items-center gap-2">
                              {t('payments.amount')}
                              <button onClick={() => handleTemplateSort('amount')} className="text-gray-400 hover:text-primary">{renderTemplateSortIcon('amount')}</button>
                            </div>
                          </th>
                          <th className="text-left p-4 font-medium text-gray-900">
                            <div className="flex items-center gap-2">
                              {t('payments.dueDate')}
                              <button onClick={() => handleTemplateSort('due_date')} className="text-gray-400 hover:text-primary">{renderTemplateSortIcon('due_date')}</button>
                            </div>
                          </th>
                          <th className="text-left p-4 font-medium text-gray-900">
                            <div className="flex items-center gap-2">
                              {t('payments.paidDate')}
                              <button onClick={() => handleTemplateSort('paid_date')} className="text-gray-400 hover:text-primary">{renderTemplateSortIcon('paid_date')}</button>
                            </div>
                          </th>
                          <th className="text-left p-4 font-medium text-gray-900">
                            <div className="flex items-center gap-2 relative">
                              {t('payments.method')}
                              <div className="relative z-20" ref={methodFilterRef}>
                                <button onClick={() => setShowTemplateMethodFilter(!showTemplateMethodFilter)}
                                  className={`flex items-center ${templateMethodFilter !== 'all' ? 'text-primary' : 'text-gray-400 hover:text-primary'}`}>
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                                </button>
                                {showTemplateMethodFilter && (
                                  <div className="absolute top-full right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg py-1 min-w-[120px] z-50">
                                    {['all', 'card', 'bank_transfer', 'cash'].map(method => (
                                      <button key={method} onClick={() => { setTemplateMethodFilter(method); setShowTemplateMethodFilter(false) }}
                                        className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${templateMethodFilter === method ? 'bg-primary/10 text-primary' : 'text-gray-700'}`}>
                                        {method === 'all' ? t('common.all') : t(`payments.paymentMethods.${method}`)}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </th>
                          <th className="text-left p-4 font-medium text-gray-900">
                            <div className="flex items-center gap-2 relative">
                              {t('common.status')}
                              <div className="relative z-20" ref={templateStatusFilterRef}>
                                <button onClick={() => setShowTemplateStatusFilter(!showTemplateStatusFilter)}
                                  className={`flex items-center ${templateStatusFilter !== 'all' ? 'text-primary' : 'text-gray-400 hover:text-primary'}`}>
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                                </button>
                                {showTemplateStatusFilter && (
                                  <div className="absolute top-full right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg py-1 min-w-[120px] z-50">
                                    {['all', 'pending', 'paid', 'failed', 'refunded'].map(status => (
                                      <button key={status} onClick={() => { setTemplateStatusFilter(status); setShowTemplateStatusFilter(false) }}
                                        className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${templateStatusFilter === status ? 'bg-primary/10 text-primary' : 'text-gray-700'}`}>
                                        {status === 'all' ? t('common.all') : t(`payments.${status}`)}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </th>
                          <th className="text-left p-4 font-medium text-gray-900"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {templatePayments
                          .filter(payment => {
                            const matchesStatus = templateStatusFilter === 'all' || payment.status === templateStatusFilter
                            const matchesMethod = templateMethodFilter === 'all' || payment.payment_method === templateMethodFilter
                            return matchesStatus && matchesMethod
                          })
                          .sort((a, b) => {
                            if (!templateSortField) return 0
                            let aValue = ''
                            let bValue = ''
                            switch (templateSortField) {
                              case 'student':
                                aValue = a.student_name || ''; bValue = b.student_name || ''; break
                              case 'amount':
                                return templateSortDirection === 'asc' ? (a.final_amount || 0) - (b.final_amount || 0) : (b.final_amount || 0) - (a.final_amount || 0)
                              case 'due_date':
                                return templateSortDirection === 'asc' ? new Date(a.due_date || '').getTime() - new Date(b.due_date || '').getTime() : new Date(b.due_date || '').getTime() - new Date(a.due_date || '').getTime()
                              case 'paid_date':
                                return templateSortDirection === 'asc' ? new Date(a.paid_at || '').getTime() - new Date(b.paid_at || '').getTime() : new Date(b.paid_at || '').getTime() - new Date(a.paid_at || '').getTime()
                              default: return 0
                            }
                            const result = aValue.toLowerCase().localeCompare(bValue.toLowerCase())
                            return templateSortDirection === 'asc' ? result : -result
                          })
                          .map((payment) => (
                          <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="p-4">
                              <input type="checkbox" className="rounded border-gray-300 accent-primary"
                                checked={selectedTemplatePayments.has(payment.id)}
                                onChange={(e) => handleSelectTemplatePayment(payment.id, e.target.checked)}
                              />
                            </td>
                            <td className="p-4">
                              <div>
                                <div className="font-medium text-gray-900">{payment.student_name}</div>
                                <div className="text-sm text-gray-500">{payment.student_email}</div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="font-medium text-gray-900">{formatCurrency(payment.final_amount)}</div>
                              {payment.discount_amount > 0 && (
                                <div className="text-sm text-gray-500 line-through">{formatCurrency(payment.amount)}</div>
                              )}
                            </td>
                            <td className="p-4 text-sm text-gray-600">
                              {payment.due_date ? formatDate(payment.due_date) : '-'}
                            </td>
                            <td className="p-4 text-sm text-gray-600">
                              {payment.paid_at ? formatDate(payment.paid_at) : '-'}
                            </td>
                            <td className="p-4 text-sm text-gray-600">
                              {payment.payment_method ? t(`payments.paymentMethods.${payment.payment_method}`) : '-'}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                {getStatusIcon(payment.status)}
                                <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(payment.status)}`}>
                                  {payment.status === 'pending' ? t('payments.enrolled') : t(`payments.${payment.status}`)}
                                </span>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="relative">
                                <Button variant="ghost" size="sm" className="p-1 text-gray-500 hover:text-gray-700"
                                  ref={(el) => { dropdownButtonRefs.current[`template-${payment.id}`] = el }}
                                  onClick={(e) => { e.stopPropagation(); setOpenInvoiceDropdownId(openInvoiceDropdownId === payment.id ? null : payment.id) }}
                                >
                                  <MoreHorizontal className="w-4 h-4 text-gray-600" />
                                </Button>
                                {openInvoiceDropdownId === payment.id && (
                                  <div className="dropdown-menu absolute right-0 top-8 z-50 bg-white rounded-lg border border-gray-300 shadow-xl py-1 min-w-[160px]"
                                    style={{ zIndex: 9999 }} onClick={(e) => e.stopPropagation()}>
                                    <button className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap"
                                      onClick={(e) => {
                                        e.preventDefault(); e.stopPropagation()
                                        setEditingInvoice(payment)
                                        setEditInvoiceName(payment.invoice_name || '')
                                        setEditAmount(formatAmountWithCommas(payment.amount.toString()))
                                        setEditDiscountAmount(formatAmountWithCommas(payment.discount_amount?.toString() || '0'))
                                        setEditDiscountReason(payment.discount_reason || '')
                                        setEditDueDate(payment.due_date)
                                        setEditStatus(payment.status)
                                        setEditPaidAt(payment.paid_at || '')
                                        setEditPaymentMethod(payment.payment_method || '')
                                        setEditRefundedAmount(formatAmountWithCommas(payment.refunded_amount?.toString() || '0'))
                                        setShowEditPaymentModal(true)
                                        setOpenInvoiceDropdownId(null)
                                      }}
                                      onMouseDown={() => {}} onMouseUp={() => {}}
                                    >
                                      <Edit className="w-4 h-4" />{t('common.edit')}
                                    </button>
                                    <button className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap text-red-600"
                                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteInvoiceClick(payment) }}>
                                      <Trash2 className="w-4 h-4" />{t('common.delete')}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              ) : (
                <Card className="p-12 text-center">
                  <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{t('payments.noPayments')}</h3>
                  <p className="text-gray-600">{t('payments.noInvoicesGeneratedYet')}</p>
                </Card>
              )}
            </>
          )}
        </div>

        <div className="flex-shrink-0 flex items-center justify-between p-6 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            {t('payments.paymentsFound', { count: templatePayments?.length || 0 })}
          </div>
          <Button onClick={onClose}>{t('common.close')}</Button>
        </div>
      </div>
    </Modal>
  )
}
