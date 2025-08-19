import React, { useMemo } from 'react'
import { DollarSign, Clock, CheckCircle, Users } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { usePaymentUtils } from '@/hooks/payments/usePaymentUtils'
import type { Invoice, PaymentTemplate } from '@/hooks/payments/usePaymentData'

interface PaymentStatsProps {
  invoices: Invoice[]
  templates: PaymentTemplate[]
  loading?: boolean
}

interface StatCard {
  title: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
}

export const PaymentStats: React.FC<PaymentStatsProps> = ({
  invoices,
  templates,
  loading = false
}) => {
  const { t } = useTranslation()
  const { 
    formatCurrency, 
    calculateTotalRevenue, 
    calculatePendingAmount,
    calculateMonthlyRecurring 
  } = usePaymentUtils()

  const stats = useMemo(() => {
    if (loading) {
      return {
        totalRevenue: 0,
        pendingAmount: 0,
        activeTemplates: 0,
        monthlyRecurring: 0
      }
    }

    const totalRevenue = calculateTotalRevenue(invoices)
    const pendingAmount = calculatePendingAmount(invoices)
    const activeTemplates = templates.filter(t => t.is_active).length
    const monthlyRecurring = calculateMonthlyRecurring(templates)

    return {
      totalRevenue,
      pendingAmount,
      activeTemplates,
      monthlyRecurring
    }
  }, [invoices, templates, loading, calculateTotalRevenue, calculatePendingAmount, calculateMonthlyRecurring])

  const statCards: StatCard[] = useMemo(() => [
    {
      title: t('payments.stats.totalRevenue'),
      value: formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: t('payments.stats.pendingAmount'),
      value: formatCurrency(stats.pendingAmount),
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    {
      title: t('payments.stats.activeTemplates'),
      value: stats.activeTemplates.toString(),
      icon: CheckCircle,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: t('payments.stats.monthlyRecurring'),
      value: formatCurrency(stats.monthlyRecurring),
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    }
  ], [t, formatCurrency, stats])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
            <div className="flex items-center justify-between">
              <div>
                <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-16"></div>
              </div>
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {statCards.map((stat, index) => {
        const IconComponent = stat.icon
        
        return (
          <div
            key={index}
            className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stat.value}
                </p>
              </div>
              <div className={`p-3 rounded-full ${stat.bgColor}`}>
                <IconComponent className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default PaymentStats