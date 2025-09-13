"use client"

import { useAuth } from '@/contexts/AuthContext'
import { useMemo } from 'react'

export const usePageWithAuth = (requiredProp: 'academyId' | 'userId') => {
  const auth = useAuth()
  
  const value = useMemo(() => {
    const propValue = auth[requiredProp]
    
    if (!propValue) {
      throw new Error(`Missing ${requiredProp} in auth context`)
    }
    
    return { [requiredProp]: propValue, ...auth }
  }, [auth, requiredProp])
  
  return value
}