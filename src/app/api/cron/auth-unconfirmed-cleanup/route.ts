import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { verifyCronAuth } from '@/lib/cron-auth'
import { recordHeartbeat } from '@/lib/ops/heartbeat'
import { isDeletableUnconfirmed } from '@/lib/auth/unconfirmed-cleanup'

/**
 * Daily: delete password accounts that never confirmed their email and
 * never signed in, once they are older than the grace period. Selection is
 * in lib/auth/unconfirmed-cleanup.ts (tested); this route only pages
 * through auth.users and deletes.
 *
 * public.users has no FK to auth.users, so the public row is deleted first
 * (its cascades take preferences, the free subscription, device tokens),
 * then the auth user. Capped per run; the cap is reported.
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 60
const MAX_PER_RUN = 100

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const started = Date.now()
  let scanned = 0, deleted = 0, capped = false
  const failures: string[] = []
  try {
    const now = new Date()
    for (let page = 1; ; page++) {
      const { data, error } = await dbAdmin.auth.admin.listUsers({ page, perPage: 1000 })
      if (error) throw new Error(`listUsers page ${page}: ${error.message}`)
      scanned += data.users.length
      for (const u of data.users) {
        if (!isDeletableUnconfirmed(u, now)) continue
        if (deleted >= MAX_PER_RUN) { capped = true; break }
        const { error: pubErr } = await dbAdmin.from('users').delete().eq('id', u.id)
        if (pubErr) { failures.push(`${u.id}: users ${pubErr.message}`); continue }
        const { error: authErr } = await dbAdmin.auth.admin.deleteUser(u.id)
        if (authErr) { failures.push(`${u.id}: auth ${authErr.message}`); continue }
        deleted++
      }
      if (capped || data.users.length < 1000) break
    }
    const ok = failures.length === 0
    await recordHeartbeat('auth-unconfirmed-cleanup', { ok, detail: { scanned, deleted, capped, failures: failures.slice(0, 10) } }, Date.now() - started)
    return NextResponse.json({ ok, scanned, deleted, capped, failures })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    await recordHeartbeat('auth-unconfirmed-cleanup', { ok: false, detail: { scanned, deleted, message } }, Date.now() - started)
    return NextResponse.json({ ok: false, message }, { status: 500 })
  }
}
