import Cookies from 'js-cookie'
import { SupportedLanguage } from '@/locales'

const LANGUAGE_COOKIE_NAME = 'classraum_language'

// Function to get the domain for cookie sharing across subdomains
const getCookieDomain = () => {
  if (typeof window === 'undefined') return undefined

  const hostname = window.location.hostname

  // For production domains, add leading dot for subdomain sharing
  // This handles both www.classraum.com and app.classraum.com
  if (process.env.NODE_ENV === 'production') {
    const parts = hostname.split('.')
    if (parts.length >= 2) {
      // Get last two parts (e.g., classraum.com from app.classraum.com)
      const baseDomain = parts.slice(-2).join('.')
      return `.${baseDomain}` // Leading dot allows all subdomains
    }
  }

  // For development (localhost), don't use domain - let URL parameters handle it
  return undefined
}

const COOKIE_OPTIONS = {
  expires: 365, // 1 year
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  ...(typeof window !== 'undefined' && { domain: getCookieDomain() })
}

export const languageCookies = {
  // Get language from cookies with fallback logic
  get(): SupportedLanguage {
    try {
      // Only run on client-side
      if (typeof window === 'undefined') {
        return 'korean'
      }

      // Try to get from cookies
      const cookieValue = Cookies.get(LANGUAGE_COOKIE_NAME)

      if (cookieValue && (cookieValue === 'english' || cookieValue === 'korean')) {
        return cookieValue as SupportedLanguage
      }

      // Fallback to browser language detection
      const browserLanguage = navigator.language?.toLowerCase()
      return browserLanguage?.includes('en') ? 'english' : 'korean'
    } catch (error) {
      // Silent fallback to avoid production issues
      return 'korean'
    }
  },

  // Set language cookie
  set(language: SupportedLanguage): void {
    try {
      // Only run on client-side
      if (typeof window === 'undefined') {
        return
      }

      const cookieOptions = {
        ...COOKIE_OPTIONS,
        domain: getCookieDomain()
      }

      Cookies.set(LANGUAGE_COOKIE_NAME, language, cookieOptions)
    } catch (error) {
      // Silent fallback to avoid production issues
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
    } catch (error) {
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
    } catch (error) {
      // Silent fallback to avoid production issues
      return 'korean'
    }
  },

  // Migration function to move from localStorage to cookies
  migrateFromLocalStorage(): SupportedLanguage | null {
    try {
      if (typeof window === 'undefined') return null

      const localStorageValue = localStorage.getItem('classraum_language')

      if (localStorageValue && (localStorageValue === 'english' || localStorageValue === 'korean')) {
        const language = localStorageValue as SupportedLanguage

        // Set the cookie with domain for cross-subdomain sharing
        this.set(language)

        // Remove from localStorage
        localStorage.removeItem('classraum_language')

        return language
      }

      return null
    } catch (error) {
      // Silent fallback to avoid production issues
      return null
    }
  }
}