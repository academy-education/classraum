"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  School,
  Plus,
  Edit,
  Trash2,
  Users,
  Clock,
  BookOpen,
  GraduationCap,
  Book,
  X,
  Search
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

interface Classroom {
  id: string
  name: string
  grade?: string
  subject?: string
  teacher_id: string
  teacher_name?: string
  color?: string
  notes?: string
  academy_id: string
  created_at: string
  updated_at: string
  enrolled_students?: { name: string; school_name?: string }[]
  student_count?: number
}

interface ClassroomsPageProps {
  academyId: string
  onNavigateToSessions?: (classroomId?: string) => void
}

interface Teacher {
  id: string
  name: string
  user_id: string
}

interface Schedule {
  id: string
  day: string
  start_time: string
  end_time: string
}

interface Student {
  id: string
  name: string
  user_id: string
  school_name?: string
}



export function ClassroomsPage({ academyId, onNavigateToSessions }: ClassroomsPageProps) {
  const { t, loading: translationLoading } = useTranslation()
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [classroomToDelete, setClassroomToDelete] = useState<Classroom | null>(null)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [activeTimePicker, setActiveTimePicker] = useState<string | null>(null)
  const [studentSearchQuery, setStudentSearchQuery] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    grade: '',
    subject: '',
    teacher_id: '',
    teacher_name: '',
    color: '#3B82F6',
    notes: ''
  })

  const presetColors = [
    '#3B82F6', // Blue
    '#EF4444', // Red
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#84CC16', // Lime
    '#F97316', // Orange
    '#6366F1', // Indigo
    '#64748B', // Slate
    '#DC2626'  // Red-600
  ]

  const colorNames: { [key: string]: string } = {
    '#3B82F6': t('classrooms.blue'),
    '#EF4444': t('classrooms.red'),
    '#10B981': t('classrooms.green'),
    '#F59E0B': t('classrooms.yellow'),
    '#8B5CF6': t('classrooms.purple'),
    '#EC4899': t('classrooms.pink'),
    '#06B6D4': t('classrooms.cyan'),
    '#84CC16': t('classrooms.lime'),
    '#F97316': t('classrooms.orange'),
    '#6366F1': t('classrooms.indigo'),
    '#64748B': t('classrooms.slate'),
    '#DC2626': t('classrooms.crimson')
  }

  const daysOfWeek = [
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
  ]

  // Helper function to get translated day name
  const getTranslatedDay = (day: string) => {
    const dayKey = day.toLowerCase()
    return t(`classrooms.${dayKey}`)
  }

  const fetchClassrooms = useCallback(async () => {
    try {
      // Use a simpler query to avoid JOIN complexity in Supabase PostgREST
      const { data, error } = await supabase
        .from('classrooms')
        .select('*')
        .eq('academy_id', academyId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      
      if (error) {
        setClassrooms([])
        setLoading(false)
        return
      }
      
      // Get teacher names and enrolled students separately to avoid complex JOINs
      const classroomsWithDetails = await Promise.all(
        (data || []).map(async (classroom) => {
          // Get teacher name
          const { data: teacherData } = await supabase
            .from('users')
            .select('name')
            .eq('id', classroom.teacher_id)
            .single()
          
          // Get enrolled students count and names with school names
          const { data: enrolledStudents } = await supabase
            .from('classroom_students')
            .select(`
              student_id,
              students!inner(
                users!inner(
                  name
                ),
                school_name
              )
            `)
            .eq('classroom_id', classroom.id)

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const studentData = enrolledStudents?.map((enrollment: any) => ({
            name: enrollment.students?.users?.name || 'Unknown Student',
            school_name: enrollment.students?.school_name
          })) || []
          
          return {
            ...classroom,
            teacher_name: teacherData?.name || 'Unknown Teacher',
            enrolled_students: studentData,
            student_count: studentData.length
          }
        })
      )
      
      setClassrooms(classroomsWithDetails)
    } catch {
      setClassrooms([])
    } finally {
      setLoading(false)
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

  const fetchStudents = useCallback(async () => {
    const fallbackStudents: Student[] = [
      { id: '1', name: 'Emma Johnson', user_id: '1a2b3c4d-5e6f-7g8h-9i0j-1k2l3m4n5o6p', school_name: 'Lincoln Elementary' },
      { id: '2', name: 'Liam Williams', user_id: '2b3c4d5e-6f7g-8h9i-0j1k-2l3m4n5o6p7q', school_name: 'Lincoln Elementary' },
      { id: '3', name: 'Olivia Brown', user_id: '3c4d5e6f-7g8h-9i0j-1k2l-3m4n5o6p7q8r', school_name: 'Washington Elementary' },
      { id: '4', name: 'Noah Davis', user_id: '4d5e6f7g-8h9i-0j1k-2l3m-4n5o6p7q8r9s', school_name: 'Lincoln Elementary' },
      { id: '5', name: 'Ava Miller', user_id: '5e6f7g8h-9i0j-1k2l-3m4n-5o6p7q8r9s0t', school_name: 'Washington Elementary' },
      { id: '6', name: 'Ethan Wilson', user_id: '6f7g8h9i-0j1k-2l3m-4n5o-6p7q8r9s0t1u', school_name: 'Lincoln Elementary' }
    ]
    
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          user_id,
          school_name,
          users!inner(
            id,
            name
          )
        `)
        .eq('academy_id', academyId)
        .eq('active', true)
      
      if (error) {
        setStudents(fallbackStudents)
        return
      }
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const studentsData = data?.map((student: any) => ({
        id: student.users.id,
        name: student.users.name,
        user_id: student.user_id,
        school_name: student.school_name
      })) || []
      
      setStudents(studentsData.length > 0 ? studentsData : fallbackStudents)
    } catch {
      setStudents(fallbackStudents)
    }
  }, [academyId])

  useEffect(() => {
    fetchClassrooms()
    fetchTeachers()
    fetchStudents()
  }, [academyId, fetchClassrooms, fetchTeachers, fetchStudents])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      // Step 1: Create the classroom in the database
      const { data: classroomData, error: classroomError } = await supabase
        .from('classrooms')
        .insert({
          name: formData.name,
          grade: formData.grade || null,
          subject: formData.subject || null,
          teacher_id: formData.teacher_id,
          color: formData.color,
          notes: formData.notes || null,
          academy_id: academyId
        })
        .select('*')
        .single()

      if (classroomError) {
        alert('Error creating classroom: ' + classroomError.message)
        return
      }

      const classroomId = classroomData.id

      // Step 2: Create classroom schedules if any exist
      if (schedules.length > 0) {
        const scheduleInserts = schedules.map(schedule => ({
          classroom_id: classroomId,
          day: schedule.day,
          start_time: schedule.start_time,
          end_time: schedule.end_time
        }))

        const { error: scheduleError } = await supabase
          .from('classroom_schedules')
          .insert(scheduleInserts)

        if (scheduleError) {
          alert('Error creating schedules: ' + scheduleError.message)
          return
        }
      }

      // Step 3: Create classroom-student relationships if any students are selected
      if (selectedStudents.length > 0) {
        const studentInserts = selectedStudents.map(studentId => ({
          classroom_id: classroomId,
          student_id: studentId
        }))

        const { error: studentError } = await supabase
          .from('classroom_students')
          .insert(studentInserts)

        if (studentError) {
          alert('Error enrolling students: ' + studentError.message)
          return
        }
      }

      // Step 4: Refresh the classroom list to get updated student data
      await fetchClassrooms()
      setShowModal(false)
      
      // Reset form
      setFormData({
        name: '',
        grade: '',
        subject: '',
        teacher_id: '',
        teacher_name: '',
        color: '#3B82F6',
        notes: ''
      })
      setSchedules([])
      setSelectedStudents([])
      setActiveTimePicker(null)
      setStudentSearchQuery('')

      alert('Classroom created successfully!')

    } catch (error) {
      alert('An unexpected error occurred: ' + (error as Error).message)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleTeacherChange = (teacherId: string) => {
    const selectedTeacher = teachers.find(t => t.id === teacherId)
    setFormData(prev => ({ 
      ...prev, 
      teacher_id: teacherId,
      teacher_name: selectedTeacher?.name || ''
    }))
  }

  const addSchedule = () => {
    const newSchedule: Schedule = {
      id: crypto.randomUUID(),
      day: 'Monday',
      start_time: '09:00',
      end_time: '10:00'
    }
    setSchedules(prev => [...prev, newSchedule])
  }

  const removeSchedule = (id: string) => {
    setSchedules(prev => prev.filter(schedule => schedule.id !== id))
  }

  const updateSchedule = (id: string, field: keyof Schedule, value: string) => {
    setSchedules(prev => prev.map(schedule => 
      schedule.id === id ? { ...schedule, [field]: value } : schedule
    ))
  }

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    )
  }

  // Filter students based on search query
  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
    (student.school_name && student.school_name.toLowerCase().includes(studentSearchQuery.toLowerCase()))
  )

  const handleDeleteClick = (classroom: Classroom) => {
    setClassroomToDelete(classroom)
    setShowDeleteModal(true)
  }

  const handleEditClick = async (classroom: Classroom) => {
    setEditingClassroom(classroom)
    setFormData({
      name: classroom.name,
      grade: classroom.grade || '',
      subject: classroom.subject || '',
      teacher_id: classroom.teacher_id,
      teacher_name: classroom.teacher_name || '',
      color: classroom.color || '#3B82F6',
      notes: classroom.notes || ''
    })
    // Convert student objects back to user_ids for editing
    const studentUserIds = classroom.enrolled_students?.map(student => {
      // Find the user_id from the students array
      const foundStudent = students.find(s => s.name === student.name)
      return foundStudent?.user_id
    }).filter((id): id is string => Boolean(id)) || []
    setSelectedStudents(studentUserIds)
    
    // Fetch existing schedules from database
    try {
      const { data: existingSchedules, error } = await supabase
        .from('classroom_schedules')
        .select('*')
        .eq('classroom_id', classroom.id)
        .order('day', { ascending: true })
      
      if (error) {
        setSchedules([])
      } else {
        // Convert database schedules to UI format
        const formattedSchedules = (existingSchedules || []).map(schedule => ({
          id: schedule.id,
          day: schedule.day,
          start_time: schedule.start_time,
          end_time: schedule.end_time
        }))
        setSchedules(formattedSchedules)
      }
    } catch {
      setSchedules([])
    }
    
    setShowEditModal(true)
  }

  const handleDetailsClick = (classroom: Classroom) => {
    setSelectedClassroom(classroom)
    setShowDetailsModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!classroomToDelete || !classroomToDelete.id) {
      alert('Error: No classroom selected for deletion')
      return
    }

    try {
      const { error } = await supabase
        .from('classrooms')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', classroomToDelete.id)
        .select()

      if (error) {
        alert('Error deleting classroom: ' + error.message)
        return
      }

      // Remove from local state
      setClassrooms(prev => prev.filter(c => c.id !== classroomToDelete.id))
      setShowDeleteModal(false)
      setClassroomToDelete(null)
      
      alert('Classroom deleted successfully! You can restore it from the archive.')

    } catch (error) {
      alert('An unexpected error occurred: ' + (error as Error).message)
    }
  }

  const formatTime = (time: string) => {
    if (!time) return '12:00 AM'
    const [hours, minutes] = time.split(':')
    const hour12 = parseInt(hours) === 0 ? 12 : parseInt(hours) > 12 ? parseInt(hours) - 12 : parseInt(hours)
    const ampm = parseInt(hours) >= 12 ? 'PM' : 'AM'
    const ampmTranslated = parseInt(hours) >= 12 ? t('classrooms.pm') : t('classrooms.am')
    return `${hour12}:${minutes} ${ampmTranslated}`
  }


  const TimePickerComponent = ({ 
    value, 
    onChange, 
    scheduleId, 
    field 
  }: { 
    value: string
    onChange: (value: string) => void
    scheduleId: string
    field: string
  }) => {
    const pickerId = `${scheduleId}-${field}`
    const isOpen = activeTimePicker === pickerId
    const timePickerRef = useRef<HTMLDivElement>(null)
    
    const currentTime = value || '09:00'
    const [hours, minutes] = currentTime.split(':')
    const hour12 = parseInt(hours) === 0 ? 12 : parseInt(hours) > 12 ? parseInt(hours) - 12 : parseInt(hours)
    const ampm = parseInt(hours) >= 12 ? 'PM' : 'AM'
    const ampmTranslated = parseInt(hours) >= 12 ? t('classrooms.pm') : t('classrooms.am')

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
      // Don't close the picker here anymore
    }

    return (
      <div className="relative" ref={timePickerRef}>
        <button
          type="button"
          onClick={() => setActiveTimePicker(isOpen ? null : pickerId)}
          className={`w-full h-9 px-3 py-2 text-left text-sm bg-white border rounded-lg focus:outline-none ${
            isOpen ? 'border-primary' : 'border-border hover:border-gray-400 focus:border-primary'
          }`}
        >
          {formatTime(value)}
        </button>
        
        {isOpen && (
          <div 
            className={`absolute top-full z-50 mt-1 bg-white border border-border rounded-lg shadow-lg p-4 w-80 ${
              field === 'end_time' ? 'right-0' : 'left-0'
            }`}
          >
              <div className="grid grid-cols-3 gap-3">
              {/* Hours */}
              <div>
                <Label className="text-xs text-foreground/60 mb-2 block">Hour</Label>
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
                <Label className="text-xs text-foreground/60 mb-2 block">Min</Label>
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
                <Label className="text-xs text-foreground/60 mb-2 block">Period</Label>
                <div className="space-y-1">
                  {[{key: 'am', label: t('classrooms.am')}, {key: 'pm', label: t('classrooms.pm')}].map(period => (
                    <button
                      key={period.key}
                      type="button"
                      onClick={() => setTime(hour12, parseInt(minutes), period.key.toUpperCase())}
                      className={`w-full px-2 py-1 text-sm text-left hover:bg-gray-100 rounded ${
                        ampm === period.key.toUpperCase() ? 'bg-blue-50 text-blue-600' : ''
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

  const ClassroomSkeleton = () => (
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
        
        <div className="flex flex-wrap gap-1">
          <div className="h-6 bg-gray-200 rounded-full w-16"></div>
          <div className="h-6 bg-gray-200 rounded-full w-20"></div>
          <div className="h-6 bg-gray-200 rounded-full w-14"></div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-16"></div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-20"></div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-24"></div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="h-9 bg-gray-200 rounded w-full"></div>
      </div>
    </Card>
  )

  if (loading || translationLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t("classrooms.title")}</h1>
            <p className="text-gray-500">{t("classrooms.description")}</p>
          </div>
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            {t("classrooms.createClassroom")}
          </Button>
        </div>

        {/* Stats Cards Skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="p-4 animate-pulse">
            <div className="flex items-center justify-between">
              <div>
                <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-12"></div>
              </div>
              <div className="w-8 h-8 bg-gray-200 rounded"></div>
            </div>
          </Card>
          <Card className="p-4 animate-pulse">
            <div className="flex items-center justify-between">
              <div>
                <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-12"></div>
              </div>
              <div className="w-8 h-8 bg-gray-200 rounded"></div>
            </div>
          </Card>
        </div>

        {/* Classrooms Grid Skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <ClassroomSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("classrooms.title")}</h1>
          <p className="text-gray-500">{t("classrooms.description")}</p>
        </div>
        <Button 
          className="flex items-center gap-2"
          onClick={() => setShowModal(true)}
        >
          <Plus className="w-4 h-4" />
          {t("classrooms.createClassroom")}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t("classrooms.totalClassrooms")}</p>
              <p className="text-2xl font-bold text-gray-900">{classrooms.length}</p>
            </div>
            <School className="w-8 h-8 text-blue-600" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t("classrooms.activeSessions")}</p>
              <p className="text-2xl font-bold text-gray-900">{classrooms.length}</p>
            </div>
            <BookOpen className="w-8 h-8 text-green-600" />
          </div>
        </Card>
      </div>

      {/* Classrooms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classrooms.map((classroom) => (
          <Card key={classroom.id} className="p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: classroom.color || '#6B7280' }}
                />
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{classroom.name}</h3>
                  {classroom.teacher_name && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                      <GraduationCap className="w-4 h-4" />
                      <span>{classroom.teacher_name}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="p-1"
                  onClick={() => handleEditClick(classroom)}
                >
                  <Edit className="w-4 h-4 text-gray-500" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="p-1"
                  onClick={() => handleDeleteClick(classroom)}
                >
                  <Trash2 className="w-4 h-4 text-gray-500" />
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="w-4 h-4" />
                <span>{classroom.student_count || 0} {t("classrooms.students")}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <GraduationCap className="w-4 h-4" />
                <span>{t("classrooms.grade")} {classroom.grade}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Book className="w-4 h-4" />
                <span>{classroom.subject}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>{t("sessions.upcoming")}: --</span>
              </div>

              {classroom.notes && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600">{classroom.notes}</p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
              <Button 
                variant="outline" 
                className="w-full text-sm"
                onClick={() => handleDetailsClick(classroom)}
              >
                {t("common.view")} {t("common.details")}
              </Button>
              <Button 
                className="w-full text-sm"
                onClick={() => onNavigateToSessions?.(classroom.id)}
              >
                {t("classrooms.viewSessions")}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {classrooms.length === 0 && (
        <Card className="p-8 text-center">
          <School className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900">{t("classrooms.noClassrooms")}</h3>
          <p className="text-gray-500">{t("classrooms.createFirstClassroom")}</p>
          <Button 
            className="flex items-center gap-2 mx-auto"
            onClick={() => setShowModal(true)}
          >
            <Plus className="w-4 h-4" />
            Add Your First Classroom
          </Button>
        </Card>
      )}

      {/* Add Classroom Modal */}
      {showModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-border w-full max-w-md mx-4 max-h-[90vh] shadow-lg flex flex-col">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">{t("classrooms.createClassroom")}</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setShowModal(false)
                              setSchedules([])
                  setSelectedStudents([])
                  setActiveTimePicker(null)
                  setStudentSearchQuery('')
                }}
                className="p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 pt-4">

            <form id="classroom-form" onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">
                  {t("classrooms.classroomName")} *
                </Label>
                <Input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder={t("classrooms.enterClassroomName")}
                  className="h-10 rounded-lg border border-border bg-transparent focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">
                    {t("classrooms.grade")}
                  </Label>
                  <Input
                    type="text"
                    value={formData.grade}
                    onChange={(e) => handleInputChange('grade', e.target.value)}
                    placeholder={t("classrooms.enterCapacity")}
                    className="h-10 rounded-lg border border-border bg-transparent focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">
                    {t("classrooms.subject")}
                  </Label>
                  <Input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => handleInputChange('subject', e.target.value)}
                    placeholder={t("classrooms.enterSubject")}
                    className="h-10 rounded-lg border border-border bg-transparent focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">
                  {t("classrooms.teacher")}
                </Label>
                <Select value={formData.teacher_id} onValueChange={handleTeacherChange}>
                  <SelectTrigger className="!h-10 w-full rounded-lg border border-border bg-transparent focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary py-2 px-3">
                    <SelectValue placeholder={t("classrooms.selectTeacher")} />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">
                  {t("classrooms.color")}
                </Label>
                <div className="p-4 bg-gray-50 rounded-lg border border-border">
                  {/* Current Color Display */}
                  <div className="flex items-center gap-3 mb-4">
                    <div 
                      className="w-12 h-12 rounded-lg border-2 border-white shadow-sm"
                      style={{ backgroundColor: formData.color }}
                    />
                    <div>
                      <Label className="text-sm font-medium text-foreground">{t("classrooms.selectedColor")}</Label>
                      <p className="text-xs text-foreground/60">{colorNames[formData.color] || formData.color}</p>
                    </div>
                  </div>
                  
                  {/* Preset Colors Grid */}
                  <div>
                    <Label className="text-xs font-medium text-foreground/70 mb-2 block">{t("classrooms.presetColors")}</Label>
                    <div className="grid grid-cols-6 gap-2">
                      {presetColors.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => handleInputChange('color', color)}
                          className={`w-8 h-8 rounded-lg border-2 shadow-sm transition-all duration-150 ease-out hover:scale-[1.02] hover:shadow-md hover:-translate-y-0.5 ${
                            formData.color === color 
                              ? 'border-gray-300' 
                              : 'border-white hover:border-gray-300'
                          }`}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Schedule Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-foreground/80">
                    {t("classrooms.classSchedule")}
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addSchedule}
                    className="h-8 px-2 text-blue-600 hover:text-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    {t("classrooms.addSchedule")}
                  </Button>
                </div>
                
                {schedules.length === 0 ? (
                  <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">{t("classrooms.noSchedulesAdded")}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {schedules.map((schedule, index) => (
                      <div key={schedule.id} className="p-3 bg-gray-50 rounded-lg border border-border">
                        <div className="flex items-center justify-between mb-3">
                          <Label className="text-sm font-medium text-foreground/80">
                            {t("classrooms.schedule")} {index + 1}
                          </Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSchedule(schedule.id)}
                            className="h-6 w-6 p-0"
                          >
                            <Trash2 className="w-3 h-3 text-gray-500" />
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <Label className="text-xs text-foreground/60 mb-1 block">{t("classrooms.day")}</Label>
                            <Select
                              value={schedule.day}
                              onValueChange={(value) => updateSchedule(schedule.id, 'day', value)}
                            >
                              <SelectTrigger className="h-9 text-sm bg-white focus:border-primary data-[state=open]:border-primary">
                                <SelectValue>
                                  {schedule.day ? getTranslatedDay(schedule.day) : ''}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {daysOfWeek.map((day) => (
                                  <SelectItem key={day} value={day}>
                                    {t(`classrooms.${day}`)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs text-foreground/60 mb-1 block">{t("classrooms.startTime")}</Label>
                              <TimePickerComponent
                                value={schedule.start_time}
                                onChange={(value) => updateSchedule(schedule.id, 'start_time', value)}
                                scheduleId={schedule.id}
                                field="start_time"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-foreground/60 mb-1 block">{t("classrooms.endTime")}</Label>
                              <TimePickerComponent
                                value={schedule.end_time}
                                onChange={(value) => updateSchedule(schedule.id, 'end_time', value)}
                                scheduleId={schedule.id}
                                field="end_time"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Student Enrollment Section */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">
                  {t("classrooms.studentEnrollment")}
                </Label>
                <div className="border border-border rounded-lg bg-gray-50 p-4">
                  {students.length === 0 ? (
                    <div className="text-center py-4">
                      <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">{t("classrooms.noStudentsAvailable")}</p>
                    </div>
                  ) : (
                    <>
                      {/* Search Bar */}
                      <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          type="text"
                          placeholder={t("classrooms.searchStudents")}
                          value={studentSearchQuery}
                          onChange={(e) => setStudentSearchQuery(e.target.value)}
                          className="h-9 pl-10 rounded-lg border border-border bg-white focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
                        />
                      </div>
                      
                      <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-hide">
                        {filteredStudents.length === 0 ? (
                          <div className="text-center py-4">
                            <Users className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">{t("classrooms.noStudentsFound")}</p>
                          </div>
                        ) : (
                          filteredStudents.map((student) => (
                        <label
                          key={student.id}
                          className="flex items-center gap-3 p-2 hover:bg-white/50 rounded-md cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedStudents.includes(student.id)}
                            onChange={() => toggleStudentSelection(student.id)}
                            className="w-4 h-4 text-primary border-border rounded focus:ring-0 focus:outline-none hover:border-border focus:border-border"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-900 truncate">
                                {student.name}
                              </span>
                              {student.school_name && (
                                <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                                  {student.school_name}
                                </span>
                              )}
                            </div>
                          </div>
                        </label>
                          ))
                        )}
                      </div>
                    </>
                  )}
                  
                  {selectedStudents.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-600">
                        {selectedStudents.length} {selectedStudents.length === 1 ? t("classrooms.studentSelected") : t("classrooms.studentsSelected")}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">
                  {t("classrooms.notes")}
                </Label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                  className="w-full min-h-[2.5rem] px-3 py-2 rounded-lg border border-border bg-transparent focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none resize-none text-sm"
                  placeholder={t("classrooms.additionalNotes")}
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
                              setSchedules([])
                  setSelectedStudents([])
                  setActiveTimePicker(null)
                  setStudentSearchQuery('')
                }}
                className="flex-1"
              >
                {t("common.cancel")}
              </Button>
              <Button 
                type="submit"
                form="classroom-form"
                className="flex-1"
              >
                {t("classrooms.createClassroom")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Classroom Confirmation Modal */}
      {showDeleteModal && classroomToDelete && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-border w-full max-w-md mx-4 shadow-lg">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">{t("classrooms.deleteConfirmTitle")}</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setShowDeleteModal(false)
                  setClassroomToDelete(null)
                }}
                className="p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-6">
              <p className="text-sm text-gray-600">
                {t("classrooms.deleteConfirmMessage")}
              </p>
            </div>

            <div className="flex items-center gap-3 p-6 pt-0">
              <Button 
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false)
                  setClassroomToDelete(null)
                }}
                className="flex-1"
              >
                {t("common.cancel")}
              </Button>
              <Button 
                type="button"
                onClick={handleDeleteConfirm}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {t("classrooms.deleteConfirm")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Classroom Modal */}
      {showEditModal && editingClassroom && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-border w-full max-w-md mx-4 max-h-[90vh] shadow-lg flex flex-col">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">{t("classrooms.editClassroom")}</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setShowEditModal(false)
                  setEditingClassroom(null)
                              setSchedules([])
                  setSelectedStudents([])
                  setActiveTimePicker(null)
                  setStudentSearchQuery('')
                }}
                className="p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 pt-4">
              <form id="edit-classroom-form" onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">
                    Classroom Name *
                  </Label>
                  <Input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t("classrooms.enterClassroomName")}
                    className="h-10 rounded-lg border border-border bg-transparent focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground/80">
                      {t("classrooms.grade")}
                    </Label>
                    <Input
                      type="text"
                      value={formData.grade}
                      onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                      placeholder={t("classrooms.enterCapacity")}
                      className="h-10 rounded-lg border border-border bg-transparent focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground/80">
                      {t("classrooms.subject")}
                    </Label>
                    <Input
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder={t("classrooms.enterSubject")}
                      className="h-10 rounded-lg border border-border bg-transparent focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">
                    {t("classrooms.teacher")}
                  </Label>
                  <Select 
                    value={formData.teacher_id} 
                    onValueChange={(value) => {
                      const selectedTeacher = teachers.find(t => t.user_id === value)
                      setFormData({ 
                        ...formData, 
                        teacher_id: value,
                        teacher_name: selectedTeacher?.name || ''
                      })
                    }}
                  >
                    <SelectTrigger className="!h-10 w-full rounded-lg border border-border bg-transparent focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary py-2 px-3">
                      <SelectValue placeholder={t("classrooms.selectTeacher")} />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher.user_id} value={teacher.user_id}>
                          {teacher.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">
                    {t("classrooms.color")}
                  </Label>
                  <div className="p-4 bg-gray-50 rounded-lg border border-border">
                    {/* Current Color Display */}
                    <div className="flex items-center gap-3 mb-4">
                      <div 
                        className="w-12 h-12 rounded-lg border-2 border-white shadow-sm"
                        style={{ backgroundColor: formData.color }}
                      />
                      <div>
                        <Label className="text-sm font-medium text-foreground">{t("classrooms.selectedColor")}</Label>
                        <p className="text-xs text-foreground/60">{formData.color}</p>
                      </div>
                    </div>
                    
                    {/* Preset Colors Grid */}
                    <div>
                      <Label className="text-xs font-medium text-foreground/70 mb-2 block">{t("classrooms.presetColors")}</Label>
                      <div className="grid grid-cols-6 gap-2">
                        {presetColors.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setFormData({ ...formData, color })}
                            className={`w-8 h-8 rounded-lg border-2 shadow-sm transition-all duration-150 ease-out hover:scale-[1.02] hover:shadow-md hover:-translate-y-0.5 ${
                              formData.color === color 
                                ? 'border-gray-300' 
                                : 'border-white hover:border-gray-300'
                            }`}
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Schedule Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-foreground/80">
                      {t("classrooms.classSchedule")}
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={addSchedule}
                      className="h-8 px-2 text-blue-600 hover:text-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      {t("classrooms.addSchedule")}
                    </Button>
                  </div>
                  
                  {schedules.length === 0 ? (
                    <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                      <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">{t("classrooms.noSchedulesAdded")}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {schedules.map((schedule, index) => (
                        <div key={schedule.id} className="p-3 bg-gray-50 rounded-lg border border-border">
                          <div className="flex items-center justify-between mb-3">
                            <Label className="text-sm font-medium text-foreground/80">
                              {t("classrooms.schedule")} {index + 1}
                            </Label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeSchedule(schedule.id)}
                              className="h-6 w-6 p-0"
                            >
                              <Trash2 className="w-3 h-3 text-gray-500" />
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-1 gap-3">
                            <div>
                              <Label className="text-xs text-foreground/60 mb-1 block">{t("classrooms.day")}</Label>
                              <Select
                                value={schedule.day}
                                onValueChange={(value) => updateSchedule(schedule.id, 'day', value)}
                              >
                                <SelectTrigger className="h-9 text-sm bg-white focus:border-primary data-[state=open]:border-primary">
                                  <SelectValue>
                                    {schedule.day ? getTranslatedDay(schedule.day) : ''}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  {daysOfWeek.map((day) => (
                                    <SelectItem key={day} value={day}>
                                      {t(`classrooms.${day}`)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs text-foreground/60 mb-1 block">{t("classrooms.startTime")}</Label>
                                <TimePickerComponent
                                  value={schedule.start_time}
                                  onChange={(value) => updateSchedule(schedule.id, 'start_time', value)}
                                  scheduleId={schedule.id}
                                  field="start_time"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-foreground/60 mb-1 block">{t("classrooms.endTime")}</Label>
                                <TimePickerComponent
                                  value={schedule.end_time}
                                  onChange={(value) => updateSchedule(schedule.id, 'end_time', value)}
                                  scheduleId={schedule.id}
                                  field="end_time"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">
                    {t("classrooms.notes")}
                  </Label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full min-h-[2.5rem] px-3 py-2 rounded-lg border border-border bg-transparent focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none resize-none text-sm"
                    placeholder={t("classrooms.additionalNotes")}
                  />
                </div>

                {/* Student Enrollment Section */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">
                    {t("classrooms.studentEnrollment")}
                  </Label>
                  <div className="border border-border rounded-lg bg-gray-50 p-4">
                    {students.length === 0 ? (
                      <div className="text-center py-4">
                        <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">{t("classrooms.noStudentsAvailable")}</p>
                      </div>
                    ) : (
                      <>
                        {/* Search Bar */}
                        <div className="relative mb-3">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <Input
                            type="text"
                            placeholder={t("classrooms.searchStudents")}
                            value={studentSearchQuery}
                            onChange={(e) => setStudentSearchQuery(e.target.value)}
                            className="h-9 pl-10 rounded-lg border border-border bg-white focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
                          />
                        </div>
                        
                        <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-hide">
                          {filteredStudents.length === 0 ? (
                            <div className="text-center py-4">
                              <Users className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                              <p className="text-sm text-gray-500">{t("classrooms.noStudentsFound")}</p>
                            </div>
                          ) : (
                            filteredStudents.map((student) => (
                              <label
                                key={student.id}
                                className="flex items-center gap-3 p-2 hover:bg-white/50 rounded-md cursor-pointer transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedStudents.includes(student.user_id)}
                                  onChange={() => {
                                    if (selectedStudents.includes(student.user_id)) {
                                      setSelectedStudents(selectedStudents.filter(id => id !== student.user_id))
                                    } else {
                                      setSelectedStudents([...selectedStudents, student.user_id])
                                    }
                                  }}
                                  className="w-4 h-4 text-primary border-border rounded focus:ring-0 focus:outline-none hover:border-border focus:border-border"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-900 truncate">
                                      {student.name}
                                    </span>
                                    {student.school_name && (
                                      <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                                        {student.school_name}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </label>
                            ))
                          )}
                        </div>
                      </>
                    )}
                    
                    {selectedStudents.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-600">
                          {selectedStudents.length} {selectedStudents.length === 1 ? t("classrooms.studentSelected") : t("classrooms.studentsSelected")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </form>
            </div>

            <div className="flex items-center gap-3 p-6 pt-4 border-t border-gray-200">
              <Button 
                type="button"
                variant="outline"
                onClick={() => {
                  setShowEditModal(false)
                  setEditingClassroom(null)
                              setSchedules([])
                  setSelectedStudents([])
                  setActiveTimePicker(null)
                  setStudentSearchQuery('')
                }}
                className="flex-1"
              >
                {t("common.cancel")}
              </Button>
              <Button 
                type="submit"
                form="edit-classroom-form"
                className="flex-1"
              >
                {t("classrooms.saveChanges")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Classroom Details Modal */}
      {showDetailsModal && selectedClassroom && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-border w-full max-w-6xl mx-4 max-h-[90vh] shadow-lg flex flex-col">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div 
                  className="w-6 h-6 rounded-full" 
                  style={{ backgroundColor: selectedClassroom.color || '#6B7280' }}
                />
                <h2 className="text-2xl font-bold text-gray-900">{selectedClassroom.name}</h2>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setShowDetailsModal(false)
                  setSelectedClassroom(null)
                }}
                className="p-1"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Classroom Info & Enrollment */}
                <div className="space-y-6">
                  {/* Classroom Information Card */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <School className="w-5 h-5" />
                      {t("classrooms.classroomInformation")}
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <GraduationCap className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600">{t("classrooms.grade")}</p>
                          <p className="font-medium text-gray-900">{selectedClassroom.grade || t("classrooms.notSpecified")}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Book className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600">{t("classrooms.subject")}</p>
                          <p className="font-medium text-gray-900">{selectedClassroom.subject || t("classrooms.notSpecified")}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <GraduationCap className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600">{t("classrooms.teacher")}</p>
                          <p className="font-medium text-gray-900">{selectedClassroom.teacher_name || t("classrooms.notAssigned")}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600">{t("classrooms.created")}</p>
                          <p className="font-medium text-gray-900">
                            {new Date(selectedClassroom.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Notes Card */}
                  {selectedClassroom.notes && (
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">{t("classrooms.notes")}</h3>
                      <p className="text-gray-700 leading-relaxed">{selectedClassroom.notes}</p>
                    </Card>
                  )}
                </div>

                {/* Right Column - Student Enrollment */}
                <div className="space-y-6">
                  {/* Student Enrollment Card */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      {t("classrooms.studentEnrollment")} ({selectedClassroom.student_count || 0})
                    </h3>
                    {!selectedClassroom.enrolled_students || selectedClassroom.enrolled_students.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">{t("classrooms.noStudentsEnrolled")}</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selectedClassroom.enrolled_students.map((student, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                                {student.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{student.name}</p>
                              </div>
                            </div>
                            {student.school_name && (
                              <div className="text-sm text-gray-500">
                                {student.school_name}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-6 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                {t("classrooms.created")}: {new Date(selectedClassroom.created_at).toLocaleDateString()}
                {selectedClassroom.updated_at !== selectedClassroom.created_at && (
                  <span className="ml-4">
                    {t("classrooms.updated")}: {new Date(selectedClassroom.updated_at).toLocaleDateString()}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline"
                  onClick={() => {
                    setShowDetailsModal(false)
                    handleEditClick(selectedClassroom)
                  }}
                >
                  <Edit className="w-4 h-4" />
                  {t("classrooms.editClassroom")}
                </Button>
                <Button 
                  onClick={() => {
                    setShowDetailsModal(false)
                    setSelectedClassroom(null)
                  }}
                >
                  {t("common.close")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}