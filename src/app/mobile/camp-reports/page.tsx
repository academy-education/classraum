"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/common/EmptyState'
import { ErrorState } from '@/components/ui/common/ErrorState'
import { StaggeredListSkeleton } from '@/components/ui/skeleton'
import { ArrowLeft, CalendarDays, ChevronRight, Tent, User } from 'lucide-react'
import { authHeaders } from '@/lib/auth-headers'
import { useTranslation } from '@/hooks/useTranslation'
import { useLanguage } from '@/contexts/LanguageContext'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { useEffectiveUserId } from '@/hooks/useEffectiveUserId'
import { MobilePageErrorBoundary } from '@/components/error-boundaries/MobilePageErrorBoundary'

/**
 * Camp P4 — parent/student list of camp reports (distinct from the
 * academy report cards under /mobile/reports). Parents see the child
 * selected in the student switcher (effectiveUserId), students see
 * their own; the API enforces the family link server-side and RLS
 * (migration 086) enforces it for any direct reads.
 */

interface CampReportMeta {
  id: string
  studentId: string
  periodStart: string | null
  periodEnd: string | null
  createdAt: string
  programName: string | null
  testFamily: string | null
  classroomName: string | null
  studentName: string | null
}

function CampReportsContent() {
  const router = useRouter()
  const { t } = useTranslation()
  const { language } = useLanguage()
  const { isAuthenticated, isInitializing } = usePersistentMobileAuth()
  const { effectiveUserId, isReady } = useEffectiveUserId()

  const [reports, setReports] = useState<CampReportMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<Error | null>(null)

  useEffect(() => {
    if (!effectiveUserId || !isReady) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/camp/reports?studentId=${effectiveUserId}`, {
          headers: await authHeaders(),
        })
        const json = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok) {
          setFetchError(new Error(json.error || 'Failed to load camp reports'))
          setReports([])
        } else {
          setFetchError(null)
          setReports(json.reports ?? [])
        }
      } catch (error) {
        if (!cancelled) setFetchError(error instanceof Error ? error : new Error(String(error)))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [effectiveUserId, isReady])

  const formatDate = (iso: string | null) => {
    if (!iso) return null
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return null
    return d.toLocaleDateString(language === 'korean' ? 'ko-KR' : 'en-US', {
      year: 'numeric', month: language === 'korean' ? 'long' : 'short', day: 'numeric',
    })
  }

  if (isInitializing || !isAuthenticated) return null

  return (
    <div className="p-4">
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1 -ml-1 text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          {t('mobile.campReports.title')}
        </h1>
      </div>

      {loading ? (
        <StaggeredListSkeleton items={3} variant="message" />
      ) : fetchError ? (
        <Card>
          <ErrorState onRetry={() => router.refresh()} />
        </Card>
      ) : reports.length === 0 ? (
        <Card>
          <EmptyState
            icon={Tent}
            title={String(t('mobile.campReports.noReports'))}
            description={String(t('mobile.campReports.noReportsDesc'))}
            size="sm"
          />
        </Card>
      ) : (
        <div className="space-y-2.5">
          {reports.map(report => (
            <Card
              key={report.id}
              className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => router.push(`/mobile/camp-reports/${report.id}`)}
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Tent className="w-4 h-4 text-primary" strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                    <User className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.75} />
                    <span className="truncate">{report.studentName ?? '—'}</span>
                  </div>
                  <div className="font-semibold text-base text-gray-900 mb-1 truncate">
                    {report.programName ?? t('mobile.campReports.untitled')}
                    {report.classroomName ? ` · ${report.classroomName}` : ''}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <CalendarDays className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.75} />
                    <span className="truncate">
                      {[formatDate(report.periodStart), formatDate(report.periodEnd)]
                        .filter(Boolean).join(' – ') || formatDate(report.createdAt)}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1.5" />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default function MobileCampReportsPage() {
  return (
    <MobilePageErrorBoundary>
      <CampReportsContent />
    </MobilePageErrorBoundary>
  )
}
