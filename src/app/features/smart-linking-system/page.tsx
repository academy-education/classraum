"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Link2, ChevronLeft, ChevronRight, FileText, BarChart3, MessageSquare, ArrowRight, Zap, Eye, TrendingUp } from "lucide-react"
import { useState } from "react"
import Header from "@/components/shared/Header"

export default function SmartLinkingSystemPage() {
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
          <div className="w-20 h-20 bg-gradient-to-br from-cyan-600 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-8">
            <Link2 className="w-10 h-10 text-white" />
          </div>
          
          <h1 className="text-4xl lg:text-6xl font-bold leading-none mb-4">
            Smart Linking System
          </h1>
          
          <p className="text-xl text-[#4a90e2] font-medium mb-4">
            Connect the Dots—Automatically.
          </p>
          
          <p className="text-lg text-[#163e64] max-w-3xl mx-auto mb-24">
            CLASSRAUM's Smart Linking System eliminates silos by intelligently connecting related data across lessons, assignments, attendance, student performance, and messages. No more jumping between modules or duplicating work—just seamless, contextual navigation that keeps everything (and everyone) aligned.
          </p>
        </div>
      </main>

      {/* How It Works Section */}
      <section className="bg-gradient-to-br from-gray-900 to-slate-800 py-24 w-full">
        <div className="mx-auto px-6" style={{ maxWidth: '1200px' }}>
          <div className="text-center mb-24">
            <div className="mb-2">
              <h3 className="text-xl font-medium text-[#4a90e2]" style={{ fontFamily: 'Kalam, Comic Sans MS, cursive' }}>How It Works</h3>
            </div>
            <h2 className="text-5xl lg:text-5xl font-bold text-white mb-6">
              Intelligent Connections <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-teal-500">Made Simple</span>
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

                {/* Card 1: Auto-Link Lessons to Assignments */}
                <div className="w-full flex-shrink-0 px-2">
                  <div className="flex gap-8 items-start h-96">
                    <div className="group relative bg-white/10 rounded-3xl p-8 hover:shadow-xl transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex flex-col h-full w-1/2">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <FileText className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">Auto-Link Lessons to Assignments</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          When a lesson is logged, you can instantly link related homework, quizzes, or projects—creating a connected learning path.
                        </p>
                      </div>
                    </div>
                    <div className="w-1/2 bg-white rounded-2xl shadow-lg p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">Connected Learning Path</div>
                      <div className="space-y-4">
                        <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
                          <div className="text-xs font-medium text-blue-700 mb-1">Lesson: Algebraic Equations</div>
                          <div className="text-sm text-gray-700">Chapter 4: Solving for X</div>
                          <div className="text-xs text-gray-500 mt-1">🔗 Auto-linked to homework assignment</div>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-400">
                          <div className="text-xs font-medium text-green-700 mb-1">Assignment: Practice Problems 4.1-4.5</div>
                          <div className="text-sm text-gray-700">Due: Tomorrow at 11:59 PM</div>
                          <div className="text-xs text-gray-500 mt-1">📚 Connected to lesson objectives</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
                          Smart linking active • Context preserved
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 2: Link Attendance to Performance */}
                <div className="w-full flex-shrink-0 px-2">
                  <div className="flex gap-8 items-start h-96">
                    <div className="group relative bg-white/10 rounded-3xl p-8 hover:shadow-xl transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex flex-col h-full w-1/2">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <BarChart3 className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">Link Attendance to Performance</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          Absences or tardies are automatically reflected in progress views, helping teachers and parents understand learning gaps.
                        </p>
                      </div>
                    </div>
                    <div className="w-1/2 bg-white rounded-2xl shadow-lg p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">Performance Context View</div>
                      <div className="space-y-3">
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-orange-700 mb-1">Emma's Math Performance</div>
                          <div className="text-xs text-orange-600">Grade: 78% (Down from 85%)</div>
                          <div className="text-xs text-gray-500 mt-1">🔗 Linked: Missed 3 key lessons</div>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-blue-700 mb-1">Attendance Pattern</div>
                          <div className="text-xs text-blue-600">Absent during fraction unit (Mon-Wed)</div>
                          <div className="text-xs text-gray-500 mt-1">💡 Catch-up materials auto-assigned</div>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-green-700 mb-1">Suggested Action</div>
                          <div className="text-xs text-green-600">Schedule review session</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center justify-center">
                          <div className="w-2 h-2 bg-purple-500 rounded-full mr-2 animate-pulse"></div>
                          Smart insights from data connections
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 3: Tie Messages to Student Records */}
                <div className="w-full flex-shrink-0 px-2">
                  <div className="flex gap-8 items-start h-96">
                    <div className="group relative bg-white/10 rounded-3xl p-8 hover:shadow-xl transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex flex-col h-full w-1/2">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-teal-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <MessageSquare className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">Tie Messages to Student Records</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          Communication between teachers and parents is auto-tagged to the relevant student, making follow-ups faster and more organized.
                        </p>
                      </div>
                    </div>
                    <div className="w-1/2 bg-white rounded-2xl shadow-lg p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">Contextual Communication</div>
                      <div className="space-y-3">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-blue-700 mb-1">Parent Message</div>
                          <div className="text-xs text-blue-600">"Concerned about Jake's math progress"</div>
                          <div className="text-xs text-gray-500 mt-1">🔗 Auto-linked to Jake's profile</div>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-green-700 mb-1">Related Context</div>
                          <div className="text-xs text-green-600">Math grades, attendance, assignments</div>
                          <div className="text-xs text-gray-500 mt-1">📊 Instantly accessible</div>
                        </div>
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-purple-700 mb-1">Follow-up Actions</div>
                          <div className="text-xs text-purple-600">Schedule conference, share resources</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center justify-center">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                          Messages organized by student context
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 4: One Click = Full Context */}
                <div className="w-full flex-shrink-0 px-2">
                  <div className="flex gap-8 items-start h-96">
                    <div className="group relative bg-white/10 rounded-3xl p-8 hover:shadow-xl transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex flex-col h-full w-1/2">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-red-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <ArrowRight className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">One Click = Full Context</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          Wherever you are—gradebook, report cards, lesson planner—you can jump directly to connected content with one click.
                        </p>
                      </div>
                    </div>
                    <div className="w-1/2 bg-white rounded-2xl shadow-lg p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">Navigation Flow</div>
                      <div className="space-y-3">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-blue-700 mb-1">From Gradebook</div>
                          <div className="text-xs text-blue-600">Click grade → View assignment → See lesson</div>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-green-700 mb-1">From Lesson Plan</div>
                          <div className="text-xs text-green-600">Click topic → View assignments → Check submissions</div>
                        </div>
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-purple-700 mb-1">From Attendance</div>
                          <div className="text-xs text-purple-600">Click absence → View missed content → Send resources</div>
                        </div>
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-orange-700 mb-1">From Report Card</div>
                          <div className="text-xs text-orange-600">Click trend → View supporting data → Contact parent</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center justify-center">
                          <div className="w-2 h-2 bg-orange-500 rounded-full mr-2 animate-pulse"></div>
                          Seamless contextual navigation
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
                          <FileText className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">Auto-Link Lessons to Assignments</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          When a lesson is logged, you can instantly link related homework, quizzes, or projects—creating a connected learning path.
                        </p>
                      </div>
                    </div>
                    <div className="w-1/2 bg-white rounded-2xl shadow-lg p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">Connected Learning Path</div>
                      <div className="space-y-4">
                        <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
                          <div className="text-xs font-medium text-blue-700 mb-1">Lesson: Algebraic Equations</div>
                          <div className="text-sm text-gray-700">Chapter 4: Solving for X</div>
                          <div className="text-xs text-gray-500 mt-1">🔗 Auto-linked to homework assignment</div>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-400">
                          <div className="text-xs font-medium text-green-700 mb-1">Assignment: Practice Problems 4.1-4.5</div>
                          <div className="text-sm text-gray-700">Due: Tomorrow at 11:59 PM</div>
                          <div className="text-xs text-gray-500 mt-1">📚 Connected to lesson objectives</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
                          Smart linking active • Context preserved
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
        {/* Why It Matters Section */}
        <section className="mb-24">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <div className="mb-2">
                <h3 className="text-xl font-medium text-[#4a90e2]" style={{ fontFamily: 'Kalam, Comic Sans MS, cursive' }}>Why It Matters</h3>
              </div>
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 px-6">
                The Power of Connected Information
              </h2>
            </div>

            <div className="grid lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {/* Card 1: Reduces Manual Work */}
              <div className="group bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <Zap className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-cyan-600 transition-colors duration-300">Reduces Manual Work</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">Say goodbye to duplicate entries across modules.</p>
                </div>
              </div>

              {/* Card 2: Boosts Visibility & Context */}
              <div className="group bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <Eye className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors duration-300">Boosts Visibility & Context</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">Everyone understands the "why" behind student data—not just the "what."</p>
                </div>
              </div>

              {/* Card 3: Speeds Up Daily Tasks */}
              <div className="group bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <TrendingUp className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-green-600 transition-colors duration-300">Speeds Up Daily Tasks</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">Fewer clicks, faster decisions, and smoother workflows for every role.</p>
                </div>
              </div>
            </div>
          </div>
        </section>


        {/* CTA Section */}
        <section className="text-center py-20 bg-gradient-to-r from-primary/10 to-cyan-600/10 rounded-3xl">
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 px-6">
            Ready to Transform Your Workflow?
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Join thousands of educators who have connected their data for smarter, faster decision-making.
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