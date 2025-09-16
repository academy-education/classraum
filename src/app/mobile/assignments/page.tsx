"use client"

import { useEffect, useState, useCallback, useRef } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { useSelectedStudentStore } from '@/stores/selectedStudentStore'
import { useMobileData } from '@/hooks/useProgressiveLoading'
import { getTeacherNamesWithCache } from '@/utils/mobileCache'
import { useAssignments, useGrades } from '@/stores/mobileStore'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StaggeredListSkeleton, AnimatedStatSkeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import { Calendar, ChevronRight, AlertCircle, MessageCircle, BookOpen, ChevronLeft, RefreshCw, Search } from 'lucide-react'
import { CommentBottomSheet } from '@/components/ui/mobile/CommentBottomSheet'
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'

interface Comment {
  id: string
  assignment_id: string
  user_id: string
  user_name: string
  user_initials: string
  content: string
  created_at: string
  updated_at?: string
}

interface Assignment {
  id: string
  title: string
  description: string
  due_date: string
  status: 'pending' | 'completed' | 'overdue'
  classroom_name: string
  teacher_name: string
  assignment_type: 'Homework' | 'Quiz' | 'Project' | 'Test'
  teacher_initials: string
  points?: number
  comment_count?: number
  comments?: Comment[]
  classroom_color: string
  academy_name?: string
}

interface Grade {
  id: string
  assignment_title: string
  assignment_type?: string
  subject: string
  grade: string | number
  max_points: number
  graded_date: string
  teacher_name: string
  classroom_name: string
  classroom_id?: string
  status: string
  due_date: string
  submitted_date?: string
  comment_count: number
  teacher_comment?: string
  classroom_color?: string
}

// Simple in-memory cache for grades data
const gradesCache = new Map<string, { data: unknown; timestamp: number }>()
const CACHE_TTL = 60000 // 1 minute cache

export default function MobileAssignmentsPage() {
  const { t } = useTranslation()
  const { user } = usePersistentMobileAuth()
  const { language } = useLanguage()
  const { selectedStudent } = useSelectedStudentStore()

  // Get effective user ID - use selected student if parent, otherwise use current user
  const effectiveUserId = user?.role === 'parent' && selectedStudent ? selectedStudent.id : user?.userId

  // DEBUG: Log student selection changes
  useEffect(() => {
    console.log('🔍 [ASSIGNMENTS DEBUG] Student Selection State:', {
      userRole: user?.role,
      userId: user?.userId,
      selectedStudent: selectedStudent,
      effectiveUserId: effectiveUserId,
      timestamp: new Date().toISOString()
    })
  }, [user?.role, user?.userId, selectedStudent, effectiveUserId])
  
  // Use Zustand store with progressive loading
  const {
    assignments,
    setAssignments
  } = useAssignments()
  
  const {
    grades,
    setGrades
  } = useGrades()
  interface ClassroomOption {
    id: string
    name: string
    description: string
    icon: React.ComponentType<{ className?: string }>
    color: string
    academy_id?: string
    academy_name?: string
  }

  const [classrooms, setClassrooms] = useState<ClassroomOption[]>([
    {
      id: 'all',
      name: t('mobile.assignments.grades.allClassrooms'),
      description: t('mobile.assignments.grades.allClassroomsDescription'),
      icon: BookOpen,
      color: 'purple'
    }
  ])
  const [activeTab, setActiveTab] = useState<'assignments' | 'grades'>('assignments')
  const [commentBottomSheet, setCommentBottomSheet] = useState<{
    isOpen: boolean
    assignment: Assignment | null
  }>({ isOpen: false, assignment: null })
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0)
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<'7D' | '1M' | '3M' | '6M' | '1Y' | 'All'>('3M')
  const [selectedAcademyId, setSelectedAcademyId] = useState<string>('all')
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')

  // Helper function to get filtered classrooms based on selected academy
  const getFilteredClassrooms = () => {
    return selectedAcademyId === 'all'
      ? classrooms
      : classrooms.filter(c => c.id === 'all' || c.academy_id === selectedAcademyId)
  }
  
  // Pull-to-refresh states
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  const nextCarouselItem = () => {
    const filteredClassrooms = getFilteredClassrooms()
    setCurrentCarouselIndex((prev) => (prev + 1) % filteredClassrooms.length)
  }

  const prevCarouselItem = () => {
    const filteredClassrooms = getFilteredClassrooms()
    setCurrentCarouselIndex((prev) => (prev - 1 + filteredClassrooms.length) % filteredClassrooms.length)
  }

  const getColorClasses = (color: string) => {
    const colorMap = {
      purple: {
        card: 'from-purple-100 to-purple-50 border-purple-200',
        icon: 'bg-purple-500'
      },
      blue: {
        card: 'from-primary/10 to-primary/5 border-primary/20',
        icon: 'bg-primary'
      },
      green: {
        card: 'from-green-100 to-green-50 border-green-200',
        icon: 'bg-green-500'
      },
      red: {
        card: 'from-red-100 to-red-50 border-red-200',
        icon: 'bg-red-500'
      },
      yellow: {
        card: 'from-yellow-100 to-yellow-50 border-yellow-200',
        icon: 'bg-yellow-500'
      },
      orange: {
        card: 'from-orange-100 to-orange-50 border-orange-200',
        icon: 'bg-orange-500'
      },
      pink: {
        card: 'from-pink-100 to-pink-50 border-pink-200',
        icon: 'bg-pink-500'
      },
      indigo: {
        card: 'from-indigo-100 to-indigo-50 border-indigo-200',
        icon: 'bg-indigo-500'
      }
    }

    // Handle hex colors from database by mapping them to named colors
    const hexToColorName = {
      '#3B82F6': 'blue',
      '#10B981': 'green', 
      '#EF4444': 'red',
      '#F59E0B': 'yellow',
      '#F97316': 'orange',
      '#EC4899': 'pink',
      '#6366F1': 'indigo',
      '#8B5CF6': 'purple'
    }

    // If it's a hex color, convert to named color
    const namedColor = hexToColorName[color as keyof typeof hexToColorName] || color
    
    return colorMap[namedColor as keyof typeof colorMap] || colorMap.blue
  }


  // Move optimized functions to before they are used
  const fetchAssignmentsOptimized = useCallback(async (): Promise<Assignment[]> => {
    if (!effectiveUserId || !user?.academyIds || user.academyIds.length === 0) {
      console.log('🚫 [ASSIGNMENTS DEBUG] Missing user data:', { effectiveUserId, academyIds: user?.academyIds })
      return []
    }

    try {
      console.log('🔄 [ASSIGNMENTS DEBUG] Starting fetchAssignments:', {
        effectiveUserId,
        academyIds: user.academyIds,
        userRole: user?.role,
        selectedStudent: selectedStudent?.name,
        timestamp: new Date().toISOString()
      })

      // OPTIMIZATION: Break down complex queries into simpler ones
      // Step 1: Get student's enrolled classrooms from all academies
      // FIXED: Use RPC function to avoid Supabase client query issues
      const { data: initialEnrolledClassrooms, error: classroomError } = await supabase
        .rpc('get_student_classrooms', {
          student_uuid: effectiveUserId,
          academy_uuids: user.academyIds
        })

      let enrolledClassrooms = initialEnrolledClassrooms

      console.log('🔧 [ASSIGNMENTS DEBUG] Using RPC function result:', {
        rpc_function: 'get_student_classrooms',
        student_uuid: effectiveUserId,
        student_uuid_type: typeof effectiveUserId,
        academy_uuids: user.academyIds,
        academy_uuids_type: typeof user.academyIds,
        academy_uuids_length: user.academyIds?.length,
        academy_uuids_values: user.academyIds,
        error: classroomError,
        result_count: enrolledClassrooms?.length || 0,
        result: enrolledClassrooms
      })

      // Fallback to direct query if RPC fails
      if (classroomError || !enrolledClassrooms || enrolledClassrooms.length === 0) {
        console.log('🔄 [ASSIGNMENTS DEBUG] RPC failed or empty, trying direct query...')
        const { data: directClassrooms } = await supabase
          .from('classroom_students')
          .select(`
            classroom_id,
            classrooms(
              id,
              name,
              color,
              subject,
              academy_id,
              teacher_id
            )
          `)
          .eq('student_id', effectiveUserId)

        console.log('📋 [ASSIGNMENTS DEBUG] Direct query result:', {
          result_count: directClassrooms?.length || 0,
          result: directClassrooms
        })

        // Filter by academy after the query
        const filteredClassrooms = directClassrooms?.filter(enrollment =>
          enrollment.classrooms &&
          user.academyIds.includes((enrollment.classrooms as any).academy_id)
        ) || []

        // Transform to match expected format
        const transformedClassrooms = filteredClassrooms.map(enrollment => ({
          classroom_id: enrollment.classroom_id,
          classrooms: enrollment.classrooms
        }))

        console.log('🔧 [ASSIGNMENTS DEBUG] Filtered and transformed:', {
          filtered_count: transformedClassrooms.length,
          transformed: transformedClassrooms
        })

        // Use the transformed result
        enrolledClassrooms = transformedClassrooms
      }

      console.log('✅ [ASSIGNMENTS DEBUG] Final enrolled classrooms:', {
        final_count: enrolledClassrooms?.length || 0,
        final_data: enrolledClassrooms
      })

      console.log('📚 [ASSIGNMENTS DEBUG] Classroom query result:', {
        query: 'classroom_students with student_id',
        student_id: effectiveUserId,
        academy_ids: user.academyIds,
        academy_ids_detailed: JSON.stringify(user.academyIds),
        query_used: `student_id = ${effectiveUserId}, academy_ids IN ${JSON.stringify(user.academyIds)}`,
        result_count: enrolledClassrooms?.length || 0,
        classrooms: enrolledClassrooms,
        raw_result: JSON.stringify(enrolledClassrooms)
      })

      if (!enrolledClassrooms || enrolledClassrooms.length === 0) {
        console.log('🚫 [ASSIGNMENTS DEBUG] No enrolled classrooms found for student:', effectiveUserId)
        return []
      }

      const classroomIds = enrolledClassrooms.map((ec: any) => ec.classroom_id)
      const classroomMap = new Map()
      enrolledClassrooms.forEach((ec: any) => {
        classroomMap.set(ec.classroom_id, ec.classrooms)
      })

      console.log('🏫 [ASSIGNMENTS DEBUG] Processing classrooms:', {
        enrolledClassrooms_count: enrolledClassrooms.length,
        enrolledClassrooms_data: enrolledClassrooms,
        extracted_classroomIds: classroomIds,
        extracted_classroomIds_values: JSON.stringify(classroomIds),
        first_classroom_id: enrolledClassrooms[0]?.classroom_id,
        expected_classroom_id: '36259e28-7a19-44f8-a25d-a3f76ad196b0',
        classroomMap_size: classroomMap.size
      })

      // Step 2: Get sessions for enrolled classrooms - FIXED: Use RPC to bypass RLS
      let { data: sessions, error: sessionsError } = await supabase
        .rpc('get_classroom_sessions', {
          classroom_uuids: classroomIds
        })

      console.log('🔧 [ASSIGNMENTS DEBUG] Using RPC function for sessions:', {
        rpc_function: 'get_classroom_sessions',
        classroom_uuids: classroomIds,
        error: sessionsError,
        result_count: sessions?.length || 0
      })

      // Fallback to direct query if RPC fails
      if (sessionsError || !sessions || sessions.length === 0) {
        console.log('🔄 [ASSIGNMENTS DEBUG] Sessions RPC failed, trying direct query...')
        const { data: directSessions, error: directError } = await supabase
          .from('classroom_sessions')
          .select(`
            id,
            classroom_id,
            date
          `)
          .in('classroom_id', classroomIds)
        sessions = directSessions
        sessionsError = directError
      }

      console.log('📅 [ASSIGNMENTS DEBUG] Sessions query result:', {
        query: 'classroom_sessions',
        classroom_ids: classroomIds,
        classroom_ids_values: classroomIds,
        expected_classroom_id: '36259e28-7a19-44f8-a25d-a3f76ad196b0',
        error: sessionsError,
        sessions_count: sessions?.length || 0,
        sessions_data: sessions
      })
      
      if (!sessions || sessions.length === 0) {
        console.log('No sessions found')
        return []
      }

      const sessionIds = sessions.map((s: any) => s.id)
      const sessionMap = new Map()
      sessions.forEach((s: any) => {
        sessionMap.set(s.id, { ...s, classroom: classroomMap.get(s.classroom_id) })
      })
      
      // Step 3: Get assignments first - FIXED: Use RPC to bypass RLS
      let assignmentsResult = await supabase
        .rpc('get_assignments_for_sessions', {
          session_uuids: sessionIds
        })

      console.log('🔧 [ASSIGNMENTS DEBUG] Using RPC function for assignments:', {
        rpc_function: 'get_assignments_for_sessions',
        session_uuids: sessionIds,
        error: assignmentsResult.error,
        result_count: assignmentsResult.data?.length || 0,
        full_result: assignmentsResult.data
      })

      // DETAILED COMMENT DEBUG: Check what assignment_comments look like from RPC
      if (assignmentsResult.data && assignmentsResult.data.length > 0) {
        assignmentsResult.data.forEach((assignment: any) => {
          if (assignment.assignment_comments && assignment.assignment_comments.length > 0) {
            console.log('🎯 [RPC COMMENTS DEBUG] Found assignment with comments from RPC:', {
              assignment_id: assignment.id,
              assignment_title: assignment.title,
              comments_type: typeof assignment.assignment_comments,
              comments_is_array: Array.isArray(assignment.assignment_comments),
              comments_length: assignment.assignment_comments?.length,
              comments_data: assignment.assignment_comments
            })
          } else {
            console.log('🔍 [RPC COMMENTS DEBUG] Assignment has no comments:', {
              assignment_id: assignment.id,
              assignment_title: assignment.title,
              comments_field: assignment.assignment_comments,
              comments_type: typeof assignment.assignment_comments
            })
          }
        })
      }

      // Fallback to direct query if RPC fails
      if (assignmentsResult.error || !assignmentsResult.data || assignmentsResult.data.length === 0) {
        console.log('🔄 [ASSIGNMENTS DEBUG] Assignments RPC failed, trying direct query...')
        const { data: directAssignments, error: directError } = await supabase
          .from('assignments')
          .select(`
            id,
            title,
            description,
            assignment_type,
            due_date,
            created_at,
            classroom_session_id,
            assignment_comments(
              id,
              text,
              user_id,
              created_at,
              users(name)
            )
          `)
          .in('classroom_session_id', sessionIds)
          .is('deleted_at', null)
          .order('due_date', { ascending: true })
        assignmentsResult = { data: directAssignments, error: directError } as any
      }
      
      if (assignmentsResult.error) {
        console.error('Error fetching assignments:', assignmentsResult.error)
        return []
      }
      
      const assignments = assignmentsResult.data || []
      const assignmentIds = assignments.map((a: any) => a.id)
      
      
      // Step 4: Get grades only for fetched assignments to prevent timeout
      let gradesResult: {
        data: Array<{
          assignment_id: string
          status: string
          score?: number
          submitted_date?: string
        }> | null
        error: Error | null
      } = { data: null, error: null }
      if (assignmentIds.length > 0) {
        // Check cache first
        const cacheKey = `grades_${effectiveUserId}_${assignmentIds.sort().join(',')}`
        const cached = gradesCache.get(cacheKey)
        
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          console.log('Using cached grades data')
          gradesResult = { data: cached.data as Array<{
            assignment_id: string
            status: string
            score?: number
            submitted_date?: string
          }>, error: null }
        } else {
          try {
            // Batch assignment IDs to prevent timeout (max 20 per query)
            const batchSize = 20
            const allGrades = []
            
            for (let i = 0; i < assignmentIds.length; i += batchSize) {
            const batch = assignmentIds.slice(i, i + batchSize)
            let retryCount = 0
            const maxRetries = 2
            
            while (retryCount <= maxRetries) {
              const batchResult = await supabase
                .from('assignment_grades')
                .select('assignment_id, status, score, submitted_date')
                .eq('student_id', effectiveUserId)
                .in('assignment_id', batch)
                .order('submitted_date', { ascending: false })
              
              if (batchResult.error) {
                if (retryCount < maxRetries && batchResult.error.message?.includes('timeout')) {
                  retryCount++
                  console.warn(`Batch ${i / batchSize + 1} timed out, retrying (${retryCount}/${maxRetries})...`)
                  await new Promise(resolve => setTimeout(resolve, 500 * retryCount)) // Exponential backoff
                  continue
                }
                console.warn(`Batch ${i / batchSize + 1} failed after ${retryCount} retries:`, batchResult.error)
                break // Exit retry loop
              }
              
              if (batchResult.data) {
                allGrades.push(...batchResult.data)
              }
              break // Success, exit retry loop
            }
            }
            
            gradesResult = { data: allGrades, error: null }
            
            // Cache successful results
            if (allGrades.length > 0) {
              gradesCache.set(cacheKey, { data: allGrades, timestamp: Date.now() })
            }
          } catch (err) {
            console.error('Grades query exception:', err)
            gradesResult = { data: null, error: err as Error }
          }
        }
      }

      console.log('Fetched assignments:', assignments.length)
      
      if (assignments.length === 0) {
        console.warn('No assignments found for user')
        return []
      }

      // Create grades map for quick lookup
      const userGradesMap = new Map<string, {
        assignment_id: string
        status: string
        score?: number
        submitted_date?: string
      }>()
      if (!gradesResult.error && gradesResult.data) {
        gradesResult.data.forEach((grade: {
          assignment_id: string
          status: string
          score?: number
          submitted_date?: string
        }) => {
          userGradesMap.set(grade.assignment_id, grade)
        })
      } else if (gradesResult.error) {
        // Log assignment grades error for debugging
        if (gradesResult.error?.message) {
          console.log('Assignment grades fetch failed:', gradesResult.error.message)
        }
        // Continue without grades data - assignments will show as pending
      } else {
        console.log('No grades error, but also no data:', {
          hasData: !!gradesResult.data,
          dataLength: gradesResult.data?.length,
          assignmentCount: assignmentIds.length
        })
      }

      // OPTIMIZATION: Batch fetch all teacher names
      const teacherIds = Array.from(new Set(enrolledClassrooms.map((ec: any) => {
        // Handle both single object and array cases
        const classrooms = (ec as unknown as {classrooms: {teacher_id: string} | Array<{teacher_id: string}>}).classrooms
        if (Array.isArray(classrooms)) {
          return classrooms.map(c => c.teacher_id)
        } else if (classrooms && 'teacher_id' in classrooms) {
          return [classrooms.teacher_id]
        }
        return []
      }).flat().filter(Boolean))) as string[]
      const teacherMap = await getTeacherNamesWithCache(teacherIds)

      // Fetch academy names for all unique academy IDs
      const academyIds = Array.from(new Set(assignments.map((a: any) => {
        const session = sessionMap.get(a.classroom_session_id)
        const classroom = session?.classroom
        return classroom?.academy_id
      }).filter(Boolean))) as string[]

      const academyNamesMap = new Map<string, string>()
      if (academyIds.length > 0) {
        const { data: academies } = await supabase
          .from('academies')
          .select('id, name')
          .in('id', academyIds)

        console.log('🏫 Assignments: Academy IDs found:', academyIds)
        console.log('🏫 Assignments: Academy data fetched:', academies)

        academies?.forEach(academy => {
          academyNamesMap.set(academy.id, academy.name)
        })

        console.log('🏫 Assignments: Academy names map:', Object.fromEntries(academyNamesMap))
      }

      // Process assignments with all data available
      const processedAssignments: Assignment[] = assignments.flatMap((assignment: {
        id: string
        title: string
        description?: string
        assignment_type?: string
        due_date?: string
        created_at: string
        classroom_session_id: string
        assignment_comments?: any // Can be JSONB array from RPC or object array from direct query
      }) => {
        const session = sessionMap.get(assignment.classroom_session_id)
        if (!session) return []
        
        const classroom = session.classroom
        if (!classroom) return []
        
        const teacherId = classroom.teacher_id
        const teacherName = teacherMap.get(teacherId) || 'Unknown Teacher'
        
        const getInitials = (name: string) => {
          return name?.split(' ').map(n => n[0]).join('') || 'T'
        }
        
        // Get student's grade for this assignment from the map
        const userGrade = userGradesMap.get(assignment.id)
        
        // Determine status
        let status: 'pending' | 'completed' | 'overdue' = 'pending'
        if (userGrade && userGrade.status && userGrade.status !== 'not_submitted') {
          status = 'completed'
        } else if (assignment.due_date) {
          const due = new Date(assignment.due_date)
          const now = new Date()
          if (due < now) status = 'overdue'
        }
        
        const academyName = academyNamesMap.get(classroom.academy_id) || 'Academy'

        // Process comments - handle both JSONB from RPC and array from direct query
        let rawComments = assignment.assignment_comments || []

        // If it's JSONB from RPC, it might be a string that needs parsing
        if (typeof rawComments === 'string') {
          try {
            rawComments = JSON.parse(rawComments)
          } catch {
            rawComments = []
          }
        }

        // Ensure it's an array
        if (!Array.isArray(rawComments)) {
          rawComments = []
        }

        const processedComments = rawComments.map((comment: any) => ({
          id: comment.id,
          assignment_id: assignment.id,
          user_id: comment.user_id,
          user_name: comment.users?.name || 'Unknown User',
          user_initials: (comment.users?.name || 'Unknown User').split(' ').map((n: string) => n[0]).join('').toUpperCase(),
          content: comment.text,
          created_at: comment.created_at
        }))

        console.log('💬 [COMMENTS DEBUG] Processing comments for assignment:', {
          assignment_id: assignment.id,
          assignment_title: assignment.title,
          raw_comments: assignment.assignment_comments,
          raw_comments_type: typeof assignment.assignment_comments,
          raw_comments_is_array: Array.isArray(assignment.assignment_comments),
          processed_count: processedComments.length,
          processed_comments: processedComments
        })

        // EMERGENCY DEBUG: Log every step of comment processing
        if (assignment.assignment_comments && (Array.isArray(assignment.assignment_comments) && assignment.assignment_comments.length > 0)) {
          console.log('🚨 [EMERGENCY DEBUG] Assignment has comments that should be visible:', {
            assignment_id: assignment.id,
            title: assignment.title,
            comment_count_in_final_assignment: processedComments.length,
            will_show_comment_button: processedComments.length > 0
          })
        }

        return [{
          id: assignment.id,
          title: assignment.title,
          description: assignment.description || '',
          due_date: assignment.due_date || '',
          status,
          classroom_name: classroom.name || 'Unknown Class',
          teacher_name: teacherName,
          assignment_type: (assignment.assignment_type as 'Homework' | 'Quiz' | 'Test' | 'Project') || 'Homework',
          teacher_initials: getInitials(teacherName),
          comment_count: processedComments.length,
          comments: processedComments,
          classroom_color: classroom.color || '#3B82F6',
          academy_name: academyName
        }]
      })
      
      console.log('✅ [ASSIGNMENTS DEBUG] Final assignments result:', {
        total_count: processedAssignments.length,
        effectiveUserId,
        assignments: processedAssignments.map(a => ({
          id: a.id,
          title: a.title,
          classroom_name: a.classroom_name,
          due_date: a.due_date,
          status: a.status
        })),
        timestamp: new Date().toISOString()
      })
      return processedAssignments
    } catch (error) {
      console.error('Error in fetchAssignments:', error)
      return []
    }
  }, [effectiveUserId, user?.academyIds, selectedStudent])

  const fetchGradesOptimized = useCallback(async (): Promise<Grade[]> => {
    if (!effectiveUserId || !user?.academyIds || user.academyIds.length === 0) return []
    
    try {
      // OPTIMIZATION: Break down the complex query into simpler parallel queries
      // Step 1: Get student's enrolled classrooms - FIXED to use same RPC function
      let { data: enrolledClassrooms } = await supabase
        .rpc('get_student_classrooms', {
          student_uuid: effectiveUserId,
          academy_uuids: user.academyIds
        })

      console.log('🔧 [GRADES DEBUG] Using RPC function result:', {
        rpc_function: 'get_student_classrooms',
        student_uuid: effectiveUserId,
        academy_uuids: user.academyIds,
        result_count: enrolledClassrooms?.length || 0
      })

      // Fallback if RPC fails
      if (!enrolledClassrooms || enrolledClassrooms.length === 0) {
        console.log('🔄 [GRADES DEBUG] RPC failed, trying direct query...')
        const { data: directClassrooms } = await supabase
          .from('classroom_students')
          .select(`
            classroom_id,
            classrooms(
              id,
              name,
              color,
              subject,
              academy_id,
              teacher_id
            )
          `)
          .eq('student_id', effectiveUserId)

        // Filter by academy after the query
        const filteredClassrooms = directClassrooms?.filter(enrollment =>
          enrollment.classrooms &&
          user.academyIds.includes((enrollment.classrooms as any).academy_id)
        ) || []

        // Transform to match expected format
        enrolledClassrooms = filteredClassrooms.map(enrollment => ({
          classroom_id: enrollment.classroom_id,
          classrooms: enrollment.classrooms
        }))

        console.log('🔧 [GRADES DEBUG] Fallback result:', {
          filtered_count: enrolledClassrooms?.length || 0
        })
      }
      
      if (!enrolledClassrooms || enrolledClassrooms.length === 0) {
        console.log('No enrolled classrooms found')
        return []
      }
      
      const classroomIds = enrolledClassrooms.map((ec: any) => ec.classroom_id)
      const classroomMap = new Map()
      enrolledClassrooms.forEach((ec: any) => {
        classroomMap.set(ec.classroom_id, ec.classrooms)
      })
      
      // Step 2: Get sessions for enrolled classrooms - FIXED: Use RPC to bypass RLS
      let { data: sessions } = await supabase
        .rpc('get_classroom_sessions', {
          classroom_uuids: classroomIds
        })

      console.log('🔧 [GRADES DEBUG] Using RPC function for sessions:', {
        rpc_function: 'get_classroom_sessions',
        classroom_uuids: classroomIds,
        result_count: sessions?.length || 0
      })

      // Fallback to direct query if RPC fails
      if (!sessions || sessions.length === 0) {
        console.log('🔄 [GRADES DEBUG] Sessions RPC failed, trying direct query...')
        const { data: directSessions } = await supabase
          .from('classroom_sessions')
          .select(`
            id,
            classroom_id,
            date
          `)
          .in('classroom_id', classroomIds)
        sessions = directSessions
      }
      
      if (!sessions || sessions.length === 0) {
        console.log('No sessions found')
        return []
      }
      
      const sessionIds = sessions.map((s: any) => s.id)
      const sessionMap = new Map()
      sessions.forEach((s: any) => {
        sessionMap.set(s.id, s)
      })
      
      // Step 3: Get assignments for those sessions - FIXED: Use RPC to bypass RLS
      let { data: assignments } = await supabase
        .rpc('get_assignments_for_sessions', {
          session_uuids: sessionIds
        })

      console.log('🔧 [GRADES DEBUG] Using RPC function for assignments:', {
        rpc_function: 'get_assignments_for_sessions',
        session_uuids: sessionIds,
        result_count: assignments?.length || 0
      })

      // Fallback to direct query if RPC fails
      if (!assignments || assignments.length === 0) {
        console.log('🔄 [GRADES DEBUG] Assignments RPC failed, trying direct query...')
        const { data: directAssignments } = await supabase
          .from('assignments')
          .select(`
            id,
            title,
            due_date,
            assignment_type,
            classroom_session_id,
            assignment_comments(
              id,
              text,
              user_id,
              created_at,
              users(name)
            )
          `)
          .in('classroom_session_id', sessionIds)
          .is('deleted_at', null)
        assignments = directAssignments
      }
      
      if (!assignments || assignments.length === 0) {
        console.log('No assignments found')
        return []
      }
      
      const assignmentIds = assignments.map((a: any) => a.id)
      const assignmentMap = new Map()
      assignments.forEach((a: any) => {
        assignmentMap.set(a.id, a)
      })
      
      // Step 4: Get grades for the student - optimized to prevent timeout
      let gradeData: Array<{
        id: string
        assignment_id: string
        student_id: string
        score?: number
        status: string
        submitted_date?: string
        feedback?: string
        updated_at?: string
      }> = []
      let error = null
      
      if (assignmentIds.length > 0) {
        // Check cache first
        const cacheKey = `grades_opt_${effectiveUserId}_${assignmentIds.sort().join(',')}`
        const cached = gradesCache.get(cacheKey)
        
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          console.log('Using cached optimized grades data')
          gradeData = cached.data as Array<{
            id: string
            assignment_id: string
            student_id: string
            score?: number
            status: string
            submitted_date?: string
            feedback?: string
            updated_at?: string
          }>
          error = null
        } else {
          try {
            // Batch assignment IDs to prevent timeout (max 20 per query)
            const batchSize = 20
            const allGrades = []
            let batchError = null
            
            for (let i = 0; i < assignmentIds.length; i += batchSize) {
            const batch = assignmentIds.slice(i, i + batchSize)
            let retryCount = 0
            const maxRetries = 2
            
            while (retryCount <= maxRetries) {
              const gradesResult = await supabase
                .from('assignment_grades')
                .select('id, assignment_id, student_id, submitted_date, score, feedback, status, updated_at')
                .eq('student_id', effectiveUserId)
                .in('assignment_id', batch)
                .order('updated_at', { ascending: false })
              
              if (gradesResult.error) {
                if (retryCount < maxRetries && gradesResult.error.message?.includes('timeout')) {
                  retryCount++
                  console.warn(`Grades batch ${i / batchSize + 1} timed out, retrying (${retryCount}/${maxRetries})...`)
                  await new Promise(resolve => setTimeout(resolve, 500 * retryCount)) // Exponential backoff
                  continue
                }
                console.warn(`Grades batch ${i / batchSize + 1} failed after ${retryCount} retries:`, gradesResult.error)
                batchError = gradesResult.error
                break // Exit retry loop
              }
              
              if (gradesResult.data) {
                allGrades.push(...gradesResult.data)
              }
              break // Success, exit retry loop
            }
            }
            
            gradeData = allGrades
            error = allGrades.length === 0 ? batchError : null
            
            // Cache successful results
            if (allGrades.length > 0) {
              gradesCache.set(cacheKey, { data: allGrades, timestamp: Date.now() })
            }
          } catch (err) {
            console.error('Grades query exception:', err)
            error = err as Error
          }
        }
      }
      
      console.log('Optimized grades query result:', {
        gradeData,
        error,
        dataLength: gradeData?.length,
        effectiveUserId
      })
      
      if (error) {
        console.error('Error fetching assignment grades (500 error):', error)
        // Return empty array instead of throwing to prevent page crash
        return []
      }
      
      // Step 5: Batch fetch all teacher names
      const teacherIds = Array.from(new Set(enrolledClassrooms.map((ec: any) => {
        // Handle both single object and array cases
        const classrooms = (ec as unknown as {classrooms: {teacher_id: string} | Array<{teacher_id: string}>}).classrooms
        if (Array.isArray(classrooms)) {
          return classrooms.map(c => c.teacher_id)
        } else if (classrooms && 'teacher_id' in classrooms) {
          return [classrooms.teacher_id]
        }
        return []
      }).flat().filter(Boolean))) as string[]
      const teacherMap = await getTeacherNamesWithCache(teacherIds)
      
      // Step 6: Construct the formatted grades
      const formattedGrades: Grade[] = gradeData.flatMap((gradeRecord) => {
        const assignment = assignmentMap.get(gradeRecord.assignment_id)
        if (!assignment) return []
        
        const session = sessionMap.get(assignment.classroom_session_id)
        if (!session) return []
        
        const classroom = classroomMap.get(session.classroom_id)
        if (!classroom) return []
        
        const teacherName = teacherMap.get(classroom.teacher_id) || 'Unknown Teacher'
        
        return [{
          id: gradeRecord.id,
          assignment_title: assignment.title || 'Unknown Assignment',
          assignment_type: assignment.assignment_type,
          subject: classroom.subject || classroom.name || 'Unknown Subject',
          grade: gradeRecord.score !== null && gradeRecord.score !== undefined ? gradeRecord.score : '--',
          max_points: 100,
          graded_date: gradeRecord.updated_at || gradeRecord.submitted_date || '',
          teacher_name: teacherName,
          classroom_name: classroom.name || 'Unknown Class',
          classroom_id: classroom.id,
          status: gradeRecord.status || 'not submitted',
          due_date: assignment.due_date || '',
          submitted_date: gradeRecord.submitted_date,
          comment_count: 0,
          teacher_comment: gradeRecord.feedback,
          classroom_color: classroom.color || '#3B82F6'
        }]
      })
      
      console.log('OPTIMIZED grades result:', formattedGrades.length, 'grades processed')
      return formattedGrades
    } catch (error) {
      console.error('Error fetching grades:', error)
      return []
    }
  }, [effectiveUserId, user?.academyIds, selectedStudent])

  const fetchClassrooms = useCallback(async () => {
    if (!effectiveUserId || !user?.academyIds || user.academyIds.length === 0) return
    
    try {
      const { data, error } = await supabase
        .from('classrooms')
        .select(`
          id,
          name,
          color,
          subject_id,
          academy_id,
          subjects(
            name
          ),
          academies!inner(
            name
          ),
          classroom_students!inner(
            student_id
          )
        `)
        .in('academy_id', user.academyIds)
        .eq('classroom_students.student_id', effectiveUserId)
      
      if (error) throw error
      
      const userClassrooms = data || []
      
      const formattedClassrooms = [
        {
          id: 'all',
          name: t('mobile.assignments.grades.allClassrooms'),
          description: t('mobile.assignments.grades.allClassroomsDescription'),
          icon: BookOpen,
          color: 'purple'
        },
        ...userClassrooms.map((classroom: any) => ({
          id: classroom.id,
          name: classroom.name,
          description: classroom.subjects?.name || '',
          icon: BookOpen,
          color: classroom.color || 'blue',
          academy_id: classroom.academy_id,
          academy_name: classroom.academies.name
        }))
      ]
      
      setClassrooms(formattedClassrooms)
    } catch (error) {
      console.error('Error fetching classrooms:', error)
    }
  }, [user?.academyIds, effectiveUserId, t, selectedStudent])

  // Pull-to-refresh handlers
  const handleRefresh = async () => {
    setIsRefreshing(true)
    setPullDistance(0)
    
    try {
      // Force refresh both assignments and grades data
      await Promise.all([
        fetchAssignmentsOptimized(),
        fetchGradesOptimized(),
        fetchClassrooms()
      ])
    } catch (error) {
      console.error('Error refreshing data:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (scrollRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (scrollRef.current?.scrollTop === 0 && !isRefreshing) {
      const currentY = e.touches[0].clientY
      const diff = currentY - startY.current
      
      if (diff > 0) {
        setPullDistance(Math.min(diff, 100))
      }
    }
  }

  const handleTouchEnd = () => {
    if (pullDistance > 80 && !isRefreshing) {
      handleRefresh()
    } else {
      setPullDistance(0)
    }
  }

  // Progressive loading for assignments
  const assignmentsFetcher = useCallback(async () => {
    if (!effectiveUserId || !user?.academyIds || user.academyIds.length === 0) return []
    return await fetchAssignmentsOptimized()
  }, [effectiveUserId, user?.academyIds, fetchAssignmentsOptimized])
  
  const {
    data: assignmentsData = [],
    isLoading: assignmentsProgLoading
  } = useMobileData(
    'mobile-assignments',
    assignmentsFetcher,
    {
      immediate: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
      backgroundRefresh: true,
      refreshInterval: 60000 // 1 minute
    }
  )
  
  // Progressive loading for grades
  const gradesFetcher = useCallback(async () => {
    if (!effectiveUserId || !user?.academyIds || user.academyIds.length === 0) return []
    return await fetchGradesOptimized()
  }, [effectiveUserId, user?.academyIds, fetchGradesOptimized])
  
  const {
    data: gradesData = [],
    isLoading: gradesProgLoading
  } = useMobileData(
    'mobile-grades',
    gradesFetcher,
    {
      immediate: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
      backgroundRefresh: true,
      refreshInterval: 60000 // 1 minute
    }
  )
  
  useEffect(() => {
    if (assignmentsData) {
      setAssignments(assignmentsData)
    }
  }, [assignmentsData, setAssignments])
  
  useEffect(() => {
    if (gradesData) {
      setGrades(gradesData)
    }
  }, [gradesData, setGrades])
  
  useEffect(() => {
    if (effectiveUserId && user?.academyIds && user.academyIds.length > 0) {
      fetchClassrooms()
    }
  }, [effectiveUserId, user?.academyIds, fetchClassrooms])

  // Cache invalidation and refresh when student selection changes
  useEffect(() => {
    if (selectedStudent) {
      console.log('👥 [ASSIGNMENTS DEBUG] Student selection changed, clearing cache and refreshing data:', {
        newStudent: selectedStudent.name,
        effectiveUserId,
        timestamp: new Date().toISOString()
      })

      // Clear the grades cache
      gradesCache.clear()

      // Force refresh of all data by calling the refresh function
      handleRefresh()
    }
  }, [selectedStudent?.id]) // Only depend on the ID to avoid unnecessary re-runs

  const formatDueDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const locale = language === 'korean' ? 'ko-KR' : 'en-US'
    
    if (date.toDateString() === today.toDateString()) {
      return language === 'korean' ? '오늘' : 'Today'
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return language === 'korean' ? '내일' : 'Tomorrow'
    }
    
    return date.toLocaleDateString(locale)
  }

  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString)
    const locale = language === 'korean' ? 'ko-KR' : 'en-US'
    return date.toLocaleDateString(locale, { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const groupAssignmentsByDate = (assignments: Assignment[]) => {
    const grouped: { [key: string]: Assignment[] } = {}
    assignments.forEach(assignment => {
      const dateKey = new Date(assignment.due_date).toDateString()
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(assignment)
    })
    return grouped
  }

  // Filter assignments based on search query
  const filterAssignments = (assignments: Assignment[], query: string) => {
    if (!query.trim()) return assignments
    
    const lowerQuery = query.toLowerCase()
    return assignments.filter(assignment => 
      assignment.title.toLowerCase().includes(lowerQuery) ||
      assignment.description.toLowerCase().includes(lowerQuery) ||
      assignment.classroom_name.toLowerCase().includes(lowerQuery) ||
      assignment.teacher_name.toLowerCase().includes(lowerQuery) ||
      assignment.assignment_type.toLowerCase().includes(lowerQuery)
    )
  }

  const handleOpenComments = (assignment: Assignment) => {
    setPullDistance(0)
    setCommentBottomSheet({ isOpen: true, assignment })
  }

  const handleCloseComments = () => {
    setCommentBottomSheet({ isOpen: false, assignment: null })
  }

  const handleAddComment = async (content: string) => {
    if (!commentBottomSheet.assignment || !user?.userId) return

    try {
      // Save comment to database
      const { data: savedComment, error } = await supabase
        .from('assignment_comments')
        .insert({
          assignment_id: commentBottomSheet.assignment.id,
          user_id: user.userId,
          text: content.trim()
        })
        .select()
        .single()

      if (error) {
        console.error('Error saving comment:', error)
        console.error('Comment data attempted:', {
          assignment_id: commentBottomSheet.assignment.id,
          user_id: user.userId,
          text: content.trim(),
          user_role: user?.role
        })
        return
      }

      // Create the comment object for UI update
      const newComment: Comment = {
        id: savedComment.id,
        assignment_id: savedComment.assignment_id,
        user_id: savedComment.user_id,
        user_name: user?.userName || 'You',
        user_initials: user?.userName?.charAt(0) || 'Y',
        content: savedComment.text,
        created_at: savedComment.created_at
      }

      // Update assignments with new comment
      const updatedAssignments = assignments.map((assignment: Assignment): Assignment => {
        if (assignment.id === commentBottomSheet.assignment?.id) {
          const updatedComments = [...(assignment.comments || []), newComment]
          return {
            ...assignment,
            comments: updatedComments,
            comment_count: updatedComments.length
          }
        }
        return assignment
      })
      setAssignments(updatedAssignments)

      // Update the bottom sheet assignment
      setCommentBottomSheet(prev => ({
        ...prev,
        assignment: prev.assignment ? {
          ...prev.assignment,
          comments: [...(prev.assignment.comments || []), newComment],
          comment_count: (prev.assignment.comments?.length || 0) + 1
        } : null
      }))
    } catch (error) {
      console.error('Error adding comment:', error)
    }
  }

  const formatGradedDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const diffTime = Math.abs(today.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    const locale = language === 'korean' ? 'ko-KR' : 'en-US'
    
    if (diffDays === 1) {
      return language === 'korean' ? '어제' : 'Yesterday'
    } else if (diffDays < 7) {
      return language === 'korean' ? `${diffDays}일 전` : `${diffDays} days ago`
    } else {
      return date.toLocaleDateString(locale)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const locale = language === 'korean' ? 'ko-KR' : 'en-US'
    return date.toLocaleDateString(locale)
  }

  const getStatusBadgeGrade = (status: string) => {
    switch (status) {
      case 'graded':
        return <Badge className="bg-green-100 text-green-800">{t('mobile.assignments.grades.status.graded')}</Badge>
      case 'submitted':
        return <Badge className="bg-primary/10 text-primary">{t('mobile.assignments.grades.status.submitted')}</Badge>
      case 'not submitted':
      case 'not_submitted':
        return <Badge className="bg-orange-100 text-orange-800">{t('mobile.assignments.grades.status.notSubmitted')}</Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">{t('mobile.assignments.grades.status.pending')}</Badge>
      case 'late':
        return <Badge className="bg-red-100 text-red-800">{t('mobile.assignments.grades.status.late')}</Badge>
      case 'excused':
        return <Badge className="bg-purple-100 text-purple-800">{t('mobile.assignments.grades.status.excused')}</Badge>
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800">{t('mobile.assignments.grades.status.overdue')}</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">{t('mobile.assignments.grades.status.unknown')}</Badge>
    }
  }

  const getGradeColor = (grade: string | number) => {
    if (grade === '--' || grade === 'N/A') return 'text-gray-500'
    
    if (typeof grade === 'number') {
      if (grade >= 90) return 'text-green-600'      // 90-100%: Excellent (Green)
      if (grade >= 80) return 'text-primary'       // 80-89%: Good (Primary)
      if (grade >= 70) return 'text-yellow-600'     // 70-79%: Average (Yellow)
      if (grade >= 60) return 'text-orange-600'     // 60-69%: Below Average (Orange)
      return 'text-red-600'                         // Below 60%: Poor (Red)
    }
    
    const letterGrade = grade.toString().charAt(0)
    switch (letterGrade) {
      case 'A': return 'text-green-600'
      case 'B': return 'text-primary'
      case 'C': return 'text-yellow-600'
      case 'D': return 'text-orange-600'
      default: return 'text-red-600'
    }
  }


  const processChartData = (grades: Grade[], timePeriod: typeof selectedTimePeriod, classroomId?: string) => {
    // Filter grades by classroom if specified
    let allGrades = classroomId && classroomId !== 'all'
      ? grades.filter(grade => grade.classroom_id === classroomId)
      : grades

    // Convert grades to numbers, treating 'not submitted' as 0, and filter out non-gradeable items
    allGrades = allGrades.map(grade => {
      if (typeof grade.grade === 'number') {
        return grade // Keep as is
      } else if (grade.status === 'not submitted' || grade.status === 'not_submitted') {
        return { ...grade, grade: 0 } // Convert not submitted to 0
      } else {
        return null // Filter out pending/submitted but not graded
      }
    }).filter(grade => grade !== null) as Grade[]

    // Filter out grades without submitted_date and sort by submitted date
    allGrades = allGrades.filter(grade => grade.submitted_date && grade.submitted_date.trim() !== '')
    allGrades.sort((a, b) => new Date(a.submitted_date!).getTime() - new Date(b.submitted_date!).getTime())

    if (allGrades.length === 0) {
      return []
    }

    const currentLang = language === 'korean' ? 'ko-KR' : 'en-US'
    const now = new Date()

    // Define time period filtering
    let periodStartDate: Date | null = null
    const periodEndDate: Date = now

    switch (timePeriod) {
      case '7D':
        periodStartDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000))
        break
      case '1M':
        periodStartDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000))
        break
      case '3M':
        periodStartDate = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000))
        break
      case '6M':
        periodStartDate = new Date(now.getTime() - (180 * 24 * 60 * 60 * 1000))
        break
      case '1Y':
        periodStartDate = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000))
        break
      case 'All':
        periodStartDate = null // No filtering for 'All'
        break
    }

    // Filter grades by time period (except for 'All')
    let periodGrades = allGrades
    if (periodStartDate) {
      periodGrades = allGrades.filter(grade => {
        const submittedDate = new Date(grade.submitted_date!)
        return submittedDate >= periodStartDate! && submittedDate <= periodEndDate
      })
    }

    // If no grades in the period, show flat line with overall average
    if (periodGrades.length === 0) {
      if (allGrades.length > 0) {
        const overallAverage = Math.round(allGrades.reduce((sum, grade) => sum + (grade.grade as number), 0) / allGrades.length)

        // Create flat line for the period
        const pointCount = { '7D': 7, '1M': 10, '3M': 15, '6M': 20, '1Y': 25, 'All': 10 }[timePeriod] || 10
        const flatLineData = []

        for (let i = 0; i < pointCount; i++) {
          const pointDate = new Date(periodStartDate!.getTime() + ((periodEndDate.getTime() - periodStartDate!.getTime()) / (pointCount - 1)) * i)
          flatLineData.push({
            date: pointDate.toLocaleDateString(currentLang, { month: 'short', day: 'numeric' }),
            average: overallAverage,
            count: allGrades.length,
            assignmentTitle: 'Overall average'
          })
        }
        return flatLineData
      }
      return []
    }

    // Create complete timeline for the period with proper data points
    const pointCount = { '7D': 7, '1M': 20, '3M': 30, '6M': 40, '1Y': 50, 'All': Math.min(periodGrades.length + 5, 30) }[timePeriod] || 10
    const progressionData = []

    // For 'All' filter, use actual submission dates
    if (timePeriod === 'All') {
      const cumulativeGrades: Grade[] = []

      periodGrades.forEach((grade, index) => {
        cumulativeGrades.push(grade)

        const total = cumulativeGrades.reduce((sum, g) => sum + (g.grade as number), 0)
        const average = Math.round(total / cumulativeGrades.length)

        progressionData.push({
          date: new Date(grade.submitted_date!).toLocaleDateString(currentLang, {
            month: 'short',
            day: 'numeric'
          }),
          average: average,
          count: cumulativeGrades.length,
          assignmentTitle: grade.assignment_title || 'Assignment'
        })

        // Debug log for first few points to verify data accuracy
        if (index < 3) {
          console.log(`All Point ${index}:`, {
            date: grade.submitted_date,
            average,
            count: cumulativeGrades.length,
            grades: cumulativeGrades.map(g => ({ grade: g.grade, submitted: g.submitted_date }))
          })
        }
      })

      // Add current day point with final cumulative average
      if (periodGrades.length > 0) {
        const lastSubmissionDate = new Date(periodGrades[periodGrades.length - 1].submitted_date!)
        const today = new Date()

        // Only add today's point if it's different from the last submission date
        if (today.toDateString() !== lastSubmissionDate.toDateString()) {
          const finalTotal = periodGrades.reduce((sum, g) => sum + (g.grade as number), 0)
          const finalAverage = Math.round(finalTotal / periodGrades.length)

          progressionData.push({
            date: today.toLocaleDateString(currentLang, {
              month: 'short',
              day: 'numeric'
            }),
            average: finalAverage,
            count: periodGrades.length,
            assignmentTitle: 'Current average'
          })
        }
      }

      return progressionData
    }

    // For time period filters, create evenly spaced timeline
    const timelineStart = periodStartDate!
    const timelineEnd = periodEndDate
    const interval = (timelineEnd.getTime() - timelineStart.getTime()) / (pointCount - 1)

    for (let i = 0; i < pointCount; i++) {
      const pointDate = new Date(timelineStart.getTime() + (interval * i))

      // Find all grades submitted up to this point in time (including from before the period)
      const gradesUpToPoint = allGrades.filter(g => new Date(g.submitted_date!) <= pointDate)

      if (gradesUpToPoint.length > 0) {
        const total = gradesUpToPoint.reduce((sum, g) => sum + (g.grade as number), 0)
        const average = Math.round(total / gradesUpToPoint.length)

        progressionData.push({
          date: pointDate.toLocaleDateString(currentLang, { month: 'short', day: 'numeric' }),
          average: average,
          count: gradesUpToPoint.length,
          assignmentTitle: `${gradesUpToPoint.length} total assignments`
        })

        // Debug log for first few points to verify data accuracy
        if (i < 3) {
          console.log(`${timePeriod} Point ${i}:`, {
            date: pointDate.toISOString(),
            average,
            count: gradesUpToPoint.length,
            grades: gradesUpToPoint.map(g => ({ grade: g.grade, submitted: g.submitted_date }))
          })
        }
      } else {
        // No grades up to this point, don't add a data point
        // This will naturally create gaps in the timeline where appropriate
      }
    }

    return progressionData
  }

  // Remove loading check for instant navigation

  return (
    <>
    <div 
      ref={scrollRef}
      className="p-4 relative overflow-y-auto"
      style={{ touchAction: pullDistance > 0 ? 'none' : 'auto' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div 
          className="absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-300 z-10"
          style={{ 
            height: `${pullDistance}px`,
            opacity: pullDistance > 80 ? 1 : pullDistance / 80
          }}
        >
          <div className="flex items-center gap-2">
            <RefreshCw 
              className={`w-5 h-5 text-primary ${isRefreshing ? 'animate-spin' : ''}`}
            />
            <span className="text-sm text-primary font-medium">
              {isRefreshing ? t('common.refreshing') : t('common.pullToRefresh')}
            </span>
          </div>
        </div>
      )}
      
      <div style={{ transform: `translateY(${pullDistance}px)` }} className="transition-transform">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {t('mobile.assignments.title')}
        </h1>
      </div>

      {/* Tab Navigation */}
      <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('assignments')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'assignments'
              ? 'bg-white text-primary shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {t('mobile.assignments.tabs.assignments')}
        </button>
        <button
          onClick={() => setActiveTab('grades')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'grades'
              ? 'bg-white text-primary shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {t('mobile.assignments.tabs.grades')}
        </button>
      </div>

      {/* Search Input - Only show on assignments tab */}
      {activeTab === 'assignments' && (
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('common.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'assignments' ? (
        /* Assignments Tab */
        assignmentsProgLoading ? (
          <StaggeredListSkeleton items={4} />
        ) : assignments.length > 0 ? (
          (() => {
            const filteredAssignments = filterAssignments(assignments, searchQuery)
            return filteredAssignments.length > 0 ? (
              <div className="space-y-10">
                {Object.entries(groupAssignmentsByDate(filteredAssignments)).map(([dateKey, dateAssignments]) => (
                  <div key={dateKey}>
                {/* Date Header */}
                <div className="relative text-center mb-4">
                  <hr className="border-gray-200 absolute top-1/2 left-0 right-0" />
                  <h2 className="text-lg font-medium text-gray-600 bg-white px-4 relative inline-block">
                    {formatDateHeader(dateAssignments[0].due_date)}
                  </h2>
                </div>
                
                {/* Assignments for this date */}
                <div className="space-y-4">
                  {dateAssignments.map((assignment) => (
                    <Card key={assignment.id} className="p-4 bg-white">
                      {/* Teacher Info Header */}
                      <div className="flex items-center mb-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center mr-3">
                          <span className="text-sm font-medium text-white">
                            {assignment.teacher_initials}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {assignment.teacher_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {assignment.classroom_name} • {assignment.academy_name}
                          </p>
                        </div>
                      </div>
                      
                      {/* Assignment Type and Title Group */}
                      <div className="mb-2">
                        <div className="mb-1">
                          <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                            {t(`mobile.assignments.types.${assignment.assignment_type.toLowerCase()}`)}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {assignment.title}
                        </h3>
                      </div>
                      
                      {/* Due Date */}
                      <div className="flex items-center text-sm text-gray-600 mb-2">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span>{t('mobile.assignments.dueDate')}: {formatDueDate(assignment.due_date)}, 2025</span>
                      </div>
                      
                      {/* Points if available */}
                      {assignment.points && (
                        <div className="flex items-center text-sm text-gray-600 mb-4">
                          <span>{assignment.points}</span>
                        </div>
                      )}
                      
                      {/* Action Buttons */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <button 
                          onClick={() => handleOpenComments(assignment)}
                          className="flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
                        >
                          <MessageCircle className="w-4 h-4 mr-1" />
                          <span>{assignment.comment_count || 0}</span>
                          <span className="ml-1">{t('mobile.assignments.comment')}</span>
                        </button>
                      </div>
                    </Card>
                  ))}
                </div>
                  </div>
                ))}
              </div>
            ) : (
              <Card className="p-6">
                <div className="text-center">
                  <Search className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">{t('mobile.assignments.noSearchResults')}</p>
                  <p className="text-sm text-gray-400 mt-1">{t('mobile.assignments.tryDifferentSearch')}</p>
                </div>
              </Card>
            )
          })()
        ) : (
          <Card className="p-4 text-center">
            <div className="flex flex-col items-center gap-1">
              <BookOpen className="w-6 h-6 text-gray-300" />
              <div className="text-gray-500 font-medium text-sm leading-tight">{t('mobile.assignments.noAssignments')}</div>
              <div className="text-gray-400 text-xs leading-tight">{t('mobile.assignments.noAssignmentsDesc')}</div>
            </div>
          </Card>
        )
      ) : (
        /* Grades Tab */
        <div className="space-y-6">
          {/* Academy Filter */}
          <div className="space-y-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-900">{t('mobile.assignments.grades.academy')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedAcademyId}
                    onValueChange={(value) => {
                      setSelectedAcademyId(value)
                      setCurrentCarouselIndex(0) // Reset to first classroom when academy changes
                    }}
                  >
                    <SelectTrigger className="w-auto min-w-32 border-none shadow-none bg-transparent text-sm text-gray-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('mobile.assignments.grades.allAcademies')}</SelectItem>
                      {(() => {
                        // Get unique academies from classrooms (excluding the "all" option)
                        const uniqueAcademies = Array.from(new Map(
                          classrooms
                            .filter(c => c.id !== 'all' && c.academy_name && c.academy_id)
                            .map(c => [c.academy_id, { id: c.academy_id, name: c.academy_name }])
                        ).values())

                        return uniqueAcademies.map(academy => (
                          <SelectItem key={academy.id || ''} value={academy.id || ''}>
                            {academy.name}
                          </SelectItem>
                        ))
                      })()}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>
          </div>

          {/* Classroom Selector */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">{t('mobile.assignments.grades.myClassrooms')}</h2>
            
            {/* Classroom Cards Carousel */}
            <div className="relative">
              <div className="flex items-center space-x-3">
                <button 
                  onClick={prevCarouselItem}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Previous classroom"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-400" />
                </button>
                
                <div className="flex-1 overflow-hidden relative h-20">
                  <div 
                    className="flex transition-transform duration-300 ease-in-out h-full"
                    style={{ transform: `translateX(-${currentCarouselIndex * 100}%)` }}
                  >
                    {(() => {
                      // Filter classrooms by selected academy
                      return getFilteredClassrooms()
                    })().map((classroom) => {
                      const Icon = classroom.icon
                      const colors = getColorClasses(classroom.color)
                      
                      return (
                        <div key={classroom.id} className="w-full flex-shrink-0 h-full">
                          <Card className={`p-4 bg-gradient-to-r ${colors.card} h-full`}>
                            <div className="flex items-center space-x-3 h-full">
                              <div className={`w-10 h-10 ${colors.icon} rounded-lg flex items-center justify-center flex-shrink-0`}>
                                <Icon className="w-5 h-5 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-900 truncate">{classroom.name}</h3>
                                <p className="text-sm text-gray-600 truncate">{classroom.description}</p>
                              </div>
                            </div>
                          </Card>
                        </div>
                      )
                    })}
                  </div>
                </div>
                
                <button 
                  onClick={nextCarouselItem}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Next classroom"
                >
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              
              {/* Dots Indicator */}
              <div className="flex justify-center space-x-1 mt-3">
                {(() => {
                  // Filter classrooms by selected academy for dots indicator
                  return getFilteredClassrooms().map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentCarouselIndex(index)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentCarouselIndex ? 'bg-primary' : 'bg-gray-300'
                      }`}
                      aria-label={`Go to classroom ${index + 1}`}
                    />
                  ))
                })()}
              </div>
            </div>
          </div>

          {/* Grade Statistics */}
          {gradesProgLoading ? (
            <div className="grid grid-cols-3 gap-4">
              <AnimatedStatSkeleton />
              <AnimatedStatSkeleton />
              <AnimatedStatSkeleton />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {(() => {
                // Get the currently selected classroom
                const selectedClassroom = getFilteredClassrooms()[currentCarouselIndex]
                
                // Filter by classroom only (statistics show cumulative average)
                // The time period selection affects the chart timeline, not the cumulative average
                const filteredGrades = selectedClassroom?.id === 'all' 
                  ? grades
                  : grades.filter(grade => grade.classroom_id === selectedClassroom?.id)
                
                return (
                  <>
                    {/* Card 1: Average Grade */}
                    <Card className="p-4">
                      <div className="text-left">
                        <p className="text-sm text-gray-500">{t('mobile.assignments.grades.averageGrade')}</p>
                        {(() => {
                          const averageGrade = filteredGrades.length > 0 ? 
                            (() => {
                              // Include all assignments, treating 'not submitted' as 0
                              const allAssignments = filteredGrades.map(g => {
                                if (typeof g.grade === 'number') {
                                  return g.grade
                                } else if (g.status === 'not submitted' || g.status === 'not_submitted') {
                                  return 0
                                } else {
                                  return null // Exclude pending/submitted but not graded
                                }
                              }).filter(grade => grade !== null) as number[]
                              
                              return allAssignments.length > 0 ? 
                                Math.round(allAssignments.reduce((sum, grade) => sum + grade, 0) / allAssignments.length)
                                : 'N/A'
                            })()
                            : 'N/A'
                          
                          return (
                            <p className={`text-2xl font-bold ${getGradeColor(averageGrade)}`}>
                              {typeof averageGrade === 'number' ? `${averageGrade}%` : averageGrade}
                            </p>
                          )
                        })()}
                      </div>
                    </Card>

                    {/* Card 2: Assignment Type Breakdown */}
                    <Card className="p-4">
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-gray-500">{t('mobile.assignments.types.homework')}</p>
                          {(() => {
                            const homeworkAssignments = filteredGrades.filter(g => g.assignment_type === 'homework')
                            const homeworkGrades = homeworkAssignments.map(g => {
                              if (typeof g.grade === 'number') {
                                return g.grade
                              } else if (g.status === 'not submitted' || g.status === 'not_submitted') {
                                return 0
                              } else {
                                return null // Exclude pending/submitted but not graded
                              }
                            }).filter(grade => grade !== null) as number[]
                            
                            const homeworkAverage = homeworkGrades.length > 0 ? 
                              Math.round(homeworkGrades.reduce((sum, grade) => sum + grade, 0) / homeworkGrades.length)
                              : 'N/A'
                            
                            return (
                              <p className={`text-lg font-semibold ${getGradeColor(homeworkAverage)}`}>
                                {typeof homeworkAverage === 'number' ? `${homeworkAverage}%` : homeworkAverage}
                              </p>
                            )
                          })()}
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">{t('mobile.assignments.types.quizTest')}</p>
                          {(() => {
                            const testAssignments = filteredGrades.filter(g => 
                              g.assignment_type === 'quiz' || g.assignment_type === 'test'
                            )
                            const testGrades = testAssignments.map(g => {
                              if (typeof g.grade === 'number') {
                                return g.grade
                              } else if (g.status === 'not submitted' || g.status === 'not_submitted') {
                                return 0
                              } else {
                                return null // Exclude pending/submitted but not graded
                              }
                            }).filter(grade => grade !== null) as number[]
                            
                            const testAverage = testGrades.length > 0 ? 
                              Math.round(testGrades.reduce((sum, grade) => sum + grade, 0) / testGrades.length)
                              : 'N/A'
                            
                            return (
                              <p className={`text-lg font-semibold ${getGradeColor(testAverage)}`}>
                                {typeof testAverage === 'number' ? `${testAverage}%` : testAverage}
                              </p>
                            )
                          })()}
                        </div>
                      </div>
                    </Card>

                    {/* Card 3: Completion Statistics */}
                    <Card className="p-4">
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-gray-500">{t('mobile.assignments.grades.totalAssignments')}</p>
                          <p className="text-lg font-semibold text-gray-900">{filteredGrades.length}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">{t('mobile.assignments.grades.completedAssignments')}</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {filteredGrades.filter(g => g.status === 'graded' || g.status === 'submitted').length}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </>
                )
              })()}
            </div>
          )}

          {/* Grade Over Time Chart */}
          <Card className="p-4">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">{t('mobile.assignments.grades.averageGradeOverTime')}</h3>
                  {(() => {
                    const selectedClassroom = getFilteredClassrooms()[currentCarouselIndex]
                    const chartData = processChartData(grades, selectedTimePeriod, selectedClassroom?.id)
                    
                    if (chartData.length >= 2) {
                      const firstGrade = chartData[0].average
                      const lastGrade = chartData[chartData.length - 1].average
                      const change = lastGrade - firstGrade
                      const changePercent = firstGrade > 0 ? ((change / firstGrade) * 100).toFixed(1) : '0.0'
                      
                      return (
                        <span className={`text-sm font-medium ${
                          change >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {change >= 0 ? '↑' : '↓'} {change >= 0 ? '+' : ''}{changePercent}%
                        </span>
                      )
                    }
                    
                    return null
                  })()}
                </div>
                <p className="text-sm text-gray-500 mt-1">{t('mobile.assignments.grades.cumulativeDescription')}</p>
              </div>
              
              {/* Time Period Buttons */}
              <div className="flex space-x-1">
                {(['7D', '1M', '3M', '6M', '1Y', 'All'] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setSelectedTimePeriod(period)}
                    className={`px-3 py-1 text-xs font-medium rounded ${
                      period === selectedTimePeriod 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {t(`mobile.assignments.grades.chart.periods.${period}`)}
                  </button>
                ))}
              </div>

              {/* Line Chart */}
              {(() => {
                const selectedClassroom = getFilteredClassrooms()[currentCarouselIndex]
                const chartData = processChartData(grades, selectedTimePeriod, selectedClassroom?.id)
                
                if (chartData.length === 0) {
                  return (
                    <div className="h-32 flex items-center justify-center bg-gray-50 rounded p-3">
                      <p className="text-sm text-gray-500">{t('mobile.assignments.grades.chart.noDataForPeriod')}</p>
                    </div>
                  )
                }
                
                return (
                  <div className="h-32 bg-gray-50 rounded p-2">
                    <ResponsiveContainer width="100%" height="100%" style={{ outline: 'none' }}>
                      <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                        <XAxis
                          dataKey="date"
                          axisLine={false}
                          tickLine={false}
                          tick={false}
                          height={20}
                        />
                        <YAxis
                          domain={[0, 100]}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10, fill: '#6B7280' }}
                          width={25}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #E5E7EB',
                            borderRadius: '0.375rem',
                            fontSize: '12px'
                          }}
                          formatter={(value: number) => [value + '%']}
                          labelFormatter={(label) => label}
                          separator=""
                        />
                        <Line
                          type="monotone"
                          dataKey="average"
                          stroke="#3B82F6"
                          strokeWidth={2}
                          dot={{ fill: '#3B82F6', strokeWidth: 0, r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )
              })()}
            </div>
          </Card>


          {/* Existing Grades List */}
          {gradesProgLoading ? (
            <StaggeredListSkeleton items={4} />
          ) : grades.length > 0 ? (
            <div className="space-y-3">
              {(() => {
                // Get the currently selected classroom
                const selectedClassroom = getFilteredClassrooms()[currentCarouselIndex]
                
                // Filter by classroom only (statistics show cumulative average)
                // The time period selection affects the chart timeline, not the cumulative average
                const filteredGrades = selectedClassroom?.id === 'all' 
                  ? grades
                  : grades.filter(grade => grade.classroom_id === selectedClassroom?.id)
                
                // Show empty state if no grades after filtering
                if (filteredGrades.length === 0) {
                  return (
                    <Card className="p-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <AlertCircle className="w-6 h-6 text-gray-300" />
                        <div className="text-gray-500 font-medium text-sm leading-tight">{t('mobile.assignments.grades.noGradesForClassroom')}</div>
                      </div>
                    </Card>
                  )
                }
                
                return filteredGrades.map((grade) => (
              <Card key={grade.id} className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 pr-2">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {grade.assignment_title}
                    </h3>
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusBadgeGrade(grade.status)}
                      <span className="text-sm text-gray-600">{grade.subject}</span>
                    </div>
                  </div>
                  <div className={`text-lg font-bold ${getGradeColor(
                    (grade.status === 'not submitted' || grade.status === 'not_submitted') ? 0 : grade.grade
                  )}`}>
                    {(grade.status === 'not submitted' || grade.status === 'not_submitted') 
                      ? '0%' 
                      : grade.grade === '--' 
                      ? '--' 
                      : (typeof grade.grade === 'number' ? `${grade.grade}%` : grade.grade)}
                  </div>
                </div>
                
                <div className="space-y-2 text-xs text-gray-500">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{t('mobile.assignments.dueDate')}: {formatDate(grade.due_date)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{t('mobile.assignments.submittedDate')}: {grade.submitted_date ? formatDate(grade.submitted_date) : t('mobile.assignments.grades.notSubmitted')}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{t('mobile.assignments.gradedDate')}: {formatGradedDate(grade.graded_date)}</span>
                    </div>
                  </div>
                </div>
                
                {/* Teacher Comment */}
                {grade.teacher_comment && (
                  <div className="mt-3 p-3 bg-primary/5 rounded-lg border border-primary/10">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium text-white">
                          {grade.teacher_name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-primary mb-1">{grade.teacher_name}</p>
                        <p className="text-sm text-primary/80 leading-relaxed">{grade.teacher_comment}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="mt-3 pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    {grade.classroom_name} • {grade.teacher_name}
                  </p>
                </div>
              </Card>
                ))
              })()}
            </div>
          ) : (
            <Card className="p-4 text-center">
              <div className="flex flex-col items-center gap-1">
                <AlertCircle className="w-6 h-6 text-gray-300" />
                <div className="text-gray-500 font-medium text-sm leading-tight">{t('mobile.assignments.noGrades')}</div>
              </div>
            </Card>
          )}
        </div>
      )}
      </div>
    </div>

    {/* Comment Bottom Sheet - Outside all containers */}
    <CommentBottomSheet
      isOpen={commentBottomSheet.isOpen}
      onClose={handleCloseComments}
      assignmentTitle={commentBottomSheet.assignment?.title || ''}
      assignmentId={commentBottomSheet.assignment?.id || ''}
      comments={commentBottomSheet.assignment?.comments || []}
      onAddComment={handleAddComment}
    />
  </>
  )
}