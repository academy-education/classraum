/**
 * real-difficulty.ts — item difficulty from REAL students only, and the items
 * whose observed difficulty contradicts their label.
 *
 *   npx tsx scripts/study-bank/real-difficulty.ts                       # counts + report (read-only)
 *   npx tsx scripts/study-bank/real-difficulty.ts --out report.md       # also write markdown
 *   npx tsx scripts/study-bank/real-difficulty.ts --modes full_test,practice --min-n 30
 *   npx tsx scripts/study-bank/real-difficulty.ts --items sat           # per-item lines for a family
 *
 * READ ONLY. It never relabels anything: the contradiction list is for the
 * owner to decide on. Run it monthly or whenever the counts matter.
 *
 * What counts as a real attempt is defined, with reasons, in
 * src/lib/study/real-attempts.ts. Below --min-n (default 30, the same
 * threshold study_item_calibration uses) an item prints "not enough data",
 * never a number: a p-value over six students is a confident wrong number
 * standing in for an honest estimate.
 *
 * Emails are read (service role) only to take the DOMAIN and to match the
 * suppression list; no address is printed.
 *
 * First exposure reads study_item_exposures.first_seen_at /
 * first_seen_session_id (migration 126). Before 126 is applied those columns
 * do not exist and the script REFUSES, unless you pass --pre-126, which uses
 * seen_at / session_id (the LATEST serve) and says so in the report header.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import {
  selectRealAttempts, itemStats, contradictions, formatStat, studentExclusions,
  DEFAULT_MIN_N, type AttemptRow, type SessionRow, type ExposureRow, type StudentExclusion,
} from '../../src/lib/study/real-attempts'

function loadEnv(): Record<string, string> {
  const raw = readFileSync(process.cwd() + '/.env.local', 'utf8')
  return Object.fromEntries(raw.split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
}

/** Page a whole table on a total order and assert the count. */
async function pageAll<T>(db: SupabaseClient, table: string, select: string, order = 'id'): Promise<T[]> {
  const { count, error: ce } = await db.from(table).select('*', { count: 'exact', head: true })
  if (ce || typeof count !== 'number') throw new Error(`${table}: count failed (${ce?.message ?? 'no count'})`)
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(table).select(select).order(order).range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...((data ?? []) as T[]))
    if (!data || data.length < 1000) break
  }
  if (out.length !== count) throw new Error(`${table}: read ${out.length} rows, count says ${count} — refusing a partial read`)
  return out
}

const arg = (name: string) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : undefined }

async function main() {
  if (!existsSync('.env.local')) { console.error('run from the repo root (.env.local not found)'); process.exit(1) }
  const env = loadEnv()
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const minN = Number(arg('--min-n') ?? DEFAULT_MIN_N)
  const modes = (arg('--modes') ?? 'full_test').split(',').map(s => s.trim()).filter(Boolean)
  const pre126 = process.argv.includes('--pre-126')
  {
    const { error } = await db.from('study_item_exposures').select('first_seen_at,first_seen_session_id').limit(1)
    if (error && !pre126) {
      console.error(`REFUSING: study_item_exposures.first_seen_at is not readable (${error.message}).`)
      console.error('Apply migration 126, or pass --pre-126 to measure first exposure from seen_at (the latest serve).')
      process.exit(2)
    }
    if (!error && pre126) { console.error('REFUSING: --pre-126 given but migration 126 is applied; drop the flag.'); process.exit(2) }
  }
  if (!Number.isFinite(minN) || minN < 2) { console.error('REFUSING: --min-n must be a number >= 2'); process.exit(2) }

  const [users, prefs, managers, teachers, students, academies, suppress, sessions, attempts, exposures, bank, payments] = await Promise.all([
    pageAll<{ id: string; role: string | null; is_internal: boolean; email: string | null }>(db, 'users', 'id,role,is_internal,email'),
    pageAll<{ student_id: string; is_test_user: boolean }>(db, 'study_user_prefs', 'student_id,is_test_user', 'student_id'),
    pageAll<{ user_id: string }>(db, 'managers', 'user_id', 'user_id'),
    pageAll<{ user_id: string }>(db, 'teachers', 'user_id', 'user_id'),
    pageAll<{ user_id: string; academy_id: string }>(db, 'students', 'user_id,academy_id', 'user_id'),
    pageAll<{ id: string; is_test: boolean }>(db, 'academies', 'id,is_test'),
    pageAll<{ email: string }>(db, 'email_suppressions', 'email', 'email'),
    pageAll<{ id: string; student_id: string; status: string | null; mode: string | null; completed_at: string | null; ended_reason: string | null; config: Record<string, unknown> | null }>(db, 'study_sessions', 'id,student_id,status,mode,completed_at,ended_reason,config'),
    pageAll<{ id: string; session_id: string; item_id: string | null; is_correct: boolean | null; created_at: string }>(db, 'study_attempts', 'id,session_id,item_id,is_correct,created_at'),
    pageAll<{ id: string; student_id: string; item_id: string; first_session_id: string | null; first_seen_at: string }>(db, 'study_item_exposures',
      pre126 ? 'id,student_id,item_id,first_session_id:session_id,first_seen_at:seen_at' : 'id,student_id,item_id,first_session_id:first_seen_session_id,first_seen_at'),
    pageAll<{ id: string; family: string; section: string; domain: string; difficulty: string; archived: boolean; verified: boolean }>(db, 'study_item_bank', 'id,family,section,domain,difficulty,archived,verified'),
    pageAll<{ payment_id: string; student_id: string; refunded_at: string | null; receipt_held_reason: string | null }>(db, 'study_payments', 'payment_id,student_id,refunded_at,receipt_held_reason', 'payment_id'),
  ])

  // ── students ──
  const testUser = new Set(prefs.filter(p => p.is_test_user).map(p => p.student_id))
  const staff = new Set([...managers, ...teachers].map(r => r.user_id))
  const testAcademy = new Set(academies.filter(a => a.is_test).map(a => a.id))
  const inTestAcademy = new Set(students.filter(s => testAcademy.has(s.academy_id)).map(s => s.user_id))
  const suppressed = new Set(suppress.map(s => s.email.trim().toLowerCase()))
  const reasons = new Map<string, StudentExclusion[]>()
  for (const u of users) {
    const email = (u.email ?? '').trim().toLowerCase()
    reasons.set(u.id, studentExclusions({
      id: u.id, role: u.role, isInternal: u.is_internal, isStudyTestUser: testUser.has(u.id),
      isStaff: staff.has(u.id), inTestAcademy: inTestAcademy.has(u.id),
      emailDomain: email.includes('@') ? email.split('@')[1] : null,
      emailSuppressed: email !== '' && suppressed.has(email),
    }))
  }
  const excluded = new Set([...reasons].filter(([, r]) => r.length > 0).map(([id]) => id))

  const sessRows: SessionRow[] = sessions.map(s => ({
    id: s.id, studentId: s.student_id, status: s.status, mode: s.mode, completedAt: s.completed_at,
    endedReason: s.ended_reason, camp: !!(s.config && typeof s.config === 'object' && s.config.campAssignmentId),
  }))
  const attRows: AttemptRow[] = attempts.map(a => ({ id: a.id, sessionId: a.session_id, itemId: a.item_id, isCorrect: a.is_correct, createdAt: a.created_at }))
  const expRows: ExposureRow[] = exposures.map(e => ({ studentId: e.student_id, itemId: e.item_id, firstSessionId: e.first_session_id, firstSeenAt: e.first_seen_at }))

  const { kept, dropped, total } = selectRealAttempts(attRows, sessRows, expRows, excluded, { modes })
  const bankBy = new Map(bank.map(b => [b.id, b]))
  const famOf = (itemId: string) => { const b = bankBy.get(itemId); return b ? `${b.family}/${b.section}` : '(not in bank)' }

  // Section score context: every answered attempt in a session that passed the
  // session-level rules (real student, completed, mode, not app_exited).
  const sessOk = new Set(sessRows.filter(s => !excluded.has(s.studentId) && s.status === 'completed' && s.completedAt
    && modes.includes(s.mode ?? '') && s.endedReason !== 'app_exited').map(s => s.id))
  const sessionAnswers = new Map<string, Array<{ itemId: string; correct: boolean }>>()
  for (const a of [...attRows].sort((x, y) => x.createdAt.localeCompare(y.createdAt))) {
    if (!a.itemId || a.isCorrect === null || !sessOk.has(a.sessionId)) continue
    ;(sessionAnswers.get(a.sessionId) ?? sessionAnswers.set(a.sessionId, []).get(a.sessionId)!).push({ itemId: a.itemId, correct: a.isCorrect })
  }
  const stats = itemStats(kept, sessionAnswers, minN)
  const labels = new Map(bank.map(b => [b.id, b.difficulty]))
  const contra = contradictions(stats, labels)

  // ── report ──
  const lines: string[] = []
  const p = (s = '') => { lines.push(s); console.log(s) }
  p(`# Real-student difficulty — ${new Date().toISOString().slice(0, 10)}`)
  p('')
  p(`Modes counted: ${modes.join(', ')} · minimum n per item: ${minN} · source rows read in full (counts asserted)`)
  if (pre126) p('PRE-126: first exposure measured from seen_at/session_id (the LATEST serve) — migration 126 is not applied.')
  p('')
  p('## Students')
  const studentsWithAttempts = new Set(sessRows.filter(s => attRows.some(a => a.sessionId === s.id)).map(s => s.studentId))
  const byReason = new Map<string, number>()
  for (const id of studentsWithAttempts) for (const r of reasons.get(id) ?? ['(no users row)' as StudentExclusion]) byReason.set(r, (byReason.get(r) ?? 0) + 1)
  const realStudents = [...studentsWithAttempts].filter(id => !excluded.has(id) && reasons.has(id))
  p(`${studentsWithAttempts.size} accounts have any attempt; ${realStudents.length} pass every student-level rule.`)
  // Evidence, not a rule: a paid, unrefunded, unheld charge is the strongest
  // sign an account is a person. Not used to include or exclude anyone.
  const paid = new Set(payments.filter(x => !x.refunded_at && !x.receipt_held_reason).map(x => x.student_id))
  p(`Of those ${realStudents.length}, ${realStudents.filter(id => paid.has(id)).length} have a paid, unrefunded, unheld Study charge (evidence only; not a filter).`)
  p('Exclusion reasons among them (an account can carry several):')
  for (const [r, n] of [...byReason].sort((a, b) => b[1] - a[1])) p(`  ${r.padEnd(20)} ${n}`)
  p('')
  p('## Attempts')
  p(`${total} attempt rows. Each is dropped for its FIRST failing rule:`)
  for (const [r, n] of Object.entries(dropped)) p(`  ${r.padEnd(20)} ${n}`)
  p(`  ${'KEPT (real)'.padEnd(20)} ${kept.length}`)
  p(`  check: ${Object.values(dropped).reduce((a, b) => a + b, 0) + kept.length} = ${total}`)
  p('')
  p('## Real attempts per family (today)')
  const fam = new Map<string, { n: number; students: Set<string>; items: Set<string>; camp: number }>()
  for (const a of kept) {
    const k = famOf(a.itemId)
    const e = fam.get(k) ?? fam.set(k, { n: 0, students: new Set(), items: new Set(), camp: 0 }).get(k)!
    e.n++; e.students.add(a.studentId); e.items.add(a.itemId); if (a.camp) e.camp++
  }
  p(`  ${'family/section'.padEnd(26)} ${'attempts'.padStart(9)} ${'students'.padStart(9)} ${'items'.padStart(7)} ${'camp'.padStart(6)} ${`items n>=${minN}`.padStart(12)}`)
  const famKeys = [...new Set(bank.filter(b => b.verified && !b.archived).map(b => `${b.family}/${b.section}`)), ...fam.keys()]
  for (const k of [...new Set(famKeys)].sort()) {
    const e = fam.get(k)
    const enough = e ? [...e.items].filter(i => stats.get(i)?.enough).length : 0
    p(`  ${k.padEnd(26)} ${String(e?.n ?? 0).padStart(9)} ${String(e?.students.size ?? 0).padStart(9)} ${String(e?.items.size ?? 0).padStart(7)} ${String(e?.camp ?? 0).padStart(6)} ${String(enough).padStart(12)}`)
  }
  const enoughTotal = [...stats.values()].filter(s => s.enough).length
  p('')
  p(`Items with at least ${minN} real first-exposure attempts: ${enoughTotal} of ${stats.size} items ever answered by a real student.`)
  const maxN = Math.max(0, ...[...stats.values()].map(s => s.n))
  p(`Most-answered item has n=${maxN}.`)
  p('')
  p('## Label contradictions (labelled hard but p > 0.80, labelled easy but p < 0.30)')
  if (!enoughTotal) p(`None can be computed: no item has ${minN} real attempts yet. This is "not enough data", not "no contradictions".`)
  else if (!contra.length) p(`No contradiction among the ${enoughTotal} items with enough data.`)
  else for (const c of contra) {
    const b = bankBy.get(c.itemId)
    p(`  ${c.kind.padEnd(24)} ${c.itemId}  ${b?.family}/${b?.section}/${b?.domain}  label=${c.label}  p=${c.p.toFixed(2)} n=${c.n}  ${c.discrimination === null ? 'r n/a' : `r=${c.discrimination.toFixed(2)}`}`)
  }
  p('')
  p('Caveat for SAT: module 2 is routed, so hard-module items are seen mostly by stronger students; a raw p on them is inflated. Compare within route before relabelling.')
  p('Nothing above relabels anything.')

  const itemsFam = arg('--items')
  if (itemsFam) {
    p('')
    p(`## Per-item (${itemsFam})`)
    for (const s of [...stats.values()].filter(s => bankBy.get(s.itemId)?.family === itemsFam).sort((a, b) => b.n - a.n)) {
      p(`  ${s.itemId}  label=${labels.get(s.itemId)}  ${formatStat(s, minN)}`)
    }
  }

  const out = arg('--out')
  if (out) { writeFileSync(out, lines.join('\n') + '\n'); console.log(`\nwrote ${out}`) }
}

main().catch(e => { console.error(e); process.exit(1) })
