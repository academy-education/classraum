import { Capacitor } from '@capacitor/core'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar, Style } from '@capacitor/status-bar'
import { App, URLOpenListenerEvent } from '@capacitor/app'
import { Keyboard } from '@capacitor/keyboard'

// Check if we're running in a native app
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform()
}

// Get the current platform
export function getPlatform(): 'ios' | 'android' | 'web' {
  const platform = Capacitor.getPlatform()
  if (platform === 'ios') return 'ios'
  if (platform === 'android') return 'android'
  return 'web'
}

// Check if running on iOS native app
export function isIOSApp(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios'
}

// ============================================
// Splash Screen
// ============================================

export async function hideSplashScreen(): Promise<void> {
  if (!isNativeApp()) return

  try {
    await SplashScreen.hide({
      fadeOutDuration: 300,
    })
  } catch (error) {
    console.error('Error hiding splash screen:', error)
  }
}

export async function showSplashScreen(): Promise<void> {
  if (!isNativeApp()) return

  try {
    await SplashScreen.show({
      autoHide: false,
    })
  } catch (error) {
    console.error('Error showing splash screen:', error)
  }
}

// ============================================
// Status Bar
// ============================================

export type StatusBarStyle = 'light' | 'dark' | 'default'

export async function setStatusBarStyle(style: StatusBarStyle): Promise<void> {
  if (!isNativeApp()) return

  try {
    let statusStyle: Style
    switch (style) {
      case 'light':
        statusStyle = Style.Light // Light content (white icons) for dark backgrounds
        break
      case 'dark':
        statusStyle = Style.Dark // Dark content (black icons) for light backgrounds
        break
      default:
        statusStyle = Style.Default
    }
    await StatusBar.setStyle({ style: statusStyle })
  } catch (error) {
    console.error('Error setting status bar style:', error)
  }
}

export async function setStatusBarBackgroundColor(color: string): Promise<void> {
  if (!isNativeApp() || getPlatform() !== 'android') return

  try {
    await StatusBar.setBackgroundColor({ color })
  } catch (error) {
    console.error('Error setting status bar background:', error)
  }
}

export async function hideStatusBar(): Promise<void> {
  if (!isNativeApp()) return

  try {
    await StatusBar.hide()
  } catch (error) {
    console.error('Error hiding status bar:', error)
  }
}

export async function showStatusBar(): Promise<void> {
  if (!isNativeApp()) return

  try {
    await StatusBar.show()
  } catch (error) {
    console.error('Error showing status bar:', error)
  }
}

export async function setStatusBarOverlay(overlay: boolean): Promise<void> {
  if (!isNativeApp()) return

  try {
    await StatusBar.setOverlaysWebView({ overlay })
  } catch (error) {
    console.error('Error setting status bar overlay:', error)
  }
}

// ============================================
// Deep Linking
// ============================================

export interface DeepLinkData {
  path: string
  params: Record<string, string>
}

export function parseDeepLink(url: string): DeepLinkData | null {
  try {
    // Handle both custom scheme (classraum://) and universal links (https://app.classraum.com)
    let path: string
    let searchParams: URLSearchParams

    if (url.startsWith('classraum://')) {
      // Custom URL scheme: classraum://session/123
      const pathPart = url.replace('classraum://', '')
      const [pathOnly, query] = pathPart.split('?')
      path = '/' + pathOnly
      searchParams = new URLSearchParams(query || '')
    } else {
      // Universal link: https://app.classraum.com/mobile/session/123
      const urlObj = new URL(url)
      path = urlObj.pathname
      searchParams = urlObj.searchParams
    }

    // Convert search params to object
    const params: Record<string, string> = {}
    searchParams.forEach((value, key) => {
      params[key] = value
    })

    return { path, params }
  } catch (error) {
    console.error('Error parsing deep link:', error)
    return null
  }
}

export type DeepLinkHandler = (data: DeepLinkData) => void

export function setupDeepLinkListener(handler: DeepLinkHandler): () => void {
  if (!isNativeApp()) {
    return () => {}
  }

  const listener = App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
    console.log('Deep link received:', event.url)
    const data = parseDeepLink(event.url)
    if (data) {
      handler(data)
    }
  })

  // Return cleanup function
  return () => {
    listener.then(l => l.remove())
  }
}

// ============================================
// App Lifecycle
// ============================================

export interface AppLifecycleHandlers {
  onResume?: () => void
  onPause?: () => void
  onBackButton?: () => boolean // Return true to prevent default back behavior
}

export function setupAppLifecycleListeners(handlers: AppLifecycleHandlers): () => void {
  if (!isNativeApp()) {
    return () => {}
  }

  const listeners: Array<() => Promise<void>> = []

  // App resumed from background
  if (handlers.onResume) {
    App.addListener('appStateChange', (state) => {
      if (state.isActive) {
        handlers.onResume?.()
      } else {
        handlers.onPause?.()
      }
    }).then(listener => listeners.push(() => listener.remove()))
  }

  // Hardware back button (Android)
  if (handlers.onBackButton && getPlatform() === 'android') {
    App.addListener('backButton', () => {
      const handled = handlers.onBackButton?.()
      if (!handled) {
        // Default behavior - could exit app or go back
        App.exitApp()
      }
    }).then(listener => listeners.push(() => listener.remove()))
  }

  // Return cleanup function
  return () => {
    listeners.forEach(remove => remove())
  }
}

// Get app info
export async function getAppInfo(): Promise<{ name: string; id: string; version: string; build: string } | null> {
  if (!isNativeApp()) return null

  try {
    const info = await App.getInfo()
    return {
      name: info.name,
      id: info.id,
      version: info.version,
      build: info.build,
    }
  } catch (error) {
    console.error('Error getting app info:', error)
    return null
  }
}

// Exit the app (Android only)
export function exitApp(): void {
  if (isNativeApp() && getPlatform() === 'android') {
    App.exitApp()
  }
}

// ============================================
// Keyboard
// ============================================

export interface KeyboardHandlers {
  onShow?: (keyboardHeight: number) => void
  onHide?: () => void
}

export function setupKeyboardListeners(handlers: KeyboardHandlers): () => void {
  if (!isNativeApp()) {
    return () => {}
  }

  const listeners: Array<() => Promise<void>> = []

  if (handlers.onShow) {
    Keyboard.addListener('keyboardWillShow', (info) => {
      handlers.onShow?.(info.keyboardHeight)
    }).then(listener => listeners.push(() => listener.remove()))
  }

  if (handlers.onHide) {
    Keyboard.addListener('keyboardWillHide', () => {
      handlers.onHide?.()
    }).then(listener => listeners.push(() => listener.remove()))
  }

  return () => {
    listeners.forEach(remove => remove())
  }
}

export async function hideKeyboard(): Promise<void> {
  if (!isNativeApp()) return

  try {
    await Keyboard.hide()
  } catch (error) {
    console.error('Error hiding keyboard:', error)
  }
}

// ============================================
// Safe Area
// ============================================

export interface SafeAreaInsets {
  top: number
  bottom: number
  left: number
  right: number
}

export function getSafeAreaInsets(): SafeAreaInsets {
  if (typeof window === 'undefined') {
    return { top: 0, bottom: 0, left: 0, right: 0 }
  }

  const style = getComputedStyle(document.documentElement)

  return {
    top: parseInt(style.getPropertyValue('--safe-area-inset-top') || '0', 10),
    bottom: parseInt(style.getPropertyValue('--safe-area-inset-bottom') || '0', 10),
    left: parseInt(style.getPropertyValue('--safe-area-inset-left') || '0', 10),
    right: parseInt(style.getPropertyValue('--safe-area-inset-right') || '0', 10),
  }
}
