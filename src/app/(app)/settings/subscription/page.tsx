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
import { SubscriptionTier } from '@/types/subscription'

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
    studentLimit: number
    teacherLimit: number
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
      studentLimit: number
      teacherLimit: number
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
          title: '인증 오류',
          description: '로그인이 필요합니다.',
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
          title: '오류',
          description: result.message || '구독 정보를 불러오는 중 오류가 발생했습니다.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error fetching subscription data:', error)
      toast({
        title: '오류',
        description: '구독 정보를 불러오는 중 오류가 발생했습니다.',
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
    if (!confirm('정말로 구독을 취소하시겠습니까? 현재 결제 기간이 끝날 때까지 서비스를 계속 이용하실 수 있습니다.')) {
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
          title: '구독 취소 완료',
          description: result.message,
        })
        await fetchSubscriptionData()
      } else {
        toast({
          title: '구독 취소 실패',
          description: result.message || '구독 취소 중 오류가 발생했습니다.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error)
      toast({
        title: '오류',
        description: '구독 취소 중 오류가 발생했습니다.',
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
          title: '인증 오류',
          description: '사용자 정보를 가져올 수 없습니다.',
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
          title: '휴대폰 번호 필요',
          description: '결제 수단 변경을 위해 휴대폰 번호가 필요합니다. 설정에서 휴대폰 번호를 등록해주세요.',
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
          title: '결제 수단 업데이트 실패',
          description: response.message || '결제 수단 업데이트 중 오류가 발생했습니다.',
          variant: 'destructive',
        })
        return
      }

      // Get session for authentication
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        toast({
          title: '인증 오류',
          description: '로그인이 필요합니다.',
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
          title: '결제 수단 업데이트 완료',
          description: '결제 수단이 성공적으로 업데이트되었습니다.',
        })
        await fetchSubscriptionData()
      } else {
        toast({
          title: '결제 수단 업데이트 실패',
          description: updateResult.message || '결제 수단 업데이트 중 오류가 발생했습니다.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error updating payment method:', error)
      toast({
        title: '오류',
        description: '결제 수단 업데이트 중 오류가 발생했습니다.',
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

    setSelectedAddons(prev => ({
      ...prev,
      [type]: Math.max(0, prev[type] + (delta * increment))
    }))
  }

  const handlePurchaseAddons = async () => {
    if (!data?.subscription) return

    // Check if any addons are selected
    const hasChanges = selectedAddons.students > 0 || selectedAddons.teachers > 0 || selectedAddons.storageGb > 0

    if (!hasChanges) {
      toast({
        title: '추가 구매 없음',
        description: '추가할 항목을 선택해주세요.',
        variant: 'destructive',
      })
      return
    }

    setPurchasingAddons(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        toast({
          title: '인증 오류',
          description: '로그인이 필요합니다.',
          variant: 'destructive',
        })
        return
      }

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
          title: '추가 구매 완료',
          description: `다음 결제 주기부터 ${formatPrice(result.data.newMonthlyAmount)}가 청구됩니다.`,
        })

        // Reset selected addons and close confirmation
        setSelectedAddons({ students: 0, teachers: 0, storageGb: 0 })
        setShowAddonConfirmation(false)

        // Refresh data
        await Promise.all([fetchSubscriptionData(), fetchAddonData()])
      } else {
        toast({
          title: '추가 구매 실패',
          description: result.error || '추가 구매 중 오류가 발생했습니다.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error purchasing addons:', error)
      toast({
        title: '오류',
        description: '추가 구매 중 오류가 발생했습니다.',
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
    const planNames: Record<string, string> = {
      free: '무료 플랜',
      basic: '소규모 학원',
      pro: '중형 학원',
      enterprise: '대형 학원',
    }
    return planNames[tier] || tier
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      active: { label: '활성', className: 'bg-green-100 text-green-800' },
      past_due: { label: '연체', className: 'bg-red-100 text-red-800' },
      canceled: { label: '취소됨', className: 'bg-gray-100 text-gray-800' },
      trialing: { label: '체험 중', className: 'bg-blue-100 text-blue-800' },
    }
    const badge = badges[status] || { label: status, className: 'bg-gray-100 text-gray-800' }
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
        {badge.label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">구독 관리</h1>
            <p className="text-gray-500">현재 구독 플랜과 사용량을 확인하고 관리하세요.</p>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-4">
            <Card className="p-6">
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
          <div className="col-span-8">
            <Card className="p-6">
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
          <h2 className="text-xl font-semibold mb-2">구독 정보를 불러올 수 없습니다</h2>
          <Button onClick={fetchSubscriptionData}>다시 시도</Button>
        </div>
      </div>
    )
  }

  const { subscription, usage, limits } = data
  const hasExceededLimits = limits.exceededLimits.length > 0

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">구독 관리</h1>
          <p className="text-gray-500">현재 구독 플랜과 사용량을 확인하고 관리하세요.</p>
        </div>
      </div>

      {/* Exceeded Limits Warning */}
      {hasExceededLimits && (
        <div className="mb-6 p-4 border border-red-200 rounded-lg bg-red-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 mb-1">사용량 한도 초과</h3>
              <p className="text-sm text-red-700 mb-2">
                다음 항목이 플랜 한도를 초과했습니다: {limits.exceededLimits.join(', ')}
              </p>
              <Button
                size="sm"
                onClick={() => router.push('/upgrade')}
                className="bg-red-600 hover:bg-red-700"
              >
                플랜 업그레이드
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column - Subscription Info */}
        <div className="col-span-4">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">현재 플랜</h2>

            {subscription ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl font-bold text-gray-900">{getPlanName(subscription.planTier)}</span>
                    {getStatusBadge(subscription.status)}
                  </div>
                  <p className="text-gray-600">
                    {formatPrice(subscription.monthlyAmount)} / {subscription.billingCycle === 'monthly' ? '월' : '년'}
                  </p>
                </div>

                {subscription.planTier !== 'free' && (
                  <div className="space-y-3 pt-4 border-t border-gray-200">
                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">다음 결제일</p>
                        <p className="text-sm text-gray-600">
                          {subscription.nextBillingDate
                            ? formatDate(subscription.nextBillingDate)
                            : '해당 없음'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">현재 기간 종료</p>
                        <p className="text-sm text-gray-600">{formatDate(subscription.currentPeriodEnd)}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {data.daysRemaining}일 남음
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">자동 갱신</p>
                        <p className="text-sm text-gray-600">
                          {subscription.autoRenew ? '활성화됨' : '비활성화됨'}
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
                      <div>
                        <p className="text-sm font-semibold text-amber-900 mb-1">
                          플랜 변경 예정
                        </p>
                        <p className="text-sm text-amber-800 mb-2">
                          {formatDate(subscription.pendingChangeEffectiveDate)}에 <strong>{getPlanName(subscription.pendingTier)}</strong> 플랜으로 변경됩니다.
                        </p>
                        <p className="text-xs text-amber-700">
                          현재 결제 기간이 끝날 때까지 현재 플랜의 모든 기능을 계속 사용하실 수 있습니다.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2 pt-4 border-t border-gray-200">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleUpdatePaymentMethod}
                    disabled={updatingPayment}
                  >
                    {updatingPayment ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        업데이트 중...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 mr-2" />
                        결제 수단 변경
                      </>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push('/upgrade')}
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    플랜 업그레이드
                  </Button>

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
                          취소 중...
                        </>
                      ) : (
                        '구독 취소'
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">활성 구독이 없습니다</p>
                <Button onClick={() => router.push('/upgrade')}>
                  플랜 선택하기
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column - Usage Stats */}
        <div className="col-span-8">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">사용량 현황</h2>
            </div>

            {/* Pending Add-ons Notice */}
            {addonData?.pending && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900 mb-1">
                      추가 구매 예정
                    </p>
                    <p className="text-sm text-blue-800 mb-2">
                      {formatDate(addonData.pending.effectiveDate)}부터 다음 항목이 추가됩니다:
                    </p>
                    <ul className="text-sm text-blue-700 space-y-1">
                      {addonData.pending.students > 0 && (
                        <li>• 학생 {addonData.pending.students}명</li>
                      )}
                      {addonData.pending.teachers > 0 && (
                        <li>• 교사 {addonData.pending.teachers}명</li>
                      )}
                      {addonData.pending.storageGb > 0 && (
                        <li>• 저장 공간 {addonData.pending.storageGb}GB</li>
                      )}
                    </ul>
                    <p className="text-xs text-blue-700 mt-2">
                      추가 비용: {formatPrice(addonData.pending.cost)}/월
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-6">
              {/* Storage Usage with Add-on Controls */}
              <div>
                <UsageProgressBar
                  label="저장 공간"
                  current={usage.currentStorageGb}
                  limit={subscription?.storageLimitGb || 1}
                  unit="GB"
                  formatValue={(val) => val.toFixed(2)}
                />
                {subscription && subscription.planTier !== 'enterprise' && (
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddonChange('storageGb', -1)}
                        disabled={selectedAddons.storageGb === 0}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="text-sm font-medium text-gray-700">
                        추가: {selectedAddons.storageGb}GB
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddonChange('storageGb', 1)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">
                      {formatAddonPricing(subscription.planTier as SubscriptionTier, 'ko')?.storage}
                    </p>
                  </div>
                )}
              </div>

              {/* Students/Parents Usage with Add-on Controls */}
              <div>
                <UsageProgressBar
                  label="학생/학부모 수"
                  current={usage.currentStudentCount}
                  limit={subscription?.studentLimit || 20}
                  unit="명"
                />
                {subscription && subscription.planTier !== 'enterprise' && (
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddonChange('students', -1)}
                        disabled={selectedAddons.students === 0}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="text-sm font-medium text-gray-700">
                        추가: {selectedAddons.students}명
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddonChange('students', 1)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">
                      {formatAddonPricing(subscription.planTier as SubscriptionTier, 'ko')?.users}
                    </p>
                  </div>
                )}
              </div>

              {/* Managers/Teachers Usage with Add-on Controls */}
              <div>
                <UsageProgressBar
                  label="매니저/교사 수"
                  current={usage.currentTeacherCount}
                  limit={subscription?.teacherLimit || 2}
                  unit="명"
                />
                {subscription && subscription.planTier !== 'enterprise' && (
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddonChange('teachers', -1)}
                        disabled={selectedAddons.teachers === 0}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="text-sm font-medium text-gray-700">
                        추가: {selectedAddons.teachers}명
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddonChange('teachers', 1)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">
                      {formatAddonPricing(subscription.planTier as SubscriptionTier, 'ko')?.users}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Purchase Add-ons Button */}
            {subscription && subscription.planTier !== 'enterprise' && (selectedAddons.students > 0 || selectedAddons.teachers > 0 || selectedAddons.storageGb > 0) && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>현재 요금</span>
                      <span>{formatPrice(subscription.monthlyAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>추가 비용</span>
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
                      <span className="text-sm font-semibold text-gray-900">새 월 요금</span>
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
                    다음 결제일({subscription.nextBillingDate ? formatDate(subscription.nextBillingDate) : '해당 없음'})부터 적용됩니다
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
                      구매 중...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      추가 구매하기
                    </>
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
