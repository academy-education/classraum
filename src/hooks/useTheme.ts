import { useEffect, useCallback } from 'react'
import { useGlobalStore } from '@/stores/useGlobalStore'

export type Theme = 'light' | 'dark' | 'system' | 'high-contrast'

export function useTheme() {
  const { theme, setTheme } = useGlobalStore()

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement
    
    // Remove all theme classes first
    root.removeAttribute('data-theme')
    
    // Apply new theme
    root.setAttribute('data-theme', theme)
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (metaThemeColor) {
      const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      metaThemeColor.setAttribute('content', isDark ? '#1f2937' : '#ffffff')
    }
  }, [theme])

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = () => {
      // Trigger a re-render by updating the theme attribute
      const root = document.documentElement
      root.setAttribute('data-theme', 'system')
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

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
      setTheme('high-contrast')
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