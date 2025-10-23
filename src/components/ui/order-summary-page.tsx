"use client"

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Check, ArrowLeft, Info } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/hooks/useTranslation'
import { useRouter } from 'next/navigation'
import * as PortOne from '@portone/browser-sdk/v2'
import { getPortOneConfig } from '@/lib/portone-config'
import { useToast } from '@/hooks/use-toast'
import {
  calculateUpgradeProration,
  getTierChangeType,
  formatKRW,
} from '@/lib/proration'

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

interface ExistingSubscription {
  plan_tier: string
  monthly_amount: number
  current_period_start: string
  current_period_end: string
  next_billing_date: string
  billing_key: string | null
}

export function OrderSummaryPage({ academyId, selectedPlan, onBack }: OrderSummaryPageProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const { toast } = useToast()
  const [userInfo, setUserInfo] = useState<UserInfo>({ name: '', email: '', phone: '', address: '' })
  const [loading, setLoading] = useState(false)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [existingSubscription, setExistingSubscription] = useState<ExistingSubscription | null>(null)
  const [prorationInfo, setProrationInfo] = useState<{
    isUpgrade: boolean
    isDowngrade: boolean
    proratedAmount: number
    daysRemaining: number
    nextBillingDate: string
  } | null>(null)

  // Map plan names to tier codes
  const PLAN_TIER_MAP: Record<string, string> = {
    'Individual': 'individual',
    'Small': 'basic',
    'Mid': 'pro',
    'Large': 'enterprise',
  }

  // Map prices to monthly amounts
  const PLAN_PRICE_MAP: Record<string, number> = {
    '₩24,900': 24900,
    '₩249,000': 249000,
    '₩499,000': 499000,
    '$24.90': 24900,
    '$249': 249000,
    '$499': 499000,
  }

  // Default onBack handler - go back to upgrade page
  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      router.push('/upgrade')
    }
  }

  // ✅ Fetch user info and check for existing subscription
  useEffect(() => {
    const fetchData = async () => {
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

        const currentAcademyId = roleData?.academy_id || academyId

        const { data: academyData } = await supabase
          .from('academies')
          .select('address')
          .eq('id', currentAcademyId)
          .single()

        setUserInfo({
          name: userData?.name || '',
          email: userData?.email || '',
          phone: roleData?.phone || '',
          address: academyData?.address || ''
        })

        // Check for existing subscription to calculate proration
        if (currentAcademyId && selectedPlan) {
          console.log('[OrderSummary] Checking for existing subscription for academy:', currentAcademyId)

          const { data: subscription, error: subError } = await supabase
            .from('academy_subscriptions')
            .select('plan_tier, monthly_amount, current_period_start, current_period_end, next_billing_date, billing_key')
            .eq('academy_id', currentAcademyId)
            .maybeSingle()

          if (subError) {
            console.error('[OrderSummary] Error fetching subscription:', subError)
          }

          if (subscription) {
            console.log('[OrderSummary] Found existing subscription:', {
              tier: subscription.plan_tier,
              hasBillingKey: !!subscription.billing_key
            })

            setExistingSubscription(subscription)

            // Get plan tier from selected plan name
            const selectedTier = PLAN_TIER_MAP[selectedPlan.name]
            console.log('[OrderSummary] Selected tier:', selectedTier, 'from plan:', selectedPlan.name)

            if (selectedTier) {
              const changeType = getTierChangeType(subscription.plan_tier, selectedTier)
              console.log('[OrderSummary] Change type detected:', changeType)

              if (changeType === 'upgrade') {
                // Calculate prorated amount
                const newMonthlyAmount = PLAN_PRICE_MAP[selectedPlan.price]
                if (newMonthlyAmount) {
                  const proration = calculateUpgradeProration(
                    subscription.monthly_amount,
                    newMonthlyAmount,
                    subscription.current_period_start,
                    subscription.current_period_end
                  )

                  console.log('[OrderSummary] Upgrade - Prorated amount:', proration.proratedAmount)

                  setProrationInfo({
                    isUpgrade: true,
                    isDowngrade: false,
                    proratedAmount: proration.proratedAmount,
                    daysRemaining: proration.daysRemaining,
                    nextBillingDate: subscription.next_billing_date,
                  })
                }
              } else if (changeType === 'downgrade') {
                console.log('[OrderSummary] Downgrade detected')

                // Set downgrade flag
                setProrationInfo({
                  isUpgrade: false,
                  isDowngrade: true,
                  proratedAmount: 0,
                  daysRemaining: 0,
                  nextBillingDate: subscription.next_billing_date,
                })
              }
            }
          } else {
            console.log('[OrderSummary] No existing subscription found - this is a new subscription')
          }
        }
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [academyId, selectedPlan])

  // Handle subscription - three scenarios: new, upgrade, downgrade
  const handlePayment = async () => {
    if (!userInfo.name || !userInfo.email || !userInfo.phone) {
      toast({
        title: t('orderSummary.errors.fillRequired'),
        variant: 'destructive',
      })
      return
    }

    if (!selectedPlan) {
      toast({
        title: 'Error',
        description: 'No plan selected',
        variant: 'destructive',
      })
      return
    }

    setPaymentLoading(true)

    try {
      // Get plan tier and price
      const planTier = PLAN_TIER_MAP[selectedPlan.name] || 'basic'
      const monthlyAmount = PLAN_PRICE_MAP[selectedPlan.price]

      if (!monthlyAmount) {
        toast({
          title: 'Error',
          description: 'Invalid plan price',
          variant: 'destructive',
        })
        return
      }

      const { data: { session } } = await supabase.auth.getSession()

      console.log('[OrderSummary] handlePayment - State:', {
        hasExistingSubscription: !!existingSubscription,
        hasBillingKey: !!existingSubscription?.billing_key,
        billingKeyValue: existingSubscription?.billing_key?.substring(0, 15) + '...',
        prorationInfo,
        isUpgrade: prorationInfo?.isUpgrade,
        isDowngrade: prorationInfo?.isDowngrade,
        selectedPlanTier: planTier,
        currentPlanTier: existingSubscription?.plan_tier,
      })

      // SCENARIO 1: DOWNGRADE - Just schedule the change, no payment needed
      if (existingSubscription && prorationInfo && prorationInfo.isDowngrade) {
        console.log('[OrderSummary] ✅ SCENARIO 1: Downgrade - Calling downgrade API')
        const downgradeResponse = await fetch('/api/subscription/downgrade', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            targetTier: planTier,
          }),
        })

        const downgradeData = await downgradeResponse.json()

        if (downgradeData.success) {
          toast({
            title: 'Downgrade Scheduled',
            description: downgradeData.message || `Downgrade to ${selectedPlan.name} scheduled successfully`,
          })

          // Clear sessionStorage and redirect
          sessionStorage.removeItem('selectedPlan')
          router.push('/settings/subscription')
        } else {
          toast({
            title: 'Downgrade Failed',
            description: downgradeData.message || 'Failed to schedule downgrade',
            variant: 'destructive',
          })
        }
        return
      }

      // SCENARIO 2: UPGRADE with existing billing key - Use existing card
      if (existingSubscription && existingSubscription.billing_key && prorationInfo?.isUpgrade) {
        console.log('[OrderSummary] ✅ SCENARIO 2: Upgrade - Using existing billing key:', existingSubscription.billing_key?.substring(0, 10) + '...')

        const subscribeResponse = await fetch('/api/subscription/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            billingKey: existingSubscription.billing_key,
            planTier,
            billingCycle: 'monthly',
            makeInitialPayment: true, // This will charge the prorated amount
          }),
        })

        const subscribeData = await subscribeResponse.json()

        if (subscribeData.success) {
          // Show payment details if payment was made
          const paymentInfo = subscribeData.data?.initialPayment
          let description = `Successfully upgraded to ${selectedPlan.name}`

          // Check if payment was attempted
          if (paymentInfo) {
            if (paymentInfo.success) {
              const amountCharged = paymentInfo.amountCharged || 0
              const formattedAmount = new Intl.NumberFormat('ko-KR', {
                style: 'currency',
                currency: 'KRW',
              }).format(amountCharged)

              if (paymentInfo.isProrated) {
                description = `Upgrade payment of ${formattedAmount} (prorated amount) has been charged. You are now on the ${selectedPlan.name} plan.`
              } else {
                description = `Payment of ${formattedAmount} has been charged. You are now on the ${selectedPlan.name} plan.`
              }
            } else {
              // Payment failed but subscription was created
              toast({
                title: 'Upgrade Scheduled',
                description: 'Your plan upgrade has been scheduled, but the payment failed. Please update your payment method.',
                variant: 'destructive',
              })
              sessionStorage.removeItem('selectedPlan')
              router.push('/settings/subscription')
              return
            }
          }

          toast({
            title: 'Upgrade Complete',
            description,
          })

          // Clear sessionStorage and redirect
          sessionStorage.removeItem('selectedPlan')
          router.push('/settings/subscription')
        } else {
          toast({
            title: 'Upgrade Failed',
            description: subscribeData.message || 'Failed to process upgrade',
            variant: 'destructive',
          })
        }
        return
      }

      // SCENARIO 2.5: UPGRADE without billing key - Register card and charge immediately
      if (existingSubscription && !existingSubscription.billing_key && prorationInfo?.isUpgrade) {
        console.log('[OrderSummary] ✅ SCENARIO 2.5: Upgrade without billing key - Registering card and charging prorated amount')

        const config = getPortOneConfig()
        const issueId = `UPGRADE_${Date.now()}`

        // Request billing key issuance
        const response = await PortOne.requestIssueBillingKey({
          storeId: config.storeId,
          channelKey: config.billingChannelKey,
          billingKeyMethod: 'CARD',
          issueId: issueId,
          issueName: `${selectedPlan.name} 플랜 업그레이드`,
          redirectUrl: `${window.location.origin}/order-summary`,
          offerPeriod: {
            interval: '1m'
          },
          customer: {
            customerId: `academy_${academyId || Date.now()}`,
            email: userInfo.email,
            phoneNumber: userInfo.phone,
            fullName: userInfo.name,
          },
        })

        // Handle cancellation
        if (response?.code === 'PORTONE_USER_CANCEL' || !response || Object.keys(response).length === 0) {
          console.log('User cancelled billing key issuance')
          return
        }

        // Check for errors
        if (response?.code != null) {
          console.error('Billing key issuance failed:', response)
          toast({
            title: 'Billing Key Error',
            description: response.message || 'Failed to issue billing key',
            variant: 'destructive',
          })
          return
        }

        // Billing key issued successfully - now upgrade and charge
        const billingKey = response.billingKey

        const subscribeResponse = await fetch('/api/subscription/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            billingKey,
            planTier,
            billingCycle: 'monthly',
            makeInitialPayment: true, // Charge the prorated upgrade amount
          }),
        })

        const subscribeData = await subscribeResponse.json()

        if (subscribeData.success) {
          const paymentInfo = subscribeData.data?.initialPayment
          let description = `Successfully upgraded to ${selectedPlan.name}`

          if (paymentInfo) {
            if (paymentInfo.success) {
              const amountCharged = paymentInfo.amountCharged || 0
              const formattedAmount = new Intl.NumberFormat('ko-KR', {
                style: 'currency',
                currency: 'KRW',
              }).format(amountCharged)

              if (paymentInfo.isProrated) {
                description = `Upgrade payment of ${formattedAmount} (prorated amount) has been charged. You are now on the ${selectedPlan.name} plan.`
              } else {
                description = `Payment of ${formattedAmount} has been charged. You are now on the ${selectedPlan.name} plan.`
              }
            } else {
              toast({
                title: 'Upgrade Scheduled',
                description: 'Your plan upgrade has been scheduled, but the payment failed. Please update your payment method.',
                variant: 'destructive',
              })
              sessionStorage.removeItem('selectedPlan')
              router.push('/settings/subscription')
              return
            }
          }

          toast({
            title: 'Upgrade Complete',
            description,
          })

          sessionStorage.removeItem('selectedPlan')
          router.push('/settings/subscription')
        } else {
          toast({
            title: 'Upgrade Failed',
            description: subscribeData.message || 'Failed to process upgrade',
            variant: 'destructive',
          })
        }
        return
      }

      // SCENARIO 3: NEW SUBSCRIPTION - Request billing key via PortOne popup
      console.log('[OrderSummary] ✅ SCENARIO 3: New subscription - Showing PortOne popup')

      const config = getPortOneConfig()
      const issueId = `SUBSCRIBE_${Date.now()}`

      // Request billing key issuance
      const response = await PortOne.requestIssueBillingKey({
        storeId: config.storeId,
        channelKey: config.billingChannelKey,
        billingKeyMethod: 'CARD',
        issueId: issueId,
        issueName: `${selectedPlan.name} 정기결제 카드 등록`,
        redirectUrl: `${window.location.origin}/order-summary`,
        offerPeriod: {
          interval: '1m'
        },
        customer: {
          customerId: `academy_${academyId || Date.now()}`,
          email: userInfo.email,
          phoneNumber: userInfo.phone,
          fullName: userInfo.name,
        },
      })

      // Handle cancellation (silently return without showing message)
      if (response?.code === 'PORTONE_USER_CANCEL' || !response || Object.keys(response).length === 0) {
        console.log('User cancelled billing key issuance')
        return
      }

      // Check for errors
      if (response?.code != null) {
        console.error('Billing key issuance failed:', response)
        toast({
          title: 'Billing Key Error',
          description: response.message || 'Failed to issue billing key',
          variant: 'destructive',
        })
        return
      }

      // Billing key issued successfully
      const billingKey = response.billingKey

      // Send billing key to server to create subscription
      const subscribeResponse = await fetch('/api/subscription/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          billingKey,
          planTier,
          billingCycle: 'monthly',
          makeInitialPayment: true,
        }),
      })

      const subscribeData = await subscribeResponse.json()

      if (subscribeData.success) {
        // Show payment details if payment was made
        const paymentInfo = subscribeData.data?.initialPayment
        let description = `Successfully subscribed to ${selectedPlan.name}`

        // Check if payment was attempted
        if (paymentInfo) {
          if (paymentInfo.success) {
            const amountCharged = paymentInfo.amountCharged || 0
            const formattedAmount = new Intl.NumberFormat('ko-KR', {
              style: 'currency',
              currency: 'KRW',
            }).format(amountCharged)

            description = `Initial payment of ${formattedAmount} has been charged. You are now on the ${selectedPlan.name} plan.`
          } else {
            // Payment failed but subscription was created
            toast({
              title: 'Subscription Created',
              description: 'Your subscription has been created, but the payment failed. Please update your payment method.',
              variant: 'destructive',
            })
            sessionStorage.removeItem('selectedPlan')
            router.push('/settings/subscription')
            return
          }
        }

        toast({
          title: 'Subscription Complete',
          description,
        })

        // Clear sessionStorage and redirect
        sessionStorage.removeItem('selectedPlan')
        router.push('/settings/subscription')
      } else {
        toast({
          title: 'Subscription Failed',
          description: subscribeData.message || 'Failed to process subscription',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Subscription error:', error)
      toast({
        title: 'Subscription Error',
        description: 'An error occurred during subscription',
        variant: 'destructive',
      })
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
          <Button onClick={handleBack} variant="outline" className="flex items-center gap-2">
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
        <Button onClick={handleBack} variant="outline" className="flex items-center gap-2">
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

            {/* Show proration info for upgrades */}
            {prorationInfo && prorationInfo.isUpgrade && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-blue-900 text-sm mb-1">
                      {t('orderSummary.proration.upgradeTitle')}
                    </h3>
                    <p className="text-sm text-blue-800">
                      {t('orderSummary.proration.upgradeDescription', {
                        amount: formatKRW(prorationInfo.proratedAmount),
                        days: prorationInfo.daysRemaining,
                        date: new Date(prorationInfo.nextBillingDate).toLocaleDateString()
                      })}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Show downgrade notice */}
            {prorationInfo && prorationInfo.isDowngrade && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-amber-900 text-sm mb-1">
                      Scheduled Plan Change
                    </h3>
                    <p className="text-sm text-amber-800">
                      {t('orderSummary.scheduled.downgradeNotice', {
                        date: new Date(prorationInfo.nextBillingDate).toLocaleDateString()
                      })}
                    </p>
                    <p className="text-xs text-amber-700 mt-2">
                      {t('orderSummary.scheduled.currentPlanUntil', {
                        date: new Date(prorationInfo.nextBillingDate).toLocaleDateString()
                      })}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">{t('orderSummary.payment.plan')}:</span>
                <span className="font-medium text-gray-900">{selectedPlan.name}</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">{t('orderSummary.payment.monthlyPrice')}:</span>
                <span className="text-2xl font-bold text-gray-900">{selectedPlan.price}</span>
              </div>

              {/* Show today's charge for upgrades */}
              {prorationInfo && prorationInfo.isUpgrade && (
                <>
                  <div className="border-t border-gray-300 my-3"></div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900">{t('orderSummary.payment.todaysCharge')}:</span>
                    <span className="text-xl font-bold text-blue-600">
                      {formatKRW(prorationInfo.proratedAmount)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {t('orderSummary.proration.upgradeShortDescription', {
                      days: prorationInfo.daysRemaining
                    })}
                  </p>
                </>
              )}
            </div>

            <Button
              onClick={handlePayment}
              disabled={paymentLoading || loading}
              className="w-full text-sm"
            >
              {paymentLoading
                ? t('orderSummary.payment.processing')
                : prorationInfo?.isDowngrade
                  ? t('orderSummary.payment.scheduleDowngrade')
                  : t('orderSummary.payment.payNow')
              }
            </Button>

            <p className="text-xs text-gray-500 mt-3 text-center">
              {prorationInfo?.isDowngrade
                ? t('orderSummary.payment.downgradeNotice')
                : prorationInfo?.isUpgrade
                  ? t('orderSummary.proration.keepingBillingDate')
                  : t('orderSummary.payment.autoRenewNotice')
              }
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
    </div>
  )
}