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
// Using V2 endpoint as recommended by PortOne documentation
export async function verifyPayment(paymentId: string): Promise<PaymentVerification> {
  try {
    console.log('[PortOne] Verifying payment:', paymentId);
    console.log('[PortOne] API Secret configured:', PORTONE_API_SECRET ? 'Yes' : 'No');

    // Try V2 endpoint first (recommended by PortOne: 최신 V2 버전 사용을 권장합니다)
    const v2Response = await fetch(
      `${PORTONE_API_BASE}/v2/payments/${encodeURIComponent(paymentId)}`,
      {
        headers: {
          Authorization: `PortOne ${PORTONE_API_SECRET}`,
        },
      }
    );

    console.log('[PortOne] V2 API Response:', {
      status: v2Response.status,
      statusText: v2Response.statusText,
      contentType: v2Response.headers.get('content-type')
    });

    // If V2 works, use it
    if (v2Response.ok) {
      const payment = await v2Response.json();
      console.log('[PortOne] ✅ V2 API verification successful:', {
        paymentId: payment.id,
        status: payment.status,
        amount: payment.amount?.total
      });

      // Validate payment has required fields
      if (!payment.amount || payment.amount.total === undefined) {
        console.error('[PortOne] ❌ V2 response missing amount data:', payment);
        return {
          success: false,
          error: 'Payment verification failed - missing amount data'
        };
      }

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
    }

    // V2 failed - log detailed error and try V1 fallback
    const v2ErrorText = await v2Response.text();
    console.warn('[PortOne] ⚠️ V2 API failed, trying V1 fallback:', {
      status: v2Response.status,
      error: v2ErrorText
    });

    // Fallback to V1 endpoint
    console.log('[PortOne] Attempting V1 fallback...');
    const v1Response = await fetch(
      `${PORTONE_API_BASE}/payments/${encodeURIComponent(paymentId)}`,
      {
        headers: {
          Authorization: `PortOne ${PORTONE_API_SECRET}`,
        },
      }
    );

    console.log('[PortOne] V1 API Response:', {
      status: v1Response.status,
      statusText: v1Response.statusText
    });

    if (!v1Response.ok) {
      const v1Error = await v1Response.text();
      console.error('[PortOne] ❌ Both V2 and V1 failed:', {
        v2Status: v2Response.status,
        v2Error: v2ErrorText,
        v1Status: v1Response.status,
        v1Error: v1Error
      });
      return {
        success: false,
        error: `Payment verification failed - V2: ${v2Response.status}, V1: ${v1Response.status}`
      };
    }

    const payment = await v1Response.json();
    console.log('[PortOne] ✅ V1 API verification successful (fallback):', {
      paymentId: payment.id,
      status: payment.status,
      amount: payment.amount?.total
    });

    // Validate payment has required fields
    if (!payment.amount || payment.amount.total === undefined) {
      console.error('[PortOne] ❌ V1 response missing amount data:', payment);
      return {
        success: false,
        error: 'Payment verification failed - missing amount data'
      };
    }

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
    console.error('[PortOne] ❌ Payment verification exception:', error);
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

