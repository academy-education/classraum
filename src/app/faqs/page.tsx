"use client"

import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, School, Users, Download, Clock, Eye, CreditCard, Smartphone, Baby, Shield, HelpCircle } from "lucide-react"
import { useState } from "react"
import Header from "@/components/shared/Header"
import Footer from "@/components/shared/Footer"
import { useTranslation } from "@/hooks/useTranslation"
import { languages } from "@/locales"

export default function FAQsPage() {
  const { t, language } = useTranslation()
  const [openFAQ, setOpenFAQ] = useState<number | null>(null)

  // Access FAQ data directly from translations
  const translations = languages[language]
  const faqData = translations.faqs?.questions || []
  const icons = [School, Users, Download, Clock, Eye, CreditCard, Smartphone, Baby, Shield, HelpCircle]
  
  const faqs = faqData.map((faq, index) => ({
    ...faq,
    icon: icons[index]
  }))

  const toggleFAQ = (id: number) => {
    setOpenFAQ(openFAQ === id ? null : id)
  }

  return (
    <div className="min-h-screen bg-background">
      <Header currentPage="faqs" />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        {/* Hero Section */}
        <div className="text-center mb-12 sm:mb-16">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 px-4">
            {t('faqs.hero.title')}
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto px-4">
            {t('faqs.hero.subtitle')}
          </p>
        </div>

        {/* FAQ Section */}
        <section className="mb-16 sm:mb-20 lg:mb-24">
          <div className="max-w-4xl mx-auto">
            <div className="space-y-4 sm:space-y-6">
              {faqs.map((faq, index) => (
                <div
                  key={faq.id}
                  className="group relative bg-gradient-to-br from-white via-gray-50/30 to-white rounded-2xl sm:rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-400 ease-out hover:-translate-y-2 hover:scale-[1.01] border border-gray-100 hover:border-blue-200/50 overflow-hidden touch-manipulation"
                >
                  {/* Animated gradient border */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-400 ease-out rounded-2xl sm:rounded-3xl"></div>
                  <div className="absolute inset-[1px] bg-gradient-to-br from-white via-gray-50/50 to-white rounded-2xl sm:rounded-3xl"></div>
                  
                  {/* Content */}
                  <div className="relative z-10">
                    <button
                      onClick={() => toggleFAQ(faq.id)}
                      className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 text-left flex items-center justify-between hover:bg-gradient-to-r hover:from-blue-50/40 hover:to-purple-50/20 rounded-2xl sm:rounded-3xl transition-all duration-300 ease-out group-hover:px-6 sm:group-hover:px-8 lg:group-hover:px-10"
                    >
                      <div className="flex items-center space-x-3 sm:space-x-4 lg:space-x-6">
                        {/* Enhanced icon with smooth gradient background */}
                        <div className="relative flex-shrink-0">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg transform transition-all duration-300 ease-out group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-xl">
                            <faq.icon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white transition-transform duration-300 ease-out group-hover:scale-105" />
                          </div>
                          {/* Smooth floating particle */}
                          <div className="absolute -top-1 -right-1 w-2 h-2 sm:w-3 sm:h-3 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out group-hover:animate-pulse" style={{transitionDelay: `${index * 50}ms`}}></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 group-hover:text-blue-900 transition-colors duration-300 ease-out block">{faq.question}</span>
                          <div className="h-0.5 bg-gradient-to-r from-blue-500 to-purple-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-400 ease-out origin-left mt-1 sm:mt-2 rounded-full"></div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-gray-100 to-gray-200 group-hover:from-blue-100 group-hover:to-purple-100 rounded-full flex items-center justify-center transition-all duration-300 ease-out group-hover:scale-105">
                          {openFAQ === faq.id ? (
                            <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 group-hover:text-blue-600 transition-colors duration-300 ease-out" />
                          ) : (
                            <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 group-hover:text-blue-600 transition-colors duration-300 ease-out" />
                          )}
                        </div>
                      </div>
                    </button>
                    
                    {openFAQ === faq.id && (
                      <div className="px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-8 transition-all duration-300 ease-out">
                        <div className="flex items-start space-x-3 sm:space-x-4 lg:space-x-6">
                          {/* Answer icon with smooth gradient */}
                          <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg flex-shrink-0 transform transition-all duration-300 ease-out hover:scale-105">
                            <span className="text-white font-bold text-sm sm:text-base lg:text-lg">A</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            {/* Answer content with smooth styling */}
                            <div className="bg-gradient-to-r from-gray-50 to-blue-50/30 rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-gray-100 shadow-sm transition-all duration-300 ease-out hover:shadow-md">
                              <div className="text-gray-800 leading-relaxed text-sm sm:text-base">
                                {faq.answer}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Smooth decorative elements */}
                  <div className="absolute top-4 right-4 w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full opacity-0 group-hover:opacity-60 transition-all duration-400 ease-out" style={{transitionDelay: `${index * 30}ms`}}></div>
                  <div className="absolute bottom-4 left-4 w-1 h-1 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full opacity-0 group-hover:opacity-40 transition-all duration-500 ease-out" style={{transitionDelay: `${index * 40}ms`}}></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Still Have Questions Section */}
        <section className="mb-16">
          <div className="text-center py-16 bg-gradient-to-r from-primary/10 to-blue-600/10 rounded-3xl">
            <div className="mx-auto px-6" style={{ maxWidth: '800px' }}>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6">{t('faqs.support.title')}</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
                {t('faqs.support.description')}
              </p>
              <a href="mailto:support@classraum.com">
                <Button size="lg" className="text-base px-8">
                  {t('faqs.support.cta')}
                </Button>
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}