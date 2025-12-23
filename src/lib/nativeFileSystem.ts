import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory, Encoding, WriteFileResult, ReadFileResult, StatResult } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

export interface FileInfo {
  name: string
  path: string
  size: number
  type: string
  uri: string
  modifiedTime?: number
}

export interface DownloadOptions {
  url: string
  fileName: string
  directory?: Directory
  progressCallback?: (progress: number) => void
}

export interface SaveOptions {
  data: string | Blob
  fileName: string
  directory?: Directory
  encoding?: Encoding
}

// Check if we're running in a native app
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform()
}

// Get the current platform
export function getPlatform(): 'ios' | 'android' | 'web' {
  const platform = Capacitor.getPlatform()
  if (platform === 'ios') return 'ios'
  if (platform === 'android') return 'android'
  return 'web'
}

// Request file system permissions (Android only)
export async function requestFilePermissions(): Promise<boolean> {
  if (!isNativeApp()) {
    return true
  }

  try {
    const result = await Filesystem.checkPermissions()
    if (result.publicStorage === 'granted') {
      return true
    }

    const requestResult = await Filesystem.requestPermissions()
    return requestResult.publicStorage === 'granted'
  } catch (error) {
    console.error('Error requesting file permissions:', error)
    return false
  }
}

// Download a file from URL and save to device
export async function downloadFile(options: DownloadOptions): Promise<FileInfo | null> {
  const { url, fileName, directory = Directory.Documents, progressCallback } = options

  if (!isNativeApp()) {
    // On web, trigger browser download
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    return null
  }

  try {
    // Fetch the file
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`)
    }

    const contentLength = response.headers.get('content-length')
    const total = contentLength ? parseInt(contentLength, 10) : 0

    // Read the response as array buffer with progress tracking
    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('Failed to get response reader')
    }

    const chunks: Uint8Array[] = []
    let receivedLength = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      chunks.push(value)
      receivedLength += value.length

      if (progressCallback && total > 0) {
        const progress = Math.round((receivedLength / total) * 100)
        progressCallback(progress)
      }
    }

    // Combine chunks into single array
    const allChunks = new Uint8Array(receivedLength)
    let position = 0
    for (const chunk of chunks) {
      allChunks.set(chunk, position)
      position += chunk.length
    }

    // Convert to base64
    const base64 = arrayBufferToBase64(allChunks.buffer)

    // Write to filesystem
    const result: WriteFileResult = await Filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: directory,
    })

    // Get file stats
    const stats: StatResult = await Filesystem.stat({
      path: fileName,
      directory: directory,
    })

    return {
      name: fileName,
      path: result.uri,
      size: stats.size,
      type: getMimeType(fileName),
      uri: result.uri,
      modifiedTime: stats.mtime,
    }
  } catch (error) {
    console.error('Error downloading file:', error)
    return null
  }
}

// Save data directly to device storage
export async function saveFile(options: SaveOptions): Promise<FileInfo | null> {
  const { data, fileName, directory = Directory.Documents, encoding } = options

  if (!isNativeApp()) {
    // On web, create and trigger download
    let blob: Blob
    if (typeof data === 'string') {
      blob = new Blob([data], { type: getMimeType(fileName) })
    } else {
      blob = data
    }

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    return null
  }

  try {
    let base64Data: string

    if (typeof data === 'string') {
      // If it's already base64 or text
      if (encoding === Encoding.UTF8) {
        base64Data = btoa(unescape(encodeURIComponent(data)))
      } else {
        base64Data = data
      }
    } else {
      // Convert Blob to base64
      base64Data = await blobToBase64(data)
    }

    const result: WriteFileResult = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: directory,
    })

    // Get file stats
    const stats: StatResult = await Filesystem.stat({
      path: fileName,
      directory: directory,
    })

    return {
      name: fileName,
      path: result.uri,
      size: stats.size,
      type: getMimeType(fileName),
      uri: result.uri,
      modifiedTime: stats.mtime,
    }
  } catch (error) {
    console.error('Error saving file:', error)
    return null
  }
}

// Read a file from device storage
export async function readFile(path: string, directory: Directory = Directory.Documents): Promise<string | null> {
  if (!isNativeApp()) {
    console.warn('readFile is only available in native app')
    return null
  }

  try {
    const result: ReadFileResult = await Filesystem.readFile({
      path: path,
      directory: directory,
    })

    return result.data as string
  } catch (error) {
    console.error('Error reading file:', error)
    return null
  }
}

// Delete a file from device storage
export async function deleteFile(path: string, directory: Directory = Directory.Documents): Promise<boolean> {
  if (!isNativeApp()) {
    console.warn('deleteFile is only available in native app')
    return false
  }

  try {
    await Filesystem.deleteFile({
      path: path,
      directory: directory,
    })
    return true
  } catch (error) {
    console.error('Error deleting file:', error)
    return false
  }
}

// Check if a file exists
export async function fileExists(path: string, directory: Directory = Directory.Documents): Promise<boolean> {
  if (!isNativeApp()) {
    return false
  }

  try {
    await Filesystem.stat({
      path: path,
      directory: directory,
    })
    return true
  } catch {
    return false
  }
}

// Get file info
export async function getFileInfo(path: string, directory: Directory = Directory.Documents): Promise<FileInfo | null> {
  if (!isNativeApp()) {
    return null
  }

  try {
    const stats: StatResult = await Filesystem.stat({
      path: path,
      directory: directory,
    })

    return {
      name: path.split('/').pop() || path,
      path: stats.uri,
      size: stats.size,
      type: getMimeType(path),
      uri: stats.uri,
      modifiedTime: stats.mtime,
    }
  } catch (error) {
    console.error('Error getting file info:', error)
    return null
  }
}

// List files in a directory
export async function listFiles(path: string = '', directory: Directory = Directory.Documents): Promise<string[]> {
  if (!isNativeApp()) {
    return []
  }

  try {
    const result = await Filesystem.readdir({
      path: path,
      directory: directory,
    })
    return result.files.map(f => f.name)
  } catch (error) {
    console.error('Error listing files:', error)
    return []
  }
}

// Share a file using native share sheet
export async function shareFile(
  fileUri: string,
  options?: {
    title?: string
    text?: string
    dialogTitle?: string
  }
): Promise<boolean> {
  if (!isNativeApp()) {
    // On web, try the Web Share API
    if (navigator.share) {
      try {
        await navigator.share({
          title: options?.title,
          text: options?.text,
          url: fileUri,
        })
        return true
      } catch (error) {
        console.error('Error sharing:', error)
        return false
      }
    }
    return false
  }

  try {
    await Share.share({
      title: options?.title,
      text: options?.text,
      url: fileUri,
      dialogTitle: options?.dialogTitle,
    })
    return true
  } catch (error) {
    console.error('Error sharing file:', error)
    return false
  }
}

// Share multiple files
export async function shareFiles(
  files: Array<{ uri: string; type: string }>,
  options?: {
    title?: string
    text?: string
    dialogTitle?: string
  }
): Promise<boolean> {
  if (!isNativeApp()) {
    console.warn('shareFiles is only available in native app')
    return false
  }

  try {
    await Share.share({
      title: options?.title,
      text: options?.text,
      files: files.map(f => f.uri),
      dialogTitle: options?.dialogTitle,
    })
    return true
  } catch (error) {
    console.error('Error sharing files:', error)
    return false
  }
}

// Create a directory
export async function createDirectory(path: string, directory: Directory = Directory.Documents): Promise<boolean> {
  if (!isNativeApp()) {
    return false
  }

  try {
    await Filesystem.mkdir({
      path: path,
      directory: directory,
      recursive: true,
    })
    return true
  } catch (error) {
    console.error('Error creating directory:', error)
    return false
  }
}

// Copy a file
export async function copyFile(
  sourcePath: string,
  destPath: string,
  sourceDirectory: Directory = Directory.Documents,
  destDirectory: Directory = Directory.Documents
): Promise<boolean> {
  if (!isNativeApp()) {
    return false
  }

  try {
    await Filesystem.copy({
      from: sourcePath,
      to: destPath,
      directory: sourceDirectory,
      toDirectory: destDirectory,
    })
    return true
  } catch (error) {
    console.error('Error copying file:', error)
    return false
  }
}

// Helper function to convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

// Helper function to convert Blob to base64
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      // Remove data URL prefix
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// Helper function to get MIME type from file extension
function getMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase()
  const mimeTypes: Record<string, string> = {
    // Images
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    // Documents
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Text
    txt: 'text/plain',
    csv: 'text/csv',
    json: 'application/json',
    // Audio
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    // Video
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    // Archives
    zip: 'application/zip',
    rar: 'application/x-rar-compressed',
  }
  return mimeTypes[ext || ''] || 'application/octet-stream'
}

// Export Directory enum for convenience
export { Directory, Encoding }
