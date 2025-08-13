"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { FileText, Users, BarChart3, Target, Check, Bell, ChevronLeft, ChevronRight, Activity, MessageSquare, BookOpen, Mail, Smartphone, BellRing, CheckCircle, AlertTriangle, ArrowRight, Zap, TrendingUp, Clock, Globe } from "lucide-react"
import { useState, useEffect } from "react"
import Header from "@/components/shared/Header"

export default function AIReportCardsPage() {
  const [appUrl, setAppUrl] = useState("https://app.classraum-korea.vercel.app")
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
      <main className="mx-auto px-6 py-16" style={{ maxWidth: '1200px' }}>
        {/* Hero */}
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-8">
            <FileText className="w-10 h-10 text-white" />
          </div>
          
          <h1 className="text-4xl lg:text-6xl font-bold leading-none mb-4">
            AI-Generated Smart Report Cards
          </h1>
          
          <p className="text-xl text-[#4a90e2] font-medium mb-4">
            Data-driven insights that help students grow—instantly and intelligently.
          </p>
          
          <p className="text-lg text-[#163e64] max-w-3xl mx-auto mb-24">
            Our AI-Generated Smart Report Cards deliver real-time, comprehensive performance feedback for students, making it easier for teachers to evaluate, parents to understand, and students to improve. With automated grading insights, personalized learning feedback, and cross-platform integration, CLASSRAUM transforms traditional reports into actionable intelligence that drives educational success.
          </p>
        </div>
      </main>

      {/* Why It Stands Out Section */}
      <section className="bg-gradient-to-br from-gray-900 to-slate-800 py-24 w-full">
        <div className="mx-auto px-6" style={{ maxWidth: '1200px' }}>
          <div className="text-center mb-24">
            <div className="mb-2">
              <h3 className="text-xl font-medium text-[#4a90e2]" style={{ fontFamily: 'Kalam, Comic Sans MS, cursive' }}>Smarter Student Feedback</h3>
            </div>
            <h2 className="text-5xl lg:text-5xl font-bold text-white mb-6">
              Why <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500">CLASSRAUM</span>&apos;s Smart Report Cards Stand Out
            </h2>
          </div>

          {/* Carousel Cards */}
          <div className="relative mb-16">
            {/* Navigation Buttons */}
            <button 
              onClick={prevCard}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 rounded-full w-12 h-12 flex items-center justify-center transition-all duration-300 hover:scale-110"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            
            <button 
              onClick={nextCard}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 rounded-full w-12 h-12 flex items-center justify-center transition-all duration-300 hover:scale-110"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>

            {/* Carousel Container */}
            <div className="flex justify-center">
              <div className="overflow-hidden mx-20 max-w-4xl w-full">
              <div 
                className="flex transition-all duration-700 ease-in-out"
                style={{ transform: `translateX(-${currentCard * 100}%)` }}
              >

                {/* Card 1: Real-Time Performance Analytics */}
                <div className="w-full flex-shrink-0 px-2">
                  <div className="flex gap-8 items-start h-96">
                    <div className="group relative bg-white/10 rounded-3xl p-8 hover:shadow-xl transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex flex-col h-full w-1/2">
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
                    <div className="w-1/2 bg-white rounded-2xl shadow-lg p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">Live Performance Dashboard</div>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">Mathematics</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-20 h-2 bg-gray-200 rounded-full">
                              <div className="bg-blue-500 h-2 rounded-full animate-pulse" style={{width: '85%'}}></div>
                            </div>
                            <span className="text-sm font-bold text-blue-600">85%</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">Reading Comprehension</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-20 h-2 bg-gray-200 rounded-full">
                              <div className="bg-green-500 h-2 rounded-full animate-pulse" style={{width: '92%', animationDelay: '0.5s'}}></div>
                            </div>
                            <span className="text-sm font-bold text-green-600">92%</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">Critical Thinking</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-20 h-2 bg-gray-200 rounded-full">
                              <div className="bg-purple-500 h-2 rounded-full animate-pulse" style={{width: '78%', animationDelay: '1s'}}></div>
                            </div>
                            <span className="text-sm font-bold text-purple-600">78%</span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                          Live updates • Last updated 2 mins ago
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 2: Personalized AI Feedback */}
                <div className="w-full flex-shrink-0 px-2">
                  <div className="flex gap-8 items-start h-96">
                    <div className="group relative bg-white/10 rounded-3xl p-8 hover:shadow-xl transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex flex-col h-full w-1/2">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-teal-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <MessageSquare className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">Personalized AI Feedback</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          Each report includes AI-generated comments tailored to the student&apos;s unique performance, learning style, and improvement areas—saving hours of teacher time while keeping feedback constructive and human-sounding.
                        </p>
                      </div>
                    </div>
                    <div className="w-1/2 bg-white rounded-2xl shadow-lg p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">AI-Generated Comment Example</div>
                      <div className="space-y-4">
                        <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                          <div className="text-xs font-medium text-blue-700 mb-1">Student: Emma Rodriguez</div>
                          <div className="text-sm text-gray-700 leading-relaxed">
                            &quot;Emma shows excellent progress in mathematical reasoning this quarter. Her problem-solving approach has become more systematic, particularly in algebra. I recommend challenging her with multi-step word problems to further develop her analytical thinking.&quot;
                          </div>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg">
                          <div className="text-xs font-medium text-green-700 mb-1">Personalization Factors:</div>
                          <div className="text-xs text-green-600 space-y-1">
                            <div>• Learning style: Visual + Kinesthetic</div>
                            <div>• Improvement trend: +12% this quarter</div>
                            <div>• Challenge level: Advanced problem-solver</div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 flex items-center">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                          Generated in 0.8 seconds
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 3: Subject & Skill Breakdown */}
                <div className="w-full flex-shrink-0 px-2">
                  <div className="flex gap-8 items-start h-96">
                    <div className="group relative bg-white/10 rounded-3xl p-8 hover:shadow-xl transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex flex-col h-full w-1/2">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <BookOpen className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">Subject &amp; Skill Breakdown</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          Get detailed breakdowns by subject, learning outcomes, and even soft skills. Understand not just what a student scored, but why—and what to do next.
                        </p>
                      </div>
                    </div>
                    <div className="w-1/2 bg-white rounded-2xl shadow-lg p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">Detailed Performance Breakdown</div>
                      <div className="space-y-4">
                        <div className="border-b pb-3">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-700">Mathematics</span>
                            <span className="text-sm font-bold text-blue-600">87%</span>
                          </div>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-600">• Problem Solving</span>
                              <span className="text-green-600 font-medium">92%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">• Number Sense</span>
                              <span className="text-blue-600 font-medium">85%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">• Mathematical Reasoning</span>
                              <span className="text-orange-600 font-medium">78%</span>
                            </div>
                          </div>
                        </div>
                        <div className="border-b pb-3">
                          <div className="text-xs font-medium text-gray-700 mb-2">Soft Skills Assessment</div>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-600">• Collaboration</span>
                              <span className="text-green-600 font-medium">Excellent</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">• Critical Thinking</span>
                              <span className="text-blue-600 font-medium">Good</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">• Time Management</span>
                              <span className="text-yellow-600 font-medium">Developing</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          <span className="font-medium">Next Steps:</span> Focus on mathematical reasoning practice
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 4: Multi-Audience View */}
                <div className="w-full flex-shrink-0 px-2">
                  <div className="flex gap-8 items-start h-96">
                    <div className="group relative bg-white/10 rounded-3xl p-8 hover:shadow-xl transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex flex-col h-full w-1/2">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-red-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <Users className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">Multi-Audience View</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          Custom-designed views for teachers, parents, and students ensure that each group gets the right level of information, in the most helpful format.
                        </p>
                      </div>
                    </div>
                    <div className="w-1/2 bg-white rounded-2xl shadow-lg p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">Audience-Specific Dashboard Views</div>
                      <div className="space-y-3">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-blue-700 mb-1">Teacher View</div>
                          <div className="text-xs text-blue-600">Comprehensive analytics, assessment tools, intervention suggestions</div>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-green-700 mb-1">Parent View</div>
                          <div className="text-xs text-green-600">Progress summaries, home support tips, celebration moments</div>
                        </div>
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-purple-700 mb-1">Student View</div>
                          <div className="text-xs text-purple-600">Goal tracking, achievements, personalized learning paths</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center justify-center">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                          <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                          Tailored for each audience
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Duplicate of Card 1 for seamless loop */}
                <div className="w-full flex-shrink-0 px-4">
                  <div className="flex gap-8 items-start h-96">
                    <div className="group relative bg-white/10 rounded-3xl p-8 hover:shadow-xl transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex flex-col h-full w-1/2">
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
                    <div className="w-1/2 bg-white rounded-2xl shadow-lg p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">Live Performance Dashboard</div>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">Mathematics</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-20 h-2 bg-gray-200 rounded-full">
                              <div className="bg-blue-500 h-2 rounded-full animate-pulse" style={{width: '85%'}}></div>
                            </div>
                            <span className="text-sm font-bold text-blue-600">85%</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">Reading Comprehension</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-20 h-2 bg-gray-200 rounded-full">
                              <div className="bg-green-500 h-2 rounded-full animate-pulse" style={{width: '92%', animationDelay: '0.5s'}}></div>
                            </div>
                            <span className="text-sm font-bold text-green-600">92%</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">Critical Thinking</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-20 h-2 bg-gray-200 rounded-full">
                              <div className="bg-purple-500 h-2 rounded-full animate-pulse" style={{width: '78%', animationDelay: '1s'}}></div>
                            </div>
                            <span className="text-sm font-bold text-purple-600">78%</span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                          Live updates • Last updated 2 mins ago
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

      <main className="mx-auto px-6 py-24" style={{ maxWidth: '1200px' }}>
        {/* Features Grid */}
        <section className="mb-24">
          <div className="text-center mb-16">
            <div className="mb-2">
              <h3 className="text-xl font-medium text-[#4a90e2]" style={{ fontFamily: 'Kalam, Comic Sans MS, cursive' }}>Our Automated System</h3>
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 px-6">
              Key Features and Benefits
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Automated Insight Engine",
                description: "Leverages machine learning to highlight academic strengths, flag struggling areas, and recommend next steps—no manual data crunching required.",
                icon: BarChart3,
                iconColor: "text-blue-600",
                iconBg: "bg-blue-100",
                graphic: (
                  <div className="mt-6 bg-gray-50 rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-700 mb-3">AI Insights</div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 group-hover:bg-green-200 transition-all duration-300 ease-out">
                          <CheckCircle className="w-4 h-4 text-green-600 group-hover:text-green-700" />
                        </div>
                        <span className="text-sm text-gray-700">Strong in problem-solving</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center group-hover:scale-110 group-hover:animate-pulse group-hover:bg-orange-200 transition-all duration-300 ease-out">
                          <AlertTriangle className="w-4 h-4 text-orange-600 group-hover:text-orange-700" />
                        </div>
                        <span className="text-sm text-gray-700">Needs help with fractions</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-200 transition-all duration-300 ease-out">
                          <ArrowRight className="w-4 h-4 text-blue-600 group-hover:text-blue-700 group-hover:translate-x-1 transition-transform duration-300" />
                        </div>
                        <span className="text-sm text-gray-700">Practice worksheets</span>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Machine Learning</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-sm font-medium text-green-600">Active</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              },
              {
                title: "Instant Sharing & Notifications",
                description: "Send report cards via email, SMS, or app notifications with a single click. Parents and students are alerted instantly when new feedback is available.",
                icon: Bell,
                iconColor: "text-green-600",
                iconBg: "bg-green-100",
                graphic: (
                  <div className="mt-6 bg-gray-50 rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-700 mb-3">One-Click Distribution</div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 group-hover:bg-blue-200 transition-all duration-300 ease-out">
                            <Mail className="w-4 h-4 text-blue-600 group-hover:text-blue-700" />
                          </div>
                          <span className="text-sm text-gray-700">Email</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <CheckCircle className="w-4 h-4 text-green-600 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300" />
                          <span className="text-sm font-medium text-green-600">Sent</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center group-hover:scale-110 group-hover:-rotate-3 group-hover:bg-purple-200 transition-all duration-300 ease-out">
                            <Smartphone className="w-4 h-4 text-purple-600 group-hover:text-purple-700" />
                          </div>
                          <span className="text-sm text-gray-700">SMS</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <CheckCircle className="w-4 h-4 text-green-600 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300" />
                          <span className="text-sm font-medium text-green-600">Delivered</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center group-hover:scale-110 group-hover:bg-orange-200 transition-all duration-300 ease-out">
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
                          <span className="text-sm text-gray-700">App Push</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <CheckCircle className="w-4 h-4 text-blue-600 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300" />
                          <span className="text-sm font-medium text-blue-600">Read</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              },
              {
                title: "Historical Performance Tracking",
                description: "Compare current performance with past terms to visualize long-term growth, detect patterns, and inform future instruction.",
                icon: Target,
                iconColor: "text-purple-600",
                iconBg: "bg-purple-100",
                graphic: (
                  <div className="mt-6 bg-gray-50 rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-700 mb-3">Growth Timeline</div>
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
                        <span className="text-sm text-gray-600">6-Month Progress</span>
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
                  <div className={`w-12 h-12 ${feature.iconBg} rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 group-hover:shadow-lg transition-all duration-500 ease-out`}>
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
              <h3 className="text-xl font-medium text-[#4a90e2]" style={{ fontFamily: 'Kalam, Comic Sans MS, cursive' }}>The Clear Difference</h3>
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 px-6">
              How We Beat the Competition
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* The Old Way */}
            <div className="bg-gray-100 rounded-3xl p-8 border-2 border-gray-200">
              <h3 className="text-2xl font-extrabold text-gray-800 mb-8 text-center">Other Platforms</h3>
              <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <div className="space-y-4">
                  <div className="flex items-start space-x-4">
                    <div className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-white text-sm">✗</span>
                    </div>
                    <span className="text-gray-700 font-medium">Reports generated only at fixed intervals (monthly or term-end)</span>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-white text-sm">✗</span>
                    </div>
                    <span className="text-gray-700 font-medium">Generic comments or fully manual teacher input</span>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-white text-sm">✗</span>
                    </div>
                    <span className="text-gray-700 font-medium">One-size-fits-all reports with limited accessibility</span>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-white text-sm">✗</span>
                    </div>
                    <span className="text-gray-700 font-medium">Manual data entry or limited tool compatibility</span>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-white text-sm">✗</span>
                    </div>
                    <span className="text-gray-700 font-medium">Purely descriptive reports with no forward-looking recommendations</span>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-white text-sm">✗</span>
                    </div>
                    <span className="text-gray-700 font-medium">Rigid templates with limited editing options</span>
                  </div>
                </div>
              </div>
            </div>

            {/* The CLASSRAUM Way */}
            <div className="bg-blue-600 rounded-3xl p-8 border border-blue-200 shadow-lg">
                <h3 className="text-2xl font-extrabold text-white mb-8 text-center">CLASSRAUM</h3>
                
                <div className="bg-white rounded-2xl p-6 mb-6">
                  <div className="space-y-4">
                    <div className="flex items-start space-x-4">
                      <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-1">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <span className="font-semibold text-gray-900">Real-time updates</span>
                        <span className="text-gray-700"> that evolve with student progress</span>
                      </div>
                    </div>
                    <div className="flex items-start space-x-4">
                      <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-1">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <span className="font-semibold text-gray-900">Custom AI-generated comments</span>
                        <span className="text-gray-700"> personalized to each student</span>
                      </div>
                    </div>
                    <div className="flex items-start space-x-4">
                      <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-1">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <span className="font-semibold text-gray-900">Separate, optimized views</span>
                        <span className="text-gray-700"> for teachers, students, and parents</span>
                      </div>
                    </div>
                    <div className="flex items-start space-x-4">
                      <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-1">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <span className="font-semibold text-gray-900">Syncs with LMS, attendance,</span>
                        <span className="text-gray-700"> assessments, and external gradebooks</span>
                      </div>
                    </div>
                    <div className="flex items-start space-x-4">
                      <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-1">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <span className="font-semibold text-gray-900">Highlights trends, flags concerns,</span>
                        <span className="text-gray-700"> and suggests next steps</span>
                      </div>
                    </div>
                    <div className="flex items-start space-x-4">
                      <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-1">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <span className="font-semibold text-gray-900">Fully customizable templates,</span>
                        <span className="text-gray-700"> language settings, and school branding</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Link href={appUrl} className="block">
                  <div className="bg-black text-white text-center py-4 px-6 rounded-xl font-semibold hover:bg-gray-900 transition-colors cursor-pointer">
                    Get Started
                  </div>
                </Link>
            </div>
          </div>
        </section>

        {/* Benefits for Your Institution */}
        <section className="mb-24">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 px-6">
                Benefits for Your Institution
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Transform your educational processes with measurable improvements in efficiency, outcomes, and stakeholder satisfaction.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-6">
                <div className="group rounded-2xl border-2 border-gray-200 bg-white p-6 hover:border-blue-400 hover:bg-blue-50/30 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 cursor-pointer min-h-[140px] flex items-center">
                  <div className="flex items-start space-x-4 w-full">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors duration-300">Automate Report Generation</h3>
                      <p className="text-gray-700 text-sm">Eliminate manual reporting tasks and reduce teacher workload by over 60%.</p>
                    </div>
                  </div>
                </div>

                <div className="group rounded-2xl border-2 border-gray-200 bg-white p-6 hover:border-green-400 hover:bg-green-50/30 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 cursor-pointer min-h-[140px] flex items-center">
                  <div className="flex items-start space-x-4 w-full">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-green-600 transition-colors duration-300">Improve Academic Outcomes</h3>
                      <p className="text-gray-700 text-sm">Deliver early intervention alerts and actionable insights that drive measurable student improvement.</p>
                    </div>
                  </div>
                </div>

                <div className="group rounded-2xl border-2 border-gray-200 bg-white p-6 hover:border-purple-400 hover:bg-purple-50/30 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 cursor-pointer min-h-[140px] flex items-center">
                  <div className="flex items-start space-x-4 w-full">
                    <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors duration-300">Enhance Parent Engagement</h3>
                      <p className="text-gray-700 text-sm">Provide parents with meaningful, easy-to-read feedback they actually understand—accessible instantly from any device.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <div className="group rounded-2xl border-2 border-gray-200 bg-white p-6 hover:border-orange-400 hover:bg-orange-50/30 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 cursor-pointer min-h-[140px] flex items-center">
                  <div className="flex items-start space-x-4 w-full">
                    <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <BarChart3 className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors duration-300">Data-Driven Instruction</h3>
                      <p className="text-gray-700 text-sm">Help teachers make informed decisions with real-time, longitudinal performance data at their fingertips.</p>
                    </div>
                  </div>
                </div>

                <div className="group rounded-2xl border-2 border-gray-200 bg-white p-6 hover:border-cyan-400 hover:bg-cyan-50/30 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 cursor-pointer min-h-[140px] flex items-center">
                  <div className="flex items-start space-x-4 w-full">
                    <div className="w-12 h-12 bg-cyan-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-cyan-600 transition-colors duration-300">Save Time on Admin Work</h3>
                      <p className="text-gray-700 text-sm">Free up hours each week by replacing spreadsheets and disconnected tools with a unified, automated system.</p>
                    </div>
                  </div>
                </div>

                <div className="group rounded-2xl border-2 border-gray-200 bg-white p-6 hover:border-indigo-400 hover:bg-indigo-50/30 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 cursor-pointer min-h-[140px] flex items-center">
                  <div className="flex items-start space-x-4 w-full">
                    <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <Globe className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors duration-300">Support Global & Remote Learning</h3>
                      <p className="text-gray-700 text-sm">Designed for schools with international, hybrid, or remote models</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>


        {/* CTA Section */}
        <section className="text-center py-20 bg-gradient-to-r from-primary/10 to-blue-600/10 rounded-3xl">
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 px-6">
            Ready to Transform Your Reports?
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Join thousands of educators who have saved hundreds of hours with AI-generated smart report cards.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={`${appUrl}/auth`}>
              <Button size="lg" className="text-base px-8">
                Start Free Trial →
              </Button>
            </a>
            <Button variant="outline" size="lg" className="text-base px-8">
              Watch Demo
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-12">
            {/* Company Info */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Image src="/logo.png" alt="Classraum Logo" width={32} height={32} />
                <span className="text-xl font-bold">CLASSRAUM</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                AI-powered academy management platform that gives educators back their most valuable asset: time. Automate administrative tasks and focus on what matters most - teaching.
              </p>
              <div className="text-gray-400 text-sm">
                <p>support@classraum.com</p>
              </div>
            </div>

            {/* Quick Links */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Quick Links</h3>
              <div className="space-y-2">
                <Link href="/#about" className="block text-gray-400 hover:text-white transition-colors text-sm">
                  About
                </Link>
                <Link href="/pricing" className="block text-gray-400 hover:text-white transition-colors text-sm">
                  Pricing
                </Link>
                <Link href="/#contact" className="block text-gray-400 hover:text-white transition-colors text-sm">
                  Contact
                </Link>
                <Link href="#" className="block text-gray-400 hover:text-white transition-colors text-sm">
                  Privacy Policy
                </Link>
                <Link href="#" className="block text-gray-400 hover:text-white transition-colors text-sm">
                  Terms of Service
                </Link>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Features</h3>
              <div className="space-y-2">
                <Link href="/features/ai-report-cards" className="block text-gray-400 hover:text-white transition-colors text-sm">
                  AI Report Cards
                </Link>
                <Link href="/features/customized-dashboard" className="block text-gray-400 hover:text-white transition-colors text-sm">
                  Customized Dashboard
                </Link>
                <Link href="/features/lesson-assignment-planner" className="block text-gray-400 hover:text-white transition-colors text-sm">
                  Lesson & Assignment Planner
                </Link>
                <Link href="/features/attendance-recording" className="block text-gray-400 hover:text-white transition-colors text-sm">
                  Attendance & Material Recording
                </Link>
                <Link href="/features/real-time-notifications" className="block text-gray-400 hover:text-white transition-colors text-sm">
                  Real-Time Notifications
                </Link>
                <Link href="/features/smart-linking-system" className="block text-gray-400 hover:text-white transition-colors text-sm">
                  Smart Linking System
                </Link>
                <Link href="/features/privacy-by-design" className="block text-gray-400 hover:text-white transition-colors text-sm">
                  Privacy by Design
                </Link>
                <Link href="/features/scheduling" className="block text-gray-400 hover:text-white transition-colors text-sm">
                  Auto Scheduling
                </Link>
                <Link href="/features/analytics" className="block text-gray-400 hover:text-white transition-colors text-sm">
                  Performance Analytics
                </Link>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8 text-center">
            <p className="text-gray-400 text-sm">
              © 2024 CLASSRAUM. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}