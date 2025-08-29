"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FileText, Users, BarChart3, Target, Check, Bell, ChevronLeft, ChevronRight, Activity, MessageSquare, BookOpen, Mail, Smartphone, BellRing, CheckCircle, AlertTriangle, ArrowRight, Zap, TrendingUp, Clock, Globe } from "lucide-react"
import { useState, useEffect } from "react"
import Header from "@/components/shared/Header"
import Footer from "@/components/shared/Footer"
import { useTranslation } from "@/hooks/useTranslation"
import { languages } from "@/locales"

// TypeScript interfaces for array items - these are used for casting translation arrays

export default function AIReportCardsPage() {
  const { t, language } = useTranslation()
  
  // Access array data directly from translations
  const translations = languages[language]
  const [appUrl, setAppUrl] = useState("https://app.classraum.com")
  const [currentCard, setCurrentCard] = useState(0)

  // Set the correct app URL based on environment
  useEffect(() => {
    if (window.location.hostname === 'localhost') {
      const { protocol, port } = window.location
      setAppUrl(`${protocol}//app.localhost${port ? ':' + port : ''}`)
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
    <div className="min-h-screen bg-background">
      <Header currentPage="features" />

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        {/* Hero */}
        <div className="text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-600 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8">
            <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
          
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-3 sm:mb-4">
            {t('features.aiReportCards.title')}
          </h1>
          
          <p className="text-lg sm:text-xl text-[#4a90e2] font-medium mb-3 sm:mb-4">
            {t('features.aiReportCards.subtitle')}
          </p>
          
          <p className="text-base sm:text-lg text-[#163e64] max-w-3xl mx-auto mb-12 sm:mb-16 lg:mb-24">
            {t('features.aiReportCards.description')}
          </p>
        </div>
      </main>

      {/* Why It Stands Out Section */}
      <section className="bg-gradient-to-br from-gray-900 to-slate-800 py-24 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-24">
            <div className="mb-2">
              <h3 className="text-xl font-medium text-[#4a90e2]" style={{ fontFamily: 'Kalam, Comic Sans MS, cursive' }}>{t('features.aiReportCards.standsOut.sectionTitle')}</h3>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6">
              {t('features.aiReportCards.standsOut.title')}
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

                {/* Card 1: Real-Time Performance Analytics */}
                <div className="w-full flex-shrink-0 px-0.5 sm:px-1 lg:px-2">
                  <div className="flex flex-col lg:flex-row gap-2 sm:gap-4 lg:gap-8 items-start min-h-[280px] sm:min-h-[320px] lg:h-96">
                    <div className="group relative bg-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 hover:shadow-xl transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex flex-col h-full w-full lg:w-1/2">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <Activity className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">{t('features.aiReportCards.standsOut.realTimeAnalytics.title')}</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          {t('features.aiReportCards.standsOut.realTimeAnalytics.description')}
                        </p>
                      </div>
                    </div>
                    <div className="w-full lg:w-1/2 bg-white rounded-2xl shadow-lg p-4 sm:p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">{t('features.aiReportCards.standsOut.realTimeAnalytics.dashboardTitle')}</div>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">{t('features.aiReportCards.standsOut.realTimeAnalytics.subjects.mathematics')}</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-20 h-2 bg-gray-200 rounded-full">
                              <div className="bg-blue-500 h-2 rounded-full animate-pulse" style={{width: '85%'}}></div>
                            </div>
                            <span className="text-sm font-bold text-blue-600">85%</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">{t('features.aiReportCards.standsOut.realTimeAnalytics.subjects.readingComprehension')}</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-20 h-2 bg-gray-200 rounded-full">
                              <div className="bg-green-500 h-2 rounded-full animate-pulse" style={{width: '92%', animationDelay: '0.5s'}}></div>
                            </div>
                            <span className="text-sm font-bold text-green-600">92%</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">{t('features.aiReportCards.standsOut.realTimeAnalytics.subjects.criticalThinking')}</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-20 h-2 bg-gray-200 rounded-full">
                              <div className="bg-purple-500 h-2 rounded-full animate-pulse" style={{width: '78%', animationDelay: '1s'}}></div>
                            </div>
                            <span className="text-sm font-bold text-purple-600">78%</span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                          {t('features.aiReportCards.standsOut.realTimeAnalytics.liveUpdates')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 2: Personalized AI Feedback */}
                <div className="w-full flex-shrink-0 px-0.5 sm:px-1 lg:px-2">
                  <div className="flex flex-col lg:flex-row gap-2 sm:gap-4 lg:gap-8 items-start min-h-[280px] sm:min-h-[320px] lg:h-96">
                    <div className="group relative bg-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 hover:shadow-xl transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex flex-col h-full w-full lg:w-1/2">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-teal-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <MessageSquare className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">{t('features.aiReportCards.standsOut.personalizedFeedback.title')}</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          {t('features.aiReportCards.standsOut.personalizedFeedback.description')}
                        </p>
                      </div>
                    </div>
                    <div className="w-full lg:w-1/2 bg-white rounded-2xl shadow-lg p-4 sm:p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">{t('features.aiReportCards.standsOut.personalizedFeedback.exampleTitle')}</div>
                      <div className="space-y-4">
                        <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                          <div className="text-xs font-medium text-blue-700 mb-1">{t('features.aiReportCards.standsOut.personalizedFeedback.student')}: Emma Rodriguez</div>
                          <div className="text-sm text-gray-700 leading-relaxed">
                            &quot;{t('features.aiReportCards.standsOut.personalizedFeedback.exampleComment')}&quot;
                          </div>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg">
                          <div className="text-xs font-medium text-green-700 mb-1">{t('features.aiReportCards.standsOut.personalizedFeedback.personalizationFactors')}</div>
                          <div className="text-xs text-green-600 space-y-1">
                            <div>{t('features.aiReportCards.standsOut.personalizedFeedback.factors.learningStyle')}</div>
                            <div>{t('features.aiReportCards.standsOut.personalizedFeedback.factors.improvementTrend')}</div>
                            <div>{t('features.aiReportCards.standsOut.personalizedFeedback.factors.challengeLevel')}</div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 flex items-center">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                          {t('features.aiReportCards.standsOut.personalizedFeedback.generatedTime')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 3: Subject & Skill Breakdown */}
                <div className="w-full flex-shrink-0 px-0.5 sm:px-1 lg:px-2">
                  <div className="flex flex-col lg:flex-row gap-2 sm:gap-4 lg:gap-8 items-start min-h-[280px] sm:min-h-[320px] lg:h-96">
                    <div className="group relative bg-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 hover:shadow-xl transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex flex-col h-full w-full lg:w-1/2">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <BookOpen className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">{t('features.aiReportCards.standsOut.subjectBreakdown.title')}</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          {t('features.aiReportCards.standsOut.subjectBreakdown.description')}
                        </p>
                      </div>
                    </div>
                    <div className="w-full lg:w-1/2 bg-white rounded-2xl shadow-lg p-4 sm:p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">{t('features.aiReportCards.standsOut.subjectBreakdown.breakdownTitle')}</div>
                      <div className="space-y-4">
                        <div className="border-b pb-3">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-700">{t('features.aiReportCards.standsOut.subjectBreakdown.subjects.mathematics')}</span>
                            <span className="text-sm font-bold text-blue-600">87%</span>
                          </div>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-600">{t('features.aiReportCards.standsOut.subjectBreakdown.subjects.problemSolving')}</span>
                              <span className="text-green-600 font-medium">92%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">{t('features.aiReportCards.standsOut.subjectBreakdown.subjects.numberSense')}</span>
                              <span className="text-blue-600 font-medium">85%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">{t('features.aiReportCards.standsOut.subjectBreakdown.subjects.mathematicalReasoning')}</span>
                              <span className="text-orange-600 font-medium">78%</span>
                            </div>
                          </div>
                        </div>
                        <div className="border-b pb-3">
                          <div className="text-xs font-medium text-gray-700 mb-2">{t('features.aiReportCards.standsOut.subjectBreakdown.softSkillsTitle')}</div>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-600">{t('features.aiReportCards.standsOut.subjectBreakdown.softSkills.collaboration')}</span>
                              <span className="text-green-600 font-medium">{t('features.aiReportCards.standsOut.subjectBreakdown.skillLevels.excellent')}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">{t('features.aiReportCards.standsOut.subjectBreakdown.softSkills.criticalThinking')}</span>
                              <span className="text-blue-600 font-medium">{t('features.aiReportCards.standsOut.subjectBreakdown.skillLevels.good')}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">{t('features.aiReportCards.standsOut.subjectBreakdown.softSkills.timeManagement')}</span>
                              <span className="text-yellow-600 font-medium">{t('features.aiReportCards.standsOut.subjectBreakdown.skillLevels.developing')}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {t('features.aiReportCards.standsOut.subjectBreakdown.nextSteps')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 4: Multi-Audience View */}
                <div className="w-full flex-shrink-0 px-0.5 sm:px-1 lg:px-2">
                  <div className="flex flex-col lg:flex-row gap-2 sm:gap-4 lg:gap-8 items-start min-h-[280px] sm:min-h-[320px] lg:h-96">
                    <div className="group relative bg-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 hover:shadow-xl transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex flex-col h-full w-full lg:w-1/2">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-red-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <Users className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">{t('features.aiReportCards.standsOut.multiAudienceView.title')}</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          {t('features.aiReportCards.standsOut.multiAudienceView.description')}
                        </p>
                      </div>
                    </div>
                    <div className="w-full lg:w-1/2 bg-white rounded-2xl shadow-lg p-4 sm:p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">{t('features.aiReportCards.standsOut.multiAudienceView.dashboardTitle')}</div>
                      <div className="space-y-3">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-blue-700 mb-1">{t('features.aiReportCards.standsOut.multiAudienceView.views.teacherView')}</div>
                          <div className="text-xs text-blue-600">{t('features.aiReportCards.standsOut.multiAudienceView.views.teacherDescription')}</div>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-green-700 mb-1">{t('features.aiReportCards.standsOut.multiAudienceView.views.parentView')}</div>
                          <div className="text-xs text-green-600">{t('features.aiReportCards.standsOut.multiAudienceView.views.parentDescription')}</div>
                        </div>
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-purple-700 mb-1">{t('features.aiReportCards.standsOut.multiAudienceView.views.studentView')}</div>
                          <div className="text-xs text-purple-600">{t('features.aiReportCards.standsOut.multiAudienceView.views.studentDescription')}</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center justify-center">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                          <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                          {t('features.aiReportCards.standsOut.multiAudienceView.tailoredNote')}
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
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <Activity className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">Real-Time Performance Analytics</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          No more waiting until the end of the term. Track academic performance continuously, with up-to-date insights that reflect each student&apos;s growth and challenges as they happen.
                        </p>
                      </div>
                    </div>
                    <div className="w-full lg:w-1/2 bg-white rounded-2xl shadow-lg p-4 sm:p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">{t('features.aiReportCards.standsOut.realTimeAnalytics.dashboardTitle')}</div>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">{t('features.aiReportCards.standsOut.realTimeAnalytics.subjects.mathematics')}</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-20 h-2 bg-gray-200 rounded-full">
                              <div className="bg-blue-500 h-2 rounded-full animate-pulse" style={{width: '85%'}}></div>
                            </div>
                            <span className="text-sm font-bold text-blue-600">85%</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">{t('features.aiReportCards.standsOut.realTimeAnalytics.subjects.readingComprehension')}</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-20 h-2 bg-gray-200 rounded-full">
                              <div className="bg-green-500 h-2 rounded-full animate-pulse" style={{width: '92%', animationDelay: '0.5s'}}></div>
                            </div>
                            <span className="text-sm font-bold text-green-600">92%</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">{t('features.aiReportCards.standsOut.realTimeAnalytics.subjects.criticalThinking')}</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-20 h-2 bg-gray-200 rounded-full">
                              <div className="bg-purple-500 h-2 rounded-full animate-pulse" style={{width: '78%', animationDelay: '1s'}}></div>
                            </div>
                            <span className="text-sm font-bold text-purple-600">78%</span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                          {t('features.aiReportCards.standsOut.realTimeAnalytics.liveUpdates')}
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
              <h3 className="text-xl font-medium text-[#4a90e2]" style={{ fontFamily: 'Kalam, Comic Sans MS, cursive' }}>{t('features.aiReportCards.features.sectionTitle')}</h3>
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 px-6">
              {t('features.aiReportCards.features.title')}
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: t('features.aiReportCards.features.automatedInsight.title'),
                description: t('features.aiReportCards.features.automatedInsight.description'),
                icon: BarChart3,
                iconColor: "text-blue-600",
                iconBg: "bg-blue-100",
                graphic: (
                  <div className="mt-6 bg-gray-50 rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-700 mb-3">{t('features.aiReportCards.features.automatedInsight.insights.title')}</div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 group-hover:bg-green-200 transition-all duration-300 ease-out">
                          <CheckCircle className="w-4 h-4 text-green-600 group-hover:text-green-700" />
                        </div>
                        <span className="text-sm text-gray-700">{t('features.aiReportCards.features.automatedInsight.insights.strong')}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:animate-pulse group-hover:bg-orange-200 transition-all duration-300 ease-out">
                          <AlertTriangle className="w-4 h-4 text-orange-600 group-hover:text-orange-700" />
                        </div>
                        <span className="text-sm text-gray-700">{t('features.aiReportCards.features.automatedInsight.insights.needsHelp')}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-200 transition-all duration-300 ease-out">
                          <ArrowRight className="w-4 h-4 text-blue-600 group-hover:text-blue-700 group-hover:translate-x-1 transition-transform duration-300" />
                        </div>
                        <span className="text-sm text-gray-700">{t('features.aiReportCards.features.automatedInsight.insights.practice')}</span>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{t('features.aiReportCards.features.automatedInsight.insights.status')}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-sm font-medium text-green-600">{t('features.aiReportCards.features.automatedInsight.insights.active')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              },
              {
                title: t('features.aiReportCards.features.instantSharing.title'),
                description: t('features.aiReportCards.features.instantSharing.description'),
                icon: Bell,
                iconColor: "text-green-600",
                iconBg: "bg-green-100",
                graphic: (
                  <div className="mt-6 bg-gray-50 rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-700 mb-3">{t('features.aiReportCards.features.instantSharing.distributionTitle')}</div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 group-hover:bg-blue-200 transition-all duration-300 ease-out">
                            <Mail className="w-4 h-4 text-blue-600 group-hover:text-blue-700" />
                          </div>
                          <span className="text-sm text-gray-700">{t('features.aiReportCards.features.instantSharing.channels.email')}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <CheckCircle className="w-4 h-4 text-green-600 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300" />
                          <span className="text-sm font-medium text-green-600">{t('features.aiReportCards.features.instantSharing.statuses.sent')}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:-rotate-3 group-hover:bg-purple-200 transition-all duration-300 ease-out">
                            <Smartphone className="w-4 h-4 text-purple-600 group-hover:text-purple-700" />
                          </div>
                          <span className="text-sm text-gray-700">{t('features.aiReportCards.features.instantSharing.channels.sms')}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <CheckCircle className="w-4 h-4 text-green-600 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300" />
                          <span className="text-sm font-medium text-green-600">{t('features.aiReportCards.features.instantSharing.statuses.delivered')}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:bg-orange-200 transition-all duration-300 ease-out">
                            <BellRing className="w-4 h-4 text-orange-600 group-hover:text-orange-700 transition-all duration-75 origin-top group-hover:-rotate-6" 
                              style={{
                                transformOrigin: 'top center',
                                animationName: 'wiggle',
                                animationDuration: '0.3s',
                                animationIterationCount: 'infinite',
                                animationDirection: 'alternate',
                                animationTimingFunction: 'ease-in-out'
                              }}
                            />
                          </div>
                          <span className="text-sm text-gray-700">{t('features.aiReportCards.features.instantSharing.channels.appPush')}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <CheckCircle className="w-4 h-4 text-blue-600 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300" />
                          <span className="text-sm font-medium text-blue-600">{t('features.aiReportCards.features.instantSharing.statuses.read')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              },
              {
                title: t('features.aiReportCards.features.historicalTracking.title'),
                description: t('features.aiReportCards.features.historicalTracking.description'),
                icon: Target,
                iconColor: "text-purple-600",
                iconBg: "bg-purple-100",
                graphic: (
                  <div className="mt-6 bg-gray-50 rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-700 mb-3">{t('features.aiReportCards.features.historicalTracking.timelineTitle')}</div>
                    <div className="flex items-end space-x-2 h-12 mb-3">
                      {[60, 68, 75, 82, 87, 91].map((height, i) => (
                        <div key={i} className="bg-gradient-to-t from-purple-400 to-purple-600 rounded-t flex-1" style={{height: `${height}%`}}></div>
                      ))}
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mb-3">
                      <span>Sep 2023</span>
                      <span>Feb 2024</span>
                    </div>
                    <div className="pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{t('features.aiReportCards.features.historicalTracking.progressLabel')}</span>
                        <div className="flex items-center space-x-1">
                          <ArrowRight className="w-3 h-3 text-green-600 rotate-[-45deg] group-hover:scale-125 group-hover:rotate-[-30deg] transition-all duration-300" />
                          <span className="text-sm font-medium text-green-600">+31%</span>
                        </div>
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

        {/* Comparison Table */}
        <section className="mb-24">
          <div className="text-center mb-16">
            <div className="mb-2">
              <h3 className="text-xl font-medium text-[#4a90e2]" style={{ fontFamily: 'Kalam, Comic Sans MS, cursive' }}>{t('features.aiReportCards.comparison.sectionTitle')}</h3>
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 px-6">
              {t('features.aiReportCards.comparison.title')}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* The Old Way */}
            <div className="bg-gray-100 rounded-3xl p-8 border-2 border-gray-200">
              <h3 className="text-2xl font-extrabold text-gray-800 mb-8 text-center">{t('features.aiReportCards.comparison.otherPlatforms')}</h3>
              <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <div className="space-y-4">
                  {(translations.features?.aiReportCards?.comparison?.oldWay as unknown as string[] || []).map((item: string, index: number) => (
                    <div key={index} className="flex items-start space-x-4">
                      <div className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-white text-sm">✗</span>
                      </div>
                      <span className="text-gray-700 font-medium">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* The CLASSRAUM Way */}
            <div className="bg-blue-600 rounded-3xl p-8 border border-blue-200 shadow-lg">
                <h3 className="text-2xl font-extrabold text-white mb-8 text-center">{t('features.aiReportCards.comparison.classraum')}</h3>
                
                <div className="bg-white rounded-2xl p-6 mb-6">
                  <div className="space-y-4">
                    {(translations.features?.aiReportCards?.comparison?.newWay as unknown as string[] || []).map((item: string, index: number) => (
                      <div key={index} className="flex items-start space-x-4">
                        <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-1">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-gray-700 font-medium">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Link href={appUrl} className="block">
                  <div className="bg-black text-white text-center py-4 px-6 rounded-xl font-semibold hover:bg-gray-900 transition-colors cursor-pointer">
                    {t('features.aiReportCards.comparison.getStarted')}
                  </div>
                </Link>
            </div>
          </div>
        </section>

        {/* Benefits for Your Institution */}
        <section className="mb-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 px-6">
                {t('features.aiReportCards.benefits.title')}
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                {t('features.aiReportCards.benefits.subtitle')}
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-6">
                <div className="group rounded-2xl border-2 border-gray-200 bg-white p-6 hover:border-blue-400 hover:bg-blue-50/30 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 cursor-pointer min-h-[140px] flex items-center">
                  <div className="flex items-start space-x-4 w-full">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <Zap className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors duration-300">{t('features.aiReportCards.benefits.items.0.title')}</h3>
                      <p className="text-gray-700 text-sm">{t('features.aiReportCards.benefits.items.0.description')}</p>
                    </div>
                  </div>
                </div>

                <div className="group rounded-2xl border-2 border-gray-200 bg-white p-6 hover:border-green-400 hover:bg-green-50/30 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 cursor-pointer min-h-[140px] flex items-center">
                  <div className="flex items-start space-x-4 w-full">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-green-600 transition-colors duration-300">{t('features.aiReportCards.benefits.items.1.title')}</h3>
                      <p className="text-gray-700 text-sm">{t('features.aiReportCards.benefits.items.1.description')}</p>
                    </div>
                  </div>
                </div>

                <div className="group rounded-2xl border-2 border-gray-200 bg-white p-6 hover:border-purple-400 hover:bg-purple-50/30 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 cursor-pointer min-h-[140px] flex items-center">
                  <div className="flex items-start space-x-4 w-full">
                    <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <Users className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors duration-300">{t('features.aiReportCards.benefits.items.2.title')}</h3>
                      <p className="text-gray-700 text-sm">{t('features.aiReportCards.benefits.items.2.description')}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <div className="group rounded-2xl border-2 border-gray-200 bg-white p-6 hover:border-orange-400 hover:bg-orange-50/30 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 cursor-pointer min-h-[140px] flex items-center">
                  <div className="flex items-start space-x-4 w-full">
                    <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors duration-300">{t('features.aiReportCards.benefits.items.3.title')}</h3>
                      <p className="text-gray-700 text-sm">{t('features.aiReportCards.benefits.items.3.description')}</p>
                    </div>
                  </div>
                </div>

                <div className="group rounded-2xl border-2 border-gray-200 bg-white p-6 hover:border-cyan-400 hover:bg-cyan-50/30 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 cursor-pointer min-h-[140px] flex items-center">
                  <div className="flex items-start space-x-4 w-full">
                    <div className="w-12 h-12 bg-cyan-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <Clock className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-cyan-600 transition-colors duration-300">{t('features.aiReportCards.benefits.items.4.title')}</h3>
                      <p className="text-gray-700 text-sm">{t('features.aiReportCards.benefits.items.4.description')}</p>
                    </div>
                  </div>
                </div>

                <div className="group rounded-2xl border-2 border-gray-200 bg-white p-6 hover:border-indigo-400 hover:bg-indigo-50/30 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 cursor-pointer min-h-[140px] flex items-center">
                  <div className="flex items-start space-x-4 w-full">
                    <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <Globe className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors duration-300">{t('features.aiReportCards.benefits.items.5.title')}</h3>
                      <p className="text-gray-700 text-sm">{t('features.aiReportCards.benefits.items.5.description')}</p>
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
        <section className="text-center py-12 sm:py-16 lg:py-20 bg-gradient-to-r from-primary/10 to-blue-600/10 rounded-2xl sm:rounded-3xl">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6 px-4 sm:px-6">
            {t('features.aiReportCards.cta.title')}
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto mb-6 sm:mb-8 px-4">
            {t('features.aiReportCards.cta.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
            <a href={`${appUrl}/dashboard`} className="w-full sm:w-auto">
              <Button size="lg" className="text-sm sm:text-base px-6 sm:px-8 w-full sm:w-auto">
                {t('features.aiReportCards.cta.startTrial')}
              </Button>
            </a>
            <Button variant="outline" size="lg" className="text-sm sm:text-base px-6 sm:px-8 w-full sm:w-auto">
              {t('features.aiReportCards.cta.watchDemo')}
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}