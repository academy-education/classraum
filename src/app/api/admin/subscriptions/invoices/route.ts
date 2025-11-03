import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
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

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const subscriptionId = searchParams.get('subscriptionId');
    const academyId = searchParams.get('academyId');

    if (!subscriptionId && !academyId) {
      return NextResponse.json(
        { error: 'Either subscriptionId or academyId is required' },
        { status: 400 }
      );
    }

    // Build query
    let query = supabase
      .from('subscription_invoices')
      .select('*')
      .order('created_at', { ascending: false });

    if (subscriptionId) {
      query = query.eq('subscription_id', subscriptionId);
    } else if (academyId) {
      query = query.eq('academy_id', academyId);
    }

    const { data: invoices, error: invoicesError } = await query;

    if (invoicesError) {
      console.error('[Admin Invoices API] Error fetching invoices:', invoicesError);
      return NextResponse.json(
        { error: 'Failed to fetch invoices' },
        { status: 500 }
      );
    }

    // Format invoices for the frontend
    const formattedInvoices = invoices?.map(invoice => {
      // Determine payment method from metadata or legacy fields
      let paymentMethod = 'Unknown';
      if (invoice.metadata && typeof invoice.metadata === 'object') {
        const metadata = invoice.metadata as any;
        if (metadata.payment_method_type) {
          paymentMethod = metadata.payment_method_type;
        } else if (metadata.portone_payment_id) {
          paymentMethod = 'PortOne V2';
        }
      } else if (invoice.kg_transaction_id) {
        paymentMethod = 'Card (PortOne V1)';
      }

      // Check if refunded
      const isRefunded = invoice.metadata &&
        typeof invoice.metadata === 'object' &&
        'refunded' in invoice.metadata;

      return {
        id: invoice.id,
        subscriptionId: invoice.subscription_id,
        academyId: invoice.academy_id,
        amount: invoice.amount,
        currency: invoice.currency || 'KRW',
        status: invoice.status,
        paymentMethod,
        planTier: invoice.plan_tier,
        billingCycle: invoice.billing_cycle,
        billingPeriodStart: invoice.billing_period_start,
        billingPeriodEnd: invoice.billing_period_end,
        paidAt: invoice.paid_at,
        failedAt: invoice.failed_at,
        failureReason: invoice.failure_reason,
        createdAt: invoice.created_at,
        updatedAt: invoice.updated_at,
        // PortOne details
        portoneTransactionId: invoice.kg_transaction_id || (invoice.metadata as any)?.portone_payment_id,
        portoneReceiptUrl: invoice.kg_receipt_url,
        portoneOrderId: invoice.kg_order_id,
        // Refund details
        refunded: isRefunded,
        refundDetails: isRefunded ? {
          refundType: (invoice.metadata as any)?.refund_type,
          refundAmount: (invoice.metadata as any)?.refund_amount,
          refundReason: (invoice.metadata as any)?.refund_reason,
          refundedAt: (invoice.metadata as any)?.refunded_at,
          refundedBy: (invoice.metadata as any)?.refunded_by,
        } : null,
        metadata: invoice.metadata,
      };
    }) || [];

    return NextResponse.json({
      success: true,
      data: {
        invoices: formattedInvoices,
        total: formattedInvoices.length,
      }
    });

  } catch (error) {
    console.error('[Admin Invoices API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
