"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Link2, ChevronLeft, ChevronRight, FileText, BarChart3, MessageSquare, ArrowRight, Zap, Eye, TrendingUp, Database } from "lucide-react"
import { useState, useEffect } from "react"
import Header from "@/components/shared/Header"
import Footer from "@/components/shared/Footer"
import { useTranslation } from "@/hooks/useTranslation"

interface BenefitItem {
  title: string
  description: string
}

export default function SmartLinkingSystemPage() {
  const { t } = useTranslation()
  const [appUrl, setAppUrl] = useState("https://app.classraum.com")
  const [currentCard, setCurrentCard] = useState(0)

  const benefitsRaw = t('features.smartLinkingSystem.whyItMatters.benefits')
  const benefits = Array.isArray(benefitsRaw) ? benefitsRaw as BenefitItem[] : []
  const icons = [Database, Eye, TrendingUp, Zap]
  const iconColors = [
    'from-cyan-500 to-cyan-600 group-hover:text-cyan-600',
    'from-blue-500 to-blue-600 group-hover:text-blue-600',
    'from-green-500 to-green-600 group-hover:text-green-600',
    'from-purple-500 to-purple-600 group-hover:text-purple-600'
  ]

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


  return (
    <>
      <Header currentPage="features" />
      <div className="min-h-screen bg-background">

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        {/* Hero */}
        <div className="text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-cyan-600 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8">
            <Link2 className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
          
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-3 sm:mb-4">
            {t('features.smartLinkingSystem.title')}
          </h1>
          
          <p className="text-xl text-[#4a90e2] font-medium mb-4">
            {t('features.smartLinkingSystem.subtitle')}
          </p>
          
          <p className="text-base sm:text-lg text-[#163e64] max-w-3xl mx-auto mb-12 sm:mb-16 lg:mb-24">
            {t('features.smartLinkingSystem.description')}
          </p>
        </div>
      </main>

      {/* How It Works Section */}
      <section className="bg-gradient-to-br from-gray-900 to-slate-800 py-24 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16 lg:mb-24">
            <div className="mb-2">
              <h3 className="text-xl font-medium text-[#4a90e2]" style={{ fontFamily: 'Kalam, Comic Sans MS, cursive' }}>{t('features.smartLinkingSystem.howItWorks.title')}</h3>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6">
              {t('features.smartLinkingSystem.howItWorks.subtitle')}
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

                {/* Card 1: Auto-Link Lessons to Assignments */}
                <div className="w-full flex-shrink-0 px-0.5 sm:px-1 lg:px-2">
                  <div className="flex flex-col lg:flex-row gap-2 sm:gap-4 lg:gap-8 items-start min-h-[280px] sm:min-h-[320px] lg:h-96">
                    <div className="group relative bg-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 hover:shadow-xl transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex flex-col h-full w-full lg:w-1/2">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <FileText className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">{t('features.smartLinkingSystem.howItWorks.carousel.autoLink.title')}</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          {t('features.smartLinkingSystem.howItWorks.carousel.autoLink.description')}
                        </p>
                      </div>
                    </div>
                    <div className="w-full lg:w-1/2 bg-white rounded-2xl shadow-lg p-4 sm:p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">{t('features.smartLinkingSystem.howItWorks.carousel.autoLink.rightSide.title')}</div>
                      <div className="space-y-4">
                        <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
                          <div className="text-xs font-medium text-blue-700 mb-1">{t('features.smartLinkingSystem.howItWorks.carousel.autoLink.rightSide.lesson.title')}</div>
                          <div className="text-sm text-gray-700">{t('features.smartLinkingSystem.howItWorks.carousel.autoLink.rightSide.lesson.description')}</div>
                          <div className="text-xs text-gray-500 mt-1">{t('features.smartLinkingSystem.howItWorks.carousel.autoLink.rightSide.lesson.linked')}</div>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-400">
                          <div className="text-xs font-medium text-green-700 mb-1">{t('features.smartLinkingSystem.howItWorks.carousel.autoLink.rightSide.assignment.title')}</div>
                          <div className="text-sm text-gray-700">{t('features.smartLinkingSystem.howItWorks.carousel.autoLink.rightSide.assignment.due')}</div>
                          <div className="text-xs text-gray-500 mt-1">{t('features.smartLinkingSystem.howItWorks.carousel.autoLink.rightSide.assignment.connected')}</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
                          {t('features.smartLinkingSystem.howItWorks.carousel.autoLink.rightSide.status')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 2: Link Attendance to Performance */}
                <div className="w-full flex-shrink-0 px-0.5 sm:px-1 lg:px-2">
                  <div className="flex flex-col lg:flex-row gap-2 sm:gap-4 lg:gap-8 items-start min-h-[280px] sm:min-h-[320px] lg:h-96">
                    <div className="group relative bg-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 hover:shadow-xl transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex flex-col h-full w-full lg:w-1/2">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <BarChart3 className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">{t('features.smartLinkingSystem.howItWorks.carousel.attendancePerformance.title')}</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          {t('features.smartLinkingSystem.howItWorks.carousel.attendancePerformance.description')}
                        </p>
                      </div>
                    </div>
                    <div className="w-full lg:w-1/2 bg-white rounded-2xl shadow-lg p-4 sm:p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">{t('features.smartLinkingSystem.howItWorks.carousel.attendancePerformance.rightSide.title')}</div>
                      <div className="space-y-3">
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-orange-700 mb-1">{t('features.smartLinkingSystem.howItWorks.carousel.attendancePerformance.rightSide.performance.title')}</div>
                          <div className="text-xs text-orange-600">{t('features.smartLinkingSystem.howItWorks.carousel.attendancePerformance.rightSide.performance.grade')}</div>
                          <div className="text-xs text-gray-500 mt-1">{t('features.smartLinkingSystem.howItWorks.carousel.attendancePerformance.rightSide.performance.linked')}</div>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-blue-700 mb-1">{t('features.smartLinkingSystem.howItWorks.carousel.attendancePerformance.rightSide.attendance.title')}</div>
                          <div className="text-xs text-blue-600">{t('features.smartLinkingSystem.howItWorks.carousel.attendancePerformance.rightSide.attendance.pattern')}</div>
                          <div className="text-xs text-gray-500 mt-1">{t('features.smartLinkingSystem.howItWorks.carousel.attendancePerformance.rightSide.attendance.catchup')}</div>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-green-700 mb-1">{t('features.smartLinkingSystem.howItWorks.carousel.attendancePerformance.rightSide.action.title')}</div>
                          <div className="text-xs text-green-600">{t('features.smartLinkingSystem.howItWorks.carousel.attendancePerformance.rightSide.action.suggestion')}</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center justify-center">
                          <div className="w-2 h-2 bg-purple-500 rounded-full mr-2 animate-pulse"></div>
                          {t('features.smartLinkingSystem.howItWorks.carousel.attendancePerformance.rightSide.insights')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 3: Tie Messages to Student Records */}
                <div className="w-full flex-shrink-0 px-0.5 sm:px-1 lg:px-2">
                  <div className="flex flex-col lg:flex-row gap-2 sm:gap-4 lg:gap-8 items-start min-h-[280px] sm:min-h-[320px] lg:h-96">
                    <div className="group relative bg-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 hover:shadow-xl transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex flex-col h-full w-full lg:w-1/2">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-teal-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <MessageSquare className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">{t('features.smartLinkingSystem.howItWorks.carousel.messagesRecords.title')}</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          {t('features.smartLinkingSystem.howItWorks.carousel.messagesRecords.description')}
                        </p>
                      </div>
                    </div>
                    <div className="w-full lg:w-1/2 bg-white rounded-2xl shadow-lg p-4 sm:p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">{t('features.smartLinkingSystem.howItWorks.carousel.messagesRecords.rightSide.title')}</div>
                      <div className="space-y-3">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-blue-700 mb-1">{t('features.smartLinkingSystem.howItWorks.carousel.messagesRecords.rightSide.parentMessage.title')}</div>
                          <div className="text-xs text-blue-600">{t('features.smartLinkingSystem.howItWorks.carousel.messagesRecords.rightSide.parentMessage.content')}</div>
                          <div className="text-xs text-gray-500 mt-1">{t('features.smartLinkingSystem.howItWorks.carousel.messagesRecords.rightSide.parentMessage.linked')}</div>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-green-700 mb-1">{t('features.smartLinkingSystem.howItWorks.carousel.messagesRecords.rightSide.context.title')}</div>
                          <div className="text-xs text-green-600">{t('features.smartLinkingSystem.howItWorks.carousel.messagesRecords.rightSide.context.data')}</div>
                          <div className="text-xs text-gray-500 mt-1">{t('features.smartLinkingSystem.howItWorks.carousel.messagesRecords.rightSide.context.accessible')}</div>
                        </div>
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-purple-700 mb-1">{t('features.smartLinkingSystem.howItWorks.carousel.messagesRecords.rightSide.actions.title')}</div>
                          <div className="text-xs text-purple-600">{t('features.smartLinkingSystem.howItWorks.carousel.messagesRecords.rightSide.actions.options')}</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center justify-center">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                          {t('features.smartLinkingSystem.howItWorks.carousel.messagesRecords.rightSide.organized')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 4: One Click = Full Context */}
                <div className="w-full flex-shrink-0 px-0.5 sm:px-1 lg:px-2">
                  <div className="flex flex-col lg:flex-row gap-2 sm:gap-4 lg:gap-8 items-start min-h-[280px] sm:min-h-[320px] lg:h-96">
                    <div className="group relative bg-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 hover:shadow-xl transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex flex-col h-full w-full lg:w-1/2">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-red-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <ArrowRight className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">{t('features.smartLinkingSystem.howItWorks.carousel.oneClickContext.title')}</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          {t('features.smartLinkingSystem.howItWorks.carousel.oneClickContext.description')}
                        </p>
                      </div>
                    </div>
                    <div className="w-full lg:w-1/2 bg-white rounded-2xl shadow-lg p-4 sm:p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">{t('features.smartLinkingSystem.howItWorks.carousel.oneClickContext.rightSide.title')}</div>
                      <div className="space-y-3">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-blue-700 mb-1">{t('features.smartLinkingSystem.howItWorks.carousel.oneClickContext.rightSide.gradebook.title')}</div>
                          <div className="text-xs text-blue-600">{t('features.smartLinkingSystem.howItWorks.carousel.oneClickContext.rightSide.gradebook.flow')}</div>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-green-700 mb-1">{t('features.smartLinkingSystem.howItWorks.carousel.oneClickContext.rightSide.lessonPlan.title')}</div>
                          <div className="text-xs text-green-600">{t('features.smartLinkingSystem.howItWorks.carousel.oneClickContext.rightSide.lessonPlan.flow')}</div>
                        </div>
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-purple-700 mb-1">{t('features.smartLinkingSystem.howItWorks.carousel.oneClickContext.rightSide.attendance.title')}</div>
                          <div className="text-xs text-purple-600">{t('features.smartLinkingSystem.howItWorks.carousel.oneClickContext.rightSide.attendance.flow')}</div>
                        </div>
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-orange-700 mb-1">{t('features.smartLinkingSystem.howItWorks.carousel.oneClickContext.rightSide.reportCard.title')}</div>
                          <div className="text-xs text-orange-600">{t('features.smartLinkingSystem.howItWorks.carousel.oneClickContext.rightSide.reportCard.flow')}</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center justify-center">
                          <div className="w-2 h-2 bg-orange-500 rounded-full mr-2 animate-pulse"></div>
                          {t('features.smartLinkingSystem.howItWorks.carousel.oneClickContext.rightSide.seamless')}
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
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <FileText className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">{t('features.smartLinkingSystem.howItWorks.carousel.autoLink.title')}</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          {t('features.smartLinkingSystem.howItWorks.carousel.autoLink.description')}
                        </p>
                      </div>
                    </div>
                    <div className="w-full lg:w-1/2 bg-white rounded-2xl shadow-lg p-4 sm:p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">{t('features.smartLinkingSystem.howItWorks.carousel.autoLink.rightSide.title')}</div>
                      <div className="space-y-4">
                        <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
                          <div className="text-xs font-medium text-blue-700 mb-1">{t('features.smartLinkingSystem.howItWorks.carousel.autoLink.rightSide.lesson.title')}</div>
                          <div className="text-sm text-gray-700">{t('features.smartLinkingSystem.howItWorks.carousel.autoLink.rightSide.lesson.description')}</div>
                          <div className="text-xs text-gray-500 mt-1">{t('features.smartLinkingSystem.howItWorks.carousel.autoLink.rightSide.lesson.linked')}</div>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-400">
                          <div className="text-xs font-medium text-green-700 mb-1">{t('features.smartLinkingSystem.howItWorks.carousel.autoLink.rightSide.assignment.title')}</div>
                          <div className="text-sm text-gray-700">{t('features.smartLinkingSystem.howItWorks.carousel.autoLink.rightSide.assignment.due')}</div>
                          <div className="text-xs text-gray-500 mt-1">{t('features.smartLinkingSystem.howItWorks.carousel.autoLink.rightSide.assignment.connected')}</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
                          {t('features.smartLinkingSystem.howItWorks.carousel.autoLink.rightSide.status')}
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
        {/* Why It Matters Section */}
        <section className="mb-12 sm:mb-16 lg:mb-24">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <div className="mb-2">
                <h3 className="text-xl font-medium text-[#4a90e2]" style={{ fontFamily: 'Kalam, Comic Sans MS, cursive' }}>{t('features.smartLinkingSystem.whyItMatters.title')}</h3>
              </div>
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 px-6">
                {t('features.smartLinkingSystem.whyItMatters.subtitle')}
              </h2>
            </div>

            <div className="grid lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
              {benefits.map((benefit, index) => {
                const IconComponent = icons[index]
                const colorClass = iconColors[index]
                return (
                  <div key={index} className="group bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col">
                    <div className="text-center">
                      <div className={`w-16 h-16 bg-gradient-to-br ${colorClass.split(' ')[0]} ${colorClass.split(' ')[1]} rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                        {React.createElement(IconComponent, { className: "w-8 h-8 text-white" })}
                      </div>
                      <h3 className={`text-xl font-bold text-gray-900 mb-4 transition-colors duration-300 ${colorClass.split(' ')[2]}`}>{benefit.title}</h3>
                      <p className="text-gray-600 text-sm leading-relaxed">{benefit.description}</p>
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
            {t('features.smartLinkingSystem.cta.title')}
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto mb-6 sm:mb-8 px-4">
            {t('features.smartLinkingSystem.cta.description')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
            <a href={`${appUrl}/dashboard`} className="w-full sm:w-auto">
              <Button size="lg" className="text-sm sm:text-base px-6 sm:px-8 w-full sm:w-auto">
                {t('features.smartLinkingSystem.cta.startTrial')}
              </Button>
            </a>
            <Button variant="outline" size="lg" className="text-sm sm:text-base px-6 sm:px-8 w-full sm:w-auto">
              {t('features.smartLinkingSystem.cta.demo')}
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