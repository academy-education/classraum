"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  X,
  User,
  CheckCircle,
  Clock,
  XCircle,
  Save
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import type { Assignment, SubmissionGrade } from '@/hooks/useAssignmentData'

interface SubmissionsModalProps {
  isOpen: boolean
  onClose: () => void
  assignment: Assignment | null
  submissions: SubmissionGrade[]
  onUpdateGrade: (submissionId: string, grade: number, feedback?: string) => Promise<void>
  onBulkUpdate: (grades: Array<{ submissionId: string; grade: number; feedback?: string }>) => Promise<void>
  loading: boolean
}

export function SubmissionsModal({
  isOpen,
  onClose,
  assignment,
  submissions,
  onUpdateGrade,
  onBulkUpdate,
  loading
}: SubmissionsModalProps) {
  const { t } = useTranslation()
  const [grades, setGrades] = useState<{ [key: string]: { grade: string; feedback: string } }>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (isOpen && submissions) {
      // Initialize grades state with existing grades
      const initialGrades: { [key: string]: { grade: string; feedback: string } } = {}
      submissions.forEach(submission => {
        initialGrades[submission.id] = {
          grade: submission.grade?.toString() || '',
          feedback: submission.feedback || ''
        }
      })
      setGrades(initialGrades)
    }
  }, [isOpen, submissions])

  const handleGradeChange = (submissionId: string, field: 'grade' | 'feedback', value: string) => {
    setGrades(prev => ({
      ...prev,
      [submissionId]: {
        ...prev[submissionId],
        [field]: value
      }
    }))
  }

  const handleSingleUpdate = async (submissionId: string) => {
    const gradeData = grades[submissionId]
    if (!gradeData || gradeData.grade === '') return

    setIsSaving(true)
    try {
      await onUpdateGrade(submissionId, parseFloat(gradeData.grade), gradeData.feedback)
    } catch (error) {
      console.error('Error updating grade:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleBulkSave = async () => {
    const updates = Object.entries(grades)
      .filter(([, data]) => data.grade !== '')
      .map(([submissionId, data]) => ({
        submissionId,
        grade: parseFloat(data.grade),
        feedback: data.feedback
      }))

    if (updates.length === 0) return

    setIsSaving(true)
    try {
      await onBulkUpdate(updates)
    } catch (error) {
      console.error('Error bulk updating grades:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Clock className="w-4 h-4 text-yellow-600" />
      case 'graded':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'not_submitted':
        return <XCircle className="w-4 h-4 text-red-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-600" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'submitted':
        return t('assignments.status.submitted')
      case 'graded':
        return t('assignments.status.graded')
      case 'not_submitted':
        return t('assignments.status.notSubmitted')
      default:
        return t('assignments.status.unknown')
    }
  }

  if (!isOpen || !assignment) return null

  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg border border-border w-full max-w-4xl mx-4 h-screen shadow-lg flex flex-col">
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{assignment.title}</h2>
            <p className="text-sm text-gray-600">{t('assignments.submissions')}</p>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="p-1"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 pt-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">{t('common.loading')}</span>
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-8">
              <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {t('assignments.noSubmissions')}
              </h3>
              <p className="text-gray-600">
                {t('assignments.noSubmissionsDescription')}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {t('assignments.totalSubmissions', { 
                    submitted: submissions.filter(s => s.status !== 'not_submitted').length,
                    total: submissions.length 
                  })}
                </div>
                <Button
                  onClick={handleBulkSave}
                  disabled={isSaving}
                  className="min-w-24"
                >
                  {isSaving ? t('common.saving') : t('assignments.saveAllGrades')}
                </Button>
              </div>

              <div className="space-y-3">
                {submissions.map(submission => (
                  <div key={submission.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{submission.student_name}</div>
                          <div className="text-sm text-gray-500">{submission.student_email}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {getStatusIcon(submission.status)}
                        <span className="text-sm text-gray-600">{getStatusText(submission.status)}</span>
                      </div>
                    </div>

                    {submission.submitted_at && (
                      <div className="text-xs text-gray-500 mb-3">
                        {t('assignments.submittedAt')}: {new Date(submission.submitted_at).toLocaleString()}
                      </div>
                    )}

                    {submission.submission_content && (
                      <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm font-medium text-gray-700 mb-1">{t('assignments.submission')}:</div>
                        <div className="text-sm text-gray-700">{submission.submission_content}</div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs text-gray-600">{t('assignments.grade')}</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={grades[submission.id]?.grade || ''}
                          onChange={(e) => handleGradeChange(submission.id, 'grade', e.target.value)}
                          placeholder="0-100"
                          className="h-8 text-sm"
                        />
                      </div>
                      
                      <div className="md:col-span-2">
                        <Label className="text-xs text-gray-600">{t('assignments.feedback')}</Label>
                        <div className="flex gap-2">
                          <Input
                            type="text"
                            value={grades[submission.id]?.feedback || ''}
                            onChange={(e) => handleGradeChange(submission.id, 'feedback', e.target.value)}
                            placeholder={String(t('assignments.feedbackPlaceholder'))}
                            className="h-8 text-sm flex-1"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSingleUpdate(submission.id)}
                            disabled={isSaving || !grades[submission.id]?.grade}
                            className="h-8 px-2"
                          >
                            <Save className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between p-6 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            {submissions.length > 0 && (
              <>
                {t('assignments.averageGrade')}: {
                  submissions.filter(s => s.grade !== null && s.grade !== undefined).length > 0
                    ? (submissions.reduce((sum, s) => sum + (s.grade || 0), 0) / 
                       submissions.filter(s => s.grade !== null && s.grade !== undefined).length).toFixed(1)
                    : 'N/A'
                }
              </>
            )}
          </div>
          <Button variant="outline" onClick={onClose}>
            {t('common.close')}
          </Button>
        </div>
      </div>
    </div>
  )
}