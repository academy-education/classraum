"use client"

import { useLanguage } from '@/contexts/LanguageContext'

export function useTranslation() {
  const { t, tList, language, setLanguage } = useLanguage()

  return {
    t,
    tList,
    language,
    setLanguage
  }
}