"use client"

import { useState, useEffect, useCallback } from 'react'
import {
  X, Plus, Trash2, Check, Pencil, ArrowUp, ArrowDown, Loader2,
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { useSubjectActions } from '@/hooks/useSubjectActions'
import { showSuccessToast, showErrorToast } from '@/stores'

export interface ManageableCategory {
  id: string
  name: string
}

interface ManageCategoriesModalProps {
  isOpen: boolean
  onClose: () => void
  /** Required for createAssignmentCategory */
  academyId: string
  subjectId: string
  /** Subject name for the header, so the user knows which scope they're editing */
  subjectName?: string
  /** Current list (already sorted). The modal keeps its own local copy. */
  categories: ManageableCategory[]
  /** Called after any mutation so the parent can refresh. */
  onChanged: () => void | Promise<void>
}

/**
 * A category management hub, modeled on the session-templates manage modal.
 * Supports create / rename / reorder / delete, all inline with no nested modals
 * beyond a delete confirmation.
 *
 * Reordering uses up/down buttons rather than drag-and-drop — simpler, keyboard
 * accessible, and doesn't need a dnd library. For N < ~20 categories per
 * classroom (typical), the click target is perfectly fine.
 */
export function ManageCategoriesModal({
  isOpen,
  onClose,
  academyId,
  subjectId,
  subjectName,
  categories,
  onChanged,
}: ManageCategoriesModalProps) {
  const { t } = useTranslation()
  const {
    createAssignmentCategory,
    updateAssignmentCategory,
    deleteAssignmentCategory,
    reorderAssignmentCategories,
  } = useSubjectActions()

  // Local mirror — lets us reorder snappily without waiting for a refetch round trip.
  const [items, setItems] = useState<ManageableCategory[]>(categories)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [creating, setCreating] = useState(false)
  const [savingRename, setSavingRename] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<ManageableCategory | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [reordering, setReordering] = useState(false)

  // Sync when parent-provided list changes (e.g. after a refetch)
  useEffect(() => {
    setItems(categories)
  }, [categories])

  const reset = useCallback(() => {
    setNewName('')
    setEditingId(null)
    setEditingName('')
    setPendingDelete(null)
  }, [])

  const close = () => {
    if (creating || savingRename || deleting || reordering) return
    reset()
    onClose()
  }

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name) return
    setCreating(true)
    const res = await createAssignmentCategory({
      name,
      academy_id: academyId,
      subject_id: subjectId,
    })
    setCreating(false)
    if (!res.success) {
      showErrorToast(
        t('assignments.categories.createFailed') as string,
        res.error?.message || (t('assignments.categories.unknownError') as string)
      )
      return
    }
    setNewName('')
    await onChanged()
    showSuccessToast(t('assignments.categories.created') as string)
  }

  const startEdit = (c: ManageableCategory) => {
    setEditingId(c.id)
    setEditingName(c.name)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingName('')
  }

  const saveRename = async () => {
    if (!editingId) return
    const name = editingName.trim()
    const original = items.find(c => c.id === editingId)
    if (!name || !original) {
      cancelEdit()
      return
    }
    if (name === original.name) {
      cancelEdit()
      return
    }
    setSavingRename(true)
    const res = await updateAssignmentCategory(editingId, name)
    setSavingRename(false)
    if (!res.success) {
      showErrorToast(
        t('assignments.categories.renameFailed') as string,
        res.error?.message || (t('assignments.categories.unknownError') as string)
      )
      return
    }
    cancelEdit()
    await onChanged()
    showSuccessToast(t('assignments.categories.renamed') as string)
  }

  const requestDelete = (c: ManageableCategory) => {
    setPendingDelete(c)
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    const res = await deleteAssignmentCategory(pendingDelete.id)
    setDeleting(false)
    if (!res.success) {
      showErrorToast(
        t('assignments.categories.deleteFailed') as string,
        res.error?.message || (t('assignments.categories.unknownError') as string)
      )
      setPendingDelete(null)
      return
    }
    const removedId = pendingDelete.id
    setPendingDelete(null)
    setItems(prev => prev.filter(c => c.id !== removedId))
    await onChanged()
    showSuccessToast(t('assignments.categories.deleted') as string)
  }

  const move = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= items.length) return
    // Optimistic swap
    const next = [...items]
    const [moved] = next.splice(index, 1)
    next.splice(targetIndex, 0, moved)
    setItems(next)
    setReordering(true)
    const res = await reorderAssignmentCategories(next.map(c => c.id))
    setReordering(false)
    if (!res.success) {
      showErrorToast(
        t('assignments.categories.reorderFailed') as string,
        res.error?.message || (t('assignments.categories.unknownError') as string)
      )
      // Roll back
      setItems(items)
      return
    }
    await onChanged()
  }

  const busy = creating || savingRename || deleting || reordering

  return (
    <>
      <Modal isOpen={isOpen} onClose={close} size="2xl">
        <div className="flex flex-col flex-1 min-h-0">
          {/* Header */}
          <div className="flex-shrink-0 flex items-center justify-between p-6 pb-4 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {t('assignments.categories.title')}
              </h2>
              {subjectName && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {subjectName}
                </p>
              )}
            </div>
            <button
              onClick={close}
              disabled={busy}
              className="text-gray-500 hover:text-gray-700 disabled:opacity-50 p-1"
              aria-label={t('common.close') as string}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 min-h-0 overflow-y-auto p-6">
            {/* Add new */}
            <div className="flex items-center gap-2 mb-4">
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleCreate()
                  }
                }}
                placeholder={t('assignments.categories.newPlaceholder') as string}
                disabled={creating}
                className="h-10 flex-1"
              />
              <Button
                type="button"
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
              >
                {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                {t('common.add')}
              </Button>
            </div>

            {/* List */}
            {items.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                {t('assignments.categories.empty')}
              </p>
            ) : (
              <div className="space-y-2">
                {items.map((cat, idx) => {
                  const isEditing = editingId === cat.id
                  return (
                    <div
                      key={cat.id}
                      className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg bg-white"
                    >
                      {/* Reorder */}
                      <div className="flex flex-col -space-y-1">
                        <button
                          type="button"
                          onClick={() => move(idx, -1)}
                          disabled={idx === 0 || busy}
                          className="text-gray-400 hover:text-gray-700 disabled:opacity-30 p-0.5"
                          aria-label={t('assignments.categories.moveUp') as string}
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => move(idx, 1)}
                          disabled={idx === items.length - 1 || busy}
                          className="text-gray-400 hover:text-gray-700 disabled:opacity-30 p-0.5"
                          aria-label={t('assignments.categories.moveDown') as string}
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Name (display or edit) */}
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <Input
                            value={editingName}
                            onChange={e => setEditingName(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                saveRename()
                              } else if (e.key === 'Escape') {
                                e.preventDefault()
                                cancelEdit()
                              }
                            }}
                            autoFocus
                            disabled={savingRename}
                            className="h-9"
                          />
                        ) : (
                          <p className="font-medium text-gray-900 truncate">{cat.name}</p>
                        )}
                      </div>

                      {/* Actions */}
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={saveRename}
                            disabled={savingRename || !editingName.trim()}
                          >
                            {savingRename ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={cancelEdit}
                            disabled={savingRename}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => startEdit(cat)}
                            disabled={busy}
                            aria-label={t('common.edit') as string}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => requestDelete(cat)}
                            disabled={busy}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            aria-label={t('common.delete') as string}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 flex items-center justify-end p-6 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={close} disabled={busy}>
              {t('common.close')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation — matches the session template delete modal pattern
          so the visual style is consistent with other destructive confirmations
          in the app (header + body + footer with two flex-1 buttons). */}
      <Modal
        isOpen={pendingDelete !== null}
        onClose={() => !deleting && setPendingDelete(null)}
        size="md"
      >
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex-shrink-0 flex items-center justify-between p-6 pb-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">
              {t('assignments.categories.deleteTitle')}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => !deleting && setPendingDelete(null)}
              disabled={deleting}
              className="p-1"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="p-6">
            <p className="text-sm text-gray-600">
              {pendingDelete
                ? (t('assignments.categories.deleteConfirm', { name: pendingDelete.name }) as string)
                : ''}
            </p>
          </div>

          <div className="flex-shrink-0 flex items-center gap-3 p-6 pt-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => !deleting && setPendingDelete(null)}
              disabled={deleting}
              className="flex-1"
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              onClick={confirmDelete}
              disabled={deleting}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {deleting ? t('common.deleting') : t('common.delete')}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
