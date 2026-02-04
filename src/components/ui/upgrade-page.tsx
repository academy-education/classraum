"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useTranslation } from '@/hooks/useTranslation'
import { Check, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as PortOne from '@portone/browser-sdk/v2'
import { getPortOneConfig } from '@/lib/portone-config'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import type { SubscriptionTier } from '@/types/subscription'
import { isIOSApp } from '@/lib/nativeApp'
import { ExternalLink, ArrowLeft } from 'lucide-react'

interface UpgradePageProps {
  academyId?: string
  onNavigateToOrderSummary?: (plan: {
    name: string
    price: string
    description: string
    features: string[]
    additionalCosts?: string[]
  }) => void
}

// Map plan names to tier codes
const PLAN_TIER_MAP: Record<string, string> = {
  'Individual': 'individual',
  '개인': 'individual',
  'Small Academies': 'basic',
  '소규모 학원': 'basic',
  'Mid-Sized Academies': 'pro',
  '중형 학원': 'pro',
  'Large-Sized Academies': 'enterprise',
  '대형 학원': 'enterprise',
}

// Map prices to monthly amounts (in KRW)
const PLAN_PRICE_MAP: Record<string, number> = {
  '₩24,900': 24900,
  '₩249,000': 249000,
  '₩399,000': 399000,
  '₩699,000': 699000,
}

export function UpgradePage({ onNavigateToOrderSummary, academyId }: UpgradePageProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const { toast } = useToast()
  const [subscribing, setSubscribing] = useState<string | null>(null)
  const [billingCycle] = useState<'monthly' | 'yearly'>('monthly') // Default to monthly
  const [currentTier, setCurrentTier] = useState<SubscriptionTier>('free')
  const [currentPrice, setCurrentPrice] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  // iOS platform detection - subscription upgrade not available on iOS
  const [isIOS, setIsIOS] = useState(false)
  useEffect(() => {
    setIsIOS(isIOSApp())
  }, [])

  // Price hierarchy for comparison
  const priceHierarchy: Record<string, number> = {
    '₩0': 0,
    '₩24,900': 24900,
    '₩249,000': 249000,
    '₩399,000': 399000,
    '₩699,000': 699000,
  }

  // Map tier to price
  const tierToPriceMap: Record<SubscriptionTier, number> = {
    free: 0,
    individual: 24900,
    basic: 249000,
    pro: 399000,
    enterprise: 699000,
  }

  // Fetch current subscription
  useEffect(() => {
    const fetchCurrentSubscription = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setLoading(false)
          return
        }

        const response = await fetch('/api/subscription/status', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })

        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data.subscription) {
            const tier = result.data.subscription.planTier
            setCurrentTier(tier)
            setCurrentPrice(tierToPriceMap[tier])
          }
        }
      } catch (error) {
        console.error('Error fetching subscription:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCurrentSubscription()
  }, [])

  // Helper to get button text and state based on price
  const getButtonConfig = (planPrice: string) => {
    const currentAmount = currentPrice
    const planAmount = priceHierarchy[planPrice] || 0

    if (currentAmount === planAmount) {
      return {
        text: '현재 플랜',
        disabled: true,
        variant: 'outline' as const,
      }
    } else if (planAmount < currentAmount) {
      return {
        text: '다운그레이드',
        disabled: false,
        variant: 'outline' as const,
      }
    } else {
      return {
        text: String(t('upgrade.upgradeButton')),
        disabled: false,
        variant: 'default' as const,
      }
    }
  }

  const handleUpgradeClick = async (planName: string, price: string, description: string, features: string[], additionalCosts?: string[]) => {
    // Store plan data in sessionStorage and navigate to order summary
    const planData = {
      name: planName,
      price: price,
      description: description,
      features: features,
      additionalCosts: additionalCosts
    }

    sessionStorage.setItem('selectedPlan', JSON.stringify(planData))
    router.push('/order-summary')

    if (onNavigateToOrderSummary) {
      onNavigateToOrderSummary(planData)
    }
    return

    // Use PortOne billing key for subscription
    setSubscribing(planName)

    try {
      // Get plan tier and price
      const planTier = PLAN_TIER_MAP[planName] || 'basic'
      const monthlyAmount = PLAN_PRICE_MAP[price]

      if (!monthlyAmount) {
        toast({
          title: 'Error',
          description: 'Invalid plan price',
          variant: 'destructive',
        })
        return
      }

      // Get user data for billing key
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast({
          title: 'Authentication Error',
          description: 'Please sign in to continue',
          variant: 'destructive',
        })
        return
      }

      const { data: userData } = await supabase
        .from('users')
        .select('name')
        .eq('id', user.id)
        .single()

      const { data: managerData } = await supabase
        .from('managers')
        .select('phone')
        .eq('user_id', user.id)
        .single()

      if (!managerData?.phone) {
        toast({
          title: '휴대폰 번호 필요',
          description: '결제를 진행하기 위해 휴대폰 번호가 필요합니다.',
          variant: 'destructive',
        })
        return
      }

      // Get PortOne configuration
      const config = getPortOneConfig()

      // Generate unique issue ID
      const issueId = `SUBSCRIBE_${Date.now()}`

      // Request billing key issuance
      const response = await PortOne.requestIssueBillingKey({
        storeId: config.storeId,
        channelKey: config.billingChannelKey, // Uses billing channel for subscriptions
        billingKeyMethod: 'CARD',
        issueId: issueId,
        issueName: '정기결제 카드 등록',
        customer: {
          customerId: `academy_${academyId || Date.now()}`,
          email: user.email || '',
          phoneNumber: managerData.phone,
          fullName: userData?.name || '',
        },
      })

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

      // Send billing key to server
      const subscribeResponse = await fetch('/api/subscription/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          billingKey,
          planTier,
          billingCycle,
          makeInitialPayment: true, // Charge immediately
        }),
      })

      const subscribeData = await subscribeResponse.json()

      if (subscribeData.success) {
        toast({
          title: 'Subscription Complete',
          description: `Successfully subscribed to ${planName}`,
        })

        // Redirect to dashboard or subscription status page
        router.push('/dashboard')
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
      setSubscribing(null)
    }
  }

  // Show loading skeleton while fetching subscription
  if (loading) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('upgrade.title')}</h1>
            <p className="text-gray-500">{t('upgrade.subtitle')}</p>
          </div>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-6 flex flex-col h-full">
              <div className="text-center mb-6">
                <div className="h-7 bg-gray-200 rounded w-3/4 mx-auto mb-2 animate-pulse" />
                <div className="h-10 bg-gray-200 rounded w-full mb-1 animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-2/3 mx-auto animate-pulse" />
              </div>
              <div className="space-y-3 mb-8 flex-grow">
                {[1, 2, 3, 4, 5].map((j) => (
                  <div key={j} className="h-4 bg-gray-200 rounded w-full animate-pulse" />
                ))}
              </div>
              <div className="h-10 bg-gray-200 rounded w-full animate-pulse" />
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // On iOS, subscription upgrade is not available - show message to use web version
  if (isIOS) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('upgrade.title')}</h1>
            <p className="text-gray-500">{t('upgrade.subtitle')}</p>
          </div>
        </div>

        <Card className="p-8 text-center max-w-md mx-auto">
          <div className="mb-4">
            <ExternalLink className="w-12 h-12 text-gray-400 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {t('upgrade.iosNotAvailable') || '앱에서는 구독 결제가 지원되지 않습니다'}
          </h2>
          <p className="text-gray-600 mb-6">
            {t('upgrade.iosNotAvailableDescription') || '플랜 업그레이드는 웹 브라우저(app.classraum.com)에서 진행해 주세요.'}
          </p>
          <Button onClick={() => router.push('/dashboard')} variant="outline" className="flex items-center gap-2 mx-auto">
            <ArrowLeft className="w-4 h-4" />
            {t('upgrade.backToDashboard') || '대시보드로 돌아가기'}
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('upgrade.title')}</h1>
          <p className="text-gray-500">{t('upgrade.subtitle')}</p>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {/* Individual Plan */}
        <Card className="p-6 hover:shadow-lg transition-all duration-300 flex flex-col h-full">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">{t('upgrade.plans.individual.name')}</h3>
            <div className="text-3xl font-bold text-gray-900 mb-1">₩24,900<span className="text-sm text-gray-600">{t('upgrade.perMonth')}</span></div>
            <p className="text-gray-600 text-sm">{t('upgrade.plans.individual.description')}</p>
          </div>
          
          <ul className="space-y-3 mb-8 flex-grow">
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">{t('upgrade.plans.individual.features.users')}</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">{t('upgrade.plans.individual.features.storage')}</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">{t('upgrade.plans.individual.features.access')}</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">{t('upgrade.plans.individual.features.contacts')}</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">{t('upgrade.plans.individual.features.sessions')}</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">{t('upgrade.plans.individual.features.support')}</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">{t('upgrade.plans.individual.features.security')}</span>
            </li>
          </ul>
          
          <div className="text-center mb-4">
            <p className="text-xs text-gray-500">{t('upgrade.plans.individual.additionalCosts.users')}</p>
            <p className="text-xs text-gray-500">{t('upgrade.plans.individual.additionalCosts.storage')}</p>
          </div>
          
          <Button
            onClick={() => handleUpgradeClick(
              String(t('upgrade.plans.individual.name')),
              '₩24,900',
              String(t('upgrade.plans.individual.description')),
              [
                String(t('upgrade.plans.individual.features.users')),
                String(t('upgrade.plans.individual.features.storage')),
                String(t('upgrade.plans.individual.features.access')),
                String(t('upgrade.plans.individual.features.contacts')),
                String(t('upgrade.plans.individual.features.sessions')),
                String(t('upgrade.plans.individual.features.support')),
                String(t('upgrade.plans.individual.features.security'))
              ],
              [String(t('upgrade.plans.individual.additionalCosts.users')), String(t('upgrade.plans.individual.additionalCosts.storage'))]
            )}
            disabled={subscribing !== null || getButtonConfig('₩24,900').disabled}
            variant={getButtonConfig('₩24,900').variant}
            className="w-full text-sm hover:scale-105 transition-transform duration-200"
          >
            {subscribing === String(t('upgrade.plans.individual.name')) ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              getButtonConfig('₩24,900').text
            )}
          </Button>
        </Card>

        {/* Small Academy Plan */}
        <Card className="p-6 hover:shadow-lg transition-all duration-300 flex flex-col h-full">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">{t('upgrade.plans.small.name')}</h3>
            <div className="text-3xl font-bold text-gray-900 mb-1">₩249,000<span className="text-sm text-gray-600">{t('upgrade.perMonth')}</span></div>
            <p className="text-gray-600 text-sm">{t('upgrade.plans.small.description')}</p>
          </div>
          
          <ul className="space-y-3 mb-8 flex-grow">
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">{t('upgrade.plans.small.features.users')}</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">{t('upgrade.plans.small.features.storage')}</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">{t('upgrade.plans.small.features.reportCards')}</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">{t('upgrade.plans.small.features.access')}</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">{t('upgrade.plans.small.features.management')}</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">{t('upgrade.plans.small.features.support')}</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">{t('upgrade.plans.small.features.reports')}</span>
            </li>
          </ul>
          
          <div className="text-center mb-4">
            <p className="text-xs text-gray-500">{t('upgrade.plans.small.additionalCosts.users')}</p>
            <p className="text-xs text-gray-500">{t('upgrade.plans.small.additionalCosts.storage')}</p>
          </div>
          
          <Button
            onClick={() => handleUpgradeClick(
              String(t('upgrade.plans.small.name')),
              '₩249,000',
              String(t('upgrade.plans.small.description')),
              [
                String(t('upgrade.plans.small.features.users')),
                String(t('upgrade.plans.small.features.storage')),
                String(t('upgrade.plans.small.features.reportCards')),
                String(t('upgrade.plans.small.features.access')),
                String(t('upgrade.plans.small.features.management')),
                String(t('upgrade.plans.small.features.support')),
                String(t('upgrade.plans.small.features.reports'))
              ],
              [String(t('upgrade.plans.small.additionalCosts.users')), String(t('upgrade.plans.small.additionalCosts.storage'))]
            )}
            disabled={subscribing !== null || getButtonConfig('₩249,000').disabled}
            variant={getButtonConfig('₩249,000').variant}
            className="w-full text-sm hover:scale-105 transition-transform duration-200"
          >
            {subscribing === String(t('upgrade.plans.small.name')) ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              getButtonConfig('₩249,000').text
            )}
          </Button>
        </Card>

        {/* Medium Academy Plan - Most Popular */}
        <Card className="p-6 border-2 border-primary hover:shadow-lg transition-all duration-300 relative flex flex-col h-full">
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <span className="bg-primary text-white px-3 py-1 rounded-full text-xs font-medium">{t('upgrade.mostPopular')}</span>
          </div>
          
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">{t('upgrade.plans.medium.name')}</h3>
            <div className="text-3xl font-bold text-gray-900 mb-1">₩399,000<span className="text-sm text-gray-600">{t('upgrade.perMonth')}</span></div>
            <p className="text-gray-600 text-sm">{t('upgrade.plans.medium.description')}</p>
          </div>
          
          <ul className="space-y-3 mb-8 flex-grow">
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">{t('upgrade.plans.medium.features.users')}</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">{t('upgrade.plans.medium.features.storage')}</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">{t('upgrade.plans.medium.features.aiReports')}</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">{t('upgrade.plans.medium.features.customization')}</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">{t('upgrade.plans.medium.features.consulting')}</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">{t('upgrade.plans.medium.features.allFeatures')}</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">{t('upgrade.plans.medium.features.support')}</span>
            </li>
          </ul>
          
          <div className="text-center mb-4">
            <p className="text-xs text-gray-500">{t('upgrade.plans.medium.additionalCosts.users')}</p>
            <p className="text-xs text-gray-500">{t('upgrade.plans.medium.additionalCosts.storage')}</p>
          </div>
          
          <Button
            onClick={() => handleUpgradeClick(
              String(t('upgrade.plans.medium.name')),
              '₩399,000',
              String(t('upgrade.plans.medium.description')),
              [
                String(t('upgrade.plans.medium.features.users')),
                String(t('upgrade.plans.medium.features.storage')),
                String(t('upgrade.plans.medium.features.aiReports')),
                String(t('upgrade.plans.medium.features.customization')),
                String(t('upgrade.plans.medium.features.consulting')),
                String(t('upgrade.plans.medium.features.allFeatures')),
                String(t('upgrade.plans.medium.features.support'))
              ],
              [String(t('upgrade.plans.medium.additionalCosts.users')), String(t('upgrade.plans.medium.additionalCosts.storage'))]
            )}
            disabled={subscribing !== null || getButtonConfig('₩399,000').disabled}
            variant={getButtonConfig('₩399,000').variant}
            className="w-full text-sm hover:scale-105 transition-transform duration-200"
          >
            {subscribing === String(t('upgrade.plans.medium.name')) ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              getButtonConfig('₩399,000').text
            )}
          </Button>
        </Card>

        {/* Large Academy Plan */}
        <Card className="p-6 hover:shadow-lg transition-all duration-300 flex flex-col h-full">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">{t('upgrade.plans.large.name')}</h3>
            <div className="text-3xl font-bold text-gray-900 mb-1">₩699,000<span className="text-sm text-gray-600">{t('upgrade.perMonth')}</span></div>
            <p className="text-gray-600 text-sm">{t('upgrade.plans.large.description')}</p>
          </div>
          
          <ul className="space-y-3 mb-8 flex-grow">
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">{t('upgrade.plans.large.features.users')}</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">{t('upgrade.plans.large.features.storage')}</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">{t('upgrade.plans.large.features.aiReports')}</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">{t('upgrade.plans.large.features.aiAdvanced')}</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">{t('upgrade.plans.large.features.consulting')}</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">{t('upgrade.plans.large.features.enterprise')}</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">{t('upgrade.plans.large.features.multiLocation')}</span>
            </li>
          </ul>
          
          <div className="text-center mb-4">
            <p className="text-xs text-gray-500">{t('upgrade.plans.large.additionalCosts.users')}</p>
            <p className="text-xs text-gray-500">{t('upgrade.plans.large.additionalCosts.storage')}</p>
            <p className="text-xs text-gray-500">{t('upgrade.plans.large.additionalCosts.aiCards')}</p>
          </div>
          
          <Button
            onClick={() => handleUpgradeClick(
              String(t('upgrade.plans.large.name')),
              '₩699,000',
              String(t('upgrade.plans.large.description')),
              [
                String(t('upgrade.plans.large.features.users')),
                String(t('upgrade.plans.large.features.storage')),
                String(t('upgrade.plans.large.features.aiReports')),
                String(t('upgrade.plans.large.features.aiAdvanced')),
                String(t('upgrade.plans.large.features.consulting')),
                String(t('upgrade.plans.large.features.enterprise')),
                String(t('upgrade.plans.large.features.multiLocation'))
              ],
              [String(t('upgrade.plans.large.additionalCosts.users')), String(t('upgrade.plans.large.additionalCosts.storage')), String(t('upgrade.plans.large.additionalCosts.aiCards'))]
            )}
            disabled={subscribing !== null || getButtonConfig('₩699,000').disabled}
            variant={getButtonConfig('₩699,000').variant}
            className="w-full text-sm hover:scale-105 transition-transform duration-200"
          >
            {subscribing === String(t('upgrade.plans.large.name')) ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              getButtonConfig('₩699,000').text
            )}
          </Button>
        </Card>
      </div>

    </div>
  )
}