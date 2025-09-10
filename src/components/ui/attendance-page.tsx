"use client"

import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Calendar,
  Edit,
  Clock,
  Users,
  GraduationCap,
  Building,
  X,
  Search,
  UserCheck,
  Monitor
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

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

interface StudentAttendance {
  id: string
  classroom_session_id: string
  student_id: string
  student_name: string
  status: 'pending' | 'present' | 'absent' | 'late' | 'excused'
  created_at: string
  updated_at: string
  note?: string
}

export function AttendancePage({ academyId, filterSessionId }: AttendancePageProps) {
  const { t, language, loading: translationLoading } = useTranslation()
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showUpdateAttendanceModal, setShowUpdateAttendanceModal] = useState(false)
  const [viewingRecord, setViewingRecord] = useState<AttendanceRecord | null>(null)
  const [updateAttendanceRecord, setUpdateAttendanceRecord] = useState<AttendanceRecord | null>(null)
  const [attendanceToUpdate, setAttendanceToUpdate] = useState<StudentAttendance[]>([])
  const [attendanceSearchQuery, setAttendanceSearchQuery] = useState('')
  const [sessionAttendance, setSessionAttendance] = useState<StudentAttendance[]>([])
  const [missingStudents, setMissingStudents] = useState<{id: string; name: string}[]>([])

  const fetchAttendanceRecords = useCallback(async () => {
    try {
      // First get classrooms for this academy
      const { data: academyClassrooms } = await supabase
        .from('classrooms')
        .select('id, name, color, teacher_id')
        .eq('academy_id', academyId)
      
      if (!academyClassrooms || academyClassrooms.length === 0) {
        setAttendanceRecords([])
        setLoading(false)
        return
      }

      const classroomIds = academyClassrooms.map(c => c.id)
      
      // Get sessions for these classrooms
      const { data: sessions, error: sessionsError } = await supabase
        .from('classroom_sessions')
        .select('*')
        .in('classroom_id', classroomIds)
        .is('deleted_at', null)
        .order('date', { ascending: false })

      if (sessionsError) throw sessionsError

      if (!sessions || sessions.length === 0) {
        setAttendanceRecords([])
        setLoading(false)
        return
      }

      // Get teacher names for all unique teacher_ids
      const teacherIds = [...new Set(academyClassrooms.map(c => c.teacher_id).filter(Boolean))]
      const { data: teachers } = await supabase
        .from('users')
        .select('id, name')
        .in('id', teacherIds)

      // Get attendance data for all sessions
      const sessionIds = sessions.map(s => s.id)
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('classroom_session_id, status')
        .in('classroom_session_id', sessionIds)

      // Create lookup maps
      const classroomMap = Object.fromEntries(
        academyClassrooms.map(c => [c.id, c])
      )
      const teacherMap = Object.fromEntries(
        (teachers || []).map(t => [t.id, t.name])
      )

      // Group attendance by session
      const attendanceBySession = (attendanceData || []).reduce((acc, att) => {
        const sessionId = att.classroom_session_id
        if (!acc[sessionId]) acc[sessionId] = {}
        acc[sessionId][att.status] = (acc[sessionId][att.status] || 0) + 1
        acc[sessionId].total = (acc[sessionId].total || 0) + 1
        return acc
      }, {} as Record<string, Record<string, number>>)

      // Process sessions with all data available
      const attendanceRecordsWithDetails = sessions.map(session => {
        const classroom = classroomMap[session.classroom_id]
        const teacher_name = classroom?.teacher_id ? (teacherMap[classroom.teacher_id] || t('common.unknownTeacher')) : t('common.unknownTeacher')
        const attendanceCounts = attendanceBySession[session.id] || {}

        return {
          id: session.id,
          session_id: session.id,
          classroom_name: classroom?.name || t('common.unknownClassroom'),
          classroom_color: classroom?.color,
          teacher_name: teacher_name,
          session_date: session.date,
          session_time: `${session.start_time} - ${session.end_time}`,
          location: session.location as 'offline' | 'online',
          created_at: session.created_at,
          updated_at: session.updated_at,
          student_count: attendanceCounts.total || 0,
          present_count: attendanceCounts.present || 0,
          absent_count: attendanceCounts.absent || 0,
          late_count: attendanceCounts.late || 0,
          excused_count: attendanceCounts.excused || 0
        }
      })

      setAttendanceRecords(attendanceRecordsWithDetails)
    } catch (error) {
      console.error('Error fetching attendance records:', error)
    } finally {
      setLoading(false)
    }
  }, [academyId, t])

  // Fetch attendance records when component mounts or academyId changes
  useEffect(() => {
    setLoading(true)
    fetchAttendanceRecords()
  }, [academyId, fetchAttendanceRecords])

  const handleViewDetails = async (record: AttendanceRecord) => {
    setViewingRecord(record)
    
    // Show modal immediately
    setShowViewModal(true)
    
    // Fetch detailed attendance for this session
    try {
      // Get attendance records
      const { data: attendanceData, error } = await supabase
        .from('attendance')
        .select('id, classroom_session_id, student_id, status, created_at, updated_at')
        .eq('classroom_session_id', record.session_id)
      
      if (error) throw error
      
      if (!attendanceData || attendanceData.length === 0) {
        setSessionAttendance([])
        return
      }
      
      // Get student IDs and their user details
      const studentIds = attendanceData.map(att => att.student_id)
      
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('user_id')
        .in('user_id', studentIds)
      
      if (studentsError) throw studentsError
      
      const userIds = studentsData?.map(s => s.user_id) || []
      
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, name')
        .in('id', userIds)

      if (usersError) throw usersError

      // Map attendance with user names
      const attendanceWithNames = attendanceData.map(att => {
        const user = usersData?.find(u => u.id === att.student_id)
        return {
          id: att.id,
          classroom_session_id: att.classroom_session_id,
          student_id: att.student_id,
          student_name: user?.name || t('common.unknownStudent'),
          status: att.status as 'pending' | 'present' | 'absent' | 'late' | 'excused',
          created_at: att.created_at,
          updated_at: att.updated_at
        }
      })

      setSessionAttendance(attendanceWithNames)
    } catch (error) {
      console.error('Error fetching session attendance:', error)
      setSessionAttendance([])
    }
  }

  const handleUpdateAttendance = async (record: AttendanceRecord) => {
    setUpdateAttendanceRecord(record)
    
    // Fetch attendance data for this session
    try {
      // Get attendance records
      const { data: attendanceData, error } = await supabase
        .from('attendance')
        .select('id, classroom_session_id, student_id, status, note, created_at, updated_at')
        .eq('classroom_session_id', record.session_id)
      
      if (error) throw error

      // Get classroom info to find classroom_id
      const { data: sessionData } = await supabase
        .from('classroom_sessions')
        .select('classroom_id')
        .eq('id', record.session_id)
        .single()

      if (!sessionData) throw new Error('Session not found')

      // Get all students in the classroom
      const { data: classroomStudents } = await supabase
        .from('classroom_students')
        .select('student_id')
        .eq('classroom_id', sessionData.classroom_id)

      const allStudentIds = classroomStudents?.map(cs => cs.student_id) || []
      
      // Get user details for all students in classroom
      const { data: allUsersData, error: allUsersError } = await supabase
        .from('users')
        .select('id, name')
        .in('id', allStudentIds)

      if (allUsersError) throw allUsersError

      // Find students with existing attendance
      const studentsWithAttendance = attendanceData?.map(att => att.student_id) || []
      
      // Find missing students (in classroom but not in attendance)
      const missingStudentIds = allStudentIds.filter(id => !studentsWithAttendance.includes(id))
      const missingStudentsList = missingStudentIds.map(id => {
        const user = allUsersData?.find(u => u.id === id)
        return {
          id,
          name: user?.name || t('common.unknownStudent')
        }
      })
      
      setMissingStudents(missingStudentsList)

      // Map existing attendance with user names
      const attendanceWithNames = (attendanceData || []).map(att => {
        const user = allUsersData?.find(u => u.id === att.student_id)
        return {
          id: att.id,
          classroom_session_id: att.classroom_session_id,
          student_id: att.student_id,
          student_name: user?.name || t('common.unknownStudent'),
          status: att.status as 'pending' | 'present' | 'absent' | 'late' | 'excused',
          note: att.note || '',
          created_at: att.created_at,
          updated_at: att.updated_at
        }
      })

      setAttendanceToUpdate(attendanceWithNames)
    } catch (error) {
      console.error('Error fetching attendance for update:', error)
      setAttendanceToUpdate([])
    }
    
    setShowUpdateAttendanceModal(true)
  }

  const addMissingStudent = (student: {id: string; name: string}) => {
    if (!updateAttendanceRecord) return
    
    // Create temporary attendance record for UI (not saved to database yet)
    const tempAttendanceRecord: StudentAttendance = {
      id: `temp_${student.id}_${Date.now()}`, // Temporary ID
      classroom_session_id: updateAttendanceRecord.session_id,
      student_id: student.id,
      student_name: student.name,
      status: 'pending',
      note: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Add to current attendanceToUpdate list
    setAttendanceToUpdate(prev => [...prev, tempAttendanceRecord])
    
    // Remove from missing students list
    setMissingStudents(prev => prev.filter(s => s.id !== student.id))
  }

  const updateAttendanceStatus = (attendanceId: string, field: string, value: string) => {
    setAttendanceToUpdate(prev => 
      prev.map(att => 
        att.id === attendanceId 
          ? { ...att, [field]: value }
          : att
      )
    )
  }

  const saveAttendanceChanges = async () => {
    if (!updateAttendanceRecord) return
    
    try {
      // Separate existing records from new ones
      const existingRecords = attendanceToUpdate.filter(att => !att.id.startsWith('temp_'))
      const newRecords = attendanceToUpdate.filter(att => att.id.startsWith('temp_'))

      // Update existing attendance records
      for (const attendance of existingRecords) {
        const { error } = await supabase
          .from('attendance')
          .update({
            status: attendance.status,
            note: attendance.note,
            updated_at: new Date().toISOString()
          })
          .eq('id', attendance.id)

        if (error) {
          console.error('Error updating attendance:', error)
          alert(t('errors.updateFailed') + ': ' + error.message)
          return
        }
      }

      // Insert new attendance records for newly added students
      if (newRecords.length > 0) {
        const insertData = newRecords.map(attendance => ({
          classroom_session_id: updateAttendanceRecord.session_id,
          student_id: attendance.student_id,
          status: attendance.status,
          note: attendance.note || null
        }))

        const { error: insertError } = await supabase
          .from('attendance')
          .insert(insertData)

        if (insertError) {
          console.error('Error inserting new attendance records:', insertError)
          alert(t('errors.saveFailed') + ': ' + insertError.message)
          return
        }
      }

      alert(t('success.updated'))
      setShowUpdateAttendanceModal(false)
      setUpdateAttendanceRecord(null)
      setAttendanceToUpdate([])
      setMissingStudents([])
      
      // Refresh the attendance records
      await fetchAttendanceRecords()
    } catch (error) {
      console.error('Error saving attendance changes:', error)
      alert(t('errors.saveFailed'))
    }
  }

  const handleDeleteClick = () => {
    // setShowDeleteModal(true) // This line was removed as per the edit hint
  }

  const formatDate = (dateString: string) => {
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
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      })
    }
  }

  const formatTime = (time: string) => {
    if (!time) return `12:00 ${t('attendance.am')}`
    const [hours, minutes] = time.split(':')
    const hour12 = parseInt(hours) === 0 ? 12 : parseInt(hours) > 12 ? parseInt(hours) - 12 : parseInt(hours)
    const ampm = parseInt(hours) >= 12 ? t('attendance.pm') : t('attendance.am')
    return `${hour12}:${minutes} ${ampm}`
  }

  const formatSessionTime = (sessionTime: string) => {
    if (!sessionTime || translationLoading) return sessionTime
    
    // Split the time range (e.g., "09:00 - 10:00")
    const parts = sessionTime.split(' - ')
    if (parts.length === 2) {
      const startTime = formatTime(parts[0])
      const endTime = formatTime(parts[1])
      return `${startTime} - ${endTime}`
    }
    
    return sessionTime
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

  if (loading || translationLoading) {
    return (
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t("attendance.title")}</h1>
            <p className="text-gray-500">{t("attendance.description")}</p>
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
          <h1 className="text-2xl font-bold text-gray-900">{t("attendance.title")}</h1>
          <p className="text-gray-500">{t("attendance.description")}</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <Input
          type="text"
          placeholder={t("attendance.searchPlaceholder")}
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
              </div>
            </div>
            
            <div className="space-y-3 flex-grow">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(record.session_date || '')}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>{formatSessionTime(record.session_time || '')}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-gray-600">
                {record.location === 'online' ? (
                  <Monitor className="w-4 h-4" />
                ) : (
                  <Building className="w-4 h-4" />
                )}
                <span>{t(`attendance.${record.location}`)}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <UserCheck className="w-4 h-4" />
                <span>{record.present_count || 0} {t('attendance.present')}, {record.absent_count || 0} {t('attendance.absent')}, {record.late_count || 0} {t('attendance.late')}, {record.excused_count || 0} {t('attendance.excused')}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="w-4 h-4" />
                <span>
                  {language === 'korean' 
                    ? `${t('attendance.totalStudents')} ${record.student_count || 0}명`
                    : `${record.student_count || 0} ${t('attendance.totalStudents')}`
                  }
                </span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <Button 
                variant="outline" 
                className="w-full text-sm"
                onClick={() => handleViewDetails(record)}
              >
{t('common.viewDetails')}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {filteredAttendanceRecords.length === 0 && (
        <Card className="p-12 text-center gap-2">
          <UserCheck className="w-10 h-10 text-gray-400 mx-auto mb-1" />
          <h3 className="text-lg font-medium text-gray-900">{t('attendance.noAttendanceData')}</h3>
          <p className="text-gray-500 mb-2">
            {attendanceSearchQuery ? t('common.tryAdjustingSearch') : t('attendance.noAttendanceRecords')}
          </p>
          {attendanceSearchQuery && (
            <Button 
              variant="outline"
              className="flex items-center gap-2 mx-auto"
              onClick={() => setAttendanceSearchQuery('')}
            >
              <X className="w-4 h-4" />
              {t("attendance.clearSearch")}
            </Button>
          )}
        </Card>
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
                <h2 className="text-2xl font-bold text-gray-900">{viewingRecord.classroom_name} - {t('attendance.title')}</h2>
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
{t('attendance.sessionInformation')}
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600">{t('common.date')}</p>
                          <p className="font-medium text-gray-900">{formatDate(viewingRecord.session_date || '')}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600">{t('common.time')}</p>
                          <p className="font-medium text-gray-900">{formatSessionTime(viewingRecord.session_time || '')}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <GraduationCap className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600">{t('common.teacher')}</p>
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
                          <p className="text-sm text-gray-600">{t('common.location')}</p>
                          <p className="font-medium text-gray-900">{t(`attendance.${viewingRecord.location}`)}</p>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Attendance Summary Card */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <UserCheck className="w-5 h-5" />
{t('attendance.attendanceSummary')}
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">{viewingRecord.present_count || 0}</p>
                        <p className="text-sm text-green-700">{t('attendance.present')}</p>
                      </div>
                      <div className="text-center p-3 bg-red-50 rounded-lg">
                        <p className="text-2xl font-bold text-red-600">{viewingRecord.absent_count || 0}</p>
                        <p className="text-sm text-red-700">{t('attendance.absent')}</p>
                      </div>
                      <div className="text-center p-3 bg-yellow-50 rounded-lg">
                        <p className="text-2xl font-bold text-yellow-600">{viewingRecord.late_count || 0}</p>
                        <p className="text-sm text-yellow-700">{t('attendance.late')}</p>
                      </div>
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">{viewingRecord.excused_count || 0}</p>
                        <p className="text-sm text-blue-700">{t('attendance.excused')}</p>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Right Column - Student Attendance */}
                <div className="space-y-6">
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5" />
{t('attendance.studentAttendance')} ({sessionAttendance.length})
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
                                  <p className="text-xs text-gray-400">{t('attendance.recorded')}: {new Date(attendance.created_at).toLocaleDateString()}</p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(attendance.status)}`}>
                                {t(`attendance.${attendance.status}`)}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                      {sessionAttendance.length === 0 && (
                        <div className="text-center py-8">
                          <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">{t('attendance.noAttendanceRecords')}</p>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-6 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-500">
{t('common.created')}: {new Date(viewingRecord.created_at).toLocaleDateString()}
                {viewingRecord.updated_at !== viewingRecord.created_at && (
                  <span className="ml-4">
                    {t('common.updated')}: {new Date(viewingRecord.updated_at).toLocaleDateString()}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline"
                  onClick={() => {
                    handleUpdateAttendance(viewingRecord)
                  }}
                  className="flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
{t('attendance.updateAttendance')}
                </Button>
                <Button 
                  onClick={() => setShowViewModal(false)}
                >
                  {t('common.close')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Attendance Modal */}
      {showUpdateAttendanceModal && updateAttendanceRecord && (
        <div 
          className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-60"
          onClick={() => {
            setShowUpdateAttendanceModal(false)
            setUpdateAttendanceRecord(null)
            setAttendanceToUpdate([])
            setMissingStudents([])
          }}
        >
          <div 
            className="bg-white rounded-lg border border-border w-full max-w-6xl mx-4 max-h-[90vh] shadow-lg flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div 
                  className="w-6 h-6 rounded-full" 
                  style={{ backgroundColor: updateAttendanceRecord.classroom_color || '#6B7280' }}
                />
                <h2 className="text-2xl font-bold text-gray-900">{t('attendance.updateAttendance')} - {updateAttendanceRecord.classroom_name}</h2>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="p-1"
                onClick={() => {
                  setShowUpdateAttendanceModal(false)
                  setUpdateAttendanceRecord(null)
                  setAttendanceToUpdate([])
                  setMissingStudents([])
                }}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* Missing Students Section */}
              {missingStudents.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-5 h-5 text-orange-600" />
                    <h3 className="font-semibold text-gray-900">{t('attendance.missingStudents')} ({missingStudents.length})</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {missingStudents.map((student) => (
                      <div key={student.id} className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <span className="font-medium text-gray-900">{student.name}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addMissingStudent(student)}
                          className="text-orange-600 border-orange-300 hover:bg-orange-100"
                        >
                          {t('attendance.addStudent')}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Students Message */}
              {attendanceToUpdate.length === 0 && missingStudents.length === 0 && (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-2">{t('attendance.noStudentsFound')}</p>
                  <p className="text-gray-600">{t('attendance.noStudentsMessage')}</p>
                </div>
              )}

              {/* Attendance List */}
              {attendanceToUpdate.length > 0 && (
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
                          <Label className="text-xs text-gray-500 mb-1 block">{t('common.status')}</Label>
                          <Select 
                            value={attendance.status} 
                            onValueChange={(value) => updateAttendanceStatus(attendance.id, 'status', value)}
                          >
                            <SelectTrigger className="h-9 text-sm bg-white border border-border focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="z-70">
                              <SelectItem value="pending">{t('attendance.pending')}</SelectItem>
                              <SelectItem value="present">{t('attendance.present')}</SelectItem>
                              <SelectItem value="absent">{t('attendance.absent')}</SelectItem>
                              <SelectItem value="late">{t('attendance.late')}</SelectItem>
                              <SelectItem value="excused">{t('attendance.excused')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Spacer column */}
                        <div className="lg:col-span-1"></div>

                        {/* Note */}
                        <div className="lg:col-span-3">
                          <Label className="text-xs text-gray-500 mb-1 block">{t('common.note')}</Label>
                          <Input
                            value={attendance.note || ''}
                            onChange={(e) => updateAttendanceStatus(attendance.id, 'note', e.target.value)}
                            placeholder={t('attendance.teacherNote')}
                            className="h-9 text-sm"
                          />
                        </div>
                      </div>

                      {/* Additional Info */}
                      <div className="mt-4 pt-4 border-t border-gray-100 flex gap-6 text-xs text-gray-500">
                        {attendance.created_at && (
                          <span>{t('common.created')}: {new Date(attendance.created_at).toLocaleDateString()}</span>
                        )}
                        {attendance.updated_at && attendance.updated_at !== attendance.created_at && (
                          <span>{t('common.updated')}: {new Date(attendance.updated_at).toLocaleDateString()}</span>
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
                {language === 'korean' 
                  ? `${t('common.students')} ${attendanceToUpdate.length}명`
                  : `${attendanceToUpdate.length} ${t('common.students')}`
                }
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowUpdateAttendanceModal(false)
                    setUpdateAttendanceRecord(null)
                    setAttendanceToUpdate([])
                    setMissingStudents([])
                  }}
                >
{t('common.cancel')}
                </Button>
                <Button onClick={saveAttendanceChanges}>
                  {t('common.saveChanges')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {/* This modal was removed as per the edit hint */}
    </div>
  )
}