import { useCallback } from 'react'
import { useUIStore } from '@/stores/useUIStore'

export interface ToastProps {
  title?: string
  description?: string
  variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info'
  duration?: number
}

export function useToast() {
  const showToast = useUIStore(state => state.showToast)

  const toast = useCallback(({ title, description, variant = 'default', duration }: ToastProps) => {
    showToast({
      title,
      description,
      variant,
      duration
    })
  }, [showToast])

  return { toast }
}