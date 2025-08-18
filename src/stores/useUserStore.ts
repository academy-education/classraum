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
          
          // Determine role and academy_id
          let role: User['role'] = 'student'
          let academy_id: string | undefined
          
          if (data.managers?.[0]) {
            role = 'manager'
            academy_id = data.managers[0].academy_id
          } else if (data.teachers?.[0]) {
            role = 'teacher'
            academy_id = data.teachers[0].academy_id
          } else if (data.parents?.[0]) {
            role = 'parent'
            academy_id = data.parents[0].academy_id
          } else if (data.students?.[0]) {
            role = 'student'
            academy_id = data.students[0].academy_id
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