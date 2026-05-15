"use client"

import { useTranslation } from '@/hooks/useTranslation'
import { cn } from '@/lib/utils'

export type AttendanceStatus = 'pending' | 'present' | 'absent' | 'late' | 'excused'

interface AttendanceStatusPillsProps {
  value: AttendanceStatus
  onChange: (next: AttendanceStatus) => void
  /** Disable interaction while the parent is saving. */
  disabled?: boolean
  /** Render compact (smaller padding) — default true since rows are dense. */
  compact?: boolean
  /** When true, the active pill renders as a saturated solid; otherwise as a tinted ring. */
  filled?: boolean
}

interface PillSpec {
  key: AttendanceStatus
  /** Single-letter label shown when the row is short on space. */
  shortcut: string
  /** Tone tokens — gray / emerald / rose / amber / sky for pending/present/absent/late/excused. */
  tone: 'gray' | 'emerald' | 'rose' | 'amber' | 'sky'
}

const PILLS: PillSpec[] = [
  { key: 'pending', shortcut: '·',  tone: 'gray' },
  { key: 'present', shortcut: 'P',  tone: 'emerald' },
  { key: 'absent',  shortcut: 'A',  tone: 'rose' },
  { key: 'late',    shortcut: 'L',  tone: 'amber' },
  { key: 'excused', shortcut: 'E',  tone: 'sky' },
]

const TONE_CLASSES: Record<PillSpec['tone'], { active: string; inactive: string }> = {
  gray: {
    active: 'bg-gray-100 text-gray-700 ring-gray-300',
    inactive: 'text-gray-400 ring-gray-200 hover:text-gray-600 hover:ring-gray-300',
  },
  emerald: {
    active: 'bg-emerald-50 text-emerald-700 ring-emerald-300',
    inactive: 'text-gray-500 ring-gray-200 hover:text-emerald-700 hover:ring-emerald-200',
  },
  rose: {
    active: 'bg-rose-50 text-rose-700 ring-rose-300',
    inactive: 'text-gray-500 ring-gray-200 hover:text-rose-700 hover:ring-rose-200',
  },
  amber: {
    active: 'bg-amber-50 text-amber-700 ring-amber-300',
    inactive: 'text-gray-500 ring-gray-200 hover:text-amber-700 hover:ring-amber-200',
  },
  sky: {
    active: 'bg-sky-50 text-sky-700 ring-sky-300',
    inactive: 'text-gray-500 ring-gray-200 hover:text-sky-700 hover:ring-sky-200',
  },
}

/**
 * Inline 5-button status picker for attendance rows.
 *
 * Replaces a Select dropdown so marking a class is one click per row
 * instead of click → scroll → click. Keyboard support is at the row
 * level (the parent listens for `P/A/L/E` while a row is focused).
 *
 * The "pending" pill renders as a neutral dot — it's the unset state
 * rather than a status a manager actively chooses, but we keep it in
 * the group so misclicks can be reverted.
 */
export function AttendanceStatusPills({
  value,
  onChange,
  disabled,
  compact = true,
  filled,
}: AttendanceStatusPillsProps) {
  const { t } = useTranslation()
  void filled  // reserved for future variant; default styling fits both

  return (
    <div
      role="radiogroup"
      aria-label={String(t('common.status'))}
      className="inline-flex items-center gap-1"
    >
      {PILLS.map(({ key, shortcut, tone }) => {
        const isActive = value === key
        const tones = TONE_CLASSES[tone]
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={isActive}
            disabled={disabled}
            onClick={() => onChange(key)}
            title={`${String(t(`attendance.${key}`))} (${shortcut})`}
            className={cn(
              'inline-flex items-center justify-center rounded-md ring-1 transition-colors',
              'font-medium select-none',
              compact ? 'h-7 px-2 text-xs min-w-[60px]' : 'h-8 px-3 text-sm min-w-[72px]',
              isActive ? tones.active : `bg-white ${tones.inactive}`,
              disabled && 'opacity-50 cursor-not-allowed',
            )}
          >
            {String(t(`attendance.${key}`))}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Map a single character keystroke to the corresponding status, or null
 * if it doesn't match. Centralized so the row-level keyboard handler
 * stays in sync with the visible pill labels.
 */
export function statusFromShortcut(key: string): AttendanceStatus | null {
  switch (key.toLowerCase()) {
    case 'p': return 'present'
    case 'a': return 'absent'
    case 'l': return 'late'
    case 'e': return 'excused'
    case '0': return 'pending'  // numeric-row reset
    default: return null
  }
}
