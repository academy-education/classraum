"use client"

import React from 'react'
import { PerformanceDashboard } from '@/components/PerformanceDashboard'

export default function PerformancePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <PerformanceDashboard />
      </div>
    </div>
  )
}