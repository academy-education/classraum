"use client"

import { AddReportModal } from '@/components/ui/reports/AddReportModal'
import type { Student } from '@/hooks/useReports'
import { NonFunctional } from './NonFunctional'

/**
 * Live preview of AddReportModal. The modal calls fetchStudentClassrooms
 * when a student is selected — we stub it as a no-op so nothing fires.
 */

const SAMPLE_STUDENTS: Student[] = [
  { user_id: 'demo-stu1', name: 'Alice Park', email: 'alice@example.com', school_name: 'Daewon Elementary' },
  { user_id: 'demo-stu2', name: 'Brian Cho', email: 'brian@example.com', school_name: 'Seoul Foreign' },
  { user_id: 'demo-stu3', name: 'Chloe Lim', email: 'chloe@example.com', school_name: 'Daewon Elementary' },
]

export function AddReportDemo() {
  return (
    <NonFunctional>
      <AddReportModal
        isOpen
        inline
        onClose={() => undefined}
        onSave={async () => ({ success: true })}
        students={SAMPLE_STUDENTS}
        fetchStudentClassrooms={() => undefined}
      />
    </NonFunctional>
  )
}
