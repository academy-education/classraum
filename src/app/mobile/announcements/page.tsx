"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/hooks/useTranslation'
import { useLanguage } from '@/contexts/LanguageContext'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { useEffectiveUserId } from '@/hooks/useEffectiveUserId'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/common/EmptyState'
import { ChevronLeft, Megaphone, Calendar, RefreshCw } from 'lucide-react'
import { StaggeredListSkeleton } from '@/components/ui/skeleton'
import { MOBILE_FEATURES } from '@/config/mobileFeatures'

interface Announcement {
  id: string
  title: string
  content: string
  academyId: string
  academyName: string
  academyLogo: string | null
  createdAt: string
}

export default function AnnouncementsPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const { language } = useLanguage()
  const { user } = usePersistentMobileAuth()
  const { effectiveUserId, isReady, academyIds } = useEffectiveUserId()

  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)

  // Pull-to-refresh state — same pattern as /mobile/invoices, /mobile/notifications,
  // and the rest of the mobile pages. Without this, parents who learn the
  // gesture from the home screen find it silently fails on the one screen
  // where new info actually appears.
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  const fetchAnnouncements = useCallback(async () => {
    if (!effectiveUserId || !academyIds || academyIds.length === 0) {
      setLoading(false)
      return
    }

    try {
      const { data: announcementsData, error } = await supabase
        .from('announcements')
        .select('id, title, content, academy_id, created_at')
        .in('academy_id', academyIds)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Error fetching announcements:', error)
        setAnnouncements([])
        return
      }

      const uniqueAcademyIds = [...new Set(announcementsData?.map(a => a.academy_id) || [])]
      let academiesMap: Record<string, { name: string; logo: string | null }> = {}

      if (uniqueAcademyIds.length > 0) {
        const { data: academiesData } = await supabase
          .from('academies')
          .select('id, name, logo_url')
          .in('id', uniqueAcademyIds)

        academiesMap = (academiesData || []).reduce((acc: Record<string, { name: string; logo: string | null }>, academy: any) => {
          acc[academy.id] = { name: academy.name, logo: academy.logo_url }
          return acc
        }, {})
      }

      const formattedAnnouncements: Announcement[] = (announcementsData || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        content: item.content,
        academyId: item.academy_id,
        academyName: academiesMap[item.academy_id]?.name || String(t('mobile.fallbacks.academy')),
        academyLogo: academiesMap[item.academy_id]?.logo || null,
        createdAt: item.created_at
      }))

      setAnnouncements(formattedAnnouncements)
    } catch (error) {
      console.error('Error fetching announcements:', error)
      setAnnouncements([])
    } finally {
      setLoading(false)
    }
  }, [effectiveUserId, academyIds])

  useEffect(() => {
    if (isReady) {
      fetchAnnouncements()
    }
  }, [isReady, fetchAnnouncements])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    setPullDistance(0)
    try {
      await fetchAnnouncements()
    } catch (error) {
      console.error('Error refreshing announcements:', error)
    } finally {
      setIsRefreshing(false)
    }
  }, [fetchAnnouncements])

  const handleTouchStart = (e: React.TouchEvent) => {
    if (scrollRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (scrollRef.current?.scrollTop === 0 && !isRefreshing) {
      const currentY = e.touches[0].clientY
      const diff = currentY - startY.current
      if (diff > 0) {
        setPullDistance(Math.min(diff, 100))
      }
    }
  }

  const handleTouchEnd = () => {
    if (pullDistance > 80 && !isRefreshing) {
      handleRefresh()
    } else {
      setPullDistance(0)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const locale = language === 'korean' ? 'ko-KR' : 'en-US'
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div
      ref={scrollRef}
      className="p-4 relative overflow-y-auto"
      style={{ touchAction: MOBILE_FEATURES.ENABLE_PULL_TO_REFRESH && pullDistance > 0 ? 'none' : 'auto' }}
      {...(MOBILE_FEATURES.ENABLE_PULL_TO_REFRESH && {
        onTouchStart: handleTouchStart,
        onTouchMove: handleTouchMove,
        onTouchEnd: handleTouchEnd,
      })}
    >
      {/* Pull-to-refresh indicator */}
      {MOBILE_FEATURES.ENABLE_PULL_TO_REFRESH && (pullDistance > 0 || isRefreshing) && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-300 z-10"
          style={{
            height: `${pullDistance}px`,
            opacity: pullDistance > 80 ? 1 : pullDistance / 80,
          }}
        >
          <div className="flex items-center gap-2">
            <RefreshCw className={`w-5 h-5 text-primary ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="text-sm text-primary font-medium">
              {isRefreshing ? t('common.refreshing') : t('common.pullToRefresh')}
            </span>
          </div>
        </div>
      )}

      <div
        style={{ transform: MOBILE_FEATURES.ENABLE_PULL_TO_REFRESH ? `translateY(${pullDistance}px)` : 'none' }}
        className="transition-transform"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            {t('mobile.announcements.title')}
          </h1>
        </div>

        {/* Content */}
        {loading ? (
          <StaggeredListSkeleton items={5} variant="notification" />
        ) : announcements.length > 0 ? (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <Card key={announcement.id} className="p-4">
                <div className="flex items-start gap-3">
                  {announcement.academyLogo ? (
                    <div className="w-10 h-10 bg-sky-50 rounded-lg flex items-center justify-center flex-shrink-0 p-1.5">
                      <img
                        src={announcement.academyLogo}
                        alt={announcement.academyName}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Megaphone className="w-5 h-5 text-sky-700" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full">
                        {announcement.academyName}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">
                      {announcement.title}
                    </h3>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">
                      {announcement.content}
                    </p>
                    <div className="flex items-center gap-1 mt-3 text-xs text-gray-400">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(announcement.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <EmptyState
              icon={Megaphone}
              title={String(t('mobile.announcements.noAnnouncements'))}
              description={String(t('mobile.announcements.noAnnouncementsDesc'))}
              size="sm"
            />
          </Card>
        )}
      </div>
    </div>
  )
}
