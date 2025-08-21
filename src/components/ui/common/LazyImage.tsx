"use client"

import React, { useState, useRef, useEffect } from 'react'
import Image from 'next/image'

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt: string
  placeholder?: string
  fallback?: string
  className?: string
  threshold?: number
}

export function LazyImage({
  src,
  alt,
  placeholder,
  fallback,
  className = '',
  threshold = 0.1
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const [hasError, setHasError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { threshold }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [threshold])

  const handleLoad = () => {
    setIsLoaded(true)
  }

  const handleError = () => {
    setHasError(true)
  }

  const shouldShowImage = isInView && !hasError
  const imageSrc = hasError && fallback ? fallback : src

  return (
    <div ref={imgRef} className={`relative overflow-hidden ${className}`}>
      {!isLoaded && shouldShowImage && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
      
      {placeholder && !shouldShowImage && (
        <Image 
          src={placeholder} 
          alt=""
          className="w-full h-full object-cover"
          fill
        />
      )}
      
      {shouldShowImage && (
        <Image
          src={imageSrc}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={`
            w-full h-full object-cover transition-opacity duration-300
            ${isLoaded ? 'opacity-100' : 'opacity-0'}
          `}
          fill
        />
      )}
      
      {hasError && !fallback && (
        <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
          <span className="text-gray-500 text-sm">Failed to load</span>
        </div>
      )}
    </div>
  )
}