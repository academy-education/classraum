"use client"

import Header from "@/components/shared/Header"
import Footer from "@/components/shared/Footer"
import { RefreshCw } from "lucide-react"
import { useTranslation } from "@/hooks/useTranslation"

export default function RefundPolicyPage() {
  const { t } = useTranslation()
  
  return (
    <>
      <Header />
      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          {/* Hero */}
          <div className="text-center mb-12">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-green-600 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8">
              <RefreshCw className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-4">
              {t('refundPolicy.title')}
            </h1>
            
            <p className="text-lg text-gray-600 mb-2">
              {t('refundPolicy.lastUpdated')}
            </p>
          </div>

          {/* Content */}
          <div className="prose prose-lg max-w-none">
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6">{t('refundPolicy.purpose.title')}</h2>
              
              <p className="text-gray-700 leading-relaxed">
                {t('refundPolicy.purpose.content')}
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6">{t('refundPolicy.eligibleRefunds.title')}</h2>
              
              <ul className="list-disc pl-6 space-y-3 text-gray-700">
                {(Array.isArray(t('refundPolicy.eligibleRefunds.content')) ? t('refundPolicy.eligibleRefunds.content') as unknown as string[] : []).map((item: string, index: number) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6">{t('refundPolicy.refundPeriod.title')}</h2>
              
              <div className="bg-blue-50 border-l-4 border-blue-500 p-6 mb-6">
                <p className="text-gray-700 font-medium mb-3">
                  {t('refundPolicy.refundPeriod.content.0')}
                </p>
              </div>
              
              <p className="text-gray-700 leading-relaxed">
                {t('refundPolicy.refundPeriod.content.1')}
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6">{t('refundPolicy.refundMethod.title')}</h2>
              
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <p className="text-gray-700 leading-relaxed mb-4">
                  {t('refundPolicy.refundMethod.content.0')}
                </p>
              </div>
              
              <p className="text-gray-700 leading-relaxed">
                {t('refundPolicy.refundMethod.content.1')}
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6">{t('refundPolicy.refundCriteria.title')}</h2>
              
              <div className="space-y-4">
                {(Array.isArray(t('refundPolicy.refundCriteria.content')) ? t('refundPolicy.refundCriteria.content') as unknown as string[] : []).map((item: string, index: number) => (
                  <div key={index} className={`border-l-4 ${index === 0 ? 'border-green-500' : index === 1 ? 'border-yellow-500' : 'border-blue-500'} pl-6`}>
                    <p className="text-gray-700 leading-relaxed">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6">{t('refundPolicy.exclusions.title')}</h2>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <p className="text-gray-700 font-medium mb-4">
                  {t('refundPolicy.exclusions.content')}
                </p>
                
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  {(Array.isArray(t('refundPolicy.exclusions.items')) ? t('refundPolicy.exclusions.items') as unknown as string[] : []).map((item: string, index: number) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6">{t('refundPolicy.procedure.title')}</h2>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="space-y-3">
                  {(Array.isArray(t('refundPolicy.procedure.content')) ? t('refundPolicy.procedure.content') as unknown as string[] : []).map((item: string, index: number) => (
                    <div key={index} className="flex items-start">
                      <div className="flex-shrink-0 w-6 h-6 bg-green-600 rounded-full flex items-center justify-center mt-0.5">
                        <span className="text-white text-xs font-bold">{index + 1}</span>
                      </div>
                      <p className="text-gray-700 ml-3">
                        {item}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6">{t('refundPolicy.other.title')}</h2>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <ul className="list-disc pl-6 space-y-3 text-gray-700">
                  {(Array.isArray(t('refundPolicy.other.content')) ? t('refundPolicy.other.content') as unknown as string[] : []).map((item: string, index: number) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Contact Section */}
            <section className="bg-blue-50 rounded-lg p-8 text-center">
              <h2 className="text-2xl font-bold mb-4">{t('refundPolicy.contact.title')}</h2>
              <p className="text-gray-700 leading-relaxed mb-6">
                {t('refundPolicy.contact.description')}
              </p>
              <div className="space-y-2">
                <p className="text-gray-700">
                  <span className="font-semibold">{t('refundPolicy.contact.email')}</span> <a href="mailto:info@classraum.com" className="text-blue-600 hover:text-blue-800 font-medium">{t('refundPolicy.contact.emailValue')}</a>
                </p>
                <p className="text-gray-700">
                  <span className="font-semibold">{t('refundPolicy.contact.responseTime')}</span> {t('refundPolicy.contact.responseValue')}
                </p>
              </div>
            </section>

            {/* Quick Reference Card */}
            <div className="mt-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-6 text-white">
              <h3 className="text-xl font-bold mb-4">{t('refundPolicy.quickReference.title')}</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="font-semibold mb-1">{t('refundPolicy.quickReference.refundWindow')}</p>
                  <p className="text-blue-100">{t('refundPolicy.quickReference.refundWindowValue')}</p>
                </div>
                <div>
                  <p className="font-semibold mb-1">{t('refundPolicy.quickReference.processingTime')}</p>
                  <p className="text-blue-100">{t('refundPolicy.quickReference.processingTimeValue')}</p>
                </div>
                <div>
                  <p className="font-semibold mb-1">{t('refundPolicy.quickReference.contactEmail')}</p>
                  <p className="text-blue-100">{t('refundPolicy.contact.emailValue')}</p>
                </div>
                <div>
                  <p className="font-semibold mb-1">{t('refundPolicy.quickReference.responseTime')}</p>
                  <p className="text-blue-100">{t('refundPolicy.quickReference.responseTimeValue')}</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
      <Footer />
    </>
  )
}