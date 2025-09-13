"use client"

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

export const useNavigationHandlers = () => {
  const router = useRouter()

  const handleNavigateToSessions = useCallback((classroomId?: string) => {
    const url = classroomId ? `/sessions?classroomId=${classroomId}` : '/sessions'
    router.push(url)
  }, [router])

  const handleNavigateToAssignments = useCallback((classroomId?: string) => {
    const url = classroomId ? `/assignments?classroomId=${classroomId}` : '/assignments'
    router.push(url)
  }, [router])

  const handleNavigateToAttendance = useCallback((classroomId?: string) => {
    const url = classroomId ? `/attendance?classroomId=${classroomId}` : '/attendance'
    router.push(url)
  }, [router])

  const handleNavigateToStudents = useCallback((classroomId?: string) => {
    const url = classroomId ? `/students?classroomId=${classroomId}` : '/students'
    router.push(url)
  }, [router])

  const handleNavigateToClassrooms = useCallback(() => {
    router.push('/classrooms')
  }, [router])

  const handleNavigateToTeachers = useCallback(() => {
    router.push('/teachers')
  }, [router])

  const handleNavigateToParents = useCallback(() => {
    router.push('/parents')
  }, [router])

  const handleNavigateToPayments = useCallback(() => {
    router.push('/payments')
  }, [router])

  const handleNavigateToGrades = useCallback(() => {
    router.push('/grades')
  }, [router])

  const handleNavigateToDashboard = useCallback(() => {
    router.push('/dashboard')
  }, [router])

  return {
    handleNavigateToSessions,
    handleNavigateToAssignments,
    handleNavigateToAttendance,
    handleNavigateToStudents,
    handleNavigateToClassrooms,
    handleNavigateToTeachers,
    handleNavigateToParents,
    handleNavigateToPayments,
    handleNavigateToGrades,
    handleNavigateToDashboard
  }
}