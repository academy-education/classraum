import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Build a PostgREST-safe `ilike` value for use inside an `or=(...)` filter.
 *
 * `or=(...)` is a comma/parenthesis-delimited grammar, so a raw user string
 * containing `,` `(` `)` either 400s or — worse — parses as an extra disjunct
 * and matches every row. PostgREST's own answer to that is to double-quote the
 * value, which is what this does: the quoted form keeps commas and parens
 * LITERAL, so searching for `a,b` really searches for `a,b`.
 *
 * Inside the quotes only `\` and `"` still need escaping. `%` and `*` are
 * ilike wildcards with no escape hatch over the wire, so they are folded to
 * `_` (single-character wildcard) rather than left able to widen the match to
 * everything. Length-capped so a pathological paste can't build a giant
 * pattern.
 *
 * Returns '' for an absent/blank search, which callers treat as "no filter".
 */
function sanitizeSearch(raw: string | null): string {
  if (!raw) return '';
  return raw
    .trim()
    .slice(0, 100)
    .replace(/[%*]/g, '_')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
}

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
    const pageSize = Math.min(Math.max(parseInt(searchParams.get('pageSize') || '50') || 50, 1), 5000);
    const reportType = searchParams.get('reportType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    // Free-text search. Used to be a .filter() over the 50 rows the client had
    // already loaded, so it could only ever find matches on the current page
    // while the footer went on claiming the full total. Server-side now.
    const search = sanitizeSearch(searchParams.get('search'));

    // The client searched three fields, and two of them live on OTHER tables
    // (the reported comment's text, the reporter's email). PostgREST cannot
    // OR across an embedded resource and the parent in one filter, so those
    // two are resolved to id lists first and folded into the same `or(...)`
    // as an `in.(...)` disjunct. Both lookups are capped; when a cap is hit
    // the search is narrower than the client-side version was, but it is
    // narrower over the WHOLE table rather than exact over one page.
    let searchOr: string | null = null;
    if (search) {
      // The two standalone .ilike() lookups below are NOT inside an or=(...)
      // group, so they must not carry the backslash escaping that only the
      // quoted form needs — undo it for them.
      const unquotedSearch = search.replace(/\\(["\\\\])/g, '$1');
      const [{ data: matchedUsers }, { data: matchedComments }] = await Promise.all([
        supabase.from('users').select('id').ilike('email', `%${unquotedSearch}%`).limit(500),
        supabase.from('assignment_comments').select('id').ilike('text', `%${unquotedSearch}%`).limit(500),
      ]);
      const userIds = (matchedUsers || []).map((u) => u.id);
      const commentIds = (matchedComments || []).map((c) => c.id);
      // Values are double-quoted: see sanitizeSearch.
      const clauses = [`text.ilike."%${search}%"`];
      if (userIds.length > 0) clauses.push(`user_id.in.(${userIds.join(',')})`);
      if (commentIds.length > 0) clauses.push(`comment_id.in.(${commentIds.join(',')})`);
      searchOr = clauses.join(',');
    }

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
    if (searchOr) {
      query = query.or(searchOr);
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

    // Statistics.
    //
    // `total` was an exact count over the whole (filtered) table while the
    // per-type counts were .filter().length over the current 50-row page, so
    // the breakdown could never sum to the total on any table bigger than one
    // page. Counted in SQL now, under the same filters as `total`.
    //
    // This used to call admin_comment_report_stats(), but that function has no
    // `search` parameter — once search became a server-side filter the RPC
    // would have described a different set of rows than the list below it. The
    // counts are now issued as head:true count queries carrying EXACTLY the
    // filters the list carries, search included. spam / abuse / other are
    // mutually exclusive and exhaustive, so they always sum to `total`.
    const countUnder = async (shape: (q: any) => any): Promise<number> => {
      let q: any = supabase.from('comment_reports').select('id', { count: 'exact', head: true });
      if (reportType) q = q.eq('report_type', reportType);
      if (startDate) q = q.gte('created_at', startDate);
      if (endDate) q = q.lte('created_at', endDate);
      if (searchOr) q = q.or(searchOr);
      const { count: c, error } = await shape(q);
      if (error) throw error;
      return c || 0;
    };

    const [spamCount, abuseCount, otherCount] = await Promise.all([
      countUnder((q) => q.eq('report_type', 'spam')),
      countUnder((q) => q.eq('report_type', 'abuse')),
      // Anything that is neither spam nor abuse, so the three always sum to total.
      countUnder((q) => q.not('report_type', 'in', '("spam","abuse")')),
    ]);

    const stats = {
      total: count || 0,
      spam: spamCount,
      abuse: abuseCount,
      other: otherCount
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
