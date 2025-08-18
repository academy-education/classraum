"use client"

import React, { useEffect } from 'react'
import { useUserStore, useAcademyStore } from '@/stores'

interface StoreProviderProps {
  children: React.ReactNode
  userId?: string
  academyId?: string
}

export const StoreProvider: React.FC<StoreProviderProps> = ({ 
  children, 
  userId, 
  academyId 
}) => {
  const { fetchUser } = useUserStore()
  const { fetchAcademy, fetchAcademyStats } = useAcademyStore()

  // Initialize user data
  useEffect(() => {
    if (userId) {
      fetchUser(userId)
    }
  }, [userId, fetchUser])

  // Initialize academy data
  useEffect(() => {
    if (academyId) {
      Promise.all([
        fetchAcademy(academyId),
        fetchAcademyStats(academyId)
      ])
    }
  }, [academyId, fetchAcademy, fetchAcademyStats])

  return <>{children}</>
}