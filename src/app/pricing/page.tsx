"use client"

import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"
import { useState, useEffect } from "react"
import Header from "@/components/shared/Header"
import Footer from "@/components/shared/Footer"
import { useTranslation } from "@/hooks/useTranslation"

export default function PricingPage() {
  const { t } = useTranslation()
  const [appUrl, setAppUrl] = useState("https://app.classraum.com")


  const plans = [
    {
      name: t('pricing.plans.individual.name'),
      price: t('pricing.plans.individual.price'),
      period: t('pricing.plans.individual.period'),
      description: t('pricing.plans.individual.description'),
      features: t('pricing.plans.individual.features'),
      additionalCosts: t('pricing.plans.individual.additionalCosts'),
      cta: t('pricing.plans.individual.cta')
    },
    {
      name: t('pricing.plans.smallAcademy.name'),
      price: t('pricing.plans.smallAcademy.price'),
      period: t('pricing.plans.smallAcademy.period'),
      description: t('pricing.plans.smallAcademy.description'),
      features: t('pricing.plans.smallAcademy.features'),
      additionalCosts: t('pricing.plans.smallAcademy.additionalCosts'),
      cta: t('pricing.plans.smallAcademy.cta')
    },
    {
      name: t('pricing.plans.mediumAcademy.name'),
      price: t('pricing.plans.mediumAcademy.price'),
      period: t('pricing.plans.mediumAcademy.period'),
      description: t('pricing.plans.mediumAcademy.description'),
      badge: t('pricing.plans.mediumAcademy.badge'),
      features: t('pricing.plans.mediumAcademy.features'),
      additionalCosts: t('pricing.plans.mediumAcademy.additionalCosts'),
      cta: t('pricing.plans.mediumAcademy.cta')
    },
    {
      name: t('pricing.plans.largeAcademy.name'),
      price: t('pricing.plans.largeAcademy.price'),
      period: t('pricing.plans.largeAcademy.period'),
      description: t('pricing.plans.largeAcademy.description'),
      features: t('pricing.plans.largeAcademy.features'),
      additionalCosts: t('pricing.plans.largeAcademy.additionalCosts'),
      cta: t('pricing.plans.largeAcademy.cta')
    }
  ]


  // Set the correct app URL based on environment
  useEffect(() => {
    if (window.location.hostname === 'localhost') {
      const { protocol, port } = window.location
      setAppUrl(`${protocol}//app.localhost${port ? ':' + port : ''}`)
    }
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <Header currentPage="pricing" />

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="text-center mb-16">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-4 sm:mb-6">
            {t('pricing.hero.title')}
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {t('pricing.hero.subtitle')}
          </p>
        </div>

        {/* Pricing Cards */}
        <section className="mb-24">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 lg:gap-8 max-w-full">
            {plans.map((plan, index) => (
              <div key={index} className={`bg-white rounded-2xl shadow-lg border${index === 2 ? '-2 border-primary' : ''} p-4 sm:p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${index === 2 ? 'relative' : ''} flex flex-col h-full`}>
                {index === 2 && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary text-white px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap">{plan.badge}</span>
                  </div>
                )}
                
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="flex flex-wrap items-baseline justify-center gap-1 mb-1">
                    <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-sm text-gray-600">{plan.period}</span>
                  </div>
                  <p className="text-gray-600 text-sm">{plan.description}</p>
                </div>
                
                <ul className="space-y-2 sm:space-y-3 mb-6 sm:mb-8 flex-grow">
                  {(Array.isArray(plan.features) ? plan.features : []).map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center space-x-3">
                      <Check className="w-4 h-4 text-green-500" />
                      <span className="text-gray-700 text-xs sm:text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <div className="text-center mb-4">
                  {(Array.isArray(plan.additionalCosts) ? plan.additionalCosts : []).map((cost, costIndex) => (
                    <p key={costIndex} className="text-xs text-gray-500">{cost}</p>
                  ))}
                </div>
                
                <a href={`${appUrl}/dashboard`}>
                  <Button className="w-full text-sm hover:scale-105 transition-transform duration-200">{plan.cta}</Button>
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* Enterprise Contact Section */}
        <section className="mb-24">
          <div className="text-center bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-12 max-w-4xl mx-auto">
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">
              {t('pricing.enterprise.title')}
            </h3>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              {t('pricing.enterprise.description')}
            </p>
            <a href="mailto:support@classraum.com?subject=Enterprise Inquiry" className="inline-block">
              <Button size="lg" className="text-base px-8 py-3 transition-all duration-300 ease-out hover:scale-105 hover:shadow-xl hover:bg-primary/90">
                {t('pricing.enterprise.cta')}
              </Button>
            </a>
          </div>
        </section>

        {/* Productivity Benefits Section */}
        <section className="mb-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6">
              {t('pricing.benefits.title')}
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              {t('pricing.benefits.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-16">
            {/* AI-Powered Automation */}
            <div className="group bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 border border-purple-200 hover:border-purple-300 transition-all duration-500 ease-out hover:shadow-2xl hover:-translate-y-2 hover:scale-105 cursor-pointer relative overflow-hidden flex flex-col">
              {/* Animated background overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-100/0 via-purple-100/30 to-pink-100/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out"></div>
              
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-6 relative z-10 transition-all duration-500 ease-out group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-lg">
                <svg className="w-6 h-6 text-white transition-transform duration-500 ease-out group-hover:scale-110" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 relative z-10 transition-colors duration-500 ease-out group-hover:text-purple-800">{t('pricing.benefits.aiManagement.title')}</h3>
              <p className="text-gray-700 mb-6 relative z-10 transition-colors duration-500 ease-out group-hover:text-gray-800">
                {t('pricing.benefits.aiManagement.description')}
              </p>
              <div className="space-y-2 text-sm text-gray-600 relative z-10 flex-grow">
                <div className="flex items-center transition-all duration-300 ease-out group-hover:translate-x-1">
                  <Check className="w-4 h-4 text-green-500 mr-2 transition-colors duration-300 group-hover:text-green-600" />
                  <span className="transition-colors duration-300 group-hover:text-gray-800">{t('pricing.benefits.aiManagement.features.0')}</span>
                </div>
                <div className="flex items-center transition-all duration-300 ease-out group-hover:translate-x-1" style={{transitionDelay: '50ms'}}>
                  <Check className="w-4 h-4 text-green-500 mr-2 transition-colors duration-300 group-hover:text-green-600" />
                  <span className="transition-colors duration-300 group-hover:text-gray-800">{t('pricing.benefits.aiManagement.features.1')}</span>
                </div>
                <div className="flex items-center transition-all duration-300 ease-out group-hover:translate-x-1" style={{transitionDelay: '100ms'}}>
                  <Check className="w-4 h-4 text-green-500 mr-2 transition-colors duration-300 group-hover:text-green-600" />
                  <span className="transition-colors duration-300 group-hover:text-gray-800">{t('pricing.benefits.aiManagement.features.2')}</span>
                </div>
              </div>
              <div className="mt-6 flex flex-col sm:flex-row gap-3 relative z-10">
                <a href={`${appUrl}/dashboard`} className="w-full sm:w-auto">
                  <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm transition-all duration-300 ease-out hover:from-purple-600 hover:to-pink-600 hover:scale-105 hover:shadow-lg">
                    {t('pricing.benefits.aiManagement.cta.start')}
                  </Button>
                </a>
                <Button variant="ghost" className="w-full sm:w-auto text-purple-600 text-sm transition-all duration-300 ease-out hover:text-purple-700 hover:bg-purple-100 hover:scale-105">
                  {t('pricing.benefits.aiManagement.cta.learn')}
                </Button>
              </div>
            </div>

            {/* Unified Platform */}
            <div className="group bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-4 sm:p-6 lg:p-8 border border-blue-200 hover:border-blue-300 transition-all duration-500 ease-out hover:shadow-2xl hover:-translate-y-2 hover:scale-105 cursor-pointer relative overflow-hidden flex flex-col">
              {/* Animated background overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-100/0 via-blue-100/30 to-cyan-100/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out"></div>
              
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mb-4 sm:mb-6 relative z-10 transition-all duration-500 ease-out group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-lg">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white transition-transform duration-500 ease-out group-hover:scale-110" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm0 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" clipRule="evenodd"/>
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3 relative z-10 transition-colors duration-500 ease-out group-hover:text-blue-800">{t('pricing.benefits.unifiedPlatform.title')}</h3>
              <p className="text-sm sm:text-base text-gray-700 mb-4 sm:mb-6 relative z-10 transition-colors duration-500 ease-out group-hover:text-gray-800">
                {t('pricing.benefits.unifiedPlatform.description')}
              </p>
              <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-gray-600 relative z-10 flex-grow">
                <div className="flex items-center transition-all duration-300 ease-out group-hover:translate-x-1">
                  <Check className="w-4 h-4 text-green-500 mr-2 transition-colors duration-300 group-hover:text-green-600" />
                  <span className="transition-colors duration-300 group-hover:text-gray-800">{t('pricing.benefits.unifiedPlatform.features.0')}</span>
                </div>
                <div className="flex items-center transition-all duration-300 ease-out group-hover:translate-x-1" style={{transitionDelay: '50ms'}}>
                  <Check className="w-4 h-4 text-green-500 mr-2 transition-colors duration-300 group-hover:text-green-600" />
                  <span className="transition-colors duration-300 group-hover:text-gray-800">{t('pricing.benefits.unifiedPlatform.features.1')}</span>
                </div>
                <div className="flex items-center transition-all duration-300 ease-out group-hover:translate-x-1" style={{transitionDelay: '100ms'}}>
                  <Check className="w-4 h-4 text-green-500 mr-2 transition-colors duration-300 group-hover:text-green-600" />
                  <span className="transition-colors duration-300 group-hover:text-gray-800">{t('pricing.benefits.unifiedPlatform.features.2')}</span>
                </div>
              </div>
              <div className="mt-6 flex flex-col sm:flex-row gap-3 relative z-10">
                <a href={`${appUrl}/dashboard`} className="w-full sm:w-auto">
                  <Button className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm transition-all duration-300 ease-out hover:from-blue-600 hover:to-cyan-600 hover:scale-105 hover:shadow-lg">
                    {t('pricing.benefits.unifiedPlatform.cta.start')}
                  </Button>
                </a>
                <Button variant="ghost" className="w-full sm:w-auto text-blue-600 text-sm transition-all duration-300 ease-out hover:text-blue-700 hover:bg-blue-100 hover:scale-105">
                  {t('pricing.benefits.unifiedPlatform.cta.learn')}
                </Button>
              </div>
            </div>

            {/* Professional Support */}
            <div className="group bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 sm:p-6 lg:p-8 border border-green-200 hover:border-green-300 transition-all duration-500 ease-out hover:shadow-2xl hover:-translate-y-2 hover:scale-105 cursor-pointer relative overflow-hidden flex flex-col">
              {/* Animated background overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-green-100/0 via-green-100/30 to-emerald-100/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out"></div>
              
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mb-4 sm:mb-6 relative z-10 transition-all duration-500 ease-out group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-lg">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white transition-transform duration-500 ease-out group-hover:scale-110" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3 relative z-10 transition-colors duration-500 ease-out group-hover:text-green-800">{t('pricing.benefits.expertSupport.title')}</h3>
              <p className="text-sm sm:text-base text-gray-700 mb-4 sm:mb-6 relative z-10 transition-colors duration-500 ease-out group-hover:text-gray-800">
                {t('pricing.benefits.expertSupport.description')}
              </p>
              <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-gray-600 relative z-10 flex-grow">
                <div className="flex items-center transition-all duration-300 ease-out group-hover:translate-x-1">
                  <Check className="w-4 h-4 text-green-500 mr-2 transition-colors duration-300 group-hover:text-green-600" />
                  <span className="transition-colors duration-300 group-hover:text-gray-800">{t('pricing.benefits.expertSupport.features.0')}</span>
                </div>
                <div className="flex items-center transition-all duration-300 ease-out group-hover:translate-x-1" style={{transitionDelay: '50ms'}}>
                  <Check className="w-4 h-4 text-green-500 mr-2 transition-colors duration-300 group-hover:text-green-600" />
                  <span className="transition-colors duration-300 group-hover:text-gray-800">{t('pricing.benefits.expertSupport.features.1')}</span>
                </div>
                <div className="flex items-center transition-all duration-300 ease-out group-hover:translate-x-1" style={{transitionDelay: '100ms'}}>
                  <Check className="w-4 h-4 text-green-500 mr-2 transition-colors duration-300 group-hover:text-green-600" />
                  <span className="transition-colors duration-300 group-hover:text-gray-800">{t('pricing.benefits.expertSupport.features.2')}</span>
                </div>
              </div>
              <div className="mt-6 flex flex-col sm:flex-row gap-3 relative z-10">
                <a href={`${appUrl}/dashboard`} className="w-full sm:w-auto">
                  <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm transition-all duration-300 ease-out hover:from-green-600 hover:to-emerald-600 hover:scale-105 hover:shadow-lg">
                    {t('pricing.benefits.expertSupport.cta.start')}
                  </Button>
                </a>
                <Button variant="ghost" className="w-full sm:w-auto text-green-600 text-sm transition-all duration-300 ease-out hover:text-green-700 hover:bg-green-100 hover:scale-105">
                  {t('pricing.benefits.expertSupport.cta.learn')}
                </Button>
              </div>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  )
}