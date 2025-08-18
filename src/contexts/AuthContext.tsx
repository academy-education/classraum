"use client"

import React, { createContext, useContext, ReactNode } from 'react'

interface AuthContextType {
  userId: string
  userName: string
  academyId: string
  isLoading?: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ 
  children, 
  userData 
}: { 
  children: ReactNode
  userData: AuthContextType | null 
}) {
  // Provide loading state when userData is not yet available
  const contextValue: AuthContextType = userData || {
    userId: '',
    userName: '',
    academyId: '',
    isLoading: true
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}