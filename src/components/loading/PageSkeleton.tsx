"use client"

import React from 'react'

interface PageSkeletonProps {
  showHeader?: boolean
  showStats?: boolean
  showTable?: boolean
  showCards?: boolean
  rows?: number
}

export const PageSkeleton: React.FC<PageSkeletonProps> = ({
  showHeader = true,
  showStats = false,
  showTable = false,
  showCards = false,
  rows = 5
}) => {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* Header Section */}
      {showHeader && (
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="h-4 bg-gray-200 rounded w-96"></div>
          </div>
          <div className="h-10 bg-gray-200 rounded w-32"></div>
        </div>
      )}

      {/* Stats Cards */}
      {showStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-8 bg-gray-200 rounded w-16"></div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-16 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table Skeleton */}
      {showTable && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="p-6">
            <div className="space-y-4">
              {/* Table Header */}
              <div className="grid grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-4 bg-gray-200 rounded"></div>
                ))}
              </div>
              
              {/* Table Rows */}
              {Array.from({ length: rows }).map((_, rowIndex) => (
                <div key={rowIndex} className="grid grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, colIndex) => (
                    <div key={colIndex} className="h-6 bg-gray-100 rounded"></div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Cards Skeleton */}
      {showCards && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
              <div className="space-y-4">
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-100 rounded"></div>
                  <div className="h-4 bg-gray-100 rounded w-5/6"></div>
                  <div className="h-4 bg-gray-100 rounded w-4/6"></div>
                </div>
                <div className="flex space-x-2">
                  <div className="h-8 bg-gray-200 rounded w-20"></div>
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}