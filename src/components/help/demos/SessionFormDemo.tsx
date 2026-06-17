"use client"

import { SessionFormModal } from '@/components/ui/sessions/SessionFormModal'
import { NonFunctional } from './NonFunctional'

/**
 * Live preview of SessionFormModal (Add Session). Stubbed with two
 * sample classrooms and a couple of teachers so the dropdowns show
 * realistic choices.
 */

const SAMPLE_CLASSROOMS = [
  { id: 'demo-c1', name: 'Grade 4 Math', color: '#3b82f6' },
  { id: 'demo-c2', name: 'Grade 5 English', color: '#f59e0b' },
  { id: 'demo-c3', name: 'SAT Prep', color: '#10b981' },
]

const SAMPLE_TEACHERS = [
  { id: 'demo-t1', name: 'Ms. Kim', user_id: 'demo-u1' },
  { id: 'demo-t2', name: 'Mr. Park', user_id: 'demo-u2' },
  { id: 'demo-t3', name: 'Ms. Lee', user_id: 'demo-u3' },
]

export function SessionFormDemo() {
  return (
    <NonFunctional>
      <SessionFormModal
        isOpen
        inline
        onClose={() => undefined}
        onSave={() => undefined}
        session={null}
        classrooms={SAMPLE_CLASSROOMS}
        teachers={SAMPLE_TEACHERS}
      />
    </NonFunctional>
  )
}
