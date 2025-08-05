"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Calendar, ChevronLeft, ChevronRight, Target, Users, Activity, UserCheck, Lightbulb, Clock, CheckCircle, AlertTriangle, BarChart3, ArrowRight, FileText, Bell, Smartphone, PlusCircle, Zap, Globe } from "lucide-react"
import { useState } from "react"
import Header from "@/components/shared/Header"

export default function LessonAssignmentPlannerPage() {
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
          <div className="w-20 h-20 bg-gradient-to-br from-green-600 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-8">
            <Calendar className="w-10 h-10 text-white" />
          </div>
          
          <h1 className="text-4xl lg:text-6xl font-bold leading-none mb-4">
            Lesson & Assignment Planner
          </h1>
          
          <p className="text-xl text-[#4a90e2] font-medium mb-4">
            Plan smarter. Teach better. Keep everything in sync.
          </p>
          
          <p className="text-lg text-[#163e64] max-w-3xl mx-auto mb-24">
            CLASSRAUM's Lesson & Assignment Planner gives educators a centralized, intelligent platform to design lessons, assign work, and track progress—all in one place. With smart automation, collaboration tools, and real-time syncing across roles and schedules, teachers spend less time planning and more time teaching. No more juggling spreadsheets or sticky notes—just structured, effective, and flexible planning.
          </p>
        </div>
      </main>

      {/* Why It Stands Out Section */}
      <section className="bg-gradient-to-br from-gray-900 to-slate-800 py-24 w-full">
        <div className="mx-auto px-6" style={{ maxWidth: '1200px' }}>
          <div className="text-center mb-24">
            <div className="mb-2">
              <h3 className="text-xl font-medium text-[#4a90e2]" style={{ fontFamily: 'Kalam, Comic Sans MS, cursive' }}>Built to Simplify and Strengthen Lesson Planning</h3>
            </div>
            <h2 className="text-5xl lg:text-5xl font-bold text-white mb-6">
              Why <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-500">CLASSRAUM</span>&apos;s Lesson Planner Stands Out
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

                {/* Card 1: Assignment & Lesson Linkage */}
                <div className="w-full flex-shrink-0 px-2">
                  <div className="flex gap-8 items-start h-96">
                    <div className="group relative bg-white/10 rounded-3xl p-8 hover:shadow-xl transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex flex-col h-full w-1/2">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-teal-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <Target className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">Assignment & Lesson Linkage</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          Easily link assignments to specific lessons or units—so students and teachers can track relevance, learning outcomes, and deadlines in one view.
                        </p>
                      </div>
                    </div>
                    <div className="w-1/2 bg-white rounded-2xl shadow-lg p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">Connected Learning Flow</div>
                      <div className="space-y-4">
                        <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-400">
                          <div className="text-xs font-medium text-green-700 mb-1">Lesson 3: Fractions</div>
                          <div className="text-sm text-gray-700">Understanding denominators and numerators</div>
                          <div className="text-xs text-gray-500 mt-1">📝 Assignment linked: Practice Worksheet #3</div>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
                          <div className="text-xs font-medium text-blue-700 mb-1">Assignment: Practice Worksheet #3</div>
                          <div className="text-sm text-gray-700">Due: Tomorrow, 3:00 PM</div>
                          <div className="text-xs text-gray-500 mt-1">🎯 Learning outcome: Master basic fractions</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                          Automatically synced • 24 students notified
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 2: Collaborative Planning Tools */}
                <div className="w-full flex-shrink-0 px-2">
                  <div className="flex gap-8 items-start h-96">
                    <div className="group relative bg-white/10 rounded-3xl p-8 hover:shadow-xl transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex flex-col h-full w-1/2">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <Users className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">Collaborative Planning Tools</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          Invite co-teachers, subject leads, or curriculum directors to contribute to lesson planning with shared access, version control, and edit history.
                        </p>
                      </div>
                    </div>
                    <div className="w-1/2 bg-white rounded-2xl shadow-lg p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">Team Collaboration Dashboard</div>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-xs font-bold text-blue-600">MS</span>
                            </div>
                            <span className="text-sm text-gray-700">Ms. Smith (Lead Teacher)</span>
                          </div>
                          <span className="text-xs text-green-600 font-medium">Active</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                              <span className="text-xs font-bold text-purple-600">DJ</span>
                            </div>
                            <span className="text-sm text-gray-700">Dr. Johnson (Curriculum)</span>
                          </div>
                          <span className="text-xs text-blue-600 font-medium">Reviewing</span>
                        </div>
                        <div className="border-t pt-3">
                          <div className="text-xs font-medium text-gray-700 mb-2">Recent Changes</div>
                          <div className="text-xs text-gray-600">
                            • Ms. Smith added math objectives (2 min ago)<br/>
                            • Dr. Johnson approved science unit (1 hour ago)
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 flex items-center">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                          Version 2.3 • Auto-saved
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 3: Auto-Sync Across Timetables */}
                <div className="w-full flex-shrink-0 px-2">
                  <div className="flex gap-8 items-start h-96">
                    <div className="group relative bg-white/10 rounded-3xl p-8 hover:shadow-xl transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex flex-col h-full w-1/2">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <Activity className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">Auto-Sync Across Timetables</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          Once lessons or assignments are added, they automatically sync with class schedules, calendars, and student dashboards—no double entry required.
                        </p>
                      </div>
                    </div>
                    <div className="w-1/2 bg-white rounded-2xl shadow-lg p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">Real-Time Sync Status</div>
                      <div className="space-y-3">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-green-700 mb-1">Teacher Calendar</div>
                          <div className="text-xs text-green-600">✓ Synced • All lessons scheduled</div>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-blue-700 mb-1">Student Dashboards</div>
                          <div className="text-xs text-blue-600">✓ Updated • 156 students notified</div>
                        </div>
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-purple-700 mb-1">School Timetable</div>
                          <div className="text-xs text-purple-600">✓ Integrated • No conflicts found</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center justify-center">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
                          <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                          All systems synchronized
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 4: Built-In Attendance Integration */}
                <div className="w-full flex-shrink-0 px-2">
                  <div className="flex gap-8 items-start h-96">
                    <div className="group relative bg-white/10 rounded-3xl p-8 hover:shadow-xl transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex flex-col h-full w-1/2">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-red-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <UserCheck className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">Built-In Attendance Integration</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          Plan lessons and assignments with live student attendance data in mind—automatically flag students who missed key lessons or due dates and adjust plans accordingly.
                        </p>
                      </div>
                    </div>
                    <div className="w-1/2 bg-white rounded-2xl shadow-lg p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">Attendance-Based Planning</div>
                      <div className="space-y-3">
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-orange-700 mb-1">Students Requiring Catch-Up</div>
                          <div className="text-xs text-orange-600">3 students missed "Fractions Intro"</div>
                          <div className="text-xs text-gray-500 mt-1">→ Auto-assigned review materials</div>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-blue-700 mb-1">Today's Attendance</div>
                          <div className="text-xs text-blue-600">92% present • Plan proceeding as scheduled</div>
                        </div>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-red-700 mb-1">Upcoming Adjustments</div>
                          <div className="text-xs text-red-600">Sarah absent today • Assignment extended</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center justify-center">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                          Smart planning adjustments active
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
                          <Target className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">Assignment & Lesson Linkage</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          Easily link assignments to specific lessons or units—so students and teachers can track relevance, learning outcomes, and deadlines in one view.
                        </p>
                      </div>
                    </div>
                    <div className="w-1/2 bg-white rounded-2xl shadow-lg p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">Connected Learning Flow</div>
                      <div className="space-y-4">
                        <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-400">
                          <div className="text-xs font-medium text-green-700 mb-1">Lesson 3: Fractions</div>
                          <div className="text-sm text-gray-700">Understanding denominators and numerators</div>
                          <div className="text-xs text-gray-500 mt-1">📝 Assignment linked: Practice Worksheet #3</div>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
                          <div className="text-xs font-medium text-blue-700 mb-1">Assignment: Practice Worksheet #3</div>
                          <div className="text-sm text-gray-700">Due: Tomorrow, 3:00 PM</div>
                          <div className="text-xs text-gray-500 mt-1">🎯 Learning outcome: Master basic fractions</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                          Automatically synced • 24 students notified
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
              <h3 className="text-xl font-medium text-[#4a90e2]" style={{ fontFamily: 'Kalam, Comic Sans MS, cursive' }}>Smart Planning Features</h3>
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 px-6">
              Key Features & Benefits
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "AI-Assisted Suggestions",
                description: "Get recommendations on lesson content, pacing, and assessment types based on past data, student performance, and learning goals.",
                icon: Lightbulb,
                iconColor: "text-yellow-600",
                iconBg: "bg-yellow-100",
                graphic: (
                  <div className="mt-6 bg-gray-50 rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-700 mb-3">AI Recommendations</div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 group-hover:bg-yellow-200 transition-all duration-300 ease-out">
                          <Lightbulb className="w-4 h-4 text-yellow-600 group-hover:text-yellow-700" />
                        </div>
                        <span className="text-sm text-gray-700">Add visual aids for math lesson</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center group-hover:scale-110 group-hover:animate-pulse group-hover:bg-blue-200 transition-all duration-300 ease-out">
                          <Clock className="w-4 h-4 text-blue-600 group-hover:text-blue-700" />
                        </div>
                        <span className="text-sm text-gray-700">Extend lesson by 10 minutes</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center group-hover:scale-110 group-hover:bg-green-200 transition-all duration-300 ease-out">
                          <CheckCircle className="w-4 h-4 text-green-600 group-hover:text-green-700 group-hover:rotate-12 transition-transform duration-300" />
                        </div>
                        <span className="text-sm text-gray-700">Quick quiz recommended</span>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">AI Assistant</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                          <span className="text-sm font-medium text-blue-600">Learning</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              },
              {
                title: "Integrated with Attendance & Behavior Logs",
                description: "Automatically adjust plans based on student attendance or behavioral patterns—helping teachers personalize support and follow up more effectively.",
                icon: UserCheck,
                iconColor: "text-purple-600",
                iconBg: "bg-purple-100",
                graphic: (
                  <div className="mt-6 bg-gray-50 rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-700 mb-3">Smart Adjustments</div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 group-hover:bg-red-200 transition-all duration-300 ease-out">
                            <AlertTriangle className="w-4 h-4 text-red-600 group-hover:text-red-700" />
                          </div>
                          <span className="text-sm text-gray-700">3 Absent</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="text-sm font-medium text-orange-600">Review Added</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center group-hover:scale-110 group-hover:-rotate-3 group-hover:bg-green-200 transition-all duration-300 ease-out">
                            <CheckCircle className="w-4 h-4 text-green-600 group-hover:text-green-700" />
                          </div>
                          <span className="text-sm text-gray-700">Good Behavior</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="text-sm font-medium text-green-600">Bonus Activity</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-200 transition-all duration-300 ease-out">
                            <Users className="w-4 h-4 text-blue-600 group-hover:text-blue-700" />
                          </div>
                          <span className="text-sm text-gray-700">Group Work</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="text-sm font-medium text-blue-600">Optimized</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              },
              {
                title: "Progress Tracking Dashboard",
                description: "View lesson coverage and assignment completion at a glance. Instantly see who's behind, what needs revision, and what's upcoming.",
                icon: BarChart3,
                iconColor: "text-green-600",
                iconBg: "bg-green-100",
                graphic: (
                  <div className="mt-6 bg-gray-50 rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-700 mb-3">Class Progress Overview</div>
                    <div className="flex items-end space-x-2 h-12 mb-3">
                      {[85, 92, 78, 88, 94, 89].map((height, i) => (
                        <div key={i} className="bg-gradient-to-t from-green-400 to-green-600 rounded-t flex-1" style={{height: `${height}%`}}></div>
                      ))}
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mb-3">
                      <span>Lesson 1</span>
                      <span>Lesson 6</span>
                    </div>
                    <div className="pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Average Completion</span>
                        <div className="flex items-center space-x-1">
                          <ArrowRight className="w-3 h-3 text-green-600 rotate-[-45deg] group-hover:scale-125 group-hover:rotate-[-30deg] transition-all duration-300" />
                          <span className="text-sm font-medium text-green-600">87%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              },
              {
                title: "Instant Distribution & Access",
                description: "Distribute materials and instructions to students with one click. Assignments appear instantly on student dashboards with auto-reminders for due dates.",
                icon: PlusCircle,
                iconColor: "text-blue-600",
                iconBg: "bg-blue-100",
                graphic: (
                  <div className="mt-6 bg-gray-50 rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-700 mb-3">One-Click Distribution</div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 group-hover:bg-blue-200 transition-all duration-300 ease-out">
                            <FileText className="w-4 h-4 text-blue-600 group-hover:text-blue-700" />
                          </div>
                          <span className="text-sm text-gray-700">Math Worksheet</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <CheckCircle className="w-4 h-4 text-green-600 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300" />
                          <span className="text-sm font-medium text-green-600">Sent to 24</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center group-hover:scale-110 group-hover:-rotate-3 group-hover:bg-purple-200 transition-all duration-300 ease-out">
                            <Bell className="w-4 h-4 text-purple-600 group-hover:text-purple-700" />
                          </div>
                          <span className="text-sm text-gray-700">Due Reminders</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <CheckCircle className="w-4 h-4 text-green-600 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300" />
                          <span className="text-sm font-medium text-green-600">Auto-Set</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center group-hover:scale-110 group-hover:bg-orange-200 transition-all duration-300 ease-out">
                            <Smartphone className="w-4 h-4 text-orange-600 group-hover:text-orange-700" />
                          </div>
                          <span className="text-sm text-gray-700">Mobile Access</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <CheckCircle className="w-4 h-4 text-blue-600 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300" />
                          <span className="text-sm font-medium text-blue-600">Available</span>
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

        {/* Designed for Real-World Classrooms Section */}
        <section className="mb-24">
          <div className="text-center mb-16">
            <div className="mb-2">
              <h3 className="text-xl font-medium text-[#4a90e2]" style={{ fontFamily: 'Kalam, Comic Sans MS, cursive' }}>Built for Flexibility</h3>
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 px-6">
              Designed for Real-World Classrooms
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                title: "Handles Interruptions & Changes",
                description: "Easily adjust for sick days, school closures, or last-minute schedule changes without disrupting the entire plan.",
                icon: AlertTriangle,
                iconColor: "text-orange-600",
                iconBg: "bg-orange-100"
              },
              {
                title: "Private When Needed, Shared When Ready",
                description: "Draft lessons privately until they're ready to share with co-teachers, students, or administrators.",
                icon: Users,
                iconColor: "text-purple-600",
                iconBg: "bg-purple-100"
              },
              {
                title: "Optimized for Mobile Planning",
                description: "Plan, revise, and review lessons directly from your mobile device—anytime, anywhere.",
                icon: Smartphone,
                iconColor: "text-blue-600",
                iconBg: "bg-blue-100"
              },
              {
                title: "Perfect for Hybrid & Online Learning",
                description: "Built-in support for asynchronous assignments, file uploads, and remote collaboration makes it ideal for blended environments.",
                icon: Globe,
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

        {/* Benefits for Your Institution */}
        <section className="mb-24">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 px-6">
                Benefits for Your Institution
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Streamline curriculum delivery and reduce teacher workload with intelligent planning tools.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-6">
                <div className="group rounded-2xl border-2 border-gray-200 bg-white p-6 hover:border-green-400 hover:bg-green-50/30 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 cursor-pointer min-h-[140px] flex items-center">
                  <div className="flex items-start space-x-4 w-full">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-green-600 transition-colors duration-300">Ensure Curriculum Coverage</h3>
                      <p className="text-gray-700 text-sm">Standardize planning across teachers and departments while maintaining flexibility for creativity and pacing.</p>
                    </div>
                  </div>
                </div>

                <div className="group rounded-2xl border-2 border-gray-200 bg-white p-6 hover:border-blue-400 hover:bg-blue-50/30 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 cursor-pointer min-h-[140px] flex items-center">
                  <div className="flex items-start space-x-4 w-full">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors duration-300">Save Time on Lesson Prep</h3>
                      <p className="text-gray-700 text-sm">Reuse, adapt, and share lesson materials in minutes—not hours.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <div className="group rounded-2xl border-2 border-gray-200 bg-white p-6 hover:border-purple-400 hover:bg-purple-50/30 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 cursor-pointer min-h-[140px] flex items-center">
                  <div className="flex items-start space-x-4 w-full">
                    <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors duration-300">Reduce Duplication & Overlap</h3>
                      <p className="text-gray-700 text-sm">Avoid redundant lessons and clashing assignments by syncing across departments.</p>
                    </div>
                  </div>
                </div>

                <div className="group rounded-2xl border-2 border-gray-200 bg-white p-6 hover:border-orange-400 hover:bg-orange-50/30 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 cursor-pointer min-h-[140px] flex items-center">
                  <div className="flex items-start space-x-4 w-full">
                    <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors duration-300">Lower Teacher Burnout</h3>
                      <p className="text-gray-700 text-sm">Reduce planning stress and empower educators with intuitive tools and intelligent support.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center py-20 bg-gradient-to-r from-primary/10 to-green-600/10 rounded-3xl">
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 px-6">
            Ready to Transform Your Planning?
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Join thousands of educators who have streamlined their lesson planning and assignment management.
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