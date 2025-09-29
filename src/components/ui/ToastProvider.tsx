"use client"

import React from 'react'
import { useUIStore } from '@/stores'
import { Alert, AlertTitle, AlertDescription } from './Alert'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export const ToastProvider: React.FC = () => {
  const { toasts, dismissToast } = useUIStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto animate-in slide-in-from-bottom-2 fade-in duration-300"
        >
          <Alert
            variant={toast.variant}
            className={cn(
              "min-w-[300px] max-w-[500px] shadow-lg",
              "relative pr-10"
            )}
          >
            {toast.title && <AlertTitle>{toast.title}</AlertTitle>}
            {toast.description && (
              <AlertDescription>{toast.description}</AlertDescription>
            )}
            <button
              onClick={() => dismissToast(toast.id)}
              className="absolute top-2 right-2 opacity-70 hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
          </Alert>
        </div>
      ))}
    </div>
  )
}