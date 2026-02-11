"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { X, Save, Eye } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { ReportBasicInfoForm } from './ReportBasicInfoForm'
import { FeedbackSection } from './FeedbackSection'
import { ReportData } from '@/hooks/useReports'

interface EditReportModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (reportId: string, updates: Partial<ReportData>) => Promise<{ success: boolean; error?: Error }>
  report: ReportData | null
}

interface FormData {
  report_name: string
  start_date: string
  end_date: string
  ai_feedback_enabled: boolean
  status: 'Draft' | 'Finished' | 'Approved' | 'Sent' | 'Viewed' | 'Error'
}

export const EditReportModal = React.memo<EditReportModalProps>(({
  isOpen,
  onClose,
  onSave,
  report
}) => {
  const { t } = useTranslation()
  
  const [formData, setFormData] = useState<FormData>({
    report_name: '',
    start_date: '',
    end_date: '',
    ai_feedback_enabled: true,
    status: 'Draft'
  })
  
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({})
  const [submitting, setSubmitting] = useState(false)

  // Initialize form data when report changes
  useEffect(() => {
    if (report) {
      setFormData({
        report_name: report.report_name || '',
        start_date: report.start_date || '',
        end_date: report.end_date || '',
        ai_feedback_enabled: report.ai_feedback_enabled ?? true,
        status: report.status || 'Draft'
      })
      setFormErrors({})
    }
  }, [report])

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormErrors({})
    }
  }, [isOpen])

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

  const validateForm = React.useCallback(() => {
    const errors: { [key: string]: string } = {}
    
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
    if (!report || !validateForm()) return
    
    setSubmitting(true)
    try {
      const result = await onSave(report.id, {
        ...formData
      })
      
      if (result.success) {
        onClose()
      } else {
        setFormErrors({ submit: String(t('reports.failedToUpdateReport')) })
      }
    } catch (error) {
      console.error('Error updating report:', error)
      setFormErrors({ submit: String(t('reports.failedToUpdateReport')) })
    } finally {
      setSubmitting(false)
    }
  }, [report, formData, validateForm, onSave, onClose, t])

  if (!report) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <div className="flex flex-col flex-1 min-h-0">
        {/* Header */}
        <div className="flex-shrink-0 flex justify-between items-center p-6 pb-4 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold">{t('reports.editReport')}</h2>
              <p className="text-sm text-gray-600 mt-1">
                {t('reports.student')}: {report.student_name}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
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
              
              {/* Manual feedback guidance when AI feedback is disabled */}
              {!formData.ai_feedback_enabled && (
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <Eye className="w-5 h-5 text-blue-600 mt-0.5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-blue-900 mb-1">
                        {t('reports.manualFeedbackGuidance')}
                      </h4>
                      <p className="text-sm text-blue-800 leading-relaxed">
                        {t('reports.manualFeedbackDescription')}
                      </p>
                    </div>
                  </div>
                </div>
              )}
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
                {t('common.saving')}
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {t('common.saveChanges')}
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
})

EditReportModal.displayName = 'EditReportModal'