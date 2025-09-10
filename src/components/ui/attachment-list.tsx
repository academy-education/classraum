'use client'

import { File, Image as ImageIcon, FileText, Download, ExternalLink } from 'lucide-react'
import { Button } from './button'
import { useTranslation } from '@/hooks/useTranslation'

interface Attachment {
  id?: string
  name: string
  url: string
  size: number
  type: string
}

interface AttachmentListProps {
  attachments: Attachment[]
  showDownload?: boolean
  showPreview?: boolean
  className?: string
  titleClassName?: string
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

export function AttachmentList({ 
  attachments, 
  showDownload = true,
  showPreview = true,
  className = '',
  titleClassName = 'text-sm font-medium text-gray-700'
}: AttachmentListProps) {
  const { t } = useTranslation()
  
  if (!attachments || attachments.length === 0) {
    return null
  }

  const downloadFile = (attachment: Attachment) => {
    const link = document.createElement('a')
    link.href = attachment.url
    link.download = attachment.name
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const openFile = (attachment: Attachment) => {
    window.open(attachment.url, '_blank', 'noopener,noreferrer')
  }

  const canOpenInBrowser = (type: string): boolean => {
    return type.startsWith('image/') || 
           type === 'application/pdf' || 
           type.startsWith('text/')
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <h4 className={titleClassName}>
        {t("assignments.attachments")} ({attachments.length})
      </h4>
      <div className="space-y-2">
        {attachments.map((attachment, index) => {
          const FileIcon = getFileIcon(attachment.type)
          const isImage = attachment.type.startsWith('image/')
          
          return (
            <div key={attachment.id || index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0">
                <FileIcon className="h-6 w-6 text-gray-500" />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {attachment.name}
                </p>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <span>{getFileTypeLabel(attachment.type)}</span>
                  <span>•</span>
                  <span>{formatFileSize(attachment.size)}</span>
                </div>
              </div>

              {/* Preview for images */}
              {showPreview && isImage && (
                <div className="flex-shrink-0">
                  <img
                    src={attachment.url}
                    alt={attachment.name}
                    className="h-12 w-12 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => openFile(attachment)}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                </div>
              )}

              {showDownload && (
                <div className="flex items-center space-x-1">
                  {canOpenInBrowser(attachment.type) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => openFile(attachment)}
                      className="p-1.5"
                      title="Open file"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => downloadFile(attachment)}
                    className="p-1.5"
                    title="Download file"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}