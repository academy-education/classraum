"use client"

import React, { createContext, useContext, useEffect } from 'react'
import { useGlobalStore } from '@/stores/useGlobalStore'

interface StoreProviderProps {
  children: React.ReactNode
  initialUser?: { id: string; role: string; name?: string; email?: string }
  initialAcademy?: { id: string; name?: string }
}

const StoreContext = createContext<{
  initializeStores: (user: { id: string; role: string; name?: string; email?: string }, academy: { id: string; name?: string }) => void
} | null>(null)

export function StoreProvider({ children, initialUser, initialAcademy }: StoreProviderProps) {
  const { setCurrentUser, setCurrentAcademy, setPermissions } = useGlobalStore()

  const initializeStores = React.useCallback((user: { id: string; role: string; name?: string; email?: string }, academy: { id: string; name?: string }) => {
    const fullUser = {
      id: user.id,
      email: user.email || '',
      name: user.name || '',
      role: user.role as 'admin' | 'instructor' | 'student',
      permissions: [],
      settings: {
        theme: 'system' as const,
        language: 'en',
        notifications: {
          email: true,
          push: true,
          inApp: true
        }
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    setCurrentUser(fullUser)
    
    const fullAcademy = {
      id: academy.id,
      name: academy.name || '',
      settings: {
        timezone: 'UTC',
        language: 'en',
        academicYear: {
          start: new Date().getFullYear() + '-09-01',
          end: (new Date().getFullYear() + 1) + '-06-30'
        },
        features: {
          grades: true,
          attendance: true,
          messaging: true,
          calendar: true
        }
      },
      subscription: {
        plan: 'free' as const,
        status: 'active' as const
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    setCurrentAcademy(fullAcademy)
    
    // Set permissions based on user role
    if (user) {
      const permissions = getUserPermissions(user.role)
      setPermissions(permissions)
    }
  }, [setCurrentUser, setCurrentAcademy, setPermissions])

  useEffect(() => {
    if (initialUser && initialAcademy) {
      initializeStores(initialUser, initialAcademy)
    }
  }, [initialUser, initialAcademy, initializeStores])

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