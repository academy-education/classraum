import { create } from 'zustand'

interface ToastAction {
  /** Visible button label, e.g. "Undo" */
  label: string
  /** Click handler. After invocation the toast auto-dismisses. */
  onClick: () => void
}

interface Toast {
  id: string
  title?: string
  description?: string
  variant: 'default' | 'success' | 'warning' | 'destructive' | 'info'
  duration?: number
  /** Optional inline button (e.g. Undo for soft-delete). */
  action?: ToastAction
  /** Set true ~300ms before removal so the renderer can play an exit animation */
  isLeaving?: boolean
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
    const newToast = { ...toast, id, isLeaving: false }
    const duration = toast.duration || 5000
    const exitDuration = 300

    // Phase 1: flag the toast as leaving so the renderer plays the fade/slide-out
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.map(t => t.id === id ? { ...t, isLeaving: true } : t),
      }))
    }, Math.max(0, duration - exitDuration))

    // Phase 2: actually remove from the array after the animation completes
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter(t => t.id !== id),
      }))
    }, duration)

    return { toasts: [...state.toasts, newToast] }
  }),

  // Manual dismiss: also two-phase so the click-to-dismiss feels animated.
  dismissToast: (id) => {
    const exitDuration = 200
    set((state) => ({
      toasts: state.toasts.map(t => t.id === id ? { ...t, isLeaving: true } : t),
    }))
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter(t => t.id !== id),
      }))
    }, exitDuration)
  },
  
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

/**
 * Success toast with an inline action (typically "Undo" after a soft-delete).
 *
 * Default duration is 8s — longer than the standard toast so the user has
 * time to actually click Undo. `actionLabel` is required; omit by calling
 * `showSuccessToast` instead.
 */
export const showSuccessToastWithAction = (
  title: string,
  actionLabel: string,
  onAction: () => void,
  description?: string,
  duration = 8000,
) => {
  useUIStore.getState().showToast({
    title,
    description,
    variant: 'success',
    duration,
    action: { label: actionLabel, onClick: onAction },
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