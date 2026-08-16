"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSafeParams } from '@/hooks/useSafeParams'
import { Card } from '@/components/ui/card'
import { ErrorState } from '@/components/ui/common/ErrorState'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { authHeaders } from '@/lib/auth-headers'
import { useTranslation } from '@/hooks/useTranslation'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { MobilePageErrorBoundary } from '@/components/error-boundaries/MobilePageErrorBoundary'
import { CampReportView } from '@/components/ui/camp/CampReportView'
import type { CampReportPayload } from '@/lib/camp/report-types'

/**
 * Camp P4 — one camp report, rendered read-only with the same layout
 * the teacher previews. The API already strips teacher-only fields
 * (completion) for parents and students, so this page just renders
 * whatever payload it is given.
 */

function CampReportDetailContent() {
  const router = useRouter()
  const params = useSafeParams()
  const { t } = useTranslation()
  const { isAuthenticated, isInitializing } = usePersistentMobileAuth()

  const reportId = typeof params?.id === 'string' ? params.id : null
  const [payload, setPayload] = useState<CampReportPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<Error | null>(null)

  useEffect(() => {
    if (!reportId || !isAuthenticated) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/camp/reports?id=${reportId}`, { headers: await authHeaders() })
        const json = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok || !json.report?.payload) {
          setFetchError(new Error(json.error || 'Failed to load the camp report'))
        } else {
          setFetchError(null)
          setPayload(json.report.payload as CampReportPayload)
        }
      } catch (error) {
        if (!cancelled) setFetchError(error instanceof Error ? error : new Error(String(error)))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [reportId, isAuthenticated])

  if (isInitializing || !isAuthenticated) return null

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1 -ml-1 text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">
          {t('mobile.campReports.reportTitle')}
        </h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : fetchError || !payload ? (
        <Card>
          <ErrorState onRetry={() => router.refresh()} />
        </Card>
      ) : (
        <Card className="p-5">
          <CampReportView payload={payload} />
        </Card>
      )}
    </div>
  )
}

export default function MobileCampReportDetailPage() {
  return (
    <MobilePageErrorBoundary>
      <CampReportDetailContent />
    </MobilePageErrorBoundary>
  )
}
