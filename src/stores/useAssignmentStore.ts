import { create } from 'zustand'
import type { Assignment, AssignmentCategory, Session } from '@/hooks/useAssignmentData'

interface AssignmentState {
  // Data
  assignments: Assignment[]
  categories: AssignmentCategory[]
  sessions: Session[]
  selectedAssignment: Assignment | null
  
  // Filters
  searchQuery: string
  typeFilter: string
  statusFilter: string
  categoryFilter: string
  sessionFilter: string
  
  // UI State
  isLoading: boolean
  showCreateModal: boolean
  showEditModal: boolean
  showSubmissionsModal: boolean
  showDeleteModal: boolean
  
  // Actions
  setAssignments: (assignments: Assignment[]) => void
  setCategories: (categories: AssignmentCategory[]) => void
  setSessions: (sessions: Session[]) => void
  setSelectedAssignment: (assignment: Assignment | null) => void
  
  // Filter actions
  setSearchQuery: (query: string) => void
  setTypeFilter: (type: string) => void
  setStatusFilter: (status: string) => void
  setCategoryFilter: (category: string) => void
  setSessionFilter: (session: string) => void
  clearFilters: () => void
  
  // UI actions
  setLoading: (loading: boolean) => void
  setShowCreateModal: (show: boolean) => void
  setShowEditModal: (show: boolean) => void
  setShowSubmissionsModal: (show: boolean) => void
  setShowDeleteModal: (show: boolean) => void
  
  // Computed getters
  getFilteredAssignments: () => Assignment[]
}

export const useAssignmentStore = create<AssignmentState>((set, get) => ({
  // Initial state
  assignments: [],
  categories: [],
  sessions: [],
  selectedAssignment: null,
  
  searchQuery: '',
  typeFilter: 'all',
  statusFilter: 'all',
  categoryFilter: 'all',
  sessionFilter: 'all',
  
  isLoading: false,
  showCreateModal: false,
  showEditModal: false,
  showSubmissionsModal: false,
  showDeleteModal: false,

  // Data actions
  setAssignments: (assignments) => set({ assignments }),
  setCategories: (categories) => set({ categories }),
  setSessions: (sessions) => set({ sessions }),
  setSelectedAssignment: (assignment) => set({ selectedAssignment: assignment }),

  // Filter actions
  setSearchQuery: (query) => set({ searchQuery: query }),
  setTypeFilter: (type) => set({ typeFilter: type }),
  setStatusFilter: (status) => set({ statusFilter: status }),
  setCategoryFilter: (category) => set({ categoryFilter: category }),
  setSessionFilter: (session) => set({ sessionFilter: session }),
  clearFilters: () => set({
    searchQuery: '',
    typeFilter: 'all',
    statusFilter: 'all',
    categoryFilter: 'all',
    sessionFilter: 'all'
  }),

  // UI actions
  setLoading: (loading) => set({ isLoading: loading }),
  setShowCreateModal: (show) => set({ showCreateModal: show }),
  setShowEditModal: (show) => set({ showEditModal: show }),
  setShowSubmissionsModal: (show) => set({ showSubmissionsModal: show }),
  setShowDeleteModal: (show) => set({ showDeleteModal: show }),

  // Computed getters
  getFilteredAssignments: () => {
    const state = get()
    const { assignments, searchQuery, typeFilter, statusFilter, categoryFilter, sessionFilter } = state
    
    return assignments.filter(assignment => {
      // Search filter
      const matchesSearch = !searchQuery || 
        assignment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        assignment.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        assignment.classroom_name?.toLowerCase().includes(searchQuery.toLowerCase())

      // Type filter
      const matchesType = typeFilter === 'all' || assignment.assignment_type === typeFilter

      // Category filter
      const matchesCategory = categoryFilter === 'all' || 
        (categoryFilter === 'none' && !assignment.assignment_categories_id) ||
        assignment.assignment_categories_id === categoryFilter

      // Session filter
      const matchesSession = sessionFilter === 'all' || assignment.classroom_session_id === sessionFilter

      // Status filter (overdue, due soon, etc.)
      let matchesStatus = true
      if (statusFilter === 'overdue') {
        matchesStatus = assignment.due_date && new Date(assignment.due_date) < new Date()
      } else if (statusFilter === 'due_soon') {
        const threeDaysFromNow = new Date()
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
        matchesStatus = assignment.due_date && 
          new Date(assignment.due_date) <= threeDaysFromNow && 
          new Date(assignment.due_date) >= new Date()
      }

      return matchesSearch && matchesType && matchesCategory && matchesSession && matchesStatus
    })
  }
}))