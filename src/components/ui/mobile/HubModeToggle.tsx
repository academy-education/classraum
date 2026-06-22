"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, GraduationCap } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'

/**
 * Persistent mode toggle that lives in the mobile header.
 *
 * One-tap flip between the two modes the hub offers:
 *  - Grades (existing /mobile dashboard, schedule, invoices, etc.)
 *  - Study  (the new AI learning surface at /mobile/study)
 *
 * Hidden on the hub itself (/mobile/start — they're already choosing)
 * and for non-students (parents only see Grades-side content).
 *
 * The toggle is a pill in the same chrome row as the messages/bell
 * buttons. Compact on purpose — it's a navigation accelerator, not
 * a primary CTA.
 */
export function HubModeToggle() {
  const pathname = usePathname() ?? ''
  const { t } = useTranslation()
  const { user } = usePersistentMobileAuth()

  // Skip the toggle on the hub page (user just picked there) and for
  // parents (Study is student-only).
  if (pathname === '/mobile/start') return null
  if (user?.role !== 'student') return null

  const inStudy = pathname.startsWith('/mobile/study')

  // Toggle text says where you're going, not where you are — matches
  // the "Switch to X" pattern users expect from mode pills.
  const target = inStudy ? '/mobile' : '/mobile/study'
  const Icon = inStudy ? GraduationCap : BookOpen
  const label = inStudy ? t('mobile.hub.switchToGrades') : t('mobile.hub.switchToStudy')

  return (
    <Link
      href={target}
      className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/15 active:bg-primary/20 transition-colors"
    >
      <Icon className="w-3.5 h-3.5" strokeWidth={2} />
      {label}
    </Link>
  )
}
