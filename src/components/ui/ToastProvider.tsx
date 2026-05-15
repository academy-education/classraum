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
    <div className="fixed left-1/2 -translate-x-1/2 md:left-auto md:right-4 md:translate-x-0 z-[300] flex flex-col gap-2 pointer-events-none w-[calc(100%-2rem)] md:w-auto" style={{ top: `calc(var(--safe-area-top, 0px) + 1rem)` }}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "pointer-events-auto duration-300",
            toast.isLeaving
              ? "animate-out fade-out slide-out-to-right-2"
              : "animate-in slide-in-from-bottom-2 fade-in"
          )}
        >
          <Alert
            variant={toast.variant}
            className={cn(
              "md:min-w-[300px] max-w-[500px] shadow-lg",
              "relative pr-10"
            )}
          >
            {toast.title && <AlertTitle>{toast.title}</AlertTitle>}
            {toast.description && (
              <AlertDescription>{toast.description}</AlertDescription>
            )}
            {toast.action && (
              <button
                onClick={() => {
                  toast.action!.onClick()
                  dismissToast(toast.id)
                }}
                className="mt-2 text-sm font-semibold underline underline-offset-2 hover:opacity-80 transition-opacity"
              >
                {toast.action.label}
              </button>
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