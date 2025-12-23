"use client"

import { useState, useCallback } from 'react'
import { Capacitor } from '@capacitor/core'
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera'

export interface CameraPhoto {
  dataUrl: string
  format: string
  webPath?: string
}

export interface UseNativeCameraOptions {
  quality?: number // 0-100
  width?: number
  height?: number
  allowEditing?: boolean
}

export interface UseNativeCameraReturn {
  isNativeApp: boolean
  isLoading: boolean
  error: string | null
  takePhoto: () => Promise<CameraPhoto | null>
  pickFromGallery: () => Promise<CameraPhoto | null>
  pickMultipleFromGallery: () => Promise<CameraPhoto[]>
  checkPermissions: () => Promise<boolean>
  requestPermissions: () => Promise<boolean>
  photoToFile: (photo: CameraPhoto, fileName?: string) => Promise<File>
}

const defaultOptions: UseNativeCameraOptions = {
  quality: 90,
  width: 1920,
  height: 1920,
  allowEditing: false,
}

export function useNativeCamera(options: UseNativeCameraOptions = {}): UseNativeCameraReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mergedOptions = { ...defaultOptions, ...options }
  const isNativeApp = Capacitor.isNativePlatform()

  // Check camera permissions
  const checkPermissions = useCallback(async (): Promise<boolean> => {
    if (!isNativeApp) {
      // On web, permissions are handled by the browser
      return true
    }

    try {
      const result = await Camera.checkPermissions()
      return result.camera === 'granted' && result.photos === 'granted'
    } catch (err) {
      console.error('Error checking camera permissions:', err)
      return false
    }
  }, [isNativeApp])

  // Request camera permissions
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (!isNativeApp) {
      return true
    }

    try {
      const result = await Camera.requestPermissions({
        permissions: ['camera', 'photos'],
      })
      return result.camera === 'granted' && result.photos === 'granted'
    } catch (err) {
      console.error('Error requesting camera permissions:', err)
      setError('Failed to get camera permissions')
      return false
    }
  }, [isNativeApp])

  // Convert Photo to CameraPhoto format
  const processPhoto = useCallback((photo: Photo): CameraPhoto => {
    return {
      dataUrl: photo.dataUrl || `data:image/${photo.format};base64,${photo.base64String}`,
      format: photo.format,
      webPath: photo.webPath,
    }
  }, [])

  // Take a photo with the camera
  const takePhoto = useCallback(async (): Promise<CameraPhoto | null> => {
    setIsLoading(true)
    setError(null)

    try {
      // Request permissions if needed
      const hasPermission = await requestPermissions()
      if (!hasPermission) {
        setError('Camera permission denied')
        return null
      }

      const photo = await Camera.getPhoto({
        quality: mergedOptions.quality,
        width: mergedOptions.width,
        height: mergedOptions.height,
        allowEditing: mergedOptions.allowEditing,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        correctOrientation: true,
      })

      return processPhoto(photo)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to take photo'

      // Don't treat user cancellation as an error
      if (errorMessage.includes('cancelled') || errorMessage.includes('canceled') || errorMessage.includes('User cancelled')) {
        console.log('Camera capture cancelled by user')
        return null
      }

      console.error('Error taking photo:', err)
      setError(errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [mergedOptions, requestPermissions, processPhoto])

  // Pick a single photo from the gallery
  const pickFromGallery = useCallback(async (): Promise<CameraPhoto | null> => {
    setIsLoading(true)
    setError(null)

    try {
      // Request permissions if needed
      const hasPermission = await requestPermissions()
      if (!hasPermission) {
        setError('Photo library permission denied')
        return null
      }

      const photo = await Camera.getPhoto({
        quality: mergedOptions.quality,
        width: mergedOptions.width,
        height: mergedOptions.height,
        allowEditing: mergedOptions.allowEditing,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
        correctOrientation: true,
      })

      return processPhoto(photo)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to pick photo'

      // Don't treat user cancellation as an error
      if (errorMessage.includes('cancelled') || errorMessage.includes('canceled') || errorMessage.includes('User cancelled')) {
        console.log('Photo selection cancelled by user')
        return null
      }

      console.error('Error picking photo:', err)
      setError(errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [mergedOptions, requestPermissions, processPhoto])

  // Pick multiple photos from gallery (uses native picker)
  const pickMultipleFromGallery = useCallback(async (): Promise<CameraPhoto[]> => {
    setIsLoading(true)
    setError(null)

    try {
      // Request permissions if needed
      const hasPermission = await requestPermissions()
      if (!hasPermission) {
        setError('Photo library permission denied')
        return []
      }

      const result = await Camera.pickImages({
        quality: mergedOptions.quality,
        width: mergedOptions.width,
        height: mergedOptions.height,
        correctOrientation: true,
      })

      // Convert to base64 for each image
      const photos: CameraPhoto[] = []
      for (const photo of result.photos) {
        // For multiple images, we need to read each file
        if (photo.webPath) {
          try {
            const response = await fetch(photo.webPath)
            const blob = await response.blob()
            const dataUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader()
              reader.onloadend = () => resolve(reader.result as string)
              reader.readAsDataURL(blob)
            })
            photos.push({
              dataUrl,
              format: photo.format,
              webPath: photo.webPath,
            })
          } catch {
            console.error('Error reading photo:', photo.webPath)
          }
        }
      }

      return photos
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to pick photos'

      // Don't treat user cancellation as an error
      if (errorMessage.includes('cancelled') || errorMessage.includes('canceled') || errorMessage.includes('User cancelled')) {
        console.log('Photo selection cancelled by user')
        return []
      }

      console.error('Error picking photos:', err)
      setError(errorMessage)
      return []
    } finally {
      setIsLoading(false)
    }
  }, [mergedOptions, requestPermissions])

  // Convert CameraPhoto to File object for upload
  const photoToFile = useCallback(async (photo: CameraPhoto, fileName?: string): Promise<File> => {
    // Extract base64 data from dataUrl
    const base64Data = photo.dataUrl.split(',')[1]
    const mimeType = `image/${photo.format}`

    // Convert base64 to blob
    const byteCharacters = atob(base64Data)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: mimeType })

    // Create File object
    const defaultFileName = `photo_${Date.now()}.${photo.format}`
    return new File([blob], fileName || defaultFileName, { type: mimeType })
  }, [])

  return {
    isNativeApp,
    isLoading,
    error,
    takePhoto,
    pickFromGallery,
    pickMultipleFromGallery,
    checkPermissions,
    requestPermissions,
    photoToFile,
  }
}
