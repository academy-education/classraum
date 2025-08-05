"use client"

import Image from "next/image"
import { useState, useEffect } from "react"

interface LoadingScreenProps {
  text?: string
  onComplete?: () => void
}

export function LoadingScreen({ text = "Loading...", onComplete }: LoadingScreenProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [isFadingOut, setIsFadingOut] = useState(false)

  useEffect(() => {
    console.log("LoadingScreen mounted")
    
    // Start fade out after 2.5 seconds
    const fadeTimer = setTimeout(() => {
      console.log("Starting fade out")
      setIsFadingOut(true)
    }, 2500)

    // Complete hiding after 3.5 seconds total (1000ms for fade animation)
    const completeTimer = setTimeout(() => {
      console.log("Completing loading screen")
      setIsVisible(false)
      if (onComplete) {
        onComplete()
      }
    }, 3500)

    return () => {
      console.log("LoadingScreen cleanup")
      clearTimeout(fadeTimer)
      clearTimeout(completeTimer)
    }
  }, [onComplete])

  if (!isVisible) {
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
        
      </div>
    </div>
  )
}