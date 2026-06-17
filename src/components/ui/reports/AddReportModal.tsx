"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ModalShell } from '@/components/ui/common/ModalShell'
import { Plus, Loader2 } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { StudentSelector } from './StudentSelector'
import { ReportBasicInfoForm } from './ReportBasicInfoForm'
import { FeedbackSection } from './FeedbackSection'
import { Student } from '@/hooks/useReports'

interface AddReportModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (reportData: FormData) => Promise<{ success: boolean; error?: unknown }>
  students: Student[]
  fetchStudentClassrooms: (studentId: string) => void
  loading?: boolean
  /** Render inline (no portal/backdrop). Used by the help center demo. */
  inline?: boolean
}

interface FormData {
  student_id: string
  report_name: string
  start_date: string
  end_date: string
  selected_classrooms: string[]
  selected_assignment_categories: string[]
  ai_feedback_enabled: boolean
  status: 'Draft' | 'Finished' | 'Approved' | 'Sent' | 'Viewed' | 'Error'
}

const AddReportModal = React.memo<AddReportModalProps>(({
  isOpen,
  onClose,
  onSave,
  students,
  fetchStudentClassrooms,
  loading = false,
  inline
}) => {
  const { t } = useTranslation()
  
  const [formData, setFormData] = useState<FormData>({
    student_id: '',
    report_name: '',
    start_date: '',
    end_date: '',
    selected_classrooms: [],
    selected_assignment_categories: [],
    ai_feedback_enabled: true,
    status: 'Draft'
  })
  
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({})
  const [submitting, setSubmitting] = useState(false)

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        student_id: '',
        report_name: '',
        start_date: '',
        end_date: '',
        selected_classrooms: [],
        selected_assignment_categories: [],
        ai_feedback_enabled: true,
        status: 'Draft'
      })
      setFormErrors({})
    }
  }, [isOpen])

  // Fetch classrooms when student is selected
  useEffect(() => {
    if (formData.student_id) {
      fetchStudentClassrooms(formData.student_id)
    }
  }, [formData.student_id, fetchStudentClassrooms])

  const handleFormChange = React.useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }, [formErrors])

  const handleStudentSelect = React.useCallback((studentId: string) => {
    setFormData(prev => ({
      ...prev,
      student_id: studentId,
      // Reset selections when student changes
      selected_classrooms: [],
      selected_assignment_categories: []
    }))
    // Clear student error
    if (formErrors.student_id) {
      setFormErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors.student_id
        return newErrors
      })
    }
  }, [formErrors.student_id])

  const validateForm = React.useCallback(() => {
    const errors: { [key: string]: string } = {}
    
    if (!formData.student_id) {
      errors.student_id = String(t('reports.pleaseSelectStudent'))
    }
    if (!formData.report_name.trim()) {
      errors.report_name = String(t('reports.reportTitleRequired'))
    }
    if (!formData.start_date) {
      errors.start_date = String(t('reports.startDateRequired'))
    }
    if (!formData.end_date) {
      errors.end_date = String(t('reports.endDateRequired'))
    }
    if (formData.start_date && formData.end_date && new Date(formData.start_date) >= new Date(formData.end_date)) {
      errors.end_date = String(t('reports.endDateMustBeAfterStartDate'))
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }, [formData, t])

  const handleSubmit = React.useCallback(async () => {
    if (!validateForm()) return
    
    setSubmitting(true)
    try {
      const result = await onSave({
        ...formData
      })
      
      if (result.success) {
        onClose()
      } else {
        setFormErrors({ submit: String(t('reports.failedToCreateReport')) })
      }
    } catch (error) {
      console.error('Error creating report:', error)
      setFormErrors({ submit: String(t('reports.failedToCreateReport')) })
    } finally {
      setSubmitting(false)
    }
  }, [formData, validateForm, onSave, onClose, t])

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      inline={inline}
      size="2xl"
      title={String(t('reports.addNewReport'))}
      bodyClassName="space-y-6"
      closeDisabled={submitting}
      footer={
        <ModalShell.Footer>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('common.creating')}
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                {t('reports.createReport')}
              </>
            )}
          </Button>
        </ModalShell.Footer>
      }
    >
          {/* Student Selection */}
            <div>
              <h3 className="text-lg font-medium mb-3">{t('reports.selectStudent')}</h3>
              <StudentSelector
                students={students}
                selectedStudentId={formData.student_id}
                onStudentSelect={handleStudentSelect}
                loading={loading}
                error={formErrors.student_id}
              />
            </div>

            {/* Basic Report Info */}
            <div>
              <h3 className="text-lg font-medium mb-3">{t('reports.reportDetails')}</h3>
              <ReportBasicInfoForm
                formData={formData}
                onChange={handleFormChange}
                errors={formErrors}
                showStatus={true}
              />
            </div>

            {/* Feedback Options */}
            <div>
              <h3 className="text-lg font-medium mb-3">{t('reports.feedbackOptions')}</h3>
              <FeedbackSection
                aiFeedbackEnabled={formData.ai_feedback_enabled}
                onAiFeedbackToggle={(enabled) => handleFormChange('ai_feedback_enabled', enabled.toString())}
              />
            </div>

          {/* Submit Error */}
          {formErrors.submit && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">
              <p className="text-sm text-rose-800">{formErrors.submit}</p>
            </div>
          )}
    </ModalShell>
  )
})

AddReportModal.displayName = 'AddReportModal'

export { AddReportModal }