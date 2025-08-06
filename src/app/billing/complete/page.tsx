'use client'

import { useSearchParams } from 'next/navigation'
import { CheckCircle, XCircle } from 'lucide-react'

export default function BillingCompletePage() {
  const searchParams = useSearchParams()
  const status = searchParams.get('status') // either 'success' or 'failed'
  const oid = searchParams.get('oid')       // optional: order ID from INICIS

  const isSuccess = status === 'success'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      {isSuccess ? (
        <>
          <CheckCircle className="w-20 h-20 text-green-500 mb-4" />
          <h1 className="text-2xl font-bold text-green-600 mb-2">Payment Successful</h1>
          <p className="text-gray-700">Thank you! Your payment has been completed.</p>
        </>
      ) : (
        <>
          <XCircle className="w-20 h-20 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-red-600 mb-2">Payment Failed or Cancelled</h1>
          <p className="text-gray-700">It looks like the payment was not completed.</p>
        </>
      )}
    </div>
  )
}
