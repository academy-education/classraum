import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/** Columns the free-text search runs over. Mirrors what the dashboard used
 *  to filter client-side (message / error_message / service_name) — the
 *  difference is that this now runs over the whole table, not the loaded page. */
const SEARCH_COLUMNS = ['message', 'error_message', 'service_name'];

/** Severity order, most severe first. `level` is a text column, so ORDER BY
 *  level is ALPHABETICAL (critical, debug, error, info, warn) — which is not
 *  what an admin means by "sort by severity". See the bucket path in GET. */
const SEVERITY_DESC = ['critical', 'error', 'warn', 'info', 'debug'];

/** Sort keys the client may ask for. Anything else falls back to created_at:desc.
 *  Never interpolate the raw param into .order(). */
const SORT_KEYS = new Set(['created_at', 'service_name', 'level']);

/**
 * Build a PostgREST `or=(...)` expression for a free-text search.
 *
 * PostgREST's logical-operator grammar is comma/parenthesis delimited, so a
 * search term containing `,` `(` `)` would either 400 or silently re-parse
 * into a different filter. Values are therefore double-quoted, and `"` and
 * `\` inside the term are backslash-escaped — the escape PostgREST defines
 * for quoted values.
 *
 * `%` and `*` are STRIPPED rather than escaped: both are ILIKE wildcards and
 * SQL LIKE has no inline escape without an ESCAPE clause, which PostgREST
 * does not expose. Stripping means a user typing `*` gets a literal-ish
 * search rather than "match everything".
 */
function buildSearchOr(term: string, columns: string[]): string | null {
  const cleaned = term.trim().replace(/[%*]/g, '').slice(0, 200);
  if (!cleaned) return null;
  const escaped = cleaned.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return columns.map((c) => `${c}.ilike."%${escaped}%"`).join(',');
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
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const level = searchParams.get('level');
    const serviceName = searchParams.get('serviceName');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search') || '';

    const rawSort = (searchParams.get('sort') || 'created_at:desc').split(':');
    const sortKey = SORT_KEYS.has(rawSort[0]) ? rawSort[0] : 'created_at';
    const sortAsc = rawSort[1] === 'asc';

    const searchOr = buildSearchOr(search, SEARCH_COLUMNS);

    /** Applies every filter (including search) to a freshly-built query.
     *  Same shape as the pre-existing server-side `level` filter — search is
     *  now one of these, so it covers the whole table instead of the page. */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const applyFilters = (q: any) => {
      if (level) q = q.eq('level', level);
      if (serviceName) q = q.eq('service_name', serviceName);
      if (startDate) q = q.gte('created_at', startDate);
      if (endDate) q = q.lte('created_at', endDate);
      if (searchOr) q = q.or(searchOr);
      return q;
    };

    // Pagination
    const from = page * pageSize;
    const to = from + pageSize - 1;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let logs: any[] = [];
    let count = 0;

    if (sortKey === 'level') {
      // SEVERITY ordering, server-side, without DDL. PostgREST cannot express
      // `ORDER BY CASE level ...`, so the route resolves the requested page
      // against per-level counts: count each severity bucket under the same
      // filters, walk the buckets in severity order to find which ones the
      // page window falls in, then range-query inside those buckets. The
      // result is a genuine global ordering over the whole filtered set, not
      // a re-sort of 50 loaded rows.
      const order = sortAsc ? [...SEVERITY_DESC].reverse() : SEVERITY_DESC;
      const counts = await Promise.all(
        order.map(async (lv) => {
          const { count: c, error } = await applyFilters(
            supabase.from('error_logs').select('id', { count: 'exact', head: true })
          ).eq('level', lv);
          if (error) throw error;
          return c || 0;
        })
      );
      count = counts.reduce((a, b) => a + b, 0);

      let skip = from;
      let need = pageSize;
      for (let i = 0; i < order.length && need > 0; i++) {
        const bucketCount = counts[i];
        if (skip >= bucketCount) {
          skip -= bucketCount;
          continue;
        }
        const take = Math.min(need, bucketCount - skip);
        const { data, error } = await applyFilters(supabase.from('error_logs').select('*'))
          .eq('level', order[i])
          // Deterministic within a bucket: newest first, id as tiebreak so
          // paging can't show the same row twice.
          .order('created_at', { ascending: false })
          .order('id', { ascending: true })
          .range(skip, skip + take - 1);
        if (error) throw error;
        logs = logs.concat(data || []);
        need -= take;
        skip = 0;
      }
    } else {
      const { data, error: logsError, count: c } = await applyFilters(
        supabase.from('error_logs').select('*', { count: 'exact' })
      )
        .order(sortKey, { ascending: sortAsc })
        .order('id', { ascending: true })
        .range(from, to);

      if (logsError) {
        console.error('[Error Logs API] Error fetching logs:', logsError);
        throw logsError;
      }
      logs = data || [];
      count = c || 0;
    }

    // Unique service names for the filter dropdown, DISTINCT-ed in SQL.
    // The previous unbounded .select() was silently capped at PostgREST's
    // 1000-row default, so on a busy error table the dropdown listed only the
    // services present in the newest thousand rows — and a service that had
    // stopped erroring recently became unfilterable.
    const { data: serviceRows } = await supabase.rpc('admin_error_log_services');
    const uniqueServices = (Array.isArray(serviceRows) ? serviceRows : [])
      .map((r: { service_name: string }) => r.service_name);

    return NextResponse.json({
      success: true,
      data: logs,
      services: uniqueServices,
      pagination: {
        page,
        pageSize,
        total: count,
        totalPages: Math.ceil(count / pageSize)
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

    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);
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
