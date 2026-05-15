'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';

export default function PaymentRedirectPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useTranslation();
  const [status, setStatus] = useState<'loading' | 'success' | 'pending' | 'failed'>('loading');
  const [message, setMessage] = useState(t('payments.redirect.checkingStatus') as string);

  useEffect(() => {
    const verifyPayment = async () => {
      const paymentId = searchParams.get('paymentId');
      const code = searchParams.get('code');
      const errorMessage = searchParams.get('message');

      if (code) {
        // Payment failed
        setStatus('failed');
        setMessage(errorMessage || (t('payments.redirect.paymentFailed') as string));
        return;
      }

      if (!paymentId) {
        setStatus('failed');
        setMessage(t('payments.redirect.invalidRequest') as string);
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
            setMessage(t('payments.redirect.paymentSuccess') as string);
          } else if (result.status === 'pending') {
            setStatus('pending');
            setMessage(t('payments.redirect.virtualAccountIssued') as string);
          } else {
            setStatus('failed');
            setMessage(result.message || (t('payments.redirect.paymentProcessingFailed') as string));
          }
        } else {
          setStatus('failed');
          setMessage(result.error || (t('payments.redirect.verifyFailed') as string));
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        setStatus('failed');
        setMessage(t('payments.redirect.verifyError') as string);
      }
    };

    verifyPayment();
  }, [searchParams, t]);

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
          <CardTitle className="text-center">{t('payments.redirect.title')}</CardTitle>
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
                {t('payments.redirect.goToDashboard')}
              </Button>
            </>
          )}

          {status === 'pending' && (
            <>
              <Clock className="h-12 w-12 text-yellow-500" />
              <p className="text-center font-semibold">{message}</p>
              <div className="text-center text-sm text-muted-foreground">
                <p>{t('payments.redirect.virtualAccountHelp1')}</p>
                <p>{t('payments.redirect.virtualAccountHelp2')}</p>
              </div>
              <Button onClick={handleGoToDashboard} className="mt-4">
                {t('payments.redirect.confirm')}
              </Button>
            </>
          )}

          {status === 'failed' && (
            <>
              <XCircle className="h-12 w-12 text-rose-500" />
              <p className="text-center font-semibold">{message}</p>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" onClick={handleGoToDashboard}>
                  {t('payments.redirect.goToDashboard')}
                </Button>
                <Button onClick={handleRetry}>
                  {t('payments.redirect.tryAgain')}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
