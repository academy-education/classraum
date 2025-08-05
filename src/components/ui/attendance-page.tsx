"use client"

import { useState, useEffect } from 'react'
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
  GraduationCap,
  Building,
  X,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  UserCheck,
  Monitor
} from 'lucide-react'

interface AttendanceRecord {
  id: string
  session_id: string
  classroom_name?: string
  classroom_color?: string
  teacher_name?: string
  session_date?: string
  session_time?: string
  location: 'offline' | 'online'
  created_at: string
  updated_at: string
  student_count?: number
  present_count?: number
  absent_count?: number
  late_count?: number
  excused_count?: number
}

interface AttendancePageProps {
  academyId: string
  filterSessionId?: string
}

interface Teacher {
  user_id: string
  name: string
}

interface Classroom {
  id: string
  name: string
  color?: string
  teacher_name?: string
}

interface Session {
  id: string
  classroom_name: string
  date: string
  start_time: string
  end_time: string
}

interface StudentAttendance {
  id: string
  classroom_session_id: string
  student_id: string
  student_name: string
  status: 'present' | 'absent' | 'late' | 'excused'
  created_at: string
  updated_at: string
}

export function AttendancePage({ academyId, filterSessionId }: AttendancePageProps) {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showUpdateAttendanceModal, setShowUpdateAttendanceModal] = useState(false)
  const [recordToDelete, setRecordToDelete] = useState<AttendanceRecord | null>(null)
  const [viewingRecord, setViewingRecord] = useState<AttendanceRecord | null>(null)
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null)
  const [updateAttendanceRecord, setUpdateAttendanceRecord] = useState<AttendanceRecord | null>(null)
  const [attendanceToUpdate, setAttendanceToUpdate] = useState<any[]>([])
  const [attendanceSearchQuery, setAttendanceSearchQuery] = useState('')
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [sessionAttendance, setSessionAttendance] = useState<StudentAttendance[]>([])

  const [formData, setFormData] = useState({
    classroom_session_id: '',
    notes: ''
  })

  useEffect(() => {
    if (academyId) {
      fetchAttendanceRecords()
      fetchTeachers()
      fetchClassrooms()
      fetchSessions()
    }
  }, [academyId])

  const fetchAttendanceRecords = async () => {
    try {
      const { data: sessions, error: sessionsError } = await supabase
        .from('classroom_sessions')
        .select('*')
        .is('deleted_at', null)
        .order('date', { ascending: false })

      if (sessionsError) throw sessionsError

      if (!sessions || sessions.length === 0) {
        setAttendanceRecords([])
        setLoading(false)
        return
      }

      // Filter sessions by academy_id through classroom relationship
      const sessionsByAcademy = await Promise.all(
        sessions.map(async (session: any) => {
          const { data: classroomData } = await supabase
            .from('classrooms')
            .select('academy_id')
            .eq('id', session.classroom_id)
            .single()
          
          return classroomData?.academy_id === academyId ? session : null
        })
      )

      const filteredSessions = sessionsByAcademy.filter(Boolean)

      const attendanceRecordsWithDetails = await Promise.all(
        filteredSessions.map(async (session: any) => {
          // Get classroom details
          const { data: classroomData } = await supabase
            .from('classrooms')
            .select('name, color, teacher_id')
            .eq('id', session.classroom_id)
            .single()

          // Get teacher name
          let teacher_name = 'Unknown Teacher'
          if (classroomData?.teacher_id) {
            const { data: teacherData } = await supabase
              .from('users')
              .select('name')
              .eq('id', classroomData.teacher_id)
              .single()
            teacher_name = teacherData?.name || 'Unknown Teacher'
          }

          // Get attendance counts for this session
          const { data: attendanceData, error: attendanceError } = await supabase
            .from('attendance')
            .select('status')
            .eq('classroom_session_id', session.id)

          if (attendanceError) {
            console.error('Error fetching attendance:', attendanceError)
          }

          const attendanceCounts = attendanceData?.reduce((acc: any, att: any) => {
            acc[att.status] = (acc[att.status] || 0) + 1
            acc.total = (acc.total || 0) + 1
            return acc
          }, {}) || {}

          return {
            id: session.id,
            session_id: session.id,
            classroom_name: classroomData?.name || 'Unknown Classroom',
            classroom_color: classroomData?.color,
            teacher_name: teacher_name,
            session_date: session.date,
            session_time: `${session.start_time} - ${session.end_time}`,
            location: session.location,
            created_at: session.created_at,
            updated_at: session.updated_at,
            student_count: attendanceCounts.total || 0,
            present_count: attendanceCounts.present || 0,
            absent_count: attendanceCounts.absent || 0,
            late_count: attendanceCounts.late || 0,
            excused_count: attendanceCounts.excused || 0
          }
        })
      )

      setAttendanceRecords(attendanceRecordsWithDetails)
    } catch (error) {
      console.error('Error fetching attendance records:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTeachers = async () => {
    try {
      const { data, error } = await supabase
        .from('teachers')
        .select(`
          user_id,
          users!inner(name)
        `)
        .eq('academy_id', academyId)
        .eq('active', true)

      if (error) throw error

      const teachersData = data?.map((teacher: any) => ({
        user_id: teacher.user_id,
        name: teacher.users.name
      })) || []

      setTeachers(teachersData)
    } catch (error) {
      console.error('Error fetching teachers:', error)
    }
  }

  const fetchClassrooms = async () => {
    try {
      const { data, error } = await supabase
        .from('classrooms')
        .select(`
          id,
          name,
          color,
          teachers!inner(
            users!inner(name)
          )
        `)
        .eq('academy_id', academyId)
        .is('deleted_at', null)

      if (error) throw error

      const classroomsData = data?.map((classroom: any) => ({
        id: classroom.id,
        name: classroom.name,
        color: classroom.color,
        teacher_name: classroom.teachers?.[0]?.users?.name || 'Unknown'
      })) || []

      setClassrooms(classroomsData)
    } catch (error) {
      console.error('Error fetching classrooms:', error)
    }
  }

  const fetchSessions = async () => {
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
        .eq('classrooms.academy_id', academyId)
        .is('deleted_at', null)
        .order('date', { ascending: false })

      if (error) throw error

      const sessionsData = data?.map((session: any) => ({
        id: session.id,
        classroom_name: session.classrooms.name,
        date: session.date,
        start_time: session.start_time,
        end_time: session.end_time
      })) || []

      setSessions(sessionsData)
    } catch (error) {
      console.error('Error fetching sessions:', error)
    }
  }

  const handleViewDetails = async (record: AttendanceRecord) => {
    setViewingRecord(record)
    
    // Fetch detailed attendance for this session
    try {
      const { data: attendanceData, error } = await supabase
        .from('attendance')
        .select(`
          id,
          classroom_session_id,
          student_id,
          status,
          created_at,
          updated_at,
          students!inner(
            users!inner(name)
          )
        `)
        .eq('classroom_session_id', record.session_id)

      if (error) throw error

      const attendanceWithNames = attendanceData?.map((att: any) => ({
        id: att.id,
        classroom_session_id: att.classroom_session_id,
        student_id: att.student_id,
        student_name: att.students.users.name,
        status: att.status,
        created_at: att.created_at,
        updated_at: att.updated_at
      })) || []

      setSessionAttendance(attendanceWithNames)
    } catch (error) {
      console.error('Error fetching session attendance:', error)
      setSessionAttendance([])
    }
    
    setShowViewModal(true)
  }

  const handleUpdateAttendance = async (record: AttendanceRecord) => {
    setUpdateAttendanceRecord(record)
    
    // Fetch attendance data for this session
    try {
      const { data: attendanceData, error } = await supabase
        .from('attendance')
        .select(`
          id,
          classroom_session_id,
          student_id,
          status,
          note,
          created_at,
          updated_at,
          students!inner(
            users!inner(name)
          )
        `)
        .eq('classroom_session_id', record.session_id)

      if (error) throw error

      const attendanceWithNames = attendanceData?.map((att: any) => ({
        id: att.id,
        classroom_session_id: att.classroom_session_id,
        student_id: att.student_id,
        student_name: att.students.users.name,
        status: att.status,
        note: att.note,
        created_at: att.created_at,
        updated_at: att.updated_at
      })) || []

      setAttendanceToUpdate(attendanceWithNames)
    } catch (error) {
      console.error('Error fetching attendance for update:', error)
      setAttendanceToUpdate([])
    }
    
    setShowUpdateAttendanceModal(true)
  }

  const updateAttendanceStatus = (attendanceId: string, field: string, value: any) => {
    setAttendanceToUpdate(prev => 
      prev.map(att => 
        att.id === attendanceId ? { ...att, [field]: value } : att
      )
    )
  }

  const saveAttendanceChanges = async () => {
    try {
      const updates = attendanceToUpdate.map(attendance => ({
        id: attendance.id,
        status: attendance.status,
        note: attendance.note,
        updated_at: new Date().toISOString()
      }))

      for (const update of updates) {
        const { error } = await supabase
          .from('attendance')
          .update({
            status: update.status,
            note: update.note,
            updated_at: update.updated_at
          })
          .eq('id', update.id)

        if (error) {
          console.error('Error updating attendance:', error)
          alert('Error updating attendance: ' + error.message)
          return
        }
      }

      alert('Attendance updated successfully!')
      setShowUpdateAttendanceModal(false)
      setUpdateAttendanceRecord(null)
      setAttendanceToUpdate([])
      
      // Refresh the attendance records
      await fetchAttendanceRecords()
    } catch (error) {
      console.error('Error saving attendance changes:', error)
      alert('An unexpected error occurred while saving changes.')
    }
  }

  const handleDeleteClick = (record: AttendanceRecord) => {
    setRecordToDelete(record)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!recordToDelete) return

    try {
      // Note: We don't actually delete attendance records, but we could mark them as deleted
      // For now, this is just a placeholder
      console.log('Delete attendance record:', recordToDelete.id)
      
      await fetchAttendanceRecords()
      setShowDeleteModal(false)
      setRecordToDelete(null)
    } catch (error) {
      console.error('Error deleting attendance record:', error)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (timeString: string) => {
    const time = new Date(`1970-01-01T${timeString}`)
    return time.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800'
      case 'absent':
        return 'bg-red-100 text-red-800'
      case 'late':
        return 'bg-yellow-100 text-yellow-800'
      case 'excused':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'absent':
        return <XCircle className="w-4 h-4 text-red-600" />
      case 'late':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />
      case 'excused':
        return <CheckCircle className="w-4 h-4 text-blue-600" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />
    }
  }

  const filteredAttendanceRecords = attendanceRecords.filter(record => {
    // Apply session filter if provided
    if (filterSessionId && record.session_id !== filterSessionId) {
      return false
    }
    
    // Apply search filter
    if (!attendanceSearchQuery) return true
    
    return (
      record.classroom_name?.toLowerCase().includes(attendanceSearchQuery.toLowerCase()) ||
      record.teacher_name?.toLowerCase().includes(attendanceSearchQuery.toLowerCase()) ||
      record.session_date?.toLowerCase().includes(attendanceSearchQuery.toLowerCase())
    )
  })

  const AttendanceSkeleton = () => (
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
      </div>
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="h-9 bg-gray-200 rounded w-full"></div>
      </div>
    </Card>
  )

  if (loading) {
    return (
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
            <p className="text-gray-500">Track student attendance across all sessions</p>
          </div>
        </div>
        
        {/* Search Bar Skeleton */}
        <div className="relative mb-4 max-w-md animate-pulse">
          <div className="h-12 bg-gray-200 rounded-lg"></div>
        </div>
        
        {/* Attendance Grid Skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <AttendanceSkeleton key={i} />
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
          <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
          <p className="text-gray-500">Track student attendance across all sessions</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <Input
          type="text"
          placeholder="Search by classroom, teacher, or date..."
          value={attendanceSearchQuery}
          onChange={(e) => setAttendanceSearchQuery(e.target.value)}
          className="h-12 pl-12 rounded-lg border border-border bg-white focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 text-sm shadow-sm"
        />
      </div>

      {/* Attendance Records Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAttendanceRecords.map((record) => (
          <Card key={record.id} className="p-6 hover:shadow-md transition-shadow flex flex-col h-full">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: record.classroom_color || '#6B7280' }}
                />
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{record.classroom_name}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                    <GraduationCap className="w-4 h-4" />
                    <span>{record.teacher_name}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="p-1"
                  onClick={() => handleUpdateAttendance(record)}
                >
                  <Edit className="w-4 h-4 text-gray-500" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="p-1"
                  onClick={() => handleDeleteClick(record)}
                >
                  <Trash2 className="w-4 h-4 text-gray-500" />
                </Button>
              </div>
            </div>
            
            <div className="space-y-3 flex-grow">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(record.session_date || '')}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>{record.session_time}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-gray-600">
                {record.location === 'online' ? (
                  <Monitor className="w-4 h-4" />
                ) : (
                  <Building className="w-4 h-4" />
                )}
                <span className="capitalize">{record.location}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <UserCheck className="w-4 h-4" />
                <span>{record.present_count || 0} present, {record.absent_count || 0} absent</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="w-4 h-4" />
                <span>{record.student_count || 0} total students</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <Button 
                variant="outline" 
                className="w-full text-sm"
                onClick={() => handleViewDetails(record)}
              >
                View Details
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {filteredAttendanceRecords.length === 0 && (
        <div className="text-center py-12">
          <UserCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No attendance records found</h3>
          <p className="text-gray-600 mb-4">
            {attendanceSearchQuery ? 'Try adjusting your search criteria.' : 'No attendance records have been created yet.'}
          </p>
        </div>
      )}

      {/* View Details Modal */}
      {showViewModal && viewingRecord && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-border w-full max-w-6xl mx-4 max-h-[90vh] shadow-lg flex flex-col">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div 
                  className="w-6 h-6 rounded-full" 
                  style={{ backgroundColor: viewingRecord.classroom_color || '#6B7280' }}
                />
                <h2 className="text-2xl font-bold text-gray-900">{viewingRecord.classroom_name} - Attendance</h2>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowViewModal(false)}
                className="p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Session Info */}
                <div className="space-y-6">
                  {/* Session Information Card */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Session Information
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600">Date</p>
                          <p className="font-medium text-gray-900">{formatDate(viewingRecord.session_date || '')}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600">Time</p>
                          <p className="font-medium text-gray-900">{viewingRecord.session_time}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <GraduationCap className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600">Teacher</p>
                          <p className="font-medium text-gray-900">{viewingRecord.teacher_name}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {viewingRecord.location === 'online' ? (
                          <Monitor className="w-5 h-5 text-gray-500" />
                        ) : (
                          <Building className="w-5 h-5 text-gray-500" />
                        )}
                        <div>
                          <p className="text-sm text-gray-600">Location</p>
                          <p className="font-medium text-gray-900 capitalize">{viewingRecord.location}</p>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Attendance Summary Card */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <UserCheck className="w-5 h-5" />
                      Attendance Summary
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">{viewingRecord.present_count || 0}</p>
                        <p className="text-sm text-green-700">Present</p>
                      </div>
                      <div className="text-center p-3 bg-red-50 rounded-lg">
                        <p className="text-2xl font-bold text-red-600">{viewingRecord.absent_count || 0}</p>
                        <p className="text-sm text-red-700">Absent</p>
                      </div>
                      <div className="text-center p-3 bg-yellow-50 rounded-lg">
                        <p className="text-2xl font-bold text-yellow-600">{viewingRecord.late_count || 0}</p>
                        <p className="text-sm text-yellow-700">Late</p>
                      </div>
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">{viewingRecord.excused_count || 0}</p>
                        <p className="text-sm text-blue-700">Excused</p>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Right Column - Student Attendance */}
                <div className="space-y-6">
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Student Attendance ({sessionAttendance.length})
                    </h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {sessionAttendance.map((attendance) => {
                        const studentName = attendance.student_name || 'Unknown Student'
                        const initials = studentName.split(' ').map((n: string) => n[0]).join('').toUpperCase()
                        
                        return (
                          <div key={attendance.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                                {initials}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{studentName}</p>
                                {attendance.created_at && (
                                  <p className="text-xs text-gray-400">Recorded: {new Date(attendance.created_at).toLocaleDateString()}</p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(attendance.status)}`}>
                                {attendance.status}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                      {sessionAttendance.length === 0 && (
                        <div className="text-center py-8">
                          <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">No attendance records found for this session.</p>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-6 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                Created: {new Date(viewingRecord.created_at).toLocaleDateString()}
                {viewingRecord.updated_at !== viewingRecord.created_at && (
                  <span className="ml-4">
                    Updated: {new Date(viewingRecord.updated_at).toLocaleDateString()}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  onClick={() => setShowViewModal(false)}
                >
                  Close
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setShowViewModal(false)
                    handleUpdateAttendance(viewingRecord)
                  }}
                  className="flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit Attendance
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Attendance Modal */}
      {showUpdateAttendanceModal && updateAttendanceRecord && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-border w-full max-w-6xl mx-4 max-h-[90vh] shadow-lg flex flex-col">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div 
                  className="w-6 h-6 rounded-full" 
                  style={{ backgroundColor: updateAttendanceRecord.classroom_color || '#6B7280' }}
                />
                <h2 className="text-2xl font-bold text-gray-900">Update Attendance - {updateAttendanceRecord.classroom_name}</h2>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="p-1"
                onClick={() => {
                  setShowUpdateAttendanceModal(false)
                  setUpdateAttendanceRecord(null)
                  setAttendanceToUpdate([])
                }}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {attendanceToUpdate.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-2">No Students Found</p>
                  <p className="text-gray-600">No students have attendance records for this session yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {attendanceToUpdate.map((attendance) => (
                    <Card key={attendance.id} className="p-6">
                      <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 items-start">
                        {/* Student Name */}
                        <div className="lg:col-span-1">
                          <Label className="text-sm font-medium text-gray-700">{attendance.student_name}</Label>
                        </div>

                        {/* Status */}
                        <div className="lg:col-span-1">
                          <Label className="text-xs text-gray-500 mb-1 block">Status</Label>
                          <Select 
                            value={attendance.status} 
                            onValueChange={(value) => updateAttendanceStatus(attendance.id, 'status', value)}
                          >
                            <SelectTrigger className="h-9 text-sm bg-white border border-border focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="present">Present</SelectItem>
                              <SelectItem value="absent">Absent</SelectItem>
                              <SelectItem value="late">Late</SelectItem>
                              <SelectItem value="excused">Excused</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Spacer column */}
                        <div className="lg:col-span-1"></div>

                        {/* Note */}
                        <div className="lg:col-span-3">
                          <Label className="text-xs text-gray-500 mb-1 block">Note</Label>
                          <Input
                            value={attendance.note || ''}
                            onChange={(e) => updateAttendanceStatus(attendance.id, 'note', e.target.value)}
                            placeholder="Teacher note..."
                            className="h-9 text-sm"
                          />
                        </div>
                      </div>

                      {/* Additional Info */}
                      <div className="mt-4 pt-4 border-t border-gray-100 flex gap-6 text-xs text-gray-500">
                        {attendance.created_at && (
                          <span>Created: {new Date(attendance.created_at).toLocaleDateString()}</span>
                        )}
                        {attendance.updated_at && attendance.updated_at !== attendance.created_at && (
                          <span>Updated: {new Date(attendance.updated_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                {attendanceToUpdate.length} student{attendanceToUpdate.length !== 1 ? 's' : ''}
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowUpdateAttendanceModal(false)
                    setUpdateAttendanceRecord(null)
                    setAttendanceToUpdate([])
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={saveAttendanceChanges} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && recordToDelete && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-border w-full max-w-md mx-4 shadow-lg">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Delete Attendance Record</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowDeleteModal(false)}
                className="p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to delete the attendance record for {recordToDelete.classroom_name} on {formatDate(recordToDelete.session_date || '')}? 
                This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteConfirm}
                  className="flex-1"
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}