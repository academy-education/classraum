"use client"

import { useTranslation } from '@/hooks/useTranslation'
import { cn } from '@/lib/utils'

export type SubmissionStatus = 'pending' | 'submitted' | 'not submitted' | 'excused' | 'overdue'

interface SubmissionStatusPillsProps {
  value: SubmissionStatus
  onChange: (next: SubmissionStatus) => void
  /** Disable interaction while parent is saving. */
  disabled?: boolean
}

interface PillSpec {
  key: SubmissionStatus
  /** Translation suffix under `assignments.status.*`. */
  i18nKey: 'pending' | 'submitted' | 'notSubmitted' | 'excused' | 'overdue'
  /** Single-letter shortcut shown in the title tooltip. Aligns with statusFromShortcut below. */
  shortcut: string
  tone: 'gray' | 'emerald' | 'rose' | 'sky' | 'amber'
}

const PILLS: PillSpec[] = [
  { key: 'pending',        i18nKey: 'pending',       shortcut: '·', tone: 'gray' },
  { key: 'submitted',      i18nKey: 'submitted',     shortcut: 'S', tone: 'emerald' },
  { key: 'not submitted',  i18nKey: 'notSubmitted',  shortcut: 'M', tone: 'rose' },
  { key: 'excused',        i18nKey: 'excused',       shortcut: 'E', tone: 'sky' },
  { key: 'overdue',        i18nKey: 'overdue',       shortcut: 'O', tone: 'amber' },
]

const TONE_CLASSES: Record<PillSpec['tone'], { active: string; inactive: string }> = {
  gray: {
    active:   'bg-gray-100 text-gray-700 ring-gray-300',
    inactive: 'text-gray-400 ring-gray-200 hover:text-gray-600 hover:ring-gray-300',
  },
  emerald: {
    active:   'bg-emerald-50 text-emerald-700 ring-emerald-300',
    inactive: 'text-gray-500 ring-gray-200 hover:text-emerald-700 hover:ring-emerald-200',
  },
  rose: {
    active:   'bg-rose-50 text-rose-700 ring-rose-300',
    inactive: 'text-gray-500 ring-gray-200 hover:text-rose-700 hover:ring-rose-200',
  },
  sky: {
    active:   'bg-sky-50 text-sky-700 ring-sky-300',
    inactive: 'text-gray-500 ring-gray-200 hover:text-sky-700 hover:ring-sky-200',
  },
  amber: {
    active:   'bg-amber-50 text-amber-700 ring-amber-300',
    inactive: 'text-gray-500 ring-gray-200 hover:text-amber-700 hover:ring-amber-200',
  },
}

/**
 * Inline 5-button submission-status picker for the grading rows.
 *
 * Mirrors AttendanceStatusPills in shape — same density and color
 * vocabulary. Replaces a Select dropdown so marking a class is one click
 * per row instead of click → scroll → click. Keyboard support is at the
 * row level (the parent listens for S/M/E/O while a row is focused).
 */
export function SubmissionStatusPills({ value, onChange, disabled }: SubmissionStatusPillsProps) {
  const { t } = useTranslation()
  return (
    <div
      role="radiogroup"
      aria-label={String(t('common.status'))}
      className="inline-flex items-center gap-1"
    >
      {PILLS.map(({ key, i18nKey, shortcut, tone }) => {
        const isActive = value === key
        const tones = TONE_CLASSES[tone]
        const label = String(t(`assignments.status.${i18nKey}`))
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={isActive}
            disabled={disabled}
            onClick={() => onChange(key)}
            title={`${label} (${shortcut})`}
            className={cn(
              'inline-flex items-center justify-center rounded-md ring-1 transition-colors',
              'h-7 px-2 text-xs min-w-[68px] font-medium select-none',
              isActive ? tones.active : `bg-white ${tones.inactive}`,
              disabled && 'opacity-50 cursor-not-allowed',
            )}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Map a single character to a submission status, or null if no match.
 * Centralized so the row-level keyboard handler stays in sync with the pills.
 *
 *   S → submitted
 *   M → not submitted (M for "missing")
 *   E → excused
 *   O → overdue
 *   0 → pending  (numeric-row reset)
 */
export function statusFromShortcut(key: string): SubmissionStatus | null {
  switch (key.toLowerCase()) {
    case 's': return 'submitted'
    case 'm': return 'not submitted'
    case 'e': return 'excused'
    case 'o': return 'overdue'
    case '0': return 'pending'
    default:  return null
  }
}
