"use client"

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { LoadingScreen } from '@/components/ui/loading-screen'
import { StudentSelectorModal } from '@/components/ui/student-selector-modal'
import { useSelectedStudentStore } from '@/stores/selectedStudentStore'
import { appInitTracker } from '@/utils/appInitializationTracker'

interface Student {
  id: string
  name: string
  email: string
  academy_id: string
}

interface ParentAuthWrapperProps {
  children: React.ReactNode
}

export function ParentAuthWrapper({ children }: ParentAuthWrapperProps) {
  const router = useRouter()
  // Navigation-aware loading state - don't show loading if app was previously initialized
  const [isLoading, setIsLoading] = useState(() => {
    const shouldSuppress = appInitTracker.shouldSuppressLoadingForNavigation()
    if (shouldSuppress) {
      console.log('🚫 [ParentAuthWrapper] Suppressing loading - app previously initialized')
      return false
    }
    return true // Show loading only on first visit
  })
  const [showStudentSelector, setShowStudentSelector] = useState(false)
  const [students, setStudents] = useState<Student[]>([])
  const [_parentId, setParentId] = useState<string>('')

  const {
    selectedStudent,
    setSelectedStudent,
    availableStudents: _availableStudents,
    setAvailableStudents,
    clearSelectedStudent
  } = useSelectedStudentStore()

  useEffect(() => {
    let isMounted = true

    const checkParentAndLoadStudents = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (!isMounted) return

        if (!session?.user) {
          router.push('/auth')
          return
        }

        const { data: userInfo } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (!isMounted) return

        if (userInfo?.role !== 'parent') {
          if (userInfo?.role === 'student') {
            // If it's a student, no need for selection
            if (isMounted) {
              setIsLoading(false)
              // Mark parent data initialization complete for student users
              appInitTracker.markParentDataInitialized()
            }
            return
          }
          // Redirect non-parent/student users
          router.push('/dashboard')
          return
        }

        if (isMounted) setParentId(session.user.id)

        // Get the parent's family
        const { data: familyMember } = await supabase
          .from('family_members')
          .select('family_id')
          .eq('user_id', session.user.id)
          .eq('role', 'parent')
          .single()

        if (!isMounted) return

        if (!familyMember) {
          console.error('No family found for parent')
          if (isMounted) setIsLoading(false)
          return
        }

        // Get all family members with user details using the security definer function
        const { data: familyUsers, error: _familyError } = await supabase
          .rpc('get_users_for_family', { user_uuid: session.user.id })

        if (!isMounted) return

        if (!familyUsers || familyUsers.length === 0) {
          console.warn('No family users found for this parent - this might be normal for a new parent account')
          if (isMounted) setIsLoading(false)
          return
        }

        // Filter to get only students
        const studentUsers = familyUsers.filter((user: any) => user.family_role === 'student')

        console.log('👨‍👩‍👧‍👦 [PARENT AUTH DEBUG] Student filtering result:', {
          totalFamilyUsers: familyUsers.length,
          studentUsers: studentUsers,
          studentCount: studentUsers.length
        })

        if (studentUsers && studentUsers.length > 0) {
          const studentList = studentUsers.map((student: any) => ({
            id: student.id,
            name: student.name,
            email: student.email,
            academy_id: student.academy_id
          }))

          console.log('👥 [PARENT AUTH DEBUG] Student list created:', {
            studentList,
            existingSelectedStudent: selectedStudent
          })

          if (isMounted) {
            setStudents(studentList)
            setAvailableStudents(studentList)

            // Check if there's a previously selected student
            const isSelectedStudentValid = selectedStudent && studentList.find((s: any) => s.id === selectedStudent.id)

            if (!isSelectedStudentValid) {
              console.log('🔄 [PARENT AUTH DEBUG] No valid previous selection, clearing stale data')
              // Clear any stale selected student from previous session
              clearSelectedStudent()

              // No valid selection, show selector
              if (studentList.length === 1) {
                // Only one student, auto-select
                console.log('✅ [PARENT AUTH DEBUG] Auto-selecting single student:', studentList[0])
                setSelectedStudent(studentList[0])
                setIsLoading(false)
                // Mark parent data initialization complete
                appInitTracker.markParentDataInitialized()
              } else {
                // Multiple students, show selector
                console.log('🎯 [PARENT AUTH DEBUG] Multiple students, showing selector')
                setShowStudentSelector(true)
                setIsLoading(false)
                // Mark parent data initialization complete (selector will be shown)
                appInitTracker.markParentDataInitialized()
              }
            } else {
              // Valid previous selection exists
              console.log('✅ [PARENT AUTH DEBUG] Valid previous selection exists:', selectedStudent)
              setIsLoading(false)
              // Mark parent data initialization complete
              appInitTracker.markParentDataInitialized()
            }
          }
        }
      } catch (error) {
        console.error('Error loading parent data:', error)
        if (isMounted) setIsLoading(false)
      }
    }

    checkParentAndLoadStudents()

    return () => {
      isMounted = false
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student)
    setShowStudentSelector(false)
  }

  // Enhanced loading state management with navigation awareness
  const shouldShowLoading = () => {
    // Never show loading if app was previously initialized (navigation scenario)
    const suppressForNavigation = appInitTracker.shouldSuppressLoadingForNavigation()
    if (suppressForNavigation) {
      console.log('🚫 [ParentAuthWrapper] Suppressing loading screen - navigation detected')
      return false
    }

    // Show loading only for genuine initialization states
    return isLoading
  }

  if (shouldShowLoading()) {
    return <LoadingScreen />
  }

  // For parent users, ensure a student is selected
  if (students.length > 0 && !selectedStudent) {
    return (
      <StudentSelectorModal
        isOpen={true}
        students={students}
        onSelectStudent={handleSelectStudent}
      />
    )
  }

  // Show the selector modal if requested
  if (showStudentSelector) {
    return (
      <>
        {children}
        <StudentSelectorModal
          isOpen={showStudentSelector}
          onClose={() => setShowStudentSelector(false)}
          students={students}
          onSelectStudent={handleSelectStudent}
        />
      </>
    )
  }

  return <>{children}</>
}

// Export a hook to trigger the student selector
export function useStudentSelector() {
  const [showSelector, setShowSelector] = useState(false)
  const { availableStudents } = useSelectedStudentStore()

  const openSelector = () => {
    if (availableStudents.length > 1) {
      setShowSelector(true)
    }
  }

  return { showSelector, setShowSelector, openSelector, hasMultipleStudents: availableStudents.length > 1 }
}