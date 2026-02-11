"use client"

import React, { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  X,
  Plus
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import type { Assignment, AssignmentCategory, Session } from '@/hooks/useAssignmentData'
import type { AssignmentFormData } from '@/hooks/useAssignmentActions'

interface AssignmentModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (formData: AssignmentFormData) => Promise<void>
  assignment?: Assignment | null
  categories: AssignmentCategory[]
  sessions: Session[]
  mode: 'create' | 'edit'
  onCreateCategory?: (name: string) => Promise<void>
}

export function AssignmentModal({
  isOpen,
  onClose,
  onSubmit,
  assignment,
  categories,
  sessions,
  mode,
  onCreateCategory
}: AssignmentModalProps) {
  const { t } = useTranslation()
  
  const [formData, setFormData] = useState<AssignmentFormData>({
    title: '',
    description: '',
    assignment_type: 'homework',
    due_date: '',
    classroom_session_id: '',
    assignment_categories_id: ''
  })
  
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Check if form is valid (required fields are filled)
  const isFormValid = Boolean(formData.title.trim() && formData.classroom_session_id)

  // Debug logging (remove after testing)
  console.log('Form validation:', {
    title: formData.title,
    titleTrimmed: formData.title.trim(),
    sessionId: formData.classroom_session_id,
    isFormValid,
    isSubmitting
  })

  // Initialize form data when assignment changes or modal opens
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && assignment) {
        setFormData({
          title: assignment.title,
          description: assignment.description || '',
          assignment_type: assignment.assignment_type,
          due_date: assignment.due_date || '',
          classroom_session_id: assignment.classroom_session_id,
          assignment_categories_id: assignment.assignment_categories_id || ''
        })
      } else {
        // Reset for create mode
        setFormData({
          title: '',
          description: '',
          assignment_type: 'homework',
          due_date: '',
          classroom_session_id: '',
          assignment_categories_id: ''
        })
      }
      setShowNewCategoryInput(false)
      setNewCategoryName('')
    }
  }, [isOpen, mode, assignment])

  const handleInputChange = (field: keyof AssignmentFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim() || !onCreateCategory) return
    
    try {
      await onCreateCategory(newCategoryName.trim())
      setNewCategoryName('')
      setShowNewCategoryInput(false)
    } catch (error) {
      console.error('Error creating category:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim()) {
      alert(t('assignments.titleRequired'))
      return
    }
    
    if (!formData.classroom_session_id) {
      alert(t('assignments.sessionRequired'))
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      onClose()
    } catch (error) {
      console.error('Error submitting assignment:', error)
      alert(t('assignments.errorSaving'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <div className="flex flex-col h-full">
        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">
              {mode === 'edit' ? t('assignments.editAssignment') : t('assignments.addAssignment')}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-1"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                {t('assignments.title')} <span className="text-red-500">*</span>
              </Label>
              <Input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder={String(t('assignments.titlePlaceholder'))}
                className="h-10 text-sm bg-white border border-border focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                required
              />
            </div>

            {/* Session */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                {t('assignments.session')} <span className="text-red-500">*</span>
              </Label>
              <Select value={formData.classroom_session_id} onValueChange={(value) => handleInputChange('classroom_session_id', value)}>
                <SelectTrigger className="h-10 text-sm bg-white border border-border focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0">
                  <SelectValue placeholder={String(t('assignments.selectSession'))} />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map(session => (
                    <SelectItem key={session.id} value={session.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{session.classroom_name}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(session.date).toLocaleDateString()} {session.start_time} - {session.end_time}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Type and Due Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">{t('assignments.type')}</Label>
                <Select value={formData.assignment_type} onValueChange={(value) => handleInputChange('assignment_type', value)}>
                  <SelectTrigger className="h-10 text-sm bg-white border border-border focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="homework">{t('assignments.type.homework')}</SelectItem>
                    <SelectItem value="quiz">{t('assignments.type.quiz')}</SelectItem>
                    <SelectItem value="test">{t('assignments.type.test')}</SelectItem>
                    <SelectItem value="project">{t('assignments.type.project')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">{t('assignments.dueDate')}</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => handleInputChange('due_date', e.target.value)}
                  className="h-10 text-sm bg-white border border-border focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">{t('assignments.category')}</Label>
              {!showNewCategoryInput ? (
                <div className="flex gap-2">
                  <Select value={formData.assignment_categories_id} onValueChange={(value) => handleInputChange('assignment_categories_id', value)}>
                    <SelectTrigger className="flex-1 h-10 text-sm bg-white border border-border focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0">
                      <SelectValue placeholder={String(t('assignments.selectCategory'))} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">{t('assignments.noCategory')}</SelectItem>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {onCreateCategory && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowNewCategoryInput(true)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder={String(t('assignments.newCategoryPlaceholder'))}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCreateCategory}
                    disabled={!newCategoryName.trim()}
                  >
                    {t('common.add')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowNewCategoryInput(false)
                      setNewCategoryName('')
                    }}
                  >
                    {t('common.cancel')}
                  </Button>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">{t('assignments.description')}</Label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder={String(t('assignments.descriptionPlaceholder'))}
                className="w-full h-24 px-3 py-2 text-sm bg-white border border-border rounded-md focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 resize-none"
              />
            </div>
          </form>
        </div>
        
        <div className="flex-shrink-0 flex items-center justify-between p-4 border-t border-gray-200">
          <Button variant="outline" size="sm" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting || !isFormValid}
            className={`min-w-20 ${(!isFormValid && !isSubmitting) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isSubmitting ? t('common.saving') : (mode === 'edit' ? t('common.update') : t('common.create'))}
          </Button>
        </div>
      </div>
    </Modal>
  )
}