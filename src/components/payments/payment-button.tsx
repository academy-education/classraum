'use client';

import { useState } from 'react';
import * as PortOne from '@portone/browser-sdk/v2';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

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
  buttonText = '결제하기',
  onSuccess,
  onError,
}: PaymentButtonProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handlePayment = async () => {
    setLoading(true);

    try {
      // Generate unique payment ID
      const paymentId = `payment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Request payment through PortOne SDK
      const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID!
      const channelKey = 'channel-key-8bb588e1-00e4-4a9f-a4e0-5351692dc4e6' // Use working Inicis channel

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
        // Customer information (optional)
        customer: {
          fullName: '홍길동', // Replace with actual user data
          phoneNumber: '01012345678', // Replace with actual user data
          email: 'test@example.com', // Replace with actual user data
        },
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
          title: '결제 실패',
          description: response.message || '결제 처리 중 오류가 발생했습니다.',
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
          title: '결제 완료',
          description: '결제가 성공적으로 완료되었습니다.',
        });
        onSuccess?.(paymentId);
      } else if (verifyResult.status === 'pending') {
        toast({
          title: '입금 대기',
          description: '가상계좌가 발급되었습니다. 입금 확인 후 처리됩니다.',
        });
      } else {
        toast({
          title: '결제 확인 필요',
          description: verifyResult.message || '결제 상태를 확인해주세요.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: '결제 오류',
        description: '결제 처리 중 오류가 발생했습니다.',
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
          처리 중...
        </>
      ) : (
        buttonText
      )}
    </Button>
  );
}