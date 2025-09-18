"use client"

import { Button } from "@/components/ui/button"
import { Monitor, ChevronLeft, ChevronRight, Users, Layout, BarChart3, CheckCircle, Bell, Settings, MessageSquare, Activity, Eye, BookOpen, Calendar, AlertTriangle, Smartphone, Zap, Target, Clock, TrendingUp, Globe } from "lucide-react"
import { useState, useEffect } from "react"
import Header from "@/components/shared/Header"
import Footer from "@/components/shared/Footer"
import { useTranslation } from "@/hooks/useTranslation"

export default function CustomizedDashboardPage() {
  const { t, language } = useTranslation()
  const [appUrl, setAppUrl] = useState("https://app.classraum.com")
  const [currentCard, setCurrentCard] = useState(0)

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
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-purple-600 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8">
            <Monitor className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
          
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-3 sm:mb-4">
            {t('features.customizedDashboard.title')}
          </h1>
          
          <p className="text-lg sm:text-xl text-[#4a90e2] font-medium mb-3 sm:mb-4">
            {t('features.customizedDashboard.subtitle')}
          </p>
          
          <p className="text-base sm:text-lg text-[#163e64] max-w-3xl mx-auto mb-12 sm:mb-16 lg:mb-24">
            {t('features.customizedDashboard.description')}
          </p>
        </div>
      </main>

      {/* Why It Stands Out Section */}
      <section className="bg-gradient-to-br from-gray-900 to-slate-800 py-12 sm:py-16 lg:py-24 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16 lg:mb-24">
            <div className="mb-2">
              <h3 className="text-lg sm:text-xl font-medium text-[#4a90e2]" style={{ fontFamily: 'Kalam, Comic Sans MS, cursive' }}>{t('features.customizedDashboard.standsOut.sectionTitle')}</h3>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6">
              {t('features.customizedDashboard.standsOut.title')}
            </h2>
          </div>

          {/* Mobile-Responsive Cards */}
          <div className="relative mb-8 sm:mb-12 lg:mb-16">
            {/* Navigation Buttons - Hidden on mobile */}
            <button 
              onClick={prevCard}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 rounded-full w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 flex items-center justify-center transition-all duration-300 hover:scale-110 hidden sm:flex"
            >
              <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-white" />
            </button>
            
            <button 
              onClick={nextCard}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 rounded-full w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 flex items-center justify-center transition-all duration-300 hover:scale-110 hidden sm:flex"
            >
              <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-white" />
            </button>

            {/* Carousel Container - Responsive */}
            <div className="flex justify-center">
              <div className="overflow-hidden mx-2 sm:mx-8 lg:mx-20 max-w-xs sm:max-w-2xl lg:max-w-4xl w-full">
              <div 
                className="flex transition-all duration-700 ease-in-out"
                style={{ transform: `translateX(-${currentCard * 100}%)` }}
              >

                {/* Card 1: Role-Based Personalization */}
                <div className="w-full flex-shrink-0 px-0.5 sm:px-1 lg:px-2">
                  <div className="flex flex-col lg:flex-row gap-2 sm:gap-4 lg:gap-8 items-start min-h-[280px] sm:min-h-[320px] lg:h-96">
                    <div className="group relative bg-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 hover:shadow-xl transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex flex-col h-full w-full lg:w-1/2">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                        </div>
                        <h3 className="text-lg sm:text-xl font-semibold text-white">{t('features.customizedDashboard.carousel.card1.title')}</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-xs sm:text-sm leading-relaxed text-left mb-4 sm:mb-6 flex-grow">
                          {t('features.customizedDashboard.carousel.card1.description')}
                        </p>
                      </div>
                    </div>
                    <div className="w-full lg:w-1/2 bg-white rounded-2xl shadow-lg p-4 sm:p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">{t('features.customizedDashboard.carousel.card1.rightSide.title')}</div>
                      <div className="space-y-4">
                        <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
                          <div className="text-xs font-medium text-blue-700 mb-1">{t('features.customizedDashboard.carousel.card1.rightSide.teacher.title')}</div>
                          <div className="text-sm text-gray-700">{t('features.customizedDashboard.carousel.card1.rightSide.teacher.description')}</div>
                          <div className="text-xs text-gray-500 mt-1">{t('features.customizedDashboard.carousel.card1.rightSide.teacher.features')}</div>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-400">
                          <div className="text-xs font-medium text-green-700 mb-1">{t('features.customizedDashboard.carousel.card1.rightSide.parent.title')}</div>
                          <div className="text-sm text-gray-700">{t('features.customizedDashboard.carousel.card1.rightSide.parent.description')}</div>
                          <div className="text-xs text-gray-500 mt-1">{t('features.customizedDashboard.carousel.card1.rightSide.parent.features')}</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center">
                          <div className="w-2 h-2 bg-purple-500 rounded-full mr-2 animate-pulse"></div>
                          {t('features.customizedDashboard.carousel.card1.rightSide.autoConfigured')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 2: Smart Widget Controls */}
                <div className="w-full flex-shrink-0 px-0.5 sm:px-1 lg:px-2">
                  <div className="flex flex-col lg:flex-row gap-2 sm:gap-4 lg:gap-8 items-start min-h-[280px] sm:min-h-[320px] lg:h-96">
                    <div className="group relative bg-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 hover:shadow-xl transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex flex-col h-full w-full lg:w-1/2">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <Layout className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">{t('features.customizedDashboard.carousel.card2.title')}</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          {t('features.customizedDashboard.carousel.card2.description')}
                        </p>
                      </div>
                    </div>
                    <div className="w-full lg:w-1/2 bg-white rounded-2xl shadow-lg p-4 sm:p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">{t('features.customizedDashboard.carousel.card2.rightSide.title')}</div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <BarChart3 className="w-4 h-4 text-blue-600" />
                            </div>
                            <span className="text-sm text-gray-700">{t('features.customizedDashboard.carousel.card2.rightSide.performanceCharts')}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-green-600">{t('features.customizedDashboard.carousel.card2.rightSide.active')}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                              <Bell className="w-4 h-4 text-purple-600" />
                            </div>
                            <span className="text-sm text-gray-700">{t('features.customizedDashboard.carousel.card2.rightSide.alertCenter')}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Settings className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-600">{t('features.customizedDashboard.carousel.card2.rightSide.dragDrop')}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                              <MessageSquare className="w-4 h-4 text-green-600" />
                            </div>
                            <span className="text-sm text-gray-700">{t('features.customizedDashboard.carousel.card2.rightSide.messages')}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-green-600">{t('features.customizedDashboard.carousel.card2.rightSide.visible')}</span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center justify-center">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                          {t('features.customizedDashboard.carousel.card2.rightSide.customizable')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 3: Real-Time Data Sync */}
                <div className="w-full flex-shrink-0 px-0.5 sm:px-1 lg:px-2">
                  <div className="flex flex-col lg:flex-row gap-2 sm:gap-4 lg:gap-8 items-start min-h-[280px] sm:min-h-[320px] lg:h-96">
                    <div className="group relative bg-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 hover:shadow-xl transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex flex-col h-full w-full lg:w-1/2">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-teal-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <Activity className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">{t('features.customizedDashboard.carousel.card3.title')}</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          {t('features.customizedDashboard.carousel.card3.description')}
                        </p>
                      </div>
                    </div>
                    <div className="w-full lg:w-1/2 bg-white rounded-2xl shadow-lg p-4 sm:p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">{t('features.customizedDashboard.carousel.card3.rightSide.title')}</div>
                      <div className="space-y-3">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-green-700 mb-1">{t('features.customizedDashboard.carousel.card3.rightSide.grades.title')}</div>
                          <div className="text-xs text-green-600">{t('features.customizedDashboard.carousel.card3.rightSide.grades.status')}</div>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-blue-700 mb-1">{t('features.customizedDashboard.carousel.card3.rightSide.attendance.title')}</div>
                          <div className="text-xs text-blue-600">{t('features.customizedDashboard.carousel.card3.rightSide.attendance.status')}</div>
                        </div>
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-purple-700 mb-1">{t('features.customizedDashboard.carousel.card3.rightSide.messages.title')}</div>
                          <div className="text-xs text-purple-600">{t('features.customizedDashboard.carousel.card3.rightSide.messages.status')}</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center justify-center">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-1 animate-pulse"></div>
                          <div className="w-2 h-2 bg-purple-500 rounded-full mr-2 animate-pulse"></div>
                          {t('features.customizedDashboard.carousel.card3.rightSide.synchronized')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 4: Adaptive Highlights */}
                <div className="w-full flex-shrink-0 px-0.5 sm:px-1 lg:px-2">
                  <div className="flex flex-col lg:flex-row gap-2 sm:gap-4 lg:gap-8 items-start min-h-[280px] sm:min-h-[320px] lg:h-96">
                    <div className="group relative bg-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 hover:shadow-xl transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex flex-col h-full w-full lg:w-1/2">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-red-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <Eye className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">{t('features.customizedDashboard.carousel.card4.title')}</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          {t('features.customizedDashboard.carousel.card4.description')}
                        </p>
                      </div>
                    </div>
                    <div className="w-full lg:w-1/2 bg-white rounded-2xl shadow-lg p-4 sm:p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">{t('features.customizedDashboard.carousel.card4.rightSide.title')}</div>
                      <div className="space-y-3">
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-orange-700 mb-1">{t('features.customizedDashboard.carousel.card4.rightSide.mostAccessed.title')}</div>
                          <div className="text-xs text-orange-600">{t('features.customizedDashboard.carousel.card4.rightSide.mostAccessed.description')}</div>
                          <div className="text-xs text-gray-500 mt-1">{t('features.customizedDashboard.carousel.card4.rightSide.mostAccessed.result')}</div>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-blue-700 mb-1">{t('features.customizedDashboard.carousel.card4.rightSide.usagePattern.title')}</div>
                          <div className="text-xs text-blue-600">{t('features.customizedDashboard.carousel.card4.rightSide.usagePattern.description')}</div>
                          <div className="text-xs text-gray-500 mt-1">{t('features.customizedDashboard.carousel.card4.rightSide.usagePattern.result')}</div>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-green-700 mb-1">{t('features.customizedDashboard.carousel.card4.rightSide.smartSuggestions.title')}</div>
                          <div className="text-xs text-green-600">{t('features.customizedDashboard.carousel.card4.rightSide.smartSuggestions.description')}</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center justify-center">
                          <div className="w-2 h-2 bg-orange-500 rounded-full mr-2 animate-pulse"></div>
                          {t('features.customizedDashboard.carousel.card4.rightSide.aiLearning')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Duplicate of Card 1 for seamless loop */}
                <div className="w-full flex-shrink-0 px-0.5 sm:px-1 lg:px-2">
                  <div className="flex flex-col lg:flex-row gap-2 sm:gap-4 lg:gap-8 items-start min-h-[280px] sm:min-h-[320px] lg:h-96">
                    <div className="group relative bg-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 hover:shadow-xl transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex flex-col h-full w-full lg:w-1/2">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <Users className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">Role-Based Personalization</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          {t('features.customizedDashboard.carousel.card1.description')}
                        </p>
                      </div>
                    </div>
                    <div className="w-full lg:w-1/2 bg-white rounded-2xl shadow-lg p-4 sm:p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">{t('features.customizedDashboard.carousel.card1.rightSide.title')}</div>
                      <div className="space-y-4">
                        <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
                          <div className="text-xs font-medium text-blue-700 mb-1">{t('features.customizedDashboard.carousel.card1.rightSide.teacher.title')}</div>
                          <div className="text-sm text-gray-700">{t('features.customizedDashboard.carousel.card1.rightSide.teacher.description')}</div>
                          <div className="text-xs text-gray-500 mt-1">{t('features.customizedDashboard.carousel.card1.rightSide.teacher.features')}</div>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-400">
                          <div className="text-xs font-medium text-green-700 mb-1">{t('features.customizedDashboard.carousel.card1.rightSide.parent.title')}</div>
                          <div className="text-sm text-gray-700">{t('features.customizedDashboard.carousel.card1.rightSide.parent.description')}</div>
                          <div className="text-xs text-gray-500 mt-1">{t('features.customizedDashboard.carousel.card1.rightSide.parent.features')}</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center">
                          <div className="w-2 h-2 bg-purple-500 rounded-full mr-2 animate-pulse"></div>
                          {t('features.customizedDashboard.carousel.card1.rightSide.autoConfigured')}
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
        {/* Features Grid */}
        <section className="mb-24">
          <div className="text-center mb-16">
            <div className="mb-2">
              <h3 className="text-xl font-medium text-[#4a90e2]" style={{ fontFamily: 'Kalam, Comic Sans MS, cursive' }}>{t('features.customizedDashboard.decisionMakers.sectionTitle')}</h3>
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 px-6">
              {t('features.customizedDashboard.decisionMakers.title')}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                title: t('features.customizedDashboard.decisionMakers.forTeachers.title'),
                description: t('features.customizedDashboard.decisionMakers.forTeachers.description'),
                icon: BookOpen,
                iconColor: "text-blue-600",
                iconBg: "bg-blue-100",
                graphic: (
                  <div className="mt-6 bg-gray-50 rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-700 mb-3">{t('features.customizedDashboard.decisionMakers.forTeachers.dashboardView')}</div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Calendar className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="text-sm text-gray-700">{t('features.customizedDashboard.decisionMakers.forTeachers.todaySchedule')}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                          <AlertTriangle className="w-4 h-4 text-orange-600" />
                        </div>
                        <span className="text-sm text-gray-700">{t('features.customizedDashboard.decisionMakers.forTeachers.studentsNeedAttention')}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        </div>
                        <span className="text-sm text-gray-700">{t('features.customizedDashboard.decisionMakers.forTeachers.lessonPlansUpToDate')}</span>
                      </div>
                    </div>
                  </div>
                )
              },
              {
                title: t('features.customizedDashboard.decisionMakers.forStudents.title'),
                description: t('features.customizedDashboard.decisionMakers.forStudents.description'),
                icon: Users,
                iconColor: "text-green-600",
                iconBg: "bg-green-100",
                graphic: (
                  <div className="mt-6 bg-gray-50 rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-700 mb-3">{t('features.customizedDashboard.decisionMakers.forStudents.priorityView')}</div>
                    <div className="space-y-3">
                      <div className="bg-red-50 border-l-4 border-red-400 p-2 rounded">
                        <div className="text-xs font-medium text-red-700">{t('features.customizedDashboard.decisionMakers.forStudents.urgentTask')}</div>
                      </div>
                      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-2 rounded">
                        <div className="text-xs font-medium text-yellow-700">{t('features.customizedDashboard.decisionMakers.forStudents.upcomingTest')}</div>
                      </div>
                      <div className="bg-green-50 border-l-4 border-green-400 p-2 rounded">
                        <div className="text-xs font-medium text-green-700">{t('features.customizedDashboard.decisionMakers.forStudents.completedTask')}</div>
                      </div>
                    </div>
                  </div>
                )
              },
              {
                title: t('features.customizedDashboard.decisionMakers.forParents.title'),
                description: t('features.customizedDashboard.decisionMakers.forParents.description'),
                icon: Users,
                iconColor: "text-purple-600",
                iconBg: "bg-purple-100",
                graphic: (
                  <div className="mt-6 bg-gray-50 rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-700 mb-3">{t('features.customizedDashboard.decisionMakers.forParents.overview')}</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-blue-50 p-2 rounded text-center">
                        <div className="font-medium text-blue-700">{t('features.customizedDashboard.decisionMakers.forParents.attendance.label')}</div>
                        <div className="text-blue-600">{t('features.customizedDashboard.decisionMakers.forParents.attendance.value')}</div>
                      </div>
                      <div className="bg-green-50 p-2 rounded text-center">
                        <div className="font-medium text-green-700">{t('features.customizedDashboard.decisionMakers.forParents.avgGrade.label')}</div>
                        <div className="text-green-600">{t('features.customizedDashboard.decisionMakers.forParents.avgGrade.value')}</div>
                      </div>
                      <div className="bg-purple-50 p-2 rounded text-center">
                        <div className="font-medium text-purple-700">{t('features.customizedDashboard.decisionMakers.forParents.messages.label')}</div>
                        <div className="text-purple-600">{t('features.customizedDashboard.decisionMakers.forParents.messages.value')}</div>
                      </div>
                      <div className="bg-orange-50 p-2 rounded text-center">
                        <div className="font-medium text-orange-700">{t('features.customizedDashboard.decisionMakers.forParents.events.label')}</div>
                        <div className="text-orange-600">{t('features.customizedDashboard.decisionMakers.forParents.events.value')}</div>
                      </div>
                    </div>
                  </div>
                )
              },
              {
                title: t('features.customizedDashboard.decisionMakers.forAdministrators.title'),
                description: t('features.customizedDashboard.decisionMakers.forAdministrators.description'),
                icon: BarChart3,
                iconColor: "text-orange-600",
                iconBg: "bg-orange-100",
                graphic: (
                  <div className="mt-6 bg-gray-50 rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-700 mb-3">{t('features.customizedDashboard.decisionMakers.forAdministrators.analytics')}</div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">{t('features.customizedDashboard.decisionMakers.forAdministrators.schoolAttendance.label')}</span>
                        <span className="text-xs font-medium text-green-600">{t('features.customizedDashboard.decisionMakers.forAdministrators.schoolAttendance.value')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">{t('features.customizedDashboard.decisionMakers.forAdministrators.teacherSatisfaction.label')}</span>
                        <span className="text-xs font-medium text-blue-600">{t('features.customizedDashboard.decisionMakers.forAdministrators.teacherSatisfaction.value')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">{t('features.customizedDashboard.decisionMakers.forAdministrators.activeAlerts.label')}</span>
                        <span className="text-xs font-medium text-orange-600">{t('features.customizedDashboard.decisionMakers.forAdministrators.activeAlerts.value')}</span>
                      </div>
                    </div>
                  </div>
                )
              }
            ].map((feature, index) => (
              <div key={index} className="group bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-gray-200 transition-all duration-300">
                <div className="flex items-start space-x-4 mb-4">
                  <div className={`w-12 h-12 ${feature.iconBg} rounded-full flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 group-hover:shadow-lg transition-all duration-500 ease-out`}>
                    <feature.icon className={`w-6 h-6 ${feature.iconColor} group-hover:scale-110 transition-transform duration-500`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
                  </div>
                </div>
                {feature.graphic}
              </div>
            ))}
          </div>
        </section>

        {/* Features That Work Section */}
        <section className="mb-24">
          <div className="text-center mb-16">
            <div className="mb-2">
              <h3 className="text-xl font-medium text-[#4a90e2]" style={{ fontFamily: 'Kalam, Comic Sans MS, cursive' }}>{t('features.customizedDashboard.featuresThatWork.sectionTitle')}</h3>
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 px-6">
              {t('features.customizedDashboard.featuresThatWork.title')}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                title: t('features.customizedDashboard.featuresThatWork.modularDesign.title'),
                description: t('features.customizedDashboard.featuresThatWork.modularDesign.description'),
                icon: Layout,
                iconColor: "text-blue-600",
                iconBg: "bg-blue-100"
              },
              {
                title: t('features.customizedDashboard.featuresThatWork.smartNotifications.title'),
                description: t('features.customizedDashboard.featuresThatWork.smartNotifications.description'),
                icon: Bell,
                iconColor: "text-orange-600",
                iconBg: "bg-orange-100"
              },
              {
                title: t('features.customizedDashboard.featuresThatWork.quickAction.title'),
                description: t('features.customizedDashboard.featuresThatWork.quickAction.description'),
                icon: Zap,
                iconColor: "text-purple-600",
                iconBg: "bg-purple-100"
              },
              {
                title: t('features.customizedDashboard.featuresThatWork.performanceSnapshot.title'),
                description: t('features.customizedDashboard.featuresThatWork.performanceSnapshot.description'),
                icon: BarChart3,
                iconColor: "text-green-600",
                iconBg: "bg-green-100"
              }
            ].map((feature, index) => (
              <div key={index} className="group bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-gray-200 transition-all duration-300">
                <div className="flex items-start space-x-4">
                  <div className={`w-12 h-12 ${feature.iconBg} rounded-full flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 group-hover:shadow-lg transition-all duration-500 ease-out`}>
                    <feature.icon className={`w-6 h-6 ${feature.iconColor} group-hover:scale-110 transition-transform duration-500`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Designed for Real Life Section */}
        <section className="mb-24">
          <div className="text-center mb-16">
            <div className="mb-2">
              <h3 className="text-xl font-medium text-[#4a90e2]" style={{ fontFamily: 'Kalam, Comic Sans MS, cursive' }}>{t('features.customizedDashboard.realLife.sectionTitle')}</h3>
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 px-6">
              {t('features.customizedDashboard.realLife.title')}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                title: t('features.customizedDashboard.realLife.crossPlatform.title'),
                description: t('features.customizedDashboard.realLife.crossPlatform.description'),
                icon: Smartphone,
                iconColor: "text-blue-600",
                iconBg: "bg-blue-100"
              },
              {
                title: t('features.customizedDashboard.realLife.focusFriendly.title'),
                description: t('features.customizedDashboard.realLife.focusFriendly.description'),
                icon: Eye,
                iconColor: "text-purple-600",
                iconBg: "bg-purple-100"
              },
              {
                title: t('features.customizedDashboard.realLife.messaging.title'),
                description: t('features.customizedDashboard.realLife.messaging.description'),
                icon: MessageSquare,
                iconColor: "text-green-600",
                iconBg: "bg-green-100"
              },
              {
                title: t('features.customizedDashboard.realLife.localization.title'),
                description: t('features.customizedDashboard.realLife.localization.description'),
                icon: Globe,
                iconColor: "text-orange-600",
                iconBg: "bg-orange-100"
              }
            ].map((feature, index) => (
              <div key={index} className="group bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-gray-200 transition-all duration-300">
                <div className="flex items-start space-x-4">
                  <div className={`w-12 h-12 ${feature.iconBg} rounded-full flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 group-hover:shadow-lg transition-all duration-500 ease-out`}>
                    <feature.icon className={`w-6 h-6 ${feature.iconColor} group-hover:scale-110 transition-transform duration-500`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Benefits for Your Institution */}
        <section className="mb-24">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <div className="mb-2">
                <h3 className="text-xl font-medium text-[#4a90e2]" style={{ fontFamily: 'Kalam, Comic Sans MS, cursive' }}>{t('features.customizedDashboard.benefits.sectionTitle')}</h3>
              </div>
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 px-6">
                {t('features.customizedDashboard.benefits.title')}
              </h2>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-6">
                <div className="group rounded-2xl border-2 border-gray-200 bg-white p-6 hover:border-purple-400 hover:bg-purple-50/30 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 cursor-pointer min-h-[140px] flex items-center">
                  <div className="flex items-start space-x-4 w-full">
                    <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <MessageSquare className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors duration-300">{t('features.customizedDashboard.benefits.communication.title')}</h3>
                      <p className="text-gray-700 text-sm">{t('features.customizedDashboard.benefits.communication.description')}</p>
                    </div>
                  </div>
                </div>

                <div className="group rounded-2xl border-2 border-gray-200 bg-white p-6 hover:border-blue-400 hover:bg-blue-50/30 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 cursor-pointer min-h-[140px] flex items-center">
                  <div className="flex items-start space-x-4 w-full">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors duration-300">{t('features.customizedDashboard.benefits.decisionMaking.title')}</h3>
                      <p className="text-gray-700 text-sm">{t('features.customizedDashboard.benefits.decisionMaking.description')}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <div className="group rounded-2xl border-2 border-gray-200 bg-white p-6 hover:border-green-400 hover:bg-green-50/30 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 cursor-pointer min-h-[140px] flex items-center">
                  <div className="flex items-start space-x-4 w-full">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-green-600 transition-colors duration-300">{t('features.customizedDashboard.benefits.platformFatigue.title')}</h3>
                      <p className="text-gray-700 text-sm">{t('features.customizedDashboard.benefits.platformFatigue.description')}</p>
                    </div>
                  </div>
                </div>

                <div className="group rounded-2xl border-2 border-gray-200 bg-white p-6 hover:border-orange-400 hover:bg-orange-50/30 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 cursor-pointer min-h-[140px] flex items-center">
                  <div className="flex items-start space-x-4 w-full">
                    <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors duration-300">{t('features.customizedDashboard.benefits.accountability.title')}</h3>
                      <p className="text-gray-700 text-sm">{t('features.customizedDashboard.benefits.accountability.description')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* CTA Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">
        <section className="text-center py-12 sm:py-16 lg:py-20 bg-gradient-to-r from-primary/10 to-purple-600/10 rounded-2xl sm:rounded-3xl">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6 px-4 sm:px-6">
            {t('features.customizedDashboard.cta.title')}
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto mb-6 sm:mb-8 px-4">
            {t('features.customizedDashboard.cta.description')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
            <a href={`${appUrl}/auth?lang=${language}`} className="w-full sm:w-auto">
              <Button size="lg" className="text-sm sm:text-base px-6 sm:px-8 w-full sm:w-auto">
                {t('features.customizedDashboard.cta.startTrial')}
              </Button>
            </a>
            <Button variant="outline" size="lg" className="text-sm sm:text-base px-6 sm:px-8 w-full sm:w-auto">
              {t('features.customizedDashboard.cta.demo')}
            </Button>
          </div>
        </section>
      </main>

      <Footer />
      </div>
    </>
  )
}