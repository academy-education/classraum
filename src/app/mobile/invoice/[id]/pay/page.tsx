"use client"

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSafeParams } from '@/hooks/useSafeParams'
import { useTranslation } from '@/hooks/useTranslation'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { simpleTabDetection } from '@/utils/simpleTabDetection'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import {
  ArrowLeft,
  CreditCard,
  ExternalLink,
  Shield,
  FileText,
  Loader2
} from 'lucide-react'
import * as PortOne from '@portone/browser-sdk/v2'
import { useToast } from '@/hooks/use-toast'

interface InvoiceDetails {
  id: string
  amount: number
  finalAmount: number
  discountAmount: number
  status: string
  dueDate: string
  description: string
  studentName: string
  academyName: string
  paymentMethod?: string
  notes?: string
}

export default function MobileInvoicePaymentPage() {
  const router = useRouter()
  const params = useSafeParams()
  const invoiceId = params?.id || ''
  const { t } = useTranslation()
  const { user } = usePersistentMobileAuth()
  const { toast } = useToast()
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('card')

  // Fetch invoice details (same logic as details page)
  const invoiceFetcher = useCallback(async (): Promise<InvoiceDetails | null> => {
    if (!invoiceId || !user?.userId) return null
    
    try {
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          id,
          amount,
          final_amount,
          discount_amount,
          discount_reason,
          status,
          due_date,
          student_id,
          payment_method,
          transaction_id,
          students!inner(
            user_id,
            name:users!inner(name),
            academy_id,
            academies!inner(name)
          )
        `)
        .eq('id', invoiceId)
        .single()

      let academyName = 'Academy'
      let studentName = 'Student'
      
      if (invoiceData?.students) {
        const student = invoiceData.students as unknown as Record<string, unknown>
        
        // Extract student name - try different possible structures
        if ((student as Record<string, unknown>)?.name) {
          const name = (student as Record<string, unknown>).name
          if (typeof name === 'string') {
            studentName = name
          } else if (typeof name === 'object' && name && (name as Record<string, unknown>).name) {
            studentName = (name as Record<string, unknown>).name as string
          } else if (Array.isArray(name) && name[0] && (name[0] as Record<string, unknown>)?.name) {
            studentName = (name[0] as Record<string, unknown>).name as string
          }
        }
        
        // Extract academy name - try different possible structures  
        if ((student as Record<string, unknown>)?.academies) {
          const academies = (student as Record<string, unknown>).academies
          if (typeof academies === 'string') {
            academyName = academies
          } else if (typeof academies === 'object' && academies && (academies as Record<string, unknown>).name) {
            academyName = (academies as Record<string, unknown>).name as string
          } else if (Array.isArray(academies) && academies[0] && (academies[0] as Record<string, unknown>)?.name) {
            academyName = (academies[0] as Record<string, unknown>).name as string
          }
        }
      }

      if (invoiceError) throw invoiceError

      const formattedInvoice: InvoiceDetails = {
        id: invoiceData.id,
        amount: invoiceData.amount,
        finalAmount: invoiceData.final_amount || invoiceData.amount,
        discountAmount: invoiceData.discount_amount || 0,
        status: invoiceData.status,
        dueDate: invoiceData.due_date,
        description: studentName,
        studentName: studentName,
        academyName,
        paymentMethod: invoiceData.payment_method,
        notes: invoiceData.discount_reason || invoiceData.transaction_id
      }

      return formattedInvoice
    } catch (error) {
      // Log invoice fetch error for debugging
      if (error && typeof error === 'object' && 'message' in error) {
        console.log('Invoice fetch failed:', (error as Error).message)
      }
      return null
    }
  }, [invoiceId, user])

  // Replace useMobileData with direct useEffect pattern like working pages
  const [invoice, setInvoice] = useState<InvoiceDetails | null>(null)
  const [loading, setLoading] = useState(() => {
    const shouldSuppress = simpleTabDetection.isReturningToTab()
    if (shouldSuppress) {
      console.log('🚫 [InvoicePayment] Suppressing initial loading - navigation detected')
      return false
    }
    return true
  })

  const refetchInvoice = useCallback(async () => {
    if (!invoiceId || !user?.userId) {
      setInvoice(null)
      setLoading(false)
      return
    }

    try {
      if (!simpleTabDetection.isReturningToTab()) {
        setLoading(true)
      }
      console.log('💳 [Payment] Starting fetch for:', invoiceId)
      const result = await invoiceFetcher()
      console.log('✅ [Payment] Fetch successful:', result)
      setInvoice(result)
    } catch (error) {
      console.error('❌ [Payment] Fetch error:', error)
      setInvoice(null)
    } finally {
      setLoading(false)
      simpleTabDetection.markAppLoaded()
    }
  }, [invoiceId, user?.userId, invoiceFetcher])

  // Direct useEffect pattern like working pages
  useEffect(() => {
    if (invoiceId && user?.userId) {
      refetchInvoice()
    }
  }, [invoiceId, user?.userId, refetchInvoice])

  const handlePayment = async () => {
    if (!termsAccepted) {
      toast({
        title: "약관 동의 필요",
        description: t('mobile.payment.pleaseAcceptTerms') as string,
        variant: "destructive",
      })
      return
    }

    if (!invoice) {
      toast({
        title: "결제 오류",
        description: t('mobile.payment.paymentFailed') as string,
        variant: "destructive",
      })
      return
    }

    setProcessing(true)

    try {
      // Use working test channel configuration
      const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID
      let channelKey = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY

      // For development/testing, use your existing Inicis channel
      if (process.env.NODE_ENV === 'development') {
        channelKey = 'channel-key-8bb588e1-00e4-4a9f-a4e0-5351692dc4e6'
        console.log('[Payment Debug] Using Inicis INIpayTest channel for development')
      }

      console.log('[Payment Debug] PortOne Config:', {
        storeId: storeId ? `${storeId.substring(0, 8)}...` : 'MISSING',
        channelKey: channelKey ? `${channelKey.substring(0, 8)}...` : 'MISSING',
        environment: process.env.NODE_ENV,
        usingTestChannel: process.env.NODE_ENV === 'development'
      })

      if (!storeId || !channelKey) {
        throw new Error('PortOne configuration missing. Please check NEXT_PUBLIC_PORTONE_STORE_ID and NEXT_PUBLIC_PORTONE_CHANNEL_KEY environment variables.')
      }

      // Generate unique payment ID (max 40 chars for KCP V2)
      const timestamp = Date.now().toString().slice(-8) // Last 8 digits
      const randomSuffix = Math.random().toString(36).substr(2, 6) // 6 random chars
      const shortInvoiceId = invoiceId.slice(-8) // Last 8 chars of invoice ID
      const paymentId = `inv_${shortInvoiceId}_${timestamp}_${randomSuffix}` // ~32 chars

      // Request payment using PortOne SDK
      const paymentRequest = {
        storeId: storeId,
        channelKey: channelKey,
        paymentId: paymentId,
        orderName: `Invoice Payment - ${invoice.studentName}`,
        totalAmount: invoice.finalAmount,
        currency: "KRW" as const,
        payMethod: "CARD" as const,
        customer: {
          fullName: invoice.studentName,
          phoneNumber: (user as any)?.phone || "01012345678",
          email: (user as any)?.email || "test@test.com",
        },
        redirectUrl: `${window.location.origin}/payments/redirect`,
        noticeUrls: [`${window.location.origin}/api/payments/webhook`],
        customData: {
          invoiceId: invoiceId,
          paymentType: "invoice"
        }
      }

      console.log('[Payment Debug] Payment request:', {
        ...paymentRequest,
        storeId: `${paymentRequest.storeId.substring(0, 8)}...`,
        channelKey: `${paymentRequest.channelKey.substring(0, 8)}...`
      })

      const response = await PortOne.requestPayment(paymentRequest)

      if (response?.code != null) {
        // Payment failed or cancelled - provide detailed error information
        let errorTitle = "결제 실패"
        let errorDescription = response.message || "결제가 취소되었거나 실패했습니다."

        // Handle specific PortOne error codes
        if (response.code === 'PG_PROVIDER_ERROR') {
          errorDescription = "결제 서비스 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
        } else if (response.code === 'CANCELLED') {
          errorTitle = "결제 취소"
          errorDescription = "결제가 취소되었습니다."
        } else if (response.code === 'PG_PROVIDER_TIMEOUT') {
          errorDescription = "결제 시간이 초과되었습니다. 다시 시도해주세요."
        }

        console.log('[Payment Debug] Payment failed:', {
          code: response.code,
          message: response.message
        })

        await supabase
          .from('invoices')
          .update({
            status: 'failed',
            payment_method: 'card',
            notes: `${response.code}: ${response.message || 'Payment failed or cancelled'}`
          })
          .eq('id', invoiceId)

        toast({
          title: errorTitle,
          description: errorDescription,
          variant: "destructive",
        })
        return
      }

      // Payment initiated successfully - verify on server
      console.log('[Payment Debug] Verifying payment:', response?.paymentId);

      const verifyResponse = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentId: response?.paymentId,
          invoiceId: invoiceId
        }),
      })

      const verifyResult = await verifyResponse.json()
      console.log('[Payment Debug] Verification result:', verifyResult);

      if (verifyResult.success) {
        toast({
          title: "결제 성공",
          description: "결제가 성공적으로 완료되었습니다.",
        })

        // Update invoice status based on actual payment status
        console.log('[Payment Debug] Payment status:', verifyResult.status);
        if (verifyResult.status === 'paid') {
          await supabase
            .from('invoices')
            .update({
              status: 'paid',
              transaction_id: response?.paymentId
            })
            .eq('id', invoiceId)
        } else if (verifyResult.status === 'pending') {
          // Handle pending status (test mode or virtual account)
          console.log('[Payment Debug] Payment is pending (test mode or waiting for deposit)');
          await supabase
            .from('invoices')
            .update({
              status: 'pending',
              transaction_id: response?.paymentId,
              notes: 'Payment pending - test mode or awaiting deposit'
            })
            .eq('id', invoiceId)
        }

        // Redirect back to invoice details or success page
        router.push(`/mobile/invoice/${invoiceId}`)
      } else {
        // Verification failed - update invoice status to failed
        await supabase
          .from('invoices')
          .update({
            status: 'failed',
            payment_method: 'card',
            notes: verifyResult.error || 'Payment verification failed'
          })
          .eq('id', invoiceId)

        toast({
          title: "결제 확인 실패",
          description: verifyResult.error || "결제 확인에 실패했습니다.",
          variant: "destructive",
        })
      }

    } catch (error) {
      const errorMessage = (error as Error).message

      // Update invoice status to failed on error
      await supabase
        .from('invoices')
        .update({
          status: 'failed',
          payment_method: 'card',
          notes: `Payment error: ${errorMessage}`
        })
        .eq('id', invoiceId)

      if (process.env.NODE_ENV === 'development') {
        console.error('Payment error:', errorMessage)
      }

      toast({
        title: "결제 오류",
        description: "결제 처리 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      })
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t('mobile.payment.title')}
            </h1>
          </div>
        </div>

        {/* Loading skeleton */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg border p-6">
            <div className="h-6 bg-gray-200 rounded animate-pulse mb-4" />
            <div className="h-4 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
          </div>
          <div className="bg-white rounded-lg border p-6">
            <div className="h-32 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t('mobile.payment.title')}
            </h1>
          </div>
        </div>

        {/* Error state */}
        <Card className="p-6 text-center">
          <div className="text-gray-500">
            <p>{t('mobile.invoices.notFound')}</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('mobile.payment.title')}
          </h1>
          <p className="text-sm text-gray-600">{invoice.academyName}</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Invoice Summary */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{t('mobile.payment.invoiceSummary')}</h3>
                <p className="text-sm text-gray-600">{t('mobile.invoices.invoiceFor')} {invoice.description}</p>
              </div>
            </div>
          </div>
          
          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">{t('mobile.payment.subtotal')}</span>
              <span className="font-medium">₩{invoice.amount.toLocaleString()}</span>
            </div>
            {invoice.discountAmount > 0 && (
              <div className="flex justify-between items-center mb-2 text-green-600">
                <span>{t('mobile.payment.discount')}</span>
                <span>-₩{invoice.discountAmount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-lg font-semibold border-t pt-2">
              <span>{t('mobile.payment.total')}</span>
              <span>₩{invoice.finalAmount.toLocaleString()}</span>
            </div>
          </div>
        </Card>

        {/* Payment Method Selection */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('mobile.payment.paymentMethod')}
          </h3>
          
          <div className="flex justify-center">
            <button
              onClick={() => setPaymentMethod('card')}
              className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-colors w-full max-w-xs ${
                paymentMethod === 'card'
                  ? 'border-primary bg-primary/10'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <CreditCard className={`w-6 h-6 ${paymentMethod === 'card' ? 'text-primary' : 'text-gray-600'}`} />
              <span className={`text-sm font-medium ${paymentMethod === 'card' ? 'text-primary' : 'text-gray-700'}`}>
                {t('mobile.payment.methods.card')}
              </span>
            </button>
          </div>
        </Card>

        {/* Terms & Conditions */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('mobile.payment.termsAndConditions')}
          </h3>
          
          <div className="space-y-4">
            {/* Terms Acceptance Checkbox */}
            <div className="flex items-start gap-3">
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
                {t('mobile.payment.agreeToTerms')}{' '}
                <a
                  href="https://classraum.com/terms"
                  target="_blank"
                  className="text-primary hover:text-primary/80 underline inline-flex items-center gap-1"
                >
                  {t('mobile.payment.termsOfService')}
                  <ExternalLink className="w-3 h-3" />
                </a>
                {', '}
                <a
                  href="https://classraum.com/privacy-policy"
                  target="_blank"
                  className="text-primary hover:text-primary/80 underline inline-flex items-center gap-1"
                >
                  {t('mobile.payment.privacyPolicy')}
                  <ExternalLink className="w-3 h-3" />
                </a>
                {', '}
                {t('common.and')}{' '}
                <a
                  href="https://classraum.com/refund-policy"
                  target="_blank"
                  className="text-primary hover:text-primary/80 underline inline-flex items-center gap-1"
                >
                  {t('mobile.payment.refundPolicy')}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </label>
            </div>

            {/* Security Notice */}
            <div className="bg-gray-50 rounded-lg p-4 flex items-start gap-3">
              <Shield className="w-5 h-5 text-gray-600 mt-0.5" />
              <div>
                <p className="text-sm text-gray-700">
                  {t('mobile.payment.securityNotice')}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Payment Button */}
        <div className="sticky bottom-4">
          <Button 
            className={`w-full h-12 text-lg font-medium ${
              !termsAccepted || processing
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-primary hover:bg-primary/90 text-primary-foreground'
            }`}
            onClick={handlePayment}
            disabled={!termsAccepted || processing}
          >
            {processing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                {t('mobile.payment.processing')}
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5 mr-2" />
                {t('mobile.payment.payNow')} ₩{invoice.finalAmount.toLocaleString()}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}