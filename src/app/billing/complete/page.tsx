'use client'

import { useSearchParams } from 'next/navigation'
import { CheckCircle, XCircle } from 'lucide-react'
import { Suspense } from 'react'
import { useTranslation } from '@/hooks/useTranslation'

function BillingCompleteContent() {
  const searchParams = useSearchParams()
  const { t } = useTranslation()
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
          <h1 className="text-2xl font-bold text-green-600 mb-2">{t('billing.paymentSuccessful')}</h1>
          <p className="text-gray-700">{t('billing.paymentSuccessfulDesc')}</p>
          {oid && <p className="text-sm text-gray-500 mt-2">{t('billing.orderId')}: {oid}</p>}
        </>
      ) : isCancelled ? (
        <>
          <XCircle className="w-20 h-20 text-gray-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-600 mb-2">{t('billing.paymentCancelled')}</h1>
          <p className="text-gray-700">{t('billing.paymentCancelledDesc')}</p>
        </>
      ) : isFailed ? (
        <>
          <XCircle className="w-20 h-20 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-red-600 mb-2">{t('billing.paymentFailed')}</h1>
          <p className="text-gray-700">{t('billing.paymentFailedDesc')}</p>
        </>
      ) : (
        <>
          <XCircle className="w-20 h-20 text-gray-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-600 mb-2">{t('billing.paymentStatusUnknown')}</h1>
          <p className="text-gray-700">{t('billing.paymentStatusUnknownDesc')}</p>
        </>
      )}
    </div>
  )
}

export default function BillingCompletePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <BillingCompleteContent />
    </Suspense>
  )
}
