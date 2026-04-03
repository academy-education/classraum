'use client';

import { useState } from 'react';
import * as PortOne from '@portone/browser-sdk/v2';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';
import { Loader2 } from 'lucide-react';
import { getPortOneConfig } from '@/lib/portone-config';

interface PaymentButtonProps {
  orderName: string;
  totalAmount: number;
  productId?: string;
  className?: string;
  buttonText?: string;
  onSuccess?: (paymentId: string) => void;
  onError?: (error: any) => void;
}

export function PaymentButton({
  orderName,
  totalAmount,
  productId,
  className,
  buttonText,
  onSuccess,
  onError,
}: PaymentButtonProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();
  const resolvedButtonText = buttonText || (t('payments.pay') as string || 'Pay');

  const handlePayment = async () => {
    setLoading(true);

    try {
      // Generate unique payment ID
      const paymentId = `payment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Get PortOne configuration with live channel keys
      const config = getPortOneConfig();
      const storeId = config.storeId;
      const channelKey = config.paymentChannelKey; // Uses live payment channel

      const response = await PortOne.requestPayment({
        // Store ID from environment variable
        storeId: storeId,
        // Channel key for INICIS
        channelKey: channelKey,
        paymentId,
        orderName,
        totalAmount,
        currency: "KRW" as const,
        payMethod: "CARD" as const,
        // Customer information (optional - should be replaced with actual user data)
        customer: {},
        // Redirect URL for mobile environments
        redirectUrl: `${window.location.origin}/payments/redirect`,
        // App scheme for mobile apps
        appScheme: 'classraum://',
        // Custom data
        customData: {
          productId,
        },
        // Display settings
        locale: 'KO_KR',
        // Notice URL for virtual account
        noticeUrls: [`${process.env.NEXT_PUBLIC_SITE_URL}/api/payments/webhook`],
      });

      // Check for errors
      if (response?.code != null) {
        // Payment failed
        console.error('Payment failed:', response);
        toast({
          title: t('payments.paymentFailed') as string || 'Payment failed',
          description: response.message || (t('payments.paymentProcessingError') as string || 'An error occurred during payment processing.'),
          variant: 'destructive',
        });
        onError?.(response);
        return;
      }

      // Payment window closed or completed
      // Verify payment on server
      const verifyResponse = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentId,
          orderData: {
            expectedAmount: totalAmount,
            productId,
          },
        }),
      });

      const verifyResult = await verifyResponse.json();

      if (verifyResult.success && verifyResult.status === 'paid') {
        toast({
          title: t('payments.paymentComplete') as string || 'Payment complete',
          description: t('payments.paymentCompletedSuccessfully') as string || 'Payment has been completed successfully.',
          variant: 'success',
        });
        onSuccess?.(paymentId);
      } else if (verifyResult.status === 'pending') {
        toast({
          title: t('payments.awaitingDeposit') as string || 'Awaiting deposit',
          description: t('payments.virtualAccountIssued') as string || 'A virtual account has been issued. Payment will be processed after deposit confirmation.',
          variant: 'info',
        });
      } else {
        toast({
          title: t('payments.paymentVerificationNeeded') as string || 'Payment verification needed',
          description: verifyResult.message || (t('payments.pleaseCheckPaymentStatus') as string || 'Please check your payment status.'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: t('payments.paymentError') as string || 'Payment error',
        description: t('payments.paymentProcessingError') as string || 'An error occurred during payment processing.',
        variant: 'destructive',
      });
      onError?.(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handlePayment}
      disabled={loading}
      className={className}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {t('common.processing') || 'Processing...'}
        </>
      ) : (
        resolvedButtonText
      )}
    </Button>
  );
}