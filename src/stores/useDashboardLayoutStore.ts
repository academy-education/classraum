import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export interface DashboardCard {
  id: string
  visible: boolean
  order: number
  section: 'stats' | 'main' | 'performance'
}

export interface DashboardLayoutPreferences {
  cards: DashboardCard[]
  version: number
}

interface DashboardLayoutState {
  // Edit mode
  isEditMode: boolean

  // Cards configuration
  cards: DashboardCard[]

  // Loading states
  loading: boolean
  saving: boolean
  error: string | null

  // Actions
  setEditMode: (enabled: boolean) => void
  toggleCardVisibility: (cardId: string) => void
  reorderCards: (activeId: string, overId: string) => void
  fetchLayout: (userId: string) => Promise<void>
  saveLayout: (userId: string) => Promise<void>
  resetToDefault: () => void
}

const DEFAULT_CARDS: DashboardCard[] = [
  { id: 'stats-revenue', visible: true, order: 0, section: 'stats' },
  { id: 'stats-users', visible: true, order: 1, section: 'stats' },
  { id: 'stats-classrooms', visible: true, order: 2, section: 'stats' },
  { id: 'stats-sessions', visible: true, order: 3, section: 'stats' },
  { id: 'todays-sessions', visible: true, order: 0, section: 'main' },
  { id: 'recent-activity', visible: true, order: 1, section: 'main' },
  { id: 'classroom-rankings', visible: true, order: 0, section: 'performance' },
  { id: 'top-students', visible: true, order: 1, section: 'performance' },
  { id: 'bottom-students', visible: true, order: 2, section: 'performance' },
]

export const useDashboardLayoutStore = create<DashboardLayoutState>((set, get) => ({
  // Initial state
  isEditMode: false,
  cards: DEFAULT_CARDS,
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

  // Reorder cards (supports cross-section movement)
  reorderCards: (activeId, overId) => {
    const { cards } = get()

    const activeCard = cards.find(c => c.id === activeId)
    const overCard = cards.find(c => c.id === overId)

    if (!activeCard || !overCard) return

    const isSameSection = activeCard.section === overCard.section
    const targetSection = overCard.section

    if (isSameSection) {
      // Reorder within the same section
      const sectionCards = cards
        .filter(c => c.section === targetSection && c.visible)
        .sort((a, b) => a.order - b.order)

      const activeIndex = sectionCards.findIndex(c => c.id === activeId)
      const overIndex = sectionCards.findIndex(c => c.id === overId)

      if (activeIndex === -1 || overIndex === -1) return

      // Reorder
      const [movedCard] = sectionCards.splice(activeIndex, 1)
      sectionCards.splice(overIndex, 0, movedCard)

      // Update order numbers for this section
      const updatedCards = cards.map(card => {
        if (card.section !== targetSection) return card
        const newIndex = sectionCards.findIndex(c => c.id === card.id)
        if (newIndex === -1) return card
        return { ...card, order: newIndex }
      })

      set({ cards: updatedCards })
    } else {
      // Move to a different section
      const sourceSection = activeCard.section

      // Get cards in both sections
      const sourceSectionCards = cards
        .filter(c => c.section === sourceSection && c.visible && c.id !== activeId)
        .sort((a, b) => a.order - b.order)

      const targetSectionCards = cards
        .filter(c => c.section === targetSection && c.visible)
        .sort((a, b) => a.order - b.order)

      // Find where to insert in target section
      const overIndex = targetSectionCards.findIndex(c => c.id === overId)

      // Insert the moved card at the target position
      targetSectionCards.splice(overIndex, 0, { ...activeCard, section: targetSection })

      // Update all cards
      const updatedCards = cards.map(card => {
        if (card.id === activeId) {
          // Update the moved card's section and order
          const newOrder = targetSectionCards.findIndex(c => c.id === card.id)
          return { ...card, section: targetSection, order: newOrder >= 0 ? newOrder : 0 }
        }
        if (card.section === sourceSection && card.visible) {
          // Update orders in source section
          const newOrder = sourceSectionCards.findIndex(c => c.id === card.id)
          return { ...card, order: newOrder >= 0 ? newOrder : card.order }
        }
        if (card.section === targetSection && card.visible) {
          // Update orders in target section
          const newOrder = targetSectionCards.findIndex(c => c.id === card.id)
          return { ...card, order: newOrder >= 0 ? newOrder : card.order }
        }
        return card
      })

      set({ cards: updatedCards })
    }
  },

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

      if (data?.dashboard_layout?.cards) {
        set({ cards: data.dashboard_layout.cards, loading: false })
      } else {
        set({ cards: DEFAULT_CARDS, loading: false })
      }
    } catch (error) {
      console.error('Error fetching dashboard layout:', error)
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch layout',
        loading: false,
        cards: DEFAULT_CARDS
      })
    }
  },

  // Save layout to database
  saveLayout: async (userId) => {
    if (!userId) return

    const { cards } = get()
    set({ saving: true, error: null })

    try {
      const layoutData: DashboardLayoutPreferences = {
        cards,
        version: 1
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
  resetToDefault: () => set({ cards: DEFAULT_CARDS })
}))

// Helper to get cards by section, sorted by order
export const getCardsBySection = (cards: DashboardCard[], section: string) => {
  return cards
    .filter(c => c.section === section)
    .sort((a, b) => a.order - b.order)
}

// Helper to get visible cards by section
export const getVisibleCardsBySection = (cards: DashboardCard[], section: string) => {
  return getCardsBySection(cards, section).filter(c => c.visible)
}
