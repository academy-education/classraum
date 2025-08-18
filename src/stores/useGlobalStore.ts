import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface GlobalState {
  // UI State
  sidebarCollapsed: boolean
  theme: 'light' | 'dark' | 'system'
  language: string
  
  // User State
  currentUser: any | null
  currentAcademy: any | null
  permissions: string[]
  
  // App State
  isLoading: boolean
  notifications: Array<{
    id: string
    type: 'success' | 'error' | 'warning' | 'info'
    message: string
    timestamp: number
  }>
  
  // Actions
  setSidebarCollapsed: (collapsed: boolean) => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  setLanguage: (language: string) => void
  setCurrentUser: (user: any) => void
  setCurrentAcademy: (academy: any) => void
  setPermissions: (permissions: string[]) => void
  setLoading: (loading: boolean) => void
  addNotification: (notification: Omit<GlobalState['notifications'][0], 'id' | 'timestamp'>) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
}

export const useGlobalStore = create<GlobalState>()(
  persist(
    (set, get) => ({
      // Initial state
      sidebarCollapsed: false,
      theme: 'system',
      language: 'en',
      currentUser: null,
      currentAcademy: null,
      permissions: [],
      isLoading: false,
      notifications: [],

      // Actions
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      
      setTheme: (theme) => set({ theme }),
      
      setLanguage: (language) => set({ language }),
      
      setCurrentUser: (user) => set({ currentUser: user }),
      
      setCurrentAcademy: (academy) => set({ currentAcademy: academy }),
      
      setPermissions: (permissions) => set({ permissions }),
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      addNotification: (notification) => {
        const newNotification = {
          ...notification,
          id: Math.random().toString(36).substr(2, 9),
          timestamp: Date.now()
        }
        set((state) => ({
          notifications: [...state.notifications, newNotification]
        }))
        
        // Auto-remove notification after 5 seconds
        setTimeout(() => {
          get().removeNotification(newNotification.id)
        }, 5000)
      },
      
      removeNotification: (id) => set((state) => ({
        notifications: state.notifications.filter(n => n.id !== id)
      })),
      
      clearNotifications: () => set({ notifications: [] })
    }),
    {
      name: 'global-store',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
        language: state.language
      })
    }
  )
)