import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const PORTONE_API_SECRET = process.env.PORTONE_API_SECRET;
const PORTONE_API_URL = 'https://api.portone.io';

// GET partner details from PortOne
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const academyId = params.id;

    // Get academy with partner info
    const { data: academy, error } = await supabase
      .from('academies')
      .select('portone_partner_id, portone_contract_id, bank_account, business_registration_number, tax_type')
      .eq('id', academyId)
      .single();

    if (error || !academy) {
      return NextResponse.json({ error: 'Academy not found' }, { status: 404 });
    }

    // If partner ID exists, fetch from PortOne
    if (academy.portone_partner_id) {
      const response = await fetch(
        `${PORTONE_API_URL}/platform/partners/${academy.portone_partner_id}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `PortOne ${PORTONE_API_SECRET}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const partnerData = await response.json();
        return NextResponse.json({
          ...academy,
          portonePartner: partnerData.partner,
        });
      }
    }

    return NextResponse.json(academy);
  } catch (error) {
    console.error('Error fetching partner:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST/PUT - Create or update PortOne partner for academy
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const academyId = params.id;
    const body = await request.json();

    // Get academy info
    const { data: academy, error: academyError } = await supabase
      .from('academies')
      .select('name, portone_partner_id')
      .eq('id', academyId)
      .single();

    if (academyError || !academy) {
      return NextResponse.json({ error: 'Academy not found' }, { status: 404 });
    }

    // Prepare PortOne partner payload
    const partnerPayload = {
      id: body.partnerId || `academy_${academyId}`,
      name: academy.name,
      email: body.email,
      businessRegistrationNumber: body.businessRegistrationNumber,
      account: body.bankAccount ? {
        bank: body.bankAccount.bank,
        currency: body.bankAccount.currency || 'KRW',
        number: body.bankAccount.accountNumber,
        holder: body.bankAccount.accountHolder,
      } : undefined,
      defaultContractId: body.contractId,
      memo: `Academy: ${academy.name}`,
      tags: ['academy'],
    };

    // Determine if creating or updating
    const isUpdate = !!academy.portone_partner_id;
    const method = isUpdate ? 'PATCH' : 'POST';
    const url = isUpdate
      ? `${PORTONE_API_URL}/platform/partners/${academy.portone_partner_id}`
      : `${PORTONE_API_URL}/platform/partners`;

    // Call PortOne API
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `PortOne ${PORTONE_API_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(partnerPayload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('PortOne API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to create/update partner', details: errorData },
        { status: response.status }
      );
    }

    const partnerData = await response.json();
    const partnerId = partnerData.partner.id;

    // Update academy with partner info
    const { error: updateError } = await supabase
      .from('academies')
      .update({
        portone_partner_id: partnerId,
        portone_contract_id: body.contractId || null,
        bank_account: body.bankAccount || null,
        business_registration_number: body.businessRegistrationNumber || null,
        tax_type: body.taxType || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', academyId);

    if (updateError) {
      console.error('Error updating academy:', updateError);
      return NextResponse.json(
        { error: 'Failed to update academy' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      partner: partnerData.partner,
    });
  } catch (error) {
    console.error('Error creating/updating partner:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
