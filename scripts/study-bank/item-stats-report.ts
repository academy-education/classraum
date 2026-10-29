/**
 * item-stats-report.ts — per-item statistics from REAL student attempts, with flags for items that
 * behave badly (top students miss, a distractor beats the key, implausibly fast correct answers…).
 * Reports only; never edits, hides or releases an item. See ITEM-STATS.md.
 *
 *   npx tsx scripts/study-bank/item-stats-report.ts [--section isee/reading] [--min-n 30] [--json]
 *                                                    [--include-internal]   (debug only)
 *
 * Internal accounts (users.is_internal) and study test users (study_user_prefs.is_test_user) are
 * excluded before anything is computed. Every table is paged past PostgREST's 1000-row cap and the
 * attempt total is asserted against an exact count — a truncated read exits non-zero.
 */
import { dbAdmin } from '@/lib/supabase-admin'
import { computeItemStats, type AttemptRow, type ItemMeta } from '@/lib/study/item-stats'

const args = process.argv.slice(2)
const flag = (k: string) => args.includes(k)
const val = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined }
const section = val('--section')
const minN = val('--min-n') ? Number(val('--min-n')) : 30
const includeInternal = flag('--include-internal')
const asJson = flag('--json')
if (!Number.isFinite(minN) || minN < 1) { console.error('--min-n must be a positive number'); process.exit(2) }

const PAGE = 1000
async function pageAll<T>(label: string, build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1)
    if (error) throw new Error(`${label}: ${error.message}`)
    out.push(...(data ?? []))
    if (!data || data.length < PAGE) break
  }
  return out
}

async function main() {
  const { count: attemptTotal, error: cErr } = await dbAdmin.from('study_attempts').select('id', { count: 'exact', head: true }).not('item_id', 'is', null)
  if (cErr || attemptTotal == null) throw new Error(`attempt count: ${cErr?.message ?? 'no count'}`)

  type RawAttempt = { id: string; session_id: string; item_id: string; student_answer: string | null; is_correct: boolean | null; time_spent_seconds: number | null; created_at: string }
  const raw = await pageAll<RawAttempt>('study_attempts', (f, t) =>
    dbAdmin.from('study_attempts').select('id, session_id, item_id, student_answer, is_correct, time_spent_seconds, created_at')
      .not('item_id', 'is', null).order('id').range(f, t))
  if (raw.length !== attemptTotal) {
    console.error(`REFUSING: read ${raw.length} attempts but the table holds ${attemptTotal} — the read was truncated`)
    process.exit(1)
  }

  const sessions = await pageAll<{ id: string; student_id: string }>('study_sessions', (f, t) =>
    dbAdmin.from('study_sessions').select('id, student_id').order('id').range(f, t))
  const studentOf = new Map(sessions.map(s => [s.id, s.student_id]))

  const internal = await pageAll<{ id: string }>('users.is_internal', (f, t) =>
    dbAdmin.from('users').select('id').eq('is_internal', true).order('id').range(f, t))
  const testUsers = await pageAll<{ student_id: string }>('study_user_prefs.is_test_user', (f, t) =>
    dbAdmin.from('study_user_prefs').select('student_id').eq('is_test_user', true).order('student_id').range(f, t))
  const excluded = new Set<string>([...internal.map(u => u.id), ...testUsers.map(u => u.student_id)])

  // Unscored rows (is_correct null: open responses, unscored pilots) are not item-analysis input.
  let unscored = 0, noSession = 0
  const attempts: AttemptRow[] = []
  for (const a of raw) {
    if (a.is_correct == null) { unscored++; continue }
    const sid = studentOf.get(a.session_id)
    if (!sid) { noSession++; continue }
    attempts.push({ itemId: a.item_id, studentId: sid, sessionId: a.session_id, answer: a.student_answer, isCorrect: a.is_correct, timeSec: a.time_spent_seconds, createdAt: a.created_at })
  }

  const ids = [...new Set(attempts.map(a => a.itemId))]
  const meta = new Map<string, ItemMeta>()
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200)
    const { data, error } = await dbAdmin.from('study_item_bank').select('id, family, section, item').in('id', chunk)
    if (error) throw new Error(`study_item_bank: ${error.message}`)
    for (const r of data ?? []) {
      const it = (r.item ?? {}) as { correct_answer?: unknown; choices?: unknown; passage?: unknown }
      const sec = `${r.family}/${r.section}`
      if (section && sec !== section) continue
      const choices = Array.isArray(it.choices) ? (it.choices as unknown[]).map(c => (typeof c === 'string' ? c : (c as { text?: string })?.text ?? '')).filter(Boolean) : null
      meta.set(r.id, { id: r.id, section: sec, key: typeof it.correct_answer === 'string' ? it.correct_answer : null, choices, hasPassage: typeof it.passage === 'string' && it.passage.trim().length > 0 })
    }
  }

  const input = section ? attempts.filter(a => meta.has(a.itemId)) : attempts
  if (!input.length) { console.error(`REFUSING: no scored attempts${section ? ` in ${section}` : ''} to analyse`); process.exit(1) }
  const report = computeItemStats(input, meta, { excludedStudentIds: includeInternal ? new Set() : excluded, minN })

  if (asJson) { console.log(JSON.stringify({ includeInternal, unscored, noSession, attemptTotal, ...report }, null, 2)); return }

  if (includeInternal) console.log('!!! --include-internal: INTERNAL AND TEST ACCOUNTS ARE COUNTED. Debug only; these numbers are NOT evidence. !!!\n')
  console.log(`attempts read ${raw.length} (= exact count ${attemptTotal}) | unscored skipped ${unscored} | no session ${noSession}`)
  console.log(`excluded accounts: ${includeInternal ? 'NONE (debug)' : `${report.studentsExcluded} students, ${report.attemptsExcludedAccounts} attempts`} | repeat attempts dropped ${report.repeatAttemptsDropped} | no bank row ${report.attemptsWithoutMeta}`)
  console.log(`counted: ${report.attemptsCounted} first attempts by ${report.studentsCounted} students over ${report.itemsSeen} items | items with n >= ${minN}: ${report.itemsAtMinN}`)

  const bySec = new Map<string, { items: number; atMin: number; flagged: number; n: number }>()
  for (const s of report.items) {
    const b = bySec.get(s.section) ?? { items: 0, atMin: 0, flagged: 0, n: 0 }
    b.items++; b.n += s.n; if (s.n >= minN) b.atMin++; if (s.flags.length) b.flagged++
    bySec.set(s.section, b)
  }
  console.log('\nsection                        items  attempts  n>=min  flagged')
  for (const [sec, b] of [...bySec].sort((a, b) => b[1].n - a[1].n)) {
    console.log(`${sec.padEnd(30)} ${String(b.items).padStart(5)} ${String(b.n).padStart(9)} ${String(b.atMin).padStart(7)} ${String(b.flagged).padStart(8)}`)
  }
  const flagged = report.items.filter(s => s.flags.length)
  if (!flagged.length) {
    console.log(`\nno item flagged${report.itemsAtMinN === 0 ? ` — no item has ${minN}+ real first attempts yet, so there is nothing to measure` : ''}`)
    return
  }
  console.log(`\nflagged items (${flagged.length}), highest severity first:`)
  for (const s of flagged) {
    console.log(`  ${s.itemId}  ${s.section}  n=${s.n} p=${s.pValue.toFixed(2)} rpb=${s.pointBiserial?.toFixed(2) ?? '—'} D=${s.discriminationIndex?.toFixed(2) ?? '—'}`)
    for (const f of s.flags) console.log(`      [${f.severity}] ${f.code}: ${f.reason}`)
  }
}
main().catch(e => { console.error(e); process.exit(1) })
