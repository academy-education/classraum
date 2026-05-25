"use client"

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSafeParams } from '@/hooks/useSafeParams'
import { Card } from '@/components/ui/card'
import { Eyebrow } from '@/components/ui/eyebrow'
import { ArrowLeft, BookOpen, Users, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/hooks/useTranslation'
import { useLanguage } from '@/contexts/LanguageContext'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { simpleTabDetection } from '@/utils/simpleTabDetection'
import { useStableCallback } from '@/hooks/useStableCallback'
import DOMPurify from 'dompurify'
import {
  type ReportAssignmentGrade,
  getReportSubjectName,
} from '@/types/queries'
import type { AssignmentGradeStatus, AttendanceStatus } from '@/types/db-enums'

interface ReportData {
  id: string
  student_id: string
  student_name: string
  student_email: string
  student_school?: string
  report_name?: string
  start_date?: string
  end_date?: string
  selected_subjects?: string[]
  selected_classrooms?: string[]
  selected_assignment_categories?: string[]
  ai_feedback_enabled?: boolean
  feedback?: string
  ai_feedback_created_by?: string
  ai_feedback_created_at?: string
  ai_feedback_template?: string
  status?: 'Draft' | 'Finished' | 'Approved' | 'Sent' | 'Viewed' | 'Error'
  show_category_average?: boolean
  show_individual_grades?: boolean
  show_percentile_ranking?: boolean
  created_at: string
  updated_at: string
}


interface AssignmentCategory {
  id: string
  name: string
}


interface ReportDataResponse {
  assignments: any
  assignmentsByType: any
  assignmentsByCategory: any
  attendance: any
  grades: any
  classroomPercentiles: any
  individualGrades?: any[]
}

export default function MobileReportDetailsPage() {
  const router = useRouter()
  const params = useSafeParams()
  const { t } = useTranslation()
  const { user } = usePersistentMobileAuth()
  const { language } = useLanguage()

  const reportId = params?.id || ''

  const [report, setReport] = useState<ReportData | null>(null)
  const [reportData, setReportData] = useState<ReportDataResponse | null>(null)
  const [loading, setLoading] = useState(() => {
    // Check if we should suppress loading for tab returns
    const shouldSuppress = simpleTabDetection.isReturningToTab()
    if (shouldSuppress) {
      return false
    }
    return true
  })
  const [error, setError] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, content: '' })
  const [assignmentCategories, setAssignmentCategories] = useState<AssignmentCategory[]>([])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const locale = language === 'korean' ? 'ko-KR' : 'en-US'
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: language === 'korean' ? 'long' : 'short',
      day: 'numeric'
    })
  }

  // Helper function to format date labels - always show actual dates
  const formatDateLabel = useCallback((date: Date) => {
    // Always show month/day format for consistency
    return date.toLocaleDateString(language === 'korean' ? 'ko-KR' : 'en-US', {
      month: 'short',
      day: 'numeric'
    })
  }, [language])

  // Data processing functions copied from preview modal
  const generateChartDataForType = useCallback((typeAssignments: ReportAssignmentGrade[], reportStartDate?: string, reportEndDate?: string) => {
    // Use report date range if provided, otherwise use reasonable defaults
    const startDate = reportStartDate ? new Date(reportStartDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const endDate = reportEndDate ? new Date(reportEndDate) : new Date()
    const timeDiff = endDate.getTime() - startDate.getTime()

    // Always generate exactly 8 points
    const pointCount = 8
    const interval = timeDiff / (pointCount - 1)

    // Filter and sort assignments (include all assignments, treat missing scores properly)
    type ChartAssignment = Omit<ReportAssignmentGrade, 'score'> & { score: number; graded_date: string }
    const allAssignments: ChartAssignment[] = typeAssignments
      .map(a => ({
        ...a,
        score: a.score !== null ? a.score : (a.status === 'not submitted' ? 0 : null),
        graded_date: a.submitted_date || a.updated_at,
      }))
      .filter((a): a is ChartAssignment => a.score !== null && !!a.graded_date)
      .sort((a, b) => new Date(a.graded_date).getTime() - new Date(b.graded_date).getTime())

    const chartData = []

    for (let i = 0; i < pointCount; i++) {
      const pointDate = new Date(startDate.getTime() + (interval * i))

      // Find all assignments up to this point in time
      const assignmentsUpToPoint = allAssignments.filter(assignment =>
        new Date(assignment.graded_date) <= pointDate
      )

      let average = 0
      if (assignmentsUpToPoint.length > 0) {
        // Calculate cumulative average
        const total = assignmentsUpToPoint.reduce((sum, assignment) => sum + assignment.score, 0)
        average = Math.round(total / assignmentsUpToPoint.length)
      } else if (i > 0 && chartData.length > 0) {
        // If no assignments up to this point, use the previous score for continuity
        average = chartData[chartData.length - 1].score
      } else if (allAssignments.length > 0) {
        // If this is the first point and no assignments yet, use the first assignment's score
        average = allAssignments[0].score
      }

      chartData.push({
        x: (i * 300) / (pointCount - 1), // Distribute across full 300px width for proper alignment
        y: 120 - (average * 0.9), // Convert percentage to Y position (inverted)
        score: average,
        date: pointDate,
        label: formatDateLabel(pointDate)
      })
    }

    return chartData
  }, [language, formatDateLabel])

  // Generate combined chart data for main performance chart - always 16 points
  const _generateMainChartData = (assignmentsByType: any, reportStartDate?: string, reportEndDate?: string) => {
    if (!assignmentsByType) return { quiz: [], homework: [], test: [], project: [] }

    // Use report date range if provided, otherwise use reasonable defaults
    const startDate = reportStartDate ? new Date(reportStartDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const endDate = reportEndDate ? new Date(reportEndDate) : new Date()
    const timeDiff = endDate.getTime() - startDate.getTime()

    // Always generate exactly 16 points
    const pointCount = 16
    const interval = timeDiff / (pointCount - 1)

    const types = ['quiz', 'homework', 'test', 'project']
    const mainChartData: any = {}

    types.forEach(type => {
      const typeData = assignmentsByType[type]

      // Get the 8-point individual chart data to interpolate from
      const existingData = typeData?.chartData || []
      const chartData = []

      for (let i = 0; i < pointCount; i++) {
        const pointDate = new Date(startDate.getTime() + (interval * i))

        let score = 0
        if (existingData.length === 0) {
          score = 0 // No data available
        } else if (existingData.length === 1) {
          score = existingData[0].score
        } else {
          // Interpolate from the 8-point data to create smooth 16-point curve
          const pointTime = pointDate.getTime()
          let beforePoint = null
          let afterPoint = null

          // Find surrounding points in the 8-point data for interpolation
          for (let j = 0; j < existingData.length; j++) {
            const dataPointTime = new Date(existingData[j].date).getTime()
            if (dataPointTime <= pointTime) {
              beforePoint = existingData[j]
            } else {
              afterPoint = existingData[j]
              break
            }
          }

          if (beforePoint && afterPoint) {
            // Linear interpolation between the two surrounding points
            const beforeTime = new Date(beforePoint.date).getTime()
            const afterTime = new Date(afterPoint.date).getTime()
            const ratio = (pointTime - beforeTime) / (afterTime - beforeTime)
            score = Math.round(beforePoint.score + (afterPoint.score - beforePoint.score) * ratio)
          } else if (beforePoint) {
            // Use the last available point
            score = beforePoint.score
          } else if (afterPoint) {
            // Use the first available point
            score = afterPoint.score
          }
        }

        chartData.push({
          x: 40 + (i * 720) / (pointCount - 1), // Always distribute across 720px width for 16 points
          y: 200 - (score * 1.8), // Scale Y for 100% = 20, 0% = 200
          score: score,
          date: pointDate,
          label: formatDateLabel(pointDate)
        })
      }

      mainChartData[type] = chartData
    })

    return mainChartData
  }

  // Fetch actual report data based on student and date range
  const fetchReportData = useCallback(async (
    studentId: string,
    startDate: string,
    endDate: string,
    selectedClassrooms?: string[],
    selectedCategories?: string[]
  ) => {
    if (!studentId || !startDate || !endDate) return

    try {
      // Use RPC function to fetch assignment grades (bypasses RLS for parents)
      let { data: assignmentGrades, error: assignmentsError } = await supabase
        .rpc('get_student_assignment_grades', {
          target_student_id: studentId,
          start_date: startDate,
          end_date: endDate
        })


      // Fallback to direct query if RPC fails
      if (assignmentsError || !assignmentGrades || assignmentGrades.length === 0) {
        const result = await supabase
          .from('assignment_grades')
          .select(`
            id,
            status,
            score,
            updated_at,
            submitted_date,
            assignments!inner(
              id,
              title,
              assignment_type,
              due_date,
              assignment_categories_id,
              classroom_session_id,
              classroom_sessions!inner(
                classroom_id,
                classrooms!inner(
                  id,
                  name,
                  grade,
                  subjects(
                    id,
                    name
                  )
                )
              )
            )
          `)
          .eq('student_id', studentId)
          .gte('submitted_date', startDate)
          .lte('submitted_date', endDate)

        const directData = result.data
        assignmentsError = result.error

        // Transform direct query data to match RPC structure
        assignmentGrades = directData?.map(ag => ({
          id: ag.id,
          status: ag.status,
          score: ag.score,
          updated_at: ag.updated_at,
          submitted_date: ag.submitted_date,
          assignment_data: ag.assignments
        })) || []
      }

      // Transform RPC data to match expected structure. The RPC returns
      // `assignment_data` (a jsonb_build_object payload); we rename it to
      // `assignments` so downstream code sees a single normalised shape.
      const assignments: ReportAssignmentGrade[] = (assignmentGrades ?? []).map(
        (ag: { id: string; status: AssignmentGradeStatus; score: number | null; updated_at: string; submitted_date: string | null; assignment_data: ReportAssignmentGrade['assignments']; feedback?: string | null }) => ({
          id: ag.id,
          status: ag.status,
          score: ag.score,
          updated_at: ag.updated_at,
          submitted_date: ag.submitted_date,
          feedback: ag.feedback ?? null,
          assignments: ag.assignment_data,
        })
      )

      if (assignmentsError) {
        console.error('Error fetching assignments:', assignmentsError)
        return
      }


      // Filter by selected classrooms if provided
      let filteredAssignments: ReportAssignmentGrade[] =
        selectedClassrooms && selectedClassrooms.length > 0
          ? assignments.filter(a => {
              const cid = a.assignments?.classroom_sessions?.classroom_id
              return cid ? selectedClassrooms.includes(cid) : false
            })
          : assignments


      // Apply assignment type filtering to match dashboard logic - only include valid types
      const validTypes = ['quiz', 'homework', 'test', 'project'] as const
      filteredAssignments = filteredAssignments.filter(a => {
        const t = a.assignments?.assignment_type
        return !!t && (validTypes as readonly string[]).includes(t)
      })


      // ── Local helpers that close over filteredAssignments ─────────────────
      const ofType = (type: string) =>
        filteredAssignments.filter(a => a.assignments?.assignment_type === type)

      const withScores = (rows: ReportAssignmentGrade[]) =>
        rows.filter((r): r is ReportAssignmentGrade & { score: number } => r.score !== null)

      const countByStatus = (rows: ReportAssignmentGrade[], status: AssignmentGradeStatus) =>
        rows.filter(r => r.status === status).length

      const statusBreakdown = (rows: ReportAssignmentGrade[]) => ({
        submitted: countByStatus(rows, 'submitted'),
        pending: countByStatus(rows, 'pending'),
        overdue: countByStatus(rows, 'overdue'),
        'not submitted': countByStatus(rows, 'not submitted'),
        excused: countByStatus(rows, 'excused'),
      })

      const buildTypeStats = (type: 'quiz' | 'homework' | 'test' | 'project') => {
        const rows = ofType(type)
        const completed = countByStatus(rows, 'submitted')
        const scored = withScores(rows)
        return {
          total: rows.length,
          completed,
          completionRate: rows.length > 0 ? Math.round((completed / rows.length) * 100) : 0,
          averageGrade:
            scored.length > 0
              ? Math.round(scored.reduce((sum, r) => sum + r.score, 0) / scored.length)
              : 0,
          chartData: generateChartDataForType(rows, startDate, endDate),
          statuses: statusBreakdown(rows),
        }
      }


      // Collect individual grades for display
      const individualGrades = filteredAssignments.map(assignment => {
        const a = assignment.assignments
        return {
          id: assignment.id,
          title: a?.title || a?.id || String(t('mobile.fallbacks.unknownAssignment')),
          type: a?.assignment_type || 'unknown',
          subject:
            getReportSubjectName(a?.classroom_sessions?.classrooms?.subjects ?? null) ||
            'Unknown Subject',
          classroom:
            a?.classroom_sessions?.classrooms?.name ||
            String(t('mobile.fallbacks.unknownClassroom')),
          categoryId: a?.assignment_categories_id || '',
          score: assignment.score,
          status: assignment.status,
          dueDate: a?.due_date || '',
          completedDate: assignment.updated_at,
          feedback: assignment.feedback || null,
        }
      })

      // Calculate assignment statistics by type
      const assignmentsByType = {
        quiz: buildTypeStats('quiz'),
        homework: buildTypeStats('homework'),
        test: buildTypeStats('test'),
        project: buildTypeStats('project'),
      }

      // Calculate overall statistics
      const totalAssignments = filteredAssignments.length
      const completedAssignments = countByStatus(filteredAssignments, 'submitted')
      const scoredAll = withScores(filteredAssignments)
      const averageGrade =
        scoredAll.length > 0
          ? Math.round(scoredAll.reduce((sum, r) => sum + r.score, 0) / scoredAll.length)
          : 0

      const assignments_data = {
        total: totalAssignments,
        completed: completedAssignments,
        completionRate:
          totalAssignments > 0
            ? Math.round((completedAssignments / totalAssignments) * 100)
            : 0,
        statuses: statusBreakdown(filteredAssignments),
      }

      // Calculate assignment categories data
      const assignmentsByCategory: Record<string, any> = {}

      if (selectedCategories && selectedCategories.length > 0) {
        selectedCategories.forEach(categoryId => {
          const categoryAssignments = filteredAssignments.filter(
            a => a.assignments?.assignment_categories_id === categoryId
          )
          const categoryCompleted = countByStatus(categoryAssignments, 'submitted')
          const categoryScored = withScores(categoryAssignments)

          assignmentsByCategory[categoryId] = {
            name:
              assignmentCategories.find(c => c.id === categoryId)?.name ||
              String(t('mobile.fallbacks.unknownCategory')),
            total: categoryAssignments.length,
            completed: categoryCompleted,
            completionRate:
              categoryAssignments.length > 0
                ? Math.round((categoryCompleted / categoryAssignments.length) * 100)
                : 0,
            averageGrade:
              categoryScored.length > 0
                ? Math.round(
                    categoryScored.reduce((sum, r) => sum + r.score, 0) / categoryScored.length
                  )
                : 0,
            statuses: statusBreakdown(categoryAssignments),
            chartData: generateChartDataForType(categoryAssignments, startDate, endDate),
          }
        })
      }

      // Calculate classroom percentiles for selected classrooms
      const classroomPercentiles: Record<string, any> = {}
      if (selectedClassrooms && selectedClassrooms.length > 0) {
        for (const classroomId of selectedClassrooms) {
          try {
            // Fetch all students' grades for this classroom in the date range
            const { data: allStudentGrades, error: gradesError } = await supabase
              .from('assignment_grades')
              .select(`
                student_id,
                score,
                assignments!inner(
                  classroom_session_id,
                  classroom_sessions!inner(
                    classroom_id,
                    classrooms!inner(
                      id,
                      name
                    )
                  )
                )
              `)
              .eq('assignments.classroom_sessions.classroom_id', classroomId)
              .gte('assignments.due_date', startDate)
              .lte('assignments.due_date', endDate)
              .not('score', 'is', null)

            if (gradesError) {
              console.error('Error fetching grades for percentile calculation:', gradesError)
              continue
            }

            // Group by student and calculate averages
            const studentAverages: Record<string, { total: number, count: number }> = {}

            allStudentGrades?.forEach(grade => {
              if (!studentAverages[grade.student_id]) {
                studentAverages[grade.student_id] = { total: 0, count: 0 }
              }
              studentAverages[grade.student_id].total += grade.score
              studentAverages[grade.student_id].count += 1
            })

            const finalAverages = Object.entries(studentAverages).map(([studentId, data]) => ({
              studentId,
              average: data.total / data.count
            }))

            if (finalAverages.length === 0) continue

            // Calculate current student's average and percentile
            const currentStudentAverage = finalAverages.find(sa => sa.studentId === studentId)
            if (!currentStudentAverage) continue

            // Calculate percentile: how many students scored lower than current student
            const studentsWithLowerScores = finalAverages.filter(sa =>
              sa.average < currentStudentAverage.average
            ).length

            const percentile = finalAverages.length > 1
              ? Math.round((studentsWithLowerScores / (finalAverages.length - 1)) * 100)
              : 50 // If only one student, place them at 50th percentile

            // Calculate classroom average
            const classroomAverage = finalAverages.reduce((sum, sa) => sum + sa.average, 0) / finalAverages.length

            // Calculate student rank (1 = highest score)
            const sortedAverages = finalAverages.map(sa => sa.average).sort((a, b) => b - a)
            const studentRank = sortedAverages.indexOf(currentStudentAverage.average) + 1

            const classroom = (allStudentGrades?.[0]?.assignments as any)?.classroom_sessions?.classrooms

            classroomPercentiles[classroomId] = {
              classroomName: classroom?.name || String(t('mobile.fallbacks.unknownClassroom')),
              classroomAverage: Math.round(classroomAverage),
              percentile: percentile || 0,
              totalStudents: finalAverages.length,
              studentRank: studentRank
            }
          } catch (error) {
            console.error(`Error calculating percentile for classroom ${classroomId}:`, error)
          }
        }
      }

      // Use RPC function to fetch attendance data (bypasses RLS for parents)
      const { data: attendanceRpcData, error: attendanceError } = await supabase
        .rpc('get_student_attendance', {
          target_student_id: studentId,
          start_date: startDate,
          end_date: endDate
        })

      if (attendanceError) {
        console.error('Error fetching attendance:', attendanceError)
      }

      // Filter by selected classrooms if provided and transform to match expected structure.
      // Shape of each row from get_student_attendance: id, status, classroom_id, session_date.
      interface AttendanceRpcRow {
        id: string
        status: AttendanceStatus
        classroom_id: string
        session_date: string
      }
      let attendanceRecords: AttendanceRpcRow[] = (attendanceRpcData as AttendanceRpcRow[] | null) || []
      if (selectedClassrooms && selectedClassrooms.length > 0) {
        attendanceRecords = attendanceRecords.filter(a => selectedClassrooms.includes(a.classroom_id))
      }

      const countAtt = (s: AttendanceStatus) =>
        attendanceRecords.filter(a => a.status === s).length

      const totalSessions = attendanceRecords.length
      const presentSessions = countAtt('present')
      const attendanceRate = totalSessions > 0 ? (presentSessions / totalSessions) * 100 : 0

      const attendance = {
        total: totalSessions,
        present: presentSessions,
        attendanceRate: Math.round(attendanceRate),
        statuses: {
          present: presentSessions,
          absent: countAtt('absent'),
          late: countAtt('late'),
          excused: countAtt('excused'),
          pending: countAtt('pending'),
        },
      }

      // Mock grades data
      const grades = {
        total: filteredAssignments.filter(a => a.score !== null).length,
        average: averageGrade,
      }

      setReportData({
        assignments: assignments_data,
        assignmentsByType,
        assignmentsByCategory,
        attendance,
        grades,
        classroomPercentiles,
        individualGrades
      })

    } catch (error) {
      console.error('Error fetching report data:', error)
    }
  }, [generateChartDataForType])

  const fetchReportDetails = useStableCallback(async () => {
    if (!reportId || !user?.userId) return

    try {
      setLoading(true)

      // Fetch report details
      const { data: reportData, error: reportError } = await supabase
        .from('student_reports')
        .select('*')
        .eq('id', reportId)
        .single()

      if (reportError) {
        console.error('Error fetching report:', reportError)
        setError('Failed to fetch report')
        return
      }

      // Fetch student name
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select(`
          user_id,
          users!students_user_id_fkey(name, email)
        `)
        .eq('user_id', reportData.student_id)
        .single()

      if (studentError) {
        console.error('Error fetching student:', studentError)
      }

      const reportDetails = {
        ...reportData,
        student_name: (studentData?.users as any)?.name || String(t('mobile.fallbacks.unknownStudent')),
        student_email: (studentData?.users as any)?.email || ''
      }

      setReport(reportDetails)

      // Fetch assignment categories if we have selected categories
      if (reportDetails.selected_assignment_categories && reportDetails.selected_assignment_categories.length > 0) {
        const { data: categories, error: categoriesError } = await supabase
          .from('assignment_categories')
          .select('id, name')
          .in('id', reportDetails.selected_assignment_categories)

        if (!categoriesError && categories) {
          setAssignmentCategories(categories)
        }
      }

      // Fetch report data for charts
      if (reportDetails.start_date && reportDetails.end_date) {
        await fetchReportData(
          reportDetails.student_id,
          reportDetails.start_date,
          reportDetails.end_date,
          reportDetails.selected_classrooms,
          reportDetails.selected_assignment_categories
        )
      }

    } catch (error) {
      console.error('Error:', error)
      setError('An error occurred while fetching the report')
    } finally {
      setLoading(false)
      // Mark app as loaded when report data is finished loading
      simpleTabDetection.markAppLoaded()
    }
  })

  useEffect(() => {
    fetchReportDetails()
  }, [reportId, user?.userId])

  if (loading) {
    return (
      <div className="p-4 space-y-6">
        <div className="px-1 py-1">
          <div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse" />
        </div>
        <div className="px-1 space-y-2">
          <div className="h-2.5 w-28 rounded bg-gray-100 animate-pulse" />
          <div className="h-7 w-2/3 rounded bg-gray-100 animate-pulse" />
          <div className="h-4 w-1/2 rounded bg-gray-100 animate-pulse" />
        </div>
        <Card className="p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gray-100 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-2.5 w-20 rounded bg-gray-100 animate-pulse" />
              <div className="h-4 w-32 rounded bg-gray-100 animate-pulse" />
            </div>
          </div>
        </Card>
        <Card className="p-6 h-40 animate-pulse" />
        <Card className="p-6 h-40 animate-pulse" />
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="p-4 space-y-6">
        <div className="px-1 py-1">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-white ring-1 ring-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] flex items-center justify-center"
            aria-label={String(t('common.back'))}
          >
            <ArrowLeft className="w-4 h-4 text-gray-700" />
          </button>
        </div>
        <Card className="p-8 text-center">
          <p className="text-sm text-gray-500">{error || t('mobile.reports.notFound')}</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-8 pb-8">
      {/* Top bar — back button only, matches session detail */}
      <div className="px-1 py-1">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full bg-white ring-1 ring-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] flex items-center justify-center"
          aria-label={String(t('common.back'))}
        >
          <ArrowLeft className="w-4 h-4 text-gray-700" />
        </button>
      </div>

      {/* Hero strip — eyebrow + title (no centered duplicate title block) */}
      <div className="px-1">
        <Eyebrow className="mb-1">
          {t('mobile.reports.reportDetails')}
        </Eyebrow>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 leading-tight">
          {report.report_name || t('reports.studentReport')}
        </h1>
        {report.start_date && report.end_date && (
          <p className="text-sm text-gray-500 mt-1">
            {formatDate(report.start_date)} – {formatDate(report.end_date)}
          </p>
        )}
      </div>

      {/* Student Info — soft, consistent Card */}
      <Card className="p-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
            {report.student_name?.charAt(0).toUpperCase() || 'S'}
          </div>
          <div className="min-w-0 flex-1">
            <Eyebrow className="mb-0.5">
              {t('reports.studentName')}
            </Eyebrow>
            <h3 className="text-base font-semibold text-gray-900 truncate">
              {report.student_name || t('reports.studentName')}
            </h3>
            {report.student_email && (
              <p className="text-xs text-gray-500 truncate mt-0.5">
                {report.student_email}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Performance Overview - 3 statistics cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-600" />
              <h4 className="font-semibold text-gray-900">{t('navigation.assignments')}</h4>
            </div>
            <span className="text-2xl font-bold text-emerald-600">{(reportData?.grades?.total || 0) > 0 ? `${reportData?.grades?.average || 0}%` : `${reportData?.assignments?.completionRate || 0}%`}</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{t('common.completed')}</span>
              <span className="font-medium">{reportData?.assignments.completed || 0}/{reportData?.assignments.total || 0}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${reportData?.assignments.completionRate || 0}%` }}></div>
            </div>
            {reportData?.assignments.statuses && (
              <div className="grid grid-cols-2 gap-2 text-xs mt-4">
                {[
                  { key: 'submitted', color: 'text-emerald-700', bg: 'bg-emerald-50' },
                  { key: 'pending', color: 'text-amber-700', bg: 'bg-amber-50' },
                  { key: 'overdue', color: 'text-rose-700', bg: 'bg-rose-50' },
                  { key: 'not submitted', color: 'text-gray-700', bg: 'bg-gray-50' },
                  { key: 'excused', color: 'text-sky-700', bg: 'bg-sky-50' }
                ].map(({ key, color, bg }) => {
                  const count = reportData.assignments.statuses[key] || 0
                  const translationKey = key === 'not submitted' ? 'notSubmitted' : key
                  return (
                    <div key={key} className={`flex justify-between items-center px-3 py-2 rounded-full ${bg}`}>
                      <span className={`${color} text-[11px] font-semibold`}>
                        {t(`assignments.status.${translationKey}`)}
                      </span>
                      <span className={`font-semibold ${color} text-xs tabular-nums`}>{count}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-sky-700" />
              <h4 className="font-semibold text-gray-900">{t('navigation.attendance')}</h4>
            </div>
            <span className="text-2xl font-bold text-sky-700">{reportData?.attendance.attendanceRate || 0}%</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{t('attendance.present')}</span>
              <span className="font-medium">{reportData?.attendance.present || 0}/{reportData?.attendance.total || 0}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-sky-500 h-2 rounded-full" style={{ width: `${reportData?.attendance.attendanceRate || 0}%` }}></div>
            </div>
            {reportData?.attendance.statuses && (
              <div className="grid grid-cols-2 gap-2 text-xs mt-4">
                {[
                  { key: 'present', color: 'text-emerald-700', bg: 'bg-emerald-50' },
                  { key: 'absent', color: 'text-rose-700', bg: 'bg-rose-50' },
                  { key: 'late', color: 'text-amber-700', bg: 'bg-amber-50' },
                  { key: 'excused', color: 'text-sky-700', bg: 'bg-sky-50' },
                  { key: 'pending', color: 'text-gray-700', bg: 'bg-gray-50' }
                ].map(({ key, color, bg }) => {
                  const count = reportData.attendance.statuses[key] || 0
                  return (
                    <div key={key} className={`flex justify-between items-center px-3 py-2 rounded-full ${bg}`}>
                      <span className={`${color} text-[11px] font-semibold`}>
                        {t(`attendance.${key}`) || key}
                      </span>
                      <span className={`font-semibold ${color} text-xs tabular-nums`}>{count}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Assignment Type Performance - 4 Individual Cards */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-gray-900 px-1">{t('reports.overallAverageGrade')}</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(() => {
            // Soft-palette tokens — explicit Tailwind classes so Purge keeps them.
            // Hex values match the corresponding Tailwind 500-tier swatches so the
            // SVG strokes/dots line up with the text class.
            const types = [
              { key: 'quiz',     color: '#0ea5e9', colorName: 'sky',     textClass: 'text-sky-700',     label: 'sessions.quiz' },
              { key: 'homework', color: '#10b981', colorName: 'emerald', textClass: 'text-emerald-700', label: 'sessions.homework' },
              { key: 'test',     color: '#8b5cf6', colorName: 'violet',  textClass: 'text-violet-700',  label: 'sessions.test' },
              { key: 'project',  color: '#f59e0b', colorName: 'amber',   textClass: 'text-amber-700',   label: 'sessions.project' }
            ]

            return types.map((typeConfig) => {
              const typeData = reportData?.assignmentsByType?.[typeConfig.key] || {}
              const hasData = typeData.total > 0
              const chartData = typeData.chartData || []

              return (
                <Card key={typeConfig.key} className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: typeConfig.color }}
                      />
                      <h5 className="text-sm font-semibold text-gray-900 truncate">{t(typeConfig.label)}</h5>
                    </div>
                    <span className={`text-lg font-semibold tabular-nums ${hasData ? typeConfig.textClass : 'text-gray-400'}`}>
                      {hasData
                        ? typeData.averageGrade > 0
                          ? `${typeData.averageGrade}%`
                          : `${typeData.completionRate || 0}%`
                        : t('reports.noData')}
                    </span>
                  </div>

                  <div className="h-32 relative">
                    <svg
                      width="100%"
                      height="100%"
                      viewBox="0 0 300 120"
                      className="overflow-visible"
                      onMouseLeave={() => setTooltip({ show: false, x: 0, y: 0, content: '' })}
                    >
                      <defs>
                        <linearGradient id={`${typeConfig.colorName}Gradient-${typeConfig.key}`} x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" style={{ stopColor: typeConfig.color, stopOpacity: 0.2 }} />
                          <stop offset="100%" style={{ stopColor: typeConfig.color, stopOpacity: 0 }} />
                        </linearGradient>
                      </defs>

                      {(() => {
                        if (chartData.length === 0 || !chartData.some((point: any) => point.score > 0)) {
                          return (
                            <g>
                              <rect x="0" y="0" width="300" height="120" fill="#F9FAFB" rx="4" />
                              <text x="150" y="60" textAnchor="middle" className="fill-gray-400 text-sm">
                                {t('reports.noChartData')}
                              </text>
                            </g>
                          )
                        }

                        const pathData = chartData.map((point: any, i: number) =>
                          `${i === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
                        ).join(' ')

                        const fillPathData = pathData + ` L ${chartData[chartData.length - 1].x} 120 L 0 120 Z`

                        return (
                          <>
                            <path
                              d={pathData}
                              stroke={typeConfig.color}
                              strokeWidth="3"
                              fill="none"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d={fillPathData}
                              fill={`url(#${typeConfig.colorName}Gradient-${typeConfig.key})`}
                            />
                          </>
                        )
                      })()}

                      {(() => {
                        if (chartData.length === 0 || !chartData.some((point: any) => point.score > 0)) return null

                        return chartData.map((point: any, i: number) => (
                          <circle
                            key={i}
                            cx={point.x}
                            cy={point.y}
                            r="4"
                            fill={typeConfig.color}
                            stroke="#FFFFFF"
                            strokeWidth="2"
                            className="cursor-pointer hover:r-4 transition-all"
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect()
                              setTooltip({
                                show: true,
                                x: rect.left + rect.width / 2,
                                y: rect.top - 10,
                                content: `${point.label}: ${point.score}%`
                              })
                            }}
                            onTouchStart={(e) => {
                              e.preventDefault()
                              const rect = e.currentTarget.getBoundingClientRect()
                              setTooltip({
                                show: true,
                                x: rect.left + rect.width / 2,
                                y: rect.top - 10,
                                content: `${point.label}: ${point.score}%`
                              })
                              setTimeout(() => setTooltip({ show: false, x: 0, y: 0, content: '' }), 2000)
                            }}
                          />
                        ))
                      })()}
                    </svg>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="text-gray-500">
                      {hasData
                        ? `${t('common.completed')}: ${typeData.completed || 0}/${typeData.total || 0}`
                        : t('reports.noAssignmentsAvailable')}
                    </span>
                    {(() => {
                      if (!hasData) return null
                      if (chartData.length >= 2) {
                        const firstScore = chartData[0].score
                        const lastScore = chartData[chartData.length - 1].score
                        const change = lastScore - firstScore
                        return (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-semibold tabular-nums ${
                            change >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {change >= 0 ? '+' : ''}{change}%
                          </span>
                        )
                      }
                      return null
                    })()}
                  </div>
                </Card>
              )
            })
          })()}
        </div>
      </div>


      {/* Individual Category Performance */}
      {report.show_category_average !== false && reportData?.assignmentsByCategory && Object.keys(reportData.assignmentsByCategory).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(reportData.assignmentsByCategory).map(([categoryId, categoryData]: [string, any], index) => {
              // Soft-palette tokens (5-color cycle), explicit text classes for purge safety
              const palette = [
                { hex: '#0ea5e9', colorName: 'sky',     textClass: 'text-sky-700' },
                { hex: '#10b981', colorName: 'emerald', textClass: 'text-emerald-700' },
                { hex: '#8b5cf6', colorName: 'violet',  textClass: 'text-violet-700' },
                { hex: '#f59e0b', colorName: 'amber',   textClass: 'text-amber-700' },
                { hex: '#f43f5e', colorName: 'rose',    textClass: 'text-rose-700' }
              ]
              const swatch = palette[index % palette.length]
              const color = swatch.hex
              const colorName = swatch.colorName
              const categoryName = assignmentCategories.find(c => c.id === categoryId)?.name || String(t('mobile.fallbacks.unknownCategory'))
              const hasData = categoryData.total > 0

              return (
                <Card key={categoryId} className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <h5 className="text-sm font-semibold text-gray-900 truncate">{categoryName}</h5>
                    </div>
                    <span className={`text-lg font-semibold tabular-nums ${hasData ? swatch.textClass : 'text-gray-400'}`}>
                      {hasData
                        ? categoryData.averageGrade > 0
                          ? `${categoryData.averageGrade}%`
                          : `${categoryData.completionRate || 0}%`
                        : t('reports.noData')}
                    </span>
                  </div>
                  <div className="h-32 relative">
                    <svg
                      width="100%"
                      height="100%"
                      viewBox="0 0 300 120"
                      className="overflow-visible"
                      onMouseLeave={() => setTooltip({ show: false, x: 0, y: 0, content: '' })}
                    >
                      <defs>
                        <linearGradient id={`small${colorName}Gradient-${categoryId}`} x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.2 }} />
                          <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
                        </linearGradient>
                      </defs>
                      {(() => {
                        const chartData = categoryData.chartData || []
                        if (chartData.length === 0 || !chartData.some((point: any) => point.score > 0)) {
                          return (
                            <g>
                              <rect x="0" y="0" width="300" height="120" fill="#F9FAFB" rx="4" />
                              <text x="150" y="60" textAnchor="middle" className="fill-gray-400 text-sm">
                                {t('reports.noChartData')}
                              </text>
                            </g>
                          )
                        }

                        const pathData = chartData.map((point: any, i: number) =>
                          `${i === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
                        ).join(' ')

                        const fillPathData = pathData + ` L ${chartData[chartData.length - 1].x} 120 L 0 120 Z`

                        return (
                          <>
                            <path
                              d={pathData}
                              stroke={color}
                              strokeWidth="3"
                              fill="none"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d={fillPathData}
                              fill={`url(#small${colorName}Gradient-${categoryId})`}
                            />
                          </>
                        )
                      })()}
                      {(() => {
                        const chartData = categoryData.chartData || []
                        if (chartData.length === 0 || !chartData.some((point: any) => point.score > 0)) return null

                        return chartData.map((point: any, i: number) => (
                          <circle
                            key={i}
                            cx={point.x}
                            cy={point.y}
                            r="4"
                            fill={color}
                            stroke="#FFFFFF"
                            strokeWidth="2"
                            className="cursor-pointer hover:r-4 transition-all"
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect()
                              setTooltip({
                                show: true,
                                x: rect.left + rect.width / 2,
                                y: rect.top - 10,
                                content: `${point.label}: ${point.score}%`
                              })
                            }}
                            onTouchStart={(e) => {
                              e.preventDefault()
                              const rect = e.currentTarget.getBoundingClientRect()
                              setTooltip({
                                show: true,
                                x: rect.left + rect.width / 2,
                                y: rect.top - 10,
                                content: `${point.label}: ${point.score}%`
                              })
                              setTimeout(() => setTooltip({ show: false, x: 0, y: 0, content: '' }), 2000)
                            }}
                          />
                        ))
                      })()}
                    </svg>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="text-gray-500">
                      {hasData
                        ? `${t('common.completed')}: ${categoryData.completed || 0}/${categoryData.total || 0}`
                        : t('reports.noAssignmentsAvailable')}
                    </span>
                    {(() => {
                      if (!hasData) return null
                      const chartData = categoryData.chartData || []
                      if (chartData.length >= 2) {
                        const firstScore = chartData[0].score
                        const lastScore = chartData[chartData.length - 1].score
                        const change = lastScore - firstScore
                        return (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-semibold tabular-nums ${
                            change >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {change >= 0 ? '+' : ''}{change}%
                          </span>
                        )
                      }
                      return null
                    })()}
                  </div>
                </Card>
              )
            })}
        </div>
      )}

      {/* Individual Assignment Grades */}
      {report.show_individual_grades && reportData?.individualGrades && reportData.individualGrades.length > 0 && (
        <Card className="p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-6">{t('reports.individualAssignmentGrades')}</h4>
          <div className="overflow-x-auto">
            <div className="min-w-max flex gap-3 pb-2" style={{ minWidth: `${Math.max(800, reportData.individualGrades.length * 80)}px` }}>
              {reportData.individualGrades
                .filter((grade: any) => grade.score !== null && grade.score !== undefined)
                .sort((a: any, b: any) => new Date(a.completedDate).getTime() - new Date(b.completedDate).getTime())
                .map((grade: any, index: number) => {
                  const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F97316', '#EF4444', '#F59E0B']
                  const color = colors[index % colors.length]
                  const barHeight = `${Math.max(10, grade.score)}%`

                  return (
                    <div key={grade.id} className="flex flex-col items-center gap-2" style={{ minWidth: '70px' }}>
                      <div className="text-xs text-gray-500 text-center h-8 flex items-center justify-center">
                        {new Date(grade.completedDate).toLocaleDateString(language === 'korean' ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric' })}
                      </div>
                      <div className="relative h-48 w-12 bg-gray-100 rounded-lg flex items-end justify-center overflow-hidden">
                        <div
                          className="w-full rounded-t-lg transition-all duration-300"
                          style={{
                            height: barHeight,
                            backgroundColor: color,
                            minHeight: '10%'
                          }}
                        >
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 text-center text-xs font-semibold text-white pb-1" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                          {grade.score}%
                        </div>
                      </div>
                      <div className="text-xs text-gray-700 font-medium text-center max-w-[70px] break-words">
                        {grade.title}
                      </div>
                      <div className="text-xs text-gray-500 text-center max-w-[70px] break-words">
                        {grade.subject}
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        </Card>
      )}

      {/* Student Percentile */}
      {report.show_percentile_ranking !== false && reportData?.classroomPercentiles && Object.keys(reportData.classroomPercentiles).length > 0 && (
        <Card className="p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-6">{t('reports.classPercentileRanking')}</h4>

          {(() => {
            const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F97316', '#EF4444', '#F59E0B']
            const darkColors = ['#1D4ED8', '#059669', '#7C3AED', '#EA580C', '#DC2626', '#D97706']

            const classrooms = Object.entries(reportData?.classroomPercentiles || {}).map(([classroomId, data]: [string, any], index) => ({
              id: classroomId,
              name: data.classroomName,
              percentile: data.percentile ?? 0,
              classroomAverage: data.classroomAverage,
              totalStudents: data.totalStudents,
              studentRank: data.studentRank,
              color: colors[index % colors.length],
              darkColor: darkColors[index % darkColors.length],
              gradientId: `classroom${index}CurveGradient`
            }))

            if (classrooms.length === 0) {
              return (
                <div className="text-center py-8 text-gray-500">
                  <div className="mb-2">
                    {t('reports.noClassroomsSelected')}
                  </div>
                  <div className="text-sm">
                    {t('reports.noClassroomData')}
                  </div>
                </div>
              )
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {classrooms.map((classroom) => {
                  return (
                    <div key={classroom.id} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h5 className="text-base font-semibold text-gray-800">{classroom.name}</h5>
                        <div className="text-right">
                          <div className="text-sm font-bold" style={{ color: classroom.darkColor }}>
                            {classroom.percentile}%
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-center items-center text-sm">
                        <span className="text-gray-600">{t('reports.classAverage')}: <span className="font-semibold">{classroom.classroomAverage}%</span></span>
                      </div>

                      <div className="text-center text-sm mb-2">
                        <span className="text-gray-600">{t('reports.totalStudents')}: <span className="font-semibold">{classroom.totalStudents}</span></span>
                      </div>

                      <div className="relative h-40">
                        <svg width="100%" height="100%" viewBox="0 0 400 160" className="overflow-visible">
                          <defs>
                            <linearGradient id={`bellGradient-${classroom.id}`} x1="0%" y1="100%" x2="0%" y2="0%">
                              <stop offset="0%" style={{ stopColor: classroom.color, stopOpacity: 0.3 }} />
                              <stop offset="100%" style={{ stopColor: classroom.color, stopOpacity: 0.1 }} />
                            </linearGradient>
                          </defs>

                          {(() => {
                            // Bell curve (normal distribution) parameters
                            const centerX = 200 // Middle of the graph
                            const baseY = 130   // Bottom of the curve
                            const peakY = 50   // Top of the curve
                            const startX = 50
                            const endX = 350
                            const width = endX - startX

                            // Calculate student position on X axis based on percentile
                            const studentX = startX + (classroom.percentile / 100) * width

                            // Generate bell curve path using quadratic curves
                            // Create a smooth bell curve using multiple curve segments
                            const bellCurvePoints = []
                            for (let i = 0; i <= 100; i++) {
                              const x = startX + (i / 100) * width
                              // Normal distribution formula - proper bell curve orientation
                              const normalizedX = (x - centerX) / (width / 6) // Adjust spread
                              const y = baseY - (baseY - peakY) * Math.exp(-0.5 * normalizedX * normalizedX)
                              bellCurvePoints.push(`${x},${y}`)
                            }

                            const bellCurvePath = `M ${bellCurvePoints.join(' L ')}`
                            const fillPath = bellCurvePath + ` L ${endX},${baseY} L ${startX},${baseY} Z`

                            // Calculate Y position on curve for student marker
                            const normalizedStudentX = (studentX - centerX) / (width / 6)
                            const studentY = baseY - (baseY - peakY) * Math.exp(-0.5 * normalizedStudentX * normalizedStudentX)

                            return (
                              <g>
                                {/* Bell curve fill */}
                                <path
                                  d={fillPath}
                                  fill={`url(#bellGradient-${classroom.id})`}
                                  stroke="none"
                                />

                                {/* Bell curve outline */}
                                <path
                                  d={bellCurvePath}
                                  fill="none"
                                  stroke={classroom.color}
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                />

                                {/* Percentile labels on X-axis */}
                                {[0, 25, 50, 75, 100].map(percentile => {
                                  const x = startX + (percentile / 100) * width
                                  return (
                                    <g key={percentile}>
                                      <line
                                        x1={x}
                                        y1={baseY}
                                        x2={x}
                                        y2={baseY + 5}
                                        stroke="#9CA3AF"
                                        strokeWidth="1"
                                      />
                                      <text
                                        x={x}
                                        y={baseY + 18}
                                        className="text-xs fill-gray-500"
                                        textAnchor="middle"
                                      >
                                        {percentile}%
                                      </text>
                                    </g>
                                  )
                                })}

                                {/* Student position marker */}
                                <g>
                                  {/* Vertical line from curve to bottom */}
                                  <line
                                    x1={studentX}
                                    y1={studentY}
                                    x2={studentX}
                                    y2={baseY}
                                    stroke={classroom.darkColor}
                                    strokeWidth="2"
                                    strokeDasharray="3,3"
                                  />

                                  {/* Circle on curve */}
                                  <circle
                                    cx={studentX}
                                    cy={studentY}
                                    r="6"
                                    fill={classroom.color}
                                    stroke={classroom.darkColor}
                                    strokeWidth="2"
                                  />

                                  {/* Student label */}
                                  <text
                                    x={studentX}
                                    y={studentY - 12}
                                    className="text-xs font-semibold"
                                    fill={classroom.darkColor}
                                    textAnchor="middle"
                                  >
                                    {t('reports.you')} ({classroom.percentile}%)
                                  </text>

                                  {/* Title */}
                                  <text
                                    x={centerX}
                                    y={25}
                                    className="text-[11px] fill-gray-700 font-medium"
                                    textAnchor="middle"
                                  >
                                    {t('reports.percentilePosition')}
                                  </text>

                                  {/* Center line at 50% */}
                                  <line
                                    x1={centerX}
                                    y1={peakY}
                                    x2={centerX}
                                    y2={baseY}
                                    stroke="#9CA3AF"
                                    strokeWidth="1"
                                    strokeDasharray="2,2"
                                    opacity="0.5"
                                  />
                                </g>
                              </g>
                            )
                          })()}
                        </svg>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}

          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{t('reports.overallClassRanking')}</span>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold text-gray-900">
                  {(() => {
                    const percentiles = Object.values(reportData?.classroomPercentiles || {}) as any[]
                    if (percentiles.length === 0) {
                      return t('reports.noData')
                    }
                    const avgPercentile = Math.round(
                      percentiles.reduce((sum, data: any) => sum + (data.percentile || 0), 0) / percentiles.length
                    )
                    return `${t('reports.topPercentagePrefix')} ${avgPercentile}%`
                  })()}
                </span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Feedback Content */}
      {report.feedback && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t('assignments.feedback')}
          </h2>
          <div
            className="prose prose-sm max-w-none text-gray-700"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(report.feedback) }}
          />
        </Card>
      )}


      {/* Tooltip */}
      {tooltip.show && (
        <div
          className="fixed bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg z-[70] pointer-events-none"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            transform: 'translate(-50%, -100%)'
          }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  )
}

