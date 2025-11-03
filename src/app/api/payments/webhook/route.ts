import { NextRequest, NextResponse } from 'next/server';
import { verifyPayment, savePaymentToDatabase } from '@/lib/portone';
import { createClient } from '@/lib/supabase/server';
import { triggerInvoicePaymentNotifications } from '@/lib/notification-triggers';
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
    // PortOne V2 webhooks use snake_case (payment_id), not camelCase (paymentId)
    const paymentId = data.payment_id || data.paymentId;
    const customData = data.customData;

    console.log('[Webhook] Received payment webhook:', { paymentId, status: data.status, tx_id: data.tx_id });

    if (!paymentId) {
      console.error('[Webhook] Payment ID missing from webhook body:', data);
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

      // Note: invoices table has 'discount_reason' field, not 'notes'
      const updateData: any = {
        status: invoiceStatus,
        transaction_id: paymentId,
        payment_method: verification.payment.method?.type || 'unknown',
        discount_reason: notes, // Using discount_reason since notes field doesn't exist
      };

      // Add paid_at timestamp if payment is completed
      if (invoiceStatus === 'paid' && verification.payment.paidAt) {
        updateData.paid_at = verification.payment.paidAt;
      }

      const { error: invoiceUpdateError } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', invoiceId);

      if (invoiceUpdateError) {
        console.error('Failed to update invoice status:', invoiceUpdateError);
      } else {
        console.log(`Invoice ${invoiceId} updated to status: ${invoiceStatus}`);

        // Send notification if invoice was marked as paid
        if (invoiceStatus === 'paid') {
          try {
            await triggerInvoicePaymentNotifications(invoiceId);
          } catch (notificationError) {
            console.error('Error sending invoice payment notification:', notificationError);
            // Don't fail the webhook processing if notification fails
          }
        }
      }
    }

    // Check if this is a subscription payment
    if (paymentId.includes('subscription_')) {
      console.log('Processing subscription payment:', paymentId);

      // Extract subscription ID from payment ID format: subscription_{subId}_initial_{timestamp} or subscription_{subId}_{timestamp}
      const parts = paymentId.split('_');
      let subscriptionId: string | null = null;

      if (parts.length >= 3 && parts[0] === 'subscription') {
        subscriptionId = parts[1];
      }

      if (subscriptionId) {
        console.log('Found subscription ID:', subscriptionId);

        if (verification.payment.status === 'PAID') {
          // Update academy_subscriptions table
          const { error: subUpdateError } = await supabase
            .from('academy_subscriptions')
            .update({
              status: 'active',
              last_payment_date: verification.payment.paidAt || new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', subscriptionId);

          if (subUpdateError) {
            console.error('Error updating subscription:', subUpdateError);
          } else {
            console.log(`Subscription ${subscriptionId} updated to active`);
          }

          // Update or create subscription_invoices record
          const { error: invoiceUpdateError } = await supabase
            .from('subscription_invoices')
            .upsert({
              academy_id: (await supabase
                .from('academy_subscriptions')
                .select('academy_id')
                .eq('id', subscriptionId)
                .single()).data?.academy_id,
              subscription_id: subscriptionId,
              kg_transaction_id: paymentId,
              status: 'paid',
              paid_at: verification.payment.paidAt || new Date().toISOString(),
              amount: verification.payment.amount.total,
              currency: 'KRW',
              metadata: {
                payment_method: verification.payment.method?.type,
                webhook_received_at: new Date().toISOString(),
              },
            });

          if (invoiceUpdateError) {
            console.error('Error updating subscription invoice:', invoiceUpdateError);
          } else {
            console.log(`Subscription invoice updated for payment: ${paymentId}`);
          }
        } else if (verification.payment.status === 'FAILED') {
          // Mark subscription as past_due
          await supabase
            .from('academy_subscriptions')
            .update({
              status: 'past_due',
              updated_at: new Date().toISOString(),
            })
            .eq('id', subscriptionId);

          // Update subscription invoice
          await supabase
            .from('subscription_invoices')
            .update({
              status: 'failed',
              failed_at: verification.payment.failedAt || new Date().toISOString(),
              failure_reason: 'Payment failed',
            })
            .eq('kg_transaction_id', paymentId);

          console.log(`Subscription ${subscriptionId} marked as past_due due to failed payment`);
        } else if (verification.payment.status === 'CANCELLED') {
          // Update subscription invoice
          await supabase
            .from('subscription_invoices')
            .update({
              status: 'refunded',
            })
            .eq('kg_transaction_id', paymentId);

          console.log(`Subscription payment ${paymentId} cancelled`);
        }
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