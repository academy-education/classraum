"use client"

import { Button } from "@/components/ui/button"
import React from "react"
import { Shield, ChevronLeft, ChevronRight, UserCheck, Database, Lock, ClipboardCheck, Settings, MessageSquare, CheckSquare, Users, Globe } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import Header from "@/components/shared/Header"
import Footer from "@/components/shared/Footer"
import { useTranslation } from "@/hooks/useTranslation"

interface ControlItem {
  title: string
  description: string
}

interface BenefitItem {
  title: string
  description: string
}

export default function PrivacyByDesignPage() {
  const { t } = useTranslation()
  const [appUrl, setAppUrl] = useState("https://app.classraum.com")
  const [currentCard, setCurrentCard] = useState(0)
  const featuresRef = useRef<HTMLDivElement>(null)

  const controlsRaw = t('features.privacyByDesign.empowerment.controls')
  const controls = Array.isArray(controlsRaw) ? controlsRaw as ControlItem[] : []
  const benefitsRaw = t('features.privacyByDesign.realProtection.benefits')
  const benefits = Array.isArray(benefitsRaw) ? benefitsRaw as BenefitItem[] : []
  const controlIcons = [Settings, MessageSquare, CheckSquare]
  const benefitIcons = [Shield, Users, Globe, CheckSquare]

  useEffect(() => {
    if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost') {
      const { protocol, port } = window.location
      setAppUrl(`${protocol}//app.localhost${port ? ':' + port : ''}`)
      }
    }
  }, [])

  // Handle seamless carousel navigation with circular index
  const nextCard = () => {
    setCurrentCard((prev) => (prev + 1) % 4)
  }

  const prevCard = () => {
    setCurrentCard((prev) => (prev - 1 + 4) % 4)
  }

  // Close features dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (featuresRef.current && !featuresRef.current.contains(event.target as Node)) {
        // setShowFeatures(false) // This line was removed
        // setHoveredFeature(null) // This line was removed
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <>
      <Header currentPage="features" />
      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        {/* Hero */}
        <div className="text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8">
            <Shield className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
          
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-3 sm:mb-4">
            {t('features.privacyByDesign.title')}
          </h1>
          
          <p className="text-xl text-[#4a90e2] font-medium mb-4">
            {t('features.privacyByDesign.subtitle')}
          </p>
          
          <p className="text-base sm:text-lg text-[#163e64] max-w-3xl mx-auto mb-12 sm:mb-16 lg:mb-24">
            {t('features.privacyByDesign.description')}
          </p>
        </div>
      </main>

      {/* Foundations Section */}
      <section className="bg-gradient-to-br from-gray-900 to-slate-800 py-24 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16 lg:mb-24">
            <div className="mb-2">
              <h3 className="text-xl font-medium text-[#4a90e2]" style={{ fontFamily: 'Kalam, Comic Sans MS, cursive' }}>{t('features.privacyByDesign.securityFirst.title')}</h3>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6">
              {t('features.privacyByDesign.securityFirst.subtitle')}
            </h2>
          </div>

          {/* Carousel Cards */}
          <div className="relative mb-16">
            {/* Navigation Buttons */}
            <button 
              onClick={prevCard}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 rounded-full w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 flex items-center justify-center transition-all duration-300 hover:scale-110"
            >
              <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-white" />
            </button>
            
            <button 
              onClick={nextCard}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 rounded-full w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 flex items-center justify-center transition-all duration-300 hover:scale-110"
            >
              <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-white" />
            </button>

            {/* Carousel Container */}
            <div className="flex justify-center">
              <div className="overflow-hidden mx-2 sm:mx-8 lg:mx-20 max-w-xs sm:max-w-2xl lg:max-w-4xl w-full">
              <div 
                className="flex transition-all duration-700 ease-in-out"
                style={{ transform: `translateX(-${currentCard * 100}%)` }}
              >

                {/* Card 1: Role-Based Access Control */}
                <div className="w-full flex-shrink-0 px-0.5 sm:px-1 lg:px-2">
                  <div className="flex flex-col lg:flex-row gap-2 sm:gap-4 lg:gap-8 items-start min-h-[280px] sm:min-h-[320px] lg:h-96">
                    <div className="group relative bg-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 hover:shadow-xl transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex flex-col h-full w-full lg:w-1/2">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <UserCheck className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">{t('features.privacyByDesign.foundations.carousel.roleBasedAccess.title')}</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          {t('features.privacyByDesign.foundations.carousel.roleBasedAccess.description')}
                        </p>
                      </div>
                    </div>
                    <div className="w-full lg:w-1/2 bg-white rounded-2xl shadow-lg p-4 sm:p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">{t('features.privacyByDesign.foundations.carousel.roleBasedAccess.rightSide.title')}</div>
                      <div className="space-y-4">
                        <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
                          <div className="text-xs font-medium text-blue-700 mb-1">{t('features.privacyByDesign.foundations.carousel.roleBasedAccess.rightSide.teacher.title')}</div>
                          <div className="text-sm text-gray-700">{t('features.privacyByDesign.foundations.carousel.roleBasedAccess.rightSide.teacher.permissions')}</div>
                          <div className="text-xs text-gray-500 mt-1">{t('features.privacyByDesign.foundations.carousel.roleBasedAccess.rightSide.teacher.enforcement')}</div>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-400">
                          <div className="text-xs font-medium text-green-700 mb-1">{t('features.privacyByDesign.foundations.carousel.roleBasedAccess.rightSide.parent.title')}</div>
                          <div className="text-sm text-gray-700">{t('features.privacyByDesign.foundations.carousel.roleBasedAccess.rightSide.parent.permissions')}</div>
                          <div className="text-xs text-gray-500 mt-1">{t('features.privacyByDesign.foundations.carousel.roleBasedAccess.rightSide.parent.isolation')}</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
                          {t('features.privacyByDesign.foundations.carousel.roleBasedAccess.rightSide.architecture')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 2: Data Segmentation */}
                <div className="w-full flex-shrink-0 px-0.5 sm:px-1 lg:px-2">
                  <div className="flex flex-col lg:flex-row gap-2 sm:gap-4 lg:gap-8 items-start min-h-[280px] sm:min-h-[320px] lg:h-96">
                    <div className="group relative bg-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 hover:shadow-xl transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex flex-col h-full w-full lg:w-1/2">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <Database className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">{t('features.privacyByDesign.foundations.carousel.dataSegmentation.title')}</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          {t('features.privacyByDesign.foundations.carousel.dataSegmentation.description')}
                        </p>
                      </div>
                    </div>
                    <div className="w-full lg:w-1/2 bg-white rounded-2xl shadow-lg p-4 sm:p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">{t('features.privacyByDesign.foundations.carousel.dataSegmentation.rightSide.title')}</div>
                      <div className="space-y-3">
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-orange-700 mb-1">{t('features.privacyByDesign.foundations.carousel.dataSegmentation.rightSide.classA.title')}</div>
                          <div className="text-xs text-orange-600">{t('features.privacyByDesign.foundations.carousel.dataSegmentation.rightSide.classA.teacher')}</div>
                          <div className="text-xs text-gray-500 mt-1">{t('features.privacyByDesign.foundations.carousel.dataSegmentation.rightSide.classA.isolation')}</div>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-blue-700 mb-1">{t('features.privacyByDesign.foundations.carousel.dataSegmentation.rightSide.classB.title')}</div>
                          <div className="text-xs text-blue-600">{t('features.privacyByDesign.foundations.carousel.dataSegmentation.rightSide.classB.teacher')}</div>
                          <div className="text-xs text-gray-500 mt-1">{t('features.privacyByDesign.foundations.carousel.dataSegmentation.rightSide.classB.isolation')}</div>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-green-700 mb-1">{t('features.privacyByDesign.foundations.carousel.dataSegmentation.rightSide.crossClass.title')}</div>
                          <div className="text-xs text-green-600">{t('features.privacyByDesign.foundations.carousel.dataSegmentation.rightSide.crossClass.requirement')}</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center justify-center">
                          <div className="w-2 h-2 bg-purple-500 rounded-full mr-2 animate-pulse"></div>
                          {t('features.privacyByDesign.foundations.carousel.dataSegmentation.rightSide.boundaries')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 3: End-to-End Encryption */}
                <div className="w-full flex-shrink-0 px-0.5 sm:px-1 lg:px-2">
                  <div className="flex flex-col lg:flex-row gap-2 sm:gap-4 lg:gap-8 items-start min-h-[280px] sm:min-h-[320px] lg:h-96">
                    <div className="group relative bg-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 hover:shadow-xl transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex flex-col h-full w-full lg:w-1/2">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-teal-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <Lock className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">{t('features.privacyByDesign.foundations.carousel.endToEndEncryption.title')}</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          {t('features.privacyByDesign.foundations.carousel.endToEndEncryption.description')}
                        </p>
                      </div>
                    </div>
                    <div className="w-full lg:w-1/2 bg-white rounded-2xl shadow-lg p-4 sm:p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">{t('features.privacyByDesign.foundations.carousel.endToEndEncryption.rightSide.title')}</div>
                      <div className="space-y-3">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-blue-700 mb-1">{t('features.privacyByDesign.foundations.carousel.endToEndEncryption.rightSide.dataAtRest.title')}</div>
                          <div className="text-xs text-blue-600">{t('features.privacyByDesign.foundations.carousel.endToEndEncryption.rightSide.dataAtRest.method')}</div>
                          <div className="text-xs text-gray-500 mt-1">{t('features.privacyByDesign.foundations.carousel.endToEndEncryption.rightSide.dataAtRest.protection')}</div>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-green-700 mb-1">{t('features.privacyByDesign.foundations.carousel.endToEndEncryption.rightSide.dataInTransit.title')}</div>
                          <div className="text-xs text-green-600">{t('features.privacyByDesign.foundations.carousel.endToEndEncryption.rightSide.dataInTransit.method')}</div>
                          <div className="text-xs text-gray-500 mt-1">{t('features.privacyByDesign.foundations.carousel.endToEndEncryption.rightSide.dataInTransit.secured')}</div>
                        </div>
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-purple-700 mb-1">{t('features.privacyByDesign.foundations.carousel.endToEndEncryption.rightSide.keyManagement.title')}</div>
                          <div className="text-xs text-purple-600">{t('features.privacyByDesign.foundations.carousel.endToEndEncryption.rightSide.keyManagement.method')}</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center justify-center">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                          {t('features.privacyByDesign.foundations.carousel.endToEndEncryption.rightSide.standards')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 4: Secure Student Recordkeeping */}
                <div className="w-full flex-shrink-0 px-0.5 sm:px-1 lg:px-2">
                  <div className="flex flex-col lg:flex-row gap-2 sm:gap-4 lg:gap-8 items-start min-h-[280px] sm:min-h-[320px] lg:h-96">
                    <div className="group relative bg-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 hover:shadow-xl transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex flex-col h-full w-full lg:w-1/2">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-red-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <ClipboardCheck className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">{t('features.privacyByDesign.foundations.carousel.secureRecordkeeping.title')}</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          {t('features.privacyByDesign.foundations.carousel.secureRecordkeeping.description')}
                        </p>
                      </div>
                    </div>
                    <div className="w-full lg:w-1/2 bg-white rounded-2xl shadow-lg p-4 sm:p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">{t('features.privacyByDesign.foundations.carousel.secureRecordkeeping.rightSide.title')}</div>
                      <div className="space-y-3">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-blue-700 mb-1">{t('features.privacyByDesign.foundations.carousel.secureRecordkeeping.rightSide.accessLog.title')}</div>
                          <div className="text-xs text-blue-600">{t('features.privacyByDesign.foundations.carousel.secureRecordkeeping.rightSide.accessLog.details')}</div>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-green-700 mb-1">{t('features.privacyByDesign.foundations.carousel.secureRecordkeeping.rightSide.changeHistory.title')}</div>
                          <div className="text-xs text-green-600">{t('features.privacyByDesign.foundations.carousel.secureRecordkeeping.rightSide.changeHistory.description')}</div>
                        </div>
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-purple-700 mb-1">{t('features.privacyByDesign.foundations.carousel.secureRecordkeeping.rightSide.tamperDetection.title')}</div>
                          <div className="text-xs text-purple-600">{t('features.privacyByDesign.foundations.carousel.secureRecordkeeping.rightSide.tamperDetection.description')}</div>
                        </div>
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-orange-700 mb-1">{t('features.privacyByDesign.foundations.carousel.secureRecordkeeping.rightSide.complianceReports.title')}</div>
                          <div className="text-xs text-orange-600">{t('features.privacyByDesign.foundations.carousel.secureRecordkeeping.rightSide.complianceReports.description')}</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center justify-center">
                          <div className="w-2 h-2 bg-orange-500 rounded-full mr-2 animate-pulse"></div>
                          {t('features.privacyByDesign.foundations.carousel.secureRecordkeeping.rightSide.transparency')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Duplicate of Card 1 for seamless loop */}
                <div className="w-full flex-shrink-0 px-4">
                  <div className="flex flex-col lg:flex-row gap-2 sm:gap-4 lg:gap-8 items-start min-h-[280px] sm:min-h-[320px] lg:h-96">
                    <div className="group relative bg-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 hover:shadow-xl transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex flex-col h-full w-full lg:w-1/2">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <UserCheck className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">{t('features.privacyByDesign.foundations.carousel.roleBasedAccess.title')}</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          {t('features.privacyByDesign.foundations.carousel.roleBasedAccess.description')}
                        </p>
                      </div>
                    </div>
                    <div className="w-full lg:w-1/2 bg-white rounded-2xl shadow-lg p-4 sm:p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">{t('features.privacyByDesign.foundations.carousel.roleBasedAccess.rightSide.title')}</div>
                      <div className="space-y-4">
                        <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
                          <div className="text-xs font-medium text-blue-700 mb-1">{t('features.privacyByDesign.foundations.carousel.roleBasedAccess.rightSide.teacher.title')}</div>
                          <div className="text-sm text-gray-700">{t('features.privacyByDesign.foundations.carousel.roleBasedAccess.rightSide.teacher.permissions')}</div>
                          <div className="text-xs text-gray-500 mt-1">{t('features.privacyByDesign.foundations.carousel.roleBasedAccess.rightSide.teacher.enforcement')}</div>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-400">
                          <div className="text-xs font-medium text-green-700 mb-1">{t('features.privacyByDesign.foundations.carousel.roleBasedAccess.rightSide.parent.title')}</div>
                          <div className="text-sm text-gray-700">{t('features.privacyByDesign.foundations.carousel.roleBasedAccess.rightSide.parent.permissions')}</div>
                          <div className="text-xs text-gray-500 mt-1">{t('features.privacyByDesign.foundations.carousel.roleBasedAccess.rightSide.parent.isolation')}</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
                          {t('features.privacyByDesign.foundations.carousel.roleBasedAccess.rightSide.architecture')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </div>

            {/* Carousel Indicators */}
            <div className="flex justify-center space-x-2 mt-8">
              {[0, 1, 2, 3].map((index) => (
                <button
                  key={index}
                  onClick={() => setCurrentCard(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    currentCard === index 
                      ? 'bg-white scale-125' 
                      : 'bg-white/50 hover:bg-white/70'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">
        {/* Control Section */}
        <section className="mb-12 sm:mb-16 lg:mb-24">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <div className="mb-2">
                <h3 className="text-xl font-medium text-[#4a90e2]" style={{ fontFamily: 'Kalam, Comic Sans MS, cursive' }}>{t('features.privacyByDesign.empowerment.title')}</h3>
              </div>
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 px-6">
                {t('features.privacyByDesign.empowerment.subtitle')}
              </h2>
            </div>

            <div className="grid lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {controls.map((control, index) => {
                const IconComponent = controlIcons[index]
                const colorClasses = [
                  'from-blue-500 to-blue-600 group-hover:text-blue-600',
                  'from-purple-500 to-purple-600 group-hover:text-purple-600',
                  'from-green-500 to-green-600 group-hover:text-green-600'
                ]
                return (
                  <div key={index} className="group bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col">
                    <div className="text-center">
                      <div className={`w-16 h-16 bg-gradient-to-br ${colorClasses[index].split(' ')[0]} ${colorClasses[index].split(' ')[1]} rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                        {React.createElement(IconComponent, { className: "w-8 h-8 text-white" })}
                      </div>
                      <h3 className={`text-xl font-bold text-gray-900 mb-4 transition-colors duration-300 ${colorClasses[index].split(' ')[2]}`}>{control.title}</h3>
                      <p className="text-gray-600 text-sm leading-relaxed">{control.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Why It Matters Section */}
        <section className="mb-12 sm:mb-16 lg:mb-24">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <div className="mb-2">
                <h3 className="text-xl font-medium text-[#4a90e2]" style={{ fontFamily: 'Kalam, Comic Sans MS, cursive' }}>{t('features.privacyByDesign.realProtection.title')}</h3>
              </div>
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 px-6">
                {t('features.privacyByDesign.realProtection.subtitle')}
              </h2>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {benefits.map((benefit, index) => {
                const IconComponent = benefitIcons[index]
                const colorClasses = [
                  'bg-indigo-500 hover:border-indigo-400 hover:bg-indigo-50/30 group-hover:text-indigo-600',
                  'bg-orange-500 hover:border-orange-400 hover:bg-orange-50/30 group-hover:text-orange-600',
                  'bg-blue-500 hover:border-blue-400 hover:bg-blue-50/30 group-hover:text-blue-600',
                  'bg-green-500 hover:border-green-400 hover:bg-green-50/30 group-hover:text-green-600'
                ]
                return (
                  <div key={index} className={`group rounded-2xl border-2 border-gray-200 bg-white p-6 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 cursor-pointer min-h-[140px] flex items-center ${colorClasses[index].split(' ')[1]} ${colorClasses[index].split(' ')[2]}`}>
                    <div className="flex items-start space-x-4 w-full">
                      <div className={`w-12 h-12 ${colorClasses[index].split(' ')[0]} rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                        {React.createElement(IconComponent, { className: "w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-white" })}
                      </div>
                      <div className="flex-1">
                        <h3 className={`text-xl font-semibold text-gray-900 mb-2 transition-colors duration-300 ${colorClasses[index].split(' ')[3]}`}>{benefit.title}</h3>
                        <p className="text-gray-700 text-sm">{benefit.description}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

      {/* CTA Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">
        <section className="text-center py-12 sm:py-16 lg:py-20 bg-gradient-to-r from-primary/10 to-blue-600/10 rounded-2xl sm:rounded-3xl">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6 px-4 sm:px-6">
            {t('features.privacyByDesign.cta.title')}
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto mb-6 sm:mb-8 px-4">
            {t('features.privacyByDesign.cta.description')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
            <a href={`${appUrl}/dashboard`} className="w-full sm:w-auto">
              <Button size="lg" className="text-sm sm:text-base px-6 sm:px-8 w-full sm:w-auto">
                {t('features.privacyByDesign.cta.startTrial')}
              </Button>
            </a>
            <Button variant="outline" size="lg" className="text-sm sm:text-base px-6 sm:px-8 w-full sm:w-auto">
              {t('features.privacyByDesign.cta.demo')}
            </Button>
          </div>
        </section>
      </main>
      </main>

      <Footer />
      </div>
    </>
  )
}