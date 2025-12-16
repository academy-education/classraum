"use client"

import React from 'react'
import { TrendingUp, TrendingDown, Minus, CreditCard, Users, School, Calendar } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { useTranslation } from '@/hooks/useTranslation'
import styles from '../dashboard.module.css'

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
      return <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
    case 'users':
      return <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
    case 'classrooms':
      return <School className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
    case 'sessions':
      return <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
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
      <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm border border-gray-100 h-full animate-pulse">
        <div className="h-4 bg-gray-200 rounded mb-4"></div>
        <div className="h-8 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 bg-gray-200 rounded"></div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm border border-gray-100 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        {icon && getIcon(icon)}
      </div>

      <div className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      
      {growth && (
        <div className={`flex items-center text-sm ${
          growth.percentage === 0 ? 'text-gray-500' : 
          growth.isPositive ? 'text-green-600' : 'text-red-600'
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
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={trendData}
              margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
            >
              <Line
                type="monotone"
                dataKey={trendDataKey}
                stroke={trendColor}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
})