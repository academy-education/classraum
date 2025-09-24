"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
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
  const [isHydrated, setIsHydrated] = useState(false)

  // Use unified auth context
  const { user, isInitialized } = useAuth()

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

  // Load user's language preference from database with caching
  const loadUserLanguage = async (userId?: string): Promise<SupportedLanguage | null> => {
    try {
      if (!userId) {
        return null
      }

      // First, try to get existing preferences
      const { data: existingPreferences, error: preferencesError } = await supabase
        .from('user_preferences')
        .select('language')
        .eq('user_id', userId)
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
                user_id: userId,
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
      if (user?.id) {
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
      // If no user is logged in, that's fine - we still have cookies
    } catch {
      // Even if database update fails, local state and cookies should still work
    }
  }

  // Handle client-side initialization with enhanced debugging
  useEffect(() => {
    try {
      // Only run on client-side after hydration to prevent SSR/client mismatches
      if (typeof window === 'undefined') return

      // Mark as hydrated to prevent hydration mismatches
      setIsHydrated(true)

      // Enhanced debugging for production cookie transfer issues
      const hostname = window.location.hostname
      const isProduction = process.env.NODE_ENV === 'production'
      const hasClassraumDomain = hostname.includes('classraum.com')

      console.debug('[LanguageProvider] Client-side initialization:', {
        hostname,
        isProduction,
        hasClassraumDomain,
        currentLanguage: language,
        initialLanguage,
        isHydrated: true
      })

      // Only update language from cookies after hydration to prevent flashing
      // Use requestAnimationFrame to ensure this runs after React has finished hydrating
      requestAnimationFrame(() => {
        const cookieLanguage = languageCookies.get()

        console.debug('[LanguageProvider] Cookie language check:', {
          cookieLanguage,
          currentLanguage: language,
          willUpdate: cookieLanguage !== language
        })

        // Only update if there's a meaningful difference and we're not already using the cookie language
        if (cookieLanguage !== language && cookieLanguage !== initialLanguage) {
          console.log('[LanguageProvider] Loading language from cookies after hydration:', {
            from: language,
            to: cookieLanguage,
            hostname,
            isProduction
          })
          setLanguageState(cookieLanguage)
        } else {
          console.debug('[LanguageProvider] Cookie language matches current state, no update needed')
        }
      })
    } catch (error) {
      console.warn('[LanguageProvider] Error during client-side initialization:', error)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle async user preference loading using unified auth
  useEffect(() => {
    let mounted = true

    const loadUserPreferences = async () => {
      if (!mounted || !isInitialized || !user?.id) return

      try {
        const databaseLanguage = await loadUserLanguage(user.id)

        if (databaseLanguage && databaseLanguage !== language && mounted) {
          // Update language if database preference is different
          setLanguageState(databaseLanguage)
        }
      } catch (error) {
        console.warn('[LanguageContext] Error loading user preferences:', error)
      }
    }

    loadUserPreferences()

    return () => {
      mounted = false
    }
  }, [user?.id, isInitialized, language]) // React to changes in auth state

  // Handle sign out to reset to cookie/URL language
  useEffect(() => {
    // When user is signed out, fall back to cookie/URL language
    if (isInitialized && !user) {
      console.log('[LanguageContext] User signed out, falling back to language preferences')

      // Check for URL parameter first
      let selectedLanguage: SupportedLanguage | null = null

      try {
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search)
          const langParam = urlParams.get('lang')

          if (langParam && (langParam === 'english' || langParam === 'korean')) {
            selectedLanguage = langParam as SupportedLanguage
            console.debug('[LanguageContext] Using URL parameter after sign out:', selectedLanguage)
          }
        }
      } catch (error) {
        console.warn('[LanguageContext] Error reading URL parameter:', error)
      }

      // Fall back to cookie if no URL parameter
      if (!selectedLanguage) {
        selectedLanguage = languageCookies.get()
        console.debug('[LanguageContext] Using cookie language after sign out:', selectedLanguage)
      }

      setLanguageState(selectedLanguage)
    }
  }, [user, isInitialized])

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