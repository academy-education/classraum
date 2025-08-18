"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X, Save } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { ReportBasicInfoForm } from './ReportBasicInfoForm'
import { FeedbackSection } from './FeedbackSection'
import { ReportData } from '@/hooks/useReports'

interface EditReportModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (reportId: string, updates: Partial<ReportData>) => Promise<{ success: boolean; error?: any }>
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
  const [activeDatePicker, setActiveDatePicker] = useState<string | null>(null)
  const [manualFeedback, setManualFeedback] = useState('')

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
      setManualFeedback('') // Could load from report if stored
      setFormErrors({})
    }
  }, [report])

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormErrors({})
      setActiveDatePicker(null)
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
      errors.report_name = t('reports.reportTitleRequired')
    }
    if (!formData.start_date) {
      errors.start_date = t('reports.startDateRequired')
    }
    if (!formData.end_date) {
      errors.end_date = t('reports.endDateRequired')
    }
    if (formData.start_date && formData.end_date && new Date(formData.start_date) >= new Date(formData.end_date)) {
      errors.end_date = t('reports.endDateMustBeAfterStartDate')
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }, [formData, t])

  const handleSubmit = React.useCallback(async () => {
    if (!report || !validateForm()) return
    
    setSubmitting(true)
    try {
      const result = await onSave(report.id, {
        ...formData,
        manual_feedback: manualFeedback
      })
      
      if (result.success) {
        onClose()
      } else {
        setFormErrors({ submit: t('reports.failedToUpdateReport') })
      }
    } catch (error) {
      console.error('Error updating report:', error)
      setFormErrors({ submit: t('reports.failedToUpdateReport') })
    } finally {
      setSubmitting(false)
    }
  }, [report, formData, manualFeedback, validateForm, onSave, onClose, t])

  if (!isOpen || !report) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
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

          <div className="space-y-6">
            {/* Basic Report Info */}
            <div>
              <h3 className="text-lg font-medium mb-3">{t('reports.reportDetails')}</h3>
              <ReportBasicInfoForm
                formData={formData}
                onChange={handleFormChange}
                errors={formErrors}
                activeDatePicker={activeDatePicker}
                setActiveDatePicker={setActiveDatePicker}
                showStatus={true}
              />
            </div>

            {/* Feedback Options */}
            <div>
              <h3 className="text-lg font-medium mb-3">{t('reports.feedbackOptions')}</h3>
              <FeedbackSection
                aiFeedbackEnabled={formData.ai_feedback_enabled}
                manualFeedback={manualFeedback}
                onAiFeedbackToggle={(enabled) => handleFormChange('ai_feedback_enabled', enabled.toString())}
                onManualFeedbackChange={setManualFeedback}
                showManualFeedback={true}
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
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
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
      </div>
    </div>
  )
})