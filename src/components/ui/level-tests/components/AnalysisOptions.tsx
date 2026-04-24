import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useTranslation } from '@/hooks/useTranslation'
import type { AnalysisFocus, AnalysisLength, AnalysisTone, AnalysisLanguage } from '../types'

const selectStyles = '!h-9 w-full rounded-lg border border-border bg-transparent focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary py-1 px-2 text-sm'

interface AnalysisOptionsProps {
  focus: AnalysisFocus
  setFocus: (v: AnalysisFocus) => void
  length: AnalysisLength
  setLength: (v: AnalysisLength) => void
  tone: AnalysisTone
  setTone: (v: AnalysisTone) => void
  language: AnalysisLanguage
  setLanguage: (v: AnalysisLanguage) => void
}

export function AnalysisOptions({
  focus,
  setFocus,
  length,
  setLength,
  tone,
  setTone,
  language,
  setLanguage,
}: AnalysisOptionsProps) {
  const { t } = useTranslation()
  return (
    <div className="grid grid-cols-2 gap-3 mb-4">
      <div className="space-y-1">
        <Label className="text-xs font-medium text-foreground/70">
          {String(t('levelTests.detail.analysisFocus'))}
        </Label>
        <Select value={focus} onValueChange={(v) => setFocus(v as AnalysisFocus)}>
          <SelectTrigger className={selectStyles}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="overall">{String(t('levelTests.detail.focusOverall'))}</SelectItem>
            <SelectItem value="strengths">{String(t('levelTests.detail.focusStrengths'))}</SelectItem>
            <SelectItem value="weaknesses">{String(t('levelTests.detail.focusWeaknesses'))}</SelectItem>
            <SelectItem value="study_plan">{String(t('levelTests.detail.focusStudyPlan'))}</SelectItem>
            <SelectItem value="misconceptions">{String(t('levelTests.detail.focusMisconceptions'))}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs font-medium text-foreground/70">
          {String(t('levelTests.detail.analysisLength'))}
        </Label>
        <Select value={length} onValueChange={(v) => setLength(v as AnalysisLength)}>
          <SelectTrigger className={selectStyles}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="short">{String(t('levelTests.detail.lengthShort'))}</SelectItem>
            <SelectItem value="medium">{String(t('levelTests.detail.lengthMedium'))}</SelectItem>
            <SelectItem value="detailed">{String(t('levelTests.detail.lengthDetailed'))}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs font-medium text-foreground/70">
          {String(t('levelTests.detail.analysisTone'))}
        </Label>
        <Select value={tone} onValueChange={(v) => setTone(v as AnalysisTone)}>
          <SelectTrigger className={selectStyles}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="encouraging">{String(t('levelTests.detail.toneEncouraging'))}</SelectItem>
            <SelectItem value="direct">{String(t('levelTests.detail.toneDirect'))}</SelectItem>
            <SelectItem value="formal">{String(t('levelTests.detail.toneFormal'))}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs font-medium text-foreground/70">
          {String(t('levelTests.detail.analysisLanguage'))}
        </Label>
        <Select value={language} onValueChange={(v) => setLanguage(v as AnalysisLanguage)}>
          <SelectTrigger className={selectStyles}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">{String(t('levelTests.detail.analysisLanguageDefault'))}</SelectItem>
            <SelectItem value="english">{String(t('levelTests.form.languageEnglish'))}</SelectItem>
            <SelectItem value="korean">{String(t('levelTests.form.languageKorean'))}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
