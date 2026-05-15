"use client"

import { useCallback } from 'react'
import { exportAssignmentsToMarkdown, downloadFilename } from '@/lib/assignment-exporter'

// Loose shape — tolerant of the Assignment type that lives in the parent
// without forcing the parent's full typing into this hook.
interface ExportableAssignment {
  title: string
  assignment_type: string
  due_date?: string | null
  description?: string | null
}

interface UseAssignmentsExportArgs {
  /** Currently filtered assignments — what the user sees is what they export. */
  filteredAssignments: ExportableAssignment[]
  /** Translation function from useTranslation. */
  t: (key: string, params?: Record<string, string | number>) => unknown
  /** Toast helpers — typed loosely so we can pass any compatible adapter. */
  showSuccessToast: (msg: string, description?: string) => void
  showErrorToast: (msg: string, description?: string) => void
  /** Called after copy or download completes (e.g., to close the export menu). */
  onComplete?: () => void
}

/**
 * Encapsulates the "export to markdown" actions for the assignments page.
 *
 * Returns two stable callbacks: one copies the rendered markdown to the
 * clipboard, the other triggers a file download. Both handle the empty
 * case (no rows in the filter) with a translated error toast and finish
 * by invoking the optional `onComplete` callback so the caller can dismiss
 * any UI it owns.
 */
export function useAssignmentsExport({
  filteredAssignments,
  t,
  showSuccessToast,
  showErrorToast,
  onComplete,
}: UseAssignmentsExportArgs) {
  const buildMarkdown = useCallback(() => {
    return exportAssignmentsToMarkdown(
      filteredAssignments.map(a => ({
        title: a.title,
        assignment_type: a.assignment_type,
        due_date: a.due_date,
        description: a.description,
      })),
      { header: true }
    )
  }, [filteredAssignments])

  const handleCopyMarkdown = useCallback(async () => {
    const md = buildMarkdown()
    if (!md) {
      showErrorToast(
        t('assignments.export.nothingToExport') as string,
        t('assignments.export.nothingToExportDescription') as string
      )
      onComplete?.()
      return
    }
    try {
      await navigator.clipboard.writeText(md)
      showSuccessToast(
        t('assignments.export.copiedCount', { count: filteredAssignments.length }) as string
      )
    } catch {
      showErrorToast(
        t('assignments.export.copyFailed') as string,
        t('assignments.export.clipboardUnavailable') as string
      )
    } finally {
      onComplete?.()
    }
  }, [buildMarkdown, filteredAssignments.length, t, showErrorToast, showSuccessToast, onComplete])

  const handleDownloadMarkdown = useCallback(() => {
    const md = buildMarkdown()
    if (!md) {
      showErrorToast(
        t('assignments.export.nothingToExport') as string,
        t('assignments.export.nothingToExportDescription') as string
      )
      onComplete?.()
      return
    }
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = downloadFilename()
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    onComplete?.()
  }, [buildMarkdown, t, showErrorToast, onComplete])

  return { handleCopyMarkdown, handleDownloadMarkdown }
}
