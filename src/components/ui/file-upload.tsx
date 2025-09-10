'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, X, File, Image as ImageIcon, FileText, Download, Trash2 } from 'lucide-react'
import { Button } from './button'
import { useFileUpload, type FileUploadResult } from '@/hooks/useFileUpload'
import { useTranslation } from '@/hooks/useTranslation'

interface AttachmentFile {
  id?: string
  name: string
  url: string
  size: number
  type: string
  uploaded?: boolean
}

interface FileUploadProps {
  files: AttachmentFile[]
  onChange: (files: AttachmentFile[]) => void
  bucket?: string
  maxFiles?: number
  showPreview?: boolean
  className?: string
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return ImageIcon
  if (type.includes('pdf') || type.includes('document') || type.includes('text')) return FileText
  return File
}

const getFileTypeLabel = (type: string): string => {
  const typeMap: Record<string, string> = {
    'application/pdf': 'PDF',
    'application/msword': 'Word',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
    'application/vnd.ms-excel': 'Excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
    'application/vnd.ms-powerpoint': 'PowerPoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint',
    'image/jpeg': 'JPEG',
    'image/png': 'PNG',
    'image/gif': 'GIF',
    'image/webp': 'WebP',
    'text/plain': 'Text',
    'text/csv': 'CSV'
  }
  return typeMap[type] || 'File'
}

export function FileUpload({ 
  files, 
  onChange, 
  bucket = 'assignment-attachments',
  maxFiles = 5,
  showPreview = true,
  className = ''
}: FileUploadProps) {
  const { t } = useTranslation()
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { uploading, progress, uploadFile, deleteFile, validateFile } = useFileUpload()

  const handleFiles = useCallback(async (fileList: FileList) => {
    const newFiles = Array.from(fileList)
    
    // Check file limit
    if (files.length + newFiles.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`)
      return
    }

    const uploadPromises = newFiles.map(async (file) => {
      // Validate file
      const validation = validateFile(file)
      if (!validation.valid) {
        alert(`${file.name}: ${validation.error}`)
        return null
      }

      // Upload file
      const result: FileUploadResult = await uploadFile(file, bucket)
      
      if (!result.success) {
        alert(`Failed to upload ${file.name}: ${result.error?.message}`)
        return null
      }

      return {
        name: result.fileName!,
        url: result.fileUrl!,
        size: result.fileSize!,
        type: result.fileType!,
        uploaded: true
      }
    })

    const results = await Promise.all(uploadPromises)
    const validFiles = results.filter(file => file !== null && file.uploaded !== false) as AttachmentFile[]
    
    if (validFiles.length > 0) {
      onChange([...files, ...validFiles])
    }
  }, [files, onChange, maxFiles, bucket, uploadFile, validateFile])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files)
    }
  }, [handleFiles])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files)
    }
  }, [handleFiles])

  const removeFile = useCallback(async (index: number) => {
    const file = files[index]
    
    // Delete from storage if uploaded
    if (file.uploaded && file.url) {
      const result = await deleteFile(file.url, bucket)
      if (!result.success) {
        console.error('Failed to delete file from storage:', result.error)
      }
    }
    
    const newFiles = files.filter((_, i) => i !== index)
    onChange(newFiles)
  }, [files, onChange, deleteFile, bucket])

  const downloadFile = useCallback((file: AttachmentFile) => {
    const link = document.createElement('a')
    link.href = file.url
    link.download = file.name
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [])

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
          ${isDragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${uploading ? 'pointer-events-none opacity-50' : ''}
        `}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
        <p className="text-sm text-gray-600 mb-1">
          {t("assignments.dropFilesHere")}
        </p>
        <p className="text-xs text-gray-400">
          {t("assignments.maxFilesLimit", { maxFiles: maxFiles.toString() })}
        </p>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.txt,.csv"
          onChange={handleFileSelect}
          disabled={uploading}
        />
      </div>

      {/* Upload Progress */}
      {progress && (
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="flex items-center justify-between text-sm text-blue-700 mb-2">
            <span>{t("assignments.uploadingFile", { fileName: progress.fileName })}</span>
            <span>{progress.progress}%</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">
            {t("assignments.attachedFiles")} ({files.length}/{maxFiles})
          </h4>
          <div className="space-y-2">
            {files.map((file, index) => {
              const FileIcon = getFileIcon(file.type)
              const isImage = file.type.startsWith('image/')
              
              return (
                <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0">
                    <FileIcon className="h-6 w-6 text-gray-500" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <span>{getFileTypeLabel(file.type)}</span>
                      <span>•</span>
                      <span>{formatFileSize(file.size)}</span>
                    </div>
                  </div>

                  {/* Preview for images */}
                  {showPreview && isImage && (
                    <div className="flex-shrink-0">
                      <img
                        src={file.url}
                        alt={file.name}
                        className="h-12 w-12 object-cover rounded border"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    </div>
                  )}

                  <div className="flex items-center space-x-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadFile(file)}
                      className="p-1.5"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}