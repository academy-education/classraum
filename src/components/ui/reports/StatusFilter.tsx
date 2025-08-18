"use client"

import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTranslation } from '@/hooks/useTranslation'

type ReportStatus = 'all' | 'Draft' | 'Finished' | 'Approved' | 'Sent' | 'Viewed' | 'Error'

interface StatusFilterProps {
  value: ReportStatus
  onChange: (value: ReportStatus) => void
  className?: string
}

export const StatusFilter = React.memo<StatusFilterProps>(({ 
  value, 
  onChange, 
  className = "" 
}) => {
  const { t } = useTranslation()

  const statusOptions = React.useMemo(() => [
    { value: 'all', label: t('reports.allStatuses') },
    { value: 'Draft', label: t('reports.status.draft') },
    { value: 'Finished', label: t('reports.status.finished') },
    { value: 'Approved', label: t('reports.status.approved') },
    { value: 'Sent', label: t('reports.status.sent') },
    { value: 'Viewed', label: t('reports.status.viewed') },
    { value: 'Error', label: t('reports.status.error') }
  ], [t])

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={`w-48 ${className}`}>
        <SelectValue placeholder={t('reports.filterByStatus')} />
      </SelectTrigger>
      <SelectContent>
        {statusOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
})