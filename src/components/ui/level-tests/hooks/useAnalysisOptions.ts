import { useState } from 'react'
import type { AnalysisFocus, AnalysisLength, AnalysisTone, AnalysisLanguage } from '../types'

export function useAnalysisOptions() {
  const [focus, setFocus] = useState<AnalysisFocus>('overall')
  const [length, setLength] = useState<AnalysisLength>('medium')
  const [tone, setTone] = useState<AnalysisTone>('encouraging')
  const [language, setLanguage] = useState<AnalysisLanguage>('default')

  const toApiBody = () => ({
    focus,
    length,
    tone,
    analysis_language: language === 'default' ? undefined : language,
  })

  return { focus, setFocus, length, setLength, tone, setTone, language, setLanguage, toApiBody }
}
