import type { ClassroomCampData } from '@/lib/camp/reports'

/**
 * Restrict one classroom's camp data to the students who are really in
 * the camp: enrolled in the classroom AND on the academy's own roster.
 *
 * classroom_students writes were not academy-checked before migration
 * 122, so a student from outside the school can sit in a camp
 * classroom's roster. /api/camp/student already refuses them; the
 * program-wide lists must drop them too, or their names, scores and
 * sessions leak into the Students tab and the overview numbers.
 *
 * Pure (type-only import), so routes can use it while their tests mock
 * the loader module.
 */
export function restrictToStudents(data: ClassroomCampData, allowed: Set<string>): ClassroomCampData {
  const keep = (id: string) => allowed.has(id)
  return {
    ...data,
    studentIds: data.studentIds.filter(keep),
    sessionByKey: new Map([...data.sessionByKey].filter(([, s]) => keep(s.student_id))),
    skillsByStudent: new Map([...data.skillsByStudent].filter(([id]) => keep(id))),
    accuracyByStudent: new Map([...data.accuracyByStudent].filter(([id]) => keep(id))),
  }
}
