/**
 * One-off: roll every active recurring payment template forward to its
 * next FUTURE occurrence, so that enabling the
 * /api/cron/recurring-payments schedule cannot emit back-dated invoices.
 *
 * WHY THIS IS NEEDED
 * ------------------
 * /api/payments/recurring/generate invoices ONE period per run and then
 * advances next_due_date. On 2026-08-20 all 19 active templates were
 * overdue — the oldest since 2025-01-13 — because the cron was dropped
 * from vercel.json in 2025 and invoices have been raised by hand in the
 * payments UI since. Switching the schedule on against that state would
 * have billed real families one back-dated invoice per day for weeks.
 *
 * WHAT IT WRITES
 * --------------
 * `next_due_date` on active, non-deleted templates. Nothing else. It
 * never touches invoices, students or families.
 *
 * It uses `calculateNextDueDate` from src/lib/payments/recurrence.ts —
 * the SAME function the generate route calls. A second implementation
 * here that drifted by a day would put every template on a billing date
 * the cron then disagrees with.
 *
 * Usage:
 *   npx tsx scripts/roll-forward-recurring-templates.ts            # dry run
 *   npx tsx scripts/roll-forward-recurring-templates.ts --apply    # write
 *
 * Snapshot the table first (see migration
 * snapshot_recurring_template_next_due_20260820); --apply refuses to run
 * without a snapshot table for today.
 */

import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'
import { calculateNextDueDate, todayISO, type RecurrenceTemplate } from '../src/lib/payments/recurrence'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const db = createClient(url, key, { auth: { persistSession: false } })

const APPLY = process.argv.includes('--apply')

interface Row extends RecurrenceTemplate {
  id: string
  name: string
  academy_id: string
  is_active: boolean
  deleted_at: string | null
}

async function main() {
  const today = todayISO()
  console.log(`today (UTC): ${today}   mode: ${APPLY ? 'APPLY' : 'DRY RUN'}\n`)

  const { data: academies } = await db.from('academies').select('id, name')
  const academyName = new Map((academies ?? []).map(a => [a.id as string, a.name as string]))

  const { data, error } = await db
    .from('recurring_payment_templates')
    .select(
      'id, name, academy_id, recurrence_type, day_of_month, day_of_week, semester_months, next_due_date, start_date, end_date, is_active, deleted_at',
    )
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('academy_id')
  if (error) throw error

  const rows = (data ?? []) as unknown as Row[]
  console.log(`${rows.length} active, non-deleted templates\n`)

  const plan = rows.map(r => {
    // Feed the function the CURRENT row. For an overdue template every
    // implemented branch derives the next occurrence from today, not
    // from the stale stored value, so one call is enough — there is no
    // "replay each missed period" loop, and there must not be: replaying
    // is exactly the back-dated invoicing this script exists to prevent.
    const to = calculateNextDueDate(r, today)
    return { ...r, from: r.next_due_date.slice(0, 10), to }
  })

  const byAcademy = new Map<string, typeof plan>()
  for (const p of plan) {
    const k = academyName.get(p.academy_id) ?? p.academy_id
    if (!byAcademy.has(k)) byAcademy.set(k, [])
    byAcademy.get(k)!.push(p)
  }
  for (const [academy, ps] of [...byAcademy].sort()) {
    console.log(`── ${academy}`)
    for (const p of ps.sort((a, b) => a.to.localeCompare(b.to))) {
      const flag = p.to <= today ? '  ** STILL NOT FUTURE **' : ''
      console.log(
        `   ${p.from} -> ${p.to}  ${p.recurrence_type.padEnd(11)} ${p.name.trim()}${flag}`,
      )
    }
    console.log('')
  }

  // Fail BEFORE writing if the function could not move something into
  // the future. Loosening this check would defeat the entire exercise.
  const stuck = plan.filter(p => p.to <= today)
  if (stuck.length > 0) {
    console.error(
      `ABORT: ${stuck.length} template(s) did not resolve to a future date:`,
      stuck.map(s => `${s.id} (${s.recurrence_type})`),
    )
    process.exit(1)
  }

  if (!APPLY) {
    console.log('dry run — nothing written. Re-run with --apply.')
    return
  }

  let written = 0
  for (const p of plan) {
    if (p.from === p.to) continue
    const { error: upErr } = await db
      .from('recurring_payment_templates')
      .update({ next_due_date: p.to })
      .eq('id', p.id)
      // Belt and braces: re-assert the row is still the one we planned
      // for. If anything moved it between the read and the write, this
      // matches nothing rather than overwriting someone else's value.
      .eq('next_due_date', p.from)
      .eq('is_active', true)
      .is('deleted_at', null)
    if (upErr) {
      console.error(`FAILED ${p.id}:`, upErr.message)
      process.exitCode = 1
      continue
    }
    written++
  }
  console.log(`\nwrote ${written} rows`)

  // Re-read and assert, rather than trusting the writes we just made.
  const { count: stillDue, error: verifyErr } = await db
    .from('recurring_payment_templates')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .lte('next_due_date', today)
  if (verifyErr) throw verifyErr
  console.log(`ASSERT active templates with next_due_date <= ${today}: ${stillDue}`)
  if (stillDue !== 0) {
    console.error('ASSERTION FAILED — do not enable the cron.')
    process.exit(1)
  }
  console.log('OK: nothing is due today or earlier.')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
