"use client"

import React, { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Plus,
  Search,
  School
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { useClassroomData, type Classroom, type Schedule } from '@/hooks/useClassroomData'
import { useClassroomActions, type ClassroomFormData } from '@/hooks/useClassroomActions'
import { ClassroomCard } from './ClassroomCard'
import { ClassroomModal } from './ClassroomModal'
import { ClassroomDetailsModal } from './ClassroomDetailsModal'
import { DeleteConfirmationModal } from './DeleteConfirmationModal'

interface ClassroomsPageProps {
  academyId: string
  onNavigateToSessions?: (classroomId?: string) => void
}

export function ClassroomsPageRefactored({ academyId, onNavigateToSessions }: ClassroomsPageProps) {
  const { t } = useTranslation()
  const { classrooms, teachers, students, loading, refreshData } = useClassroomData(academyId)
  const { createClassroom, updateClassroom, deleteClassroom } = useClassroomActions()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null)
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null)
  const [classroomToDelete, setClassroomToDelete] = useState<Classroom | null>(null)

  // Filter classrooms based on search query
  const filteredClassrooms = useMemo(() => {
    if (!searchQuery.trim()) return classrooms
    
    const query = searchQuery.toLowerCase()
    return classrooms.filter(classroom =>
      classroom.name.toLowerCase().includes(query) ||
      classroom.teacher_name?.toLowerCase().includes(query) ||
      classroom.grade?.toLowerCase().includes(query) ||
      classroom.subject?.toLowerCase().includes(query)
    )
  }, [classrooms, searchQuery])

  const handleCreateClassroomSubmit = async (
    formData: ClassroomFormData,
    schedules: Schedule[],
    selectedStudents: string[]
  ) => {
    const result = await createClassroom(academyId, formData, schedules, selectedStudents)
    
    if (result.success) {
      await refreshData()
      setShowModal(false)
      alert(t('classrooms.createSuccess'))
    } else {
      alert(t('classrooms.createError') + ': ' + result.error?.message)
    }
  }

  const handleUpdateClassroomSubmit = async (
    formData: ClassroomFormData,
    schedules: Schedule[],
    selectedStudents: string[]
  ) => {
    if (!editingClassroom) return
    
    const result = await updateClassroom(editingClassroom, formData, schedules, selectedStudents)
    
    if (result.success) {
      await refreshData()
      setShowModal(false)
      setEditingClassroom(null)
      alert(t('classrooms.updateSuccess'))
    } else {
      alert(t('classrooms.updateError') + ': ' + result.error?.message)
    }
  }

  const handleDeleteClassroom = async () => {
    if (!classroomToDelete) return
    
    const result = await deleteClassroom(classroomToDelete.id)
    
    if (result.success) {
      await refreshData()
      setShowDeleteModal(false)
      setClassroomToDelete(null)
      alert(t('classrooms.deleteSuccess'))
    } else {
      alert(t('classrooms.deleteError') + ': ' + result.error?.message)
    }
  }

  const handleEdit = (classroom: Classroom) => {
    setEditingClassroom(classroom)
    setShowModal(true)
  }

  const handleEditFromDetails = (classroom: Classroom) => {
    console.log('handleEditFromDetails called, keeping details modal open')
    console.log('Before: showDetailsModal =', showDetailsModal, 'showModal =', showModal)
    setEditingClassroom(classroom)
    setShowModal(true)
    console.log('Called setShowModal(true)')
    // Keep the details modal open behind the edit modal - just like sessions page
  }

  const handleDelete = (classroom: Classroom) => {
    setClassroomToDelete(classroom)
    setShowDeleteModal(true)
  }

  const handleViewDetails = (classroom: Classroom) => {
    setSelectedClassroom(classroom)
    setShowDetailsModal(true)
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
          <h1 className="text-2xl font-bold text-gray-900">{t('classrooms.title')}</h1>
          <p className="text-gray-600">{t('classrooms.description')}</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="bg-primary text-white">
          <Plus className="w-4 h-4 mr-2" />
          {t('classrooms.addClassroom')}
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          type="text"
          placeholder={t('classrooms.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Classrooms Grid */}
      {filteredClassrooms.length === 0 ? (
        <div className="text-center py-12">
          <School className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery ? t('classrooms.noResults') : t('classrooms.noClassrooms')}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchQuery ? t('classrooms.tryDifferentSearch') : t('classrooms.getStarted')}
          </p>
          {!searchQuery && (
            <Button onClick={() => setShowModal(true)} className="bg-primary text-white">
              <Plus className="w-4 h-4 mr-2" />
              {t('classrooms.addFirstClassroom')}
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClassrooms.map(classroom => (
            <ClassroomCard
              key={classroom.id}
              classroom={classroom}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onViewDetails={handleViewDetails}
              onNavigateToSessions={onNavigateToSessions}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <ClassroomModal
        isOpen={showModal}
        onClose={() => {
          console.log('Modal onClose called - showDetailsModal:', showDetailsModal)
          setShowModal(false)
          setEditingClassroom(null)
        }}
        onSubmit={editingClassroom ? handleUpdateClassroomSubmit : handleCreateClassroomSubmit}
        classroom={editingClassroom}
        teachers={teachers}
        students={students}
        mode={editingClassroom ? "edit" : "create"}
      />

      <ClassroomDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          console.log('Details modal onClose called - showModal:', showModal)
          setShowDetailsModal(false)
          setSelectedClassroom(null)
        }}
        classroom={selectedClassroom}
        onEdit={handleEditFromDetails}
        onNavigateToSessions={onNavigateToSessions}
      />

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setClassroomToDelete(null)
        }}
        onConfirm={handleDeleteClassroom}
        title={t('classrooms.deleteConfirmTitle')}
        message={t('classrooms.deleteConfirmMessage', { name: classroomToDelete?.name })}
      />
    </div>
  )
}