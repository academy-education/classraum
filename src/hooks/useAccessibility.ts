import { useId, useCallback, useRef } from 'react'

export function useAccessibleId(prefix?: string): string {
  const id = useId()
  return prefix ? `${prefix}-${id}` : id
}

export function useFormValidation() {
  const announceError = useCallback((fieldLabel: string, error: string) => {
    // Create a temporary element for screen reader announcement
    const announcement = document.createElement('div')
    announcement.setAttribute('aria-live', 'assertive')
    announcement.setAttribute('aria-atomic', 'true')
    announcement.className = 'sr-only'
    announcement.textContent = `Error in ${fieldLabel}: ${error}`
    
    document.body.appendChild(announcement)
    
    // Remove the announcement element after a brief delay
    setTimeout(() => {
      document.body.removeChild(announcement)
    }, 1000)
  }, [])

  return { announceError }
}

export function useSkipLink() {
  const skipLinkRef = useRef<HTMLAnchorElement>(null)

  return skipLinkRef
}