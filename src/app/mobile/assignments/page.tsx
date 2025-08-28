"use client"

import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { useMobileData } from '@/hooks/useProgressiveLoading'
import { getTeacherNamesWithCache } from '@/utils/mobileCache'
import { useAssignments, useGrades } from '@/stores/mobileStore'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatSkeleton, AssignmentCardSkeleton, GradeCardSkeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { ClipboardList, Calendar, ChevronRight, AlertCircle, MessageCircle, Share, BookOpen, ChevronLeft, ChevronDown } from 'lucide-react'
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
}

interface Grade {
  id: string
  assignment_title: string
  assignment_type?: 'homework' | 'quiz' | 'test' | 'project'
  subject: string
  grade: string | number
  max_points: number
  graded_date: string
  teacher_name: string
  classroom_name: string
  classroom_id?: string
  status: 'graded' | 'submitted' | 'pending' | 'late' | 'not submitted' | 'excused' | 'overdue'
  due_date: string
  submitted_date?: string
  comment_count: number
  teacher_comment?: string
  classroom_color?: string
}

export default function MobileAssignmentsPage() {
  const { t } = useTranslation()
  const { user } = usePersistentMobileAuth()
  const { language } = useLanguage()
  
  // Use Zustand store with progressive loading
  const {
    assignments,
    isLoading: loading,
    setAssignments,
    setLoading
  } = useAssignments()
  
  const {
    grades,
    isLoading: gradesLoading,
    setGrades,
    setLoading: setGradesLoading
  } = useGrades()
  const [classrooms, setClassrooms] = useState<any[]>([
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
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')
  const [statusFilter, setStatusFilter] = useState<'all' | 'graded' | 'submitted' | 'pending' | 'overdue' | 'excused' | 'late'>('all')
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<'7D' | '1M' | '3M' | '6M' | '1Y' | 'All'>('3M')

  const nextCarouselItem = () => {
    setCurrentCarouselIndex((prev) => (prev + 1) % classrooms.length)
  }

  const prevCarouselItem = () => {
    setCurrentCarouselIndex((prev) => (prev - 1 + classrooms.length) % classrooms.length)
  }

  const getColorClasses = (color: string) => {
    const colorMap = {
      purple: {
        card: 'from-purple-100 to-purple-50 border-purple-200',
        icon: 'bg-purple-500'
      },
      blue: {
        card: 'from-blue-100 to-blue-50 border-blue-200',
        icon: 'bg-blue-500'
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
      indigo: {
        card: 'from-indigo-100 to-indigo-50 border-indigo-200',
        icon: 'bg-indigo-500'
      }
    }
    return colorMap[color as keyof typeof colorMap] || colorMap.purple
  }

  // Progressive loading for assignments
  const assignmentsFetcher = useCallback(async () => {
    if (!user?.userId || !user?.academyId) return []
    return await fetchAssignmentsOptimized()
  }, [user])
  
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
    if (!user?.userId || !user?.academyId) return []
    return await fetchGradesOptimized()
  }, [user])
  
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
    if (user?.userId && user?.academyId) {
      fetchClassrooms()
    }
  }, [user])

  const fetchClassrooms = async () => {
    if (!user?.userId || !user?.academyId) return
    
    try {
      const { data, error } = await supabase
        .from('classrooms')
        .select(`
          id,
          name,
          color,
          subject,
          classroom_students!inner(
            student_id
          )
        `)
        .eq('academy_id', user.academyId)
        .eq('classroom_students.student_id', user.userId)
      
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
          description: classroom.subject || 'Classroom',
          icon: BookOpen,
          color: classroom.color || 'blue'
        }))
      ]
      
      setClassrooms(formattedClassrooms)
    } catch (error) {
      console.error('Error fetching classrooms:', error)
    }
  }

  // Optimized teacher name fetching with cache
  const getTeacherNames = getTeacherNamesWithCache

  const fetchAssignmentsOptimized = async (): Promise<Assignment[]> => {
    if (!user?.userId || !user?.academyId) {
      console.log('Missing user data:', { userId: user?.userId, academyId: user?.academyId })
      return []
    }
    
    try {
      console.log('Starting optimized fetchAssignments for user:', user.userId, 'academy:', user.academyId)
      
      // OPTIMIZATION: Break down complex queries into simpler ones
      // Step 1: Get student's enrolled classrooms
      const { data: enrolledClassrooms } = await supabase
        .from('classroom_students')
        .select(`
          classroom_id,
          classrooms!inner(
            id,
            name,
            color,
            subject,
            academy_id,
            teacher_id
          )
        `)
        .eq('student_id', user.userId)
        .eq('classrooms.academy_id', user.academyId)
      
      if (!enrolledClassrooms || enrolledClassrooms.length === 0) {
        console.log('No enrolled classrooms found')
        return []
      }
      
      const classroomIds = enrolledClassrooms.map(ec => ec.classroom_id)
      const classroomMap = new Map()
      enrolledClassrooms.forEach(ec => {
        classroomMap.set(ec.classroom_id, ec.classrooms)
      })
      
      // Step 2: Get sessions for enrolled classrooms
      const { data: sessions } = await supabase
        .from('classroom_sessions')
        .select(`
          id,
          classroom_id,
          date
        `)
        .in('classroom_id', classroomIds)
      
      if (!sessions || sessions.length === 0) {
        console.log('No sessions found')
        return []
      }
      
      const sessionIds = sessions.map(s => s.id)
      const sessionMap = new Map()
      sessions.forEach(s => {
        sessionMap.set(s.id, { ...s, classroom: classroomMap.get(s.classroom_id) })
      })
      
      // Step 3: Get assignments first
      const assignmentsResult = await supabase
        .from('assignments')
        .select(`
          id,
          title,
          description,
          assignment_type,
          due_date,
          created_at,
          classroom_session_id
        `)
        .in('classroom_session_id', sessionIds)
        .is('deleted_at', null)
        .order('due_date', { ascending: true })
      
      if (assignmentsResult.error) {
        console.error('Error fetching assignments:', assignmentsResult.error)
        return []
      }
      
      const assignments = assignmentsResult.data || []
      const assignmentIds = assignments.map(a => a.id)
      
      // Step 4: Get grades only for fetched assignments to prevent timeout
      let gradesResult: any = { data: null, error: null }
      if (assignmentIds.length > 0) {
        gradesResult = await supabase
          .from('assignment_grades')
          .select('assignment_id, status, score, submitted_date')
          .eq('student_id', user.userId)
          .in('assignment_id', assignmentIds)
          .limit(100)
      }

      console.log('Fetched assignments:', assignments.length)
      
      if (assignments.length === 0) {
        console.warn('No assignments found for user')
        return []
      }

      // Create grades map for quick lookup
      const userGradesMap = new Map<string, any>()
      if (!gradesResult.error && gradesResult.data) {
        gradesResult.data.forEach((grade: any) => {
          userGradesMap.set(grade.assignment_id, grade)
        })
      } else if (gradesResult.error) {
        console.error('Error fetching assignment grades:', gradesResult.error)
        // Continue without grades data - assignments will show as pending
      }

      // OPTIMIZATION: Batch fetch all teacher names
      const teacherIds = [...new Set(enrolledClassrooms.map(ec => ec.classrooms?.teacher_id).filter(Boolean))]
      const teacherMap = await getTeacherNamesWithCache(teacherIds)
      
      // Process assignments with all data available
      const processedAssignments: Assignment[] = assignments.map((assignment: any) => {
        const session = sessionMap.get(assignment.classroom_session_id)
        if (!session) return null
        
        const classroom = session.classroom
        if (!classroom) return null
        
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
        
        return {
          id: assignment.id,
          title: assignment.title,
          description: assignment.description || '',
          due_date: assignment.due_date || '',
          status,
          classroom_name: classroom.name || 'Unknown Class',
          teacher_name: teacherName,
          assignment_type: assignment.assignment_type || 'Homework',
          teacher_initials: getInitials(teacherName),
          comment_count: 0,
          comments: [],
          classroom_color: classroom.color || '#3B82F6'
        }
      }).filter(Boolean) // Remove any null entries
      
      console.log('OPTIMIZED RESULT: processed assignments:', processedAssignments.length)
      return processedAssignments
    } catch (error) {
      console.error('Error in fetchAssignments:', error)
      return []
    }
  }

  const fetchGradesOptimized = async (): Promise<Grade[]> => {
    if (!user?.userId || !user?.academyId) return []
    
    try {
      // OPTIMIZATION: Break down the complex query into simpler parallel queries
      // Step 1: Get student's enrolled classrooms
      const { data: enrolledClassrooms } = await supabase
        .from('classroom_students')
        .select(`
          classroom_id,
          classrooms!inner(
            id,
            name,
            color,
            subject,
            academy_id,
            teacher_id
          )
        `)
        .eq('student_id', user.userId)
        .eq('classrooms.academy_id', user.academyId)
      
      if (!enrolledClassrooms || enrolledClassrooms.length === 0) {
        console.log('No enrolled classrooms found')
        return []
      }
      
      const classroomIds = enrolledClassrooms.map(ec => ec.classroom_id)
      const classroomMap = new Map()
      enrolledClassrooms.forEach(ec => {
        classroomMap.set(ec.classroom_id, ec.classrooms)
      })
      
      // Step 2: Get sessions for enrolled classrooms
      const { data: sessions } = await supabase
        .from('classroom_sessions')
        .select(`
          id,
          classroom_id,
          date
        `)
        .in('classroom_id', classroomIds)
      
      if (!sessions || sessions.length === 0) {
        console.log('No sessions found')
        return []
      }
      
      const sessionIds = sessions.map(s => s.id)
      const sessionMap = new Map()
      sessions.forEach(s => {
        sessionMap.set(s.id, s)
      })
      
      // Step 3: Get assignments for those sessions
      const { data: assignments } = await supabase
        .from('assignments')
        .select(`
          id,
          title,
          due_date,
          assignment_type,
          classroom_session_id
        `)
        .in('classroom_session_id', sessionIds)
        .is('deleted_at', null)
      
      if (!assignments || assignments.length === 0) {
        console.log('No assignments found')
        return []
      }
      
      const assignmentIds = assignments.map(a => a.id)
      const assignmentMap = new Map()
      assignments.forEach(a => {
        assignmentMap.set(a.id, a)
      })
      
      // Step 4: Get grades for the student - optimized to prevent timeout
      let gradeData = []
      let error = null
      
      if (assignmentIds.length > 0) {
        const gradesResult = await supabase
          .from('assignment_grades')
          .select('id, assignment_id, student_id, submitted_date, score, feedback, status, updated_at')
          .eq('student_id', user.userId)
          .in('assignment_id', assignmentIds)
          .limit(200)
        
        gradeData = gradesResult.data || []
        error = gradesResult.error
      }
      
      console.log('Optimized grades query result:', { 
        gradeData, 
        error, 
        dataLength: gradeData?.length,
        userId: user.userId 
      })
      
      if (error) {
        console.error('Error fetching assignment grades (500 error):', error)
        // Return empty array instead of throwing to prevent page crash
        return []
      }
      
      // Step 5: Batch fetch all teacher names
      const teacherIds = [...new Set(enrolledClassrooms.map(ec => ec.classrooms?.teacher_id).filter(Boolean))]
      const teacherMap = await getTeacherNamesWithCache(teacherIds)
      
      // Step 6: Construct the formatted grades
      const formattedGrades: Grade[] = gradeData.map((gradeRecord: any) => {
        const assignment = assignmentMap.get(gradeRecord.assignment_id)
        if (!assignment) return null
        
        const session = sessionMap.get(assignment.classroom_session_id)
        if (!session) return null
        
        const classroom = classroomMap.get(session.classroom_id)
        if (!classroom) return null
        
        const teacherName = teacherMap.get(classroom.teacher_id) || 'Unknown Teacher'
        
        return {
          id: gradeRecord.id,
          assignment_title: assignment.title || 'Unknown Assignment',
          assignment_type: assignment.assignment_type,
          subject: classroom.subject || classroom.name || 'Unknown Subject',
          grade: gradeRecord.score !== null ? gradeRecord.score : '--',
          max_points: 100,
          graded_date: gradeRecord.updated_at || gradeRecord.submitted_date,
          teacher_name: teacherName,
          classroom_name: classroom.name || 'Unknown Class',
          classroom_id: classroom.id,
          status: gradeRecord.status || 'not_submitted',
          due_date: assignment.due_date || '',
          submitted_date: gradeRecord.submitted_date,
          comment_count: 0,
          teacher_comment: gradeRecord.feedback,
          classroom_color: classroom.color || '#3B82F6'
        }
      }).filter(Boolean) // Remove any null entries
      
      console.log('OPTIMIZED grades result:', formattedGrades.length, 'grades processed')
      return formattedGrades
    } catch (error) {
      console.error('Error fetching grades:', error)
      return []
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">{t('mobile.assignments.completed')}</Badge>
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800">{t('mobile.assignments.overdue')}</Badge>
      case 'pending':
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">{t('mobile.assignments.pending')}</Badge>
    }
  }

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

  const handleOpenComments = (assignment: Assignment) => {
    setCommentBottomSheet({ isOpen: true, assignment })
  }

  const handleCloseComments = () => {
    setCommentBottomSheet({ isOpen: false, assignment: null })
  }

  const handleAddComment = async (content: string) => {
    if (!commentBottomSheet.assignment) return

    const newComment: Comment = {
      id: `c${Date.now()}`,
      assignment_id: commentBottomSheet.assignment.id,
      user_id: 'current_user',
      user_name: user?.userName || 'You',
      user_initials: 'You',
      content,
      created_at: new Date().toISOString()
    }

    // Update assignments with new comment
    setAssignments(prev => prev.map(assignment => {
      if (assignment.id === commentBottomSheet.assignment?.id) {
        const updatedComments = [...(assignment.comments || []), newComment]
        return {
          ...assignment,
          comments: updatedComments,
          comment_count: updatedComments.length
        }
      }
      return assignment
    }))

    // Update the bottom sheet assignment
    setCommentBottomSheet(prev => ({
      ...prev,
      assignment: prev.assignment ? {
        ...prev.assignment,
        comments: [...(prev.assignment.comments || []), newComment],
        comment_count: (prev.assignment.comments?.length || 0) + 1
      } : null
    }))
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
        return <Badge className="bg-blue-100 text-blue-800">{t('mobile.assignments.grades.status.submitted')}</Badge>
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
    if (grade === '--') return 'text-gray-500'
    
    if (typeof grade === 'number') {
      if (grade >= 90) return 'text-green-600'
      if (grade >= 80) return 'text-blue-600'
      if (grade >= 70) return 'text-yellow-600'
      return 'text-red-600'
    }
    
    const letterGrade = grade.toString().charAt(0)
    switch (letterGrade) {
      case 'A': return 'text-green-600'
      case 'B': return 'text-blue-600'
      case 'C': return 'text-yellow-600'
      default: return 'text-red-600'
    }
  }

  const processChartData = (grades: Grade[], timePeriod: typeof selectedTimePeriod, classroomId?: string) => {
    // Filter grades by classroom if specified
    let allGrades = classroomId && classroomId !== 'all' 
      ? grades.filter(grade => grade.classroom_id === classroomId)
      : grades

    // Filter out non-numeric grades
    allGrades = allGrades.filter(grade => typeof grade.grade === 'number')

    // Sort ALL grades by date (oldest first for proper cumulative calculation)
    allGrades.sort((a, b) => new Date(a.graded_date).getTime() - new Date(b.graded_date).getTime())

    if (allGrades.length === 0) {
      return []
    }

    const currentLang = language === 'korean' ? 'ko-KR' : 'en-US'
    const now = new Date()
    
    // Get time period settings - each filter shows its own time range
    let startDate = new Date(now)
    let pointCount = 7
    
    switch (timePeriod) {
      case '7D':
        startDate = new Date(now.getTime() - (6 * 24 * 60 * 60 * 1000)) // 6 days ago, today + 6 days = 7
        pointCount = 7
        break
      case '1M':
        startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000))
        pointCount = 10
        break
      case '3M':
        startDate = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000))
        pointCount = 15
        break
      case '6M':
        startDate = new Date(now.getTime() - (180 * 24 * 60 * 60 * 1000))
        pointCount = 20
        break
      case '1Y':
        startDate = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000))
        pointCount = 25
        break
      case 'All':
        // For "All", show timeline from first assignment to today
        if (allGrades.length === 0) return []
        
        const firstGradeDate = new Date(allGrades[0].graded_date)
        const timelineStart = firstGradeDate
        const timelineEnd = now
        const timelineDiff = timelineEnd.getTime() - timelineStart.getTime()
        
        // Create 10-15 points from first assignment to today
        const timelinePoints = Math.max(10, Math.min(15, allGrades.length * 3))
        const timelineInterval = timelineDiff / (timelinePoints - 1)
        
        const timelineData = []
        let cumulativeTotal = 0
        
        for (let i = 0; i < timelinePoints; i++) {
          const pointDate = new Date(timelineStart.getTime() + (timelineInterval * i))
          
          // Find all grades up to this point in time
          const gradesUpToPoint = allGrades.filter(grade => 
            new Date(grade.graded_date) <= pointDate
          )
          
          if (gradesUpToPoint.length > 0) {
            // Calculate cumulative average
            const total = gradesUpToPoint.reduce((sum, grade) => sum + (grade.grade as number), 0)
            const average = Math.round(total / gradesUpToPoint.length)
            
            timelineData.push({
              date: pointDate.toLocaleDateString(currentLang, { 
                month: 'short', 
                day: 'numeric'
              }),
              average: average,
              count: gradesUpToPoint.length,
              assignmentTitle: gradesUpToPoint[gradesUpToPoint.length - 1]?.assignment_title || 'N/A'
            })
          }
        }
        
        return timelineData
    }

    // Filter grades within the selected time period
    const periodGrades = allGrades.filter(grade => 
      new Date(grade.graded_date) >= startDate
    )
    
    // If no grades in period, still show the current cumulative average
    if (periodGrades.length === 0) {
      // Show current cumulative average across all time periods
      const total = allGrades.reduce((sum, grade) => sum + (grade.grade as number), 0)
      const average = Math.round(total / allGrades.length)
      
      // Create timeline points for the selected period showing flat line
      const timePoints = []
      const timeDiff = now.getTime() - startDate.getTime()
      const interval = timeDiff / (pointCount - 1)
      
      for (let i = 0; i < pointCount; i++) {
        const pointDate = new Date(startDate.getTime() + (interval * i))
        timePoints.push({
          date: pointDate.toLocaleDateString(currentLang, { 
            month: 'short', 
            day: 'numeric'
          }),
          average: average,
          count: allGrades.length,
          assignmentTitle: 'N/A'
        })
      }
      
      return timePoints
    }
    
    // Create timeline points for the selected period
    const timePoints = []
    const timeDiff = now.getTime() - startDate.getTime()
    const interval = timeDiff / (pointCount - 1)
    
    console.log(`${timePeriod}: startDate=${startDate.toDateString()}, now=${now.toDateString()}`)
    
    for (let i = 0; i < pointCount; i++) {
      const pointDate = new Date(startDate.getTime() + (interval * i))
      timePoints.push(pointDate)
    }
    
    console.log(`Timeline points for ${timePeriod}:`, timePoints.slice(0, 3).map(d => d.toDateString()))

    // Calculate cumulative average at each time point
    const chartData = timePoints.map(pointDate => {
      // Find all grades up to this point in time (from all grades, not just period)
      const gradesUpToPoint = allGrades.filter(grade => 
        new Date(grade.graded_date) <= pointDate
      )
      
      // If no grades yet, show the current overall average (flat line until grades appear)
      let average = 0
      let count = 0
      
      if (gradesUpToPoint.length > 0) {
        // Calculate cumulative average up to this point
        const total = gradesUpToPoint.reduce((sum, grade) => sum + (grade.grade as number), 0)
        average = Math.round(total / gradesUpToPoint.length)
        count = gradesUpToPoint.length
      } else {
        // Show overall average as flat line before grades appear
        const totalAll = allGrades.reduce((sum, grade) => sum + (grade.grade as number), 0)
        average = allGrades.length > 0 ? Math.round(totalAll / allGrades.length) : 0
        count = 0
      }
      
      return {
        date: pointDate.toLocaleDateString(currentLang, { 
          month: 'short', 
          day: 'numeric'
        }),
        average,
        count: count,
        assignmentTitle: count > 0 ? `${count} assignments` : 'No grades yet'
      }
    }) // Keep ALL points, don't filter

    return chartData
  }

  // Remove loading check for instant navigation

  return (
    <div className="p-4">
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
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {t('mobile.assignments.tabs.assignments')}
        </button>
        <button
          onClick={() => setActiveTab('grades')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'grades'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {t('mobile.assignments.tabs.grades')}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'assignments' ? (
        /* Assignments Tab */
        assignmentsProgLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <AssignmentCardSkeleton key={i} />
            ))}
          </div>
        ) : assignments.length > 0 ? (
          <div className="space-y-10">
            {Object.entries(groupAssignmentsByDate(assignments)).map(([dateKey, dateAssignments]) => (
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
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                          <span className="text-sm font-medium text-gray-700">
                            {assignment.teacher_initials}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {assignment.teacher_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {assignment.classroom_name}
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
                        <button className="flex items-center text-sm text-gray-600 hover:text-gray-900">
                          <Share className="w-4 h-4 mr-1" />
                          {t('mobile.assignments.share')}
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
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">{t('mobile.assignments.noAssignments')}</p>
            </div>
          </Card>
        )
      ) : (
        /* Grades Tab */
        <div className="space-y-6">
          {/* Grade Statistics */}
          {gradesProgLoading ? (
            <div className="grid grid-cols-2 gap-4">
              <StatSkeleton />
              <StatSkeleton />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {(() => {
                // Get the currently selected classroom
                const selectedClassroom = classrooms[currentCarouselIndex]
                
                // Filter grades based on selected classroom
                let filteredGrades = selectedClassroom?.id === 'all' 
                  ? grades 
                  : grades.filter(grade => grade.classroom_id === selectedClassroom?.id)
                
                // Apply status filter
                if (statusFilter !== 'all') {
                  filteredGrades = filteredGrades.filter(grade => grade.status === statusFilter)
                }
                
                // Apply sorting
                filteredGrades = filteredGrades.sort((a, b) => {
                  const dateA = new Date(a.graded_date).getTime()
                  const dateB = new Date(b.graded_date).getTime()
                  
                  if (sortOrder === 'newest') {
                    return dateB - dateA // Newest first
                  } else {
                    return dateA - dateB // Oldest first
                  }
                })
                
                return (
                  <>
                    {/* Left Stats Card */}
                    <Card className="p-4">
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-gray-500">{t('mobile.assignments.grades.averageGrade')}</p>
                          <p className="text-2xl font-bold text-orange-600">
                            {filteredGrades.length > 0 ? 
                              (() => {
                                const gradedAssignments = filteredGrades.filter(g => typeof g.grade === 'number')
                                return gradedAssignments.length > 0 ? 
                                  `${Math.round(gradedAssignments.reduce((sum, g) => sum + (g.grade as number), 0) / gradedAssignments.length)}%`
                                  : 'N/A'
                              })()
                              : 'N/A'
                            }
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">{t('mobile.assignments.types.homework')}</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {(() => {
                              const homeworkGrades = filteredGrades.filter(g => 
                                g.assignment_type === 'homework' &&
                                typeof g.grade === 'number'
                              )
                              return homeworkGrades.length > 0 ? 
                                `${Math.round(homeworkGrades.reduce((sum, g) => sum + (g.grade as number), 0) / homeworkGrades.length)}%`
                                : 'N/A'
                            })()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">{t('mobile.assignments.types.quizTest')}</p>
                          <p className="text-lg font-semibold text-orange-500">
                            {(() => {
                              const testGrades = filteredGrades.filter(g => 
                                (g.assignment_type === 'quiz' || g.assignment_type === 'test') &&
                                typeof g.grade === 'number'
                              )
                              return testGrades.length > 0 ? 
                                `${Math.round(testGrades.reduce((sum, g) => sum + (g.grade as number), 0) / testGrades.length)}%`
                                : 'N/A'
                            })()}
                          </p>
                        </div>
                      </div>
                    </Card>

                    {/* Right Stats Card */}
                    <Card className="p-4">
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-gray-500">{t('mobile.assignments.grades.totalAssignments')}</p>
                          <p className="text-2xl font-bold text-gray-900">{filteredGrades.length}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">{t('mobile.assignments.grades.completedAssignments')}</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {filteredGrades.filter(g => g.status === 'graded' || g.status === 'submitted').length}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">{t('mobile.assignments.grades.averageScore')}</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {filteredGrades.length > 0 ? 
                              (() => {
                                const gradedAssignments = filteredGrades.filter(g => typeof g.grade === 'number')
                                return gradedAssignments.length > 0 ? 
                                  `${Math.round(gradedAssignments.reduce((sum, g) => sum + (g.grade as number), 0) / gradedAssignments.length)}%`
                                  : 'N/A'
                              })()
                              : 'N/A'
                            }
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
                    const selectedClassroom = classrooms[currentCarouselIndex]
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
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {t(`mobile.assignments.grades.chart.periods.${period}`)}
                  </button>
                ))}
              </div>

              {/* Line Chart */}
              {(() => {
                const selectedClassroom = classrooms[currentCarouselIndex]
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
                          tick={{ fontSize: 10, fill: '#6B7280' }}
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
                    {classrooms.map((classroom) => {
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
                {classrooms.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentCarouselIndex(index)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentCarouselIndex ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                    aria-label={`Go to classroom ${index + 1}`}
                  />
                ))}
              </div>
            </div>
            
            {/* Filter Dropdowns */}
            <div className="flex space-x-3">
              <div className="flex-1">
                <Select value={sortOrder} onValueChange={(value: 'newest' | 'oldest') => setSortOrder(value)}>
                  <SelectTrigger className="w-full p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
                    <SelectValue placeholder={t(`mobile.assignments.grades.sort.${sortOrder}`)} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">{t('mobile.assignments.grades.sort.newest')}</SelectItem>
                    <SelectItem value="oldest">{t('mobile.assignments.grades.sort.oldest')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Select value={statusFilter} onValueChange={(value: typeof statusFilter) => setStatusFilter(value)}>
                  <SelectTrigger className="w-full p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
                    <SelectValue placeholder={t(`mobile.assignments.grades.filter.${statusFilter}`)} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('mobile.assignments.grades.filter.all')}</SelectItem>
                    <SelectItem value="graded">{t('mobile.assignments.grades.filter.graded')}</SelectItem>
                    <SelectItem value="submitted">{t('mobile.assignments.grades.filter.submitted')}</SelectItem>
                    <SelectItem value="pending">{t('mobile.assignments.grades.filter.pending')}</SelectItem>
                    <SelectItem value="overdue">{t('mobile.assignments.grades.filter.overdue')}</SelectItem>
                    <SelectItem value="excused">{t('mobile.assignments.grades.filter.excused')}</SelectItem>
                    <SelectItem value="late">{t('mobile.assignments.grades.filter.late')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Existing Grades List */}
          {gradesProgLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <GradeCardSkeleton key={i} />
              ))}
            </div>
          ) : grades.length > 0 ? (
            <div className="space-y-3">
              {(() => {
                // Get the currently selected classroom
                const selectedClassroom = classrooms[currentCarouselIndex]
                
                // Filter grades based on selected classroom
                let filteredGrades = selectedClassroom?.id === 'all' 
                  ? grades 
                  : grades.filter(grade => grade.classroom_id === selectedClassroom?.id)
                
                // Apply status filter
                if (statusFilter !== 'all') {
                  filteredGrades = filteredGrades.filter(grade => grade.status === statusFilter)
                }
                
                // Apply sorting
                filteredGrades = filteredGrades.sort((a, b) => {
                  const dateA = new Date(a.graded_date).getTime()
                  const dateB = new Date(b.graded_date).getTime()
                  
                  if (sortOrder === 'newest') {
                    return dateB - dateA // Newest first
                  } else {
                    return dateA - dateB // Oldest first
                  }
                })
                
                // Show empty state if no grades after filtering
                if (filteredGrades.length === 0) {
                  return (
                    <Card className="p-6">
                      <div className="text-center">
                        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500">{t('mobile.assignments.grades.noGradesForClassroom')}</p>
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
                  <div className={`text-lg font-bold ${getGradeColor(grade.grade)}`}>
                    {grade.grade === '--' ? '--' : (typeof grade.grade === 'number' ? `${grade.grade}%` : grade.grade)}
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
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium text-white">
                          {grade.teacher_name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-blue-800 mb-1">{grade.teacher_name}</p>
                        <p className="text-sm text-blue-700 leading-relaxed">{grade.teacher_comment}</p>
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
            <Card className="p-6">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">{t('mobile.assignments.noGrades')}</p>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Comment Bottom Sheet */}
      <CommentBottomSheet
        isOpen={commentBottomSheet.isOpen}
        onClose={handleCloseComments}
        assignmentTitle={commentBottomSheet.assignment?.title || ''}
        assignmentId={commentBottomSheet.assignment?.id || ''}
        comments={commentBottomSheet.assignment?.comments || []}
        onAddComment={handleAddComment}
      />
    </div>
  )
}