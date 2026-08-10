import { useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { useGlobalStore } from '@/stores/useGlobalStore'

export type Theme = 'light' | 'dark' | 'system'

/**
 * Dark mode is OFF everywhere. 2026-08-11.
 *
 * It used to be allowed on /mobile only. The ask was to disable it on
 * the auth page and across study mode and to hide the only control that
 * set it — the picker on /mobile/profile. Those three together leave no
 * coherent middle ground: /mobile/profile IS the sole mobile switch, and
 * the dashboard's Appearance select (settings-page.tsx) writes
 * user_preferences.theme but nothing ever applies it, because useTheme
 * is mounted only under /mobile. So a partial disable would strand any
 * account already persisted to 'dark' on the remaining non-study mobile
 * pages with no way to get back out. Off everywhere is the honest
 * version of what was asked for.
 *
 * Kept as a predicate rather than deleted so re-enabling is one line
 * here plus one in the boot script in app/layout.tsx — the two MUST
 * stay in sync, or a hard load paints dark before React removes it.
 *
 * The `.dark` styling itself is untouched: globals.css still carries the
 * token overrides and the ~85-rule utility remap. Nothing renders them
 * while this returns false.
 */
const darkAllowed = (_pathname: string | null) => false

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
    const isDark = wantsDark && darkAllowed(pathname)
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