import { NextRequest, NextResponse } from 'next/server';
import { getAuthedClient } from '@/lib/api-auth';

/**
 * POST /api/subscription/reactivate — undo a cancellation.
 *
 * /api/subscription/cancel sets auto_renew = false and leaves status
 * 'active' until current_period_end, so the academy keeps the access it
 * has already paid for. Until this route existed there was no way back:
 * nothing outside the subscribe/checkout path ever set auto_renew to true
 * again, so a manager who mis-clicked Cancel had to re-run checkout — and
 * because cancel also REVOKES the PortOne billing key, that meant
 * re-entering card details for a subscription that never actually lapsed.
 *
 * The window is deliberately narrow: this only un-cancels a subscription
 * that is still inside its paid period. Once the period has ended the
 * subscription needs a fresh charge, which is checkout's job, not this
 * route's — flipping auto_renew on a lapsed row would hand back access
 * that nobody paid for.
 *
 * Responses carry a machine-readable `code` so the settings page can route
 * the manager to the right remedy instead of showing a dead-end error.
 */

/** Date-only string (YYYY-MM-DD), the shape next_billing_date is stored in. */
function toDateOnly(value: string): string {
  return value.split('T')[0];
}

export async function POST(request: NextRequest) {
  try {
    // Bearer first, cookies second — this app stores its session in
    // localStorage, so a cookie-only check 401s every real caller.
    const { user, supabase, error: authError } = await getAuthedClient(request);
    if (!user || !supabase) {
      console.error('[subscription/reactivate] Authentication failed:', authError);
      return NextResponse.json(
        { success: false, code: 'unauthorized', message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: manager, error: managerError } = await supabase
      .from('managers')
      .select('academy_id')
      .eq('user_id', user.id)
      .single();

    if (managerError || !manager) {
      return NextResponse.json(
        { success: false, code: 'not_a_manager', message: 'Manager not found' },
        { status: 403 }
      );
    }

    const academyId = manager.academy_id;

    const { data: subscription, error: subError } = await supabase
      .from('academy_subscriptions')
      .select('*')
      .eq('academy_id', academyId)
      .single();

    if (subError || !subscription) {
      return NextResponse.json(
        { success: false, code: 'no_subscription', message: 'No active subscription found' },
        { status: 404 }
      );
    }

    // Idempotent: a double-click, or a retry after a response the client
    // never saw, must not read as a failure.
    if (subscription.auto_renew) {
      return NextResponse.json({
        success: true,
        code: 'already_active',
        message: '구독이 이미 자동 갱신 상태입니다.',
        data: {
          autoRenew: true,
          currentPeriodEnd: subscription.current_period_end,
          nextBillingDate: subscription.next_billing_date,
        },
      });
    }

    // A row that is no longer 'active' (expired / suspended / canceled) has
    // nothing left to renew — it needs a payment, not a flag flip.
    if (subscription.status !== 'active') {
      return NextResponse.json(
        {
          success: false,
          code: 'not_active',
          message: '구독이 이미 종료되었습니다. 다시 구독하려면 새로 결제해주세요.',
        },
        { status: 409 }
      );
    }

    // The paid period must not have lapsed. current_period_end is NOT NULL
    // in the schema, so this is a plain comparison — no null branch to
    // fall through and silently un-cancel a lapsed subscription.
    const periodEnd = new Date(subscription.current_period_end);
    if (Number.isNaN(periodEnd.getTime()) || periodEnd.getTime() <= Date.now()) {
      return NextResponse.json(
        {
          success: false,
          code: 'period_lapsed',
          message: '결제 기간이 이미 종료되었습니다. 다시 구독하려면 새로 결제해주세요.',
        },
        { status: 409 }
      );
    }

    // Decision on the revoked-billing-key case (task item 3): BLOCK, and
    // point the manager at update-payment-method.
    //
    // cancel deletes the billing key at PortOne and stamps
    // billing_key_cancelled_at. Turning auto_renew back on without a usable
    // key would tell the manager they are renewing while the billing cron
    // charges a key PortOne has already destroyed — a guaranteed decline at
    // renewal, discovered only when access stops. Requiring the new key
    // FIRST makes the failure visible now, while the manager is present and
    // can act. update-payment-method clears billing_key_cancelled_at when a
    // new key is issued, so the manager comes straight back here.
    if (!subscription.billing_key || subscription.billing_key_cancelled_at) {
      return NextResponse.json(
        {
          success: false,
          code: 'billing_key_required',
          message: '구독을 취소할 때 결제 수단이 해지되었습니다. 결제 수단을 다시 등록한 후 구독을 재개해주세요.',
        },
        { status: 409 }
      );
    }

    // Restore next_billing_date if it is missing. The billing cron selects
    // on `next_billing_date <= today`, so a NULL here would make
    // auto_renew = true a lie: nothing would ever bill, and access would
    // stop at period end with the UI still claiming the plan renews.
    // current_period_end is by definition when the next charge is due.
    const nextBillingDate =
      subscription.next_billing_date ?? toDateOnly(subscription.current_period_end);

    const { error: updateError } = await supabase
      .from('academy_subscriptions')
      .update({
        auto_renew: true,
        next_billing_date: nextBillingDate,
        updated_at: new Date().toISOString(),
      })
      .eq('academy_id', academyId);

    if (updateError) {
      console.error('[subscription/reactivate] Error reactivating subscription:', updateError);
      return NextResponse.json(
        { success: false, code: 'update_failed', message: 'Failed to reactivate subscription' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      code: 'reactivated',
      message: '구독이 재개되었습니다. 다음 결제일에 자동으로 갱신됩니다.',
      data: {
        autoRenew: true,
        currentPeriodEnd: subscription.current_period_end,
        nextBillingDate,
      },
    });

  } catch (error) {
    console.error('[subscription/reactivate] API error:', error);
    return NextResponse.json(
      {
        success: false,
        code: 'unexpected_error',
        message: '구독 재개 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
