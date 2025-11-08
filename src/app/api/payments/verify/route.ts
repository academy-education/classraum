import { NextRequest, NextResponse } from 'next/server';
import { verifyPayment } from '@/lib/portone';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    console.log('[Verify API] ========== Payment Verification Started ==========');
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('[Verify API] ❌ Authentication failed:', authError);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[Verify API] ✅ User authenticated:', user.id);

    const { paymentId, orderData } = await request.json();
    console.log('[Verify API] Request data:', { paymentId, orderData });

    if (!paymentId) {
      console.error('[Verify API] ❌ Payment ID missing');
      return NextResponse.json(
        { error: 'Payment ID is required' },
        { status: 400 }
      );
    }

    // Verify payment with PortOne
    console.log('[Verify API] Calling verifyPayment()...');
    const verification = await verifyPayment(paymentId);
    console.log('[Verify API] Verification result:', {
      success: verification.success,
      status: verification.payment?.status,
      amount: verification.payment?.amount,
      error: verification.error
    });

    if (!verification.success || !verification.payment) {
      console.error('[Verify API] ❌ Verification failed:', verification.error);
      return NextResponse.json(
        { error: verification.error || 'Payment verification failed' },
        { status: 400 }
      );
    }

    // Validate payment amount if orderData is provided
    if (orderData && orderData.expectedAmount) {
      // Check if payment has amount data
      if (!verification.payment.amount || verification.payment.amount.total === undefined) {
        console.error('[Verify API] ❌ Payment missing amount data');
        return NextResponse.json(
          { error: 'Payment verification failed - missing amount data' },
          { status: 400 }
        );
      }

      console.log('[Verify API] Validating amount:', {
        expected: orderData.expectedAmount,
        actual: verification.payment.amount.total
      });

      if (verification.payment.amount.total !== orderData.expectedAmount) {
        console.error('[Verify API] ❌ Payment amount mismatch:', {
          expected: orderData.expectedAmount,
          actual: verification.payment.amount.total,
        });
        return NextResponse.json(
          { error: 'Payment amount mismatch' },
          { status: 400 }
        );
      }
      console.log('[Verify API] ✅ Amount validation passed');
    }

    // Handle different payment statuses
    console.log('[Verify API] Processing status:', verification.payment.status);

    switch (verification.payment.status) {
      case 'PAID':
        // Payment successful
        console.log('[Verify API] Status PAID - payment verified');
        console.log('[Verify API] ✅ Returning success response with status=paid');
        return NextResponse.json({
          success: true,
          status: 'paid',
          message: '결제가 완료되었습니다.',
          payment: verification.payment,
        });

      case 'VIRTUAL_ACCOUNT_ISSUED':
        // Virtual account issued, waiting for deposit
        console.log('[Verify API] Status VIRTUAL_ACCOUNT_ISSUED - virtual account issued');
        console.log('[Verify API] ✅ Returning success response with status=pending');
        return NextResponse.json({
          success: true,
          status: 'pending',
          message: '가상계좌가 발급되었습니다. 입금을 기다리고 있습니다.',
          payment: verification.payment,
        });

      case 'FAILED':
        // Payment failed
        console.log('[Verify API] ❌ Payment status is FAILED');
        return NextResponse.json({
          success: false,
          status: 'failed',
          message: '결제가 실패했습니다.',
          payment: verification.payment,
        });

      case 'CANCELLED':
        // Payment cancelled
        console.log('[Verify API] ❌ Payment status is CANCELLED');
        return NextResponse.json({
          success: false,
          status: 'cancelled',
          message: '결제가 취소되었습니다.',
          payment: verification.payment,
        });

      default:
        // Other statuses
        console.warn('[Verify API] ⚠️ Unknown payment status:', verification.payment.status);
        return NextResponse.json({
          success: false,
          status: verification.payment.status,
          message: '결제 상태를 확인할 수 없습니다.',
          payment: verification.payment,
        });
    }
  } catch (error) {
    console.error('[Verify API] ❌ ========== Payment Verification Failed ==========');
    console.error('[Verify API] Error details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}