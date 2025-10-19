import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    // Update subscription to disable auto_renew
    // This will prevent future billing but keep current period active
    const { error: updateError } = await supabase
      .from('academy_subscriptions')
      .update({
        auto_renew: false,
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
