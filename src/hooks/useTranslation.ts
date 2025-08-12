"use client"

import { useLanguage } from '@/contexts/LanguageContext'

export function useTranslation() {
  const { t, language, setLanguage, loading } = useLanguage()

  return {
    t,
    language,
    setLanguage,
    loading
  }
}