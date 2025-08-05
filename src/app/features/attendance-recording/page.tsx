"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ClipboardCheck, ChevronLeft, ChevronRight, UserCheck, Activity, Bell, Eye, FileText, BookOpen, Target, BarChart3, Users, Smartphone, Shield, TrendingUp, PlusCircle, AlertTriangle, MessageSquare, Clock } from "lucide-react"
import { useState } from "react"
import Header from "@/components/shared/Header"

export default function AttendanceRecordingPage() {
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
          <div className="w-20 h-20 bg-gradient-to-br from-orange-600 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-8">
            <ClipboardCheck className="w-10 h-10 text-white" />
          </div>
          
          <h1 className="text-4xl lg:text-6xl font-bold leading-none mb-4">
            Attendance & Material Recording
          </h1>
          
          <p className="text-xl text-[#4a90e2] font-medium mb-4">
            Track What Matters. Teach Without Disruption.
          </p>
          
          <p className="text-lg text-[#163e64] max-w-3xl mx-auto mb-24">
            In education, details matter—but tracking them shouldn't slow you down. CLASSRAUM's Attendance & Material Recording system streamlines two of the most time-consuming daily tasks with speed, accuracy, and automation. Whether you're marking attendance, logging teaching materials, or reviewing what's been covered, CLASSRAUM ensures that nothing falls through the cracks—and everything syncs across the platform in real time.
          </p>
        </div>
      </main>

      {/* Attendance Reimagined Section */}
      <section className="bg-gradient-to-br from-gray-900 to-slate-800 py-24 w-full">
        <div className="mx-auto px-6" style={{ maxWidth: '1200px' }}>
          <div className="text-center mb-24">
            <div className="mb-2">
              <h3 className="text-xl font-medium text-[#4a90e2]" style={{ fontFamily: 'Kalam, Comic Sans MS, cursive' }}>Attendance Reimagined</h3>
            </div>
            <h2 className="text-5xl lg:text-5xl font-bold text-white mb-6">
              From Roll Call to <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-500">Real-Time Insight</span>
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

                {/* Card 1: One-Tap Attendance Logging */}
                <div className="w-full flex-shrink-0 px-2">
                  <div className="flex gap-8 items-start h-96">
                    <div className="group relative bg-white/10 rounded-3xl p-8 hover:shadow-xl transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex flex-col h-full w-1/2">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-teal-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <UserCheck className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">One-Tap Attendance Logging</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          Mark student attendance in seconds—by class, subject, or homeroom—with intuitive controls optimized for mobile or desktop.
                        </p>
                      </div>
                    </div>
                    <div className="w-1/2 bg-white rounded-2xl shadow-lg p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">Quick Attendance Interface</div>
                      <div className="space-y-4">
                        <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-400">
                          <div className="text-xs font-medium text-green-700 mb-1">Math Class - Period 2</div>
                          <div className="text-sm text-gray-700">24/26 students present</div>
                          <div className="text-xs text-gray-500 mt-1">✓ Logged in 15 seconds</div>
                        </div>
                        <div className="bg-orange-50 p-3 rounded-lg border-l-4 border-orange-400">
                          <div className="text-xs font-medium text-orange-700 mb-1">Absent Students</div>
                          <div className="text-sm text-gray-700">Sarah M. • Alex K.</div>
                          <div className="text-xs text-gray-500 mt-1">📱 Parents auto-notified</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                          One-tap logging • Mobile optimized
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 2: Auto-Sync with Class Schedules */}
                <div className="w-full flex-shrink-0 px-2">
                  <div className="flex gap-8 items-start h-96">
                    <div className="group relative bg-white/10 rounded-3xl p-8 hover:shadow-xl transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex flex-col h-full w-1/2">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <Activity className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">Auto-Sync with Class Schedules</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          CLASSRAUM connects attendance directly to the class timetable, ensuring no extra setup and zero manual syncing.
                        </p>
                      </div>
                    </div>
                    <div className="w-1/2 bg-white rounded-2xl shadow-lg p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">Schedule Integration</div>
                      <div className="space-y-3">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-blue-700 mb-1">Today's Classes</div>
                          <div className="text-xs text-blue-600">✓ Auto-populated from timetable</div>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-green-700 mb-1">Class Rosters</div>
                          <div className="text-xs text-green-600">✓ Updated automatically</div>
                        </div>
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-purple-700 mb-1">Attendance Records</div>
                          <div className="text-xs text-purple-600">✓ Synced across all modules</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center justify-center">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                          <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                          Zero manual setup required
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 3: Smart Alerts for Absence Trends */}
                <div className="w-full flex-shrink-0 px-2">
                  <div className="flex gap-8 items-start h-96">
                    <div className="group relative bg-white/10 rounded-3xl p-8 hover:shadow-xl transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex flex-col h-full w-1/2">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <Bell className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">Smart Alerts for Absence Trends</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          Get notified when a student has multiple absences, shows irregular patterns, or misses key learning moments—automatically flagged for follow-up.
                        </p>
                      </div>
                    </div>
                    <div className="w-1/2 bg-white rounded-2xl shadow-lg p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">Smart Alert System</div>
                      <div className="space-y-3">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-red-700 mb-1">Pattern Alert</div>
                          <div className="text-xs text-red-600">Emma T. - 5 absences this week</div>
                          <div className="text-xs text-gray-500 mt-1">→ Counselor notified</div>
                        </div>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-yellow-700 mb-1">Key Lesson Missed</div>
                          <div className="text-xs text-yellow-600">Jake R. - Missed algebra test review</div>
                          <div className="text-xs text-gray-500 mt-1">→ Teacher flagged for follow-up</div>
                        </div>
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-orange-700 mb-1">Attendance Drop</div>
                          <div className="text-xs text-orange-600">Class average: 85% (down from 92%)</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center justify-center">
                          <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></div>
                          AI-powered pattern recognition
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 4: Parent & Admin Visibility */}
                <div className="w-full flex-shrink-0 px-2">
                  <div className="flex gap-8 items-start h-96">
                    <div className="group relative bg-white/10 rounded-3xl p-8 hover:shadow-xl transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex flex-col h-full w-1/2">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-red-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <Eye className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">Parent & Admin Visibility</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          Attendance records are shared in real time with both administrators and parents, building trust and transparency with no extra messaging required.
                        </p>
                      </div>
                    </div>
                    <div className="w-1/2 bg-white rounded-2xl shadow-lg p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">Real-Time Visibility</div>
                      <div className="space-y-3">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-blue-700 mb-1">Parent Portal</div>
                          <div className="text-xs text-blue-600">Live attendance updates • No delay</div>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-green-700 mb-1">Admin Dashboard</div>
                          <div className="text-xs text-green-600">School-wide metrics • Trend analysis</div>
                        </div>
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-purple-700 mb-1">Auto Notifications</div>
                          <div className="text-xs text-purple-600">SMS/Email alerts • No manual messages</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center justify-center">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                          Transparent communication built-in
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
                        <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-teal-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <UserCheck className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">One-Tap Attendance Logging</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          Mark student attendance in seconds—by class, subject, or homeroom—with intuitive controls optimized for mobile or desktop.
                        </p>
                      </div>
                    </div>
                    <div className="w-1/2 bg-white rounded-2xl shadow-lg p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">Quick Attendance Interface</div>
                      <div className="space-y-4">
                        <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-400">
                          <div className="text-xs font-medium text-green-700 mb-1">Math Class - Period 2</div>
                          <div className="text-sm text-gray-700">24/26 students present</div>
                          <div className="text-xs text-gray-500 mt-1">✓ Logged in 15 seconds</div>
                        </div>
                        <div className="bg-orange-50 p-3 rounded-lg border-l-4 border-orange-400">
                          <div className="text-xs font-medium text-orange-700 mb-1">Absent Students</div>
                          <div className="text-sm text-gray-700">Sarah M. • Alex K.</div>
                          <div className="text-xs text-gray-500 mt-1">📱 Parents auto-notified</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                          One-tap logging • Mobile optimized
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
        {/* Material Recording Section */}
        <section className="mb-24">
          <div className="text-center mb-16">
            <div className="mb-2">
              <h3 className="text-xl font-medium text-[#4a90e2]" style={{ fontFamily: 'Kalam, Comic Sans MS, cursive' }}>Material Recording, Simplified</h3>
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 px-6">
              Know What Was Taught. Track What's Missing.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                title: "Log Materials with Every Class",
                description: "Teachers can easily record what was covered in class—topics, resources, links, files, and objectives—with just a few clicks.",
                icon: FileText,
                iconColor: "text-blue-600",
                iconBg: "bg-blue-100",
                graphic: (
                  <div className="mt-6 bg-gray-50 rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-700 mb-3">Quick Material Logging</div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <FileText className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="text-sm text-gray-700">Chapter 5: Photosynthesis</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                          <BookOpen className="w-4 h-4 text-green-600" />
                        </div>
                        <span className="text-sm text-gray-700">Video: Plant Cell Structure</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Target className="w-4 h-4 text-purple-600" />
                        </div>
                        <span className="text-sm text-gray-700">Objective: Understand energy conversion</span>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-200">
                      <div className="text-xs text-gray-500 flex items-center">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                        Logged in 30 seconds
                      </div>
                    </div>
                  </div>
                )
              },
              {
                title: "Tie Materials to Lessons & Assignments",
                description: "Everything logged can be linked to existing lesson plans and homework—creating a seamless timeline of instructional delivery.",
                icon: Target,
                iconColor: "text-green-600",
                iconBg: "bg-green-100",
                graphic: (
                  <div className="mt-6 bg-gray-50 rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-700 mb-3">Connected Learning Timeline</div>
                    <div className="space-y-3">
                      <div className="bg-blue-50 border-l-4 border-blue-400 p-2 rounded">
                        <div className="text-xs font-medium text-blue-700">Lesson Plan: Cell Biology</div>
                        <div className="text-xs text-gray-600">→ Material: Microscope lab</div>
                      </div>
                      <div className="bg-green-50 border-l-4 border-green-400 p-2 rounded">
                        <div className="text-xs font-medium text-green-700">Assignment: Cell Diagram</div>
                        <div className="text-xs text-gray-600">→ Due: Tomorrow</div>
                      </div>
                      <div className="bg-purple-50 border-l-4 border-purple-400 p-2 rounded">
                        <div className="text-xs font-medium text-purple-700">Resources Linked</div>
                        <div className="text-xs text-gray-600">→ Video, PDF, Lab notes</div>
                      </div>
                    </div>
                  </div>
                )
              },
              {
                title: "Daily & Weekly Overviews",
                description: "View what's been taught across a subject or grade level to ensure full curriculum coverage and eliminate unnecessary repetition.",
                icon: BarChart3,
                iconColor: "text-purple-600",
                iconBg: "bg-purple-100",
                graphic: (
                  <div className="mt-6 bg-gray-50 rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-700 mb-3">Curriculum Coverage</div>
                    <div className="flex items-end space-x-2 h-12 mb-3">
                      {[75, 90, 60, 85, 95, 80].map((height, i) => (
                        <div key={i} className="bg-gradient-to-t from-purple-400 to-purple-600 rounded-t flex-1" style={{height: `${height}%`}}></div>
                      ))}
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mb-3">
                      <span>Week 1</span>
                      <span>Week 6</span>
                    </div>
                    <div className="text-xs text-gray-600">
                      <div className="flex justify-between">
                        <span>Coverage:</span>
                        <span className="font-medium text-purple-600">81%</span>
                      </div>
                    </div>
                  </div>
                )
              },
              {
                title: "Instant Access for Students & Parents",
                description: "Missed a class? Students can instantly review what was covered, and parents can stay informed without needing to ask.",
                icon: Users,
                iconColor: "text-orange-600",
                iconBg: "bg-orange-100",
                graphic: (
                  <div className="mt-6 bg-gray-50 rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-700 mb-3">Student & Parent Access</div>
                    <div className="space-y-3">
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-2">
                        <div className="text-xs font-medium text-orange-700">Student Portal</div>
                        <div className="text-xs text-orange-600">✓ Today's materials available</div>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                        <div className="text-xs font-medium text-blue-700">Parent Dashboard</div>
                        <div className="text-xs text-blue-600">✓ Weekly progress summary</div>
                      </div>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                        <div className="text-xs font-medium text-green-700">Catch-Up Resources</div>
                        <div className="text-xs text-green-600">✓ Auto-shared for absences</div>
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

        {/* Built with Your Day in Mind Section */}
        <section className="mb-24">
          <div className="text-center mb-16">
            <div className="mb-2">
              <h3 className="text-xl font-medium text-[#4a90e2]" style={{ fontFamily: 'Kalam, Comic Sans MS, cursive' }}>Built with Your Day in Mind</h3>
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 px-6">
              Features That Actually Make Teaching Easier
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                title: "Mobile-First for On-the-Go Logging",
                description: "Whether you're in the classroom, moving between branches, or teaching hybrid, you can mark attendance and log lessons directly from your phone.",
                icon: Smartphone,
                iconColor: "text-blue-600",
                iconBg: "bg-blue-100"
              },
              {
                title: "Tamper-Proof Records",
                description: "Secure logs for attendance and lesson materials ensure accountability and data integrity across your school.",
                icon: Shield,
                iconColor: "text-purple-600",
                iconBg: "bg-purple-100"
              },
              {
                title: "Linked to Performance Tracking",
                description: "Automatically connect absences and lesson coverage to grades, progress reports, and intervention tools—so nothing gets lost in the system.",
                icon: TrendingUp,
                iconColor: "text-green-600",
                iconBg: "bg-green-100"
              },
              {
                title: "Reuse Past Material Logs",
                description: "Copy and adapt previous logs for recurring classes or make quick edits for multi-class topics—saving time and effort.",
                icon: PlusCircle,
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

        {/* Real Impact Section */}
        <section className="mb-24">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <div className="mb-2">
                <h3 className="text-xl font-medium text-[#4a90e2]" style={{ fontFamily: 'Kalam, Comic Sans MS, cursive' }}>Real Impact, Not Just Records</h3>
              </div>
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 px-6">
                Why This Feature Matters for Your Whole Academy
              </h2>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-6">
                <div className="group rounded-2xl border-2 border-gray-200 bg-white p-6 hover:border-orange-400 hover:bg-orange-50/30 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 cursor-pointer min-h-[140px] flex items-center">
                  <div className="flex items-start space-x-4 w-full">
                    <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <AlertTriangle className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors duration-300">Catch At-Risk Students Early</h3>
                      <p className="text-gray-700 text-sm">With attendance trends and learning records in one place, educators can detect disengagement or falling behind before it becomes a problem.</p>
                    </div>
                  </div>
                </div>

                <div className="group rounded-2xl border-2 border-gray-200 bg-white p-6 hover:border-blue-400 hover:bg-blue-50/30 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 cursor-pointer min-h-[140px] flex items-center">
                  <div className="flex items-start space-x-4 w-full">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <MessageSquare className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors duration-300">Strengthen Communication Without Extra Work</h3>
                      <p className="text-gray-700 text-sm">Admins and parents automatically stay in the loop—no need for teachers to send separate updates.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <div className="group rounded-2xl border-2 border-gray-200 bg-white p-6 hover:border-purple-400 hover:bg-purple-50/30 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 cursor-pointer min-h-[140px] flex items-center">
                  <div className="flex items-start space-x-4 w-full">
                    <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors duration-300">Support Privacy-First Planning</h3>
                      <p className="text-gray-700 text-sm">Lesson and material logs are visible only to assigned classes and invited collaborators, ensuring content stays secure and intentionally shared.</p>
                    </div>
                  </div>
                </div>

                <div className="group rounded-2xl border-2 border-gray-200 bg-white p-6 hover:border-green-400 hover:bg-green-50/30 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 cursor-pointer min-h-[140px] flex items-center">
                  <div className="flex items-start space-x-4 w-full">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-green-600 transition-colors duration-300">Save Hours Every Week</h3>
                      <p className="text-gray-700 text-sm">With fast logging, auto-syncing, and reusable inputs, teachers gain back valuable time without sacrificing oversight.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center py-20 bg-gradient-to-r from-primary/10 to-orange-600/10 rounded-3xl">
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 px-6">
            Ready to Streamline Your Attendance & Recording?
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Join thousands of educators who have simplified their daily tracking with intelligent automation.
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