"use client"

import React from 'react'
import { useUIStore } from '@/stores'
import { Spinner } from './Spinner'

export const GlobalLoader: React.FC = () => {
  const { globalLoading, loadingMessage } = useUIStore()

  if (!globalLoading) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100]">
      <div className="bg-white rounded-lg p-6 shadow-xl flex flex-col items-center gap-4">
        <Spinner size="xl" />
        {loadingMessage && (
          <p className="text-sm text-gray-600">{loadingMessage}</p>
        )}
      </div>
    </div>
  )
}