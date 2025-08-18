"use client"

import { PaymentsPage } from '@/components/ui/payments-page'
import { useAuth } from '@/contexts/AuthContext'

export default function PaymentPage() {
  const { academyId } = useAuth()
  
  return <PaymentsPage academyId={academyId} />
}
