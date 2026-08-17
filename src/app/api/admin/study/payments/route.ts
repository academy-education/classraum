import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { dbAdmin } from '@/lib/supabase-admin';
import { requireAdminAuth, logAdminActivity } from '@/lib/admin-auth';
import { cancelPayment } from '@/lib/portone-charge';
import { raiseAlert } from '@/lib/ops/alert';
import { creditPresetWon, remainingWon, validateRefundAmount } from '@/lib/study/refund-math';
import { attributePaymentCredits } from '@/lib/study/refund-credit-preset';
import { accessRevocationFor, revocableCredits, validateRevocationRequest } from '@/lib/study/refund-revocation';
import { isPassPlan, resolvePass, STUDY_PASSES } from '@/lib/study/plans';

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
 * POST /api/admin/study/payments
 *   { paymentId, reason, amountWon?, revokeCredits?, revokeAccess? }
 *   → refund via PortOne (operator-initiated only). amountWon omitted refunds
 *     the full remaining balance; otherwise a partial cancel for that amount.
 *     Each refund is recorded in study_payment_refunds; refunded_at is only
 *     stamped once the remaining balance hits 0 (= fully refunded).
 *     revokeCredits claws back the remaining credits from the bucket this
 *     payment filled (compensating study_credit_ledger row, kind 'refund');
 *     revokeAccess expires the access it bought (pass: expire sub + delete
 *     entitlement; plan: sub → expired) and is refused on partial refunds
 *     unless this refund takes remaining to 0. Rules in refund-revocation.ts.
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

interface RefundDto { id: string; amountWon: number; reason: string | null; createdAt: string }

/** "Refund unused credits" preset — null whenever attribution is ambiguous
 *  (the dialog then prefills nothing rather than guessing). */
interface CreditPresetDto { grantedCredits: number; unusedCredits: number; presetWon: number }

/**
 * Compute the unused-credit preset for each payment on the page.
 * granted comes from the plans.ts catalog (via price attribution);
 * unused comes from the bucket that payment filled:
 *   grant bucket     → study_subscriptions.grant_credits_remaining
 *   purchased bucket → study_subscriptions.purchased_credits_remaining
 *   pass             → study_pass_credits.remaining for the pass's test
 * unused is clamped to granted inside creditPresetWon.
 */
async function fetchCreditPresets(rows: PayRow[]): Promise<Map<string, CreditPresetDto | null>> {
  const out = new Map<string, CreditPresetDto | null>();
  const candidates = rows.filter((r) => !r.refunded_at);
  const studentIds = Array.from(new Set(candidates.map((r) => r.student_id)));
  if (studentIds.length === 0) {
    for (const r of rows) out.set(r.payment_id, null);
    return out;
  }
  const [{ data: subs }, { data: passes }] = await Promise.all([
    dbAdmin.from('study_subscriptions')
      .select('student_id, grant_credits_remaining, purchased_credits_remaining')
      .in('student_id', studentIds),
    dbAdmin.from('study_pass_credits')
      .select('student_id, test, remaining')
      .in('student_id', studentIds),
  ]);
  const subMap = new Map((subs ?? []).map((s) => [s.student_id, s]));
  const passMap = new Map<string, Array<{ test: string; remaining: number }>>();
  for (const p of passes ?? []) {
    const list = passMap.get(p.student_id) ?? [];
    list.push({ test: p.test, remaining: p.remaining });
    passMap.set(p.student_id, list);
  }

  for (const r of rows) {
    if (r.refunded_at) { out.set(r.payment_id, null); continue; }
    const attr = attributePaymentCredits(r.kind, r.amount_won);
    if (!attr.ok) { out.set(r.payment_id, null); continue; }

    let unused: number | null = null;
    if (attr.bucket === 'grant') {
      unused = subMap.get(r.student_id)?.grant_credits_remaining ?? 0;
    } else if (attr.bucket === 'purchased') {
      unused = subMap.get(r.student_id)?.purchased_credits_remaining ?? 0;
    } else {
      // Pass bucket: the price can match several passes (they differ only by
      // test), so use the student's pass-credit rows to disambiguate. More
      // than one matching row → cannot tell which pass this payment was.
      const rowsForTests = (passMap.get(r.student_id) ?? []).filter((p) => (attr.passTests ?? []).includes(p.test));
      if (rowsForTests.length > 1) { out.set(r.payment_id, null); continue; }
      unused = rowsForTests[0]?.remaining ?? 0;
    }

    const presetWon = creditPresetWon(r.amount_won, unused, attr.grantedCredits);
    out.set(r.payment_id, presetWon === null ? null : {
      grantedCredits: attr.grantedCredits,
      unusedCredits: Math.min(Math.max(0, unused), attr.grantedCredits),
      presetWon,
    });
  }
  return out;
}

function toDto(
  r: PayRow,
  refunds: RefundDto[],
  creditPreset: CreditPresetDto | null,
  student?: { name: string | null; email: string | null; isTestUser?: boolean },
) {
  const refundedWon = refunds.reduce((s, x) => s + x.amountWon, 0);
  return {
    paymentId: r.payment_id,
    studentId: r.student_id,
    studentName: student?.name ?? null,
    studentEmail: student?.email ?? null,
    isTestUser: student?.isTestUser ?? false,
    kind: r.kind,
    amountWon: r.amount_won ?? null,
    createdAt: r.created_at,
    refunded: !!r.refunded_at,
    refundedAt: r.refunded_at,
    refundedWon,
    remainingWon: remainingWon(r.amount_won, refunds),
    refunds,
    creditPreset,
  };
}

/** Refund history for a page of payments — one query, grouped in JS. */
async function fetchRefundMap(paymentIds: string[]): Promise<Map<string, RefundDto[]>> {
  const map = new Map<string, RefundDto[]>();
  if (paymentIds.length === 0) return map;
  const { data } = await dbAdmin
    .from('study_payment_refunds')
    .select('id, payment_id, amount_won, reason, created_at')
    .in('payment_id', paymentIds)
    .order('created_at', { ascending: true });
  for (const r of data ?? []) {
    const list = map.get(r.payment_id) ?? [];
    list.push({ id: r.id, amountWon: r.amount_won, reason: r.reason, createdAt: r.created_at });
    map.set(r.payment_id, list);
  }
  return map;
}

async function attachStudents(rows: PayRow[]) {
  const ids = Array.from(new Set(rows.map((r) => r.student_id)));
  const map = new Map<string, { name: string | null; email: string | null; isTestUser?: boolean }>();
  if (ids.length > 0) {
    const [{ data: users }, { data: prefs }] = await Promise.all([
      dbAdmin.from('users').select('id, name, email').in('id', ids),
      dbAdmin.from('study_user_prefs').select('student_id, is_test_user').in('student_id', ids),
    ]);
    for (const u of users ?? []) map.set(u.id, { name: u.name, email: u.email });
    for (const p of prefs ?? []) {
      const entry = map.get(p.student_id);
      if (entry) entry.isTestUser = p.is_test_user;
    }
  }
  const [refundMap, presetMap] = await Promise.all([
    fetchRefundMap(rows.map((r) => r.payment_id)),
    fetchCreditPresets(rows),
  ]);
  return rows.map((r) => toDto(r, refundMap.get(r.payment_id) ?? [], presetMap.get(r.payment_id) ?? null, map.get(r.student_id)));
}

/**
 * Exact count + net revenue straight from Postgres, so both stay correct no
 * matter how many rows exist (a JS sum over one fetched page would silently
 * under-report). Filters MUST mirror the list query's filters.
 */
async function fetchTotals(kind: string | null, studentIds: string[] | null, payStatus: string | null = null) {
  const { data, error } = await dbAdmin.rpc('admin_study_payment_totals', {
    // All args are `DEFAULT NULL` in Postgres, meaning "no filter"; omitting
    // the key is the same call as passing SQL NULL and matches the generated
    // (optional, non-nullable) arg types.
    ...(kind !== null ? { p_kind: kind } : {}),
    ...(studentIds !== null ? { p_student_ids: studentIds } : {}),
    ...(payStatus !== null ? { p_pay_status: payStatus } : {}),
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
    const { data, error } = await dbAdmin
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
    const [{ grossWon }, refundMap, presetMap] = await Promise.all([
      fetchTotals(null, [studentId]),
      fetchRefundMap(rows.map((r) => r.payment_id)),
      fetchCreditPresets(rows),
    ]);
    return NextResponse.json({
      payments: rows.map((r) => toDto(r, refundMap.get(r.payment_id) ?? [], presetMap.get(r.payment_id) ?? null)),
      grossWon,
    });
  }

  // ── Global list ────────────────────────────────────────────────────────
  if (scope !== 'all') return NextResponse.json({ error: 'studentId or scope=all required' }, { status: 400 });

  const kind = sp.get('kind');
  const q = sp.get('q')?.trim();
  const payStatus = sp.get('payStatus');
  const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10) || 1);

  // Resolve a name/email search to the matching student ids first.
  let studentFilter: string[] | null = null;
  if (q) {
    const { data: users } = await dbAdmin
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
  const statusFilter = payStatus && ['paid', 'partial', 'refunded'].includes(payStatus) ? payStatus : null;

  // Status derives from refunded_at (fully refunded stamp) + the refund
  // ledger (partial). `paid`/`partial` need the set of payment ids with any
  // ledger rows — resolved first, mirroring how the subscriptions route
  // resolves the test-user id set. Paged past the PostgREST 1000-row cap.
  let refundedIds: string[] | null = null;
  if (statusFilter === 'paid' || statusFilter === 'partial') {
    const ids = new Set<string>();
    for (let from = 0; ; from += 1000) {
      const { data: rIds, error: rErr } = await dbAdmin
        .from('study_payment_refunds')
        .select('payment_id')
        .order('payment_id')
        .range(from, from + 999);
      if (rErr) {
        console.error('[admin/study/payments] refund ids', rErr);
        return NextResponse.json({ error: 'list failed' }, { status: 500 });
      }
      for (const r of rIds ?? []) ids.add(r.payment_id as string);
      if ((rIds ?? []).length < 1000) break;
    }
    refundedIds = Array.from(ids);
    if (statusFilter === 'partial' && refundedIds.length === 0) {
      return NextResponse.json({ payments: [], total: 0, page, pageSize: PAGE_SIZE, grossWon: 0 });
    }
  }

  // Count + revenue from Postgres; only THIS page's rows are fetched. Keeps
  // the numbers exact and the payload flat as the table grows. The RPC's
  // status predicate MUST mirror the page-query filters below.
  const { total, grossWon } = await fetchTotals(kindFilter, studentFilter, statusFilter);

  const from = (page - 1) * PAGE_SIZE;
  let query = dbAdmin
    .from('study_payments')
    .select('payment_id, student_id, kind, amount_won, created_at, refunded_at')
    .order('created_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (kindFilter) query = query.eq('kind', kindFilter);
  if (studentFilter) query = query.in('student_id', studentFilter);
  if (statusFilter === 'refunded') query = query.not('refunded_at', 'is', null);
  if (statusFilter === 'partial') query = query.is('refunded_at', null).in('payment_id', refundedIds!);
  if (statusFilter === 'paid') {
    query = query.is('refunded_at', null);
    if (refundedIds && refundedIds.length > 0) {
      // PostgREST `not in` filter value: ("id1","id2",...) — quoted, since
      // payment ids are free-form text from PortOne.
      query = query.not('payment_id', 'in', `(${refundedIds.map((id) => `"${id}"`).join(',')})`);
    }
  }

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
  // Omitted → refund the full remaining balance. Must be a positive integer
  // number of won not exceeding remaining (checked here AND atomically in
  // admin_insert_study_refund under a row lock).
  amountWon: z.number().int().positive().optional(),
  // Admin-picked revocations riding on the refund (see refund-revocation.ts):
  //   revokeCredits — claw back the remaining credits from the bucket this
  //                   payment filled (compensating ledger row, kind 'refund').
  //   revokeAccess  — pass: expire the pass sub row + delete its entitlement;
  //                   plan: set the subscription to expired at once.
  //                   Refused unless THIS refund takes remaining to 0.
  revokeCredits: z.boolean().optional().default(false),
  revokeAccess: z.boolean().optional().default(false),
});

/** Subscription snapshot used by the revocation ops. */
interface SubSnapshot {
  plan: string | null;
  status: string | null;
  grant_credits_remaining: number | null;
  purchased_credits_remaining: number | null;
}

/**
 * Everything the revocation ops need, resolved with the SAME attribution
 * standard as the credit preset (never guess):
 *   credit  — bucket + granted count + current bucket balance, or null when
 *             the payment's grant cannot be attributed unambiguously.
 *   passTest — for pass payments, which test's credits/entitlement this
 *             payment maps to: a single matching study_pass_credits row, or
 *             (fallback) the pass plan currently on the subscription row.
 */
async function resolveRevocationContext(row: {
  payment_id: string; student_id: string; kind: string; amount_won: number | null;
}): Promise<{
  sub: SubSnapshot | null;
  credit: { bucket: 'grant' | 'purchased' | 'pass'; grantedCredits: number; bucketRemaining: number } | null;
  passTest: string | null;
}> {
  const { data: sub } = await dbAdmin
    .from('study_subscriptions')
    .select('plan, status, grant_credits_remaining, purchased_credits_remaining')
    .eq('student_id', row.student_id)
    .maybeSingle();
  const subSnap = (sub ?? null) as SubSnapshot | null;

  const attr = attributePaymentCredits(row.kind, row.amount_won);
  if (!attr.ok) {
    // Access revocation for a pass can still resolve via the sub row's plan.
    const subPass = isPassPlan(subSnap?.plan) ? resolvePass(subSnap?.plan) : null;
    return { sub: subSnap, credit: null, passTest: subPass?.test ?? null };
  }

  if (attr.bucket === 'grant') {
    return {
      sub: subSnap,
      credit: { bucket: 'grant', grantedCredits: attr.grantedCredits, bucketRemaining: subSnap?.grant_credits_remaining ?? 0 },
      passTest: null,
    };
  }
  if (attr.bucket === 'purchased') {
    return {
      sub: subSnap,
      credit: { bucket: 'purchased', grantedCredits: attr.grantedCredits, bucketRemaining: subSnap?.purchased_credits_remaining ?? 0 },
      passTest: null,
    };
  }

  // Pass bucket: the price can match several passes (they differ only by
  // test) — same disambiguation as fetchCreditPresets, with the sub row's
  // pass plan as a fallback when the student holds no/many credit rows.
  const tests = attr.passTests ?? [];
  const { data: passRows } = await dbAdmin
    .from('study_pass_credits')
    .select('test, remaining')
    .eq('student_id', row.student_id)
    .in('test', tests);
  const rows = (passRows ?? []) as Array<{ test: string; remaining: number }>;
  let passTest: string | null = null;
  if (rows.length === 1) {
    passTest = rows[0].test;
  } else {
    const subPass = isPassPlan(subSnap?.plan) ? resolvePass(subSnap?.plan) : null;
    if (subPass && tests.includes(subPass.test)) passTest = subPass.test;
  }
  if (!passTest) return { sub: subSnap, credit: null, passTest: null };
  return {
    sub: subSnap,
    credit: {
      bucket: 'pass',
      grantedCredits: attr.grantedCredits,
      bucketRemaining: rows.find((r) => r.test === passTest)?.remaining ?? 0,
    },
    passTest,
  };
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.success) return auth.response;

  const parsed = RefundSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'bad body' }, { status: 400 });
  const { paymentId, reason, amountWon, revokeCredits, revokeAccess } = parsed.data;

  // Only refund payments that are ours (a study_payments row).
  const { data: row } = await dbAdmin
    .from('study_payments')
    .select('payment_id, student_id, amount_won, kind, refunded_at')
    .eq('payment_id', paymentId)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: 'payment not found' }, { status: 404 });
  if (row.refunded_at) return NextResponse.json({ error: 'already refunded' }, { status: 409 });

  // Remaining = payment − prior refunds. Reject anything exceeding it (the
  // non-redundancy guard: partial refunds must never sum past the payment).
  const { data: prior, error: priorError } = await dbAdmin
    .from('study_payment_refunds')
    .select('amount_won')
    .eq('payment_id', paymentId);
  if (priorError) {
    console.error('[admin/study/payments] prior refunds', priorError);
    return NextResponse.json({ error: 'refund lookup failed' }, { status: 500 });
  }
  const remaining = remainingWon(row.amount_won, (prior ?? []).map((r) => ({ amountWon: r.amount_won })));
  const validated = validateRefundAmount(amountWon, remaining);
  if (!validated.ok) {
    const status = validated.error === 'invalid_amount' ? 400 : 409;
    return NextResponse.json({ error: validated.error, remainingWon: remaining }, { status });
  }
  const refundAmount = validated.amountWon;

  // Revocation guards run BEFORE any money moves. The context resolves the
  // credit bucket with the same no-guessing attribution as the preset; a
  // revokeCredits request that cannot be attributed is refused, and
  // revokeAccess is refused unless this refund zeroes the remaining balance.
  const wantsRevocation = revokeCredits || revokeAccess;
  const revCtx = wantsRevocation ? await resolveRevocationContext(row) : null;
  if (wantsRevocation) {
    const revCheck = validateRevocationRequest({
      paymentKind: row.kind,
      revokeCredits,
      revokeAccess,
      requestedWon: refundAmount,
      remainingWon: remaining,
      attributed: revCtx?.credit != null,
    });
    if (!revCheck.ok) {
      const status = revCheck.error === 'revoke_access_not_applicable' ? 400 : 409;
      return NextResponse.json({ error: revCheck.error, remainingWon: remaining }, { status });
    }
    // Pass access revocation needs to know WHICH test's entitlement to
    // delete; when neither the credit rows nor the sub row disambiguate it,
    // refuse rather than guess (mirror of the credit-attribution rule).
    if (revokeAccess && accessRevocationFor(row.kind) === 'pass' && !revCtx?.passTest) {
      return NextResponse.json({ error: 'revoke_access_unresolvable' }, { status: 409 });
    }
  }

  // Reserve the ledger row FIRST via the atomic DB guard (row lock +
  // remaining re-check), so two concurrent operators cannot both pass the
  // read above and double-cancel at PortOne. If PortOne then fails, the
  // reservation is compensated (deleted) below. A crash between the two
  // leaves the ledger OVER-stating refunds — the safe direction: it blocks
  // further refunds instead of enabling a double one.
  const { data: reserved, error: reserveError } = await dbAdmin.rpc('admin_insert_study_refund', {
    p_payment_id: paymentId,
    p_amount: refundAmount,
    p_reason: reason,
    p_created_by: auth.user.id,
  });
  if (reserveError) {
    const conflict = /exceeds remaining/i.test(reserveError.message);
    return NextResponse.json(
      { error: conflict ? 'exceeds_remaining' : 'refund reservation failed' },
      { status: conflict ? 409 : 500 },
    );
  }
  const reservation = (Array.isArray(reserved) ? reserved[0] : reserved) as
    | { refund_id: string; remaining_after: number }
    | undefined;
  if (!reservation) return NextResponse.json({ error: 'refund reservation failed' }, { status: 500 });

  // PortOne partial cancel: passing `amount` cancels exactly that much; when
  // it equals the full remaining balance PortOne treats it as the final
  // (full) cancellation of the payment.
  const result = await cancelPayment({ paymentId, reason, amountWon: refundAmount });
  if (!result.ok) {
    // Compensate the reservation — no money moved.
    const { error: undoError } = await dbAdmin
      .from('study_payment_refunds')
      .delete()
      .eq('id', reservation.refund_id);
    if (undoError) {
      await raiseAlert({
        severity: 'critical',
        title: 'Study refund reservation could not be rolled back',
        message:
          `PortOne cancel FAILED for payment ${paymentId} (${refundAmount} KRW) but the study_payment_refunds ` +
          `reservation ${reservation.refund_id} could not be deleted. The ledger now overstates refunds for this ` +
          `payment (blocks future refunds — no double-refund risk). Delete the row to reconcile.`,
        dedupeKey: `study-refund-orphan-reservation:${reservation.refund_id}`,
        error: undoError,
        context: { paymentId, refundId: reservation.refund_id, amountWon: refundAmount, adminUserId: auth.user.id },
      });
    }
    return NextResponse.json({ error: result.message ?? 'refund failed' }, { status: 502 });
  }

  // ── Revocations — money has moved; these compensate state ─────────────
  // Same pattern as the ledger insert: service-role writes, and a failure
  // AFTER the PortOne cancel can only be reported + alerted, never rolled
  // back, so each op is checked and any failure pages a human.
  let creditsRevoked: number | null = null;
  let accessRevoked = false;
  const revocationFailures: string[] = [];
  if (wantsRevocation && revCtx) {
    const nowIso = new Date().toISOString();

    if (revokeCredits && revCtx.credit) {
      const { bucket, grantedCredits, bucketRemaining } = revCtx.credit;
      const revoke = revocableCredits(bucketRemaining, grantedCredits);
      creditsRevoked = revoke;
      if (revoke > 0) {
        let clawErr: unknown = null;
        if (bucket === 'purchased') {
          ({ error: clawErr } = await dbAdmin.rpc('increment_study_purchased_credits', {
            p_student_id: row.student_id, p_delta: -revoke,
          }));
        } else if (bucket === 'pass') {
          // passTest is always resolved when the credit target is the pass
          // bucket (resolveRevocationContext returns credit:null otherwise).
          ({ error: clawErr } = await dbAdmin.rpc('increment_study_pass_credits', {
            p_student: row.student_id, p_test: revCtx.passTest!, p_delta: -revoke,
          }));
        } else {
          ({ error: clawErr } = await dbAdmin
            .from('study_subscriptions')
            .update({ grant_credits_remaining: Math.max(0, bucketRemaining - revoke), updated_at: nowIso })
            .eq('student_id', row.student_id));
        }
        if (clawErr) {
          creditsRevoked = 0;
          revocationFailures.push(`credit clawback failed (${bucket})`);
        } else {
          // Compensating ledger row — same shape as the manual Stellar
          // clawback (kind 'refund', negative delta, explicit note).
          const passPlanId = bucket === 'pass'
            ? (isPassPlan(revCtx.sub?.plan) ? revCtx.sub?.plan : null)
              ?? STUDY_PASSES.find((p) => p.test === revCtx.passTest && p.priceWon === row.amount_won)?.id
              ?? revCtx.passTest
            : null;
          const note = bucket === 'pass'
            ? `pass refund clawback — ${passPlanId} (${paymentId}) refunded, credits revoked`
            : `refund clawback — ${row.kind} (${paymentId}) refunded, credits revoked`;
          const { error: ledgerErr } = await dbAdmin.from('study_credit_ledger').insert({
            student_id: row.student_id,
            delta: -revoke,
            bucket: bucket === 'pass' ? `pass:${revCtx.passTest}` : bucket,
            kind: 'refund',
            note,
          });
          if (ledgerErr) {
            // Balance already moved — audit-trail gap, not a reason to redo.
            console.error('[admin/study/payments] clawback ledger row missing', {
              paymentId, studentId: row.student_id, revoke, error: ledgerErr,
            });
          }
        }
      }
    }

    // Access is only revoked when the atomic reservation confirms remaining
    // hit 0 (a concurrent refund could have changed the arithmetic between
    // our pre-check and the row lock).
    if (revokeAccess && reservation.remaining_after === 0) {
      const accessKind = accessRevocationFor(row.kind);
      if (accessKind === 'pass') {
        // The Stellar closure ops: expire the pass subscription row, delete
        // its entitlement (credits are the checkbox above).
        if (revCtx.sub && isPassPlan(revCtx.sub.plan)) {
          const { error: expireErr } = await dbAdmin
            .from('study_subscriptions')
            .update({ status: 'expired', cancel_at_period_end: true, pending_plan: null, next_grant_at: null, updated_at: nowIso })
            .eq('student_id', row.student_id);
          if (expireErr) revocationFailures.push('pass subscription expire failed');
          else accessRevoked = true;
        } else {
          // Sub row no longer holds the pass (e.g. upgraded since) — leave
          // it alone; deleting the entitlement is still correct.
          accessRevoked = true;
        }
        const { error: entErr } = await dbAdmin
          .from('study_entitlements')
          .delete()
          .eq('student_id', row.student_id)
          // Guarded above: pass-access revocation 409s when passTest is null.
          .eq('test', revCtx.passTest!)
          .eq('source', 'pass');
        if (entErr) {
          accessRevoked = false;
          revocationFailures.push('entitlement delete failed');
        }
      } else if (accessKind === 'plan') {
        if (!revCtx.sub) {
          revocationFailures.push('no subscription row to expire');
        } else {
          const { error: expireErr } = await dbAdmin
            .from('study_subscriptions')
            .update({ status: 'expired', cancel_at_period_end: true, pending_plan: null, next_grant_at: null, updated_at: nowIso })
            .eq('student_id', row.student_id);
          if (expireErr) revocationFailures.push('subscription expire failed');
          else accessRevoked = true;
        }
      }
    }

    if (revocationFailures.length > 0) {
      await raiseAlert({
        severity: 'critical',
        title: 'Study refund issued but revocation incomplete',
        message:
          `Payment ${paymentId} was refunded at PortOne, but the requested revocations did not all land: ` +
          `${revocationFailures.join('; ')}. The student may retain credits/access that were meant to be ` +
          `revoked — reconcile manually (see the Stellar closure ops: zero the bucket, expire the sub, ` +
          `delete the entitlement).`,
        dedupeKey: `study-refund-revocation-incomplete:${paymentId}`,
        context: {
          paymentId, studentId: row.student_id, kind: row.kind,
          revokeCredits, revokeAccess, failures: revocationFailures, adminUserId: auth.user.id,
        },
      });
    }
  }

  const revocationSummary =
    (creditsRevoked !== null ? ` — revoked ${creditsRevoked} unused credits` : '') +
    (accessRevoked ? ' — access revoked' : '') +
    (revocationFailures.length > 0 ? ` — REVOCATION FAILURES: ${revocationFailures.join('; ')}` : '');

  const fullyRefunded = reservation.remaining_after === 0;
  if (!fullyRefunded) {
    await logAdminActivity({
      adminUserId: auth.user.id,
      action: 'STUDY_PAYMENT_REFUND',
      description: `Partially refunded study payment ${paymentId} (${row.kind}): ${refundAmount} of ${row.amount_won ?? '?'} KRW, ${reservation.remaining_after} KRW remaining — ${reason}${revocationSummary}`,
    });
    return NextResponse.json({
      ok: true,
      status: result.status ?? 'PARTIAL_CANCELLED',
      cancelledAmount: result.cancelledAmount ?? refundAmount,
      remainingWon: reservation.remaining_after,
      fullyRefunded: false,
      creditsRevoked,
      accessRevoked,
      ...(revocationFailures.length > 0 ? { revocationFailures } : {}),
    });
  }

  // Remaining hit 0 → stamp refunded_at (the "fully refunded" marker). The
  // reason of this FINAL refund is kept on the payment row; earlier partial
  // reasons live in study_payment_refunds.
  //
  // This stamp backs the "already refunded" 409 guard above. If it silently
  // fails the payment still shows a Refund button, so it must be checked,
  // and a failure has to be reported as "refunded but NOT recorded", never
  // as "refund failed". (The ledger row above DID commit, so the remaining-
  // amount guard still blocks an over-refund — but the UI state would lie.)
  const { error: stampError } = await dbAdmin
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
    description: `Refunded study payment ${paymentId} (${row.kind}): final ${refundAmount} KRW of ${row.amount_won ?? '?'} KRW — ${reason}${revocationSummary}`,
  });

  return NextResponse.json({
    ok: true,
    status: result.status ?? 'CANCELLED',
    cancelledAmount: result.cancelledAmount ?? refundAmount,
    remainingWon: 0,
    fullyRefunded: true,
    creditsRevoked,
    accessRevoked,
    ...(revocationFailures.length > 0 ? { revocationFailures } : {}),
  });
}
