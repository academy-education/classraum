import { raiseAlert } from '@/lib/ops/alert'
import type { SectionShortDetail } from '@/lib/study/section-availability'

/**
 * Record a refused short section so we can see WHICH sections run dry.
 *
 * One alert per section (the dedupeKey carries no student or session), so
 * a dry section refreshes one dashboard row instead of burying it — the
 * row is the to-author list. `warning`, not `critical`: the student was
 * not charged and was told so; nothing is broken except the bank depth.
 *
 * The 409 itself is also recorded to error_logs by withApiFailureLogging
 * on /test/assemble and /test/generate (per route+status+label). This
 * alert is the per-SECTION row that sink cannot give. /test/route is not
 * wrapped (its module2_pending 409 is a normal retry), so for Module 2
 * refusals this alert is the only record. raiseAlert never throws.
 */
export async function reportSectionShort(
  detail: SectionShortDetail,
  context: { studentId: string; sessionId?: string; via: string; outcome: string },
): Promise<void> {
  const where = `${detail.scope}${detail.module ? `:m${detail.module}` : ''}${detail.path ? `:${detail.path}` : ''}`
  await raiseAlert({
    severity: 'warning',
    title: 'Full-test section refused: bank cannot fill the blueprint',
    message:
      `${where} wanted ${detail.want} items, the bank supplied ${detail.got}. ` +
      `${context.outcome} Author more items for this section; never lower the blueprint count.`,
    dedupeKey: `study-section-unavailable:${where}`,
    context: { ...detail, ...context },
  })
}
