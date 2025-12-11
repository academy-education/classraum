import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const PORTONE_API_SECRET = process.env.PORTONE_API_SECRET;
const PORTONE_API_URL = 'https://api.portone.io';

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
    const supabase = createClient(
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

    // Check if PortOne API secret is configured
    if (!PORTONE_API_SECRET) {
      console.warn('[Payouts API] PORTONE_API_SECRET not configured');
      return NextResponse.json({
        items: [],
        totalCount: 0,
        page: { number: 0, size: 20, totalCount: 0 },
        message: 'PortOne API not configured. Please set PORTONE_API_SECRET environment variable.'
      });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '0');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const partnerId = searchParams.get('partnerId');
    const status = searchParams.get('status');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

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
    if (partnerId) {
      requestBody.filter.partnerIds = [partnerId];
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
      return NextResponse.json(
        { error: 'Failed to fetch payouts from PortOne', details: errorData },
        { status: response.status }
      );
    }

    const payoutsData = await response.json();

    // Fetch academy names for partner IDs
    if (payoutsData.items && payoutsData.items.length > 0) {
      const partnerIds = [...new Set(payoutsData.items.map((p: any) => p.partnerId).filter(Boolean))];

      const { data: academies } = await supabase
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

    return NextResponse.json(payoutsData);
  } catch (error) {
    console.error('Error fetching payouts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
