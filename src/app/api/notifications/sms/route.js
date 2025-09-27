import { NextResponse } from 'next/server';
import { sendSMS, sendBulkSMS, sendScheduledSMS } from '@/lib/solapi';
import { createClient } from '@/lib/supabase/server';

export async function POST(request) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has manager role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || userData?.role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { type, ...params } = await request.json();

    let result;
    switch (type) {
      case 'single':
        result = await sendSMS(params);
        break;
      case 'bulk':
        result = await sendBulkSMS(params.messages);
        break;
      case 'scheduled':
        result = await sendScheduledSMS(params);
        break;
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Log the SMS send event
    await supabase.from('notification_logs').insert({
      user_id: user.id,
      type: 'sms',
      recipient: type === 'bulk' ? 'multiple' : params.to,
      message: params.text || 'Bulk message',
      status: 'sent',
      metadata: result.data,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('SMS API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}