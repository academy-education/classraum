"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/hooks/useTranslation'
import { useLanguage } from '@/contexts/LanguageContext'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { useEffectiveUserId } from '@/hooks/useEffectiveUserId'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { ChevronLeft, Megaphone, Calendar } from 'lucide-react'
import { StaggeredListSkeleton } from '@/components/ui/skeleton'

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

  useEffect(() => {
    const fetchAnnouncements = async () => {
      if (!effectiveUserId || !academyIds || academyIds.length === 0) {
        setLoading(false)
        return
      }

      try {
        // Fetch announcements for all academies the student belongs to
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

        // Fetch academy names and logos
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
          academyName: academiesMap[item.academy_id]?.name || 'Academy',
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
    }

    if (isReady) {
      fetchAnnouncements()
    }
  }, [effectiveUserId, academyIds, isReady])

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
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">
          {t('mobile.announcements.title')}
        </h1>
      </div>

      {/* Content */}
      {loading ? (
        <StaggeredListSkeleton items={5} />
      ) : announcements.length > 0 ? (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <Card key={announcement.id} className="p-4">
              <div className="flex items-start gap-3">
                {announcement.academyLogo ? (
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 p-1.5">
                    <img
                      src={announcement.academyLogo}
                      alt={announcement.academyName}
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Megaphone className="w-5 h-5 text-blue-600" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
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
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center gap-2">
            <Megaphone className="w-12 h-12 text-gray-300" />
            <p className="text-gray-500 font-medium">
              {t('mobile.announcements.noAnnouncements')}
            </p>
            <p className="text-gray-400 text-sm">
              {t('mobile.announcements.noAnnouncementsDesc')}
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}
