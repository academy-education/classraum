import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Missing authorization header' },
        { status: 401 }
      );
    }

    // Extract the JWT token
    const token = authHeader.substring(7);

    // Create Supabase client with the token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: authHeader
          }
        }
      }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

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

    // Get request body
    const { billingKey } = await request.json();

    if (!billingKey) {
      return NextResponse.json(
        { success: false, message: 'Billing key is required' },
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

    // Update billing key
    const { error: updateError } = await supabase
      .from('academy_subscriptions')
      .update({
        billing_key: billingKey,
        billing_key_issued_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('academy_id', academyId);

    if (updateError) {
      console.error('Error updating payment method:', updateError);
      return NextResponse.json(
        { success: false, message: 'Failed to update payment method' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '결제 수단이 성공적으로 업데이트되었습니다.',
      data: {
        billingKeyUpdatedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Update payment method API error:', error);
    return NextResponse.json(
      {
        success: false,
        message: '결제 수단 업데이트 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
