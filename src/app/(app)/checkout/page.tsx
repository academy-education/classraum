"use client"

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Check, ArrowLeft, ExternalLink } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTranslation } from '@/hooks/useTranslation'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

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
  const { userId, userName, academyId } = useAuth()
  const [selectedPlan, setSelectedPlan] = useState<SelectedPlan | null>(null)
  const [userInfo, setUserInfo] = useState<UserInfo>({ name: '', email: '', phone: '', address: '' })
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('card')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [userDataLoading, setUserDataLoading] = useState(true)

  // Load INIStdPay.js script once on mount
  useEffect(() => {
    const scriptId = 'inicis-script'
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script')
      script.src = 'https://stgstdpay.inicis.com/stdjs/INIStdPay.js'
      script.id = scriptId
      script.async = true
      document.body.appendChild(script)
    }
  }, [])

  useEffect(() => {
    // Get the selected plan from sessionStorage
    const planData = sessionStorage.getItem('selectedPlan')
    if (planData) {
      try {
        setSelectedPlan(JSON.parse(planData))
      } catch (error) {
        console.error('Error parsing plan data:', error)
      }
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
          console.error('Error fetching user data:', userError)
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
        console.error('Error fetching user data:', error)
      } finally {
        setUserDataLoading(false)
      }
    }

    fetchUserData()
  }, [userId, userName])

  const handleInputChange = (field: keyof UserInfo, value: string) => {
    setUserInfo(prev => ({ ...prev, [field]: value }))
  }

  const handlePaymentMethodChange = (value: string) => {
    try {
      console.log('Payment method changing to:', value)
      setPaymentMethod(value)
    } catch (error) {
      console.error('Error changing payment method:', error)
    }
  }

  const handlePayment = async () => {
    if (!selectedPlan || !userInfo.name || !userInfo.email || !userInfo.phone) {
      alert(t('checkout.fillRequiredFields'))
      return
    }

    if (!termsAccepted) {
      alert(t('checkout.acceptTerms'))
      return
    }

    setPaymentLoading(true)
    try {
      // Remove '₩' and ',' from price and convert to number
      const cleanPrice = selectedPlan.price.replace(/[₩,]/g, '')
      
      // Get payment configuration from API
      const response = await fetch('/api/billing/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: cleanPrice })
      })
      
      if (!response.ok) throw new Error('Failed to initiate payment')
      
      const paymentConfig = await response.json()

      // Create and submit payment form
      const form = document.getElementById('SendPayForm_id') as HTMLFormElement
      if (!form) throw new Error('Payment form not found')

      // Set form method but NOT action - let INIStdPay.pay() handle the submission
      form.method = 'POST'
      form.innerHTML = ''

      // Form fields matching the working KG Inicis example exactly
      const formFields = {
        // Required fields from working example
        version: '1.0',
        gopaymethod: 'Card',  // Credit card only as requested
        mid: paymentConfig.mid,
        oid: paymentConfig.oid,
        price: cleanPrice,
        timestamp: paymentConfig.timestamp,
        use_chkfake: paymentConfig.use_chkfake,
        signature: paymentConfig.signature,
        verification: paymentConfig.verification,
        mKey: paymentConfig.mKey,
        currency: 'WON',
        
        // Product and buyer information
        goodname: selectedPlan.name,
        buyername: userInfo.name,
        buyertel: userInfo.phone,
        buyeremail: userInfo.email,
        
        // URLs for return handling
        returnUrl: `${window.location.origin}/api/billing/return`,
        closeUrl: `${window.location.origin}/api/billing/close`,
        
        // Accept method - matching working example
        acceptmethod: 'HPP(1):va_receipt:below1000:centerCd(Y)'
      }

      // Add form fields
      Object.entries(formFields).forEach(([key, value]) => {
        const input = document.createElement('input')
        input.type = 'hidden'
        input.name = key
        input.value = String(value)
        form.appendChild(input)
      })

      // Submit form using KG Inicis method (like the working example)
      if (typeof window !== 'undefined' && (window as unknown as { INIStdPay?: { pay: (formId: string) => void } })?.INIStdPay) {
        const windowWithINI = window as unknown as { INIStdPay: { pay: (formId: string) => void } }
        windowWithINI.INIStdPay.pay('SendPayForm_id')
      } else {
        throw new Error('INIStdPay library not loaded')
      }
      
    } catch (error) {
      console.error('Payment error:', error)
      alert(`Payment failed: ${(error as Error).message}`)
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
                    placeholder={t('checkout.fullNamePlaceholder')}
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
                    placeholder={t('checkout.emailAddressPlaceholder')}
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
                    placeholder={t('checkout.phoneNumberPlaceholder')}
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
                    placeholder={t('checkout.addressPlaceholder')}
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
                  <SelectValue placeholder={t('checkout.selectPaymentMethod')} />
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
                        ? 'bg-blue-600 border-blue-600' 
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
                    className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1"
                  >
                    {t('checkout.termsOfService')}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  {', '}
                  <a 
                    href="https://classraum.com/privacy-policy" 
                    target="_blank" 
                    className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1"
                  >
                    {t('checkout.privacyPolicy')}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  {', '}
                  {t('common.and')}{' '}
                  <a 
                    href="https://classraum.com/refund-policy" 
                    target="_blank" 
                    className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1"
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
                className="w-full h-12 text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium"
              >
                {paymentLoading ? t('checkout.processing') : t('checkout.payAmount', { amount: selectedPlan.price })}
              </Button>
            </Card>
          </div>
        </div>

      {/* Hidden form for KG Inicis */}
      <form id="SendPayForm_id" style={{ display: 'none' }}></form>
    </div>
  )
}