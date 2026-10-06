/**
 * Shared seed for the camp visibility tests. Lives outside __tests__/ on
 * purpose (jest collects every file there). One academy with two camps, a plain teacher, a
 * deactivated camp teacher, a manager, and a second academy whose
 * teacher forges a camp classroom (the pre-migration-122 write gap).
 */
export const ACAD = 'acad-x'
export const OTHER_ACAD = 'acad-y'

export const SAT_CAMP = 'prog-sat'
export const TOEFL_CAMP = 'prog-toefl'
export const OTHER_ACAD_CAMP = 'prog-y'

export const T_ROOM_A = 'teacher-sat-a'        // camp teacher, SAT camp, room A
export const T_ROOM_B = 'teacher-sat-b'        // camp teacher, SAT camp, room B
export const T_TOEFL = 'teacher-toefl'         // camp teacher of a DIFFERENT camp
export const T_PLAIN = 'teacher-plain'         // regular academy teacher, no camp room
export const T_INACTIVE = 'teacher-gone'       // deactivated, still teacher_id on a SAT room
export const T_STRANGER = 'teacher-stranger'   // teacher of the OTHER academy only
export const MANAGER = 'manager-x'
export const OTHER_MANAGER = 'manager-y'

export const ROOM_A = 'room-a'
export const ROOM_B = 'room-b'
export const ROOM_TOEFL = 'room-toefl'
export const ROOM_PLAIN = 'room-plain'
export const ROOM_GONE = 'room-gone'
/** Forged: in academy X, wired to the SAT camp, taught by a stranger. */
export const ROOM_FORGED_IN_X = 'room-forged-x'
/** Forged: in academy Y, wired to academy X's SAT camp. */
export const ROOM_FORGED_IN_Y = 'room-forged-y'

export const STUDENT_A = 'student-a'           // in room A, on academy X roster
export const STUDENT_TOEFL = 'student-toefl'   // in the TOEFL room
export const STUDENT_OUTSIDER = 'student-out'  // enrolled in room A, but NOT on academy X's roster

export function campSeed(): Record<string, Record<string, unknown>[]> {
  return {
    camp_programs: [
      { id: SAT_CAMP, academy_id: ACAD, deleted_at: null },
      { id: TOEFL_CAMP, academy_id: ACAD, deleted_at: null },
      { id: OTHER_ACAD_CAMP, academy_id: OTHER_ACAD, deleted_at: null },
    ],
    classrooms: [
      { id: ROOM_A, name: 'A', teacher_id: T_ROOM_A, academy_id: ACAD, camp_program_id: SAT_CAMP, deleted_at: null },
      { id: ROOM_B, name: 'B', teacher_id: T_ROOM_B, academy_id: ACAD, camp_program_id: SAT_CAMP, deleted_at: null },
      { id: ROOM_TOEFL, name: 'T', teacher_id: T_TOEFL, academy_id: ACAD, camp_program_id: TOEFL_CAMP, deleted_at: null },
      { id: ROOM_PLAIN, name: 'P', teacher_id: T_PLAIN, academy_id: ACAD, camp_program_id: null, deleted_at: null },
      { id: ROOM_GONE, name: 'G', teacher_id: T_INACTIVE, academy_id: ACAD, camp_program_id: SAT_CAMP, deleted_at: null },
      { id: ROOM_FORGED_IN_X, name: 'FX', teacher_id: T_STRANGER, academy_id: ACAD, camp_program_id: SAT_CAMP, deleted_at: null },
      { id: ROOM_FORGED_IN_Y, name: 'FY', teacher_id: T_STRANGER, academy_id: OTHER_ACAD, camp_program_id: SAT_CAMP, deleted_at: null },
    ],
    teachers: [
      { user_id: T_ROOM_A, academy_id: ACAD, active: true },
      { user_id: T_ROOM_B, academy_id: ACAD, active: true },
      { user_id: T_TOEFL, academy_id: ACAD, active: true },
      { user_id: T_PLAIN, academy_id: ACAD, active: true },
      { user_id: T_INACTIVE, academy_id: ACAD, active: false },
      { user_id: T_STRANGER, academy_id: OTHER_ACAD, active: true },
    ],
    managers: [
      { user_id: MANAGER, academy_id: ACAD, active: true },
      { user_id: OTHER_MANAGER, academy_id: OTHER_ACAD, active: true },
    ],
    students: [
      { user_id: STUDENT_A, academy_id: ACAD },
      { user_id: STUDENT_TOEFL, academy_id: ACAD },
      { user_id: STUDENT_OUTSIDER, academy_id: OTHER_ACAD },
    ],
    classroom_students: [
      { classroom_id: ROOM_A, student_id: STUDENT_A },
      { classroom_id: ROOM_TOEFL, student_id: STUDENT_TOEFL },
      { classroom_id: ROOM_A, student_id: STUDENT_OUTSIDER },
    ],
  }
}
