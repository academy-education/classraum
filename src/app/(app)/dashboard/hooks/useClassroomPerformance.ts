"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useStableCallback } from '@/hooks/useStableCallback'
import { clearCachesOnRefresh, markRefreshHandled } from '@/utils/cacheRefresh'

export interface ClassroomPerformance {
  id: string
  name: string
  color?: string
  averageScore: number
  attendanceRate: number
  totalStudents: number
  totalAssignments: number
  totalSessions: number
}

export interface StudentPerformance {
  id: string
  name: string
  averageScore: number
  totalAssignments: number
  classroomName?: string
}

interface UseClassroomPerformanceReturn {
  highestScoreClassroom: ClassroomPerformance | null
  lowestScoreClassroom: ClassroomPerformance | null
  highestAttendanceClassroom: ClassroomPerformance | null
  lowestAttendanceClassroom: ClassroomPerformance | null
  topStudents: StudentPerformance[]
  bottomStudents: StudentPerformance[]
  loading: boolean
  error: string | null
}

export const useClassroomPerformance = (academyId: string | null): UseClassroomPerformanceReturn => {
  const [highestScoreClassroom, setHighestScoreClassroom] = useState<ClassroomPerformance | null>(null)
  const [lowestScoreClassroom, setLowestScoreClassroom] = useState<ClassroomPerformance | null>(null)
  const [highestAttendanceClassroom, setHighestAttendanceClassroom] = useState<ClassroomPerformance | null>(null)
  const [lowestAttendanceClassroom, setLowestAttendanceClassroom] = useState<ClassroomPerformance | null>(null)
  const [topStudents, setTopStudents] = useState<StudentPerformance[]>([])
  const [bottomStudents, setBottomStudents] = useState<StudentPerformance[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPerformanceData = useStableCallback(async () => {
    if (!academyId) return

    // Check sessionStorage cache first
    const cacheKey = `classroom-performance-${academyId}`
    const cachedData = sessionStorage.getItem(cacheKey)
    const cacheTimestamp = sessionStorage.getItem(`${cacheKey}-timestamp`)

    if (cachedData && cacheTimestamp) {
      const timeDiff = Date.now() - parseInt(cacheTimestamp)
      const cacheValidFor = 5 * 60 * 1000 // 5 minutes

      if (timeDiff < cacheValidFor) {
        const parsed = JSON.parse(cachedData)
        setHighestScoreClassroom(parsed.highestScoreClassroom)
        setLowestScoreClassroom(parsed.lowestScoreClassroom)
        setHighestAttendanceClassroom(parsed.highestAttendanceClassroom)
        setLowestAttendanceClassroom(parsed.lowestAttendanceClassroom)
        setTopStudents(parsed.topStudents)
        setBottomStudents(parsed.bottomStudents)
        setLoading(false)
        return
      }
    }

    setLoading(true)
    setError(null)

    try {
      // Fetch classrooms with their sessions
      const { data: classrooms, error: classroomsError } = await supabase
        .from('classrooms')
        .select(`
          id,
          name,
          color,
          classroom_sessions (
            id,
            date,
            status
          )
        `)
        .eq('academy_id', academyId)
        .is('deleted_at', null)

      if (classroomsError) throw classroomsError

      // Fetch active students only (exclude deactivated)
      const { data: activeStudents, error: activeStudentsError } = await supabase
        .from('students')
        .select('user_id')
        .eq('academy_id', academyId)
        .eq('active', true)

      if (activeStudentsError) throw activeStudentsError

      const activeStudentIds = new Set(activeStudents?.map(s => s.user_id) || [])

      // Collect session IDs from classrooms (for local filtering)
      const sessionIds = classrooms?.flatMap(c => c.classroom_sessions?.map(s => s.id) || []) || []

      if (sessionIds.length === 0) {
        setLoading(false)
        return
      }

      // Fetch assignments using join-based filtering (avoids URL length limits)
      const { data: assignments, error: assignmentsError } = await supabase
        .from('assignments')
        .select(`
          id,
          classroom_session_id,
          assignment_grades (
            score,
            student_id,
            status
          ),
          classroom_sessions!inner (
            id,
            classrooms!inner (
              academy_id
            )
          )
        `)
        .eq('classroom_sessions.classrooms.academy_id', academyId)
        .is('deleted_at', null)

      if (assignmentsError) throw assignmentsError

      // Fetch attendance using join-based filtering
      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance')
        .select(`
          classroom_session_id,
          status,
          student_id,
          classroom_sessions!inner (
            id,
            classrooms!inner (
              academy_id
            )
          )
        `)
        .eq('classroom_sessions.classrooms.academy_id', academyId)

      if (attendanceError) throw attendanceError

      // Calculate classroom performance
      const classroomPerformanceMap = new Map<string, ClassroomPerformance>()

      classrooms?.forEach(classroom => {
        const classroomSessionIds = classroom.classroom_sessions?.map(s => s.id) || []

        // Get assignments for this classroom
        const classroomAssignments = assignments?.filter(a =>
          classroomSessionIds.includes(a.classroom_session_id)
        ) || []

        // Calculate average score (only active students)
        const allGrades = classroomAssignments.flatMap(a => a.assignment_grades || [])
          .filter(g => activeStudentIds.has(g.student_id))
        const scoredGrades = allGrades.filter(g => g.score !== null && g.score !== undefined)
        const averageScore = scoredGrades.length > 0
          ? scoredGrades.reduce((sum, g) => sum + (g.score || 0), 0) / scoredGrades.length
          : 0

        // Get attendance for this classroom (only active students)
        const classroomAttendance = attendance?.filter(a =>
          classroomSessionIds.includes(a.classroom_session_id) && activeStudentIds.has(a.student_id)
        ) || []

        // Calculate attendance rate
        const presentCount = classroomAttendance.filter(a =>
          a.status === 'present' || a.status === 'late'
        ).length
        const totalAttendance = classroomAttendance.length
        const attendanceRate = totalAttendance > 0
          ? (presentCount / totalAttendance) * 100
          : 0

        // Get unique students
        const uniqueStudents = new Set([
          ...allGrades.map(g => g.student_id),
          ...classroomAttendance.map(a => a.student_id)
        ])

        classroomPerformanceMap.set(classroom.id, {
          id: classroom.id,
          name: classroom.name,
          color: classroom.color || undefined,
          averageScore: Math.round(averageScore * 10) / 10,
          attendanceRate: Math.round(attendanceRate * 10) / 10,
          totalStudents: uniqueStudents.size,
          totalAssignments: classroomAssignments.length,
          totalSessions: classroomSessionIds.length
        })
      })

      const performanceArray = Array.from(classroomPerformanceMap.values())

      // Filter classrooms with actual data
      const classroomsWithScores = performanceArray.filter(c => c.totalAssignments > 0)
      const classroomsWithAttendance = performanceArray.filter(c => c.totalSessions > 0)

      // Sort and get highest/lowest
      const sortedByScore = [...classroomsWithScores].sort((a, b) => b.averageScore - a.averageScore)
      const sortedByAttendance = [...classroomsWithAttendance].sort((a, b) => b.attendanceRate - a.attendanceRate)

      const highestScore = sortedByScore[0] || null
      const lowestScore = sortedByScore.length > 1 ? sortedByScore[sortedByScore.length - 1] : null
      const highestAttendance = sortedByAttendance[0] || null
      const lowestAttendance = sortedByAttendance.length > 1 ? sortedByAttendance[sortedByAttendance.length - 1] : null

      // Calculate student performance (only active students)
      const studentScoreMap = new Map<string, { totalScore: number; count: number; classroomName?: string }>()

      assignments?.forEach(assignment => {
        const classroomSession = classrooms?.find(c =>
          c.classroom_sessions?.some(s => s.id === assignment.classroom_session_id)
        )
        const classroomName = classroomSession?.name

        assignment.assignment_grades?.forEach(grade => {
          // Only include active students
          if (grade.score !== null && grade.score !== undefined && activeStudentIds.has(grade.student_id)) {
            const existing = studentScoreMap.get(grade.student_id) || { totalScore: 0, count: 0, classroomName }
            studentScoreMap.set(grade.student_id, {
              totalScore: existing.totalScore + grade.score,
              count: existing.count + 1,
              classroomName: existing.classroomName || classroomName
            })
          }
        })
      })

      // Get student names (only active students)
      const studentIds = Array.from(studentScoreMap.keys())

      const studentNames: Record<string, string> = {}
      if (studentIds.length > 0) {
        const { data: students } = await supabase
          .from('students')
          .select(`
            user_id,
            users (name)
          `)
          .in('user_id', studentIds)
          .eq('active', true)

        students?.forEach(s => {
          const user = s.users as { name: string } | null
          if (user) {
            studentNames[s.user_id] = user.name
          }
        })
      }

      // Create student performance array (only active students with names)
      const studentPerformanceArray: StudentPerformance[] = Array.from(studentScoreMap.entries())
        .filter(([id]) => studentNames[id]) // Only include active students we have names for
        .map(([id, data]) => ({
          id,
          name: studentNames[id],
          averageScore: Math.round((data.totalScore / data.count) * 10) / 10,
          totalAssignments: data.count,
          classroomName: data.classroomName
        }))
        .filter(s => s.totalAssignments >= 1) // Only include students with at least 1 graded assignment

      // Sort and get top/bottom 5
      const sortedStudents = [...studentPerformanceArray].sort((a, b) => b.averageScore - a.averageScore)
      const top5 = sortedStudents.slice(0, 5)
      const bottom5 = sortedStudents.length > 5
        ? sortedStudents.slice(-5).reverse()
        : sortedStudents.length > 1
          ? sortedStudents.slice(1).reverse()
          : []

      // Update state
      setHighestScoreClassroom(highestScore)
      setLowestScoreClassroom(lowestScore)
      setHighestAttendanceClassroom(highestAttendance)
      setLowestAttendanceClassroom(lowestAttendance)
      setTopStudents(top5)
      setBottomStudents(bottom5)

      // Cache the results
      const dataToCache = {
        highestScoreClassroom: highestScore,
        lowestScoreClassroom: lowestScore,
        highestAttendanceClassroom: highestAttendance,
        lowestAttendanceClassroom: lowestAttendance,
        topStudents: top5,
        bottomStudents: bottom5
      }
      sessionStorage.setItem(cacheKey, JSON.stringify(dataToCache))
      sessionStorage.setItem(`${cacheKey}-timestamp`, Date.now().toString())

    } catch (err) {
      console.error('Error fetching classroom performance:', err)
      setError('Failed to load performance data')
    } finally {
      setLoading(false)
    }
  })

  useEffect(() => {
    if (academyId) {
      // Clear caches if page was refreshed
      const wasRefreshed = clearCachesOnRefresh(academyId)
      if (wasRefreshed) {
        markRefreshHandled()
      }
      fetchPerformanceData()
    }
  }, [academyId])

  return {
    highestScoreClassroom,
    lowestScoreClassroom,
    highestAttendanceClassroom,
    lowestAttendanceClassroom,
    topStudents,
    bottomStudents,
    loading,
    error
  }
}
