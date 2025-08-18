"use client"

import React, { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

interface QueryProviderProps {
  children: React.ReactNode
}

export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Time in milliseconds before data is considered stale
            staleTime: 5 * 60 * 1000, // 5 minutes
            // Time in milliseconds before cache is garbage collected
            gcTime: 10 * 60 * 1000, // 10 minutes (was cacheTime in v4)
            // Retry failed requests 3 times with exponential backoff
            retry: (failureCount, error: any) => {
              if (error?.status === 404 || error?.status === 403) {
                return false
              }
              return failureCount < 3
            },
            // Refetch on window focus for fresh data
            refetchOnWindowFocus: true,
            // Refetch when network is restored
            refetchOnReconnect: true,
            // Don't refetch on mount if data exists and is fresh
            refetchOnMount: 'always',
          },
          mutations: {
            // Retry failed mutations once
            retry: 1,
            // Global error handling for mutations
            onError: (error: any) => {
              console.error('Mutation error:', error)
            },
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}