"use client"

import { useState, useRef } from 'react'
import { Loader2, Sparkles, AlertTriangle, X, ArrowLeft, Check, Upload, FileText } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DateInput } from '@/components/ui/common/DateInput'
import { supabase } from '@/lib/supabase'
import { showErrorToast } from '@/stores'
import type { ParsedAssignmentDraft, AssignmentType } from '@/lib/assignment-parser'

const ASSIGNMENT_TYPES: AssignmentType[] = ['quiz', 'homework', 'test', 'project']

export interface ConfirmedImportDraft {
  title: string
  description?: string
  assignment_type: AssignmentType
  due_date?: string
  /** UUID of the chosen assignment_category, or empty string for none */
  assignment_categories_id?: string
}

export interface ImportCategoryOption {
  id: string
  name: string
}

interface AssignmentImportModalProps {
  isOpen: boolean
  onClose: () => void
  /** Needed for the /api/assignments/parse auth check */
  academyId: string
  /**
   * Categories available for this classroom's subject. Passed to the AI so it
   * can suggest a match verbatim, and rendered as a dropdown on each row.
   * Empty list is fine — the dropdown will just not suggest anything.
   */
  categories?: ImportCategoryOption[]
  /**
   * Called when the user confirms the import. Receives only the rows they
   * kept. The parent is responsible for merging these into whatever form
   * state they're using (e.g. SessionsPage modal's modalAssignments list).
   */
  onConfirm: (drafts: ConfirmedImportDraft[]) => void
}

interface DraftRow extends ParsedAssignmentDraft {
  /** UI-only id so React can key the rows */
  rowId: string
  /** User can toggle a row off before confirming */
  include: boolean
  /** The category UUID chosen in the dropdown (resolved from AI's category_name) */
  assignment_categories_id: string
}

type Step = 'paste' | 'preview'

export function AssignmentImportModal({
  isOpen,
  onClose,
  academyId,
  categories = [],
  onConfirm,
}: AssignmentImportModalProps) {
  const { t, language } = useTranslation()

  const [step, setStep] = useState<Step>('paste')
  const [text, setText] = useState('')
  const [parsing, setParsing] = useState(false)
  const [parseMode, setParseMode] = useState<'structured' | 'ai' | null>(null)
  const [rows, setRows] = useState<DraftRow[]>([])
  const [loadedFile, setLoadedFile] = useState<{ name: string; size: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setStep('paste')
    setText('')
    setRows([])
    setParseMode(null)
    setLoadedFile(null)
    setIsDragging(false)
  }

  // File format routing:
  // - Text formats (.txt/.md/.csv) → read client-side with file.text(), no server call
  // - Binary formats (.pdf/.docx/.hwp/.hwpx) → upload to /api/assignments/extract-text for server-side parsing
  const TEXT_EXTENSIONS = ['.txt', '.md', '.markdown', '.csv']
  const BINARY_EXTENSIONS = ['.pdf', '.docx', '.hwp', '.hwpx']
  const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10MB — matches server

  const fileCategory = (file: File): 'text' | 'binary' | 'unsupported' => {
    const lower = file.name.toLowerCase()
    if (TEXT_EXTENSIONS.some(ext => lower.endsWith(ext))) return 'text'
    if (BINARY_EXTENSIONS.some(ext => lower.endsWith(ext))) return 'binary'
    if (file.type.startsWith('text/')) return 'text'
    if (file.type === 'application/pdf') return 'binary'
    if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return 'binary'
    }
    return 'unsupported'
  }

  const [extractingFile, setExtractingFile] = useState(false)

  const extractViaServer = async (file: File): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) {
      showErrorToast(
        t('assignments.import.parseFailed') as string,
        t('assignments.import.errors.notAuthenticated') as string
      )
      return null
    }
    const form = new FormData()
    form.append('file', file)
    form.append('academy_id', academyId)
    const res = await fetch('/api/assignments/extract-text', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      // 422 = document parsed but had no extractable text (e.g. scanned PDF)
      if (res.status === 422) {
        showErrorToast(
          t('assignments.import.errors.emptyDocument') as string,
          t('assignments.import.errors.emptyDocumentDescription') as string
        )
      } else if (res.status === 413) {
        showErrorToast(
          t('assignments.import.errors.unsupportedFile') as string,
          t('assignments.import.errors.fileTooLarge') as string
        )
      } else if (res.status === 429) {
        showErrorToast(
          t('assignments.import.parseFailed') as string,
          t('assignments.import.errors.rateLimited') as string
        )
      } else {
        showErrorToast(
          t('assignments.import.errors.unsupportedFile') as string,
          translateApiError(res.status, json?.error)
        )
      }
      return null
    }
    return typeof json?.text === 'string' ? json.text : null
  }

  const handleFile = async (file: File) => {
    const category = fileCategory(file)
    if (category === 'unsupported') {
      showErrorToast(
        t('assignments.import.errors.unsupportedFile') as string,
        t('assignments.import.errors.unsupportedFileDescription') as string
      )
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      showErrorToast(
        t('assignments.import.errors.unsupportedFile') as string,
        t('assignments.import.errors.fileTooLarge') as string
      )
      return
    }

    try {
      let content: string | null = null
      if (category === 'text') {
        content = await file.text()
      } else {
        // binary — extract server-side
        setExtractingFile(true)
        try {
          content = await extractViaServer(file)
        } finally {
          setExtractingFile(false)
        }
        if (content === null) return
      }

      if (content.length > 10_000) {
        // Mirror the server-side limit so parse won't fail later
        content = content.slice(0, 10_000)
      }
      setText(content)
      setLoadedFile({ name: file.name, size: file.size })
    } catch {
      showErrorToast(
        t('assignments.import.errors.unsupportedFile') as string,
        t('assignments.import.errors.unknownError') as string
      )
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isDragging) setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Only clear when leaving the drop zone itself (not its children)
    if (e.currentTarget === e.target) setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    // Reset so selecting the same file twice still fires onChange
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const clearLoadedFile = () => {
    setLoadedFile(null)
    setText('')
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const close = () => {
    if (parsing || extractingFile) return
    reset()
    onClose()
  }

  // Map a failed parse response (status + error body) to a translated, user-facing
  // message. Server error strings are technical and shouldn't be shown directly.
  const translateApiError = (status: number, _errorText?: string): string => {
    void _errorText
    switch (status) {
      case 401:
        return t('assignments.import.errors.notAuthenticated') as string
      case 403:
        return t('assignments.import.errors.forbidden') as string
      case 413:
      case 400:
        // 400 is used for "text required", "academy_id required", "input too long"
        // The only one a real user hits is input-too-long (the others require client bugs).
        return t('assignments.import.errors.inputTooLong') as string
      case 429:
        return t('assignments.import.errors.rateLimited') as string
      default:
        return t('assignments.import.errors.serverError') as string
    }
  }

  const handleParse = async () => {
    if (!text.trim()) return
    setParsing(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) {
        showErrorToast(
          t('assignments.import.parseFailed') as string,
          t('assignments.import.errors.notAuthenticated') as string
        )
        return
      }
      const res = await fetch('/api/assignments/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          text,
          academy_id: academyId,
          mode: 'auto',
          language: language === 'korean' ? 'korean' : 'english',
          categories: categories.map(c => ({ id: c.id, name: c.name })),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        showErrorToast(
          t('assignments.import.parseFailed') as string,
          translateApiError(res.status, json?.error)
        )
        return
      }
      const drafts: ParsedAssignmentDraft[] = json.drafts || []
      if (drafts.length === 0) {
        showErrorToast(
          t('assignments.import.noAssignmentsFound') as string,
          t('assignments.import.noAssignmentsFoundDescription') as string
        )
        return
      }
      setParseMode(json.mode)
      // Resolve the AI's category name (already whitelist-validated server-side)
      // to an ID so the dropdown can preselect it.
      const categoriesByName = new Map(
        categories.map(c => [c.name.toLowerCase(), c.id])
      )
      setRows(
        drafts.map((d, i) => ({
          ...d,
          rowId: `r-${i}-${Date.now()}`,
          include: true,
          assignment_categories_id:
            (d.category_name && categoriesByName.get(d.category_name.toLowerCase())) || '',
        }))
      )
      setStep('preview')
    } catch {
      // Network / fetch-level failure; don't leak technical details to users.
      showErrorToast(
        t('assignments.import.parseFailed') as string,
        t('assignments.import.errors.unknownError') as string
      )
    } finally {
      setParsing(false)
    }
  }

  const updateRow = (rowId: string, patch: Partial<DraftRow>) => {
    setRows(prev => prev.map(r => (r.rowId === rowId ? { ...r, ...patch } : r)))
  }

  const removeRow = (rowId: string) => {
    setRows(prev => prev.filter(r => r.rowId !== rowId))
  }

  const includedRows = rows.filter(r => r.include)

  const handleConfirm = () => {
    const confirmed: ConfirmedImportDraft[] = includedRows.map(r => ({
      title: r.title,
      description: r.description,
      assignment_type: r.assignment_type,
      due_date: r.due_date,
      assignment_categories_id: r.assignment_categories_id || undefined,
    }))
    onConfirm(confirmed)
    reset()
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={close} size="3xl">
      <div className="flex flex-col flex-1 min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            {step === 'preview' && (
              <button
                onClick={() => !parsing && setStep('paste')}
                className="text-gray-500 hover:text-gray-700"
                disabled={parsing}
                aria-label={t('common.back') as string}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {t('assignments.import.title')}
              </h2>
              {step === 'preview' && parseMode && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {parseMode === 'ai'
                    ? t('assignments.import.parsedByAI')
                    : t('assignments.import.parsedFromMarkdown')}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={close}
            disabled={parsing}
            className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
            aria-label={t('common.close') as string}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          {step === 'paste' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
                <div className="flex gap-2">
                  <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium mb-1">{t('assignments.import.howItWorks')}</p>
                    <p className="text-blue-800">{t('assignments.import.howItWorksSessionContext')}</p>
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    {t('assignments.import.pasteLabel')}
                  </label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={parsing || extractingFile}
                    className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {t('assignments.import.uploadFile')}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.md,.markdown,.csv,.pdf,.docx,.hwp,.hwpx,text/plain,text/markdown,text/csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>

                {loadedFile && (
                  <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-md mb-2 text-sm">
                    <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span className="flex-1 truncate text-blue-900 font-medium">{loadedFile.name}</span>
                    <span className="text-xs text-blue-700 flex-shrink-0">
                      {formatFileSize(loadedFile.size)}
                    </span>
                    <button
                      type="button"
                      onClick={clearLoadedFile}
                      className="text-blue-600 hover:text-blue-800 flex-shrink-0"
                      aria-label={t('common.remove') as string}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative rounded-md border-2 border-dashed transition-colors ${
                    isDragging
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-300'
                  }`}
                >
                  <textarea
                    value={text}
                    onChange={e => {
                      setText(e.target.value)
                      // Manual edits detach from the loaded file
                      if (loadedFile) setLoadedFile(null)
                    }}
                    placeholder={t('assignments.import.pastePlaceholder') as string}
                    className="w-full h-64 p-3 bg-transparent font-mono text-sm focus:outline-none resize-none"
                    disabled={parsing || extractingFile}
                  />
                  {isDragging && (
                    <div className="absolute inset-0 flex items-center justify-center bg-primary/10 rounded-md pointer-events-none">
                      <div className="flex flex-col items-center gap-2 text-primary">
                        <Upload className="w-8 h-8" />
                        <span className="font-medium">
                          {t('assignments.import.dropFileHere')}
                        </span>
                      </div>
                    </div>
                  )}
                  {extractingFile && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-md">
                      <div className="flex flex-col items-center gap-2 text-primary">
                        <Loader2 className="w-8 h-8 animate-spin" />
                        <span className="font-medium">
                          {t('assignments.import.extractingFile')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-gray-500">
                    {t('assignments.import.dragHint')}
                  </p>
                  <p className="text-xs text-gray-500">
                    {text.length} / 10,000
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                {t('assignments.import.reviewInstructions')}
              </p>
              {rows.map((row, idx) => (
                <div
                  key={row.rowId}
                  className={`border rounded-lg p-3 ${row.include ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200 opacity-60'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="pt-2 flex-shrink-0">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={row.include}
                        onClick={() => updateRow(row.rowId, { include: !row.include })}
                        aria-label={row.include ? t('common.disable') as string : t('common.enable') as string}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          row.include ? 'bg-primary' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            row.include ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    <span className="text-xs text-gray-400 mt-3 w-6 text-right flex-shrink-0">
                      {idx + 1}
                    </span>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-2">
                      <div className="md:col-span-5">
                        <Input
                          value={row.title}
                          onChange={e => updateRow(row.rowId, { title: e.target.value })}
                          placeholder={t('assignments.title') as string}
                          disabled={!row.include}
                          className="h-10"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <Select
                          value={row.assignment_type}
                          onValueChange={v =>
                            updateRow(row.rowId, { assignment_type: v as AssignmentType })
                          }
                          disabled={!row.include}
                        >
                          <SelectTrigger className="!h-10 w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ASSIGNMENT_TYPES.map(typ => (
                              <SelectItem key={typ} value={typ}>
                                {t(`assignments.${typ}`) as string}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className={`md:col-span-4 ${!row.include ? 'opacity-50 pointer-events-none' : ''}`}>
                        <DateInput
                          value={row.due_date || ''}
                          onChange={v => updateRow(row.rowId, { due_date: v })}
                        />
                      </div>
                      {categories.length > 0 && (
                        <div className="md:col-span-12">
                          <Select
                            value={row.assignment_categories_id || '__none__'}
                            onValueChange={v =>
                              updateRow(row.rowId, {
                                assignment_categories_id: v === '__none__' ? '' : v,
                              })
                            }
                            disabled={!row.include}
                          >
                            <SelectTrigger className="!h-10 w-full">
                              <SelectValue placeholder={t('assignments.import.categoryPlaceholder') as string} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">
                                {t('assignments.import.noCategory') as string}
                              </SelectItem>
                              {categories.map(cat => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  {cat.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <div className="md:col-span-12">
                        <textarea
                          value={row.description || ''}
                          onChange={e => updateRow(row.rowId, { description: e.target.value })}
                          placeholder={t('assignments.import.descriptionPlaceholder') as string}
                          disabled={!row.include}
                          rows={2}
                          className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary resize-y disabled:opacity-50"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRow(row.rowId)}
                      className="text-gray-400 hover:text-red-600 mt-3 flex-shrink-0"
                      aria-label={t('common.delete') as string}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {row.warnings && row.warnings.length > 0 && row.include && (
                    <div className="mt-2 ml-[4.5rem] flex items-start gap-1.5 text-xs text-amber-700">
                      <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>{row.warnings.join('; ')}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-6 pt-4 border-t border-gray-200 flex items-center justify-between gap-3">
          {step === 'paste' ? (
            <>
              <span className="text-xs text-gray-500">
                {t('assignments.import.aiDisclaimer')}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={close} disabled={parsing}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleParse} disabled={!text.trim() || parsing || extractingFile}>
                  {parsing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <Sparkles className="w-4 h-4 mr-2" />
                  {parsing ? t('assignments.import.parsing') : t('assignments.import.parse')}
                </Button>
              </div>
            </>
          ) : (
            <>
              <span className="text-xs text-gray-500">
                {t('assignments.import.rowsReady', { count: includedRows.length })}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={close}>
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={includedRows.length === 0}
                >
                  <Check className="w-4 h-4 mr-2" />
                  {t('assignments.import.addToSession', { count: includedRows.length })}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}
