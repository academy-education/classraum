"use client"

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Check, ArrowLeft, ExternalLink, Loader2 } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTranslation } from '@/hooks/useTranslation'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { PaymentErrorBoundary } from '@/components/ui/error-boundary'
import { simpleTabDetection } from '@/utils/simpleTabDetection'
import * as PortOne from '@portone/browser-sdk/v2'
import { useToast } from '@/hooks/use-toast'

interface SelectedPlan {
  name: string
  price: string
  description: string
  features: string[]
  additionalCosts?: string[]
}

interface UserInfo {
  name: string
  email: string
  phone: string
  address: string
}

export default function CheckoutPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const { userId, userName } = useAuth()
  const [selectedPlan, setSelectedPlan] = useState<SelectedPlan | null>(null)
  const [userInfo, setUserInfo] = useState<UserInfo>({ name: '', email: '', phone: '', address: '' })
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('card')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [userDataLoading, setUserDataLoading] = useState(() => {
    // Check if we should suppress loading for tab returns
    const shouldSuppress = simpleTabDetection.isReturningToTab()
    if (shouldSuppress) {
      console.log('🚫 [CheckoutPage] Suppressing initial loading - navigation detected')
      return false
    }
    return true
  })
  const { toast } = useToast()

  useEffect(() => {
    // Get the selected plan from sessionStorage
    const planData = sessionStorage.getItem('selectedPlan')
    console.log('Checkout - Raw sessionStorage data:', planData)
    if (planData) {
      try {
        const parsedPlan = JSON.parse(planData)
        console.log('Checkout - Parsed plan:', parsedPlan)
        setSelectedPlan(parsedPlan)
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error parsing plan data:', error)
        }
      }
    } else {
      console.log('Checkout - No plan data found in sessionStorage')
    }
  }, [])

  // Fetch user data for auto-fill
  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId) {
        setUserDataLoading(false)
        return
      }

      try {
        // First get basic user info
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('name, email, role')
          .eq('id', userId)
          .single()

        if (userError || !userData) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Error fetching user data:', userError)
          }
          setUserDataLoading(false)
          return
        }

        // Get phone number from role-specific table
        let phone = ''
        const role = userData.role
        
        if (role && ['manager', 'teacher', 'parent', 'student'].includes(role)) {
          const tableName = role === 'manager' ? 'managers' : 
                           role === 'teacher' ? 'teachers' :
                           role === 'parent' ? 'parents' : 'students'
          
          const { data: roleData, error: roleError } = await supabase
            .from(tableName)
            .select('phone')
            .eq('user_id', userId)
            .single()

          if (!roleError && roleData?.phone) {
            phone = roleData.phone
          }
        }

        // Auto-populate form with fetched data
        setUserInfo({
          name: userData.name || userName || '',
          email: userData.email || '',
          phone: phone,
          address: ''
        })

      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error fetching user data:', error)
        }
      } finally {
        setUserDataLoading(false)
        // Mark app as loaded when user data is finished loading
        simpleTabDetection.markAppLoaded()
      }
    }

    fetchUserData()
  }, [userId, userName])

  const handleInputChange = (field: keyof UserInfo, value: string) => {
    setUserInfo(prev => ({ ...prev, [field]: value }))
  }

  const handlePaymentMethodChange = (value: string) => {
    try {
      // Remove production logging - payment method changes
      setPaymentMethod(value)
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error changing payment method:', error)
      }
    }
  }

  const handlePayment = async () => {
    if (!selectedPlan || !userInfo.name || !userInfo.email || !userInfo.phone) {
      toast({
        title: "필수 정보 입력",
        description: t('checkout.fillRequiredFields') as string,
        variant: "destructive",
      })
      return
    }

    if (!termsAccepted) {
      toast({
        title: "약관 동의 필요",
        description: t('checkout.acceptTerms') as string,
        variant: "destructive",
      })
      return
    }

    setPaymentLoading(true)
    try {
      // Remove '₩' and ',' from price and convert to number
      const cleanPrice = parseInt(selectedPlan.price.replace(/[₩,]/g, ''))
      console.log('Checkout - Selected plan:', selectedPlan.name, 'Price:', selectedPlan.price, 'Clean price:', cleanPrice)

      // Make direct payment for subscription using PortOne SDK
      const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID!
      const channelKey = 'channel-key-8bb588e1-00e4-4a9f-a4e0-5351692dc4e6' // Use working Inicis channel

      const paymentId = `pay_${Date.now().toString().slice(-8)}`

      const response = await PortOne.requestPayment({
        storeId: storeId,
        channelKey: channelKey,
        paymentId: paymentId,
        orderName: `Subscription Plan`,
        totalAmount: cleanPrice,
        currency: "KRW",
        payMethod: "CARD",
        customer: {
          fullName: userInfo.name,
          phoneNumber: userInfo.phone,
          email: userInfo.email,
        },
        customData: {
          userId: userId,
          planName: selectedPlan.name.replace(/[가-힣]/g, '').trim() || 'Plan',
          amount: cleanPrice,
          type: "subscription"
        }
      })

      if (response?.code != null) {
        // Payment failed or cancelled
        toast({
          title: "결제 실패",
          description: response.message || "결제가 취소되었거나 실패했습니다.",
          variant: "destructive",
        })
        return
      }

      // Payment completed successfully
      const completedPaymentId = response?.paymentId

      if (!completedPaymentId) {
        throw new Error("결제 ID를 받지 못했습니다.")
      }

      console.log('Checkout - Payment completed:', completedPaymentId)

      toast({
        title: "결제 성공",
        description: "구독이 성공적으로 시작되었습니다.",
      })

      // Save subscription data to database
      const subscriptionSuccess = true // We'll implement validation later

      if (subscriptionSuccess) {
        // Save subscription data to database
        const { error: subError } = await supabase
          .from('subscriptions')
          .upsert({
            user_id: userId,
            payment_id: completedPaymentId, // Store payment ID instead of billing key for now
            plan_name: selectedPlan.name,
            plan_price: cleanPrice,
            status: 'active',
            next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
            customer_name: userInfo.name,
            customer_email: userInfo.email,
            customer_phone: userInfo.phone,
            created_at: new Date().toISOString(),
          })

        if (subError) {
          console.error('Failed to save subscription:', subError)
        }

        toast({
          title: "구독 시작됨",
          description: "첫 구독 결제가 완료되었습니다. 다음 결제는 30일 후에 예정됩니다.",
        })

        // Redirect to success page or dashboard
        router.push('/dashboard')
      } else {
        toast({
          title: "구독 결제 실패",
          description: "첫 결제 처리에 실패했습니다.",
          variant: "destructive",
        })
      }

    } catch (error) {
      const errorMessage = (error as Error).message

      if (process.env.NODE_ENV === 'development') {
        console.error('Subscription error:', errorMessage)
      }

      toast({
        title: "구독 오류",
        description: "구독 처리 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      })
    } finally {
      setPaymentLoading(false)
    }
  }

  const handleBackToPlans = () => {
    router.push('/upgrade')
  }

  // If plan not selected
  if (!selectedPlan) {
    return (
      <div className="p-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('checkout.title')}</h1>
              <p className="text-gray-500">{t('checkout.subtitle')}</p>
            </div>
            <Button onClick={handleBackToPlans} variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              {t('checkout.backToPlans')}
            </Button>
          </div>

          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">{t('checkout.noPlanSelected')}</p>
            <Button onClick={handleBackToPlans} variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              {t('checkout.backToPlans')}
            </Button>
          </div>
      </div>
    )
  }

  return (
    <PaymentErrorBoundary>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('checkout.title')}</h1>
            <p className="text-gray-500">{t('checkout.subtitle')}</p>
          </div>
          <Button onClick={handleBackToPlans} variant="outline" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            {t('checkout.backToPlans')}
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - User Information & Payment */}
          <div className="lg:col-span-2 space-y-6">
            {/* User Information Section */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('checkout.userInformation')}</h2>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-900 mb-2">
                    {t('checkout.fullName')} *
                  </Label>
                  <Input
                    type="text"
                    value={userInfo.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="h-10 rounded-lg border border-border bg-transparent focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                    placeholder={String(t('checkout.fullNamePlaceholder'))}
                    required
                    disabled={userDataLoading}
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-900 mb-2">
                    {t('checkout.emailAddress')} *
                  </Label>
                  <Input
                    type="email"
                    value={userInfo.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="h-10 rounded-lg border border-border bg-transparent focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                    placeholder={String(t('checkout.emailAddressPlaceholder'))}
                    required
                    disabled={userDataLoading}
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-900 mb-2">
                    {t('checkout.phoneNumber')} *
                  </Label>
                  <Input
                    type="tel"
                    value={userInfo.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="h-10 rounded-lg border border-border bg-transparent focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                    placeholder={String(t('checkout.phoneNumberPlaceholder'))}
                    required
                    disabled={userDataLoading}
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-900 mb-2">
                    {t('checkout.address')}
                  </Label>
                  <Input
                    type="text"
                    value={userInfo.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className="h-10 rounded-lg border border-border bg-transparent focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                    placeholder={String(t('checkout.addressPlaceholder'))}
                    disabled={userDataLoading}
                  />
                </div>
              </div>
            </Card>

            {/* Payment Method Section */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('checkout.paymentMethod')}</h2>
              
              <Select value={paymentMethod} onValueChange={handlePaymentMethodChange}>
                <SelectTrigger className="w-full h-12 rounded-lg border border-border bg-transparent focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0">
                  <SelectValue placeholder={String(t('checkout.selectPaymentMethod'))} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="card">{t('checkout.creditCard')}</SelectItem>
                </SelectContent>
              </Select>
            </Card>
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('checkout.orderSummary')}</h2>
              
              {/* Selected Plan */}
              <div className="border-b border-gray-200 pb-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">{selectedPlan.name}</h3>
                  <span className="text-lg font-bold text-gray-900">{selectedPlan.price}/{t('checkout.month')}</span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{selectedPlan.description}</p>
                
                {/* Features */}
                <div className="space-y-2">
                  {selectedPlan.features.slice(0, 3).map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <span className="text-sm text-gray-600">{feature}</span>
                    </div>
                  ))}
                  {selectedPlan.features.length > 3 && (
                    <p className="text-sm text-gray-500">+ {selectedPlan.features.length - 3} {t('checkout.moreFeatures')}</p>
                  )}
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('checkout.subtotal')}</span>
                  <span className="text-sm text-gray-900">{selectedPlan.price}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('checkout.tax')}</span>
                  <span className="text-sm text-gray-900">₩0</span>
                </div>
                <div className="border-t border-gray-200 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">{t('checkout.total')}</span>
                    <span className="text-lg font-bold text-gray-900">{selectedPlan.price}/{t('checkout.month')}</span>
                  </div>
                </div>
              </div>

              {/* Agreement Checkbox */}
              <div className="flex items-start gap-3 mb-4">
                <div className="relative flex items-center mt-0.5">
                  <input
                    type="checkbox"
                    id="terms-acceptance"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`h-4 w-4 border-2 rounded cursor-pointer flex items-center justify-center ${
                      termsAccepted
                        ? 'bg-primary border-primary'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onClick={() => setTermsAccepted(!termsAccepted)}
                  >
                    {termsAccepted && (
                      <svg 
                        className="h-3 w-3 text-white" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M5 13l4 4L19 7" 
                        />
                      </svg>
                    )}
                  </div>
                </div>
                <label 
                  htmlFor="terms-acceptance" 
                  className="text-sm text-gray-700 leading-relaxed cursor-pointer"
                >
                  {t('checkout.agreeToTerms')}{' '}
                  <a 
                    href="https://classraum.com/terms" 
                    target="_blank" 
                    className="text-primary hover:text-primary/80 underline inline-flex items-center gap-1"
                  >
                    {t('checkout.termsOfService')}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  {', '}
                  <a 
                    href="https://classraum.com/privacy-policy" 
                    target="_blank" 
                    className="text-primary hover:text-primary/80 underline inline-flex items-center gap-1"
                  >
                    {t('checkout.privacyPolicy')}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  {', '}
                  {t('common.and')}{' '}
                  <a 
                    href="https://classraum.com/refund-policy" 
                    target="_blank" 
                    className="text-primary hover:text-primary/80 underline inline-flex items-center gap-1"
                  >
                    {t('checkout.refundPolicy')}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </label>
              </div>

              {/* Payment Button */}
              <Button
                onClick={handlePayment}
                disabled={paymentLoading || !userInfo.name || !userInfo.email || !userInfo.phone || !termsAccepted}
                className="w-full h-12 text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium"
              >
                {paymentLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('checkout.processing')}
                  </>
                ) : (
                  t('checkout.payAmount', { amount: selectedPlan.price })
                )}
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </PaymentErrorBoundary>
  )
}