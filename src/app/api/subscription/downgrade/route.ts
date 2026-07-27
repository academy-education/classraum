import { NextRequest, NextResponse } from 'next/server';
import { getAuthedClient } from '@/lib/api-auth';
import { SUBSCRIPTION_PLANS } from '@/types/subscription';
import { getAcademyUsage } from '@/lib/subscription';

export async function POST(request: NextRequest) {
  try {
    // Bearer first, cookies second — this app stores its session in
    // localStorage, so a cookie-only check 401s every real caller.
    const { user, supabase, error: authError } = await getAuthedClient(request);
    if (!user || !supabase) {
      console.error('[Downgrade API] Authentication failed:', authError);
      return NextResponse.json(
        { success: false, message: 'Unauthorized', debug: authError },
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

    // Get request body
    const { targetTier } = await request.json();

    if (!targetTier) {
      return NextResponse.json(
        { success: false, message: 'Target tier is required' },
        { status: 400 }
      );
    }

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

    // Check if it's actually a downgrade
    const tierOrder = ['individual', 'basic', 'pro', 'enterprise'];
    const currentTierIndex = tierOrder.indexOf(subscription.plan_tier);
    const targetTierIndex = tierOrder.indexOf(targetTier);

    if (targetTierIndex >= currentTierIndex) {
      return NextResponse.json(
        { success: false, message: 'This is not a downgrade. Please use the upgrade endpoint.' },
        { status: 400 }
      );
    }

    // Get target plan limits
    const targetPlan = SUBSCRIPTION_PLANS[targetTier as keyof typeof SUBSCRIPTION_PLANS];
    if (!targetPlan) {
      return NextResponse.json(
        { success: false, message: 'Invalid target tier' },
        { status: 400 }
      );
    }

    // Get current usage
    const usage = await getAcademyUsage(academyId);
    if (!usage) {
      return NextResponse.json(
        { success: false, message: 'Could not fetch usage data' },
        { status: 500 }
      );
    }

    // Validate downgrade against current usage
    const violations: string[] = [];
    const currentTotalUsers = usage.currentStudentCount + usage.currentTeacherCount;

    if (targetPlan.limits.totalUserLimit !== -1 && currentTotalUsers > targetPlan.limits.totalUserLimit) {
      violations.push(
        `총 사용자 수: 현재 ${currentTotalUsers}명, ${targetPlan.name}은 최대 ${targetPlan.limits.totalUserLimit}명`
      );
    }

    if (targetPlan.limits.storageGb !== -1 && usage.currentStorageGb > targetPlan.limits.storageGb) {
      violations.push(
        `저장 공간: 현재 ${usage.currentStorageGb.toFixed(2)}GB, ${targetPlan.name}은 최대 ${targetPlan.limits.storageGb}GB`
      );
    }

    if (targetPlan.limits.classroomLimit !== -1 && usage.currentClassroomCount > targetPlan.limits.classroomLimit) {
      violations.push(
        `교실 수: 현재 ${usage.currentClassroomCount}개, ${targetPlan.name}은 최대 ${targetPlan.limits.classroomLimit}개`
      );
    }

    // If there are violations, return error with details
    if (violations.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `${targetPlan.name} 플랜으로 다운그레이드할 수 없습니다. 현재 사용량이 해당 플랜의 한도를 초과합니다.`,
          violations,
          canDowngrade: false,
        },
        { status: 400 }
      );
    }

    // Downgrade is valid — schedule it for the next billing date rather
    // than applying it now. The academy has already paid through the end of
    // the current period, so their limits must not drop mid-cycle; the
    // billing cron reads pending_tier at renewal, charges the new lower
    // amount, and clears these three columns.
    //
    // pending_tier / pending_monthly_amount only exist as of migration 060.
    // Before that they were referenced but never created, so PostgREST
    // rejected this whole statement (PGRST204) and every downgrade attempt
    // answered 500 with nothing persisted.
    //
    // next_billing_date is nullable. Unguarded it would be written straight
    // into pending_change_effective_date and formatted into the message
    // below, where `new Date(null)` is the UNIX epoch rather than an error —
    // so the manager would be told their downgrade takes effect in 1970 and
    // the cron would apply it on the next run.
    if (!subscription.next_billing_date) {
      console.error(
        '[Downgrade API] Subscription has no next_billing_date; cannot schedule',
        { academyId, currentTier: subscription.plan_tier, targetTier }
      );
      return NextResponse.json(
        {
          success: false,
          message: '다음 결제일이 설정되어 있지 않아 다운그레이드를 예약할 수 없습니다. 고객지원에 문의해주세요.',
        },
        { status: 409 }
      );
    }

    const effectiveDate = subscription.next_billing_date;

    const { error: updateError } = await supabase
      .from('academy_subscriptions')
      .update({
        pending_tier: targetTier,
        pending_monthly_amount: targetPlan.monthlyPrice,
        pending_change_effective_date: effectiveDate,
        updated_at: new Date().toISOString(),
      })
      .eq('academy_id', academyId);

    if (updateError) {
      console.error('Error scheduling downgrade:', updateError);
      return NextResponse.json(
        { success: false, message: 'Failed to schedule downgrade' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `다운그레이드가 예약되었습니다. 다음 결제일(${new Date(effectiveDate).toLocaleDateString('ko-KR')})부터 ${targetPlan.name} 플랜으로 변경됩니다.`,
      data: {
        currentTier: subscription.plan_tier,
        targetTier,
        effectiveDate,
        newMonthlyAmount: targetPlan.monthlyPrice,
      },
    });

  } catch (error) {
    console.error('Downgrade API error:', error);
    return NextResponse.json(
      {
        success: false,
        message: '다운그레이드 처리 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
