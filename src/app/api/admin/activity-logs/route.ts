import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const LOG_SELECT = `
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
      `;

/** Sort keys the client may ask for. `admin` is not a column on this table —
 *  it is handled by the actor-bucket path below. Anything unrecognised falls
 *  back to created_at. Never interpolate the raw param into .order(). */
const SORT_KEYS = new Set(['created_at', 'action_type', 'description', 'ip_address', 'admin']);

/**
 * Build a PostgREST `or=(...)` expression for a free-text search.
 *
 * PostgREST's logical-operator grammar is comma/parenthesis delimited — and
 * real descriptions here contain both (e.g. "Resolved 1 alert(s)") — so values
 * are double-quoted and `"`/`\` are backslash-escaped. `%` and `*` are
 * stripped: they are ILIKE wildcards and PostgREST exposes no ESCAPE clause,
 * so a typed `*` would otherwise mean "match everything".
 */
function quoteSearch(term: string): string | null {
  const cleaned = term.trim().replace(/[%*]/g, '').slice(0, 200);
  if (!cleaned) return null;
  return `"%${cleaned.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}%"`;
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
    const actionType = searchParams.get('actionType');
    const adminUserId = searchParams.get('adminUserId');
    const targetType = searchParams.get('targetType');
    // Filter to the rows that targeted ONE entity. Added for the user-detail
    // Activity tab, which previously queried admin_activity_logs straight
    // from the browser with the anon key — that table has RLS enabled and
    // ZERO policies, so the read could only ever return an empty list.
    const targetId = searchParams.get('targetId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search') || '';

    const rawSort = (searchParams.get('sort') || 'created_at:desc').split(':');
    const sortKey = SORT_KEYS.has(rawSort[0]) ? rawSort[0] : 'created_at';
    const sortAsc = rawSort[1] === 'asc';

    // The actor's NAME and EMAIL live on the joined `users` row, and PostgREST
    // cannot OR a parent column against an embedded one in a single filter. So
    // the matching actors are resolved first and folded into the same `or` as
    // `admin_user_id.in.(...)`. The candidate set is restricted to admin roles
    // because only admins can write to this table (see POST below) — an actor
    // whose role was later changed would not be matched by name here, though
    // their rows still match on description.
    const quoted = quoteSearch(search);
    let searchOr: string | null = null;
    if (quoted) {
      const { data: actorMatches } = await supabase
        .from('users')
        .select('id')
        .in('role', ['admin', 'super_admin'])
        .or(`name.ilike.${quoted},email.ilike.${quoted}`)
        .limit(500);
      const ids = (actorMatches || []).map((u: { id: string }) => u.id);
      searchOr = ids.length
        ? `description.ilike.${quoted},admin_user_id.in.(${ids.join(',')})`
        : `description.ilike.${quoted}`;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const applyFilters = (q: any) => {
      if (actionType) q = q.eq('action_type', actionType);
      if (adminUserId) q = q.eq('admin_user_id', adminUserId);
      if (targetType) q = q.eq('target_type', targetType);
      if (targetId) q = q.eq('target_id', targetId);
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

    if (sortKey === 'admin') {
      // Sorting by the actor's display name, server-side and over the whole
      // filtered set. The name is on the embedded users row, which PostgREST
      // cannot ORDER BY from the parent, so the route resolves the page against
      // per-actor counts: label each admin, sort the labels here, count each
      // actor's rows under the same filters, then range-query inside the
      // buckets the page window falls in. A trailing bucket catches any rows
      // whose actor is not in the admin list, so no row is ever dropped.
      const { data: actorRows } = await supabase
        .from('users')
        .select('id, name, email')
        .in('role', ['admin', 'super_admin'])
        .limit(500);
      const actors = (actorRows || [])
        .map((u: { id: string; name: string | null; email: string }) => ({
          id: u.id,
          label: u.name || u.email || u.id,
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
      if (!sortAsc) actors.reverse();

      const { count: totalCount, error: totalError } = await applyFilters(
        supabase.from('admin_activity_logs').select('id', { count: 'exact', head: true })
      );
      if (totalError) throw totalError;
      count = totalCount || 0;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const buckets: { apply: (q: any) => any; count: number }[] = [];
      const perActor = await Promise.all(
        actors.map(async (a) => {
          const { count: c, error } = await applyFilters(
            supabase.from('admin_activity_logs').select('id', { count: 'exact', head: true })
          ).eq('admin_user_id', a.id);
          if (error) throw error;
          return c || 0;
        })
      );
      actors.forEach((a, i) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        buckets.push({ apply: (q: any) => q.eq('admin_user_id', a.id), count: perActor[i] });
      });
      const known = perActor.reduce((x, y) => x + y, 0);
      if (count > known && actors.length > 0) {
        const idList = actors.map((a) => a.id).join(',');
        buckets.push({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          apply: (q: any) => q.not('admin_user_id', 'in', `(${idList})`),
          count: count - known,
        });
      } else if (actors.length === 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        buckets.push({ apply: (q: any) => q, count });
      }

      let skip = from;
      let need = pageSize;
      for (const bucket of buckets) {
        if (need <= 0) break;
        if (skip >= bucket.count) {
          skip -= bucket.count;
          continue;
        }
        const take = Math.min(need, bucket.count - skip);
        const { data, error } = await bucket
          .apply(applyFilters(supabase.from('admin_activity_logs').select(LOG_SELECT)))
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
        supabase.from('admin_activity_logs').select(LOG_SELECT, { count: 'exact' })
      )
        .order(sortKey, { ascending: sortAsc })
        .order('id', { ascending: true })
        .range(from, to);

      if (logsError) {
        console.error('[Admin Activity Logs API] Error fetching logs:', logsError);
        throw logsError;
      }
      logs = data || [];
      count = c || 0;
    }

    return NextResponse.json({
      success: true,
      data: logs,
      pagination: {
        page,
        pageSize,
        total: count,
        totalPages: Math.ceil(count / pageSize)
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
