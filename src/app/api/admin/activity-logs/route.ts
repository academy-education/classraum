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
    const actionType = searchParams.get('actionType');
    const adminUserId = searchParams.get('adminUserId');
    const targetType = searchParams.get('targetType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build query
    let query = supabase
      .from('admin_activity_logs')
      .select(`
        id,
        admin_user_id,
        action_type,
        target_type,
        target_id,
        description,
        metadata,
        ip_address,
        user_agent,
        created_at,
        users!admin_activity_logs_admin_user_id_fkey(name, email)
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply filters
    if (actionType) {
      query = query.eq('action_type', actionType);
    }
    if (adminUserId) {
      query = query.eq('admin_user_id', adminUserId);
    }
    if (targetType) {
      query = query.eq('target_type', targetType);
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
      console.error('[Admin Activity Logs API] Error fetching logs:', logsError);
      throw logsError;
    }

    return NextResponse.json({
      success: true,
      data: logs || [],
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize)
      }
    });

  } catch (error: any) {
    console.error('[Admin Activity Logs API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch activity logs' },
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

    // Get log data from request body
    const body = await request.json();
    const { action_type, target_type, target_id, description, metadata } = body;

    if (!action_type || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: action_type, description' },
        { status: 400 }
      );
    }

    // Get IP address and user agent
    const ip_address = request.headers.get('x-forwarded-for') ||
                       request.headers.get('x-real-ip') ||
                       'unknown';
    const user_agent = request.headers.get('user-agent') || 'unknown';

    // Insert activity log
    const { data: log, error: logError } = await supabase
      .from('admin_activity_logs')
      .insert({
        admin_user_id: user.id,
        action_type,
        target_type,
        target_id,
        description,
        metadata: metadata || {},
        ip_address,
        user_agent
      })
      .select()
      .single();

    if (logError) {
      console.error('[Admin Activity Logs API] Error creating log:', logError);
      throw logError;
    }

    return NextResponse.json({
      success: true,
      data: log
    });

  } catch (error: any) {
    console.error('[Admin Activity Logs API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create activity log' },
      { status: 500 }
    );
  }
}
