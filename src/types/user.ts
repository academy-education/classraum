export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  role: 'admin' | 'instructor' | 'student'
  academyId?: string
  permissions: string[]
  settings: {
    theme: 'light' | 'dark' | 'system'
    language: string
    notifications: {
      email: boolean
      push: boolean
      inApp: boolean
    }
  }
  createdAt: string
  updatedAt: string
  lastLogin?: string
}

export interface Academy {
  id: string
  name: string
  description?: string
  logo?: string
  settings: {
    timezone: string
    language: string
    academicYear: {
      start: string
      end: string
    }
    features: {
      grades: boolean
      attendance: boolean
      messaging: boolean
      calendar: boolean
    }
  }
  subscription: {
    plan: 'free' | 'basic' | 'premium' | 'enterprise'
    status: 'active' | 'inactive' | 'suspended'
    expiresAt?: string
  }
  createdAt: string
  updatedAt: string
}