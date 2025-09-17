"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { languages, getNestedValue, SupportedLanguage } from '@/locales'
import { languageCookies } from '@/lib/cookies'

interface LanguageContextType {
  language: SupportedLanguage
  setLanguage: (lang: SupportedLanguage) => Promise<void>
  t: (key: string, params?: Record<string, string | number | undefined>) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

interface LanguageProviderProps {
  children: ReactNode
  initialLanguage?: SupportedLanguage
}

export function LanguageProvider({ children, initialLanguage }: LanguageProviderProps) {
  // Use server-provided initial language or fallback to Korean
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
  const t = (key: string, params?: Record<string, string | number | undefined>): string => {
    // Use current language (now always defined)
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
  const loadUserLanguage = async (): Promise<SupportedLanguage | null> => {
    try {
      let user = null
      let authError = null

      try {
        const { data, error } = await supabase.auth.getUser()
        user = data?.user
        authError = error
      } catch {
        console.log('No auth session available during loadUserLanguage - this is normal on auth page')
        return null
      }

      if (authError) {
        console.log('Auth error while loading language (expected on auth page):', (authError as Error)?.message || 'Auth session missing')
        return null
      }

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

          // Get browser/system language preference with fallback
          let defaultLanguage: SupportedLanguage = 'korean'
          try {
            if (typeof window !== 'undefined') {
              const browserLanguage = navigator.language?.toLowerCase()
              if (browserLanguage?.includes('en')) {
                defaultLanguage = 'english'
              }
            }
          } catch (browserError) {
            console.warn('Error detecting browser language, using default:', browserError)
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
              console.error('Error creating default preferences:', insertError)
              return defaultLanguage // Return the language even if DB insert fails
            }

            preferences = newPreferences
            console.log('Created new preferences with language:', defaultLanguage)
          } catch (insertError) {
            console.error('Exception creating default preferences:', insertError)
            return defaultLanguage // Return the language even if DB insert fails
          }
        } else if (preferencesError) {
          console.error('Error fetching user preferences:', preferencesError)
          return null
        }

        if (preferences?.language) {
          const newLanguage = preferences.language as SupportedLanguage
          // Validate language value
          if (newLanguage !== 'english' && newLanguage !== 'korean') {
            console.warn('Invalid language in database, falling back to korean:', newLanguage)
            return 'korean'
          }

          console.log(`Setting language from database: ${newLanguage}`)
          setLanguageState(newLanguage)

          // Update cookie with database preference
          languageCookies.set(newLanguage)

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
      console.error('Unexpected error loading user language preference:', error)
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
        console.log('No auth session available during setLanguage - this is normal on auth page')
        authError = error
      }

      if (authError) {
        console.log('Auth error during setLanguage (expected on auth page):', (authError as Error)?.message || 'Auth session missing')
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
            console.log('No existing preferences found, creating new ones...')
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
              console.error('Error inserting new language preference:', insertError)
            } else {
              console.log('Successfully created new preferences with language:', newLanguage)
            }
          } else if (updateError) {
            console.error('Error updating language preference:', updateError)
          } else {
            console.log('Successfully updated language preference:', newLanguage)
          }
        } catch (dbError) {
          console.error('Database error during language update:', dbError)
        }
      }
      // If no user is logged in, that's fine - we still have localStorage
    } catch (error) {
      console.error('Unexpected error setting language:', error)
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
        console.log('Checking for user language preferences from database...')

        // Then check for user authentication and update from database (non-blocking)
        try {
          const { data: { user } } = await supabase.auth.getUser()

          if (user) {
            // User is authenticated - load from database in background
            console.log('User authenticated, loading language from database...')
            const databaseLanguage = await loadUserLanguage()

            if (databaseLanguage && databaseLanguage !== language) {
              // Update language if database preference is different
              setLanguageState(databaseLanguage)
              console.log(`Updated language from database: ${databaseLanguage}`)
            }
          }
        } catch {
          console.log('No auth session available during initialization - this is normal on auth page')
        }
      } catch (error) {
        console.error('Language initialization error:', error)
        // Keep the initial language set above on error
      }

      console.log('Language initialization complete')
    }

    loadUserPreferences()
  }, [])

  // Listen for authentication state changes and reload language
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id)

      if (event === 'SIGNED_IN' && session?.user) {
        console.log('User signed in, loading language from database in background...')

        // Load from database without blocking UI
        try {
          const databaseLanguage = await loadUserLanguage()
          if (databaseLanguage) {
            console.log(`Updated language from database after sign in: ${databaseLanguage}`)
            // Database language will update state automatically in loadUserLanguage
          }
        } catch (error) {
          console.error('Error loading language after sign in:', error)
          // Keep current language on error
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out, reverting to cookie/browser language')

        // Get language from cookie (already includes browser fallback logic)
        const cookieLanguage = languageCookies.get()
        setLanguageState(cookieLanguage)
        console.log(`Language reverted to cookie: ${cookieLanguage}`)
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