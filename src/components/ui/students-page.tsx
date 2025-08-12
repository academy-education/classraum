"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Search,
  MoreHorizontal,
  Plus,
  Edit,
  X,
  BookOpen,
  Users,
  School,
  Eye,
  CheckCircle,
  XCircle,
  Home,
  UserX,
  UserCheck,
  GraduationCap,
  Book,
  Clock
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

interface Student {
  user_id: string
  name: string
  email: string
  phone?: string
  school_name?: string
  academy_id: string
  active: boolean
  created_at: string
  family_id?: string
  family_name?: string
  classroom_count?: number
}

interface Family {
  id: string
  name: string
}

interface Classroom {
  id: string
  name: string
  grade: string
  subject: string
  color?: string
  notes?: string
  teacher_name?: string
  teacher_id?: string
  created_at: string
  updated_at: string
  enrolled_students?: any[]
  student_count?: number
}

interface StudentsPageProps {
  academyId: string
}

export function StudentsPage({ academyId }: StudentsPageProps) {
  // State management
  const { t } = useTranslation()
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())
  const [sortField, setSortField] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [showStatusFilter, setShowStatusFilter] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null)
  const dropdownButtonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({})

  // Modal states
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showViewFamilyModal, setShowViewFamilyModal] = useState(false)
  const [showViewClassroomsModal, setShowViewClassroomsModal] = useState(false)
  const [showClassroomDetailsModal, setShowClassroomDetailsModal] = useState(false)
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null)
  const [studentFamily, setStudentFamily] = useState<any>(null)
  const [studentClassrooms, setStudentClassrooms] = useState<Classroom[]>([])
  const [selectedClassroomForDetails, setSelectedClassroomForDetails] = useState<Classroom | null>(null)

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    school_name: '',
    family_id: ''
  })
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({})
  const [submitting, setSubmitting] = useState(false)

  // Available families for assignment
  const [families, setFamilies] = useState<Family[]>([])

  // Refs
  const statusFilterRef = useRef<HTMLDivElement>(null)

  // Fetch students
  const fetchStudents = useCallback(async () => {
    if (!academyId) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          user_id,
          phone,
          school_name,
          academy_id,
          active,
          created_at,
          users!inner(
            id,
            name,
            email
          )
        `)
        .eq('academy_id', academyId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Get family information and classroom counts for each student
      const studentIds = data?.map(s => s.user_id) || []
      let familyData: { [key: string]: { family_id: string; family_name: string } } = {}
      let classroomCounts: { [key: string]: number } = {}
      
      if (studentIds.length > 0) {
        // Get family memberships
        const { data: familyMembers, error: familyError } = await supabase
          .from('family_members')
          .select(`
            user_id,
            families!inner(
              id,
              name
            )
          `)
          .in('user_id', studentIds)

        if (!familyError) {
          familyMembers?.forEach((member: any) => {
            familyData[member.user_id] = {
              family_id: member.families.id,
              family_name: member.families.name || `Family ${member.families.id.slice(0, 8)}`
            }
          })
        }

        // Get classroom counts using database aggregation
        const { data: classroomCountData, error: classroomError } = await supabase
          .rpc('count_classrooms_by_student', {
            student_ids: studentIds
          })

        if (classroomError) {
          // Fallback to the previous method if RPC fails
          console.warn('RPC failed, using fallback method:', classroomError)
          const { data: classroomData, error: fallbackError } = await supabase
            .from('classroom_students')
            .select('student_id')
            .in('student_id', studentIds)

          if (!fallbackError && classroomData) {
            classroomData.forEach(enrollment => {
              classroomCounts[enrollment.student_id] = (classroomCounts[enrollment.student_id] || 0) + 1
            })
          }
        } else if (classroomCountData) {
          // Use the aggregated counts from the RPC
          classroomCountData.forEach((row: { student_id: string; classroom_count: number }) => {
            classroomCounts[row.student_id] = row.classroom_count
          })
        }
      }

      const studentsData = data?.map((student: any) => ({
        user_id: student.user_id,
        name: student.users.name,
        email: student.users.email,
        phone: student.phone,
        school_name: student.school_name,
        academy_id: student.academy_id,
        active: student.active,
        created_at: student.created_at,
        family_id: familyData[student.user_id]?.family_id,
        family_name: familyData[student.user_id]?.family_name,
        classroom_count: classroomCounts[student.user_id] || 0
      })) || []

      setStudents(studentsData)
    } catch (error) {
      console.error('Error fetching students:', error)
      alert('Error loading students: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }, [academyId])

  // Fetch families for assignment
  const fetchFamilies = useCallback(async () => {
    if (!academyId) return
    
    try {
      const { data, error } = await supabase
        .from('families')
        .select('id, academy_id, created_at')
        .eq('academy_id', academyId)
        .order('created_at')

      if (error) throw error
      
      const familiesData = data?.map(family => ({
        id: family.id,
        name: `Family ${family.id.slice(0, 8)}`
      })) || []
      
      setFamilies(familiesData)
    } catch (error) {
      alert('Error fetching families: ' + (error as Error).message)
    }
  }, [academyId])

  useEffect(() => {
    fetchStudents()
    fetchFamilies()
  }, [fetchStudents, fetchFamilies])

  // Filter and sort students
  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (student.phone && student.phone.includes(searchQuery)) ||
                         (student.school_name && student.school_name.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && student.active) ||
                         (statusFilter === 'inactive' && !student.active)
    
    return matchesSearch && matchesStatus
  }).sort((a, b) => {
    if (!sortField) return 0
    
    let aVal: any, bVal: any
    switch (sortField) {
      case 'name':
        aVal = a.name
        bVal = b.name
        break
      case 'email':
        aVal = a.email
        bVal = b.email
        break
      case 'phone':
        aVal = a.phone || ''
        bVal = b.phone || ''
        break
      case 'school':
        aVal = a.school_name || ''
        bVal = b.school_name || ''
        break
      case 'family':
        aVal = a.family_name || ''
        bVal = b.family_name || ''
        break
      case 'status':
        aVal = a.active ? 'active' : 'inactive'
        bVal = b.active ? 'active' : 'inactive'
        break
      case 'created_at':
        aVal = new Date(a.created_at)
        bVal = new Date(b.created_at)
        break
      default:
        return 0
    }
    
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  // Handle sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Render sort icon
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

  // Handle selection
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudents(new Set(filteredStudents.map(s => s.user_id)))
    } else {
      setSelectedStudents(new Set())
    }
  }

  const handleSelectStudent = (studentId: string, checked: boolean) => {
    const newSelected = new Set(selectedStudents)
    if (checked) {
      newSelected.add(studentId)
    } else {
      newSelected.delete(studentId)
    }
    setSelectedStudents(newSelected)
  }

  // CRUD Operations
  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      school_name: '',
      family_id: ''
    })
    setFormErrors({})
  }

  const validateForm = () => {
    const errors: { [key: string]: string } = {}
    
    if (!formData.name.trim()) {
      errors.name = 'Name is required'
    }
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email address'
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }


  const handleEditClick = (student: Student) => {
    setEditingStudent(student)
    setFormData({
      name: student.name,
      email: student.email,
      phone: student.phone || '',
      school_name: student.school_name || '',
      family_id: student.family_id || ''
    })
    setShowEditModal(true)
    setDropdownOpen(null)
  }

  const handleUpdateStudent = async () => {
    if (!editingStudent || !validateForm()) return
    
    setSubmitting(true)
    try {
      // Update user record
      const { error: userError } = await supabase
        .from('users')
        .update({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase()
        })
        .eq('id', editingStudent.user_id)

      if (userError) throw userError

      // Update student record
      const { error: studentError } = await supabase
        .from('students')
        .update({
          phone: formData.phone.trim() || null,
          school_name: formData.school_name.trim() || null
        })
        .eq('user_id', editingStudent.user_id)

      if (studentError) throw studentError

      // Handle family membership changes
      if (formData.family_id !== editingStudent.family_id) {
        // Remove from old family
        if (editingStudent.family_id) {
          await supabase
            .from('family_members')
            .delete()
            .eq('user_id', editingStudent.user_id)
        }

        // Add to new family
        if (formData.family_id && formData.family_id !== 'none') {
          const { error: familyError } = await supabase
            .from('family_members')
            .insert({
              user_id: editingStudent.user_id,
              family_id: formData.family_id,
              role: 'student'
            })

          if (familyError) throw familyError
        }
      }

      setShowEditModal(false)
      setEditingStudent(null)
      resetForm()
      fetchStudents()
      alert('Student updated successfully!')
    } catch (error: any) {
      console.error('Error updating student:', error)
      if (error.code === '23505') {
        setFormErrors({ email: 'This email address is already in use' })
      } else {
        alert('Error updating student: ' + error.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteClick = (student: Student) => {
    setStudentToDelete(student)
    setShowDeleteModal(true)
    setDropdownOpen(null)
  }

  const handleActivateClick = (student: Student) => {
    setStudentToDelete(student)
    setShowDeleteModal(true)
    setDropdownOpen(null)
  }

  const handleViewFamilyClick = async (student: Student) => {
    if (!student.family_id) {
      alert('This student is not assigned to any family')
      setDropdownOpen(null)
      return
    }

    try {
      // Get family details and members
      const { data: familyData, error: familyError } = await supabase
        .from('families')
        .select('*')
        .eq('id', student.family_id)
        .single()

      if (familyError) throw familyError

      const { data: membersData, error: membersError } = await supabase
        .from('family_members')
        .select(`
          user_id,
          role,
          users!inner(
            name,
            email,
            role
          )
        `)
        .eq('family_id', student.family_id)

      if (membersError) throw membersError

      // Get phone numbers for family members from their respective role tables
      const memberIds = membersData?.map((member: any) => member.user_id) || []
      const phoneMap: { [key: string]: string | null } = {}

      if (memberIds.length > 0) {
        // Fetch from parents table
        const { data: parentPhones } = await supabase
          .from('parents')
          .select('user_id, phone')
          .in('user_id', memberIds)
        
        parentPhones?.forEach((p: any) => {
          phoneMap[p.user_id] = p.phone
        })

        // Fetch from students table  
        const { data: studentPhones } = await supabase
          .from('students')
          .select('user_id, phone')
          .in('user_id', memberIds)
        
        studentPhones?.forEach((s: any) => {
          phoneMap[s.user_id] = s.phone
        })

        // Fetch from teachers table
        const { data: teacherPhones } = await supabase
          .from('teachers')
          .select('user_id, phone')
          .in('user_id', memberIds)
        
        teacherPhones?.forEach((t: any) => {
          phoneMap[t.user_id] = t.phone
        })
      }

      // Add phone data to members
      const enrichedMembers = membersData?.map((member: any) => ({
        ...member,
        phone: phoneMap[member.user_id] || null
      })) || []

      setStudentFamily({
        ...familyData,
        members: enrichedMembers
      })
      setViewingStudent(student)
      setShowViewFamilyModal(true)
      setDropdownOpen(null)
    } catch (error: any) {
      alert('Error loading family: ' + error.message)
    }
  }

  const handleViewClassroomsClick = async (student: Student) => {
    try {
      // Get classrooms where this student is enrolled
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('classroom_students')
        .select(`
          classroom_id,
          classrooms!inner(
            id,
            name,
            grade,
            subject,
            color,
            notes,
            teacher_id,
            created_at,
            updated_at
          )
        `)
        .eq('student_id', student.user_id)

      if (enrollmentError) throw enrollmentError

      if (!enrollmentData || enrollmentData.length === 0) {
        setStudentClassrooms([])
        setViewingStudent(student)
        setShowViewClassroomsModal(true)
        setDropdownOpen(null)
        return
      }

      const classrooms = enrollmentData.map(e => e.classrooms)
      const classroomIds = classrooms.map(c => c.id)
      const teacherIds = classrooms.map(c => c.teacher_id).filter(Boolean)

      // Batch query for all enrolled students across all classrooms
      const { data: allEnrolledStudents, error: studentsError } = await supabase
        .from('classroom_students')
        .select(`
          classroom_id,
          student_id,
          students!inner(
            users!inner(
              name
            ),
            school_name
          )
        `)
        .in('classroom_id', classroomIds)

      if (studentsError) throw studentsError

      // Batch query for all teacher names
      let teacherNames: { [key: string]: string } = {}
      if (teacherIds.length > 0) {
        const { data: teachersData, error: teachersError } = await supabase
          .from('users')
          .select('id, name')
          .in('id', teacherIds)

        if (!teachersError && teachersData) {
          teachersData.forEach(teacher => {
            teacherNames[teacher.id] = teacher.name
          })
        }
      }

      // Group students by classroom
      const studentsByClassroom: { [key: string]: any[] } = {}
      allEnrolledStudents?.forEach((enrollment: any) => {
        const classroomId = enrollment.classroom_id
        if (!studentsByClassroom[classroomId]) {
          studentsByClassroom[classroomId] = []
        }
        studentsByClassroom[classroomId].push({
          name: enrollment.students?.users?.name || 'Unknown Student',
          school_name: enrollment.students?.school_name
        })
      })

      // Build classrooms with student data
      const classroomsWithDetails = classrooms.map(classroom => ({
        ...classroom,
        teacher_name: teacherNames[classroom.teacher_id] || null,
        enrolled_students: studentsByClassroom[classroom.id] || [],
        student_count: (studentsByClassroom[classroom.id] || []).length
      }))

      setStudentClassrooms(classroomsWithDetails)
      setViewingStudent(student)
      setShowViewClassroomsModal(true)
      setDropdownOpen(null)
    } catch (error: any) {
      alert('Error loading classrooms: ' + error.message)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!studentToDelete) return
    
    const newStatus = !studentToDelete.active
    
    try {
      const { data, error } = await supabase
        .from('students')
        .update({ active: newStatus })
        .eq('user_id', studentToDelete.user_id)
        .select()

      if (error) throw error

      setShowDeleteModal(false)
      setStudentToDelete(null)
      fetchStudents()
      alert(`Student ${newStatus ? 'activated' : 'deactivated'} successfully!`)
    } catch (error: any) {
      alert(`Error ${newStatus ? 'activating' : 'deactivating'} student: ` + error.message)
    }
  }

  const handleBulkStatusUpdate = async (active: boolean) => {
    if (selectedStudents.size === 0) return
    
    try {
      const { error } = await supabase
        .from('students')
        .update({ active })
        .in('user_id', Array.from(selectedStudents))

      if (error) throw error

      setSelectedStudents(new Set())
      fetchStudents()
      alert(`Students ${active ? 'activated' : 'deactivated'} successfully!`)
    } catch (error: any) {
      console.error('Error updating students:', error)
      alert('Error updating students: ' + error.message)
    }
  }

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusFilterRef.current && !statusFilterRef.current.contains(event.target as Node)) {
        setShowStatusFilter(false)
      }
      
      // Close dropdown when clicking outside
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
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen])

  // Loading skeleton
  const TableSkeleton = () => (
    <div className="animate-pulse">
      <div className="overflow-x-auto min-h-[640px] flex flex-col">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {[...Array(6)].map((_, i) => (
                <th key={i} className="text-left p-4">
                  <div className="h-4 bg-gray-300 rounded w-16"></div>
                </th>
              ))}
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
                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                </td>
                <td className="p-4">
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </td>
                <td className="p-4">
                  <div className="h-3 bg-gray-200 rounded w-20"></div>
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

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t("students.title")}</h1>
            <p className="text-gray-500">Manage your students.</p>
          </div>
          <div className="flex items-center gap-3">
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
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("students.title")}</h1>
          <p className="text-gray-500">Manage your students.</p>
        </div>
        <div className="flex items-center gap-3">
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <Input
          type="text"
          placeholder="Search by name, email, phone, or school..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-12 pl-12 rounded-lg border border-border bg-white focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 text-sm shadow-sm"
        />
      </div>

      {/* Bulk Actions Menu */}
      {selectedStudents.size > 0 && (
        <Card className="mb-4 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">
                {selectedStudents.size} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedStudents(new Set())}
              >
                Clear Selection
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => handleBulkStatusUpdate(true)} size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                Make Active
              </Button>
              <Button onClick={() => handleBulkStatusUpdate(false)} size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                Make Inactive
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Students Table */}
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
                      checked={filteredStudents.length > 0 && selectedStudents.size === filteredStudents.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </div>
                </th>
                <th className="text-left p-4 font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleSort('name')} className="flex items-center gap-1 ">
                      Student
                      {renderSortIcon('name')}
                    </button>
                  </div>
                </th>
                <th className="text-left p-4 font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleSort('phone')} className="flex items-center gap-1 ">
                      Phone
                      {renderSortIcon('phone')}
                    </button>
                  </div>
                </th>
                <th className="text-left p-4 font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleSort('school')} className="flex items-center gap-1 ">
                      School
                      {renderSortIcon('school')}
                    </button>
                  </div>
                </th>
                <th className="text-left p-4 font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleSort('family')} className="flex items-center gap-1 ">
                      Family
                      {renderSortIcon('family')}
                    </button>
                  </div>
                </th>
                <th className="text-left p-4 font-medium text-gray-900">
                  <div className="flex items-center gap-2 relative">
                    Status
                    <div className="relative z-20" ref={statusFilterRef}>
                      <button
                        onClick={() => setShowStatusFilter(!showStatusFilter)}
                        className={`flex items-center ${
                          statusFilter !== 'all' ? 'text-primary' : 'text-gray-400 '
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
                            All
                          </button>
                          <button
                            onClick={() => {
                              setStatusFilter('active')
                              setShowStatusFilter(false)
                            }}
                            className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${statusFilter === 'active' ? 'bg-primary/10 text-primary' : 'text-gray-700'}`}
                          >
                            Active
                          </button>
                          <button
                            onClick={() => {
                              setStatusFilter('inactive')
                              setShowStatusFilter(false)
                            }}
                            className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${statusFilter === 'inactive' ? 'bg-primary/10 text-primary' : 'text-gray-700'}`}
                          >
                            Inactive
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
              {filteredStudents.length > 0 ? filteredStudents.map((student) => (
                <tr key={student.user_id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-4">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300"
                      checked={selectedStudents.has(student.user_id)}
                      onChange={(e) => handleSelectStudent(student.user_id, e.target.checked)}
                    />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-medium text-gray-900">{student.name}</div>
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          {student.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    {student.phone ? (
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        {student.phone}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </td>
                  <td className="p-4">
                    {student.school_name ? (
                      <div className="flex items-center gap-1 text-sm">
                        <span>{student.school_name}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </td>
                  <td className="p-4">
                    {student.family_name ? (
                      <div className="flex items-center gap-1 text-sm">
                        <span className="text-blue-600">{student.family_name}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {student.active ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-600" />
                      )}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        student.active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {student.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="relative">
                      <Button
                        ref={(el) => { dropdownButtonRefs.current[student.user_id] = el }}
                        variant="ghost"
                        size="sm"
                        onClick={() => setDropdownOpen(dropdownOpen === student.user_id ? null : student.user_id)}
                        className="p-1"
                      >
                        <MoreHorizontal className="w-4 h-4 text-gray-500" />
                      </Button>
                      
                      {dropdownOpen === student.user_id && (
                        <div 
                          className="dropdown-menu absolute right-0 top-8 z-50 bg-white rounded-lg border border-gray-300 shadow-xl py-1 min-w-[160px]"
                          style={{ zIndex: 9999 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleEditClick(student)
                            }}
                          >
                            <Edit className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleViewFamilyClick(student)
                            }}
                          >
                            <Home className="w-4 h-4" />
                            View Family
                          </button>
                          <button
                            className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleViewClassroomsClick(student)
                            }}
                          >
                            <BookOpen className="w-4 h-4" />
                            View Classrooms
                          </button>
                          {student.active ? (
                            <button
                              className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap text-red-600"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleDeleteClick(student)
                              }}
                            >
                              <UserX className="w-4 h-4" />
                              Make Inactive
                            </button>
                          ) : (
                            <button
                              className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap text-green-600"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleActivateClick(student)
                              }}
                            >
                              <UserCheck className="w-4 h-4" />
                              Make Active
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <div className="flex flex-col items-center">
                      <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
                      <p className="text-gray-600">
                        {searchQuery ? 'Try adjusting your search criteria.' : 'Get started by adding your first student.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>


      {/* Edit Student Modal */}
      {showEditModal && editingStudent && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-border w-full max-w-md mx-4 shadow-lg">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Edit Student</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setShowEditModal(false)
                  setEditingStudent(null)
                  resetForm()
                }}
                className="p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-name" className="text-sm font-medium text-gray-700">
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit-name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`mt-1 ${formErrors.name ? 'border-red-500' : ''}`}
                    placeholder="Enter student's full name"
                  />
                  {formErrors.name && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="edit-email" className="text-sm font-medium text-gray-700">
                    Email Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`mt-1 ${formErrors.email ? 'border-red-500' : ''}`}
                    placeholder="Enter email address"
                  />
                  {formErrors.email && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="edit-phone" className="text-sm font-medium text-gray-700">
                    Phone Number
                  </Label>
                  <Input
                    id="edit-phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="mt-1"
                    placeholder="Enter phone number"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-school_name" className="text-sm font-medium text-gray-700">
                    School Name
                  </Label>
                  <Input
                    id="edit-school_name"
                    type="text"
                    value={formData.school_name}
                    onChange={(e) => setFormData({ ...formData, school_name: e.target.value })}
                    className="mt-1"
                    placeholder="Enter school name"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-family" className="text-sm font-medium text-gray-700">
                    Family
                  </Label>
                  <Select value={formData.family_id} onValueChange={(value) => setFormData({ ...formData, family_id: value })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select family (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No family</SelectItem>
                      {families.map((family) => (
                        <SelectItem key={family.id} value={family.id}>
                          {family.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-6 pt-4 border-t border-gray-200">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowEditModal(false)
                  setEditingStudent(null)
                  resetForm()
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateStudent}
                disabled={submitting}
                className="bg-primary text-white"
              >
                {submitting ? 'Updating...' : 'Update Student'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && studentToDelete && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-border w-full max-w-md mx-4 shadow-lg">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{studentToDelete.active ? 'Make Inactive' : 'Make Active'} Student</h2>
              <p className="text-gray-600 mb-6">
                Are you sure you want to {studentToDelete.active ? 'make inactive' : 'make active'} "{studentToDelete.name}"? 
                {studentToDelete.active 
                  ? 'They will no longer have access to the system, but their data will be preserved.' 
                  : 'They will regain access to the system.'}
              </p>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowDeleteModal(false)
                    setStudentToDelete(null)
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleDeleteConfirm}
                  className={`flex-1 text-white ${studentToDelete.active ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                >
                  {studentToDelete.active ? 'Make Inactive' : 'Make Active'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Classrooms Modal */}
      {showViewClassroomsModal && viewingStudent && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-border w-full max-w-3xl mx-4 shadow-lg">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                Classrooms - {viewingStudent.name}
              </h2>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setShowViewClassroomsModal(false)
                  setViewingStudent(null)
                  setStudentClassrooms([])
                }}
                className="p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="p-6">
              {studentClassrooms.length > 0 ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 mb-4">
                    {studentClassrooms.length} classroom{studentClassrooms.length !== 1 ? 's' : ''} enrolled
                  </p>
                  <div className="grid gap-4">
                    {studentClassrooms.map((classroom) => (
                      <div key={classroom.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold text-gray-900 text-lg mb-2">{classroom.name}</h3>
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                  <div className="flex items-center gap-1">
                                    <span className="font-medium">Grade:</span>
                                    <span>{classroom.grade}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="font-medium">Subject:</span>
                                    <span>{classroom.subject}</span>
                                  </div>
                                  {classroom.teacher_name && (
                                    <div className="flex items-center gap-1">
                                      <span className="font-medium">Teacher:</span>
                                      <span>{classroom.teacher_name}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedClassroomForDetails(classroom)
                                  setShowClassroomDetailsModal(true)
                                }}
                                className="flex items-center gap-2"
                              >
                                <Eye className="w-4 h-4" />
                                View
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="flex flex-col items-center">
                    <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No classrooms enrolled</h3>
                    <p className="text-gray-600">
                      This student is not enrolled in any classrooms yet.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Classroom Details Modal */}
      {showClassroomDetailsModal && selectedClassroomForDetails && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-border w-full max-w-6xl mx-4 max-h-[90vh] shadow-lg flex flex-col">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div 
                  className="w-6 h-6 rounded-full" 
                  style={{ backgroundColor: selectedClassroomForDetails.color || '#6B7280' }}
                />
                <h2 className="text-2xl font-bold text-gray-900">{selectedClassroomForDetails.name}</h2>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setShowClassroomDetailsModal(false)
                  setSelectedClassroomForDetails(null)
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
                      Classroom Information
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <GraduationCap className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600">Grade</p>
                          <p className="font-medium text-gray-900">{selectedClassroomForDetails.grade || 'Not specified'}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Book className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600">Subject</p>
                          <p className="font-medium text-gray-900">{selectedClassroomForDetails.subject || 'Not specified'}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <GraduationCap className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600">Teacher</p>
                          <p className="font-medium text-gray-900">{selectedClassroomForDetails.teacher_name || 'Not assigned'}</p>
                        </div>
                      </div>

                      {selectedClassroomForDetails.created_at && (
                        <div className="flex items-center gap-3">
                          <Clock className="w-5 h-5 text-gray-500" />
                          <div>
                            <p className="text-sm text-gray-600">Created</p>
                            <p className="font-medium text-gray-900">
                              {new Date(selectedClassroomForDetails.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* Notes Card */}
                  {selectedClassroomForDetails.notes && (
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
                      <p className="text-gray-700 leading-relaxed">{selectedClassroomForDetails.notes}</p>
                    </Card>
                  )}
                </div>

                {/* Right Column - Student Enrollment */}
                <div className="space-y-6">
                  {/* Student Enrollment Card */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Student Enrollment ({selectedClassroomForDetails.student_count || 0})
                    </h3>
                    {!selectedClassroomForDetails.enrolled_students || selectedClassroomForDetails.enrolled_students.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">No students enrolled in this classroom</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selectedClassroomForDetails.enrolled_students.map((student, index) => (
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
                {selectedClassroomForDetails.created_at && (
                  <>
                    Created: {new Date(selectedClassroomForDetails.created_at).toLocaleDateString()}
                    {selectedClassroomForDetails.updated_at !== selectedClassroomForDetails.created_at && selectedClassroomForDetails.updated_at && (
                      <span className="ml-4">
                        Updated: {new Date(selectedClassroomForDetails.updated_at).toLocaleDateString()}
                      </span>
                    )}
                  </>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline"
                  onClick={() => {
                    setShowClassroomDetailsModal(false)
                    setSelectedClassroomForDetails(null)
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Family Modal */}
      {showViewFamilyModal && viewingStudent && studentFamily && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-border w-full max-w-3xl mx-4 shadow-lg">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                Family Members - {studentFamily.name || `Family ${studentFamily.id.slice(0, 8)}`}
              </h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setShowViewFamilyModal(false)
                  setViewingStudent(null)
                  setStudentFamily(null)
                }}
                className="p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="p-6">
              {/* Family members display - updated to match families page design */}
              {studentFamily.members && studentFamily.members.length > 0 ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 mb-4">
                    {studentFamily.members.length} member{studentFamily.members.length !== 1 ? 's' : ''} in this family
                  </p>
                  <div className="grid gap-4">
                    {studentFamily.members.map((member: any) => (
                      <div key={member.user_id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold text-gray-900 text-lg mb-2">{member.users.name}</h3>
                                <div className="space-y-1 text-sm text-gray-600">
                                  <div>
                                    <span className="font-medium">Email:</span>
                                    <span> {member.users.email}</span>
                                  </div>
                                  {member.phone && (
                                    <div>
                                      <span className="font-medium">Phone:</span>
                                      <span> {member.phone}</span>
                                    </div>
                                  )}
                                  <div>
                                    <span className="font-medium">Role:</span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ml-1 ${
                                      member.users.role === 'parent' 
                                        ? 'bg-purple-100 text-purple-800'
                                        : 'bg-green-100 text-green-800'
                                    }`}>
                                      {member.users.role.charAt(0).toUpperCase() + member.users.role.slice(1)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No family members</h3>
                  <p className="text-gray-600">This family doesn't have any members yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}