"use client"

import { useState, useEffect } from 'react'
import { db } from '@/lib/supabase'
import { fetchAllRows } from '@/lib/fetch-all-rows'
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
      /* Two aggregates instead of two academy-wide table scans.
         This used to pull every assignment grade and every attendance
         row — 19,932 and 19,929 in the demo academy — and average them
         here. Unpaginated that read 1000 of each and presented the
         result as the classroom's score; paginated correctly it took
         52.6 SECONDS across 20 round-trips, which is what the
         "Error fetching classroom performance" in the console was.
         The database does it in 0.59s and sees every row. */
      const [{ data: roomRows, error: roomErr }, { data: studentRows, error: studentErr }] =
        await Promise.all([
          db.rpc('classroom_performance_for_academy', { p_academy_id: academyId }),
          db.rpc('student_performance_for_academy', { p_academy_id: academyId }),
        ])
      if (roomErr) throw roomErr
      if (studentErr) throw studentErr

      const rooms: ClassroomPerformance[] = (roomRows ?? []).map(r => ({
        id: r.classroom_id,
        name: r.classroom_name,
        color: r.classroom_color ?? undefined,
        averageScore: r.avg_score === null ? 0 : Number(r.avg_score),
        attendanceRate: r.attendance_rate === null ? 0 : Number(r.attendance_rate),
        totalStudents: 0,
        totalAssignments: Number(r.graded_count ?? 0),
        totalSessions: 0,
      }))

      // A classroom with no graded work has no score to rank — including
      // it would put an empty class at the bottom of "lowest score".
      const scored = rooms.filter(r => r.totalAssignments > 0)
        .sort((a, b) => b.averageScore - a.averageScore)
      const attended = (roomRows ?? []).filter(r => r.attendance_rate !== null)
        .map(r => rooms.find(x => x.id === r.classroom_id)!)
        .sort((a, b) => b.attendanceRate - a.attendanceRate)

      setHighestScoreClassroom(scored[0] ?? null)
      setLowestScoreClassroom(scored.length > 1 ? scored[scored.length - 1] : null)
      setHighestAttendanceClassroom(attended[0] ?? null)
      setLowestAttendanceClassroom(attended.length > 1 ? attended[attended.length - 1] : null)

      const students: StudentPerformance[] = (studentRows ?? [])
        .filter(s => s.student_name)
        .map(s => ({
          id: s.student_id,
          name: s.student_name,
          averageScore: Number(s.avg_score ?? 0),
          totalAssignments: Number(s.graded_count ?? 0),
          classroomName: s.classroom_name ?? undefined,
        }))
        .sort((a, b) => b.averageScore - a.averageScore)

      const top5 = students.slice(0, 5)
      const bottom5 = students.length > 5 ? students.slice(-5).reverse() : []
      setTopStudents(top5)
      setBottomStudents(bottom5)

      // Cache the results
      const dataToCache = {
        highestScoreClassroom: scored[0] ?? null,
        lowestScoreClassroom: scored.length > 1 ? scored[scored.length - 1] : null,
        highestAttendanceClassroom: attended[0] ?? null,
        lowestAttendanceClassroom: attended.length > 1 ? attended[attended.length - 1] : null,
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
