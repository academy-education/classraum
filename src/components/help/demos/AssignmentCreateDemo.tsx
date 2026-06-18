"use client"

import { useMemo, useState } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { AssignmentCreateEditModal } from '@/components/ui/assignments/modals/AssignmentCreateEditModal'
import type { Session, AttachmentFile } from '@/components/ui/assignments/hooks/useAssignmentsData'
import { getClassrooms } from './sample-data'
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

interface Props {
  assignmentType?: 'quiz' | 'homework' | 'test' | 'project'
  title?: string
}

export function AssignmentCreateDemo({ assignmentType = 'homework', title }: Props) {
  const { language } = useTranslation()

  // Sessions derive from the localized classroom dataset so the
  // dropdown reads natively in whichever language the user is on.
  const sessions: Session[] = useMemo(() => {
    const c = getClassrooms(language)
    return [
      { id: 'demo-sess-1', classroom_name: c[0].name, classroom_id: 'demo-c1', date: '2026-03-14', start_time: '16:00', end_time: '17:30' },
      { id: 'demo-sess-2', classroom_name: c[1].name, classroom_id: 'demo-c2', date: '2026-03-15', start_time: '17:30', end_time: '19:00' },
      { id: 'demo-sess-3', classroom_name: c[2].name, classroom_id: 'demo-c3', date: '2026-03-16', start_time: '18:00', end_time: '20:00' },
    ]
  }, [language])

  const categories = useMemo(() => (
    language === 'korean'
      ? [{ id: 'cat1', name: '연습' }, { id: 'cat2', name: '시험 대비' }, { id: 'cat3', name: '독해' }]
      : [{ id: 'cat1', name: 'Practice' }, { id: 'cat2', name: 'Test prep' }, { id: 'cat3', name: 'Reading' }]
  ), [language])

  const seedTitle = title ?? (language === 'korean' ? '워크시트 4A — 분수' : 'Worksheet 4A — fractions')
  const seedDescription = language === 'korean'
    ? '워크시트 1–10번 문제를 풀어주세요. 부분 점수를 위해 풀이 과정을 적어주세요.'
    : 'Complete questions 1–10 from the worksheet. Show your work for partial credit.'

  const [formData, setFormData] = useState({
    classroom_session_id: 'demo-sess-1',
    title: seedTitle,
    description: seedDescription,
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
        sessions={sessions}
        isManager
        isCreating={false}
        isSaving={false}
        editModalLoading={false}
        showInlineCategoryCreate={showInlineCategoryCreate}
        setShowInlineCategoryCreate={setShowInlineCategoryCreate}
        newCategoryName={newCategoryName}
        setNewCategoryName={setNewCategoryName}
        isCreatingCategory={false}
        getFilteredCategories={() => categories}
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
  const { language } = useTranslation()
  const title = language === 'korean' ? '중간고사 — 대수학' : 'Midterm — Algebra'
  return <AssignmentCreateDemo assignmentType="test" title={title} />
}
