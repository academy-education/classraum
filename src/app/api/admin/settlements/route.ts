import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

const PORTONE_API_SECRET = process.env.PORTONE_API_SECRET;
const PORTONE_API_URL = 'https://api.portone.io';

/**
 * PostgREST reads `*` as the LIKE wildcard inside an `ilike` pattern, and `,`
 * `(` `)` terminate a value inside an `or(...)` group. Neutralise them so a
 * user typing `Kim (Gangnam), *` searches for that literal text instead of
 * producing a match-everything pattern or a 400.
 */
function sanitizeIlikeTerm(term: string): string {
  return term.replace(/[*,()\\]/g, ' ').trim();
}

export async function GET(request: NextRequest) {
  try {
    // Get authorization token from header
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // Create Supabase client with auth header
    const supabase = createClient<Database>(
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

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const { data: userInfo, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userInfo || !['admin', 'super_admin'].includes(userInfo.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Academy lookups below run with the SERVICE ROLE, not the caller's JWT.
    // RLS on `academies` scopes rows to the academies a user belongs to — the
    // admin token used here saw 1 of 12 academies — so resolving a name filter
    // (or an academy name for a partner id) through the caller's client
    // silently matched nothing. The admin/super_admin check above is the
    // authorization gate; this client only performs the lookup.
    const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createClient<Database>(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        )
      : supabase;

    // Check if PortOne API secret is configured.
    // This is a MISCONFIGURATION, not an empty result — returning 200 with an
    // empty list here made a broken deployment look like "no settlements yet".
    if (!PORTONE_API_SECRET) {
      console.warn('[Settlements API] PORTONE_API_SECRET not configured');
      return NextResponse.json(
        {
          error: 'not_configured',
          message: 'PortOne API not configured. Please set PORTONE_API_SECRET environment variable.'
        },
        { status: 503 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '0');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const partnerId = searchParams.get('partnerId');
    const status = searchParams.get('status');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const academyName = searchParams.get('academyName');

    // Build PortOne API request body
    // PortOne requires a filter object with criteria field
    // Convert dates to ISO 8601 format with time
    const defaultFrom = from
      ? new Date(from).toISOString()
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const defaultTo = to
      ? new Date(to).toISOString()
      : new Date().toISOString();

    const requestBody: any = {
      page: {
        number: page,
        size: pageSize,
      },
      filter: {
        criteria: {
          timestampRange: {
            from: defaultFrom,
            until: defaultTo,
          },
        },
      },
    };

    // Add optional filters
    if (status) {
      requestBody.filter.statuses = [status];
    }

    // Academy-name search is resolved SERVER-SIDE: PortOne only filters by
    // partnerIds, so we look up the matching academies' PortOne partner ids and
    // push them into the filter. This makes the search span all pages (the old
    // client-side filter only matched the current 20-row page and left the
    // pagination count wrong).
    const partnerIds: string[] = [];
    if (partnerId) partnerIds.push(partnerId);
    if (academyName && sanitizeIlikeTerm(academyName)) {
      const { data: matchedAcademies, error: academyError } = await supabaseAdmin
        .from('academies')
        .select('portone_partner_id')
        .ilike('name', `%${sanitizeIlikeTerm(academyName)}%`)
        .not('portone_partner_id', 'is', null);
      if (academyError) {
        console.error('[Settlements API] academy lookup failed:', academyError);
        return NextResponse.json(
          { error: 'academy_lookup_failed', message: 'Failed to resolve academy name filter' },
          { status: 500 }
        );
      }
      const ids = (matchedAcademies || [])
        .map(a => a.portone_partner_id)
        .filter(Boolean) as string[];
      if (ids.length === 0) {
        // No academy matches the search — no settlements can match either.
        // Genuinely empty (200), as distinct from the upstream-failure 502 below.
        return NextResponse.json({ items: [], totalCount: 0, page, pageSize });
      }
      partnerIds.push(...ids);
    }
    if (partnerIds.length > 0) {
      requestBody.filter.partnerIds = [...new Set(partnerIds)];
    }

    // Fetch settlements from PortOne Platform API
    // Note: PortOne supports query params via x-portone-query-or-body extension
    // We send the request body as a 'requestBody' query parameter
    const queryParams = new URLSearchParams({
      requestBody: JSON.stringify(requestBody),
    });

    const response = await fetch(
      `${PORTONE_API_URL}/platform/partner-settlements?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `PortOne ${PORTONE_API_SECRET}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('PortOne API error:', response.status, errorData);

      // An upstream failure is NOT an empty result. Returning 200 + items:[]
      // (the old "better UX") made a PortOne outage indistinguishable from a
      // period with no settlements, which is exactly the kind of quiet wrong
      // answer CLAUDE.md forbids. Propagate it as a gateway error so the UI
      // can render a retryable error state.
      return NextResponse.json(
        {
          error: 'upstream_error',
          upstreamStatus: response.status,
          message: 'Failed to fetch settlements from PortOne',
          details: errorData,
        },
        { status: 502 }
      );
    }

    const settlementsData = await response.json();

    // Fetch academy names for partner IDs
    if (settlementsData.items && settlementsData.items.length > 0) {
      const partnerIds = [...new Set(
        settlementsData.items
          .map((s: { partner?: { id?: string } }) => s.partner?.id)
          .filter((id: string | undefined): id is string => Boolean(id))
      )] as string[];

      const { data: academies } = await supabaseAdmin
        .from('academies')
        .select('portone_partner_id, name')
        .in('portone_partner_id', partnerIds);

      // Create a map of partner ID to academy name
      const partnerToAcademy = new Map(
        academies?.map(a => [a.portone_partner_id, a.name]) || []
      );

      // Enrich settlement data with academy names
      settlementsData.items = settlementsData.items.map((settlement: any) => ({
        ...settlement,
        academyName: partnerToAcademy.get(settlement.partner?.id) || 'Unknown',
      }));
    }

    // Normalise PortOne's envelope instead of leaking it to two separate
    // clients. Upstream returns `{ items, page: { number, size, totalCount } }`
    // — both clients were reading a top-level `totalCount` that never existed,
    // so pagination could never appear. The shape is flattened HERE, once.
    const totalCount: number =
      settlementsData.page?.totalCount ?? settlementsData.totalCount ?? 0;

    return NextResponse.json({
      items: settlementsData.items || [],
      totalCount,
      page,
      pageSize,
      counts: settlementsData.counts,
    });
  } catch (error) {
    console.error('Error fetching settlements:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
