"use client"

import { useParams } from 'next/navigation'
import { useMemo } from 'react'

/**
 * Safe params hook that ensures compatibility with Next.js 15 read-only params
 * This prevents the "Cannot assign to read only property 'params'" error
 */
export function useSafeParams() {
  const params = useParams()
  
  // Create a safe copy of params to avoid read-only issues
  const safeParams = useMemo(() => {
    if (!params) return {}
    
    try {
      // Create a new object with the same properties but without read-only restrictions
      const safeParamsObj: Record<string, string> = {}
      
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          safeParamsObj[key] = String(value)
        }
      }
      
      return safeParamsObj
    } catch (error) {
      console.warn('Error creating safe params:', error)
      return {}
    }
  }, [params])
  
  return safeParams
}