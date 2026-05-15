"use client"

import React from 'react'
import { CheckCircle, Clock, FileText, Send, Eye, AlertCircle } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

type ReportStatus = 'Draft' | 'Finished' | 'Approved' | 'Sent' | 'Viewed' | 'Error'

interface StatusBadgeProps {
  status: ReportStatus
  showIcon?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export const StatusBadge = React.memo<StatusBadgeProps>(({ 
  status, 
  showIcon = true, 
  size = 'md' 
}) => {
  const { t } = useTranslation()

  const getStatusConfig = React.useCallback((status: ReportStatus) => {
    switch (status) {
      case 'Draft':
        return {
          className: 'bg-gray-50 text-gray-700',
          icon: <FileText className={`${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'}`} />,
          text: t('reports.status.draft')
        }
      case 'Finished':
        return {
          className: 'bg-sky-50 text-sky-700',
          icon: <CheckCircle className={`${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'}`} />,
          text: t('reports.status.finished')
        }
      case 'Approved':
        return {
          className: 'bg-emerald-50 text-emerald-700',
          icon: <CheckCircle className={`${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'}`} />,
          text: t('reports.status.approved')
        }
      case 'Sent':
        return {
          className: 'bg-purple-100 text-purple-800',
          icon: <Send className={`${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'}`} />,
          text: t('reports.status.sent')
        }
      case 'Viewed':
        return {
          className: 'bg-indigo-100 text-indigo-800',
          icon: <Eye className={`${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'}`} />,
          text: t('reports.status.viewed')
        }
      case 'Error':
        return {
          className: 'bg-rose-50 text-rose-700',
          icon: <AlertCircle className={`${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'}`} />,
          text: t('reports.status.error')
        }
      default:
        return {
          className: 'bg-gray-50 text-gray-700',
          icon: <Clock className={`${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'}`} />,
          text: status
        }
    }
  }, [t, size])

  const config = getStatusConfig(status)
  
  const sizeClasses = React.useMemo(() => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1 text-xs'
      case 'lg':
        return 'px-3 py-2 text-sm'
      default:
        return 'px-2 py-1 text-xs'
    }
  }, [size])

  return (
    <span className={`inline-flex items-center gap-1 font-medium rounded-full ${config.className} ${sizeClasses}`}>
      {showIcon && config.icon}
      {config.text}
    </span>
  )
})

StatusBadge.displayName = 'StatusBadge'