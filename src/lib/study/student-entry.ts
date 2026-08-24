"use client"

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { readStoredMode } from './currentMode'

export type StudentEntryTarget = '/mobile/study' | '/mobile' | '/mobile/start'

/**
 * Where a student lands when they enter the app.
 *
 * ONE implementation, called by both entry routers ((app)/home and the
 * post-login redirect in /auth). They had two copies of this ladder and
 * the copies had already diverged elsewhere in the same function — the
 * camp-only branch for managers/teachers exists in /home and not in
 * /auth — so a third rule was not going to be added twice by hand.
 *
 * The ladder:
 *   no academy         → Study. Self-serve signup; the Grades tile is an
 *                        empty dead end for them.
 *   stored mode        → that mode. An explicit past choice wins over
 *                        every default below.
 *   camp-only academy  → Study. `academies.camp_only` (migration 087)
 *                        means the school runs camps and no curriculum:
 *                        there is no academy homework, no report cards
 *                        and no grade average behind the Grades tile,
 *                        and the student's actual work — the camp
 *                        assignments — is delivered as study sessions.
 *                        Managers and teachers of such a school are
 *                        already routed to /camp-program for the same
 *                        reason; this is the student's equivalent.
 *   otherwise          → the Grades/Study chooser, on a true first visit.
 *
 * A student in a camp-only academy AND an ordinary one gets the chooser,
 * not Study: they really do have both kinds of work.
 */
export async function studentEntryTarget(
  db: SupabaseClient<Database>,
  userId: string,
): Promise<StudentEntryTarget> {
  const { data: memberships } = await db
    .from('students')
    .select('academy_id')
    .eq('user_id', userId)
    .eq('active', true)

  const academyIds = [...new Set((memberships ?? []).map(m => m.academy_id as string))]
  if (academyIds.length === 0) return '/mobile/study'

  const stored = readStoredMode()
  if (stored) return stored === 'study' ? '/mobile/study' : '/mobile'

  const { data: academies } = await db
    .from('academies')
    .select('id, camp_only')
    .in('id', academyIds)

  // `academies.length > 0` guards the vacuous-truth case: a failed or
  // empty read must fall through to the chooser, not silently reroute
  // every first-visit student to Study.
  const campOnly = (academies?.length ?? 0) > 0
    && (academies ?? []).every(a => a.camp_only === true)

  return campOnly ? '/mobile/study' : '/mobile/start'
}
