"use client"

import React, { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/Progress'
import { X, Download, FileText, Database, Table, FileSpreadsheet } from 'lucide-react'
import { useDataExport, ExportFormat, ExportConfig } from '@/hooks/useDataExport'
import { useTranslation } from '@/hooks/useTranslation'

interface DataExportModalProps<T> {
  isOpen: boolean
  onClose: () => void
  data: T[]
  title?: string
  defaultFilename?: string
}

export function DataExportModal<T extends Record<string, unknown>>({
  isOpen,
  onClose,
  data,
  title,
  defaultFilename = 'export'
}: DataExportModalProps<T>) {
  const { t } = useTranslation()
  const [format, setFormat] = useState<ExportFormat>('csv')
  const [config, setConfig] = useState<ExportConfig>({
    filename: defaultFilename,
    includeHeaders: true,
    dateFormat: 'ISO',
    delimiter: ',',
    encoding: 'utf-8',
    compression: false
  })

  const { exportData, isExporting, exportProgress } = useDataExport()

  const formatOptions = [
    { value: 'csv', label: t('students.csvFormat'), icon: Table, description: t('students.csvDescription') },
    { value: 'json', label: t('students.jsonFormat'), icon: Database, description: t('students.jsonDescription') },
    { value: 'xlsx', label: t('students.xlsxFormat'), icon: FileSpreadsheet, description: t('students.xlsxDescription') },
    { value: 'pdf', label: t('students.pdfFormat'), icon: FileText, description: t('students.pdfDescription') }
  ]

  const handleExport = async () => {
    try {
      await exportData(data, format, config)
      onClose()
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  const updateConfig = (key: keyof ExportConfig, value: unknown) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Download className="w-5 h-5" />
              {title || t('students.exportData')}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-1"
              disabled={isExporting}
            >
              <X className="w-4 h-4" />
            </Button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          {/* Export Progress */}
          {isExporting && exportProgress && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-900">
                  {exportProgress.stage.charAt(0).toUpperCase() + exportProgress.stage.slice(1)}
                </span>
                <span className="text-sm text-blue-700">
                  {exportProgress.percentage}%
                </span>
              </div>
              <Progress value={exportProgress.percentage} className="mb-2" />
              {exportProgress.message && (
                <p className="text-sm text-blue-700">{exportProgress.message}</p>
              )}
            </div>
          )}

          {/* Format Selection */}
          <div className="space-y-4 mb-6">
            <Label className="text-sm font-medium text-gray-700">{t('students.selectFormat')}</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {formatOptions.map(option => {
                const Icon = option.icon
                return (
                  <div
                    key={option.value}
                    onClick={() => setFormat(option.value as ExportFormat)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      format === option.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-6 h-6 ${
                        format === option.value ? 'text-blue-600' : 'text-gray-400'
                      }`} />
                      <div>
                        <div className={`font-medium ${
                          format === option.value ? 'text-blue-900' : 'text-gray-900'
                        }`}>
                          {option.label}
                        </div>
                        <div className="text-xs text-gray-600">
                          {option.description}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Configuration Options */}
          <div className="space-y-6">
            {/* Filename */}
            <div className="space-y-2">
              <Label htmlFor="filename" className="text-sm font-medium text-gray-700">
                {t('students.filename')}
              </Label>
              <Input
                id="filename"
                value={config.filename || ''}
                onChange={(e) => updateConfig('filename', e.target.value)}
                placeholder={String(t('students.filename'))}
                className="w-full"
              />
            </div>

            {/* Format-specific options */}
            {(format === 'csv' || format === 'xlsx') && (
              <>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeHeaders"
                    checked={config.includeHeaders}
                    onCheckedChange={(checked) => updateConfig('includeHeaders', checked)}
                  />
                  <Label htmlFor="includeHeaders" className="text-sm text-gray-700">
                    {t('students.includeHeaders')}
                  </Label>
                </div>

                {format === 'csv' && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        {t('students.delimiter')}
                      </Label>
                      <Select 
                        value={config.delimiter} 
                        onValueChange={(value) => updateConfig('delimiter', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value=",">{t('students.comma')} (,)</SelectItem>
                          <SelectItem value=";">{t('students.semicolon')} (;)</SelectItem>
                          <SelectItem value="\t">{t('students.tab')}</SelectItem>
                          <SelectItem value="|">{t('students.pipe')} (|)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        {t('students.textEncoding')}
                      </Label>
                      <Select 
                        value={config.encoding} 
                        onValueChange={(value) => updateConfig('encoding', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="utf-8">UTF-8</SelectItem>
                          <SelectItem value="utf-8-bom">UTF-8 with BOM (Excel compatible)</SelectItem>
                          <SelectItem value="iso-8859-1">ISO-8859-1</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </>
            )}

            {/* Date Format */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                {t('students.dateFormat')}
              </Label>
              <Select 
                value={config.dateFormat} 
                onValueChange={(value) => updateConfig('dateFormat', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ISO">{t('students.isoDateFormat')} (2024-01-01T00:00:00Z)</SelectItem>
                  <SelectItem value="US">{t('students.usDateFormat')} (1/1/2024)</SelectItem>
                  <SelectItem value="EU">{t('students.euDateFormat')} (01/01/2024)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Compression */}
            {format === 'json' && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="compression"
                  checked={config.compression}
                  onCheckedChange={(checked) => updateConfig('compression', checked)}
                />
                <Label htmlFor="compression" className="text-sm text-gray-700">
                  {t('students.compression')}
                </Label>
              </div>
            )}
          </div>

          {/* Export Summary */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">{t('students.exportData')}</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <div>{t('students.recordsToExport')}: <span className="font-medium">{data.length.toLocaleString()}</span></div>
              <div>{t('students.format')}: <span className="font-medium">{format.toUpperCase()}</span></div>
              <div>{t('students.estimatedSize')}: <span className="font-medium">{estimateFileSize(data, format)}</span></div>
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 flex items-center justify-between p-4 border-t border-gray-200">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isExporting}>
            {t('common.cancel')}
          </Button>
          <Button
            size="sm"
            onClick={handleExport}
            disabled={isExporting || data.length === 0}
            className="min-w-20"
          >
            {isExporting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {t('students.exportingData')}
              </div>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                {t('students.exportWithCount', { count: data.length.toLocaleString() })}
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// Utility function to estimate file size
function estimateFileSize(data: unknown[], format: ExportFormat): string {
  if (data.length === 0) return '0 B'

  const sampleRow = data[0]
  const avgRowSize = JSON.stringify(sampleRow).length

  let estimatedSize: number
  switch (format) {
    case 'json':
      estimatedSize = avgRowSize * data.length * 1.2 // JSON overhead
      break
    case 'csv':
      estimatedSize = avgRowSize * data.length * 0.7 // CSV is more compact
      break
    case 'xlsx':
      estimatedSize = avgRowSize * data.length * 0.5 // Excel compression
      break
    case 'pdf':
      estimatedSize = avgRowSize * data.length * 2 // PDF formatting overhead
      break
    default:
      estimatedSize = avgRowSize * data.length
  }

  // Format size
  if (estimatedSize < 1024) return `${Math.round(estimatedSize)} B`
  if (estimatedSize < 1024 * 1024) return `${Math.round(estimatedSize / 1024)} KB`
  return `${Math.round(estimatedSize / (1024 * 1024))} MB`
}