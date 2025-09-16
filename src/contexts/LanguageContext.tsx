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
  // Don't set initial language - wait for proper detection
  const [language, setLanguageState] = useState<SupportedLanguage | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  // Apply font class to body based on language
  React.useEffect(() => {
    if (typeof document !== 'undefined' && language) {
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
    // Default to english if language not loaded yet
    const currentLanguage = language || 'english'
    const translations = languages[currentLanguage]
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
        console.log('Loading language preferences for authenticated user:', user.id)

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
          console.log('Created new preferences with language:', defaultLanguage)
        }

        if (preferences?.language) {
          const newLanguage = preferences.language as SupportedLanguage
          console.log(`Setting language from database: ${newLanguage}`)
          setLanguageState(newLanguage)
          // Always update localStorage with database preference (overwrite any cached value)
          if (typeof window !== 'undefined') {
            localStorage.setItem('classraum_language', newLanguage)
          }
          console.log(`Language loaded from user preferences: ${newLanguage}`)
          return newLanguage
        } else {
          console.log('No language found in preferences')
          return null
        }
      } else {
        console.log('No authenticated user found in loadUserLanguage')
        return null
      }
    } catch (error) {
      console.error('Error loading user language preference:', error)
      return null
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

    const initializeLanguage = async () => {
      try {
        console.log('Starting language initialization...')

        // Check if user is authenticated first
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          // User is authenticated - ONLY use database, ignore localStorage completely
          console.log('User authenticated, loading language from database only')
          const databaseLanguage = await loadUserLanguage()

          if (!databaseLanguage) {
            // No database preference found, create default based on browser or default to english
            let defaultLanguage: SupportedLanguage = 'english'
            if (typeof window !== 'undefined' && navigator.language?.toLowerCase().includes('ko')) {
              defaultLanguage = 'korean'
            }
            setLanguageState(defaultLanguage)
            console.log(`User authenticated but no database preference, setting: ${defaultLanguage}`)
          }
        } else {
          // No user - use localStorage fallback for auth page
          console.log('No user authenticated, using localStorage fallback')
          if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('classraum_language')
            if (saved && (saved === 'english' || saved === 'korean')) {
              setLanguageState(saved as SupportedLanguage)
              console.log(`Language loaded from localStorage fallback: ${saved}`)
            } else {
              // Detect browser language or default to english
              let browserLanguage: SupportedLanguage = 'english'
              if (navigator.language?.toLowerCase().includes('ko')) {
                browserLanguage = 'korean'
              }
              setLanguageState(browserLanguage)
              console.log(`Language set from browser detection: ${browserLanguage}`)
            }
          }
        }
      } finally {
        console.log('Language initialization complete')
        setLoading(false)
      }
    }

    initializeLanguage()
  }, [])

  // Listen for authentication state changes and reload language
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id)

      if (event === 'SIGNED_IN' && session?.user) {
        console.log('User signed in, reloading language from database...')
        setLoading(true)

        const databaseLanguage = await loadUserLanguage()
        if (!databaseLanguage) {
          // No database preference, set default
          let defaultLanguage: SupportedLanguage = 'english'
          if (typeof window !== 'undefined' && navigator.language?.toLowerCase().includes('ko')) {
            defaultLanguage = 'korean'
          }
          setLanguageState(defaultLanguage)
          console.log(`No database preference after sign in, setting: ${defaultLanguage}`)
        }

        setLoading(false)
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out, reverting to localStorage/browser language')
        setLoading(true)

        if (typeof window !== 'undefined') {
          const saved = localStorage.getItem('classraum_language')
          if (saved && (saved === 'english' || saved === 'korean')) {
            setLanguageState(saved as SupportedLanguage)
            console.log(`Language reverted to localStorage: ${saved}`)
          } else {
            let browserLanguage: SupportedLanguage = 'english'
            if (navigator.language?.toLowerCase().includes('ko')) {
              browserLanguage = 'korean'
            }
            setLanguageState(browserLanguage)
            console.log(`Language reverted to browser detection: ${browserLanguage}`)
          }
        }

        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Don't render children until mounted and language is determined
  if (!mounted || !language || loading) {
    return null
  }

  const value: LanguageContextType = {
    language: language as SupportedLanguage, // Safe to cast since we check above
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