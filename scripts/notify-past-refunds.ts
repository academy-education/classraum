/**
 * Notify the two students whose credits were refunded by an admin on
 * 2026-10-06, before refund notifications existed.
 *
 *   npx tsx scripts/notify-past-refunds.ts          # dry run (default): prints
 *                                                   # recipient (masked), language,
 *                                                   # subject and body; sends nothing
 *   npx tsx scripts/notify-past-refunds.ts --send   # needs migration 121 applied
 *
 * Goes through notifyCreditRefund — the same code as the live admin path —
 * so the claim on study_credit_ledger.refund_notified_at makes a re-run (or
 * an overlap with a live refund) a no-op. Each student gets ONE notice for
 * all of that day's admin refund rows.
 *
 * Students are found by email, then their 2026-10-06 ADMIN refund rows
 * (note 'admin refund by …'); automatic refunds (rollback, reaper) are not
 * announced. The student-facing reasons are written here per language; the
 * ledger's audit note is internal and is never shown.
 */
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })
// .env.local points the app origin at localhost; the mail's link must not.
process.env.AUTH_EMAIL_APP_ORIGIN = 'https://app.classraum.com'

const SEND = process.argv.includes('--send')
const DAY_START = '2026-10-06T00:00:00+09:00'
const DAY_END = '2026-10-07T00:00:00+09:00'

const TARGETS: Array<{ label: string; email: string; expectCredits: number; reason: { ko: string; en: string } }> = [
  {
    label: 'Younhee Lee — SAT R&W pause bug',
    email: 'keekoonom@gmail.com',
    expectCredits: 6,
    reason: {
      ko: '일시정지 기능 오류로 시험 시간이 제대로 주어지지 않았어요(10월 2일에 수정했어요).',
      en: 'A bug with the pause button cut into your test time (fixed on October 2).',
    },
  },
  {
    label: 'Ayoung WON — SSAT essay bug',
    email: 'ayo', // prefix; resolved below to the one matching account
    expectCredits: 12,
    reason: {
      ko: '오류로 쓰기 답안을 제출할 수 없었어요(10월 4일에 수정했어요).',
      en: 'A bug stopped your Writing answer from being submitted (fixed on October 4).',
    },
  },
]

const mask = (e: string) => e.replace(/^(.{2}).*(@.*)$/, '$1***$2')

async function main() {
  const { dbAdmin } = await import('../src/lib/supabase-admin')
  const { notifyCreditRefund } = await import('../src/lib/study/credit-refund-notify')

  console.log(SEND ? '*** SEND MODE ***\n' : 'DRY RUN (pass --send to send)\n')
  let problems = 0

  for (const t of TARGETS) {
    console.log(`=== ${t.label}`)
    // Exact email, or — for the second student — the one 2026-10-06 refund
    // recipient whose address starts with the prefix.
    const exact = t.email.includes('@')
    const { data: users, error: uErr } = exact
      ? await dbAdmin.from('users').select('id, email').eq('email', t.email)
      : await dbAdmin.from('users').select('id, email').ilike('email', `${t.email}%@gmail.com`)
    if (uErr) { console.log(`  ERROR user lookup: ${uErr.message}`); problems++; continue }

    let hit: { id: string; email: string | null; rows: Array<{ id: string; delta: number }> } | null = null
    const candidates: string[] = []
    for (const u of users ?? []) {
      const { data: rows, error } = await dbAdmin.from('study_credit_ledger')
        .select('id, delta')
        .eq('student_id', u.id).eq('kind', 'refund')
        .gte('created_at', DAY_START).lt('created_at', DAY_END)
        .like('note', 'admin refund by %')
      if (error) { console.log(`  ERROR ledger read: ${error.message}`); problems++; continue }
      if (rows && rows.length) { candidates.push(u.id); hit = { id: u.id, email: u.email, rows } }
    }
    if (candidates.length !== 1 || !hit) {
      console.log(`  REFUSING: expected exactly one matching student with admin refunds that day, found ${candidates.length}`)
      problems++
      continue
    }
    const total = hit.rows.reduce((n, r) => n + r.delta, 0)
    console.log(`  student ${hit.id}  ${hit.rows.length} refund rows, ${total} credits`)
    if (total !== t.expectCredits) {
      console.log(`  REFUSING: expected ${t.expectCredits} credits, ledger says ${total}`)
      problems++
      continue
    }

    const { data: sessions } = await dbAdmin.from('study_sessions')
      .select('id, config').eq('student_id', hit.id).order('created_at', { ascending: true })
    const sessionIds = (sessions ?? [])
      .filter(s => {
        const at = (s.config as { credit_refund?: { at?: string } } | null)?.credit_refund?.at
        return !!at && at >= new Date(DAY_START).toISOString() && at < new Date(DAY_END).toISOString()
      })
      .map(s => s.id)
    console.log(`  sessions named: ${sessionIds.length}`)

    const out = await notifyCreditRefund(hit.id, hit.rows.map(r => r.id), t.reason, { sessionIds, dryRun: !SEND })
    if (out.status === 'dry_run' || out.status === 'sent') {
      console.log(`  status:    ${out.status}`)
      console.log(`  to:        ${out.to ? mask(out.to) : '(no usable email — in-app only)'}`)
      console.log(`  language:  ${out.lang}`)
      console.log(`  subject:   ${out.notice.email.subject}`)
      console.log(`  in-app:    ${out.notice.title}`)
      console.log(`             ${out.notice.message}`)
      console.log('  email body:')
      console.log((out.to ? out.notice.email.text.split(out.to).join(mask(out.to)) : out.notice.email.text).split('\n').map(l => `    | ${l}`).join('\n'))
    } else {
      console.log(`  ${out.status}: ${out.reason}`)
      if (out.status === 'failed') problems++
    }
    console.log('')
  }
  if (problems) { console.log(`${problems} problem(s)`); process.exit(1) }
}

main().catch(e => { console.error(e); process.exit(1) })
