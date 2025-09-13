"use client"

import React from 'react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  className?: string
}

const sizeVariants = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12'
}

export const LoadingSpinner = React.memo<LoadingSpinnerProps>(function LoadingSpinner({ 
  size = 'md', 
  text, 
  className = '' 
}) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`animate-spin rounded-full border-b-2 border-blue-600 ${sizeVariants[size]}`}></div>
      {text && <span className="ml-2 text-gray-600">{text}</span>}
    </div>
  )
})