"use client"

import React from 'react'
import { ErrorBoundary } from './ErrorBoundary'
import { Button } from '@/components/ui/button'
import { AlertTriangle, ArrowLeft, Home } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface RouteErrorBoundaryProps {
  children: React.ReactNode
  routeName?: string
}

export function RouteErrorBoundary({ children, routeName }: RouteErrorBoundaryProps) {
  const router = useRouter()

  const routeFallback = (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <AlertTriangle className="w-20 h-20 text-red-500" />
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Page Error
        </h1>
        
        <p className="text-gray-600 mb-8">
          {routeName 
            ? `There was an error loading the ${routeName} page. This might be a temporary issue.`
            : 'There was an error loading this page. This might be a temporary issue.'
          }
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button 
            onClick={() => router.back()} 
            variant="outline"
            className="flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
          
          <Button 
            onClick={() => router.push('/')}
            className="bg-primary text-white flex items-center"
          >
            <Home className="w-4 h-4 mr-2" />
            Go Home
          </Button>
        </div>

        <div className="mt-8 text-sm text-gray-500">
          <p>If this problem persists, please contact support.</p>
        </div>
      </div>
    </div>
  )

  return (
    <ErrorBoundary 
      fallback={routeFallback}
      onError={(error, errorInfo) => {
        console.error(`Route error in ${routeName || 'unknown route'}:`, error, errorInfo)
        
        // Report route-specific errors
        if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
          // window.Sentry?.captureException(error, {
          //   tags: { 
          //     component: 'RouteErrorBoundary',
          //     route: routeName || window.location.pathname
          //   },
          //   extra: errorInfo
          // })
        }
      }}
    >
      {children}
    </ErrorBoundary>
  )
}