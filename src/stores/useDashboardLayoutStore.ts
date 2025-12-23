import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Layout, Layouts } from 'react-grid-layout'

export interface DashboardCard {
  id: string
  visible: boolean
  minW?: number
  minH?: number
  maxW?: number
  maxH?: number
}

export interface DashboardLayoutPreferences {
  cards: DashboardCard[]
  layouts: Layouts
  version: number
}

interface DashboardLayoutState {
  // Edit mode
  isEditMode: boolean

  // Cards configuration
  cards: DashboardCard[]

  // Grid layouts for different breakpoints
  layouts: Layouts

  // Loading states
  loading: boolean
  saving: boolean
  error: string | null

  // Actions
  setEditMode: (enabled: boolean) => void
  toggleCardVisibility: (cardId: string) => void
  updateLayouts: (layouts: Layouts) => void
  fetchLayout: (userId: string) => Promise<void>
  saveLayout: (userId: string) => Promise<void>
  resetToDefault: () => void
}

// Card definitions with size constraints (relaxed for free movement)
const DEFAULT_CARDS: DashboardCard[] = [
  { id: 'stats-revenue', visible: true, minW: 2, minH: 2 },
  { id: 'stats-users', visible: true, minW: 2, minH: 2 },
  { id: 'stats-classrooms', visible: true, minW: 2, minH: 2 },
  { id: 'stats-sessions', visible: true, minW: 2, minH: 2 },
  { id: 'todays-sessions', visible: true, minW: 3, minH: 3 },
  { id: 'recent-activity', visible: true, minW: 3, minH: 3 },
  { id: 'classroom-rankings', visible: true, minW: 3, minH: 3 },
  { id: 'top-students', visible: true, minW: 3, minH: 3 },
  { id: 'bottom-students', visible: true, minW: 3, minH: 3 },
]

// Default layouts for different breakpoints (12 column grid)
const DEFAULT_LAYOUTS: Layouts = {
  lg: [
    // Stats row - 4 cards, 3 cols each
    { i: 'stats-revenue', x: 0, y: 0, w: 3, h: 3 },
    { i: 'stats-users', x: 3, y: 0, w: 3, h: 3 },
    { i: 'stats-classrooms', x: 6, y: 0, w: 3, h: 3 },
    { i: 'stats-sessions', x: 9, y: 0, w: 3, h: 3 },
    // Main row - 2 cards, 6 cols each
    { i: 'todays-sessions', x: 0, y: 3, w: 6, h: 4 },
    { i: 'recent-activity', x: 6, y: 3, w: 6, h: 4 },
    // Performance row - 3 cards, 4 cols each
    { i: 'classroom-rankings', x: 0, y: 7, w: 4, h: 5 },
    { i: 'top-students', x: 4, y: 7, w: 4, h: 5 },
    { i: 'bottom-students', x: 8, y: 7, w: 4, h: 5 },
  ],
  md: [
    // Stats - 2 per row
    { i: 'stats-revenue', x: 0, y: 0, w: 5, h: 3 },
    { i: 'stats-users', x: 5, y: 0, w: 5, h: 3 },
    { i: 'stats-classrooms', x: 0, y: 3, w: 5, h: 3 },
    { i: 'stats-sessions', x: 5, y: 3, w: 5, h: 3 },
    // Main - full width each
    { i: 'todays-sessions', x: 0, y: 6, w: 5, h: 4 },
    { i: 'recent-activity', x: 5, y: 6, w: 5, h: 4 },
    // Performance - full width
    { i: 'classroom-rankings', x: 0, y: 10, w: 10, h: 5 },
    { i: 'top-students', x: 0, y: 15, w: 5, h: 5 },
    { i: 'bottom-students', x: 5, y: 15, w: 5, h: 5 },
  ],
  sm: [
    // All cards stacked
    { i: 'stats-revenue', x: 0, y: 0, w: 3, h: 3 },
    { i: 'stats-users', x: 3, y: 0, w: 3, h: 3 },
    { i: 'stats-classrooms', x: 0, y: 3, w: 3, h: 3 },
    { i: 'stats-sessions', x: 3, y: 3, w: 3, h: 3 },
    { i: 'todays-sessions', x: 0, y: 6, w: 6, h: 4 },
    { i: 'recent-activity', x: 0, y: 10, w: 6, h: 4 },
    { i: 'classroom-rankings', x: 0, y: 14, w: 6, h: 5 },
    { i: 'top-students', x: 0, y: 19, w: 6, h: 5 },
    { i: 'bottom-students', x: 0, y: 24, w: 6, h: 5 },
  ],
  xs: [
    // Single column
    { i: 'stats-revenue', x: 0, y: 0, w: 4, h: 3 },
    { i: 'stats-users', x: 0, y: 3, w: 4, h: 3 },
    { i: 'stats-classrooms', x: 0, y: 6, w: 4, h: 3 },
    { i: 'stats-sessions', x: 0, y: 9, w: 4, h: 3 },
    { i: 'todays-sessions', x: 0, y: 12, w: 4, h: 4 },
    { i: 'recent-activity', x: 0, y: 16, w: 4, h: 4 },
    { i: 'classroom-rankings', x: 0, y: 20, w: 4, h: 5 },
    { i: 'top-students', x: 0, y: 25, w: 4, h: 5 },
    { i: 'bottom-students', x: 0, y: 30, w: 4, h: 5 },
  ],
}

export const useDashboardLayoutStore = create<DashboardLayoutState>((set, get) => ({
  // Initial state
  isEditMode: false,
  cards: DEFAULT_CARDS,
  layouts: DEFAULT_LAYOUTS,
  loading: false,
  saving: false,
  error: null,

  // Toggle edit mode
  setEditMode: (enabled) => set({ isEditMode: enabled }),

  // Toggle card visibility
  toggleCardVisibility: (cardId) => set((state) => ({
    cards: state.cards.map(card =>
      card.id === cardId ? { ...card, visible: !card.visible } : card
    )
  })),

  // Update layouts (called when user drags/resizes)
  updateLayouts: (layouts) => set({ layouts }),

  // Fetch layout from database
  fetchLayout: async (userId) => {
    if (!userId) return

    set({ loading: true, error: null })

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('dashboard_layout')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (data?.dashboard_layout) {
        const { cards, layouts } = data.dashboard_layout
        set({
          cards: cards || DEFAULT_CARDS,
          layouts: layouts || DEFAULT_LAYOUTS,
          loading: false
        })
      } else {
        set({ cards: DEFAULT_CARDS, layouts: DEFAULT_LAYOUTS, loading: false })
      }
    } catch (error) {
      console.error('Error fetching dashboard layout:', error)
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch layout',
        loading: false,
        cards: DEFAULT_CARDS,
        layouts: DEFAULT_LAYOUTS
      })
    }
  },

  // Save layout to database
  saveLayout: async (userId) => {
    if (!userId) return

    const { cards, layouts } = get()
    set({ saving: true, error: null })

    try {
      const layoutData: DashboardLayoutPreferences = {
        cards,
        layouts,
        version: 2
      }

      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          dashboard_layout: layoutData,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })

      if (error) throw error

      set({ saving: false })
    } catch (error) {
      console.error('Error saving dashboard layout:', error)
      set({
        error: error instanceof Error ? error.message : 'Failed to save layout',
        saving: false
      })
    }
  },

  // Reset to default layout
  resetToDefault: () => set({ cards: DEFAULT_CARDS, layouts: DEFAULT_LAYOUTS })
}))

// Helper to get visible cards
export const getVisibleCards = (cards: DashboardCard[]) => {
  return cards.filter(c => c.visible)
}

// Helper to filter layouts by visible cards
export const getVisibleLayouts = (layouts: Layouts, cards: DashboardCard[]): Layouts => {
  const visibleIds = new Set(cards.filter(c => c.visible).map(c => c.id))
  const result: Layouts = {}

  for (const [breakpoint, layout] of Object.entries(layouts)) {
    result[breakpoint] = layout.filter(item => visibleIds.has(item.i))
  }

  return result
}
