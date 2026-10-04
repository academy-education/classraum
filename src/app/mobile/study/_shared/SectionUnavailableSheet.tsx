"use client"

import Link from 'next/link'
import { Clock } from './icons'
import { useDialogA11y } from './useDialogA11y'
import { useTranslation } from '@/hooks/useTranslation'

/**
 * "This section isn't available right now."
 *
 * Shown when a full-test start (or a Module 2 draw) comes back
 * 409 { code: 'section_unavailable' }: the bank cannot fill the section to
 * its blueprint count, so the server refused to start it rather than sell a
 * shortened test ("Block short tests", lib/study/section-availability.ts).
 *
 * Not an error toast. Nothing failed on the student's side and "try again"
 * would fail the same way, so the sheet says what happened, that no credit
 * was used (or, mid-test, that it was returned), and points at another
 * section instead.
 */
export function SectionUnavailableSheet({
  variant = 'start', refunded = false, onClose,
}: {
  /** 'start' — refused before charging. 'module2' — refused after Module 1. */
  variant?: 'start' | 'module2'
  /** Module 2 only: the session's credits were returned. */
  refunded?: boolean
  onClose: () => void
}) {
  const { t } = useTranslation()
  const dialogRef = useDialogA11y(true, onClose)
  const isModule2 = variant === 'module2'
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px]">
      {/* Backdrop click closes; Escape (useDialogA11y) is the keyboard path. */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="section-unavailable-title"
        className="relative w-full sm:max-w-[420px] bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl outline-none text-left"
      >
        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary inline-flex items-center justify-center">
          <Clock className="w-6 h-6" />
        </div>

        <h2 id="section-unavailable-title" className="text-[20px] font-bold text-gray-900 mt-3 leading-tight">
          {String(t(isModule2 ? 'study.test.sectionUnavailable.module2Title' : 'study.test.sectionUnavailable.title'))}
        </h2>

        <p className="text-[13px] text-gray-600 mt-2 leading-relaxed">
          {String(t(isModule2 ? 'study.test.sectionUnavailable.module2Body' : 'study.test.sectionUnavailable.body'))}
        </p>
        <p className="text-[13px] text-gray-600 mt-2 leading-relaxed">
          {String(t('study.test.sectionUnavailable.suggestion'))}
        </p>

        {(!isModule2 || refunded) && (
          <p className="text-[13px] text-gray-500 mt-3 leading-relaxed">
            {String(t(isModule2 ? 'study.test.sectionUnavailable.refunded' : 'study.test.sectionUnavailable.notCharged'))}
          </p>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-full bg-primary text-white text-[15px] font-semibold py-3 transition-opacity hover:opacity-90 active:scale-[0.99]"
        >
          {String(t('study.test.sectionUnavailable.ok'))}
        </button>
        <Link
          href="/mobile/study"
          className="mt-2 block w-full text-center rounded-full text-[13px] font-medium text-gray-600 py-2.5 hover:bg-gray-50"
        >
          {String(t('study.test.sectionUnavailable.browse'))}
        </Link>
      </div>
    </div>
  )
}
