"use client"

import { useMemo } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileQuestion, Share2, Printer, Users, Presentation, Check, ChevronDown } from 'lucide-react'
import { NonFunctional } from './NonFunctional'

/**
 * Live preview of the level-test Detail view — mirrors
 * LevelTestDetail.tsx around line 217-340 (header card with title +
 * chips + Share/Print/Assign/Take-in-Person buttons, then Questions
 * card showing the AI-generated questions with correct answers
 * highlighted). The Print dropdown is shown OPEN so users see the
 * three print modes (without answers / with answers / answer sheet).
 *
 * This is what users land on after the create-test modal generates
 * the test, so it doubles as the 'step-by-step result' demo the user
 * asked for in feedback #2.
 */
export function LevelTestDetailDemo() {
  const { t, language } = useTranslation()
  const ko = language === 'korean'

  const questions = useMemo(() => ko
    ? [
        {
          q: '다음 중 8 × 7의 값으로 옳은 것은?',
          type: '객관식',
          choices: ['54', '56', '63', '64'],
          correctIdx: 1,
        },
        {
          q: '직사각형의 넓이를 구하는 공식은 가로 × 세로이다.',
          type: '참/거짓',
          choices: ['참', '거짓'],
          correctIdx: 0,
        },
      ]
    : [
        {
          q: 'Which of the following equals 8 × 7?',
          type: 'Multiple choice',
          choices: ['54', '56', '63', '64'],
          correctIdx: 1,
        },
        {
          q: 'The area of a rectangle is calculated by width × height.',
          type: 'True / False',
          choices: ['True', 'False'],
          correctIdx: 0,
        },
      ]
  , [ko])

  return (
    <NonFunctional>
      <div className="space-y-5">
        {/* Header card */}
        <Card className="p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-11 h-11 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <FileQuestion className="w-5 h-5 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-semibold tracking-tight text-gray-900 leading-tight">
                {ko ? '4학년 수학 — 중간고사 1' : 'Grade 4 Math — Midterm 1'}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {ko ? '수학 · 4학년' : 'Mathematics · Grade 4'}
              </p>
            </div>
          </div>

          {/* Chips */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            <span className="text-xs font-medium px-2 py-1 bg-sky-50 text-sky-700 rounded">
              {String(t('levelTests.form.difficultyIntermediate'))}
            </span>
            <span className="text-xs font-medium px-2 py-1 bg-gray-50 text-gray-700 rounded">
              {ko ? '문제 10개' : '10 questions'}
            </span>
            <span className="text-xs font-medium px-2 py-1 bg-gray-50 text-gray-700 rounded">
              {ko ? '30분' : '30 min'}
            </span>
            <span className="text-xs font-medium px-2 py-1 bg-emerald-50 text-emerald-700 rounded">
              {String(t('levelTests.detail.visibilityPublic'))}
            </span>
          </div>

          {/* Action row — Share / Print (with menu open) / Assign / In-person */}
          <div className="flex flex-wrap gap-2 relative">
            <Button variant="outline" size="sm" className="h-9">
              <Share2 className="w-4 h-4 mr-2" />
              {String(t('levelTests.detail.share'))}
            </Button>
            <div className="relative">
              <Button variant="outline" size="sm" className="h-9">
                <Printer className="w-4 h-4 mr-2" />
                {String(t('levelTests.detail.print'))}
                <ChevronDown className="w-3.5 h-3.5 ml-1" />
              </Button>
              {/* Open print menu so users see the 3 modes */}
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[260px]">
                <div className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50">
                  {String(t('levelTests.detail.printWithoutAnswers'))}
                </div>
                <div className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50">
                  {String(t('levelTests.detail.printWithAnswers'))}
                </div>
                <div className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50">
                  {String(t('levelTests.detail.printAnswerSheet'))}
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" className="h-9">
              <Users className="w-4 h-4 mr-2" />
              {String(t('levelTests.detail.assign'))}
            </Button>
            <Button variant="outline" size="sm" className="h-9">
              <Presentation className="w-4 h-4 mr-2" />
              {String(t('levelTests.detail.takeInPerson'))}
            </Button>
          </div>
        </Card>

        {/* Questions card — AI-generated test preview */}
        <Card className="p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            {String(t('levelTests.detail.questions'))} ({questions.length})
          </h2>
          <div className="space-y-4">
            {questions.map((q, i) => (
              <div key={i} className="border-b last:border-b-0 pb-4 last:pb-0">
                <div className="flex items-start gap-3">
                  <div className="font-semibold text-gray-600 min-w-[24px]">{i + 1}.</div>
                  <div className="flex-1">
                    <div className="text-gray-900 mb-1.5 text-sm">{q.q}</div>
                    <div className="text-xs text-gray-500 mb-2">{q.type}</div>
                    <div className="space-y-1.5">
                      {q.choices.map((c, idx) => {
                        const letter = String.fromCharCode(65 + idx)
                        const isCorrect = idx === q.correctIdx
                        return (
                          <div
                            key={idx}
                            className={`text-sm px-3 py-1.5 rounded ${
                              isCorrect
                                ? 'bg-green-50 text-green-900 border border-green-300'
                                : 'bg-gray-50'
                            }`}
                          >
                            <span className="font-semibold mr-2">{letter}.</span>{c}
                            {isCorrect && <Check className="w-4 h-4 inline ml-2 text-green-600" />}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </NonFunctional>
  )
}
