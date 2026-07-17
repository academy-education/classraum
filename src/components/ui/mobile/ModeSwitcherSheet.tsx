"use client"

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { GraduationCap, BookOpen, Check, X } from '@/app/mobile/study/_shared/icons'
import { useTranslation } from '@/hooks/useTranslation'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { storeMode } from '@/lib/study/currentMode'
import { useSheetDrag } from '@/app/mobile/study/_shared/useSheetDrag'
import { hapticImpact } from '@/lib/nativeHaptics'

type ModeKey = 'grades' | 'study'

interface ModeSwitcherSheetProps {
  open: boolean
  currentMode: ModeKey
  onClose: () => void
}

const MODE_META: Record<ModeKey, {
  icon: typeof GraduationCap
  gradient: string
  titleKey: string
}> = {
  grades: {
    icon: GraduationCap,
    gradient: 'from-sky-400 via-blue-500 to-blue-700',
    titleKey: 'mobile.mode.gradesLabel',
  },
  study: {
    icon: BookOpen,
    gradient: 'from-violet-500 via-purple-600 to-indigo-700',
    titleKey: 'mobile.mode.studyLabel',
  },
}

/**
 * Bottom sheet that lets the student switch between the two top-level
 * mobile modes: Grades (/mobile) and Study (/mobile/study).
 *
 * The switch itself is dressed as a native mode transition rather than
 * a bare route swap: picking a different mode fires a haptic and sweeps
 * a full-screen, mode-colored overlay (icon + name) over the app while
 * the destination loads underneath; the overlay fades out once the new
 * route has painted. Both destinations are prefetched when the sheet
 * opens so the swap under the overlay is near-instant. This component
 * lives in MobileHeader (persists across /mobile routes), which is what
 * lets the overlay survive the navigation.
 */
export function ModeSwitcherSheet({ open, currentMode, onClose }: ModeSwitcherSheetProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { t } = useTranslation()
  const { user } = usePersistentMobileAuth()
  const { handleProps, sheetStyle } = useSheetDrag(onClose)
  // Study-only students (no academy membership) have no Grades data —
  // offering the option would land them on an empty dashboard.
  const hasAcademy = (user?.academyIds?.length ?? 0) > 0

  // Mode-switch transition overlay. `switching` holds the target mode
  // while the overlay is up; `leaving` drives its fade-out.
  const [switching, setSwitching] = useState<ModeKey | null>(null)
  const [leaving, setLeaving] = useState(false)

  // Lock body scroll while open — same pattern as CommentBottomSheet.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  // Prefetch both destinations the moment the sheet opens, so the
  // route swap under the transition overlay is near-instant.
  useEffect(() => {
    if (!open) return
    router.prefetch('/mobile')
    router.prefetch('/mobile/study')
  }, [open, router])

  // Dismiss the overlay once navigation lands on the target mode:
  // hold briefly so the destination paints beneath, then fade out.
  useEffect(() => {
    if (!switching) return
    const arrived = switching === 'study'
      ? (pathname?.startsWith('/mobile/study') ?? false)
      : pathname === '/mobile'
    if (!arrived) return
    const hold = setTimeout(() => setLeaving(true), 250)
    const done = setTimeout(() => { setSwitching(null); setLeaving(false) }, 600)
    return () => { clearTimeout(hold); clearTimeout(done) }
  }, [switching, pathname])

  // Safety net: never trap the user under the overlay if navigation
  // stalls (offline, error boundary, etc.).
  useEffect(() => {
    if (!switching) return
    const bail = setTimeout(() => { setSwitching(null); setLeaving(false) }, 4000)
    return () => clearTimeout(bail)
  }, [switching])

  const handlePick = (mode: ModeKey) => {
    onClose()
    // Persist immediately so the destination page renders the right
    // chip + nav even before pathname tells us (shared-route routing).
    storeMode(mode)
    if (mode === currentMode) return
    hapticImpact('medium')
    setSwitching(mode)
    router.push(mode === 'grades' ? '/mobile' : '/mobile/study')
  }

  const options: Array<{ key: ModeKey; icon: typeof GraduationCap; iconBg: string; titleKey: string; blurbKey: string }> = [
    ...(hasAcademy ? [{
      key: 'grades' as const,
      icon: GraduationCap,
      iconBg: 'bg-gradient-to-br from-sky-400 to-blue-600',
      titleKey: 'mobile.mode.gradesLabel',
      blurbKey: 'mobile.mode.gradesBlurb',
    }] : []),
    {
      key: 'study',
      icon: BookOpen,
      iconBg: 'bg-gradient-to-br from-violet-400 to-purple-600',
      titleKey: 'mobile.mode.studyLabel',
      blurbKey: 'mobile.mode.studyBlurb',
    },
  ]

  const SwitchIcon = switching ? MODE_META[switching].icon : null

  return (
    <>
      {/* Mode-switch transition — full-screen, mode-colored sweep that
          covers the route swap. Rendered independently of `open` so it
          outlives the sheet closing. */}
      {switching && SwitchIcon && (
        <div
          aria-hidden
          className={`fixed inset-0 z-[130] flex flex-col items-center justify-center gap-4 bg-gradient-to-br ${MODE_META[switching].gradient} transition-opacity duration-300 ${leaving ? 'opacity-0' : 'opacity-100'} animate-in fade-in duration-200`}
        >
          <div className="w-16 h-16 rounded-3xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] animate-in zoom-in-75 fade-in duration-300">
            <SwitchIcon className="w-8 h-8 text-white" />
          </div>
          <div className="text-white text-[15px] font-semibold tracking-tight animate-in fade-in slide-in-from-bottom-2 duration-300">
            {t(MODE_META[switching].titleKey)}
          </div>
        </div>
      )}

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 backdrop-blur-sm bg-black/40 z-[120] animate-in fade-in duration-200"
            onClick={onClose}
            aria-hidden
          />
          {/* Sheet */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label={String(t('mobile.mode.sheetTitle'))}
            className="fixed inset-x-0 bottom-0 z-[121] bg-white rounded-t-2xl shadow-[0_-8px_24px_-8px_rgba(0,0,0,0.20)] animate-in slide-in-from-bottom duration-250"
            // Push content above the 72px bottom nav so the second mode
            // card isn't clipped on routes where the nav is visible.
            style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom))', ...sheetStyle }}
          >
            {/* Grab handle — drag zone for swipe-down-to-dismiss. */}
            <div {...handleProps} className="pt-2 pb-1 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none">
              <span aria-hidden className="w-9 h-1 rounded-full bg-gray-300" />
            </div>

            <div className="px-5 pt-2 pb-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[15px] font-semibold text-gray-900">
                  {t('mobile.mode.sheetTitle')}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={String(t('common.close'))}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-full text-gray-500 hover:bg-gray-100 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                {options.map(opt => {
                  const Icon = opt.icon
                  const active = opt.key === currentMode
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => handlePick(opt.key)}
                      className={`group w-full flex items-center gap-3 rounded-2xl p-3.5 ring-1 transition text-left active:scale-[0.98] ${
                        active
                          ? 'bg-primary/5 ring-primary/30'
                          : 'bg-white ring-gray-200/70 hover:bg-gray-50'
                      }`}
                    >
                      <div className={`flex-shrink-0 w-11 h-11 rounded-2xl ${opt.iconBg} text-white flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_4px_8px_rgba(0,0,0,0.10)]`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[14px] font-semibold text-gray-900">{t(opt.titleKey)}</div>
                        <div className="text-[12px] text-gray-600 mt-0.5 leading-relaxed">{t(opt.blurbKey)}</div>
                      </div>
                      {active && (
                        <span className="flex-shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
