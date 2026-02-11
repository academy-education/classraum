"use client"

import React, { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Plus,
  Search,
  BookOpen
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { useAssignmentData, type Assignment, type SubmissionGrade } from '@/hooks/useAssignmentData'
import { useAssignmentActions, type AssignmentFormData } from '@/hooks/useAssignmentActions'
import { AssignmentCard } from './AssignmentCard'
import { AssignmentModal } from './AssignmentModal'
import { SubmissionsModal } from './SubmissionsModal'
import { DeleteConfirmationModal } from '../classrooms/DeleteConfirmationModal'

interface AssignmentsPageProps {
  academyId: string
  filterSessionId?: string
}

export function AssignmentsPageRefactored({ academyId, filterSessionId }: AssignmentsPageProps) {
  const { t } = useTranslation()
  const { assignments, categories, sessions, loading, refreshData, fetchSubmissionGrades } = useAssignmentData(academyId, filterSessionId)
  const { createAssignment, updateAssignment, deleteAssignment, updateSubmissionGrade, createCategory, bulkUpdateGrades } = useAssignmentActions()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false)
  
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null)
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [assignmentToDelete, setAssignmentToDelete] = useState<Assignment | null>(null)
  const [submissions, setSubmissions] = useState<SubmissionGrade[]>([])
  const [submissionsLoading, setSubmissionsLoading] = useState(false)

  // Filter assignments based on search and filters
  const filteredAssignments = useMemo(() => {
    return assignments.filter(assignment => {
      // Search filter
      const matchesSearch = !searchQuery || 
        assignment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        assignment.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        assignment.classroom_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        assignment.teacher_name?.toLowerCase().includes(searchQuery.toLowerCase())

      // Type filter
      const matchesType = typeFilter === 'all' || assignment.assignment_type === typeFilter

      // Category filter
      const matchesCategory = categoryFilter === 'all' || 
        (categoryFilter === 'none' && !assignment.assignment_categories_id) ||
        assignment.assignment_categories_id === categoryFilter

      return matchesSearch && matchesType && matchesCategory
    })
  }, [assignments, searchQuery, typeFilter, categoryFilter])

  const handleCreateAssignment = async (formData: AssignmentFormData) => {
    const result = await createAssignment(academyId, formData)
    
    if (result.success) {
      await refreshData()
      setShowModal(false)
      alert(t('assignments.createSuccess'))
    } else {
      alert(t('assignments.createError') + ': ' + result.error?.message)
    }
  }

  const handleUpdateAssignment = async (formData: AssignmentFormData) => {
    if (!editingAssignment) return
    
    const result = await updateAssignment(editingAssignment.id, formData)
    
    if (result.success) {
      await refreshData()
      setShowEditModal(false)
      setEditingAssignment(null)
      alert(t('assignments.updateSuccess'))
    } else {
      alert(t('assignments.updateError') + ': ' + result.error?.message)
    }
  }

  const handleDeleteAssignment = async () => {
    if (!assignmentToDelete) return
    
    const result = await deleteAssignment(assignmentToDelete.id)
    
    if (result.success) {
      await refreshData()
      setShowDeleteModal(false)
      setAssignmentToDelete(null)
      alert(t('assignments.deleteSuccess'))
    } else {
      alert(t('assignments.deleteError') + ': ' + result.error?.message)
    }
  }

  const handleCreateCategory = async (name: string) => {
    const result = await createCategory(academyId, name)
    
    if (result.success) {
      await refreshData() // This will refresh categories
    } else {
      throw new Error(result.error?.message || 'Failed to create category')
    }
  }

  const handleViewSubmissions = async (assignment: Assignment) => {
    setSelectedAssignment(assignment)
    setSubmissionsLoading(true)
    setShowSubmissionsModal(true)
    
    try {
      const submissionData = await fetchSubmissionGrades(assignment.id)
      setSubmissions(submissionData)
    } catch (error) {
      console.error('Error fetching submissions:', error)
      setSubmissions([])
    } finally {
      setSubmissionsLoading(false)
    }
  }

  const handleUpdateGrade = async (submissionId: string, grade: number, feedback?: string) => {
    const result = await updateSubmissionGrade(submissionId, grade, feedback)
    
    if (result.success) {
      // Refresh submissions
      if (selectedAssignment) {
        const submissionData = await fetchSubmissionGrades(selectedAssignment.id)
        setSubmissions(submissionData)
      }
    } else {
      throw new Error(result.error?.message || 'Failed to update grade')
    }
  }

  const handleBulkUpdateGrades = async (grades: Array<{ submissionId: string; grade: number; feedback?: string }>) => {
    const result = await bulkUpdateGrades(grades)
    
    if (result.success) {
      // Refresh submissions
      if (selectedAssignment) {
        const submissionData = await fetchSubmissionGrades(selectedAssignment.id)
        setSubmissions(submissionData)
      }
      alert(t('assignments.bulkUpdateSuccess'))
    } else {
      throw new Error(result.error?.message || 'Failed to bulk update grades')
    }
  }

  const handleEdit = (assignment: Assignment) => {
    setEditingAssignment(assignment)
    setShowEditModal(true)
  }

  const handleDelete = (assignment: Assignment) => {
    setAssignmentToDelete(assignment)
    setShowDeleteModal(true)
  }

  const handleView = (assignment: Assignment) => {
    setSelectedAssignment(assignment)
    setShowModal(true)
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
          <h1 className="text-2xl font-bold text-gray-900">{t('assignments.title')}</h1>
          <p className="text-gray-600">{t('assignments.description')}</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="bg-primary text-white">
          <Plus className="w-4 h-4 mr-2" />
          {t('assignments.addAssignment')}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none" />
          <Input
            type="text"
            placeholder={String(t('assignments.searchPlaceholder'))}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder={String(t('assignments.filterByType'))} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('assignments.allTypes')}</SelectItem>
            <SelectItem value="homework">{t('assignments.type.homework')}</SelectItem>
            <SelectItem value="quiz">{t('assignments.type.quiz')}</SelectItem>
            <SelectItem value="test">{t('assignments.type.test')}</SelectItem>
            <SelectItem value="project">{t('assignments.type.project')}</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder={String(t('assignments.filterByCategory'))} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('assignments.allCategories')}</SelectItem>
            <SelectItem value="none">{t('assignments.noCategory')}</SelectItem>
            {categories.map(category => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Assignments Grid */}
      {filteredAssignments.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery || typeFilter !== 'all' || categoryFilter !== 'all' 
              ? t('assignments.noResults') 
              : t('assignments.noAssignments')}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchQuery || typeFilter !== 'all' || categoryFilter !== 'all'
              ? t('assignments.tryDifferentFilters')
              : t('assignments.getStarted')}
          </p>
          {!searchQuery && typeFilter === 'all' && categoryFilter === 'all' && (
            <Button onClick={() => setShowModal(true)} className="bg-primary text-white">
              <Plus className="w-4 h-4 mr-2" />
              {t('assignments.addFirstAssignment')}
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssignments.map(assignment => (
            <AssignmentCard
              key={assignment.id}
              assignment={assignment}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onView={handleView}
              onViewSubmissions={handleViewSubmissions}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <AssignmentModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleCreateAssignment}
        categories={categories}
        sessions={sessions}
        mode="create"
        onCreateCategory={handleCreateCategory}
      />

      <AssignmentModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setEditingAssignment(null)
        }}
        onSubmit={handleUpdateAssignment}
        assignment={editingAssignment}
        categories={categories}
        sessions={sessions}
        mode="edit"
        onCreateCategory={handleCreateCategory}
      />

      <SubmissionsModal
        isOpen={showSubmissionsModal}
        onClose={() => {
          setShowSubmissionsModal(false)
          setSelectedAssignment(null)
          setSubmissions([])
        }}
        assignment={selectedAssignment}
        submissions={submissions}
        onUpdateGrade={handleUpdateGrade}
        onBulkUpdate={handleBulkUpdateGrades}
        loading={submissionsLoading}
      />

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setAssignmentToDelete(null)
        }}
        onConfirm={handleDeleteAssignment}
        title={String(t('assignments.deleteConfirmTitle'))}
        message={String(t('assignments.deleteConfirmMessage', { title: assignmentToDelete?.title }))}
      />
    </div>
  )
}