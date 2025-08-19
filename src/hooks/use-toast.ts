import { useCallback } from 'react'

export interface ToastProps {
  title?: string
  description?: string
  variant?: 'default' | 'destructive'
}

export function useToast() {
  const toast = useCallback(({ title, description, variant }: ToastProps) => {
    // Simple browser alert fallback - can be replaced with proper toast implementation
    const message = title ? `${title}${description ? '\n' + description : ''}` : description || ''
    
    if (variant === 'destructive') {
      console.error('Toast (Error):', message)
      alert(`Error: ${message}`)
    } else {
      console.log('Toast:', message)
      // For success messages, we could use a different approach or just log
      if (message) {
        // Show as alert for now - in a real app this would be a proper toast
        alert(message)
      }
    }
  }, [])

  return { toast }
}