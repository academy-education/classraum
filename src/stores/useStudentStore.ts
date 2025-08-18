import { create } from 'zustand'
import type { Student, Family } from '@/hooks/useStudentData'

interface StudentState {
  // Data
  students: Student[]
  families: Family[]
  selectedStudents: Set<string>
  selectedStudent: Student | null
  
  // Filters
  searchQuery: string
  statusFilter: string
  familyFilter: string
  schoolFilter: string
  
  // UI State
  isLoading: boolean
  showCreateModal: boolean
  showEditModal: boolean
  showDetailsModal: boolean
  showDeleteModal: boolean
  
  // Actions
  setStudents: (students: Student[]) => void
  setFamilies: (families: Family[]) => void
  setSelectedStudents: (students: Set<string>) => void
  addSelectedStudent: (studentId: string) => void
  removeSelectedStudent: (studentId: string) => void
  clearSelectedStudents: () => void
  setSelectedStudent: (student: Student | null) => void
  
  // Filter actions
  setSearchQuery: (query: string) => void
  setStatusFilter: (status: string) => void
  setFamilyFilter: (family: string) => void
  setSchoolFilter: (school: string) => void
  clearFilters: () => void
  
  // UI actions
  setLoading: (loading: boolean) => void
  setShowCreateModal: (show: boolean) => void
  setShowEditModal: (show: boolean) => void
  setShowDetailsModal: (show: boolean) => void
  setShowDeleteModal: (show: boolean) => void
  
  // Computed getters
  getFilteredStudents: () => Student[]
  getStudentStats: () => {
    total: number
    active: number
    inactive: number
    withFamily: number
  }
  getSchools: () => string[]
}

export const useStudentStore = create<StudentState>((set, get) => ({
  // Initial state
  students: [],
  families: [],
  selectedStudents: new Set(),
  selectedStudent: null,
  
  searchQuery: '',
  statusFilter: 'all',
  familyFilter: 'all',
  schoolFilter: 'all',
  
  isLoading: false,
  showCreateModal: false,
  showEditModal: false,
  showDetailsModal: false,
  showDeleteModal: false,

  // Data actions
  setStudents: (students) => set({ students }),
  setFamilies: (families) => set({ families }),
  setSelectedStudents: (students) => set({ selectedStudents: students }),
  addSelectedStudent: (studentId) => set((state) => ({
    selectedStudents: new Set([...state.selectedStudents, studentId])
  })),
  removeSelectedStudent: (studentId) => set((state) => {
    const newSet = new Set(state.selectedStudents)
    newSet.delete(studentId)
    return { selectedStudents: newSet }
  }),
  clearSelectedStudents: () => set({ selectedStudents: new Set() }),
  setSelectedStudent: (student) => set({ selectedStudent: student }),

  // Filter actions
  setSearchQuery: (query) => set({ searchQuery: query }),
  setStatusFilter: (status) => set({ statusFilter: status }),
  setFamilyFilter: (family) => set({ familyFilter: family }),
  setSchoolFilter: (school) => set({ schoolFilter: school }),
  clearFilters: () => set({
    searchQuery: '',
    statusFilter: 'all',
    familyFilter: 'all',
    schoolFilter: 'all'
  }),

  // UI actions
  setLoading: (loading) => set({ isLoading: loading }),
  setShowCreateModal: (show) => set({ showCreateModal: show }),
  setShowEditModal: (show) => set({ showEditModal: show }),
  setShowDetailsModal: (show) => set({ showDetailsModal: show }),
  setShowDeleteModal: (show) => set({ showDeleteModal: show }),

  // Computed getters
  getFilteredStudents: () => {
    const state = get()
    const { students, searchQuery, statusFilter, familyFilter, schoolFilter } = state
    
    return students.filter(student => {
      // Search filter
      const matchesSearch = !searchQuery || 
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.school_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.family_name?.toLowerCase().includes(searchQuery.toLowerCase())

      // Status filter
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' && student.active) ||
        (statusFilter === 'inactive' && !student.active)

      // Family filter
      const matchesFamily = familyFilter === 'all' || 
        (familyFilter === 'none' && !student.family_id) ||
        student.family_id === familyFilter

      // School filter
      const matchesSchool = schoolFilter === 'all' || 
        (schoolFilter === 'none' && !student.school_name) ||
        student.school_name === schoolFilter

      return matchesSearch && matchesStatus && matchesFamily && matchesSchool
    })
  },

  getStudentStats: () => {
    const { students } = get()
    return {
      total: students.length,
      active: students.filter(s => s.active).length,
      inactive: students.filter(s => !s.active).length,
      withFamily: students.filter(s => s.family_id).length
    }
  },

  getSchools: () => {
    const { students } = get()
    const schoolSet = new Set(students.filter(s => s.school_name).map(s => s.school_name!))
    return Array.from(schoolSet).sort()
  }
}))