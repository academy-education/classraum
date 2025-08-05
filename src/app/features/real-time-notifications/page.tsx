"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { BellRing, ChevronLeft, ChevronRight, Users, Smartphone, AlertTriangle, ArrowRight, Bell, CheckCircle, Mail, Settings, FileText, MessageSquare, BookOpen, BarChart3, Activity, Layout, Zap, Clock, Eye } from "lucide-react"
import { useState } from "react"
import Header from "@/components/shared/Header"

export default function RealTimeNotificationsPage() {
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
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-8">
            <BellRing className="w-10 h-10 text-white" />
          </div>
          
          <h1 className="text-4xl lg:text-6xl font-bold leading-none mb-4">
            Real-Time Notifications
          </h1>
          
          <p className="text-xl text-[#4a90e2] font-medium mb-4">
            Stay Informed. Stay Connected. Instantly.
          </p>
          
          <p className="text-lg text-[#163e64] max-w-3xl mx-auto mb-24">
            In fast-paced academic environments, timing matters. CLASSRAUM's Real-Time Notification system ensures that every update—whether it's a new assignment, an absence alert, a parent message, or a schedule change—reaches the right people at the right moment. No delays. No confusion. Just clear, instant communication that keeps your entire school ecosystem aligned.
          </p>
        </div>
      </main>

      {/* Instant, Intelligent Alerts Section */}
      <section className="bg-gradient-to-br from-gray-900 to-slate-800 py-24 w-full">
        <div className="mx-auto px-6" style={{ maxWidth: '1200px' }}>
          <div className="text-center mb-24">
            <div className="mb-2">
              <h3 className="text-xl font-medium text-[#4a90e2]" style={{ fontFamily: 'Kalam, Comic Sans MS, cursive' }}>Instant, Intelligent Alerts</h3>
            </div>
            <h2 className="text-5xl lg:text-5xl font-bold text-white mb-6">
              Notifications That <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-500">Work as Hard as You Do</span>
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

                {/* Card 1: Role-Specific Messaging */}
                <div className="w-full flex-shrink-0 px-2">
                  <div className="flex gap-8 items-start h-96">
                    <div className="group relative bg-white/10 rounded-3xl p-8 hover:shadow-xl transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex flex-col h-full w-1/2">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <Users className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">Role-Specific Messaging</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          Teachers, students, parents, and admins receive only the notifications that are relevant to them—no unnecessary noise.
                        </p>
                      </div>
                    </div>
                    <div className="w-1/2 bg-white rounded-2xl shadow-lg p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">Smart Role Filtering</div>
                      <div className="space-y-4">
                        <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
                          <div className="text-xs font-medium text-blue-700 mb-1">Teacher Notifications</div>
                          <div className="text-sm text-gray-700">Student submissions, parent messages</div>
                          <div className="text-xs text-gray-500 mt-1">📧 Email + Push • 12 active</div>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-400">
                          <div className="text-xs font-medium text-green-700 mb-1">Parent Notifications</div>
                          <div className="text-sm text-gray-700">Attendance, grades, messages</div>
                          <div className="text-xs text-gray-500 mt-1">📱 SMS + App • 8 active</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
                          Smart filtering • Zero spam
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 2: Multi-Channel Delivery */}
                <div className="w-full flex-shrink-0 px-2">
                  <div className="flex gap-8 items-start h-96">
                    <div className="group relative bg-white/10 rounded-3xl p-8 hover:shadow-xl transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex flex-col h-full w-1/2">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <Smartphone className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">Multi-Channel Delivery</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          Choose where alerts are sent: in-app, mobile push, SMS, or email. All synchronized in real time.
                        </p>
                      </div>
                    </div>
                    <div className="w-1/2 bg-white rounded-2xl shadow-lg p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">Delivery Channels</div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Bell className="w-4 h-4 text-blue-600" />
                            </div>
                            <span className="text-sm text-gray-700">In-App Notifications</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-green-600">Active</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                              <Smartphone className="w-4 h-4 text-purple-600" />
                            </div>
                            <span className="text-sm text-gray-700">Mobile Push</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-green-600">Active</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                              <Mail className="w-4 h-4 text-green-600" />
                            </div>
                            <span className="text-sm text-gray-700">Email & SMS</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Settings className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-600">Configurable</span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center justify-center">
                          <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                          All channels synchronized
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 3: Urgency-Based Categorization */}
                <div className="w-full flex-shrink-0 px-2">
                  <div className="flex gap-8 items-start h-96">
                    <div className="group relative bg-white/10 rounded-3xl p-8 hover:shadow-xl transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex flex-col h-full w-1/2">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-red-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <AlertTriangle className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">Urgency-Based Categorization</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          Critical alerts (like attendance issues or assignment deadlines) are automatically prioritized and highlighted.
                        </p>
                      </div>
                    </div>
                    <div className="w-1/2 bg-white rounded-2xl shadow-lg p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">Priority Classification</div>
                      <div className="space-y-3">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-red-700 mb-1">URGENT</div>
                          <div className="text-xs text-red-600">Student absence patterns • Deadline alerts</div>
                          <div className="text-xs text-gray-500 mt-1">→ Immediate notification</div>
                        </div>
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-orange-700 mb-1">HIGH</div>
                          <div className="text-xs text-orange-600">Grade submissions • Parent messages</div>
                          <div className="text-xs text-gray-500 mt-1">→ Within 5 minutes</div>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-blue-700 mb-1">NORMAL</div>
                          <div className="text-xs text-blue-600">Assignment updates • Schedule changes</div>
                          <div className="text-xs text-gray-500 mt-1">→ Next notification cycle</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center justify-center">
                          <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></div>
                          AI-powered priority detection
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 4: Contextual Linking */}
                <div className="w-full flex-shrink-0 px-2">
                  <div className="flex gap-8 items-start h-96">
                    <div className="group relative bg-white/10 rounded-3xl p-8 hover:shadow-xl transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex flex-col h-full w-1/2">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-teal-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <ArrowRight className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">Contextual Linking</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          Every notification links directly to the relevant page—lesson plan, student profile, gradebook, or message thread—for fast follow-up and action.
                        </p>
                      </div>
                    </div>
                    <div className="w-1/2 bg-white rounded-2xl shadow-lg p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">Smart Action Links</div>
                      <div className="space-y-3">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-blue-700 mb-1">Assignment Notification</div>
                          <div className="text-xs text-blue-600">→ Directly to gradebook entry</div>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-green-700 mb-1">Parent Message</div>
                          <div className="text-xs text-green-600">→ Opens message thread</div>
                        </div>
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-purple-700 mb-1">Attendance Alert</div>
                          <div className="text-xs text-purple-600">→ Student profile page</div>
                        </div>
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-orange-700 mb-1">Schedule Change</div>
                          <div className="text-xs text-orange-600">→ Updated calendar view</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center justify-center">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                          One-click actions
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
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <Users className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">Role-Specific Messaging</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          Teachers, students, parents, and admins receive only the notifications that are relevant to them—no unnecessary noise.
                        </p>
                      </div>
                    </div>
                    <div className="w-1/2 bg-white rounded-2xl shadow-lg p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">Smart Role Filtering</div>
                      <div className="space-y-4">
                        <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
                          <div className="text-xs font-medium text-blue-700 mb-1">Teacher Notifications</div>
                          <div className="text-sm text-gray-700">Student submissions, parent messages</div>
                          <div className="text-xs text-gray-500 mt-1">📧 Email + Push • 12 active</div>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-400">
                          <div className="text-xs font-medium text-green-700 mb-1">Parent Notifications</div>
                          <div className="text-sm text-gray-700">Attendance, grades, messages</div>
                          <div className="text-xs text-gray-500 mt-1">📱 SMS + App • 8 active</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
                          Smart filtering • Zero spam
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
        {/* Designed for Clear Communication Section */}
        <section className="mb-24">
          <div className="text-center mb-16">
            <div className="mb-2">
              <h3 className="text-xl font-medium text-[#4a90e2]" style={{ fontFamily: 'Kalam, Comic Sans MS, cursive' }}>Designed for Clear Communication</h3>
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 px-6">
              Keep Everyone on the Same Page—Always
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                title: "For Teachers",
                description: "Get notified the moment students submit assignments, miss class, message you, or need feedback.",
                icon: BookOpen,
                iconColor: "text-blue-600",
                iconBg: "bg-blue-100",
                graphic: (
                  <div className="mt-6 bg-gray-50 rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-700 mb-3">Teacher Notification Hub</div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <FileText className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="text-sm text-gray-700">3 new assignments submitted</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                          <AlertTriangle className="w-4 h-4 text-orange-600" />
                        </div>
                        <span className="text-sm text-gray-700">2 students absent today</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                          <MessageSquare className="w-4 h-4 text-green-600" />
                        </div>
                        <span className="text-sm text-gray-700">Parent message waiting</span>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-200">
                      <div className="text-xs text-gray-500 flex items-center">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
                        Real-time updates
                      </div>
                    </div>
                  </div>
                )
              },
              {
                title: "For Students",
                description: "Never miss an assignment, grade update, or schedule change. Stay on track without guesswork.",
                icon: Users,
                iconColor: "text-green-600",
                iconBg: "bg-green-100",
                graphic: (
                  <div className="mt-6 bg-gray-50 rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-700 mb-3">Student Priority Alerts</div>
                    <div className="space-y-3">
                      <div className="bg-red-50 border-l-4 border-red-400 p-2 rounded">
                        <div className="text-xs font-medium text-red-700">DUE TOMORROW: Math homework</div>
                      </div>
                      <div className="bg-blue-50 border-l-4 border-blue-400 p-2 rounded">
                        <div className="text-xs font-medium text-blue-700">Grade posted: Science quiz - 87%</div>
                      </div>
                      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-2 rounded">
                        <div className="text-xs font-medium text-yellow-700">Schedule change: Assembly moved to 10 AM</div>
                      </div>
                    </div>
                  </div>
                )
              },
              {
                title: "For Parents",
                description: "Receive timely updates on attendance, grades, class news, and direct messages—without logging in constantly.",
                icon: Users,
                iconColor: "text-purple-600",
                iconBg: "bg-purple-100",
                graphic: (
                  <div className="mt-6 bg-gray-50 rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-700 mb-3">Parent Dashboard</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-green-50 p-2 rounded text-center">
                        <div className="font-medium text-green-700">Today's Attendance</div>
                        <div className="text-green-600">✓ Present</div>
                      </div>
                      <div className="bg-blue-50 p-2 rounded text-center">
                        <div className="font-medium text-blue-700">New Grade</div>
                        <div className="text-blue-600">History: A-</div>
                      </div>
                      <div className="bg-purple-50 p-2 rounded text-center">
                        <div className="font-medium text-purple-700">Teacher Message</div>
                        <div className="text-purple-600">1 unread</div>
                      </div>
                      <div className="bg-orange-50 p-2 rounded text-center">
                        <div className="font-medium text-orange-700">Upcoming</div>
                        <div className="text-orange-600">Field trip</div>
                      </div>
                    </div>
                  </div>
                )
              },
              {
                title: "For Admins",
                description: "Monitor key events across all classes and branches. Be the first to know about staff activity, flagged trends, or urgent issues.",
                icon: BarChart3,
                iconColor: "text-orange-600",
                iconBg: "bg-orange-100",
                graphic: (
                  <div className="mt-6 bg-gray-50 rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-700 mb-3">Admin Overview</div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">System Alerts</span>
                        <span className="text-xs font-medium text-red-600">3 urgent</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">Teacher Activity</span>
                        <span className="text-xs font-medium text-green-600">All active</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">School Trends</span>
                        <span className="text-xs font-medium text-blue-600">2 flagged</span>
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

        {/* Smart Features Section */}
        <section className="mb-24">
          <div className="text-center mb-16">
            <div className="mb-2">
              <h3 className="text-xl font-medium text-[#4a90e2]" style={{ fontFamily: 'Kalam, Comic Sans MS, cursive' }}>Smart Features, Seamlessly Built In</h3>
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 px-6">
              Powerfully Integrated with Everything You Use
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                title: "Real-Time Sync Across Modules",
                description: "Notifications are automatically triggered by activity in lesson plans, attendance, grades, messages, and more—no need to manage separate alert settings.",
                icon: Activity,
                iconColor: "text-blue-600",
                iconBg: "bg-blue-100"
              },
              {
                title: "Custom Alerts for Events & Policies",
                description: "Create school-wide announcements, academic calendar reminders, or policy updates and instantly notify relevant audiences.",
                icon: Bell,
                iconColor: "text-purple-600",
                iconBg: "bg-purple-100"
              },
              {
                title: "Central Notification Hub",
                description: "All alerts are collected in one unified inbox with filters by type, urgency, and user role—making it easy to review or take action later.",
                icon: Layout,
                iconColor: "text-green-600",
                iconBg: "bg-green-100"
              },
              {
                title: "Smart Mute Options",
                description: "Control when and how you receive alerts—pause non-urgent notifications during class time, weekends, or exam weeks.",
                icon: Settings,
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

        {/* The Impact Section */}
        <section className="mb-24">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <div className="mb-2">
                <h3 className="text-xl font-medium text-[#4a90e2]" style={{ fontFamily: 'Kalam, Comic Sans MS, cursive' }}>The Impact of Staying Connected</h3>
              </div>
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 px-6">
                What Real-Time Notifications Deliver for Your Academy
              </h2>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-6">
                <div className="group rounded-2xl border-2 border-gray-200 bg-white p-6 hover:border-indigo-400 hover:bg-indigo-50/30 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 cursor-pointer min-h-[140px] flex items-center">
                  <div className="flex items-start space-x-4 w-full">
                    <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors duration-300">Faster Response, Less Confusion</h3>
                      <p className="text-gray-700 text-sm">Real-time alerts prevent missed deadlines, miscommunication, and lag in follow-ups.</p>
                    </div>
                  </div>
                </div>

                <div className="group rounded-2xl border-2 border-gray-200 bg-white p-6 hover:border-purple-400 hover:bg-purple-50/30 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 cursor-pointer min-h-[140px] flex items-center">
                  <div className="flex items-start space-x-4 w-full">
                    <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors duration-300">Stronger Parent & Student Engagement</h3>
                      <p className="text-gray-700 text-sm">Keep families actively involved and informed without adding more manual work for teachers.</p>
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
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-green-600 transition-colors duration-300">Less Admin Chasing, More Teaching Time</h3>
                      <p className="text-gray-700 text-sm">No more repeating announcements or chasing follow-ups—notifications ensure information reaches the right people, instantly.</p>
                    </div>
                  </div>
                </div>

                <div className="group rounded-2xl border-2 border-gray-200 bg-white p-6 hover:border-blue-400 hover:bg-blue-50/30 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 cursor-pointer min-h-[140px] flex items-center">
                  <div className="flex items-start space-x-4 w-full">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <Eye className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors duration-300">Total Visibility, Zero Guesswork</h3>
                      <p className="text-gray-700 text-sm">With everything tracked, timestamped, and actionable, accountability improves at every level.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center py-20 bg-gradient-to-r from-primary/10 to-indigo-600/10 rounded-3xl">
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 px-6">
            Ready to Transform Your Communication?
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Join thousands of educators who have enhanced their school communication with intelligent real-time notifications.
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
    </>
  )
}