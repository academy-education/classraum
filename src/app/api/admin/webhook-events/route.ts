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

/**
 * Whitelist of sortable columns. User input is never interpolated into
 * `.order()` — an unrecognised key falls back to `received_at`.
 */
const SORTABLE_COLUMNS = new Set([
  'received_at',
  'amount',
  'status',
  'event_type',
  'processed',
]);

function parseSort(raw: string | null): { column: string; ascending: boolean } {
  const [key, dir] = (raw || '').split(':');
  if (!SORTABLE_COLUMNS.has(key)) {
    return { column: 'received_at', ascending: false };
  }
  return { column: key, ascending: dir === 'asc' };
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
    // Capped: the CSV export asks for the whole filtered set in one request,
    // and an uncapped pageSize would let a caller pull the entire table.
    const pageSize = Math.min(Math.max(parseInt(searchParams.get('pageSize') || '50') || 50, 1), 5000);
    const type = searchParams.get('type');
    const eventType = searchParams.get('eventType');
    const status = searchParams.get('status');
    const processed = searchParams.get('processed');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    // Free-text search. Used to be a .filter() over the 50 rows the client had
    // already loaded, so it could only ever find matches on the current page
    // while the footer went on claiming the full total. Server-side now.
    const search = sanitizeSearch(searchParams.get('search'));
    const sort = parseSort(searchParams.get('sort'));

    // Every list/count query below MUST see the same filters, or the cards
    // stop describing the rows. One applier, used by all four.
    const applyFilters = (q: any): any => {
      let out = q;
      if (type) out = out.eq('type', type);
      if (eventType) out = out.eq('event_type', eventType);
      if (status) out = out.eq('status', status);
      if (processed !== null && processed !== '') out = out.eq('processed', processed === 'true');
      if (startDate) out = out.gte('received_at', startDate);
      if (endDate) out = out.lte('received_at', endDate);
      if (search) {
        // Values are double-quoted: see sanitizeSearch.
        out = out.or(
          `entity_id.ilike."%${search}%",event_type.ilike."%${search}%",partner_id.ilike."%${search}%"`
        );
      }
      return out;
    };

    // Build query. Sort is whitelisted server-side (parseSort) so ordering
    // covers the whole filtered set, not just the page the client holds.
    // `nullsFirst: false` keeps NULL amounts at the end in both directions,
    // matching the old client-side sort which used -Infinity for null.
    let query = applyFilters(
      supabase
        .from('webhook_events')
        .select('*', { count: 'exact' })
        .order(sort.column, { ascending: sort.ascending, nullsFirst: false })
    );
    // Deterministic tiebreak so pagination can't repeat or skip rows.
    if (sort.column !== 'received_at') {
      query = query.order('received_at', { ascending: false });
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

    // Statistics — a REAL PARTITION of the filtered set.
    //
    // Measured 2026-08-24, before this change: the cards read
    // "Total 2 / Succeeded 1 / Pending 1 / Failed 1" — three numbers summing
    // to 3 over 2 events. The card labelled "Succeeded" was rendering the raw
    // `processed` count, and the one unprocessed-with-an-error row was being
    // counted BOTH as Pending (not processed) and as Failed (has an error).
    // `processed` and `error_message` are independent columns, so counting one
    // bucket per column can never partition the table.
    //
    // The three buckets below are mutually exclusive and exhaustive by
    // construction, so they always sum to `total`:
    //   failed    = error_message IS NOT NULL
    //   succeeded = error_message IS NULL AND processed IS TRUE
    //   pending   = error_message IS NULL AND processed IS NOT TRUE
    //
    // `processed` is NULLABLE (default false), so `pending` is written as
    // NOT (processed IS TRUE) rather than `processed = false` — otherwise a
    // NULL row would fall into no bucket and the three would silently sum to
    // LESS than the total, which is the same class of bug in the other
    // direction.
    //
    // Counted in SQL (head:true fetches no rows) under exactly the same
    // filters as the list — including `search`, which the previous RPC could
    // not see.
    const countUnder = async (
      shape: (q: any) => any
    ): Promise<number> => {
      const { count, error } = await shape(
        applyFilters(supabase.from('webhook_events').select('id', { count: 'exact', head: true }))
      );
      if (error) throw error;
      return count || 0;
    };

    const [failedCount, succeededCount, pendingCount] = await Promise.all([
      countUnder((q) => q.not('error_message', 'is', null)),
      countUnder((q) => q.is('error_message', null).is('processed', true)),
      countUnder((q) => q.is('error_message', null).not('processed', 'is', true)),
    ]);

    const stats = {
      total: count || 0,
      succeeded: succeededCount,
      pending: pendingCount,
      failed: failedCount,
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
