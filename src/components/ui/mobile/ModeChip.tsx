"use client"

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { BookOpen, GraduationCap, ChevronDown } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { ModeSwitcherSheet } from '@/components/ui/mobile/ModeSwitcherSheet'
import { resolveMode, storeMode, modeForPath } from '@/lib/study/currentMode'

/**
 * Mode chip in the mobile header — shows the *current* mode (Grades
 * or Study) by name with a chevron, and opens ModeSwitcherSheet on
 * tap. Replaces HubModeToggle (which described the action, not the
 * state) so the user always knows where they are.
 *
 * Same visibility rules as the old toggle: hidden on the hub page
 * (where they're already choosing) and for non-students.
 */
export function ModeChip() {
  const pathname = usePathname() ?? ''
  const { t } = useTranslation()
  const { user } = usePersistentMobileAuth()
  const [open, setOpen] = useState(false)

  // Mode-aware: pathname wins when it's an explicit study/* or
  // grades-only route. Shared routes (profile, messages) keep
  // whatever was last selected so the chip doesn't auto-flip.
  const [currentMode, setCurrentMode] = useState<'grades' | 'study'>('grades')
  useEffect(() => {
    const explicit = modeForPath(pathname)
    if (explicit) storeMode(explicit)
    setCurrentMode(resolveMode(pathname))
  }, [pathname])

  if (pathname === '/mobile/start') return null
  if (user?.role !== 'student') return null
  // Study-only students (no academy) have exactly one mode — a
  // switcher chip with nothing to switch to is noise.
  if ((user?.academyIds?.length ?? 0) === 0) return null

  const inStudy = currentMode === 'study'
  const Icon = inStudy ? BookOpen : GraduationCap
  const label = inStudy ? t('mobile.mode.studyLabel') : t('mobile.mode.gradesLabel')

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={String(t('mobile.mode.sheetTitle'))}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/15 active:bg-primary/20 transition-colors"
      >
        <Icon className="w-3.5 h-3.5" strokeWidth={2} />
        <span>{label}</span>
        <ChevronDown className="w-3 h-3 opacity-70" strokeWidth={2.25} />
      </button>
      <ModeSwitcherSheet open={open} currentMode={currentMode} onClose={() => setOpen(false)} />
    </>
  )
}
