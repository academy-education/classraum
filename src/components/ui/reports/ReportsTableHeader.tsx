"use client"

import React from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { TableCheckbox } from '@/components/ui/dashboard'

interface ReportsTableHeaderProps {
  sortField: string | null
  sortDirection: 'asc' | 'desc'
  onSort: (field: string) => void
  selectedRows: string[]
  totalRows: number
  onSelectAll: (selected: boolean) => void
  showBulkActions?: boolean
}

export const ReportsTableHeader = React.memo<ReportsTableHeaderProps>(({
  sortField,
  sortDirection,
  onSort,
  selectedRows,
  totalRows,
  onSelectAll,
  showBulkActions = true
}) => {
  const { t } = useTranslation()

  const renderSortIcon = React.useCallback((field: string) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? 
      <ChevronUp className="w-4 h-4" /> : 
      <ChevronDown className="w-4 h-4" />
  }, [sortField, sortDirection])

  const handleSelectAll = React.useCallback(() => {
    onSelectAll(selectedRows.length !== totalRows)
  }, [selectedRows.length, totalRows, onSelectAll])

  const sortableHeaders = [
    { key: 'student_name', label: t('reports.student') },
    { key: 'report_name', label: t('reports.reportTitle') },
    { key: 'start_date', label: t('reports.startDate') },
    { key: 'end_date', label: t('reports.endDate') },
    { key: 'status', label: t('reports.status') },
    { key: 'created_at', label: t('reports.created') }
  ]

  const allSelected = selectedRows.length === totalRows && totalRows > 0
  const someSelected = selectedRows.length > 0 && selectedRows.length < totalRows

  return (
    <thead className="bg-gray-50/60">
      <tr>
        {showBulkActions && (
          <th className="p-4 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500 w-10">
            <TableCheckbox
              checked={allSelected}
              indeterminate={someSelected}
              ariaLabel={String(t('common.selectAll') || 'Select all')}
              onChange={handleSelectAll}
            />
          </th>
        )}

        {sortableHeaders.map((header) => (
          <th
            key={header.key}
            className="p-4 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => onSort(header.key)}
          >
            <div className="flex items-center gap-2">
              {header.label}
              {renderSortIcon(header.key)}
            </div>
          </th>
        ))}

        <th className="p-4 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">
          {t('common.actions')}
        </th>
      </tr>
    </thead>
  )
})

ReportsTableHeader.displayName = 'ReportsTableHeader'