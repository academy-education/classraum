"use client"

import React, { createContext, useContext, useEffect } from 'react'
import { useGlobalStore } from '@/stores/useGlobalStore'

interface StoreProviderProps {
  children: React.ReactNode
  initialUser?: any
  initialAcademy?: any
}

const StoreContext = createContext<{
  initializeStores: (user: any, academy: any) => void
} | null>(null)

export function StoreProvider({ children, initialUser, initialAcademy }: StoreProviderProps) {
  const { setCurrentUser, setCurrentAcademy, setPermissions } = useGlobalStore()

  const initializeStores = (user: any, academy: any) => {
    setCurrentUser(user)
    setCurrentAcademy(academy)
    
    // Set permissions based on user role
    if (user) {
      const permissions = getUserPermissions(user.role)
      setPermissions(permissions)
    }
  }

  useEffect(() => {
    if (initialUser && initialAcademy) {
      initializeStores(initialUser, initialAcademy)
    }
  }, [initialUser, initialAcademy])

  return (
    <StoreContext.Provider value={{ initializeStores }}>
      {children}
    </StoreContext.Provider>
  )
}

export const useStoreContext = () => {
  const context = useContext(StoreContext)
  if (!context) {
    throw new Error('useStoreContext must be used within a StoreProvider')
  }
  return context
}

function getUserPermissions(role: string): string[] {
  const permissionMap: Record<string, string[]> = {
    admin: [
      'read:all',
      'write:all',
      'delete:all',
      'manage:users',
      'manage:academy'
    ],
    teacher: [
      'read:classrooms',
      'write:classrooms',
      'read:students',
      'write:students',
      'read:assignments',
      'write:assignments',
      'read:attendance',
      'write:attendance'
    ],
    student: [
      'read:assignments',
      'write:submissions',
      'read:grades',
      'read:attendance'
    ],
    parent: [
      'read:student_progress',
      'read:assignments',
      'read:attendance',
      'read:payments'
    ]
  }

  return permissionMap[role] || []
}