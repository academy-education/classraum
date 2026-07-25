import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminAuth, logAdminActivity } from '@/lib/admin-auth';
import { getPaymentInfo, cancelPayment } from '@/lib/portone-charge';

/**
 * Admin view of a student's study-system income (the PortOne side of the
 * house) + the ability to issue a refund.
 *
 * GET  /api/admin/study/payments?studentId=<uuid>
 *   → the student's study_payments rows (credit packs / exam passes),
 *     each enriched with its authoritative live PortOne status so the
 *     operator sees PAID vs CANCELLED without trusting stale local state.
 *
 * POST /api/admin/study/payments   { paymentId, reason }
 *   → full refund via PortOne (cancelPayment). The refund is ALWAYS
 *     operator-initiated here; we never auto-refund. Credits are NOT
 *     auto-revoked (a student may already have spent them) — the operator
 *     adjusts the balance separately if needed. Logged to activity.
 *
 * Admin-only; study data is minors' billing info so access is gated.
 */

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.success) return auth.response;

  const studentId = req.nextUrl.searchParams.get('studentId');
  if (!studentId) return NextResponse.json({ error: 'studentId required' }, { status: 400 });

  const { data: rows, error } = await supabaseAdmin
    .from('study_payments')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) {
    console.error('[admin/study/payments] list', error);
    return NextResponse.json({ error: 'list failed' }, { status: 500 });
  }

  // Base list from recorded payments (packs / passes / subscription charges).
  const base: Array<{ payment_id: string; kind: string; amount_won: number | null; created_at: string | null }> =
    (rows ?? []).map((r) => ({
      payment_id: r.payment_id as string,
      kind: r.kind as string,
      amount_won: (r.amount_won as number | null) ?? null,
      created_at: (r.created_at as string | null) ?? null,
    }));

  // Backfill: subscription renewals only persist the LATEST id on the
  // subscription row (older ones aren't recorded historically). Surface that
  // latest charge even when there's no study_payments row for it yet, so the
  // most recent subscription payment always shows.
  const { data: sub } = await supabaseAdmin
    .from('study_subscriptions')
    .select('last_payment_id, last_payment_attempt_at')
    .eq('student_id', studentId)
    .maybeSingle();
  const lastPaymentId = sub?.last_payment_id as string | undefined;
  if (lastPaymentId && !base.some((b) => b.payment_id === lastPaymentId)) {
    base.unshift({
      payment_id: lastPaymentId,
      kind: 'study_subscription',
      amount_won: null, // filled from PortOne below
      created_at: (sub?.last_payment_attempt_at as string) ?? null,
    });
  }

  // Enrich each row with live PortOne status (in parallel, bounded by the
  // 100-row cap). A missing/unreadable payment just yields status 'UNKNOWN'
  // rather than failing the whole list.
  const payments = await Promise.all(
    base.map(async (r) => {
      const info = await getPaymentInfo(r.payment_id).catch(() => null);
      return {
        paymentId: r.payment_id,
        kind: r.kind,
        // Fall back to PortOne's amount when we have no locally-recorded amount
        // (the backfilled subscription row).
        amountWon: r.amount_won ?? (info?.ok ? (info.amountTotal ?? null) : null),
        createdAt: r.created_at,
        // PortOne statuses: PAID, CANCELLED, PARTIAL_CANCELLED, FAILED, …
        portoneStatus: info?.ok ? (info.status ?? 'UNKNOWN') : 'UNKNOWN',
        portoneAmount: info?.ok ? (info.amountTotal ?? null) : null,
      };
    }),
  );

  const grossWon = payments
    .filter((p) => p.portoneStatus === 'PAID')
    .reduce((sum, p) => sum + (p.amountWon ?? 0), 0);

  return NextResponse.json({ payments, grossWon });
}

const RefundSchema = z.object({
  paymentId: z.string().min(1),
  reason: z.string().trim().min(1).max(200),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.success) return auth.response;

  const parsed = RefundSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'bad body' }, { status: 400 });
  const { paymentId, reason } = parsed.data;

  // Only refund payments that are ours (a study_payments row). Prevents this
  // endpoint from being used to cancel arbitrary PortOne payment IDs.
  const { data: row } = await supabaseAdmin
    .from('study_payments')
    .select('payment_id, student_id, amount_won, kind')
    .eq('payment_id', paymentId)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: 'payment not found' }, { status: 404 });

  const result = await cancelPayment({ paymentId, reason });
  if (!result.ok) {
    return NextResponse.json({ error: result.message ?? 'refund failed' }, { status: 502 });
  }

  await logAdminActivity({
    adminUserId: auth.user.id,
    action: 'STUDY_PAYMENT_REFUND',
    description: `Refunded study payment ${paymentId} (${row.kind}, ${row.amount_won ?? '?'} KRW) — ${reason}`,
  });

  return NextResponse.json({ ok: true, status: result.status ?? 'CANCELLED', cancelledAmount: result.cancelledAmount ?? null });
}
