import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface FileUploadResult {
  success: boolean
  fileUrl?: string
  fileName?: string
  fileSize?: number
  fileType?: string
  error?: Error
}

export interface UploadProgress {
  fileName: string
  progress: number
  completed: boolean
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'text/plain',
  'text/csv'
]

export function useFileUpload() {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<UploadProgress | null>(null)

  const validateFile = useCallback((file: File): { valid: boolean; error?: string } => {
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: 'File size must be less than 10MB' }
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return { valid: false, error: 'File type not supported. Supported types: PDF, Word, Excel, PowerPoint, Images, Text files' }
    }

    return { valid: true }
  }, [])

  const uploadFile = useCallback(async (
    file: File, 
    bucket: string = 'assignment-attachments',
    path?: string
  ): Promise<FileUploadResult> => {
    setUploading(true)
    setProgress({ fileName: file.name, progress: 0, completed: false })

    try {
      // Validate file
      const validation = validateFile(file)
      if (!validation.valid) {
        throw new Error(validation.error)
      }

      // Generate unique file path
      const timestamp = Date.now()
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const filePath = path || `${timestamp}-${sanitizedFileName}`

      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        throw error
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path)

      setProgress({ fileName: file.name, progress: 100, completed: true })

      return {
        success: true,
        fileUrl: publicUrl,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      }
    } catch (error) {
      console.error('File upload error:', error)
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Upload failed')
      }
    } finally {
      setUploading(false)
      setTimeout(() => setProgress(null), 2000) // Clear progress after 2 seconds
    }
  }, [validateFile])

  const deleteFile = useCallback(async (
    filePath: string, 
    bucket: string = 'assignment-attachments'
  ): Promise<{ success: boolean; error?: Error }> => {
    try {
      // Extract path from URL if full URL is provided
      let path = filePath
      if (filePath.includes(`/${bucket}/`)) {
        path = filePath.split(`/${bucket}/`)[1]
      }

      const { error } = await supabase.storage
        .from(bucket)
        .remove([path])

      if (error) {
        throw error
      }

      return { success: true }
    } catch (error) {
      console.error('File deletion error:', error)
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Deletion failed')
      }
    }
  }, [])

  return {
    uploading,
    progress,
    uploadFile,
    deleteFile,
    validateFile
  }
}