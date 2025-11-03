import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

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

    // Verify user is admin/super_admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userInfo, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userInfo || !['admin', 'super_admin'].includes(userInfo.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Parse request body
    const body = await req.json();
    const { invoiceId, amount, reason, refundType } = body;

    if (!invoiceId || !reason) {
      return NextResponse.json(
        { error: 'Invoice ID and reason are required' },
        { status: 400 }
      );
    }

    if (refundType === 'partial' && (!amount || amount <= 0)) {
      return NextResponse.json(
        { error: 'Amount is required for partial refunds' },
        { status: 400 }
      );
    }

    // Fetch invoice details
    const { data: invoice, error: invoiceError } = await supabase
      .from('subscription_invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      console.error('[Admin Refund API] Invoice fetch error:', invoiceError);
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Validate invoice can be refunded
    if (invoice.status !== 'paid') {
      return NextResponse.json(
        { error: `Cannot refund invoice with status: ${invoice.status}` },
        { status: 400 }
      );
    }

    // Check if already refunded
    if (invoice.metadata && typeof invoice.metadata === 'object' && 'refunded' in invoice.metadata) {
      return NextResponse.json(
        { error: 'Invoice has already been refunded' },
        { status: 400 }
      );
    }

    // Determine refund amount
    const refundAmount = refundType === 'full' ? invoice.amount : amount;

    if (refundAmount > invoice.amount) {
      return NextResponse.json(
        { error: 'Refund amount cannot exceed invoice amount' },
        { status: 400 }
      );
    }

    // Check if we have a PortOne payment ID
    if (!invoice.kg_transaction_id && !invoice.metadata?.portone_payment_id) {
      return NextResponse.json(
        { error: 'No PortOne payment ID found for this invoice' },
        { status: 400 }
      );
    }

    // Get payment ID (V2 from metadata, or V1 from kg_transaction_id)
    const paymentId = (invoice.metadata as any)?.portone_payment_id || invoice.kg_transaction_id;

    // Call PortOne refund API
    const portoneApiSecret = process.env.PORTONE_API_SECRET;
    if (!portoneApiSecret) {
      console.error('[Admin Refund API] PORTONE_API_SECRET not configured');
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 500 }
      );
    }

    const refundRequestBody: any = {
      reason: reason,
    };

    // Add storeId only if explicitly set in environment
    // Don't use the one from metadata as it may be incorrect
    const storeId = process.env.PORTONE_STORE_ID;
    if (storeId) {
      refundRequestBody.storeId = storeId;
      console.log('[Admin Refund API] Using storeId from env:', storeId);
    } else {
      console.log('[Admin Refund API] No PORTONE_STORE_ID set, letting PortOne use default from API key');
    }

    // Add amount for partial refunds
    if (refundType === 'partial') {
      refundRequestBody.amount = refundAmount;
      refundRequestBody.currentCancellableAmount = invoice.amount;
    }

    console.log('[Admin Refund API] Requesting refund:', {
      paymentId,
      refundType,
      amount: refundAmount,
      reason
    });

    const portoneResponse = await fetch(`https://api.portone.io/payments/${paymentId}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `PortOne ${portoneApiSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(refundRequestBody),
    });

    const portoneResult = await portoneResponse.json();

    if (!portoneResponse.ok) {
      console.error('[Admin Refund API] PortOne refund failed:', {
        status: portoneResponse.status,
        result: portoneResult,
        requestBody: refundRequestBody,
        paymentId
      });
      const errorMessage = portoneResult.message ||
                          (portoneResult.type === 'UNAUTHORIZED' ? 'Unauthorized: Invalid API credentials or insufficient permissions' : 'Refund request failed');
      return NextResponse.json(
        { error: errorMessage, details: portoneResult },
        { status: portoneResponse.status }
      );
    }

    console.log('[Admin Refund API] PortOne refund response:', portoneResult);

    // Update invoice in database
    const updatedMetadata = {
      ...(invoice.metadata as object || {}),
      refunded: true,
      refund_type: refundType,
      refund_amount: refundAmount,
      refund_reason: reason,
      refunded_at: new Date().toISOString(),
      refunded_by: user.id,
      portone_cancellation: portoneResult.cancellation
    };

    const { error: updateError } = await supabase
      .from('subscription_invoices')
      .update({
        status: refundType === 'full' ? 'refunded' : 'partially_refunded',
        metadata: updatedMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId);

    if (updateError) {
      console.error('[Admin Refund API] Error updating invoice:', updateError);
      // Refund was processed but DB update failed - log for manual review
      return NextResponse.json({
        success: true,
        warning: 'Refund processed but database update failed. Please manually verify.',
        data: {
          invoiceId,
          refundAmount,
          portoneResult
        }
      });
    }

    // If full refund, consider updating subscription status
    if (refundType === 'full' && invoice.subscription_id) {
      // Optionally update subscription based on business logic
      // For now, just log
      console.log('[Admin Refund API] Full refund processed for subscription:', invoice.subscription_id);
    }

    return NextResponse.json({
      success: true,
      message: `${refundType === 'full' ? 'Full' : 'Partial'} refund processed successfully`,
      data: {
        invoiceId,
        refundAmount,
        refundType,
        cancellationStatus: portoneResult.cancellation?.status
      }
    });

  } catch (error) {
    console.error('[Admin Refund API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
