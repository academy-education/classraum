import { useSyncExternalStore } from 'react'
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
      // Only persist selectedStudent, not availableStudents
      // availableStudents should be fetched fresh for each session
      partialize: (state) => ({
        selectedStudent: state.selectedStudent
      }),
    }
  )
)

/**
 * Returns true once the persist middleware has finished rehydrating
 * `selectedStudent` from localStorage on the client.
 *
 * Implemented with `useSyncExternalStore` so the value is read synchronously
 * from the persist controller on every render — no useState lag, no race
 * with `onRehydrateStorage`. Server snapshot is always `false`, which is
 * correct because the server has no localStorage.
 */
const subscribeHydration = (callback: () => void) =>
  useSelectedStudentStore.persist.onFinishHydration(callback)
const getHydrationSnapshot = () =>
  useSelectedStudentStore.persist.hasHydrated()
const getHydrationServerSnapshot = () => false

export function useSelectedStudentHydrated(): boolean {
  return useSyncExternalStore(
    subscribeHydration,
    getHydrationSnapshot,
    getHydrationServerSnapshot
  )
}
