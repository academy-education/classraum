"use client"

import React, { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { 
  Search, 
  ChevronUp, 
  ChevronDown, 
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  RotateCcw
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

interface Invoice {
  id: string
  student_id: string
  student_name: string
  student_email: string
  amount: number
  discount_amount: number
  final_amount: number
  discount_reason?: string
  due_date: string
  status: 'pending' | 'paid' | 'failed' | 'refunded'
  paid_at?: string
  payment_method?: string
  refunded_amount: number
  created_at: string
}

interface InvoiceTableProps {
  invoices: Invoice[]
  loading: boolean
  searchQuery: string
  onSearchChange: (query: string) => void
  onEditInvoice: (invoice: Invoice) => void
  onDeleteInvoice: (invoice: Invoice) => void
  onBulkStatusUpdate: (invoiceIds: string[], status: string) => void
  showBulkActions?: boolean
}

type SortField = 'student_name' | 'amount' | 'final_amount' | 'due_date' | 'status' | 'created_at'
type SortDirection = 'asc' | 'desc'

const InvoiceTableComponent = React.memo<InvoiceTableProps>(({
  invoices,
  loading,
  searchQuery,
  onSearchChange,
  onEditInvoice,
  onDeleteInvoice,
  onBulkStatusUpdate,
  showBulkActions = true
}) => {
  const { t } = useTranslation()
  
  // Table state
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([])

  // Sort and filter invoices
  const filteredAndSortedInvoices = useMemo(() => {
    let filtered = invoices

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(invoice =>
        invoice.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.student_email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === statusFilter)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: string | number | Date = a[sortField]
      let bValue: string | number | Date = b[sortField]

      if (sortField === 'due_date' || sortField === 'created_at') {
        aValue = new Date(aValue)
        bValue = new Date(bValue)
      } else if (sortField === 'amount' || sortField === 'final_amount') {
        aValue = Number(aValue)
        bValue = Number(bValue)
      } else {
        aValue = String(aValue).toLowerCase()
        bValue = String(bValue).toLowerCase()
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [invoices, searchQuery, statusFilter, sortField, sortDirection])

  // Memoized handlers
  const handleSort = React.useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }, [sortField, sortDirection])

  const handleRowSelect = React.useCallback((invoiceId: string) => {
    setSelectedInvoices(prev => 
      prev.includes(invoiceId)
        ? prev.filter(id => id !== invoiceId)
        : [...prev, invoiceId]
    )
  }, [])

  const handleSelectAll = React.useCallback(() => {
    if (selectedInvoices.length === filteredAndSortedInvoices.length) {
      setSelectedInvoices([])
    } else {
      setSelectedInvoices(filteredAndSortedInvoices.map(invoice => invoice.id))
    }
  }, [selectedInvoices.length, filteredAndSortedInvoices])

  const handleBulkMarkPaid = React.useCallback(() => {
    onBulkStatusUpdate(selectedInvoices, 'paid')
  }, [onBulkStatusUpdate, selectedInvoices])

  const handleBulkMarkFailed = React.useCallback(() => {
    onBulkStatusUpdate(selectedInvoices, 'failed')
  }, [onBulkStatusUpdate, selectedInvoices])

  // Memoized utility functions
  const formatCurrency = React.useCallback((amount: number) => {
    return `₩${amount.toLocaleString()}`
  }, [])

  const formatDate = React.useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }, [])

  const getStatusDisplay = React.useCallback((status: Invoice['status']) => {
    switch (status) {
      case 'paid':
        return {
          icon: <CheckCircle className="w-4 h-4 text-green-600" />,
          text: t('payments.status.paid'),
          className: 'text-green-600 bg-green-50'
        }
      case 'pending':
        return {
          icon: <Clock className="w-4 h-4 text-yellow-600" />,
          text: t('payments.status.pending'),
          className: 'text-yellow-600 bg-yellow-50'
        }
      case 'failed':
        return {
          icon: <XCircle className="w-4 h-4 text-red-600" />,
          text: t('payments.status.failed'),
          className: 'text-red-600 bg-red-50'
        }
      case 'refunded':
        return {
          icon: <RotateCcw className="w-4 h-4 text-gray-600" />,
          text: t('payments.status.refunded'),
          className: 'text-gray-600 bg-gray-50'
        }
      default:
        return {
          icon: <Clock className="w-4 h-4 text-gray-600" />,
          text: status,
          className: 'text-gray-600 bg-gray-50'
        }
    }
  }, [t])

  // Render sort icon
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? 
      <ChevronUp className="w-4 h-4" /> : 
      <ChevronDown className="w-4 h-4" />
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder={String(t('payments.searchInvoices'))}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('payments.allStatuses')}</SelectItem>
            <SelectItem value="pending">{t('payments.status.pending')}</SelectItem>
            <SelectItem value="paid">{t('payments.status.paid')}</SelectItem>
            <SelectItem value="failed">{t('payments.status.failed')}</SelectItem>
            <SelectItem value="refunded">{t('payments.status.refunded')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Actions */}
      {showBulkActions && selectedInvoices.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {t('payments.selectedCount', { count: selectedInvoices.length })}
            </span>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={handleBulkMarkPaid}
              >
                {t('payments.markAsPaid')}
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleBulkMarkFailed}
              >
                {t('payments.markAsFailed')}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              {showBulkActions && (
                <th className="text-left p-3">
                  <input
                    type="checkbox"
                    checked={selectedInvoices.length === filteredAndSortedInvoices.length && filteredAndSortedInvoices.length > 0}
                    onChange={handleSelectAll}
                    className="rounded"
                  />
                </th>
              )}
              <th 
                className="text-left p-3 cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('student_name')}
              >
                <div className="flex items-center gap-2">
                  {t('payments.student')}
                  {renderSortIcon('student_name')}
                </div>
              </th>
              <th 
                className="text-left p-3 cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('amount')}
              >
                <div className="flex items-center gap-2">
                  {t('payments.amount')}
                  {renderSortIcon('amount')}
                </div>
              </th>
              <th 
                className="text-left p-3 cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('final_amount')}
              >
                <div className="flex items-center gap-2">
                  {t('payments.finalAmount')}
                  {renderSortIcon('final_amount')}
                </div>
              </th>
              <th 
                className="text-left p-3 cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('due_date')}
              >
                <div className="flex items-center gap-2">
                  {t('payments.dueDate')}
                  {renderSortIcon('due_date')}
                </div>
              </th>
              <th 
                className="text-left p-3 cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center gap-2">
                  {t('payments.status')}
                  {renderSortIcon('status')}
                </div>
              </th>
              <th className="text-left p-3">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={showBulkActions ? 7 : 6} className="text-center p-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-gray-600">{t('common.loading')}</p>
                </td>
              </tr>
            ) : filteredAndSortedInvoices.length === 0 ? (
              <tr>
                <td colSpan={showBulkActions ? 7 : 6} className="text-center p-8 text-gray-500">
                  {searchQuery || statusFilter !== 'all' 
                    ? t('payments.noInvoicesFound')
                    : t('payments.noInvoicesYet')
                  }
                </td>
              </tr>
            ) : (
              filteredAndSortedInvoices.map((invoice) => {
                const statusDisplay = getStatusDisplay(invoice.status)
                return (
                  <tr key={invoice.id} className="border-b hover:bg-gray-50">
                    {showBulkActions && (
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedInvoices.includes(invoice.id)}
                          onChange={() => handleRowSelect(invoice.id)}
                          className="rounded"
                        />
                      </td>
                    )}
                    <td className="p-3">
                      <div>
                        <div className="font-medium">{invoice.student_name}</div>
                        <div className="text-sm text-gray-500">{invoice.student_email}</div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div>{formatCurrency(invoice.amount)}</div>
                      {invoice.discount_amount > 0 && (
                        <div className="text-sm text-red-600">
                          -{formatCurrency(invoice.discount_amount)}
                        </div>
                      )}
                    </td>
                    <td className="p-3 font-medium">
                      {formatCurrency(invoice.final_amount)}
                    </td>
                    <td className="p-3">
                      {formatDate(invoice.due_date)}
                    </td>
                    <td className="p-3">
                      <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium ${statusDisplay.className}`}>
                        {statusDisplay.icon}
                        {statusDisplay.text}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditInvoice(invoice)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteInvoice(invoice)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      {!loading && filteredAndSortedInvoices.length > 0 && (
        <div className="text-sm text-gray-600 text-center">
          {t('payments.showingResults', { 
            count: filteredAndSortedInvoices.length,
            total: invoices.length 
          })}
        </div>
      )}
    </div>
  )
})

InvoiceTableComponent.displayName = 'InvoiceTable'

export const InvoiceTable = InvoiceTableComponent