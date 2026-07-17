"use client"

import { useState, useCallback, useEffect } from 'react'
import { useStableCallback } from '@/hooks/useStableCallback'
import { useRouter } from 'next/navigation'
import { useSafeParams } from '@/hooks/useSafeParams'
import { useTranslation } from '@/hooks/useTranslation'
import { useLanguage } from '@/contexts/LanguageContext'
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
  Loader2,
  Wallet,
  Landmark
} from 'lucide-react'
import * as PortOne from '@portone/browser-sdk/v2'
import { useToast } from '@/hooks/use-toast'
import { getPortOneConfig } from '@/lib/portone-config'

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
  const { language } = useLanguage()
  const { user } = usePersistentMobileAuth()
  const { toast } = useToast()
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'easy_pay' | 'transfer'>('card')

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
      }
      return null
    }
  }, [invoiceId, user])

  // Replace useMobileData with direct useEffect pattern like working pages
  const [invoice, setInvoice] = useState<InvoiceDetails | null>(null)
  const [loading, setLoading] = useState(() => {
    const shouldSuppress = simpleTabDetection.isReturningToTab()
    if (shouldSuppress) {
      return false
    }
    return true
  })

  const refetchInvoice = useStableCallback(async () => {
    if (!invoiceId || !user?.userId) {
      setInvoice(null)
      setLoading(false)
      return
    }

    try {
      if (!simpleTabDetection.isReturningToTab()) {
        setLoading(true)
      }
      const result = await invoiceFetcher()
      setInvoice(result)
    } catch (error) {
      console.error('❌ [Payment] Fetch error:', error)
      setInvoice(null)
    } finally {
      setLoading(false)
      simpleTabDetection.markAppLoaded()
    }
  })

  // Direct useEffect pattern like working pages
  useEffect(() => {
    if (invoiceId && user?.userId) {
      refetchInvoice()
    }
  }, [invoiceId, user?.userId])

  const handlePayment = async () => {
    if (!termsAccepted) {
      toast({
        title: t('mobile.payment.toast.termsRequiredTitle') as string,
        description: t('mobile.payment.pleaseAcceptTerms') as string,
        variant: "destructive",
      })
      return
    }

    if (!invoice) {
      toast({
        title: t('mobile.payment.toast.paymentErrorTitle') as string,
        description: t('mobile.payment.paymentFailed') as string,
        variant: "destructive",
      })
      return
    }

    setProcessing(true)

    try {
      // Get PortOne configuration with live channel keys
      const config = getPortOneConfig()
      const storeId = config.storeId
      const channelKey = config.paymentChannelKey // Uses live payment channel


      if (!storeId || !channelKey) {
        throw new Error('PortOne configuration missing. Please check environment variables.')
      }

      // Generate unique payment ID (max 40 chars for KCP V2)
      const timestamp = Date.now().toString().slice(-8) // Last 8 digits
      const randomSuffix = Math.random().toString(36).substr(2, 6) // 6 random chars
      const shortInvoiceId = invoiceId.slice(-8) // Last 8 chars of invoice ID
      const paymentId = `inv_${shortInvoiceId}_${timestamp}_${randomSuffix}` // ~32 chars

      // Real payer contact from users — the PG shows this to the payer
      // and Inicis PC requires a real phone. The old dummy values
      // ("01012341234"/test@test.com) remain only as a last resort so a
      // contact-less account can still pay.
      let payerPhone: string | undefined
      let payerName: string | undefined
      let payerEmail: string | undefined
      try {
        const { data: payer } = await supabase
          .from('users')
          .select('phone, name, email')
          .eq('id', user!.userId)
          .maybeSingle()
        payerPhone = payer?.phone || undefined
        payerName = payer?.name || undefined
        payerEmail = payer?.email || undefined
      } catch { /* fall through to fallbacks */ }

      // Request payment using PortOne SDK
      const payMethod = paymentMethod === 'easy_pay' ? 'EASY_PAY' as const
        : paymentMethod === 'transfer' ? 'TRANSFER' as const
        : 'CARD' as const
      const paymentRequest = {
        storeId: storeId,
        channelKey: channelKey,
        paymentId: paymentId,
        orderName: `Invoice Payment - ${invoice.studentName}`,
        totalAmount: invoice.finalAmount,
        currency: "KRW" as const,
        payMethod,
        customer: {
          fullName: payerName || invoice.studentName,
          phoneNumber: payerPhone || "01012345678",
          email: payerEmail || "test@test.com",
        },
        redirectUrl: `${window.location.origin}/payments/redirect`,
        noticeUrls: [`${window.location.origin}/api/payments/webhook`],
        customData: {
          invoiceId: invoiceId,
          paymentType: "invoice"
        }
      }


      const response = await PortOne.requestPayment(paymentRequest)

      if (response?.code != null) {
        // Payment failed or cancelled - provide detailed error information
        let errorTitle = String(t('payments.checkoutErrors.failedTitle'))
        let errorDescription = response.message || String(t('payments.checkoutErrors.failedDescription'))

        // Handle specific PortOne error codes
        if (response.code === 'PG_PROVIDER_ERROR') {
          errorDescription = String(t('payments.checkoutErrors.providerError'))
        } else if (response.code === 'CANCELLED') {
          errorTitle = String(t('payments.checkoutErrors.cancelledTitle'))
          errorDescription = String(t('payments.checkoutErrors.cancelledDescription'))
        } else if (response.code === 'PG_PROVIDER_TIMEOUT') {
          errorDescription = String(t('payments.checkoutErrors.timeoutDescription'))
        }


        await supabase
          .from('invoices')
          .update({
            status: 'failed',
            payment_method: 'card'
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

      const verifyResponse = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentId: response?.paymentId,
          orderData: {
            expectedAmount: invoice.finalAmount,
            invoiceId: invoiceId,
            paymentType: "invoice"
          }
        }),
      })

      const verifyResult = await verifyResponse.json()

      if (verifyResult.success) {
        // Update invoice status based on actual payment status

        if (verifyResult.status === 'paid') {

          // Create settlement in PortOne Platform API FIRST to get the result.
          // NOTE: any settlement-side errors are logged to console only — they
          // are internal/ops concerns and must never leak into invoice.notes,
          // which is rendered to parents on the invoice details page.
          const parentFacingNote = String(t('payments.invoiceNotes.paymentReceived'));
          let settlementId: string | null = null;
          let portoneOrderId: string | null = null;

          try {
            // Get auth token for settlement API
            const { data: { session: settlementSession } } = await supabase.auth.getSession();
            const settlementHeaders: Record<string, string> = {
              'Content-Type': 'application/json',
            };
            if (settlementSession?.access_token) {
              settlementHeaders['Authorization'] = `Bearer ${settlementSession.access_token}`;
            }

            const settlementResponse = await fetch('/api/admin/settlements/create', {
              method: 'POST',
              headers: settlementHeaders,
              body: JSON.stringify({
                invoiceId: invoiceId,
                paymentId: response?.paymentId,
                paymentAmount: invoice.finalAmount,
              }),
            });

            if (!settlementResponse.ok) {
              const errorText = await settlementResponse.text();
              console.error('[Settlement Debug] Settlement API error:', settlementResponse.status, errorText);
            } else {
              const settlementResult = await settlementResponse.json();

              if (settlementResult.settlement) {
                // Extract settlement/transfer ID from the response
                settlementId = settlementResult.settlement.id || settlementResult.settlement.transferId;
                portoneOrderId = settlementResult.settlement.orderId || null;
                console.info('[Settlement Debug] Settlement created:', settlementId);
              } else if (settlementResult.academyName) {
                console.warn('[Settlement Debug] Academy needs PortOne partner setup:', settlementResult.academyName);
              } else {
                console.warn('[Settlement Debug] Settlement not created:', settlementResult.message);
              }
            }
          } catch (settlementError) {
            // Don't fail payment if settlement creation fails
            console.error('[Settlement Debug] Settlement creation error:', settlementError);
          }

          // Update invoice with payment and settlement info
          const { error: updateError } = await supabase
            .from('invoices')
            .update({
              status: 'paid',
              transaction_id: response?.paymentId,
              paid_at: new Date().toISOString(),
              settlement_id: settlementId,
              portone_order_id: portoneOrderId,
              notes: parentFacingNote
            })
            .eq('id', invoiceId);

          if (updateError) {
            console.error('[Payment Debug] ❌ Failed to update invoice status:', updateError);
            toast({ title: String(t('payments.paymentSucceededButUpdateFailed')), description: updateError.message, variant: 'destructive' });
          }

          toast({
            title: t('mobile.payment.toast.paymentSuccessTitle') as string,
            description: t('mobile.payment.toast.paymentSuccessDescription') as string,
          });
        } else if (verifyResult.status === 'pending') {
          // Handle pending status (test mode or virtual account)

          const { error: updateError } = await supabase
            .from('invoices')
            .update({
              status: 'pending',
              transaction_id: response?.paymentId
            })
            .eq('id', invoiceId);

          if (updateError) {
            console.error('[Payment Debug] Failed to update invoice to pending:', updateError);
          }

          toast({
            title: t('mobile.payment.toast.paymentPendingTitle') as string,
            description: t('mobile.payment.toast.paymentPendingDescription') as string,
          });
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
          title: t('mobile.payment.toast.verifyFailedTitle') as string,
          description: verifyResult.error || (t('mobile.payment.toast.verifyFailedFallback') as string),
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
          payment_method: 'card'
        })
        .eq('id', invoiceId)

      if (process.env.NODE_ENV === 'development') {
        console.error('Payment error:', errorMessage)
      }

      toast({
        title: t('mobile.payment.toast.paymentErrorTitle') as string,
        description: t('mobile.payment.toast.paymentErrorFallback') as string,
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
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
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
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
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

  // Compute due-date urgency for the summary card. Parents who tap Pay Now
  // and then bail out lose all sense of urgency on this screen — there's no
  // date or status indicator anywhere. Restate it here so they know what
  // they're committing to (or how late they are).
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(invoice.dueDate)
  due.setHours(0, 0, 0, 0)
  const daysDelta = Math.round((due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
  let urgencyText = ''
  let urgencyTone: 'rose' | 'amber' | 'gray' = 'gray'
  if (daysDelta < 0) {
    urgencyText = String(t('mobile.payment.overdueByDays', { count: Math.abs(daysDelta) }))
    urgencyTone = 'rose'
  } else if (daysDelta === 0) {
    urgencyText = String(t('mobile.payment.dueToday'))
    urgencyTone = 'amber'
  } else if (daysDelta <= 3) {
    urgencyText = String(t('mobile.payment.dueInDays', { count: daysDelta }))
    urgencyTone = 'amber'
  } else {
    urgencyText = String(t('mobile.payment.dueOnDate', {
      date: due.toLocaleDateString(language === 'korean' ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric' }),
    }))
  }
  const urgencyToneClass = {
    rose: 'text-rose-600 bg-rose-50 ring-rose-200',
    amber: 'text-amber-700 bg-amber-50 ring-amber-200',
    gray: 'text-gray-600 bg-gray-50 ring-gray-200',
  }[urgencyTone]
  const urgencyChip = (
    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ring-1 flex-shrink-0 ${urgencyToneClass}`}>
      {urgencyText}
    </span>
  )

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            {t('mobile.payment.title')}
          </h1>
          <p className="text-sm text-gray-600">{invoice.academyName}</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Invoice Summary */}
        <Card className="p-6">
          <div className="flex items-start justify-between mb-4 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-900">{t('mobile.payment.invoiceSummary')}</h3>
                <p className="text-sm text-gray-600 truncate">{t('mobile.invoices.invoiceFor')} {invoice.description}</p>
              </div>
            </div>
            {urgencyChip}
          </div>
          
          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">{t('mobile.payment.subtotal')}</span>
              <span className="font-medium">₩{invoice.amount.toLocaleString()}</span>
            </div>
            {invoice.discountAmount > 0 && (
              <div className="flex justify-between items-center mb-2 text-emerald-600">
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
          
          <div className="grid grid-cols-3 gap-2">
            {([
              { key: 'card' as const, Icon: CreditCard, label: t('mobile.payment.methods.card') },
              { key: 'easy_pay' as const, Icon: Wallet, label: t('mobile.payment.methods.easyPay') },
              { key: 'transfer' as const, Icon: Landmark, label: t('mobile.payment.methods.transfer') },
            ]).map(({ key, Icon, label }) => {
              const active = paymentMethod === key
              return (
                <button
                  key={key}
                  onClick={() => setPaymentMethod(key)}
                  className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-colors ${
                    active
                      ? 'border-primary bg-primary/10'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Icon className={`w-6 h-6 ${active ? 'text-primary' : 'text-gray-600'}`} />
                  <span className={`text-sm font-medium ${active ? 'text-primary' : 'text-gray-700'}`}>
                    {label}
                  </span>
                </button>
              )
            })}
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

        {/* Payment Button — sits inline at the bottom of content (not floating) */}
        <div>
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