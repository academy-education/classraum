"use client"

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSafeParams } from '@/hooks/useSafeParams'
import { Button } from '@/components/ui/button'
import { ArrowLeft, BookOpen, Users, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/hooks/useTranslation'
import { useLanguage } from '@/contexts/LanguageContext'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { simpleTabDetection } from '@/utils/simpleTabDetection'
import { useStableCallback } from '@/hooks/useStableCallback'

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
      console.log('🚫 [MobileReportDetails] Suppressing initial loading - navigation detected')
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
  const generateChartDataForType = useCallback((typeAssignments: any[], reportStartDate?: string, reportEndDate?: string) => {
    // Use report date range if provided, otherwise use reasonable defaults
    const startDate = reportStartDate ? new Date(reportStartDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const endDate = reportEndDate ? new Date(reportEndDate) : new Date()
    const timeDiff = endDate.getTime() - startDate.getTime()

    // Always generate exactly 8 points
    const pointCount = 8
    const interval = timeDiff / (pointCount - 1)

    // Filter and sort assignments (include all assignments, treat missing scores properly)
    const allAssignments = typeAssignments
      .map(a => ({
        ...a,
        score: a.score !== null ? a.score : (a.status === 'not_submitted' ? 0 : null),
        graded_date: a.submitted_date || a.updated_at
      }))
      .filter((a: any) =>a.score !== null && a.graded_date) // Only assignments with scores or 0 for not submitted
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

      console.log('🔧 [MOBILE DEBUG] Using RPC function for assignments:', {
        rpc_function: 'get_student_assignment_grades',
        student_id: studentId,
        error: assignmentsError,
        result_count: assignmentGrades?.length || 0
      })

      // Fallback to direct query if RPC fails
      if (assignmentsError || !assignmentGrades || assignmentGrades.length === 0) {
        console.log('🔄 [MOBILE DEBUG] Assignment RPC failed, trying direct query...')
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

      // Transform RPC data to match expected structure
      const assignments = assignmentGrades?.map((ag: any) => ({
        id: ag.id,
        status: ag.status,
        score: ag.score,
        updated_at: ag.updated_at,
        submitted_date: ag.submitted_date,
        assignments: ag.assignment_data
      })) || []

      if (assignmentsError) {
        console.error('Error fetching assignments:', assignmentsError)
        return
      }

      console.log('🔍 [MOBILE DEBUG] Filtering assignments:', {
        totalAssignments: assignments?.length || 0,
        selectedClassrooms: selectedClassrooms,
        selectedClassroomsLength: selectedClassrooms?.length || 0
      })

      // Filter by selected classrooms if provided
      let filteredAssignments = selectedClassrooms && selectedClassrooms.length > 0
        ? assignments?.filter((a: any) => selectedClassrooms.includes((a.assignments as any)?.classroom_sessions?.classroom_id)) || []
        : assignments || []

      console.log('🔍 [MOBILE DEBUG] After classroom filtering:', {
        filteredCount: filteredAssignments.length,
        sampleAssignment: filteredAssignments[0] ? {
          classroomId: (filteredAssignments[0].assignments as any)?.classroom_sessions?.classroom_id,
          type: (filteredAssignments[0].assignments as any)?.assignment_type
        } : null
      })

      // Apply assignment type filtering to match dashboard logic - only include valid types
      const validTypes = ['quiz', 'homework', 'test', 'project']
      filteredAssignments = filteredAssignments.filter((a: any) =>
        (a.assignments as any)?.assignment_type && validTypes.includes((a.assignments as any).assignment_type)
      )

      console.log('🔍 [MOBILE DEBUG] After type filtering:', {
        finalCount: filteredAssignments.length,
        validTypes: validTypes
      })

      // Collect individual grades for display
      const individualGrades = filteredAssignments.map((assignment: any) => ({
        id: assignment.id,
        title: (assignment.assignments as any)?.title || (assignment.assignments as any)?.id || 'Unknown Assignment',
        type: (assignment.assignments as any)?.assignment_type || 'unknown',
        subject: (assignment.assignments as any)?.classroom_sessions?.classrooms?.subjects?.name ||
                 (assignment.assignments as any)?.classroom_sessions?.classrooms?.subjects?.[0]?.name ||
                 'Unknown Subject',
        classroom: (assignment.assignments as any)?.classroom_sessions?.classrooms?.name || 'Unknown Classroom',
        categoryId: (assignment.assignments as any)?.assignment_categories_id || '',
        score: assignment.score,
        status: assignment.status,
        dueDate: (assignment.assignments as any)?.due_date || '',
        completedDate: assignment.updated_at,
        feedback: assignment.feedback || null
      }))

      // Calculate assignment statistics by type
      const assignmentsByType = {
        quiz: {
          total: filteredAssignments.filter((a: any) => (a.assignments as any)?.assignment_type === 'quiz').length,
          completed: filteredAssignments.filter((a: any) => (a.assignments as any)?.assignment_type === 'quiz' && a.status === 'submitted').length,
          completionRate: Math.round(
            filteredAssignments.filter((a: any) => (a.assignments as any)?.assignment_type === 'quiz').length > 0
              ? (filteredAssignments.filter((a: any) => (a.assignments as any)?.assignment_type === 'quiz' && a.status === 'submitted').length /
                 filteredAssignments.filter((a: any) => (a.assignments as any)?.assignment_type === 'quiz').length) * 100
              : 0
          ),
          averageGrade: Math.round(
            filteredAssignments.filter((a: any) =>(a.assignments as any)?.assignment_type === 'quiz' && a.score !== null).length > 0
              ? filteredAssignments.filter((a: any) =>(a.assignments as any)?.assignment_type === 'quiz' && a.score !== null)
                  .reduce((sum: any, a: any) => sum + a.score, 0) /
                filteredAssignments.filter((a: any) =>(a.assignments as any)?.assignment_type === 'quiz' && a.score !== null).length
              : 0
          ),
          chartData: generateChartDataForType(filteredAssignments.filter((a: any) =>(a.assignments as any)?.assignment_type === 'quiz'), startDate, endDate),
          statuses: {
            submitted: filteredAssignments.filter((a: any) =>(a.assignments as any)?.assignment_type === 'quiz' && a.status === 'submitted').length,
            pending: filteredAssignments.filter((a: any) =>(a.assignments as any)?.assignment_type === 'quiz' && a.status === 'pending').length,
            overdue: filteredAssignments.filter((a: any) =>(a.assignments as any)?.assignment_type === 'quiz' && a.status === 'overdue').length,
            'not submitted': filteredAssignments.filter((a: any) =>(a.assignments as any)?.assignment_type === 'quiz' && a.status === 'not_submitted').length,
            excused: filteredAssignments.filter((a: any) =>(a.assignments as any)?.assignment_type === 'quiz' && a.status === 'excused').length
          }
        },
        homework: {
          total: filteredAssignments.filter((a: any) =>(a.assignments as any)?.assignment_type === 'homework').length,
          completed: filteredAssignments.filter((a: any) =>(a.assignments as any)?.assignment_type === 'homework' && a.status === 'submitted').length,
          completionRate: Math.round(
            filteredAssignments.filter((a: any) =>(a.assignments as any)?.assignment_type === 'homework').length > 0
              ? (filteredAssignments.filter((a: any) =>(a.assignments as any)?.assignment_type === 'homework' && a.status === 'submitted').length /
                 filteredAssignments.filter((a: any) =>(a.assignments as any)?.assignment_type === 'homework').length) * 100
              : 0
          ),
          averageGrade: Math.round(
            filteredAssignments.filter((a: any) =>(a.assignments as any)?.assignment_type === 'homework' && a.score !== null).length > 0
              ? filteredAssignments.filter((a: any) =>(a.assignments as any)?.assignment_type === 'homework' && a.score !== null)
                  .reduce((sum: any, a: any) => sum + a.score, 0) /
                filteredAssignments.filter((a: any) =>(a.assignments as any)?.assignment_type === 'homework' && a.score !== null).length
              : 0
          ),
          chartData: generateChartDataForType(filteredAssignments.filter((a: any) =>(a.assignments as any)?.assignment_type === 'homework'), startDate, endDate),
          statuses: {
            submitted: filteredAssignments.filter((a: any) =>(a.assignments as any)?.assignment_type === 'homework' && a.status === 'submitted').length,
            pending: filteredAssignments.filter((a: any) =>(a.assignments as any)?.assignment_type === 'homework' && a.status === 'pending').length,
            overdue: filteredAssignments.filter((a: any) =>(a.assignments as any)?.assignment_type === 'homework' && a.status === 'overdue').length,
            'not submitted': filteredAssignments.filter((a: any) =>(a.assignments as any)?.assignment_type === 'homework' && a.status === 'not_submitted').length,
            excused: filteredAssignments.filter((a: any) =>(a.assignments as any)?.assignment_type === 'homework' && a.status === 'excused').length
          }
        },
        test: {
          total: filteredAssignments.filter((a: any) =>(a.assignments as any)?.assignment_type === 'test').length,
          completed: filteredAssignments.filter((a: any) =>(a.assignments as any)?.assignment_type === 'test' && a.status === 'submitted').length,
          completionRate: Math.round(
            filteredAssignments.filter((a: any) =>(a.assignments as any)?.assignment_type === 'test').length > 0
              ? (filteredAssignments.filter((a: any) =>(a.assignments as any)?.assignment_type === 'test' && a.status === 'submitted').length /
                 filteredAssignments.filter((a: any) =>(a.assignments as any)?.assignment_type === 'test').length) * 100
              : 0
          ),
          averageGrade: Math.round(
            filteredAssignments.filter((a: any) =>(a.assignments as any)?.assignment_type === 'test' && a.score !== null).length > 0
              ? filteredAssignments.filter((a: any) =>(a.assignments as any)?.assignment_type === 'test' && a.score !== null)
                  .reduce((sum: any, a: any) => sum + a.score, 0) /
                filteredAssignments.filter((a: any) =>(a.assignments as any)?.assignment_type === 'test' && a.score !== null).length
              : 0
          ),
          chartData: generateChartDataForType(filteredAssignments.filter((a: any) =>(a.assignments as any)?.assignment_type === 'test'), startDate, endDate),
          statuses: {
            submitted: filteredAssignments.filter((a: any) =>(a.assignments as any)?.assignment_type === 'test' && a.status === 'submitted').length,
            pending: filteredAssignments.filter((a: any) =>(a.assignments as any)?.assignment_type === 'test' && a.status === 'pending').length,
            overdue: filteredAssignments.filter((a: any) =>(a.assignments as any)?.assignment_type === 'test' && a.status === 'overdue').length,
            'not submitted': filteredAssignments.filter((a: any) =>(a.assignments as any)?.assignment_type === 'test' && a.status === 'not_submitted').length,
            excused: filteredAssignments.filter((a: any) =>(a.assignments as any)?.assignment_type === 'test' && a.status === 'excused').length
          }
        },
        project: {
          total: filteredAssignments.filter((a: any) =>(a.assignments as any)?.assignment_type === 'project').length,
          completed: filteredAssignments.filter((a: any) =>(a.assignments as any)?.assignment_type === 'project' && a.status === 'submitted').length,
          completionRate: Math.round(
            filteredAssignments.filter((a: any) =>(a.assignments as any)?.assignment_type === 'project').length > 0
              ? (filteredAssignments.filter((a: any) =>(a.assignments as any)?.assignment_type === 'project' && a.status === 'submitted').length /
                 filteredAssignments.filter((a: any) =>(a.assignments as any)?.assignment_type === 'project').length) * 100
              : 0
          ),
          averageGrade: Math.round(
            filteredAssignments.filter((a: any) =>(a.assignments as any)?.assignment_type === 'project' && a.score !== null).length > 0
              ? filteredAssignments.filter((a: any) =>(a.assignments as any)?.assignment_type === 'project' && a.score !== null)
                  .reduce((sum: any, a: any) => sum + a.score, 0) /
                filteredAssignments.filter((a: any) =>(a.assignments as any)?.assignment_type === 'project' && a.score !== null).length
              : 0
          ),
          chartData: generateChartDataForType(filteredAssignments.filter((a: any) =>(a.assignments as any)?.assignment_type === 'project'), startDate, endDate),
          statuses: {
            submitted: filteredAssignments.filter((a: any) =>(a.assignments as any)?.assignment_type === 'project' && a.status === 'submitted').length,
            pending: filteredAssignments.filter((a: any) =>(a.assignments as any)?.assignment_type === 'project' && a.status === 'pending').length,
            overdue: filteredAssignments.filter((a: any) =>(a.assignments as any)?.assignment_type === 'project' && a.status === 'overdue').length,
            'not submitted': filteredAssignments.filter((a: any) =>(a.assignments as any)?.assignment_type === 'project' && a.status === 'not_submitted').length,
            excused: filteredAssignments.filter((a: any) =>(a.assignments as any)?.assignment_type === 'project' && a.status === 'excused').length
          }
        }
      }

      // Calculate overall statistics
      const totalAssignments = filteredAssignments.length
      const completedAssignments = filteredAssignments.filter((a: any) =>a.status === 'submitted').length
      const averageGrade = filteredAssignments.filter((a: any) =>a.score !== null).length > 0
        ? Math.round(filteredAssignments.filter((a: any) =>a.score !== null).reduce((sum: any, a: any) => sum + a.score, 0) / filteredAssignments.filter((a: any) =>a.score !== null).length)
        : 0

      const assignments_data = {
        total: totalAssignments,
        completed: completedAssignments,
        completionRate: totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0,
        statuses: {
          submitted: filteredAssignments.filter((a: any) =>a.status === 'submitted').length,
          pending: filteredAssignments.filter((a: any) =>a.status === 'pending').length,
          overdue: filteredAssignments.filter((a: any) =>a.status === 'overdue').length,
          'not submitted': filteredAssignments.filter((a: any) =>a.status === 'not_submitted').length,
          excused: filteredAssignments.filter((a: any) =>a.status === 'excused').length
        }
      }

      // Calculate assignment categories data
      const assignmentsByCategory: Record<string, any> = {}

      if (selectedCategories && selectedCategories.length > 0) {
        selectedCategories.forEach(categoryId => {
          const categoryAssignments = filteredAssignments.filter((a: any) =>
            (a.assignments as any)?.assignment_categories_id === categoryId
          )
          const categoryCompletedAssignments = categoryAssignments.filter((a: any) =>a.status === 'submitted')
          const categoryCompletionRate = categoryAssignments.length > 0
            ? (categoryCompletedAssignments.length / categoryAssignments.length) * 100
            : 0
          const categoryAverageGrade = categoryAssignments.filter((a: any) =>a.score !== null).length > 0
            ? categoryAssignments.filter((a: any) =>a.score !== null).reduce((sum: any, a: any) => sum + a.score, 0) /
              categoryAssignments.filter((a: any) =>a.score !== null).length
            : 0

          const chartData = generateChartDataForType(categoryAssignments, startDate, endDate)

          assignmentsByCategory[categoryId] = {
            name: assignmentCategories.find(c => c.id === categoryId)?.name || 'Unknown Category',
            total: categoryAssignments.length,
            completed: categoryCompletedAssignments.length,
            completionRate: Math.round(categoryCompletionRate),
            averageGrade: Math.round(categoryAverageGrade),
            statuses: {
              submitted: categoryAssignments.filter((a: any) =>a.status === 'submitted').length,
              pending: categoryAssignments.filter((a: any) =>a.status === 'pending').length,
              overdue: categoryAssignments.filter((a: any) =>a.status === 'overdue').length,
              'not submitted': categoryAssignments.filter((a: any) =>a.status === 'not_submitted').length,
              excused: categoryAssignments.filter((a: any) =>a.status === 'excused').length
            },
            chartData
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
              classroomName: classroom?.name || 'Unknown Classroom',
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

      // Filter by selected classrooms if provided and transform to match expected structure
      let attendanceRecords = attendanceRpcData || []
      if (selectedClassrooms && selectedClassrooms.length > 0) {
        attendanceRecords = attendanceRecords.filter((a: any) =>selectedClassrooms.includes(a.classroom_id))
      }

      // Transform to match original structure for compatibility
      const attendanceData = attendanceRecords.map((a: any) => ({
        id: a.id,
        status: a.status,
        classroom_sessions: {
          id: a.classroom_id, // Using classroom_id as session reference
          date: a.session_date,
          classroom_id: a.classroom_id
        }
      }))
      const presentSessions = attendanceData.filter((a: any) =>a.status === 'present').length
      const totalSessions = attendanceData.length
      const attendanceRate = totalSessions > 0 ? (presentSessions / totalSessions) * 100 : 0

      const attendance = {
        total: totalSessions,
        present: presentSessions,
        attendanceRate: Math.round(attendanceRate),
        statuses: {
          present: attendanceRecords.filter((a: any) =>a.status === 'present').length,
          absent: attendanceRecords.filter((a: any) =>a.status === 'absent').length,
          late: attendanceRecords.filter((a: any) =>a.status === 'late').length,
          excused: attendanceRecords.filter((a: any) =>a.status === 'excused').length,
          pending: attendanceRecords.filter((a: any) =>a.status === 'pending').length
        }
      }

      // Mock grades data
      const grades = {
        total: filteredAssignments.filter((a: any) =>a.score !== null).length,
        average: averageGrade
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
        student_name: (studentData?.users as any)?.name || 'Unknown Student',
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
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="p-4">
        <Button
          variant="ghost"
          className="mb-6 p-0"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          {t('common.back')}
        </Button>
        <div className="text-center py-8">
          <p className="text-gray-500">{error || t('mobile.reports.notFound')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-8 pb-8">
      {/* Header with back button - matching session details style */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {report.report_name || t('mobile.reports.untitledReport')}
          </h1>
          <p className="text-sm text-gray-600">{t('mobile.reports.reportDetails')}</p>
        </div>
      </div>

      {/* Report Name */}
      <div className="text-center py-6 border-b border-gray-100">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">{report.report_name || t('reports.studentReport')}</h1>
        <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mx-auto"></div>
      </div>

      {/* Student Info Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-medium text-xl">
              {report.student_name?.charAt(0).toUpperCase() || 'S'}
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {report.student_name || t('reports.studentName')}
              </h3>
              <p className="text-gray-600">
                {report.student_email || t('reports.studentEmail')}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {t('reports.reportPeriod')} {report.start_date ? formatDate(report.start_date) : t('reports.selectStartDate')} - {report.end_date ? formatDate(report.end_date) : t('reports.selectEndDate')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Overview - 3 statistics cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-green-600" />
              <h4 className="font-semibold text-gray-900">{t('navigation.assignments')}</h4>
            </div>
            <span className="text-2xl font-bold text-green-600">{(reportData?.grades?.total || 0) > 0 ? `${reportData?.grades?.average || 0}%` : `${reportData?.assignments?.completionRate || 0}%`}</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{t('common.completed')}</span>
              <span className="font-medium">{reportData?.assignments.completed || 0}/{reportData?.assignments.total || 0}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: `${reportData?.assignments.completionRate || 0}%` }}></div>
            </div>
            {reportData?.assignments.statuses && (
              <div className="grid grid-cols-2 gap-2 text-xs mt-4">
                {[
                  { key: 'submitted', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
                  { key: 'pending', color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200' },
                  { key: 'overdue', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
                  { key: 'not submitted', color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200' },
                  { key: 'excused', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' }
                ].map(({ key, color, bg, border }) => {
                  const count = reportData.assignments.statuses[key] || 0
                  const translationKey = key === 'not submitted' ? 'notSubmitted' : key
                  return (
                    <div key={key} className={`flex justify-between items-center px-3 py-2 rounded-md border ${bg} ${border}`}>
                      <span className={`${color} text-xs font-medium`}>
                        {t(`assignments.status.${translationKey}`)}
                      </span>
                      <span className={`font-bold ${color} text-sm`}>{count}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <h4 className="font-semibold text-gray-900">{t('navigation.attendance')}</h4>
            </div>
            <span className="text-2xl font-bold text-blue-600">{reportData?.attendance.attendanceRate || 0}%</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{t('attendance.present')}</span>
              <span className="font-medium">{reportData?.attendance.present || 0}/{reportData?.attendance.total || 0}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${reportData?.attendance.attendanceRate || 0}%` }}></div>
            </div>
            {reportData?.attendance.statuses && (
              <div className="grid grid-cols-2 gap-2 text-xs mt-4">
                {[
                  { key: 'present', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
                  { key: 'absent', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
                  { key: 'late', color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200' },
                  { key: 'excused', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
                  { key: 'pending', color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200' }
                ].map(({ key, color, bg, border }) => {
                  const count = reportData.attendance.statuses[key] || 0
                  return (
                    <div key={key} className={`flex justify-between items-center px-3 py-2 rounded-md border ${bg} ${border}`}>
                      <span className={`${color} text-xs font-medium`}>
                        {t(`attendance.${key}`) || key}
                      </span>
                      <span className={`font-bold ${color} text-sm`}>{count}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Assignment Type Performance - 4 Individual Cards */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-gray-900">{t('reports.overallAverageGrade')}</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(() => {
            const types = [
              { key: 'quiz', color: '#3B82F6', colorName: 'blue', label: 'sessions.quiz' },
              { key: 'homework', color: '#10B981', colorName: 'green', label: 'sessions.homework' },
              { key: 'test', color: '#8B5CF6', colorName: 'purple', label: 'sessions.test' },
              { key: 'project', color: '#F97316', colorName: 'orange', label: 'sessions.project' }
            ]

            return types.map((typeConfig) => {
              const typeData = reportData?.assignmentsByType?.[typeConfig.key] || {}
              const hasData = typeData.total > 0
              const chartData = typeData.chartData || []

              return (
                <div key={typeConfig.key} className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: typeConfig.color }}></div>
                      <h5 className="font-semibold text-gray-900">{t(typeConfig.label)}</h5>
                    </div>
                    <span className={`text-lg font-bold ${hasData ? `text-${typeConfig.colorName}-600` : 'text-gray-400'}`}>
                      {hasData ? (
                        typeData.averageGrade > 0
                          ? `${typeData.averageGrade}%`
                          : `${typeData.completionRate || 0}%`
                      ) : (
                        t('reports.noData')
                      )}
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

                  <div className="mt-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>
                        {hasData ? (
                          `${t('common.completed')}: ${typeData.completed || 0}/${typeData.total || 0}`
                        ) : (
                          t('reports.noAssignmentsAvailable')
                        )}
                      </span>
                      {(() => {
                        if (!hasData) return null
                        if (chartData.length >= 2) {
                          const firstScore = chartData[0].score
                          const lastScore = chartData[chartData.length - 1].score
                          const change = lastScore - firstScore
                          return (
                            <span className={`${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {change >= 0 ? '+' : ''}{change}% {t('reports.trend')}
                            </span>
                          )
                        }
                        return null
                      })()}
                    </div>
                  </div>
                </div>
              )
            })
          })()}
        </div>
      </div>


      {/* Individual Category Performance */}
      {report.show_category_average !== false && reportData?.assignmentsByCategory && Object.keys(reportData.assignmentsByCategory).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(reportData.assignmentsByCategory).map(([categoryId, categoryData]: [string, any], index) => {
              const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F97316', '#EF4444', '#F59E0B', '#8B5CF6', '#10B981']
              const colorNames = ['blue', 'green', 'purple', 'orange', 'red', 'yellow', 'purple', 'green']
              const color = colors[index % colors.length]
              const colorName = colorNames[index % colorNames.length]
              const categoryName = assignmentCategories.find(c => c.id === categoryId)?.name || 'Unknown Category'
              const hasData = categoryData.total > 0

              return (
                <div key={categoryId} className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color }}></div>
                      <h5 className="font-semibold text-gray-900">{categoryName}</h5>
                    </div>
                    <span className={`text-lg font-bold ${hasData ? `text-${colorName}-600` : 'text-gray-400'}`}>
                      {hasData ? (
                        categoryData.averageGrade > 0
                          ? `${categoryData.averageGrade}%`
                          : `${categoryData.completionRate || 0}%`
                      ) : (
                        t('reports.noData')
                      )}
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

                  <div className="mt-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>
                        {hasData ? (
                          `${t('common.completed')}: ${categoryData.completed || 0}/${categoryData.total || 0}`
                        ) : (
                          t('reports.noAssignmentsAvailable')
                        )}
                      </span>
                      {(() => {
                        if (!hasData) return null
                        const chartData = categoryData.chartData || []
                        if (chartData.length >= 2) {
                          const firstScore = chartData[0].score
                          const lastScore = chartData[chartData.length - 1].score
                          const change = lastScore - firstScore
                          return (
                            <span className={`${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {change >= 0 ? '+' : ''}{change}% {t('reports.trend')}
                            </span>
                          )
                        }
                        return null
                      })()}
                    </div>
                  </div>
                </div>
              )
            })}
        </div>
      )}

      {/* Individual Assignment Grades */}
      {report.show_individual_grades && reportData?.individualGrades && reportData.individualGrades.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
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
                        {new Date(grade.completedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
        </div>
      )}

      {/* Student Percentile */}
      {report.show_percentile_ranking !== false && reportData?.classroomPercentiles && Object.keys(reportData.classroomPercentiles).length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
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
                <Users className="w-4 h-4 text-green-600" />
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
        </div>
      )}

      {/* Feedback Content */}
      {report.feedback && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t('assignments.feedback')}
          </h2>
          <div
            className="prose prose-sm max-w-none text-gray-700"
            dangerouslySetInnerHTML={{ __html: report.feedback }}
          />
        </div>
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

