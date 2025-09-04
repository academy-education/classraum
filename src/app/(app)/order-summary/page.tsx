"use client"

import { OrderSummaryPage } from '@/components/ui/order-summary-page'
import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useState } from 'react'

export default function OrderSummaryPageComponent() {
  const { academyId } = useAuth()
  const [selectedPlan, setSelectedPlan] = useState<{
    name: string
    price: string
    description: string
    features: string[]
    additionalCosts?: string[]
  } | undefined>(undefined)

  useEffect(() => {
    // Get the selected plan from sessionStorage
    const planData = sessionStorage.getItem('selectedPlan')
    if (planData) {
      try {
        setSelectedPlan(JSON.parse(planData))
      } catch (error) {
        console.error('Error parsing plan data:', error)
      }
    }
  }, [])

  return <OrderSummaryPage academyId={academyId} selectedPlan={selectedPlan} />
}