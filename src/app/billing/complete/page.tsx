'use client'

import { useSearchParams } from 'next/navigation'
import { CheckCircle, XCircle } from 'lucide-react'

export default function BillingCompletePage() {
  const searchParams = useSearchParams()
  const status = searchParams.get('status') // either 'success' or 'failed' (old format)
  const result = searchParams.get('result') // success/cancel/fail (new format)
  const oid = searchParams.get('oid') || searchParams.get('moid') // order ID from INICIS

  // Determine the actual result from either parameter
  const isSuccess = status === 'success' || result === 'success'
  const isCancelled = result === 'cancel'
  const isFailed = status === 'failed' || result === 'fail'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      {isSuccess ? (
        <>
          <CheckCircle className="w-20 h-20 text-green-500 mb-4" />
          <h1 className="text-2xl font-bold text-green-600 mb-2">Payment Successful</h1>
          <p className="text-gray-700">Thank you! Your payment has been completed.</p>
          {oid && <p className="text-sm text-gray-500 mt-2">Order ID: {oid}</p>}
        </>
      ) : isCancelled ? (
        <>
          <XCircle className="w-20 h-20 text-gray-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-600 mb-2">Payment Cancelled</h1>
          <p className="text-gray-700">Your payment was cancelled. No charges were made.</p>
        </>
      ) : isFailed ? (
        <>
          <XCircle className="w-20 h-20 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-red-600 mb-2">Payment Failed</h1>
          <p className="text-gray-700">There was an issue processing your payment.</p>
        </>
      ) : (
        <>
          <XCircle className="w-20 h-20 text-gray-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-600 mb-2">Payment Status Unknown</h1>
          <p className="text-gray-700">Unable to determine payment status.</p>
        </>
      )}
    </div>
  )
}
