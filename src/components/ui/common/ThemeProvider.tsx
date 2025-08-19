"use client"

import React, { useEffect } from 'react'
import { useTheme, Theme } from '@/hooks/useTheme'

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: 'light' | 'dark' | 'system'
  enableColorSchemeChange?: boolean
}

export function ThemeProvider({ 
  children, 
  defaultTheme = 'system',
  enableColorSchemeChange = true 
}: ThemeProviderProps) {
  const { theme, setTheme, prefersHighContrast } = useTheme()

  // Initialize theme on mount
  useEffect(() => {
    // Only set default theme if no theme is currently set
    if (!theme) {
      // Auto-detect if user needs high contrast (use system theme for accessibility)
      if (prefersHighContrast) {
        setTheme('system')
      } else {
        setTheme(defaultTheme)
      }
    }
  }, [theme, setTheme, defaultTheme, prefersHighContrast])

  // Listen for system preference changes
  useEffect(() => {
    if (!enableColorSchemeChange) return

    const mediaQueries = [
      window.matchMedia('(prefers-color-scheme: dark)'),
      window.matchMedia('(prefers-contrast: high)'),
      window.matchMedia('(prefers-reduced-motion: reduce)')
    ]

    const handlePreferenceChange = () => {
      // If user has system theme, this will trigger a re-render
      if (theme === 'system') {
        const root = document.documentElement
        root.setAttribute('data-theme', 'system')
      }
      
      // Auto-switch to system theme for high contrast accessibility
      if (window.matchMedia('(prefers-contrast: high)').matches) {
        // High contrast is handled by system theme
      }
    }

    mediaQueries.forEach(mq => {
      mq.addEventListener('change', handlePreferenceChange)
    })

    return () => {
      mediaQueries.forEach(mq => {
        mq.removeEventListener('change', handlePreferenceChange)
      })
    }
  }, [theme, setTheme, enableColorSchemeChange])

  // Add theme class to body for global styles
  useEffect(() => {
    const body = document.body
    const themeClass = `theme-${theme}`
    
    // Remove all theme classes
    body.classList.remove('theme-light', 'theme-dark', 'theme-system')
    
    // Add current theme class
    body.classList.add(themeClass)
    
    return () => {
      body.classList.remove(themeClass)
    }
  }, [theme])

  return <>{children}</>
}

// Theme toggle button component
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  // Suppress unused variable warning
  // const { isDarkMode } would be unused

  const themes = [
    { value: 'light', label: 'Light', icon: '☀️' },
    { value: 'dark', label: 'Dark', icon: '🌙' },
    { value: 'system', label: 'System', icon: '💻' }
  ] as const

  return (
    <div className={`relative ${className}`}>
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value as Theme)}
        className="
          px-3 py-2 bg-primary border border-primary rounded-md text-primary
          focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent
          transition-colors duration-200
        "
        aria-label="Select theme"
      >
        {themes.map(({ value, label, icon }) => (
          <option key={value} value={value}>
            {icon} {label}
          </option>
        ))}
      </select>
    </div>
  )
}