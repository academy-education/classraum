"use client"

import React, { useEffect, useRef, useState } from 'react'
import { X, Download, ZoomIn, ZoomOut, RotateCw, ExternalLink } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

interface Attachment {
  id: string
  assignment_id: string
  file_name: string
  file_url: string
  file_size: number
  file_type: string
  uploaded_by: string
  created_at: string
}

interface FileViewerBottomSheetProps {
  isOpen: boolean
  onClose: () => void
  attachment: Attachment | null
}

export function FileViewerBottomSheet({
  isOpen,
  onClose,
  attachment
}: FileViewerBottomSheetProps) {
  const { t } = useTranslation()
  const bottomSheetRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [imageScale, setImageScale] = useState(1)
  const [imageRotation, setImageRotation] = useState(0)

  // Handle body scroll prevention when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Reset states when attachment changes
  useEffect(() => {
    if (attachment) {
      setIsLoading(true)
      setError(null)
      setImageScale(1)
      setImageRotation(0)
    }
  }, [attachment])

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  // Handle swipe down gesture only on header area
  const handleHeaderTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    const startY = touch.clientY
    const startTime = Date.now()

    const handleTouchMove = (moveEvent: TouchEvent) => {
      const currentTouch = moveEvent.touches[0]
      const deltaY = currentTouch.clientY - startY
      const deltaTime = Date.now() - startTime

      // Only close if it's a quick downward swipe (not slow scrolling)
      if (deltaY > 50 && deltaTime < 300) {
        onClose()
      }
    }

    const handleTouchEnd = () => {
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }

    document.addEventListener('touchmove', handleTouchMove)
    document.addEventListener('touchend', handleTouchEnd)
  }

  // File type detection
  const getFileType = (fileType: string, fileName: string): 'image' | 'pdf' | 'text' | 'document' | 'other' => {
    const type = fileType.toLowerCase()
    const extension = fileName.split('.').pop()?.toLowerCase()

    if (type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) {
      return 'image'
    }
    if (type === 'application/pdf' || extension === 'pdf') {
      return 'pdf'
    }
    if (type.startsWith('text/') || ['txt', 'md', 'json', 'xml', 'csv'].includes(extension || '')) {
      return 'text'
    }
    if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension || '')) {
      return 'document'
    }
    return 'other'
  }

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Handle download
  const handleDownload = () => {
    if (attachment) {
      window.open(attachment.file_url, '_blank')
    }
  }

  // Handle zoom
  const handleZoomIn = () => setImageScale(prev => Math.min(prev + 0.25, 3))
  const handleZoomOut = () => setImageScale(prev => Math.max(prev - 0.25, 0.25))
  const handleRotate = () => setImageRotation(prev => (prev + 90) % 360)

  if (!isOpen || !attachment) return null

  const fileType = getFileType(attachment.file_type, attachment.file_name)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Bottom Sheet */}
      <div
        ref={bottomSheetRef}
        className="relative w-full max-w-lg bg-white rounded-t-xl shadow-xl transform transition-transform duration-300 ease-out"
        style={{
          height: '90vh',
          transform: isOpen ? 'translateY(0)' : 'translateY(100%)'
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-xl"
          onTouchStart={handleHeaderTouchStart}
        >
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {attachment.file_name}
            </h3>
            <p className="text-sm text-gray-500">
              {formatFileSize(attachment.file_size)} • {attachment.file_type}
            </p>
          </div>

          <div className="flex items-center gap-2 ml-4">
            {fileType === 'image' && (
              <>
                <button
                  onClick={handleZoomOut}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={imageScale <= 0.25}
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={handleZoomIn}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={imageScale >= 3}
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={handleRotate}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </>
            )}

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden h-full">
          {fileType === 'image' && (
            <div className="h-full flex items-center justify-center bg-gray-100 overflow-auto">
              <img
                src={attachment.file_url}
                alt={attachment.file_name}
                className="max-w-full max-h-full object-contain transition-transform duration-200"
                style={{
                  transform: `scale(${imageScale}) rotate(${imageRotation}deg)`
                }}
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false)
                  setError('Failed to load image')
                }}
              />
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                </div>
              )}
            </div>
          )}

          {fileType === 'pdf' && (
            <div className="h-full">
              <iframe
                src={attachment.file_url}
                className="w-full h-full border-0"
                title={attachment.file_name}
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false)
                  setError('Failed to load PDF')
                }}
              />
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white">
                  <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                </div>
              )}
            </div>
          )}

          {(fileType === 'document' || fileType === 'other') && (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                <ExternalLink className="w-8 h-8 text-gray-400" />
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                {t('mobile.fileViewer.previewNotAvailable')}
              </h4>
              <p className="text-gray-500 mb-6">
                {t('mobile.fileViewer.downloadToView')}
              </p>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Download className="w-4 h-4" />
                {t('common.download')}
              </button>
            </div>
          )}

          {error && (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <X className="w-8 h-8 text-red-400" />
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                {t('mobile.fileViewer.errorLoading')}
              </h4>
              <p className="text-gray-500 mb-6">{error}</p>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Download className="w-4 h-4" />
                {t('common.download')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}