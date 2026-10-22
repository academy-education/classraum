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
import { studentExclusions } from '../../src/lib/study/real-attempts'

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

type Snap = { measured: string; sections: Record<string, { value?: number; byPath?: Record<string, number>; atLeast?: boolean }> }

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

  const testUser = new Set(prefs.filter(p => p.is_test_user).map(p => p.student_id))
  const staff = new Set([...managers, ...teachers].map(r => r.user_id))
  const testAcademy = new Set(academies.filter(a => a.is_test).map(a => a.id))
  const inTestAcademy = new Set(students.filter(s => testAcademy.has(s.academy_id)).map(s => s.user_id))
  const suppressed = new Set(suppress.map(s => s.email.trim().toLowerCase()))
  const real = new Map<string, { name: string; email: string }>()
  for (const u of users) {
    const email = (u.email ?? '').trim().toLowerCase()
    const ex = studentExclusions({ id: u.id, role: u.role, isInternal: u.is_internal, isStudyTestUser: testUser.has(u.id), isStaff: staff.has(u.id),
      inTestAcademy: inTestAcademy.has(u.id), emailDomain: email.includes('@') ? email.split('@')[1] : null, emailSuppressed: email !== '' && suppressed.has(email) })
    if (!ex.length) real.set(u.id, { name: u.name ?? '', email })
  }

  const liveBy = new Map<string, string>(); const liveCount = new Map<string, number>()
  const taskOf = new Map(bank.map(b => [b.id, b.task]))
  for (const b of bank.filter(b => b.verified && !b.archived)) { const k = `${b.family}/${b.section}`; liveBy.set(b.id, k); liveCount.set(k, (liveCount.get(k) ?? 0) + 1) }
  const seen = new Map<string, number>() // student|section -> live items seen
  for (const e of exposures) { if (!real.has(e.student_id)) continue; const k = liveBy.get(e.item_id); if (!k) continue; const key = `${e.student_id}|${k}`; seen.set(key, (seen.get(key) ?? 0) + 1) }
  // TOEFL path per session, inferred from the task mix it served (see depth-snapshot.json _paths).
  const perSessTask = new Map<string, Map<string, number>>()
  for (const a of attempts) { if (!a.item_id) continue; const t = taskOf.get(a.item_id); if (!t) continue; if (!perSessTask.has(a.session_id)) perSessTask.set(a.session_id, new Map()); const m = perSessTask.get(a.session_id)!; m.set(t, (m.get(t) ?? 0) + 1) }
  const pathOf = (sid: string, sec: string): 'upper' | 'lower' | null => {
    const m = perSessTask.get(sid); if (!m) return null
    if (sec === 'reading') { const n = m.get('academic_passage') ?? 0; return n > 8 ? 'upper' : n > 0 || (m.get('daily_life') ?? 0) > 0 ? 'lower' : null }
    if (sec === 'listening') { const n = m.get('academic_talk') ?? 0; return n > 4 ? 'upper' : n > 0 || (m.get('announcement') ?? 0) > 0 ? 'lower' : null }
    return null
  }
  const taken = new Map<string, number>(); const routes = new Map<string, Map<string, number>>()
  for (const s of sessions) {
    if (!real.has(s.student_id) || s.mode !== 'full_test' || !s.completed_at) continue
    const fam = s.config?.family, sec = s.config?.section; if (!fam || !sec) continue
    const key = `${s.student_id}|${fam}/${sec}`; taken.set(key, (taken.get(key) ?? 0) + 1)
    if (fam === 'toefl' && s.module2_route && (sec === 'reading' || sec === 'listening')) {
      const p = pathOf(s.id, sec); const combo = p ? `${p}/${s.module2_route}` : `?/${s.module2_route}`
      if (!routes.has(key)) routes.set(key, new Map()); const m = routes.get(key)!; m.set(combo, (m.get(combo) ?? 0) + 1)
    }
  }

  type Row = { who: string; section: string; taken: number; depth: string; left: number | null; unseen: number; live: number; route: string }
  const rows: Row[] = []
  for (const [key, n] of taken) {
    const [sid, section] = key.split('|')
    const ent = snap.sections[section]
    const r = routes.get(key); const route = r ? [...r].sort((a, b) => b[1] - a[1])[0][0] : ''
    let d: number | null = null
    // most frequent path/route; an unknown path falls back to the SMALLEST depth (warn early, never late)
    if (ent?.byPath) d = ent.byPath[route] ?? Math.min(...Object.values(ent.byPath))
    else if (typeof ent?.value === 'number') d = ent.value
    const live = liveCount.get(section) ?? 0
    const unseen = live - (seen.get(key) ?? 0)
    const u = real.get(sid)!
    rows.push({ who: `${u.name || '(no name)'} <${u.email}>`, section, taken: n, route, live, unseen,
      depth: d === null ? 'no measurement' : `${d}${ent?.atLeast ? '+' : ''}`, left: d === null ? null : d - n })
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
