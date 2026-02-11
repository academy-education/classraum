"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { X, Plus } from 'lucide-react'
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
  loading = false
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
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <div className="flex flex-col flex-1 min-h-0">
        {/* Header */}
        <div className="flex-shrink-0 flex justify-between items-center p-6 pb-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold">{t('reports.addNewReport')}</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
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
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{formErrors.submit}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex justify-end gap-3 p-6 pt-4 border-t border-gray-200">
            <Button variant="outline" onClick={onClose} disabled={submitting}>
              {t('common.cancel')}
            </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {t('common.creating')}
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                {t('reports.createReport')}
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
})

AddReportModal.displayName = 'AddReportModal'

export { AddReportModal }