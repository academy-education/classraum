import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    const level = searchParams.get('level');
    const serviceName = searchParams.get('serviceName');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build query
    let query = supabase
      .from('error_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply filters
    if (level) {
      query = query.eq('level', level);
    }
    if (serviceName) {
      query = query.eq('service_name', serviceName);
    }
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    // Pagination
    const from = page * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data: logs, error: logsError, count } = await query;

    if (logsError) {
      console.error('[Error Logs API] Error fetching logs:', logsError);
      throw logsError;
    }

    // Get unique service names for filter dropdown
    const { data: services } = await supabase
      .from('error_logs')
      .select('service_name')
      .order('service_name');

    const uniqueServices = [...new Set(services?.map(s => s.service_name) || [])];

    return NextResponse.json({
      success: true,
      data: logs || [],
      services: uniqueServices,
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize)
      }
    });

  } catch (error: any) {
    console.error('[Error Logs API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch error logs' },
      { status: 500 }
    );
  }
}

/**
 * POST — append a single error log row from the admin client (e.g. from the
 * App Router error boundary at `app/admin/error.tsx`). Auth-gated to admins
 * only so random callers can't pollute the table. The client sends a small
 * structured payload — message, stack, optional context — and the server
 * stamps the user id and request id.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!userData || !['admin', 'super_admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body.message !== 'string') {
      return NextResponse.json({ error: 'Missing message' }, { status: 400 });
    }

    const { error: insertError } = await supabase.from('error_logs').insert({
      service_name: typeof body.serviceName === 'string' ? body.serviceName : 'admin-ui',
      level: body.level === 'critical' ? 'critical' : 'error',
      message: body.message.slice(0, 1000),
      error_message: typeof body.errorMessage === 'string' ? body.errorMessage.slice(0, 1000) : null,
      error_stack: typeof body.stack === 'string' ? body.stack.slice(0, 8000) : null,
      context: body.context && typeof body.context === 'object' ? body.context : null,
      user_id: user.id,
      request_id: body.digest || null,
    });

    if (insertError) {
      console.error('[Error Logs API] Insert failed:', insertError);
      return NextResponse.json({ error: 'Insert failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Error Logs API] POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to log error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    // Get days to keep from query params
    const searchParams = request.nextUrl.searchParams;
    const daysToKeep = parseInt(searchParams.get('daysToKeep') || '30');

    // Delete old logs
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const { error: deleteError } = await supabase
      .from('error_logs')
      .delete()
      .lt('created_at', cutoffDate.toISOString());

    if (deleteError) {
      console.error('[Error Logs API] Error deleting logs:', deleteError);
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
      message: `Deleted logs older than ${daysToKeep} days`
    });

  } catch (error: any) {
    console.error('[Error Logs API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete error logs' },
      { status: 500 }
    );
  }
}
