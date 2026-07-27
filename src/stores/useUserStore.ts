import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'

interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'manager' | 'teacher' | 'parent' | 'student'
  academy_id?: string
  created_at: string
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
          const { data, error } = await supabase
            .from('users')
            .select(`
              *,
              managers(academy_id),
              teachers(academy_id),
              parents(academy_id),
              students(academy_id)
            `)
            .eq('id', userId)
            .single()

          if (error) throw error

          // PostgREST embeds managers/teachers/parents as a single object (their
          // PK *is* user_id) and students as an array. Indexing [0] on the
          // object forms silently yielded undefined, so every user resolved to
          // 'student' with no academy_id. Normalise both shapes.
          const firstJoin = (rel: unknown): { academy_id?: string } | undefined => {
            if (!rel) return undefined
            return Array.isArray(rel)
              ? (rel[0] as { academy_id?: string } | undefined)
              : (rel as { academy_id?: string })
          }

          // Determine role and academy_id
          let role: User['role'] = 'student'
          let academy_id: string | undefined

          const managerJoin = firstJoin(data.managers)
          const teacherJoin = firstJoin(data.teachers)
          const parentJoin = firstJoin(data.parents)
          const studentJoin = firstJoin(data.students)

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
          } else if (data.role) {
            // No join row: fall back to users.role, the default-surface pointer.
            role = data.role as User['role']
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
          const { error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', user.id)

          if (error) throw error
          
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