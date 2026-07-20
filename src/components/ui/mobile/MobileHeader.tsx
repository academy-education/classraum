"use client"

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Bell, User, MessageSquare, ChevronDown, Coins } from '@/app/mobile/study/_shared/icons'
import { supabase } from '@/lib/supabase'
import { authHeaders } from '@/lib/auth-headers'
import Link from 'next/link'
import Image from 'next/image'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { useSelectedStudentStore } from '@/stores/selectedStudentStore'
import { useTranslation } from '@/hooks/useTranslation'
import { StudentSelectorModal } from '@/components/ui/student-selector-modal'
import { ModeChip } from '@/components/ui/mobile/ModeChip'

export function MobileHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const isStudy = pathname?.startsWith('/mobile/study') ?? false
  // Test-generation credit balance — surfaced on study routes so the
  // cost of AI mock-test generation is visible before it's spent.
  // Practice / lesson / flashcards / chat are all free (no credit), so
  // this only moves when the student generates a non-SAT mock test.
  const [credits, setCredits] = useState<number | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const { user } = usePersistentMobileAuth()
  const { selectedStudent, availableStudents, setSelectedStudent } = useSelectedStudentStore()
  const { t, language } = useTranslation()
  const [showStudentSelector, setShowStudentSelector] = useState(false)
  const hasMultipleChildren = availableStudents.length > 1
  const lastFetchTimeRef = useRef<number>(0)
  const lastMessagesFetchTimeRef = useRef<number>(0)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const messagesDebounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Debounced fetch function to prevent excessive API calls
  const debouncedFetch = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    debounceTimeoutRef.current = setTimeout(() => {
      fetchUnreadNotifications()
    }, 500) // 500ms debounce
  }, [])

  // Debounced fetch for messages
  const debouncedMessagesFetch = useCallback(() => {
    if (messagesDebounceTimeoutRef.current) {
      clearTimeout(messagesDebounceTimeoutRef.current)
    }
    messagesDebounceTimeoutRef.current = setTimeout(() => {
      fetchUnreadMessages()
    }, 500)
  }, [])

  // Fetch the study credit balance on study routes (re-runs on
  // navigation so it reflects a spend after generating a test).
  useEffect(() => {
    if (!isStudy) return
    let cancelled = false
    void (async () => {
      try {
        const headers = await authHeaders()
        const res = await fetch('/api/study/subscription', { headers })
        if (!res.ok) return
        const json = await res.json()
        if (!cancelled) setCredits(typeof json?.credits?.total === 'number' ? json.credits.total : null)
      } catch { /* silent — chip just self-hides */ }
    })()
    return () => { cancelled = true }
  }, [isStudy, pathname])

  useEffect(() => {
    fetchUnreadNotifications()
    fetchUnreadMessages()

    // Listen for notification read events
    const handleNotificationRead = () => {
      debouncedFetch()
    }

    // Listen for message read events
    const handleMessageRead = () => {
      debouncedMessagesFetch()
    }

    // Listen for page visibility changes (when user returns to app)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Only fetch if it's been more than 30 seconds since last fetch
        const now = Date.now()
        if (now - lastFetchTimeRef.current > 30000) {
          debouncedFetch()
        }
        if (now - lastMessagesFetchTimeRef.current > 30000) {
          debouncedMessagesFetch()
        }
      }
    }

    window.addEventListener('notificationRead', handleNotificationRead)
    window.addEventListener('messageRead', handleMessageRead)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Real-time subscription for new messages
    const channel = supabase
      .channel('mobile_header_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_messages'
        },
        () => {
          debouncedMessagesFetch()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_messages'
        },
        () => {
          debouncedMessagesFetch()
        }
      )
      .subscribe()

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
      if (messagesDebounceTimeoutRef.current) {
        clearTimeout(messagesDebounceTimeoutRef.current)
      }
      window.removeEventListener('notificationRead', handleNotificationRead)
      window.removeEventListener('messageRead', handleMessageRead)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchUnreadNotifications = async () => {
    // Prevent concurrent fetches
    if (isLoading) return

    try {
      setIsLoading(true)
      lastFetchTimeRef.current = Date.now()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return
      }

      // Fetch unread notifications count (only recent ones, matching notifications page)
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

      if (error) {
        console.error('MobileHeader: Error fetching notification count:', error)
        return
      }
      setUnreadCount(count || 0)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchUnreadMessages = async () => {
    try {
      lastMessagesFetchTimeRef.current = Date.now()

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setUnreadMessagesCount(0)
        return
      }

      // Skip cache to ensure fresh data
      const response = await fetch('/api/messages/unread', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        console.warn('[MobileHeader] Failed to fetch unread message count:', response.status)
        setUnreadMessagesCount(0)
        return
      }

      const data = await response.json()
      const count = data.unreadCount || 0
      setUnreadMessagesCount(count)
    } catch (error) {
      console.warn('[MobileHeader] Unread message count fetch failed:', error)
      setUnreadMessagesCount(0)
    }
  }

  const handleNotificationClick = () => {
    router.push('/mobile/notifications')
  }

  const handleMessagesClick = () => {
    router.push('/mobile/messages')
  }

  return (
    <header
      className="flex-shrink-0 bg-white shadow-[0_1px_0_rgba(0,0,0,0.04)] z-50"
      style={{ touchAction: 'none' }}
    >
      {/* Compact chrome: 32px logo + 8px padding ≈ 48px tall. The old
          40px logo + 14px padding stacked ~68px on top of the native
          safe-area inset and ate a big slice of the phone screen. */}
      <div className="px-4 py-2">
        <div className="flex items-center justify-between">
          {/* Logo — hidden at lg, where the desktop sidebar owns the
              brand mark. The empty flex slot keeps the utility actions
              pinned right so the header reads as a top strip. */}
          <div className="flex items-center lg:hidden">
            <Image
              src="/logo2-test.png"
              alt="Classraum"
              width={150}
              height={40}
              className="h-8 w-auto"
              priority
            />
          </div>

          {/* ml-auto pins the utility actions right even when the logo
              is display:none at lg — otherwise justify-between with a
              single visible child collapses them to the left edge. */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Mode chip — displays the current top-level mode (Grades
                or Study) with chevron. Tap opens ModeSwitcherSheet for
                the swap. Self-hides on the hub and for parents. */}
            <ModeChip />

            {/* Study test-generation credits. Tapping opens the plan /
                credit store. Only rendered on study routes and once the
                balance has loaded. */}
            {isStudy && credits !== null && (
              <Link
                href="/mobile/study/subscription"
                aria-label={language === 'korean' ? '크레딧' : 'Credits'}
                title={language === 'korean' ? '모의고사 생성 크레딧' : 'Mock-test credits'}
                className="inline-flex items-center gap-1.5 h-9 pl-2 pr-2 rounded-full bg-primary/10 hover:bg-primary/15 active:bg-primary/20 transition-colors focus:outline-none"
              >
                {/* Coin + count + "+" — the plus sits AFTER the number so
                    the chip reads "5 credits, tap to add more" (the chip
                    links to the credit store). */}
                <Coins className="w-4 h-4 text-primary" weight="fill" />
                <span className="text-[13px] font-bold text-primary tabular-nums leading-none">{credits}</span>
                {/* Outlined + — reads as a "buy more" affordance rather
                    than part of the count. -ml keeps it hugging the number. */}
                <span aria-hidden className="-ml-0.5 w-[17px] h-[17px] rounded-full ring-1 ring-primary/50 bg-white/70 flex items-center justify-center text-[12px] font-bold text-primary leading-none">
                  +
                </span>
              </Link>
            )}

            {/* Messages Button — pill chrome with soft-rose unread badge.
                Messaging is academy-scoped (teacher/manager chat), so it
                only shows in Grades mode: study surfaces hide it even for
                students who do have an academy. */}
            {!isStudy && (user?.academyIds?.length ?? 0) > 0 && (
            <button
              onClick={handleMessagesClick}
              className="relative w-9 h-9 rounded-full bg-gray-50 hover:bg-gray-100 active:bg-gray-200 flex items-center justify-center transition-colors focus:outline-none"
              aria-label={String(t("common.messages"))}
            >
              {/* Same weight override as the bell — the two sit side by
                  side, so they must match. */}
              <MessageSquare className="w-5 h-5 text-gray-700" weight="regular" />
              {unreadMessagesCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                  {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                </span>
              )}
            </button>
            )}

            {/* Notification Button */}
            <button
              onClick={handleNotificationClick}
              className="relative w-9 h-9 rounded-full bg-gray-50 hover:bg-gray-100 active:bg-gray-200 flex items-center justify-center transition-colors focus:outline-none"
              aria-label={String(t("common.notifications"))}
            >
              {/* weight overrides the icon system's pinned "bold" — at
                  header size the bold bell reads too heavy. */}
              <Bell className="w-5 h-5 text-gray-700" weight="regular" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Selected Student Indicator (parents only) — soft primary chip.
          When the parent has 2+ children, the chip becomes a button that
          opens the same selector modal the profile page uses. With one
          child it stays informational. ChevronDown signals it's tappable. */}
      {user?.role === 'parent' && selectedStudent && (
        <div className="px-4 pb-3">
          {hasMultipleChildren ? (
            <button
              type="button"
              onClick={() => setShowStudentSelector(true)}
              aria-label={String(t('mobile.header.switchChild'))}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-primary/5 rounded-xl ring-1 ring-primary/15 hover:bg-primary/10 active:bg-primary/15 transition-colors text-left"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                  <User className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-primary/70">{t('mobile.header.viewingAsParent')}</div>
                  <div className="text-sm font-medium text-gray-900 truncate">{selectedStudent.name}</div>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-primary/60 flex-shrink-0" strokeWidth={2} />
            </button>
          ) : (
            <div className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-primary/5 rounded-xl ring-1 ring-primary/15">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                  <User className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-primary/70">{t('mobile.header.viewingAsParent')}</div>
                  <div className="text-sm font-medium text-gray-900 truncate">{selectedStudent.name}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Student selector — same modal the profile page uses, opened by
          the chip-as-button above. */}
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
    </header>
  )
}