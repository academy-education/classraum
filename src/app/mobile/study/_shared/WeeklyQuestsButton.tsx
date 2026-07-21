"use client"

import { useState } from 'react'
import { Target, ChevronRight, X } from '@/app/mobile/study/_shared/icons'
import { useTranslation } from '@/hooks/useTranslation'
import { ModalPortal } from '@/components/ui/modal-portal'
import { useSheetDrag } from './useSheetDrag'
import { WeeklyQuests } from './WeeklyQuests'

/**
 * A compact button for the "This week" section that opens the weekly
 * quests in a bottom sheet. Keeps the landing tidy (quests are one tap
 * away instead of always expanded) while reusing the existing
 * WeeklyQuests card verbatim inside the sheet.
 */
export function WeeklyQuestsButton() {
  const { language } = useTranslation()
  const ko = language === 'korean'
  const [open, setOpen] = useState(false)
  const { handleProps, sheetStyle } = useSheetDrag(() => setOpen(false))

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 rounded-2xl bg-white ring-1 ring-gray-200/70 shadow-[0_1px_2px_rgba(0,0,0,0.03)] px-4 py-3.5 text-left hover:ring-primary/30 transition"
      >
        <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Target className="w-5 h-5 text-primary" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[14px] font-semibold text-gray-900">
            {ko ? '주간 퀘스트' : 'Weekly quests'}
          </span>
          <span className="block text-[12px] text-gray-500">
            {ko ? '이번 주 목표를 확인하고 보너스 XP를 받으세요' : "See this week's goals and earn bonus XP"}
          </span>
        </span>
        <ChevronRight className="flex-shrink-0 w-4 h-4 text-gray-400" />
      </button>

      {open && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[120] bg-black/40 animate-fade-in"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            style={sheetStyle}
            className="fixed inset-x-0 bottom-0 z-[121] max-h-[88vh] overflow-y-auto rounded-t-3xl bg-gray-50 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] animate-slide-up"
          >
            <div {...handleProps} className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm pt-3 pb-2 px-5">
              <div className="mx-auto w-9 h-1 rounded-full bg-gray-300" />
              <div className="mt-3 flex items-center justify-between">
                <h2 className="text-[17px] font-bold text-gray-900">
                  {ko ? '주간 퀘스트' : 'Weekly quests'}
                </h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={ko ? '닫기' : 'Close'}
                  className="w-8 h-8 inline-flex items-center justify-center rounded-full hover:bg-gray-200 transition"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="px-5 pt-1">
              <WeeklyQuests hideHeading />
            </div>
          </div>
        </ModalPortal>
      )}
    </>
  )
}
