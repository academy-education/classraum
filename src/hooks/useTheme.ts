import { useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { useGlobalStore } from '@/stores/useGlobalStore'

export type Theme = 'light' | 'dark' | 'system'

/** Dark mode is temporarily DISABLED app-wide while we finish a
 *  consistency/UI pass — the dark palette has drifted across surfaces.
 *  Flip this back to true (and remove the boot-script neutralization in
 *  app/layout.tsx) to restore the theme picker's effect. The picker in
 *  profile is hidden while this is false so users aren't offered a
 *  no-op control. */
export const DARK_MODE_ENABLED = false

/** Dark mode is scoped to the /mobile app surfaces — marketing pages
 *  and the dashboard always render light (they haven't had a dark
 *  visual pass). Keep in sync with the boot script in app/layout.tsx. */
const darkAllowed = (pathname: string | null) => !!pathname?.startsWith('/mobile')

export function useTheme() {
  const { theme, setTheme } = useGlobalStore()
  const pathname = usePathname()

  // Apply theme to document. Tailwind's dark variant is class-based
  // (`&:is(.dark *)`), so the `.dark` class on <html> is what actually
  // switches the palette — data-theme is kept only as an inspectable
  // marker. The boot script in app/layout.tsx applies the same class
  // pre-paint from the persisted global-store value.
  useEffect(() => {
    const root = document.documentElement
    const wantsDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    const isDark = DARK_MODE_ENABLED && wantsDark && darkAllowed(pathname)
    root.classList.toggle('dark', isDark)
    root.setAttribute('data-theme', theme)

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', isDark ? '#0e1116' : '#ffffff')
    }
  }, [theme, pathname])

  // Listen for system theme changes
  useEffect(() => {
    if (!DARK_MODE_ENABLED) return
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = () => {
      document.documentElement.classList.toggle('dark', mediaQuery.matches && darkAllowed(pathname))
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme, pathname])

  // Check if current effective theme is dark
  const isDarkMode = useCallback(() => {
    if (theme === 'dark') return true
    if (theme === 'light') return false
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  }, [theme])

  // Get effective theme (resolves 'system' to actual theme)
  const getEffectiveTheme = useCallback((): Exclude<Theme, 'system'> => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return theme as Exclude<Theme, 'system'>
  }, [theme])

  // Toggle between light and dark
  const toggleTheme = useCallback(() => {
    const currentEffective = getEffectiveTheme()
    setTheme(currentEffective === 'dark' ? 'light' : 'dark')
  }, [getEffectiveTheme, setTheme])

  // Check if user prefers reduced motion
  const prefersReducedMotion = useCallback(() => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  // Check if user prefers high contrast
  const prefersHighContrast = useCallback(() => {
    return window.matchMedia('(prefers-contrast: high)').matches
  }, [])

  // Auto-detect and set optimal theme based on user preferences
  const setOptimalTheme = useCallback(() => {
    if (prefersHighContrast()) {
      setTheme('dark')
    } else {
      setTheme('system')
    }
  }, [setTheme, prefersHighContrast])

  return {
    theme,
    setTheme,
    isDarkMode: isDarkMode(),
    effectiveTheme: getEffectiveTheme(),
    toggleTheme,
    prefersReducedMotion: prefersReducedMotion(),
    prefersHighContrast: prefersHighContrast(),
    setOptimalTheme
  }
}

// Hook for getting theme-aware CSS values
export function useThemeValues() {
  const { effectiveTheme } = useTheme()

  const getThemeValue = useCallback((cssVariable: string) => {
    if (typeof window === 'undefined') return ''
    
    const computedStyle = getComputedStyle(document.documentElement)
    return computedStyle.getPropertyValue(cssVariable).trim()
  }, [])

  // Common theme values
  const values = {
    bgPrimary: getThemeValue('--bg-primary'),
    bgSecondary: getThemeValue('--bg-secondary'),
    bgTertiary: getThemeValue('--bg-tertiary'),
    textPrimary: getThemeValue('--text-primary'),
    textSecondary: getThemeValue('--text-secondary'),
    textAccent: getThemeValue('--text-accent'),
    borderPrimary: getThemeValue('--border-primary'),
    borderAccent: getThemeValue('--border-accent'),
    interactivePrimary: getThemeValue('--interactive-primary'),
    shadowMd: getThemeValue('--shadow-md')
  }

  return {
    getThemeValue,
    values,
    effectiveTheme
  }
}