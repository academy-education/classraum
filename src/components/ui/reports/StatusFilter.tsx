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
    { value: 'Draft', label: t('reports.statusDraft') },
    { value: 'Finished', label: t('reports.statusFinished') },
    { value: 'Approved', label: t('reports.statusApproved') },
    { value: 'Sent', label: t('reports.statusSent') },
    { value: 'Viewed', label: t('reports.statusViewed') },
    { value: 'Error', label: t('reports.statusError') }
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

StatusFilter.displayName = 'StatusFilter'