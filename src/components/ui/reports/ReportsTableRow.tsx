"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Edit, Trash2, Eye, MoreHorizontal } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { StatusBadge } from './StatusBadge'
import { ReportData } from '@/hooks/useReports'

interface ReportsTableRowProps {
  report: ReportData
  isSelected: boolean
  onSelect: (reportId: string) => void
  onEdit: (report: ReportData) => void
  onDelete: (report: ReportData) => void
  onPreview: (report: ReportData) => void
  showBulkActions?: boolean
}

export const ReportsTableRow = React.memo<ReportsTableRowProps>(({
  report,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onPreview,
  showBulkActions = true
}) => {
  const { t } = useTranslation()

  // Memoized event handlers
  const handleSelect = React.useCallback(() => {
    onSelect(report.id)
  }, [onSelect, report.id])

  const handleEdit = React.useCallback(() => {
    onEdit(report)
  }, [onEdit, report])

  const handleDelete = React.useCallback(() => {
    onDelete(report)
  }, [onDelete, report])

  const handlePreview = React.useCallback(() => {
    onPreview(report)
  }, [onPreview, report])

  // Memoized date formatters
  const formatDate = React.useCallback((dateString: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString()
  }, [])

  const formattedStartDate = React.useMemo(() => 
    formatDate(report.start_date || ''), [report.start_date, formatDate]
  )

  const formattedEndDate = React.useMemo(() => 
    formatDate(report.end_date || ''), [report.end_date, formatDate]
  )

  const formattedCreatedAt = React.useMemo(() => 
    formatDate(report.created_at), [report.created_at, formatDate]
  )

  return (
    <tr className="border-b hover:bg-gray-50 transition-colors">
      {showBulkActions && (
        <td className="p-4">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleSelect}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </td>
      )}
      
      <td className="p-4">
        <div className="space-y-1">
          <div className="font-medium text-gray-900">
            {report.student_name || t('reports.unknownStudent')}
          </div>
          <div className="text-sm text-gray-500">
            {report.student_email}
          </div>
          {report.student_school && (
            <div className="text-xs text-gray-400">
              {report.student_school}
            </div>
          )}
        </div>
      </td>
      
      <td className="p-4">
        <div className="font-medium text-gray-900">
          {report.report_name || t('reports.untitledReport')}
        </div>
      </td>
      
      <td className="p-4 text-gray-600">
        {formattedStartDate}
      </td>
      
      <td className="p-4 text-gray-600">
        {formattedEndDate}
      </td>
      
      <td className="p-4">
        <StatusBadge 
          status={report.status || 'Draft'} 
          size="sm" 
        />
      </td>
      
      <td className="p-4 text-gray-600">
        {formattedCreatedAt}
      </td>
      
      <td className="p-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePreview}
            title={t('reports.preview')}
          >
            <Eye className="w-4 h-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleEdit}
            title={t('common.edit')}
          >
            <Edit className="w-4 h-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="text-red-600 hover:text-red-700"
            title={t('common.delete')}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </td>
    </tr>
  )
})