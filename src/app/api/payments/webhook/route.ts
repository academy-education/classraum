import { NextRequest, NextResponse } from 'next/server';
import { verifyPayment, savePaymentToDatabase } from '@/lib/portone';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

// Verify webhook signature
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');
  return signature === expectedSignature;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('webhook-signature');

    // Verify webhook signature if provided
    if (signature && process.env.PORTONE_WEBHOOK_SECRET) {
      const isValid = verifyWebhookSignature(
        body,
        signature,
        process.env.PORTONE_WEBHOOK_SECRET
      );

      if (!isValid) {
        console.error('Invalid webhook signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }

    const data = JSON.parse(body);
    const { paymentId, customData } = data;

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Payment ID is required' },
        { status: 400 }
      );
    }

    // Verify payment with PortOne
    const verification = await verifyPayment(paymentId);

    if (!verification.success || !verification.payment) {
      return NextResponse.json(
        { error: verification.error || 'Payment verification failed' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get payment record from database
    const { data: paymentRecord, error: fetchError } = await supabase
      .from('payments')
      .select('user_id')
      .eq('payment_id', paymentId)
      .single();

    if (fetchError || !paymentRecord) {
      console.error('Payment record not found:', paymentId);
      return NextResponse.json(
        { error: 'Payment record not found' },
        { status: 404 }
      );
    }

    // Update payment status in database
    await savePaymentToDatabase(paymentRecord.user_id, verification.payment);

    // Check if this is an invoice payment and update invoice status
    // Look for invoice payment by checking payment_id pattern or custom data
    let invoiceId: string | null = null;

    // First check if payment ID contains invoice reference
    if (paymentId.includes('invoice_')) {
      const match = paymentId.match(/invoice_([a-f0-9-]+)_/);
      if (match) {
        invoiceId = match[1];
      }
    }

    // Also check custom data if provided
    if (!invoiceId && customData?.invoiceId) {
      invoiceId = customData.invoiceId;
    }

    // Update invoice status if this is an invoice payment
    if (invoiceId) {
      let invoiceStatus: string;
      let notes: string;

      switch (verification.payment.status) {
        case 'PAID':
          invoiceStatus = 'paid';
          notes = `Payment completed via webhook at ${new Date().toISOString()}`;
          break;
        case 'CANCELLED':
          invoiceStatus = 'cancelled';
          notes = `Payment cancelled via webhook at ${new Date().toISOString()}`;
          break;
        case 'FAILED':
          invoiceStatus = 'failed';
          notes = `Payment failed via webhook at ${new Date().toISOString()}`;
          break;
        case 'VIRTUAL_ACCOUNT_ISSUED':
          invoiceStatus = 'pending';
          notes = `Virtual account issued, waiting for payment`;
          break;
        default:
          invoiceStatus = 'pending';
          notes = `Payment status: ${verification.payment.status}`;
      }

      const { error: invoiceUpdateError } = await supabase
        .from('invoices')
        .update({
          status: invoiceStatus,
          transaction_id: paymentId,
          payment_method: verification.payment.method?.type || 'unknown',
          notes: notes
        })
        .eq('id', invoiceId);

      if (invoiceUpdateError) {
        console.error('Failed to update invoice status:', invoiceUpdateError);
      } else {
        console.log(`Invoice ${invoiceId} updated to status: ${invoiceStatus}`);
      }
    }

    // Handle different payment statuses
    switch (verification.payment.status) {
      case 'PAID':
        // Payment successful - grant access, send notifications
        console.log('Payment completed:', paymentId);

        // TODO: Grant course access
        // TODO: Send confirmation email
        // TODO: Send KakaoTalk notification

        break;

      case 'CANCELLED':
        // Payment cancelled - revoke access if granted
        console.log('Payment cancelled:', paymentId);

        // TODO: Revoke course access
        // TODO: Send cancellation notification

        break;

      case 'FAILED':
        // Payment failed
        console.log('Payment failed:', paymentId);

        // TODO: Send failure notification

        break;

      default:
        console.log('Payment status updated:', paymentId, verification.payment.status);
    }

    return NextResponse.json({
      success: true,
      status: verification.payment.status,
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}