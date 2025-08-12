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
  MapPin,
  Users,
  BookOpen,
  GraduationCap,
  Monitor,
  Building,
  X,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

interface Session {
  id: string
  classroom_id: string
  classroom_name?: string
  classroom_color?: string
  teacher_name?: string
  status: 'scheduled' | 'completed' | 'cancelled'
  date: string
  start_time: string
  end_time: string
  location: 'offline' | 'online'
  notes?: string
  substitute_teacher?: string
  substitute_teacher_name?: string
  created_at: string
  updated_at: string
  student_count?: number
  assignment_count?: number
}

interface SessionsPageProps {
  academyId: string
  filterClassroomId?: string
  filterDate?: string
  onNavigateToAssignments?: (sessionId: string) => void
  onNavigateToAttendance?: (sessionId: string) => void
}

interface Classroom {
  id: string
  name: string
  color?: string
  teacher_name?: string
}

interface Teacher {
  id: string
  name: string
  user_id: string
}

interface Assignment {
  id: string
  title: string
  description?: string
  assignment_type: 'quiz' | 'homework' | 'test' | 'project'
  due_date?: string
  created_at: string
  category_name?: string
}

interface ModalAssignment {
  id: string
  title: string
  description: string
  assignment_type: 'quiz' | 'homework' | 'test' | 'project'
  due_date: string
  assignment_categories_id: string
}

interface Attendance {
  id: string
  classroom_session_id: string
  student_id: string
  student_name?: string
  status: 'present' | 'absent' | 'excused' | 'late' | 'other'
  note?: string
}

interface Student {
  user_id: string
  name: string
  school_name?: string
}

interface AssignmentCategory {
  id: string
  name: string
  description?: string
  created_at: string
}

export function SessionsPage({ academyId, filterClassroomId, filterDate, onNavigateToAssignments, onNavigateToAttendance }: SessionsPageProps) {
  const { t, language, loading: translationLoading } = useTranslation()
  const [sessions, setSessions] = useState<Session[]>([])
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [sessionToDelete, setSessionToDelete] = useState<Session | null>(null)
  const [editingSession, setEditingSession] = useState<Session | null>(null)
  const [sessionSearchQuery, setSessionSearchQuery] = useState('')
  const [attendanceSearchQuery, setAttendanceSearchQuery] = useState('')
  const [activeTimePicker, setActiveTimePicker] = useState<string | null>(null)
  const [activeDatePicker, setActiveDatePicker] = useState<string | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [viewingSession, setViewingSession] = useState<Session | null>(null)
  const [sessionAssignments, setSessionAssignments] = useState<Assignment[]>([])
  const [sessionAttendance, setSessionAttendance] = useState<Attendance[]>([])
  const [modalAttendance, setModalAttendance] = useState<Attendance[]>([])
  const [modalAssignments, setModalAssignments] = useState<ModalAssignment[]>([])
  const [showAddAttendanceModal, setShowAddAttendanceModal] = useState(false)
  const [availableStudents, setAvailableStudents] = useState<Student[]>([])
  const [assignmentCategories, setAssignmentCategories] = useState<AssignmentCategory[]>([])
  const [formData, setFormData] = useState({
    classroom_id: '',
    status: '' as 'scheduled' | 'completed' | 'cancelled' | '',
    date: '',
    start_time: '09:00',
    end_time: '10:00',
    location: 'offline' as 'offline' | 'online',
    notes: '',
    substitute_teacher: ''
  })
  
  // Force re-render when language changes
  const [, forceUpdate] = useState({})
  useEffect(() => {
    if (!translationLoading) {
      forceUpdate({})
    }
  }, [language, translationLoading])

  // Load students for attendance when classroom is selected (only for new sessions)
  useEffect(() => {
    if (formData.classroom_id && showModal && !editingSession) {
      console.log('useEffect: Loading classroom students for new session')
      loadClassroomStudentsForAttendance(formData.classroom_id)
    }
  }, [formData.classroom_id, showModal, editingSession])

  const fetchSessions = useCallback(async () => {
    try {
      // Get sessions directly - the RLS policies will handle academy filtering
      const { data, error } = await supabase
        .from('classroom_sessions')
        .select('*')
        .is('deleted_at', null)
        .order('date', { ascending: false })
        .order('start_time', { ascending: true })
      
      if (error) {
        console.error('Error fetching sessions:', error)
        setSessions([])
        setLoading(false)
        return
      }
      
      if (!data || data.length === 0) {
        setSessions([])
        setLoading(false)
        return
      }
      
      // Get classroom and teacher details separately to avoid complex JOINs
      const sessionsWithDetails = await Promise.all(
        data.map(async (session) => {
          // Get classroom details
          const { data: classroomData } = await supabase
            .from('classrooms')
            .select('name, color, teacher_id')
            .eq('id', session.classroom_id)
            .single()

          // Get teacher name
          let teacher_name = t('sessions.unknownTeacher')
          if (classroomData?.teacher_id) {
            const { data: teacherData } = await supabase
              .from('users')
              .select('name')
              .eq('id', classroomData.teacher_id)
              .single()
            teacher_name = teacherData?.name || t('sessions.unknownTeacher')
          }

          // Get substitute teacher name if exists
          let substitute_teacher_name = null
          if (session.substitute_teacher) {
            const { data: subTeacherData } = await supabase
              .from('users')
              .select('name')
              .eq('id', session.substitute_teacher)
              .single()
            substitute_teacher_name = subTeacherData?.name || null
          }

          // Get assignment count for this session
          const { count: assignmentCount } = await supabase
            .from('assignments')
            .select('id', { count: 'exact', head: true })
            .eq('classroom_session_id', session.id)
            .is('deleted_at', null)
          
          return {
            ...session,
            classroom_name: classroomData?.name || t('sessions.unknownClassroom'),
            classroom_color: classroomData?.color || '#6B7280',
            teacher_name,
            substitute_teacher_name,
            student_count: 0, // Will be populated later if needed
            assignment_count: assignmentCount || 0
          }
        })
      )
      
      setSessions(sessionsWithDetails)
    } catch (error) {
      console.error('Error loading sessions:', error)
      setSessions([])
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchClassrooms = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('classrooms')
        .select('*')
        .eq('academy_id', academyId)
        .is('deleted_at', null)
        .order('name', { ascending: true })
      
      if (error) {
        console.error('Error fetching classrooms:', error)
        setClassrooms([])
        return
      }
      
      // Get teacher names separately to avoid complex JOINs
      const classroomsWithDetails = await Promise.all(
        (data || []).map(async (classroom) => {
          // Get teacher name
          const { data: teacherData } = await supabase
            .from('users')
            .select('name')
            .eq('id', classroom.teacher_id)
            .single()
          
          return {
            id: classroom.id,
            name: classroom.name,
            color: classroom.color,
            teacher_name: teacherData?.name || t('sessions.unknownTeacher')
          }
        })
      )
      
      setClassrooms(classroomsWithDetails)
    } catch (error) {
      console.error('Error loading classrooms:', error)
      setClassrooms([])
    }
  }, [academyId])

  const fetchTeachers = useCallback(async () => {
    const fallbackTeachers: Teacher[] = [
      { id: '1', name: 'Joy Kim', user_id: '1d9aef65-4989-4f26-be5a-6e021fabb9f2' },
      { id: '2', name: 'Sarah Johnson', user_id: '2e8bf76c-5a90-4f37-bf6b-7f132gccb0f3' },
      { id: '3', name: 'Michael Chen', user_id: '3f9cg87d-6b01-5g48-cg7c-8g243hddca4' }
    ]
    
    try {
      const { data, error } = await supabase
        .from('teachers')
        .select(`
          user_id,
          users!inner(
            id,
            name
          )
        `)
        .eq('academy_id', academyId)
        .eq('active', true)
      
      if (error) {
        setTeachers(fallbackTeachers)
        return
      }
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const teachersData = data?.map((teacher: any) => ({
        id: teacher.users.id,
        name: teacher.users.name,
        user_id: teacher.user_id
      })) || []
      
      setTeachers(teachersData.length > 0 ? teachersData : fallbackTeachers)
    } catch {
      setTeachers(fallbackTeachers)
    }
  }, [academyId])

  const fetchAssignmentCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('assignment_categories')
        .select('id, name')
        .eq('academy_id', academyId)
        .order('name', { ascending: true })
      
      if (error) {
        console.error('Error fetching assignment categories:', error)
        setAssignmentCategories([])
        return
      }
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const categoriesData = data?.map((category: any) => ({
        id: category.id,
        name: category.name,
        created_at: category.created_at || new Date().toISOString()
      })) || []
      setAssignmentCategories(categoriesData)
    } catch (error) {
      console.error('Error loading assignment categories:', error)
      setAssignmentCategories([])
    }
  }, [academyId])

  useEffect(() => {
    fetchSessions()
    fetchClassrooms()
    fetchTeachers()
    fetchAssignmentCategories()
  }, [academyId, fetchSessions, fetchClassrooms, fetchTeachers, fetchAssignmentCategories])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      let currentSessionId: string | null = null
      
      if (editingSession) {
        currentSessionId = editingSession.id
        // Update existing session
        const { error } = await supabase
          .from('classroom_sessions')
          .update({
            classroom_id: formData.classroom_id,
            status: formData.status,
            date: formData.date,
            start_time: formData.start_time,
            end_time: formData.end_time,
            location: formData.location,
            notes: formData.notes || null,
            substitute_teacher: formData.substitute_teacher || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingSession.id)

        if (error) {
          alert('Error updating session: ' + error.message)
          return
        }

        alert('Session updated successfully!')
      } else {
        // Create new session
        const { data: sessionData, error } = await supabase
          .from('classroom_sessions')
          .insert({
            classroom_id: formData.classroom_id,
            status: formData.status || 'scheduled',
            date: formData.date,
            start_time: formData.start_time,
            end_time: formData.end_time,
            location: formData.location,
            notes: formData.notes || null,
            substitute_teacher: formData.substitute_teacher || null
          })
          .select()
          .single()

        if (error) {
          alert('Error creating session: ' + error.message)
          return
        }

        // Auto-create attendance records for all students in the classroom
        if (sessionData) {
          currentSessionId = sessionData.id
          try {
            const { data: enrollmentData } = await supabase
              .from('classroom_students')
              .select('student_id')
              .eq('classroom_id', formData.classroom_id)

            if (enrollmentData && enrollmentData.length > 0) {
              const attendanceRecords = enrollmentData.map(enrollment => ({
                classroom_session_id: currentSessionId,
                student_id: enrollment.student_id,
                status: null,
                note: null
              }))

              const { error: attendanceError } = await supabase
                .from('attendance')
                .insert(attendanceRecords)

              if (attendanceError) {
                console.error('Error creating attendance records:', attendanceError)
              }
            }
          } catch (error) {
            console.error('Error creating attendance records:', error)
          }
        }

        alert('Session created successfully!')
      }

      // Save attendance records
      if (modalAttendance.length > 0) {
        // Delete existing attendance records for this session if editing
        if (editingSession) {
          await supabase
            .from('attendance')
            .delete()
            .eq('classroom_session_id', editingSession.id)
        }

        // Insert new attendance records (only if status is set)
        const attendanceRecords = modalAttendance
          .filter(attendance => attendance.status && attendance.status.trim() !== '')
          .map(attendance => ({
            classroom_session_id: currentSessionId,
            student_id: attendance.student_id,
            status: attendance.status,
            note: attendance.note || null
          }))

        const { error: attendanceError } = await supabase
          .from('attendance')
          .insert(attendanceRecords)

        if (attendanceError) {
          console.error('Error saving attendance:', attendanceError)
        }
      }

      // Save assignment records
      if (modalAssignments.length > 0) {
        // Delete existing assignments for this session if editing
        if (editingSession) {
          // First, delete assignment grades for existing assignments
          const { data: existingAssignments } = await supabase
            .from('assignments')
            .select('id')
            .eq('classroom_session_id', editingSession.id)
            .is('deleted_at', null)

          if (existingAssignments && existingAssignments.length > 0) {
            const assignmentIds = existingAssignments.map(a => a.id)
            await supabase
              .from('assignment_grades')
              .delete()
              .in('assignment_id', assignmentIds)
          }

          // Then soft-delete the assignments
          await supabase
            .from('assignments')
            .update({ deleted_at: new Date().toISOString() })
            .eq('classroom_session_id', editingSession.id)
        }

        // Insert new assignments
        const assignmentRecords = modalAssignments
          .filter(assignment => assignment.title.trim() !== '')
          .map(assignment => ({
            classroom_session_id: currentSessionId,
            title: assignment.title,
            description: assignment.description || null,
            assignment_type: assignment.assignment_type,
            due_date: assignment.due_date || null,
            assignment_categories_id: assignment.assignment_categories_id || null
          }))

        if (assignmentRecords.length > 0) {
          const { data: createdAssignments, error: assignmentError } = await supabase
            .from('assignments')
            .insert(assignmentRecords)
            .select()

          if (assignmentError) {
            console.error('Error saving assignments:', assignmentError)
          } else if (createdAssignments) {
            // Create assignment grades for each student in the classroom
            await createAssignmentGradesForAssignments(createdAssignments, formData.classroom_id)
          }
        }
      }

      // Refresh sessions and reset form
      await fetchSessions()
      setShowModal(false)
      resetForm()

    } catch (error) {
      alert('An unexpected error occurred: ' + (error as Error).message)
    }
  }

  const resetForm = () => {
    setFormData({
      classroom_id: '',
      status: '',
      date: '',
      start_time: '09:00',
      end_time: '10:00',
      location: 'offline',
      notes: '',
      substitute_teacher: ''
    })
    setEditingSession(null)
    setActiveTimePicker(null)
    setActiveDatePicker(null)
    setModalAttendance([])
    setModalAssignments([])
    setAttendanceSearchQuery('')
    setShowAddAttendanceModal(false)
    setAvailableStudents([])
  }

  const handleEditClick = async (session: Session) => {
    setEditingSession(session)
    setFormData({
      classroom_id: session.classroom_id,
      status: session.status,
      date: session.date,
      start_time: session.start_time,
      end_time: session.end_time,
      location: session.location,
      notes: session.notes || '',
      substitute_teacher: session.substitute_teacher || ''
    })

    // Load existing attendance for the session
    try {
      console.log('Loading attendance for session edit:', session.id)
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('id, student_id, status, note')
        .eq('classroom_session_id', session.id)

      if (attendanceError) {
        console.error('Error fetching attendance data:', attendanceError)
        await loadClassroomStudentsForAttendance(session.classroom_id)
        return
      }

      console.log('Found attendance data:', attendanceData)

      if (attendanceData && attendanceData.length > 0) {
        console.log('Processing existing attendance records...')
        const attendanceWithNames = await Promise.all(
          attendanceData.map(async (attendance) => {
            const { data: userData } = await supabase
              .from('users')
              .select('name')
              .eq('id', attendance.student_id)
              .single()
            
            return {
              ...attendance,
              classroom_session_id: session.id,
              student_name: userData?.name || t('sessions.unknownStudent')
            }
          })
        )
        console.log('Setting modal attendance with existing records:', attendanceWithNames)
        setModalAttendance(attendanceWithNames)
        
        // Load available students for the "Add Attendance" popup
        await loadAvailableStudentsForAttendance(session.classroom_id, attendanceData.map(a => a.student_id))
      } else {
        // No attendance exists - keep main attendance list empty, load all students for "Add Attendance" popup
        console.log('No attendance found, keeping main attendance empty and loading all students for Add Attendance popup')
        setModalAttendance([])
        await loadAvailableStudentsForAttendance(session.classroom_id, [])
      }
    } catch (error) {
      console.error('Error loading attendance:', error)
      console.log('Fallback: keeping main attendance empty and loading all students for Add Attendance popup')
      setModalAttendance([])
      await loadAvailableStudentsForAttendance(session.classroom_id, [])
    }

    // Load existing assignments for the session
    try {
      const { data: assignmentData } = await supabase
        .from('assignments')
        .select('id, title, description, assignment_type, due_date, assignment_categories_id')
        .eq('classroom_session_id', session.id)
        .is('deleted_at', null)

      setModalAssignments(assignmentData || [])
    } catch (error) {
      console.error('Error loading assignments:', error)
      setModalAssignments([])
    }

    setShowModal(true)
  }

  const loadClassroomStudentsForAttendance = async (classroomId: string, sessionId?: string) => {
    try {
      console.log('loadClassroomStudentsForAttendance called for classroom:', classroomId)
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('classroom_students')
        .select('student_id')
        .eq('classroom_id', classroomId)

      if (enrollmentError) {
        console.error('Error fetching classroom students:', enrollmentError)
        setModalAttendance([])
        return
      }

      console.log('Found classroom students:', enrollmentData)

      if (enrollmentData && enrollmentData.length > 0) {
        const studentsWithNames = await Promise.all(
          enrollmentData.map(async (enrollment) => {
            const { data: userData } = await supabase
              .from('users')
              .select('name')
              .eq('id', enrollment.student_id)
              .single()
            
            return {
              id: crypto.randomUUID(),
              classroom_session_id: sessionId || '',
              student_id: enrollment.student_id,
              student_name: userData?.name || t('sessions.unknownStudent'),
              status: 'present' as const,
              note: ''
            }
          })
        )
        console.log('Setting modal attendance with classroom students:', studentsWithNames)
        setModalAttendance(studentsWithNames)
      } else {
        console.log('No students found in classroom')
        setModalAttendance([])
      }
    } catch (error) {
      console.error('Error loading classroom students:', error)
      setModalAttendance([])
    }
  }

  const loadAvailableStudentsForAttendance = async (classroomId: string, excludeStudentIds: string[] = []) => {
    try {
      console.log('loadAvailableStudentsForAttendance called for classroom:', classroomId, 'excluding:', excludeStudentIds)
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('classroom_students')
        .select('student_id')
        .eq('classroom_id', classroomId)

      if (enrollmentError) {
        console.error('Error fetching classroom students for available list:', enrollmentError)
        setAvailableStudents([])
        return
      }

      console.log('Found classroom students for available list:', enrollmentData)

      if (enrollmentData && enrollmentData.length > 0) {
        // Filter out students who already have attendance
        const availableEnrollments = enrollmentData.filter(enrollment => 
          !excludeStudentIds.includes(enrollment.student_id)
        )

        const studentsWithNames = await Promise.all(
          availableEnrollments.map(async (enrollment) => {
            const { data: userData } = await supabase
              .from('users')
              .select('name')
              .eq('id', enrollment.student_id)
              .single()
            
            return {
              user_id: enrollment.student_id,
              name: userData?.name || t('sessions.unknownStudent')
            }
          })
        )
        console.log('Setting available students for Add Attendance popup:', studentsWithNames)
        setAvailableStudents(studentsWithNames)
      } else {
        console.log('No students found in classroom for available list')
        setAvailableStudents([])
      }
    } catch (error) {
      console.error('Error loading available students:', error)
      setAvailableStudents([])
    }
  }

  const handleDeleteClick = (session: Session) => {
    setSessionToDelete(session)
    setShowDeleteModal(true)
  }

  const handleViewAssignments = (session: Session) => {
    if (onNavigateToAssignments) {
      onNavigateToAssignments(session.id)
    }
  }

  const handleViewAttendance = (session: Session) => {
    if (onNavigateToAttendance) {
      onNavigateToAttendance(session.id)
    }
  }

  const handleViewDetails = async (session: Session) => {
    setViewingSession(session)
    
    // Load session assignments
    try {
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignments')
        .select('id, title, description, assignment_type, due_date, created_at, assignment_categories_id')
        .eq('classroom_session_id', session.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (assignmentError) {
        console.error('Error fetching session assignments:', assignmentError)
        setSessionAssignments([])
      } else {
        // Handle empty or null data
        if (!assignmentData || assignmentData.length === 0) {
          setSessionAssignments([])
        } else {
          // Get category names separately to avoid complex JOINs
          const formattedAssignments = await Promise.all(
            assignmentData.map(async (assignment) => {
              let category_name = null
              if (assignment.assignment_categories_id) {
                const { data: categoryData } = await supabase
                  .from('assignment_categories')
                  .select('name')
                  .eq('id', assignment.assignment_categories_id)
                  .single()
                category_name = categoryData?.name || null
              }
              
              return {
                id: assignment.id,
                title: assignment.title,
                description: assignment.description,
                assignment_type: assignment.assignment_type,
                due_date: assignment.due_date,
                created_at: assignment.created_at,
                category_name
              }
            })
          )
          setSessionAssignments(formattedAssignments)
        }
      }
    } catch (error) {
      console.error('Error loading session assignments:', error)
      setSessionAssignments([])
    }

    // Load session attendance  
    try {
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('id, student_id, status, note, created_at')
        .eq('classroom_session_id', session.id)
        .order('created_at', { ascending: true })

      if (attendanceError) {
        console.error('Error fetching session attendance:', attendanceError)
        setSessionAttendance([])
      } else {
        // Handle empty or null data
        if (!attendanceData || attendanceData.length === 0) {
          setSessionAttendance([])
        } else {
          // Get student names separately to avoid complex JOINs
          const formattedAttendance = await Promise.all(
            attendanceData.map(async (attendance) => {
              let student_name = t('sessions.unknownStudent')
              if (attendance.student_id) {
                const { data: userData } = await supabase
                  .from('users')
                  .select('name')
                  .eq('id', attendance.student_id)
                  .single()
                student_name = userData?.name || t('sessions.unknownStudent')
              }
              
              return {
                id: attendance.id,
                classroom_session_id: session.id,
                student_id: attendance.student_id,
                student_name,
                status: attendance.status,
                note: attendance.note,
                created_at: attendance.created_at
              }
            })
          )
          setSessionAttendance(formattedAttendance)
        }
      }
    } catch (error) {
      console.error('Error loading session attendance:', error)
      setSessionAttendance([])
    }

    setShowDetailsModal(true)
  }

  const updateAttendanceStatus = (studentId: string, status: Attendance['status']) => {
    setModalAttendance(prev => prev.map(attendance => 
      attendance.student_id === studentId 
        ? { ...attendance, status } 
        : attendance
    ))
  }

  const updateAttendanceNote = (studentId: string, note: string) => {
    setModalAttendance(prev => prev.map(attendance => 
      attendance.student_id === studentId 
        ? { ...attendance, note } 
        : attendance
    ))
  }


  const addAssignment = () => {
    const newAssignment: ModalAssignment = {
      id: crypto.randomUUID(),
      title: '',
      description: '',
      assignment_type: 'homework',
      due_date: '',
      assignment_categories_id: ''
    }
    setModalAssignments(prev => [...prev, newAssignment])
  }

  const updateAssignment = (id: string, field: keyof ModalAssignment, value: string) => {
    setModalAssignments(prev => prev.map(assignment => 
      assignment.id === id ? { ...assignment, [field]: value } : assignment
    ))
  }

  const removeAssignment = (id: string) => {
    setModalAssignments(prev => prev.filter(assignment => assignment.id !== id))
  }

  const loadAvailableStudents = async (classroomId: string) => {
    try {
      console.log('loadAvailableStudents called for Add Attendance popup, classroom:', classroomId)
      
      // Get current student IDs that already have attendance in the modal
      const currentStudentIds = modalAttendance.map(a => a.student_id)
      console.log('Excluding students with existing attendance:', currentStudentIds)
      
      // Use the new function that properly handles exclusions
      await loadAvailableStudentsForAttendance(classroomId, currentStudentIds)
    } catch (error) {
      console.error('Error loading available students:', error)
      setAvailableStudents([])
    }
  }

  const addStudentToAttendance = async (student: Student) => {
    const newAttendance: Attendance = {
      id: crypto.randomUUID(),
      classroom_session_id: editingSession?.id || '',
      student_id: student.user_id,
      student_name: student.name,
      status: 'present',
      note: ''
    }
    
    setModalAttendance(prev => [...prev, newAttendance])
    setAvailableStudents(prev => prev.filter(s => s.user_id !== student.user_id))

    // Create assignment grades for this student for all assignments in this session
    if (editingSession) {
      await createAssignmentGradesForStudent(student.user_id, editingSession.id)
    }
  }

  const createAssignmentGradesForStudent = async (studentId: string, sessionId: string) => {
    try {
      console.log('Creating assignment grades for new student:', studentId, 'in session:', sessionId)
      
      // Get all assignments for this session
      const { data: assignments, error: assignmentsError } = await supabase
        .from('assignments')
        .select('id')
        .eq('classroom_session_id', sessionId)
        .is('deleted_at', null)

      if (assignmentsError) {
        console.error('Error fetching assignments for grade creation:', assignmentsError)
        return
      }

      if (assignments && assignments.length > 0) {
        // Check which assignments do not already have grades for this student
        const { data: existingGrades } = await supabase
          .from('assignment_grades')
          .select('assignment_id')
          .eq('student_id', studentId)
          .in('assignment_id', assignments.map(a => a.id))

        const existingAssignmentIds = new Set(existingGrades?.map(g => g.assignment_id) || [])
        const missingGrades = assignments
          .filter(a => !existingAssignmentIds.has(a.id))
          .map(a => ({
            assignment_id: a.id,
            student_id: studentId,
            status: 'pending'
          }))

        if (missingGrades.length > 0) {
          const { error: gradesError } = await supabase
            .from('assignment_grades')
            .insert(missingGrades)

          if (gradesError) {
            console.error('Error creating assignment grades for new student:', gradesError)
          } else {
            console.log(`✅ Created ${missingGrades.length} assignment grades for new student`)
          }
        }
      }
    } catch (error) {
      console.error('Error in createAssignmentGradesForStudent:', error)
    }
  }

  const createAssignmentGradesForAssignments = async (assignments: ModalAssignment[], classroomId: string) => {
    try {
      console.log('Creating assignment grades for new assignments:', assignments.map(a => a.id))
      
      // Get all students in the classroom
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('classroom_students')
        .select('student_id')
        .eq('classroom_id', classroomId)

      if (enrollmentError) {
        console.error('Error fetching classroom students for grade creation:', enrollmentError)
        return
      }

      if (enrollmentData && enrollmentData.length > 0 && assignments.length > 0) {
        // Create grade records for each assignment and each student
        const gradeRecords = []
        for (const assignment of assignments) {
          for (const enrollment of enrollmentData) {
            gradeRecords.push({
              assignment_id: assignment.id,
              student_id: enrollment.student_id,
              status: 'pending'
            })
          }
        }

        if (gradeRecords.length > 0) {
          // Check for existing grades to prevent duplicates
          const assignmentIds = assignments.map(a => a.id)
          const { data: existingGrades } = await supabase
            .from('assignment_grades')
            .select('assignment_id, student_id')
            .in('assignment_id', assignmentIds)

          const existingKeys = new Set(existingGrades?.map(g => `${g.assignment_id}-${g.student_id}`) || [])
          const filteredGradeRecords = gradeRecords.filter(record => 
            !existingKeys.has(`${record.assignment_id}-${record.student_id}`)
          )

          if (filteredGradeRecords.length > 0) {
            const { error: gradeError } = await supabase
              .from('assignment_grades')
              .insert(filteredGradeRecords)

            if (gradeError) {
              console.error('❌ Assignment grades creation failed for new assignments!')
              console.error('Error code:', gradeError.code)
              console.error('Error message:', gradeError.message)
            } else {
              console.log(`✅ Created ${filteredGradeRecords.length} assignment grades for new assignments`)
            }
          } else {
            console.log('All assignment grades already exist for new assignments')
          }
        }
      }
    } catch (error) {
      console.error('Error in createAssignmentGradesForAssignments:', error)
    }
  }

  const markAllPresent = () => {
    setModalAttendance(prev => prev.map(attendance => ({
      ...attendance,
      status: 'present' as const
    })))
  }

  const handleDeleteConfirm = async () => {
    if (!sessionToDelete) return

    try {
      const { error } = await supabase
        .from('classroom_sessions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', sessionToDelete.id)

      if (error) {
        alert('Error deleting session: ' + error.message)
        return
      }

      setSessions(prev => prev.filter(s => s.id !== sessionToDelete.id))
      setShowDeleteModal(false)
      setSessionToDelete(null)
      
      alert('Session deleted successfully!')

    } catch (error) {
      alert('An unexpected error occurred: ' + (error as Error).message)
    }
  }

  const formatTime = (time: string) => {
    if (!time) return `12:00 ${t('sessions.am')}`
    const [hours, minutes] = time.split(':')
    const hour12 = parseInt(hours) === 0 ? 12 : parseInt(hours) > 12 ? parseInt(hours) - 12 : parseInt(hours)
    const ampm = parseInt(hours) >= 12 ? t('sessions.pm') : t('sessions.am')
    return `${hour12}:${minutes} ${ampm}`
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <AlertCircle className="w-4 h-4 text-blue-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-blue-100 text-blue-800'
    }
  }

  // Filter sessions based on search query, classroom filter, and date filter
  const filteredSessions = sessions.filter(session => {
    // First apply classroom filter if provided
    if (filterClassroomId && session.classroom_id !== filterClassroomId) {
      return false
    }
    
    // Apply date filter if provided
    if (filterDate && session.date !== filterDate) {
      return false
    }
    
    // Then apply search query filter
    if (!sessionSearchQuery) return true
    
    return (
      session.classroom_name?.toLowerCase().includes(sessionSearchQuery.toLowerCase()) ||
      session.teacher_name?.toLowerCase().includes(sessionSearchQuery.toLowerCase()) ||
      session.location.toLowerCase().includes(sessionSearchQuery.toLowerCase()) ||
      session.status.toLowerCase().includes(sessionSearchQuery.toLowerCase())
    )
  })

  // Filter attendance based on search query
  const filteredAttendance = modalAttendance.filter(attendance =>
    attendance.student_name?.toLowerCase().includes(attendanceSearchQuery.toLowerCase()) || false
  )

  const TimePickerComponent = ({ 
    value, 
    onChange, 
    fieldId 
  }: { 
    value: string
    onChange: (value: string) => void
    fieldId: string
  }) => {
    const isOpen = activeTimePicker === fieldId
    const timePickerRef = useRef<HTMLDivElement>(null)
    
    const currentTime = value || '09:00'
    const [hours, minutes] = currentTime.split(':')
    const hour12 = parseInt(hours) === 0 ? 12 : parseInt(hours) > 12 ? parseInt(hours) - 12 : parseInt(hours)
    const ampm = parseInt(hours) >= 12 ? 'PM' : 'AM'

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (timePickerRef.current && !timePickerRef.current.contains(event.target as Node)) {
          setActiveTimePicker(null)
        }
      }

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside)
        return () => {
          document.removeEventListener('mousedown', handleClickOutside)
        }
      }
    }, [isOpen])
    
    const setTime = (newHour: number, newMinute: number, newAmpm: string) => {
      let hour24 = newHour
      if (newAmpm === 'PM' && newHour !== 12) {
        hour24 += 12
      } else if (newAmpm === 'AM' && newHour === 12) {
        hour24 = 0
      }
      
      const timeString = `${hour24.toString().padStart(2, '0')}:${newMinute.toString().padStart(2, '0')}`
      onChange(timeString)
    }

    return (
      <div className="relative" ref={timePickerRef}>
        <button
          type="button"
          onClick={() => setActiveTimePicker(isOpen ? null : fieldId)}
          className={`w-full h-10 px-3 py-2 text-left text-sm bg-white border rounded-lg focus:outline-none ${
            isOpen ? 'border-primary' : 'border-border focus:border-primary'
          }`}
        >
          {formatTime(value)}
        </button>
        
        {isOpen && (
          <div 
            className={`absolute top-full z-50 mt-1 bg-white border border-border rounded-lg shadow-lg p-4 w-80 ${
              fieldId === 'end_time' ? 'right-0' : 'left-0'
            }`}
          >
              <div className="grid grid-cols-3 gap-3">
              {/* Hours */}
              <div>
                <Label className="text-xs text-foreground/60 mb-2 block">{t("sessions.hour")}</Label>
                <div className="max-h-48 overflow-y-scroll scrollbar-hide">
                  {[...Array(12)].map((_, i) => {
                    const hour = i + 1
                    return (
                      <button
                        key={hour}
                        type="button"
                        onClick={() => setTime(hour, parseInt(minutes), ampm)}
                        className={`w-full px-2 py-1 text-sm text-left hover:bg-gray-100 rounded ${
                          hour12 === hour ? 'bg-blue-50 text-blue-600' : ''
                        }`}
                      >
                        {hour}
                      </button>
                    )
                  })}
                </div>
              </div>
              
              {/* Minutes */}
              <div>
                <Label className="text-xs text-foreground/60 mb-2 block">{t("sessions.min")}</Label>
                <div className="max-h-48 overflow-y-scroll scrollbar-hide">
                  {[...Array(60)].map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setTime(hour12, i, ampm)}
                      className={`w-full px-2 py-1 text-sm text-left hover:bg-gray-100 rounded ${
                        parseInt(minutes) === i ? 'bg-blue-50 text-blue-600' : ''
                      }`}
                    >
                      {i.toString().padStart(2, '0')}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* AM/PM */}
              <div>
                <Label className="text-xs text-foreground/60 mb-2 block">{t("sessions.period")}</Label>
                <div className="space-y-1">
                  {[{key: 'AM', label: t('sessions.am')}, {key: 'PM', label: t('sessions.pm')}].map(period => (
                    <button
                      key={period.key}
                      type="button"
                      onClick={() => setTime(hour12, parseInt(minutes), period.key)}
                      className={`w-full px-2 py-1 text-sm text-left hover:bg-gray-100 rounded ${
                        ampm === period.key ? 'bg-blue-50 text-blue-600' : ''
                      }`}
                    >
                      {period.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

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
      if (!dateString) return t('sessions.selectDate')
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
      t('sessions.months.january'), t('sessions.months.february'), t('sessions.months.march'), 
      t('sessions.months.april'), t('sessions.months.may'), t('sessions.months.june'),
      t('sessions.months.july'), t('sessions.months.august'), t('sessions.months.september'), 
      t('sessions.months.october'), t('sessions.months.november'), t('sessions.months.december')
    ]

    const dayNames = [
      t('sessions.days.sun'), t('sessions.days.mon'), t('sessions.days.tue'), 
      t('sessions.days.wed'), t('sessions.days.thu'), t('sessions.days.fri'), t('sessions.days.sat')
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
                {t("dashboard.today")}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  const SessionSkeleton = () => (
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
          <div className="h-4 bg-gray-200 rounded w-20"></div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-16"></div>
        </div>
        
        <div className="h-6 bg-gray-200 rounded-full w-20"></div>
        
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-24"></div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
        <div className="h-9 bg-gray-200 rounded w-full"></div>
        <div className="flex gap-2">
          <div className="h-9 bg-gray-200 rounded flex-1"></div>
          <div className="h-9 bg-gray-200 rounded flex-1"></div>
        </div>
      </div>
    </Card>
  )

  if (loading || translationLoading) {
    return (
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t("sessions.title")}</h1>
            <p className="text-gray-500">{t("sessions.description")}</p>
          </div>
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            {t("sessions.addSession")}
          </Button>
        </div>

        {/* Stats Cards Skeletons */}
        <div className="flex gap-6 mb-8">
          <Card className="w-80 p-6 animate-pulse border-l-4 border-gray-300">
            <div className="space-y-3">
              <div className="h-4 bg-gray-300 rounded w-32"></div>
              <div className="flex items-baseline gap-2">
                <div className="h-10 bg-gray-300 rounded w-20"></div>
                <div className="h-4 bg-gray-300 rounded w-16"></div>
              </div>
            </div>
          </Card>
          <Card className="w-80 p-6 animate-pulse border-l-4 border-gray-300">
            <div className="space-y-3">
              <div className="h-4 bg-gray-300 rounded w-32"></div>
              <div className="flex items-baseline gap-2">
                <div className="h-10 bg-gray-300 rounded w-20"></div>
                <div className="h-4 bg-gray-300 rounded w-16"></div>
              </div>
            </div>
          </Card>
        </div>

        {/* Search Bar Skeleton */}
        <div className="relative mb-4 max-w-md animate-pulse">
          <div className="h-12 bg-gray-200 rounded-lg"></div>
        </div>

        {/* Sessions Grid Skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <SessionSkeleton key={i} />
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
          <h1 className="text-2xl font-bold text-gray-900">{t("sessions.title")}</h1>
          <p className="text-gray-500">{t("sessions.description")}</p>
        </div>
        <Button 
          className="flex items-center gap-2"
          onClick={() => setShowModal(true)}
        >
          <Plus className="w-4 h-4" />
          {t("sessions.addSession")}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="flex gap-6 mb-8">
        <Card className="w-80 p-6 hover:shadow-md transition-shadow border-l-4 border-blue-500">
          <div className="space-y-3">
            <p className="text-sm font-medium text-blue-700">
              {sessionSearchQuery ? t("sessions.filteredResults") : t("sessions.totalSessions")}
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-semibold text-gray-900">
                {sessionSearchQuery ? filteredSessions.length : sessions.length}
              </p>
              <p className="text-sm text-gray-500">{t("sessions.session")}</p>
            </div>
            {sessionSearchQuery && (
              <p className="text-xs text-gray-500">{t("sessions.ofTotal", {total: sessions.length})}</p>
            )}
          </div>
        </Card>
        <Card className="w-80 p-6 hover:shadow-md transition-shadow border-l-4 border-green-500">
          <div className="space-y-3">
            <p className="text-sm font-medium text-green-700">{t("sessions.todaysSessions")}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-semibold text-gray-900">
                {sessions.filter(s => s.date === new Date().toISOString().split('T')[0]).length}
              </p>
              <p className="text-sm text-gray-500">{t("sessions.session")}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <Input
          type="text"
          placeholder={t("sessions.searchSessions")}
          value={sessionSearchQuery}
          onChange={(e) => setSessionSearchQuery(e.target.value)}
          className="h-12 pl-12 rounded-lg border border-border bg-white focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 text-sm shadow-sm"
        />
      </div>

      {/* Sessions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSessions.map((session) => (
          <Card key={session.id} className="p-6 hover:shadow-md transition-shadow flex flex-col h-full">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: session.classroom_color || '#6B7280' }}
                />
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{session.classroom_name}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                    <GraduationCap className="w-4 h-4" />
                    <span>{session.teacher_name}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="p-1"
                  onClick={() => handleEditClick(session)}
                >
                  <Edit className="w-4 h-4 text-gray-500" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="p-1"
                  onClick={() => handleDeleteClick(session)}
                >
                  <Trash2 className="w-4 h-4 text-gray-500" />
                </Button>
              </div>
            </div>

            <div className="space-y-3 flex-grow">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(session.date)}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>{formatTime(session.start_time)} - {formatTime(session.end_time)}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                {session.location === 'online' ? (
                  <Monitor className="w-4 h-4" />
                ) : (
                  <Building className="w-4 h-4" />
                )}
                <span className="capitalize">{t(`sessions.${session.location}`)}</span>
              </div>
              
              <div className="flex items-center gap-2">
                {getStatusIcon(session.status)}
                <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(session.status)}`}>
                  {t(`sessions.${session.status}`)}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <BookOpen className="w-4 h-4" />
                <span>{session.assignment_count || 0}{t((session.assignment_count || 0) !== 1 ? 'sessions.assignmentCountPlural' : 'sessions.assignmentCount')}</span>
              </div>

              {session.substitute_teacher_name && (
                <div className="flex items-center gap-2 text-sm text-orange-600">
                  <Users className="w-4 h-4" />
                  <span>{t("sessions.substitute")} {session.substitute_teacher_name}</span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
              <Button 
                variant="outline" 
                className="w-full text-sm"
                onClick={() => handleViewDetails(session)}
              >
                {t("sessions.viewDetails")}
              </Button>
              <div className="flex gap-2">
                <Button 
                  className="flex-1 text-sm"
                  onClick={() => handleViewAssignments(session)}
                >
                  {t("sessions.viewAssignments")}
                </Button>
                <Button 
                  className="flex-1 text-sm"
                  onClick={() => handleViewAttendance(session)}
                >
                  {t("sessions.viewAttendance")}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredSessions.length === 0 && (
        <Card className="p-8 text-center">
          <Calendar className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          {sessionSearchQuery ? (
            <>
              <h3 className="text-lg font-medium text-gray-900 mb-1">{t("sessions.noResultsFound")}</h3>
              <p className="text-gray-500 mb-3">
                No sessions match &quot;{sessionSearchQuery}&quot;. Try a different search term.
              </p>
              <Button 
                variant="outline"
                className="flex items-center gap-2 mx-auto"
                onClick={() => setSessionSearchQuery('')}
              >
                <X className="w-4 h-4" />
                Clear Search
              </Button>
            </>
          ) : (
            <>
              <h3 className="text-lg font-medium text-gray-900 mb-1">{t("sessions.noSessionsFound")}</h3>
              <p className="text-gray-500">{t("sessions.getStartedFirstSession")}</p>
              <Button 
                className="flex items-center gap-2 mx-auto"
                onClick={() => setShowModal(true)}
              >
                <Plus className="w-4 h-4" />
                Add Your First Session
              </Button>
            </>
          )}
        </Card>
      )}

      {/* Add/Edit Session Modal */}
      {showModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-border w-full max-w-md mx-4 max-h-[90vh] shadow-lg flex flex-col">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingSession ? t("sessions.editSession") : t("sessions.addNewSession")}
              </h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setShowModal(false)
                  resetForm()
                }}
                className="p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 pt-4">
              <form id="session-form" onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">
                    {t("sessions.classroom")} <span className="text-red-500">*</span>
                  </Label>
                  <Select 
                    value={formData.classroom_id} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, classroom_id: value }))}
                    required
                  >
                    <SelectTrigger className="!h-10 w-full rounded-lg border border-border bg-transparent focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary py-2 px-3">
                      <SelectValue placeholder={t("sessions.selectClassroom")} />
                    </SelectTrigger>
                    <SelectContent>
                      {classrooms.map((classroom) => (
                        <SelectItem key={classroom.id} value={classroom.id}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: classroom.color || '#6B7280' }}
                            />
                            {classroom.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground/80">
                      {t("sessions.date")} <span className="text-red-500">*</span>
                    </Label>
                    <DatePickerComponent
                      value={formData.date}
                      onChange={(value) => setFormData(prev => ({ ...prev, date: value }))}
                      fieldId="date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground/80">
                      {t("sessions.statusLabel")}
                    </Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as 'scheduled' | 'completed' | 'cancelled' }))}>
                      <SelectTrigger className="!h-10 w-full rounded-lg border border-border bg-transparent focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary py-2 px-3">
                        <SelectValue placeholder={t("sessions.selectStatus")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scheduled">{t("sessions.scheduled")}</SelectItem>
                        <SelectItem value="completed">{t("sessions.completed")}</SelectItem>
                        <SelectItem value="cancelled">{t("sessions.cancelled")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground/80">
                      {t("sessions.startTime")} <span className="text-red-500">*</span>
                    </Label>
                    <TimePickerComponent
                      value={formData.start_time}
                      onChange={(value) => setFormData(prev => ({ ...prev, start_time: value }))}
                      fieldId="start_time"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground/80">
                      {t("sessions.endTime")} <span className="text-red-500">*</span>
                    </Label>
                    <TimePickerComponent
                      value={formData.end_time}
                      onChange={(value) => setFormData(prev => ({ ...prev, end_time: value }))}
                      fieldId="end_time"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">
                    {t("sessions.location")}
                  </Label>
                  <Select value={formData.location} onValueChange={(value) => setFormData(prev => ({ ...prev, location: value as 'offline' | 'online' }))}>
                    <SelectTrigger className="!h-10 w-full rounded-lg border border-border bg-transparent focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary py-2 px-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="offline">
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4" />
                          {t("sessions.offline")}
                        </div>
                      </SelectItem>
                      <SelectItem value="online">
                        <div className="flex items-center gap-2">
                          <Monitor className="w-4 h-4" />
                          {t("sessions.online")}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">
                    {t("sessions.substituteTeacher")}
                  </Label>
                  <Select value={formData.substitute_teacher} onValueChange={(value) => setFormData(prev => ({ ...prev, substitute_teacher: value }))}>
                    <SelectTrigger className="!h-10 w-full rounded-lg border border-border bg-transparent focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary py-2 px-3">
                      <SelectValue placeholder={t("sessions.selectSubstituteTeacher")} />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.user_id}>
                          {teacher.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Attendance Section */}
                {(editingSession || showModal) && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-foreground/80">
                        {t("sessions.attendanceLabel")}
                      </Label>
                      {editingSession && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            loadAvailableStudents(formData.classroom_id)
                            setShowAddAttendanceModal(true)
                          }}
                          className="h-8 px-2 text-blue-600 hover:text-blue-700"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          {t("sessions.addAttendance")}
                        </Button>
                      )}
                    </div>
                    <div className="border border-border rounded-lg bg-gray-50 p-4">
                      {modalAttendance.length === 0 ? (
                        <div className="text-center py-4">
                          <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">{t("sessions.noStudentsInClassroom")}</p>
                        </div>
                      ) : (
                        <>
                          {/* Search Bar */}
                          <div className="relative mb-3">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input
                              type="text"
                              placeholder={t("sessions.searchStudentsByName")}
                              value={attendanceSearchQuery}
                              onChange={(e) => setAttendanceSearchQuery(e.target.value)}
                              className="h-9 pl-10 rounded-lg border border-border bg-white focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
                            />
                          </div>
                          
                          {/* Mark All Present Button */}
                          <div className="mb-3">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={markAllPresent}
                              className="h-8 px-3 text-xs text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              {t("sessions.markAllPresent")}
                            </Button>
                          </div>
                          
                          <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-hide">
                            {filteredAttendance.length === 0 ? (
                              <div className="text-center py-4">
                                <Users className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                                <p className="text-sm text-gray-500">{t("sessions.noStudentsFound")}</p>
                              </div>
                            ) : (
                              filteredAttendance.map((attendance) => (
                                <div key={attendance.id} className="p-3 bg-white rounded-lg border space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-900">{attendance.student_name}</span>
                                    <Select 
                                      value={attendance.status} 
                                      onValueChange={(value) => updateAttendanceStatus(attendance.student_id, value as Attendance['status'])}
                                    >
                                      <SelectTrigger className="!h-10 w-full max-w-[140px] rounded-lg border border-border bg-transparent focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary py-2 px-3">
                                        <SelectValue placeholder={t("sessions.selectStatus")} />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="present">{t("sessions.present")}</SelectItem>
                                        <SelectItem value="absent">{t("sessions.absent")}</SelectItem>
                                        <SelectItem value="late">{t("sessions.late")}</SelectItem>
                                        <SelectItem value="excused">{t("sessions.excused")}</SelectItem>
                                        <SelectItem value="other">{t("sessions.other")}</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Input
                                      type="text"
                                      placeholder={t("sessions.addNoteForStudent")}
                                      value={attendance.note || ''}
                                      onChange={(e) => updateAttendanceNote(attendance.student_id, e.target.value)}
                                      className="h-9 text-sm"
                                    />
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Assignments Section */}
                {(editingSession || showModal) && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-foreground/80">
                        {t("sessions.assignmentsLabel")}
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={addAssignment}
                        className="h-8 px-2 text-blue-600 hover:text-blue-700"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        {t("sessions.addAssignment")}
                      </Button>
                    </div>
                    
                    {modalAssignments.length === 0 ? (
                      <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                        <BookOpen className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">{t("sessions.noAssignmentsAdded")}</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {modalAssignments.map((assignment, index) => (
                          <div key={assignment.id} className="p-3 bg-gray-50 rounded-lg border border-border">
                            <div className="flex items-center justify-between mb-3">
                              <Label className="text-sm font-medium text-foreground/80">
                                {t("sessions.assignmentNumber")} {index + 1}
                              </Label>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeAssignment(assignment.id)}
                                className="h-6 w-6 p-0"
                              >
                                <Trash2 className="w-3 h-3 text-gray-500" />
                              </Button>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label className="text-xs text-foreground/60 mb-1 block">{t("sessions.titleRequired")}</Label>
                                  <Input
                                    value={assignment.title}
                                    onChange={(e) => updateAssignment(assignment.id, 'title', e.target.value)}
                                    placeholder={t("sessions.assignmentTitle")}
                                    className="h-9 text-sm bg-white focus:border-primary"
                                    required
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-foreground/60 mb-1 block">{t("sessions.type")}</Label>
                                  <Select 
                                    value={assignment.assignment_type} 
                                    onValueChange={(value) => updateAssignment(assignment.id, 'assignment_type', value)}
                                  >
                                    <SelectTrigger className="h-9 text-sm bg-white border border-border focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="homework">{t("sessions.homework")}</SelectItem>
                                      <SelectItem value="quiz">{t("sessions.quiz")}</SelectItem>
                                      <SelectItem value="test">{t("sessions.test")}</SelectItem>
                                      <SelectItem value="project">{t("sessions.project")}</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              
                              <div>
                                <Label className="text-xs text-foreground/60 mb-1 block">{t("sessions.category")}</Label>
                                <Select 
                                  value={assignment.assignment_categories_id} 
                                  onValueChange={(value) => updateAssignment(assignment.id, 'assignment_categories_id', value)}
                                >
                                  <SelectTrigger className="h-9 text-sm bg-white border border-border focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary">
                                    <SelectValue placeholder={t("sessions.selectCategory")} />
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
                              
                              <div>
                                <Label className="text-xs text-foreground/60 mb-1 block">{t("sessions.description")}</Label>
                                <textarea
                                  value={assignment.description || ''}
                                  onChange={(e) => updateAssignment(assignment.id, 'description', e.target.value)}
                                  placeholder={t("sessions.assignmentDescription")}
                                  rows={2}
                                  className="w-full min-h-[2rem] px-3 py-2 rounded-lg border border-border bg-white focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none resize-none text-sm"
                                />
                              </div>
                              
                              <div>
                                <Label className="text-xs text-foreground/60 mb-1 block">{t("sessions.dueDate")}</Label>
                                <DatePickerComponent
                                  value={assignment.due_date}
                                  onChange={(value) => updateAssignment(assignment.id, 'due_date', value)}
                                  fieldId={`assignment-due-date-${assignment.id}`}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">
                    {t("sessions.notesLabel")}
                  </Label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full min-h-[2.5rem] px-3 py-2 rounded-lg border border-border bg-transparent focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none resize-none text-sm"
                    placeholder={t("sessions.additionalNotes")}
                  />
                </div>
              </form>
            </div>

            <div className="flex items-center gap-3 p-6 pt-4 border-t border-gray-200">
              <Button 
                type="button"
                variant="outline"
                onClick={() => {
                  setShowModal(false)
                  resetForm()
                }}
                className="flex-1"
              >
                {t("sessions.cancel")}
              </Button>
              <Button 
                type="submit"
                form="session-form"
                className="flex-1"
              >
                {editingSession ? t("sessions.updateSession") : t("sessions.addSession")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Session Confirmation Modal */}
      {showDeleteModal && sessionToDelete && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-border w-full max-w-md mx-4 shadow-lg">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">{t("sessions.deleteSession")}</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setShowDeleteModal(false)
                  setSessionToDelete(null)
                }}
                className="p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-6">
              <p className="text-sm text-gray-600">
                {t("sessions.deleteSessionConfirm")}
              </p>
            </div>

            <div className="flex items-center gap-3 p-6 pt-0">
              <Button 
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false)
                  setSessionToDelete(null)
                }}
                className="flex-1"
              >
                {t("sessions.cancel")}
              </Button>
              <Button 
                type="button"
                onClick={handleDeleteConfirm}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {t("sessions.deleteSession")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Session Details Modal */}
      {showDetailsModal && viewingSession && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-border w-full max-w-6xl mx-4 max-h-[90vh] shadow-lg flex flex-col">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div 
                  className="w-6 h-6 rounded-full" 
                  style={{ backgroundColor: viewingSession.classroom_color || '#6B7280' }}
                />
                <h2 className="text-2xl font-bold text-gray-900">{viewingSession.classroom_name}</h2>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setShowDetailsModal(false)
                  setViewingSession(null)
                  setSessionAssignments([])
                  setSessionAttendance([])
                }}
                className="p-1"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Session Info & Assignments */}
                <div className="space-y-6">
                  {/* Session Info */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      {t("attendance.sessionInformation")}
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600">{t("sessions.date")}</p>
                          <p className="font-medium text-gray-900">{formatDate(viewingSession.date)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600">{t("sessions.time")}</p>
                          <p className="font-medium text-gray-900">{formatTime(viewingSession.start_time)} - {formatTime(viewingSession.end_time)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <GraduationCap className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600">{t("sessions.teacher")}</p>
                          <p className="font-medium text-gray-900">{viewingSession.teacher_name || 'Not assigned'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600">{t("sessions.location")}</p>
                          <p className="font-medium text-gray-900 capitalize">{viewingSession.location}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusIcon(viewingSession.status)}
                        <div>
                          <p className="text-sm text-gray-600">{t("sessions.status")}</p>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(viewingSession.status)}`}>
                            {t(`sessions.${viewingSession.status}`)}
                          </span>
                        </div>
                      </div>
                      {viewingSession.substitute_teacher_name && (
                        <div className="flex items-center gap-3">
                          <Users className="w-5 h-5 text-orange-500" />
                          <div>
                            <p className="text-sm text-gray-600">{t("sessions.substituteTeacher")}</p>
                            <p className="font-medium text-orange-600">{viewingSession.substitute_teacher_name}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* Assignments */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <BookOpen className="w-5 h-5" />
                      {t("sessions.assignmentsCount")} ({sessionAssignments.length})
                    </h3>
                    {sessionAssignments.length === 0 ? (
                      <div className="text-center py-8">
                        <BookOpen className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">{t("sessions.noAssignmentsForSession")}</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {sessionAssignments.map((assignment) => (
                          <div key={assignment.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-medium text-gray-900">{assignment.title}</h4>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                assignment.assignment_type === 'quiz' ? 'bg-blue-100 text-blue-800' :
                                assignment.assignment_type === 'homework' ? 'bg-green-100 text-green-800' :
                                assignment.assignment_type === 'test' ? 'bg-red-100 text-red-800' :
                                'bg-purple-100 text-purple-800'
                              }`}>
                                {assignment.assignment_type.charAt(0).toUpperCase() + assignment.assignment_type.slice(1)}
                              </span>
                            </div>
                            {assignment.description && (
                              <p className="text-sm text-gray-600 mb-2">{assignment.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              {assignment.due_date && (
                                <span>{t("sessions.due")} {new Date(assignment.due_date).toLocaleDateString()}</span>
                              )}
                              {assignment.category_name && (
                                <span>{t("sessions.categoryColon")} {assignment.category_name}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>

                  {/* Notes */}
                  {viewingSession.notes && (
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">{t("sessions.notes")}</h3>
                      <p className="text-gray-700 leading-relaxed">{viewingSession.notes}</p>
                    </Card>
                  )}
                </div>

                {/* Right Column - Attendance */}
                <div className="space-y-6">
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      {t("sessions.attendanceCount")} ({sessionAttendance.length})
                    </h3>
                    {sessionAttendance.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">{t("sessions.noAttendanceRecords")}</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {sessionAttendance.map((attendance) => (
                          <div key={attendance.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                                {attendance.student_name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{attendance.student_name || t('sessions.unknownStudent')}</p>
                                {attendance.note && (
                                  <p className="text-sm text-gray-500">{attendance.note}</p>
                                )}
                              </div>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              attendance.status === 'present' ? 'bg-green-100 text-green-800' :
                              attendance.status === 'absent' ? 'bg-red-100 text-red-800' :
                              attendance.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                              attendance.status === 'excused' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {t(`sessions.${attendance.status}`)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>

                  {/* Attendance Summary */}
                  {sessionAttendance.length > 0 && (
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">{t("sessions.attendanceSummary")}</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <p className="text-2xl font-bold text-green-600">
                            {sessionAttendance.filter(a => a.status === 'present').length}
                          </p>
                          <p className="text-sm text-green-700">{t("sessions.present")}</p>
                        </div>
                        <div className="text-center p-3 bg-red-50 rounded-lg">
                          <p className="text-2xl font-bold text-red-600">
                            {sessionAttendance.filter(a => a.status === 'absent').length}
                          </p>
                          <p className="text-sm text-red-700">{t("sessions.absent")}</p>
                        </div>
                        <div className="text-center p-3 bg-yellow-50 rounded-lg">
                          <p className="text-2xl font-bold text-yellow-600">
                            {sessionAttendance.filter(a => a.status === 'late').length}
                          </p>
                          <p className="text-sm text-yellow-700">{t("sessions.late")}</p>
                        </div>
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <p className="text-2xl font-bold text-blue-600">
                            {sessionAttendance.filter(a => a.status === 'excused').length}
                          </p>
                          <p className="text-sm text-blue-700">{t("sessions.excused")}</p>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-6 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                Created: {new Date(viewingSession.created_at).toLocaleDateString()}
                {viewingSession.updated_at !== viewingSession.created_at && (
                  <span className="ml-4">
                    {t("sessions.updatedColon")} {new Date(viewingSession.updated_at).toLocaleDateString()}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline"
                  onClick={() => {
                    setShowDetailsModal(false)
                    setViewingSession(null)
                    setSessionAssignments([])
                    setSessionAttendance([])
                    handleEditClick(viewingSession)
                  }}
                  className="flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  {t("sessions.editSession")}
                </Button>
                <Button 
                  onClick={() => {
                    setShowDetailsModal(false)
                    setViewingSession(null)
                    setSessionAssignments([])
                    setSessionAttendance([])
                  }}
                >
                  {t("common.close")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Attendance Modal */}
      {showAddAttendanceModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-border w-full max-w-md mx-4 max-h-[80vh] shadow-lg flex flex-col">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">{t("sessions.addStudentsToAttendance")}</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setShowAddAttendanceModal(false)
                  setAvailableStudents([])
                }}
                className="p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 pt-4">
              {availableStudents.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">{t("sessions.allStudentsInAttendance")}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 mb-4">
                    Select students to add to the attendance list:
                  </p>
                  {availableStudents.map((student) => (
                    <div key={student.user_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                      <span className="text-sm font-medium text-gray-900">{student.name}</span>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => addStudentToAttendance(student)}
                        className="h-8 px-3 text-xs"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end p-6 pt-4 border-t border-gray-200">
              <Button 
                onClick={() => {
                  setShowAddAttendanceModal(false)
                  setAvailableStudents([])
                }}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}