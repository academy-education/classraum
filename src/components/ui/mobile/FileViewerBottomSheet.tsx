"use client"

import React, { useEffect, useRef, useState } from 'react'
import { X, Download, ZoomIn, ZoomOut, RotateCw, ExternalLink, Share2, Save, CheckCircle } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { useToast } from '@/hooks/use-toast'
import { isNativeApp, downloadFile, shareFile, Directory } from '@/lib/nativeFileSystem'

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
  const { toast } = useToast()
  const bottomSheetRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [imageScale, setImageScale] = useState(1)
  const [imageRotation, setImageRotation] = useState(0)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [downloadSuccess, setDownloadSuccess] = useState(false)
  const [showActionSheet, setShowActionSheet] = useState(false)

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
      setDownloadSuccess(false)
      setDownloadProgress(0)
      setShowActionSheet(false)
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
  const handleDownload = async () => {
    if (!attachment) return

    if (isNativeApp()) {
      // Native download with progress
      setIsDownloading(true)
      setDownloadProgress(0)
      setShowActionSheet(false)

      try {
        const result = await downloadFile({
          url: attachment.file_url,
          fileName: attachment.file_name,
          directory: Directory.Documents,
          progressCallback: (progress) => setDownloadProgress(progress),
        })

        if (result) {
          setDownloadSuccess(true)
          setTimeout(() => setDownloadSuccess(false), 3000)
        } else {
          setError(t('mobile.fileViewer.downloadFailed') || 'Download failed')
        }
      } catch (err) {
        console.error('Download error:', err)
        setError(t('mobile.fileViewer.downloadFailed') || 'Download failed')
      } finally {
        setIsDownloading(false)
        setDownloadProgress(0)
      }
    } else {
      // Web download
      window.open(attachment.file_url, '_blank')
    }
  }

  // Handle share
  const handleShare = async () => {
    if (!attachment) return
    setShowActionSheet(false)

    const success = await shareFile(attachment.file_url, {
      title: attachment.file_name,
      text: t('mobile.fileViewer.shareText') || 'Check out this file',
      dialogTitle: t('mobile.fileViewer.shareWith') || 'Share with',
    })

    if (!success && !isNativeApp()) {
      // Fallback to copy URL if share not available on web
      try {
        await navigator.clipboard.writeText(attachment.file_url)
        toast({ title: (t('mobile.fileViewer.linkCopied') || 'Link copied to clipboard') as string, variant: 'info' })
      } catch {
        // If clipboard fails, just open the URL
        window.open(attachment.file_url, '_blank')
      }
    }
  }

  // Show action sheet for download/share options
  const handleActionButtonClick = () => {
    if (isNativeApp()) {
      setShowActionSheet(true)
    } else {
      handleDownload()
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
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Bottom Sheet */}
      <div
        ref={bottomSheetRef}
        className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-[0_-24px_48px_-12px_rgba(0,0,0,0.18)] transform transition-transform duration-300 ease-out"
        style={{
          height: '90vh',
          transform: isOpen ? 'translateY(0)' : 'translateY(100%)'
        }}
      >
        {/* Handle Bar */}
        <div
          className="flex justify-center pt-3 pb-2"
          onTouchStart={handleHeaderTouchStart}
        >
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-2 border-b border-gray-100"
          onTouchStart={handleHeaderTouchStart}
        >
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">
              {formatFileSize(attachment.file_size)} · {attachment.file_type}
            </div>
            <h3 className="text-base font-semibold text-gray-900 truncate">
              {attachment.file_name}
            </h3>
          </div>

          <div className="flex items-center gap-1 ml-4">
            {fileType === 'image' && (
              <>
                <button
                  onClick={handleZoomOut}
                  className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-full transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  disabled={imageScale <= 0.25}
                  aria-label={String(t('mobile.fileViewer.zoomOut'))}
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={handleZoomIn}
                  className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-full transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  disabled={imageScale >= 3}
                  aria-label={String(t('mobile.fileViewer.zoomIn'))}
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={handleRotate}
                  className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  aria-label={String(t('mobile.fileViewer.rotate'))}
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </>
            )}

            {/* Download/Share Button */}
            <button
              onClick={handleActionButtonClick}
              disabled={isDownloading}
              className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-full transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label={String(
                downloadSuccess
                  ? t('mobile.fileViewer.downloaded') || 'Downloaded'
                  : isDownloading
                    ? t('mobile.fileViewer.downloading') || 'Downloading'
                    : t('mobile.fileViewer.download') || 'Download'
              )}
            >
              {downloadSuccess ? (
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              ) : isDownloading ? (
                <div className="w-4 h-4 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
            </button>

            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label={String(t('common.close'))}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Download Progress Bar */}
        {isDownloading && downloadProgress > 0 && (
          <div className="absolute left-0 right-0 top-[88px] h-0.5 bg-gray-100">
            <div
              className="h-full bg-primary transition-all duration-200"
              style={{ width: `${downloadProgress}%` }}
            />
          </div>
        )}

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
                  <div className="w-8 h-8 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
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
                  <div className="w-8 h-8 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
                </div>
              )}
            </div>
          )}

          {(fileType === 'document' || fileType === 'other') && (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/8 flex items-center justify-center mb-4">
                <ExternalLink className="w-7 h-7 text-primary" strokeWidth={1.75} />
              </div>
              <h4 className="text-base font-semibold text-gray-900 mb-2">
                {t('mobile.fileViewer.previewNotAvailable')}
              </h4>
              <p className="text-sm text-gray-500 mb-5 max-w-xs">
                {t('mobile.fileViewer.downloadToView')}
              </p>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Download className="w-4 h-4" />
                {t('common.download')}
              </button>
            </div>
          )}

          {error && (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mb-4">
                <X className="w-7 h-7 text-rose-600" strokeWidth={1.75} />
              </div>
              <h4 className="text-base font-semibold text-gray-900 mb-2">
                {t('mobile.fileViewer.errorLoading')}
              </h4>
              <p className="text-sm text-gray-500 mb-5 max-w-xs">{error}</p>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Download className="w-4 h-4" />
                {t('common.download')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Native Action Sheet for Download/Share */}
      {showActionSheet && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowActionSheet(false)}
          />
          <div className="relative w-full max-w-lg bg-white rounded-t-3xl p-4 pb-8 animate-in slide-in-from-bottom duration-300 shadow-[0_-24px_48px_-12px_rgba(0,0,0,0.18)]">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 text-center mb-1">
              {String(t('mobile.fileViewer.fileEyebrow'))}
            </div>
            <h3 className="text-base font-semibold text-center mb-4">
              {String(t('mobile.fileViewer.fileOptions'))}
            </h3>
            <div className="space-y-2">
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="w-full flex items-center gap-3 p-3 rounded-2xl ring-1 ring-gray-100 hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/8 flex items-center justify-center flex-shrink-0">
                  <Save className="w-5 h-5 text-primary" strokeWidth={1.75} />
                </div>
                <div className="text-left min-w-0">
                  <span className="text-gray-900 font-medium block">
                    {t('mobile.fileViewer.saveToDevice') || 'Save to Device'}
                  </span>
                  <span className="text-gray-500 text-xs">
                    {t('mobile.fileViewer.saveToDocuments') || 'Save to Documents folder'}
                  </span>
                </div>
              </button>
              <button
                onClick={handleShare}
                className="w-full flex items-center gap-3 p-3 rounded-2xl ring-1 ring-gray-100 hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <Share2 className="w-5 h-5 text-emerald-600" strokeWidth={1.75} />
                </div>
                <div className="text-left min-w-0">
                  <span className="text-gray-900 font-medium block">
                    {t('mobile.fileViewer.shareFile') || 'Share File'}
                  </span>
                  <span className="text-gray-500 text-xs">
                    {t('mobile.fileViewer.shareViaApps') || 'Share via other apps'}
                  </span>
                </div>
              </button>
            </div>
            <button
              onClick={() => setShowActionSheet(false)}
              className="w-full mt-4 py-3 text-gray-600 font-medium text-sm hover:text-gray-900 transition-colors"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}