"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { GraduationCap, BookOpen, Check, X } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { storeMode } from '@/lib/study/currentMode'

type ModeKey = 'grades' | 'study'

interface ModeSwitcherSheetProps {
  open: boolean
  currentMode: ModeKey
  onClose: () => void
}

/**
 * Bottom sheet that lets the student switch between the two top-level
 * mobile modes: Grades (/mobile) and Study (/mobile/study).
 *
 * Replaces the previous one-tap HubModeToggle pill — that pattern
 * confused users because the label described the *action* ("Switch
 * to X") rather than the *current state*. The new chip in MobileHeader
 * shows the current mode by name and opens this sheet for the switch.
 *
 * Visual pattern matches existing mobile bottom sheets (overlay +
 * rounded-t-2xl + body-scroll lock).
 */
export function ModeSwitcherSheet({ open, currentMode, onClose }: ModeSwitcherSheetProps) {
  const router = useRouter()
  const { t } = useTranslation()

  // Lock body scroll while open — same pattern as CommentBottomSheet.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  if (!open) return null

  const handlePick = (mode: ModeKey) => {
    onClose()
    // Persist immediately so the destination page renders the right
    // chip + nav even before pathname tells us (shared-route routing).
    storeMode(mode)
    if (mode === currentMode) return
    router.push(mode === 'grades' ? '/mobile' : '/mobile/study')
  }

  const options: Array<{ key: ModeKey; icon: typeof GraduationCap; iconBg: string; titleKey: string; blurbKey: string }> = [
    {
      key: 'grades',
      icon: GraduationCap,
      iconBg: 'bg-gradient-to-br from-sky-400 to-blue-600',
      titleKey: 'mobile.mode.gradesLabel',
      blurbKey: 'mobile.mode.gradesBlurb',
    },
    {
      key: 'study',
      icon: BookOpen,
      iconBg: 'bg-gradient-to-br from-violet-400 to-purple-600',
      titleKey: 'mobile.mode.studyLabel',
      blurbKey: 'mobile.mode.studyBlurb',
    },
  ]

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-[100] animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden
      />
      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={String(t('mobile.mode.sheetTitle'))}
        className="fixed inset-x-0 bottom-0 z-[101] bg-white rounded-t-2xl shadow-[0_-8px_24px_-8px_rgba(0,0,0,0.20)] animate-in slide-in-from-bottom duration-250"
        // Push content above the 72px bottom nav so the second mode
        // card isn't clipped on routes where the nav is visible.
        style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom))' }}
      >
        {/* Grab handle */}
        <div className="pt-2 pb-1 flex items-center justify-center">
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
                  className={`group w-full flex items-center gap-3 rounded-2xl p-3.5 ring-1 transition text-left ${
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
  )
}
