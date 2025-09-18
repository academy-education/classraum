"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { languages, getNestedValue, SupportedLanguage } from '@/locales'
import { languageCookies } from '@/lib/cookies'

interface LanguageContextType {
  language: SupportedLanguage
  setLanguage: (lang: SupportedLanguage) => Promise<void>
  t: (key: string, params?: Record<string, string | number | undefined>) => string | string[]
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

interface LanguageProviderProps {
  children: ReactNode
  initialLanguage?: SupportedLanguage
}

export function LanguageProvider({ children, initialLanguage }: LanguageProviderProps) {
  // Always use initialLanguage to ensure SSR/client consistency
  // The root layout now passes server-side cookie values to prevent hydration mismatches
  const [language, setLanguageState] = useState<SupportedLanguage>(initialLanguage || 'korean')

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
  const t = (key: string, params?: Record<string, string | number | undefined>): string | string[] => {
    // Use current language (now always defined)
    const translations = languages[language]
    let translation = getNestedValue(translations, key) || key

    // If the result is an array, return it directly
    if (Array.isArray(translation)) {
      return translation
    }

    // Replace parameters in the translation string
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        if (paramValue !== undefined) {
          translation = String(translation).replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue))
        }
      })
    }

    return translation
  }

  // Load user's language preference from database
  const loadUserLanguage = async (): Promise<SupportedLanguage | null> => {
    try {
      let user = null
      let authError = null

      try {
        const { data, error } = await supabase.auth.getUser()
        user = data?.user
        authError = error
      } catch {
        return null
      }

      if (authError) {
        return null
      }

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
          // Get language preference with priority: current state > cookie > browser > default
          let defaultLanguage: SupportedLanguage = language // Use current language state first

          // Only fall back to cookie/browser detection if current state is default
          if (defaultLanguage === 'korean') {
            try {
              if (typeof window !== 'undefined') {
                // Check for cookie language preference
                const cookieLanguage = languageCookies.get()
                if (cookieLanguage && cookieLanguage !== 'korean') {
                  defaultLanguage = cookieLanguage
                } else {
                  // Fall back to browser language detection
                  const browserLanguage = navigator.language?.toLowerCase()
                  if (browserLanguage?.includes('en')) {
                    defaultLanguage = 'english'
                  }
                }
              }
            } catch {
              // Silent fallback to avoid production issues
            }
          }

          // Create default preferences with error handling
          try {
            const { data: newPreferences, error: insertError } = await supabase
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

            if (insertError) {
              return defaultLanguage // Return the language even if DB insert fails
            }

            preferences = newPreferences
          } catch {
            return defaultLanguage // Return the language even if DB insert fails
          }
        } else if (preferencesError) {
          return null
        }

        if (preferences?.language) {
          const newLanguage = preferences.language as SupportedLanguage
          // Validate language value
          if (newLanguage !== 'english' && newLanguage !== 'korean') {
            return 'korean'
          }

          setLanguageState(newLanguage)

          // Update cookie with database preference
          languageCookies.set(newLanguage)

          return newLanguage
        } else {
          return null
        }
      } else {
        return null
      }
    } catch {
      return null
    }
  }

  // Update language preference in database and state
  const setLanguage = async (newLanguage: SupportedLanguage) => {
    try {
      // Update local state immediately for responsive UI
      setLanguageState(newLanguage)

      // Update cookie immediately
      languageCookies.set(newLanguage)

      // Try to update database if user is authenticated
      let user = null
      let authError = null

      try {
        const { data, error } = await supabase.auth.getUser()
        user = data?.user
        authError = error
      } catch (error) {
        authError = error
      }

      if (authError) {
        return // Language state and localStorage are already updated
      }

      if (user) {
        try {
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
            const { error: insertError } = await supabase
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

            if (insertError) {
              // Silent error handling
            }
          } else if (updateError) {
            // Silent error handling
          }
        } catch {
          // Silent error handling
        }
      }
      // If no user is logged in, that's fine - we still have localStorage
    } catch {
      // Even if database update fails, local state and localStorage should still work
    }
  }

  // Handle client-side initialization and localStorage migration (only after hydration)
  useEffect(() => {
    try {
      // Only run on client-side after hydration to prevent SSR/client mismatches
      if (typeof window === 'undefined') return

      // Always read from cookies on client-side to get the actual preference
      // This handles both cases: no initialLanguage provided OR Vercel SSR fallback
      const cookieLanguage = languageCookies.get()
      if (cookieLanguage !== language) {
        console.log('[LanguageProvider] Loading language from cookies:', cookieLanguage)
        setLanguageState(cookieLanguage)
        return
      }

      // Try to migrate from localStorage if this is the first load
      const migratedLanguage = languageCookies.migrateFromLocalStorage()
      if (migratedLanguage && migratedLanguage !== language) {
        console.log('[LanguageProvider] Migrated language from localStorage:', migratedLanguage)
        setLanguageState(migratedLanguage)
      }
    } catch (error) {
      console.warn('[LanguageProvider] Error during client-side initialization:', error)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle async user preference loading
  useEffect(() => {

    const loadUserPreferences = async () => {
      try {
        // Then check for user authentication and update from database (non-blocking)
        try {
          const { data: { user } } = await supabase.auth.getUser()

          if (user) {
            // User is authenticated - load from database in background
            const databaseLanguage = await loadUserLanguage()

            if (databaseLanguage && databaseLanguage !== language) {
              // Update language if database preference is different
              setLanguageState(databaseLanguage)
            }
          }
        } catch {
          // Silent error handling
        }
      } catch {
        // Keep the initial language set above on error
      }
    }

    loadUserPreferences()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for authentication state changes and reload language
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Load from database without blocking UI
        try {
          const databaseLanguage = await loadUserLanguage()
          if (databaseLanguage) {
            // Database language will update state automatically in loadUserLanguage
          }
        } catch {
          // Keep current language on error
        }
      } else if (event === 'SIGNED_OUT') {
        // Get language from cookie (already includes browser fallback logic)
        const cookieLanguage = languageCookies.get()
        setLanguageState(cookieLanguage)
      }
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Always render children - language now has immediate default value
  const value: LanguageContextType = {
    language,
    setLanguage,
    t
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