"use client"

import { useEffect, useCallback, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  isNativeApp,
  getPlatform,
  hideSplashScreen,
  setStatusBarStyle,
  setStatusBarBackgroundColor,
  setupDeepLinkListener,
  setupAppLifecycleListeners,
  parseDeepLink,
  type DeepLinkData,
  type StatusBarStyle,
} from '@/lib/nativeApp'

interface UseNativeAppOptions {
  // Called when app resumes from background
  onResume?: () => void
  // Called when app goes to background
  onPause?: () => void
  // Status bar style based on current route/theme
  statusBarStyle?: StatusBarStyle
  // Status bar background color (Android only)
  statusBarColor?: string
}

interface UseNativeAppReturn {
  isNative: boolean
  platform: 'ios' | 'android' | 'web'
}

export function useNativeApp(options: UseNativeAppOptions = {}): UseNativeAppReturn {
  const router = useRouter()
  const pathname = usePathname()
  const isNative = isNativeApp()
  const platform = getPlatform()

  // Track if we've hidden the splash screen
  const splashHidden = useRef(false)

  // Handle deep links
  const handleDeepLink = useCallback((data: DeepLinkData) => {
    console.log('Handling deep link:', data)

    const { path, params } = data

    // Map deep link paths to app routes
    // Custom scheme: classraum://session/123 -> /mobile/session/123
    // Universal link: /mobile/session/123 -> /mobile/session/123

    let targetPath = path

    // If using custom scheme, path might not have /mobile prefix
    if (!path.startsWith('/mobile') && !path.startsWith('/dashboard')) {
      // Determine if this should go to mobile or dashboard based on path
      const mobilePaths = ['session', 'assignment', 'assignments', 'schedule', 'messages', 'notifications', 'profile', 'reports', 'invoices']
      const firstSegment = path.split('/').filter(Boolean)[0]

      if (mobilePaths.includes(firstSegment)) {
        targetPath = '/mobile' + path
      }
    }

    // Build query string if there are params
    const queryString = Object.keys(params).length > 0
      ? '?' + new URLSearchParams(params).toString()
      : ''

    router.push(targetPath + queryString)
  }, [router])

  // Hide splash screen after initial render
  useEffect(() => {
    if (isNative && !splashHidden.current) {
      // Small delay to ensure the app content is ready
      const timer = setTimeout(() => {
        hideSplashScreen()
        splashHidden.current = true
      }, 100)

      return () => clearTimeout(timer)
    }
  }, [isNative])

  // Set up deep link listener
  useEffect(() => {
    if (!isNative) return

    const cleanup = setupDeepLinkListener(handleDeepLink)
    return cleanup
  }, [isNative, handleDeepLink])

  // Set up app lifecycle listeners
  useEffect(() => {
    if (!isNative) return

    const cleanup = setupAppLifecycleListeners({
      onResume: () => {
        console.log('App resumed')
        options.onResume?.()
      },
      onPause: () => {
        console.log('App paused')
        options.onPause?.()
      },
      onBackButton: () => {
        // Check if we can go back in history
        if (window.history.length > 1) {
          router.back()
          return true // Handled, don't exit app
        }
        return false // Not handled, will exit app
      },
    })

    return cleanup
  }, [isNative, options.onResume, options.onPause, router])

  // Update status bar based on options or route
  useEffect(() => {
    if (!isNative) return

    const style = options.statusBarStyle || 'dark'
    setStatusBarStyle(style)

    if (options.statusBarColor && platform === 'android') {
      setStatusBarBackgroundColor(options.statusBarColor)
    }
  }, [isNative, options.statusBarStyle, options.statusBarColor, platform])

  return {
    isNative,
    platform,
  }
}

// Hook specifically for deep link handling in route components
export function useDeepLinkParams(): Record<string, string> | null {
  const searchParams = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search)
    : null

  if (!searchParams) return null

  const params: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    params[key] = value
  })

  return Object.keys(params).length > 0 ? params : null
}
