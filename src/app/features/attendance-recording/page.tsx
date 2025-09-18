"use client"

import { Button } from "@/components/ui/button"
import { ClipboardCheck, ChevronLeft, ChevronRight, UserCheck, Activity, Bell, Eye, FileText, BookOpen, Target, BarChart3, Users, Smartphone, Shield, TrendingUp, PlusCircle, AlertTriangle, MessageSquare, Clock } from "lucide-react"
import React, { useState, useEffect } from "react"
import Header from "@/components/shared/Header"
import Footer from "@/components/shared/Footer"
import { useTranslation } from "@/hooks/useTranslation"
import { languages } from "@/locales"

// TypeScript interfaces for array items
interface FeatureItem {
  title: string
  description: string
  graphic?: {
    title: string
    photosynthesis?: string
    video?: string
    objective?: string
    loggedTime?: string
    lessonPlan?: string
    material?: string
    assignment?: string
    due?: string
    resourcesLinked?: string
    resources?: string
    week1?: string
    week6?: string
    coverage?: string
    percentage?: string
    studentPortal?: string
    todaysMaterials?: string
    parentDashboard?: string
    weeklyProgress?: string
    catchUpResources?: string
    autoShared?: string
  }
}

export default function AttendanceRecordingPage() {
  const { t, language } = useTranslation()
  
  // Access array data directly from translations
  const translations = languages[language]
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
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-orange-600 to-red-500 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8">
            <ClipboardCheck className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
          
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-3 sm:mb-4">
            {t('features.attendanceRecording.title')}
          </h1>
          
          <p className="text-xl text-[#4a90e2] font-medium mb-4">
            {t('features.attendanceRecording.subtitle')}
          </p>
          
          <p className="text-base sm:text-lg text-[#163e64] max-w-3xl mx-auto mb-12 sm:mb-16 lg:mb-24">
            {t('features.attendanceRecording.description')}
          </p>
        </div>
      </main>

      {/* Attendance Reimagined Section */}
      <section className="bg-gradient-to-br from-gray-900 to-slate-800 py-24 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16 lg:mb-24">
            <div className="mb-2">
              <h3 className="text-xl font-medium text-[#4a90e2]" style={{ fontFamily: 'Kalam, Comic Sans MS, cursive' }}>{t('features.attendanceRecording.attendanceReimagined.sectionTitle')}</h3>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6">
              {String(t('features.attendanceRecording.attendanceReimagined.title')).includes('실시간') ?
                <>{String(t('features.attendanceRecording.attendanceReimagined.title')).split('실시간')[0]}<span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-500">실시간{String(t('features.attendanceRecording.attendanceReimagined.title')).split('실시간')[1]}</span></> :
                <>{String(t('features.attendanceRecording.attendanceReimagined.title')).split('Real-Time')[0]}<span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-500">Real-Time{String(t('features.attendanceRecording.attendanceReimagined.title')).split('Real-Time')[1]}</span></>
              }
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

                {/* Card 1: One-Tap Attendance Logging */}
                <div className="w-full flex-shrink-0 px-0.5 sm:px-1 lg:px-2">
                  <div className="flex flex-col lg:flex-row gap-2 sm:gap-4 lg:gap-8 items-start min-h-[280px] sm:min-h-[320px] lg:h-96">
                    <div className="group relative bg-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 hover:shadow-xl transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex flex-col h-full w-full lg:w-1/2">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-teal-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <UserCheck className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">{t('features.attendanceRecording.attendanceReimagined.carousel.oneTap.title')}</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          {t('features.attendanceRecording.attendanceReimagined.carousel.oneTap.description')}
                        </p>
                      </div>
                    </div>
                    <div className="w-full lg:w-1/2 bg-white rounded-2xl shadow-lg p-4 sm:p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">{t('features.attendanceRecording.attendanceReimagined.carousel.oneTap.interface.title')}</div>
                      <div className="space-y-4">
                        <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-400">
                          <div className="text-xs font-medium text-green-700 mb-1">{t('features.attendanceRecording.attendanceReimagined.carousel.oneTap.interface.mathClass')}</div>
                          <div className="text-sm text-gray-700">{t('features.attendanceRecording.attendanceReimagined.carousel.oneTap.interface.studentsPresent')}</div>
                          <div className="text-xs text-gray-500 mt-1">{t('features.attendanceRecording.attendanceReimagined.carousel.oneTap.interface.loggedTime')}</div>
                        </div>
                        <div className="bg-orange-50 p-3 rounded-lg border-l-4 border-orange-400">
                          <div className="text-xs font-medium text-orange-700 mb-1">{t('features.attendanceRecording.attendanceReimagined.carousel.oneTap.interface.absentStudents')}</div>
                          <div className="text-sm text-gray-700">Sarah M. • Alex K.</div>
                          <div className="text-xs text-gray-500 mt-1">{t('features.attendanceRecording.attendanceReimagined.carousel.oneTap.interface.parentsNotified')}</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                          {t('features.attendanceRecording.attendanceReimagined.carousel.oneTap.interface.feature')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 2: Auto-Sync with Class Schedules */}
                <div className="w-full flex-shrink-0 px-0.5 sm:px-1 lg:px-2">
                  <div className="flex flex-col lg:flex-row gap-2 sm:gap-4 lg:gap-8 items-start min-h-[280px] sm:min-h-[320px] lg:h-96">
                    <div className="group relative bg-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 hover:shadow-xl transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex flex-col h-full w-full lg:w-1/2">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <Activity className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">{t('features.attendanceRecording.attendanceReimagined.carousel.autoSync.title')}</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          {t('features.attendanceRecording.attendanceReimagined.carousel.autoSync.description')}
                        </p>
                      </div>
                    </div>
                    <div className="w-full lg:w-1/2 bg-white rounded-2xl shadow-lg p-4 sm:p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">{t('features.attendanceRecording.attendanceReimagined.carousel.autoSync.integration.title')}</div>
                      <div className="space-y-3">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-blue-700 mb-1">{t('features.attendanceRecording.attendanceReimagined.carousel.autoSync.integration.todaysClasses')}</div>
                          <div className="text-xs text-blue-600">{t('features.attendanceRecording.attendanceReimagined.carousel.autoSync.integration.autoPopulated')}</div>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-green-700 mb-1">{t('features.attendanceRecording.attendanceReimagined.carousel.autoSync.integration.classRosters')}</div>
                          <div className="text-xs text-green-600">{t('features.attendanceRecording.attendanceReimagined.carousel.autoSync.integration.updatedAutomatically')}</div>
                        </div>
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-purple-700 mb-1">{t('features.attendanceRecording.attendanceReimagined.carousel.autoSync.integration.attendanceRecords')}</div>
                          <div className="text-xs text-purple-600">{t('features.attendanceRecording.attendanceReimagined.carousel.autoSync.integration.syncedAcross')}</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center justify-center">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                          <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                          {t('features.attendanceRecording.attendanceReimagined.carousel.autoSync.integration.noSetup')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 3: Smart Alerts for Absence Trends */}
                <div className="w-full flex-shrink-0 px-0.5 sm:px-1 lg:px-2">
                  <div className="flex flex-col lg:flex-row gap-2 sm:gap-4 lg:gap-8 items-start min-h-[280px] sm:min-h-[320px] lg:h-96">
                    <div className="group relative bg-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 hover:shadow-xl transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex flex-col h-full w-full lg:w-1/2">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <Bell className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">{t('features.attendanceRecording.attendanceReimagined.carousel.smartAlerts.title')}</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          {t('features.attendanceRecording.attendanceReimagined.carousel.smartAlerts.description')}
                        </p>
                      </div>
                    </div>
                    <div className="w-full lg:w-1/2 bg-white rounded-2xl shadow-lg p-4 sm:p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">{t('features.attendanceRecording.attendanceReimagined.carousel.smartAlerts.alertSystem.title')}</div>
                      <div className="space-y-3">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-red-700 mb-1">{t('features.attendanceRecording.attendanceReimagined.carousel.smartAlerts.alertSystem.patternAlert')}</div>
                          <div className="text-xs text-red-600">{t('features.attendanceRecording.attendanceReimagined.carousel.smartAlerts.alertSystem.weeklyAbsences')}</div>
                          <div className="text-xs text-gray-500 mt-1">{t('features.attendanceRecording.attendanceReimagined.carousel.smartAlerts.alertSystem.counselorNotified')}</div>
                        </div>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-yellow-700 mb-1">{t('features.attendanceRecording.attendanceReimagined.carousel.smartAlerts.alertSystem.keyLessonMissed')}</div>
                          <div className="text-xs text-yellow-600">{t('features.attendanceRecording.attendanceReimagined.carousel.smartAlerts.alertSystem.missedTest')}</div>
                          <div className="text-xs text-gray-500 mt-1">{t('features.attendanceRecording.attendanceReimagined.carousel.smartAlerts.alertSystem.teacherFlagged')}</div>
                        </div>
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-orange-700 mb-1">{t('features.attendanceRecording.attendanceReimagined.carousel.smartAlerts.alertSystem.attendanceDrop')}</div>
                          <div className="text-xs text-orange-600">{t('features.attendanceRecording.attendanceReimagined.carousel.smartAlerts.alertSystem.classAverage')}</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center justify-center">
                          <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></div>
                          {t('features.attendanceRecording.attendanceReimagined.carousel.smartAlerts.alertSystem.aiPowered')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 4: Parent & Admin Visibility */}
                <div className="w-full flex-shrink-0 px-0.5 sm:px-1 lg:px-2">
                  <div className="flex flex-col lg:flex-row gap-2 sm:gap-4 lg:gap-8 items-start min-h-[280px] sm:min-h-[320px] lg:h-96">
                    <div className="group relative bg-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 hover:shadow-xl transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex flex-col h-full w-full lg:w-1/2">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-red-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <Eye className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">{t('features.attendanceRecording.attendanceReimagined.carousel.parentVisibility.title')}</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          {t('features.attendanceRecording.attendanceReimagined.carousel.parentVisibility.description')}
                        </p>
                      </div>
                    </div>
                    <div className="w-full lg:w-1/2 bg-white rounded-2xl shadow-lg p-4 sm:p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">{t('features.attendanceRecording.attendanceReimagined.carousel.parentVisibility.realTimeVisibility.title')}</div>
                      <div className="space-y-3">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-blue-700 mb-1">{t('features.attendanceRecording.attendanceReimagined.carousel.parentVisibility.realTimeVisibility.parentPortal')}</div>
                          <div className="text-xs text-blue-600">{t('features.attendanceRecording.attendanceReimagined.carousel.parentVisibility.realTimeVisibility.liveUpdates')}</div>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-green-700 mb-1">{t('features.attendanceRecording.attendanceReimagined.carousel.parentVisibility.realTimeVisibility.adminDashboard')}</div>
                          <div className="text-xs text-green-600">{t('features.attendanceRecording.attendanceReimagined.carousel.parentVisibility.realTimeVisibility.schoolMetrics')}</div>
                        </div>
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-purple-700 mb-1">{t('features.attendanceRecording.attendanceReimagined.carousel.parentVisibility.realTimeVisibility.autoNotifications')}</div>
                          <div className="text-xs text-purple-600">{t('features.attendanceRecording.attendanceReimagined.carousel.parentVisibility.realTimeVisibility.smsEmail')}</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center justify-center">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                          {t('features.attendanceRecording.attendanceReimagined.carousel.parentVisibility.realTimeVisibility.transparentComm')}
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
                        <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-teal-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <UserCheck className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">{t('features.attendanceRecording.attendanceReimagined.carousel.oneTap.title')}</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          {t('features.attendanceRecording.attendanceReimagined.carousel.oneTap.description')}
                        </p>
                      </div>
                    </div>
                    <div className="w-full lg:w-1/2 bg-white rounded-2xl shadow-lg p-4 sm:p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">{t('features.attendanceRecording.attendanceReimagined.carousel.oneTap.interface.title')}</div>
                      <div className="space-y-4">
                        <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-400">
                          <div className="text-xs font-medium text-green-700 mb-1">{t('features.attendanceRecording.attendanceReimagined.carousel.oneTap.interface.mathClass')}</div>
                          <div className="text-sm text-gray-700">{t('features.attendanceRecording.attendanceReimagined.carousel.oneTap.interface.studentsPresent')}</div>
                          <div className="text-xs text-gray-500 mt-1">{t('features.attendanceRecording.attendanceReimagined.carousel.oneTap.interface.loggedTime')}</div>
                        </div>
                        <div className="bg-orange-50 p-3 rounded-lg border-l-4 border-orange-400">
                          <div className="text-xs font-medium text-orange-700 mb-1">{t('features.attendanceRecording.attendanceReimagined.carousel.oneTap.interface.absentStudents')}</div>
                          <div className="text-sm text-gray-700">Sarah M. • Alex K.</div>
                          <div className="text-xs text-gray-500 mt-1">{t('features.attendanceRecording.attendanceReimagined.carousel.oneTap.interface.parentsNotified')}</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                          {t('features.attendanceRecording.attendanceReimagined.carousel.oneTap.interface.feature')}
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
        {/* Material Recording Section */}
        <section className="mb-12 sm:mb-16 lg:mb-24">
          <div className="text-center mb-16">
            <div className="mb-2">
              <h3 className="text-xl font-medium text-[#4a90e2]" style={{ fontFamily: 'Kalam, Comic Sans MS, cursive' }}>{t('features.attendanceRecording.materialRecording.sectionTitle')}</h3>
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 px-6">
              {t('features.attendanceRecording.materialRecording.title')}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {(Array.isArray(translations.features?.attendanceRecording?.materialRecording?.features) ? translations.features.attendanceRecording.materialRecording.features as FeatureItem[] : []).map((feature, index) => {
              const icons = [FileText, Target, BarChart3, Users];
              const iconColors = ["text-blue-600", "text-green-600", "text-purple-600", "text-orange-600"];
              const iconBgs = ["bg-blue-100", "bg-green-100", "bg-purple-100", "bg-orange-100"];
              
              return (
                <div key={index} className="group bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-gray-200 transition-all duration-300">
                  <div className="flex items-start space-x-4 mb-4">
                    <div className={`w-12 h-12 ${iconBgs[index]} rounded-full flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 group-hover:shadow-lg transition-all duration-500 ease-out`}>
                      {React.createElement(icons[index], { className: `w-6 h-6 ${iconColors[index]} group-hover:scale-110 transition-transform duration-500` })}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                      <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                  {index === 0 && feature.graphic && (
                    <div className="mt-6 bg-gray-50 rounded-lg p-4">
                      <div className="text-sm font-medium text-gray-700 mb-3">{feature.graphic.title}</div>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <FileText className="w-4 h-4 text-blue-600" />
                          </div>
                          <span className="text-sm text-gray-700">{feature.graphic.photosynthesis}</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <BookOpen className="w-4 h-4 text-green-600" />
                          </div>
                          <span className="text-sm text-gray-700">{feature.graphic.video}</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <Target className="w-4 h-4 text-purple-600" />
                          </div>
                          <span className="text-sm text-gray-700">{feature.graphic.objective}</span>
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-gray-200">
                        <div className="text-xs text-gray-500 flex items-center">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                          {feature.graphic.loggedTime}
                        </div>
                      </div>
                    </div>
                  )}
                  {index === 1 && feature.graphic && (
                    <div className="mt-6 bg-gray-50 rounded-lg p-4">
                      <div className="text-sm font-medium text-gray-700 mb-3">{feature.graphic.title}</div>
                      <div className="space-y-3">
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-2 rounded">
                          <div className="text-xs font-medium text-blue-700">{feature.graphic.lessonPlan}</div>
                          <div className="text-xs text-gray-600">{feature.graphic.material}</div>
                        </div>
                        <div className="bg-green-50 border-l-4 border-green-400 p-2 rounded">
                          <div className="text-xs font-medium text-green-700">{feature.graphic.assignment}</div>
                          <div className="text-xs text-gray-600">{feature.graphic.due}</div>
                        </div>
                        <div className="bg-purple-50 border-l-4 border-purple-400 p-2 rounded">
                          <div className="text-xs font-medium text-purple-700">{feature.graphic.resourcesLinked}</div>
                          <div className="text-xs text-gray-600">{feature.graphic.resources}</div>
                        </div>
                      </div>
                    </div>
                  )}
                  {index === 2 && feature.graphic && (
                    <div className="mt-6 bg-gray-50 rounded-lg p-4">
                      <div className="text-sm font-medium text-gray-700 mb-3">{feature.graphic.title}</div>
                      <div className="flex items-end space-x-2 h-12 mb-3">
                        {[75, 90, 60, 85, 95, 80].map((height, i) => (
                          <div key={i} className="bg-gradient-to-t from-purple-400 to-purple-600 rounded-t flex-1" style={{height: `${height}%`}}></div>
                        ))}
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 mb-3">
                        <span>{feature.graphic.week1}</span>
                        <span>{feature.graphic.week6}</span>
                      </div>
                      <div className="text-xs text-gray-600">
                        <div className="flex justify-between">
                          <span>{feature.graphic.coverage}</span>
                          <span className="font-medium text-purple-600">{feature.graphic.percentage}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {index === 3 && feature.graphic && (
                    <div className="mt-6 bg-gray-50 rounded-lg p-4">
                      <div className="text-sm font-medium text-gray-700 mb-3">{feature.graphic.title}</div>
                      <div className="space-y-3">
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-2">
                          <div className="text-xs font-medium text-orange-700">{feature.graphic.studentPortal}</div>
                          <div className="text-xs text-orange-600">{feature.graphic.todaysMaterials}</div>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                          <div className="text-xs font-medium text-blue-700">{feature.graphic.parentDashboard}</div>
                          <div className="text-xs text-blue-600">{feature.graphic.weeklyProgress}</div>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                          <div className="text-xs font-medium text-green-700">{feature.graphic.catchUpResources}</div>
                          <div className="text-xs text-green-600">{feature.graphic.autoShared}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Built with Your Day in Mind Section */}
        <section className="mb-12 sm:mb-16 lg:mb-24">
          <div className="text-center mb-16">
            <div className="mb-2">
              <h3 className="text-xl font-medium text-[#4a90e2]" style={{ fontFamily: 'Kalam, Comic Sans MS, cursive' }}>{t('features.attendanceRecording.builtForTeachers.sectionTitle')}</h3>
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 px-6">
              {t('features.attendanceRecording.builtForTeachers.title')}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {(Array.isArray(translations.features?.attendanceRecording?.builtForTeachers?.features) ? translations.features.attendanceRecording.builtForTeachers.features as FeatureItem[] : []).map((feature, index) => {
              const icons = [Smartphone, Shield, TrendingUp, PlusCircle];
              const iconColors = ["text-blue-600", "text-purple-600", "text-green-600", "text-orange-600"];
              const iconBgs = ["bg-blue-100", "bg-purple-100", "bg-green-100", "bg-orange-100"];
              
              return (
                <div key={index} className="group bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-gray-200 transition-all duration-300">
                  <div className="flex items-start space-x-4">
                    <div className={`w-12 h-12 ${iconBgs[index]} rounded-full flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 group-hover:shadow-lg transition-all duration-500 ease-out`}>
                      {React.createElement(icons[index], { className: `w-6 h-6 ${iconColors[index]} group-hover:scale-110 transition-transform duration-500` })}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                      <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Real Impact Section */}
        <section className="mb-12 sm:mb-16 lg:mb-24">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <div className="mb-2">
                <h3 className="text-xl font-medium text-[#4a90e2]" style={{ fontFamily: 'Kalam, Comic Sans MS, cursive' }}>{t('features.attendanceRecording.realImpact.sectionTitle')}</h3>
              </div>
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 px-6">
                {t('features.attendanceRecording.realImpact.title')}
              </h2>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-6">
                <div className="group rounded-2xl border-2 border-gray-200 bg-white p-6 hover:border-orange-400 hover:bg-orange-50/30 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 cursor-pointer min-h-[140px] flex items-center">
                  <div className="flex items-start space-x-4 w-full">
                    <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors duration-300">{t('features.attendanceRecording.realImpact.benefits.0.title')}</h3>
                      <p className="text-gray-700 text-sm">{t('features.attendanceRecording.realImpact.benefits.0.description')}</p>
                    </div>
                  </div>
                </div>

                <div className="group rounded-2xl border-2 border-gray-200 bg-white p-6 hover:border-blue-400 hover:bg-blue-50/30 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 cursor-pointer min-h-[140px] flex items-center">
                  <div className="flex items-start space-x-4 w-full">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors duration-300">{t('features.attendanceRecording.realImpact.benefits.1.title')}</h3>
                      <p className="text-gray-700 text-sm">{t('features.attendanceRecording.realImpact.benefits.1.description')}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <div className="group rounded-2xl border-2 border-gray-200 bg-white p-6 hover:border-purple-400 hover:bg-purple-50/30 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 cursor-pointer min-h-[140px] flex items-center">
                  <div className="flex items-start space-x-4 w-full">
                    <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <Shield className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors duration-300">{t('features.attendanceRecording.realImpact.benefits.2.title')}</h3>
                      <p className="text-gray-700 text-sm">{t('features.attendanceRecording.realImpact.benefits.2.description')}</p>
                    </div>
                  </div>
                </div>

                <div className="group rounded-2xl border-2 border-gray-200 bg-white p-6 hover:border-green-400 hover:bg-green-50/30 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 cursor-pointer min-h-[140px] flex items-center">
                  <div className="flex items-start space-x-4 w-full">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <Clock className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-green-600 transition-colors duration-300">{t('features.attendanceRecording.realImpact.benefits.3.title')}</h3>
                      <p className="text-gray-700 text-sm">{t('features.attendanceRecording.realImpact.benefits.3.description')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

      {/* CTA Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">
        <section className="text-center py-12 sm:py-16 lg:py-20 bg-gradient-to-r from-primary/10 to-blue-600/10 rounded-2xl sm:rounded-3xl">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6 px-4 sm:px-6">
            {t('features.attendanceRecording.cta.title')}
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto mb-6 sm:mb-8 px-4">
            {t('features.attendanceRecording.cta.description')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
            <a href={`${appUrl}/auth?lang=${language}`} className="w-full sm:w-auto">
              <Button size="lg" className="text-sm sm:text-base px-6 sm:px-8 w-full sm:w-auto">
                {t('features.attendanceRecording.cta.startTrial')}
              </Button>
            </a>
            <Button variant="outline" size="lg" className="text-sm sm:text-base px-6 sm:px-8 w-full sm:w-auto">
              {t('features.attendanceRecording.cta.demo')}
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