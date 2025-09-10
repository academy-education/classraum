"use client"

import { PaymentsPage } from '@/components/ui/payments-page'
import { useAuth } from '@/contexts/AuthContext'

export default function PaymentPage() {
  const { academyId } = useAuth()
  
  if (!academyId) {
    console.error('PaymentPage: No academyId from useAuth - redirecting to auth')
    return <div>Loading academy data...</div>
  }
  
  return <PaymentsPage academyId={academyId} />
}
