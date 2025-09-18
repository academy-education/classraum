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
  // Initialize with cookie value immediately to prevent translation timing issues
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    // Use initial language if provided (for SSR)
    if (initialLanguage) {
      return initialLanguage
    }
    // Only read cookies on client-side during initialization
    if (typeof window !== 'undefined') {
      return languageCookies.get()
    }
    return 'korean' // Server-side fallback
  })

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
            } catch (browserError) {
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
          } catch (insertError) {
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
    } catch (error) {
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
        } catch (dbError) {
          // Silent error handling
        }
      }
      // If no user is logged in, that's fine - we still have localStorage
    } catch (error) {
      // Even if database update fails, local state and localStorage should still work
    }
  }

  // Handle localStorage migration on client-side (only once)
  useEffect(() => {
    // Try to migrate from localStorage if this is the first load
    languageCookies.migrateFromLocalStorage()
  }, [])

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
      } catch (error) {
        // Keep the initial language set above on error
      }
    }

    loadUserPreferences()
  }, [])

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
        } catch (error) {
          // Keep current language on error
        }
      } else if (event === 'SIGNED_OUT') {
        // Get language from cookie (already includes browser fallback logic)
        const cookieLanguage = languageCookies.get()
        setLanguageState(cookieLanguage)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

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