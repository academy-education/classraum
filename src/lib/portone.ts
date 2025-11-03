import { createClient } from '@/lib/supabase/server';
import { getPortOneConfig } from './portone-config';

// PortOne API configuration
const PORTONE_API_BASE = 'https://api.portone.io';
const PORTONE_API_SECRET = getPortOneConfig().apiSecret;

// Payment status types
export type PaymentStatus =
  | 'READY'
  | 'PAID'
  | 'FAILED'
  | 'CANCELLED'
  | 'PARTIAL_CANCELLED'
  | 'VIRTUAL_ACCOUNT_ISSUED';

// Payment method types
export type PaymentMethod =
  | 'CARD'
  | 'VIRTUAL_ACCOUNT'
  | 'EASY_PAY'
  | 'MOBILE'
  | 'TRANSFER';

// Payment request interface
export interface PaymentRequest {
  paymentId: string;
  orderName: string;
  totalAmount: number;
  currency?: string;
  payMethod?: PaymentMethod;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customData?: Record<string, any>;
}

// Payment verification response
export interface PaymentVerification {
  success: boolean;
  payment?: {
    paymentId: string;
    status: PaymentStatus;
    amount: {
      total: number;
      paid: number;
      cancelled: number;
    };
    method?: {
      type: string;
      card?: {
        number: string;
        issuer: string;
        brand: string;
      };
    };
    customer?: {
      name: string;
      email: string;
      phoneNumber: string;
    };
    paidAt?: string;
    failedAt?: string;
    cancelledAt?: string;
  };
  error?: string;
}

// Verify payment with PortOne API
// NOTE: Using V1 endpoint because V2 endpoint has authorization header issues
export async function verifyPayment(paymentId: string): Promise<PaymentVerification> {
  try {
    console.log('[PortOne] Verifying payment:', paymentId);

    // Use V1 endpoint (/payments/) instead of V2 (/v2/payments/)
    // because V2 has authorization issues ("Authorization 헤더가 존재하지 않습니다")
    const response = await fetch(
      `${PORTONE_API_BASE}/payments/${encodeURIComponent(paymentId)}`,
      {
        headers: {
          Authorization: `PortOne ${PORTONE_API_SECRET}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('[PortOne] Payment verification failed:', response.status, error);
      return { success: false, error: `Payment verification failed: ${response.status}` };
    }

    const payment = await response.json();
    console.log('[PortOne] Payment verification successful:', {
      paymentId: payment.id,
      status: payment.status,
      amount: payment.amount?.total
    });

    return {
      success: true,
      payment: {
        paymentId: payment.id,
        status: payment.status,
        amount: {
          total: payment.amount.total,
          paid: payment.amount.paid || 0,
          cancelled: payment.amount.cancelled || 0,
        },
        method: payment.method,
        customer: payment.customer,
        paidAt: payment.paidAt,
        failedAt: payment.failedAt,
        cancelledAt: payment.cancelledAt,
      },
    };
  } catch (error) {
    console.error('Payment verification error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Cancel payment
export async function cancelPayment(
  paymentId: string,
  reason: string,
  amount?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const body: any = { reason };
    if (amount) body.amount = amount;

    const response = await fetch(
      `${PORTONE_API_BASE}/payments/${encodeURIComponent(paymentId)}/cancel`,
      {
        method: 'POST',
        headers: {
          'Authorization': `PortOne ${PORTONE_API_SECRET}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Payment cancellation failed:', error);
      return { success: false, error: 'Payment cancellation failed' };
    }

    return { success: true };
  } catch (error) {
    console.error('Payment cancellation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Pre-register payment (for better tracking)
export async function preRegisterPayment(
  paymentId: string,
  totalAmount: number,
  currency: string = 'KRW'
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      `${PORTONE_API_BASE}/payments/${encodeURIComponent(paymentId)}/pre-register`,
      {
        method: 'POST',
        headers: {
          'Authorization': `PortOne ${PORTONE_API_SECRET}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          totalAmount,
          currency,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Payment pre-registration failed:', error);
      return { success: false, error: 'Payment pre-registration failed' };
    }

    return { success: true };
  } catch (error) {
    console.error('Payment pre-registration error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Save payment to database
export async function savePaymentToDatabase(
  userId: string,
  payment: PaymentVerification['payment']
) {
  if (!payment) return;

  const supabase = await createClient();

  const { error } = await supabase.from('payments').upsert({
    payment_id: payment.paymentId,
    user_id: userId,
    status: payment.status,
    amount: payment.amount.total,
    paid_amount: payment.amount.paid,
    cancelled_amount: payment.amount.cancelled,
    payment_method: payment.method?.type,
    customer_name: payment.customer?.name,
    customer_email: payment.customer?.email,
    customer_phone: payment.customer?.phoneNumber,
    paid_at: payment.paidAt,
    failed_at: payment.failedAt,
    cancelled_at: payment.cancelledAt,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error('Failed to save payment to database:', error);
    throw error;
  }
}

// Get payment history for user
export async function getUserPayments(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to get user payments:', error);
    throw error;
  }

  return data;
}