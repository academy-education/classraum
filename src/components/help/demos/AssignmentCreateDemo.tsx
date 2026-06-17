"use client"

import { useState } from 'react'
import { AssignmentCreateEditModal } from '@/components/ui/assignments/modals/AssignmentCreateEditModal'
import type { Session, AttachmentFile } from '@/components/ui/assignments/hooks/useAssignmentsData'
import { NonFunctional } from './NonFunctional'

/**
 * Live preview of AssignmentCreateEditModal. Used for both the
 * "Assignments" article (edit-session-assignments) and the "Exams"
 * article (exams-builder) — exams are assignments with assignment_type:
 * 'test', so the same modal serves both flows.
 *
 * The `assignmentType` prop lets the caller seed the type so the Exams
 * demo opens with assignment_type='test' already selected.
 */

const SAMPLE_SESSIONS: Session[] = [
  {
    id: 'demo-sess-1',
    classroom_name: 'Grade 4 Math',
    classroom_id: 'demo-c1',
    date: '2026-03-14',
    start_time: '16:00',
    end_time: '17:30',
  },
  {
    id: 'demo-sess-2',
    classroom_name: 'Grade 5 English',
    classroom_id: 'demo-c2',
    date: '2026-03-15',
    start_time: '17:30',
    end_time: '19:00',
  },
  {
    id: 'demo-sess-3',
    classroom_name: 'SAT Prep',
    classroom_id: 'demo-c3',
    date: '2026-03-16',
    start_time: '18:00',
    end_time: '20:00',
  },
]

const SAMPLE_CATEGORIES = [
  { id: 'cat1', name: 'Practice' },
  { id: 'cat2', name: 'Test prep' },
  { id: 'cat3', name: 'Reading' },
]

interface Props {
  assignmentType?: 'quiz' | 'homework' | 'test' | 'project'
  title?: string
}

export function AssignmentCreateDemo({ assignmentType = 'homework', title = 'Worksheet 4A — fractions' }: Props) {
  const [formData, setFormData] = useState({
    classroom_session_id: 'demo-sess-1',
    title,
    description: 'Complete questions 1–10 from the worksheet. Show your work for partial credit.',
    assignment_type: assignmentType,
    due_date: '2026-03-16',
    assignment_categories_id: 'cat1',
  })
  const [attachmentFiles, setAttachmentFiles] = useState<AttachmentFile[]>([])
  const [showInlineCategoryCreate, setShowInlineCategoryCreate] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [activeDatePicker, setActiveDatePicker] = useState<string | null>(null)

  const formatDate = (s: string) => {
    if (!s) return ''
    const [y, m, d] = s.split('-').map(Number)
    return `${m}/${d}/${y}`
  }

  return (
    <NonFunctional>
      <AssignmentCreateEditModal
        isOpen
        inline
        onClose={() => undefined}
        editingAssignment={null}
        formData={formData}
        setFormData={setFormData}
        attachmentFiles={attachmentFiles}
        setAttachmentFiles={setAttachmentFiles}
        sessions={SAMPLE_SESSIONS}
        isManager
        isCreating={false}
        isSaving={false}
        editModalLoading={false}
        showInlineCategoryCreate={showInlineCategoryCreate}
        setShowInlineCategoryCreate={setShowInlineCategoryCreate}
        newCategoryName={newCategoryName}
        setNewCategoryName={setNewCategoryName}
        isCreatingCategory={false}
        getFilteredCategories={() => SAMPLE_CATEGORIES}
        handleCreateCategory={() => undefined}
        handleSubmit={e => e.preventDefault()}
        formatDate={formatDate}
        activeDatePicker={activeDatePicker}
        setActiveDatePicker={setActiveDatePicker}
        isFormValid
      />
    </NonFunctional>
  )
}

export function ExamCreateDemo() {
  return <AssignmentCreateDemo assignmentType="test" title="Midterm — Algebra" />
}
