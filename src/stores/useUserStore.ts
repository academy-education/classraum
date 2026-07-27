import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { db } from '@/lib/supabase'

const USER_ROLES = ['admin', 'manager', 'teacher', 'parent', 'student'] as const
type UserRole = (typeof USER_ROLES)[number]

const isKnownRole = (value: string): value is UserRole =>
  (USER_ROLES as readonly string[]).includes(value)

interface User {
  id: string
  email: string
  name: string
  role: UserRole
  // users.created_at is nullable in the database.
  academy_id?: string
  created_at: string | null
}

interface UserPreferences {
  language: 'english' | 'korean'
  theme: 'light' | 'dark' | 'system'
  notifications: {
    email: boolean
    push: boolean
    sms: boolean
  }
  dashboardLayout: 'default' | 'compact' | 'detailed'
}

interface UserState {
  // User data
  user: User | null
  preferences: UserPreferences
  
  // Loading states
  loading: boolean
  error: string | null
  
  // Actions
  setUser: (user: User | null) => void
  setPreferences: (preferences: Partial<UserPreferences>) => void
  fetchUser: (userId: string) => Promise<void>
  updateUser: (updates: Partial<User>) => Promise<void>
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>
  clearUser: () => void
}

const defaultPreferences: UserPreferences = {
  language: 'english',
  theme: 'light',
  notifications: {
    email: true,
    push: true,
    sms: false
  },
  dashboardLayout: 'default'
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      preferences: defaultPreferences,
      loading: false,
      error: null,

      // Actions
      setUser: (user) => set({ user, error: null }),
      
      setPreferences: (preferences) => set((state) => ({
        preferences: { ...state.preferences, ...preferences }
      })),

      fetchUser: async (userId) => {
        set({ loading: true, error: null })
        
        try {
          const { data, error } = await db
            .from('users')
            .select(`
              id, email, name, role, created_at,
              managers(academy_id),
              teachers(academy_id),
              parents(academy_id),
              students(academy_id)
            `)
            .eq('id', userId)
            .single()

          if (error) throw error

          // managers/teachers/parents have user_id as their PRIMARY KEY, so
          // PostgREST embeds each as a single object (or null); students has
          // its own `id` PK, so it embeds as an array. Indexing [0] on the
          // object forms used to silently yield undefined, which made every
          // user resolve to 'student' with no academy_id. The typed client now
          // infers both shapes, so they are read directly and correctly.
          const managerJoin = data.managers
          const teacherJoin = data.teachers
          const parentJoin = data.parents
          const studentJoin = data.students[0]

          // Determine role and academy_id
          let role: User['role'] = 'student'
          let academy_id: string | undefined

          if (managerJoin) {
            role = 'manager'
            academy_id = managerJoin.academy_id
          } else if (teacherJoin) {
            role = 'teacher'
            academy_id = teacherJoin.academy_id
          } else if (parentJoin) {
            role = 'parent'
            academy_id = parentJoin.academy_id
          } else if (studentJoin) {
            role = 'student'
            academy_id = studentJoin.academy_id
          } else {
            // No join row: fall back to users.role, the default-surface
            // pointer. It is a plain text column in the database, so validate
            // it rather than asserting — an unrecognised value stays 'student'
            // (the least-privileged surface) instead of being trusted blindly.
            if (isKnownRole(data.role)) role = data.role
          }

          const user: User = {
            id: data.id,
            email: data.email,
            name: data.name,
            role,
            academy_id,
            created_at: data.created_at
          }
          
          set({ user, loading: false })
          
          // Load preferences from database or local storage
          const storedPrefs = localStorage.getItem(`user-prefs-${userId}`)
          if (storedPrefs) {
            set({ preferences: { ...defaultPreferences, ...JSON.parse(storedPrefs) } })
          }
        } catch (error) {
          console.error(`[useUserStore] fetchUser failed for user ${userId}:`, error)
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch user',
            loading: false
          })
        }
      },

      updateUser: async (updates) => {
        const { user } = get()
        if (!user) return
        
        set({ loading: true, error: null })
        
        try {
          // Only forward columns that actually exist on `users`. `academy_id`
          // is NOT one of them — it lives on the managers/teachers/parents/
          // students join rows — and `id`/`created_at` must never be rewritten.
          // Spreading `updates` wholesale sent academy_id to PostgREST, which
          // rejects the whole statement, so any update carrying it failed.
          const payload: { name?: string; email?: string; role?: UserRole } = {}
          if (updates.name !== undefined) payload.name = updates.name
          if (updates.email !== undefined) payload.email = updates.email
          if (updates.role !== undefined) payload.role = updates.role

          if (Object.keys(payload).length > 0) {
            const { error } = await db
              .from('users')
              .update(payload)
              .eq('id', user.id)

            if (error) throw error
          }

          set({ 
            user: { ...user, ...updates },
            loading: false 
          })
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to update user',
            loading: false 
          })
        }
      },

      updatePreferences: async (updates) => {
        const { user, preferences } = get()
        const newPreferences = { ...preferences, ...updates }
        
        set({ preferences: newPreferences })
        
        // Save to local storage
        if (user) {
          localStorage.setItem(
            `user-prefs-${user.id}`,
            JSON.stringify(newPreferences)
          )
        }
      },

      clearUser: () => set({
        user: null,
        preferences: defaultPreferences,
        loading: false,
        error: null
      })
    }),
    {
      name: 'user-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        user: state.user
      }),
    }
  )
)