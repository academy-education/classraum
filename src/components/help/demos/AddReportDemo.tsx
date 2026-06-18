"use client"

import { useMemo } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { AddReportModal } from '@/components/ui/reports/AddReportModal'
import { getReportStudents } from './sample-data'
import { NonFunctional } from './NonFunctional'

/**
 * Live preview of AddReportModal. The modal calls fetchStudentClassrooms
 * when a student is selected — we stub it as a no-op so nothing fires.
 * Sample students swap names with the active language.
 */

export function AddReportDemo() {
  const { language } = useTranslation()
  const students = useMemo(() => getReportStudents(language), [language])
  return (
    <NonFunctional>
      <AddReportModal
        isOpen
        inline
        onClose={() => undefined}
        onSave={async () => ({ success: true })}
        students={students}
        fetchStudentClassrooms={() => undefined}
      />
    </NonFunctional>
  )
}
