import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { deletePortOneBillingKey } from '@/lib/portone-billing-key';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get manager's academy
    const { data: manager, error: managerError } = await supabase
      .from('managers')
      .select('academy_id')
      .eq('user_id', user.id)
      .single();

    if (managerError || !manager) {
      return NextResponse.json(
        { success: false, message: 'Manager not found' },
        { status: 403 }
      );
    }

    const academyId = manager.academy_id;

    // Get current subscription
    const { data: subscription, error: subError } = await supabase
      .from('academy_subscriptions')
      .select('*')
      .eq('academy_id', academyId)
      .single();

    if (subError || !subscription) {
      return NextResponse.json(
        { success: false, message: 'No active subscription found' },
        { status: 404 }
      );
    }

    // Revoke the PortOne billing key BEFORE flipping auto_renew. Without
    // this, the key stays valid at PortOne indefinitely — meaning a
    // future bug in the billing cron (e.g. a code path that forgets to
    // check auto_renew) could silently re-charge a customer who already
    // cancelled. Belt-and-braces: the customer's intent is captured in
    // both the DB row (auto_renew=false) AND at the payment provider
    // (key revoked).
    //
    // Idempotency: deletePortOneBillingKey is safe to call against an
    // already-cancelled key. We also gate on billing_key_cancelled_at
    // so a retry of the cancel flow doesn't re-issue the DELETE.
    let billingKeyRevoked = false
    if (subscription.billing_key && !subscription.billing_key_cancelled_at) {
      const revokeResult = await deletePortOneBillingKey(subscription.billing_key)
      if (!revokeResult.cancelled) {
        // Don't block the cancellation on a PortOne failure — the
        // customer still gets their auto_renew=false flag set, and the
        // account-deletion cron sweeps stale keys later. But surface the
        // error so we can investigate.
        console.error(
          '[subscription/cancel] PortOne billing-key revocation failed:',
          revokeResult.error
        )
      } else {
        billingKeyRevoked = true
      }
    }

    // Update subscription to disable auto_renew
    // This will prevent future billing but keep current period active
    const { error: updateError } = await supabase
      .from('academy_subscriptions')
      .update({
        auto_renew: false,
        ...(billingKeyRevoked ? { billing_key_cancelled_at: new Date().toISOString() } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('academy_id', academyId);

    if (updateError) {
      console.error('Error canceling subscription:', updateError);
      return NextResponse.json(
        { success: false, message: 'Failed to cancel subscription' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '구독이 취소되었습니다. 현재 결제 기간까지는 계속 이용하실 수 있습니다.',
      data: {
        currentPeriodEnd: subscription.current_period_end,
        auto_renew: false,
        billing_key_revoked: billingKeyRevoked,
      },
    });

  } catch (error) {
    console.error('Cancel subscription API error:', error);
    return NextResponse.json(
      {
        success: false,
        message: '구독 취소 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
