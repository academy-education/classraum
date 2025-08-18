"use client"

import React from 'react'

interface TableSkeletonProps {
  rows?: number
  columns?: number
  showHeader?: boolean
}

export const TableSkeleton = React.memo<TableSkeletonProps>(({ 
  rows = 5, 
  columns = 6,
  showHeader = true 
}) => {
  return (
    <div className="space-y-4">
      {/* Table Header Skeleton */}
      {showHeader && (
        <div className="border rounded-lg">
          <div className="grid grid-cols-6 gap-4 p-4 border-b bg-gray-50">
            {Array.from({ length: columns }).map((_, index) => (
              <div key={`header-${index}`} className="h-4 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </div>
      )}

      {/* Table Rows Skeleton */}
      <div className="border rounded-lg">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={`row-${rowIndex}`} className={`grid grid-cols-6 gap-4 p-4 ${rowIndex < rows - 1 ? 'border-b' : ''}`}>
            {Array.from({ length: columns }).map((_, colIndex) => {
              // Vary the skeleton widths for more realistic appearance
              const widths = ['w-full', 'w-3/4', 'w-1/2', 'w-2/3', 'w-1/3', 'w-1/4']
              const randomWidth = widths[Math.floor(Math.random() * widths.length)]
              
              return (
                <div key={`cell-${rowIndex}-${colIndex}`} className="space-y-2">
                  <div className={`h-4 bg-gray-200 rounded animate-pulse ${randomWidth}`} />
                  {/* Occasionally add a second line for variety */}
                  {Math.random() > 0.7 && (
                    <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Action buttons skeleton */}
      <div className="flex justify-between items-center">
        <div className="h-4 bg-gray-200 rounded animate-pulse w-32" />
        <div className="flex gap-2">
          <div className="h-8 bg-gray-200 rounded animate-pulse w-20" />
          <div className="h-8 bg-gray-200 rounded animate-pulse w-24" />
        </div>
      </div>
    </div>
  )
})