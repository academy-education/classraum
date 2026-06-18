"use client"

import { useState } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { ModalShell } from '@/components/ui/common/ModalShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { NonFunctional } from './NonFunctional'

/**
 * Live preview of the 시험 및 점수 (Create Test) modal.
 *
 * Reconstructed from level-tests-page.tsx (line 587+ ModalShell) since
 * the create modal is inline JSX in that page rather than its own
 * component. Every label / placeholder / select / button reads through
 * the same `levelTests.*` translation keys the live modal uses, so the
 * demo flips language with the rest of the app and the title reads
 * "테스트 만들기" (not the assignment modal's "새 과제 추가").
 */

const DIFFICULTIES = ['beginner', 'intermediate', 'advanced', 'expert'] as const
const QUESTION_TYPES = ['multiple_choice', 'true_false', 'short_answer'] as const

const inputStyles = '!h-10 w-full rounded-lg border border-border bg-transparent focus:border-primary focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0'
const selectStyles = '!h-10 w-full rounded-lg border border-border bg-transparent focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary py-2 px-3'

export function LevelTestCreateDemo() {
  const { t, language } = useTranslation()
  const ko = language === 'korean'
  const [difficulty, setDifficulty] = useState<typeof DIFFICULTIES[number]>('intermediate')
  const [lang, setLang] = useState<'english' | 'korean'>(ko ? 'korean' : 'english')
  const [types, setTypes] = useState<string[]>(['multiple_choice'])

  const toggle = (type: string) =>
    setTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type])

  return (
    <NonFunctional>
      <ModalShell
        isOpen
        inline
        onClose={() => undefined}
        size="lg"
        title={String(t('levelTests.createTest'))}
        footer={
          <ModalShell.Footer split>
            <Button type="button" variant="outline">
              {String(t('common.cancel'))}
            </Button>
            <Button type="button">
              {String(t('levelTests.form.generate'))}
            </Button>
          </ModalShell.Footer>
        }
      >
        <div className="space-y-5">
          {/* Subject */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground/80">
              {String(t('levelTests.form.subject'))} <span className="text-rose-500">*</span>
            </Label>
            <Input
              readOnly
              value={ko ? '수학' : 'Mathematics'}
              className={inputStyles}
            />
          </div>

          {/* Grade + Difficulty */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                {String(t('levelTests.form.grade'))}
              </Label>
              <Input
                readOnly
                value={ko ? '4학년' : 'Grade 4'}
                className={inputStyles}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                {String(t('levelTests.form.difficulty'))} <span className="text-rose-500">*</span>
              </Label>
              <Select value={difficulty} onValueChange={v => setDifficulty(v as typeof DIFFICULTIES[number])}>
                <SelectTrigger className={selectStyles}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIFFICULTIES.map(d => (
                    <SelectItem key={d} value={d}>
                      {String(t(`levelTests.form.difficulty${d.charAt(0).toUpperCase() + d.slice(1)}`))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Language */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground/80">
              {String(t('levelTests.form.language'))} <span className="text-rose-500">*</span>
            </Label>
            <Select value={lang} onValueChange={v => setLang(v as 'english' | 'korean')}>
              <SelectTrigger className={selectStyles}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="english">{String(t('levelTests.form.languageEnglish'))}</SelectItem>
                <SelectItem value="korean">{String(t('levelTests.form.languageKorean'))}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Question Types */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground/80">
              {String(t('levelTests.form.questionTypes'))} <span className="text-rose-500">*</span>
            </Label>
            <div className="flex flex-wrap gap-2">
              {QUESTION_TYPES.map(type => {
                const key = `type${type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')}`
                const active = types.includes(type)
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggle(type)}
                    className={`h-10 px-3 rounded-lg border text-sm font-medium transition-colors ${
                      active
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {String(t(`levelTests.form.${key}`))}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Question Count + MC Choice Count */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                {String(t('levelTests.form.questionCount'))} <span className="text-rose-500">*</span>
              </Label>
              <Input readOnly type="number" value={10} className={inputStyles} />
              <p className="text-xs text-gray-500">{String(t('levelTests.form.questionCountHelp'))}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                {String(t('levelTests.form.mcChoiceCount'))}
              </Label>
              <Input readOnly type="number" value={4} className={inputStyles} />
              <p className="text-xs text-gray-500">{String(t('levelTests.form.mcChoiceCountHelp'))}</p>
            </div>
          </div>

          {/* Extra Comments */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground/80">
              {String(t('levelTests.form.extraComments'))}
            </Label>
            <textarea
              readOnly
              value={ko
                ? '영어 분사 형태에 집중해주세요.'
                : 'Focus on English participles.'}
              className="w-full min-h-[80px] rounded-lg border border-border bg-transparent px-3 py-2 text-sm focus:border-primary focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 resize-y"
              rows={3}
            />
            <p className="text-xs text-gray-500">{String(t('levelTests.form.extraCommentsHelp'))}</p>
          </div>
        </div>
      </ModalShell>
    </NonFunctional>
  )
}
