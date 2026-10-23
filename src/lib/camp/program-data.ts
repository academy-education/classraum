import { loadClassroomCampData, type ClassroomCampData } from '@/lib/camp/reports'
import { studentsOfAcademy } from '@/lib/camp/access'
import { restrictToStudents } from '@/lib/camp/roster'

/**
 * Load every classroom of a program for the program-wide routes (overview, Students tab), IN PARALLEL.
 *
 * They used to await each classroom in turn, so the page waited for the sum of every room's reads; with
 * Promise.all it waits for the slowest one. Each room is restricted to students who are enrolled there AND on the
 * academy's own roster (the rule /api/camp/student applies to one student).
 *
 * Returns rooms in the input order, or the first loader error. A thrown read error propagates (a 500), never an
 * empty room.
 */
export async function loadProgramRooms(
  rooms: Array<{ id: string; name: string }>,
  programId: string,
  academyId: string,
): Promise<{ rooms: Array<{ id: string; name: string; data: ClassroomCampData }> } | { error: string }> {
  const loaded = await Promise.all(rooms.map(async room => {
    const data = await loadClassroomCampData({ id: room.id, name: room.name, camp_program_id: programId })
    if ('error' in data) return { room, error: data.error }
    const onRoster = await studentsOfAcademy(data.studentIds, academyId)
    return { room, data: restrictToStudents(data, onRoster) }
  }))
  const failed = loaded.find((r): r is { room: typeof rooms[number]; error: string } => 'error' in r)
  if (failed) return { error: failed.error }
  return {
    rooms: loaded.map(r => ({ id: r.room.id, name: r.room.name, data: (r as { data: ClassroomCampData }).data })),
  }
}
