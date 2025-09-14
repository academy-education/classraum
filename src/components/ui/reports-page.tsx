"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Search,
  MoreHorizontal,
  FileText,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Bot,
  Users,
  Eye,
  TrendingUp,
  Clock,
  BookOpen,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Send,
  FileCheck,
  Filter,
  Save,
  AlertTriangle
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { Label } from '@/components/ui/label'
import { RichTextEditor } from './RichTextEditor'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SubjectAndClassroomSelector } from '@/components/ui/reports/SubjectAndClassroomSelector'
import { useAuth } from '@/contexts/AuthContext'

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
  created_at: string
  updated_at: string
}

interface Classroom {
  id: string
  name: string
  subject: string
  grade: string
}

interface AssignmentCategory {
  id: string
  name: string
}

interface Student {
  user_id: string
  name: string
  email: string
  school_name?: string
}

interface ReportsPageProps {
  academyId: string
}

// DatePicker Component
const DatePickerComponent = ({ 
  value, 
  onChange, 
  fieldId,
  placeholder,
  activeDatePicker,
  setActiveDatePicker
}: { 
  value: string
  onChange: (value: string) => void
  fieldId: string
  placeholder?: string
  activeDatePicker: string | null
  setActiveDatePicker: (id: string | null) => void
}) => {
  const { t, language } = useTranslation()
  const isOpen = activeDatePicker === fieldId
  const datePickerRef = useRef<HTMLDivElement>(null)
  
  const currentDate = value ? new Date(value) : new Date()
  const today = new Date()
  
  const [viewMonth, setViewMonth] = useState(currentDate.getMonth())
  const [viewYear, setViewYear] = useState(currentDate.getFullYear())

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setActiveDatePicker(null)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isOpen, setActiveDatePicker])

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return placeholder || t('reports.selectDatePlaceholder')
    
    const date = new Date(dateString)
    
    if (language === 'korean') {
      const year = date.getFullYear()
      const month = date.getMonth() + 1
      const day = date.getDate()
      const weekday = date.getDay()
      const weekdayNames = ['일', '월', '화', '수', '목', '금', '토']
      
      return `${year}년 ${month}월 ${day}일 (${weekdayNames[weekday]})`
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }
  }

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay()
  }

  const monthNames = language === 'korean' ? [
    '1월', '2월', '3월', '4월', '5월', '6월',
    '7월', '8월', '9월', '10월', '11월', '12월'
  ] : [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  
  const dayHeaders = language === 'korean' ? 
    ['일', '월', '화', '수', '목', '금', '토'] : 
    ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

  const handleDateSelect = (day: number) => {
    const selectedDate = new Date(viewYear, viewMonth, day)
    // Format as YYYY-MM-DD in local timezone instead of UTC
    const year = selectedDate.getFullYear()
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
    const dayStr = String(selectedDate.getDate()).padStart(2, '0')
    const formattedDate = `${year}-${month}-${dayStr}`
    onChange(formattedDate)
    setActiveDatePicker(null)
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (viewMonth === 0) {
        setViewMonth(11)
        setViewYear(viewYear - 1)
      } else {
        setViewMonth(viewMonth - 1)
      }
    } else {
      if (viewMonth === 11) {
        setViewMonth(0)
        setViewYear(viewYear + 1)
      } else {
        setViewMonth(viewMonth + 1)
      }
    }
  }

  return (
    <div className="relative" ref={datePickerRef}>
      <div 
        className="flex items-center justify-between h-10 px-3 py-2 border border-border rounded-lg bg-white cursor-pointer hover:border-primary focus:border-primary transition-colors"
        onClick={() => setActiveDatePicker(isOpen ? null : fieldId)}
      >
        <span className={`text-sm ${value ? 'text-gray-900' : 'text-gray-500'}`}>
          {formatDisplayDate(value)}
        </span>
      </div>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-border rounded-lg shadow-lg p-4 z-50 min-w-[280px]">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h3 className="font-medium text-sm">
              {monthNames[viewMonth]} {viewYear}
            </h3>
            <button
              onClick={() => navigateMonth('next')}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {dayHeaders.map(day => (
              <div key={day} className="p-2 font-medium text-gray-500">
                {day}
              </div>
            ))}
            
            {Array.from({ length: getFirstDayOfMonth(viewMonth, viewYear) }).map((_, index) => (
              <div key={`empty-${index}`} className="p-2" />
            ))}
            
            {Array.from({ length: getDaysInMonth(viewMonth, viewYear) }).map((_, index) => {
              const day = index + 1
              const isSelected = value && new Date(value).getDate() === day && 
                               new Date(value).getMonth() === viewMonth && 
                               new Date(value).getFullYear() === viewYear
              const isToday = today.getDate() === day && 
                            today.getMonth() === viewMonth && 
                            today.getFullYear() === viewYear
              
              return (
                <button
                  key={day}
                  onClick={() => handleDateSelect(day)}
                  className={`p-2 text-sm rounded hover:bg-gray-100 transition-colors ${
                    isSelected 
                      ? 'bg-primary text-white hover:bg-primary/90' 
                      : isToday 
                        ? 'bg-blue-50 text-primary font-medium' 
                        : ''
                  }`}
                >
                  {day}
                </button>
              )
            })}
          </div>
          
          <div className="mt-3 pt-3 border-t border-gray-200">
            <button
              onClick={() => {
                const today = new Date()
                // Format today in local timezone instead of UTC
                const year = today.getFullYear()
                const month = String(today.getMonth() + 1).padStart(2, '0')
                const day = String(today.getDate()).padStart(2, '0')
                const formattedDate = `${year}-${month}-${day}`
                onChange(formattedDate)
                setActiveDatePicker(null)
              }}
              className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {t("dashboard.today")}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ReportsPage({ academyId }: ReportsPageProps) {
  const { t, language, loading: translationLoading } = useTranslation()
  const { userId, userName } = useAuth()
  // Status helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft':
        return 'bg-gray-100 text-gray-800'
      case 'Finished':
        return 'bg-blue-100 text-blue-800'  
      case 'Approved':
        return 'bg-green-100 text-green-800'
      case 'Sent':
        return 'bg-purple-100 text-purple-800'
      case 'Viewed':
        return 'bg-indigo-100 text-indigo-800'
      case 'Error':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusTranslation = (status: string) => {
    switch (status) {
      case 'Draft':
        return t('reports.draft')
      case 'Finished':
        return t('reports.finished')
      case 'Approved':
        return t('reports.approved')
      case 'Sent':
        return t('reports.sent')
      case 'Viewed':
        return t('reports.viewed')
      case 'Error':
        return t('reports.error')
      default:
        return t('reports.draft')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Draft':
        return <FileText className="w-4 h-4 text-gray-600" />
      case 'Finished':
        return <FileCheck className="w-4 h-4 text-blue-600" />
      case 'Approved':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'Sent':
        return <Send className="w-4 h-4 text-purple-600" />
      case 'Viewed':
        return <Eye className="w-4 h-4 text-indigo-600" />
      case 'Error':
        return <XCircle className="w-4 h-4 text-red-600" />
      default:
        return <FileText className="w-4 h-4 text-gray-600" />
    }
  }

  const [reports, setReports] = useState<ReportData[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingSubjects, setLoadingSubjects] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [students, setStudents] = useState<Student[]>([])
  const [showAddReportModal, setShowAddReportModal] = useState(false)
  const [assignmentCategories, setAssignmentCategories] = useState<AssignmentCategory[]>([])
  const [, setStudentClassrooms] = useState<Classroom[]>([])
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([])
  const [classrooms, setClassrooms] = useState<{ id: string; name: string; subject: string | null; grade: string | null; subject_id: string | null }[]>([])
  const [formData, setFormData] = useState({
    student_id: '',
    report_name: '',
    start_date: '',
    end_date: '',
    selected_subjects: [] as string[],
    selected_classrooms: [] as string[],
    selected_assignment_categories: [] as string[],
    ai_feedback_enabled: true,
    feedback: '',
    status: 'Draft' as 'Draft' | 'Finished' | 'Approved' | 'Sent' | 'Viewed' | 'Error'
  })
  const [currentReportId, setCurrentReportId] = useState<string | null>(null)
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({})
  const [submitting, setSubmitting] = useState(false)
  const [activeDatePicker, setActiveDatePicker] = useState<string | null>(null)
  const [studentSearchQuery, setStudentSearchQuery] = useState('')
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  // Removed manualFeedback state - using formData.feedback directly for comparison
  const [editableFeedback, setEditableFeedback] = useState('')
  const [isEditingFeedback, setIsEditingFeedback] = useState(false)
  const [feedbackHasChanges, setFeedbackHasChanges] = useState(false)
  const [aiFeedbackCreatedBy, setAiFeedbackCreatedBy] = useState('')
  const [aiFeedbackCreatedAt, setAiFeedbackCreatedAt] = useState('')
  const [aiFeedbackTemplate, setAiFeedbackTemplate] = useState('')
  const [showAiConfirmModal, setShowAiConfirmModal] = useState(false)
  const [isGeneratingAi, setIsGeneratingAi] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState('comprehensive')
  const [selectedLanguage, setSelectedLanguage] = useState('english')
  const [tooltip, setTooltip] = useState<{ show: boolean; x: number; y: number; content: string }>({
    show: false,
    x: 0,
    y: 0,
    content: ''
  })
  const [reportData, setReportData] = useState<{
    assignments: { completed: number; total: number; completionRate: number; statuses: Record<string, number> }
    attendance: { present: number; total: number; attendanceRate: number; statuses: Record<string, number> }
    grades: { average: number; total: number }
    assignmentsByType: Record<string, { 
      total: number; 
      completed: number; 
      completionRate: number; 
      averageGrade: number; 
      statuses: Record<string, number>;
      chartData: Array<{ x: number; y: number; score: number; date: Date; label: string }>
    }>
    assignmentsByCategory?: Record<string, { 
      total: number; 
      completed: number; 
      completionRate: number; 
      averageGrade: number; 
      statuses: Record<string, number>;
      chartData: Array<{ x: number; y: number; score: number; date: Date; label: string }>
    }>
    categoryNames?: Record<string, string>
    classroomPercentiles?: Record<string, {
      classroomName: string
      classroomAverage: number
      percentile: number
      totalStudents: number
      studentRank: number
    }>
  } | null>(null)
  const [loadingReportData, setLoadingReportData] = useState(false)
  
  // Cache for report data to persist across modal operations
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [reportDataCache, setReportDataCache] = useState<Record<string, any>>({})
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null)
  const dropdownButtonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({})
  const [showEditReportModal, setShowEditReportModal] = useState(false)
  const [editingReport, setEditingReport] = useState<ReportData | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [reportToDelete, setReportToDelete] = useState<ReportData | null>(null)

  const [sortField, setSortField] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showStatusFilter, setShowStatusFilter] = useState(false)
  const statusFilterRef = useRef<HTMLDivElement>(null)
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [selectAll, setSelectAll] = useState(false)

  const fetchStudents = useCallback(async () => {
    if (!academyId) return
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          user_id,
          school_name,
          active,
          users!inner(
            id,
            name,
            email
          )
        `)
        .eq('academy_id', academyId)
        .eq('active', true)
      
      if (error) throw error
      
      const studentsData = data?.map((student: Record<string, unknown>) => ({
        user_id: student.user_id as string,
        name: ((student.users as Record<string, unknown>)?.name as string) || 'Unknown',
        email: ((student.users as Record<string, unknown>)?.email as string) || '',
        school_name: student.school_name as string
      })) || []
      
      setStudents(studentsData)
    } catch (error) {
      console.error('Error fetching students:', error)
    }
  }, [academyId])

  const fetchReports = useCallback(async () => {
    if (!academyId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('student_reports')
        .select(`
          id,
          student_id,
          report_name,
          start_date,
          end_date,
          selected_subjects,
          selected_classrooms,
          selected_assignment_categories,
          ai_feedback_enabled,
          feedback,
          ai_feedback_created_by,
          ai_feedback_created_at,
          ai_feedback_template,
          status,
          created_at,
          updated_at,
          students!inner(
            academy_id,
            school_name,
            users!inner(
              name,
              email
            )
          )
        `)
        .eq('students.academy_id', academyId)
        .order('created_at', { ascending: false })

      if (error) throw error

      const reportsData = data?.map((report: Record<string, unknown>) => ({
        id: report.id as string,
        student_id: report.student_id as string,
        student_name: ((report.students as Record<string, unknown>)?.users as Record<string, unknown>)?.name as string || '',
        student_email: ((report.students as Record<string, unknown>)?.users as Record<string, unknown>)?.email as string || '',
        student_school: (report.students as Record<string, unknown>)?.school_name as string || '',
        report_name: report.report_name as string,
        start_date: report.start_date as string,
        end_date: report.end_date as string,
        selected_classrooms: (report.selected_classrooms as string[]) || [],
        selected_assignment_categories: (report.selected_assignment_categories as string[]) || [],
        ai_feedback_enabled: (report.ai_feedback_enabled as boolean) ?? true,
        feedback: report.feedback as string || '',
        ai_feedback_created_by: report.ai_feedback_created_by as string || '',
        ai_feedback_created_at: report.ai_feedback_created_at as string || '',
        ai_feedback_template: report.ai_feedback_template as string || '',
        status: (report.status as "Error" | "Draft" | "Finished" | "Approved" | "Sent" | "Viewed") || 'Draft',
        created_at: report.created_at as string,
        updated_at: report.updated_at as string
      })) || []

      setReports(reportsData)
    } catch (error) {
      console.error('Error fetching reports:', error)
    } finally {
      setLoading(false)
    }
  }, [academyId])

  const fetchAssignmentCategories = useCallback(async () => {
    if (!academyId) return
    try {
      const { data, error } = await supabase
        .from('assignment_categories')
        .select('id, name, subject_id')
        .eq('academy_id', academyId)
        .order('name')
      
      if (error) throw error
      setAssignmentCategories(data || [])
    } catch (error) {
      console.error('Error fetching assignment categories:', error)
    }
  }, [academyId])

  const fetchStudentClassrooms = useCallback(async (studentId: string) => {
    if (!studentId) return
    try {
      const { data, error } = await supabase
        .from('classroom_students')
        .select(`
          classrooms!inner(
            id,
            name,
            subject,
            grade
          )
        `)
        .eq('student_id', studentId)
      
      if (error) throw error
      const classroomsData = data?.map((item: Record<string, unknown>) => ({
        id: (item.classrooms as Record<string, unknown>)?.id as string,
        name: (item.classrooms as Record<string, unknown>)?.name as string,
        subject: (item.classrooms as Record<string, unknown>)?.subject as string,
        grade: (item.classrooms as Record<string, unknown>)?.grade as string
      })) || []
      setStudentClassrooms(classroomsData)
    } catch (error) {
      console.error('Error fetching student classrooms:', error)
      setStudentClassrooms([])
    }
  }, [])

  const fetchSubjects = useCallback(async () => {
    if (!academyId) return
    setLoadingSubjects(true)
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('id, name')
        .eq('academy_id', academyId)
        .order('name')
      
      if (error) throw error
      setSubjects(data || [])
    } catch (error) {
      console.error('Error fetching subjects:', error)
      setSubjects([])
    } finally {
      setLoadingSubjects(false)
    }
  }, [academyId])

  const fetchClassrooms = useCallback(async () => {
    if (!academyId) return
    try {
      const { data, error } = await supabase
        .from('classrooms')
        .select(`
          id, 
          name, 
          subject, 
          grade, 
          subject_id,
          teacher:users!classrooms_teacher_id_fkey(name)
        `)
        .eq('academy_id', academyId)
        .is('deleted_at', null)
        .order('name')
      
      if (error) throw error
      setClassrooms(data || [])
    } catch (error) {
      console.error('Error fetching classrooms:', error)
      setClassrooms([])
    }
  }, [academyId])

  // Generate cumulative chart data for assignment type - always 8 points
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        graded_date: a.updated_at || a.due_date
      }))
      .filter(a => a.score !== null && a.graded_date) // Only assignments with scores or 0 for not submitted
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language])

  // Helper function to format date labels - always show actual dates
  const formatDateLabel = useCallback((date: Date) => {
    // Always show month/day format for consistency
    return date.toLocaleDateString(language === 'korean' ? 'ko-KR' : 'en-US', {
      month: 'short',
      day: 'numeric'
    })
  }, [language])

  // Generate combined chart data for main performance chart - always 16 points
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const generateMainChartData = (assignmentsByType: any, reportStartDate?: string, reportEndDate?: string) => {
    if (!assignmentsByType) return { quiz: [], homework: [], test: [], project: [] }
    
    // Use report date range if provided, otherwise use reasonable defaults
    const startDate = reportStartDate ? new Date(reportStartDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const endDate = reportEndDate ? new Date(reportEndDate) : new Date()
    const timeDiff = endDate.getTime() - startDate.getTime()
    
    // Always generate exactly 16 points
    const pointCount = 16
    const interval = timeDiff / (pointCount - 1)
    
    const types = ['quiz', 'homework', 'test', 'project']
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    selectedClassrooms: string[] = [],
    selectedCategories: string[] = []
  ) => {
    if (!studentId || !startDate || !endDate) return
    
    // Create cache key for this specific report configuration
    const cacheKey = `${studentId}-${startDate}-${endDate}-${selectedClassrooms.sort().join(',')}-${selectedCategories.sort().join(',')}`
    
    // Check if we have cached data for this configuration
    if (reportDataCache[cacheKey]) {
      console.log('Using cached report data for:', cacheKey)
      setReportData(reportDataCache[cacheKey])
      return
    }
    
    setLoadingReportData(true)
    try {
      // Build assignments query with optional filtering and performance optimizations
      let assignmentsQuery = supabase
        .from('assignment_grades')
        .select(`
          id,
          status,
          score,
          updated_at,
          feedback,
          assignments (
            id,
            title,
            due_date,
            assignment_type,
            assignment_categories_id,
            classroom_sessions (
              id,
              date,
              classroom_id,
              classrooms (
                id,
                name,
                subjects (
                  id,
                  name
                )
              )
            )
          )
        `)
        .eq('student_id', studentId)
        .gte('assignments.classroom_sessions.date', startDate)
        .lte('assignments.classroom_sessions.date', endDate)
        .order('updated_at', { ascending: false })
        .limit(1000) // Prevent excessive data loading

      // Add classroom filtering if selected
      if (selectedClassrooms.length > 0) {
        assignmentsQuery = assignmentsQuery.in('assignments.classroom_sessions.classroom_id', selectedClassrooms)
      }

      // Add category filtering if selected
      if (selectedCategories.length > 0) {
        assignmentsQuery = assignmentsQuery.in('assignments.assignment_categories_id', selectedCategories)
      }

      // Execute assignment query with error handling
      const { data: assignmentsData, error: assignmentsError } = await assignmentsQuery
      
      if (assignmentsError && assignmentsError.message) {
        console.error('Error fetching assignments:', assignmentsError)
        // Continue with empty data rather than failing completely
      }

      // Build attendance query with optional classroom filtering and performance optimizations
      let attendanceQuery = supabase
        .from('attendance')
        .select(`
          id,
          status,
          classroom_sessions!inner (
            id,
            date,
            classroom_id
          )
        `)
        .eq('student_id', studentId)
        .gte('classroom_sessions.date', startDate)
        .lte('classroom_sessions.date', endDate)
        .order('id', { ascending: false }) // Order by attendance record ID instead of nested date
        .limit(500) // Limit attendance records for performance

      // Add classroom filtering if selected - use the proper nested syntax
      if (selectedClassrooms.length > 0) {
        attendanceQuery = attendanceQuery.in('classroom_sessions.classroom_id', selectedClassrooms)
      }

      const { data: attendanceData, error: attendanceError } = await attendanceQuery

      if (attendanceError && attendanceError.message) {
        console.error('Error fetching attendance:', attendanceError)
        // Continue with empty data rather than failing completely
      }

      // Process assignments data
      const assignments = assignmentsData || []
      
      // Collect individual grades for AI context
      const individualGrades = assignments.map(assignment => ({
        id: assignment.id,
        title: assignment.assignments?.[0]?.title || 'Unknown Assignment',
        type: assignment.assignments?.[0]?.assignment_type || 'unknown',
        subject: assignment.assignments?.[0]?.classroom_sessions?.[0]?.classrooms?.[0]?.subjects?.[0]?.name || 'Unknown Subject',
        classroom: assignment.assignments?.[0]?.classroom_sessions?.[0]?.classrooms?.[0]?.name || 'Unknown Classroom',
        categoryId: assignment.assignments?.[0]?.assignment_categories_id || '',
        score: assignment.score,
        status: assignment.status,
        dueDate: assignment.assignments?.[0]?.due_date || '',
        completedDate: assignment.updated_at,
        feedback: assignment.feedback || null
      }))

      // Process attendance data
      const attendance = (attendanceData || []).filter(a => a.classroom_sessions)
      const presentSessions = attendance.filter(a => a.status === 'present').length
      const totalSessions = attendance.length
      const attendanceRate = totalSessions > 0 ? (presentSessions / totalSessions) * 100 : 0
      
      // Calculate attendance status breakdown
      const attendanceStatuses = {
        present: attendance.filter(a => a.status === 'present').length,
        absent: attendance.filter(a => a.status === 'absent').length,
        late: attendance.filter(a => a.status === 'late').length,
        excused: attendance.filter(a => a.status === 'excused').length,
        pending: attendance.filter(a => a.status === 'pending').length
      }

      // Process grades data - only include assignments with valid types to match individual type cards
      const validTypes = ['quiz', 'homework', 'test', 'project']
      const typedAssignments = assignments.filter(a => 
        a.assignments?.[0]?.assignment_type && validTypes.includes(a.assignments[0].assignment_type)
      )
      const gradedAssignments = typedAssignments.filter(a => a.score !== null)
      const averageGrade = gradedAssignments.length > 0 
        ? gradedAssignments.reduce((sum, a) => sum + (a.score || 0), 0) / gradedAssignments.length 
        : 0

      // Calculate assignment completion and status breakdown using filtered typed assignments
      const completedAssignments = typedAssignments.filter(a => a.status === 'submitted').length
      const totalAssignments = typedAssignments.length
      const assignmentCompletionRate = totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0
      
      const assignmentStatuses = {
        submitted: typedAssignments.filter(a => a.status === 'submitted').length,
        pending: typedAssignments.filter(a => a.status === 'pending').length,
        overdue: typedAssignments.filter(a => a.status === 'overdue').length,
        'not submitted': typedAssignments.filter(a => a.status === 'not submitted').length,
        excused: typedAssignments.filter(a => a.status === 'excused').length
      }

      // Process assignment categories data - include selected categories, even those with no data
      const assignmentsByCategory: Record<string, any> = {}
      
      // Get selected category IDs, or all if none selected
      const selectedCategoryIds = selectedCategories.length > 0 
        ? selectedCategories 
        : assignmentCategories.map(cat => cat.id)
      
      // Process each selected category (show selected categories, even with no data)
      selectedCategoryIds.forEach((categoryId) => {
        const categoryAssignments = assignments.filter(a => a.assignments?.[0]?.assignment_categories_id === categoryId)
        const categoryGradedAssignments = categoryAssignments.filter(a => a.score !== null)
        const categoryCompletedAssignments = categoryAssignments.filter(a => a.status === 'submitted')
        const categoryAverageGrade = categoryGradedAssignments.length > 0
          ? categoryGradedAssignments.reduce((sum, a) => sum + (a.score || 0), 0) / categoryGradedAssignments.length
          : 0
        const categoryCompletionRate = categoryAssignments.length > 0 
          ? (categoryCompletedAssignments.length / categoryAssignments.length) * 100
          : 0

        // Generate chart data for this category (will be empty if no assignments)
        const chartData = generateChartDataForType(categoryAssignments, startDate, endDate)

        assignmentsByCategory[categoryId] = {
          total: categoryAssignments.length,
          completed: categoryCompletedAssignments.length,
          completionRate: Math.round(categoryCompletionRate),
          averageGrade: Math.round(categoryAverageGrade),
          statuses: {
            submitted: categoryAssignments.filter(a => a.status === 'submitted').length,
            pending: categoryAssignments.filter(a => a.status === 'pending').length,
            overdue: categoryAssignments.filter(a => a.status === 'overdue').length,
            'not submitted': categoryAssignments.filter(a => a.status === 'not submitted').length,
            excused: categoryAssignments.filter(a => a.status === 'excused').length
          },
          chartData
        }
      })
      
      // Process assignment types for main chart
      const assignmentsByType = {
        quiz: {
          total: assignments.filter(a => a.assignments?.[0]?.assignment_type === 'quiz').length,
          completed: assignments.filter(a => a.assignments?.[0]?.assignment_type === 'quiz' && a.status === 'submitted').length,
          completionRate: Math.round(
            assignments.filter(a => a.assignments?.[0]?.assignment_type === 'quiz').length > 0
              ? (assignments.filter(a => a.assignments?.[0]?.assignment_type === 'quiz' && a.status === 'submitted').length /
                 assignments.filter(a => a.assignments?.[0]?.assignment_type === 'quiz').length) * 100
              : 0
          ),
          averageGrade: Math.round(
            assignments.filter(a => a.assignments?.[0]?.assignment_type === 'quiz' && a.score !== null).length > 0
              ? assignments.filter(a => a.assignments?.[0]?.assignment_type === 'quiz' && a.score !== null)
                  .reduce((sum, a) => sum + (a.score || 0), 0) /
                assignments.filter(a => a.assignments?.[0]?.assignment_type === 'quiz' && a.score !== null).length
              : 0
          ),
          chartData: generateChartDataForType(assignments.filter(a => a.assignments?.[0]?.assignment_type === 'quiz'), startDate, endDate),
          statuses: {
            submitted: assignments.filter(a => a.assignments?.[0]?.assignment_type === 'quiz' && a.status === 'submitted').length,
            pending: assignments.filter(a => a.assignments?.[0]?.assignment_type === 'quiz' && a.status === 'pending').length,
            overdue: assignments.filter(a => a.assignments?.[0]?.assignment_type === 'quiz' && a.status === 'overdue').length,
            'not submitted': assignments.filter(a => a.assignments?.[0]?.assignment_type === 'quiz' && a.status === 'not submitted').length,
            excused: assignments.filter(a => a.assignments?.[0]?.assignment_type === 'quiz' && a.status === 'excused').length
          }
        },
        homework: {
          total: assignments.filter(a => a.assignments?.[0]?.assignment_type === 'homework').length,
          completed: assignments.filter(a => a.assignments?.[0]?.assignment_type === 'homework' && a.status === 'submitted').length,
          completionRate: Math.round(
            assignments.filter(a => a.assignments?.[0]?.assignment_type === 'homework').length > 0
              ? (assignments.filter(a => a.assignments?.[0]?.assignment_type === 'homework' && a.status === 'submitted').length /
                 assignments.filter(a => a.assignments?.[0]?.assignment_type === 'homework').length) * 100
              : 0
          ),
          averageGrade: Math.round(
            assignments.filter(a => a.assignments?.[0]?.assignment_type === 'homework' && a.score !== null).length > 0
              ? assignments.filter(a => a.assignments?.[0]?.assignment_type === 'homework' && a.score !== null)
                  .reduce((sum, a) => sum + (a.score || 0), 0) /
                assignments.filter(a => a.assignments?.[0]?.assignment_type === 'homework' && a.score !== null).length
              : 0
          ),
          chartData: generateChartDataForType(assignments.filter(a => a.assignments?.[0]?.assignment_type === 'homework'), startDate, endDate),
          statuses: {
            submitted: assignments.filter(a => a.assignments?.[0]?.assignment_type === 'homework' && a.status === 'submitted').length,
            pending: assignments.filter(a => a.assignments?.[0]?.assignment_type === 'homework' && a.status === 'pending').length,
            overdue: assignments.filter(a => a.assignments?.[0]?.assignment_type === 'homework' && a.status === 'overdue').length,
            'not submitted': assignments.filter(a => a.assignments?.[0]?.assignment_type === 'homework' && a.status === 'not submitted').length,
            excused: assignments.filter(a => a.assignments?.[0]?.assignment_type === 'homework' && a.status === 'excused').length
          }
        },
        test: {
          total: assignments.filter(a => a.assignments?.[0]?.assignment_type === 'test').length,
          completed: assignments.filter(a => a.assignments?.[0]?.assignment_type === 'test' && a.status === 'submitted').length,
          completionRate: Math.round(
            assignments.filter(a => a.assignments?.[0]?.assignment_type === 'test').length > 0
              ? (assignments.filter(a => a.assignments?.[0]?.assignment_type === 'test' && a.status === 'submitted').length /
                 assignments.filter(a => a.assignments?.[0]?.assignment_type === 'test').length) * 100
              : 0
          ),
          averageGrade: Math.round(
            assignments.filter(a => a.assignments?.[0]?.assignment_type === 'test' && a.score !== null).length > 0
              ? assignments.filter(a => a.assignments?.[0]?.assignment_type === 'test' && a.score !== null)
                  .reduce((sum, a) => sum + (a.score || 0), 0) /
                assignments.filter(a => a.assignments?.[0]?.assignment_type === 'test' && a.score !== null).length
              : 0
          ),
          chartData: generateChartDataForType(assignments.filter(a => a.assignments?.[0]?.assignment_type === 'test'), startDate, endDate),
          statuses: {
            submitted: assignments.filter(a => a.assignments?.[0]?.assignment_type === 'test' && a.status === 'submitted').length,
            pending: assignments.filter(a => a.assignments?.[0]?.assignment_type === 'test' && a.status === 'pending').length,
            overdue: assignments.filter(a => a.assignments?.[0]?.assignment_type === 'test' && a.status === 'overdue').length,
            'not submitted': assignments.filter(a => a.assignments?.[0]?.assignment_type === 'test' && a.status === 'not submitted').length,
            excused: assignments.filter(a => a.assignments?.[0]?.assignment_type === 'test' && a.status === 'excused').length
          }
        },
        project: {
          total: assignments.filter(a => a.assignments?.[0]?.assignment_type === 'project').length,
          completed: assignments.filter(a => a.assignments?.[0]?.assignment_type === 'project' && a.status === 'submitted').length,
          completionRate: Math.round(
            assignments.filter(a => a.assignments?.[0]?.assignment_type === 'project').length > 0
              ? (assignments.filter(a => a.assignments?.[0]?.assignment_type === 'project' && a.status === 'submitted').length /
                 assignments.filter(a => a.assignments?.[0]?.assignment_type === 'project').length) * 100
              : 0
          ),
          averageGrade: Math.round(
            assignments.filter(a => a.assignments?.[0]?.assignment_type === 'project' && a.score !== null).length > 0
              ? assignments.filter(a => a.assignments?.[0]?.assignment_type === 'project' && a.score !== null)
                  .reduce((sum, a) => sum + (a.score || 0), 0) /
                assignments.filter(a => a.assignments?.[0]?.assignment_type === 'project' && a.score !== null).length
              : 0
          ),
          chartData: generateChartDataForType(assignments.filter(a => a.assignments?.[0]?.assignment_type === 'project'), startDate, endDate),
          statuses: {
            submitted: assignments.filter(a => a.assignments?.[0]?.assignment_type === 'project' && a.status === 'submitted').length,
            pending: assignments.filter(a => a.assignments?.[0]?.assignment_type === 'project' && a.status === 'pending').length,
            overdue: assignments.filter(a => a.assignments?.[0]?.assignment_type === 'project' && a.status === 'overdue').length,
            'not submitted': assignments.filter(a => a.assignments?.[0]?.assignment_type === 'project' && a.status === 'not submitted').length,
            excused: assignments.filter(a => a.assignments?.[0]?.assignment_type === 'project' && a.status === 'excused').length
          }
        }
      }

      // Get category names for display
      const categoryNames: Record<string, string> = {}
      for (const categoryId of Object.keys(assignmentsByCategory)) {
        const category = assignmentCategories.find(c => c.id === categoryId)
        categoryNames[categoryId] = category?.name || 'Unknown Category'
      }

      // Calculate classroom percentiles for selected classrooms
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const classroomPercentiles: Record<string, any> = {}
      const selectedClassroomIds = selectedClassrooms.length > 0 ? selectedClassrooms : []
      
      // Ensure dates are Date objects
      
      // Fetch real classroom percentile data
      if (selectedClassroomIds.length > 0 && studentId) {
        console.log('Fetching real classroom percentile data for:', selectedClassroomIds)
        
        for (const classroomId of selectedClassroomIds) {
          const classroom = classrooms.find(c => c.id === classroomId)
          
          if (classroom) {
            try {
              // Get all students in this classroom
              const { data: classroomStudents, error: studentsError } = await supabase
                .from('classroom_students')
                .select('student_id')
                .eq('classroom_id', classroomId)
              
              if (studentsError) {
                console.error(`Error fetching students for classroom ${classroomId}:`, studentsError)
                continue
              }

              if (!classroomStudents || classroomStudents.length === 0) {
                console.log(`No students found in classroom ${classroom.name}`)
                continue
              }

              console.log(`Found ${classroomStudents.length} students in ${classroom.name}`)
              
              // Get assignment grades for all students in this classroom within date range
              const studentIds = classroomStudents.map(cs => cs.student_id)
              
              const { data: allGrades, error: gradesError } = await supabase
                .from('assignment_grades')
                .select(`
                  student_id,
                  score,
                  assignments!inner(
                    classroom_sessions!inner(
                      classroom_id,
                      date
                    )
                  )
                `)
                .in('student_id', studentIds)
                .gte('assignments.classroom_sessions.date', startDate)
                .lte('assignments.classroom_sessions.date', endDate)
                .eq('assignments.classroom_sessions.classroom_id', classroomId)
                .not('score', 'is', null)
              
              if (gradesError) {
                console.error(`Error fetching grades for classroom ${classroomId}:`, gradesError)
                continue
              }

              if (!allGrades || allGrades.length === 0) {
                console.log(`No grades found for classroom ${classroom.name} in date range`)
                continue
              }

              console.log(`Found ${allGrades.length} grades for ${classroom.name}`)
              
              // Calculate average score for each student
              const studentAverages: Record<string, number[]> = {}
              allGrades.forEach(grade => {
                if (!studentAverages[grade.student_id]) {
                  studentAverages[grade.student_id] = []
                }
                studentAverages[grade.student_id].push(Number(grade.score))
              })

              // Calculate final averages
              const finalAverages = Object.entries(studentAverages).map(([studentId, scores]) => ({
                studentId,
                average: scores.reduce((sum, score) => sum + score, 0) / scores.length
              }))

              if (finalAverages.length === 0) {
                console.log(`No student averages calculated for ${classroom.name}`)
                continue
              }

              // Get the current student's average
              const currentStudentAverage = finalAverages.find(sa => sa.studentId === studentId)
              if (!currentStudentAverage) {
                console.log(`Current student not found in ${classroom.name}`)
                continue
              }

              // Calculate classroom average (average of all student averages)
              const classroomAverage = finalAverages.reduce((sum, sa) => sum + sa.average, 0) / finalAverages.length

              // Sort students by average (ascending) to calculate percentile
              // Calculate percentile using the standard formula
              // Count how many students have scores lower than the current student
              const studentsWithLowerScores = finalAverages.filter(sa => sa.average < currentStudentAverage.average).length
              
              // Handle the edge case where all students have the same score
              const studentsWithSameScore = finalAverages.filter(sa => sa.average === currentStudentAverage.average).length
              
              // Use the midpoint of students with the same score for percentile calculation
              let percentile
              if (finalAverages.length === 1) {
                // Single student case
                percentile = 50
              } else {
                // Standard percentile calculation: (number of students below + 0.5 * students with same score) / total * 100
                percentile = Math.round(((studentsWithLowerScores + (studentsWithSameScore / 2)) / finalAverages.length) * 100)
              }
              
              // Calculate rank for display purposes (1 = best, n = worst)
              const studentRank = studentsWithLowerScores + 1

              classroomPercentiles[classroomId] = {
                classroomName: classroom.name || 'Unknown Classroom',
                classroomAverage: Math.round(classroomAverage),
                percentile: percentile || 0, // Ensure we have a valid percentile value
                totalStudents: finalAverages.length,
                studentRank: studentRank
              }
              
              console.log(`Real data for ${classroom.name}:`)
              console.log(`- Total students: ${finalAverages.length}`)
              console.log(`- Students with lower scores: ${studentsWithLowerScores}`)
              console.log(`- Students with same score: ${studentsWithSameScore}`)
              console.log(`- Student rank: ${studentRank}/${finalAverages.length}`)
              console.log(`- Percentile: ${percentile}%`)
              console.log(`- Student avg: ${Math.round(currentStudentAverage.average)}%, Class avg: ${Math.round(classroomAverage)}%`)
              console.log(`- All student averages:`, finalAverages.map(sa => Math.round(sa.average)).sort((a, b) => b - a))
            } catch (error) {
              console.error(`Error calculating percentile for classroom ${classroomId}:`, error)
            }
          }
        }
      }
      
      const reportDataResult = {
        assignments: {
          completed: completedAssignments,
          total: totalAssignments,
          completionRate: Math.round(assignmentCompletionRate),
          statuses: assignmentStatuses
        },
        attendance: {
          present: presentSessions,
          total: totalSessions,
          attendanceRate: Math.round(attendanceRate),
          statuses: attendanceStatuses
        },
        grades: {
          average: Math.round(averageGrade),
          total: gradedAssignments.length
        },
        assignmentsByType,
        assignmentsByCategory,
        categoryNames,
        classroomPercentiles,
        individualGrades  // Add individual grades for AI context
      }
      
      // Set the report data
      setReportData(reportDataResult)
      
      // Cache the result for future use
      setReportDataCache(prev => ({
        ...prev,
        [cacheKey]: reportDataResult
      }))
      
      console.log('Cached report data for:', cacheKey)
    } catch (error) {
      console.error('Error fetching report data:', error)
    } finally {
      setLoadingReportData(false)
    }
  }, [assignmentCategories, reportDataCache, classrooms, generateChartDataForType])

  // Load report data when preview modal opens
  useEffect(() => {
    if (showPreviewModal && formData.student_id && formData.start_date && formData.end_date) {
      fetchReportData(
        formData.student_id, 
        formData.start_date, 
        formData.end_date,
        formData.selected_classrooms,
        formData.selected_assignment_categories
      )
    }
  }, [showPreviewModal, formData.student_id, formData.start_date, formData.end_date, formData.selected_classrooms, formData.selected_assignment_categories, fetchReportData])

  // Removed conflicting useEffect - editableFeedback is now managed entirely by openPreviewModal

  // Unified function to open preview modal consistently
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const openPreviewModal = useCallback((reportData: any = null) => {
    
    if (reportData) {
      // Opening preview for existing report (from triple dot menu)
      setCurrentReportId(reportData.id)
      setFormData({
        student_id: reportData.student_id,
        report_name: reportData.report_name || '',
        start_date: reportData.start_date || '',
        end_date: reportData.end_date || '',
        selected_subjects: reportData.selected_subjects || [],
        selected_classrooms: reportData.selected_classrooms || [],
        selected_assignment_categories: reportData.selected_assignment_categories || [],
        ai_feedback_enabled: reportData.ai_feedback_enabled ?? false,
        feedback: reportData.feedback ?? '',
        status: reportData.status || 'Draft'
      })

      // Set feedback data
      setEditableFeedback(reportData.feedback ?? '')

      // Set AI feedback metadata
      if (reportData.ai_feedback_created_by) {
        if (userId === reportData.ai_feedback_created_by) {
          setAiFeedbackCreatedBy(userName || 'You')
        } else {
          setAiFeedbackCreatedBy('User')
        }
      } else {
        setAiFeedbackCreatedBy('')
      }
      
      setAiFeedbackCreatedAt(reportData.ai_feedback_created_at || '')
      setAiFeedbackTemplate(reportData.ai_feedback_template || '')
    } else {
      // Opening preview for current form data (from create/edit popup)
      setCurrentReportId(null)
      // Ensure editableFeedback matches formData.feedback
      setEditableFeedback(formData.feedback ?? '')
      
      // For existing reports (from edit modal), we need to ensure AI metadata is correct
      // Handle AI metadata based on feedback type
      if (formData.ai_feedback_enabled && formData.feedback) {
        // This report has AI feedback - metadata should already be set
        // Don't override the metadata that was set when edit modal opened
      } else if (!formData.ai_feedback_enabled && formData.feedback) {
        // This report has manual feedback - ensure no AI metadata
        setAiFeedbackCreatedBy('')
        setAiFeedbackCreatedAt('')
        setAiFeedbackTemplate('')
      } else {
        // Clear AI metadata for new reports or reports without feedback
        setAiFeedbackCreatedBy('')
        setAiFeedbackCreatedAt('')
        setAiFeedbackTemplate('')
      }
    }
    
    // Reset editing states
    setIsEditingFeedback(false)
    setFeedbackHasChanges(false)
    
    // Open modal
    setShowPreviewModal(true)
  }, [formData, userId, userName])

  // Feedback editing functions
  const handleFeedbackChange = useCallback((value: string) => {
    setEditableFeedback(value)
    setFeedbackHasChanges(value !== (formData.feedback || ''))
  }, [formData.feedback])

  const handleSaveFeedback = useCallback(async () => {
    try {
      // Prevent effects from interfering during save
        
      // Reset editing states
      setIsEditingFeedback(false)
      setFeedbackHasChanges(false)
      
      // Save to database
      if (currentReportId) {
        // Update existing report using currentReportId
        const { error: updateError } = await supabase
          .from('student_reports')
          .update({
            feedback: editableFeedback,
            ai_feedback_enabled: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentReportId)
        
        if (updateError) throw updateError
        
        // Update local state after successful database save
        setFormData(prev => ({ 
          ...prev, 
          feedback: editableFeedback, 
          ai_feedback_enabled: false 
        }))
        
        // Update the reports list locally without full refetch
        setReports(prev => prev.map(report =>
          report.id === currentReportId
            ? { ...report, feedback: editableFeedback, ai_feedback_enabled: false }
            : report
        ))
      } else {
        // For new reports, just update local state (will be saved when creating the report)
        setFormData(prev => ({ 
          ...prev, 
          feedback: editableFeedback, 
          ai_feedback_enabled: false 
        }))
      }
      
      // Re-enable effects after save is complete
        
      // Show success feedback to user
      // You can replace this with a toast notification system
      const successMessage = document.createElement('div')
      successMessage.className = 'fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50'
      successMessage.textContent = t('reports.feedbackSavedSuccessfully')
      document.body.appendChild(successMessage)
      
      setTimeout(() => {
        document.body.removeChild(successMessage)
      }, 3000)
      
      console.log('Feedback saved successfully:', editableFeedback)
    } catch (error) {
      console.error('Error saving feedback:', error)
      
      // Re-enable effects even on error
        
      // Revert states on error
      setIsEditingFeedback(true)
      setFeedbackHasChanges(true)
      
      // Show error message to user
      const errorMessage = document.createElement('div')
      errorMessage.className = 'fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50'
      errorMessage.textContent = t('reports.feedbackSaveError')
      document.body.appendChild(errorMessage)
      
      setTimeout(() => {
        if (document.body.contains(errorMessage)) {
          document.body.removeChild(errorMessage)
        }
      }, 3000)
    }
  }, [editableFeedback, t, currentReportId])

  const handleGenerateAiFeedback = useCallback(async () => {
    try {
      setIsGeneratingAi(true)
      setShowAiConfirmModal(false)
      
      // Get selected student info
      const selectedStudent = students.find(s => s.user_id === formData.student_id)
      
      // Prepare enhanced form data with student information
      const enhancedFormData = {
        ...formData,
        student_name: selectedStudent?.name || 'Student',
        student_email: selectedStudent?.email || '',
        student_school: selectedStudent?.school_name || ''
      }

      // Prepare enhanced report data with additional context
      const enhancedReportData = {
        ...reportData,
        // Add subject information
        subjects: subjects.filter(s => formData.selected_subjects?.includes(s.id)).map(subject => ({
          id: subject.id,
          name: subject.name
        })),
        // Add classroom information
        classrooms: classrooms.filter(c => formData.selected_classrooms?.includes(c.id)).map(classroom => ({
          id: classroom.id,
          name: classroom.name,
          subject: subjects.find(s => s.id === classroom.subject_id)?.name || 'Unknown Subject'
        })),
        // Add assignment category information
        categories: assignmentCategories.filter(c => formData.selected_assignment_categories?.includes(c.id)).map(category => ({
          id: category.id,
          name: category.name
        })),
        // Add metadata about data completeness
        dataContext: {
          hasGradeData: (reportData?.grades?.total || 0) > 0,
          hasAssignmentData: (reportData?.assignments?.total || 0) > 0,
          hasAttendanceData: (reportData?.attendance?.total || 0) > 0,
          selectedSubjectCount: formData.selected_subjects?.length || 0,
          selectedClassroomCount: formData.selected_classrooms?.length || 0,
          selectedCategoryCount: formData.selected_assignment_categories?.length || 0
        }
      }

      // Call the API to generate AI feedback with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
      
      const response = await fetch('/api/reports/generate-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportData: enhancedReportData,
          formData: enhancedFormData,
          template: selectedTemplate,
          language: selectedLanguage,
          requestedBy: userName || 'Unknown User'
        }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate AI feedback')
      }
      
      // Set AI feedback as enabled and update the feedback
      setFormData(prev => ({ ...prev, ai_feedback_enabled: true, feedback: result.feedback }))
      setEditableFeedback(result.feedback)
      setIsEditingFeedback(false)
      setFeedbackHasChanges(true)
      
      // Set AI feedback metadata
      setAiFeedbackCreatedBy(userName || 'Unknown User')
      setAiFeedbackCreatedAt(new Date().toISOString())
      
      // Save AI feedback to database immediately if this is an existing report
      // Check if we have a valid UUID (existing report) vs undefined/empty (new report)
      const isExistingReport = currentReportId && currentReportId.length === 36 && currentReportId.includes('-')

      if (isExistingReport) {
        try {
          console.log('Saving AI feedback to existing report:', currentReportId)
          const { error: saveError } = await supabase
            .from('student_reports')
            .update({
              feedback: result.feedback,
              ai_feedback_enabled: true,
              ai_feedback_created_by: userId,
              ai_feedback_created_at: new Date().toISOString(),
              ai_feedback_template: selectedTemplate,
              updated_at: new Date().toISOString()
            })
            .eq('id', currentReportId)
          
          if (saveError) {
            console.error('Failed to save AI feedback to database:', saveError)
            // Show error to user but don't break the flow
            const errorMessage = document.createElement('div')
            errorMessage.className = 'fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50'
            errorMessage.textContent = 'AI feedback generated but failed to save to database'
            document.body.appendChild(errorMessage)
            setTimeout(() => {
              if (document.body.contains(errorMessage)) {
                document.body.removeChild(errorMessage)
              }
            }, 5000)
          } else {
            console.log('AI feedback saved successfully to database')
          }
        } catch (dbError) {
          console.error('Database save error:', dbError)
        }
      } else {
        console.log('New report - AI feedback will be saved when user clicks "Create Report"')
      }
      
      // Show success message
      const successMessage = document.createElement('div')
      successMessage.className = 'fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50'
      successMessage.textContent = t('reports.aiGeneratedSuccessfully')
      document.body.appendChild(successMessage)
      
      setTimeout(() => {
        if (document.body.contains(successMessage)) {
          document.body.removeChild(successMessage)
        }
      }, 3000)
      
    } catch (error) {
      console.error('Error generating AI feedback:', error)
      
      // Handle different error types
      let errorText = t('reports.aiGenerationError')
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorText = 'Request timed out after 30 seconds. Please try again.'
        } else {
          errorText = error.message
        }
      }
      
      // Show error message
      const errorMessage = document.createElement('div')
      errorMessage.className = 'fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50 max-w-md'
      errorMessage.textContent = errorText
      document.body.appendChild(errorMessage)
      
      setTimeout(() => {
        if (document.body.contains(errorMessage)) {
          document.body.removeChild(errorMessage)
        }
      }, 5000)
    } finally {
      setIsGeneratingAi(false)
    }
  }, [selectedTemplate, selectedLanguage, formData, reportData, t, assignmentCategories, classrooms, students, subjects, userId, userName, currentReportId])

  const handleCancelEditingFeedback = useCallback(() => {
    if (feedbackHasChanges) {
      const confirmed = window.confirm(t('reports.unsavedChangesWarning'))
      if (!confirmed) return
    }
    setEditableFeedback(formData.feedback || '')
    setIsEditingFeedback(false)
    setFeedbackHasChanges(false)
  }, [formData.feedback, feedbackHasChanges, t])

  const handleClosePreviewModal = useCallback(() => {
    if (isEditingFeedback && feedbackHasChanges) {
      const confirmed = window.confirm(t('reports.unsavedChangesWarning'))
      if (!confirmed) return
    }
    
    // Only reset editing state, don't clear form data
    setIsEditingFeedback(false)
    setFeedbackHasChanges(false)
    setShowPreviewModal(false)
    
    // Clear AI feedback metadata only if this was a temporary preview
    // Don't clear if it's from an existing report
    if (!currentReportId) {
      setAiFeedbackCreatedBy('')
      setAiFeedbackCreatedAt('')
      setAiFeedbackTemplate('')
    }
  }, [isEditingFeedback, feedbackHasChanges, currentReportId, t])

  const resetForm = () => {
    setFormData({
      student_id: '',
      report_name: '',
      start_date: '',
      end_date: '',
      selected_subjects: [],
      selected_classrooms: [],
      selected_assignment_categories: [],
      ai_feedback_enabled: true,
      feedback: '',
      status: 'Draft' as 'Draft' | 'Finished' | 'Approved' | 'Sent' | 'Viewed' | 'Error'
    })
    setCurrentReportId(null)
    setFormErrors({})
    setStudentClassrooms([])
    setStudentSearchQuery('')
    setActiveDatePicker(null)
  }

  const validateForm = () => {
    const errors: { [key: string]: string } = {}
    
    if (!formData.student_id) {
      errors.student_id = t('reports.pleaseSelectStudent')
    }
    if (!formData.report_name.trim()) {
      errors.report_name = t('reports.reportTitleRequired')
    }
    if (!formData.start_date) {
      errors.start_date = t('reports.startDateRequired')
    }
    if (!formData.end_date) {
      errors.end_date = t('reports.endDateRequired')
    }
    if (formData.start_date && formData.end_date && new Date(formData.start_date) >= new Date(formData.end_date)) {
      errors.end_date = t('reports.endDateMustBeAfterStartDate')
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleCreateReport = async () => {
    if (!validateForm()) return
    
    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('student_reports')
        .insert({
          student_id: formData.student_id,
          report_name: formData.report_name,
          start_date: formData.start_date,
          end_date: formData.end_date,
          selected_subjects: formData.selected_subjects,
          selected_classrooms: formData.selected_classrooms,
          selected_assignment_categories: formData.selected_assignment_categories,
          ai_feedback_enabled: formData.ai_feedback_enabled,
          feedback: formData.feedback || '',
          ai_feedback_created_by: formData.feedback && formData.ai_feedback_enabled ? userId : null,
          ai_feedback_created_at: formData.feedback && formData.ai_feedback_enabled ? new Date().toISOString() : null,
          ai_feedback_template: formData.feedback && formData.ai_feedback_enabled ? selectedTemplate : null,
          status: formData.status
        })
      
      if (error) throw error
      
      await fetchReports()
      setShowAddReportModal(false)
      resetForm()
    } catch (error) {
      console.error('Error creating report:', error)
      setFormErrors({ submit: t('reports.failedToCreateReport') })
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateAndFinishReport = async () => {
    if (!validateForm()) return
    
    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('student_reports')
        .insert({
          student_id: formData.student_id,
          report_name: formData.report_name,
          start_date: formData.start_date,
          end_date: formData.end_date,
          selected_subjects: formData.selected_subjects,
          selected_classrooms: formData.selected_classrooms,
          selected_assignment_categories: formData.selected_assignment_categories,
          ai_feedback_enabled: formData.ai_feedback_enabled,
          feedback: formData.feedback || '',
          ai_feedback_created_by: formData.feedback && formData.ai_feedback_enabled ? userId : null,
          ai_feedback_created_at: formData.feedback && formData.ai_feedback_enabled ? new Date().toISOString() : null,
          ai_feedback_template: formData.feedback && formData.ai_feedback_enabled ? selectedTemplate : null,
          status: 'Finished' // Always set to Finished for this action
        })
      
      if (error) throw error
      
      await fetchReports()
      setShowAddReportModal(false)
      resetForm()
    } catch (error) {
      console.error('Error creating report:', error)
      setFormErrors({ submit: t('reports.failedToCreateReport') })
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    if (academyId) {
      fetchReports()
      fetchStudents()
      fetchAssignmentCategories()
      fetchSubjects()
      fetchClassrooms()
    }
  }, [academyId, fetchReports, fetchStudents, fetchAssignmentCategories, fetchSubjects, fetchClassrooms])

  // Handle clicking outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownOpen) {
        const target = event.target as Node
        // Don't close if clicking inside a dropdown
        if (target && (target as Element).closest('.dropdown-menu')) {
          return
        }
        
        // Don't close if clicking on the dropdown button itself
        const clickedButton = Object.values(dropdownButtonRefs.current).some(
          ref => ref && ref.contains(target)
        )
        if (clickedButton) {
          return
        }
        
        setDropdownOpen(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dropdownOpen])

  // Handle clicking outside status filter to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusFilterRef.current && !statusFilterRef.current.contains(event.target as Node)) {
        setShowStatusFilter(false)
      }
    }

    if (showStatusFilter) {
      document.addEventListener('mousedown', handleClickOutside)
    } else {
      document.removeEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showStatusFilter])

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRows([])
      setSelectAll(false)
    } else {
      const allRowIds = filteredReports.map(report => report.id)
      setSelectedRows(allRowIds)
      setSelectAll(true)
    }
  }

  const handleRowSelect = (reportId: string) => {
    setSelectedRows(prev => {
      if (prev.includes(reportId)) {
        const newSelected = prev.filter(id => id !== reportId)
        if (newSelected.length === 0) {
          setSelectAll(false)
        }
        return newSelected
      } else {
        const newSelected = [...prev, reportId]
        if (newSelected.length === filteredReports.length) {
          setSelectAll(true)
        }
        return newSelected
      }
    })
  }

  const handleDeleteClick = (report: ReportData) => {
    setReportToDelete(report)
    setShowDeleteModal(true)
    setDropdownOpen(null) // Close the dropdown
  }

  const handleDeleteConfirm = async () => {
    if (!reportToDelete) return
    
    try {
      const { error } = await supabase
        .from('student_reports')
        .delete()
        .eq('id', reportToDelete.id)

      if (error) throw error

      // Remove from local state
      setReports(prev => prev.filter(r => r.id !== reportToDelete.id))
      
      setShowDeleteModal(false)
      setReportToDelete(null)
      
      alert(t('reports.reportDeletedSuccessfully'))
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert(t('reports.errorDeletingReport') + ': ' + errorMessage)
    }
  }

  const renderSortIcon = (field: string) => {
    const isActiveField = sortField === field
    const isAscending = isActiveField && sortDirection === 'asc'
    const isDescending = isActiveField && sortDirection === 'desc'
    
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M8 9l4-4 4 4" 
          stroke={isAscending ? '#2885e8' : 'currentColor'}
          className={isAscending ? '' : 'text-gray-400'}
        />
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M8 15l4 4 4-4" 
          stroke={isDescending ? '#2885e8' : 'currentColor'}
          className={isDescending ? '' : 'text-gray-400'}
        />
      </svg>
    )
  }

  const formatDate = useMemo(() => {
    return (dateString: string) => {
      const date = new Date(dateString)
      
      // If translations are still loading, return a fallback
      if (translationLoading) {
        return date.toLocaleDateString()
      }
      
      if (language === 'korean') {
        const year = date.getFullYear()
        const month = date.getMonth() + 1
        const day = date.getDate()
        
        return `${year}년 ${month}월 ${day}일`
      } else {
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      }
    }
  }, [language, translationLoading])

  // Optimize filtered reports calculation with memoization
  const filteredReports = useMemo(() => {
    return reports
      .filter(report => {
        let matchesSearch = true
        if (searchQuery) {
          matchesSearch = !!(
            report.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            report.student_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            report.student_school?.toLowerCase().includes(searchQuery.toLowerCase())
          )
        }
        
        let matchesStatus = true
        if (statusFilter !== 'all') {
          matchesStatus = report.status === statusFilter
        }
        
        return matchesSearch && matchesStatus
      })
      .sort((a, b) => {
        if (!sortField) return 0
        
        let aValue = ''
        let bValue = ''
        
        switch (sortField) {
          case 'report_name':
            aValue = a.report_name || 'Untitled Report'
            bValue = b.report_name || 'Untitled Report'
            break
          case 'student':
            aValue = a.student_name || ''
            bValue = b.student_name || ''
            break
          case 'school':
            aValue = a.student_school || ''
            bValue = b.student_school || ''
            break
          case 'created_date':
            return sortDirection === 'asc'
              ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          case 'updated_date':
            return sortDirection === 'asc'
              ? new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
              : new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          default:
            return 0
        }
        
        const result = aValue.toLowerCase().localeCompare(bValue.toLowerCase())
        return sortDirection === 'asc' ? result : -result
      })
  }, [reports, searchQuery, statusFilter, sortField, sortDirection])

  const TableSkeleton = () => (
    <div className="animate-pulse">
      <div className="overflow-x-auto min-h-[640px] flex flex-col">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left p-4">
                <div className="h-4 bg-gray-300 rounded w-4"></div>
              </th>
              <th className="text-left p-4">
                <div className="h-4 bg-gray-300 rounded w-24"></div>
              </th>
              <th className="text-left p-4">
                <div className="h-4 bg-gray-300 rounded w-20"></div>
              </th>
              <th className="text-left p-4">
                <div className="h-4 bg-gray-300 rounded w-16"></div>
              </th>
              <th className="text-left p-4">
                <div className="h-4 bg-gray-300 rounded w-20"></div>
              </th>
              <th className="text-left p-4">
                <div className="h-4 bg-gray-300 rounded w-20"></div>
              </th>
              <th className="text-left p-4">
                <div className="h-4 bg-gray-300 rounded w-16"></div>
              </th>
              <th className="text-left p-4">
                <div className="h-4 bg-gray-300 rounded w-8"></div>
              </th>
            </tr>
          </thead>
          <tbody>
            {[...Array(8)].map((_, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="p-4">
                  <div className="h-4 bg-gray-200 rounded w-4"></div>
                </td>
                <td className="p-4">
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                  </div>
                </td>
                <td className="p-4">
                  <div className="space-y-1">
                    <div className="h-4 bg-gray-200 rounded w-28"></div>
                    <div className="h-3 bg-gray-200 rounded w-36"></div>
                  </div>
                </td>
                <td className="p-4">
                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                </td>
                <td className="p-4">
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                </td>
                <td className="p-4">
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                </td>
                <td className="p-4">
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                </td>
                <td className="p-4">
                  <div className="h-4 bg-gray-200 rounded w-4"></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  if (loading || translationLoading) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t("reports.title")}</h1>
            <p className="text-gray-500">{t('reports.description')}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
{t('reports.addReport')}
            </Button>
          </div>
        </div>
        
        <div className="relative mb-4 max-w-md animate-pulse">
          <div className="h-12 bg-gray-200 rounded-lg"></div>
        </div>
        
        <Card className="overflow-hidden">
          <TableSkeleton />
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("reports.title")}</h1>
          <p className="text-gray-500">{t('reports.description')}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => {
              resetForm()
              // Clear any AI feedback metadata from previous reports
              setAiFeedbackCreatedBy('')
              setAiFeedbackCreatedAt('')
              setAiFeedbackTemplate('')
              setEditableFeedback('')
              setShowAddReportModal(true)
            }}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
{t('reports.addReport')}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-8">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <Input
            type="text"
            placeholder={t('reports.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-12 pl-12 rounded-lg border border-border bg-white focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 text-sm shadow-sm"
          />
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto min-h-[640px] flex flex-col">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left p-4 font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300" 
                      checked={selectAll}
                      onChange={handleSelectAll}
                    />
                  </div>
                </th>
                <th className="text-left p-4 font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    {t('reports.reportName')}
                    <button onClick={() => handleSort('report_name')} className="text-gray-400 hover:text-primary">
                      {renderSortIcon('report_name')}
                    </button>
                  </div>
                </th>
                <th className="text-left p-4 font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    {t('reports.student')}
                    <button onClick={() => handleSort('student')} className="text-gray-400 hover:text-primary">
                      {renderSortIcon('student')}
                    </button>
                  </div>
                </th>
                <th className="text-left p-4 font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    {t('reports.school')}
                    <button onClick={() => handleSort('school')} className="text-gray-400 hover:text-primary">
                      {renderSortIcon('school')}
                    </button>
                  </div>
                </th>
                <th className="text-left p-4 font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    {t('reports.createdDate')}
                    <button onClick={() => handleSort('created_date')} className="text-gray-400 hover:text-primary">
                      {renderSortIcon('created_date')}
                    </button>
                  </div>
                </th>
                <th className="text-left p-4 font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    {t('reports.updatedDate')}
                    <button onClick={() => handleSort('updated_date')} className="text-gray-400 hover:text-primary">
                      {renderSortIcon('updated_date')}
                    </button>
                  </div>
                </th>
                <th className="text-left p-4 font-medium text-gray-900">
                  <div className="flex items-center gap-2 relative">
                    {t('common.status')}
                    <div className="relative z-20" ref={statusFilterRef}>
                      <button
                        onClick={() => setShowStatusFilter(!showStatusFilter)}
                        className={`flex items-center ${
                          statusFilter !== 'all' 
                            ? 'text-primary' 
                            : 'text-gray-400 hover:text-primary'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                      </button>
                      {showStatusFilter && (
                        <div className="absolute top-full right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg py-1 min-w-[120px] z-50">
                          <button
                            onClick={() => {
                              setStatusFilter('all')
                              setShowStatusFilter(false)
                            }}
                            className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${statusFilter === 'all' ? 'bg-primary/10 text-primary' : 'text-gray-700'}`}
                          >
                            {t('reports.all')}
                          </button>
                          <button
                            onClick={() => {
                              setStatusFilter('Draft')
                              setShowStatusFilter(false)
                            }}
                            className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${statusFilter === 'Draft' ? 'bg-primary/10 text-primary' : 'text-gray-700'}`}
                          >
                            {t('reports.draft')}
                          </button>
                          <button
                            onClick={() => {
                              setStatusFilter('Finished')
                              setShowStatusFilter(false)
                            }}
                            className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${statusFilter === 'Finished' ? 'bg-primary/10 text-primary' : 'text-gray-700'}`}
                          >
                            {t('reports.finished')}
                          </button>
                          <button
                            onClick={() => {
                              setStatusFilter('Approved')
                              setShowStatusFilter(false)
                            }}
                            className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${statusFilter === 'Approved' ? 'bg-primary/10 text-primary' : 'text-gray-700'}`}
                          >
                            {t('reports.approved')}
                          </button>
                          <button
                            onClick={() => {
                              setStatusFilter('Sent')
                              setShowStatusFilter(false)
                            }}
                            className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${statusFilter === 'Sent' ? 'bg-primary/10 text-primary' : 'text-gray-700'}`}
                          >
                            {t('reports.sent')}
                          </button>
                          <button
                            onClick={() => {
                              setStatusFilter('Viewed')
                              setShowStatusFilter(false)
                            }}
                            className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${statusFilter === 'Viewed' ? 'bg-primary/10 text-primary' : 'text-gray-700'}`}
                          >
                            {t('reports.viewed')}
                          </button>
                          <button
                            onClick={() => {
                              setStatusFilter('Error')
                              setShowStatusFilter(false)
                            }}
                            className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${statusFilter === 'Error' ? 'bg-primary/10 text-primary' : 'text-gray-700'}`}
                          >
                            {t('reports.error')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </th>
                <th className="text-left p-4 font-medium text-gray-900"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <span className="ml-2">{t('reports.loadingReports')}</span>
                    </div>
                  </td>
                </tr>
              ) : filteredReports.length > 0 ? (
                filteredReports.map((report) => (
                  <tr key={report.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300" 
                        checked={selectedRows.includes(report.id)}
                        onChange={() => handleRowSelect(report.id)}
                      />
                    </td>
                    <td className="p-4">
                      <div>
                        <div className="font-medium text-gray-900">
                          {report.report_name || t('reports.untitledReport')}
                        </div>
                        {report.start_date && report.end_date && (
                          <div className="text-sm text-gray-500">
                            {formatDate(report.start_date)} - {formatDate(report.end_date)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <div className="font-medium text-gray-900">{report.student_name}</div>
                        <div className="text-sm text-gray-500">{report.student_email}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-gray-900">
                        {report.student_school || t('reports.notSpecified')}
                      </div>
                    </td>
                    <td className="p-4 text-gray-900 text-sm">
                      {formatDate(report.created_at)}
                    </td>
                    <td className="p-4 text-gray-900 text-sm">
                      {formatDate(report.updated_at)}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(report.status || 'Draft')}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(report.status || 'Draft')}`}>
                          {getStatusTranslation(report.status || 'Draft')}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="relative">
                        <Button 
                          ref={(el) => { dropdownButtonRefs.current[report.id] = el }}
                          variant="ghost" 
                          size="sm" 
                          className="p-1"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDropdownOpen(dropdownOpen === report.id ? null : report.id)
                          }}
                        >
                          <MoreHorizontal className="w-4 h-4 text-gray-500" />
                        </Button>
                        
                        {dropdownOpen === report.id && (
                          <div 
                            className="dropdown-menu absolute right-0 top-8 z-50 bg-white rounded-lg border border-gray-300 shadow-xl py-1 min-w-[160px]"
                            style={{ zIndex: 9999 }}
                            onClick={(e) => {
                              e.stopPropagation()
                            }}
                          >
                            <button 
                              className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap"
                              onClick={async (e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                // Fetch fresh data for this specific report
                                const { data: freshReportData } = await supabase
                                  .from('student_reports')
                                  .select(`
                                    id,
                                    student_id,
                                    report_name,
                                    start_date,
                                    end_date,
                                    selected_subjects,
                                    selected_classrooms,
                                    selected_assignment_categories,
                                    ai_feedback_enabled,
                                    feedback,
                                    ai_feedback_created_by,
                                    ai_feedback_created_at,
                                    ai_feedback_template,
                                    status
                                  `)
                                  .eq('id', report.id)
                                  .single()
                                
                                const reportToEdit = freshReportData || report
                                setEditingReport(report as ReportData)
                                setCurrentReportId(reportToEdit.id)
                                setFormData({
                                  student_id: reportToEdit.student_id,
                                  report_name: reportToEdit.report_name || '',
                                  start_date: reportToEdit.start_date || '',
                                  end_date: reportToEdit.end_date || '',
                                  selected_subjects: reportToEdit.selected_subjects || [],
                                  selected_classrooms: reportToEdit.selected_classrooms || [],
                                  selected_assignment_categories: reportToEdit.selected_assignment_categories || [],
                                  ai_feedback_enabled: reportToEdit.ai_feedback_enabled ?? false,
                                  feedback: reportToEdit.feedback ?? '',
                                  status: reportToEdit.status || 'Draft'
                                })
                                
                                // Load existing feedback data for editing  
                                setEditableFeedback(reportToEdit.feedback ?? '')
                                
                                // Set AI feedback metadata
                                if (reportToEdit.ai_feedback_created_by) {
                                    if (userId === reportToEdit.ai_feedback_created_by) {
                                      setAiFeedbackCreatedBy(userName || 'You')
                                    } else {
                                      setAiFeedbackCreatedBy('User')
                                    }
                                } else {
                                  setAiFeedbackCreatedBy('')
                                }
                                
                                if (reportToEdit.ai_feedback_created_at) {
                                  setAiFeedbackCreatedAt(reportToEdit.ai_feedback_created_at)
                                } else {
                                  setAiFeedbackCreatedAt('')
                                }
                                
                                if (reportToEdit.ai_feedback_template) {
                                  setAiFeedbackTemplate(reportToEdit.ai_feedback_template)
                                } else {
                                  setAiFeedbackTemplate('')
                                }
                                
                                // AI feedback will be handled through formData sync
                                setShowEditReportModal(true)
                                setDropdownOpen(null)
                              }}
                            >
                              <Edit className="w-4 h-4" />
                              {t('common.edit')}
                            </button>
                            <button 
                              className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                openPreviewModal(report)
                                setDropdownOpen(null)
                              }}
                            >
                              <Eye className="w-4 h-4" />
                              {t('reports.previewReport')}
                            </button>
                            <button 
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleDeleteClick(report)
                              }}
                              className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                              {t('common.delete')}
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-12 text-center">
                    <div className="flex flex-col items-center">
                      <FileText className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                      <h3 className="text-lg font-medium text-gray-900 mb-1">{t('reports.noReportsFound')}</h3>
                      <p className="text-gray-600">
                        {searchQuery ? t('common.tryAdjustingSearch') : t('reports.noReportsCreated')}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </Card>

      {/* Add Report Modal */}
      {showAddReportModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-border w-full max-w-2xl mx-4 max-h-[90vh] shadow-lg flex flex-col">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{t('reports.createNewReport')}</h2>
                <p className="text-gray-500">{t('reports.generateComprehensiveReport')}</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setShowAddReportModal(false)
                  resetForm()
                }}
                className="p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="space-y-6">
                {/* Student Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    {t('reports.student')} <span className="text-red-500">*</span>
                  </label>
                  <div className={`border rounded-lg bg-gray-50 p-4 ${
                    formErrors.student_id ? 'border-red-500' : 'border-border'
                  }`}>
                    {students.length === 0 ? (
                      <div className="text-center py-4">
                        <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">{t('reports.noStudentsAvailable')}</p>
                      </div>
                    ) : (
                      <>
                        <div className="relative mb-3">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <Input
                            type="text"
                            placeholder={t('reports.searchStudentsPlaceholder')}
                            value={studentSearchQuery}
                            onChange={(e) => setStudentSearchQuery(e.target.value)}
                            className="h-9 pl-10 rounded-lg border border-border bg-white focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
                          />
                        </div>
                        
                        <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-hide">
                          {students
                            .filter(student => {
                              const studentName = student.name || ''
                              const schoolName = student.school_name || ''
                              const searchLower = studentSearchQuery.toLowerCase()
                              return studentName.toLowerCase().includes(searchLower) || 
                                     schoolName.toLowerCase().includes(searchLower)
                            })
                            .map(student => (
                              <div
                                key={student.user_id}
                                className="flex items-center gap-3 p-2 hover:bg-white/50 rounded-md transition-colors"
                              >
                                <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                                  <input
                                    type="radio"
                                    name="selected_student"
                                    checked={formData.student_id === student.user_id}
                                    onChange={async () => {
                                      setFormData({ ...formData, student_id: student.user_id, selected_classrooms: [] })
                                      await fetchStudentClassrooms(student.user_id)
                                      setFormErrors({ ...formErrors, student_id: '' })
                                    }}
                                    className="w-4 h-4 text-primary border-border rounded focus:ring-0 focus:outline-none hover:border-border focus:border-border"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm font-medium text-gray-900 truncate">
                                        {student.name}
                                      </span>
                                      {student.school_name && (
                                        <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full ml-2">
                                          {student.school_name}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-500 truncate">
                                      {student.email}
                                    </div>
                                  </div>
                                </label>
                              </div>
                            ))}
                        </div>
                      </>
                    )}
                    
                    {formData.student_id && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-600">
                          {t('reports.selected')} {students.find(s => s.user_id === formData.student_id)?.name}
                        </p>
                      </div>
                    )}
                  </div>
                  {formErrors.student_id && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.student_id}</p>
                  )}
                </div>

                {/* Report Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    {t('reports.reportTitle')} <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={formData.report_name}
                    onChange={(e) => {
                      setFormData({ ...formData, report_name: e.target.value })
                      setFormErrors({ ...formErrors, report_name: '' })
                    }}
                    placeholder={t('reports.enterReportTitlePlaceholder')}
                    className={formErrors.report_name ? 'border-red-500' : ''}
                  />
                  {formErrors.report_name && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.report_name}</p>
                  )}
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      {t('reports.startDate')} <span className="text-red-500">*</span>
                    </label>
                    <DatePickerComponent
                      value={formData.start_date}
                      onChange={(value) => {
                        setFormData({ ...formData, start_date: value })
                        setFormErrors({ ...formErrors, start_date: '', end_date: '' })
                      }}
                      fieldId="report-start-date"
                      placeholder={t('reports.selectStartDatePlaceholder')}
                      activeDatePicker={activeDatePicker}
                      setActiveDatePicker={setActiveDatePicker}
                    />
                    {formErrors.start_date && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.start_date}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      {t('reports.endDate')} <span className="text-red-500">*</span>
                    </label>
                    <DatePickerComponent
                      value={formData.end_date}
                      onChange={(value) => {
                        setFormData({ ...formData, end_date: value })
                        setFormErrors({ ...formErrors, end_date: '' })
                      }}
                      fieldId="report-end-date"
                      placeholder={t('reports.selectEndDatePlaceholder')}
                      activeDatePicker={activeDatePicker}
                      setActiveDatePicker={setActiveDatePicker}
                    />
                    {formErrors.end_date && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.end_date}</p>
                    )}
                  </div>
                </div>

                {/* Subject, Category and Classroom Selection */}
                <div>
                  <SubjectAndClassroomSelector
                    subjects={subjects}
                    assignmentCategories={assignmentCategories as any}
                    classrooms={classrooms}
                    selectedSubject={formData.selected_subjects?.[0] || ""}
                    selectedCategories={formData.selected_assignment_categories}
                    selectedClassrooms={formData.selected_classrooms}
                    onSubjectChange={(subject) => 
                      setFormData({
                        ...formData,
                        selected_subjects: subject ? [subject] : []
                      })
                    }
                    onCategoriesChange={(categories) =>
                      setFormData({
                        ...formData,
                        selected_assignment_categories: categories
                      })
                    }
                    onClassroomsChange={(classrooms) =>
                      setFormData({
                        ...formData,
                        selected_classrooms: classrooms
                      })
                    }
                    loading={loadingSubjects}
                  />
                </div>

                {/* Report Status - Hidden */}
                {false && (
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    {t('reports.status')}
                  </label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value) => setFormData({ ...formData, status: value as typeof formData.status })}
                  >
                    <SelectTrigger className="h-10 text-sm bg-white border border-border focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Draft">{t('reports.draft')}</SelectItem>
                      <SelectItem value="Finished">{t('reports.finished')}</SelectItem>
                      <SelectItem value="Approved">{t('reports.approved')}</SelectItem>
                      <SelectItem value="Sent">{t('reports.sent')}</SelectItem>
                      <SelectItem value="Viewed">{t('reports.viewed')}</SelectItem>
                      <SelectItem value="Error">{t('reports.error')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                )}

                {/* Feedback Guidance */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <Eye className="w-5 h-5 text-blue-600 mt-0.5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-blue-900 mb-1">
                        {t('reports.feedbackGuidance')}
                      </h4>
                      <p className="text-sm text-blue-800 leading-relaxed">
                        {t('reports.feedbackPreviewDescription')}
                      </p>
                    </div>
                  </div>
                </div>

                {formErrors.submit && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{formErrors.submit}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-6 pt-4 border-t border-gray-200">
              <Button 
                variant="outline"
                onClick={() => openPreviewModal(null)}
                disabled={!formData.student_id || !formData.report_name || !formData.start_date || !formData.end_date}
                className="flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                {t('reports.previewReport')}
              </Button>
              
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowAddReportModal(false)
                    resetForm()
                  }}
                  disabled={submitting}
                >
                  {t('common.cancel')}
                </Button>
                <Button 
                  onClick={handleCreateReport}
                  disabled={submitting}
                  className="bg-primary text-white flex items-center gap-2"
                >
                  {submitting ? t('reports.creating') : t('reports.createReport')}
                  {formData.feedback && (
                    <div className="w-2 h-2 bg-blue-200 rounded-full" title={t('reports.feedbackWillBeSavedOnCreate')}></div>
                  )}
                </Button>
                <Button 
                  onClick={handleCreateAndFinishReport}
                  disabled={submitting}
                  className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                >
                  {submitting ? t('reports.finishing') : t('reports.createAndFinish')}
                  {formData.feedback && (
                    <div className="w-2 h-2 bg-green-200 rounded-full" title={t('reports.feedbackWillBeSavedOnCreate')}></div>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Report Modal */}
      {showEditReportModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-border w-full max-w-2xl mx-4 max-h-[90vh] shadow-lg flex flex-col">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{t('reports.editReport')}</h2>
                <p className="text-gray-500">{t('reports.updateReportDetails')}</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setShowEditReportModal(false)
                  setEditingReport(null)
                  setCurrentReportId(null)
                  // Don't reset form - preserve data
                  setAiFeedbackCreatedBy('')
                  setAiFeedbackCreatedAt('')
                  setAiFeedbackTemplate('')
                }}
                className="p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="space-y-6">
                {/* Student Selection - Read-only in edit mode */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    {t('reports.student')} <span className="text-red-500">*</span>
                  </label>
                  <div className="border rounded-lg bg-gray-50 p-4 border-border">
                    <div className="flex items-center gap-3 p-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {students.find(s => s.user_id === formData.student_id)?.name || 'Student Name'}
                          </span>
                          {students.find(s => s.user_id === formData.student_id)?.school_name && (
                            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full ml-2">
                              {students.find(s => s.user_id === formData.student_id)?.school_name}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {students.find(s => s.user_id === formData.student_id)?.email || 'student@email.com'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Report Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    {t('reports.reportTitle')} <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={formData.report_name}
                    onChange={(e) => {
                      setFormData({ ...formData, report_name: e.target.value })
                      setFormErrors({ ...formErrors, report_name: '' })
                    }}
                    placeholder={t('reports.enterReportTitlePlaceholder')}
                    className={formErrors.report_name ? 'border-red-500' : ''}
                  />
                  {formErrors.report_name && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.report_name}</p>
                  )}
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      {t('reports.startDate')} <span className="text-red-500">*</span>
                    </label>
                    <DatePickerComponent
                      value={formData.start_date}
                      onChange={(value) => {
                        setFormData({ ...formData, start_date: value })
                        setFormErrors({ ...formErrors, start_date: '', end_date: '' })
                      }}
                      fieldId="edit-report-start-date"
                      placeholder={t('reports.selectStartDatePlaceholder')}
                      activeDatePicker={activeDatePicker}
                      setActiveDatePicker={setActiveDatePicker}
                    />
                    {formErrors.start_date && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.start_date}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      {t('reports.endDate')} <span className="text-red-500">*</span>
                    </label>
                    <DatePickerComponent
                      value={formData.end_date}
                      onChange={(value) => {
                        setFormData({ ...formData, end_date: value })
                        setFormErrors({ ...formErrors, end_date: '' })
                      }}
                      fieldId="edit-report-end-date"
                      placeholder={t('reports.selectEndDatePlaceholder')}
                      activeDatePicker={activeDatePicker}
                      setActiveDatePicker={setActiveDatePicker}
                    />
                    {formErrors.end_date && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.end_date}</p>
                    )}
                  </div>
                </div>

                {/* Subject, Category and Classroom Selection */}
                <div>
                  <SubjectAndClassroomSelector
                    subjects={subjects}
                    assignmentCategories={assignmentCategories as any}
                    classrooms={classrooms}
                    selectedSubject={formData.selected_subjects?.[0] || ""}
                    selectedCategories={formData.selected_assignment_categories}
                    selectedClassrooms={formData.selected_classrooms}
                    onSubjectChange={(subject) => 
                      setFormData({
                        ...formData,
                        selected_subjects: subject ? [subject] : []
                      })
                    }
                    onCategoriesChange={(categories) =>
                      setFormData({
                        ...formData,
                        selected_assignment_categories: categories
                      })
                    }
                    onClassroomsChange={(classrooms) =>
                      setFormData({
                        ...formData,
                        selected_classrooms: classrooms
                      })
                    }
                    loading={loadingSubjects}
                  />
                </div>


                {/* Report Status - Hidden */}
                {false && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">{t('reports.status')}</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value) => setFormData({ ...formData, status: value as typeof formData.status })}
                  >
                    <SelectTrigger className="h-10 text-sm bg-white border border-border focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Draft">{t('reports.draft')}</SelectItem>
                      <SelectItem value="Finished">{t('reports.finished')}</SelectItem>
                      <SelectItem value="Approved">{t('reports.approved')}</SelectItem>
                      <SelectItem value="Sent">{t('reports.sent')}</SelectItem>
                      <SelectItem value="Viewed">{t('reports.viewed')}</SelectItem>
                      <SelectItem value="Error">{t('reports.error')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                )}

                {/* Feedback Guidance */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <Eye className="w-5 h-5 text-blue-600 mt-0.5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-blue-900 mb-1">
                        {t('reports.feedbackGuidance')}
                      </h4>
                      <p className="text-sm text-blue-800 leading-relaxed">
                        {t('reports.feedbackPreviewDescription')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-6 pt-4 border-t border-gray-200">
              <Button 
                variant="outline"
                onClick={() => openPreviewModal(null)}
                disabled={!formData.student_id || !formData.report_name || !formData.start_date || !formData.end_date}
                className="flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                {t('reports.previewReport')}
              </Button>
              
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowEditReportModal(false)
                    setEditingReport(null)
                    setCurrentReportId(null)
                    // Don't reset form - preserve data
                    setAiFeedbackCreatedBy('')
                    setAiFeedbackCreatedAt('')
                    setAiFeedbackTemplate('')
                  }}
                  disabled={submitting}
                >
                  {t('common.cancel')}
                </Button>
                <Button 
                  onClick={async () => {
                    if (!editingReport || !validateForm()) return
                    
                    setSubmitting(true)
                    try {
                      const updateData = {
                        report_name: formData.report_name,
                        start_date: formData.start_date,
                        end_date: formData.end_date,
                        selected_subjects: formData.selected_subjects,
                        selected_classrooms: formData.selected_classrooms,
                        selected_assignment_categories: formData.selected_assignment_categories,
                        ai_feedback_enabled: formData.ai_feedback_enabled,
                        status: formData.status
                      }
                      
                      const { error } = await supabase
                        .from('student_reports')
                        .update(updateData)
                        .eq('id', editingReport.id)
                      
                      if (error) throw error
                      
                      await fetchReports()
                      setShowEditReportModal(false)
                      setEditingReport(null)
                      setCurrentReportId(null)
                      // Don't reset form after successful update
                      setAiFeedbackCreatedBy('')
                      setAiFeedbackCreatedAt('')
                      setAiFeedbackTemplate('')
                    } catch (error) {
                      console.error('Error updating report:', error)
                      setFormErrors({ submit: t('reports.failedToUpdateReport') })
                    } finally {
                      setSubmitting(false)
                    }
                  }}
                  disabled={submitting || !formData.report_name || !formData.start_date || !formData.end_date}
                  className="bg-primary text-white"
                >
                  {submitting ? t('reports.updating') : t('reports.updateReport')}
                </Button>
                <Button 
                  onClick={async () => {
                    if (!editingReport || !validateForm()) return
                    
                    setSubmitting(true)
                    try {
                      const updateData = {
                        report_name: formData.report_name,
                        start_date: formData.start_date,
                        end_date: formData.end_date,
                        selected_subjects: formData.selected_subjects,
                        selected_classrooms: formData.selected_classrooms,
                        selected_assignment_categories: formData.selected_assignment_categories,
                        ai_feedback_enabled: formData.ai_feedback_enabled,
                        status: 'Finished' // Set status to Finished
                      }
                      
                      const { error } = await supabase
                        .from('student_reports')
                        .update(updateData)
                        .eq('id', editingReport.id)
                      
                      if (error) throw error
                      
                      await fetchReports()
                      setShowEditReportModal(false)
                      setEditingReport(null)
                      setCurrentReportId(null)
                      // Don't reset form after successful update
                      setAiFeedbackCreatedBy('')
                      setAiFeedbackCreatedAt('')
                      setAiFeedbackTemplate('')
                    } catch (error) {
                      console.error('Error updating report:', error)
                      setFormErrors({ submit: t('reports.failedToUpdateReport') })
                    } finally {
                      setSubmitting(false)
                    }
                  }}
                  disabled={submitting || !formData.report_name || !formData.start_date || !formData.end_date}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {submitting ? t('reports.updatingAndFinishing') : t('reports.updateAndFinish')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg border border-border w-full max-w-5xl mx-4 max-h-[90vh] shadow-lg flex flex-col">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{t('reports.previewReport')}</h2>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleClosePreviewModal}
                className="p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex-1 p-6 overflow-y-auto">
              {loadingReportData ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">{t('common.loading')}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                {/* Report Name */}
                <div className="text-center py-6 border-b border-gray-100">
                  <h1 className="text-4xl font-bold text-gray-900 mb-2">{formData.report_name || t('reports.studentReport')}</h1>
                  <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mx-auto"></div>
                </div>
                
                {/* Student Info Header */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-medium text-xl">
                        {students.find(s => s.user_id === formData.student_id)?.name?.charAt(0).toUpperCase() || 'S'}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">
                          {students.find(s => s.user_id === formData.student_id)?.name || t('reports.studentName')}
                        </h3>
                        <p className="text-gray-600">
                          {students.find(s => s.user_id === formData.student_id)?.email || t('reports.studentEmail')}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {t('reports.reportPeriod')} {formData.start_date ? formatDate(formData.start_date) : t('reports.selectStartDate')} - {formData.end_date ? formatDate(formData.end_date) : t('reports.selectEndDate')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Report Scope - Subject, Categories, and Classrooms */}
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Filter className="w-5 h-5 text-blue-600" />
                    {t('reports.reportScope')}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Subject */}
                    <div>
                      <h5 className="font-medium text-gray-700 mb-2">{t('reports.subjects')}</h5>
                      {formData.selected_subjects?.length > 0 ? (
                        <div className="space-y-1">
                          {subjects.filter(s => formData.selected_subjects.includes(s.id)).map(subject => (
                            <span key={subject.id} className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                              {subject.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm">{t('reports.noSubjectsSelected')}</span>
                      )}
                    </div>

                    {/* Categories */}
                    <div>
                      <h5 className="font-medium text-gray-700 mb-2">{t('reports.categories')}</h5>
                      {formData.selected_assignment_categories?.length > 0 ? (
                        <div className="space-y-1">
                          {assignmentCategories.filter(c => formData.selected_assignment_categories.includes(c.id)).map(category => (
                            <span key={category.id} className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium mr-2 mb-1">
                              {category.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm">{t('reports.noCategoriesSelected')}</span>
                      )}
                    </div>

                    {/* Classrooms */}
                    <div>
                      <h5 className="font-medium text-gray-700 mb-2">{t('reports.classrooms')}</h5>
                      {formData.selected_classrooms?.length > 0 ? (
                        <div className="space-y-1">
                          {classrooms.filter(c => formData.selected_classrooms.includes(c.id)).map(classroom => (
                            <span key={classroom.id} className="inline-block bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium mr-2 mb-1">
                              {classroom.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm">{t('reports.noClassroomsSelected')}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Performance Overview */}
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

                {/* Performance Chart */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-lg font-semibold text-gray-900">{t('reports.overallAverageGrade')}</h4>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-gray-600">{t('sessions.quiz')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-gray-600">{t('sessions.homework')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                        <span className="text-gray-600">{t('sessions.test')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                        <span className="text-gray-600">{t('sessions.project')}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="h-64 relative pl-8">
                    <svg 
                      width="100%" 
                      height="100%" 
                      viewBox="0 0 800 240" 
                      className="overflow-hidden"
                      onMouseLeave={() => setTooltip({ show: false, x: 0, y: 0, content: '' })}
                    >
                      <defs>
                        <linearGradient id="blueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" style={{ stopColor: '#3B82F6', stopOpacity: 0.1 }} />
                          <stop offset="100%" style={{ stopColor: '#3B82F6', stopOpacity: 0 }} />
                        </linearGradient>
                        <linearGradient id="greenGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" style={{ stopColor: '#10B981', stopOpacity: 0.1 }} />
                          <stop offset="100%" style={{ stopColor: '#10B981', stopOpacity: 0 }} />
                        </linearGradient>
                        <linearGradient id="purpleGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" style={{ stopColor: '#8B5CF6', stopOpacity: 0.1 }} />
                          <stop offset="100%" style={{ stopColor: '#8B5CF6', stopOpacity: 0 }} />
                        </linearGradient>
                        <linearGradient id="orangeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" style={{ stopColor: '#F97316', stopOpacity: 0.1 }} />
                          <stop offset="100%" style={{ stopColor: '#F97316', stopOpacity: 0 }} />
                        </linearGradient>
                      </defs>
                      
                      {/* Grid lines */}
                      {[20, 80, 140, 200].map((y, i) => (
                        <line
                          key={i}
                          x1="40"
                          y1={y}
                          x2="760"
                          y2={y}
                          stroke="#F3F4F6"
                          strokeWidth="1"
                        />
                      ))}
                      
                      {/* Dynamic lines for each assignment type */}
                      {(() => {
                        const mainChartData = generateMainChartData(reportData?.assignmentsByType, formData.start_date, formData.end_date)
                        const colors = {
                          quiz: '#3B82F6',
                          homework: '#10B981', 
                          test: '#8B5CF6',
                          project: '#F97316'
                        }

                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        return Object.entries(mainChartData).map(([type, data]: [string, any]) => {
                          if (!data || data.length === 0) return null
                          
                          // Hide lines where all scores are 0 (empty data)
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          const hasRealData = data.some((point: any) => point.score > 0)
                          if (!hasRealData) return null
                          
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          const pathData = data.map((point: any, i: number) =>
                            `${i === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
                          ).join(' ')
                          
                          return (
                            <path
                              key={type}
                              d={pathData}
                              stroke={colors[type as keyof typeof colors]}
                              strokeWidth="3"
                              fill="none"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          )
                        })
                      })()}
                      
                      {/* Dynamic data points for all assignment types */}
                      {(() => {
                        const mainChartData = generateMainChartData(reportData?.assignmentsByType, formData.start_date, formData.end_date)
                        const colors = {
                          quiz: { fill: '#3B82F6', label: 'sessions.quiz' },
                          homework: { fill: '#10B981', label: 'sessions.homework' }, 
                          test: { fill: '#8B5CF6', label: 'sessions.test' },
                          project: { fill: '#F97316', label: 'sessions.project' }
                        }

                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        return Object.entries(mainChartData).map(([type, data]: [string, any]) => {
                          if (!data || data.length === 0) return null
                          
                          // Hide points where all scores are 0 (empty data)
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          const hasRealData = data.some((point: any) => point.score > 0)
                          if (!hasRealData) return null
                          
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          return data.map((point: any, i: number) => (
                            <circle
                              key={`${type}-${i}`}
                              cx={point.x}
                              cy={point.y}
                              r="4"
                              fill={colors[type as keyof typeof colors].fill}
                              stroke="#FFFFFF"
                              strokeWidth="2"
                              className="cursor-pointer hover:r-6 transition-all"
                              onMouseEnter={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect()
                                setTooltip({
                                  show: true,
                                  x: rect.left + window.scrollX,
                                  y: rect.top + window.scrollY - 10,
                                  content: `${t(colors[type as keyof typeof colors].label)} - ${point.label}: ${point.score}%`
                                })
                              }}
                            />
                          ))
                        }).flat()
                      })()}
                    </svg>
                    
                    {/* Y-axis labels */}
                    <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500 pt-2 pb-2">
                      <span>100%</span>
                      <span>75%</span>
                      <span>50%</span>
                      <span>25%</span>
                      <span>0%</span>
                    </div>
                    
                  </div>
                </div>

                {/* Individual Category Performance */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {reportData?.assignmentsByCategory && reportData?.categoryNames && 
                    Object.entries(reportData.assignmentsByCategory).map(([categoryId, categoryData], index) => {
                      const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F97316', '#EF4444', '#F59E0B', '#8B5CF6', '#10B981']
                      const colorNames = ['blue', 'green', 'purple', 'orange', 'red', 'yellow', 'purple', 'green']
                      const color = colors[index % colors.length]
                      const colorName = colorNames[index % colorNames.length]
                      const categoryName = reportData?.categoryNames?.[categoryId]
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
                                if (chartData.length === 0 || !chartData.some(point => point.score > 0)) {
                                  return (
                                    <g>
                                      <rect x="0" y="0" width="300" height="120" fill="#F9FAFB" rx="4" />
                                      <text x="150" y="60" textAnchor="middle" className="fill-gray-400 text-sm">
                                        {t('reports.noChartData')}
                                      </text>
                                    </g>
                                  )
                                }
                                
                                const pathData = chartData.map((point, i) => 
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
                                if (chartData.length === 0 || !chartData.some(point => point.score > 0)) return null
                                
                                return chartData.map((point, i) => (
                                  <circle
                                    key={i}
                                    cx={point.x}
                                    cy={point.y}
                                    r="3"
                                    fill={color}
                                    stroke="#FFFFFF"
                                    strokeWidth="2"
                                    className="cursor-pointer hover:r-4 transition-all"
                                    onMouseEnter={(e) => {
                                      const rect = e.currentTarget.getBoundingClientRect()
                                      setTooltip({
                                        show: true,
                                        x: rect.left + window.scrollX,
                                        y: rect.top + window.scrollY - 10,
                                        content: `${point.label}: ${point.score}%`
                                      })
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
                    })
                  }
                </div>

                {/* Student Percentile */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-6">{t('reports.classPercentileRanking')}</h4>
                  
                  {(() => {
                    
                    // Classroom data with percentiles
                    const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F97316', '#EF4444', '#F59E0B']
                    const darkColors = ['#1D4ED8', '#059669', '#7C3AED', '#EA580C', '#DC2626', '#D97706']
                    
                    const classrooms = Object.entries(reportData?.classroomPercentiles || {}).map(([classroomId, data], index) => ({
                      id: classroomId,
                      name: data.classroomName,
                      percentile: data.percentile ?? 0, // Ensure percentile has a fallback value
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
                                                y2={baseY + 8}
                                                stroke="#6B7280"
                                                strokeWidth="1"
                                              />
                                              <text
                                                x={x}
                                                y={baseY + 22}
                                                className="text-[9px] fill-gray-600"
                                                textAnchor="middle"
                                              >
                                                {percentile}%
                                              </text>
                                            </g>
                                          )
                                        })}
                                        
                                        {/* Student position marker */}
                                        <g>
                                          {/* Vertical line from curve to X-axis */}
                                          <line
                                            x1={studentX}
                                            y1={studentY}
                                            x2={studentX}
                                            y2={baseY}
                                            stroke={classroom.darkColor}
                                            strokeWidth="2"
                                            strokeDasharray="3,3"
                                          />
                                          
                                          {/* Student marker on curve */}
                                          <circle
                                            cx={studentX}
                                            cy={studentY}
                                            r="5"
                                            fill={classroom.darkColor}
                                            stroke="#FFFFFF"
                                            strokeWidth="2"
                                          />
                                          
                                          {/* "You" label */}
                                          <text
                                            x={studentX}
                                            y={studentY - 12}
                                            className="text-[10px] font-bold"
                                            style={{ fill: classroom.darkColor }}
                                            textAnchor="middle"
                                          >
                                            {t('reports.you')} ({classroom.percentile}%)
                                          </text>
                                        </g>
                                        
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
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <span className="font-semibold text-gray-900">
                          {(() => {
                            const percentiles = Object.values(reportData?.classroomPercentiles || {})
                            if (percentiles.length === 0) {
                              return t('reports.noData')
                            }
                            const avgPercentile = Math.round(
                              percentiles.reduce((sum, data) => sum + (data.percentile || 0), 0) / percentiles.length
                            )
                            return `${t('reports.topPercentagePrefix')} ${avgPercentile}%`
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI/Manual Feedback */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  {/* Feedback Heading */}
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">{t('assignments.feedback')}</h3>
                  
                  {/* AI Feedback Generation */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-gray-600" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{t('reports.aiFeedback')}</div>
                        <div className="text-xs text-gray-500">
                          {formData.ai_feedback_enabled 
                            ? t('reports.aiInsightsGenerated')
                            : t('reports.aiInsightsDescription')
                          }
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        onClick={() => setShowAiConfirmModal(true)}
                        disabled={isGeneratingAi}
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        {isGeneratingAi ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                            {t('reports.generating')}
                          </>
                        ) : (
                          <>
                            <Bot className="w-4 h-4" />
                            {(formData.feedback && formData.ai_feedback_enabled) ? t('reports.regenerateAi') : t('reports.generateAi')}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  
                  <div className="space-y-4">                    
                    {formData.ai_feedback_enabled ? (
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Bot className="w-5 h-5 text-blue-600" />
                            <h5 className="font-semibold text-blue-900">{t('reports.aiGeneratedFeedback')}</h5>
                          </div>
                          {(formData.feedback || editableFeedback) && !isEditingFeedback && (
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setIsEditingFeedback(true)
                                  // Ensure editableFeedback is synced when starting edit
                                  if (!editableFeedback && formData.feedback) {
                                    setEditableFeedback(formData.feedback)
                                  }
                                }}
                                className="text-xs"
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                {t('common.edit')}
                              </Button>
                            </div>
                          )}
                        </div>
                        
                        {/* Creator info */}
                        {aiFeedbackCreatedBy && (
                          <div className="text-xs text-blue-600 mb-2 flex items-center gap-1">
                            <span>{t('reports.createdBy')} {aiFeedbackCreatedBy}</span>
                            {aiFeedbackCreatedAt && (
                              <>
                                <span>•</span>
                                <span>{new Date(aiFeedbackCreatedAt).toLocaleString()}</span>
                              </>
                            )}
                          </div>
                        )}
                        
                        {/* AI Template Type */}
                        {aiFeedbackTemplate && (
                          <div className="text-xs text-blue-600 mb-2 flex items-center gap-1">
                            <span>{t('reports.template')}: {
                              aiFeedbackTemplate === 'comprehensive' ? t('reports.comprehensiveTemplate') :
                              aiFeedbackTemplate === 'focused' ? t('reports.focusedTemplate') :
                              aiFeedbackTemplate === 'encouraging' ? t('reports.encouragingTemplate') :
                              aiFeedbackTemplate
                            }</span>
                          </div>
                        )}

                        {(formData.feedback || editableFeedback || currentReportId) ? (
                          <div>
                            {isEditingFeedback ? (
                              <div className="space-y-3">
                                <RichTextEditor
                                  content={editableFeedback}
                                  onChange={(content) => {
                                    setEditableFeedback(content)
                                    setFeedbackHasChanges(true)
                                  }}
                                  placeholder={t('reports.enterAiFeedback')}
                                  className="border-blue-300 focus-within:ring-blue-500 focus-within:border-blue-500"
                                />
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    onClick={async () => {
                                      try {
                                        // Save to database
                                        const { error: saveError } = await supabase
                                          .from('student_reports')
                                          .update({
                                            feedback: editableFeedback,
                                            updated_at: new Date().toISOString()
                                          })
                                          .eq('id', currentReportId || 'temp-id')
                                        
                                        if (saveError) throw saveError
                                        
                                        setIsEditingFeedback(false)
                                        setFeedbackHasChanges(false)
                                        
                                        // Update local reports state
                                        setReports(prev => prev.map(report =>
                                          report.id === currentReportId
                                            ? { ...report, feedback: editableFeedback }
                                            : report
                                        ))
                                        
                                        // Show success message
                                        const successMessage = document.createElement('div')
                                        successMessage.className = 'fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50'
                                        successMessage.textContent = t('reports.feedbackSavedSuccessfully')
                                        document.body.appendChild(successMessage)
                                        setTimeout(() => {
                                          if (document.body.contains(successMessage)) {
                                            document.body.removeChild(successMessage)
                                          }
                                        }, 3000)
                                      } catch (error) {
                                        console.error('Error saving feedback:', error)
                                        // Show error message
                                        const errorMessage = document.createElement('div')
                                        errorMessage.className = 'fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50'
                                        errorMessage.textContent = t('reports.feedbackSaveError')
                                        document.body.appendChild(errorMessage)
                                        setTimeout(() => {
                                          if (document.body.contains(errorMessage)) {
                                            document.body.removeChild(errorMessage)
                                          }
                                        }, 3000)
                                      }
                                    }}
                                    className="bg-primary hover:bg-primary/90 text-white"
                                  >
                                    <Save className="w-4 h-4 mr-1" />
                                    {t('common.save')}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setIsEditingFeedback(false)
                                      setFeedbackHasChanges(false)
                                    }}
                                  >
                                    <X className="w-4 h-4 mr-1" />
                                    {t('common.cancel')}
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="text-blue-800 text-sm leading-relaxed prose prose-sm max-w-none">
                                {(formData.feedback || editableFeedback) ? 
                                  <div dangerouslySetInnerHTML={{ __html: formData.feedback || editableFeedback }} /> :
                                  <span className="text-gray-400 italic">{t('reports.noManualFeedback')}</span>
                                }
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-blue-700 text-sm italic">
                            {t('reports.clickGenerateAi')}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        {isEditingFeedback ? (
                          <div className="space-y-3">
                            <div className="text-sm text-gray-600 mb-3">
                              {t('reports.editingFeedbackHint')}
                            </div>
                            <RichTextEditor
                              content={editableFeedback}
                              onChange={(content) => handleFeedbackChange(content)}
                              placeholder={t('reports.enterManualFeedback')}
                              className="min-h-[200px]"
                            />
                            {feedbackHasChanges && (
                              <div className="text-xs text-blue-600 flex items-center gap-1">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                {t('reports.unsavedChanges')}
                              </div>
                            )}
                            {/* Save/Cancel buttons for manual feedback - matching AI feedback buttons */}
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                onClick={handleSaveFeedback}
                                className="bg-primary hover:bg-primary/90 text-white"
                              >
                                <Save className="w-4 h-4 mr-1" />
                                {t('common.save')}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelEditingFeedback}
                              >
                                <X className="w-4 h-4 mr-1" />
                                {t('common.cancel')}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            {/* Always show feedback section, but different content based on state */}
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <h5 className="text-sm font-medium text-gray-900">{t('reports.manualFeedback')}</h5>
                                {(formData.feedback || editableFeedback || currentReportId) ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setIsEditingFeedback(true)
                                      // Ensure editableFeedback is synced when starting edit
                                      if (!editableFeedback && formData.feedback) {
                                        setEditableFeedback(formData.feedback)
                                      }
                                    }}
                                    className="text-xs"
                                  >
                                    <Edit className="w-4 h-4 mr-1" />
                                    {t('common.edit')}
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    onClick={() => setIsEditingFeedback(true)}
                                    className="bg-primary hover:bg-primary/90 text-white text-xs"
                                  >
                                    <Edit className="w-4 h-4 mr-1" />
                                    {t('reports.addFeedback')}
                                  </Button>
                                )}
                              </div>
                              <div className="text-gray-700 text-sm leading-relaxed prose prose-sm max-w-none">
                                {(formData.feedback || editableFeedback) ? 
                                  <div dangerouslySetInnerHTML={{ __html: formData.feedback || editableFeedback }} /> :
                                  <span className="text-gray-400 italic">{t('reports.noManualFeedback')}</span>
                                }
                              </div>
                              {/* Show info message for new reports */}
                              {!currentReportId && (
                                <div className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                  {t('reports.feedbackWillBeSavedOnCreate')}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Removed manual feedback input from preview - feedback should be added/edited in create/edit modals */}
                  </div>
                </div>
              </div>
                )}
            </div>

            <div className="flex items-center justify-end p-6 pt-4 border-t border-gray-200">
              <Button 
                variant="outline" 
                onClick={handleClosePreviewModal}
              >
                {t('reports.closePreview')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tooltip */}
      {tooltip.show && (
        <div 
          className="fixed bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg z-[70] pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)'
          }}
        >
          {tooltip.content}
        </div>
      )}

      {/* AI Generation Confirmation Modal */}
      {showAiConfirmModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg border border-border w-full max-w-lg mx-4 shadow-lg">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Bot className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-900">{t('reports.generateAiFeedback')}</h2>
              </div>
              <p className="text-gray-600 mb-4">
                {t('reports.selectFeedbackTemplate')}
              </p>
              
              {/* Warning about existing feedback */}
              {(formData.feedback?.trim() || formData.ai_feedback_enabled) && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-6">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-800 mb-1">
                      {t('reports.warningExistingFeedback')}
                    </p>
                    <p className="text-amber-700">
                      {t('reports.warningExistingFeedbackDescription')}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Template Selection */}
              <div className="space-y-3 mb-6">
                <div 
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedTemplate === 'comprehensive' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedTemplate('comprehensive')}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">{t('reports.comprehensiveTemplate')}</h3>
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      selectedTemplate === 'comprehensive' 
                        ? 'border-blue-500 bg-blue-500' 
                        : 'border-gray-300'
                    }`}>
                      {selectedTemplate === 'comprehensive' && (
                        <div className="w-full h-full rounded-full bg-blue-500 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{t('reports.comprehensiveDescription')}</p>
                </div>

                <div 
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedTemplate === 'focused' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedTemplate('focused')}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">{t('reports.focusedTemplate')}</h3>
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      selectedTemplate === 'focused' 
                        ? 'border-blue-500 bg-blue-500' 
                        : 'border-gray-300'
                    }`}>
                      {selectedTemplate === 'focused' && (
                        <div className="w-full h-full rounded-full bg-blue-500 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{t('reports.focusedDescription')}</p>
                </div>

                <div 
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedTemplate === 'encouraging' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedTemplate('encouraging')}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">{t('reports.encouragingTemplate')}</h3>
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      selectedTemplate === 'encouraging' 
                        ? 'border-blue-500 bg-blue-500' 
                        : 'border-gray-300'
                    }`}>
                      {selectedTemplate === 'encouraging' && (
                        <div className="w-full h-full rounded-full bg-blue-500 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{t('reports.encouragingDescription')}</p>
                </div>
              </div>

              {/* Language Selection */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-900 mb-3">{t('reports.selectLanguage')}</h3>
                <div className="flex gap-3">
                  <div 
                    className={`flex-1 border rounded-lg p-3 cursor-pointer transition-colors ${
                      selectedLanguage === 'english' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedLanguage('english')}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🇺🇸</span>
                        <span className="font-medium text-gray-900">{t('reports.englishLanguage')}</span>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        selectedLanguage === 'english' 
                          ? 'border-blue-500 bg-blue-500' 
                          : 'border-gray-300'
                      }`}>
                        {selectedLanguage === 'english' && (
                          <div className="w-full h-full rounded-full bg-blue-500 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div 
                    className={`flex-1 border rounded-lg p-3 cursor-pointer transition-colors ${
                      selectedLanguage === 'korean' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedLanguage('korean')}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🇰🇷</span>
                        <span className="font-medium text-gray-900">{t('reports.koreanLanguage')}</span>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        selectedLanguage === 'korean' 
                          ? 'border-blue-500 bg-blue-500' 
                          : 'border-gray-300'
                      }`}>
                        {selectedLanguage === 'korean' && (
                          <div className="w-full h-full rounded-full bg-blue-500 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowAiConfirmModal(false)
                    setSelectedTemplate('comprehensive') // Reset to default
                    setSelectedLanguage('english') // Reset to default
                  }}
                  className="flex-1"
                >
                  {t('common.cancel')}
                </Button>
                <Button 
                  onClick={handleGenerateAiFeedback}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white"
                >
                  <Bot className="w-4 h-4 mr-2" />
                  {t('reports.generateAi')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && reportToDelete && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-border w-full max-w-md mx-4 shadow-lg">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{t('reports.deleteReport')}</h2>
              <p className="text-gray-600 mb-6">
                {t('reports.confirmDeleteReport', { reportName: reportToDelete.report_name || `${reportToDelete.student_name}'s report` })}
              </p>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowDeleteModal(false)
                    setReportToDelete(null)
                  }}
                  className="flex-1"
                >
                  {t('common.cancel')}
                </Button>
                <Button 
                  onClick={handleDeleteConfirm}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  {t('common.delete')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}