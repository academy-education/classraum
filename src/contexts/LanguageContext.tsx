"use client"

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { languages, getNestedValue, SupportedLanguage } from '@/locales'
import { languageCookies } from '@/lib/cookies'

interface LanguageContextType {
  language: SupportedLanguage
  setLanguage: (lang: SupportedLanguage) => Promise<void>
  // Always returns a string. If a translation key resolves to an array
  // value (rare — only feature pages have these), the array is joined
  // with commas; callers that genuinely want the array should use tList.
  // Narrowing here cleans up ~58 `string | string[]` tsc errors at JSX
  // sites that pass t() into string-typed slots.
  t: (key: string, params?: Record<string, string | number | undefined>) => string
  // For the handful of translation keys that resolve to arrays (e.g.
  // payments.koreanWeekdays, features.*.benefits). Returns [] if the key
  // doesn't exist or doesn't resolve to an array. Element type is unknown
  // because some arrays hold objects ({ title, description }) and some
  // hold strings; callers cast to the shape they expect.
  tList: (key: string) => unknown[]
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

// useLayoutEffect fires before the browser paints — that's what lets the
// cookie language apply without a visible Korean→English flash — but React
// warns when it runs during SSR, so fall back to useEffect on the server
// (where it never fires anyway).
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? React.useLayoutEffect : useEffect

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

  // Translation function with parameter interpolation. Always returns a
  // string — array-valued keys are joined with commas as a defensive
  // fallback. Callers wanting the array should use tList instead.
  //
  // Wrapped in useCallback so the returned reference is stable across
  // renders (only changes when `language` flips). Without this, every
  // consumer that lists `t` in useEffect/useCallback deps would re-run
  // on every render — and the ESLint rule rightly warns about consumers
  // that DON'T list it (stale closures). Memoising at the source means
  // both kinds of consumers are correct.
  const t = useCallback((key: string, params?: Record<string, string | number | undefined>): string => {
    const translations = languages[language]
    const raw = getNestedValue(translations, key) || key
    let translation: string = Array.isArray(raw) ? raw.join(', ') : raw

    // Replace parameters in the translation string. Accept BOTH single
    // `{key}` and double `{{key}}` placeholder styles: some strings were
    // authored with `{{count}}` (i18next-style) but this interpolator only
    // handled `{count}`, so `{{count}}` rendered as a literal `{15}`.
    // Replace the double-brace form first so its inner braces don't survive.
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        if (paramValue !== undefined) {
          translation = translation
            .replace(new RegExp(`\\{\\{${paramKey}\\}\\}`, 'g'), String(paramValue))
            .replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue))
        }
      })
    }

    return translation
  }, [language])

  // Sibling of t() for keys that resolve to string arrays (weekday lists,
  // feature bullet lists, etc.). Returns [] when the key is missing or not
  // an array, so callers can map without an extra Array.isArray guard.
  // Memoised for the same reason as `t` above.
  const tList = useCallback((key: string): unknown[] => {
    const translations = languages[language]
    // getNestedValue's signature claims string | string[] but at runtime
    // arrays may also hold objects ({ title, description }). Read as
    // unknown and let the caller cast to its expected element shape.
    const raw = getNestedValue(translations, key) as unknown
    return Array.isArray(raw) ? raw : []
  }, [language])

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

  // Update language preference in database and state. Memoised so the
  // identity is stable across renders — see the same note on `t` above.
  const setLanguage = useCallback(async (newLanguage: SupportedLanguage) => {
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
  }, [user?.id])

  // Client-side language init — apply the cookie language BEFORE the first
  // paint. This used to run in useEffect + requestAnimationFrame, i.e. after
  // the browser had already painted the server default (Korean) at least
  // once, which produced the visible language flicker on every load for
  // English users. A pre-paint layout effect re-renders to the cookie
  // language within the same frame, so no wrong-language frame is shown.
  // (The server HTML itself stays on the default — reading cookies() in the
  // root layout is off-limits; see the note in app/layout.tsx.)
  useIsomorphicLayoutEffect(() => {
    try {
      setIsHydrated(true)
      const cookieLanguage = languageCookies.get()
      if (cookieLanguage === 'english' || cookieLanguage === 'korean') {
        setLanguageState(prev => (cookieLanguage !== prev ? cookieLanguage : prev))
      }
    } catch (error) {
      console.warn('[LanguageProvider] Error during client-side initialization:', error)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle async user preference loading using unified auth.
  //
  // IMPORTANT: this must run once per user session (login / auth-init),
  // NOT on every `language` change. `language` was previously in the dep
  // array, so toggling the language re-ran this effect, which re-read the
  // DB and — if the read raced ahead of the just-issued write — called
  // setLanguageState with the STALE value, flipping the UI back. That
  // flip re-triggered the effect, producing the multi-flicker on toggle.
  // We read the DB preference once and reconcile with a functional update
  // (no `language` closure needed), so a local toggle can't restart it.
  useEffect(() => {
    let mounted = true

    const loadUserPreferences = async () => {
      if (!mounted || !isInitialized || !user?.id) return

      try {
        const databaseLanguage = await loadUserLanguage(user.id)

        if (databaseLanguage && mounted) {
          // Reconcile against the CURRENT state via a functional update so
          // this never overwrites a newer value and doesn't depend on the
          // `language` closure (which would force this effect to re-run).
          setLanguageState(prev => (databaseLanguage !== prev ? databaseLanguage : prev))
        }
      } catch (error) {
        //console.warn('[LanguageContext] Error loading user preferences:', error)
      }
    }

    loadUserPreferences()

    return () => {
      mounted = false
    }
  }, [user?.id, isInitialized]) // eslint-disable-line react-hooks/exhaustive-deps -- load once per user, not per language change

  // Handle sign out to reset to cookie/URL language
  useEffect(() => {
    // When user is signed out, fall back to cookie/URL language
    if (isInitialized && !user) {
      //console.log('[LanguageContext] User signed out, falling back to language preferences')

      // Check for URL parameter first
      let selectedLanguage: SupportedLanguage | null = null

      try {
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search)
          const langParam = urlParams.get('lang')

          if (langParam && (langParam === 'english' || langParam === 'korean')) {
            selectedLanguage = langParam as SupportedLanguage
            //console.debug('[LanguageContext] Using URL parameter after sign out:', selectedLanguage)
          }
        }
      } catch (error) {
        //console.warn('[LanguageContext] Error reading URL parameter:', error)
      }

      // Fall back to cookie if no URL parameter
      if (!selectedLanguage) {
        selectedLanguage = languageCookies.get()
        //console.debug('[LanguageContext] Using cookie language after sign out:', selectedLanguage)
      }

      setLanguageState(selectedLanguage)
    }
  }, [user, isInitialized])

  // Memoise the context value so consumers using `useContext` only re-render
  // when one of the four fields actually changes. Without this, every
  // re-render of LanguageProvider (e.g. when `isHydrated` flips) would
  // create a new object reference and force-re-render every subscriber.
  const value: LanguageContextType = useMemo(
    () => ({ language, setLanguage, t, tList }),
    [language, setLanguage, t, tList]
  )

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