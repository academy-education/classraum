"use client"

import Header from "@/components/shared/Header"
import Footer from "@/components/shared/Footer"
import { ScrollText } from "lucide-react"
import { useTranslation } from "@/hooks/useTranslation"
import { useState } from "react"

export default function TermsOfServicePage() {
  const { t } = useTranslation()
  const [termsType, setTermsType] = useState<'business' | 'consumer'>('business')
  
  return (
    <>
      <Header />
      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          {/* Hero */}
          <div className="text-center mb-12">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8">
              <ScrollText className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            
            {/* Terms Type Selector */}
            <div className="flex justify-center mb-6">
              <div className="inline-flex rounded-lg border border-gray-300 p-1">
                <button
                  onClick={() => setTermsType('business')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    termsType === 'business'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {t('termsOfService.business.title')}
                </button>
                <button
                  onClick={() => setTermsType('consumer')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    termsType === 'consumer'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {t('termsOfService.consumer.title')}
                </button>
              </div>
            </div>
            
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-4">
              {t(`termsOfService.${termsType}.title`)}
            </h1>
            
            <p className="text-lg text-gray-600 mb-2">
              {t(`termsOfService.${termsType}.lastUpdated`)}
            </p>
          </div>

          {/* Content */}
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-700 leading-relaxed mb-8">
              {t(`termsOfService.${termsType}.intro`)}
            </p>

            {/* Sections */}
            {Object.keys(t(`termsOfService.${termsType}.sections`) || {}).map((sectionKey, index) => {
              const section = t(`termsOfService.${termsType}.sections.${sectionKey}`) as unknown as {title: string, content: string[], intro?: string, items?: string[], refusal?: string, refusalItems?: string[], services?: string[], change?: string, restrictions?: string, restrictionItems?: string[], notice?: string, policy?: string, prohibited?: string[], enforcement?: string}
              return (
                <section key={sectionKey} id={`section-${index + 1}`} className="mb-12">
                  <h2 className="text-2xl font-bold mb-6">
                    {index + 1}. {section?.title || sectionKey}
                  </h2>
                  
                  {section?.content && (
                    <p className="text-gray-700 leading-relaxed mb-6">
                      {section.content}
                    </p>
                  )}
                  
                  {section?.intro && (
                    <p className="text-gray-700 leading-relaxed mb-4">
                      {section.intro}
                    </p>
                  )}
                  
                  {section?.items && Array.isArray(section.items) && (
                    <ul className="list-decimal pl-6 mb-6 text-gray-700 space-y-2">
                      {section.items.map((item: string, itemIndex: number) => (
                        <li key={itemIndex}>{item}</li>
                      ))}
                    </ul>
                  )}
                  
                  {section?.refusal && (
                    <>
                      <p className="text-gray-700 leading-relaxed mb-4">{section.refusal}</p>
                      {section?.refusalItems && Array.isArray(section.refusalItems) && (
                        <ul className="list-disc pl-6 mb-6 text-gray-700 space-y-2">
                          {section.refusalItems.map((item: string, itemIndex: number) => (
                            <li key={itemIndex}>{item}</li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                  
                  {section?.services && Array.isArray(section.services) && (
                    <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                      {section.services.map((service: string, serviceIndex: number) => (
                        <li key={serviceIndex}>{service}</li>
                      ))}
                    </ul>
                  )}
                  
                  {section?.change && (
                    <p className="text-gray-700 leading-relaxed mb-4">{section.change}</p>
                  )}
                  
                  {section?.restrictions && (
                    <>
                      <p className="text-gray-700 leading-relaxed mb-4">{section.restrictions}</p>
                      {section?.restrictionItems && Array.isArray(section.restrictionItems) && (
                        <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                          {section.restrictionItems.map((item: string, itemIndex: number) => (
                            <li key={itemIndex}>{item}</li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                  
                  {section?.notice && (
                    <p className="text-gray-700 leading-relaxed mb-4">{section.notice}</p>
                  )}
                  
                  {section?.policy && (
                    <p className="text-gray-700 leading-relaxed mb-4">{section.policy}</p>
                  )}
                  
                  {section?.prohibited && Array.isArray(section.prohibited) && (
                    <>
                      <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                        {section.prohibited.map((item: string, itemIndex: number) => (
                          <li key={itemIndex}>{item}</li>
                        ))}
                      </ul>
                      {section.enforcement && (
                        <p className="text-gray-700 leading-relaxed mb-4">{section.enforcement}</p>
                      )}
                    </>
                  )}
                </section>
              )
            })}

            
            {/* Contact Section */}
            <section className="bg-blue-50 rounded-lg p-8 text-center mt-12">
              <h2 className="text-2xl font-bold mb-4">{t('termsOfService.contactTitle')}</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                {t('termsOfService.contactDescription')}
              </p>
              <p className="text-gray-700">
                <strong>{t('termsOfService.emailLabel')}:</strong> <a href="mailto:info@classraum.com" className="text-blue-600 hover:text-blue-800 font-medium">info@classraum.com</a>
              </p>
            </section>
          </div>
        </main>
      </div>
      <Footer />
    </>
  )
}