"use client"

import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Question } from '@/app/mobile/study/session/[id]/test/types'
import { QuestionGraphicView } from '@/app/mobile/study/session/[id]/test/QuestionGraphicView'
import {
  PassageParagraphs, PromptText, choiceLabel, normalizeDisplayText,
} from '@/app/mobile/study/session/[id]/test/helpers'
import { useTranslation } from '@/hooks/useTranslation'
import { ChevronLeft, ChevronRight, Eye, EyeOff, X, CheckCircle2 } from 'lucide-react'

/**
 * Camp P3 — full-screen in-class review presenter.
 *
 * The teacher walks a review-set deck (from GET /api/camp/review-set)
 * through a projector: one question at a time (passage/figure + prompt +
 * choices), then a Reveal toggle that highlights the key green and shows
 * the explanation. Reveal state resets on navigation so the next
 * question always starts hidden.
 *
 * Keyboard: ← / → navigate, Space or R toggles reveal, Escape closes.
 * Type sizes are projector-scale on purpose (text-xl/2xl+); pure
 * white-on-dark chrome with a white content card for contrast.
 *
 * Rendering reuses the student session's building blocks
 * (PassageParagraphs / PromptText / choiceLabel / QuestionGraphicView)
 * so passages, math figures and choice labels look exactly like what
 * students saw.
 */

interface CampReviewPresenterProps {
  title: string
  testFamily: string
  questions: Question[]
  onClose: () => void
}

export function CampReviewPresenter({ title, testFamily, questions, onClose }: CampReviewPresenterProps) {
  const { t } = useTranslation()
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)

  const total = questions.length
  const q = questions[index]

  const goTo = useCallback((next: number) => {
    if (next < 0 || next >= total) return
    setIndex(next)
    setRevealed(false)
  }, [total])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(index + 1) }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(index - 1) }
      else if (e.key === ' ' || e.key.toLowerCase() === 'r') { e.preventDefault(); setRevealed(v => !v) }
      else if (e.key === 'Escape') { e.preventDefault(); onClose() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, goTo, onClose])

  if (!q) return null

  const isKey = (choice: string) => revealed && choice === q.correct_answer

  return createPortal(
    <div className="fixed inset-0 z-[300] bg-gray-950 flex flex-col" role="dialog" aria-modal="true">
      {/* Top bar */}
      <div className="flex items-center gap-4 px-6 py-3 text-white flex-shrink-0">
        <h2 className="text-lg font-semibold truncate">{title}</h2>
        <span className="text-sm text-gray-400 flex-shrink-0">
          {t('camp.review.questionOf', { current: index + 1, total })}
        </span>
        <span className="hidden md:block ml-auto text-xs text-gray-500">
          {t('camp.review.keyboardHint')}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label={String(t('common.close'))}
          className="md:ml-0 ml-auto p-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Question card */}
      <div className="flex-1 min-h-0 px-4 pb-2 md:px-8">
        <div className="h-full bg-white rounded-2xl overflow-y-auto">
          <div className="max-w-4xl mx-auto px-6 py-8 md:px-10">
            {q.passage && (
              <div className="mb-6 text-lg md:text-xl leading-relaxed text-gray-900 border-b border-gray-200 pb-6">
                <PassageParagraphs text={q.passage} />
              </div>
            )}
            <QuestionGraphicView graphic={q.graphic} />
            <p className="text-xl md:text-2xl font-medium text-gray-900 leading-relaxed whitespace-pre-wrap mb-6">
              <PromptText text={q.prompt} />
            </p>

            <div className="space-y-3">
              {q.choices.map((choice, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-4 rounded-xl border-2 px-4 py-3 text-lg md:text-xl leading-relaxed transition-colors ${
                    isKey(choice)
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                      : 'border-gray-200 bg-white text-gray-900'
                  }`}
                >
                  <span
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-base font-bold ${
                      isKey(choice) ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {choiceLabel(testFamily, i, index)}
                  </span>
                  <span className="flex-1 whitespace-pre-wrap">{normalizeDisplayText(choice)}</span>
                  {isKey(choice) && (
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0 mt-0.5" />
                  )}
                </div>
              ))}
            </div>

            {revealed && q.explanation && (
              <div className="mt-6 rounded-xl bg-emerald-50 border border-emerald-200 px-5 py-4">
                <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700 mb-2">
                  {t('camp.review.explanation')}
                </p>
                <p className="text-lg md:text-xl leading-relaxed text-gray-900 whitespace-pre-wrap">
                  {normalizeDisplayText(q.explanation)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="flex items-center justify-between gap-4 px-6 py-4 flex-shrink-0">
        <button
          type="button"
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-base font-medium text-white bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5" />
          {t('camp.review.previous')}
        </button>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5 flex-wrap justify-center max-w-[50%]">
          {questions.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={String(t('camp.review.jumpTo', { n: i + 1 }))}
              className={`rounded-full transition-all ${
                i === index ? 'w-3.5 h-3.5 bg-white' : 'w-2.5 h-2.5 bg-white/30 hover:bg-white/60'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setRevealed(v => !v)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-base font-semibold ${
              revealed
                ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                : 'bg-white text-gray-900 hover:bg-gray-200'
            }`}
          >
            {revealed ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            {revealed ? t('camp.review.hideAnswer') : t('camp.review.revealAnswer')}
          </button>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            disabled={index === total - 1}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-base font-medium text-white bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {t('camp.review.next')}
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
