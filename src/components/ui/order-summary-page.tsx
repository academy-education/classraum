"use client"

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Check, ArrowLeft } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/hooks/useTranslation'

interface OrderSummaryPageProps {
  academyId?: string
  selectedPlan?: {
    name: string
    price: string
    description: string
    features: string[]
    additionalCosts?: string[]
  }
  onBack?: () => void
}

interface UserInfo {
  name: string
  email: string
  phone: string
  address: string
}

export function OrderSummaryPage({ academyId, selectedPlan, onBack }: OrderSummaryPageProps) {
  const { t } = useTranslation()
  const [userInfo, setUserInfo] = useState<UserInfo>({ name: '', email: '', phone: '', address: '' })
  const [loading, setLoading] = useState(false)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('card')

  // Safe payment method change handler
  const handlePaymentMethodChange = (value: string) => {
    try {
      console.log('Payment method changing to:', value)
      setPaymentMethod(value)
    } catch (error) {
      console.error('Error changing payment method:', error)
    }
  }

  // ✅ Load INIStdPay.js script once on mount
  useEffect(() => {
    const scriptId = 'inicis-script'
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script')
      script.src = 'https://stgstdpay.inicis.com/stdjs/INIStdPay.js' // 👈 use prod URL for production
      script.id = scriptId
      script.async = true
      document.body.appendChild(script)
    }
  }, [])

  // ✅ Fetch user info
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: userData } = await supabase
          .from('users')
          .select('name, email, role')
          .eq('id', user.id)
          .single()

        const roleTable = `${userData?.role}s`
        const { data: roleData } = await supabase
          .from(roleTable)
          .select('phone, academy_id')
          .eq('user_id', user.id)
          .single()

        const { data: academyData } = await supabase
          .from('academies')
          .select('address')
          .eq('id', roleData?.academy_id || academyId)
          .single()

        setUserInfo({
          name: userData?.name || '',
          email: userData?.email || '',
          phone: roleData?.phone || '',
          address: academyData?.address || ''
        })
      } finally {
        setLoading(false)
      }
    }
    fetchUserInfo()
  }, [academyId])

  // ✅ Trigger INICIS billing modal
  const handlePayment = async () => {
    if (!userInfo.name || !userInfo.email || !userInfo.phone) {
      alert(t('orderSummary.errors.fillRequired'))
      return
    }

    if (!paymentMethod) {
      alert(t('orderSummary.errors.selectPayment'))
      return
    }

    setPaymentLoading(true)

    try {
      const response = await fetch('/api/billing/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          price: selectedPlan?.price?.replace(/[^0-9]/g, '') || '1000' // remove ₩ or commas if needed
        }),
      })

      const data = await response.json()

      const form = document.getElementById('SendPayForm_id') as HTMLFormElement
      if (!form) throw new Error('Payment form not found')

      // Set form attributes
      form.method = 'POST'
      form.action = 'https://stgstdpay.inicis.com/stdBillPay/INIStdBillPay.jsp'
      form.innerHTML = '' // Reset form

      // Payment method configuration based on INICIS documentation
      const paymentMethods = {
        'card': { 
          acceptmethod: 'HPP(1):below1000:va_receipt:BILLAUTH(Card)',
          gopaymethod: 'Card'
        },
        'phone': {
          // For mobile phone billing - mobile payment only
          acceptmethod: 'HPP(1):below1000:va_receipt:BILLAUTH',
          gopaymethod: 'HPP'
        }
      }

      const selectedPaymentConfig = paymentMethods[paymentMethod as keyof typeof paymentMethods]
      
      if (!selectedPaymentConfig) {
        throw new Error(`Invalid payment method: ${paymentMethod}`)
      }
      
      console.log('Selected payment method:', paymentMethod)
      console.log('Payment configuration:', selectedPaymentConfig)

      // Safely construct URLs
      const baseUrl = window.location.origin
      const returnUrl = `${baseUrl}/api/billing/return`
      const closeUrl = `${baseUrl}/api/billing/close`
      
      console.log('Base URL:', baseUrl)
      console.log('Return URL:', returnUrl)
      console.log('Close URL:', closeUrl)

      const formValues = {
        ...data,
        goodname: selectedPlan?.name,
        buyername: userInfo.name,
        buyeremail: userInfo.email,
        buyertel: userInfo.phone,
        returnUrl,
        closeUrl,
        acceptmethod: selectedPaymentConfig.acceptmethod,
        currency: 'WON',
        gopaymethod: selectedPaymentConfig.gopaymethod,
        version: '1.0',
        // Add offerPeriod for mobile billing as shown in INICIS demo
        ...(paymentMethod === 'phone' && {
          offerPeriod: 'M2'
        })
      }

      Object.entries(formValues).forEach(([key, value]) => {
        const input = document.createElement('input')
        input.type = 'hidden'
        input.name = key
        input.value = String(value)
        form.appendChild(input)
      })

      const windowWithINI = window as Window & { INIStdPay?: { pay: (formId: string) => void } }
      if (windowWithINI.INIStdPay) {
        windowWithINI.INIStdPay.pay('SendPayForm_id')
      } else {
        throw new Error('INIStdPay script not loaded')
      }
    } catch (e) {
      console.error('Payment initialization error:', e)
      console.error('Error details:', {
        message: (e as Error).message,
        stack: (e as Error).stack,
        paymentMethod,
        userInfo,
        selectedPlan
      })
      alert(`${t('orderSummary.errors.paymentFailed')}: ${(e as Error).message}`)
    } finally {
      setPaymentLoading(false)
    }
  }

  const handleInputChange = (field: keyof UserInfo, value: string) => {
    setUserInfo(prev => ({ ...prev, [field]: value }))
  }


  // 🔄 If plan not selected
  if (!selectedPlan) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Order Summary</h1>
            <p className="text-gray-500">Review your plan details and complete your upgrade</p>
          </div>
          <Button onClick={onBack} variant="outline" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Plans
          </Button>
        </div>

        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">{t('orderSummary.noPlanSelected')}</p>
          <Button onClick={onBack} variant="outline" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            {t('orderSummary.backToPlans')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('orderSummary.title')}</h1>
          <p className="text-gray-500">{t('orderSummary.subtitle')}</p>
        </div>
        <Button onClick={onBack} variant="outline" className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          {t('orderSummary.backToPlans')}
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column - User Information & Payment */}
        <div className="lg:col-span-2 space-y-6">
          {/* User Information Section */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('orderSummary.userInformation.title')}</h2>
            
            {loading ? (
              <div className="space-y-4">
                <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-20 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-900 mb-2">
                    {t('orderSummary.userInformation.fullName')}
                  </Label>
                  <Input
                    type="text"
                    value={userInfo.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="h-10 rounded-lg border border-border bg-transparent focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                    placeholder={String(t('orderSummary.userInformation.enterFullName'))}
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-900 mb-2">
                    {t('orderSummary.userInformation.emailAddress')}
                  </Label>
                  <Input
                    type="email"
                    value={userInfo.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="h-10 rounded-lg border border-border bg-transparent focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                    placeholder={String(t('orderSummary.userInformation.enterEmail'))}
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-900 mb-2">
                    {t('orderSummary.userInformation.phoneNumber')}
                  </Label>
                  <Input
                    type="tel"
                    value={userInfo.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="h-10 rounded-lg border border-border bg-transparent focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                    placeholder={String(t('orderSummary.userInformation.enterPhone'))}
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-900 mb-2">
                    {t('orderSummary.userInformation.address')}
                  </Label>
                  <textarea
                    value={userInfo.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    rows={3}
                    className="w-full min-h-[2.5rem] px-3 py-2 rounded-lg border border-border bg-transparent focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none resize-none text-sm"
                    placeholder={String(t('orderSummary.userInformation.enterAddress'))}
                  />
                </div>
              </div>
            )}
          </Card>

          {/* Payment Amount Section */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('orderSummary.payment.title')}</h2>
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">{t('orderSummary.payment.plan')}:</span>
                <span className="font-medium text-gray-900">{selectedPlan.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{t('orderSummary.payment.monthlyPrice')}:</span>
                <span className="text-2xl font-bold text-gray-900">{selectedPlan.price}</span>
              </div>
            </div>

            {/* Payment Method Dropdown */}
            <div className="space-y-2 mb-6">
              <Label className="text-sm font-medium text-foreground/80">
                {t('orderSummary.payment.paymentMethod')}
              </Label>
              <Select value={paymentMethod} onValueChange={handlePaymentMethodChange}>
                <SelectTrigger className="!h-10 w-full rounded-lg border border-border bg-transparent focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary py-2 px-3">
                  <SelectValue placeholder={t('orderSummary.payment.selectPaymentMethod')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="card">{t('orderSummary.payment.methods.card')}</SelectItem>
                  <SelectItem value="phone">{t('orderSummary.payment.methods.phone')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handlePayment}
              disabled={paymentLoading || loading}
              className="w-full text-sm"
            >
              {paymentLoading ? t('orderSummary.payment.processing') : t('orderSummary.payment.payNow')}
            </Button>

            <p className="text-xs text-gray-500 mt-3 text-center">
              {t('orderSummary.payment.autoRenewNotice')}
            </p>
          </Card>
        </div>

        {/* Right Column - Plan Details */}
        <div className="lg:col-span-1">
          <Card className="p-6 sticky top-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('orderSummary.planDetails.title')}</h2>
            
            <div className="mb-4">
              <h3 className="font-semibold text-gray-900 mb-1">{selectedPlan.name}</h3>
              <p className="text-sm text-gray-600 mb-2">{selectedPlan.description}</p>
              <div className="text-2xl font-bold text-gray-900">{selectedPlan.price}<span className="text-sm text-gray-600">/{t('orderSummary.planDetails.month')}</span></div>
            </div>

            <div className="space-y-2 mb-6">
              <h4 className="font-medium text-gray-900 text-sm">{t('orderSummary.planDetails.includedFeatures')}:</h4>
              {selectedPlan.features.map((feature, index) => (
                <div key={index} className="flex items-center text-sm">
                  <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  <span className="text-gray-700">{feature}</span>
                </div>
              ))}
            </div>

            {selectedPlan.additionalCosts && selectedPlan.additionalCosts.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 text-sm mb-2">{t('orderSummary.planDetails.additionalCosts')}:</h4>
                {selectedPlan.additionalCosts.map((cost, index) => (
                  <p key={index} className="text-xs text-gray-500">{cost}</p>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
      <form
        id="SendPayForm_id"
        style={{ display: 'none' }}
      ></form>  
    </div>
  )
}