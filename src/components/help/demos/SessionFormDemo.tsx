"use client"

import { useMemo } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { SessionFormModal } from '@/components/ui/sessions/SessionFormModal'
import { getSimpleClassrooms, getTeachers } from './sample-data'
import { NonFunctional } from './NonFunctional'

/**
 * Live preview of SessionFormModal (Add Session). Stubbed with sample
 * classrooms and teachers that swap names with the active language.
 */

export function SessionFormDemo() {
  const { language } = useTranslation()
  const classrooms = useMemo(() => getSimpleClassrooms(language), [language])
  const teachers = useMemo(() => getTeachers(language), [language])
  return (
    <NonFunctional>
      <SessionFormModal
        isOpen
        inline
        onClose={() => undefined}
        onSave={() => undefined}
        session={null}
        classrooms={classrooms}
        teachers={teachers}
      />
    </NonFunctional>
  )
}
