"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { languages, getNestedValue, SupportedLanguage } from '@/locales'

interface LanguageContextType {
  language: SupportedLanguage
  setLanguage: (lang: SupportedLanguage) => Promise<void>
  t: (key: string) => string
  loading: boolean
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

interface LanguageProviderProps {
  children: ReactNode
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<SupportedLanguage>('english')
  const [loading, setLoading] = useState(true)

  // Apply font class to body based on language
  React.useEffect(() => {
    if (typeof document !== 'undefined') {
      const body = document.body
      if (language === 'korean') {
        body.classList.add('font-korean')
      } else {
        body.classList.remove('font-korean')
      }
    }
  }, [language])

  // Translation function
  const t = (key: string): string => {
    const translations = languages[language]
    return getNestedValue(translations, key) || key
  }

  // Load user's language preference from database
  const loadUserLanguage = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data: preferences } = await supabase
          .from('user_preferences')
          .select('language')
          .eq('user_id', user.id)
          .single()

        if (preferences?.language) {
          setLanguageState(preferences.language as SupportedLanguage)
        }
      }
    } catch (error) {
      console.error('Error loading user language preference:', error)
    } finally {
      setLoading(false)
    }
  }

  // Update language preference in database and state
  const setLanguage = async (newLanguage: SupportedLanguage) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { error } = await supabase
          .from('user_preferences')
          .update({ language: newLanguage })
          .eq('user_id', user.id)

        if (!error) {
          setLanguageState(newLanguage)
        } else {
          console.error('Error updating language preference:', error)
        }
      }
    } catch (error) {
      console.error('Error setting language:', error)
    }
  }

  useEffect(() => {
    loadUserLanguage()
  }, [])

  const value: LanguageContextType = {
    language,
    setLanguage,
    t,
    loading
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}