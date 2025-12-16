"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Eye, EyeOff, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/hooks/useTranslation'
import { cn } from '@/lib/utils'
import type { DashboardCard } from '@/stores/useDashboardLayoutStore'

interface CardVisibilityPanelProps {
  cards: DashboardCard[]
  onToggleVisibility: (cardId: string) => void
  isEditMode: boolean
}

const CARD_LABELS: Record<string, { en: string; ko: string }> = {
  'stats-revenue': { en: 'Revenue', ko: '수익' },
  'stats-users': { en: 'Active Users', ko: '활성 사용자' },
  'stats-classrooms': { en: 'Classrooms', ko: '클래스룸' },
  'stats-sessions': { en: 'Sessions', ko: '수업' },
  'todays-sessions': { en: "Today's Sessions", ko: '오늘의 수업' },
  'recent-activity': { en: 'Recent Activity', ko: '최근 활동' },
  'classroom-rankings': { en: 'Classroom Performance', ko: '클래스룸 성적' },
  'top-students': { en: 'Top Students', ko: '우수 학생' },
  'bottom-students': { en: 'Bottom Students', ko: '하위 학생' }
}

const SECTION_LABELS: Record<string, { en: string; ko: string }> = {
  stats: { en: 'Statistics', ko: '통계' },
  main: { en: 'Main', ko: '메인' },
  performance: { en: 'Performance', ko: '성적' }
}

export const CardVisibilityPanel = React.memo(function CardVisibilityPanel({
  cards,
  onToggleVisibility,
  isEditMode
}: CardVisibilityPanelProps) {
  const { t, language } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close panel when exiting edit mode
  useEffect(() => {
    if (!isEditMode) {
      setIsOpen(false)
    }
  }, [isEditMode])

  if (!isEditMode) return null

  const getCardLabel = (cardId: string) => {
    const labels = CARD_LABELS[cardId]
    return labels ? (language === 'korean' ? labels.ko : labels.en) : cardId
  }

  const getSectionLabel = (section: string) => {
    const labels = SECTION_LABELS[section]
    return labels ? (language === 'korean' ? labels.ko : labels.en) : section
  }

  // Group cards by section
  const cardsBySection = cards.reduce((acc, card) => {
    if (!acc[card.section]) {
      acc[card.section] = []
    }
    acc[card.section].push(card)
    return acc
  }, {} as Record<string, DashboardCard[]>)

  const visibleCount = cards.filter(c => c.visible).length
  const totalCount = cards.length

  return (
    <div className="relative" ref={panelRef}>
      {/* Toggle Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "text-gray-600 hover:text-gray-900",
          isOpen && "bg-gray-100"
        )}
      >
        <Eye className="w-4 h-4 mr-1.5" />
        {t('dashboard.editMode.cardVisibility')}
        <span className="ml-1.5 text-xs text-gray-400">
          ({visibleCount}/{totalCount})
        </span>
        <ChevronDown className={cn(
          "w-4 h-4 ml-1 transition-transform",
          isOpen && "rotate-180"
        )} />
      </Button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-lg border border-gray-200 shadow-lg z-50">
          <div className="p-3 border-b border-gray-100">
            <h3 className="font-medium text-gray-900 text-sm">
              {t('dashboard.editMode.cardVisibility')}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {language === 'korean'
                ? '표시할 카드를 선택하세요'
                : 'Choose which cards to display'}
            </p>
          </div>

          <div className="max-h-80 overflow-y-auto p-2">
            {['stats', 'main', 'performance'].map((section) => (
              <div key={section} className="mb-3 last:mb-0">
                <div className="text-xs font-medium text-gray-400 uppercase tracking-wide px-2 py-1">
                  {getSectionLabel(section)}
                </div>
                <div className="space-y-1">
                  {cardsBySection[section]?.map((card) => (
                    <button
                      key={card.id}
                      onClick={() => onToggleVisibility(card.id)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm",
                        "hover:bg-gray-50 transition-colors",
                        card.visible ? "text-gray-900" : "text-gray-400"
                      )}
                    >
                      <span>{getCardLabel(card.id)}</span>
                      {card.visible ? (
                        <Eye className="w-4 h-4 text-primary" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-gray-300" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
})

CardVisibilityPanel.displayName = 'CardVisibilityPanel'
