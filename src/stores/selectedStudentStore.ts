import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Student {
  id: string
  name: string
  email: string
  academy_id: string
}

interface SelectedStudentStore {
  selectedStudent: Student | null
  availableStudents: Student[]
  setSelectedStudent: (student: Student) => void
  setAvailableStudents: (students: Student[]) => void
  clearSelectedStudent: () => void
}

export const useSelectedStudentStore = create<SelectedStudentStore>()(
  persist(
    (set) => ({
      selectedStudent: null,
      availableStudents: [],
      setSelectedStudent: (student) => set({ selectedStudent: student }),
      setAvailableStudents: (students) => set({ availableStudents: students }),
      clearSelectedStudent: () => set({ selectedStudent: null }),
    }),
    {
      name: 'selected-student-storage',
    }
  )
)