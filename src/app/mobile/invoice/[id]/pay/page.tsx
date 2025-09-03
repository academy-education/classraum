"use client"

import { useState, useCallback, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useTranslation } from '@/hooks/useTranslation'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { useMobileData } from '@/hooks/useProgressiveLoading'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { supabase } from '@/lib/supabase'
import { 
  ArrowLeft, 
  CreditCard,
  CheckCircle,
  ExternalLink,
  Shield,
  FileText,
  RefreshCw
} from 'lucide-react'

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
  const params = useParams()
  const invoiceId = params.id as string
  const { t } = useTranslation()
  const { user } = usePersistentMobileAuth()
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('card')

  // Mobile payments don't need INIStdPay.js script - they use direct form submission

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
        const student = invoiceData.students as any
        
        // Extract student name - try different possible structures
        if (student?.name) {
          if (typeof student.name === 'string') {
            studentName = student.name
          } else if (student.name.name) {
            studentName = student.name.name
          } else if (Array.isArray(student.name) && student.name[0]?.name) {
            studentName = student.name[0].name
          }
        }
        
        // Extract academy name - try different possible structures  
        if (student?.academies) {
          if (typeof student.academies === 'string') {
            academyName = student.academies
          } else if (student.academies.name) {
            academyName = student.academies.name
          } else if (Array.isArray(student.academies) && student.academies[0]?.name) {
            academyName = student.academies[0].name
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

  const {
    data: invoice,
    isLoading: loading
  } = useMobileData(
    `invoice-payment-${invoiceId}`,
    invoiceFetcher,
    {
      immediate: true,
      staleTime: 10 * 60 * 1000, // 10 minutes
      backgroundRefresh: false
    }
  )

  const handlePayment = async () => {
    if (!termsAccepted) {
      alert(t('mobile.payment.pleaseAcceptTerms'))
      return
    }

    if (!invoice) {
      alert(t('mobile.payment.paymentFailed'))
      return
    }

    setProcessing(true)

    try {
      // Get the mobile payment form
      const form = document.getElementById('SendPayForm_id') as HTMLFormElement
      if (!form) {
        throw new Error('Payment form not found. Please refresh the page.')
      }

      // Set form for mobile payment - direct submission like mobile demo
      form.method = 'POST'
      form.action = 'https://mobile.inicis.com/smart/payment/'
      form.target = '_self'
      form.innerHTML = '' // Reset form

      // Construct return URL
      const baseUrl = window.location.origin.replace('app.localhost', 'localhost')
      const returnUrl = `${baseUrl}/api/payment/return`

      // Mobile payment parameters - matching mobile demo exactly
      const mobileFormValues = {
        P_INI_PAYMENT: paymentMethod === 'card' ? 'CARD' : 'VBANK',
        P_MID: 'INIpayTest',  // Mobile test MID
        P_OID: `mobile_${Date.now()}`,  // Order ID
        P_AMT: invoice.finalAmount.toString(),  // Amount
        P_GOODS: `Invoice Payment - ${invoice.studentName}`,  // Product name
        P_UMANE: invoice.studentName,  // User name
        P_MOBILE: user?.phone || '01012345678',  // Phone
        P_EMAIL: user?.email || 'test@test.com',  // Email
        P_NEXT_URL: returnUrl,  // Return URL
        P_CHARSET: 'utf8',
        P_RESERVED: 'below1000=Y&vbank_receipt=Y&centerCd=Y',
        P_NOTI: invoiceId  // Custom data
      }

      console.log('Mobile payment form values:', mobileFormValues)

      // Create form inputs for mobile payment
      Object.entries(mobileFormValues).forEach(([key, value]) => {
        if (value) {
          const input = document.createElement('input')
          input.type = 'hidden'
          input.name = key
          input.value = String(value)
          form.appendChild(input)
        }
      })

      // Submit form directly - mobile style
      console.log('Submitting mobile payment form...')
      form.submit()
    } catch (error) {
      console.error('Payment initialization failed:', error)
      alert(t('mobile.payment.paymentFailed'))
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
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
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
          
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setPaymentMethod('card')}
              className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-colors ${
                paymentMethod === 'card'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <CreditCard className={`w-6 h-6 ${paymentMethod === 'card' ? 'text-blue-600' : 'text-gray-600'}`} />
              <span className={`text-sm font-medium ${paymentMethod === 'card' ? 'text-blue-600' : 'text-gray-700'}`}>
                {t('mobile.payment.methods.card')}
              </span>
            </button>
            
            <button
              onClick={() => setPaymentMethod('phone')}
              className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-colors ${
                paymentMethod === 'phone'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <svg className={`w-6 h-6 ${paymentMethod === 'phone' ? 'text-blue-600' : 'text-gray-600'}`} fill="currentColor" viewBox="0 0 24 24">
                <path d="M17 2H7c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM7 4h10v16H7V4z"/>
                <path d="M12 18.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5z"/>
              </svg>
              <span className={`text-sm font-medium ${paymentMethod === 'phone' ? 'text-blue-600' : 'text-gray-700'}`}>
                {t('mobile.payment.methods.phone')}
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
                {t('mobile.payment.agreeToTerms')}{' '}
                <a 
                  href="https://classraum.com/terms" 
                  target="_blank" 
                  className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1"
                >
                  {t('mobile.payment.termsOfService')}
                  <ExternalLink className="w-3 h-3" />
                </a>
                {', '}
                <a 
                  href="https://classraum.com/privacy-policy" 
                  target="_blank" 
                  className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1"
                >
                  {t('mobile.payment.privacyPolicy')}
                  <ExternalLink className="w-3 h-3" />
                </a>
                {', '}
                {t('common.and')}{' '}
                <a 
                  href="https://classraum.com/refund-policy" 
                  target="_blank" 
                  className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1"
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
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
            onClick={handlePayment}
            disabled={!termsAccepted || processing}
          >
            {processing ? (
              <>
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
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
      {/* Hidden form for KG Inicis payment - matching demo structure */}
      <form
        id="SendPayForm_id"
        name="SendPayForm_id"
        method="POST"
        style={{ display: 'none' }}
      />
    </div>
  )
}