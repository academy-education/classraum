"use client"

import { useState, useMemo } from 'react'
import { Plus, X, Search, Paperclip, Loader2 } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FileUpload } from '@/components/ui/file-upload'
import { AssignmentsDatePicker } from '@/components/ui/assignments-page'
import type { Assignment, Session, AttachmentFile } from '@/components/ui/assignments/hooks/useAssignmentsData'

interface FormData {
  classroom_session_id: string
  title: string
  description: string
  assignment_type: 'quiz' | 'homework' | 'test' | 'project'
  due_date: string
  assignment_categories_id: string
}

interface CategoryOption {
  id: string
  name: string
}

interface AssignmentCreateEditModalProps {
  isOpen: boolean
  onClose: () => void
  editingAssignment: Assignment | null
  formData: FormData
  setFormData: React.Dispatch<React.SetStateAction<FormData>>
  attachmentFiles: AttachmentFile[]
  setAttachmentFiles: React.Dispatch<React.SetStateAction<AttachmentFile[]>>
  sessions: Session[]
  isManager: boolean
  isCreating: boolean
  isSaving: boolean
  editModalLoading: boolean
  showInlineCategoryCreate: boolean
  setShowInlineCategoryCreate: React.Dispatch<React.SetStateAction<boolean>>
  newCategoryName: string
  setNewCategoryName: React.Dispatch<React.SetStateAction<string>>
  isCreatingCategory: boolean
  getFilteredCategories: () => CategoryOption[]
  handleCreateCategory: () => void | Promise<void>
  handleSubmit: (e: React.FormEvent) => void | Promise<void>
  formatDate: (dateString: string, includeWeekday?: boolean) => string
  activeDatePicker: string | null
  setActiveDatePicker: (id: string | null) => void
  isFormValid: boolean
}

export function AssignmentCreateEditModal({
  isOpen,
  onClose,
  editingAssignment,
  formData,
  setFormData,
  attachmentFiles,
  setAttachmentFiles,
  sessions,
  isManager,
  isCreating,
  isSaving,
  editModalLoading: _editModalLoading,
  showInlineCategoryCreate,
  setShowInlineCategoryCreate,
  newCategoryName,
  setNewCategoryName,
  isCreatingCategory,
  getFilteredCategories,
  handleCreateCategory,
  handleSubmit,
  formatDate,
  activeDatePicker,
  setActiveDatePicker,
  isFormValid,
}: AssignmentCreateEditModalProps) {
  void _editModalLoading
  const { t, language } = useTranslation()
  const [sessionSearchQuery, setSessionSearchQuery] = useState('')

  const filteredSessionOptions = useMemo(() => sessions.filter(session => {
    const searchTerm = sessionSearchQuery.toLowerCase()
    return (
      session.classroom_name.toLowerCase().includes(searchTerm) ||
      formatDate(session.date).toLowerCase().includes(searchTerm) ||
      session.start_time.toLowerCase().includes(searchTerm)
    )
  }), [sessions, sessionSearchQuery, formatDate])

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900">
            {editingAssignment ? t("assignments.editAssignment") : t("assignments.addNewAssignment")}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            className="p-1"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-6 pt-4">
          <form id="assignment-form" onSubmit={handleSubmit} className="space-y-5">
            {!editingAssignment && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">
                  {String(t("assignments.sessionRequired")).replace(' *', '')} <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.classroom_session_id}
                  onValueChange={(value) => {
                    setFormData(prev => ({ ...prev, classroom_session_id: value, assignment_categories_id: '' }))
                  }}
                  required
                  onOpenChange={(open) => {
                    if (!open) setSessionSearchQuery('')
                  }}
                >
                  <SelectTrigger className="h-10 bg-white border border-border focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary">
                    <SelectValue placeholder={String(t("assignments.selectSession"))} />
                  </SelectTrigger>
                  <SelectContent className="z-[210]">
                    {sessions.length > 0 ? (
                      <>
                        <div className="px-2 py-1.5 sticky top-0 bg-white border-b">
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <Input
                              placeholder={String(t("common.search"))}
                              value={sessionSearchQuery}
                              onChange={(e) => setSessionSearchQuery(e.target.value)}
                              className="pl-8 h-8"
                              onKeyDown={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                        <div className="overflow-y-auto">
                          {filteredSessionOptions.map((session) => (
                            <SelectItem key={session.id} value={session.id}>
                              {session.classroom_name} - {formatDate(session.date)} ({session.start_time})
                            </SelectItem>
                          ))}
                          {filteredSessionOptions.length === 0 && (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                              {t("common.noResults")}
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <SelectItem value="no-sessions" disabled>{t("assignments.noSessionsAvailable")}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                {String(t("assignments.titleRequired")).replace(' *', '')} <span className="text-red-500">*</span>
              </Label>
              <Input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder={String(t("assignments.enterTitle"))}
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                {t("assignments.descriptionLabel")}
              </Label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full min-h-[2.5rem] px-3 py-2 rounded-lg border border-border bg-transparent focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none resize-none text-sm"
                placeholder={String(t("assignments.enterDescription"))}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                {String(t("assignments.typeRequired")).replace(' *', '')} <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.assignment_type}
                onValueChange={(value: 'quiz' | 'homework' | 'test' | 'project') =>
                  setFormData(prev => ({ ...prev, assignment_type: value }))
                }
              >
                <SelectTrigger className="h-10 bg-white border border-border focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary">
                  <SelectValue placeholder={String(t("assignments.selectType"))} />
                </SelectTrigger>
                <SelectContent className="z-[210]">
                  <SelectItem value="homework">{t("assignments.homework")}</SelectItem>
                  <SelectItem value="quiz">{t("assignments.quiz")}</SelectItem>
                  <SelectItem value="test">{t("assignments.test")}</SelectItem>
                  <SelectItem value="project">{t("assignments.project")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                {t("assignments.category")}
              </Label>
              <Select
                value={formData.assignment_categories_id}
                onValueChange={(value) => {
                  if (value === 'add-new' && isManager) {
                    setShowInlineCategoryCreate(true)
                  } else {
                    setFormData(prev => ({ ...prev, assignment_categories_id: value }))
                  }
                }}
                disabled={!formData.classroom_session_id}
              >
                <SelectTrigger className="h-10 bg-white border border-border focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary">
                  <SelectValue placeholder={formData.classroom_session_id ? t("assignments.selectCategory") : t("sessions.selectSessionFirst")} />
                </SelectTrigger>
                <SelectContent className="z-[210]">
                  {formData.classroom_session_id && getFilteredCategories().map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                  {isManager && formData.classroom_session_id && (
                    <SelectItem value="add-new">
                      <Plus className="w-4 h-4 inline mr-2" />
                      {t("sessions.addCategory")}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>

              {showInlineCategoryCreate && (
                <div className="space-y-2 mt-2">
                  <Input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder={String(t("sessions.enterCategoryName"))}
                    className="h-10 rounded-lg border border-border bg-transparent focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                    disabled={isCreatingCategory}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleCreateCategory()
                      } else if (e.key === 'Escape') {
                        setShowInlineCategoryCreate(false)
                        setNewCategoryName('')
                      }
                    }}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={handleCreateCategory}
                      disabled={!newCategoryName.trim() || isCreatingCategory}
                      size="sm"
                    >
                      {isCreatingCategory ? t('common.saving') : t('common.create')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowInlineCategoryCreate(false)
                        setNewCategoryName('')
                      }}
                      size="sm"
                      disabled={isCreatingCategory}
                    >
                      {t('common.cancel')}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                {t("assignments.dueDate")} <span className="text-red-500">*</span>
              </Label>
              <AssignmentsDatePicker
                value={formData.due_date}
                onChange={(value) => setFormData(prev => ({ ...prev, due_date: Array.isArray(value) ? value[0] : value }))}
                fieldId="due_date"
                height="h-10"
                shadow="shadow-sm"
                placeholder={String(t("assignments.selectDueDate"))}
                activeDatePicker={activeDatePicker}
                setActiveDatePicker={setActiveDatePicker}
                t={t}
                language={language}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                <Paperclip className="inline w-4 h-4 mr-1" />
                {t("assignments.attachments")}
              </Label>
              <FileUpload
                files={attachmentFiles}
                onChange={setAttachmentFiles}
                maxFiles={5}
                className="border border-border rounded-lg p-4"
              />
            </div>

          </form>
        </div>

        <div className="flex gap-3 p-6 pt-4 border-t border-gray-200 flex-shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            {t("assignments.cancel")}
          </Button>
          <Button
            type="submit"
            form="assignment-form"
            disabled={!isFormValid || isCreating || isSaving}
            className={`flex-1 ${!isFormValid || isCreating || isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {(editingAssignment ? isSaving : isCreating) && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            {editingAssignment
              ? (isSaving ? t("common.saving") : t("assignments.updateAssignment"))
              : (isCreating ? t("common.creating") : t("assignments.addAssignment"))
            }
          </Button>
        </div>
      </div>
    </Modal>
  )
}
