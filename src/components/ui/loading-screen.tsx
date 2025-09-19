"use client"

import Image from "next/image"
import { useState, useEffect } from "react"

interface LoadingScreenProps {
  onComplete?: () => void
}

export function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [isFadingOut, setIsFadingOut] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [showTimeout, setShowTimeout] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    console.log("[LoadingScreen] Component mounted")

    // Only auto-hide if onComplete is provided (intentional loading screen)
    // Otherwise, keep showing for auth checks but with a safety timeout
    if (onComplete) {
      // Start fade out after 2.5 seconds
      const fadeTimer = setTimeout(() => {
        console.log("[LoadingScreen] Starting fade out")
        setIsFadingOut(true)
      }, 2500)

      // Complete hiding after 3.5 seconds total (1000ms for fade animation)
      const completeTimer = setTimeout(() => {
        console.log("[LoadingScreen] Completing loading screen")
        setIsVisible(false)
        onComplete()
      }, 3500)

      return () => {
        console.log("[LoadingScreen] Cleanup")
        clearTimeout(fadeTimer)
        clearTimeout(completeTimer)
      }
    } else {
      // For auth checks, show timeout message after 5 seconds
      const warningTimer = setTimeout(() => {
        console.log("[LoadingScreen] Showing timeout warning")
        setShowTimeout(true)
      }, 5000)

      // Add safety timeout at 8 seconds
      const safetyTimer = setTimeout(() => {
        console.log("[LoadingScreen] Safety timeout - hiding")
        setIsFadingOut(true)
        setTimeout(() => setIsVisible(false), 1000)
      }, 8000)

      return () => {
        clearTimeout(warningTimer)
        clearTimeout(safetyTimer)
      }
    }
  }, [onComplete])

  // Prevent hydration mismatch by not rendering until mounted
  if (!isMounted || !isVisible) {
    return null
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-background transition-opacity duration-1000 ${
        isFadingOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center space-y-6">
        {/* Logo */}
        <div className="relative">
          <Image
            src="/logo2.png"
            alt="Classraum Logo"
            width={128}
            height={128}
            className="w-32 h-32"
          />
          {/* Loading circle overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-40 h-40 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          </div>
        </div>

        {/* Timeout warning */}
        {showTimeout && (
          <div className="text-center space-y-2 px-4">
            <p className="text-sm text-muted-foreground">
              Connection is taking longer than expected...
            </p>
            <p className="text-xs text-muted-foreground">
              Please check your internet connection
            </p>
          </div>
        )}
      </div>
    </div>
  )
}