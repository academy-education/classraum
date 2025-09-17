import Cookies from 'js-cookie'
import { SupportedLanguage } from '@/locales'

const LANGUAGE_COOKIE_NAME = 'classraum_language'
const COOKIE_OPTIONS = {
  expires: 365, // 1 year
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/'
}

export const languageCookies = {
  // Get language from cookies with fallback logic
  get(): SupportedLanguage {
    try {
      // Only run on client-side
      if (typeof window === 'undefined') {
        return 'korean'
      }

      // Try to get from cookies first
      const cookieValue = Cookies.get(LANGUAGE_COOKIE_NAME)

      if (cookieValue && (cookieValue === 'english' || cookieValue === 'korean')) {
        return cookieValue as SupportedLanguage
      }

      // Fallback to browser language detection
      const browserLanguage = navigator.language?.toLowerCase()
      if (browserLanguage?.includes('en')) {
        return 'english'
      }

      // Default to Korean
      return 'korean'
    } catch (error) {
      console.warn('Error reading language cookie:', error)
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
      Cookies.set(LANGUAGE_COOKIE_NAME, language, COOKIE_OPTIONS)
    } catch (error) {
      console.warn('Error setting language cookie:', error)
    }
  },

  // Remove language cookie
  remove(): void {
    try {
      // Only run on client-side
      if (typeof window === 'undefined') {
        return
      }
      Cookies.remove(LANGUAGE_COOKIE_NAME, { path: '/' })
    } catch (error) {
      console.warn('Error removing language cookie:', error)
    }
  },

  // Server-safe cookie reading (for SSR)
  getServerSide(cookieString?: string): SupportedLanguage {
    try {
      if (!cookieString) return 'korean'

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
      console.warn('Error reading server-side language cookie:', error)
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

        // Set the cookie
        this.set(language)

        // Remove from localStorage
        localStorage.removeItem('classraum_language')

        console.log(`Migrated language preference from localStorage to cookie: ${language}`)
        return language
      }

      return null
    } catch (error) {
      console.warn('Error during localStorage to cookie migration:', error)
      return null
    }
  }
}