"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Shield, Home } from 'lucide-react'

interface PermissionErrorProps {
  onGoHome?: () => void
  message?: string
}

export const PermissionError: React.FC<PermissionErrorProps> = ({
  onGoHome,
  message = "You don't have permission to access this resource. Please contact your administrator if you believe this is an error."
}) => {
  const handleGoHome = () => {
    if (onGoHome) {
      onGoHome()
    } else {
      window.location.href = '/dashboard'
    }
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <Shield className="h-12 w-12 text-red-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
      <p className="text-gray-600 text-sm mb-6 max-w-md">{message}</p>
      
      <Button onClick={handleGoHome} variant="default">
        <Home className="w-4 h-4 mr-2" />
        Go to Dashboard
      </Button>
    </div>
  )
}