"use client"

import React, { useMemo } from 'react'
import { CheckCircle, Circle, MoreHorizontal, Download, Send, Trash2, Edit, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useTranslation } from '@/hooks/useTranslation'
import { formatCurrency, formatDate, getStatusColor } from '@/hooks/payments/usePaymentUtils'
import type { Invoice, PaymentTemplate, Student } from '@/hooks/payments/usePaymentData'

export interface PaymentsListProps {
  // Data
  invoices?: Invoice[]
  templates?: PaymentTemplate[]
  students: Student[]
  
  // State
  loading: boolean
  activeTab: 'one_time' | 'recurring' | 'plans'
  
  // Selection
  selectedItems: Set<string>
  onSelectionChange: (selectedItems: Set<string>) => void
  
  // Actions
  onEdit: (item: Invoice | PaymentTemplate) => void
  onDelete: (itemId: string) => void
  onView?: (item: Invoice | PaymentTemplate) => void
  onSendReminder?: (invoiceId: string) => void
  onToggleStatus?: (itemId: string, newStatus: string) => void
  
  // Loading states
  deletingItems: Set<string>
  actionLoading: boolean
  
  // Sorting
  sortField?: string | null
  sortDirection?: 'asc' | 'desc'
  onSort?: (field: string) => void
}

export const PaymentsList: React.FC<PaymentsListProps> = ({
  invoices = [],
  templates = [],
  students,
  loading,
  activeTab,
  selectedItems,
  onSelectionChange,
  onEdit,
  onDelete,
  onView,
  onSendReminder,
  onToggleStatus,
  deletingItems,
  actionLoading,
  sortField,
  sortDirection,
  onSort
}) => {
  const { t } = useTranslation()

  // Get student name by ID
  const getStudentName = (studentId: string): string => {
    const student = students.find(s => s.user_id === studentId)
    return student?.users?.name || t('common.unknown')
  }

  // Get student email by ID
  const getStudentEmail = (studentId: string): string => {
    const student = students.find(s => s.user_id === studentId)
    return student?.users?.email || ''
  }

  // Handle individual item selection
  const handleItemSelect = (itemId: string, selected: boolean) => {
    const newSelection = new Set(selectedItems)
    if (selected) {
      newSelection.add(itemId)
    } else {
      newSelection.delete(itemId)
    }
    onSelectionChange(newSelection)
  }

  // Handle select all
  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      const allIds = activeTab === 'plans' 
        ? templates.map(t => t.id)
        : invoices.map(i => i.id)
      onSelectionChange(new Set(allIds))
    } else {
      onSelectionChange(new Set())
    }
  }

  // Get current data based on active tab
  const currentData = activeTab === 'plans' ? templates : invoices
  const isAllSelected = currentData.length > 0 && selectedItems.size === currentData.length
  const isPartiallySelected = selectedItems.size > 0 && selectedItems.size < currentData.length

  // Sort column headers
  const SortableHeader: React.FC<{ field: string; children: React.ReactNode }> = ({ field, children }) => (
    <TableHead 
      className={`cursor-pointer hover:bg-gray-50 ${onSort ? 'select-none' : ''}`}
      onClick={() => onSort?.(field)}
    >
      <div className="flex items-center gap-2">
        {children}
        {sortField === field && (
          <span className="text-xs">
            {sortDirection === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </div>
    </TableHead>
  )

  // Render invoice row
  const renderInvoiceRow = (invoice: Invoice) => {
    const isSelected = selectedItems.has(invoice.id)
    const isDeleting = deletingItems.has(invoice.id)
    
    return (
      <TableRow 
        key={invoice.id}
        className={`${isSelected ? 'bg-blue-50' : ''} ${isDeleting ? 'opacity-50' : ''}`}
      >
        <TableCell>
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => handleItemSelect(invoice.id, checked as boolean)}
            disabled={isDeleting || actionLoading}
          />
        </TableCell>
        
        <TableCell className="font-medium">
          {getStudentName(invoice.student_id)}
          <div className="text-sm text-gray-500">
            {getStudentEmail(invoice.student_id)}
          </div>
        </TableCell>
        
        <TableCell>
          {formatCurrency(invoice.amount)}
        </TableCell>
        
        <TableCell>
          {formatDate(invoice.due_date)}
        </TableCell>
        
        <TableCell>
          <Badge 
            variant={getStatusColor(invoice.status)}
            className="capitalize"
          >
            {t(`payments.status.${invoice.status}`)}
          </Badge>
        </TableCell>
        
        <TableCell>
          {invoice.description || '-'}
        </TableCell>
        
        <TableCell>
          {invoice.reminder_sent_at ? formatDate(invoice.reminder_sent_at) : '-'}
        </TableCell>
        
        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" disabled={isDeleting || actionLoading}>
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onView && (
                <>
                  <DropdownMenuItem onClick={() => onView(invoice)}>
                    <Eye className="w-4 h-4 mr-2" />
                    {t('common.view')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              
              <DropdownMenuItem onClick={() => onEdit(invoice)}>
                <Edit className="w-4 h-4 mr-2" />
                {t('common.edit')}
              </DropdownMenuItem>
              
              {invoice.status === 'pending' && onToggleStatus && (
                <DropdownMenuItem onClick={() => onToggleStatus(invoice.id, 'paid')}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {t('payments.actions.markPaid')}
                </DropdownMenuItem>
              )}
              
              {invoice.status === 'paid' && onToggleStatus && (
                <DropdownMenuItem onClick={() => onToggleStatus(invoice.id, 'pending')}>
                  <Circle className="w-4 h-4 mr-2" />
                  {t('payments.actions.markPending')}
                </DropdownMenuItem>
              )}
              
              {onSendReminder && invoice.status !== 'paid' && (
                <DropdownMenuItem onClick={() => onSendReminder(invoice.id)}>
                  <Send className="w-4 h-4 mr-2" />
                  {t('payments.actions.sendReminder')}
                </DropdownMenuItem>
              )}
              
              <DropdownMenuItem onClick={() => window.print()}>
                <Download className="w-4 h-4 mr-2" />
                {t('payments.actions.download')}
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                onClick={() => onDelete(invoice.id)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t('common.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    )
  }

  // Render template row
  const renderTemplateRow = (template: PaymentTemplate) => {
    const isSelected = selectedItems.has(template.id)
    const isDeleting = deletingItems.has(template.id)
    
    return (
      <TableRow 
        key={template.id}
        className={`${isSelected ? 'bg-blue-50' : ''} ${isDeleting ? 'opacity-50' : ''}`}
      >
        <TableCell>
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => handleItemSelect(template.id, checked as boolean)}
            disabled={isDeleting || actionLoading}
          />
        </TableCell>
        
        <TableCell className="font-medium">
          {template.name}
        </TableCell>
        
        <TableCell>
          {formatCurrency(template.amount)}
        </TableCell>
        
        <TableCell>
          <Badge variant="outline" className="capitalize">
            {t(`payments.billing.${template.billing_cycle}`)}
          </Badge>
        </TableCell>
        
        <TableCell>
          <Badge 
            variant={template.is_active ? 'default' : 'secondary'}
          >
            {t(`payments.status.${template.is_active ? 'active' : 'inactive'}`)}
          </Badge>
        </TableCell>
        
        <TableCell>
          {template.description || '-'}
        </TableCell>
        
        <TableCell>
          {formatDate(template.created_at)}
        </TableCell>
        
        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" disabled={isDeleting || actionLoading}>
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onView && (
                <>
                  <DropdownMenuItem onClick={() => onView(template)}>
                    <Eye className="w-4 h-4 mr-2" />
                    {t('common.view')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              
              <DropdownMenuItem onClick={() => onEdit(template)}>
                <Edit className="w-4 h-4 mr-2" />
                {t('common.edit')}
              </DropdownMenuItem>
              
              {onToggleStatus && (
                <DropdownMenuItem 
                  onClick={() => onToggleStatus(template.id, template.is_active ? 'inactive' : 'active')}
                >
                  {template.is_active ? (
                    <>
                      <Circle className="w-4 h-4 mr-2" />
                      {t('payments.actions.deactivate')}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {t('payments.actions.activate')}
                    </>
                  )}
                </DropdownMenuItem>
              )}
              
              <DropdownMenuItem onClick={() => onEdit({ ...template, id: `copy_${template.id}` })}>
                <Download className="w-4 h-4 mr-2" />
                {t('payments.actions.duplicate')}
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                onClick={() => onDelete(template.id)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t('common.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    )
  }

  if (loading) {
    return (
      <div className="border rounded-lg">
        <div className="p-8 text-center">
          <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  if (currentData.length === 0) {
    return (
      <div className="border rounded-lg">
        <div className="p-8 text-center">
          <p className="text-gray-500 mb-4">
            {activeTab === 'plans' 
              ? t('payments.empty.templates')
              : t('payments.empty.invoices')
            }
          </p>
          <Button onClick={() => onEdit({} as any)}>
            {activeTab === 'plans' 
              ? t('payments.actions.createTemplate')
              : t('payments.actions.createInvoice')
            }
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={handleSelectAll}
                disabled={actionLoading}
                ref={(el) => {
                  if (el) {
                    el.indeterminate = isPartiallySelected
                  }
                }}
              />
            </TableHead>
            
            {activeTab === 'plans' ? (
              <>
                <SortableHeader field="name">{t('payments.table.name')}</SortableHeader>
                <SortableHeader field="amount">{t('payments.table.amount')}</SortableHeader>
                <SortableHeader field="billing_cycle">{t('payments.table.cycle')}</SortableHeader>
                <SortableHeader field="is_active">{t('payments.table.status')}</SortableHeader>
                <SortableHeader field="description">{t('payments.table.description')}</SortableHeader>
                <SortableHeader field="created_at">{t('payments.table.created')}</SortableHeader>
              </>
            ) : (
              <>
                <SortableHeader field="student_name">{t('payments.table.student')}</SortableHeader>
                <SortableHeader field="amount">{t('payments.table.amount')}</SortableHeader>
                <SortableHeader field="due_date">{t('payments.table.dueDate')}</SortableHeader>
                <SortableHeader field="status">{t('payments.table.status')}</SortableHeader>
                <SortableHeader field="description">{t('payments.table.description')}</SortableHeader>
                <SortableHeader field="reminder_sent_at">{t('payments.table.reminder')}</SortableHeader>
              </>
            )}
            
            <TableHead className="w-[70px]">{t('common.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        
        <TableBody>
          {activeTab === 'plans' 
            ? templates.map(renderTemplateRow)
            : invoices.map(renderInvoiceRow)
          }
        </TableBody>
      </Table>
    </div>
  )
}

export default PaymentsList