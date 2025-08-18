"use client"

import React from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTranslation } from '@/hooks/useTranslation'
import { DatePicker } from './DatePicker'
import { StatusFilter } from './StatusFilter'

interface ReportFormData {
  report_name: string
  start_date: string
  end_date: string
  status: 'Draft' | 'Finished' | 'Approved' | 'Sent' | 'Viewed' | 'Error'
}

interface ReportBasicInfoFormProps {
  formData: ReportFormData
  onChange: (field: string, value: string) => void
  errors: { [key: string]: string }
  activeDatePicker: string | null
  setActiveDatePicker: (id: string | null) => void
  showStatus?: boolean
}

export const ReportBasicInfoForm = React.memo<ReportBasicInfoFormProps>(({
  formData,
  onChange,
  errors,
  activeDatePicker,
  setActiveDatePicker,
  showStatus = true
}) => {
  const { t } = useTranslation()

  const handleInputChange = React.useCallback((field: string) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    onChange(field, e.target.value)
  }, [onChange])

  const handleDateChange = React.useCallback((field: string) => (value: string) => {
    onChange(field, value)
  }, [onChange])

  const handleStatusChange = React.useCallback((value: string) => {
    onChange('status', value)
  }, [onChange])

  return (
    <div className="space-y-4">
      {/* Report Name */}
      <div>
        <Label htmlFor="report_name" className="text-sm font-medium">
          {t('reports.reportTitle')} <span className="text-red-500">*</span>
        </Label>
        <Input
          id="report_name"
          value={formData.report_name}
          onChange={handleInputChange('report_name')}
          placeholder={t('reports.enterReportTitle')}
          className={errors.report_name ? 'border-red-500 focus:border-red-500' : ''}
        />
        {errors.report_name && (
          <p className="mt-1 text-sm text-red-600">{errors.report_name}</p>
        )}
      </div>

      {/* Date Range */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Start Date */}
        <div>
          <Label className="text-sm font-medium">
            {t('reports.startDate')} <span className="text-red-500">*</span>
          </Label>
          <DatePicker
            value={formData.start_date}
            onChange={handleDateChange('start_date')}
            fieldId="start_date"
            placeholder={t('reports.selectStartDate')}
            activeDatePicker={activeDatePicker}
            setActiveDatePicker={setActiveDatePicker}
          />
          {errors.start_date && (
            <p className="mt-1 text-sm text-red-600">{errors.start_date}</p>
          )}
        </div>

        {/* End Date */}
        <div>
          <Label className="text-sm font-medium">
            {t('reports.endDate')} <span className="text-red-500">*</span>
          </Label>
          <DatePicker
            value={formData.end_date}
            onChange={handleDateChange('end_date')}
            fieldId="end_date"
            placeholder={t('reports.selectEndDate')}
            activeDatePicker={activeDatePicker}
            setActiveDatePicker={setActiveDatePicker}
          />
          {errors.end_date && (
            <p className="mt-1 text-sm text-red-600">{errors.end_date}</p>
          )}
        </div>
      </div>

      {/* Status */}
      {showStatus && (
        <div>
          <Label className="text-sm font-medium">
            {t('reports.status')}
          </Label>
          <StatusFilter
            value={formData.status}
            onChange={handleStatusChange}
            className="w-full"
          />
        </div>
      )}
    </div>
  )
})