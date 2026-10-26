"use client"
import { useEffect } from 'react'
import { isNativeApp, setStatusBarStyle } from '@/lib/nativeApp'

/**
 * Mounted once in the root layout. Every surface has a white top bar, so the
 * status bar needs black icons from the first screen. The (app), mobile and
 * admin shells already ask for them through useNativeApp, but the landing,
 * /auth and other root-level pages mount none of those and were left on the
 * native launch style, which drew white icons on white. Renders nothing.
 */
export function NativeStatusBar() {
  useEffect(() => {
    if (!isNativeApp()) return
    setStatusBarStyle('dark')
  }, [])
  return null
}
