"use client"

import React from 'react'
import dynamic from 'next/dynamic'
import { TrendingUp, TrendingDown, Minus, CreditCard, Users, School, Calendar } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import styles from '../dashboard.module.css'

const StatsTrendChart = dynamic(() => import('./StatsTrendChart'), {
  ssr: false,
  loading: () => <div className="w-full h-full animate-pulse bg-gray-100 rounded" />,
})

interface StatsCardProps {
  title: string
  value: string | number
  growth?: {
    percentage: number
    isPositive: boolean
    showGrowth: boolean
    period: string
    isUserCount?: boolean  // Flag to show user count instead of percentage
  }
  trendData?: Array<{ day: number; value: number }>
  trendDataKey?: string
  trendColor?: string
  icon?: 'revenue' | 'users' | 'classrooms' | 'sessions'
  loading?: boolean
}

const getIcon = (type: string) => {
  switch (type) {
    case 'revenue':
      return <CreditCard className="w-3.5 h-3.5 text-primary" strokeWidth={2.25} />
    case 'users':
      return <Users className="w-3.5 h-3.5 text-primary" strokeWidth={2.25} />
    case 'classrooms':
      return <School className="w-3.5 h-3.5 text-primary" strokeWidth={2.25} />
    case 'sessions':
      return <Calendar className="w-3.5 h-3.5 text-primary" strokeWidth={2.25} />
    default:
      return null
  }
}

export const StatsCard = React.memo<StatsCardProps>(function StatsCard({
  title,
  value,
  growth,
  trendData,
  trendDataKey = 'value',
  trendColor = '#10B981',
  icon,
  loading = false
}: StatsCardProps) {
  const { t } = useTranslation()
  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-5 ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] h-full animate-pulse">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-gray-100" />
          <div className="h-3 bg-gray-100 rounded w-24" />
        </div>
        <div className="h-9 bg-gray-100 rounded mb-2 w-32" />
        <div className="h-4 bg-gray-100 rounded w-20" />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-5 ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] h-full">
      <div className="flex items-center gap-2 mb-3">
        {icon && (
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            {getIcon(icon)}
          </div>
        )}
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500">{title}</h3>
      </div>

      <div className="text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900 tabular-nums mb-2">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      
      {growth && (
        <div className={`flex items-center text-sm ${
          growth.percentage === 0 ? 'text-gray-500' : 
          growth.isPositive ? 'text-emerald-600' : 'text-rose-600'
        }`}>
          {growth.percentage === 0 ? (
            <Minus className="w-4 h-4 mr-1" />
          ) : growth.isPositive ? (
            <TrendingUp className="w-4 h-4 mr-1" />
          ) : (
            <TrendingDown className="w-4 h-4 mr-1" />
          )}
          <span>
            {growth.percentage === 0 ? t('dashboard.noChange') :
              growth.isUserCount
                ? (growth.period === '이번 달'
                    ? `${growth.period} ${growth.isPositive ? '+' : ''}${growth.percentage}`
                    : `${growth.isPositive ? '+' : ''}${growth.percentage} ${growth.period}`)
                : (growth.period === '이번 달' || growth.period === '지난 주 대비' || growth.period.includes('대비')
                    ? `${growth.period} ${growth.isPositive ? '+' : '-'}${growth.percentage}%`
                    : `${growth.isPositive ? '+' : '-'}${growth.percentage}% ${growth.period}`)
            }
          </span>
        </div>
      )}
      
      {/* Mini Trend Chart */}
      {trendData && trendData.length > 0 && (
        <div className={`mt-4 w-full h-16 ${styles.rechartsContainer}`}>
          <StatsTrendChart data={trendData} dataKey={trendDataKey} color={trendColor} />
        </div>
      )}
    </div>
  )
})