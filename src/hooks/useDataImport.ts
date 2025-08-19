import { useCallback, useState } from 'react'
import { useAnalytics } from './useAnalytics'

export type ImportFormat = 'json' | 'csv' | 'xlsx'

export interface ImportConfig {
  delimiter?: string
  hasHeaders?: boolean
  encoding?: string
  skipRows?: number
  maxRows?: number
  validateData?: boolean
  mapping?: Record<string, string> // Map file columns to data fields
}

export interface ImportResult<T> {
  data: T[]
  errors: ImportError[]
  warnings: ImportWarning[]
  metadata: {
    totalRows: number
    validRows: number
    invalidRows: number
    skippedRows: number
  }
}

export interface ImportError {
  row: number
  column?: string
  message: string
  value?: string | number | boolean
}

export interface ImportWarning {
  row: number
  column?: string
  message: string
  value?: string | number | boolean
}

export interface ImportProgress {
  percentage: number
  stage: string
  message?: string
  processedRows?: number
  totalRows?: number
}

export function useDataImport<T>() {
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null)
  const { trackEvent } = useAnalytics()

  const importData = useCallback(async (
    file: File,
    format: ImportFormat,
    config: ImportConfig = {}
  ): Promise<ImportResult<T>> => {
    setIsImporting(true)
    setImportProgress({ percentage: 0, stage: 'reading', message: 'Reading file...' })

    try {
      const startTime = Date.now()
      
      // Track import attempt
      trackEvent({
        event: 'data_import_started',
        category: 'data_management',
        action: 'import',
        label: format,
        properties: {
          fileSize: file.size,
          fileName: file.name,
          format,
          configType: typeof config === 'object' ? JSON.stringify(config) : String(config)
        }
      })

      // Read file content
      const content = await readFile(file)
      
      setImportProgress({ percentage: 25, stage: 'parsing', message: 'Parsing data...' })

      let result: ImportResult<T>

      switch (format) {
        case 'json':
          result = await parseJSON<T>(content, config)
          break
        case 'csv':
          result = await parseCSV<T>(content, config)
          break
        case 'xlsx':
          result = await parseXLSX<T>(content, config)
          break
        default:
          throw new Error(`Unsupported import format: ${format}`)
      }

      setImportProgress({ 
        percentage: 75, 
        stage: 'validating', 
        message: 'Validating data...',
        processedRows: result.data.length,
        totalRows: result.metadata.totalRows
      })

      // Additional validation if required
      if (config.validateData) {
        result = await validateImportedData(result, config)
      }

      const duration = Date.now() - startTime

      // Track successful import
      trackEvent({
        event: 'data_import_completed',
        category: 'data_management',
        action: 'import_success',
        label: format,
        value: duration,
        properties: {
          recordCount: result.data.length,
          errorCount: result.errors.length,
          warningCount: result.warnings.length,
          format,
          duration
        }
      })

      setImportProgress({ 
        percentage: 100, 
        stage: 'complete', 
        message: 'Import completed!',
        processedRows: result.data.length,
        totalRows: result.metadata.totalRows
      })

      return result

    } catch (error) {
      console.error('Import failed:', error)
      
      // Track import failure
      trackEvent({
        event: 'data_import_failed',
        category: 'data_management',
        action: 'import_error',
        label: format,
        properties: {
          error: error instanceof Error ? error.message : 'Unknown error',
          fileSize: file.size,
          format
        }
      })

      setImportProgress({ percentage: 0, stage: 'error', message: 'Import failed' })
      throw error
    } finally {
      setIsImporting(false)
      setTimeout(() => setImportProgress(null), 3000)
    }
  }, [trackEvent])

  const previewData = useCallback(async (
    file: File,
    format: ImportFormat,
    config: ImportConfig = {}
  ): Promise<{ headers: string[]; preview: Record<string, unknown>[]; totalRows: number }> => {
    const content = await readFile(file)
    
    switch (format) {
      case 'csv':
        return previewCSV(content, config)
      case 'xlsx':
        return previewXLSX(content, config)
      case 'json':
        return previewJSON(content, config)
      default:
        throw new Error(`Preview not supported for format: ${format}`)
    }
  }, [])

  const validateFile = useCallback((file: File, format: ImportFormat): boolean => {
    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('File size too large. Maximum size is 10MB.')
    }

    // Check file extension
    const extension = file.name.split('.').pop()?.toLowerCase()
    const validExtensions: Record<ImportFormat, string[]> = {
      json: ['json'],
      csv: ['csv', 'txt'],
      xlsx: ['xlsx', 'xls']
    }

    if (!extension || !validExtensions[format].includes(extension)) {
      throw new Error(`Invalid file format. Expected: ${validExtensions[format].join(', ')}`)
    }

    return true
  }, [])

  return {
    importData,
    previewData,
    validateFile,
    isImporting,
    importProgress
  }
}

// File reading utility
function readFile(file: File): Promise<string | ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (event) => {
      resolve(event.target?.result || '')
    }
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    // Read as text for JSON and CSV, as array buffer for XLSX
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (extension === 'xlsx' || extension === 'xls') {
      reader.readAsArrayBuffer(file)
    } else {
      reader.readAsText(file)
    }
  })
}

// JSON Parser
async function parseJSON<T>(content: string | ArrayBuffer, config: ImportConfig): Promise<ImportResult<T>> {
  const text = content instanceof ArrayBuffer ? new TextDecoder().decode(content) : content
  const errors: ImportError[] = []
  let data: T[] = []

  try {
    const parsed = JSON.parse(text)
    
    // Handle different JSON structures
    if (Array.isArray(parsed)) {
      data = parsed
    } else if (parsed.data && Array.isArray(parsed.data)) {
      data = parsed.data
    } else {
      data = [parsed]
    }

    // Apply row limits
    if (config.skipRows) {
      data = data.slice(config.skipRows)
    }
    if (config.maxRows) {
      data = data.slice(0, config.maxRows)
    }

  } catch (error) {
    errors.push({
      row: 0,
      message: `Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`
    })
  }

  return {
    data,
    errors,
    warnings: [],
    metadata: {
      totalRows: data.length,
      validRows: data.length,
      invalidRows: errors.length,
      skippedRows: config.skipRows || 0
    }
  }
}

// CSV Parser
async function parseCSV<T>(content: string | ArrayBuffer, config: ImportConfig): Promise<ImportResult<T>> {
  const text = content instanceof ArrayBuffer ? new TextDecoder().decode(content) : content
  const delimiter = config.delimiter || ','
  const hasHeaders = config.hasHeaders !== false
  
  const lines = text.split('\n').filter(line => line.trim().length > 0)
  const errors: ImportError[] = []
  const warnings: ImportWarning[] = []
  const data: T[] = []

  if (lines.length === 0) {
    return {
      data: [],
      errors: [{ row: 0, message: 'File is empty' }],
      warnings: [],
      metadata: { totalRows: 0, validRows: 0, invalidRows: 0, skippedRows: 0 }
    }
  }

  // Parse headers
  const headerLine = lines[0]
  const headers = parseCSVLine(headerLine, delimiter)
  const dataStartIndex = hasHeaders ? 1 : 0

  // Skip rows if configured
  const startIndex = dataStartIndex + (config.skipRows || 0)
  const endIndex = config.maxRows ? Math.min(lines.length, startIndex + config.maxRows) : lines.length

  for (let i = startIndex; i < endIndex; i++) {
    try {
      const line = lines[i]
      const values = parseCSVLine(line, delimiter)
      
      if (values.length !== headers.length) {
        warnings.push({
          row: i + 1,
          message: `Column count mismatch. Expected ${headers.length}, got ${values.length}`
        })
      }

      const rowData: Record<string, unknown> = {}
      headers.forEach((header, index) => {
        const mappedHeader = config.mapping?.[header] || header
        rowData[mappedHeader] = values[index] || null
      })

      data.push(rowData as T)
    } catch (error) {
      errors.push({
        row: i + 1,
        message: `Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  }

  return {
    data,
    errors,
    warnings,
    metadata: {
      totalRows: lines.length - dataStartIndex,
      validRows: data.length,
      invalidRows: errors.length,
      skippedRows: (config.skipRows || 0)
    }
  }
}

// XLSX Parser (simplified)
async function parseXLSX<T>(content: string | ArrayBuffer, config: ImportConfig): Promise<ImportResult<T>> {
  // This is a placeholder implementation
  // In a real app, you'd use a library like xlsx or exceljs
  
  throw new Error('XLSX parsing not implemented. Please use CSV or JSON format.')
}

// CSV line parser (handles quoted values)
function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"'
        i++ // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes
      }
    } else if (char === delimiter && !inQuotes) {
      // Field separator
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  result.push(current.trim())
  return result
}

// Preview functions
async function previewCSV(content: string | ArrayBuffer, config: ImportConfig) {
  const text = content instanceof ArrayBuffer ? new TextDecoder().decode(content) : content
  const lines = text.split('\n').filter(line => line.trim().length > 0)
  const delimiter = config.delimiter || ','
  
  const headers = parseCSVLine(lines[0], delimiter)
  const preview = lines.slice(1, 6).map(line => {
    const values = parseCSVLine(line, delimiter)
    const row: Record<string, unknown> = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    return row
  })
  
  return {
    headers,
    preview,
    totalRows: lines.length - 1
  }
}

async function previewJSON(content: string | ArrayBuffer, config: ImportConfig) {
  const text = content instanceof ArrayBuffer ? new TextDecoder().decode(content) : content
  const parsed = JSON.parse(text)
  
  const data = Array.isArray(parsed) ? parsed : parsed.data || [parsed]
  const headers = data.length > 0 ? Object.keys(data[0]) : []
  
  return {
    headers,
    preview: data.slice(0, 5),
    totalRows: data.length
  }
}

async function previewXLSX(content: string | ArrayBuffer, config: ImportConfig): Promise<{ headers: string[]; preview: Record<string, unknown>[]; totalRows: number; }> {
  // Return empty preview for now - XLSX not implemented
  return {
    headers: [],
    preview: [],
    totalRows: 0
  }
}

// Data validation
async function validateImportedData<T>(
  result: ImportResult<T>, 
  config: ImportConfig
): Promise<ImportResult<T>> {
  // This is where you'd add custom validation logic
  // For now, we'll just return the result as-is
  return result
}