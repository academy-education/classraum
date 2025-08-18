"use client"

import React from 'react'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Bot, FileText } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

interface FeedbackSectionProps {
  aiFeedbackEnabled: boolean
  manualFeedback: string
  onAiFeedbackToggle: (enabled: boolean) => void
  onManualFeedbackChange: (feedback: string) => void
  showManualFeedback?: boolean
}

export const FeedbackSection = React.memo<FeedbackSectionProps>(({
  aiFeedbackEnabled,
  manualFeedback,
  onAiFeedbackToggle,
  onManualFeedbackChange,
  showManualFeedback = true
}) => {
  const { t } = useTranslation()

  const handleAiFeedbackToggle = React.useCallback(() => {
    onAiFeedbackToggle(!aiFeedbackEnabled)
  }, [aiFeedbackEnabled, onAiFeedbackToggle])

  const handleManualFeedbackChange = React.useCallback((
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    onManualFeedbackChange(e.target.value)
  }, [onManualFeedbackChange])

  return (
    <div className="space-y-4">
      {/* AI Feedback Toggle */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="ai_feedback"
            checked={aiFeedbackEnabled}
            onChange={handleAiFeedbackToggle}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Bot className="w-5 h-5 text-blue-600" />
          <Label htmlFor="ai_feedback" className="text-sm font-medium cursor-pointer">
            {t('reports.enableAiFeedback')}
          </Label>
        </div>
      </div>

      {/* AI Feedback Description */}
      {aiFeedbackEnabled && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <Bot className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">{t('reports.aiFeedbackEnabled')}</p>
              <p className="mt-1">{t('reports.aiFeedbackDescription')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Manual Feedback */}
      {showManualFeedback && (
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <FileText className="w-4 h-4 text-gray-600" />
            <Label className="text-sm font-medium">
              {t('reports.manualFeedback')}
            </Label>
          </div>
          <Textarea
            value={manualFeedback}
            onChange={handleManualFeedbackChange}
            placeholder={t('reports.enterManualFeedback')}
            rows={4}
            className="resize-none"
          />
          <p className="mt-1 text-xs text-gray-500">
            {t('reports.manualFeedbackDescription')}
          </p>
        </div>
      )}

      {/* Feedback Options Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <h4 className="text-sm font-medium text-gray-900 mb-2">
          {t('reports.feedbackOptions')}
        </h4>
        <ul className="text-xs text-gray-600 space-y-1">
          <li className="flex items-start space-x-2">
            <Bot className="w-3 h-3 mt-0.5 text-blue-600 flex-shrink-0" />
            <span>{t('reports.aiFeedbackOptionDescription')}</span>
          </li>
          <li className="flex items-start space-x-2">
            <FileText className="w-3 h-3 mt-0.5 text-gray-600 flex-shrink-0" />
            <span>{t('reports.manualFeedbackOptionDescription')}</span>
          </li>
        </ul>
      </div>
    </div>
  )
})