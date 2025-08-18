"use client"

import React from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

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

  return (
    <thead className="bg-gray-50">
      <tr>
        {showBulkActions && (
          <th className="p-4 text-left">
            <input
              type="checkbox"
              checked={selectedRows.length === totalRows && totalRows > 0}
              onChange={handleSelectAll}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </th>
        )}
        
        {sortableHeaders.map((header) => (
          <th 
            key={header.key}
            className="p-4 text-left cursor-pointer hover:bg-gray-100 transition-colors"
            onClick={() => onSort(header.key)}
          >
            <div className="flex items-center gap-2 font-medium text-gray-700">
              {header.label}
              {renderSortIcon(header.key)}
            </div>
          </th>
        ))}
        
        <th className="p-4 text-left font-medium text-gray-700">
          {t('common.actions')}
        </th>
      </tr>
    </thead>
  )
})