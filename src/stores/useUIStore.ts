import { create } from 'zustand'

interface Toast {
  id: string
  title: string
  description?: string
  variant: 'default' | 'success' | 'warning' | 'destructive'
  duration?: number
}

interface Modal {
  id: string
  isOpen: boolean
  data?: Record<string, unknown>
}

interface UIState {
  // Sidebar
  sidebarCollapsed: boolean
  sidebarMobileOpen: boolean
  
  // Modals
  modals: Record<string, Modal>
  
  // Toasts
  toasts: Toast[]
  
  // Loading states
  globalLoading: boolean
  loadingMessage: string | null
  
  // Actions - Sidebar
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setSidebarMobileOpen: (open: boolean) => void
  
  // Actions - Modals
  openModal: (id: string, data?: Record<string, unknown>) => void
  closeModal: (id: string) => void
  closeAllModals: () => void
  
  // Actions - Toasts
  showToast: (toast: Omit<Toast, 'id'>) => void
  dismissToast: (id: string) => void
  clearToasts: () => void
  
  // Actions - Loading
  setGlobalLoading: (loading: boolean, message?: string | null) => void
}

export const useUIStore = create<UIState>((set) => ({
  // Initial state
  sidebarCollapsed: false,
  sidebarMobileOpen: false,
  modals: {},
  toasts: [],
  globalLoading: false,
  loadingMessage: null,

  // Sidebar actions
  toggleSidebar: () => set((state) => ({ 
    sidebarCollapsed: !state.sidebarCollapsed 
  })),
  
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  
  setSidebarMobileOpen: (open) => set({ sidebarMobileOpen: open }),

  // Modal actions
  openModal: (id, data) => set((state) => ({
    modals: {
      ...state.modals,
      [id]: { id, isOpen: true, data }
    }
  })),
  
  closeModal: (id) => set((state) => ({
    modals: {
      ...state.modals,
      [id]: { ...state.modals[id], isOpen: false }
    }
  })),
  
  closeAllModals: () => set((state) => {
    const closedModals: Record<string, Modal> = {}
    Object.keys(state.modals).forEach(id => {
      closedModals[id] = { ...state.modals[id], isOpen: false }
    })
    return { modals: closedModals }
  }),

  // Toast actions
  showToast: (toast) => set((state) => {
    const id = Math.random().toString(36).substring(7)
    const newToast = { ...toast, id }
    
    // Auto dismiss after duration (default 5s)
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter(t => t.id !== id)
      }))
    }, toast.duration || 5000)
    
    return { toasts: [...state.toasts, newToast] }
  }),
  
  dismissToast: (id) => set((state) => ({
    toasts: state.toasts.filter(t => t.id !== id)
  })),
  
  clearToasts: () => set({ toasts: [] }),

  // Loading actions
  setGlobalLoading: (loading, message = null) => set({
    globalLoading: loading,
    loadingMessage: message
  })
}))

// Utility functions for common UI operations
export const showSuccessToast = (title: string, description?: string) => {
  useUIStore.getState().showToast({
    title,
    description,
    variant: 'success'
  })
}

export const showErrorToast = (title: string, description?: string) => {
  useUIStore.getState().showToast({
    title,
    description,
    variant: 'destructive'
  })
}

export const showWarningToast = (title: string, description?: string) => {
  useUIStore.getState().showToast({
    title,
    description,
    variant: 'warning'
  })
}