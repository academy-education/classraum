"use client"

import React, { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  X,
  Plus,
  Edit,
  Trash2,
  Book,
  AlertTriangle,
  ChevronRight
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { useSubjectData, type Subject } from '@/hooks/useSubjectData'
import { useSubjectActions } from '@/hooks/useSubjectActions'

interface SubjectManagementModalProps {
  isOpen: boolean
  onClose: () => void
  academyId: string
  onSubjectsUpdated?: () => void
}

export function SubjectManagementModal({
  isOpen,
  onClose,
  academyId,
  onSubjectsUpdated
}: SubjectManagementModalProps) {
  const { t } = useTranslation()
  const { subjects, loading, refreshData, getCategoriesBySubjectId, getUnlinkedCategories } = useSubjectData(academyId)
  const { createSubject, updateSubject, deleteSubject, linkCategoryToSubject } = useSubjectActions()
  
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  const [subjectName, setSubjectName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null)
  const [showUnlinkedCategories, setShowUnlinkedCategories] = useState(false)

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setShowAddForm(false)
      setEditingSubject(null)
      setSubjectName('')
      setError(null)
      setExpandedSubject(null)
      setShowUnlinkedCategories(false)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!subjectName.trim()) {
      setError(String(t('subjects.nameRequired')))
      return
    }

    setIsSubmitting(true)
    setError(null)
    
    try {
      let result
      
      if (editingSubject) {
        result = await updateSubject(editingSubject.id, { name: subjectName.trim() })
      } else {
        result = await createSubject({ name: subjectName.trim(), academy_id: academyId })
      }
      
      if (result.success) {
        await refreshData()
        onSubjectsUpdated?.()
        
        // Reset form
        setSubjectName('')
        setShowAddForm(false)
        setEditingSubject(null)
        
        alert(editingSubject ? t('subjects.updateSuccess') : t('subjects.createSuccess'))
      } else {
        setError(result.error?.message || (editingSubject ? String(t('subjects.updateError')) : String(t('subjects.createError'))))
      }
    } catch (error) {
      console.error('Error submitting subject:', error)
      setError(editingSubject ? String(t('subjects.updateError')) : String(t('subjects.createError')))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (subject: Subject) => {
    setEditingSubject(subject)
    setSubjectName(subject.name)
    setShowAddForm(true)
    setError(null)
  }

  const handleDelete = async (subject: Subject) => {
    if (!confirm(String(t('subjects.deleteConfirm', { name: subject.name })))) {
      return
    }

    setIsSubmitting(true)
    
    try {
      const result = await deleteSubject(subject.id)
      
      if (result.success) {
        await refreshData()
        onSubjectsUpdated?.()
        alert(t('subjects.deleteSuccess'))
      } else {
        alert(result.error?.message || t('subjects.deleteError'))
      }
    } catch (error) {
      console.error('Error deleting subject:', error)
      alert(t('subjects.deleteError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLinkCategory = async (categoryId: string, subjectId: string) => {
    try {
      const result = await linkCategoryToSubject(categoryId, subjectId)
      
      if (result.success) {
        await refreshData()
        alert(t('subjects.categoryLinked'))
      } else {
        alert(result.error?.message || t('subjects.linkError'))
      }
    } catch (error) {
      console.error('Error linking category:', error)
      alert(t('subjects.linkError'))
    }
  }

  const toggleSubjectExpansion = (subjectId: string) => {
    setExpandedSubject(expandedSubject === subjectId ? null : subjectId)
  }

  const unlinkedCategories = getUnlinkedCategories()

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl">
      <div className="flex flex-col h-full">
        <div className="flex-shrink-0 flex items-center justify-between p-6 pb-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">{t('subjects.manageSubjects')}</h2>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="p-1"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">{t('common.loading')}</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Add Subject Form */}
              {showAddForm && (
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    {editingSubject ? t('subjects.editSubject') : t('subjects.addSubject')}
                  </h3>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-foreground/80">
                        {t('subjects.subjectName')} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="text"
                        value={subjectName}
                        onChange={(e) => setSubjectName(e.target.value)}
                        placeholder={String(t('subjects.enterSubjectName'))}
                        className="mt-1"
                        disabled={isSubmitting}
                        required
                      />
                    </div>
                    
                    {error && (
                      <div className="text-sm text-red-600">{error}</div>
                    )}
                    
                    <div className="flex gap-2">
                      <Button 
                        type="submit" 
                        disabled={isSubmitting || !subjectName.trim()}
                        className="min-w-24"
                      >
                        {isSubmitting ? t('common.saving') : (editingSubject ? t('common.update') : t('common.create'))}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setShowAddForm(false)
                          setEditingSubject(null)
                          setSubjectName('')
                          setError(null)
                        }}
                        disabled={isSubmitting}
                      >
                        {t('common.cancel')}
                      </Button>
                    </div>
                  </form>
                </div>
              )}
              
              {/* Add Subject Button */}
              {!showAddForm && (
                <Button 
                  onClick={() => setShowAddForm(true)}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t('subjects.addSubject')}
                </Button>
              )}

              {/* Subjects List */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">{t('subjects.subjectsList')}</h3>
                
                {subjects.length === 0 ? (
                  <div className="text-center py-8">
                    <Book className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {t('subjects.noSubjects')}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {t('subjects.noSubjectsDescription')}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {subjects.map(subject => {
                      const subjectCategories = getCategoriesBySubjectId(subject.id)
                      const isExpanded = expandedSubject === subject.id
                      
                      return (
                        <div key={subject.id} className="border border-gray-200 rounded-lg">
                          <div className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-3 flex-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleSubjectExpansion(subject.id)}
                                className="p-1"
                              >
                                <ChevronRight 
                                  className={`w-4 h-4 transition-transform ${
                                    isExpanded ? 'rotate-90' : ''
                                  }`} 
                                />
                              </Button>
                              <Book className="w-5 h-5 text-blue-600" />
                              <div>
                                <h4 className="font-medium text-gray-900">{subject.name}</h4>
                                <p className="text-sm text-gray-500">
                                  {t('subjects.categoriesCount', { count: subjectCategories.length })}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(subject)}
                                disabled={isSubmitting}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(subject)}
                                disabled={isSubmitting}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          
                          {isExpanded && (
                            <div className="px-4 pb-4 border-t border-gray-100">
                              <div className="mt-4">
                                <h5 className="text-sm font-medium text-gray-900 mb-2">
                                  {t('subjects.linkedCategories')}
                                </h5>
                                {subjectCategories.length === 0 ? (
                                  <p className="text-sm text-gray-500">{t('subjects.noLinkedCategories')}</p>
                                ) : (
                                  <div className="space-y-1">
                                    {subjectCategories.map(category => (
                                      <div 
                                        key={category.id}
                                        className="flex items-center gap-2 text-sm text-gray-600"
                                      >
                                        <span>•</span>
                                        <span>{category.name}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Unlinked Categories */}
              {unlinkedCategories.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">{t('subjects.unlinkedCategories')}</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowUnlinkedCategories(!showUnlinkedCategories)}
                    >
                      <ChevronRight 
                        className={`w-4 h-4 transition-transform ${
                          showUnlinkedCategories ? 'rotate-90' : ''
                        }`} 
                      />
                    </Button>
                  </div>
                  
                  {showUnlinkedCategories && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-start gap-3 mb-3">
                        <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-medium text-yellow-800">
                            {t('subjects.unlinkedCategoriesWarning')}
                          </h4>
                          <p className="text-sm text-yellow-700 mt-1">
                            {t('subjects.unlinkedCategoriesDescription')}
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {unlinkedCategories.map(category => (
                          <div 
                            key={category.id}
                            className="flex items-center justify-between p-2 bg-white rounded border"
                          >
                            <span className="text-sm font-medium text-gray-900">{category.name}</span>
                            <div className="flex gap-2">
                              {subjects.map(subject => (
                                <Button
                                  key={subject.id}
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleLinkCategory(category.id, subject.id)}
                                  className="text-xs"
                                >
                                  {t('subjects.linkTo', { subject: subject.name })}
                                </Button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="flex-shrink-0 flex justify-end p-6 pt-4 border-t border-gray-200">
          <Button onClick={onClose}>
            {t('common.close')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}