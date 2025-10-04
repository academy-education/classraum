"use client"

import { useEffect, useState, useCallback, useRef } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { useSelectedStudentStore } from '@/stores/selectedStudentStore'
import { useEffectiveUserId } from '@/hooks/useEffectiveUserId'
import { useStableCallback } from '@/hooks/useStableCallback'
import { getTeacherNamesWithCache } from '@/utils/mobileCache'
import { CacheUtils, CacheCategory } from '@/lib/universal-cache'
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
import { Calendar, ChevronRight, AlertCircle, MessageCircle, BookOpen, ChevronLeft, RefreshCw, Search, School, Paperclip, FileText, Image, Eye, CalendarDays, Clock, ArrowUpDown, ArrowDown, ArrowUp } from 'lucide-react'
import { CommentBottomSheet } from '@/components/ui/mobile/CommentBottomSheet'
import { FileViewerBottomSheet } from '@/components/ui/mobile/FileViewerBottomSheet'
import { MobilePageErrorBoundary } from '@/components/error-boundaries/MobilePageErrorBoundary'
import { simpleTabDetection } from '@/utils/simpleTabDetection'
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

interface Attachment {
  id: string
  assignment_id: string
  file_name: string
  file_url: string
  file_size: number
  file_type: string
  uploaded_by: string
  created_at: string
}

interface Assignment {
  id: string
  title: string
  description: string
  due_date: string
  session_date: string
  created_at: string
  status: 'pending' | 'completed' | 'overdue'
  classroom_name: string
  subject: string
  teacher_name: string
  assignment_type: 'Homework' | 'Quiz' | 'Project' | 'Test'
  category_name?: string
  teacher_initials: string
  points?: number
  comment_count?: number
  comments?: Comment[]
  attachments?: Attachment[]
  classroom_color: string
  academy_name?: string
}

interface Grade {
  id: string
  assignment_title: string
  assignment_description?: string
  assignment_type?: string
  category_name?: string
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
  attachments?: Attachment[]
  session_date?: string
  created_at?: string
}

// Simple in-memory cache for grades data and attachments
const gradesCache = new Map<string, { data: unknown; timestamp: number }>()
const attachmentsCache = new Map<string, { data: Map<string, Attachment[]>; timestamp: number }>()
const CACHE_TTL = 60000 // 1 minute cache

// Helper functions for attachments
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const getFileIcon = (fileType: string) => {
  if (fileType.startsWith('image/')) return Image
  if (fileType.includes('pdf')) return FileText
  if (fileType.includes('document') || fileType.includes('word')) return FileText
  return Paperclip
}

// Function to fetch assignment comments efficiently
const fetchAssignmentComments = async (assignmentIds: string[]): Promise<Map<string, Comment[]>> => {
  if (assignmentIds.length === 0) return new Map()

  try {
    // console.log('🔄 [COMMENTS] Fetching for', assignmentIds.length, 'assignments using RPC')

    // Use RPC function to bypass expensive RLS policies
    const { data: comments, error } = await supabase
      .rpc('get_assignment_comments', {
        assignment_uuids: assignmentIds
      })

    if (error) {
      console.warn('Error fetching comments:', error)
      return new Map()
    }

    // Group comments by assignment_id and format them
    const commentMap = new Map<string, Comment[]>()
    comments?.forEach((comment: any) => {
      if (!commentMap.has(comment.assignment_id)) {
        commentMap.set(comment.assignment_id, [])
      }

      const userName = comment.user_name || 'Unknown User'
      const formattedComment: Comment = {
        id: comment.id,
        assignment_id: comment.assignment_id,
        user_id: comment.user_id,
        user_name: userName,
        user_initials: userName.split(' ').map((n: string) => n[0]).join('').toUpperCase(),
        content: comment.text,
        created_at: comment.created_at,
        updated_at: comment.updated_at
      }

      commentMap.get(comment.assignment_id)!.push(formattedComment)
    })

    // console.log(`✅ [COMMENTS] Fetched ${comments?.length || 0} comments`)

    return commentMap
  } catch (error) {
    console.warn('Exception fetching comments:', error)
    return new Map()
  }
}

// Separate function to fetch attachments efficiently with caching
const fetchAssignmentAttachments = async (assignmentIds: string[]): Promise<Map<string, Attachment[]>> => {
  if (assignmentIds.length === 0) return new Map()

  // Create cache key from sorted assignment IDs
  const cacheKey = assignmentIds.sort().join(',')
  const now = Date.now()

  // Check cache first
  const cached = attachmentsCache.get(cacheKey)
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    // console.log('🎯 [ATTACHMENTS] Using cached data for', assignmentIds.length, 'assignments')
    return cached.data
  }

  try {
    // console.log('🔄 [ATTACHMENTS] Fetching for', assignmentIds.length, 'assignments using RPC')

    // Use RPC function to bypass expensive RLS policies
    const { data: attachments, error } = await supabase
      .rpc('get_assignment_attachments', {
        assignment_uuids: assignmentIds
      })

    if (error) {
      console.warn('Error fetching attachments:', error)
      return new Map()
    }

    // Group attachments by assignment_id
    const attachmentMap = new Map<string, Attachment[]>()
    attachments?.forEach((attachment: any) => {
      if (!attachmentMap.has(attachment.assignment_id)) {
        attachmentMap.set(attachment.assignment_id, [])
      }
      attachmentMap.get(attachment.assignment_id)!.push(attachment)
    })

    // Cache the result
    attachmentsCache.set(cacheKey, { data: attachmentMap, timestamp: now })

    // console.log(`✅ [ATTACHMENTS] Fetched ${attachments?.length || 0} attachments`)

    return attachmentMap
  } catch (error) {
    console.warn('Exception fetching attachments:', error)
    return new Map()
  }
}

function MobileAssignmentsPageContent() {
  const { t } = useTranslation()
  const { user } = usePersistentMobileAuth()
  const { language } = useLanguage()
  const { selectedStudent } = useSelectedStudentStore()

  // Debug flag for assignments logs - disable in production
  const ENABLE_ASSIGNMENTS_DEBUG = process.env.NODE_ENV === 'development' && false

  // Use stable effective user ID hook
  const { effectiveUserId, isReady, isLoading: authLoading, hasAcademyIds, academyIds } = useEffectiveUserId()

  // Advanced tab switch detection for loading state management
  // Use simple tab detection for navigation awareness
  const shouldSuppressLoading = simpleTabDetection.isTrueTabReturn()
  const isReturningFromTab = shouldSuppressLoading // For backward compatibility

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
      name: String(t('mobile.assignments.grades.allClassrooms')),
      description: String(t('mobile.assignments.grades.allClassroomsDescription')),
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
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<'7D' | '1M' | '3M' | '6M' | '1Y' | 'ALL'>('3M')
  const [selectedAcademyId, setSelectedAcademyId] = useState<string>('all')
  
  // Search state (separate for assignments and grades tabs)
  const [searchQuery, setSearchQuery] = useState('')
  const [gradesSearchQuery, setGradesSearchQuery] = useState('')

  // Pagination state (separate for assignments and grades tabs)
  const [currentPage, setCurrentPage] = useState(1)
  const [currentGradesPage, setCurrentGradesPage] = useState(1)
  const itemsPerPage = 10

  // Sort state - tracks both field and direction
  const [sortBy, setSortBy] = useState<{field: 'session' | 'due', direction: 'desc' | 'asc'} | null>(null)

  // File viewer state
  const [viewingFile, setViewingFile] = useState<Attachment | null>(null)

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
    if (!effectiveUserId || !hasAcademyIds) {
      // console.log('🚫 [ASSIGNMENTS DEBUG] Missing user data:', { effectiveUserId, hasAcademyIds })
      return []
    }

    if (!academyIds || academyIds.length === 0) {
      // console.log('🚫 [ASSIGNMENTS DEBUG] No academy IDs available')
      return []
    }

    // Check sessionStorage cache first
    try {
      const cacheKey = `assignments-${effectiveUserId}`
      const cachedData = sessionStorage.getItem(cacheKey)
      const cachedTimestamp = sessionStorage.getItem(`${cacheKey}-timestamp`)

      if (cachedData && cachedTimestamp) {
        const timeDiff = Date.now() - parseInt(cachedTimestamp)
        const cacheValidFor = 2 * 60 * 1000 // 2 minutes

        if (timeDiff < cacheValidFor) {
          console.log('✅ [fetchAssignmentsOptimized] Using sessionStorage cached data')
          return JSON.parse(cachedData)
        }
      }
    } catch (error) {
      console.warn('[fetchAssignmentsOptimized] Failed to read sessionStorage:', error)
    }

    try {
      // console.log('🔄 [ASSIGNMENTS DEBUG] Starting fetchAssignments:', {
      //   effectiveUserId,
      //   academyIds: user?.academyIds,
      //   userRole: user?.role,
      //   selectedStudent: selectedStudent?.name,
      //   timestamp: new Date().toISOString()
      // })

      // OPTIMIZATION: Break down complex queries into simpler ones
      // Step 1: Get student's enrolled classrooms from all academies
      // FIXED: Use RPC function to avoid Supabase client query issues
      const { data: initialEnrolledClassrooms, error: classroomError } = await supabase
        .rpc('get_student_classrooms', {
          student_uuid: effectiveUserId,
          academy_uuids: user?.academyIds || []
        })

      const enrolledClassrooms = initialEnrolledClassrooms

      // console.log('🔧 [ASSIGNMENTS DEBUG] Using RPC function result:', {
      //   rpc_function: 'get_student_classrooms',
      //   student_uuid: effectiveUserId,
      //   student_uuid_type: typeof effectiveUserId,
      //   academy_uuids: user?.academyIds,
      //   academy_uuids_type: typeof user?.academyIds,
      //   academy_uuids_length: user?.academyIds?.length,
      //   academy_uuids_values: user?.academyIds,
      //   error: classroomError,
      //   result_count: enrolledClassrooms?.length || 0,
      //   result: enrolledClassrooms
      // })

      if (classroomError) {
        console.error('Error fetching enrolled classrooms:', classroomError)
        return []
      }

      // console.log('✅ [ASSIGNMENTS DEBUG] Final enrolled classrooms:', {
      //   final_count: enrolledClassrooms?.length || 0,
      //   final_data: enrolledClassrooms
      // })

      // console.log('📚 [ASSIGNMENTS DEBUG] Classroom query result:', {
      //   query: 'classroom_students with student_id',
      //   student_id: effectiveUserId,
      //   academy_ids: user?.academyIds,
      //   academy_ids_detailed: JSON.stringify(user?.academyIds),
      //   query_used: `student_id = ${effectiveUserId}, academy_ids IN ${JSON.stringify(user?.academyIds)}`,
      //   result_count: enrolledClassrooms?.length || 0,
      //   classrooms: enrolledClassrooms,
      //   raw_result: JSON.stringify(enrolledClassrooms)
      // })

      if (!enrolledClassrooms || enrolledClassrooms.length === 0) {
        // console.log('🚫 [ASSIGNMENTS DEBUG] No enrolled classrooms found for student:', effectiveUserId)
        return []
      }

      const classroomIds = enrolledClassrooms.map((ec: any) => ec.classroom_id)
      const classroomMap = new Map()
      enrolledClassrooms.forEach((ec: any) => {
        classroomMap.set(ec.classroom_id, ec.classrooms)
      })

      // console.log('🏫 [ASSIGNMENTS DEBUG] Processing classrooms:', {
      //   enrolledClassrooms_count: enrolledClassrooms.length,
      //   enrolledClassrooms_data: enrolledClassrooms,
      //   extracted_classroomIds: classroomIds,
      //   extracted_classroomIds_values: JSON.stringify(classroomIds),
      //   first_classroom_id: enrolledClassrooms[0]?.classroom_id,
      //   expected_classroom_id: '36259e28-7a19-44f8-a25d-a3f76ad196b0',
      //   classroomMap_size: classroomMap.size
      // })

      // Step 2: Get sessions for enrolled classrooms - FIXED: Use RPC to bypass RLS
      const { data: sessions, error: sessionsError } = await supabase
        .rpc('get_classroom_sessions', {
          classroom_uuids: classroomIds
        })

      if (ENABLE_ASSIGNMENTS_DEBUG) {
        console.log('🔧 [ASSIGNMENTS DEBUG] Using RPC function for sessions:', {
          rpc_function: 'get_classroom_sessions',
          classroom_uuids: classroomIds,
          error: sessionsError,
          result_count: sessions?.length || 0
        })
      }

      if (sessionsError) {
        console.error('❌ [ASSIGNMENTS] Sessions RPC Error Details:', {
          error: sessionsError,
          errorMessage: sessionsError?.message,
          errorDetails: sessionsError?.details,
          errorHint: sessionsError?.hint,
          errorCode: sessionsError?.code,
          rpcFunction: 'get_classroom_sessions',
          classroomIds: classroomIds,
          classroomCount: classroomIds?.length,
          effectiveUserId,
          hasAcademyIds,
          academyIds: academyIds?.slice(0, 3)
        })
        return []
      }

      // console.log('📅 [ASSIGNMENTS DEBUG] Sessions query result:', {
      //   query: 'classroom_sessions',
      //   classroom_ids: classroomIds,
      //   classroom_ids_values: classroomIds,
      //   expected_classroom_id: '36259e28-7a19-44f8-a25d-a3f76ad196b0',
      //   error: sessionsError,
      //   sessions_count: sessions?.length || 0,
      //   sessions_data: sessions
      // })
      
      if (!sessions || sessions.length === 0) {
        // console.log('No sessions found')
        return []
      }

      const sessionIds = sessions.map((s: any) => s.id)
      const sessionMap = new Map()
      sessions.forEach((s: any) => {
        sessionMap.set(s.id, { ...s, classroom: classroomMap.get(s.classroom_id) })
      })
      
      // Step 3: Get assignments first - FIXED: Use RPC to bypass RLS
      const { data: assignments, error: assignmentsError } = await supabase
        .rpc('get_assignments_for_sessions', {
          session_uuids: sessionIds
        })

      if (ENABLE_ASSIGNMENTS_DEBUG) {
        console.log('🔧 [ASSIGNMENTS DEBUG] Using RPC function for assignments:', {
          rpc_function: 'get_assignments_for_sessions',
          session_uuids: sessionIds,
          error: assignmentsError,
          result_count: assignments?.length || 0,
          full_result: assignments
        })
      }



      if (assignmentsError) {
        console.error('❌ [ASSIGNMENTS] RPC Error Details:', {
          error: assignmentsError,
          errorMessage: assignmentsError?.message,
          errorDetails: assignmentsError?.details,
          errorHint: assignmentsError?.hint,
          errorCode: assignmentsError?.code,
          rpcFunction: 'get_assignments_for_sessions',
          sessionIds: sessionIds,
          sessionCount: sessionIds?.length,
          effectiveUserId,
          hasAcademyIds,
          academyIds: academyIds?.slice(0, 3)
        })
        return []
      }

      const assignmentsData = assignments || []
      const assignmentIds = assignmentsData.map((a: any) => a.id)
      
      
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
          // console.log('Using cached grades data')
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

      // console.log('Fetched assignments:', assignments.length)
      
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
          // console.log('Assignment grades fetch failed:', gradesResult.error.message)
        }
        // Continue without grades data - assignments will show as pending
      } else {
        // console.log('No grades error, but also no data:', {
        //   hasData: !!gradesResult.data,
        //   dataLength: gradesResult.data?.length,
        //   assignmentCount: assignmentIds.length
        // })
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
      const assignmentAcademyIds = Array.from(new Set(assignmentsData.map((a: any) => {
        const session = sessionMap.get(a.classroom_session_id)
        const classroom = session?.classroom
        return classroom?.academy_id
      }).filter(Boolean))) as string[]

      const academyNamesMap = new Map<string, string>()
      if (assignmentAcademyIds.length > 0) {
        const { data: academies } = await supabase
          .from('academies')
          .select('id, name')
          .in('id', assignmentAcademyIds)

        // console.log('🏫 Assignments: Academy IDs found:', assignmentAcademyIds)
        // console.log('🏫 Assignments: Academy data fetched:', academies)

        academies?.forEach(academy => {
          academyNamesMap.set(academy.id, academy.name)
        })

        // console.log('🏫 Assignments: Academy names map:', Object.fromEntries(academyNamesMap))
      }

      // Process assignments with all data available
      const processedAssignments: Assignment[] = assignmentsData.flatMap((assignment: {
        id: string
        title: string
        description?: string
        assignment_type?: string
        due_date?: string
        created_at: string
        classroom_session_id: string
        category_name?: string
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

        // Comments will be fetched separately for better performance

        return [{
          id: assignment.id,
          title: assignment.title,
          description: assignment.description || '',
          due_date: assignment.due_date || '',
          session_date: session.date || session.session_date || '',
          created_at: assignment.created_at || '',
          status,
          classroom_name: classroom.name || 'Unknown Class',
          subject: classroom.subject || classroom.name || 'Unknown Subject',
          teacher_name: teacherName,
          assignment_type: (assignment.assignment_type as 'Homework' | 'Quiz' | 'Test' | 'Project') || 'Homework',
          category_name: assignment.category_name || '',
          teacher_initials: getInitials(teacherName),
          comment_count: 0, // Will be updated after fetching comments
          comments: [], // Will be populated after fetching comments
          attachments: [], // Will be populated separately
          classroom_color: classroom.color || '#3B82F6',
          academy_name: academyName
        }]
      })
      
      // console.log('✅ [ASSIGNMENTS DEBUG] Final assignments result:', {
      //   total_count: processedAssignments.length,
      //   effectiveUserId,
      //   assignments: processedAssignments.map(a => ({
      //     id: a.id,
      //     title: a.title,
      //     classroom_name: a.classroom_name,
      //     due_date: a.due_date,
      //     status: a.status
      //   })),
      //   timestamp: new Date().toISOString()
      // })

      // Fetch attachments and comments separately for better performance
      if (processedAssignments.length > 0) {
        try {
          const assignmentIds = processedAssignments.map(a => a.id)

          // Fetch both attachments and comments in parallel
          const [attachmentMap, commentMap] = await Promise.all([
            fetchAssignmentAttachments(assignmentIds),
            fetchAssignmentComments(assignmentIds)
          ])

          // Merge attachments and comments into assignments
          processedAssignments.forEach(assignment => {
            assignment.attachments = attachmentMap.get(assignment.id) || []
            assignment.comments = commentMap.get(assignment.id) || []
            assignment.comment_count = assignment.comments.length
          })

          // console.log('✅ [ATTACHMENTS & COMMENTS DEBUG] Fetched data:', {
          //   total_assignments: processedAssignments.length,
          //   assignments_with_attachments: Array.from(attachmentMap.keys()).length,
          //   total_attachments: Array.from(attachmentMap.values()).flat().length,
          //   assignments_with_comments: Array.from(commentMap.keys()).length,
          //   total_comments: Array.from(commentMap.values()).flat().length
          // })
        } catch (error) {
          console.warn('Failed to fetch attachments/comments, continuing without them:', error)
        }
      }

      // Cache in sessionStorage for persistence across page reloads
      try {
        const cacheKey = `assignments-${effectiveUserId}`
        sessionStorage.setItem(cacheKey, JSON.stringify(processedAssignments))
        sessionStorage.setItem(`${cacheKey}-timestamp`, Date.now().toString())
        console.log('[Performance] Assignments data cached in sessionStorage')
      } catch (cacheError) {
        console.warn('[Performance] Failed to cache assignments data in sessionStorage:', cacheError)
      }

      return processedAssignments
    } catch (error) {
      console.error('Error in fetchAssignments:', error)
      return []
    }
  }, [effectiveUserId, academyIds, user?.role, selectedStudent])

  const fetchGradesOptimized = useCallback(async (): Promise<Grade[]> => {
    if (!effectiveUserId || !hasAcademyIds || academyIds.length === 0) return []

    // Check sessionStorage cache first
    try {
      const cacheKey = `grades-${effectiveUserId}`
      const cachedData = sessionStorage.getItem(cacheKey)
      const cachedTimestamp = sessionStorage.getItem(`${cacheKey}-timestamp`)

      if (cachedData && cachedTimestamp) {
        const timeDiff = Date.now() - parseInt(cachedTimestamp)
        const cacheValidFor = 2 * 60 * 1000 // 2 minutes

        if (timeDiff < cacheValidFor) {
          console.log('✅ [fetchGradesOptimized] Using sessionStorage cached data')
          return JSON.parse(cachedData)
        }
      }
    } catch (error) {
      console.warn('[fetchGradesOptimized] Failed to read sessionStorage:', error)
    }

    try {
      // OPTIMIZATION: Break down the complex query into simpler parallel queries
      // Step 1: Get student's enrolled classrooms - FIXED to use same RPC function
      const { data: enrolledClassrooms, error: enrollmentError } = await supabase
        .rpc('get_student_classrooms', {
          student_uuid: effectiveUserId,
          academy_uuids: user?.academyIds || []
        })

      // console.log('🔧 [GRADES DEBUG] Using RPC function result:', {
      //   rpc_function: 'get_student_classrooms',
      //   student_uuid: effectiveUserId,
      //   academy_uuids: user?.academyIds,
      //   result_count: enrolledClassrooms?.length || 0
      // })

      if (enrollmentError) {
        console.error('Error fetching enrollments:', enrollmentError)
        return []
      }
      
      if (!enrolledClassrooms || enrolledClassrooms.length === 0) {
        // console.log('No enrolled classrooms found')
        return []
      }
      
      const classroomIds = enrolledClassrooms.map((ec: any) => ec.classroom_id)
      const classroomMap = new Map()
      enrolledClassrooms.forEach((ec: any) => {
        classroomMap.set(ec.classroom_id, ec.classrooms)
      })
      
      // Step 2: Get sessions for enrolled classrooms - FIXED: Use RPC to bypass RLS
      const { data: sessions } = await supabase
        .rpc('get_classroom_sessions', {
          classroom_uuids: classroomIds
        })

      // console.log('🔧 [GRADES DEBUG] Using RPC function for sessions:', {
      //   rpc_function: 'get_classroom_sessions',
      //   classroom_uuids: classroomIds,
      //   result_count: sessions?.length || 0
      // })

      
      if (!sessions || sessions.length === 0) {
        // console.log('No sessions found')
        return []
      }
      
      const sessionIds = sessions.map((s: any) => s.id)
      const sessionMap = new Map()
      sessions.forEach((s: any) => {
        sessionMap.set(s.id, s)
      })
      
      // Step 3: Get assignments for those sessions - FIXED: Use RPC to bypass RLS
      const { data: assignments } = await supabase
        .rpc('get_assignments_for_sessions', {
          session_uuids: sessionIds
        })

      // console.log('🔧 [GRADES DEBUG] Using RPC function for assignments:', {
      //   rpc_function: 'get_assignments_for_sessions',
      //   session_uuids: sessionIds,
      //   result_count: assignments?.length || 0
      // })

      
      if (!assignments || assignments.length === 0) {
        // console.log('No assignments found')
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
          // console.log('Using cached optimized grades data')
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
      
      // console.log('Optimized grades query result:', {
      //   gradeData,
      //   error,
      //   dataLength: gradeData?.length,
      //   effectiveUserId
      // })
      
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
          assignment_description: assignment.description || '',
          assignment_type: assignment.assignment_type,
          category_name: assignment.category_name || '',
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
          classroom_color: classroom.color || '#3B82F6',
          attachments: [], // Will be populated separately
          session_date: session.date || session.session_date || '',
          created_at: assignment.created_at || (gradeRecord as any).created_at || ''
        }]
      })

      // Fetch attachments separately for all unique assignment IDs
      const uniqueAssignmentIds = [...new Set(formattedGrades.map(grade => grade.id))]
      const attachmentsMap = await fetchAssignmentAttachments(uniqueAssignmentIds)

      // Populate attachments for each grade
      formattedGrades.forEach(grade => {
        grade.attachments = attachmentsMap.get(grade.id) || []
      })

      // Cache in sessionStorage for persistence across page reloads
      try {
        const cacheKey = `grades-${effectiveUserId}`
        sessionStorage.setItem(cacheKey, JSON.stringify(formattedGrades))
        sessionStorage.setItem(`${cacheKey}-timestamp`, Date.now().toString())
        console.log('[Performance] Grades data cached in sessionStorage')
      } catch (cacheError) {
        console.warn('[Performance] Failed to cache grades data in sessionStorage:', cacheError)
      }

      // console.log('OPTIMIZED grades result:', formattedGrades.length, 'grades processed')
      return formattedGrades
    } catch (error) {
      console.error('Error fetching grades:', error)
      return []
    }
  }, [effectiveUserId, hasAcademyIds, academyIds])

  const fetchClassrooms = useCallback(async () => {
    if (!effectiveUserId || !hasAcademyIds) return
    
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
        .in('academy_id', user?.academyIds || [])
        .eq('classroom_students.student_id', effectiveUserId)
      
      if (error) throw error
      
      const userClassrooms = data || []
      
      const formattedClassrooms = [
        {
          id: 'all',
          name: String(t('mobile.assignments.grades.allClassrooms')),
          description: String(t('mobile.assignments.grades.allClassroomsDescription')),
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
  }, [hasAcademyIds, academyIds, effectiveUserId, t])

  // Progressive loading fetchers
  const assignmentsFetcher = useCallback(async () => {
    // console.log('🔍 [ASSIGNMENTS FETCHER] Called with:', { effectiveUserId, hasAcademyIds, isReady })
    if (!effectiveUserId || !hasAcademyIds) {
      // console.log('🚫 [ASSIGNMENTS FETCHER] Returning empty - missing user data')
      return []
    }

    try {
      // console.log('🔄 [ASSIGNMENTS FETCHER] Calling fetchAssignmentsOptimized...')
      const result = await fetchAssignmentsOptimized()
      // console.log('✅ [ASSIGNMENTS FETCHER] Result count:', result?.length || 0)
      return result || []
    } catch (error) {
      console.error('🚨 [ASSIGNMENTS FETCHER] Error caught:', error)
      return []
    }
  }, [effectiveUserId, hasAcademyIds, fetchAssignmentsOptimized, isReady])

  const gradesFetcher = useCallback(async () => {
    if (!effectiveUserId || !hasAcademyIds) return []

    try {
      const result = await fetchGradesOptimized()
      return result || []
    } catch (error) {
      console.error('🚨 [GRADES FETCHER] Error caught:', error)
      return []
    }
  }, [effectiveUserId, hasAcademyIds, fetchGradesOptimized])

  // OPTIMIZATION: Fetch assignments and grades in parallel instead of sequentially
  // Use useStableCallback to prevent cascade refetches on tab switches
  const refetchAllData = useStableCallback(async (options = { silent: false }) => {
    const { silent } = options

    if (!effectiveUserId || !hasAcademyIds) {
      setAssignmentsData([])
      setGradesData([])
      setAssignmentsProgLoading(false)
      setGradesProgLoading(false)
      return
    }

    // Add staleness check - only refresh if data is older than 5 minutes or doesn't exist
    const now = Date.now()
    const dataAge = Math.min(
      assignmentsData.length > 0 ? now - (lastAssignmentsFetch.current || 0) : Infinity,
      gradesData.length > 0 ? now - (lastGradesFetch.current || 0) : Infinity
    )
    const staleTime = 5 * 60 * 1000 // 5 minutes

    if (silent && assignmentsData.length > 0 && gradesData.length > 0 && dataAge < staleTime) {
      console.log(`[refetchAllData] Skipping silent refresh: data is fresh (${Math.round(dataAge / 1000)}s old)`)
      return
    }

    try {
      // Remove complex loading state logic - will be simplified below
      console.log(`🔄 [refetchAllData] Loading state context:`, {
        silent,
        shouldSuppressLoading,
        isReturningFromTab,
        hasAssignments: assignmentsData.length > 0,
        hasGrades: gradesData.length > 0,
        decisionReason: isReturningFromTab ? 'TAB_RETURN_SUPPRESSED' :
                        silent ? 'SILENT_REFRESH' :
                        assignmentsData.length > 0 ? 'HAS_EXISTING_DATA' : 'LEGITIMATE_LOADING'
      })

      // Simplified skeleton logic: Show skeleton when data is empty and not a silent refresh or tab return
      const shouldShowAssignmentSkeleton = !silent && !isReturningFromTab && assignmentsData.length === 0
      const shouldShowGradeSkeleton = !silent && !isReturningFromTab && gradesData.length === 0

      console.log(`🦴 [refetchAllData] Skeleton loading decisions:`, {
        silent,
        isReturningFromTab,
        assignmentsEmpty: assignmentsData.length === 0,
        gradesEmpty: gradesData.length === 0,
        shouldShowAssignmentSkeleton,
        shouldShowGradeSkeleton
      })

      if (shouldShowAssignmentSkeleton) setAssignmentsProgLoading(true)
      if (shouldShowGradeSkeleton) setGradesProgLoading(true)

      // console.log('🚀 [PARALLEL FETCH] Starting parallel assignments and grades fetch...')

      // Fetch assignments and grades in parallel
      const [assignmentsResult, gradesResult] = await Promise.all([
        assignmentsFetcher(),
        gradesFetcher()
      ])

      // console.log(`✅ [PARALLEL FETCH] Completed`)
      // console.log(`📊 [PARALLEL FETCH] Results: ${assignmentsResult?.length || 0} assignments, ${gradesResult?.length || 0} grades`)

      setAssignmentsData(assignmentsResult || [])
      setGradesData(gradesResult || [])

      // Record successful fetch timestamps for staleness tracking
      const fetchTime = Date.now()
      if (assignmentsResult && assignmentsResult.length > 0) {
        lastAssignmentsFetch.current = fetchTime
      }
      if (gradesResult && gradesResult.length > 0) {
        lastGradesFetch.current = fetchTime
      }
    } catch (error) {
      console.error('❌ [PARALLEL FETCH] Error:', error)
      setAssignmentsData([])
      setGradesData([])
    } finally {
      setAssignmentsProgLoading(false)
      setGradesProgLoading(false)
    }
  })

  // Pull-to-refresh handlers
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    setPullDistance(0)

    try {
      // console.log('🔄 [REFRESH] Starting parallel refresh...')

      // Force refresh both assignments and grades data in parallel
      await Promise.all([
        refetchAllData(),
        fetchClassrooms()
      ])

      // console.log(`✅ [REFRESH] Completed`)
    } catch (error) {
      console.error('Error refreshing data:', error)
    } finally {
      setIsRefreshing(false)
    }
  }, [refetchAllData, fetchClassrooms])

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

  // Replace useMobileData with direct useEffect pattern like working pages
  // Initialize from sessionStorage synchronously to prevent skeleton flash
  const [assignmentsData, setAssignmentsData] = useState<any[]>(() => {
    if (typeof window === 'undefined' || !effectiveUserId) return []

    try {
      const cacheKey = `assignments-${effectiveUserId}`
      const cachedData = sessionStorage.getItem(cacheKey)
      const cachedTimestamp = sessionStorage.getItem(`${cacheKey}-timestamp`)

      if (cachedData && cachedTimestamp) {
        const timeDiff = Date.now() - parseInt(cachedTimestamp)
        const cacheValidFor = 2 * 60 * 1000 // 2 minutes

        if (timeDiff < cacheValidFor) {
          console.log('✅ [AssignmentsPage] Using sessionStorage cached data on init')
          return JSON.parse(cachedData)
        }
      }
    } catch (error) {
      console.warn('[AssignmentsPage] Failed to read sessionStorage:', error)
    }

    return []
  })

  // Check if we have cached data
  const hasCachedAssignments = assignmentsData.length > 0

  // Smart loading state initialization: only show loading if we have no cached data
  const [assignmentsProgLoading, setAssignmentsProgLoading] = useState(() => {
    const shouldShowInitialLoading = !shouldSuppressLoading && !hasCachedAssignments
    console.log('🚀 [AssignmentsPage] Initial assignments loading state:', {
      shouldSuppressLoading,
      hasCachedData: hasCachedAssignments,
      shouldShowInitialLoading
    })
    return shouldShowInitialLoading
  })
  const lastAssignmentsFetch = useRef<number>(0)

  const invalidateAssignments = useCallback(() => {
    // Don't clear data and show skeletons if this is a tab switch
    if (simpleTabDetection.isTrueTabReturn()) {
      console.log('🚫 [AssignmentsPage] Suppressing assignments invalidation - navigation detected')
      return
    }
    setAssignmentsData([])
    setAssignmentsProgLoading(true)
  }, [])



  // Direct useEffect pattern with parallel fetching
  // refetchAllData is now stable, so we don't need it in dependencies
  useEffect(() => {
    if (effectiveUserId && hasAcademyIds) {
      // Enhanced tab switch detection
      const hasExistingData = assignmentsData.length > 0 && gradesData.length > 0
      const shouldSuppressInitialLoading = shouldSuppressLoading || isReturningFromTab

      console.log('🎯 [DEBUG] useEffect triggered:', {
        effectiveUserId,
        hasAcademyIds,
        assignmentsCount: assignmentsData.length,
        gradesCount: gradesData.length,
        hasExistingData,
        shouldSuppressLoading,
        isReturningFromTab,
        shouldSuppressInitialLoading,
        willBeSilent: hasExistingData || shouldSuppressInitialLoading
      })

      // Page visit tracking no longer needed with unified navigation awareness

      // Force silent refresh if returning from tab OR we have existing data OR suppression is active
      const shouldBeSilent = hasExistingData || shouldSuppressInitialLoading
      refetchAllData({ silent: shouldBeSilent })
    }
  }, [effectiveUserId, hasAcademyIds])


  // Progressive loading for grades

  // Replace useMobileData with direct useEffect pattern for grades too
  // Initialize from sessionStorage synchronously
  const [gradesData, setGradesData] = useState<any[]>(() => {
    if (typeof window === 'undefined' || !effectiveUserId) return []

    try {
      const cacheKey = `grades-${effectiveUserId}`
      const cachedData = sessionStorage.getItem(cacheKey)
      const cachedTimestamp = sessionStorage.getItem(`${cacheKey}-timestamp`)

      if (cachedData && cachedTimestamp) {
        const timeDiff = Date.now() - parseInt(cachedTimestamp)
        const cacheValidFor = 2 * 60 * 1000 // 2 minutes

        if (timeDiff < cacheValidFor) {
          console.log('✅ [AssignmentsPage/Grades] Using sessionStorage cached data on init')
          return JSON.parse(cachedData)
        }
      }
    } catch (error) {
      console.warn('[AssignmentsPage/Grades] Failed to read sessionStorage:', error)
    }

    return []
  })

  const hasCachedGrades = gradesData.length > 0

  // Smart loading state initialization for grades
  const [gradesProgLoading, setGradesProgLoading] = useState(() => {
    const shouldShowInitialLoading = !shouldSuppressLoading && !hasCachedGrades
    console.log('🚀 [AssignmentsPage] Initial grades loading state:', {
      shouldSuppressLoading,
      hasCachedData: hasCachedGrades,
      shouldShowInitialLoading
    })
    return shouldShowInitialLoading
  })
  const lastGradesFetch = useRef<number>(0)

  const invalidateGrades = useCallback(() => {
    // Don't clear data and show skeletons if this is a tab switch
    if (simpleTabDetection.isTrueTabReturn()) {
      console.log('🚫 [AssignmentsPage] Suppressing grades invalidation - navigation detected')
      return
    }
    setGradesData([])
    setGradesProgLoading(true)
  }, [])

  // Consolidate related useEffect hooks to reduce re-renders
  useEffect(() => {
    if (assignmentsData) {
      setAssignments(assignmentsData)
    }
    if (gradesData) {
      setGrades(gradesData)
    }
  }, [assignmentsData, gradesData, setAssignments, setGrades])

  // Memoize fetchClassrooms to prevent unnecessary re-calls
  const memoizedFetchClassrooms = useCallback(() => {
    if (effectiveUserId && hasAcademyIds) {
      fetchClassrooms()
    }
  }, [effectiveUserId, hasAcademyIds, fetchClassrooms])

  useEffect(() => {
    memoizedFetchClassrooms()
  }, [memoizedFetchClassrooms])

  // Smart cache invalidation - only when student actually changes
  const prevStudentId = useRef(selectedStudent?.id)
  useEffect(() => {
    if (selectedStudent?.id && selectedStudent.id !== prevStudentId.current) {
      // console.log('👥 [ASSIGNMENTS] Student changed - smart cache invalidation:', {
      //   prevStudentId: prevStudentId.current,
      //   newStudentId: selectedStudent.id,
      //   newStudentName: selectedStudent.name,
      //   effectiveUserId,
      //   timestamp: new Date().toISOString()
      // })

      // Only invalidate data that's actually student-specific
      invalidateAssignments()
      invalidateGrades()

      // Only invalidate universal caches if we actually have academyIds
      if (hasAcademyIds && academyIds.length > 0) {
        // Only invalidate for the specific academies this student belongs to
        academyIds.forEach(academyId => {
          CacheUtils.onDataModified(CacheCategory.ASSIGNMENTS, academyId)
        })
      }

      // Update the ref to track the current student
      prevStudentId.current = selectedStudent.id

      // Refresh data for new student (silent refresh to avoid loading screen)
      if (effectiveUserId && hasAcademyIds) {
        refetchAllData({ silent: true })
      }
    }
  }, [selectedStudent?.id, effectiveUserId, invalidateAssignments, invalidateGrades, hasAcademyIds, academyIds])

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, sortBy])

  // Reset grades pagination when filters change
  useEffect(() => {
    setCurrentGradesPage(1)
  }, [currentCarouselIndex, sortBy, selectedTimePeriod, selectedAcademyId, gradesSearchQuery])

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
      const dateKey = new Date(assignment.session_date).toDateString()
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(assignment)
    })

    // Sort assignments within each date group based on current sort setting
    Object.keys(grouped).forEach(dateKey => {
      grouped[dateKey].sort((a, b) => {
        if (sortBy?.field === 'session') {
          const aSession = new Date(a.session_date).getTime()
          const bSession = new Date(b.session_date).getTime()
          return sortBy.direction === 'desc' ? bSession - aSession : aSession - bSession
        } else if (sortBy?.field === 'due') {
          const aDue = new Date(a.due_date).getTime()
          const bDue = new Date(b.due_date).getTime()
          return sortBy.direction === 'desc' ? bDue - aDue : aDue - bDue
        } else {
          // Default sort by session date (latest first)
          const aSession = new Date(a.session_date).getTime()
          const bSession = new Date(b.session_date).getTime()
          return bSession - aSession
        }
      })
    })

    return grouped
  }

  // Filter and sort assignments based on search query and sort option
  const filterAssignments = (assignments: Assignment[], query: string) => {
    let filtered = assignments

    // Text search filter
    if (query.trim()) {
      const lowerQuery = query.toLowerCase()
      filtered = filtered.filter(assignment =>
        assignment.title.toLowerCase().includes(lowerQuery) ||
        assignment.description.toLowerCase().includes(lowerQuery) ||
        assignment.classroom_name.toLowerCase().includes(lowerQuery) ||
        assignment.teacher_name.toLowerCase().includes(lowerQuery) ||
        assignment.assignment_type.toLowerCase().includes(lowerQuery)
      )
    }

    // Sort based on selected option
    if (sortBy?.field === 'session') {
      return filtered.sort((a, b) => {
        const aSession = new Date(a.session_date).getTime()
        const bSession = new Date(b.session_date).getTime()
        return sortBy.direction === 'desc' ? bSession - aSession : aSession - bSession
      })
    } else if (sortBy?.field === 'due') {
      return filtered.sort((a, b) => {
        const aDue = new Date(a.due_date).getTime()
        const bDue = new Date(b.due_date).getTime()
        return sortBy.direction === 'desc' ? bDue - aDue : aDue - bDue
      })
    }

    // Default sort by session date (latest first)
    return filtered.sort((a, b) => {
      const aSession = new Date(a.session_date).getTime()
      const bSession = new Date(b.session_date).getTime()
      return bSession - aSession // Latest first
    })
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
      const updatedAssignments = assignments.map((assignment: any): any => {
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
    const allGrades = classroomId && classroomId !== 'all'
      ? grades.filter(grade => grade.classroom_id === classroomId)
      : grades

    // Use SAME filtering logic as the average grade card
    // Include all assignments, treating 'not submitted' as 0
    const gradeableGrades = allGrades.map(grade => {
      if (typeof grade.grade === 'number') {
        return grade // Keep as is
      } else if (grade.status === 'not submitted' || grade.status === 'not_submitted') {
        return { ...grade, grade: 0 } // Convert not submitted to 0
      } else {
        return null // Exclude pending/submitted but not graded
      }
    }).filter(grade => grade !== null) as Grade[]

    // For graph visualization, we need grades with submission dates
    // But we'll also add current overall average as final point
    const submittedGrades = gradeableGrades.filter(grade => grade.submitted_date && grade.submitted_date.trim() !== '')
    submittedGrades.sort((a, b) => new Date(a.submitted_date!).getTime() - new Date(b.submitted_date!).getTime())

    if (gradeableGrades.length === 0) {
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
      case 'ALL':
        periodStartDate = null // No filtering for 'ALL'
        break
    }

    // Filter submitted grades by time period for visualization
    let periodSubmittedGrades = submittedGrades
    if (periodStartDate) {
      periodSubmittedGrades = submittedGrades.filter(grade => {
        const submittedDate = new Date(grade.submitted_date!)
        return submittedDate >= periodStartDate! && submittedDate <= periodEndDate
      })
    }

    // Calculate overall average for final point (using same logic as grade card)
    const overallAverage = gradeableGrades.length > 0 ?
      Math.round(gradeableGrades.reduce((sum, grade) => sum + (grade.grade as number), 0) / gradeableGrades.length)
      : 0

    const progressionData: Array<{
      date: string
      average: number
      count: number
      assignmentTitle: string
    }> = []

    // NEW APPROACH: Show actual individual grades, not cumulative averages
    // This gives a more accurate picture of performance over time

    // Group submitted grades by date for timeline visualization
    const gradesByDate = new Map<string, Grade[]>()

    periodSubmittedGrades.forEach(grade => {
      const dateKey = new Date(grade.submitted_date!).toLocaleDateString(currentLang, {
        month: 'short',
        day: 'numeric'
      })

      if (!gradesByDate.has(dateKey)) {
        gradesByDate.set(dateKey, [])
      }
      gradesByDate.get(dateKey)!.push(grade)
    })

    // For each date, calculate the average of grades submitted that day
    gradesByDate.forEach((gradesOnDate, dateKey) => {
      const dayTotal = gradesOnDate.reduce((sum, g) => sum + (g.grade as number), 0)
      const dayAverage = Math.round(dayTotal / gradesOnDate.length)

      progressionData.push({
        date: dateKey,
        average: dayAverage,
        count: gradesOnDate.length,
        assignmentTitle: gradesOnDate.length === 1
          ? gradesOnDate[0].assignment_title || 'Assignment'
          : `${gradesOnDate.length} assignments`
      })
    })

    // Sort by date
    progressionData.sort((a, b) => {
      const dateA = new Date(a.date)
      const dateB = new Date(b.date)
      return dateA.getTime() - dateB.getTime()
    })

    // ALWAYS add final point showing current overall average (matches grade card)
    const today = new Date()
    const todayKey = today.toLocaleDateString(currentLang, {
      month: 'short',
      day: 'numeric'
    })

    // Only add today's point if it's different from the last point or if we have no points
    const lastPoint = progressionData[progressionData.length - 1]
    if (!lastPoint || lastPoint.date !== todayKey || lastPoint.average !== overallAverage) {
      progressionData.push({
        date: todayKey,
        average: overallAverage,
        count: gradeableGrades.length,
        assignmentTitle: 'Current Average'
      })
    }

    // If still very few data points, use moving average for smoother visualization
    if (progressionData.length < 3 && periodSubmittedGrades.length > 0) {
      const movingAverageData: Array<{
        date: string
        average: number
        count: number
        assignmentTitle: string
      }> = []
      const windowSize = Math.min(3, periodSubmittedGrades.length)

      for (let i = 0; i < periodSubmittedGrades.length; i++) {
        const startIdx = Math.max(0, i - Math.floor(windowSize / 2))
        const endIdx = Math.min(periodSubmittedGrades.length, startIdx + windowSize)
        const window = periodSubmittedGrades.slice(startIdx, endIdx)

        const windowAvg = Math.round(
          window.reduce((sum, g) => sum + (g.grade as number), 0) / window.length
        )

        movingAverageData.push({
          date: new Date(periodSubmittedGrades[i].submitted_date!).toLocaleDateString(currentLang, {
            month: 'short',
            day: 'numeric'
          }),
          average: windowAvg,
          count: window.length,
          assignmentTitle: periodSubmittedGrades[i].assignment_title || 'Assignment'
        })
      }

      // Add final overall average point to moving average too
      movingAverageData.push({
        date: todayKey,
        average: overallAverage,
        count: gradeableGrades.length,
        assignmentTitle: 'Current Average'
      })

      return movingAverageData
    }

    return progressionData
  }

  // Show loading while auth is initializing OR while initial data is loading
  if (authLoading || assignmentsProgLoading || gradesProgLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {t('mobile.assignments.title')}
          </h1>
        </div>
        <StaggeredListSkeleton items={5} />
      </div>
    )
  }

  // Show message if not ready (no user or missing academy IDs)
  if (!isReady) {
    return (
      <div className="p-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {t('mobile.assignments.title')}
          </h1>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-2">
            <BookOpen className="w-8 h-8 mx-auto text-gray-300" />
            <p className="text-gray-500 font-medium">
              {!effectiveUserId ? t('mobile.common.selectStudent') : t('mobile.common.noAcademies')}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <MobilePageErrorBoundary>
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

      {/* Search and Sort - Only show on assignments tab */}
      {activeTab === 'assignments' && (
        <div className="mb-4 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={String(t('common.search'))}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          {/* Sort Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (sortBy?.field === 'session') {
                  // Toggle direction if already sorting by session
                  setSortBy({field: 'session', direction: sortBy.direction === 'desc' ? 'asc' : 'desc'})
                } else {
                  // Start with latest to oldest (desc)
                  setSortBy({field: 'session', direction: 'desc'})
                }
              }}
              className={`px-3 py-2 border rounded-lg flex items-center gap-2 text-sm transition-colors ${
                sortBy?.field === 'session'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <Clock className="w-4 h-4" />
              <div className="flex flex-col items-start">
                <span>{t('mobile.assignments.sort.sessionDate')}</span>
              </div>
              {sortBy?.field === 'session' ? (
                sortBy.direction === 'desc' ? (
                  <ArrowDown className="w-3 h-3" />
                ) : (
                  <ArrowUp className="w-3 h-3" />
                )
              ) : (
                <ArrowUpDown className="w-3 h-3" />
              )}
            </button>
            <button
              onClick={() => {
                if (sortBy?.field === 'due') {
                  // Toggle direction if already sorting by due
                  setSortBy({field: 'due', direction: sortBy.direction === 'desc' ? 'asc' : 'desc'})
                } else {
                  // Start with latest to oldest (desc)
                  setSortBy({field: 'due', direction: 'desc'})
                }
              }}
              className={`px-3 py-2 border rounded-lg flex items-center gap-2 text-sm transition-colors ${
                sortBy?.field === 'due'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              <div className="flex flex-col items-start">
                <span>{t('mobile.assignments.sort.dueDate')}</span>
              </div>
              {sortBy?.field === 'due' ? (
                sortBy.direction === 'desc' ? (
                  <ArrowDown className="w-3 h-3" />
                ) : (
                  <ArrowUp className="w-3 h-3" />
                )
              ) : (
                <ArrowUpDown className="w-3 h-3" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'assignments' ? (
        /* Assignments Tab */
        (() => {
          // Show skeleton ONLY when loading AND we have no cached data
          if (assignmentsProgLoading && assignmentsData.length === 0) {
            console.log('🦴 [AssignmentsTab] Showing assignments skeleton (no cached data)')
            return <StaggeredListSkeleton items={4} />
          }

          // Show assignments content - use assignmentsData if Zustand hasn't hydrated yet
          const displayAssignments = assignments.length > 0 ? assignments : assignmentsData
          if (displayAssignments.length > 0) {
            const filteredAssignments = filterAssignments(displayAssignments as any[], searchQuery)

            // Pagination
            const totalPages = Math.ceil(filteredAssignments.length / itemsPerPage)
            const startIndex = (currentPage - 1) * itemsPerPage
            const endIndex = startIndex + itemsPerPage
            const paginatedAssignments = filteredAssignments.slice(startIndex, endIndex)

            return filteredAssignments.length > 0 ? (
              <>
              <div className="space-y-10">
                {Object.entries(groupAssignmentsByDate(paginatedAssignments)).map(([dateKey, dateAssignments]) => (
                  <div key={dateKey}>
                {/* Date Header */}
                <div className="relative text-center mb-4">
                  <hr className="border-gray-200 absolute top-1/2 left-0 right-0" />
                  <h2 className="text-lg font-medium text-gray-600 bg-white px-4 relative inline-block">
                    {formatDateHeader(dateAssignments[0].session_date)}
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
                            {assignment.classroom_name} · {assignment.academy_name}
                          </p>
                        </div>
                      </div>

                      {/* Subject and Category Group */}
                      <div className="mb-2">
                        <div className="mb-1 flex items-center gap-2 flex-wrap">
                          <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                            {assignment.subject}
                          </span>
                          {assignment.category_name && (
                            <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                              {assignment.category_name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-lg font-semibold text-gray-900 flex-1">
                            {assignment.title}
                          </h3>
                          <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded flex-shrink-0">
                            {t(`mobile.assignments.types.${assignment.assignment_type.toLowerCase()}`)}
                          </span>
                        </div>
                        {assignment.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {assignment.description}
                          </p>
                        )}

                        {/* Assignment Attachments */}
                        {assignment.attachments && assignment.attachments.length > 0 && (
                          <div className="mt-3">
                            <div className="flex items-center gap-1 mb-2">
                              <Paperclip className="w-4 h-4 text-gray-500" />
                              <span className="text-sm font-medium text-gray-700">
                                Attachments ({assignment.attachments.length})
                              </span>
                            </div>
                            <div className="space-y-2">
                              {assignment.attachments.map((attachment) => {
                                const FileIcon = getFileIcon(attachment.file_type)
                                return (
                                  <div
                                    key={attachment.id}
                                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border"
                                  >
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <FileIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                      <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                          {attachment.file_name}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          {formatFileSize(attachment.file_size)}
                                        </p>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => setViewingFile(attachment)}
                                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
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

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between px-4">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('pagination.previous')}
                  </button>
                  <span className="text-sm text-gray-700">
                    {t('pagination.page')} {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('pagination.next')}
                  </button>
                </div>
              )}
              </>
            ) : (
              <Card className="p-6">
                <div className="text-center">
                  <Search className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">{t('mobile.assignments.noSearchResults')}</p>
                  <p className="text-sm text-gray-400 mt-1">{t('mobile.assignments.tryDifferentSearch')}</p>
                </div>
              </Card>
            )
          } else {
            // Handle case when there are no assignments at all
            return (
              <Card className="p-6">
                <div className="text-center">
                  <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">{t('mobile.assignments.noAssignments')}</p>
                  <p className="text-sm text-gray-400 mt-1">{t('mobile.assignments.checkBackLater')}</p>
                </div>
              </Card>
            )
          }
        })()
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
                {(['7D', '1M', '3M', '6M', '1Y', 'ALL'] as const).map((period) => (
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

          {/* Search Bar for Grades */}
          <div className="relative flex-1 mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={String(t('common.search'))}
              value={gradesSearchQuery}
              onChange={(e) => setGradesSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Sort Filter Buttons for Grades */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => {
                if (sortBy?.field === 'session') {
                  setSortBy({field: 'session', direction: sortBy.direction === 'desc' ? 'asc' : 'desc'})
                } else {
                  setSortBy({field: 'session', direction: 'desc'})
                }
              }}
              className={`px-3 py-2 border rounded-lg flex items-center gap-2 text-sm transition-colors ${
                sortBy?.field === 'session'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <Clock className="w-4 h-4" />
              <div className="flex flex-col items-start">
                <span>{t('mobile.assignments.sort.sessionDate')}</span>
              </div>
              {sortBy?.field === 'session' ? (
                sortBy.direction === 'desc' ? (
                  <ArrowDown className="w-3 h-3" />
                ) : (
                  <ArrowUp className="w-3 h-3" />
                )
              ) : (
                <ArrowUpDown className="w-3 h-3" />
              )}
            </button>

            <button
              onClick={() => {
                if (sortBy?.field === 'due') {
                  setSortBy({field: 'due', direction: sortBy.direction === 'desc' ? 'asc' : 'desc'})
                } else {
                  setSortBy({field: 'due', direction: 'desc'})
                }
              }}
              className={`px-3 py-2 border rounded-lg flex items-center gap-2 text-sm transition-colors ${
                sortBy?.field === 'due'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              <div className="flex flex-col items-start">
                <span>{t('mobile.assignments.sort.dueDate')}</span>
              </div>
              {sortBy?.field === 'due' ? (
                sortBy.direction === 'desc' ? (
                  <ArrowDown className="w-3 h-3" />
                ) : (
                  <ArrowUp className="w-3 h-3" />
                )
              ) : (
                <ArrowUpDown className="w-3 h-3" />
              )}
            </button>
          </div>

          {/* Existing Grades List */}
          {(() => {
            // Show skeleton ONLY when loading AND we have no cached data
            if (gradesProgLoading && gradesData.length === 0) {
              console.log('🦴 [GradesTab] Showing grades skeleton (no cached data)')
              return <StaggeredListSkeleton items={4} />
            }

            // Show grades content - use gradesData if Zustand hasn't hydrated yet
            const displayGrades = grades.length > 0 ? grades : gradesData
            if (displayGrades.length > 0) {
              return (
                <div className="space-y-3">
                  {(() => {
                // Get the currently selected classroom
                const selectedClassroom = getFilteredClassrooms()[currentCarouselIndex]
                
                // Filter by classroom only (statistics show cumulative average)
                // The time period selection affects the chart timeline, not the cumulative average
                let filteredGrades = selectedClassroom?.id === 'all'
                  ? displayGrades
                  : displayGrades.filter(grade => grade.classroom_id === selectedClassroom?.id)

                // Apply search filter
                if (gradesSearchQuery.trim()) {
                  const searchLower = gradesSearchQuery.toLowerCase()
                  filteredGrades = filteredGrades.filter(grade =>
                    grade.assignment_title?.toLowerCase().includes(searchLower) ||
                    grade.assignment_description?.toLowerCase().includes(searchLower) ||
                    grade.subject?.toLowerCase().includes(searchLower) ||
                    grade.classroom_name?.toLowerCase().includes(searchLower) ||
                    grade.teacher_name?.toLowerCase().includes(searchLower) ||
                    grade.category_name?.toLowerCase().includes(searchLower) ||
                    grade.assignment_type?.toLowerCase().includes(searchLower)
                  )
                }

                // Apply sorting if sortBy is set
                if (sortBy) {
                  filteredGrades = [...filteredGrades].sort((a, b) => {
                    let aValue: string, bValue: string

                    if (sortBy.field === 'session') {
                      aValue = (a as any).session_date || (a as any).created_at || ''
                      bValue = (b as any).session_date || (b as any).created_at || ''
                    } else if (sortBy.field === 'due') {
                      aValue = a.due_date || ''
                      bValue = b.due_date || ''
                    } else {
                      return 0
                    }

                    const comparison = new Date(aValue).getTime() - new Date(bValue).getTime()
                    return sortBy.direction === 'asc' ? comparison : -comparison
                  })
                }

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

                // Pagination for grades
                const gradesTotalPages = Math.ceil(filteredGrades.length / itemsPerPage)
                const gradesStartIndex = (currentGradesPage - 1) * itemsPerPage
                const gradesEndIndex = gradesStartIndex + itemsPerPage
                const paginatedGrades = filteredGrades.slice(gradesStartIndex, gradesEndIndex)

                return (
                  <>
                  <div className="space-y-4">
                    {paginatedGrades.map((grade) => (
              <Card key={grade.id} className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 pr-2">
                    {/* Classroom Name with Icon */}
                    <div className="flex items-center gap-1 mb-4">
                      <School className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600 font-medium">{grade.classroom_name}</span>
                    </div>

                    {/* Subject, Category, and Assignment Type Group */}
                    <div className="mb-1 flex items-center gap-2 flex-wrap">
                      <Badge className="bg-blue-100 text-blue-800">
                        {grade.subject}
                      </Badge>
                      {(grade as any).category_name && (
                        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300">
                          {(grade as any).category_name}
                        </Badge>
                      )}
                      {grade.assignment_type && (
                        <Badge className={
                          grade.assignment_type?.toLowerCase() === 'homework' ? 'bg-gray-100 text-gray-800' :
                          grade.assignment_type?.toLowerCase() === 'quiz' ? 'bg-purple-100 text-purple-800' :
                          grade.assignment_type?.toLowerCase() === 'test' ? 'bg-red-100 text-red-800' :
                          grade.assignment_type?.toLowerCase() === 'project' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {t(`mobile.assignments.types.${grade.assignment_type?.toLowerCase()}`)}
                        </Badge>
                      )}
                    </div>

                    {/* Assignment Title */}
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {grade.assignment_title}
                    </h3>

                    {grade.assignment_description && (
                      <p className="text-sm text-gray-600 mb-2">
                        {grade.assignment_description}
                      </p>
                    )}

                    {/* Assignment Attachments */}
                    {(grade as any).attachments && (grade as any).attachments.length > 0 && (
                      <div className="mb-3">
                        <div className="flex items-center gap-1 mb-2">
                          <Paperclip className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">
                            Attachments ({(grade as any).attachments.length})
                          </span>
                        </div>
                        <div className="space-y-2">
                          {(grade as any).attachments.map((attachment: any) => {
                            const FileIcon = getFileIcon(attachment.file_type)
                            return (
                              <div
                                key={attachment.id}
                                className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border"
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <FileIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                      {attachment.file_name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {formatFileSize(attachment.file_size)}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => setViewingFile(attachment)}
                                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadgeGrade(grade.status)}
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
                          {grade.teacher_name.split(' ').map((n: string) => n[0]).join('')}
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
                    {grade.classroom_name} · {grade.teacher_name}
                  </p>
                </div>
              </Card>
                    ))}
                  </div>

                  {/* Pagination Controls for Grades */}
                  {gradesTotalPages > 1 && (
                    <div className="mt-6 flex items-center justify-between px-4">
                      <button
                        onClick={() => setCurrentGradesPage(p => Math.max(1, p - 1))}
                        disabled={currentGradesPage === 1}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {t('pagination.previous')}
                      </button>
                      <span className="text-sm text-gray-700">
                        {t('pagination.page')} {currentGradesPage} / {gradesTotalPages}
                      </span>
                      <button
                        onClick={() => setCurrentGradesPage(p => Math.min(gradesTotalPages, p + 1))}
                        disabled={currentGradesPage >= gradesTotalPages}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {t('pagination.next')}
                      </button>
                    </div>
                  )}
                  </>
                )
                  })()}
                </div>
              )
            } else {
              return (
                <Card className="p-4 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <AlertCircle className="w-6 h-6 text-gray-300" />
                    <div className="text-gray-500 font-medium text-sm leading-tight">{t('mobile.assignments.noGrades')}</div>
                  </div>
                </Card>
              )
            }
          })()}
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

    {/* File Viewer Bottom Sheet */}
    <FileViewerBottomSheet
      isOpen={!!viewingFile}
      onClose={() => setViewingFile(null)}
      attachment={viewingFile}
    />
  </MobilePageErrorBoundary>
  )
}

export default function MobileAssignmentsPage() {
  return (
    <MobilePageErrorBoundary>
      <MobileAssignmentsPageContent />
    </MobilePageErrorBoundary>
  )
}