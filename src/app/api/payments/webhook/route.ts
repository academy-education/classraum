import { NextRequest, NextResponse } from 'next/server';
import { verifyPayment } from '@/lib/portone';
import { createClient } from '@/lib/supabase/server';
import { triggerInvoicePaymentNotifications } from '@/lib/notification-triggers';
import { verifyWebhookSignature as verifyStandardWebhook, WebhookVerificationError } from '@/lib/portone-webhook';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    // Verify webhook signature using Standard Webhooks specification
    // PortOne V2 sends: webhook-id, webhook-signature (v1,base64), webhook-timestamp
    const webhookSecret = process.env.PORTONE_WEBHOOK_SECRET;
    if (webhookSecret) {
      const webhookId = request.headers.get('webhook-id');
      const webhookSignature = request.headers.get('webhook-signature');
      const webhookTimestamp = request.headers.get('webhook-timestamp');

      if (!webhookId || !webhookSignature || !webhookTimestamp) {
        console.error('[Webhook] Missing required webhook headers (webhook-id, webhook-signature, webhook-timestamp)');
        return NextResponse.json(
          { error: 'Missing webhook signature headers' },
          { status: 401 }
        );
      }

      try {
        verifyStandardWebhook(webhookSecret, body, {
          'webhook-id': webhookId,
          'webhook-signature': webhookSignature,
          'webhook-timestamp': webhookTimestamp,
        });
      } catch (err) {
        if (err instanceof WebhookVerificationError) {
          console.error('[Webhook] Webhook signature verification failed:', err.message);
          return NextResponse.json(
            { error: 'Invalid webhook signature' },
            { status: 401 }
          );
        }
        throw err;
      }
    } else if (process.env.NODE_ENV === 'production') {
      console.error('[Webhook] PORTONE_WEBHOOK_SECRET not configured — rejecting webhook');
      return NextResponse.json({ error: 'Webhook verification not configured' }, { status: 500 });
    }

    const data = JSON.parse(body);
    // PortOne V2 webhooks use snake_case (payment_id), not camelCase (paymentId)
    const paymentId = data.payment_id || data.paymentId;
    const customData = data.customData;

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
        // Return 500 so the payment provider retries the webhook
        return NextResponse.json(
          { error: 'Failed to update invoice status' },
          { status: 500 }
        );
      }

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

    // Check if this is a subscription payment
    if (paymentId.includes('subscription_')) {
      // Extract subscription ID from payment ID format: subscription_{subId}_initial_{timestamp} or subscription_{subId}_{timestamp}
      const parts = paymentId.split('_');
      let subscriptionId: string | null = null;

      if (parts.length >= 3 && parts[0] === 'subscription') {
        subscriptionId = parts[1];
      }

      if (subscriptionId) {
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
            // Return 500 so the payment provider retries the webhook
            return NextResponse.json(
              { error: 'Failed to update subscription status' },
              { status: 500 }
            );
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
            // Log but don't fail — subscription status is already updated
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

        } else if (verification.payment.status === 'CANCELLED') {
          // Update subscription invoice
          await supabase
            .from('subscription_invoices')
            .update({
              status: 'refunded',
            })
            .eq('kg_transaction_id', paymentId);

        }
      }
    }

    // Handle different payment statuses
    switch (verification.payment.status) {
      case 'PAID':
        // Payment successful
        break;

      case 'CANCELLED':
        // Payment cancelled
        break;

      case 'FAILED':
        // Payment failed
        break;

      default:
        console.warn('[Webhook] Unhandled payment status:', verification.payment.status);
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