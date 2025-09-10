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
  Award,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Send,
  FileCheck
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface ReportData {
  id: string
  student_id: string
  student_name: string
  student_email: string
  student_school?: string
  report_name?: string
  start_date?: string
  end_date?: string
  selected_classrooms?: string[]
  selected_assignment_categories?: string[]
  ai_feedback_enabled?: boolean
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
    const formattedDate = selectedDate.toISOString().split('T')[0]
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
                const formattedDate = today.toISOString().split('T')[0]
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
  const [searchQuery, setSearchQuery] = useState('')
  const [students, setStudents] = useState<Student[]>([])
  const [showAddReportModal, setShowAddReportModal] = useState(false)
  const [, setAssignmentCategories] = useState<AssignmentCategory[]>([])
  const [, setStudentClassrooms] = useState<Classroom[]>([])
  const [formData, setFormData] = useState({
    student_id: '',
    report_name: '',
    start_date: '',
    end_date: '',
    selected_classrooms: [] as string[],
    selected_assignment_categories: [] as string[],
    ai_feedback_enabled: true,
    status: 'Draft' as 'Draft' | 'Finished' | 'Approved' | 'Sent' | 'Viewed' | 'Error'
  })
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({})
  const [submitting, setSubmitting] = useState(false)
  const [activeDatePicker, setActiveDatePicker] = useState<string | null>(null)
  const [studentSearchQuery, setStudentSearchQuery] = useState('')
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [manualFeedback, setManualFeedback] = useState('')
  const [tooltip, setTooltip] = useState<{ show: boolean; x: number; y: number; content: string }>({
    show: false,
    x: 0,
    y: 0,
    content: ''
  })
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
          selected_classrooms,
          selected_assignment_categories,
          ai_feedback_enabled,
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
        .select('id, name')
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

  const resetForm = () => {
    setFormData({
      student_id: '',
      report_name: '',
      start_date: '',
      end_date: '',
      selected_classrooms: [],
      selected_assignment_categories: [],
      ai_feedback_enabled: true,
      status: 'Draft' as 'Draft' | 'Finished' | 'Approved' | 'Sent' | 'Viewed' | 'Error'
    })
    setFormErrors({})
    setStudentClassrooms([])
    setStudentSearchQuery('')
    setActiveDatePicker(null)
    setManualFeedback('')
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
          selected_classrooms: formData.selected_classrooms,
          selected_assignment_categories: formData.selected_assignment_categories,
          ai_feedback_enabled: formData.ai_feedback_enabled,
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

  useEffect(() => {
    if (academyId) {
      fetchReports()
      fetchStudents()
      fetchAssignmentCategories()
    }
  }, [academyId, fetchReports, fetchStudents, fetchAssignmentCategories])

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

  const filteredReports = reports
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
            onClick={() => setShowAddReportModal(true)}
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
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setEditingReport(report)
                                setFormData({
                                  student_id: report.student_id,
                                  report_name: report.report_name || '',
                                  start_date: report.start_date || '',
                                  end_date: report.end_date || '',
                                  selected_classrooms: report.selected_classrooms || [],
                                  selected_assignment_categories: report.selected_assignment_categories || [],
                                  ai_feedback_enabled: report.ai_feedback_enabled ?? false,
                                  status: report.status || 'Draft'
                                })
                                // Set manual feedback if AI feedback is disabled
                                if (!report.ai_feedback_enabled) {
                                  setManualFeedback('')  // You can populate from DB if stored
                                }
                                setShowEditReportModal(true)
                                setDropdownOpen(null)
                              }}
                            >
                              <Edit className="w-4 h-4" />
                              {t('common.edit')}
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
                          {t('reports.selected')}: {students.find(s => s.user_id === formData.student_id)?.name}
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

                {/* Report Status */}
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

                {/* AI Feedback Toggle */}
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-gray-600" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{t('reports.includeAIFeedback')}</div>
                        <div className="text-xs text-gray-500">
                          {t('reports.aiInsightsDescription')}
                        </div>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, ai_feedback_enabled: !formData.ai_feedback_enabled })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] ${
                        formData.ai_feedback_enabled ? 'bg-primary' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          formData.ai_feedback_enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  
                  {!formData.ai_feedback_enabled && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        {t('reports.manualFeedback')}
                      </label>
                      <textarea
                        value={manualFeedback}
                        onChange={(e) => setManualFeedback(e.target.value)}
                        placeholder={t('reports.enterFeedbackPlaceholder')}
                        rows={6}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-white focus:border-primary focus:outline-none focus:ring-0 text-sm resize-none"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        {t('reports.feedbackWillBeIncluded')}
                      </p>
                    </div>
                  )}
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
                onClick={() => setShowPreviewModal(true)}
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
                  className="bg-primary text-white"
                >
                  {submitting ? t('reports.creating') : t('reports.createReport')}
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

                {/* AI Feedback Toggle */}
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-gray-600" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{t('reports.includeAIFeedback')}</div>
                        <div className="text-xs text-gray-500">
                          {t('reports.aiInsightsDescription')}
                        </div>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, ai_feedback_enabled: !formData.ai_feedback_enabled })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] ${
                        formData.ai_feedback_enabled ? 'bg-primary' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          formData.ai_feedback_enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  
                  {!formData.ai_feedback_enabled && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        {t('reports.manualFeedback')}
                      </label>
                      <textarea
                        value={manualFeedback}
                        onChange={(e) => setManualFeedback(e.target.value)}
                        placeholder={t('reports.enterFeedbackPlaceholder')}
                        rows={6}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-white focus:border-primary focus:outline-none focus:ring-0 text-sm resize-none"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        {t('reports.feedbackWillBeIncluded')}
                      </p>
                    </div>
                  )}
                </div>

                {/* Report Status */}
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
              </div>
            </div>
            
            <div className="flex items-center justify-between p-6 pt-4 border-t border-gray-200">
              <Button 
                variant="outline"
                onClick={() => setShowPreviewModal(true)}
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
                      const updateData: {
                        report_name: string;
                        start_date: string;
                        end_date: string;
                        selected_classrooms: string[];
                        manual_feedback?: string;
                      } = {
                        report_name: formData.report_name,
                        start_date: formData.start_date,
                        end_date: formData.end_date,
                        selected_classrooms: formData.selected_classrooms
                      }
                      
                      // Include manual feedback if AI feedback is disabled
                      if (!formData.ai_feedback_enabled) {
                        updateData.manual_feedback = manualFeedback
                      }
                      
                      const { error } = await supabase
                        .from('student_reports')
                        .update(updateData)
                        .eq('id', editingReport.id)
                      
                      if (error) throw error
                      
                      await fetchReports()
                      setShowEditReportModal(false)
                      setEditingReport(null)
                      setManualFeedback('')
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
                onClick={() => setShowPreviewModal(false)}
                className="p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex-1 p-6 overflow-y-auto">
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

                {/* Performance Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-green-600" />
                        <h4 className="font-semibold text-gray-900">{t('navigation.assignments')}</h4>
                      </div>
                      <span className="text-2xl font-bold text-green-600">92%</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{t('common.completed')}</span>
                        <span className="font-medium">23/25</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: '92%' }}></div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-600" />
                        <h4 className="font-semibold text-gray-900">{t('navigation.attendance')}</h4>
                      </div>
                      <span className="text-2xl font-bold text-blue-600">95%</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{t('attendance.present')}</span>
                        <span className="font-medium">19/20</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: '95%' }}></div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-purple-600" />
                        <h4 className="font-semibold text-gray-900">{t('reports.participation')}</h4>
                      </div>
                      <span className="text-2xl font-bold text-purple-600">88%</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{t('common.active')}</span>
                        <span className="font-medium">{t('reports.excellent')}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-purple-500 h-2 rounded-full" style={{ width: '88%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Performance Chart */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-lg font-semibold text-gray-900">{t('reports.performanceTrend')}</h4>
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
                      
                      {/* Quizzes line - mapped to 20-200 range (100%-0%) */}
                      <path
                        d="M 40 140 L 140 120 L 240 100 L 340 80 L 440 65 L 540 60 L 640 55 L 720 50 L 760 45"
                        stroke="#3B82F6"
                        strokeWidth="3"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      
                      {/* Homeworks line */}
                      <path
                        d="M 40 160 L 140 140 L 240 120 L 340 105 L 440 90 L 540 80 L 640 70 L 720 65 L 760 60"
                        stroke="#10B981"
                        strokeWidth="3"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      
                      {/* Tests line */}
                      <path
                        d="M 40 180 L 140 170 L 240 155 L 340 140 L 440 120 L 540 105 L 640 95 L 720 85 L 760 75"
                        stroke="#8B5CF6"
                        strokeWidth="3"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      
                      {/* Projects line */}
                      <path
                        d="M 40 170 L 140 160 L 240 145 L 340 125 L 440 100 L 540 85 L 640 75 L 720 65 L 760 55"
                        stroke="#F97316"
                        strokeWidth="3"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      
                      {/* Data points for quizzes */}
                      {[
                        { x: 40, y: 140, score: 67, week: 1 }, { x: 140, y: 120, score: 75, week: 2 }, 
                        { x: 240, y: 100, score: 83, week: 3 }, { x: 340, y: 80, score: 88, week: 4 }, 
                        { x: 440, y: 65, score: 92, week: 5 }, { x: 540, y: 60, score: 94, week: 6 },
                        { x: 640, y: 55, score: 95, week: 7 }, { x: 720, y: 50, score: 96, week: 8 }, 
                        { x: 760, y: 45, score: 97, week: 9 }
                      ].map((point, i) => (
                        <circle
                          key={i}
                          cx={point.x}
                          cy={point.y}
                          r="4"
                          fill="#3B82F6"
                          stroke="#FFFFFF"
                          strokeWidth="2"
                          className="cursor-pointer hover:r-6 transition-all"
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect()
                            setTooltip({
                              show: true,
                              x: rect.left + window.scrollX,
                              y: rect.top + window.scrollY - 10,
                              content: `${t('sessions.quiz')} - ${point.week}${t('reports.week')}: ${point.score}%`
                            })
                          }}
                        />
                      ))}
                      
                      {/* Data points for homeworks */}
                      {[
                        { x: 40, y: 160, score: 58, week: 1 }, { x: 140, y: 140, score: 67, week: 2 }, 
                        { x: 240, y: 120, score: 75, week: 3 }, { x: 340, y: 105, score: 81, week: 4 }, 
                        { x: 440, y: 90, score: 86, week: 5 }, { x: 540, y: 80, score: 88, week: 6 },
                        { x: 640, y: 70, score: 91, week: 7 }, { x: 720, y: 65, score: 92, week: 8 }, 
                        { x: 760, y: 60, score: 94, week: 9 }
                      ].map((point, i) => (
                        <circle
                          key={i}
                          cx={point.x}
                          cy={point.y}
                          r="4"
                          fill="#10B981"
                          stroke="#FFFFFF"
                          strokeWidth="2"
                          className="cursor-pointer hover:r-6 transition-all"
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect()
                            setTooltip({
                              show: true,
                              x: rect.left + window.scrollX,
                              y: rect.top + window.scrollY - 10,
                              content: t('reports.homeworkTooltip', { week: point.week, score: point.score })
                            })
                          }}
                        />
                      ))}
                      
                      {/* Data points for tests */}
                      {[
                        { x: 40, y: 180, score: 50, week: 1 }, { x: 140, y: 170, score: 56, week: 2 }, 
                        { x: 240, y: 155, score: 64, week: 3 }, { x: 340, y: 140, score: 67, week: 4 }, 
                        { x: 440, y: 120, score: 75, week: 5 }, { x: 540, y: 105, score: 81, week: 6 },
                        { x: 640, y: 95, score: 84, week: 7 }, { x: 720, y: 85, score: 87, week: 8 }, 
                        { x: 760, y: 75, score: 90, week: 9 }
                      ].map((point, i) => (
                        <circle
                          key={i}
                          cx={point.x}
                          cy={point.y}
                          r="4"
                          fill="#8B5CF6"
                          stroke="#FFFFFF"
                          strokeWidth="2"
                          className="cursor-pointer hover:r-6 transition-all"
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect()
                            setTooltip({
                              show: true,
                              x: rect.left + window.scrollX,
                              y: rect.top + window.scrollY - 10,
                              content: t('reports.testTooltip', { week: point.week, score: point.score })
                            })
                          }}
                        />
                      ))}
                      
                      {/* Data points for projects */}
                      {[
                        { x: 40, y: 170, score: 56, week: 1 }, { x: 140, y: 160, score: 58, week: 2 }, 
                        { x: 240, y: 145, score: 64, week: 3 }, { x: 340, y: 125, score: 72, week: 4 }, 
                        { x: 440, y: 100, score: 83, week: 5 }, { x: 540, y: 85, score: 87, week: 6 },
                        { x: 640, y: 75, score: 90, week: 7 }, { x: 720, y: 65, score: 92, week: 8 }, 
                        { x: 760, y: 55, score: 95, week: 9 }
                      ].map((point, i) => (
                        <circle
                          key={i}
                          cx={point.x}
                          cy={point.y}
                          r="4"
                          fill="#F97316"
                          stroke="#FFFFFF"
                          strokeWidth="2"
                          className="cursor-pointer hover:r-6 transition-all"
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect()
                            setTooltip({
                              show: true,
                              x: rect.left + window.scrollX,
                              y: rect.top + window.scrollY - 10,
                              content: t('reports.projectTooltip', { week: point.week, score: point.score })
                            })
                          }}
                        />
                      ))}
                    </svg>
                    
                    {/* Y-axis labels */}
                    <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500 pt-2 pb-2">
                      <span>100%</span>
                      <span>75%</span>
                      <span>50%</span>
                      <span>25%</span>
                      <span>0%</span>
                    </div>
                    
                    {/* X-axis labels */}
                    <div className="absolute bottom-0 left-8 right-0 flex justify-between text-xs text-gray-500 mt-2">
                      <span>{t('reports.week')} 1</span>
                      <span>{t('reports.week')} 2</span>
                      <span>{t('reports.week')} 3</span>
                      <span>{t('reports.week')} 4</span>
                      <span>{t('reports.week')} 5</span>
                      <span>{t('reports.week')} 6</span>
                      <span>{t('reports.week')} 7</span>
                      <span>{t('reports.week')} 8</span>
                    </div>
                  </div>
                </div>

                {/* Individual Category Performance */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Quizzes */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                        <h5 className="font-semibold text-gray-900">{t('sessions.quiz')}</h5>
                      </div>
                      <span className="text-lg font-bold text-blue-600">94%</span>
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
                          <linearGradient id="smallBlueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" style={{ stopColor: '#3B82F6', stopOpacity: 0.2 }} />
                            <stop offset="100%" style={{ stopColor: '#3B82F6', stopOpacity: 0 }} />
                          </linearGradient>
                        </defs>
                        <path
                          d="M 0 80 L 50 70 L 100 60 L 150 50 L 200 40 L 250 35 L 300 30"
                          stroke="#3B82F6"
                          strokeWidth="3"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M 0 80 L 50 70 L 100 60 L 150 50 L 200 40 L 250 35 L 300 30 L 300 120 L 0 120 Z"
                          fill="url(#smallBlueGradient)"
                        />
                        {[
                          { x: 0, y: 80, score: 67, week: 1 }, { x: 50, y: 70, score: 75, week: 2 }, 
                          { x: 100, y: 60, score: 83, week: 3 }, { x: 150, y: 50, score: 88, week: 4 }, 
                          { x: 200, y: 40, score: 92, week: 5 }, { x: 250, y: 35, score: 94, week: 6 }, 
                          { x: 300, y: 30, score: 95, week: 7 }
                        ].map((point, i) => (
                          <circle
                            key={i}
                            cx={point.x}
                            cy={point.y}
                            r="3"
                            fill="#3B82F6"
                            stroke="#FFFFFF"
                            strokeWidth="2"
                            className="cursor-pointer hover:r-4 transition-all"
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect()
                              setTooltip({
                                show: true,
                                x: rect.left + window.scrollX,
                                y: rect.top + window.scrollY - 10,
                                content: t('reports.weekTooltip', { week: point.week, score: point.score })
                              })
                            }}
                          />
                        ))}
                      </svg>
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>{t('common.completed')}: 17/18</span>
                        <span className="text-green-600">+2% {t('reports.thisWeek')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Homeworks */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-green-500"></div>
                        <h5 className="font-semibold text-gray-900">{t('sessions.homework')}</h5>
                      </div>
                      <span className="text-lg font-bold text-green-600">89%</span>
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
                          <linearGradient id="smallGreenGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" style={{ stopColor: '#10B981', stopOpacity: 0.2 }} />
                            <stop offset="100%" style={{ stopColor: '#10B981', stopOpacity: 0 }} />
                          </linearGradient>
                        </defs>
                        <path
                          d="M 0 90 L 50 80 L 100 70 L 150 62 L 200 55 L 250 50 L 300 45"
                          stroke="#10B981"
                          strokeWidth="3"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M 0 90 L 50 80 L 100 70 L 150 62 L 200 55 L 250 50 L 300 45 L 300 120 L 0 120 Z"
                          fill="url(#smallGreenGradient)"
                        />
                        {[
                          { x: 0, y: 90, score: 58, week: 1 }, { x: 50, y: 80, score: 67, week: 2 }, 
                          { x: 100, y: 70, score: 75, week: 3 }, { x: 150, y: 62, score: 81, week: 4 }, 
                          { x: 200, y: 55, score: 86, week: 5 }, { x: 250, y: 50, score: 88, week: 6 }, 
                          { x: 300, y: 45, score: 91, week: 7 }
                        ].map((point, i) => (
                          <circle
                            key={i}
                            cx={point.x}
                            cy={point.y}
                            r="3"
                            fill="#10B981"
                            stroke="#FFFFFF"
                            strokeWidth="2"
                            className="cursor-pointer hover:r-4 transition-all"
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect()
                              setTooltip({
                                show: true,
                                x: rect.left + window.scrollX,
                                y: rect.top + window.scrollY - 10,
                                content: t('reports.weekTooltip', { week: point.week, score: point.score })
                              })
                            }}
                          />
                        ))}
                      </svg>
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>{t('common.completed')}: 16/18</span>
                        <span className="text-green-600">+3% {t('reports.thisWeek')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Tests */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-purple-500"></div>
                        <h5 className="font-semibold text-gray-900">{t('sessions.test')}</h5>
                      </div>
                      <span className="text-lg font-bold text-purple-600">86%</span>
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
                          <linearGradient id="smallPurpleGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" style={{ stopColor: '#8B5CF6', stopOpacity: 0.2 }} />
                            <stop offset="100%" style={{ stopColor: '#8B5CF6', stopOpacity: 0 }} />
                          </linearGradient>
                        </defs>
                        <path
                          d="M 0 100 L 50 95 L 100 87 L 150 80 L 200 70 L 250 62 L 300 55"
                          stroke="#8B5CF6"
                          strokeWidth="3"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M 0 100 L 50 95 L 100 87 L 150 80 L 200 70 L 250 62 L 300 55 L 300 120 L 0 120 Z"
                          fill="url(#smallPurpleGradient)"
                        />
                        {[
                          { x: 0, y: 100, score: 50, week: 1 }, { x: 50, y: 95, score: 56, week: 2 }, 
                          { x: 100, y: 87, score: 64, week: 3 }, { x: 150, y: 80, score: 67, week: 4 }, 
                          { x: 200, y: 70, score: 75, week: 5 }, { x: 250, y: 62, score: 81, week: 6 }, 
                          { x: 300, y: 55, score: 84, week: 7 }
                        ].map((point, i) => (
                          <circle
                            key={i}
                            cx={point.x}
                            cy={point.y}
                            r="3"
                            fill="#8B5CF6"
                            stroke="#FFFFFF"
                            strokeWidth="2"
                            className="cursor-pointer hover:r-4 transition-all"
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect()
                              setTooltip({
                                show: true,
                                x: rect.left + window.scrollX,
                                y: rect.top + window.scrollY - 10,
                                content: t('reports.weekTooltip', { week: point.week, score: point.score })
                              })
                            }}
                          />
                        ))}
                      </svg>
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>{t('common.completed')}: 6/7</span>
                        <span className="text-green-600">+5% {t('reports.thisWeek')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Projects */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                        <h5 className="font-semibold text-gray-900">{t('sessions.project')}</h5>
                      </div>
                      <span className="text-lg font-bold text-orange-600">91%</span>
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
                          <linearGradient id="smallOrangeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" style={{ stopColor: '#F97316', stopOpacity: 0.2 }} />
                            <stop offset="100%" style={{ stopColor: '#F97316', stopOpacity: 0 }} />
                          </linearGradient>
                        </defs>
                        <path
                          d="M 0 95 L 50 90 L 100 82 L 150 72 L 200 60 L 250 52 L 300 45"
                          stroke="#F97316"
                          strokeWidth="3"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M 0 95 L 50 90 L 100 82 L 150 72 L 200 60 L 250 52 L 300 45 L 300 120 L 0 120 Z"
                          fill="url(#smallOrangeGradient)"
                        />
                        {[
                          { x: 0, y: 95, score: 56, week: 1 }, { x: 50, y: 90, score: 58, week: 2 }, 
                          { x: 100, y: 82, score: 64, week: 3 }, { x: 150, y: 72, score: 72, week: 4 }, 
                          { x: 200, y: 60, score: 83, week: 5 }, { x: 250, y: 52, score: 87, week: 6 }, 
                          { x: 300, y: 45, score: 90, week: 7 }
                        ].map((point, i) => (
                          <circle
                            key={i}
                            cx={point.x}
                            cy={point.y}
                            r="3"
                            fill="#F97316"
                            stroke="#FFFFFF"
                            strokeWidth="2"
                            className="cursor-pointer hover:r-4 transition-all"
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect()
                              setTooltip({
                                show: true,
                                x: rect.left + window.scrollX,
                                y: rect.top + window.scrollY - 10,
                                content: t('reports.weekTooltip', { week: point.week, score: point.score })
                              })
                            }}
                          />
                        ))}
                      </svg>
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>{t('common.completed')}: 3/3</span>
                        <span className="text-green-600">+1% {t('reports.thisWeek')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Student Percentile */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-6">{t('reports.classPercentileRanking')}</h4>
                  
                  {(() => {
                    // Dynamic bell curve position calculator
                    const calculateBellCurvePosition = (percentile: number) => {
                      // Convert percentile (0-100) to x position (20-280 range)
                      const minX = 20
                      const maxX = 280
                      const x = minX + (percentile / 100) * (maxX - minX)
                      
                      // Bell curve equation: symmetric around x=150 (center)
                      // Using the curve path: M 20 65 Q 50 25, 90 30 Q 130 35, 150 20 Q 170 35, 210 30 Q 250 25, 280 65
                      const center = 150
                      const peakY = 20
                      const baseY = 65
                      
                      // Calculate y position on the bell curve
                      const normalizedX = (x - center) / (maxX - center) // -1 to 1 range
                      const bellValue = Math.exp(-2 * normalizedX * normalizedX) // Gaussian-like curve
                      const y = baseY - (baseY - peakY) * bellValue
                      
                      return { x: Math.round(x), y: Math.round(y) }
                    }
                    
                    // Subject data with percentiles
                    const subjects = [
                      { name: t('reports.mathematics'), percentile: 85, grade: 'A-', color: '#3B82F6', darkColor: '#1D4ED8', gradientId: 'mathCurveGradient' },
                      { name: t('reports.science'), percentile: 92, grade: 'A', color: '#10B981', darkColor: '#059669', gradientId: 'scienceCurveGradient' },
                      { name: t('reports.english'), percentile: 78, grade: 'B+', color: '#8B5CF6', darkColor: '#7C3AED', gradientId: 'englishCurveGradient' },
                      { name: t('reports.history'), percentile: 71, grade: 'B', color: '#F97316', darkColor: '#EA580C', gradientId: 'historyCurveGradient' }
                    ]
                    
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {subjects.map((subject) => {
                          const position = calculateBellCurvePosition(subject.percentile)
                          
                          return (
                            <div key={subject.name} className="space-y-4">
                              <div className="flex items-center justify-between">
                                <h5 className="text-base font-semibold text-gray-800">{subject.name}</h5>
                                <div className="text-right">
                                  <div className="text-sm font-bold" style={{ color: subject.darkColor }}>
                                    {subject.percentile}{t('reports.percentile')}
                                  </div>
                                  <div className="text-xs text-gray-500">{t('reports.grade')} {subject.grade}</div>
                                </div>
                              </div>
                              
                              <div className="relative h-24">
                                <svg width="100%" height="100%" viewBox="0 0 300 80" className="overflow-visible">
                                  <defs>
                                    <linearGradient id={subject.gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                                      <stop offset="0%" style={{ stopColor: subject.color, stopOpacity: 0.3 }} />
                                      <stop offset="100%" style={{ stopColor: subject.color, stopOpacity: 0.1 }} />
                                    </linearGradient>
                                  </defs>
                                  
                                  {/* Bell curve */}
                                  <path
                                    d="M 20 65 Q 50 25, 90 30 Q 130 35, 150 20 Q 170 35, 210 30 Q 250 25, 280 65"
                                    stroke={subject.color}
                                    strokeWidth="2"
                                    fill={`url(#${subject.gradientId})`}
                                    strokeLinecap="round"
                                  />
                                  
                                  {/* Student position marker - dynamically positioned */}
                                  <line
                                    x1={position.x}
                                    y1="15"
                                    x2={position.x}
                                    y2={position.y}
                                    stroke={subject.darkColor}
                                    strokeWidth="2"
                                    strokeDasharray="3,3"
                                  />
                                  <circle
                                    cx={position.x}
                                    cy={position.y}
                                    r="4"
                                    fill={subject.darkColor}
                                    stroke="#FFFFFF"
                                    strokeWidth="2"
                                  />
                                  
                                  {/* Percentile markers */}
                                  <text x="72" y="75" className="text-[8px] fill-gray-400" textAnchor="middle">25</text>
                                  <text x="150" y="75" className="text-[8px] fill-gray-400" textAnchor="middle">50</text>
                                  <text x="228" y="75" className="text-[8px] fill-gray-400" textAnchor="middle">75</text>
                                  <text x={position.x} y="10" className="text-[10px] font-semibold" style={{ fill: subject.darkColor }} textAnchor="middle">{t('reports.you')}</text>
                                </svg>
                              </div>
                              
                              <div className="text-xs text-gray-600 text-center">
                                {t('reports.betterThan', { percentage: subject.percentile })}
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
                        <span className="font-semibold text-gray-900">{t('reports.topPercentage')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI/Manual Feedback */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    {formData.ai_feedback_enabled ? (
                      <>
                        <Bot className="w-5 h-5 text-blue-600" />
                        <h4 className="text-lg font-semibold text-gray-900">{t('reports.aiGeneratedInsights')}</h4>
                      </>
                    ) : (
                      <>
                        <BookOpen className="w-5 h-5 text-gray-600" />
                        <h4 className="text-lg font-semibold text-gray-900">{t('reports.instructorFeedback')}</h4>
                      </>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    {formData.ai_feedback_enabled ? (
                      <>
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                          <h5 className="font-semibold text-blue-900 mb-2">{t('reports.strengths')}</h5>
                          <ul className="text-blue-800 space-y-1 text-sm">
                            <li>• Consistently demonstrates strong analytical thinking in mathematics</li>
                            <li>• Shows excellent improvement in scientific reasoning over the report period</li>
                            <li>• Actively participates in class discussions and group activities</li>
                          </ul>
                        </div>
                        
                        <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                          <h5 className="font-semibold text-amber-900 mb-2">{t('reports.areasForGrowth')}</h5>
                          <ul className="text-amber-800 space-y-1 text-sm">
                            <li>• Could benefit from more consistent submission of written assignments</li>
                            <li>• Consider spending more time on reading comprehension exercises</li>
                            <li>• Time management during exams could be improved</li>
                          </ul>
                        </div>
                        
                        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                          <h5 className="font-semibold text-green-900 mb-2">{t('reports.recommendations')}</h5>
                          <ul className="text-green-800 space-y-1 text-sm">
                            <li>• Continue current study patterns for mathematics and science</li>
                            <li>• Implement daily reading practice for 20-30 minutes</li>
                            <li>• Practice timed exercises to improve exam performance</li>
                          </ul>
                        </div>
                      </>
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="text-gray-700 text-sm leading-relaxed">
                          {manualFeedback || 'No manual feedback has been provided for this report period. The instructor may add personalized comments and recommendations here.'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end p-6 pt-4 border-t border-gray-200">
              <Button 
                variant="outline" 
                onClick={() => setShowPreviewModal(false)}
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