"use client"

import React, { useState, useMemo } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { ReportsTableHeader } from './ReportsTableHeader'
import { ReportsTableRow } from './ReportsTableRow'
import { BulkActions } from './BulkActions'
import { TableSkeleton } from './TableSkeleton'
import { ReportData } from '@/hooks/useReports'

interface ReportsTableProps {
  reports: ReportData[]
  loading: boolean
  searchQuery: string
  statusFilter: string
  onEdit: (report: ReportData) => void
  onDelete: (report: ReportData) => void
  onPreview: (report: ReportData) => void
  onBulkDelete?: (reportIds: string[]) => void
  onBulkStatusUpdate?: (reportIds: string[], status: string) => void
  showBulkActions?: boolean
}

export const ReportsTable = React.memo<ReportsTableProps>(({
  reports,
  loading,
  searchQuery,
  statusFilter,
  onEdit,
  onDelete,
  onPreview,
  onBulkDelete,
  onBulkStatusUpdate,
  showBulkActions = true
}) => {
  const { t } = useTranslation()
  
  // Table state
  const [sortField, setSortField] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [selectedRows, setSelectedRows] = useState<string[]>([])

  // Filter and sort reports
  const filteredAndSortedReports = useMemo(() => {
    let filtered = reports

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(report =>
        report.student_name?.toLowerCase().includes(query) ||
        report.student_email?.toLowerCase().includes(query) ||
        report.report_name?.toLowerCase().includes(query) ||
        report.student_school?.toLowerCase().includes(query)
      )
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(report => report.status === statusFilter)
    }

    // Apply sorting
    if (sortField) {
      filtered.sort((a, b) => {
        let aValue: unknown = a[sortField as keyof ReportData]
        let bValue: unknown = b[sortField as keyof ReportData]

        // Handle date fields
        if (sortField === 'start_date' || sortField === 'end_date' || sortField === 'created_at') {
          aValue = new Date(typeof aValue === 'string' ? aValue : '1970-01-01')
          bValue = new Date(typeof bValue === 'string' ? bValue : '1970-01-01')
        } else {
          aValue = String(aValue || '').toLowerCase()
          bValue = String(bValue || '').toLowerCase()
        }

        if ((aValue as Date | string) < (bValue as Date | string)) return sortDirection === 'asc' ? -1 : 1
        if ((aValue as Date | string) > (bValue as Date | string)) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }

    return filtered
  }, [reports, searchQuery, statusFilter, sortField, sortDirection])

  // Memoized handlers
  const handleSort = React.useCallback((field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }, [sortField, sortDirection])

  const handleSelectRow = React.useCallback((reportId: string) => {
    setSelectedRows(prev => 
      prev.includes(reportId)
        ? prev.filter(id => id !== reportId)
        : [...prev, reportId]
    )
  }, [])

  const handleSelectAll = React.useCallback((selected: boolean) => {
    if (selected) {
      setSelectedRows(filteredAndSortedReports.map(report => report.id))
    } else {
      setSelectedRows([])
    }
  }, [filteredAndSortedReports])

  const handleBulkDelete = React.useCallback(() => {
    if (selectedRows.length > 0 && onBulkDelete) {
      onBulkDelete(selectedRows)
      setSelectedRows([])
    }
  }, [selectedRows, onBulkDelete])

  const handleBulkStatusUpdate = React.useCallback((status: string) => {
    if (selectedRows.length > 0 && onBulkStatusUpdate) {
      onBulkStatusUpdate(selectedRows, status)
      setSelectedRows([])
    }
  }, [selectedRows, onBulkStatusUpdate])

  const handleClearSelection = React.useCallback(() => {
    setSelectedRows([])
  }, [])

  if (loading) {
    return <TableSkeleton rows={5} columns={7} showHeader={true} />
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      {showBulkActions && (
        <BulkActions
          selectedCount={selectedRows.length}
          onBulkDelete={handleBulkDelete}
          onBulkStatusUpdate={handleBulkStatusUpdate}
          onClearSelection={handleClearSelection}
          showStatusActions={!!onBulkStatusUpdate}
        />
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full">
          <ReportsTableHeader
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            selectedRows={selectedRows}
            totalRows={filteredAndSortedReports.length}
            onSelectAll={handleSelectAll}
            showBulkActions={showBulkActions}
          />
          
          <tbody>
            {filteredAndSortedReports.length === 0 ? (
              <tr>
                <td 
                  colSpan={showBulkActions ? 8 : 7} 
                  className="p-8 text-center text-gray-500"
                >
                  {searchQuery || statusFilter !== 'all' 
                    ? t('reports.noReportsFound')
                    : t('reports.noReportsYet')
                  }
                </td>
              </tr>
            ) : (
              filteredAndSortedReports.map((report) => (
                <ReportsTableRow
                  key={report.id}
                  report={report}
                  isSelected={selectedRows.includes(report.id)}
                  onSelect={handleSelectRow}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onPreview={onPreview}
                  showBulkActions={showBulkActions}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Results summary */}
      {!loading && filteredAndSortedReports.length > 0 && (
        <div className="text-sm text-gray-600 text-center">
          {t('reports.showingResults', { 
            count: filteredAndSortedReports.length,
            total: reports.length 
          })}
        </div>
      )}
    </div>
  )
})

ReportsTable.displayName = 'ReportsTable'