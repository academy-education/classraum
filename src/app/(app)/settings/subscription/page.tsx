"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Loader2, CreditCard, Calendar, TrendingUp, AlertCircle, CheckCircle2, Plus, Minus } from 'lucide-react'
import { UsageProgressBar } from '@/components/ui/usage-progress-bar'
import * as PortOne from '@portone/browser-sdk/v2'
import { getPortOneConfig } from '@/lib/portone-config'
import { supabase } from '@/lib/supabase'
import { simpleTabDetection } from '@/utils/simpleTabDetection'
import { getAddonIncrement, formatAddonPricing, calculateAddonCost } from '@/lib/addon-config'
import { SubscriptionTier, SUBSCRIPTION_PLANS } from '@/types/subscription'
import { isIOSApp } from '@/lib/nativeApp'

interface SubscriptionData {
  subscription: {
    id: string
    planTier: string
    status: string
    currentPeriodEnd: string
    nextBillingDate?: string
    monthlyAmount: number
    billingCycle: string
    autoRenew: boolean
    totalUserLimit: number
    storageLimitGb: number
    pendingTier?: string | null
    pendingMonthlyAmount?: number | null
    pendingChangeEffectiveDate?: string | null
  } | null
  usage: {
    currentStudentCount: number
    currentTeacherCount: number
    currentStorageGb: number
    currentClassroomCount: number
  }
  limits: {
    isValid: boolean
    exceededLimits: string[]
    limits: {
      totalUserLimit: number
      storageGb: number
      classroomLimit: number
    }
  }
  daysRemaining: number
}

interface AddonData {
  current: {
    students: number
    teachers: number
    storageGb: number
    cost: number
  }
  pending: {
    students: number
    teachers: number
    storageGb: number
    cost: number
    effectiveDate: string
  } | null
}

export default function SubscriptionManagementPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<SubscriptionData | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [updatingPayment, setUpdatingPayment] = useState(false)

  // Add-on related state
  const [addonData, setAddonData] = useState<AddonData | null>(null)
  const [selectedAddons, setSelectedAddons] = useState({
    students: 0,
    teachers: 0,
    storageGb: 0,
  })
  const [showAddonConfirmation, setShowAddonConfirmation] = useState(false)
  const [purchasingAddons, setPurchasingAddons] = useState(false)

  // iOS platform detection - hide payment UI on iOS to comply with App Store guidelines
  const [isIOS, setIsIOS] = useState(false)
  useEffect(() => {
    setIsIOS(isIOSApp())
  }, [])

  useEffect(() => {
    const loadData = async () => {
      // Only show loading on initial load and navigation, not on true tab return
      if (!simpleTabDetection.isTrueTabReturn()) {
        setLoading(true)
      }
      await Promise.all([fetchSubscriptionData(), fetchAddonData()])
    }
    loadData()
  }, [])

  const fetchSubscriptionData = async () => {
    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        toast({
          title: String(t('subscription.toast.authError')),
          description: String(t('subscription.toast.authErrorMessage')),
          variant: 'destructive',
        })
        router.push('/auth')
        return
      }

      const response = await fetch('/api/subscription/status', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })
      const result = await response.json()

      if (result.success) {
        setData(result.data)
      } else {
        toast({
          title: String(t('subscription.toast.error')),
          description: result.message || String(t('subscription.toast.loadError')),
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error fetching subscription data:', error)
      toast({
        title: String(t('subscription.toast.error')),
        description: String(t('subscription.toast.loadError')),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchAddonData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch('/api/subscription/add-ons', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setAddonData(result.data)
        }
      }
    } catch (error) {
      console.error('Error fetching add-on data:', error)
    }
  }

  const handleCancelSubscription = async () => {
    if (!confirm(String(t('subscription.confirmCancel')))) {
      return
    }

    setCancelling(true)
    try {
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: String(t('subscription.toast.cancelSuccess')),
          description: result.message,
        })
        await fetchSubscriptionData()
      } else {
        toast({
          title: String(t('subscription.toast.cancelError')),
          description: result.message || String(t('subscription.toast.cancelErrorMessage')),
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error)
      toast({
        title: String(t('subscription.toast.error')),
        description: String(t('subscription.toast.cancelErrorMessage')),
        variant: 'destructive',
      })
    } finally {
      setCancelling(false)
    }
  }

  const handleUpdatePaymentMethod = async () => {
    setUpdatingPayment(true)
    try {
      // Get current user info for customer details
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast({
          title: String(t('subscription.toast.authError')),
          description: String(t('subscription.toast.authErrorMessage')),
          variant: 'destructive',
        })
        setUpdatingPayment(false)
        return
      }

      // Get user's name and phone from database
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
          title: String(t('subscription.toast.phoneRequired')),
          description: String(t('subscription.toast.phoneRequiredMessage')),
          variant: 'destructive',
        })
        setUpdatingPayment(false)
        return
      }

      const config = getPortOneConfig()

      // Request new billing key issuance
      const issueId = `BILLING_${Date.now()}`
      const response = await PortOne.requestIssueBillingKey({
        storeId: config.storeId,
        channelKey: config.billingChannelKey,
        billingKeyMethod: 'CARD',
        issueId: issueId,
        issueName: '정기결제 카드 등록',
        redirectUrl: `${window.location.origin}/settings/subscription`,
        offerPeriod: {
          interval: '1m'
        },
        customer: {
          customerId: `academy_${Date.now()}`,
          email: user.email || '',
          phoneNumber: managerData.phone,
          fullName: userData?.name || '',
        },
      })

      // Check for cancellation first (empty object or cancel code)
      if (!response || Object.keys(response).length === 0 || response.code === 'PORTONE_USER_CANCEL') {
        console.log('User cancelled billing key issuance')
        return
      }

      // Check for other errors
      if (response?.code != null) {
        console.error('Billing key issuance failed:', response)
        toast({
          title: String(t('subscription.toast.paymentUpdateError')),
          description: response.message || String(t('subscription.toast.paymentUpdateErrorMessage')),
          variant: 'destructive',
        })
        return
      }

      // Get session for authentication
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        toast({
          title: String(t('subscription.toast.authError')),
          description: String(t('subscription.toast.authErrorMessage')),
          variant: 'destructive',
        })
        return
      }

      // Send new billing key to server
      const updateResponse = await fetch('/api/subscription/update-payment-method', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          billingKey: response.billingKey,
        }),
      })

      const updateResult = await updateResponse.json()

      if (updateResult.success) {
        toast({
          title: String(t('subscription.toast.paymentUpdateSuccess')),
          description: String(t('subscription.toast.paymentUpdateSuccessMessage')),
        })
        await fetchSubscriptionData()
      } else {
        toast({
          title: String(t('subscription.toast.paymentUpdateError')),
          description: updateResult.message || String(t('subscription.toast.paymentUpdateErrorMessage')),
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error updating payment method:', error)
      toast({
        title: String(t('subscription.toast.error')),
        description: String(t('subscription.toast.paymentUpdateErrorMessage')),
        variant: 'destructive',
      })
    } finally {
      setUpdatingPayment(false)
    }
  }

  const handleAddonChange = (type: 'students' | 'teachers' | 'storageGb', delta: number) => {
    if (!data?.subscription) return

    const tier = data.subscription.planTier as SubscriptionTier
    const increment = type === 'storageGb'
      ? getAddonIncrement(tier, 'storage')
      : getAddonIncrement(tier, 'users')

    // Allow negative values for reductions
    setSelectedAddons(prev => ({
      ...prev,
      [type]: prev[type] + (delta * increment)
    }))
  }

  const handlePurchaseAddons = async () => {
    if (!data?.subscription) return

    // Check if any changes are selected (positive or negative)
    const hasChanges = selectedAddons.students !== 0 || selectedAddons.teachers !== 0 || selectedAddons.storageGb !== 0

    if (!hasChanges) {
      toast({
        title: String(t('subscription.toast.noChangesSelected')),
        description: String(t('subscription.toast.noChangesSelectedMessage')),
        variant: 'destructive',
      })
      return
    }

    setPurchasingAddons(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        toast({
          title: String(t('subscription.toast.authError')),
          description: String(t('subscription.toast.authErrorMessage')),
          variant: 'destructive',
        })
        return
      }

      // Send add-on changes (can be positive or negative)
      const response = await fetch('/api/subscription/add-ons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          additionalStudents: selectedAddons.students,
          additionalTeachers: selectedAddons.teachers,
          additionalStorageGb: selectedAddons.storageGb,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: String(t('subscription.toast.changesAppliedSuccess')),
          description: String(t('subscription.toast.changesAppliedSuccessMessage')).replace('{amount}', formatPrice(result.data.newMonthlyAmount)),
        })

        // Reset selected addons
        setSelectedAddons({ students: 0, teachers: 0, storageGb: 0 })

        // Refresh data
        await Promise.all([fetchSubscriptionData(), fetchAddonData()])
      } else {
        toast({
          title: String(t('subscription.toast.changesAppliedError')),
          description: result.error || String(t('subscription.toast.changesAppliedErrorMessage')),
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error applying changes:', error)
      toast({
        title: String(t('subscription.toast.error')),
        description: String(t('subscription.toast.changesAppliedErrorMessage')),
        variant: 'destructive',
      })
    } finally {
      setPurchasingAddons(false)
    }
  }

  const handleCancelAddons = async () => {
    if (!data?.subscription) return

    const confirmed = window.confirm(String(t('subscription.confirmCancel')))
    if (!confirmed) return

    setPurchasingAddons(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        toast({
          title: String(t('subscription.toast.authError')),
          description: String(t('subscription.toast.authErrorMessage')),
          variant: 'destructive',
        })
        return
      }

      const response = await fetch('/api/subscription/add-ons', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: String(t('subscription.toast.addonCancelSuccess')),
          description: String(t('subscription.toast.addonCancelSuccessMessage')),
        })

        // Refresh data
        await Promise.all([fetchSubscriptionData(), fetchAddonData()])
      } else {
        toast({
          title: String(t('subscription.toast.addonCancelError')),
          description: result.error || String(t('subscription.toast.addonCancelErrorMessage')),
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error canceling addons:', error)
      toast({
        title: String(t('subscription.toast.error')),
        description: String(t('subscription.toast.addonCancelErrorMessage')),
        variant: 'destructive',
      })
    } finally {
      setPurchasingAddons(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
    }).format(price)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getPlanName = (tier: string) => {
    const key = `subscription.planNames.${tier}` as const
    return String(t(key))
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { className: string }> = {
      active: { className: 'bg-green-100 text-green-800' },
      past_due: { className: 'bg-red-100 text-red-800' },
      canceled: { className: 'bg-gray-100 text-gray-800' },
      trialing: { className: 'bg-blue-100 text-blue-800' },
    }
    const badge = badges[status] || { className: 'bg-gray-100 text-gray-800' }
    const key = `subscription.status.${status}` as const
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
        {String(t(key))}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('subscription.title')}</h1>
            <p className="text-gray-500">{t('subscription.subtitle')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4">
            <Card className="p-4 sm:p-6">
              <div className="space-y-4">
                <div className="h-6 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                <div className="space-y-3 pt-4">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
                  ))}
                </div>
                <div className="space-y-2 pt-4">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-10 bg-gray-200 rounded animate-pulse"></div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
          <div className="lg:col-span-8">
            <Card className="p-4 sm:p-6">
              <div className="space-y-4">
                <div className="h-6 bg-gray-200 rounded w-1/4 animate-pulse"></div>
                <div className="space-y-6">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse"></div>
                      <div className="h-3 bg-gray-200 rounded w-full animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">{t('subscription.noDataError')}</h2>
          <Button onClick={fetchSubscriptionData}>{t('subscription.retry')}</Button>
        </div>
      </div>
    )
  }

  const { subscription, usage, limits } = data
  const hasExceededLimits = limits.exceededLimits.length > 0
  const totalUserCount = usage.currentStudentCount + usage.currentTeacherCount
  const totalUserLimit = subscription?.totalUserLimit || 22

  // No pending system - changes are immediate
  // Calculate preview limits (what limits will be after applying current selection)
  const previewTotalUserLimit = totalUserLimit + selectedAddons.students + selectedAddons.teachers
  const previewStorageLimit = (subscription?.storageLimitGb || 0) + selectedAddons.storageGb
  const hasSelectedAddons = selectedAddons.students !== 0 || selectedAddons.teachers !== 0 || selectedAddons.storageGb !== 0

  // Get base plan limits and increments for validation
  const tier = subscription?.planTier as SubscriptionTier
  const basePlan = SUBSCRIPTION_PLANS[tier]
  const baseTotalUserLimit = basePlan?.limits.totalUserLimit || 0
  const baseStorageLimit = basePlan?.limits.storageGb || 0
  const userIncrement = tier ? getAddonIncrement(tier, 'users') : 1
  const storageIncrement = tier ? getAddonIncrement(tier, 'storage') : 1

  // Calculate minimum allowed limits (can't go below current usage or base plan)
  const minAllowedUserLimit = Math.max(totalUserCount, baseTotalUserLimit)
  const minAllowedStorageLimit = Math.max(usage.currentStorageGb, baseStorageLimit)

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('subscription.title')}</h1>
          <p className="text-gray-500">{t('subscription.subtitle')}</p>
        </div>
      </div>

      {/* Exceeded Limits Warning */}
      {hasExceededLimits && (
        <div className="mb-6 p-4 border border-red-200 rounded-lg bg-red-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 mb-1">{t('subscription.limitExceeded')}</h3>
              <p className="text-sm text-red-700 mb-2">
                {String(t('subscription.limitExceededMessage')).replace('{limits}', limits.exceededLimits.join(', '))}
              </p>
              {/* Hide upgrade button on iOS to comply with App Store guidelines */}
              {!isIOS && (
                <Button
                  size="sm"
                  onClick={() => router.push('/upgrade')}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {t('subscription.upgradePlanAction')}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Subscription Info */}
        <div className="lg:col-span-4">
          <Card className="p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('subscription.currentPlan')}</h2>

            {subscription ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl font-bold text-gray-900">{getPlanName(subscription.planTier)}</span>
                    {getStatusBadge(subscription.status)}
                  </div>
                  <p className="text-gray-600">
                    {formatPrice(subscription.monthlyAmount)} / {subscription.billingCycle === 'monthly' ? t('subscription.month') : t('subscription.year')}
                  </p>
                </div>

                {subscription.planTier !== 'free' && (
                  <div className="space-y-3 pt-4 border-t border-gray-200">
                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{t('subscription.nextBillingDate')}</p>
                        <p className="text-sm text-gray-600">
                          {subscription.nextBillingDate
                            ? formatDate(subscription.nextBillingDate)
                            : String(t('subscription.notApplicable'))}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{t('subscription.currentPeriodEnd')}</p>
                        <p className="text-sm text-gray-600">{formatDate(subscription.currentPeriodEnd)}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {data.daysRemaining} {t('subscription.daysRemaining')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{t('subscription.autoRenew')}</p>
                        <p className="text-sm text-gray-600">
                          {subscription.autoRenew ? String(t('subscription.enabled')) : String(t('subscription.disabled'))}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Show scheduled downgrade notice */}
                {subscription && subscription.pendingTier && subscription.pendingChangeEffectiveDate && (
                  <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-amber-900 mb-1">
                          {t('subscription.pendingChange')}
                        </p>
                        <p className="text-sm text-amber-800 mb-2">
                          {String(t('subscription.pendingChangeMessage'))
                            .replace('{date}', formatDate(subscription.pendingChangeEffectiveDate))
                            .replace('{planName}', getPlanName(subscription.pendingTier))}
                        </p>
                        {subscription.pendingMonthlyAmount !== null && (
                          <div className="mt-2 pt-2 border-t border-amber-200">
                            <p className="text-sm text-amber-800">
                              <span className="text-amber-600">{t('subscription.currentAmount')}: </span>
                              <span className="line-through">{formatPrice(subscription.monthlyAmount)}</span>
                              <span className="mx-2">→</span>
                              <span className="font-semibold text-amber-900">{formatPrice(subscription.pendingMonthlyAmount)}</span>
                            </p>
                          </div>
                        )}
                        <p className="text-xs text-amber-700 mt-2">
                          {t('subscription.pendingChangeNote')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}


                <div className="space-y-2 pt-4 border-t border-gray-200">
                  {/* Hide payment-related buttons on iOS to comply with App Store guidelines */}
                  {!isIOS && (
                    <>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleUpdatePaymentMethod}
                        disabled={updatingPayment}
                      >
                        {updatingPayment ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            {t('subscription.updating')}
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4 mr-2" />
                            {t('subscription.changePaymentMethod')}
                          </>
                        )}
                      </Button>

                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => router.push('/upgrade')}
                      >
                        <TrendingUp className="w-4 h-4 mr-2" />
                        {t('subscription.upgradePlan')}
                      </Button>
                    </>
                  )}

                  {subscription.autoRenew && subscription.planTier !== 'free' && (
                    <Button
                      variant="outline"
                      className="w-full text-red-600 hover:text-red-600 hover:bg-red-50 hover:border-red-300"
                      onClick={handleCancelSubscription}
                      disabled={cancelling}
                    >
                      {cancelling ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {t('subscription.canceling')}
                        </>
                      ) : (
                        String(t('subscription.cancelSubscription'))
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">{t('subscription.noActiveSubscription')}</p>
                <Button onClick={() => router.push('/upgrade')}>
                  {t('subscription.choosePlan')}
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column - Usage Stats */}
        <div className="lg:col-span-8">
          <Card className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">{t('subscription.usageStatus')}</h2>
            </div>


            <div className="space-y-6">
              {/* Storage Usage with Add-on Controls */}
              <div>
                <UsageProgressBar
                  label={String(t('subscription.storage'))}
                  current={usage.currentStorageGb}
                  limit={subscription?.storageLimitGb || 1}
                  newLimit={hasSelectedAddons && selectedAddons.storageGb !== 0 ? previewStorageLimit : undefined}
                  unit="GB"
                  formatValue={(val) => val.toFixed(2)}
                />
                {/* Hide add-on controls on iOS to comply with App Store guidelines */}
                {!isIOS && subscription && subscription.planTier !== 'enterprise' && (
                  <div className="mt-3 space-y-2">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAddonChange('storageGb', -1)}
                          disabled={previewStorageLimit - storageIncrement < minAllowedStorageLimit}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <div className="flex flex-col items-center min-w-[120px]">
                          <span className="text-xs font-medium text-gray-500">
                            {subscription.storageLimitGb}GB → {previewStorageLimit}GB
                          </span>
                          <span className={`text-sm font-bold ${selectedAddons.storageGb >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                            {selectedAddons.storageGb >= 0 ? '+' : ''}{selectedAddons.storageGb}GB
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAddonChange('storageGb', 1)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500 text-center sm:text-right">
                        {formatAddonPricing(subscription.planTier as SubscriptionTier, 'ko')?.storage}
                      </p>
                    </div>
                    {selectedAddons.storageGb !== 0 && (
                      <p className="text-xs text-gray-500 text-center">
                        {selectedAddons.storageGb > 0
                          ? t('subscription.addingCapacity')
                          : t('subscription.reducingCapacity')}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Total Users Usage with Add-on Controls */}
              <div>
                <UsageProgressBar
                  label={String(t('subscription.totalUsers'))}
                  current={totalUserCount}
                  limit={totalUserLimit}
                  newLimit={hasSelectedAddons && (selectedAddons.students !== 0 || selectedAddons.teachers !== 0) ? previewTotalUserLimit : undefined}
                  unit=""
                />
                {/* Hide add-on controls on iOS to comply with App Store guidelines */}
                {!isIOS && subscription && subscription.planTier !== 'enterprise' && (
                  <div className="mt-3 space-y-2">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            // Decrement total users (using students field to represent total users)
                            handleAddonChange('students', -1)
                          }}
                          disabled={previewTotalUserLimit - userIncrement < minAllowedUserLimit}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <div className="flex flex-col items-center min-w-[120px]">
                          <span className="text-xs font-medium text-gray-500">
                            {totalUserLimit} → {previewTotalUserLimit} {t('subscription.users')}
                          </span>
                          <span className={`text-sm font-bold ${selectedAddons.students >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                            {selectedAddons.students >= 0 ? '+' : ''}{selectedAddons.students} {t('subscription.users')}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            // Increment total users (using students field to represent total users)
                            handleAddonChange('students', 1)
                          }}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500 text-center sm:text-right">
                        {formatAddonPricing(subscription.planTier as SubscriptionTier, 'ko')?.users}
                      </p>
                    </div>
                    {selectedAddons.students !== 0 && (
                      <p className="text-xs text-gray-500 text-center">
                        {selectedAddons.students > 0
                          ? t('subscription.addingCapacity')
                          : t('subscription.reducingCapacity')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Purchase Add-ons Button - Hidden on iOS to comply with App Store guidelines */}
            {!isIOS && subscription && subscription.planTier !== 'enterprise' && hasSelectedAddons && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>{t('subscription.currentAmount')}</span>
                      <span>{formatPrice(subscription.monthlyAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>{t('subscription.additionalCost')}</span>
                      <span className="text-blue-600 font-medium">
                        +{formatPrice(
                          calculateAddonCost(
                            subscription.planTier as SubscriptionTier,
                            selectedAddons.students,
                            selectedAddons.teachers,
                            selectedAddons.storageGb
                          )
                        )}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-gray-300 flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-900">{t('subscription.newMonthlyAmount')}</span>
                      <span className="text-lg font-bold text-gray-900">
                        {formatPrice(
                          subscription.monthlyAmount + calculateAddonCost(
                            subscription.planTier as SubscriptionTier,
                            selectedAddons.students,
                            selectedAddons.teachers,
                            selectedAddons.storageGb
                          )
                        )}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mt-3">
                    {t('subscription.effectiveImmediately')}
                  </p>
                </div>
                <Button
                  className="w-full"
                  onClick={handlePurchaseAddons}
                  disabled={purchasingAddons}
                >
                  {purchasingAddons ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('subscription.applying')}
                    </>
                  ) : (
                    t('subscription.applyChanges')
                  )}
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
