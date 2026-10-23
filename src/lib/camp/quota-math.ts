/**
 * What a camp build costs in question quota.
 *
 * The program quota is charged PER ASSIGNMENT, not per student
 * (docs/CAMP-MODE-PLAN.md: "quota counts PER ASSIGNMENT (not x
 * students)"). An assignment built for several classrooms at once is one
 * assignment per classroom, so it costs `count x classrooms`, whatever
 * the rosters hold. The builder modal and POST /api/camp/assignments both
 * call this, so the number a teacher is shown is the number charged.
 *
 * Client-safe: no server imports.
 */
export function campQuotaCost(questionCount: number, classroomCount: number): number {
  if (!Number.isInteger(questionCount) || questionCount < 0) return 0
  if (!Number.isInteger(classroomCount) || classroomCount < 0) return 0
  return questionCount * classroomCount
}
