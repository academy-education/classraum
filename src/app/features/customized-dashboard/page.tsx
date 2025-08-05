"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Monitor, ChevronLeft, ChevronRight, Users, Layout, BarChart3, CheckCircle, Bell, Settings, MessageSquare, Activity, Eye, BookOpen, Calendar, AlertTriangle, Smartphone, Zap, Target, Clock, TrendingUp, Globe } from "lucide-react"
import { useState } from "react"
import Header from "@/components/shared/Header"

export default function CustomizedDashboardPage() {
  const [currentCard, setCurrentCard] = useState(0)

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
      <main className="mx-auto px-6 py-16" style={{ maxWidth: '1200px' }}>
        {/* Hero */}
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-8">
            <Monitor className="w-10 h-10 text-white" />
          </div>
          
          <h1 className="text-4xl lg:text-6xl font-bold leading-none mb-4">
            Customized Dashboard
          </h1>
          
          <p className="text-xl text-[#4a90e2] font-medium mb-4">
            Every Role, One View—Tailored to What Matters Most
          </p>
          
          <p className="text-lg text-[#163e64] max-w-3xl mx-auto mb-24">
            Say goodbye to generic dashboards. CLASSRAUM's Customized Dashboard gives every user—teachers, administrators, students, and parents—a personalized control center that highlights only the most relevant data and tools. Whether it's tracking upcoming assignments, checking attendance, or monitoring school-wide trends, everything is organized, prioritized, and instantly actionable.
          </p>
        </div>
      </main>

      {/* Why It Stands Out Section */}
      <section className="bg-gradient-to-br from-gray-900 to-slate-800 py-24 w-full">
        <div className="mx-auto px-6" style={{ maxWidth: '1200px' }}>
          <div className="text-center mb-24">
            <div className="mb-2">
              <h3 className="text-xl font-medium text-[#4a90e2]" style={{ fontFamily: 'Kalam, Comic Sans MS, cursive' }}>Clarity Without the Clutter</h3>
            </div>
            <h2 className="text-5xl lg:text-5xl font-bold text-white mb-6">
              See Only What You Need—<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-500">Nothing You Don't</span>
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

                {/* Card 1: Role-Based Personalization */}
                <div className="w-full flex-shrink-0 px-2">
                  <div className="flex gap-8 items-start h-96">
                    <div className="group relative bg-white/10 rounded-3xl p-8 hover:shadow-xl transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex flex-col h-full w-1/2">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <Users className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">Role-Based Personalization</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          Each dashboard is automatically tailored based on user type—whether you're a homeroom teacher, subject lead, parent, or student.
                        </p>
                      </div>
                    </div>
                    <div className="w-1/2 bg-white rounded-2xl shadow-lg p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">User Role Dashboard Views</div>
                      <div className="space-y-4">
                        <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
                          <div className="text-xs font-medium text-blue-700 mb-1">Teacher Dashboard</div>
                          <div className="text-sm text-gray-700">Today's schedule, student alerts, lesson status</div>
                          <div className="text-xs text-gray-500 mt-1">📊 Class performance • 📝 Upcoming lessons</div>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-400">
                          <div className="text-xs font-medium text-green-700 mb-1">Parent Dashboard</div>
                          <div className="text-sm text-gray-700">Child's progress, attendance, messages</div>
                          <div className="text-xs text-gray-500 mt-1">📈 Academic trends • 📅 Upcoming events</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center">
                          <div className="w-2 h-2 bg-purple-500 rounded-full mr-2 animate-pulse"></div>
                          Auto-configured based on user role
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 2: Smart Widget Controls */}
                <div className="w-full flex-shrink-0 px-2">
                  <div className="flex gap-8 items-start h-96">
                    <div className="group relative bg-white/10 rounded-3xl p-8 hover:shadow-xl transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex flex-col h-full w-1/2">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <Layout className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">Smart Widget Controls</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          Drag, drop, and rearrange widgets to customize your view. Choose from performance charts, attendance logs, communication alerts, class updates, and more.
                        </p>
                      </div>
                    </div>
                    <div className="w-1/2 bg-white rounded-2xl shadow-lg p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">Customizable Widget Library</div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                              <BarChart3 className="w-4 h-4 text-blue-600" />
                            </div>
                            <span className="text-sm text-gray-700">Performance Charts</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-green-600">Active</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                              <Bell className="w-4 h-4 text-purple-600" />
                            </div>
                            <span className="text-sm text-gray-700">Alert Center</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Settings className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-600">Drag & Drop</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                              <MessageSquare className="w-4 h-4 text-green-600" />
                            </div>
                            <span className="text-sm text-gray-700">Messages</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-green-600">Visible</span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center justify-center">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                          Fully customizable layout
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 3: Real-Time Data Sync */}
                <div className="w-full flex-shrink-0 px-2">
                  <div className="flex gap-8 items-start h-96">
                    <div className="group relative bg-white/10 rounded-3xl p-8 hover:shadow-xl transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex flex-col h-full w-1/2">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-teal-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <Activity className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">Real-Time Data Sync</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          Dashboards pull live data from across CLASSRAUM—meaning users always see the latest grades, messages, lesson updates, and alerts.
                        </p>
                      </div>
                    </div>
                    <div className="w-1/2 bg-white rounded-2xl shadow-lg p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">Live Data Updates</div>
                      <div className="space-y-3">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-green-700 mb-1">Grades & Assignments</div>
                          <div className="text-xs text-green-600">✓ Synced • Updated 30 seconds ago</div>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-blue-700 mb-1">Attendance Records</div>
                          <div className="text-xs text-blue-600">✓ Live • Real-time tracking active</div>
                        </div>
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-purple-700 mb-1">Messages & Alerts</div>
                          <div className="text-xs text-purple-600">✓ Instant • Push notifications enabled</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center justify-center">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-1 animate-pulse"></div>
                          <div className="w-2 h-2 bg-purple-500 rounded-full mr-2 animate-pulse"></div>
                          All systems synchronized
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 4: Adaptive Highlights */}
                <div className="w-full flex-shrink-0 px-2">
                  <div className="flex gap-8 items-start h-96">
                    <div className="group relative bg-white/10 rounded-3xl p-8 hover:shadow-xl transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex flex-col h-full w-1/2">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-red-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <Eye className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">Adaptive Highlights</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          The system learns what each user frequently checks and begins surfacing those items more prominently over time.
                        </p>
                      </div>
                    </div>
                    <div className="w-1/2 bg-white rounded-2xl shadow-lg p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">AI Learning Patterns</div>
                      <div className="space-y-3">
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-orange-700 mb-1">Most Accessed</div>
                          <div className="text-xs text-orange-600">Student performance data • Viewed 23 times</div>
                          <div className="text-xs text-gray-500 mt-1">→ Now priority widget</div>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-blue-700 mb-1">Usage Pattern</div>
                          <div className="text-xs text-blue-600">Checks messages first • Every morning</div>
                          <div className="text-xs text-gray-500 mt-1">→ Auto-positioned top-left</div>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-green-700 mb-1">Smart Suggestions</div>
                          <div className="text-xs text-green-600">Recommending attendance widget</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center justify-center">
                          <div className="w-2 h-2 bg-orange-500 rounded-full mr-2 animate-pulse"></div>
                          AI learning your preferences
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
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <Users className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">Role-Based Personalization</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          Each dashboard is automatically tailored based on user type—whether you're a homeroom teacher, subject lead, parent, or student.
                        </p>
                      </div>
                    </div>
                    <div className="w-1/2 bg-white rounded-2xl shadow-lg p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">User Role Dashboard Views</div>
                      <div className="space-y-4">
                        <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
                          <div className="text-xs font-medium text-blue-700 mb-1">Teacher Dashboard</div>
                          <div className="text-sm text-gray-700">Today's schedule, student alerts, lesson status</div>
                          <div className="text-xs text-gray-500 mt-1">📊 Class performance • 📝 Upcoming lessons</div>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-400">
                          <div className="text-xs font-medium text-green-700 mb-1">Parent Dashboard</div>
                          <div className="text-sm text-gray-700">Child's progress, attendance, messages</div>
                          <div className="text-xs text-gray-500 mt-1">📈 Academic trends • 📅 Upcoming events</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center">
                          <div className="w-2 h-2 bg-purple-500 rounded-full mr-2 animate-pulse"></div>
                          Auto-configured based on user role
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
              <h3 className="text-xl font-medium text-[#4a90e2]" style={{ fontFamily: 'Kalam, Comic Sans MS, cursive' }}>Made for Decision-Makers at Every Level</h3>
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 px-6">
              Empower Every User with the Right Information, Instantly
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                title: "For Teachers",
                description: "Quickly view today's schedule, upcoming assignments, student performance alerts, and lesson plan status—all in one place.",
                icon: BookOpen,
                iconColor: "text-blue-600",
                iconBg: "bg-blue-100",
                graphic: (
                  <div className="mt-6 bg-gray-50 rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-700 mb-3">Teacher Dashboard View</div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Calendar className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="text-sm text-gray-700">Today: 5 classes, 2 meetings</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                          <AlertTriangle className="w-4 h-4 text-orange-600" />
                        </div>
                        <span className="text-sm text-gray-700">3 students need attention</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        </div>
                        <span className="text-sm text-gray-700">Lesson plans up to date</span>
                      </div>
                    </div>
                  </div>
                )
              },
              {
                title: "For Students",
                description: "See upcoming deadlines, grades, class messages, and attendance—all organized by priority and updated in real time.",
                icon: Users,
                iconColor: "text-green-600",
                iconBg: "bg-green-100",
                graphic: (
                  <div className="mt-6 bg-gray-50 rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-700 mb-3">Student Priority View</div>
                    <div className="space-y-3">
                      <div className="bg-red-50 border-l-4 border-red-400 p-2 rounded">
                        <div className="text-xs font-medium text-red-700">URGENT: Math assignment due tomorrow</div>
                      </div>
                      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-2 rounded">
                        <div className="text-xs font-medium text-yellow-700">Science test next week</div>
                      </div>
                      <div className="bg-green-50 border-l-4 border-green-400 p-2 rounded">
                        <div className="text-xs font-medium text-green-700">English essay submitted ✓</div>
                      </div>
                    </div>
                  </div>
                )
              },
              {
                title: "For Parents",
                description: "Monitor academic progress, attendance patterns, teacher messages, and school-wide announcements without navigating multiple tabs.",
                icon: Users,
                iconColor: "text-purple-600",
                iconBg: "bg-purple-100",
                graphic: (
                  <div className="mt-6 bg-gray-50 rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-700 mb-3">Parent Overview</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-blue-50 p-2 rounded text-center">
                        <div className="font-medium text-blue-700">Attendance</div>
                        <div className="text-blue-600">95%</div>
                      </div>
                      <div className="bg-green-50 p-2 rounded text-center">
                        <div className="font-medium text-green-700">Avg Grade</div>
                        <div className="text-green-600">87%</div>
                      </div>
                      <div className="bg-purple-50 p-2 rounded text-center">
                        <div className="font-medium text-purple-700">Messages</div>
                        <div className="text-purple-600">2 new</div>
                      </div>
                      <div className="bg-orange-50 p-2 rounded text-center">
                        <div className="font-medium text-orange-700">Events</div>
                        <div className="text-orange-600">3 upcoming</div>
                      </div>
                    </div>
                  </div>
                )
              },
              {
                title: "For Administrators",
                description: "Access high-level trends, teacher performance, student engagement metrics, and school-wide alerts at a glance.",
                icon: BarChart3,
                iconColor: "text-orange-600",
                iconBg: "bg-orange-100",
                graphic: (
                  <div className="mt-6 bg-gray-50 rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-700 mb-3">Admin Analytics</div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">School Attendance</span>
                        <span className="text-xs font-medium text-green-600">92.5%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">Teacher Satisfaction</span>
                        <span className="text-xs font-medium text-blue-600">4.2/5</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">Active Alerts</span>
                        <span className="text-xs font-medium text-orange-600">7 pending</span>
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

        {/* Features That Work Section */}
        <section className="mb-24">
          <div className="text-center mb-16">
            <div className="mb-2">
              <h3 className="text-xl font-medium text-[#4a90e2]" style={{ fontFamily: 'Kalam, Comic Sans MS, cursive' }}>Features That Work the Way You Do</h3>
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 px-6">
              Built-In Tools That Save Time, Not Just Look Nice
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                title: "Modular Design",
                description: "Add or remove modules based on user preference or school policy—no one sees unnecessary clutter.",
                icon: Layout,
                iconColor: "text-blue-600",
                iconBg: "bg-blue-100"
              },
              {
                title: "Smart Notifications Center",
                description: "Actionable alerts sorted by urgency: missing assignments, upcoming events, attendance flags, or unread messages.",
                icon: Bell,
                iconColor: "text-orange-600",
                iconBg: "bg-orange-100"
              },
              {
                title: "Quick Action Panel",
                description: "Upload a lesson, send a message, assign homework, or generate a report—right from your dashboard without jumping into other modules.",
                icon: Zap,
                iconColor: "text-purple-600",
                iconBg: "bg-purple-100"
              },
              {
                title: "Performance Snapshot Widgets",
                description: "Real-time visualizations of attendance, grades, and behavior for quick insight into individual or class-level performance.",
                icon: BarChart3,
                iconColor: "text-green-600",
                iconBg: "bg-green-100"
              }
            ].map((feature, index) => (
              <div key={index} className="group bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-gray-200 transition-all duration-300">
                <div className="flex items-start space-x-4">
                  <div className={`w-12 h-12 ${feature.iconBg} rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 group-hover:shadow-lg transition-all duration-500 ease-out`}>
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
              <h3 className="text-xl font-medium text-[#4a90e2]" style={{ fontFamily: 'Kalam, Comic Sans MS, cursive' }}>Designed for Real Life, Not Just Screens</h3>
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 px-6">
              What Makes This Dashboard Different
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                title: "Cross-Platform Ready",
                description: "Access your full dashboard on desktop, tablet, or mobile—with layout and data intelligently adjusted for each screen.",
                icon: Smartphone,
                iconColor: "text-blue-600",
                iconBg: "bg-blue-100"
              },
              {
                title: "Focus-Friendly Design",
                description: "Clean UI with intentional spacing, dark mode support, and accessibility features to reduce cognitive load and eye strain.",
                icon: Eye,
                iconColor: "text-purple-600",
                iconBg: "bg-purple-100"
              },
              {
                title: "Instant Messaging Integration",
                description: "See and respond to messages directly from your dashboard without switching tools.",
                icon: MessageSquare,
                iconColor: "text-green-600",
                iconBg: "bg-green-100"
              },
              {
                title: "Language Localization Support",
                description: "Dashboards are available in multiple languages to support multilingual schools and diverse parent communities.",
                icon: Globe,
                iconColor: "text-orange-600",
                iconBg: "bg-orange-100"
              }
            ].map((feature, index) => (
              <div key={index} className="group bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-gray-200 transition-all duration-300">
                <div className="flex items-start space-x-4">
                  <div className={`w-12 h-12 ${feature.iconBg} rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 group-hover:shadow-lg transition-all duration-500 ease-out`}>
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
                <h3 className="text-xl font-medium text-[#4a90e2]" style={{ fontFamily: 'Kalam, Comic Sans MS, cursive' }}>What It Means for Your Institution</h3>
              </div>
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 px-6">
                A Dashboard That Actually Drives Results
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
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors duration-300">Boost Communication and Transparency</h3>
                      <p className="text-gray-700 text-sm">Everyone—from teacher to parent—has real-time access to the same, reliable data.</p>
                    </div>
                  </div>
                </div>

                <div className="group rounded-2xl border-2 border-gray-200 bg-white p-6 hover:border-blue-400 hover:bg-blue-50/30 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 cursor-pointer min-h-[140px] flex items-center">
                  <div className="flex items-start space-x-4 w-full">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors duration-300">Improve Decision-Making</h3>
                      <p className="text-gray-700 text-sm">Give educators and admins the information they need, when they need it—so action can be taken earlier, not later.</p>
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
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-green-600 transition-colors duration-300">Reduce Platform Fatigue</h3>
                      <p className="text-gray-700 text-sm">With everything in one place, users don't have to click through dozens of screens to get work done.</p>
                    </div>
                  </div>
                </div>

                <div className="group rounded-2xl border-2 border-gray-200 bg-white p-6 hover:border-orange-400 hover:bg-orange-50/30 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 cursor-pointer min-h-[140px] flex items-center">
                  <div className="flex items-start space-x-4 w-full">
                    <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors duration-300">Strengthen Accountability and Engagement</h3>
                      <p className="text-gray-700 text-sm">When expectations are visible and performance is tracked clearly, follow-through becomes the norm.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center py-20 bg-gradient-to-r from-primary/10 to-purple-600/10 rounded-3xl">
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 px-6">
            Ready to Transform Your Dashboard Experience?
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Join thousands of educators who have personalized their workflow with intelligent dashboards.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-base px-8">
              Start Free Trial →
            </Button>
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
    </>
  )
}