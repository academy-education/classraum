"use client"

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { performLogout } from '@/lib/logout'
import { hapticTap, hapticImpact } from '@/lib/nativeHaptics'
import { useTranslation } from '@/hooks/useTranslation'
import { useLanguage } from '@/contexts/LanguageContext'
import { useTheme } from '@/hooks/useTheme'
import { saveThemeToAccount } from '@/lib/theme-account'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { useEffectiveUserId } from '@/hooks/useEffectiveUserId'
import { readStoredMode } from '@/lib/study/currentMode'
import { MobilePageErrorBoundary } from '@/components/error-boundaries/MobilePageErrorBoundary'
import { useToast } from '@/hooks/use-toast'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/common/EmptyState'
import { Button } from '@/components/ui/button'
import { ProfileSkeleton } from '@/components/ui/skeleton'
import { Eyebrow } from '@/components/ui/eyebrow'
import { StatusPill } from '@/components/ui/status-pill'
import { StudySubPageHeader } from '@/app/mobile/study/_shared/primitives'
import { User as UserIcon } from 'lucide-react'
import { useMobileProfile } from './hooks/useMobileProfile'
import { StudyNicknameCard } from './StudyNicknameCard'
import { ModalPortal } from '@/components/ui/modal-portal'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Mail,
  Phone,
  Globe,
  Moon,
  Bell,
  LogOut,
  ChevronRight,
  School,
  GraduationCap,
  RefreshCw,
  UserCheck,
  Trash2,
  AlertTriangle,
  BookOpen,
  Megaphone,
  Clock,
  Pencil,
  Users
} from 'lucide-react'
import Link from 'next/link'
import { useSelectedStudentStore, useSelectedStudentHydrated } from '@/stores/selectedStudentStore'
import { StudentSelectorModal } from '@/components/ui/student-selector-modal'
import { MOBILE_FEATURES } from '@/config/mobileFeatures'

function MobileProfilePageContent() {
  const router = useRouter()
  const { t } = useTranslation()
  const { toast } = useToast()
  const { language, setLanguage } = useLanguage()
  const { theme, setTheme } = useTheme()
  const { user } = usePersistentMobileAuth()
  const { effectiveUserId, isReady, isLoading: authLoading, academyIds } = useEffectiveUserId()
  const { selectedStudent, availableStudents, setSelectedStudent } = useSelectedStudentStore()
  const studentHydrated = useSelectedStudentHydrated()

  // Use the new profile hook with caching
  const {
    profile,
    preferences,
    loading,
    preferencesLoading,
    refetch: refetchProfile,
    updatePreferences,
    updatePhone
  } = useMobileProfile(user?.userId || null, user?.userName || null, academyIds)

  // Inline phone editor state (contact info card).
  const [editingPhone, setEditingPhone] = useState(false)
  const [phoneDraft, setPhoneDraft] = useState('')
  const [phoneSaving, setPhoneSaving] = useState(false)
  const savePhone = async () => {
    if (phoneSaving) return
    setPhoneSaving(true)
    const ok = await updatePhone(phoneDraft)
    setPhoneSaving(false)
    if (ok) setEditingPhone(false)
    else toast({ title: t('common.error') as string || 'Failed to save', variant: 'destructive' })
  }

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showStudentSelector, setShowStudentSelector] = useState(false)
  // Profile is a shared route — which mode the user came from decides
  // whether study-only sections (nickname) render. Read in an effect
  // (localStorage isn't available during SSR).
  const [inStudyMode, setInStudyMode] = useState(false)
  useEffect(() => { setInStudyMode(readStoredMode() === 'study') }, [])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)
  // Sole-manager case (Phase 3). Mobile audience is mostly students/parents
  // for whom this is always false, but we still wire it for defense — a
  // manager who somehow lands on /mobile/profile shouldn't bypass the
  // academy-cascade confirmation.
  const [deletionEligibility, setDeletionEligibility] = useState<{
    requiresCascadeConfirmation: boolean
    soleManagedAcademies: Array<{
      academyId: string
      academyName: string
      otherMemberCount: number
    }>
  } | null>(null)
  const [confirmCascadeAcademy, setConfirmCascadeAcademy] = useState(false)

  // Handle body scroll prevention when modal is open
  useEffect(() => {
    if (showLogoutConfirm || showDeleteConfirm) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [showLogoutConfirm, showDeleteConfirm])

  // Pull-to-refresh states
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Cache invalidation: clear cache when userId changes (parent switching students)
  useEffect(() => {
    if (typeof window !== 'undefined' && user?.userId) {
      // Clear any stale profile caches
      const keys = Object.keys(sessionStorage)
      keys.forEach(key => {
        if (key.startsWith('mobile-profile-') && !key.includes(user.userId)) {
          sessionStorage.removeItem(key)
          sessionStorage.removeItem(`${key}-timestamp`)
        }
      })
    }
  }, [user?.userId])

  const handleLogout = async () => {
    try {
      await performLogout()
      router.replace('/auth')
    } catch (error) {
      console.error('Logout failed:', error)
      // Last-resort fallback so the user is never trapped on a logout failure.
      try {
        await supabase.auth.signOut()
      } catch {
        // ignore
      }
      router.replace('/auth')
    }
  }

  // Eligibility fetch — same pattern as settings-page. Modals open is the
  // trigger.
  useEffect(() => {
    if (!showDeleteConfirm) {
      setDeletionEligibility(null)
      setConfirmCascadeAcademy(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) return
        const res = await fetch('/api/account/check-deletion-eligibility', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        if (res.ok && data?.canDelete) {
          setDeletionEligibility({
            requiresCascadeConfirmation:
              data.requiresCascadeConfirmation === true,
            soleManagedAcademies: data.soleManagedAcademies ?? [],
          })
        }
      } catch (err) {
        console.warn('[mobile/profile] eligibility check failed:', err)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [showDeleteConfirm])

  // Schedule a 30-day soft-delete via /api/account/delete. Mirrors the
  // dashboard flow in settings-page.tsx — see that file for the full
  // rationale. The previously-used `delete_user_account` RPC has been
  // retired in favour of the server endpoint, which handles the ban + audit
  // log atomically.
  const handleDeleteAccount = async () => {
    const userEmail = (profile?.email || '').toLowerCase()
    if (!deleteConfirmEmail || deleteConfirmEmail.trim().toLowerCase() !== userEmail) {
      toast({
        title: String(t('settings.dataStorage.deleteAccountEmailMismatch')),
        variant: 'destructive',
      })
      return
    }

    setDeletingAccount(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        toast({ title: String(t('common.failedToDeleteAccount')), variant: 'destructive' })
        setDeletingAccount(false)
        return
      }

      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          confirmEmail: deleteConfirmEmail.trim(),
          confirmCascadeAcademy:
            deletionEligibility?.requiresCascadeConfirmation === true &&
            confirmCascadeAcademy,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        console.error('[mobile/profile] account delete failed:', data)
        toast({
          title: String(t('common.failedToDeleteAccount')),
          description: (data as { error?: string })?.error,
          variant: 'destructive',
        })
        setDeletingAccount(false)
        return
      }

      // Clear all client storage so a logged-out shared device doesn't
      // surface stale data from this account.
      if (typeof window !== 'undefined') {
        try { localStorage.clear() } catch {}
        try { sessionStorage.clear() } catch {}
      }

      await supabase.auth.signOut()
      router.push('/account/goodbye')
    } catch (error) {
      console.error('Delete account failed:', error)
      toast({ title: String(t('common.failedToDeleteAccount')), variant: 'destructive' })
      setDeletingAccount(false)
    }
  }

  const handleLanguageChange = async (newLanguage: 'english' | 'korean') => {
    setLanguage(newLanguage)
    await updatePreferences({ language: newLanguage })
  }

  // Pull-to-refresh handlers
  const handleRefresh = async () => {
    setIsRefreshing(true)
    setPullDistance(0)

    try {
      await refetchProfile()
    } catch (error) {
      console.error('Error refreshing data:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

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
      hapticImpact('medium')
      handleRefresh()
    } else {
      setPullDistance(0)
    }
  }

  // Show loading skeleton while auth is loading OR while the persisted
  // selectedStudent is still rehydrating from localStorage. This prevents
  // a "Select a student" flash for parents on hard refresh, since
  // effectiveUserId reads from selectedStudent.
  if (authLoading || loading || !studentHydrated) {
    return (
      <MobilePageErrorBoundary>
        <div className="px-5 lg:px-8 pt-6 pb-14 overflow-y-auto">
          <div className="max-w-3xl lg:max-w-6xl 2xl:max-w-[1600px] mx-auto w-full">
            <div className="mb-6">
              <StudySubPageHeader
                icon={UserIcon}
                eyebrow={String(t('mobile.profile.eyebrow'))}
                title={String(t('mobile.profile.title'))}
              />
            </div>
            <ProfileSkeleton />
          </div>
        </div>
      </MobilePageErrorBoundary>
    )
  }

  // Show message when user is not ready
  if (!isReady) {
    return (
      <MobilePageErrorBoundary>
        <div className="px-5 lg:px-8 pt-6 pb-14 overflow-y-auto">
          <div className="max-w-3xl lg:max-w-6xl 2xl:max-w-[1600px] mx-auto w-full">
            <div className="mb-6">
              <StudySubPageHeader
                icon={UserIcon}
                eyebrow={String(t('mobile.profile.eyebrow'))}
                title={String(t('mobile.profile.title'))}
              />
            </div>
            <Card>
              <EmptyState
                icon={School}
                title={String(!effectiveUserId ? t('mobile.common.selectStudent') : t('mobile.common.noAcademies'))}
                size="sm"
              />
            </Card>
          </div>
        </div>
      </MobilePageErrorBoundary>
    )
  }

  return (
    <>
    <div
      ref={scrollRef}
      className="px-5 lg:px-8 pt-6 pb-14 relative overflow-y-auto"
      style={{ touchAction: MOBILE_FEATURES.ENABLE_PULL_TO_REFRESH && pullDistance > 0 ? 'none' : 'auto' }}
      {...(MOBILE_FEATURES.ENABLE_PULL_TO_REFRESH && {
        onTouchStart: handleTouchStart,
        onTouchMove: handleTouchMove,
        onTouchEnd: handleTouchEnd
      })}
    >
      {/* Pull-to-refresh indicator */}
      {MOBILE_FEATURES.ENABLE_PULL_TO_REFRESH && (pullDistance > 0 || isRefreshing) && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-300 z-10"
          style={{
            height: `${pullDistance}px`,
            opacity: pullDistance > 80 ? 1 : pullDistance / 80
          }}
        >
          <div className="flex items-center gap-2">
            <RefreshCw
              className={`w-5 h-5 text-primary ${isRefreshing ? 'animate-spin' : ''}`}
            />
            <span className="text-sm text-primary font-medium">
              {isRefreshing ? t('common.refreshing') : t('common.pullToRefresh')}
            </span>
          </div>
        </div>
      )}

      <div style={{ transform: MOBILE_FEATURES.ENABLE_PULL_TO_REFRESH ? `translateY(${pullDistance}px)` : 'none' }} className="transition-transform max-w-3xl lg:max-w-6xl 2xl:max-w-[1600px] mx-auto w-full">
      {/* Page header — same typography-led eyebrow + title + subtitle as
          the study sub-pages (stats, preferences, etc.) so the account
          page reads as part of the same app. No back button: it's a
          bottom-nav / sidebar tab, like League and Review. */}
      <div className="mb-6">
        <StudySubPageHeader
          icon={UserIcon}
          eyebrow={String(t('mobile.profile.eyebrow'))}
          title={String(t('mobile.profile.title'))}
        />
      </div>

      {/* Profile Hero — centered avatar + role-based gradient + role pill */}
      {(() => {
        // Role-based avatar gradient: parent=sky, teacher=emerald, student=blue, family=violet
        const roleGradient =
          profile?.role === 'parent' ? 'from-sky-400 to-sky-600' :
          profile?.role === 'teacher' ? 'from-emerald-400 to-emerald-600' :
          profile?.role === 'student' ? 'from-blue-400 to-blue-600' :
          'from-violet-400 to-violet-600'
        const rolePillTone =
          profile?.role === 'parent' ? 'sky' as const :
          profile?.role === 'teacher' ? 'emerald' as const :
          profile?.role === 'student' ? 'blue' as const :
          'violet' as const

        return (
          <Card className="p-6 mb-6">
            <div className="flex flex-col items-center text-center">
              <div className={`w-20 h-20 bg-gradient-to-br ${roleGradient} rounded-full flex items-center justify-center mb-3`}>
                <span className="text-2xl font-semibold text-white">
                  {profile?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                </span>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-0.5">{profile?.name}</h2>
              <p className="text-sm text-gray-500 mb-2.5">{profile?.email || t('mobile.profile.noEmail')}</p>
              {profile?.role && (
                <StatusPill tone={rolePillTone}>
                  {t(`common.roles.${profile.role}`)}
                </StatusPill>
              )}
            </div>
          </Card>
        )
      })()}

      {/* Study nickname — the public leaderboard handle. Students only,
          and only when the profile was reached from Study mode: in the
          Grades/academy context the nickname is meaningless noise. */}
      {profile?.role === 'student' && inStudyMode && <StudyNicknameCard ko={language === 'korean'} />}

      {/* Friend referral — lives here (not on the subscription page) so
          the invite loop reads as an account feature. Study mode only. */}
      {profile?.role === 'student' && inStudyMode && (
        <div className="mb-6">
          <Link
            href="/mobile/study/referral"
            className="flex items-center gap-3 rounded-2xl bg-white ring-1 ring-gray-200/70 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:ring-gray-300 active:scale-[0.99] transition-all"
          >
            <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5" strokeWidth={1.75} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-gray-900 truncate">
                {language === 'korean' ? '친구 초대' : 'Refer a friend'}
              </span>
              <span className="block text-[12px] text-gray-500 truncate">
                {language === 'korean' ? '가입 시 1개 + 프리미엄 시 10개' : '1 credit + 10 on Premium'}
              </span>
            </span>
            <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
          </Link>
        </div>
      )}

      {/* Contact Information panel — the phone row always renders (it's
          editable, so an empty value shows an Add action); other rows
          only when they have data. */}
      {profile && (
        <div className="mb-6">
          <Eyebrow as="h3" className="mb-2 px-1 text-[12px] tracking-[0.10em] text-gray-600">
            {t('mobile.profile.contactInformation')}
          </Eyebrow>
          <Card className="divide-y divide-gray-100 py-0 gap-0 overflow-hidden">
            <div className="p-4">
              {editingPhone ? (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" strokeWidth={1.75} />
                  <input
                    type="tel"
                    autoFocus
                    value={phoneDraft}
                    onChange={(e) => setPhoneDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') void savePhone() }}
                    placeholder="010-1234-5678"
                    className="flex-1 min-w-0 h-9 px-3 rounded-lg ring-1 ring-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <button
                    type="button"
                    onClick={() => setEditingPhone(false)}
                    disabled={phoneSaving}
                    className="flex-shrink-0 h-9 px-3 rounded-lg text-[12.5px] font-medium text-gray-600 hover:bg-gray-100 transition"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={() => void savePhone()}
                    disabled={phoneSaving}
                    className="flex-shrink-0 h-9 px-3.5 rounded-lg bg-primary text-white text-[12.5px] font-semibold disabled:opacity-60 active:scale-[0.97] transition"
                  >
                    {phoneSaving ? '…' : t('common.save')}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-gray-500" strokeWidth={1.75} />
                    <span className="text-sm text-gray-700">{t('mobile.profile.phone')}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setPhoneDraft(profile.phone ?? ''); setEditingPhone(true) }}
                    className="flex items-center gap-1.5 ml-3 min-w-0 group"
                  >
                    {profile.phone ? (
                      <span className="text-sm font-medium text-gray-900 truncate">{profile.phone}</span>
                    ) : (
                      <span className="text-sm font-medium text-primary">{t('common.add')}</span>
                    )}
                    <Pencil className="w-3.5 h-3.5 text-gray-400 group-hover:text-primary flex-shrink-0 transition-colors" strokeWidth={1.75} />
                  </button>
                </div>
              )}
            </div>
            {(profile?.academy_names?.length || profile?.academy_name) && (() => {
              // Multi-academy display: stack academies vertically when there are 2+,
              // since the right-aligned single-line layout would truncate them.
              const academies = profile.academy_names ?? (profile.academy_name ? [profile.academy_name] : [])
              const isMulti = academies.length > 1
              return isMulti ? (
                <div className="p-4 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 flex-shrink-0 pt-0.5">
                    <BookOpen className="w-4 h-4 text-gray-500" strokeWidth={1.75} />
                    <span className="text-sm text-gray-700">{t('mobile.profile.academy')}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1 min-w-0">
                    {academies.map((name, i) => (
                      <span key={i} className="text-sm font-medium text-gray-900 truncate max-w-full">
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-4 h-4 text-gray-500" strokeWidth={1.75} />
                    <span className="text-sm text-gray-700">{t('mobile.profile.academy')}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900 truncate ml-3">{academies[0]}</span>
                </div>
              )
            })()}
            {profile?.student_school && (
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <School className="w-4 h-4 text-gray-500" strokeWidth={1.75} />
                  <span className="text-sm text-gray-700">{t('mobile.profile.school')}</span>
                </div>
                <span className="text-sm font-medium text-gray-900 truncate ml-3">{profile.student_school}</span>
              </div>
            )}
            {profile?.student_grade && (
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <GraduationCap className="w-4 h-4 text-gray-500" strokeWidth={1.75} />
                  <span className="text-sm text-gray-700">{t('mobile.profile.grade')}</span>
                </div>
                <span className="text-sm font-medium text-gray-900 truncate ml-3">{profile.student_grade}</span>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Active student (parents only) — academy-picker-style row */}
      {profile?.role === 'parent' && (
        <div className="mb-6">
          <Eyebrow as="h3" className="mb-2 px-1 text-[12px] tracking-[0.10em] text-gray-600">
            {t('mobile.profile.activeStudent')}
          </Eyebrow>
          <Card className="p-0 overflow-hidden">
            <button
              onClick={() => setShowStudentSelector(true)}
              className="w-full px-5 py-6 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <UserCheck className="w-4 h-4 text-emerald-600" strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <Eyebrow className="mb-0.5">
                    {t('mobile.profile.selectedStudent')}
                  </Eyebrow>
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {selectedStudent?.name || t('mobile.profile.noStudentSelected')}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" strokeWidth={2} />
              </div>
            </button>
          </Card>
        </div>
      )}

      {/* General Settings — divide-y panel */}
      <div className="mb-6">
        <Eyebrow as="h3" className="mb-2 px-1 text-[12px] tracking-[0.10em] text-gray-600">
          {t('mobile.profile.generalSettings')}
        </Eyebrow>
        <Card className="divide-y divide-gray-100 py-0 gap-0 overflow-hidden">
          {/* Language picker — uses Select but visually matches the row pattern */}
          <Select value={language} onValueChange={(value) => handleLanguageChange(value as 'english' | 'korean')}>
            <SelectTrigger className="w-full h-auto p-4 border-0 shadow-none bg-transparent rounded-none hover:bg-gray-50 transition-colors [&>svg]:hidden">
              <div className="flex items-center gap-3 w-full">
                <div className="w-9 h-9 rounded-xl bg-sky-500/10 flex items-center justify-center flex-shrink-0">
                  <Globe className="w-4 h-4 text-sky-600" strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <span className="text-sm font-medium text-gray-900">{t('mobile.profile.language')}</span>
                </div>
                <span className="text-sm text-gray-500 mr-1">
                  <SelectValue />
                </span>
                <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" strokeWidth={2} />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="english">🇺🇸 English</SelectItem>
              <SelectItem value="korean">🇰🇷 한국어</SelectItem>
            </SelectContent>
          </Select>

          {/* Appearance — light / dark / system. Applies instantly via the
              .dark class, caches in the global store for pre-paint, and
              persists to the account so it survives relaunch + syncs across
              devices. */}
          <Select value={theme} onValueChange={(value) => {
            hapticTap()
            const next = value as 'light' | 'dark' | 'system'
            setTheme(next)
            if (user?.userId) void saveThemeToAccount(user.userId, next)
          }}>
            <SelectTrigger className="w-full h-auto p-4 border-0 shadow-none bg-transparent rounded-none hover:bg-gray-50 transition-colors [&>svg]:hidden">
              <div className="flex items-center gap-3 w-full">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                  <Moon className="w-4 h-4 text-indigo-600" strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <span className="text-sm font-medium text-gray-900">
                    {language === 'korean' ? '화면 테마' : 'Appearance'}
                  </span>
                </div>
                <span className="text-sm text-gray-500 mr-1">
                  <SelectValue />
                </span>
                <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" strokeWidth={2} />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">{language === 'korean' ? '라이트' : 'Light'}</SelectItem>
              <SelectItem value="dark">{language === 'korean' ? '다크' : 'Dark'}</SelectItem>
              <SelectItem value="system">{language === 'korean' ? '시스템 설정' : 'System'}</SelectItem>
            </SelectContent>
          </Select>
        </Card>
      </div>

      {/* Notification Settings — Push toggle + Email sub-toggles in one panel */}
      <div className="mb-6">
        <Eyebrow as="h3" className="mb-2 px-1 text-[12px] tracking-[0.10em] text-gray-600">
          {t('mobile.profile.notificationSettings')}
        </Eyebrow>

        {/* Push Notifications — primary toggle row */}
        <Card className="p-4 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <Bell className="w-4 h-4 text-amber-600" strokeWidth={1.75} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{t('mobile.profile.pushNotifications')}</p>
              <p className="text-xs text-gray-500">{t('mobile.profile.pushNotificationsDesc')}</p>
            </div>
            <button
              onClick={() => {
                hapticTap()
                updatePreferences({ push_notifications: !preferences.push_notifications })
              }}
              disabled={preferencesLoading}
              role="switch"
              aria-checked={preferences.push_notifications}
              aria-label={String(t('mobile.profile.pushNotifications'))}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 ${
                preferences.push_notifications ? 'bg-primary' : 'bg-gray-200'
              } ${preferencesLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.15)] transition duration-200 ease-in-out mt-0.5 ${
                  preferences.push_notifications ? 'translate-x-[22px]' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </Card>

        {/* Email Notifications — header + divide-y sub-toggles using
            switches. Academy members only: every email category here
            (assignments, grades, announcements, reminders) is an
            academy event, so study-only accounts just see noise. */}
        {academyIds.length > 0 && (
        <Card className="overflow-hidden py-0 gap-0">
          <div className="p-4 flex items-center gap-3 border-b border-gray-100">
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
              <Mail className="w-4 h-4 text-violet-600" strokeWidth={1.75} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{t('mobile.profile.emailNotifications')}</p>
              <p className="text-xs text-gray-500">{t('mobile.profile.emailNotificationsDesc')}</p>
            </div>
          </div>

          {/* Email sub-toggles — divide-y rows */}
          <div className="divide-y divide-gray-100">
            {([
              { key: 'assignments',   label: 'mobile.profile.assignmentNotifications',  icon: BookOpen },
              { key: 'grades',        label: 'mobile.profile.gradeNotifications',        icon: GraduationCap },
              { key: 'announcements', label: 'mobile.profile.announcementNotifications', icon: Megaphone },
              { key: 'reminders',     label: 'mobile.profile.reminderNotifications',     icon: Clock }
            ] as const).map(({ key, label, icon: Icon }) => {
              const checked = preferences.email_notifications[key as keyof typeof preferences.email_notifications]
              return (
                <div key={key} className="px-4 py-3 flex items-center gap-3">
                  <Icon className="w-4 h-4 text-gray-500 flex-shrink-0" strokeWidth={1.75} />
                  <span className="flex-1 text-sm text-gray-700 truncate">{t(label)}</span>
                  <button
                    onClick={() => {
                      hapticTap()
                      updatePreferences({
                        email_notifications: {
                          ...preferences.email_notifications,
                          [key]: !checked
                        }
                      })
                    }}
                    disabled={preferencesLoading}
                    role="switch"
                    aria-checked={checked}
                    aria-label={String(t(label))}
                    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 ${
                      checked ? 'bg-primary' : 'bg-gray-200'
                    } ${preferencesLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.15)] transition duration-200 ease-in-out mt-0.5 ${
                        checked ? 'translate-x-[18px]' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              )
            })}
          </div>
        </Card>
        )}
      </div>

      {/* Account actions — Logout + Delete in a single panel */}
      <div className="mb-6">
        <Eyebrow as="h3" className="mb-2 px-1 text-[12px] tracking-[0.10em] text-gray-600">
          {t('mobile.profile.account')}
        </Eyebrow>
        <Card className="divide-y divide-gray-100 py-0 gap-0 overflow-hidden">
          {/* Logout */}
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-gray-500/10 flex items-center justify-center flex-shrink-0">
              <LogOut className="w-4 h-4 text-gray-600" strokeWidth={1.75} />
            </div>
            <span className="flex-1 text-sm font-medium text-gray-900">{t('mobile.profile.logout')}</span>
            <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" strokeWidth={2} />
          </button>

          {/* Delete Account — destructive */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full p-4 flex items-center gap-3 hover:bg-rose-50/50 transition-colors text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center flex-shrink-0">
              <Trash2 className="w-4 h-4 text-rose-600" strokeWidth={1.75} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-rose-700">{t('mobile.profile.deleteAccount')}</p>
              <p className="text-xs text-rose-500/80 mt-0.5">{t('mobile.profile.deleteAccountWarning')}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-rose-300 flex-shrink-0" strokeWidth={2} />
          </button>
        </Card>
      </div>

      </div>
    </div>

    {/* Logout Confirmation Modal */}
    {showLogoutConfirm && (
      <ModalPortal>
        <div
          className="fixed inset-0 backdrop-blur-sm bg-black/40 z-[9998]"
          onClick={() => setShowLogoutConfirm(false)}
        />
        <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
          <Card className="w-full max-w-sm p-6">
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <LogOut className="w-5 h-5 text-gray-700" strokeWidth={1.75} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{t('mobile.profile.logout')}</h3>
              <p className="text-sm text-gray-500">{t('mobile.profile.confirmLogout')}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowLogoutConfirm(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white"
                onClick={handleLogout}
              >
                {t('mobile.profile.logout')}
              </Button>
            </div>
          </Card>
        </div>
      </ModalPortal>
    )}

    {/* Delete Account Confirmation Modal */}
    {showDeleteConfirm && (
      <ModalPortal>
        <div
          className="fixed inset-0 backdrop-blur-sm bg-black/40 z-[9998]"
          onClick={() => {
            if (!deletingAccount) {
              setShowDeleteConfirm(false)
              setDeleteConfirmEmail('')
            }
          }}
        />
        <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
          <Card className="w-full max-w-sm p-6">
            <div className="flex flex-col items-center text-center mb-4">
              <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mb-3">
                <AlertTriangle className="w-5 h-5 text-rose-600" strokeWidth={1.75} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {t('mobile.profile.deleteAccount')}
              </h3>
              <p className="text-sm text-gray-500">
                {t('mobile.profile.deleteAccountConfirm')}
              </p>
            </div>
            <div className="mb-3 bg-rose-50 ring-1 ring-rose-100 rounded-xl p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-rose-700 mb-1.5">
                {t('mobile.profile.deleteAccountConsequences')}
              </p>
              <ul className="text-sm text-rose-700/90 space-y-1 list-disc list-inside">
                <li>{t('mobile.profile.deleteData1')}</li>
                <li>{t('mobile.profile.deleteData2')}</li>
                <li>{t('mobile.profile.deleteData3')}</li>
              </ul>
            </div>
            {/* 30-day grace period notice */}
            <div className="mb-3 bg-amber-50 ring-1 ring-amber-200 rounded-xl p-3">
              <p className="text-xs text-amber-800">
                {String(t('settings.dataStorage.deleteAccountGracePeriod'))}
              </p>
            </div>
            {/* Sole-manager academy cascade warning + toggle */}
            {deletionEligibility?.requiresCascadeConfirmation && (
              <div className="mb-4 bg-rose-100 ring-2 ring-rose-300 rounded-xl p-3 space-y-2">
                <p className="text-sm font-semibold text-rose-900">
                  {String(t('settings.dataStorage.deleteAccountSoleManagerTitle'))}
                </p>
                <p className="text-xs text-rose-800">
                  {String(t('settings.dataStorage.deleteAccountSoleManagerDescription'))}
                </p>
                <ul className="text-xs text-rose-700 space-y-1 list-disc list-inside">
                  {deletionEligibility.soleManagedAcademies.map((a) => (
                    <li key={a.academyId}>
                      <strong>{a.academyName}</strong>
                      {a.otherMemberCount > 0 && (
                        <>
                          {' '}
                          —{' '}
                          {String(
                            t('settings.dataStorage.deleteAccountSoleManagerMemberCount', {
                              count: a.otherMemberCount,
                            })
                          )}
                        </>
                      )}
                    </li>
                  ))}
                </ul>
                <label className="flex items-start gap-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmCascadeAcademy}
                    onChange={(e) => setConfirmCascadeAcademy(e.target.checked)}
                    disabled={deletingAccount}
                    className="mt-0.5 w-4 h-4 text-rose-600 border-rose-400 rounded focus:ring-rose-500"
                  />
                  <span className="text-xs text-rose-900 font-medium">
                    {String(t('settings.dataStorage.deleteAccountSoleManagerConfirmToggle'))}
                  </span>
                </label>
              </div>
            )}
            {/* Email confirmation gate */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                {String(t('settings.dataStorage.deleteAccountTypeEmail', {
                  email: profile?.email || '',
                }))}
              </label>
              <input
                type="email"
                value={deleteConfirmEmail}
                onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                disabled={deletingAccount}
                placeholder={profile?.email || ''}
                autoComplete="off"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent disabled:bg-gray-100"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeleteConfirmEmail('')
                }}
                disabled={deletingAccount}
              >
                {t('common.cancel')}
              </Button>
              <Button
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white"
                onClick={handleDeleteAccount}
                disabled={
                  deletingAccount ||
                  !deleteConfirmEmail ||
                  deleteConfirmEmail.trim().toLowerCase() !== (profile?.email || '').toLowerCase() ||
                  (deletionEligibility?.requiresCascadeConfirmation === true && !confirmCascadeAcademy)
                }
              >
                <Trash2 className="w-4 h-4 mr-2" strokeWidth={1.75} />
                {deletingAccount
                  ? String(t('settings.dataStorage.deletingAccount'))
                  : t('mobile.profile.confirmDelete')}
              </Button>
            </div>
          </Card>
        </div>
      </ModalPortal>
    )}

    {/* Student Selector Modal */}
    {showStudentSelector && (
      <StudentSelectorModal
        isOpen={showStudentSelector}
        onClose={() => setShowStudentSelector(false)}
        students={availableStudents}
        onSelectStudent={(student) => {
          setSelectedStudent(student)
          setShowStudentSelector(false)
        }}
      />
    )}
  </>
  )
}

export default function MobileProfilePage() {
  return (
    <MobilePageErrorBoundary>
      <MobileProfilePageContent />
    </MobilePageErrorBoundary>
  )
}