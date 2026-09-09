"use client"

import { useState } from 'react'
import React from 'react'
import dynamic from 'next/dynamic'
import { TrendingUp, TrendingDown, Minus, CreditCard, Users, School, Calendar } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { useIsNarrowViewport } from '@/hooks/useResponsiveViewMode'
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

/** "₩23,975,000" → "₩2,398만" (ko) / "₩23.98M" (en). Non-money strings pass through. */
function compactMoney(exact: string, language: string): string {
  const m = exact.match(/^(₩|\$)?([\d,]+)$/); if (!m) return exact
  const n = Number(m[2].replace(/,/g, '')); const sym = m[1] ?? ''
  if (!Number.isFinite(n) || n < 100000) return exact
  if (language === 'korean') {
    if (n >= 100000000) return `${sym}${(n / 100000000).toLocaleString('ko-KR', { maximumFractionDigits: 2 })}억`
    return `${sym}${Math.round(n / 10000).toLocaleString('ko-KR')}만`
  }
  if (n >= 1000000000) return `${sym}${(n / 1000000000).toFixed(2)}B`
  if (n >= 1000000) return `${sym}${(n / 1000000).toFixed(2)}M`
  return `${sym}${(n / 1000).toFixed(0)}K`
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
  const { t, language } = useTranslation()
  const narrow = useIsNarrowViewport()
  const [expanded, setExpanded] = useState(false)
  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-4 sm:p-5 ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] h-full animate-pulse">
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
    <div className="bg-white rounded-2xl p-4 sm:p-5 ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] h-full">
      <div className="flex items-center gap-2 mb-2 sm:mb-3">
        {icon && (
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            {getIcon(icon)}
          </div>
        )}
        <h3 className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.08em] sm:tracking-[0.1em] text-gray-500 leading-tight line-clamp-2">{title}</h3>
      </div>

      {/* Two-up on phones leaves ~150px per tile. A full won amount does not
          fit, so on phones a long value shows compactly (₩2,398만 / ₩23.98M)
          and a tap toggles the exact figure; the exact figure is always in
          the title and the accessible name. */}
      {(() => {
        const exact = typeof value === 'number' ? value.toLocaleString() : String(value)
        const compact = narrow && !expanded && exact.length > 8 ? compactMoney(exact, language) : null
        const shown = compact ?? exact
        const toggleable = narrow && exact.length > 8
        return (
          <div
            className={`${expanded ? 'text-base' : 'text-xl'} sm:text-4xl font-semibold tracking-tight text-gray-900 tabular-nums mb-1 sm:mb-2 ${expanded ? 'whitespace-nowrap' : 'truncate'} ${toggleable ? 'cursor-pointer select-none' : ''}`}
            title={exact}
            aria-label={exact}
            role={toggleable ? 'button' : undefined}
            tabIndex={toggleable ? 0 : undefined}
            onClick={toggleable ? (e) => { e.stopPropagation(); setExpanded(v => !v) } : undefined}
            onKeyDown={toggleable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(v => !v) } } : undefined}
          >
            {shown}
          </div>
        ) })()}
      
      {growth && (
        <div className={`flex items-center text-xs sm:text-sm ${
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
        <div className={`hidden sm:block mt-4 w-full h-16 ${styles.rechartsContainer}`}>
          <StatsTrendChart data={trendData} dataKey={trendDataKey} color={trendColor} />
        </div>
      )}
    </div>
  )
})