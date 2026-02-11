"use client"

import React, { useState, useRef } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/Progress'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { X, Upload, Database, Table, FileSpreadsheet, AlertTriangle, CheckCircle, Info } from 'lucide-react'
import { useDataImport, ImportFormat, ImportConfig, ImportResult } from '@/hooks/useDataImport'
import { useTranslation } from '@/hooks/useTranslation'

interface DataImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImportComplete?: (result: ImportResult<unknown>) => void
  title?: string
  acceptedFormats?: ImportFormat[]
}

export function DataImportModal({
  isOpen,
  onClose,
  onImportComplete,
  title,
  acceptedFormats = ['csv', 'json', 'xlsx']
}: DataImportModalProps) {
  const { t } = useTranslation()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [format, setFormat] = useState<ImportFormat>('csv')
  const [config, setConfig] = useState<ImportConfig>({
    delimiter: ',',
    hasHeaders: true,
    encoding: 'utf-8',
    validateData: true,
    maxRows: 10000
  })
  const [preview, setPreview] = useState<{ headers: string[]; preview: unknown[]; totalRows: number } | null>(null)
  const [importResult, setImportResult] = useState<ImportResult<unknown> | null>(null)
  const [currentStep, setCurrentStep] = useState<'upload' | 'configure' | 'preview' | 'result'>('upload')
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { importData, previewData, validateFile, isImporting, importProgress } = useDataImport()

  const formatOptions = [
    { value: 'csv', label: t('students.csvFormat'), icon: Table, description: t('students.csvDescription'), extensions: '.csv, .txt' },
    { value: 'json', label: t('students.jsonFormat'), icon: Database, description: t('students.jsonDescription'), extensions: '.json' },
    { value: 'xlsx', label: t('students.xlsxFormat'), icon: FileSpreadsheet, description: t('students.xlsxDescription'), extensions: '.xlsx, .xls' }
  ].filter(option => acceptedFormats.includes(option.value as ImportFormat))

  const handleFileSelect = async (file: File) => {
    try {
      // Auto-detect format from file extension
      const extension = file.name.split('.').pop()?.toLowerCase()
      if (extension === 'csv' || extension === 'txt') setFormat('csv')
      else if (extension === 'json') setFormat('json')
      else if (extension === 'xlsx' || extension === 'xls') setFormat('xlsx')

      validateFile(file, format)
      setSelectedFile(file)
      
      // Generate preview
      const previewResult = await previewData(file, format, config)
      setPreview(previewResult)
      setCurrentStep('configure')
    } catch (error) {
      console.error('File validation failed:', error)
      alert(error instanceof Error ? error.message : 'Invalid file')
    }
  }

  const handleImport = async () => {
    if (!selectedFile) return

    try {
      setCurrentStep('result')
      const result = await importData(selectedFile, format, config)
      setImportResult(result)
      
      if (onImportComplete && result.data.length > 0) {
        onImportComplete(result)
      }
    } catch (error) {
      console.error('Import failed:', error)
      setImportResult({
        data: [],
        errors: [{ row: 0, message: error instanceof Error ? error.message : 'Import failed' }],
        warnings: [],
        metadata: { totalRows: 0, validRows: 0, invalidRows: 1, skippedRows: 0 }
      })
    }
  }

  const updateConfig = (key: keyof ImportConfig, value: unknown) => {
    const newConfig = { ...config, [key]: value }
    setConfig(newConfig)
    
    // Regenerate preview with new config
    if (selectedFile && preview) {
      previewData(selectedFile, format, newConfig)
        .then(setPreview)
        .catch(console.error)
    }
  }

  const resetModal = () => {
    setSelectedFile(null)
    setPreview(null)
    setImportResult(null)
    setCurrentStep('upload')
    setConfig({
      delimiter: ',',
      hasHeaders: true,
      encoding: 'utf-8',
      validateData: true,
      maxRows: 10000
    })
  }

  const handleClose = () => {
    resetModal()
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="4xl">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-shrink-0 flex items-center justify-between p-6 pb-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Upload className="w-5 h-5" />
            {title || t('students.importData')}
          </h2>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleClose}
            className="p-1"
            disabled={isImporting}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          {/* Import Progress */}
          {isImporting && importProgress && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-900">
                  {importProgress.stage.charAt(0).toUpperCase() + importProgress.stage.slice(1)}
                </span>
                <span className="text-sm text-blue-700">
                  {importProgress.percentage}%
                </span>
              </div>
              <Progress value={importProgress.percentage} className="mb-2" />
              {importProgress.message && (
                <p className="text-sm text-blue-700">{importProgress.message}</p>
              )}
              {importProgress.processedRows && importProgress.totalRows && (
                <p className="text-xs text-blue-600">
                  {importProgress.processedRows.toLocaleString()} / {importProgress.totalRows.toLocaleString()} rows
                </p>
              )}
            </div>
          )}

          <Tabs value={currentStep} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="upload" disabled={isImporting}>1. {t('students.uploadFile')}</TabsTrigger>
              <TabsTrigger value="configure" disabled={!selectedFile || isImporting}>2. {t('students.configureImport')}</TabsTrigger>
              <TabsTrigger value="preview" disabled={!preview || isImporting}>3. {t('students.previewData')}</TabsTrigger>
              <TabsTrigger value="result" disabled={!importResult || isImporting}>4. {t('students.importResult')}</TabsTrigger>
            </TabsList>

            {/* Step 1: Upload */}
            <TabsContent value="upload" className="space-y-6">
              <div className="text-center">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-gray-400 transition-colors">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={formatOptions.map(f => f.extensions).join(',')}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileSelect(file)
                    }}
                    className="hidden"
                  />
                  
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-2">
                    {t('students.selectFile')}
                  </p>
                  <p className="text-sm text-gray-600 mb-4">
                    {t('students.dragDropFile')}
                  </p>
                  
                  <Button onClick={() => fileInputRef.current?.click()}>
                    {t('students.selectFile')}
                  </Button>
                </div>

                {/* Supported Formats */}
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">{t('students.supportedFormats')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {formatOptions.map(option => {
                      const Icon = option.icon
                      return (
                        <div key={option.value} className="p-3 border border-gray-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Icon className="w-4 h-4 text-gray-600" />
                            <span className="font-medium text-gray-900">{option.label}</span>
                          </div>
                          <p className="text-xs text-gray-600 mb-1">{option.description}</p>
                          <p className="text-xs text-gray-500">{option.extensions}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Step 2: Configure */}
            <TabsContent value="configure" className="space-y-6">
              {selectedFile && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-2">Selected File</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>Name: <span className="font-medium">{selectedFile.name}</span></div>
                    <div>Size: <span className="font-medium">{(selectedFile.size / 1024).toFixed(1)} KB</span></div>
                    <div>Type: <span className="font-medium">{format.toUpperCase()}</span></div>
                  </div>
                </div>
              )}

              {/* Configuration Options */}
              <div className="space-y-4">
                {/* Format-specific options */}
                {(format === 'csv' || format === 'xlsx') && (
                  <>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hasHeaders"
                        checked={config.hasHeaders}
                        onCheckedChange={(checked) => updateConfig('hasHeaders', checked)}
                      />
                      <Label htmlFor="hasHeaders" className="text-sm text-gray-700">
                        First row contains column headers
                      </Label>
                    </div>

                    {format === 'csv' && (
                      <>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">
                            CSV Delimiter
                          </Label>
                          <Select 
                            value={config.delimiter} 
                            onValueChange={(value) => updateConfig('delimiter', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value=",">Comma (,)</SelectItem>
                              <SelectItem value=";">Semicolon (;)</SelectItem>
                              <SelectItem value="\t">Tab</SelectItem>
                              <SelectItem value="|">Pipe (|)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">
                            Text Encoding
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
                              <SelectItem value="utf-8-bom">UTF-8 with BOM</SelectItem>
                              <SelectItem value="iso-8859-1">ISO-8859-1</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* Row limits */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="skipRows" className="text-sm font-medium text-gray-700">
                      Skip Rows
                    </Label>
                    <Input
                      id="skipRows"
                      type="number"
                      min="0"
                      value={config.skipRows || 0}
                      onChange={(e) => updateConfig('skipRows', parseInt(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxRows" className="text-sm font-medium text-gray-700">
                      Max Rows
                    </Label>
                    <Input
                      id="maxRows"
                      type="number"
                      min="1"
                      value={config.maxRows || ''}
                      onChange={(e) => updateConfig('maxRows', parseInt(e.target.value) || undefined)}
                      placeholder="No limit"
                    />
                  </div>
                </div>

                {/* Validation */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="validateData"
                    checked={config.validateData}
                    onCheckedChange={(checked) => updateConfig('validateData', checked)}
                  />
                  <Label htmlFor="validateData" className="text-sm text-gray-700">
                    Validate data during import
                  </Label>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep('upload')}>
                  Back
                </Button>
                <Button onClick={() => setCurrentStep('preview')} disabled={!preview}>
                  Preview Data
                </Button>
              </div>
            </TabsContent>

            {/* Step 3: Preview */}
            <TabsContent value="preview" className="space-y-6">
              {preview && (
                <>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">Preview Summary</h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>Total rows: <span className="font-medium">{preview.totalRows.toLocaleString()}</span></div>
                      <div>Columns: <span className="font-medium">{preview.headers.length}</span></div>
                      <div>Showing first 5 rows</div>
                    </div>
                  </div>

                  {/* Preview Table */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            {preview.headers.map((header, index) => (
                              <th key={index} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 last:border-r-0">
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {preview.preview.map((row, rowIndex) => (
                            <tr key={rowIndex}>
                              {preview.headers.map((header, colIndex) => (
                                <td key={colIndex} className="px-4 py-2 text-sm text-gray-900 border-r border-gray-200 last:border-r-0">
                                  {String((row as Record<string, unknown>)[header] || '')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setCurrentStep('configure')}>
                      Back
                    </Button>
                    <Button onClick={handleImport} disabled={isImporting}>
                      Import Data
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>

            {/* Step 4: Result */}
            <TabsContent value="result" className="space-y-6">
              {importResult && (
                <>
                  {/* Status Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="font-medium text-green-900">Imported</span>
                      </div>
                      <div className="text-2xl font-bold text-green-900">
                        {importResult.metadata.validRows.toLocaleString()}
                      </div>
                      <div className="text-sm text-green-700">
                        records successfully imported
                      </div>
                    </div>

                    {importResult.errors.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                          <span className="font-medium text-red-900">Errors</span>
                        </div>
                        <div className="text-2xl font-bold text-red-900">
                          {importResult.errors.length}
                        </div>
                        <div className="text-sm text-red-700">
                          records failed to import
                        </div>
                      </div>
                    )}

                    {importResult.warnings.length > 0 && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Info className="w-5 h-5 text-yellow-600" />
                          <span className="font-medium text-yellow-900">Warnings</span>
                        </div>
                        <div className="text-2xl font-bold text-yellow-900">
                          {importResult.warnings.length}
                        </div>
                        <div className="text-sm text-yellow-700">
                          records imported with warnings
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Errors and Warnings */}
                  {(importResult.errors.length > 0 || importResult.warnings.length > 0) && (
                    <div className="space-y-4">
                      {importResult.errors.length > 0 && (
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            <div className="space-y-2">
                              <div className="font-medium">Import Errors:</div>
                              <div className="max-h-32 overflow-y-auto space-y-1">
                                {importResult.errors.slice(0, 10).map((error, index) => (
                                  <div key={index} className="text-sm">
                                    Row {error.row}: {error.message}
                                  </div>
                                ))}
                                {importResult.errors.length > 10 && (
                                  <div className="text-sm text-gray-600">
                                    ... and {importResult.errors.length - 10} more errors
                                  </div>
                                )}
                              </div>
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}

                      {importResult.warnings.length > 0 && (
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertDescription>
                            <div className="space-y-2">
                              <div className="font-medium">Import Warnings:</div>
                              <div className="max-h-32 overflow-y-auto space-y-1">
                                {importResult.warnings.slice(0, 10).map((warning, index) => (
                                  <div key={index} className="text-sm">
                                    Row {warning.row}: {warning.message}
                                  </div>
                                ))}
                                {importResult.warnings.length > 10 && (
                                  <div className="text-sm text-gray-600">
                                    ... and {importResult.warnings.length - 10} more warnings
                                  </div>
                                )}
                              </div>
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={resetModal}>
                      Import Another File
                    </Button>
                    <Button onClick={handleClose}>
                      Done
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Modal>
  )
}