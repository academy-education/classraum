"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Calendar,
  Plus,
  Edit,
  Trash2,
  Clock,
  Users,
  BookOpen,
  GraduationCap,
  Building,
  X,
  Search,
  CheckCircle,
  FileText
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

interface Assignment {
  id: string
  classroom_session_id: string
  classroom_name?: string
  classroom_color?: string
  teacher_name?: string
  session_date?: string
  session_time?: string
  title: string
  description?: string
  assignment_type: 'quiz' | 'homework' | 'test' | 'project'
  due_date?: string
  assignment_categories_id?: string
  category_name?: string
  created_at: string
  updated_at: string
  student_count?: number
  submitted_count?: number
}

interface AssignmentsPageProps {
  academyId: string
  filterSessionId?: string
}


interface AssignmentCategory {
  id: string
  name: string
}

interface Session {
  id: string
  classroom_name: string
  date: string
  start_time: string
  end_time: string
}

interface SubmissionGrade {
  id: string
  assignment_id: string
  student_id: string
  student_name: string
  status: 'pending' | 'submitted' | 'late' | 'graded'
  score?: number
  feedback?: string
  submitted_date?: string
  created_at?: string
  updated_at?: string
}

interface RawSubmissionGrade {
  id: string
  assignment_id: string
  student_id: string
  status: 'pending' | 'submitted' | 'late' | 'graded'
  score?: number
  feedback?: string
  submitted_date?: string
  created_at?: string
  updated_at?: string
  students?: {
    users?: {
      name: string
    }
  }
}

export function AssignmentsPage({ academyId, filterSessionId }: AssignmentsPageProps) {
  const { t, language, loading: translationLoading } = useTranslation()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false)
  const [assignmentToDelete, setAssignmentToDelete] = useState<Assignment | null>(null)
  const [viewingAssignment, setViewingAssignment] = useState<Assignment | null>(null)
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null)
  const [submissionsAssignment, setSubmissionsAssignment] = useState<Assignment | null>(null)
  const [submissionGrades, setSubmissionGrades] = useState<SubmissionGrade[]>([])
  const [assignmentSearchQuery, setAssignmentSearchQuery] = useState('')
  
  const [sessions, setSessions] = useState<Session[]>([])
  const [assignmentCategories, setAssignmentCategories] = useState<AssignmentCategory[]>([])
  const [assignmentGrades, setAssignmentGrades] = useState<SubmissionGrade[]>([])
  const [activeDatePicker, setActiveDatePicker] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    classroom_session_id: '',
    title: '',
    description: '',
    assignment_type: 'homework' as 'quiz' | 'homework' | 'test' | 'project',
    due_date: '',
    assignment_categories_id: ''
  })

  const fetchAssignments = useCallback(async () => {
    try {
      setLoading(true)
      // Get assignments with session and classroom details
      const { data, error } = await supabase
        .from('assignments')
        .select(`
          *,
          classroom_sessions!inner(
            id,
            date,
            start_time,
            end_time,
            classrooms!inner(
              id,
              name,
              color,
              teachers!inner(
                users!inner(name)
              )
            )
          ),
          assignment_categories(name)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching assignments:', error)
        setAssignments([])
        setLoading(false)
        return
      }
      
      if (!data || data.length === 0) {
        setAssignments([])
        setLoading(false)
        return
      }
      
      // Process assignments data
      const assignmentsWithDetails = await Promise.all(
        data.map(async (assignment) => {
          const session = assignment.classroom_sessions
          const classroom = session?.classrooms
          const teacher = classroom?.teachers?.users
          
          // Get student counts
          const { count: studentCount } = await supabase
            .from('classroom_students')
            .select('student_id', { count: 'exact', head: true })
            .eq('classroom_id', classroom?.id)

          // Get submission counts
          const { count: submittedCount } = await supabase
            .from('assignment_grades')
            .select('id', { count: 'exact', head: true })
            .eq('assignment_id', assignment.id)
            .in('status', ['submitted', 'graded'])
          
          return {
            ...assignment,
            classroom_name: classroom?.name || 'Unknown Classroom',
            classroom_color: classroom?.color || '#6B7280',
            teacher_name: teacher?.name || 'Unknown Teacher',
            session_date: session?.date,
            session_time: `${session?.start_time} - ${session?.end_time}`,
            category_name: assignment.assignment_categories?.name,
            student_count: studentCount || 0,
            submitted_count: submittedCount || 0
          }
        })
      )
      
      setAssignments(assignmentsWithDetails)
      setLoading(false)
    } catch (error: unknown) {
      console.error('Error fetching assignments:', error)
      setAssignments([])
      setLoading(false)
    }
  }, [])


  const fetchSessions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('classroom_sessions')
        .select(`
          id,
          date,
          start_time,
          end_time,
          classrooms!inner(name)
        `)
        .is('deleted_at', null)
        .gte('date', new Date().toISOString().split('T')[0]) // Only future/current sessions
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })

      if (error) {
        console.error('Error fetching sessions:', error)
        return
      }

      const sessionsData = data?.map(session => {
        let classroomName = 'Unknown Classroom';
        if (session.classrooms) {
          if (Array.isArray(session.classrooms)) {
            classroomName = session.classrooms[0]?.name || 'Unknown Classroom';
          } else if (typeof session.classrooms === 'object' && 'name' in session.classrooms) {
            classroomName = (session.classrooms as { name: string }).name;
          }
        }
        return {
        id: session.id,
          classroom_name: classroomName,
        date: session.date,
        start_time: session.start_time,
        end_time: session.end_time
        };
      }) || []

      setSessions(sessionsData)
    } catch (error: unknown) {
      console.error('Error fetching sessions:', error)
    }
  }, [])

  const fetchAssignmentCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('assignment_categories')
        .select('id, name')
        .eq('academy_id', academyId)
        .order('name')

      if (error) {
        console.error('Error fetching assignment categories:', error)
        return
      }

      setAssignmentCategories(data || [])
    } catch (error: unknown) {
      console.error('Error fetching assignment categories:', error)
      setAssignmentCategories([])
    }
  }, [academyId])

  useEffect(() => {
    fetchAssignments()
    fetchSessions()
    fetchAssignmentCategories()
  }, [fetchAssignments, fetchSessions, fetchAssignmentCategories])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (editingAssignment) {
        // Update existing assignment
        const { error } = await supabase
          .from('assignments')
          .update({
            title: formData.title,
            description: formData.description || null,
            assignment_type: formData.assignment_type,
            due_date: formData.due_date || null,
            assignment_categories_id: formData.assignment_categories_id || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingAssignment.id)

        if (error) {
          alert('Error updating assignment: ' + (error as Error).message)
          return
        }

        alert('Assignment updated successfully!')
      } else {
        // Create new assignment
        const { data: assignmentData, error } = await supabase
          .from('assignments')
          .insert({
            classroom_session_id: formData.classroom_session_id,
            title: formData.title,
            description: formData.description || null,
            assignment_type: formData.assignment_type,
            due_date: formData.due_date || null,
            assignment_categories_id: formData.assignment_categories_id || null
          })
          .select()
          .single()

        if (error) {
          alert('Error creating assignment: ' + (error as Error).message)
          return
        }

        // Create assignment grades for all students in the classroom
        if (assignmentData) {
          // Get classroom from session
          const { data: sessionData } = await supabase
            .from('classroom_sessions')
            .select('classroom_id')
            .eq('id', formData.classroom_session_id)
            .single()

          if (sessionData) {
            // Get all students in the classroom
            const { data: enrollmentData } = await supabase
              .from('classroom_students')
              .select('student_id')
              .eq('classroom_id', sessionData.classroom_id)

            if (enrollmentData && enrollmentData.length > 0) {
              try {
                // Check if grades already exist for this assignment to prevent duplicates
                const { data: existingGrades } = await supabase
                  .from('assignment_grades')
                  .select('student_id')
                  .eq('assignment_id', assignmentData.id)
                
                // Filter out students who already have grades
                const existingStudentIds = new Set(existingGrades?.map(g => g.student_id) || [])
                const filteredEnrollments = enrollmentData.filter(enrollment => 
                  !existingStudentIds.has(enrollment.student_id)
                )
                
                if (filteredEnrollments.length > 0) {
                  const gradeRecords = filteredEnrollments.map(enrollment => ({
                    assignment_id: assignmentData.id,
                    student_id: enrollment.student_id,
                    status: 'pending'
                  }))

                  const { error: gradeError } = await supabase
                    .from('assignment_grades')
                    .insert(gradeRecords)

                  if (gradeError) {
                    console.error('Error creating assignment grades:', {
                      error: gradeError,
                      message: (gradeError as Error).message
                    })
                    console.error('Grade records that failed:', gradeRecords)
                  } else {
                    console.log(`Successfully created ${gradeRecords.length} assignment grade records`)
                  }
                } else {
                  console.log('All assignment grades already exist for this assignment')
                }
              } catch (gradeCreationError: unknown) {
                console.error('Unexpected error during grade creation:', gradeCreationError)
              }
            }
          }
        }

        alert('Assignment created successfully!')
      }

      // Refresh assignments and reset form
      await fetchAssignments()
      setShowModal(false)
      resetForm()

    } catch (error: unknown) {
      alert('An unexpected error occurred: ' + ((error as Error).message))
    }
  }

  const resetForm = () => {
    setFormData({
      classroom_session_id: '',
      title: '',
      description: '',
      assignment_type: 'homework',
      due_date: '',
      assignment_categories_id: ''
    })
    setEditingAssignment(null)
  }

  const handleEditClick = async (assignment: Assignment) => {
    setEditingAssignment(assignment)
    setFormData({
      classroom_session_id: assignment.classroom_session_id,
      title: assignment.title,
      description: assignment.description || '',
      assignment_type: assignment.assignment_type,
      due_date: assignment.due_date || '',
      assignment_categories_id: assignment.assignment_categories_id || ''
    })
    setShowModal(true)
  }

  const handleDeleteClick = (assignment: Assignment) => {
    setAssignmentToDelete(assignment)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!assignmentToDelete) return

    try {
      const { error } = await supabase
        .from('assignments')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', assignmentToDelete.id)

      if (error) {
        alert('Error deleting assignment: ' + (error as Error).message)
        return
      }

      setAssignments(prev => prev.filter(a => a.id !== assignmentToDelete.id))
      setShowDeleteModal(false)
      setAssignmentToDelete(null)
      
      alert('Assignment deleted successfully!')

    } catch (error: unknown) {
      alert('An unexpected error occurred: ' + ((error as Error).message))
    }
  }

  const handleViewDetails = async (assignment: Assignment) => {
    setViewingAssignment(assignment)
    
    // Fetch assignment grades for this assignment
    const { data: grades, error } = await supabase
      .from('assignment_grades')
      .select(`
        id,
        assignment_id,
        student_id,
        status,
        score,
        feedback,
        submitted_date,
        created_at,
        updated_at,
        students!inner(
          users!inner(name)
        )
      `)
      .eq('assignment_id', assignment.id)

    if (error) {
      console.error('Error fetching assignment grades for view:', error)
      setAssignmentGrades([])
    } else {
      console.log('Fetched grades for view:', grades)
      // Map grades to SubmissionGrade[]
      const formattedGrades = (grades || []).map((grade: RawSubmissionGrade) => ({
        id: grade.id,
        assignment_id: grade.assignment_id,
        student_id: grade.student_id,
        student_name: grade.students?.users?.name || 'Unknown Student',
        status: grade.status,
        score: grade.score,
        feedback: grade.feedback,
        submitted_date: grade.submitted_date,
        created_at: grade.created_at,
        updated_at: grade.updated_at
      }))
      setAssignmentGrades(formattedGrades)
    }
    
    setShowViewModal(true)
  }

  const handleUpdateSubmissions = async (assignment: Assignment) => {
    setSubmissionsAssignment(assignment)
    
    try {
      console.log('Fetching assignment grades for assignment:', assignment.id)
      
      // Fetch assignment grades with student names for editing
      const { data: grades, error } = await supabase
        .from('assignment_grades')
        .select(`
          id,
          assignment_id,
          student_id,
          status,
          score,
          feedback,
          submitted_date,
          created_at,
          updated_at,
          students!inner(
            users!inner(name)
          )
        `)
        .eq('assignment_id', assignment.id)

      if (error) {
        console.error('Error fetching assignment grades:', error)
        alert('Failed to load assignment grades')
        return
      }

      console.log('Fetched grades:', grades)
      
      // Format the data for the submissions modal
      const formattedGrades = grades?.map(grade => ({
        id: grade.id,
        assignment_id: grade.assignment_id,
        student_id: grade.student_id,
        student_name: grade.students?.users?.name || 'Unknown Student',
        status: grade.status,
        score: grade.score,
        feedback: grade.feedback,
        submitted_date: grade.submitted_date,
        created_at: grade.created_at,
        updated_at: grade.updated_at
      })) || []
      
      console.log('Formatted grades:', formattedGrades)
      setSubmissionGrades(formattedGrades)
      setShowSubmissionsModal(true)
    } catch (error: unknown) {
      console.error('Unexpected error:', error)
      alert('An unexpected error occurred while loading assignment grades')
    }
  }

  const updateSubmissionGrade = (gradeId: string, field: keyof SubmissionGrade, value: string | number | null) => {
    setSubmissionGrades(prev => prev.map(grade => 
      grade.id === gradeId ? { ...grade, [field]: value } : grade
    ))
  }

  const saveSubmissionGrades = async () => {
    try {
      console.log('Saving submission grades:', submissionGrades)
      
      // Test with a simple update first to avoid timeout issues
      let successCount = 0
      
      for (const grade of submissionGrades) {
        try {
          console.log(`Updating grade ${grade.id}...`)
          
          // Prepare update data, excluding null values that might cause issues
          const updateData: Partial<SubmissionGrade> = {
            status: grade.status,
            updated_at: new Date().toISOString()
          }
          
          // Only include fields that have values
          if (grade.score !== null && grade.score !== undefined) {
            updateData.score = grade.score
          }
          if (grade.feedback) {
            updateData.feedback = grade.feedback
          }
          if (grade.submitted_date) {
            updateData.submitted_date = grade.submitted_date
          }
          
          console.log(`Update data for ${grade.id}:`, updateData)
          
          const { error, data } = await supabase
            .from('assignment_grades')
            .update(updateData)
            .eq('id', grade.id)
            .select()

          if (error) {
            console.error(`Error updating grade ${grade.id}:`, error)
            throw error
          }
          
          console.log(`Successfully updated grade ${grade.id}:`, data)
          successCount++
          
        } catch (gradeError: unknown) {
          console.error(`Failed to update grade ${grade.id}:`, gradeError)
          alert(`Failed to update grade for ${grade.student_name}: ${(gradeError as Error)?.message || 'Unknown error'}`)
          return // Stop on first error
        }
      }
      
      console.log(`Successfully updated ${successCount} grades`)
      alert('Submission grades updated successfully!')
      setShowSubmissionsModal(false)
      await fetchAssignments() // Refresh to update counts
      
    } catch (error: unknown) {
      console.error('Error updating submission grades:', error)
      alert('Failed to update submission grades: ' + ((error as Error)?.message || 'Unknown error'))
    }
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
  }, [language, translationLoading])

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'quiz':
        return <CheckCircle className="w-4 h-4 text-blue-500" />
      case 'test':
        return <FileText className="w-4 h-4 text-purple-500" />
      case 'project':
        return <Building className="w-4 h-4 text-green-500" />
      default:
        return <BookOpen className="w-4 h-4 text-orange-500" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'quiz':
        return 'bg-blue-100 text-blue-800'
      case 'test':
        return 'bg-purple-100 text-purple-800'
      case 'project':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-orange-100 text-orange-800'
    }
  }

  // Filter assignments based on search query and session filter
  const filteredAssignments = assignments.filter(assignment => {
    // Apply session filter if provided
    if (filterSessionId && assignment.classroom_session_id !== filterSessionId) {
      return false
    }
    
    // Apply search filter
    if (!assignmentSearchQuery) return true
    
    return (
      assignment.title.toLowerCase().includes(assignmentSearchQuery.toLowerCase()) ||
      assignment.classroom_name?.toLowerCase().includes(assignmentSearchQuery.toLowerCase()) ||
      assignment.teacher_name?.toLowerCase().includes(assignmentSearchQuery.toLowerCase()) ||
      assignment.assignment_type.toLowerCase().includes(assignmentSearchQuery.toLowerCase()) ||
      assignment.category_name?.toLowerCase().includes(assignmentSearchQuery.toLowerCase())
    )
  })

  const DatePickerComponent = ({ 
    value, 
    onChange, 
    fieldId 
  }: { 
    value: string
    onChange: (value: string) => void
    fieldId: string
  }) => {
    const isOpen = activeDatePicker === fieldId
    const datePickerRef = useRef<HTMLDivElement>(null)
    
    const currentDate = value ? new Date(value) : new Date()
    const today = new Date()
    
    // Get current month and year for navigation
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
    }, [isOpen])

    const formatDisplayDate = (dateString: string) => {
      if (!dateString) return t('assignments.selectDate')
      const locale = language === 'korean' ? 'ko-KR' : 'en-US'
      return new Date(dateString).toLocaleDateString(locale, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }

    const getDaysInMonth = (month: number, year: number) => {
      return new Date(year, month + 1, 0).getDate()
    }

    const getFirstDayOfMonth = (month: number, year: number) => {
      return new Date(year, month, 1).getDay()
    }

    const selectDate = (day: number) => {
      const selectedDate = new Date(viewYear, viewMonth, day)
      const dateString = selectedDate.toISOString().split('T')[0]
      onChange(dateString)
      setActiveDatePicker(null)
    }

    const navigateMonth = (direction: number) => {
      let newMonth = viewMonth + direction
      let newYear = viewYear

      if (newMonth < 0) {
        newMonth = 11
        newYear -= 1
      } else if (newMonth > 11) {
        newMonth = 0
        newYear += 1
      }

      setViewMonth(newMonth)
      setViewYear(newYear)
    }

    const monthNames = [
      t('assignments.months.january'), t('assignments.months.february'), t('assignments.months.march'), 
      t('assignments.months.april'), t('assignments.months.may'), t('assignments.months.june'),
      t('assignments.months.july'), t('assignments.months.august'), t('assignments.months.september'), 
      t('assignments.months.october'), t('assignments.months.november'), t('assignments.months.december')
    ]

    const dayNames = [
      t('assignments.days.sun'), t('assignments.days.mon'), t('assignments.days.tue'), 
      t('assignments.days.wed'), t('assignments.days.thu'), t('assignments.days.fri'), t('assignments.days.sat')
    ]

    const daysInMonth = getDaysInMonth(viewMonth, viewYear)
    const firstDay = getFirstDayOfMonth(viewMonth, viewYear)
    const selectedDate = value ? new Date(value) : null

    return (
      <div className="relative" ref={datePickerRef}>
        <button
          type="button"
          onClick={() => setActiveDatePicker(isOpen ? null : fieldId)}
          className={`w-full h-10 px-3 py-2 text-left text-sm bg-white border rounded-lg focus:outline-none ${
            isOpen ? 'border-primary' : 'border-border focus:border-primary'
          }`}
        >
          {formatDisplayDate(value)}
        </button>
        
        {isOpen && (
          <div className="absolute top-full z-50 mt-1 bg-white border border-border rounded-lg shadow-lg p-4 w-80 left-0">
            {/* Header with month/year navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => navigateMonth(-1)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <div className="font-medium text-gray-900">
                {monthNames[viewMonth]} {viewYear}
              </div>
              
              <button
                type="button"
                onClick={() => navigateMonth(1)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Day names header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {dayNames.map(day => (
                <div key={day} className="text-xs text-gray-500 text-center py-1 font-medium">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for days before the first day of the month */}
              {Array.from({ length: firstDay }, (_, i) => (
                <div key={`empty-${i}`} className="h-8"></div>
              ))}
              
              {/* Days of the month */}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1
                const isSelected = selectedDate && 
                  selectedDate.getDate() === day && 
                  selectedDate.getMonth() === viewMonth && 
                  selectedDate.getFullYear() === viewYear
                const isToday = today.getDate() === day && 
                  today.getMonth() === viewMonth && 
                  today.getFullYear() === viewYear

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => selectDate(day)}
                    className={`h-8 w-8 text-sm rounded hover:bg-gray-100 flex items-center justify-center ${
                      isSelected 
                        ? 'bg-blue-50 text-blue-600 font-medium' 
                        : isToday 
                        ? 'bg-gray-100 font-medium' 
                        : ''
                    }`}
                  >
                    {day}
                  </button>
                )
              })}
            </div>

            {/* Today button */}
            <div className="mt-3 pt-3 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  const todayString = today.toISOString().split('T')[0]
                  onChange(todayString)
                  setActiveDatePicker(null)
                }}
                className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {t("assignments.today")}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  const AssignmentSkeleton = () => (
    <Card className="p-6 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 bg-gray-200 rounded-full"></div>
          <div>
            <div className="h-6 bg-gray-200 rounded w-32 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-24"></div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-8 h-8 bg-gray-200 rounded"></div>
          <div className="w-8 h-8 bg-gray-200 rounded"></div>
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-28"></div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-24"></div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-20"></div>
        </div>
        
        <div className="h-6 bg-gray-200 rounded-full w-20"></div>
        
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-32"></div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-24"></div>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
        <div className="w-full h-9 bg-gray-200 rounded"></div>
        <div className="w-full h-9 bg-gray-200 rounded"></div>
      </div>
    </Card>
  )

  if (loading || translationLoading) {
    return (
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t("assignments.title")}</h1>
            <p className="text-gray-500">{t("assignments.description")}</p>
          </div>
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            {t("assignments.addAssignment")}
          </Button>
        </div>
        
        {/* Search Bar Skeleton */}
        <div className="relative mb-4 max-w-md animate-pulse">
          <div className="h-12 bg-gray-200 rounded-lg"></div>
        </div>
        
        {/* Assignments Grid Skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <AssignmentSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("assignments.title")}</h1>
          <p className="text-gray-500">{t("assignments.description")}</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          {t("assignments.addAssignment")}
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <Input
          type="text"
          placeholder={t("assignments.searchPlaceholder")}
          value={assignmentSearchQuery}
          onChange={(e) => setAssignmentSearchQuery(e.target.value)}
          className="h-12 pl-12 rounded-lg border border-border bg-white focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 text-sm shadow-sm"
        />
      </div>

      {/* Assignments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAssignments.map((assignment) => (
          <Card key={assignment.id} className="p-6 hover:shadow-md transition-shadow flex flex-col h-full">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: assignment.classroom_color || '#6B7280' }}
                />
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{assignment.title}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                    <GraduationCap className="w-4 h-4" />
                    <span>{assignment.classroom_name}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="p-1"
                  onClick={() => handleEditClick(assignment)}
                >
                  <Edit className="w-4 h-4 text-gray-500" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="p-1"
                  onClick={() => handleDeleteClick(assignment)}
                >
                  <Trash2 className="w-4 h-4 text-gray-500" />
                </Button>
              </div>
            </div>

            <div className="space-y-3 flex-grow">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="w-4 h-4" />
                <span>{assignment.teacher_name}</span>
              </div>

              {assignment.session_date && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(assignment.session_date)}</span>
                </div>
              )}

              {assignment.due_date && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>{t("assignments.due")}: {formatDate(assignment.due_date)}</span>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                {getTypeIcon(assignment.assignment_type)}
                <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getTypeColor(assignment.assignment_type)}`}>
                  {t(`assignments.${assignment.assignment_type}`)}
                </span>
              </div>

              {assignment.category_name && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <BookOpen className="w-4 h-4" />
                  <span>{assignment.category_name}</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FileText className="w-4 h-4" />
                <span>{assignment.submitted_count || 0}/{assignment.student_count || 0} {t("assignments.submitted")}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
              <Button 
                variant="outline" 
                className="w-full text-sm"
                onClick={() => handleViewDetails(assignment)}
              >
                {t("assignments.viewDetails")}
              </Button>
              <Button 
                className="w-full text-sm"
                onClick={() => handleUpdateSubmissions(assignment)}
              >
                {t("assignments.updateSubmissions")}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredAssignments.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t("assignments.noAssignmentsFound")}</h3>
          <p className="text-gray-600 mb-4">
            {assignmentSearchQuery ? t("assignments.tryAdjustingSearch") : t("assignments.getStartedFirstAssignment")}
          </p>
          {!assignmentSearchQuery && (
            <Button onClick={() => setShowModal(true)} className="flex items-center gap-2 mx-auto">
              <Plus className="w-4 h-4" />
              {t("assignments.addAssignment")}
            </Button>
          )}
        </div>
      )}

      {/* Add/Edit Assignment Modal */}
      {showModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-border w-full max-w-md mx-4 max-h-[90vh] shadow-lg flex flex-col">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingAssignment ? t("assignments.editAssignment") : t("assignments.addNewAssignment")}
              </h2>
              <Button 
                variant="ghost" 
                size="sm" 
                className="p-1"
                onClick={() => {
                  setShowModal(false)
                  resetForm()
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 pt-4">
              <form id="assignment-form" onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">
                    {t("assignments.titleRequired").replace(' *', '')} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder={t("assignments.enterTitle")}
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">
                    {t("assignments.description")}
                  </Label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full min-h-[2.5rem] px-3 py-2 rounded-lg border border-border bg-transparent focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none resize-none text-sm"
                    placeholder={t("assignments.enterDescription")}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">
                    {t("assignments.typeRequired").replace(' *', '')} <span className="text-red-500">*</span>
                  </Label>
                  <Select 
                    value={formData.assignment_type} 
                    onValueChange={(value: 'quiz' | 'homework' | 'test' | 'project') => 
                      setFormData(prev => ({ ...prev, assignment_type: value }))
                    }
                  >
                    <SelectTrigger className="h-10 bg-white border border-border focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary">
                      <SelectValue placeholder={t("assignments.selectType")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="homework">{t("assignments.homework")}</SelectItem>
                      <SelectItem value="quiz">{t("assignments.quiz")}</SelectItem>
                      <SelectItem value="test">{t("assignments.test")}</SelectItem>
                      <SelectItem value="project">{t("assignments.project")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">
                    {t("assignments.category")}
                  </Label>
                  <Select 
                    value={formData.assignment_categories_id} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, assignment_categories_id: value }))}
                  >
                    <SelectTrigger className="h-10 bg-white border border-border focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary">
                      <SelectValue placeholder={t("assignments.selectCategory")} />
                    </SelectTrigger>
                    <SelectContent>
                      {assignmentCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">
                    {t("assignments.dueDate")}
                  </Label>
                  <DatePickerComponent
                    value={formData.due_date}
                    onChange={(value) => setFormData(prev => ({ ...prev, due_date: value }))}
                    fieldId="due_date"
                  />
                </div>

                {!editingAssignment && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground/80">
                      {t("assignments.sessionRequired").replace(' *', '')} <span className="text-red-500">*</span>
                    </Label>
                    <Select 
                      value={formData.classroom_session_id} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, classroom_session_id: value }))}
                      required
                    >
                      <SelectTrigger className="h-10 bg-white border border-border focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary">
                        <SelectValue placeholder={t("assignments.selectSession")} />
                      </SelectTrigger>
                      <SelectContent>
                        {sessions.length > 0 ? (
                          sessions.map((session) => (
                            <SelectItem key={session.id} value={session.id}>
                              {session.classroom_name} - {formatDate(session.date)} ({session.start_time})
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-sessions" disabled>{t("assignments.noSessionsAvailable")}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </form>
            </div>

            <div className="flex gap-3 p-6 pt-4 border-t border-gray-200">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowModal(false)
                  resetForm()
                }}
                className="flex-1"
              >
                {t("assignments.cancel")}
              </Button>
              <Button 
                type="submit"
                form="assignment-form"
                className="flex-1"
              >
                {editingAssignment ? t("assignments.updateAssignment") : t("assignments.addAssignment")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && assignmentToDelete && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-border w-full max-w-md mx-4 shadow-lg">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{t("assignments.deleteAssignment")}</h2>
              <p className="text-gray-600 mb-6">
                {t("assignments.deleteConfirmMessage")}
              </p>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowDeleteModal(false)
                    setAssignmentToDelete(null)
                  }}
                  className="flex-1"
                >
                  {t("assignments.cancel")}
                </Button>
                <Button 
                  onClick={handleDeleteConfirm}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  {t("assignments.deleteAssignment")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Assignment Details Modal */}
      {showViewModal && viewingAssignment && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-border w-full max-w-6xl mx-4 max-h-[90vh] shadow-lg flex flex-col">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div 
                  className="w-6 h-6 rounded-full" 
                  style={{ backgroundColor: viewingAssignment.classroom_color || '#6B7280' }}
                />
                <h2 className="text-2xl font-bold text-gray-900">{viewingAssignment.title}</h2>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="p-1"
                onClick={() => {
                  setShowViewModal(false)
                  setViewingAssignment(null)
                  setAssignmentGrades([])
                }}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Assignment Info */}
                <div className="space-y-6">
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      {t("assignments.assignmentInformation")}
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <GraduationCap className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600">{t("assignments.classroom")}</p>
                          <p className="font-medium text-gray-900">{viewingAssignment.classroom_name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600">{t("assignments.teacher")}</p>
                          <p className="font-medium text-gray-900">{viewingAssignment.teacher_name}</p>
                        </div>
                      </div>
                      {viewingAssignment.session_date && (
                        <div className="flex items-center gap-3">
                          <Calendar className="w-5 h-5 text-gray-500" />
                          <div>
                            <p className="text-sm text-gray-600">{t("assignments.sessionDate")}</p>
                            <p className="font-medium text-gray-900">{formatDate(viewingAssignment.session_date)}</p>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        {getTypeIcon(viewingAssignment.assignment_type)}
                        <div>
                          <p className="text-sm text-gray-600">{t("assignments.type")}</p>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getTypeColor(viewingAssignment.assignment_type)}`}>
                            {t(`assignments.${viewingAssignment.assignment_type}`)}
                          </span>
                        </div>
                      </div>
                      {viewingAssignment.category_name && (
                        <div className="flex items-center gap-3">
                          <BookOpen className="w-5 h-5 text-gray-500" />
                          <div>
                            <p className="text-sm text-gray-600">{t("assignments.category")}</p>
                            <p className="font-medium text-gray-900">{viewingAssignment.category_name}</p>
                          </div>
                        </div>
                      )}
                      {viewingAssignment.due_date && (
                        <div className="flex items-center gap-3">
                          <Clock className="w-5 h-5 text-gray-500" />
                          <div>
                            <p className="text-sm text-gray-600">{t("assignments.dueDate")}</p>
                            <p className="font-medium text-gray-900">{formatDate(viewingAssignment.due_date)}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>

                  {viewingAssignment.description && (
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">{t("assignments.description")}</h3>
                      <p className="text-gray-700 leading-relaxed">{viewingAssignment.description}</p>
                    </Card>
                  )}
                </div>

                {/* Right Column - Student Submissions */}
                <div className="space-y-6">
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      {t("assignments.studentSubmissions")} ({assignmentGrades.length})
                    </h3>
                    {assignmentGrades.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">{t("assignments.noSubmissionsYet")}</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {assignmentGrades.map((grade) => {
                          const studentName = grade.student_name || 'Unknown Student';
                          const initials = studentName.split(' ').map((n: string) => n[0]).join('').toUpperCase()
                          
                          return (
                          <div key={grade.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                                {initials}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{studentName}</p>
                                {grade.feedback && (
                                  <p className="text-sm text-gray-500">{grade.feedback}</p>
                                )}
                                {grade.submitted_date && (
                                  <p className="text-xs text-gray-400">{t("assignments.submitted")}: {formatDate(grade.submitted_date)}</p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                grade.status === 'submitted' ? 'bg-green-100 text-green-800' :
                                grade.status === 'graded' ? 'bg-blue-100 text-blue-800' :
                                grade.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {t(`assignments.${grade.status}`)}
                              </span>
                              {grade.score !== null && (
                                <p className="text-sm font-medium text-gray-900 mt-1">{grade.score}</p>
                              )}
                            </div>
                          </div>
                        )
                        })}
                        
                      </div>
                    )}
                  </Card>

                  {/* Submission Summary */}
                  {assignmentGrades.length > 0 && (
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">{t("assignments.submissionSummary")}</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <p className="text-2xl font-bold text-green-600">
                            {assignmentGrades.filter(g => g.status === 'submitted').length}
                          </p>
                          <p className="text-sm text-green-700">{t("assignments.submitted")}</p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <p className="text-2xl font-bold text-gray-600">
                            {assignmentGrades.filter(g => g.status === 'pending').length}
                          </p>
                          <p className="text-sm text-gray-700">{t("assignments.pending")}</p>
                        </div>
                        <div className="text-center p-3 bg-yellow-50 rounded-lg">
                          <p className="text-2xl font-bold text-yellow-600">
                            {assignmentGrades.filter(g => g.status === 'late').length}
                          </p>
                          <p className="text-sm text-yellow-700">{t("assignments.late")}</p>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-6 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                {t("assignments.created")}: {formatDate(viewingAssignment.created_at)}
                {viewingAssignment.updated_at !== viewingAssignment.created_at && (
                  <span className="ml-4">
                    {t("assignments.updated")}: {formatDate(viewingAssignment.updated_at)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  onClick={() => {
                    setShowViewModal(false)
                    setViewingAssignment(null)
                    setAssignmentGrades([])
                    handleEditClick(viewingAssignment)
                  }}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  {t("assignments.editAssignment")}
                </Button>
                <Button 
                  onClick={() => {
                    setShowViewModal(false)
                    setViewingAssignment(null)
                    setAssignmentGrades([])
                  }}
                >
                  {t("assignments.close")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submissions Modal */}
      {showSubmissionsModal && submissionsAssignment && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-border w-full max-w-6xl mx-4 max-h-[90vh] shadow-lg flex flex-col">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div 
                  className="w-6 h-6 rounded-full" 
                  style={{ backgroundColor: submissionsAssignment.classroom_color || '#6B7280' }}
                />
                <h2 className="text-2xl font-bold text-gray-900">{t("assignments.updateSubmissions")} - {submissionsAssignment.title}</h2>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="p-1"
                onClick={() => {
                  setShowSubmissionsModal(false)
                  setSubmissionsAssignment(null)
                  setSubmissionGrades([])
                }}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {submissionGrades.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-900 mb-2">{t("assignments.noStudentsFound")}</p>
                    <p className="text-gray-600">{t("assignments.noStudentsEnrolledMessage")}</p>
                  </div>
                ) : (
                  submissionGrades.map((grade) => (
                    <Card key={grade.id} className="p-6">
                      <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 items-start">
                        {/* Student Name */}
                        <div className="lg:col-span-1">
                          <Label className="text-sm font-medium text-gray-700">{grade.student_name}</Label>
                        </div>

                        {/* Status */}
                        <div className="lg:col-span-1">
                          <Label className="text-xs text-gray-500 mb-1 block">{t("assignments.status")}</Label>
                          <Select 
                            value={grade.status} 
                            onValueChange={(value) => updateSubmissionGrade(grade.id, 'status', value)}
                          >
                            <SelectTrigger className="h-9 text-sm bg-white border border-border focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">{t("assignments.pending")}</SelectItem>
                              <SelectItem value="submitted">{t("assignments.submitted")}</SelectItem>
                              <SelectItem value="late">{t("assignments.late")}</SelectItem>
                            </SelectContent>
                          </Select>

                          {/* Submitted Date - Show when status is submitted or late */}
                          {(grade.status === 'submitted' || grade.status === 'late') && (
                            <div className="mt-2">
                              <Label className="text-xs text-gray-500 mb-1 block">{t("assignments.submittedDate")}</Label>
                              <DatePickerComponent
                                value={grade.submitted_date ? grade.submitted_date.split('T')[0] : ''}
                                onChange={(value) => {
                                  const dateValue = value ? new Date(value).toISOString() : null
                                  updateSubmissionGrade(grade.id, 'submitted_date', dateValue)
                                }}
                                fieldId={`submitted-date-${grade.id}`}
                              />
                            </div>
                          )}
                        </div>

                        {/* Score */}
                        <div className="lg:col-span-1">
                          <Label className="text-xs text-gray-500 mb-1 block">{t("assignments.score")}</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={grade.score || ''}
                            onChange={(e) => updateSubmissionGrade(grade.id, 'score', e.target.value ? parseInt(e.target.value) : null)}
                            placeholder="0-100"
                            className="h-9 text-sm"
                          />
                        </div>

                        {/* Feedback */}
                        <div className="lg:col-span-3">
                          <Label className="text-xs text-gray-500 mb-1 block">{t("assignments.feedback")}</Label>
                          <Input
                            value={grade.feedback || ''}
                            onChange={(e) => updateSubmissionGrade(grade.id, 'feedback', e.target.value)}
                            placeholder={t("assignments.teacherFeedback")}
                            className="h-9 text-sm"
                          />
                        </div>
                      </div>

                      {/* Additional Info */}
                      <div className="mt-4 pt-4 border-t border-gray-100 flex gap-6 text-xs text-gray-500">
                        {grade.created_at && (
                          <span>{t("assignments.created")}: {formatDate(grade.created_at)}</span>
                        )}
                        {grade.updated_at && grade.updated_at !== grade.created_at && (
                          <span>{t("assignments.updated")}: {formatDate(grade.updated_at)}</span>
                        )}
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-6 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                {t("assignments.students")} {submissionGrades.length}명
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline"
                  onClick={() => {
                    setShowSubmissionsModal(false)
                    setSubmissionsAssignment(null)
                    setSubmissionGrades([])
                  }}
                >
                  {t("assignments.cancel")}
                </Button>
                <Button 
                  onClick={saveSubmissionGrades}
                >
                  {t("assignments.saveChanges")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}