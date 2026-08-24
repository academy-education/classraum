import { dbAdmin } from '@/lib/supabase-admin'
import { triggerInvoiceCreatedNotifications } from '@/lib/notification-triggers'
import { calculateNextDueDate, todayISO, type RecurrenceTemplate } from '@/lib/payments/recurrence'

/**
 * Recurring student invoice generation — the actual work.
 *
 * This used to be the body of POST /api/payments/recurring/generate, and
 * the daily cron (`/api/cron/recurring-payments`) reached it by doing
 * `fetch(req.nextUrl.origin + '/api/payments/recurring/generate')` — the
 * app calling itself over the public internet purely to run a function.
 *
 * That hop is what broke the job. It has to guess its own origin, mint a
 * second credential, and survive whatever sits in front of the
 * deployment — and on Vercel, Deployment Protection sits in front of the
 * deployment. Every run on 2026-08-21/22/23 got:
 *
 *     generate returned 401:
 *     {"protection":{"vercel_auth_enabled":true,"vercel_auth_callback":
 *      "https://vercel.com/sso-api?url=...%2Fapi%2Fpayments%2Frecurring
 *      %2Fgenerate&nonce=..."}}
 *
 * The request never reached the generate route at all. `verifyCronAuth`
 * on both sides was always correct and always irrelevant: Vercel's SSO
 * gate answered first, and it does not care about `CRON_SECRET`. The
 * origin in that callback is the immutable *deployment* URL
 * (`classraum-korea-<hash>-…vercel.app`), which is protected even when
 * the production alias is not — which is why the inbound cron request
 * sailed through and its own outbound copy did not.
 *
 * The body being JSON with no `message` key is also what made the first
 * two failures undiagnosable: the old cron did `result.message ||
 * 'Failed to generate recurring invoices'`, and Vercel's protection
 * payload has no `message`.
 *
 * So: one implementation, imported directly. The HTTP route keeps its
 * auth guard and its exact response shape for manual/external callers;
 * the cron imports this function and makes no second request. Same
 * pattern as `/api/cron/refresh-test-specs`, which has always imported
 * its library instead of fetching itself.
 *
 * BILLING INVARIANTS PRESERVED VERBATIM from the route body — do not
 * "simplify" any of them:
 *   - one period per run, then advance `next_due_date`
 *   - the (template_id, due_date) idempotency filter
 *   - the active-student filter, scoped to the template's academy
 *   - the roll-forward when everyone is already invoiced for the period
 *   - partial failure reports 200 + non-empty `errors[]`
 */

export interface GenerateRecurringResult {
  success: true
  date: string
  templatesFound: number
  templatesProcessed: number
  totalInvoicesCreated: number
  /** Only present on the early exit. */
  skipped?: boolean
  message?: string
  /** Present ONLY when something failed. The cron reads this to decide ok:false. */
  errors?: string[]
}

/**
 * Generate one period of recurring invoices for every active template
 * whose `next_due_date` is today or earlier.
 *
 * Throws on the two failures that mean we cannot see the work at all
 * (the due-count query and the template fetch). Per-template failures do
 * NOT throw — they land in `errors[]` so one bad template cannot stop
 * every other academy from being invoiced.
 *
 * @param today `YYYY-MM-DD` in UTC. Injectable for tests only; production
 *              callers pass nothing.
 */
/*
 * A template with nobody to invoice still has to move its clock forward.
 *
 * The no-linked-students path used to `continue` WITHOUT advancing
 * next_due_date, which looks harmless — no students, no invoices — and is
 * not. Two consequences, found live on 2026-08-24 when HERALD's "Weekly
 * Lessons" (0 linked students, due 2026-08-21) reported
 * templatesFound: 1, templatesProcessed: 0 on a green run:
 *
 *   1. The template matches the "due today" query on every subsequent
 *      run, forever, so the job can never reach a clean state.
 *   2. Worse: the stale due date is retained. The moment somebody links a
 *      student to that template, the next run invoices them for
 *      2026-08-21 — a BACK-DATED invoice. That is exactly what the
 *      2026-08-20 roll-forward existed to prevent, arriving through a
 *      side door.
 *
 * Advancing here is also the correct billing semantics: a student added
 * today should be billed from the next period, never for one that ended
 * before they were enrolled.
 *
 * Deliberately NOT applied to "linked but none active" — see that branch.
 */
async function rollForwardEmptyTemplate(
  template: RecurrenceTemplate & { id: string; name: string },
  why: string,
): Promise<void> {
  const nextDueDate = calculateNextDueDate(template)
  const { error } = await dbAdmin
    .from('recurring_payment_templates')
    .update({ next_due_date: nextDueDate })
    .eq('id', template.id)
  if (error) {
    console.error(
      `[RECURRING] Error rolling forward empty template ${template.id} (${why}):`,
      error,
    )
    return
  }
  console.log(
    `[RECURRING] Template ${template.name}: ${why}; advanced next_due_date to ${nextDueDate}`,
  )
}

export async function generateRecurringInvoices(
  today: string = todayISO(),
): Promise<GenerateRecurringResult> {
  console.log(`[RECURRING] Starting automated invoice generation for ${today}`)

  // 🚀 SMART EARLY EXIT: Quick check if any templates are due
  const { count: dueTemplatesCount, error: countError } = await dbAdmin
    .from('recurring_payment_templates')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .lte('next_due_date', today)

  if (countError) {
    console.error('[RECURRING] Error checking due templates count:', countError)
    throw countError
  }

  // Early exit if no templates are due - saves 99% of execution time
  if (!dueTemplatesCount || dueTemplatesCount === 0) {
    console.log(`[RECURRING] No templates due today (${today}). Skipping processing.`)
    return {
      success: true,
      date: today,
      templatesFound: 0,
      templatesProcessed: 0,
      totalInvoicesCreated: 0,
      skipped: true,
      message: 'No templates due today - execution skipped',
    }
  }

  console.log(`[RECURRING] Found ${dueTemplatesCount} templates due for processing`)

  // Get all active recurring payment templates that are due today or overdue
  const { data: templates, error: templatesError } = await dbAdmin
    .from('recurring_payment_templates')
    .select('*')
    .eq('is_active', true)
    .lte('next_due_date', today)

  if (templatesError) {
    console.error('[RECURRING] Error fetching templates:', templatesError)
    throw templatesError
  }

  let totalInvoicesCreated = 0
  let templatesProcessed = 0
  const errors: string[] = []

  if (templates && templates.length > 0) {
    for (const template of templates) {
      try {
        console.log(`[RECURRING] Processing template: ${template.name} (${template.id})`)

        // Get all students for this template (without students!inner join which relies on student_record_id FK)
        const { data: rawTemplateStudents, error: studentsError } = await dbAdmin
          .from('recurring_payment_template_students')
          .select('student_id, amount_override')
          .eq('template_id', template.id)

        if (studentsError) {
          console.error(`[RECURRING] Error fetching students for template ${template.id}:`, studentsError)
          errors.push(`Template ${template.name}: ${studentsError.message}`)
          continue
        }

        if (!rawTemplateStudents || rawTemplateStudents.length === 0) {
          console.log(`[RECURRING] No students found for template: ${template.name}`)
          await rollForwardEmptyTemplate(template, 'no students linked')
          continue
        }

        // Filter to only active students by checking the students table
        const studentIds = rawTemplateStudents.map(s => s.student_id).filter(Boolean)
        const { data: activeStudents } = await dbAdmin
          .from('students')
          .select('user_id')
          .in('user_id', studentIds)
          .eq('academy_id', template.academy_id)
          .eq('active', true)
        const activeStudentIds = new Set(activeStudents?.map(s => s.user_id) || [])
        const templateStudents = rawTemplateStudents.filter(s => activeStudentIds.has(s.student_id))

        if (templateStudents.length === 0) {
          // NOT rolled forward, deliberately, and a test pins this.
          // Students linked but none active is an AMBIGUOUS state — a
          // cohort paused for a month is not the same as a template
          // nobody was ever going to be billed from. Advancing here would
          // silently skip a period the academy may well intend to charge
          // once those students are reactivated. Leaving the date put
          // keeps that decision with a human.
          console.log(`[RECURRING] No active students found for template: ${template.name}`)
          continue
        }

        console.log(`[RECURRING] Found ${templateStudents.length} active students for template: ${template.name}`)

        // ── Idempotency guard ────────────────────────────────────────
        // The cron can be interrupted between invoice INSERT and the
        // template's next_due_date UPDATE below (Vercel timeout, crash,
        // overlap with a manual retry). Without this guard, the next
        // run would re-INSERT invoices for students we already
        // invoiced for this period.
        //
        // Filter the student list down to only those who don't already
        // have an invoice for this (template_id, due_date). If a
        // previous run got partway, the next run resumes where it
        // stopped instead of duplicating.
        const { data: existingForPeriod } = await dbAdmin
          .from('invoices')
          .select('student_id')
          .eq('template_id', template.id)
          .eq('due_date', template.next_due_date)
        const alreadyInvoiced = new Set((existingForPeriod ?? []).map(r => r.student_id))
        const studentsToInvoice = templateStudents.filter(s => !alreadyInvoiced.has(s.student_id))

        if (alreadyInvoiced.size > 0) {
          console.log(`[RECURRING] Template ${template.name}: ${alreadyInvoiced.size} students already invoiced for ${template.next_due_date}; processing ${studentsToInvoice.length} remaining`)
        }

        if (studentsToInvoice.length === 0) {
          // Everyone already invoiced for this period — just bump
          // next_due_date so the template doesn't keep matching the
          // "due today" query forever.
          const nextDueDate = calculateNextDueDate(template)
          const { error: rollForwardError } = await dbAdmin
            .from('recurring_payment_templates')
            .update({ next_due_date: nextDueDate })
            .eq('id', template.id)
          if (rollForwardError) {
            // Without the roll-forward the template keeps matching the
            // "due today" query on every subsequent cron run, forever.
            console.error(`[RECURRING] Error rolling forward next_due_date for template ${template.id}:`, rollForwardError)
            errors.push(`Template ${template.name} roll-forward: ${rollForwardError.message}`)
            continue
          }
          console.log(`[RECURRING] All students already invoiced; rolled forward to ${nextDueDate}`)
          templatesProcessed++
          continue
        }

        // Create invoices for the students who don't have one yet
        const invoices = studentsToInvoice.map((templateStudent) => {
          const finalAmount = templateStudent.amount_override || template.amount
          return {
            // academy_id and invoice_name are NOT NULL on `invoices` with no
            // default. They were missing here, so every insert this cron
            // attempted was rejected by Postgres — see the note above the
            // insert below.
            academy_id: template.academy_id,
            invoice_name: template.name,
            student_id: templateStudent.student_id,
            template_id: template.id,
            amount: finalAmount,
            final_amount: finalAmount,
            due_date: template.next_due_date,
            status: 'pending',
            discount_amount: 0,
            created_at: new Date().toISOString(),
          }
        })

        // Insert the invoices.
        //
        // REAL BUG (found by typing the client, 2026-07-27): this insert
        // omitted `academy_id` and `invoice_name`, both NOT NULL with no
        // default. Postgres rejected every row, supabase-js RESOLVED with
        // { error } rather than throwing, and the handler pushed the message
        // into `errors` and moved on — so the cron reported success with
        // totalInvoicesCreated stuck at 0 and no recurring invoice was ever
        // generated. Both columns are now populated from the template.
        const { data: createdInvoices, error: invoiceError } = await dbAdmin
          .from('invoices')
          .insert(invoices)
          .select('id')

        if (invoiceError) {
          console.error(`[RECURRING] Error creating invoices for template ${template.id}:`, invoiceError.message)
          errors.push(`Template ${template.name}: ${invoiceError.message}`)
          continue
        }

        totalInvoicesCreated += invoices.length
        console.log(`[RECURRING] Created ${invoices.length} invoices for template: ${template.name}`)

        // Send invoice creation notifications for each created invoice
        if (createdInvoices && createdInvoices.length > 0) {
          for (const invoice of createdInvoices) {
            try {
              await triggerInvoiceCreatedNotifications(invoice.id)
            } catch (notificationError) {
              console.error(`[RECURRING] Error sending notification for invoice ${invoice.id}:`, notificationError)
              // Don't fail the invoice creation if notification fails
            }
          }
          console.log(`[RECURRING] Sent ${createdInvoices.length} invoice creation notifications`)
        }

        // Update template's next_due_date to the next occurrence
        const nextDueDate = calculateNextDueDate(template)

        const { error: updateError } = await dbAdmin
          .from('recurring_payment_templates')
          .update({ next_due_date: nextDueDate })
          .eq('id', template.id)

        if (updateError) {
          console.error(`[RECURRING] Error updating next_due_date for template ${template.id}:`, updateError)
          errors.push(`Template ${template.name} update: ${updateError.message}`)
          continue
        }

        console.log(`[RECURRING] Updated template ${template.name} next_due_date to: ${nextDueDate}`)
        templatesProcessed++

      } catch (templateError) {
        console.error(`[RECURRING] Unexpected error processing template ${template.id}:`, templateError)
        errors.push(`Template ${template.name}: ${(templateError as Error).message}`)
      }
    }
  }

  // Notify managers if any templates had errors
  if (errors.length > 0) {
    // Collect unique academy IDs from failed templates
    const failedAcademyIds = new Set<string>()
    for (const template of templates || []) {
      if (errors.some(e => e.includes(template.name))) {
        failedAcademyIds.add(template.academy_id)
      }
    }

    for (const failedAcademyId of failedAcademyIds) {
      try {
        const { data: managers } = await dbAdmin
          .from('managers')
          .select('user_id')
          .eq('academy_id', failedAcademyId)
          .eq('active', true)

        if (managers && managers.length > 0) {
          const notifications = managers.map(manager => ({
            user_id: manager.user_id,
            title: 'Invoice generation failed',
            message: `Some recurring invoices could not be generated. Please check your payment templates.`,
            type: 'billing',
            title_key: 'notifications.recurring.failed.title',
            message_key: 'notifications.recurring.failed.message',
            title_params: {},
            message_params: {},
            navigation_data: {
              page: 'payments',
            },
          }))

          // The enclosing try/catch cannot see this: insert resolves with
          // { error }. This notification is the only signal a manager gets
          // that their invoices did not go out — losing it silently means
          // students are never billed and nobody finds out.
          const { error: notifyInsertError } = await dbAdmin.from('notifications').insert(notifications)
          if (notifyInsertError) {
            console.error(
              `[RECURRING] Failed to insert failure notifications for academy ${failedAcademyId}:`,
              notifyInsertError
            )
          }
        }
      } catch (notifyError) {
        console.error(`[RECURRING] Failed to notify managers for academy ${failedAcademyId}:`, notifyError)
      }
    }
  }

  const result: GenerateRecurringResult = {
    success: true,
    date: today,
    templatesFound: templates?.length || 0,
    templatesProcessed,
    totalInvoicesCreated,
    errors: errors.length > 0 ? errors : undefined,
  }

  console.log(`[RECURRING] Completed processing:`, result)

  return result
}
