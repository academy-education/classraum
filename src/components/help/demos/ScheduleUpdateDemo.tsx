"use client"

import { ScheduleUpdateModal } from '@/components/ui/classrooms/ScheduleUpdateModal'
import type { ClassroomSchedule } from '@/lib/schedule-updates'
import { NonFunctional } from './NonFunctional'

/**
 * Live preview of ScheduleUpdateModal — the warning that appears when
 * you change a classroom's schedule and the system needs to know how to
 * apply the change to existing sessions. Stub data shows the canonical
 * Mon 4:00 PM → 4:30 PM example.
 */

const OLD_SCHEDULE: ClassroomSchedule = {
  id: 'demo-sch-old',
  classroom_id: 'demo-c1',
  day: 'Monday',
  start_time: '16:00',
  end_time: '17:30',
}

const NEW_SCHEDULE: Partial<ClassroomSchedule> = {
  day: 'Monday',
  start_time: '16:30',
  end_time: '18:00',
}

export function ScheduleUpdateDemo() {
  return (
    <NonFunctional>
      <ScheduleUpdateModal
        isOpen
        inline
        onClose={() => undefined}
        oldSchedule={OLD_SCHEDULE}
        newSchedule={NEW_SCHEDULE}
        onConfirm={async () => undefined}
      />
    </NonFunctional>
  )
}
