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

// GET endpoint for fetching payouts
export async function GET(request: NextRequest) {
  try {
    console.log('[Payouts API] Request received:', {
      url: request.nextUrl.toString(),
      params: Object.fromEntries(request.nextUrl.searchParams)
    });

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

    // Check if PortOne API secret is configured
    // A missing secret is a MISCONFIGURATION, not an empty payout history.
    if (!PORTONE_API_SECRET) {
      console.warn('[Payouts API] PORTONE_API_SECRET not configured');
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
    // Academy-name search runs SERVER-SIDE. PortOne's payouts API has no
    // name/text filter — only `partnerIds` — so the name is resolved against
    // our own `academies` table and pushed down as partner ids. This makes the
    // search span every page; the previous client-side `.filter()` only
    // matched the 20 rows already loaded while the footer kept showing the
    // unfiltered total.
    const partnerIds: string[] = [];
    if (partnerId) partnerIds.push(partnerId);
    if (academyName && sanitizeIlikeTerm(academyName)) {
      const term = sanitizeIlikeTerm(academyName);
      const { data: matchedAcademies, error: academyError } = await supabaseAdmin
        .from('academies')
        .select('portone_partner_id')
        .ilike('name', `%${term}%`)
        .not('portone_partner_id', 'is', null);

      if (academyError) {
        console.error('[Payouts API] academy lookup failed:', academyError);
        return NextResponse.json(
          { error: 'academy_lookup_failed', message: 'Failed to resolve academy name filter' },
          { status: 500 }
        );
      }

      const ids = (matchedAcademies || [])
        .map(a => a.portone_partner_id)
        .filter(Boolean) as string[];
      if (ids.length === 0) {
        // No academy matches the search — no payouts can match either.
        return NextResponse.json({ items: [], totalCount: 0, page, pageSize });
      }
      partnerIds.push(...ids);
    }
    if (partnerIds.length > 0) {
      requestBody.filter.partnerIds = [...new Set(partnerIds)];
    }

    // Fetch payouts from PortOne Platform API
    // Note: PortOne supports query params via x-portone-query-or-body extension
    // We send the request body as a 'requestBody' query parameter
    const queryParams = new URLSearchParams({
      requestBody: JSON.stringify(requestBody),
    });

    const response = await fetch(
      `${PORTONE_API_URL}/platform/payouts?${queryParams.toString()}`,
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
      console.error('[Payouts API] PortOne API error:', {
        status: response.status,
        statusText: response.statusText,
        url: `${PORTONE_API_URL}/platform/payouts`,
        requestBody,
        errorData
      });
      // 502, not the upstream status verbatim: a PortOne 401 relayed as our
      // own 401 reads as "your admin session expired", which it is not.
      return NextResponse.json(
        {
          error: 'upstream_error',
          upstreamStatus: response.status,
          message: 'Failed to fetch payouts from PortOne',
          details: errorData,
        },
        { status: 502 }
      );
    }

    const payoutsData = await response.json();

    // Fetch academy names for partner IDs
    if (payoutsData.items && payoutsData.items.length > 0) {
      const partnerIds = [...new Set(
        payoutsData.items
          .map((p: { partnerId?: string }) => p.partnerId)
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

      // Enrich payout data with academy names
      payoutsData.items = payoutsData.items.map((payout: any) => ({
        ...payout,
        academyName: partnerToAcademy.get(payout.partnerId) || 'Unknown',
      }));
    }

    // Same normalisation as /api/admin/settlements: PortOne returns the total
    // as `page.totalCount`, the client reads `totalCount`. Flatten once here.
    const totalCount: number =
      payoutsData.page?.totalCount ?? payoutsData.totalCount ?? 0;

    return NextResponse.json({
      items: payoutsData.items || [],
      totalCount,
      page,
      pageSize,
      counts: payoutsData.counts,
    });
  } catch (error) {
    console.error('Error fetching payouts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
