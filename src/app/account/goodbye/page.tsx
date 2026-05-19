"use client"

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useTranslation } from '@/hooks/useTranslation'
import { CheckCircle } from 'lucide-react'

/**
 * Landing page shown immediately after a user schedules their account for
 * deletion. The 30-day grace period is communicated here so the user knows
 * they can change their mind by signing back in via the reactivation flow.
 */
export default function GoodbyePage() {
  const router = useRouter()
  const { t } = useTranslation()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-3">
          {String(t('account.goodbye.title'))}
        </h1>
        <p className="text-sm text-gray-600 mb-6 leading-relaxed">
          {String(t('account.goodbye.description'))}
        </p>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-left">
          <p className="text-sm font-medium text-amber-900 mb-1">
            {String(t('account.goodbye.changedMindTitle'))}
          </p>
          <p className="text-xs text-amber-700">
            {String(t('account.goodbye.changedMindDescription'))}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button
            onClick={() => router.push('/account/reactivate')}
            variant="outline"
            className="w-full"
          >
            {String(t('account.goodbye.reactivateButton'))}
          </Button>
          <Button
            onClick={() => router.push('/')}
            variant="ghost"
            className="w-full"
          >
            {String(t('account.goodbye.homeButton'))}
          </Button>
        </div>
      </Card>
    </div>
  )
}
