import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const PORTONE_API_SECRET = process.env.PORTONE_API_SECRET;
const PORTONE_API_URL = 'https://api.portone.io';

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
      console.warn('[Settlements API] PORTONE_API_SECRET not configured');
      return NextResponse.json({
        items: [],
        totalCount: 0,
        page: 0,
        pageSize: 20,
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

    // Build PortOne API request
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('pageSize', pageSize.toString());

    if (partnerId) params.append('partnerId', partnerId);
    if (status) params.append('status', status);
    if (from) params.append('from', from);
    if (to) params.append('to', to);

    // Fetch settlements from PortOne Platform API
    const response = await fetch(
      `${PORTONE_API_URL}/platform/partner-settlements?${params.toString()}`,
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

      // Return empty result instead of error for better UX
      return NextResponse.json({
        items: [],
        totalCount: 0,
        page: page,
        pageSize: pageSize,
        error: errorData,
        message: 'No settlements found or PortOne API error'
      });
    }

    const settlementsData = await response.json();

    // Fetch academy names for partner IDs
    if (settlementsData.items && settlementsData.items.length > 0) {
      const partnerIds = [...new Set(settlementsData.items.map((s: any) => s.partner?.id).filter(Boolean))];

      const { data: academies } = await supabase
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

    return NextResponse.json(settlementsData);
  } catch (error) {
    console.error('Error fetching settlements:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
