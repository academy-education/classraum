"use client"

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Search,
  Download
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { showSuccessToast, showErrorToast } from '@/stores'
import { useStudentData, Student } from '@/hooks/useStudentData'
import { useStudentActions } from '@/hooks/useStudentActions'
import { usePageShortcuts, studentPageShortcuts } from '@/hooks/usePageShortcuts'
import { StudentsTable } from './StudentsTable'
import { StudentsEditModal } from './StudentsEditModal'
import { StudentsDeleteModal } from './StudentsDeleteModal'
import { StudentsViewClassroomsModal } from './StudentsViewClassroomsModal'
import { StudentsClassroomDetailsModal } from './StudentsClassroomDetailsModal'
import { StudentsViewFamilyModal } from './StudentsViewFamilyModal'
import { DataExportModal } from '@/components/ui/common/DataExportModal'
import { DataImportModal } from '@/components/ui/common/DataImportModal'
import { ImportResult } from '@/hooks/useDataImport'

interface StudentsPageOriginalUIProps {
  academyId: string
}

export function StudentsPageOriginalUI({ academyId }: StudentsPageOriginalUIProps) {
  // State management
  const { t } = useTranslation()
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const {
    students,
    families,
    loading,
    totalCount,
    activeCount,
    inactiveCount,
    initialized,
    refreshData,
    fetchFamilyDetails,
    fetchStudentClassrooms
  } = useStudentData(academyId, currentPage, itemsPerPage)
  const { updateStudent, toggleStudentStatus, bulkUpdateStudents } = useStudentActions()

  // Set up page-specific keyboard shortcuts and commands
  usePageShortcuts({
    shortcuts: studentPageShortcuts.shortcuts,
    commands: studentPageShortcuts.commands
  })

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
  const [showExportModal, setShowExportModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null)
  const [studentFamily, setStudentFamily] = useState<{
    id: string
    name?: string
    members?: Array<{
      user_id: string
      phone?: string
      users: {
        name: string
        email: string
        role: string
      }
    }>
  } | null>(null)
  const [studentClassrooms, setStudentClassrooms] = useState<Array<{
    id: string
    name: string
    grade?: string
    subject?: string
    color?: string
    notes?: string
    teacher_id?: string
    teacher_name?: string | null
    created_at?: string
    updated_at?: string
    student_count?: number
    enrolled_students?: Array<{
      name: string
      school_name?: string
    }>
  }>>([])
  const [selectedClassroomForDetails, setSelectedClassroomForDetails] = useState<{
    id: string
    name: string
    color?: string
    grade?: string
    subject?: string
    teacher_name?: string | null
    notes?: string
    created_at?: string
    updated_at?: string
    student_count?: number
    enrolled_students?: Array<{
      name: string
      school_name?: string
    }>
  } | null>(null)

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

  // Refs
  const statusFilterRef = useRef<HTMLDivElement>(null)

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
    
    let aVal: string | number | Date, bVal: string | number | Date
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
      errors.name = String(t('students.nameRequired'))
    }
    
    if (!formData.email.trim()) {
      errors.email = String(t('students.emailRequired'))
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = String(t('students.validEmailRequired'))
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }


  const handleUpdateStudent = async () => {
    if (!editingStudent || !validateForm()) return
    
    setSubmitting(true)
    const result = await updateStudent(editingStudent.user_id, {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      school_name: formData.school_name,
      family_id: formData.family_id,
      active: true
    })

    if (result.success) {
      setShowEditModal(false)
      setEditingStudent(null)
      resetForm()
      await refreshData()
      alert(String(t('students.studentUpdatedSuccessfully')))
    } else {
      if ((result.error as { code?: string })?.code === '23505') {
        setFormErrors({ email: String(t('students.emailAlreadyInUse')) })
      } else {
        alert(String(t('students.errorUpdatingStudent')) + ': ' + result.error?.message)
      }
    }
    setSubmitting(false)
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
      alert(String(t('students.studentNotAssignedToFamily')))
      setDropdownOpen(null)
      return
    }

    const familyData = await fetchFamilyDetails(student.family_id)
    if (familyData) {
      setStudentFamily(familyData)
      setViewingStudent(student)
      setShowViewFamilyModal(true)
      setDropdownOpen(null)
    }
  }

  const handleViewClassroomsClick = async (student: Student) => {
    const classrooms = await fetchStudentClassrooms(student.user_id)
    setStudentClassrooms(classrooms)
    setViewingStudent(student)
    setShowViewClassroomsModal(true)
    setDropdownOpen(null)
  }

  const handleDeleteConfirm = async () => {
    if (!studentToDelete) return
    
    const newStatus = !studentToDelete.active
    const result = await toggleStudentStatus(studentToDelete.user_id, newStatus)
    
    if (result.success) {
      setShowDeleteModal(false)
      setStudentToDelete(null)
      await refreshData()
      showSuccessToast(t(newStatus ? 'success.activated' : 'success.deactivated', {
        item: `${studentToDelete.name} (${t('common.student')})`
      }) as string)
    } else {
      showErrorToast(t(newStatus ? 'alerts.errorActivating' : 'alerts.errorDeactivating', {
        resource: t('common.student') as string,
        error: result.error?.message || 'Unknown error'
      }) as string)
    }
  }

  const handleBulkStatusUpdate = async (active: boolean) => {
    if (selectedStudents.size === 0) return
    
    const updates = Array.from(selectedStudents).map(studentId => ({
      studentId,
      active
    }))

    const result = await bulkUpdateStudents(updates)
    
    if (result.success) {
      setSelectedStudents(new Set())
      await refreshData()
      showSuccessToast(t(active ? 'success.multipleActivated' : 'success.multipleDeactivated', { items: t('students.students') as string }) as string)
    } else {
      showErrorToast(String(t('students.errorUpdatingStudents')) + ': ' + result.error?.message)
    }
  }

  const handleImportComplete = async (result: ImportResult<unknown>) => {
    console.log('Import completed:', result)
    await refreshData()
    alert(String(t('students.importSuccess', { count: result.metadata.validRows })) || `Successfully imported ${result.metadata.validRows} students`)
  }

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusFilterRef.current && !statusFilterRef.current.contains(event.target as Node)) {
        setShowStatusFilter(false)
      }
      
      if (dropdownOpen) {
        const target = event.target as Node
        if (target && (target as Element).closest('.dropdown-menu')) {
          return
        }
        
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
            <p className="text-gray-500">{t("students.description")}</p>
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
          <p className="text-gray-500">{t("students.description")}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Import button hidden for now
          <Button 
            variant="outline" 
            onClick={() => setShowImportModal(true)} 
            size="sm"
            data-import-btn
          >
            <Upload className="w-4 h-4 mr-2" />
            {t('students.import') || 'Import'}
          </Button>
          */}
          <Button 
            variant="outline" 
            onClick={() => setShowExportModal(true)} 
            data-export-btn
          >
            <Download className="w-4 h-4 mr-2" />
            {t('students.export') || 'Export'}
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <Input
          type="text"
          placeholder={String(t("students.searchPlaceholder"))}
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
                {selectedStudents.size}개 선택됨
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedStudents(new Set())}
              >
                {t("students.clearSelection")}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => handleBulkStatusUpdate(true)} size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                {t("students.makeActive")}
              </Button>
              <Button onClick={() => handleBulkStatusUpdate(false)} size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                {t("students.makeInactive")}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Status Filter Tabs */}
      <div className="inline-flex items-center bg-white rounded-lg border border-gray-200 mb-4 p-1">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            statusFilter === 'all'
              ? 'bg-primary text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          {t("common.all")} ({totalCount})
        </button>
        <button
          onClick={() => setStatusFilter('active')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ml-1 ${
            statusFilter === 'active'
              ? 'bg-primary text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          {t("common.active")} ({activeCount})
        </button>
        <button
          onClick={() => setStatusFilter('inactive')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ml-1 ${
            statusFilter === 'inactive'
              ? 'bg-primary text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          {t("common.inactive")} ({inactiveCount})
        </button>
      </div>

      {/* Students Table */}
      <Card className="overflow-hidden">
        <StudentsTable
          students={filteredStudents}
          selectedStudents={selectedStudents}
          sortField={sortField}
          sortDirection={sortDirection}
          statusFilter={statusFilter}
          showStatusFilter={showStatusFilter}
          dropdownOpen={dropdownOpen}
          dropdownButtonRefs={dropdownButtonRefs}
          statusFilterRef={statusFilterRef}
          initialized={initialized}
          t={(key: string) => String(t(key))}
          onSort={handleSort}
          onSelectAll={handleSelectAll}
          onSelectStudent={handleSelectStudent}
          onStatusFilterChange={setStatusFilter}
          onShowStatusFilterChange={setShowStatusFilter}
          onDropdownOpenChange={setDropdownOpen}
          onViewFamilyClick={handleViewFamilyClick}
          onViewClassroomsClick={handleViewClassroomsClick}
          onDeleteClick={handleDeleteClick}
          onActivateClick={handleActivateClick}
        />

        {/* Pagination Controls */}
        {totalCount > 0 && (
          <div className="mt-4 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
            <div className="flex flex-1 justify-between sm:hidden">
              <Button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                variant="outline"
              >
                {t("students.pagination.previous")}
              </Button>
              <Button
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalCount / itemsPerPage), p + 1))}
                disabled={currentPage >= Math.ceil(totalCount / itemsPerPage)}
                variant="outline"
              >
                {t("students.pagination.next")}
              </Button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  {t("students.pagination.showing")}
                  <span className="font-medium"> {((currentPage - 1) * itemsPerPage) + 1} </span>
                  {t("students.pagination.to")}
                  <span className="font-medium"> {Math.min(currentPage * itemsPerPage, totalCount)} </span>
                  {t("students.pagination.of")}
                  <span className="font-medium"> {totalCount} </span>
                  {t("students.pagination.students")}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  variant="outline"
                >
                  {t("students.pagination.previous")}
                </Button>
                <Button
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalCount / itemsPerPage), p + 1))}
                  disabled={currentPage >= Math.ceil(totalCount / itemsPerPage)}
                  variant="outline"
                >
                  {t("students.pagination.next")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Modals */}
      <StudentsEditModal
        isOpen={showEditModal}
        student={editingStudent}
        formData={formData}
        formErrors={formErrors}
        families={families}
        submitting={submitting}
        t={(key: string) => String(t(key))}
        onClose={() => {
          setShowEditModal(false)
          setEditingStudent(null)
          resetForm()
        }}
        onFormDataChange={setFormData}
        onSubmit={handleUpdateStudent}
      />

      <StudentsDeleteModal
        isOpen={showDeleteModal}
        student={studentToDelete}
        t={(key: string, params?: Record<string, string | number | undefined>) => String(t(key, params))}
        onClose={() => {
          setShowDeleteModal(false)
          setStudentToDelete(null)
        }}
        onConfirm={handleDeleteConfirm}
      />

      <StudentsViewClassroomsModal
        isOpen={showViewClassroomsModal}
        student={viewingStudent}
        classrooms={studentClassrooms}
        t={(key: string, params?: Record<string, string | number | undefined>) => String(t(key, params))}
        onClose={() => {
          setShowViewClassroomsModal(false)
          setViewingStudent(null)
          setStudentClassrooms([])
        }}
        onViewDetails={(classroom) => {
          setSelectedClassroomForDetails(classroom)
          setShowClassroomDetailsModal(true)
        }}
      />

      <StudentsClassroomDetailsModal
        isOpen={showClassroomDetailsModal}
        classroom={selectedClassroomForDetails}
        t={(key: string) => String(t(key))}
        onClose={() => {
          setShowClassroomDetailsModal(false)
          setSelectedClassroomForDetails(null)
        }}
      />

      <StudentsViewFamilyModal
        isOpen={showViewFamilyModal}
        student={viewingStudent}
        familyData={studentFamily}
        t={(key: string) => String(t(key))}
        onClose={() => {
          setShowViewFamilyModal(false)
          setViewingStudent(null)
          setStudentFamily(null)
        }}
      />

      {/* Export Modal */}
      {showExportModal && (
        <DataExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          data={filteredStudents as unknown as Record<string, unknown>[]}
          title={t('students.exportTitle') || 'Export Students'}
          defaultFilename="students_export"
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <DataImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImportComplete={handleImportComplete}
          title={t('students.importTitle') || 'Import Students'}
          acceptedFormats={['csv', 'json']}
        />
      )}
    </div>
  )
}