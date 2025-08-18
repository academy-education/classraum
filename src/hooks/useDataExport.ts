import { useCallback, useState } from 'react'
import { useAnalytics } from './useAnalytics'

export type ExportFormat = 'json' | 'csv' | 'xlsx' | 'pdf'

export interface ExportConfig {
  filename?: string
  includeHeaders?: boolean
  dateFormat?: string
  delimiter?: string
  encoding?: string
  compression?: boolean
}

export interface ExportProgress {
  percentage: number
  stage: string
  message?: string
}

export function useDataExport() {
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null)
  const { trackEvent } = useAnalytics()

  const exportData = useCallback(async <T>(
    data: T[],
    format: ExportFormat,
    config: ExportConfig = {}
  ): Promise<void> => {
    setIsExporting(true)
    setExportProgress({ percentage: 0, stage: 'preparing', message: 'Preparing export...' })

    try {
      const startTime = Date.now()
      
      // Track export attempt
      trackEvent({
        event: 'data_export_started',
        category: 'data_management',
        action: 'export',
        label: format,
        properties: {
          recordCount: data.length,
          format,
          config
        }
      })

      let blob: Blob
      let mimeType: string
      let fileExtension: string

      setExportProgress({ percentage: 25, stage: 'processing', message: 'Processing data...' })

      switch (format) {
        case 'json':
          blob = await exportAsJSON(data, config)
          mimeType = 'application/json'
          fileExtension = 'json'
          break
        case 'csv':
          blob = await exportAsCSV(data, config)
          mimeType = 'text/csv'
          fileExtension = 'csv'
          break
        case 'xlsx':
          blob = await exportAsXLSX(data, config)
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          fileExtension = 'xlsx'
          break
        case 'pdf':
          blob = await exportAsPDF(data, config)
          mimeType = 'application/pdf'
          fileExtension = 'pdf'
          break
        default:
          throw new Error(`Unsupported export format: ${format}`)
      }

      setExportProgress({ percentage: 75, stage: 'generating', message: 'Generating file...' })

      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0]
      const filename = config.filename || `export_${timestamp}.${fileExtension}`

      setExportProgress({ percentage: 90, stage: 'downloading', message: 'Starting download...' })

      // Download file
      await downloadBlob(blob, filename, mimeType)

      const duration = Date.now() - startTime

      // Track successful export
      trackEvent({
        event: 'data_export_completed',
        category: 'data_management',
        action: 'export_success',
        label: format,
        value: duration,
        properties: {
          recordCount: data.length,
          format,
          duration,
          fileSize: blob.size
        }
      })

      setExportProgress({ percentage: 100, stage: 'complete', message: 'Export completed!' })

    } catch (error) {
      console.error('Export failed:', error)
      
      // Track export failure
      trackEvent({
        event: 'data_export_failed',
        category: 'data_management',
        action: 'export_error',
        label: format,
        properties: {
          error: error instanceof Error ? error.message : 'Unknown error',
          recordCount: data.length,
          format
        }
      })

      setExportProgress({ percentage: 0, stage: 'error', message: 'Export failed' })
      throw error
    } finally {
      setIsExporting(false)
      setTimeout(() => setExportProgress(null), 3000)
    }
  }, [trackEvent])

  const exportMultipleFormats = useCallback(async <T>(
    data: T[],
    formats: ExportFormat[],
    config: ExportConfig = {}
  ) => {
    for (const format of formats) {
      await exportData(data, format, {
        ...config,
        filename: config.filename?.replace(/\.\w+$/, '') + `_${format}`
      })
    }
  }, [exportData])

  return {
    exportData,
    exportMultipleFormats,
    isExporting,
    exportProgress
  }
}

// JSON Export
async function exportAsJSON<T>(data: T[], config: ExportConfig): Promise<Blob> {
  const jsonData = {
    metadata: {
      exportDate: new Date().toISOString(),
      recordCount: data.length,
      version: '1.0'
    },
    data: data
  }

  const content = JSON.stringify(jsonData, null, 2)
  
  if (config.compression) {
    // In a real implementation, you'd use a compression library like pako
    // For now, we'll just return the uncompressed data
    return new Blob([content], { type: 'application/json' })
  }

  return new Blob([content], { type: 'application/json' })
}

// CSV Export
async function exportAsCSV<T>(data: T[], config: ExportConfig): Promise<Blob> {
  if (data.length === 0) {
    return new Blob([''], { type: 'text/csv' })
  }

  const delimiter = config.delimiter || ','
  const headers = Object.keys(data[0] as any)
  
  let csvContent = ''

  // Add headers if requested
  if (config.includeHeaders !== false) {
    csvContent += headers.join(delimiter) + '\n'
  }

  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = (row as any)[header]
      
      if (value == null) {
        return ''
      }
      
      // Format dates
      if (value instanceof Date) {
        return config.dateFormat 
          ? formatDate(value, config.dateFormat)
          : value.toISOString()
      }
      
      // Escape and quote strings
      const stringValue = String(value)
      if (stringValue.includes(delimiter) || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`
      }
      
      return stringValue
    })
    
    csvContent += values.join(delimiter) + '\n'
  }

  // Handle encoding
  const encoding = config.encoding || 'utf-8'
  if (encoding === 'utf-8-bom') {
    // Add BOM for Excel compatibility
    const bom = '\uFEFF'
    csvContent = bom + csvContent
  }

  return new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
}

// XLSX Export (simplified - in production you'd use a library like SheetJS)
async function exportAsXLSX<T>(data: T[], config: ExportConfig): Promise<Blob> {
  // This is a placeholder implementation
  // In a real app, you'd use a library like xlsx or exceljs
  
  // For now, we'll create a simple XML-based Excel file
  const headers = data.length > 0 ? Object.keys(data[0] as any) : []
  
  let xml = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Sheet1">
    <Table>`

  // Add header row
  if (config.includeHeaders !== false && headers.length > 0) {
    xml += '<Row>'
    headers.forEach(header => {
      xml += `<Cell><Data ss:Type="String">${escapeXml(header)}</Data></Cell>`
    })
    xml += '</Row>'
  }

  // Add data rows
  data.forEach(row => {
    xml += '<Row>'
    headers.forEach(header => {
      const value = (row as any)[header]
      const cellType = typeof value === 'number' ? 'Number' : 'String'
      const cellValue = value == null ? '' : String(value)
      xml += `<Cell><Data ss:Type="${cellType}">${escapeXml(cellValue)}</Data></Cell>`
    })
    xml += '</Row>'
  })

  xml += `
    </Table>
  </Worksheet>
</Workbook>`

  return new Blob([xml], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  })
}

// PDF Export (simplified - in production you'd use a library like jsPDF)
async function exportAsPDF<T>(data: T[], config: ExportConfig): Promise<Blob> {
  // This is a placeholder implementation
  // In a real app, you'd use a library like jsPDF, Puppeteer, or similar
  
  const headers = data.length > 0 ? Object.keys(data[0] as any) : []
  
  // Create a simple HTML table and convert to PDF
  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Data Export</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; font-weight: bold; }
    .header { text-align: center; margin-bottom: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Data Export</h1>
    <p>Generated on ${new Date().toLocaleString()}</p>
    <p>Total Records: ${data.length}</p>
  </div>
  <table>
`

  // Add headers
  if (config.includeHeaders !== false && headers.length > 0) {
    html += '<thead><tr>'
    headers.forEach(header => {
      html += `<th>${escapeHtml(header)}</th>`
    })
    html += '</tr></thead>'
  }

  // Add data
  html += '<tbody>'
  data.forEach(row => {
    html += '<tr>'
    headers.forEach(header => {
      const value = (row as any)[header]
      const cellValue = value == null ? '' : String(value)
      html += `<td>${escapeHtml(cellValue)}</td>`
    })
    html += '</tr>'
  })

  html += `
  </tbody>
  </table>
</body>
</html>`

  // In a real implementation, you'd convert this HTML to PDF
  // For now, we'll just return the HTML as a blob
  return new Blob([html], { type: 'text/html' })
}

// Utility functions
function downloadBlob(blob: Blob, filename: string, mimeType: string): Promise<void> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.style.display = 'none'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // Clean up the URL object
    setTimeout(() => {
      URL.revokeObjectURL(url)
      resolve()
    }, 100)
  })
}

function formatDate(date: Date, format: string): string {
  // Simple date formatting - in production you'd use a library like date-fns
  switch (format) {
    case 'ISO':
      return date.toISOString()
    case 'US':
      return date.toLocaleDateString('en-US')
    case 'EU':
      return date.toLocaleDateString('en-GB')
    default:
      return date.toLocaleDateString()
  }
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}