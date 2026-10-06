import { dbAdmin } from '@/lib/supabase-admin'

/**
 * Who may READ a camp student's Study results.
 *
 * Owner rule (2026-10-07): "Only camp teachers can see the study results.
 * They should be able to see all information about study mode's
 * assignments as long as the teacher and the student is in the same camp."
 *
 *   camp        = a camp_programs row (one program spans many classrooms)
 *   camp teacher = the teacher_id of a live classroom wired to that
 *                  program, who is an ACTIVE teacher (or manager) of the
 *                  program's academy
 *   same camp   = the student is enrolled in a classroom of that program
 *
 * Academy managers keep read access to their own academy's camps (they
 * run the school and buy the program); see the report for that owner
 * decision. A plain academy teacher with no camp classroom gets nothing,
 * and a camp teacher of program A gets nothing about program B.
 *
 * WHY THE ACADEMY CROSS-CHECKS. `classrooms_teacher_policy` only checks
 * teacher_id = auth.uid() on write, so until migration 122 any teacher
 * could insert a classroom into ANY academy pointing at ANY camp program
 * and enrol any student in it (measured on the live DB 2026-10-07 in a
 * rolled-back transaction). A check of "teaches a classroom of program P"
 * alone would therefore hand program-wide visibility to anyone who forges
 * one row. Every helper here requires the classroom, the program and the
 * caller's membership to agree on one academy, so the forged row reads as
 * nothing even before the migration is applied.
 *
 * Every lookup uses `.limit(1)` and reads `data.length` rather than a
 * head count, so a failed query reads as "no" (fail closed).
 */

export interface CampProgramRef {
  id: string
  academy_id: string
}

export interface CampClassroomRef {
  id?: string
  teacher_id: string | null
  academy_id: string
  camp_program_id?: string | null
}

async function exists(
  query: PromiseLike<{ data: unknown[] | null; error: unknown }>,
): Promise<boolean> {
  const { data, error } = await query
  return !error && Array.isArray(data) && data.length > 0
}

/** An active manager of the academy. */
export async function isActiveAcademyManager(userId: string, academyId: string): Promise<boolean> {
  return exists(
    dbAdmin
      .from('managers')
      .select('user_id')
      .eq('user_id', userId)
      .eq('academy_id', academyId)
      .eq('active', true)
      .limit(1),
  )
}

/** An active teacher of the academy. Deactivated teachers
 *  (teachers.active = false — they no longer count toward seats) lose
 *  camp visibility with everything else. */
export async function isActiveAcademyTeacher(userId: string, academyId: string): Promise<boolean> {
  return exists(
    dbAdmin
      .from('teachers')
      .select('user_id')
      .eq('user_id', userId)
      .eq('academy_id', academyId)
      .eq('active', true)
      .limit(1),
  )
}

/** The live, non-deleted program, or null. */
export async function loadCampProgramRef(programId: string): Promise<CampProgramRef | null> {
  const { data } = await dbAdmin
    .from('camp_programs')
    .select('id, academy_id')
    .eq('id', programId)
    .is('deleted_at', null)
    .maybeSingle()
  return (data as CampProgramRef | null) ?? null
}

/**
 * Is `userId` a camp teacher of this program? Teaches a live classroom
 * of the program that sits in the program's own academy, and is an
 * active teacher or manager of that academy.
 */
export async function isCampTeacherOfProgram(userId: string, program: CampProgramRef): Promise<boolean> {
  const teachesRoom = await exists(
    dbAdmin
      .from('classrooms')
      .select('id')
      .eq('teacher_id', userId)
      .eq('camp_program_id', program.id)
      .eq('academy_id', program.academy_id)
      .is('deleted_at', null)
      .limit(1),
  )
  if (!teachesRoom) return false
  const [teacher, manager] = await Promise.all([
    isActiveAcademyTeacher(userId, program.academy_id),
    isActiveAcademyManager(userId, program.academy_id),
  ])
  return teacher || manager
}

/** Program-wide Study results (overview strip, Students tab). */
export async function canViewProgramResults(userId: string, program: CampProgramRef): Promise<boolean> {
  if (await isActiveAcademyManager(userId, program.academy_id)) return true
  return isCampTeacherOfProgram(userId, program)
}

/**
 * One camp classroom's Study results (dashboard, per-student drill-down,
 * answer review, report view). Allowed for any camp teacher of the
 * classroom's PROGRAM — not only the classroom's own teacher, because
 * the owner's unit is the camp — and for the academy's managers.
 *
 * A classroom whose program belongs to another academy is refused for
 * everyone: that row can only exist through the forgery described above.
 */
export async function canViewClassroomCampResults(
  userId: string,
  classroom: CampClassroomRef,
): Promise<boolean> {
  if (!classroom.camp_program_id) return false
  const program = await loadCampProgramRef(classroom.camp_program_id)
  if (!program || program.academy_id !== classroom.academy_id) return false
  return canViewProgramResults(userId, program)
}

/** Is the student on the academy's own roster? A student enrolled into a
 *  camp classroom from outside the academy is not "in the camp". */
export async function isStudentOfAcademy(studentId: string, academyId: string): Promise<boolean> {
  return exists(
    dbAdmin
      .from('students')
      .select('user_id')
      .eq('user_id', studentId)
      .eq('academy_id', academyId)
      .limit(1),
  )
}

/** Is the student enrolled in any live classroom of the program? */
export async function isStudentInProgram(studentId: string, program: CampProgramRef): Promise<boolean> {
  const { data: rooms, error } = await dbAdmin
    .from('classrooms')
    .select('id')
    .eq('camp_program_id', program.id)
    .eq('academy_id', program.academy_id)
    .is('deleted_at', null)
  if (error || !rooms || rooms.length === 0) return false
  return exists(
    dbAdmin
      .from('classroom_students')
      .select('student_id')
      .eq('student_id', studentId)
      .in('classroom_id', (rooms as Array<{ id: string }>).map(r => r.id))
      .limit(1),
  )
}
