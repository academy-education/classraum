import { create } from 'zustand'
import { db } from '@/lib/supabase'
import type { Json } from '@/lib/database.types'
// react-grid-layout's bundled .d.ts exports `Layout` and `ResponsiveLayouts`
// (the latter is what older docs call `Layouts`). Alias here so the rest of
// the file can keep using the simpler name.
import type { LayoutItem, ResponsiveLayouts as Layouts } from 'react-grid-layout'

export interface DashboardCard {
  id: string
  visible: boolean
  minW?: number
  minH?: number
  maxW?: number
  maxH?: number
  // Optional grouping bucket used by CardVisibilityPanel to render cards
  // under labeled sections (e.g. "Performance", "Recent activity"). When
  // omitted, the panel falls back to a single ungrouped list.
  section?: string
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
// `section` is consumed by CardVisibilityPanel to group toggles. Without
// it, all cards collapse into the unrendered 'default' bucket and the panel
// shows up empty.
const DEFAULT_CARDS: DashboardCard[] = [
  { id: 'stats-revenue',     visible: true, minW: 2, minH: 2, section: 'stats' },
  { id: 'stats-users',       visible: true, minW: 2, minH: 2, section: 'stats' },
  { id: 'stats-classrooms',  visible: true, minW: 2, minH: 2, section: 'stats' },
  { id: 'stats-sessions',    visible: true, minW: 2, minH: 2, section: 'stats' },
  { id: 'todays-sessions',   visible: true, minW: 3, minH: 3, section: 'main' },
  { id: 'recent-activity',   visible: true, minW: 3, minH: 3, section: 'main' },
  { id: 'classroom-rankings', visible: true, minW: 3, minH: 3, section: 'performance' },
  { id: 'top-students',      visible: true, minW: 3, minH: 3, section: 'performance' },
  { id: 'bottom-students',   visible: true, minW: 3, minH: 3, section: 'performance' },
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

// ---------------------------------------------------------------------------
// jsonb <-> typed model bridge
//
// user_preferences.dashboard_layout is a `jsonb` column, so what crosses the
// wire is `Json` — structurally unrelated to DashboardLayoutPreferences.
// These functions are the ONLY bridge between the two. Everything written goes
// through cardsToJson/layoutsToJson; everything read back is validated by
// parseCards/parseLayouts. A field that is not named in both directions does
// not survive the round trip, which is deliberate: the alternative is trusting
// whatever shape happens to be sitting in the column.
// ---------------------------------------------------------------------------

type JsonObject = { [key: string]: Json | undefined }

const isJsonObject = (v: Json | undefined): v is JsonObject =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const asString = (v: Json | undefined): string | undefined =>
  typeof v === 'string' ? v : undefined
const asNumber = (v: Json | undefined): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? v : undefined
const asBoolean = (v: Json | undefined): boolean | undefined =>
  typeof v === 'boolean' ? v : undefined

function cardsToJson(cards: DashboardCard[]): Json {
  return cards.map((c): JsonObject => ({
    id: c.id,
    visible: c.visible,
    minW: c.minW,
    minH: c.minH,
    maxW: c.maxW,
    maxH: c.maxH,
    section: c.section,
  }))
}

function layoutsToJson(layouts: Layouts): Json {
  const out: JsonObject = {}
  for (const [breakpoint, items] of Object.entries(layouts)) {
    if (!items) continue
    out[breakpoint] = items.map((it): JsonObject => ({
      i: it.i,
      x: it.x,
      y: it.y,
      w: it.w,
      h: it.h,
      minW: it.minW,
      minH: it.minH,
      maxW: it.maxW,
      maxH: it.maxH,
      static: it.static,
    }))
  }
  return out
}

// Returns null when the stored value is not a usable card list, so the caller
// can fall back to DEFAULT_CARDS rather than render a broken dashboard.
function parseCards(value: Json | undefined): DashboardCard[] | null {
  if (!Array.isArray(value)) return null

  const cards: DashboardCard[] = []
  for (const raw of value) {
    if (!isJsonObject(raw)) return null
    const id = asString(raw.id)
    if (id === undefined) return null
    cards.push({
      id,
      // A stored card missing a boolean `visible` defaults to VISIBLE. The
      // opposite default would silently hide a card the user never hid.
      visible: asBoolean(raw.visible) ?? true,
      minW: asNumber(raw.minW),
      minH: asNumber(raw.minH),
      maxW: asNumber(raw.maxW),
      maxH: asNumber(raw.maxH),
      section: asString(raw.section),
    })
  }
  return cards
}

function parseLayouts(value: Json | undefined): Layouts | null {
  if (!isJsonObject(value)) return null

  const layouts: Layouts = {}
  for (const [breakpoint, items] of Object.entries(value)) {
    if (!Array.isArray(items)) return null

    const parsed: LayoutItem[] = []
    for (const raw of items) {
      if (!isJsonObject(raw)) return null
      const i = asString(raw.i)
      const x = asNumber(raw.x)
      const y = asNumber(raw.y)
      const w = asNumber(raw.w)
      const h = asNumber(raw.h)
      // i/x/y/w/h are required by react-grid-layout. Defaulting a missing one
      // to 0 would place the card on top of another; reject the whole stored
      // layout instead so the caller falls back to DEFAULT_LAYOUTS.
      if (
        i === undefined || x === undefined || y === undefined ||
        w === undefined || h === undefined
      ) {
        return null
      }
      parsed.push({
        i, x, y, w, h,
        minW: asNumber(raw.minW),
        minH: asNumber(raw.minH),
        maxW: asNumber(raw.maxW),
        maxH: asNumber(raw.maxH),
        static: asBoolean(raw.static),
      })
    }
    layouts[breakpoint] = parsed
  }
  return layouts
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
      const { data, error } = await db
        .from('user_preferences')
        .select('dashboard_layout')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      const stored = data?.dashboard_layout
      if (isJsonObject(stored)) {
        const cards = parseCards(stored.cards)
        const layouts = parseLayouts(stored.layouts)

        // Migrate stored card records that predate the `section` field —
        // overlay the canonical section by id from DEFAULT_CARDS so the
        // visibility panel groups them correctly without forcing the user
        // to reset their layout.
        const sectionById = new Map(DEFAULT_CARDS.map(c => [c.id, c.section]))
        const migratedCards: DashboardCard[] = (cards ?? DEFAULT_CARDS).map(c => ({
          ...c,
          section: c.section ?? sectionById.get(c.id),
        }))
        set({
          cards: migratedCards,
          layouts: layouts ?? DEFAULT_LAYOUTS,
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
      const { error } = await db
        .from('user_preferences')
        .upsert({
          user_id: userId,
          dashboard_layout: {
            cards: cardsToJson(cards),
            layouts: layoutsToJson(layouts),
            version: 2
          },
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
    // ResponsiveLayouts breakpoint values are typed as optional, so guard
    // before filtering. In practice non-empty entries are always defined.
    if (!layout) continue
    result[breakpoint] = layout.filter(item => visibleIds.has(item.i))
  }

  return result
}
