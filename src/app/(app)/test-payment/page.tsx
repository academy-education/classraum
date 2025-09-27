'use client';

import { PaymentButton } from '@/components/payments/payment-button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

export default function TestPaymentPage() {
  const router = useRouter();

  const handlePaymentSuccess = (paymentId: string) => {
    console.log('Payment successful:', paymentId);
    // You can redirect or show success message
  };

  const handlePaymentError = (error: any) => {
    console.error('Payment failed:', error);
  };

  const testProducts = [
    {
      id: 'test-1',
      name: '테스트 상품 - 1,000원',
      description: 'INICIS 테스트 결제를 위한 상품입니다.',
      price: 1000,
    },
    {
      id: 'test-2',
      name: '수학 기초 과정',
      description: '3개월 수강권',
      price: 50000,
    },
    {
      id: 'test-3',
      name: '영어 회화 과정',
      description: '6개월 수강권',
      price: 120000,
    },
  ];

  return (
    <div className="container max-w-4xl mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">결제 테스트</h1>
        <p className="text-muted-foreground">
          PortOne V2 + INICIS 테스트 결제 페이지입니다.
        </p>
        <Badge className="mt-2" variant="secondary">
          테스트 모드
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {testProducts.map((product) => (
          <Card key={product.id}>
            <CardHeader>
              <CardTitle>{product.name}</CardTitle>
              <CardDescription>{product.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₩{product.price.toLocaleString()}
              </div>
            </CardContent>
            <CardFooter>
              <PaymentButton
                orderName={product.name}
                totalAmount={product.price}
                productId={product.id}
                buttonText="구매하기"
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                className="w-full"
              />
            </CardFooter>
          </Card>
        ))}
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>테스트 카드 정보</CardTitle>
          <CardDescription>
            INICIS 테스트 환경에서 사용 가능한 카드 정보입니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">일반 테스트 카드</h3>
            <ul className="space-y-1 text-sm">
              <li>카드번호: 4242-4242-4242-4242</li>
              <li>유효기간: 12/25 (또는 미래 날짜)</li>
              <li>CVC: 123</li>
              <li>비밀번호: 00 (앞 두자리)</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">국민카드 테스트</h3>
            <ul className="space-y-1 text-sm">
              <li>카드번호: 9446-0343-9539-5117</li>
              <li>유효기간: 12/25</li>
              <li>CVC: 123</li>
              <li>비밀번호: 00</li>
            </ul>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              ※ 테스트 결제는 실제로 과금되지 않습니다.
            </p>
            <p className="text-sm text-muted-foreground">
              ※ 프로덕션 환경에서는 실제 카드를 사용해야 합니다.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}