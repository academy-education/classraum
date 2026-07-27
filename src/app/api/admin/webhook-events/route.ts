import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

    // Verify the user is an admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userDataError || !userData || !['admin', 'super_admin'].includes(userData.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '0');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const type = searchParams.get('type');
    const eventType = searchParams.get('eventType');
    const status = searchParams.get('status');
    const processed = searchParams.get('processed');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build query
    let query = supabase
      .from('webhook_events')
      .select('*', { count: 'exact' })
      .order('received_at', { ascending: false });

    // Apply filters
    if (type) {
      query = query.eq('type', type);
    }
    if (eventType) {
      query = query.eq('event_type', eventType);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (processed !== null && processed !== '') {
      query = query.eq('processed', processed === 'true');
    }
    if (startDate) {
      query = query.gte('received_at', startDate);
    }
    if (endDate) {
      query = query.lte('received_at', endDate);
    }

    // Pagination
    const from = page * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data: events, error: eventsError, count } = await query;

    if (eventsError) {
      console.error('[Webhook Events API] Error fetching events:', eventsError);
      throw eventsError;
    }

    // Unique event types for the filter dropdown. Previously an unbounded
    // .select() of every row deduped in JS — PostgREST caps that at 1000 rows,
    // so once the table grew past a thousand events the dropdown reflected only
    // the newest slice and rare event types quietly disappeared from it.
    const { data: eventTypeRows } = await supabase.rpc('admin_webhook_event_types');
    const uniqueEventTypes = (Array.isArray(eventTypeRows) ? eventTypeRows : [])
      .map((r: { event_type: string }) => r.event_type);

    // Statistics.
    //
    // `total` is an exact count over the whole (filtered) table, but the
    // breakdown used to be .filter().length over the CURRENT PAGE — so the
    // cards could never add up: "5,000 events / 43 processed / 7 unprocessed".
    // The breakdown is now counted in SQL under exactly the same filters.
    const { data: statRows, error: statsError } = await supabase.rpc('admin_webhook_event_stats', {
      // Omitted params fall back to the function's DEFAULT NULL, so pass
      // `undefined` rather than an explicit null (which the generated Args
      // type does not allow).
      p_type: type || undefined,
      p_event_type: eventType || undefined,
      p_status: status || undefined,
      p_processed: processed !== null && processed !== '' ? processed === 'true' : undefined,
      p_start: startDate || undefined,
      p_end: endDate || undefined,
    });
    if (statsError) {
      console.error('[Webhook Events API] Error fetching stats:', statsError);
      throw statsError;
    }
    const s = Array.isArray(statRows) && statRows.length > 0 ? statRows[0] : null;
    const toNum = (v: unknown) => {
      const n = typeof v === 'number' ? v : Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    const stats = {
      total: toNum(s?.total),
      processed: toNum(s?.processed),
      unprocessed: toNum(s?.unprocessed),
      errors: toNum(s?.errors)
    };

    return NextResponse.json({
      success: true,
      data: events || [],
      eventTypes: uniqueEventTypes,
      statistics: stats,
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize)
      }
    });

  } catch (error: any) {
    console.error('[Webhook Events API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch webhook events' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

    // Verify the user is a super admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userDataError || !userData || userData.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden: Super Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, markProcessed } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    // Update webhook event processed status
    const { error: updateError } = await supabase
      .from('webhook_events')
      .update({ processed: markProcessed })
      .eq('id', id);

    if (updateError) {
      console.error('[Webhook Events API] Error updating event:', updateError);
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: `Event marked as ${markProcessed ? 'processed' : 'unprocessed'}`
    });

  } catch (error: any) {
    console.error('[Webhook Events API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update webhook event' },
      { status: 500 }
    );
  }
}
