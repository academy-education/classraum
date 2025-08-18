import { useEffect, useCallback, useRef } from 'react'

// Hook for managing ARIA live regions
export function useAriaLiveRegion() {
  const liveRegionRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    // Create live region if it doesn't exist
    if (!liveRegionRef.current) {
      const liveRegion = document.createElement('div')
      liveRegion.setAttribute('aria-live', 'polite')
      liveRegion.setAttribute('aria-atomic', 'true')
      liveRegion.className = 'sr-only'
      liveRegion.id = 'live-region'
      document.body.appendChild(liveRegion)
      liveRegionRef.current = liveRegion
    }

    return () => {
      if (liveRegionRef.current && document.body.contains(liveRegionRef.current)) {
        document.body.removeChild(liveRegionRef.current)
      }
    }
  }, [])

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (liveRegionRef.current) {
      liveRegionRef.current.setAttribute('aria-live', priority)
      liveRegionRef.current.textContent = message
      
      // Clear after announcement to allow repeat announcements
      setTimeout(() => {
        if (liveRegionRef.current) {
          liveRegionRef.current.textContent = ''
        }
      }, 1000)
    }
  }, [])

  return { announce }
}

// Hook for managing reduced motion preferences
export function useReducedMotion() {
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false

  return prefersReducedMotion
}

// Hook for managing high contrast mode
export function useHighContrast() {
  const prefersHighContrast = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-contrast: high)').matches
    : false

  return prefersHighContrast
}

// Hook for managing focus indicators
export function useFocusVisible(elementRef: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    let hadKeyboardEvent = false

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.altKey || e.ctrlKey) return
      hadKeyboardEvent = true
    }

    const handlePointerDown = () => {
      hadKeyboardEvent = false
    }

    const handleFocus = () => {
      if (hadKeyboardEvent) {
        element.classList.add('focus-visible')
      }
    }

    const handleBlur = () => {
      element.classList.remove('focus-visible')
    }

    document.addEventListener('keydown', handleKeyDown, true)
    document.addEventListener('mousedown', handlePointerDown, true)
    document.addEventListener('pointerdown', handlePointerDown, true)
    element.addEventListener('focus', handleFocus, true)
    element.addEventListener('blur', handleBlur, true)

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
      document.removeEventListener('mousedown', handlePointerDown, true)
      document.removeEventListener('pointerdown', handlePointerDown, true)
      element.removeEventListener('focus', handleFocus, true)
      element.removeEventListener('blur', handleBlur, true)
    }
  }, [elementRef])
}

// Hook for managing skip links
export function useSkipLink() {
  const skipLinkRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Show skip link on Tab key
      if (event.key === 'Tab' && skipLinkRef.current) {
        skipLinkRef.current.style.transform = 'translateY(0)'
        skipLinkRef.current.style.opacity = '1'
      }
    }

    const handleBlur = () => {
      // Hide skip link when it loses focus
      if (skipLinkRef.current) {
        skipLinkRef.current.style.transform = 'translateY(-100%)'
        skipLinkRef.current.style.opacity = '0'
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    if (skipLinkRef.current) {
      skipLinkRef.current.addEventListener('blur', handleBlur)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (skipLinkRef.current) {
        skipLinkRef.current.removeEventListener('blur', handleBlur)
      }
    }
  }, [])

  return skipLinkRef
}

// Helper function to generate accessible IDs
export function useAccessibleId(prefix: string = 'accessible') {
  const idRef = useRef<string>(`${prefix}-${Math.random().toString(36).substr(2, 9)}`)
  return idRef.current
}

// Hook for managing aria-describedby relationships
export function useAriaDescribedBy(describedById?: string) {
  const elementRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element || !describedById) return

    const currentDescribedBy = element.getAttribute('aria-describedby')
    const newDescribedBy = currentDescribedBy 
      ? `${currentDescribedBy} ${describedById}`
      : describedById

    element.setAttribute('aria-describedby', newDescribedBy)

    return () => {
      if (element) {
        const currentValue = element.getAttribute('aria-describedby')
        if (currentValue) {
          const updatedValue = currentValue
            .split(' ')
            .filter(id => id !== describedById)
            .join(' ')
          
          if (updatedValue) {
            element.setAttribute('aria-describedby', updatedValue)
          } else {
            element.removeAttribute('aria-describedby')
          }
        }
      }
    }
  }, [describedById])

  return elementRef
}

// Hook for managing form validation announcements
export function useFormValidation() {
  const { announce } = useAriaLiveRegion()

  const announceError = useCallback((fieldName: string, errorMessage: string) => {
    announce(`${fieldName}: ${errorMessage}`, 'assertive')
  }, [announce])

  const announceSuccess = useCallback((message: string) => {
    announce(message, 'polite')
  }, [announce])

  return {
    announceError,
    announceSuccess
  }
}