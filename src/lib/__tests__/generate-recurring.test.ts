/** @jest-environment node */
/**
 * Tests for src/lib/payments/generate-recurring.ts — the recurring
 * student invoice generator, extracted out of
 * POST /api/payments/recurring/generate so the daily cron can call it
 * without an internal HTTP hop (which Vercel Deployment Protection was
 * 401ing; see the module header).
 *
 * These pin the BILLING invariants, not the plumbing. Each `it` below
 * was break-tested: the corresponding line in the source was mutated and
 * the named test was confirmed to fail before being restored. A test
 * that would not have failed is not evidence (CLAUDE.md, "break the
 * check").
 *
 * The recurrence arithmetic itself is NOT retested here — it has its own
 * suite (recurrence.test.ts, 32 tests + 11 mutations). What is pinned
 * here is that this module CALLS it and writes what it returns.
 */
import { generateRecurringInvoices } from '@/lib/payments/generate-recurring'
import { dbAdmin } from '@/lib/supabase-admin'
import { tableRouter } from '@/tests/study-route-helpers'
import { readFileSync } from 'fs'
import { join } from 'path'

jest.mock('@/lib/supabase-admin', () => ({
  dbAdmin: { from: jest.fn() },
}))
jest.mock('@/lib/notification-triggers', () => ({
  triggerInvoiceCreatedNotifications: jest.fn(async () => {}),
}))

const fromMock = dbAdmin.from as unknown as jest.Mock

const TODAY = '2026-08-23'

/** A monthly template due today. day_of_month 15 -> next occurrence 2026-09-15. */
function template(over: Record<string, unknown> = {}) {
  return {
    id: 'tpl-1',
    name: 'Tuition A',
    academy_id: 'acad-1',
    amount: 100000,
    is_active: true,
    recurrence_type: 'monthly',
    day_of_month: 15,
    day_of_week: null,
    semester_months: null,
    start_date: '2025-01-15',
    end_date: null,
    next_due_date: '2026-08-15',
    ...over,
  }
}

describe('generateRecurringInvoices', () => {
  let enqueue: ReturnType<typeof tableRouter>

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
    enqueue = tableRouter(fromMock)
  })

  afterEach(() => {
    ;(console.log as jest.Mock).mockRestore()
    ;(console.error as jest.Mock).mockRestore()
  })

  // ── due-template selection ────────────────────────────────────────
  it('exits early without touching any other table when no template is due', async () => {
    enqueue('recurring_payment_templates', { count: 0 })

    const result = await generateRecurringInvoices(TODAY)

    expect(result).toEqual({
      success: true,
      date: TODAY,
      templatesFound: 0,
      templatesProcessed: 0,
      totalInvoicesCreated: 0,
      skipped: true,
      message: 'No templates due today - execution skipped',
    })
    // The whole point of the early exit: exactly ONE query ran.
    expect(fromMock).toHaveBeenCalledTimes(1)
    expect(fromMock).toHaveBeenCalledWith('recurring_payment_templates')
  })

  it('filters due templates on is_active AND next_due_date <= today', async () => {
    const countChain = enqueue('recurring_payment_templates', { count: 1 })
    const listChain = enqueue('recurring_payment_templates', { data: [] })

    await generateRecurringInvoices(TODAY)

    for (const c of [countChain, listChain]) {
      expect(c.eq).toHaveBeenCalledWith('is_active', true)
      expect(c.lte).toHaveBeenCalledWith('next_due_date', TODAY)
    }
  })

  it('throws (does not silently report success) when the template fetch errors', async () => {
    enqueue('recurring_payment_templates', { count: 1 })
    enqueue('recurring_payment_templates', { error: { message: 'connection reset' } })

    await expect(generateRecurringInvoices(TODAY)).rejects.toMatchObject({
      message: 'connection reset',
    })
  })

  // ── the active-student filter ─────────────────────────────────────
  it('invoices only students the students table reports active in the template academy', async () => {
    enqueue('recurring_payment_templates', { count: 1 })
    enqueue('recurring_payment_templates', { data: [template()] })
    enqueue('recurring_payment_template_students', {
      data: [
        { student_id: 'stu-active', amount_override: null },
        { student_id: 'stu-inactive', amount_override: null },
      ],
    })
    const studentsChain = enqueue('students', { data: [{ user_id: 'stu-active' }] })
    enqueue('invoices', { data: [] })
    const insertChain = enqueue('invoices', { data: [{ id: 'inv-1' }] })
    enqueue('recurring_payment_templates', {})

    const result = await generateRecurringInvoices(TODAY)

    expect(studentsChain.eq).toHaveBeenCalledWith('academy_id', 'acad-1')
    expect(studentsChain.eq).toHaveBeenCalledWith('active', true)
    const rows = insertChain.insert.mock.calls[0][0] as Array<{ student_id: string }>
    expect(rows.map(r => r.student_id)).toEqual(['stu-active'])
    expect(result.totalInvoicesCreated).toBe(1)
  })

  it('creates nothing and does not advance the template when no student is active', async () => {
    enqueue('recurring_payment_templates', { count: 1 })
    enqueue('recurring_payment_templates', { data: [template()] })
    enqueue('recurring_payment_template_students', {
      data: [{ student_id: 'stu-inactive', amount_override: null }],
    })
    enqueue('students', { data: [] })

    const result = await generateRecurringInvoices(TODAY)

    expect(result.totalInvoicesCreated).toBe(0)
    expect(result.templatesProcessed).toBe(0)
    // No invoices table access at all, and no template UPDATE.
    expect(fromMock.mock.calls.map(c => c[0])).toEqual([
      'recurring_payment_templates',
      'recurring_payment_templates',
      'recurring_payment_template_students',
      'students',
    ])
  })

  // ── the (template_id, due_date) idempotency filter ────────────────
  it('skips students who already have an invoice for this (template_id, due_date)', async () => {
    enqueue('recurring_payment_templates', { count: 1 })
    enqueue('recurring_payment_templates', { data: [template()] })
    enqueue('recurring_payment_template_students', {
      data: [
        { student_id: 'stu-1', amount_override: null },
        { student_id: 'stu-2', amount_override: null },
      ],
    })
    enqueue('students', { data: [{ user_id: 'stu-1' }, { user_id: 'stu-2' }] })
    // stu-1 was invoiced by an interrupted earlier run.
    const existingChain = enqueue('invoices', { data: [{ student_id: 'stu-1' }] })
    const insertChain = enqueue('invoices', { data: [{ id: 'inv-2' }] })
    enqueue('recurring_payment_templates', {})

    const result = await generateRecurringInvoices(TODAY)

    // The guard is scoped to BOTH the template and the period.
    expect(existingChain.eq).toHaveBeenCalledWith('template_id', 'tpl-1')
    expect(existingChain.eq).toHaveBeenCalledWith('due_date', '2026-08-15')

    const rows = insertChain.insert.mock.calls[0][0] as Array<{ student_id: string }>
    expect(rows.map(r => r.student_id)).toEqual(['stu-2'])
    expect(result.totalInvoicesCreated).toBe(1)
  })

  it('rolls the template forward without inserting when EVERY student is already invoiced', async () => {
    enqueue('recurring_payment_templates', { count: 1 })
    enqueue('recurring_payment_templates', { data: [template()] })
    enqueue('recurring_payment_template_students', {
      data: [{ student_id: 'stu-1', amount_override: null }],
    })
    enqueue('students', { data: [{ user_id: 'stu-1' }] })
    enqueue('invoices', { data: [{ student_id: 'stu-1' }] })
    const updateChain = enqueue('recurring_payment_templates', {})

    const result = await generateRecurringInvoices(TODAY)

    expect(result.totalInvoicesCreated).toBe(0)
    // Counted as processed, because the period IS done for this template.
    expect(result.templatesProcessed).toBe(1)
    expect(updateChain.update).toHaveBeenCalledWith({ next_due_date: '2026-09-15' })
    expect(updateChain.eq).toHaveBeenCalledWith('id', 'tpl-1')
    // Exactly one invoices access: the existence check, no insert.
    expect(fromMock.mock.calls.filter(c => c[0] === 'invoices')).toHaveLength(1)
  })

  // ── invoice rows + next_due_date advance ──────────────────────────
  it('writes academy_id, invoice_name, the period due_date and the override amount', async () => {
    enqueue('recurring_payment_templates', { count: 1 })
    enqueue('recurring_payment_templates', { data: [template()] })
    enqueue('recurring_payment_template_students', {
      data: [
        { student_id: 'stu-1', amount_override: null },
        { student_id: 'stu-2', amount_override: 55000 },
      ],
    })
    enqueue('students', { data: [{ user_id: 'stu-1' }, { user_id: 'stu-2' }] })
    enqueue('invoices', { data: [] })
    const insertChain = enqueue('invoices', { data: [{ id: 'a' }, { id: 'b' }] })
    enqueue('recurring_payment_templates', {})

    await generateRecurringInvoices(TODAY)

    const rows = insertChain.insert.mock.calls[0][0] as Array<Record<string, unknown>>
    expect(rows).toHaveLength(2)
    for (const r of rows) {
      // NOT NULL with no default — omitting either rejected every row for
      // ten months and the cron reported success anyway.
      expect(r.academy_id).toBe('acad-1')
      expect(r.invoice_name).toBe('Tuition A')
      // The period being billed, NOT the advanced date.
      expect(r.due_date).toBe('2026-08-15')
      expect(r.template_id).toBe('tpl-1')
      expect(r.status).toBe('pending')
    }
    expect(rows[0].amount).toBe(100000)
    expect(rows[0].final_amount).toBe(100000)
    expect(rows[1].amount).toBe(55000)
    expect(rows[1].final_amount).toBe(55000)
  })

  it('advances next_due_date to the next occurrence after invoicing', async () => {
    enqueue('recurring_payment_templates', { count: 1 })
    enqueue('recurring_payment_templates', { data: [template()] })
    enqueue('recurring_payment_template_students', {
      data: [{ student_id: 'stu-1', amount_override: null }],
    })
    enqueue('students', { data: [{ user_id: 'stu-1' }] })
    enqueue('invoices', { data: [] })
    enqueue('invoices', { data: [{ id: 'inv-1' }] })
    const updateChain = enqueue('recurring_payment_templates', {})

    const result = await generateRecurringInvoices(TODAY)

    expect(updateChain.update).toHaveBeenCalledWith({ next_due_date: '2026-09-15' })
    expect(updateChain.eq).toHaveBeenCalledWith('id', 'tpl-1')
    expect(result.templatesProcessed).toBe(1)
    expect(result.errors).toBeUndefined()
  })

  it('invoices ONE period per run even for a template overdue by months', async () => {
    // next_due_date in Jan; a run must emit that period only and move to
    // the next FUTURE occurrence — not loop through every missed month.
    enqueue('recurring_payment_templates', { count: 1 })
    enqueue('recurring_payment_templates', { data: [template({ next_due_date: '2026-01-15' })] })
    enqueue('recurring_payment_template_students', {
      data: [{ student_id: 'stu-1', amount_override: null }],
    })
    enqueue('students', { data: [{ user_id: 'stu-1' }] })
    enqueue('invoices', { data: [] })
    const insertChain = enqueue('invoices', { data: [{ id: 'inv-1' }] })
    const updateChain = enqueue('recurring_payment_templates', {})

    const result = await generateRecurringInvoices(TODAY)

    const rows = insertChain.insert.mock.calls[0][0] as Array<Record<string, unknown>>
    expect(rows).toHaveLength(1)
    expect(rows[0].due_date).toBe('2026-01-15')
    expect(result.totalInvoicesCreated).toBe(1)
    expect(updateChain.update).toHaveBeenCalledWith({ next_due_date: '2026-09-15' })
  })

  // ── partial-failure reporting ─────────────────────────────────────
  it('reports a failed insert in errors[] and does NOT advance that template', async () => {
    enqueue('recurring_payment_templates', { count: 1 })
    enqueue('recurring_payment_templates', { data: [template()] })
    enqueue('recurring_payment_template_students', {
      data: [{ student_id: 'stu-1', amount_override: null }],
    })
    enqueue('students', { data: [{ user_id: 'stu-1' }] })
    enqueue('invoices', { data: [] })
    enqueue('invoices', { error: { message: 'null value in column "academy_id"' } })
    enqueue('managers', { data: [{ user_id: 'mgr-1' }] })
    const notifyChain = enqueue('notifications', {})

    const result = await generateRecurringInvoices(TODAY)

    expect(result.totalInvoicesCreated).toBe(0)
    expect(result.templatesProcessed).toBe(0)
    expect(result.errors).toEqual(['Template Tuition A: null value in column "academy_id"'])
    // next_due_date must NOT move: the period was never billed.
    expect(fromMock.mock.calls.filter(c => c[0] === 'recurring_payment_templates')).toHaveLength(2)
    // The manager is told, because nothing else would tell them.
    expect(notifyChain.insert).toHaveBeenCalled()
  })

  it('keeps invoicing later templates after an earlier one fails', async () => {
    const a = template({ id: 'tpl-a', name: 'Alpha' })
    const b = template({ id: 'tpl-b', name: 'Beta' })
    enqueue('recurring_payment_templates', { count: 2 })
    enqueue('recurring_payment_templates', { data: [a, b] })
    // Alpha: student fetch fails outright.
    enqueue('recurring_payment_template_students', { error: { message: 'boom' } })
    // Beta: normal path.
    enqueue('recurring_payment_template_students', {
      data: [{ student_id: 'stu-1', amount_override: null }],
    })
    enqueue('students', { data: [{ user_id: 'stu-1' }] })
    enqueue('invoices', { data: [] })
    enqueue('invoices', { data: [{ id: 'inv-1' }] })
    enqueue('recurring_payment_templates', {})
    enqueue('managers', { data: [] })

    const result = await generateRecurringInvoices(TODAY)

    expect(result.errors).toEqual(['Template Alpha: boom'])
    expect(result.templatesProcessed).toBe(1)
    expect(result.totalInvoicesCreated).toBe(1)
    expect(result.templatesFound).toBe(2)
  })

  it('reports a failed roll-forward in errors[] rather than swallowing it', async () => {
    // Everyone already invoiced, and the bump fails. Silence here means
    // the template matches "due today" on every run forever.
    enqueue('recurring_payment_templates', { count: 1 })
    enqueue('recurring_payment_templates', { data: [template()] })
    enqueue('recurring_payment_template_students', {
      data: [{ student_id: 'stu-1', amount_override: null }],
    })
    enqueue('students', { data: [{ user_id: 'stu-1' }] })
    enqueue('invoices', { data: [{ student_id: 'stu-1' }] })
    enqueue('recurring_payment_templates', { error: { message: 'update denied' } })
    enqueue('managers', { data: [] })

    const result = await generateRecurringInvoices(TODAY)

    expect(result.errors).toEqual(['Template Tuition A roll-forward: update denied'])
    expect(result.templatesProcessed).toBe(0)
  })

  it('omits errors[] entirely on a fully clean run (so the cron reports ok)', async () => {
    enqueue('recurring_payment_templates', { count: 1 })
    enqueue('recurring_payment_templates', { data: [template()] })
    enqueue('recurring_payment_template_students', {
      data: [{ student_id: 'stu-1', amount_override: null }],
    })
    enqueue('students', { data: [{ user_id: 'stu-1' }] })
    enqueue('invoices', { data: [] })
    enqueue('invoices', { data: [{ id: 'inv-1' }] })
    enqueue('recurring_payment_templates', {})

    const result = await generateRecurringInvoices(TODAY)

    expect('errors' in result && result.errors !== undefined).toBe(false)
    expect(Array.isArray(result.errors) ? result.errors : []).toHaveLength(0)
  })
})

/**
 * The regression that started all this: the cron reaching the work by
 * fetching its own deployment URL, which Vercel Deployment Protection
 * 401'd. Nothing about that failure is visible in a unit test of the
 * generator, so pin the shape of the caller instead.
 */
describe('the cron does not call the app over HTTP to run its own code', () => {
  const cron = readFileSync(
    join(process.cwd(), 'src/app/api/cron/recurring-payments/route.ts'),
    'utf8',
  )
  // Strip comments — the header explains the removed fetch by name.
  const code = cron.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

  it('imports the generator directly instead of fetching the generate route', () => {
    expect(code).toContain("from '@/lib/payments/generate-recurring'")
    expect(code).toMatch(/generateRecurringInvoices\s*\(/)
  })

  it('makes no outbound request and never derives its own origin', () => {
    expect(code).not.toMatch(/\bfetch\s*\(/)
    expect(code).not.toContain('nextUrl.origin')
    expect(code).not.toContain('/api/payments/recurring/generate')
  })
})
