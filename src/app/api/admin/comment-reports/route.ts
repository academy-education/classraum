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
    const reportType = searchParams.get('reportType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build query
    let query = supabase
      .from('comment_reports')
      .select(`
        id,
        comment_id,
        text,
        user_id,
        report_type,
        created_at,
        updated_at,
        users!comment_reports_user_id_fkey(name, email),
        assignment_comments!comment_reports_comment_id_fkey(
          id,
          text,
          user_id,
          assignment_id,
          users!assignment_comments_user_id_fkey(name, email)
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply filters
    if (reportType) {
      query = query.eq('report_type', reportType);
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

    const { data: reports, error: reportsError, count } = await query;

    if (reportsError) {
      console.error('[Comment Reports API] Error fetching reports:', reportsError);
      throw reportsError;
    }

    // Calculate statistics
    const stats = {
      total: count || 0,
      spam: reports?.filter(r => r.report_type === 'spam').length || 0,
      abuse: reports?.filter(r => r.report_type === 'abuse').length || 0,
      other: reports?.filter(r => r.report_type === 'other').length || 0
    };

    return NextResponse.json({
      success: true,
      data: reports || [],
      statistics: stats,
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize)
      }
    });

  } catch (error: any) {
    console.error('[Comment Reports API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch comment reports' },
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

    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');
    const reportId = searchParams.get('reportId');
    const commentId = searchParams.get('commentId');

    if (!reportId) {
      return NextResponse.json(
        { error: 'Missing required parameter: reportId' },
        { status: 400 }
      );
    }

    if (action === 'dismiss') {
      // Just delete the report
      const { error: deleteError } = await supabase
        .from('comment_reports')
        .delete()
        .eq('id', reportId);

      if (deleteError) {
        console.error('[Comment Reports API] Error deleting report:', deleteError);
        throw deleteError;
      }

      return NextResponse.json({
        success: true,
        message: 'Report dismissed'
      });

    } else if (action === 'remove_comment') {
      if (!commentId) {
        return NextResponse.json(
          { error: 'Missing required parameter: commentId' },
          { status: 400 }
        );
      }

      // Delete the comment and the report
      const [commentResult, reportResult] = await Promise.all([
        supabase.from('assignment_comments').delete().eq('id', commentId),
        supabase.from('comment_reports').delete().eq('id', reportId)
      ]);

      if (commentResult.error || reportResult.error) {
        console.error('[Comment Reports API] Error removing comment:', commentResult.error || reportResult.error);
        throw commentResult.error || reportResult.error;
      }

      return NextResponse.json({
        success: true,
        message: 'Comment removed and report dismissed'
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('[Comment Reports API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    );
  }
}
