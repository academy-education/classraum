"use client"

import { Button } from "@/components/ui/button"
import { Calendar, ChevronLeft, ChevronRight, Target, Users, Activity, UserCheck, Lightbulb, Clock, CheckCircle, AlertTriangle, BarChart3, ArrowRight, FileText, Bell, Smartphone, PlusCircle, Zap, Globe } from "lucide-react"
import { useState, useEffect } from "react"
import Header from "@/components/shared/Header"
import Footer from "@/components/shared/Footer"
import { useTranslation } from "@/hooks/useTranslation"

export default function LessonAssignmentPlannerPage() {
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
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-green-600 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8">
            <Calendar className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
          
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-3 sm:mb-4">
            {t('features.lessonAssignmentPlanner.title')}
          </h1>
          
          <p className="text-xl text-[#4a90e2] font-medium mb-4">
            {t('features.lessonAssignmentPlanner.subtitle')}
          </p>
          
          <p className="text-base sm:text-lg text-[#163e64] max-w-3xl mx-auto mb-12 sm:mb-16 lg:mb-24">
            {t('features.lessonAssignmentPlanner.description')}
          </p>
        </div>
      </main>

      {/* Why It Stands Out Section */}
      <section className="bg-gradient-to-br from-gray-900 to-slate-800 py-24 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16 lg:mb-24">
            <div className="mb-2">
              <h3 className="text-xl font-medium text-[#4a90e2]" style={{ fontFamily: 'Kalam, Comic Sans MS, cursive' }}>{t('features.lessonAssignmentPlanner.standsOut.sectionTitle')}</h3>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6">
              {t('features.lessonAssignmentPlanner.standsOut.title')}
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

                {/* Card 1: Assignment & Lesson Linkage */}
                <div className="w-full flex-shrink-0 px-0.5 sm:px-1 lg:px-2">
                  <div className="flex flex-col lg:flex-row gap-2 sm:gap-4 lg:gap-8 items-start min-h-[280px] sm:min-h-[320px] lg:h-96">
                    <div className="group relative bg-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 hover:shadow-xl transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex flex-col h-full w-full lg:w-1/2">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-teal-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <Target className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">{t('features.lessonAssignmentPlanner.carousel.card1.title')}</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          {t('features.lessonAssignmentPlanner.carousel.card1.description')}
                        </p>
                      </div>
                    </div>
                    <div className="w-full lg:w-1/2 bg-white rounded-2xl shadow-lg p-4 sm:p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">{t('features.lessonAssignmentPlanner.carousel.card1.rightSide.title')}</div>
                      <div className="space-y-4">
                        <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-400">
                          <div className="text-xs font-medium text-green-700 mb-1">{t('features.lessonAssignmentPlanner.carousel.card1.rightSide.lesson.title')}</div>
                          <div className="text-sm text-gray-700">{t('features.lessonAssignmentPlanner.carousel.card1.rightSide.lesson.description')}</div>
                          <div className="text-xs text-gray-500 mt-1">{t('features.lessonAssignmentPlanner.carousel.card1.rightSide.lesson.linked')}</div>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
                          <div className="text-xs font-medium text-blue-700 mb-1">{t('features.lessonAssignmentPlanner.carousel.card1.rightSide.assignment.title')}</div>
                          <div className="text-sm text-gray-700">{t('features.lessonAssignmentPlanner.carousel.card1.rightSide.assignment.due')}</div>
                          <div className="text-xs text-gray-500 mt-1">{t('features.lessonAssignmentPlanner.carousel.card1.rightSide.assignment.outcome')}</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                          {t('features.lessonAssignmentPlanner.carousel.card1.rightSide.synced')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 2: Collaborative Planning Tools */}
                <div className="w-full flex-shrink-0 px-0.5 sm:px-1 lg:px-2">
                  <div className="flex flex-col lg:flex-row gap-2 sm:gap-4 lg:gap-8 items-start min-h-[280px] sm:min-h-[320px] lg:h-96">
                    <div className="group relative bg-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 hover:shadow-xl transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex flex-col h-full w-full lg:w-1/2">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <Users className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">{t('features.lessonAssignmentPlanner.carousel.card2.title')}</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          {t('features.lessonAssignmentPlanner.carousel.card2.description')}
                        </p>
                      </div>
                    </div>
                    <div className="w-full lg:w-1/2 bg-white rounded-2xl shadow-lg p-4 sm:p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">{t('features.lessonAssignmentPlanner.carousel.card2.rightSide.title')}</div>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-xs font-bold text-blue-600">MS</span>
                            </div>
                            <span className="text-sm text-gray-700">{t('features.lessonAssignmentPlanner.carousel.card2.rightSide.leadTeacher')}</span>
                          </div>
                          <span className="text-xs text-green-600 font-medium">{t('features.lessonAssignmentPlanner.carousel.card2.rightSide.active')}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                              <span className="text-xs font-bold text-purple-600">DJ</span>
                            </div>
                            <span className="text-sm text-gray-700">{t('features.lessonAssignmentPlanner.carousel.card2.rightSide.curriculum')}</span>
                          </div>
                          <span className="text-xs text-blue-600 font-medium">{t('features.lessonAssignmentPlanner.carousel.card2.rightSide.reviewing')}</span>
                        </div>
                        <div className="border-t pt-3">
                          <div className="text-xs font-medium text-gray-700 mb-2">{t('features.lessonAssignmentPlanner.carousel.card2.rightSide.recentChanges')}</div>
                          <div className="text-xs text-gray-600">
                            {t('features.lessonAssignmentPlanner.carousel.card2.rightSide.changes')}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 flex items-center">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                          {t('features.lessonAssignmentPlanner.carousel.card2.rightSide.version')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 3: Auto-Sync Across Timetables */}
                <div className="w-full flex-shrink-0 px-0.5 sm:px-1 lg:px-2">
                  <div className="flex flex-col lg:flex-row gap-2 sm:gap-4 lg:gap-8 items-start min-h-[280px] sm:min-h-[320px] lg:h-96">
                    <div className="group relative bg-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 hover:shadow-xl transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex flex-col h-full w-full lg:w-1/2">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <Activity className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">{t('features.lessonAssignmentPlanner.carousel.card3.title')}</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          {t('features.lessonAssignmentPlanner.carousel.card3.description')}
                        </p>
                      </div>
                    </div>
                    <div className="w-full lg:w-1/2 bg-white rounded-2xl shadow-lg p-4 sm:p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">{t('features.lessonAssignmentPlanner.carousel.card3.rightSide.title')}</div>
                      <div className="space-y-3">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-green-700 mb-1">{t('features.lessonAssignmentPlanner.carousel.card3.rightSide.teacherCalendar.title')}</div>
                          <div className="text-xs text-green-600">{t('features.lessonAssignmentPlanner.carousel.card3.rightSide.teacherCalendar.status')}</div>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-blue-700 mb-1">{t('features.lessonAssignmentPlanner.carousel.card3.rightSide.studentDashboards.title')}</div>
                          <div className="text-xs text-blue-600">{t('features.lessonAssignmentPlanner.carousel.card3.rightSide.studentDashboards.status')}</div>
                        </div>
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-purple-700 mb-1">{t('features.lessonAssignmentPlanner.carousel.card3.rightSide.schoolTimetable.title')}</div>
                          <div className="text-xs text-purple-600">{t('features.lessonAssignmentPlanner.carousel.card3.rightSide.schoolTimetable.status')}</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center justify-center">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
                          <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                          {t('features.lessonAssignmentPlanner.carousel.card3.rightSide.synchronized')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 4: Built-In Attendance Integration */}
                <div className="w-full flex-shrink-0 px-0.5 sm:px-1 lg:px-2">
                  <div className="flex flex-col lg:flex-row gap-2 sm:gap-4 lg:gap-8 items-start min-h-[280px] sm:min-h-[320px] lg:h-96">
                    <div className="group relative bg-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 hover:shadow-xl transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex flex-col h-full w-full lg:w-1/2">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-red-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <UserCheck className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">{t('features.lessonAssignmentPlanner.carousel.card4.title')}</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          {t('features.lessonAssignmentPlanner.carousel.card4.description')}
                        </p>
                      </div>
                    </div>
                    <div className="w-full lg:w-1/2 bg-white rounded-2xl shadow-lg p-4 sm:p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">{t('features.lessonAssignmentPlanner.carousel.card4.rightSide.title')}</div>
                      <div className="space-y-3">
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-orange-700 mb-1">{t('features.lessonAssignmentPlanner.carousel.card4.rightSide.catchUp.title')}</div>
                          <div className="text-xs text-orange-600">{t('features.lessonAssignmentPlanner.carousel.card4.rightSide.catchUp.description')}</div>
                          <div className="text-xs text-gray-500 mt-1">{t('features.lessonAssignmentPlanner.carousel.card4.rightSide.catchUp.action')}</div>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-blue-700 mb-1">{t('features.lessonAssignmentPlanner.carousel.card4.rightSide.todayAttendance.title')}</div>
                          <div className="text-xs text-blue-600">{t('features.lessonAssignmentPlanner.carousel.card4.rightSide.todayAttendance.status')}</div>
                        </div>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-red-700 mb-1">{t('features.lessonAssignmentPlanner.carousel.card4.rightSide.adjustments.title')}</div>
                          <div className="text-xs text-red-600">{t('features.lessonAssignmentPlanner.carousel.card4.rightSide.adjustments.description')}</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center justify-center">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                          {t('features.lessonAssignmentPlanner.carousel.card4.rightSide.smartAdjustments')}
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
                        <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-teal-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <Target className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">{t('features.lessonAssignmentPlanner.carousel.card1.title')}</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          {t('features.lessonAssignmentPlanner.carousel.card1.description')}
                        </p>
                      </div>
                    </div>
                    <div className="w-full lg:w-1/2 bg-white rounded-2xl shadow-lg p-4 sm:p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">{t('features.lessonAssignmentPlanner.carousel.card1.rightSide.title')}</div>
                      <div className="space-y-4">
                        <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-400">
                          <div className="text-xs font-medium text-green-700 mb-1">{t('features.lessonAssignmentPlanner.carousel.card1.rightSide.lesson.title')}</div>
                          <div className="text-sm text-gray-700">{t('features.lessonAssignmentPlanner.carousel.card1.rightSide.lesson.description')}</div>
                          <div className="text-xs text-gray-500 mt-1">{t('features.lessonAssignmentPlanner.carousel.card1.rightSide.lesson.linked')}</div>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
                          <div className="text-xs font-medium text-blue-700 mb-1">{t('features.lessonAssignmentPlanner.carousel.card1.rightSide.assignment.title')}</div>
                          <div className="text-sm text-gray-700">{t('features.lessonAssignmentPlanner.carousel.card1.rightSide.assignment.due')}</div>
                          <div className="text-xs text-gray-500 mt-1">{t('features.lessonAssignmentPlanner.carousel.card1.rightSide.assignment.outcome')}</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                          {t('features.lessonAssignmentPlanner.carousel.card1.rightSide.synced')}
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
        <section className="mb-12 sm:mb-16 lg:mb-24">
          <div className="text-center mb-16">
            <div className="mb-2">
              <h3 className="text-xl font-medium text-[#4a90e2]" style={{ fontFamily: 'Kalam, Comic Sans MS, cursive' }}>{t('features.lessonAssignmentPlanner.smartFeatures.sectionTitle')}</h3>
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 px-6">
              {t('features.lessonAssignmentPlanner.smartFeatures.title')}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                title: t('features.lessonAssignmentPlanner.smartFeatures.aiSuggestions.title'),
                description: t('features.lessonAssignmentPlanner.smartFeatures.aiSuggestions.description'),
                icon: Lightbulb,
                iconColor: "text-yellow-600",
                iconBg: "bg-yellow-100",
                graphic: (
                  <div className="mt-6 bg-gray-50 rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-700 mb-3">{t('features.lessonAssignmentPlanner.smartFeatures.aiSuggestions.recommendations')}</div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 group-hover:bg-yellow-200 transition-all duration-300 ease-out">
                          <Lightbulb className="w-4 h-4 text-yellow-600 group-hover:text-yellow-700" />
                        </div>
                        <span className="text-sm text-gray-700">{t('features.lessonAssignmentPlanner.smartFeatures.aiSuggestions.visualAids')}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:animate-pulse group-hover:bg-blue-200 transition-all duration-300 ease-out">
                          <Clock className="w-4 h-4 text-blue-600 group-hover:text-blue-700" />
                        </div>
                        <span className="text-sm text-gray-700">{t('features.lessonAssignmentPlanner.smartFeatures.aiSuggestions.extendLesson')}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:bg-green-200 transition-all duration-300 ease-out">
                          <CheckCircle className="w-4 h-4 text-green-600 group-hover:text-green-700 group-hover:rotate-12 transition-transform duration-300" />
                        </div>
                        <span className="text-sm text-gray-700">{t('features.lessonAssignmentPlanner.smartFeatures.aiSuggestions.quiz')}</span>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{t('features.lessonAssignmentPlanner.smartFeatures.aiSuggestions.assistant')}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                          <span className="text-sm font-medium text-blue-600">{t('features.lessonAssignmentPlanner.smartFeatures.aiSuggestions.learning')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              },
              {
                title: t('features.lessonAssignmentPlanner.smartFeatures.attendanceBehavior.title'),
                description: t('features.lessonAssignmentPlanner.smartFeatures.attendanceBehavior.description'),
                icon: UserCheck,
                iconColor: "text-purple-600",
                iconBg: "bg-purple-100",
                graphic: (
                  <div className="mt-6 bg-gray-50 rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-700 mb-3">{t('features.lessonAssignmentPlanner.smartFeatures.attendanceBehavior.smartAdjustments')}</div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 group-hover:bg-red-200 transition-all duration-300 ease-out">
                            <AlertTriangle className="w-4 h-4 text-red-600 group-hover:text-red-700" />
                          </div>
                          <span className="text-sm text-gray-700">{t('features.lessonAssignmentPlanner.smartFeatures.attendanceBehavior.absent')}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="text-sm font-medium text-orange-600">{t('features.lessonAssignmentPlanner.smartFeatures.attendanceBehavior.reviewAdded')}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:-rotate-3 group-hover:bg-green-200 transition-all duration-300 ease-out">
                            <CheckCircle className="w-4 h-4 text-green-600 group-hover:text-green-700" />
                          </div>
                          <span className="text-sm text-gray-700">{t('features.lessonAssignmentPlanner.smartFeatures.attendanceBehavior.goodBehavior')}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="text-sm font-medium text-green-600">{t('features.lessonAssignmentPlanner.smartFeatures.attendanceBehavior.bonusActivity')}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-200 transition-all duration-300 ease-out">
                            <Users className="w-4 h-4 text-blue-600 group-hover:text-blue-700" />
                          </div>
                          <span className="text-sm text-gray-700">{t('features.lessonAssignmentPlanner.smartFeatures.attendanceBehavior.groupWork')}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="text-sm font-medium text-blue-600">{t('features.lessonAssignmentPlanner.smartFeatures.attendanceBehavior.optimized')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              },
              {
                title: t('features.lessonAssignmentPlanner.smartFeatures.progressTracking.title'),
                description: t('features.lessonAssignmentPlanner.smartFeatures.progressTracking.description'),
                icon: BarChart3,
                iconColor: "text-green-600",
                iconBg: "bg-green-100",
                graphic: (
                  <div className="mt-6 bg-gray-50 rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-700 mb-3">{t('features.lessonAssignmentPlanner.smartFeatures.progressTracking.overview')}</div>
                    <div className="flex items-end space-x-2 h-12 mb-3">
                      {[85, 92, 78, 88, 94, 89].map((height, i) => (
                        <div key={i} className="bg-gradient-to-t from-green-400 to-green-600 rounded-t flex-1" style={{height: `${height}%`}}></div>
                      ))}
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mb-3">
                      <span>{t('features.lessonAssignmentPlanner.smartFeatures.progressTracking.lesson1')}</span>
                      <span>{t('features.lessonAssignmentPlanner.smartFeatures.progressTracking.lesson6')}</span>
                    </div>
                    <div className="pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{t('features.lessonAssignmentPlanner.smartFeatures.progressTracking.avgCompletion')}</span>
                        <div className="flex items-center space-x-1">
                          <ArrowRight className="w-3 h-3 text-green-600 rotate-[-45deg] group-hover:scale-125 group-hover:rotate-[-30deg] transition-all duration-300" />
                          <span className="text-sm font-medium text-green-600">{t('features.lessonAssignmentPlanner.smartFeatures.progressTracking.percentage')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              },
              {
                title: t('features.lessonAssignmentPlanner.smartFeatures.instantDistribution.title'),
                description: t('features.lessonAssignmentPlanner.smartFeatures.instantDistribution.description'),
                icon: PlusCircle,
                iconColor: "text-blue-600",
                iconBg: "bg-blue-100",
                graphic: (
                  <div className="mt-6 bg-gray-50 rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-700 mb-3">{t('features.lessonAssignmentPlanner.smartFeatures.instantDistribution.oneClick')}</div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 group-hover:bg-blue-200 transition-all duration-300 ease-out">
                            <FileText className="w-4 h-4 text-blue-600 group-hover:text-blue-700" />
                          </div>
                          <span className="text-sm text-gray-700">{t('features.lessonAssignmentPlanner.smartFeatures.instantDistribution.mathWorksheet')}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <CheckCircle className="w-4 h-4 text-green-600 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300" />
                          <span className="text-sm font-medium text-green-600">{t('features.lessonAssignmentPlanner.smartFeatures.instantDistribution.sent')}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:-rotate-3 group-hover:bg-purple-200 transition-all duration-300 ease-out">
                            <Bell className="w-4 h-4 text-purple-600 group-hover:text-purple-700" />
                          </div>
                          <span className="text-sm text-gray-700">{t('features.lessonAssignmentPlanner.smartFeatures.instantDistribution.dueReminders')}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <CheckCircle className="w-4 h-4 text-green-600 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300" />
                          <span className="text-sm font-medium text-green-600">{t('features.lessonAssignmentPlanner.smartFeatures.instantDistribution.autoSet')}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:bg-orange-200 transition-all duration-300 ease-out">
                            <Smartphone className="w-4 h-4 text-orange-600 group-hover:text-orange-700" />
                          </div>
                          <span className="text-sm text-gray-700">{t('features.lessonAssignmentPlanner.smartFeatures.instantDistribution.mobileAccess')}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <CheckCircle className="w-4 h-4 text-blue-600 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300" />
                          <span className="text-sm font-medium text-blue-600">{t('features.lessonAssignmentPlanner.smartFeatures.instantDistribution.available')}</span>
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

        {/* Designed for Real-World Classrooms Section */}
        <section className="mb-12 sm:mb-16 lg:mb-24">
          <div className="text-center mb-16">
            <div className="mb-2">
              <h3 className="text-xl font-medium text-[#4a90e2]" style={{ fontFamily: 'Kalam, Comic Sans MS, cursive' }}>{t('features.lessonAssignmentPlanner.flexibility.sectionTitle')}</h3>
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 px-6">
              {t('features.lessonAssignmentPlanner.flexibility.title')}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                title: t('features.lessonAssignmentPlanner.flexibility.interruptions.title'),
                description: t('features.lessonAssignmentPlanner.flexibility.interruptions.description'),
                icon: AlertTriangle,
                iconColor: "text-orange-600",
                iconBg: "bg-orange-100"
              },
              {
                title: t('features.lessonAssignmentPlanner.flexibility.privacy.title'),
                description: t('features.lessonAssignmentPlanner.flexibility.privacy.description'),
                icon: Users,
                iconColor: "text-purple-600",
                iconBg: "bg-purple-100"
              },
              {
                title: t('features.lessonAssignmentPlanner.flexibility.mobile.title'),
                description: t('features.lessonAssignmentPlanner.flexibility.mobile.description'),
                icon: Smartphone,
                iconColor: "text-blue-600",
                iconBg: "bg-blue-100"
              },
              {
                title: t('features.lessonAssignmentPlanner.flexibility.hybrid.title'),
                description: t('features.lessonAssignmentPlanner.flexibility.hybrid.description'),
                icon: Globe,
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

        {/* Benefits for Your Institution */}
        <section className="mb-12 sm:mb-16 lg:mb-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 px-6">
                {t('features.lessonAssignmentPlanner.benefits.title')}
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                {t('features.lessonAssignmentPlanner.benefits.subtitle')}
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-6">
                <div className="group rounded-2xl border-2 border-gray-200 bg-white p-6 hover:border-green-400 hover:bg-green-50/30 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 cursor-pointer min-h-[140px] flex items-center">
                  <div className="flex items-start space-x-4 w-full">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <Target className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-green-600 transition-colors duration-300">{t('features.lessonAssignmentPlanner.benefits.curriculumCoverage.title')}</h3>
                      <p className="text-gray-700 text-sm">{t('features.lessonAssignmentPlanner.benefits.curriculumCoverage.description')}</p>
                    </div>
                  </div>
                </div>

                <div className="group rounded-2xl border-2 border-gray-200 bg-white p-6 hover:border-blue-400 hover:bg-blue-50/30 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 cursor-pointer min-h-[140px] flex items-center">
                  <div className="flex items-start space-x-4 w-full">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <Clock className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors duration-300">{t('features.lessonAssignmentPlanner.benefits.saveTime.title')}</h3>
                      <p className="text-gray-700 text-sm">{t('features.lessonAssignmentPlanner.benefits.saveTime.description')}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <div className="group rounded-2xl border-2 border-gray-200 bg-white p-6 hover:border-purple-400 hover:bg-purple-50/30 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 cursor-pointer min-h-[140px] flex items-center">
                  <div className="flex items-start space-x-4 w-full">
                    <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <Users className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors duration-300">{t('features.lessonAssignmentPlanner.benefits.reduceDuplication.title')}</h3>
                      <p className="text-gray-700 text-sm">{t('features.lessonAssignmentPlanner.benefits.reduceDuplication.description')}</p>
                    </div>
                  </div>
                </div>

                <div className="group rounded-2xl border-2 border-gray-200 bg-white p-6 hover:border-orange-400 hover:bg-orange-50/30 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 cursor-pointer min-h-[140px] flex items-center">
                  <div className="flex items-start space-x-4 w-full">
                    <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <Zap className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors duration-300">{t('features.lessonAssignmentPlanner.benefits.lowerBurnout.title')}</h3>
                      <p className="text-gray-700 text-sm">{t('features.lessonAssignmentPlanner.benefits.lowerBurnout.description')}</p>
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
        <section className="text-center py-12 sm:py-16 lg:py-20 bg-gradient-to-r from-primary/10 to-green-600/10 rounded-2xl sm:rounded-3xl">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6 px-4 sm:px-6">
            {t('features.lessonAssignmentPlanner.cta.title')}
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto mb-6 sm:mb-8 px-4">
            {t('features.lessonAssignmentPlanner.cta.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
            <a href={`${appUrl}/auth?lang=${language}`} className="w-full sm:w-auto">
              <Button size="lg" className="text-sm sm:text-base px-6 sm:px-8 w-full sm:w-auto">
                {t('features.lessonAssignmentPlanner.cta.startTrial')}
              </Button>
            </a>
            <Button variant="outline" size="lg" className="text-sm sm:text-base px-6 sm:px-8 w-full sm:w-auto">
              {t('features.lessonAssignmentPlanner.cta.demo')}
            </Button>
          </div>
        </section>
      </main>

      <Footer />
      </div>
    </>
  )
}