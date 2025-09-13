"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Wifi, RefreshCw } from 'lucide-react'

interface NetworkErrorProps {
  onRetry?: () => void
  message?: string
}

export const NetworkError: React.FC<NetworkErrorProps> = ({
  onRetry,
  message = "Unable to connect to the server. Please check your internet connection and try again."
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <Wifi className="h-12 w-12 text-gray-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">Connection Problem</h3>
      <p className="text-gray-600 text-sm mb-6 max-w-md">{message}</p>
      
      {onRetry && (
        <Button onClick={onRetry} variant="default">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      )}
    </div>
  )
}