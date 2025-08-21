"use client"

import React, { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Plus,
  Search,
  Users,
  Download,
  Upload,
  UserCheck,
  UserX
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { useStudentData, type Student } from '@/hooks/useStudentData'
import { useStudentActions, type StudentFormData } from '@/hooks/useStudentActions'
import { StudentCard } from './StudentCard'
import { StudentModal } from './StudentModal'
import { StudentDetailsModal } from './StudentDetailsModal'
import { DeleteConfirmationModal } from '../classrooms/DeleteConfirmationModal'
import { DataExportModal } from '@/components/ui/common/DataExportModal'
import { DataImportModal } from '@/components/ui/common/DataImportModal'
import { ImportResult } from '@/hooks/useDataImport'

interface StudentsPageProps {
  academyId: string
}

export function StudentsPageRefactored({ academyId }: StudentsPageProps) {
  const { t } = useTranslation()
  const { students, families, classrooms, loading, refreshData, getStudentClassrooms } = useStudentData(academyId)
  const { createStudent, updateStudent, deleteStudent, toggleStudentStatus, bulkUpdateStudents } = useStudentActions()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [familyFilter, setFamilyFilter] = useState<string>('all')
  const [schoolFilter, setSchoolFilter] = useState<string>('all')
  
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null)
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())
  const [showExportModal, setShowExportModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)

  // Get unique schools for filtering
  const schools = useMemo(() => {
    const schoolSet = new Set(students.filter(s => s.school_name).map(s => s.school_name!))
    return Array.from(schoolSet).sort()
  }, [students])

  // Filter students based on search and filters
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      // Search filter
      const matchesSearch = !searchQuery || 
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.school_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.family_name?.toLowerCase().includes(searchQuery.toLowerCase())

      // Status filter
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' && student.active) ||
        (statusFilter === 'inactive' && !student.active)

      // Family filter
      const matchesFamily = familyFilter === 'all' || 
        (familyFilter === 'none' && !student.family_id) ||
        student.family_id === familyFilter

      // School filter
      const matchesSchool = schoolFilter === 'all' || 
        (schoolFilter === 'none' && !student.school_name) ||
        student.school_name === schoolFilter

      return matchesSearch && matchesStatus && matchesFamily && matchesSchool
    })
  }, [students, searchQuery, statusFilter, familyFilter, schoolFilter])

  const stats = useMemo(() => {
    return {
      total: students.length,
      active: students.filter(s => s.active).length,
      inactive: students.filter(s => !s.active).length,
      withFamily: students.filter(s => s.family_id).length
    }
  }, [students])

  const handleCreateStudent = async (formData: StudentFormData) => {
    const result = await createStudent(academyId, formData)
    
    if (result.success) {
      await refreshData()
      setShowModal(false)
      alert(t('students.createSuccess'))
    } else {
      alert(t('students.createError') + ': ' + result.error?.message)
    }
  }

  const handleUpdateStudent = async (formData: StudentFormData) => {
    if (!editingStudent) return
    
    const result = await updateStudent(editingStudent.user_id, formData)
    
    if (result.success) {
      await refreshData()
      setShowEditModal(false)
      setEditingStudent(null)
      alert(t('students.updateSuccess'))
    } else {
      alert(t('students.updateError') + ': ' + result.error?.message)
    }
  }

  const handleDeleteStudent = async () => {
    if (!studentToDelete) return
    
    const result = await deleteStudent(studentToDelete.user_id)
    
    if (result.success) {
      await refreshData()
      setShowDeleteModal(false)
      setStudentToDelete(null)
      alert(t('students.deleteSuccess'))
    } else {
      alert(t('students.deleteError') + ': ' + result.error?.message)
    }
  }

  const handleToggleStatus = async (student: Student) => {
    const result = await toggleStudentStatus(student.user_id, !student.active)
    
    if (result.success) {
      await refreshData()
      alert(student.active ? t('students.deactivated') : t('students.activated'))
    } else {
      alert(t('students.errorToggling') + ': ' + result.error?.message)
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
      await refreshData()
      setSelectedStudents(new Set())
      alert(t('students.bulkUpdateSuccess'))
    } else {
      alert(t('students.bulkUpdateError') + ': ' + result.error?.message)
    }
  }

  const handleEdit = (student: Student) => {
    setEditingStudent(student)
    setShowEditModal(true)
  }

  const handleView = async (student: Student) => {
    setSelectedStudent(student)
    setShowDetailsModal(true)
  }

  const handleDelete = (student: Student) => {
    setStudentToDelete(student)
    setShowDeleteModal(true)
  }

  const handleSelectStudent = (studentId: string, selected: boolean) => {
    setSelectedStudents(prev => {
      const newSet = new Set(prev)
      if (selected) {
        newSet.add(studentId)
      } else {
        newSet.delete(studentId)
      }
      return newSet
    })
  }

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedStudents(new Set(filteredStudents.map(s => s.user_id)))
    } else {
      setSelectedStudents(new Set())
    }
  }

  const handleImportComplete = async (result: ImportResult<unknown>) => {
    console.log('Import completed:', result)
    // Refresh data to show imported students
    await refreshData()
    alert(t('students.importSuccess', { count: result.metadata.validRows }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">{t('common.loading')}</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('students.title')}</h1>
          <p className="text-gray-600">{t('students.description')}</p>
        </div>
        <div className="flex gap-2">
          {/* Import button hidden for now
          <Button variant="outline" onClick={() => setShowImportModal(true)}>
            <Upload className="w-4 h-4 mr-2" />
            {t('students.import')}
          </Button>
          */}
          <Button variant="outline" onClick={() => setShowExportModal(true)}>
            <Download className="w-4 h-4 mr-2" />
            {t('students.export')}
          </Button>
          <Button onClick={() => setShowModal(true)} className="bg-primary text-white">
            <Plus className="w-4 h-4 mr-2" />
            {t('students.addStudent')}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900">{t('students.totalStudents')}</p>
              <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-900">{t('students.activeStudents')}</p>
              <p className="text-2xl font-bold text-green-900">{stats.active}</p>
            </div>
            <UserCheck className="w-8 h-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-900">{t('students.inactiveStudents')}</p>
              <p className="text-2xl font-bold text-red-900">{stats.inactive}</p>
            </div>
            <UserX className="w-8 h-8 text-red-600" />
          </div>
        </div>
        
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-900">{t('students.withFamily')}</p>
              <p className="text-2xl font-bold text-purple-900">{stats.withFamily}</p>
            </div>
            <Users className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder={t('students.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full lg:w-48">
            <SelectValue placeholder={t('students.filterByStatus')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('students.allStatuses')}</SelectItem>
            <SelectItem value="active">{t('students.active')}</SelectItem>
            <SelectItem value="inactive">{t('students.inactive')}</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={familyFilter} onValueChange={setFamilyFilter}>
          <SelectTrigger className="w-full lg:w-48">
            <SelectValue placeholder={t('students.filterByFamily')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('students.allFamilies')}</SelectItem>
            <SelectItem value="none">{t('students.noFamily')}</SelectItem>
            {families.map(family => (
              <SelectItem key={family.id} value={family.id}>
                {family.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={schoolFilter} onValueChange={setSchoolFilter}>
          <SelectTrigger className="w-full lg:w-48">
            <SelectValue placeholder={t('students.filterBySchool')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('students.allSchools')}</SelectItem>
            <SelectItem value="none">{t('students.noSchool')}</SelectItem>
            {schools.map(school => (
              <SelectItem key={school} value={school}>
                {school}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Actions */}
      {selectedStudents.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">
              {t('students.selectedCount', { count: selectedStudents.size })}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkStatusUpdate(true)}
              >
                <UserCheck className="w-4 h-4 mr-1" />
                {t('students.activate')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkStatusUpdate(false)}
              >
                <UserX className="w-4 h-4 mr-1" />
                {t('students.deactivate')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedStudents(new Set())}
              >
                {t('students.clearSelection')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Students Grid */}
      {filteredStudents.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery || statusFilter !== 'all' || familyFilter !== 'all' || schoolFilter !== 'all'
              ? t('students.noResults') 
              : t('students.noStudents')}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchQuery || statusFilter !== 'all' || familyFilter !== 'all' || schoolFilter !== 'all'
              ? t('students.tryDifferentFilters')
              : t('students.getStarted')}
          </p>
          {!searchQuery && statusFilter === 'all' && familyFilter === 'all' && schoolFilter === 'all' && (
            <Button onClick={() => setShowModal(true)} className="bg-primary text-white">
              <Plus className="w-4 h-4 mr-2" />
              {t('students.addFirstStudent')}
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Select All Checkbox */}
          <div className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              checked={filteredStudents.length > 0 && selectedStudents.size === filteredStudents.length}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-600">
              {t('students.selectAll')} ({filteredStudents.length})
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStudents.map(student => (
              <div key={student.user_id} className="relative">
                <input
                  type="checkbox"
                  checked={selectedStudents.has(student.user_id)}
                  onChange={(e) => handleSelectStudent(student.user_id, e.target.checked)}
                  className="absolute top-2 left-2 z-10 rounded"
                />
                <StudentCard
                  student={student}
                  onEdit={handleEdit}
                  onView={handleView}
                  onToggleStatus={handleToggleStatus}
                />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modals */}
      <StudentModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleCreateStudent}
        families={families}
        mode="create"
      />

      <StudentModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setEditingStudent(null)
        }}
        onSubmit={handleUpdateStudent}
        student={editingStudent}
        families={families}
        mode="edit"
      />

      <StudentDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false)
          setSelectedStudent(null)
        }}
        student={selectedStudent}
        onEdit={handleEdit}
        getStudentClassrooms={getStudentClassrooms}
      />

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setStudentToDelete(null)
        }}
        onConfirm={handleDeleteStudent}
        title={t('students.deleteConfirmTitle')}
        message={t('students.deleteConfirmMessage', { name: studentToDelete?.name })}
      />

      {/* Export Modal */}
      <DataExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        data={filteredStudents as unknown as Record<string, unknown>[]}
        title={t('students.exportTitle')}
        defaultFilename="students_export"
      />

      {/* Import Modal */}
      <DataImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={handleImportComplete}
        title={t('students.importTitle')}
        acceptedFormats={['csv', 'json']}
      />
    </div>
  )
}