'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PaymentRedirectPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'pending' | 'failed'>('loading');
  const [message, setMessage] = useState('결제 상태를 확인하고 있습니다...');

  useEffect(() => {
    const verifyPayment = async () => {
      const paymentId = searchParams.get('paymentId');
      const code = searchParams.get('code');
      const errorMessage = searchParams.get('message');

      if (code) {
        // Payment failed
        setStatus('failed');
        setMessage(errorMessage || '결제가 실패했습니다.');
        return;
      }

      if (!paymentId) {
        setStatus('failed');
        setMessage('잘못된 결제 요청입니다.');
        return;
      }

      try {
        // Verify payment on server
        const response = await fetch('/api/payments/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ paymentId }),
        });

        const result = await response.json();

        if (result.success) {
          if (result.status === 'paid') {
            setStatus('success');
            setMessage('결제가 성공적으로 완료되었습니다.');
          } else if (result.status === 'pending') {
            setStatus('pending');
            setMessage('가상계좌가 발급되었습니다. 입금 확인 후 처리됩니다.');
          } else {
            setStatus('failed');
            setMessage(result.message || '결제 처리에 실패했습니다.');
          }
        } else {
          setStatus('failed');
          setMessage(result.error || '결제 확인에 실패했습니다.');
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        setStatus('failed');
        setMessage('결제 확인 중 오류가 발생했습니다.');
      }
    };

    verifyPayment();
  }, [searchParams]);

  const handleGoToDashboard = () => {
    router.push('/dashboard');
  };

  const handleRetry = () => {
    router.back();
  };

  return (
    <div className="container max-w-md mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">결제 확인</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4 py-8">
          {status === 'loading' && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-center text-muted-foreground">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="h-12 w-12 text-green-500" />
              <p className="text-center font-semibold">{message}</p>
              <Button onClick={handleGoToDashboard} className="mt-4">
                대시보드로 이동
              </Button>
            </>
          )}

          {status === 'pending' && (
            <>
              <Clock className="h-12 w-12 text-yellow-500" />
              <p className="text-center font-semibold">{message}</p>
              <div className="text-center text-sm text-muted-foreground">
                <p>입금이 확인되면 자동으로 처리됩니다.</p>
                <p>입금 후에도 처리되지 않는 경우 고객센터로 문의해주세요.</p>
              </div>
              <Button onClick={handleGoToDashboard} className="mt-4">
                확인
              </Button>
            </>
          )}

          {status === 'failed' && (
            <>
              <XCircle className="h-12 w-12 text-red-500" />
              <p className="text-center font-semibold">{message}</p>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" onClick={handleGoToDashboard}>
                  대시보드로 이동
                </Button>
                <Button onClick={handleRetry}>
                  다시 시도
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}