import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminAuth, logAdminActivity } from '@/lib/admin-auth';
import { cancelPayment } from '@/lib/portone-charge';
import { raiseAlert } from '@/lib/ops/alert';

/**
 * Admin view of study-system income (the PortOne side) + refunds.
 *
 * GET /api/admin/study/payments?studentId=<uuid>   → one student's payments
 * GET /api/admin/study/payments?scope=all&kind=&q=&page=  → all study payments
 *   Rows: credit packs, exam passes, and subscription charges (backfilled +
 *   recorded going forward). Refund state comes from the local `refunded_at`
 *   column — set by our refund action — so the list is fast and doesn't need a
 *   per-row live PortOne call. (A refund issued directly in the PortOne console,
 *   outside this tool, won't be reflected here.)
 *
 * POST /api/admin/study/payments   { paymentId, reason }
 *   → full refund via PortOne (operator-initiated only) + stamp refunded_at.
 *
 * Admin-only; study data is minors' billing info so access is gated.
 */

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;
const KINDS = ['study_credit_pack', 'study_exam_pass', 'study_subscription'] as const;

interface PayRow {
  payment_id: string;
  student_id: string;
  kind: string;
  amount_won: number | null;
  created_at: string | null;
  refunded_at: string | null;
}

function toDto(r: PayRow, student?: { name: string | null; email: string | null }) {
  return {
    paymentId: r.payment_id,
    studentId: r.student_id,
    studentName: student?.name ?? null,
    studentEmail: student?.email ?? null,
    kind: r.kind,
    amountWon: r.amount_won ?? null,
    createdAt: r.created_at,
    refunded: !!r.refunded_at,
    refundedAt: r.refunded_at,
  };
}

async function attachStudents(rows: PayRow[]) {
  const ids = Array.from(new Set(rows.map((r) => r.student_id)));
  const map = new Map<string, { name: string | null; email: string | null }>();
  if (ids.length > 0) {
    const { data: users } = await supabaseAdmin.from('users').select('id, name, email').in('id', ids);
    for (const u of users ?? []) map.set(u.id as string, { name: u.name as string | null, email: u.email as string | null });
  }
  return rows.map((r) => toDto(r, map.get(r.student_id)));
}

/**
 * Exact count + net revenue straight from Postgres, so both stay correct no
 * matter how many rows exist (a JS sum over one fetched page would silently
 * under-report). Filters MUST mirror the list query's filters.
 */
async function fetchTotals(kind: string | null, studentIds: string[] | null) {
  const { data, error } = await supabaseAdmin.rpc('admin_study_payment_totals', {
    p_kind: kind,
    p_student_ids: studentIds,
  });
  if (error) {
    console.error('[admin/study/payments] totals', error);
    return { total: 0, grossWon: 0 };
  }
  const row = (Array.isArray(data) ? data[0] : data) as { total_count?: number; net_won?: number } | undefined;
  return { total: Number(row?.total_count ?? 0), grossWon: Number(row?.net_won ?? 0) };
}

export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.success) return auth.response;

  const sp = req.nextUrl.searchParams;
  const studentId = sp.get('studentId');
  const scope = sp.get('scope');

  // ── Per-student ────────────────────────────────────────────────────────
  if (studentId) {
    const { data, error } = await supabaseAdmin
      .from('study_payments')
      .select('payment_id, student_id, kind, amount_won, created_at, refunded_at')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      console.error('[admin/study/payments] per-student', error);
      return NextResponse.json({ error: 'list failed' }, { status: 500 });
    }
    const rows = (data ?? []) as PayRow[];
    // Revenue comes from the DB, not the fetched page, so a student with more
    // than 100 payments still shows a correct total.
    const { grossWon } = await fetchTotals(null, [studentId]);
    return NextResponse.json({ payments: rows.map((r) => toDto(r)), grossWon });
  }

  // ── Global list ────────────────────────────────────────────────────────
  if (scope !== 'all') return NextResponse.json({ error: 'studentId or scope=all required' }, { status: 400 });

  const kind = sp.get('kind');
  const q = sp.get('q')?.trim();
  const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10) || 1);

  // Resolve a name/email search to the matching student ids first.
  let studentFilter: string[] | null = null;
  if (q) {
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id')
      .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(500);
    studentFilter = (users ?? []).map((u) => u.id as string);
    if (studentFilter.length === 0) {
      return NextResponse.json({ payments: [], total: 0, page, pageSize: PAGE_SIZE, grossWon: 0 });
    }
  }

  const kindFilter = kind && (KINDS as readonly string[]).includes(kind) ? kind : null;

  // Count + revenue from Postgres; only THIS page's rows are fetched. Keeps
  // the numbers exact and the payload flat as the table grows.
  const { total, grossWon } = await fetchTotals(kindFilter, studentFilter);

  const from = (page - 1) * PAGE_SIZE;
  let query = supabaseAdmin
    .from('study_payments')
    .select('payment_id, student_id, kind, amount_won, created_at, refunded_at')
    .order('created_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (kindFilter) query = query.eq('kind', kindFilter);
  if (studentFilter) query = query.in('student_id', studentFilter);

  const { data, error } = await query;
  if (error) {
    console.error('[admin/study/payments] global', error);
    return NextResponse.json({ error: 'list failed' }, { status: 500 });
  }
  const payments = await attachStudents((data ?? []) as PayRow[]);
  return NextResponse.json({ payments, total, page, pageSize: PAGE_SIZE, grossWon });
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

  // Only refund payments that are ours (a study_payments row).
  const { data: row } = await supabaseAdmin
    .from('study_payments')
    .select('payment_id, student_id, amount_won, kind, refunded_at')
    .eq('payment_id', paymentId)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: 'payment not found' }, { status: 404 });
  if (row.refunded_at) return NextResponse.json({ error: 'already refunded' }, { status: 409 });

  const result = await cancelPayment({ paymentId, reason });
  if (!result.ok) {
    return NextResponse.json({ error: result.message ?? 'refund failed' }, { status: 502 });
  }

  // Stamp the local refund so the lists reflect it without a PortOne round-trip.
  //
  // This write is the ONLY thing backing the "already refunded" 409 guard
  // above. If it silently fails, the guard never trips and an operator can
  // press Refund again — cancelling the same payment twice at PortOne and
  // sending real money out twice. So it must be checked, and a failure has
  // to be reported as "refunded but NOT recorded", never as "refund failed".
  const { error: stampError } = await supabaseAdmin
    .from('study_payments')
    .update({ refunded_at: new Date().toISOString(), refund_reason: reason })
    .eq('payment_id', paymentId);

  if (stampError) {
    await raiseAlert({
      severity: 'critical',
      title: 'Study refund succeeded at PortOne but was not recorded',
      message:
        `Payment ${paymentId} was cancelled at PortOne (${result.cancelledAmount ?? row.amount_won ?? '?'} KRW) ` +
        `but the refunded_at stamp failed to write. The payment still looks refundable in admin, so a second ` +
        `refund attempt is possible. Reconcile study_payments.refunded_at for this payment now.`,
      dedupeKey: `study-refund-unrecorded:${paymentId}`,
      error: stampError,
      context: {
        paymentId,
        studentId: row.student_id,
        kind: row.kind,
        amountWon: row.amount_won,
        cancelledAmount: result.cancelledAmount ?? null,
        adminUserId: auth.user.id,
        reason,
      },
    });

    // Still record the operator action — the refund really did happen.
    await logAdminActivity({
      adminUserId: auth.user.id,
      action: 'STUDY_PAYMENT_REFUND',
      description: `Refunded study payment ${paymentId} (${row.kind}, ${row.amount_won ?? '?'} KRW) — ${reason} — WARNING: local refund stamp FAILED to write`,
    });

    return NextResponse.json(
      {
        error:
          'The refund WAS issued at PortOne and the money has been returned, but it could not be recorded in the database. ' +
          'Do NOT refund this payment again — a second attempt would refund twice. An alert has been raised for reconciliation.',
        refundIssued: true,
        recorded: false,
        paymentId,
      },
      { status: 500 },
    );
  }

  await logAdminActivity({
    adminUserId: auth.user.id,
    action: 'STUDY_PAYMENT_REFUND',
    description: `Refunded study payment ${paymentId} (${row.kind}, ${row.amount_won ?? '?'} KRW) — ${reason}`,
  });

  return NextResponse.json({ ok: true, status: result.status ?? 'CANCELLED', cancelledAmount: result.cancelledAmount ?? null });
}
