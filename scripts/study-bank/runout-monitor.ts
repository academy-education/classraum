#!/usr/bin/env tsx
/**
 * runout-monitor.ts — which REAL students are about to run out of unseen questions?
 *
 *   npx tsx scripts/study-bank/runout-monitor.ts [--warn 2] [--all]
 *
 * For every real student (studentExclusions from src/lib/study/real-attempts.ts: internal, study test
 * users, admins, staff, test academies, demo domain and suppressed addresses are excluded) and every
 * section they have taken, it reports:
 *   tests taken   completed full_test sessions for that family/section
 *   depth         clean tests before a repeat, read from depth-snapshot.json (MEASURED by the depth
 *                 scripts; this script never estimates depth). TOEFL Listening/Reading use the
 *                 student's most frequent module-2 route.
 *   left          depth - tests taken
 *   unseen        live questions in that section the student has never been served
 * and FLAGS any row with left <= --warn (default 2). A section with no snapshot entry prints
 * "no measurement" instead of a number (CLAUDE.md: a check that cannot read its input must not
 * return a number). It refuses on a partial read of any table.
 *
 * Output goes to stdout only (it names students); do not commit its output.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'node:fs'
import {
  realStudentIds, taskMixBySession, toeflPathFromTaskMix, tallyFullTests, studentSectionRows, type DepthSnapshot,
} from '../../src/lib/study/bank-usage'

function loadEnv(): Record<string, string> {
  return Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]))
}
async function pageAll<T>(db: SupabaseClient, table: string, select: string, order = 'id', filter?: (q: any) => any): Promise<T[]> {
  const base = () => { let q: any = db.from(table); return q }
  let cq: any = base().select('*', { count: 'exact', head: true }); if (filter) cq = filter(cq)
  const { count, error: ce } = await cq
  if (ce || typeof count !== 'number') throw new Error(`${table}: count failed (${ce?.message ?? 'no count'})`)
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    let q: any = base().select(select).order(order).range(from, from + 999); if (filter) q = filter(q)
    const { data, error } = await q
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...((data ?? []) as T[]))
    if (!data || data.length < 1000) break
  }
  if (out.length !== count) throw new Error(`${table}: read ${out.length} rows, count says ${count} — refusing a partial read`)
  return out
}
const arg = (n: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined }

type Snap = DepthSnapshot

async function main() {
  if (!existsSync('.env.local')) { console.error('run from the repo root'); process.exit(1) }
  const WARN = Number(arg('--warn') ?? 2)
  const ALL = process.argv.includes('--all')
  const snap: Snap = JSON.parse(readFileSync(new URL('./depth-snapshot.json', import.meta.url), 'utf8'))
  const ageDays = (Date.now() - Date.parse(snap.measured)) / 864e5
  const env = loadEnv()
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

  const [users, prefs, managers, teachers, students, academies, suppress, sessions, exposures, bank] = await Promise.all([
    pageAll<{ id: string; role: string | null; is_internal: boolean; email: string | null; name: string | null }>(db, 'users', 'id,role,is_internal,email,name'),
    pageAll<{ student_id: string; is_test_user: boolean }>(db, 'study_user_prefs', 'student_id,is_test_user', 'student_id'),
    pageAll<{ user_id: string }>(db, 'managers', 'user_id', 'user_id'),
    pageAll<{ user_id: string }>(db, 'teachers', 'user_id', 'user_id'),
    pageAll<{ user_id: string; academy_id: string }>(db, 'students', 'user_id,academy_id', 'user_id'),
    pageAll<{ id: string; is_test: boolean }>(db, 'academies', 'id,is_test'),
    pageAll<{ email: string }>(db, 'email_suppressions', 'email', 'email'),
    pageAll<{ id: string; student_id: string; mode: string | null; completed_at: string | null; module2_route: string | null; config: any }>(db, 'study_sessions', 'id,student_id,mode,completed_at,module2_route,config'),
    pageAll<{ id: string; student_id: string; item_id: string }>(db, 'study_item_exposures', 'id,student_id,item_id'),
    pageAll<{ id: string; family: string; section: string; task: string | null; verified: boolean; archived: boolean }>(db, 'study_item_bank', 'id,family,section,task,verified,archived'),
  ])
  const attempts = await pageAll<{ id: string; session_id: string; item_id: string | null }>(db, 'study_attempts', 'id,session_id,item_id')

  // Real-student rule, path inference, the tally and the depth arithmetic are
  // src/lib/study/bank-usage.ts — shared with /api/admin/bank-qc/usage, so the
  // admin page and this script cannot disagree about who counts.
  const realIds = realStudentIds(users, { prefs, managers, teachers, students, academies, suppressions: suppress })
  const real = new Map<string, { name: string; email: string }>()
  for (const u of users) if (realIds.has(u.id)) real.set(u.id, { name: u.name ?? '', email: (u.email ?? '').trim().toLowerCase() })

  const liveBy = new Map<string, string>(); const liveCount = new Map<string, number>()
  const taskOf = new Map(bank.map(b => [b.id, b.task]))
  for (const b of bank.filter(b => b.verified && !b.archived)) { const k = `${b.family}/${b.section}`; liveBy.set(b.id, k); liveCount.set(k, (liveCount.get(k) ?? 0) + 1) }
  const seen = new Map<string, number>() // student|section -> live items seen
  for (const e of exposures) { if (!real.has(e.student_id)) continue; const k = liveBy.get(e.item_id); if (!k) continue; const key = `${e.student_id}|${k}`; seen.set(key, (seen.get(key) ?? 0) + 1) }
  // TOEFL path per session, inferred from the task mix it served (see depth-snapshot.json _paths).
  const perSessTask = taskMixBySession(attempts, taskOf)
  const pathOf = (sid: string, sec: string) => toeflPathFromTaskMix(perSessTask.get(sid), sec)
  const tally = tallyFullTests(sessions, realIds, pathOf)

  type Row = { who: string; section: string; taken: number; depth: string; left: number | null; unseen: number; live: number; route: string }
  const rows: Row[] = []
  for (const r of studentSectionRows(tally, snap)) {
    const ent = snap.sections[r.section]
    const live = liveCount.get(r.section) ?? 0
    const unseen = live - (seen.get(`${r.studentId}|${r.section}`) ?? 0)
    const u = real.get(r.studentId)!
    rows.push({ who: `${u.name || '(no name)'} <${u.email}>`, section: r.section, taken: r.taken, route: r.route, live, unseen,
      depth: r.depth === null ? 'no measurement' : `${r.depth}${ent?.atLeast ? '+' : ''}`, left: r.left })
  }
  rows.sort((a, b) => (a.left ?? 999) - (b.left ?? 999) || a.unseen - b.unseen)
  const flagged = rows.filter(r => r.left !== null && r.left <= WARN)
  console.log(`runout-monitor: ${real.size} real students; ${rows.length} student-section rows; depth snapshot ${snap.measured} (${ageDays.toFixed(0)} days old${ageDays > 14 ? ' - STALE, re-run the depth scripts' : ''})`)
  console.log(`FLAGGED (<= ${WARN} clean tests left): ${flagged.length}`)
  const show = ALL ? rows : rows.filter(r => r.left === null || r.left <= WARN + 2)
  for (const r of show) console.log(`  ${r.left === null ? '  ?' : String(r.left).padStart(3)} left  ${r.section.padEnd(20)} taken ${String(r.taken).padStart(2)} / depth ${r.depth.padEnd(3)}${r.route ? ` (${r.route})` : ''}  unseen ${r.unseen}/${r.live}  ${r.who}`)
  if (!ALL) console.log(`  (rows with more than ${WARN + 2} tests left hidden; --all shows every row)`)
}
main().catch(e => { console.error('REFUSING: ' + e.message); process.exit(2) })
