import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const PORTONE_API_SECRET = process.env.PORTONE_API_SECRET;
const PORTONE_API_URL = 'https://api.portone.io';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { invoiceId, paymentId, paymentAmount } = body;

    if (!invoiceId || !paymentId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get invoice details including academy
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*, academy:academies!inner(id, name, portone_partner_id)')
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      console.error('Invoice not found:', invoiceError);
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Check if academy has partner ID set up
    const partnerId = invoice.academy?.portone_partner_id;
    if (!partnerId) {
      console.log(`Academy ${invoice.academy?.name} does not have PortOne partner ID set up yet`);
      return NextResponse.json({
        success: true,
        message: 'Payment successful but partner not configured - settlement not created',
        settlement: null,
      });
    }

    // Create settlement in PortOne
    const settlementPayload = {
      partnerId: partnerId,
      paymentId: paymentId,
      orderDetail: {
        orderAmount: paymentAmount || invoice.amount,
      },
      // settlementStartDate will default to payment completion time
      isForTest: process.env.NODE_ENV === 'development',
    };

    console.log('Creating settlement:', settlementPayload);

    const response = await fetch(`${PORTONE_API_URL}/platform/transfers/order`, {
      method: 'POST',
      headers: {
        'Authorization': `PortOne ${PORTONE_API_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settlementPayload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('PortOne settlement creation error:', errorData);

      // Don't fail the payment if settlement creation fails
      // Just log it and return success
      return NextResponse.json({
        success: true,
        message: 'Payment successful but settlement creation failed',
        error: errorData,
        settlement: null,
      });
    }

    const settlementData = await response.json();
    console.log('Settlement created successfully:', settlementData.transfer?.id);

    return NextResponse.json({
      success: true,
      message: 'Settlement created successfully',
      settlement: settlementData.transfer,
    });

  } catch (error) {
    console.error('Error creating settlement:', error);

    // Don't fail the payment if settlement creation fails
    return NextResponse.json({
      success: true,
      message: 'Payment successful but settlement creation encountered error',
      error: error instanceof Error ? error.message : 'Unknown error',
      settlement: null,
    });
  }
}
