"use client"

import { Button } from '@/components/ui/button'
import { DollarSign, RotateCcw, Calendar } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

interface PaymentTabNavigationProps {
  activeTab: 'one_time' | 'recurring' | 'plans'
  onTabChange: (tab: 'one_time' | 'recurring' | 'plans') => void
  invoiceCounts?: {
    one_time: number
    recurring: number
    plans: number
  }
}

export function PaymentTabNavigation({ 
  activeTab, 
  onTabChange, 
  invoiceCounts 
}: PaymentTabNavigationProps) {
  const { t } = useTranslation()

  const tabs = [
    {
      id: 'one_time' as const,
      label: t('payments.oneTimePayments'),
      icon: <DollarSign className="w-4 h-4" />,
      count: invoiceCounts?.one_time
    },
    {
      id: 'recurring' as const,
      label: t('payments.recurringPayments'),
      icon: <RotateCcw className="w-4 h-4" />,
      count: invoiceCounts?.recurring
    },
    {
      id: 'plans' as const,
      label: t('payments.paymentPlans'),
      icon: <Calendar className="w-4 h-4" />,
      count: invoiceCounts?.plans
    }
  ]

  return (
    <div className="border-b">
      <nav className="flex space-x-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span className={`inline-flex items-center justify-center px-2 py-1 text-xs font-bold rounded-full ${
                activeTab === tab.id
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  )
}