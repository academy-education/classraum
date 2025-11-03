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
    // Use academy_id foreign key to join with academies table
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        id,
        amount,
        final_amount,
        academy_id,
        academies!invoices_academy_id_fkey (
          id,
          name,
          portone_partner_id
        )
      `)
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      console.error('[Settlement] Invoice not found:', invoiceError);
      return NextResponse.json(
        { error: 'Invoice not found', details: invoiceError },
        { status: 404 }
      );
    }

    // Extract academy from the joined data
    const academy = invoice.academies as any;

    if (!academy) {
      console.error('[Settlement] Academy not found for invoice:', invoiceId);
      return NextResponse.json(
        { error: 'Academy not found for invoice' },
        { status: 404 }
      );
    }

    // Check if academy has partner ID set up
    const partnerId = academy.portone_partner_id;
    if (!partnerId) {
      console.log(`[Settlement] Academy "${academy.name}" does not have PortOne partner ID set up yet`);
      return NextResponse.json({
        success: true,
        message: `Payment successful but academy "${academy.name}" is not configured as a partner - settlement not created`,
        settlement: null,
        academyName: academy.name,
      });
    }

    // Create settlement in PortOne using Platform API
    // Reference: https://developers.portone.io/platform/ko/usages/order
    const settlementPayload = {
      partnerId: partnerId,
      paymentId: paymentId, // This should be the PortOne payment ID from the successful payment
      orderDetail: {
        orderAmount: paymentAmount || invoice.final_amount || invoice.amount,
      },
      // settlementStartDate will default to payment completion time if not specified
      isForTest: process.env.NODE_ENV === 'development',
    };

    console.log('[Settlement] Creating settlement with payload:', {
      partnerId,
      paymentId,
      orderAmount: settlementPayload.orderDetail.orderAmount,
      isForTest: settlementPayload.isForTest,
      academyName: academy.name,
    });

    if (!PORTONE_API_SECRET) {
      console.error('[Settlement] PORTONE_API_SECRET not configured');
      return NextResponse.json({
        success: true,
        message: 'Payment successful but PortOne API not configured - settlement not created',
        settlement: null,
      });
    }

    const response = await fetch(`${PORTONE_API_URL}/platform/transfer/order`, {
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
