import Cookies from 'js-cookie'
import { SupportedLanguage } from '@/locales'

const LANGUAGE_COOKIE_NAME = 'classraum_language'

// Function to get the domain for cookie sharing across subdomains
const getCookieDomain = () => {
  if (typeof window === 'undefined') return undefined

  try {
    const hostname = window.location.hostname

    // Enhanced logging for production debugging
    const isProduction = process.env.NODE_ENV === 'production'
    const hasClassraumDomain = hostname.includes('classraum.com')

    if (isProduction || hasClassraumDomain) {
      console.debug('[Cookie] Domain detection:', { hostname, isProduction, hasClassraumDomain })
    }

    // For production domains, add leading dot for subdomain sharing
    // This handles both www.classraum.com and app.classraum.com
    if (isProduction || hasClassraumDomain) {
      // Special handling for Vercel preview deployments
      if (hostname.includes('vercel.app')) {
        console.debug('[Cookie] Vercel deployment detected, using undefined domain')
        return undefined
      }

      // Improved domain detection with fallback mechanism
      const parts = hostname.split('.')
      if (parts.length >= 2) {
        // Handle cases like app.classraum.com or classraum.com
        if (hostname.includes('classraum.com')) {
          console.debug('[Cookie] Using .classraum.com domain for cross-subdomain sharing')
          return '.classraum.com' // Explicitly set for production
        }

        // For other custom domains, extract base domain safely
        if (parts.length === 2) {
          // Domain like example.com
          const cookieDomain = `.${hostname}`
          console.debug('[Cookie] Using full domain for 2-part hostname:', cookieDomain)
          return cookieDomain
        } else if (parts.length >= 3) {
          // Domain like app.example.com or subdomain.app.example.com
          const baseDomain = parts.slice(-2).join('.')
          const cookieDomain = `.${baseDomain}`
          console.debug('[Cookie] Using computed domain for multi-part hostname:', cookieDomain)
          return cookieDomain
        }
      }
    }

    // For development (localhost), don't use domain
    console.debug('[Cookie] Development environment, using undefined domain')
    return undefined
  } catch (error) {
    console.warn('[Cookie] Error in domain detection:', error)
    return undefined
  }
}

const COOKIE_OPTIONS = {
  expires: 365, // 1 year
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  ...(typeof window !== 'undefined' && { domain: getCookieDomain() })
}

export const languageCookies = {
  // Get language from cookies with retry logic and enhanced debugging
  get(): SupportedLanguage {
    try {
      // Only run on client-side
      if (typeof window === 'undefined') {
          return 'korean'
      }

      // Try to get from cookies with retry logic for reliability
      let cookieValue: string | undefined
      let cookieAttempts = 0
      const maxCookieAttempts = 2

      while (cookieAttempts < maxCookieAttempts && !cookieValue) {
        try {
          cookieValue = Cookies.get(LANGUAGE_COOKIE_NAME)
          if (cookieValue) {
            console.debug('[languageCookies] Cookie read successful:', { value: cookieValue, attempt: cookieAttempts + 1 })
          }
        } catch (cookieError) {
          console.warn('[languageCookies] Cookie read error (attempt ' + (cookieAttempts + 1) + '):', cookieError)
        }
        cookieAttempts++

        // Small delay before retry if first attempt failed
        if (!cookieValue && cookieAttempts < maxCookieAttempts) {
          // Synchronous small delay for cookie reading
          const start = Date.now()
          while (Date.now() - start < 10) { /* 10ms delay */ }
        }
      }

      if (cookieValue && (cookieValue === 'english' || cookieValue === 'korean')) {
        console.debug('[languageCookies] Valid cookie value found:', cookieValue)
        return cookieValue as SupportedLanguage
      }

      // Log if cookie was found but invalid
      if (cookieValue) {
        console.warn('[languageCookies] Invalid cookie value found:', cookieValue)
      }

      // Enhanced browser language detection with regional support
      try {
        const browserLanguage = navigator.language?.toLowerCase()
        const browserLanguages = navigator.languages?.map(lang => lang.toLowerCase()) || [browserLanguage].filter(Boolean)

        console.debug('[languageCookies] Browser languages detected:', {
          primary: browserLanguage,
          all: browserLanguages
        })

        // Check for English variants in order of preference
        const englishVariants = ['en', 'en-us', 'en-gb', 'en-au', 'en-ca', 'en-nz', 'en-za']
        const koreanVariants = ['ko', 'ko-kr', 'ko-kp']

        // Find the best match from browser languages
        for (const lang of browserLanguages) {
          // Check for exact or partial English matches
          if (englishVariants.some(variant => lang === variant || lang.startsWith(variant + '-'))) {
            console.debug('[languageCookies] Detected English variant:', lang)
            return 'english'
          }

          // Check for exact or partial Korean matches
          if (koreanVariants.some(variant => lang === variant || lang.startsWith(variant + '-'))) {
            console.debug('[languageCookies] Detected Korean variant:', lang)
            return 'korean'
          }
        }

        // Fallback: check primary language for broader matches
        const primaryLang = browserLanguage?.split('-')[0] || ''
        if (primaryLang === 'en') {
          console.debug('[languageCookies] Using primary English fallback')
          return 'english'
        } else if (primaryLang === 'ko') {
          console.debug('[languageCookies] Using primary Korean fallback')
          return 'korean'
        }

        // Default fallback based on common patterns
        console.debug('[languageCookies] No specific language detected, using Korean default')
        return 'korean'
      } catch (browserError) {
        console.warn('[languageCookies] Error detecting browser language:', browserError)
        return 'korean'
      }
    } catch (error) {
      console.warn('[languageCookies] Error in get():', error)
      return 'korean'
    }
  },

  // Set language cookie with enhanced reliability and verification
  set(language: SupportedLanguage): void {
    try {
      // Only run on client-side
      if (typeof window === 'undefined') {
        console.debug('[languageCookies] Skipping cookie set on server-side')
        return
      }

      // Validate language input
      if (language !== 'english' && language !== 'korean') {
        console.warn('[languageCookies] Invalid language value:', language)
        return
      }

      const domain = getCookieDomain()
      const cookieOptions = {
        ...COOKIE_OPTIONS,
        domain
      }

      console.debug('[languageCookies] Setting cookie:', { language, domain, options: cookieOptions })

      // Enhanced multi-attempt cookie setting with verification
      let cookieSetSuccess = false

      // Primary attempt with domain
      try {
        Cookies.set(LANGUAGE_COOKIE_NAME, language, cookieOptions)

        // Immediate verification
        const immediateCheck = Cookies.get(LANGUAGE_COOKIE_NAME)
        if (immediateCheck === language) {
          cookieSetSuccess = true
          console.debug('[languageCookies] Cookie set successfully with domain:', language)
        }
      } catch (cookieError) {
        console.warn('[languageCookies] Error setting cookie with domain:', { domain, error: cookieError })
      }

      // Fallback attempt without domain if primary failed
      if (!cookieSetSuccess) {
        try {
          const fallbackOptions = {
            ...COOKIE_OPTIONS,
            domain: undefined
          }
          console.debug('[languageCookies] Attempting fallback without domain:', fallbackOptions)

          Cookies.set(LANGUAGE_COOKIE_NAME, language, fallbackOptions)

          // Immediate verification for fallback
          const fallbackCheck = Cookies.get(LANGUAGE_COOKIE_NAME)
          if (fallbackCheck === language) {
            cookieSetSuccess = true
            console.debug('[languageCookies] Fallback cookie set successfully:', language)
          }
        } catch (fallbackError) {
          console.error('[languageCookies] Failed to set cookie even without domain:', fallbackError)
        }
      }

      // Final verification with small delay for browser processing
      if (cookieSetSuccess) {
        setTimeout(() => {
          const finalVerification = Cookies.get(LANGUAGE_COOKIE_NAME)
          if (finalVerification !== language) {
            console.error('[languageCookies] Cookie lost after setting:', { expected: language, actual: finalVerification })
            // Attempt one more time with path-only approach
            try {
              Cookies.set(LANGUAGE_COOKIE_NAME, language, {
                expires: 365,
                path: '/',
                sameSite: 'lax'
              })
            } catch (error) {
              console.error('[languageCookies] Final retry attempt failed:', error)
            }
          }
        }, 100)
      }
    } catch (error) {
      console.warn('[languageCookies] Error in set():', error)
    }
  },

  // Remove language cookie
  remove(): void {
    try {
      // Only run on client-side
      if (typeof window === 'undefined') {
        return
      }
      Cookies.remove(LANGUAGE_COOKIE_NAME, {
        path: '/',
        domain: getCookieDomain()
      })
    } catch {
      // Silent fallback to avoid production issues
    }
  },

  // Server-safe cookie reading (for SSR)
  getServerSide(cookieString?: string): SupportedLanguage {
    try {
      if (!cookieString) {
        return 'korean'
      }

      // Parse cookie string manually for server-side
      const cookies = cookieString
        .split(';')
        .map(cookie => cookie.trim())
        .reduce((acc, cookie) => {
          const [name, value] = cookie.split('=')
          if (name && value) {
            acc[name] = decodeURIComponent(value)
          }
          return acc
        }, {} as Record<string, string>)

      const languageValue = cookies[LANGUAGE_COOKIE_NAME]

      if (languageValue && (languageValue === 'english' || languageValue === 'korean')) {
        return languageValue as SupportedLanguage
      }

      return 'korean'
    } catch {
      // Silent fallback to avoid production issues
      return 'korean'
    }
  }
}