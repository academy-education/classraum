"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { languages, getNestedValue, SupportedLanguage } from '@/locales'

interface LanguageContextType {
  language: SupportedLanguage
  setLanguage: (lang: SupportedLanguage) => Promise<void>
  t: (key: string, params?: Record<string, string | number | undefined>) => string
  loading: boolean
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

interface LanguageProviderProps {
  children: ReactNode
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  // Always initialize with english to match server-side rendering
  const [language, setLanguageState] = useState<SupportedLanguage>('english')
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

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

  // Translation function with parameter interpolation
  const t = (key: string, params?: Record<string, string | number | undefined>): string => {
    const translations = languages[language]
    let translation = getNestedValue(translations, key) || key
    
    // Replace parameters in the translation string
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        if (paramValue !== undefined) {
          translation = translation.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue))
        }
      })
    }
    
    return translation
  }

  // Load user's language preference from database
  const loadUserLanguage = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // First, try to get existing preferences
        const { data: existingPreferences, error: preferencesError } = await supabase
          .from('user_preferences')
          .select('language')
          .eq('user_id', user.id)
          .single()

        let preferences = existingPreferences

        // If no preferences exist, create default ones
        if (preferencesError?.code === 'PGRST116') { // No rows returned
          console.log('No user preferences found, creating default preferences...')
          
          // Get browser/system language preference
          let defaultLanguage: SupportedLanguage = 'english'
          if (typeof window !== 'undefined') {
            const browserLanguage = navigator.language?.toLowerCase()
            if (browserLanguage?.includes('ko')) {
              defaultLanguage = 'korean'
            }
          }
          
          // Create default preferences
          const { data: newPreferences } = await supabase
            .from('user_preferences')
            .insert({
              user_id: user.id,
              language: defaultLanguage,
              theme: 'system',
              push_notifications: true,
              email_notifications: {},
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
              date_format: 'MM/DD/YYYY',
              login_notifications: true,
              two_factor_enabled: false,
              display_density: 'comfortable',
              auto_logout_minutes: 480,
              dashboard_widgets: {},
              default_view: 'dashboard'
            })
            .select('language')
            .single()
          
          preferences = newPreferences
        }

        if (preferences?.language) {
          const newLanguage = preferences.language as SupportedLanguage
          setLanguageState(newLanguage)
          // Save to localStorage for immediate access on next load
          localStorage.setItem('classraum_language', newLanguage)
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
      // Update local state immediately for responsive UI
      setLanguageState(newLanguage)
      // Update localStorage immediately
      localStorage.setItem('classraum_language', newLanguage)

      // Try to update database if user is authenticated
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Try to update existing preferences first
        const { error: updateError } = await supabase
          .from('user_preferences')
          .update({ 
            language: newLanguage,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)

        // If update failed because no row exists, insert new preferences
        if (updateError?.code === 'PGRST116') {
          await supabase
            .from('user_preferences')
            .insert({
              user_id: user.id,
              language: newLanguage,
              theme: 'system',
              push_notifications: true,
              email_notifications: {},
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
              date_format: 'MM/DD/YYYY',
              login_notifications: true,
              two_factor_enabled: false,
              display_density: 'comfortable',
              auto_logout_minutes: 480,
              dashboard_widgets: {},
              default_view: 'dashboard'
            })
        } else if (updateError) {
          console.error('Error updating language preference:', updateError)
        }
      }
      // If no user is logged in, that's fine - we still have localStorage
    } catch (error) {
      console.error('Error setting language:', error)
      // Even if database update fails, local state and localStorage should still work
    }
  }

  useEffect(() => {
    setMounted(true)
    // Load saved language from localStorage after component mounts
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('classraum_language')
      if (saved && (saved === 'english' || saved === 'korean')) {
        setLanguageState(saved as SupportedLanguage)
      }
      setLoading(false)
    }
    loadUserLanguage()
  }, [])

  // Don't render children until mounted to prevent hydration mismatch
  if (!mounted) {
    return null
  }

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