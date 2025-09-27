import { NextRequest, NextResponse } from 'next/server';
import { verifyPayment, savePaymentToDatabase } from '@/lib/portone';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { paymentId, orderData } = await request.json();

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

    // Validate payment amount if orderData is provided
    if (orderData && orderData.expectedAmount) {
      if (verification.payment.amount.total !== orderData.expectedAmount) {
        console.error('Payment amount mismatch:', {
          expected: orderData.expectedAmount,
          actual: verification.payment.amount.total,
        });
        return NextResponse.json(
          { error: 'Payment amount mismatch' },
          { status: 400 }
        );
      }
    }

    // Handle different payment statuses
    switch (verification.payment.status) {
      case 'PAID':
        // Payment successful
        await savePaymentToDatabase(user.id, verification.payment);

        // TODO: Grant access to purchased content
        // TODO: Send confirmation email
        // TODO: Send KakaoTalk notification

        return NextResponse.json({
          success: true,
          status: 'paid',
          message: '결제가 완료되었습니다.',
          payment: verification.payment,
        });

      case 'VIRTUAL_ACCOUNT_ISSUED':
        // Virtual account issued, waiting for deposit
        await savePaymentToDatabase(user.id, verification.payment);

        return NextResponse.json({
          success: true,
          status: 'pending',
          message: '가상계좌가 발급되었습니다. 입금을 기다리고 있습니다.',
          payment: verification.payment,
        });

      case 'FAILED':
        // Payment failed
        return NextResponse.json({
          success: false,
          status: 'failed',
          message: '결제가 실패했습니다.',
          payment: verification.payment,
        });

      case 'CANCELLED':
        // Payment cancelled
        return NextResponse.json({
          success: false,
          status: 'cancelled',
          message: '결제가 취소되었습니다.',
          payment: verification.payment,
        });

      default:
        // Other statuses
        return NextResponse.json({
          success: false,
          status: verification.payment.status,
          message: '결제 상태를 확인할 수 없습니다.',
          payment: verification.payment,
        });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}