"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Shield, ChevronLeft, ChevronRight, UserCheck, Database, Lock, ClipboardCheck, Settings, MessageSquare, CheckSquare, Users, Globe } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import Header from "@/components/shared/Header"

export default function PrivacyByDesignPage() {
  const [showLanguages, setShowLanguages] = useState(false)
  const [currentLanguage, setCurrentLanguage] = useState("English")
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

  // Close features dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (featuresRef.current && !featuresRef.current.contains(event.target as Node)) {
        setShowFeatures(false)
        setHoveredFeature(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <>
      <Header currentPage="features" />
      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <main className="mx-auto px-6 py-16" style={{ maxWidth: '1200px' }}>
        {/* Hero */}
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-8">
            <Shield className="w-10 h-10 text-white" />
          </div>
          
          <h1 className="text-4xl lg:text-6xl font-bold leading-none mb-4">
            Privacy by Design
          </h1>
          
          <p className="text-xl text-[#4a90e2] font-medium mb-4">
            Built for Trust, Engineered for Safety.
          </p>
          
          <p className="text-lg text-[#163e64] max-w-3xl mx-auto mb-24">
            At CLASSRAUM, privacy isn't an afterthought—it's built into every feature, workflow, and line of code. From student records to parent communication, we follow a "Privacy by Design" approach to ensure that sensitive educational data stays protected, controlled, and in the right hands at all times.
          </p>
        </div>
      </main>

      {/* Foundations Section */}
      <section className="bg-gradient-to-br from-gray-900 to-slate-800 py-24 w-full">
        <div className="mx-auto px-6" style={{ maxWidth: '1200px' }}>
          <div className="text-center mb-24">
            <div className="mb-2">
              <h3 className="text-xl font-medium text-[#4a90e2]" style={{ fontFamily: 'Kalam, Comic Sans MS, cursive' }}>Security First</h3>
            </div>
            <h2 className="text-5xl lg:text-5xl font-bold text-white mb-6">
              Foundations of <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Secure Architecture</span>
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

                {/* Card 1: Role-Based Access Control */}
                <div className="w-full flex-shrink-0 px-2">
                  <div className="flex gap-8 items-start h-96">
                    <div className="group relative bg-white/10 rounded-3xl p-8 hover:shadow-xl transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex flex-col h-full w-1/2">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <UserCheck className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">Role-Based Access Control</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          Every user sees only what they're authorized to see. Teachers, parents, students, and admins have clearly defined permissions—automatically enforced.
                        </p>
                      </div>
                    </div>
                    <div className="w-1/2 bg-white rounded-2xl shadow-lg p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">Access Control Matrix</div>
                      <div className="space-y-4">
                        <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
                          <div className="text-xs font-medium text-blue-700 mb-1">Teacher Role</div>
                          <div className="text-sm text-gray-700">✓ Own class data • ✗ Other classes</div>
                          <div className="text-xs text-gray-500 mt-1">🔒 Automatic permission enforcement</div>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-400">
                          <div className="text-xs font-medium text-green-700 mb-1">Parent Role</div>
                          <div className="text-sm text-gray-700">✓ Own child only • ✗ Other students</div>
                          <div className="text-xs text-gray-500 mt-1">👨‍👩‍👧‍👦 Family data isolation</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
                          Zero trust architecture • Least privilege access
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 2: Data Segmentation */}
                <div className="w-full flex-shrink-0 px-2">
                  <div className="flex gap-8 items-start h-96">
                    <div className="group relative bg-white/10 rounded-3xl p-8 hover:shadow-xl transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex flex-col h-full w-1/2">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <Database className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">Data Segmentation by Classroom & Role</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          No teacher can view another's class data without explicit invitation. Each classroom is siloed to protect instructional content and student information.
                        </p>
                      </div>
                    </div>
                    <div className="w-1/2 bg-white rounded-2xl shadow-lg p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">Data Isolation Model</div>
                      <div className="space-y-3">
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-orange-700 mb-1">Class A: Math 101</div>
                          <div className="text-xs text-orange-600">Teacher: Ms. Johnson</div>
                          <div className="text-xs text-gray-500 mt-1">🔒 Isolated from Class B</div>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-blue-700 mb-1">Class B: Math 102</div>
                          <div className="text-xs text-blue-600">Teacher: Mr. Smith</div>
                          <div className="text-xs text-gray-500 mt-1">🔒 Isolated from Class A</div>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-green-700 mb-1">Cross-Class Access</div>
                          <div className="text-xs text-green-600">Requires explicit invitation only</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center justify-center">
                          <div className="w-2 h-2 bg-purple-500 rounded-full mr-2 animate-pulse"></div>
                          Complete classroom data boundaries
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 3: End-to-End Encryption */}
                <div className="w-full flex-shrink-0 px-2">
                  <div className="flex gap-8 items-start h-96">
                    <div className="group relative bg-white/10 rounded-3xl p-8 hover:shadow-xl transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex flex-col h-full w-1/2">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-teal-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <Lock className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">End-to-End Encryption</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          All data is encrypted at rest and in transit—ensuring that nothing is exposed, even across networks.
                        </p>
                      </div>
                    </div>
                    <div className="w-1/2 bg-white rounded-2xl shadow-lg p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">Encryption Layers</div>
                      <div className="space-y-3">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-blue-700 mb-1">Data at Rest</div>
                          <div className="text-xs text-blue-600">AES-256 encryption for all stored data</div>
                          <div className="text-xs text-gray-500 mt-1">🔐 Database level protection</div>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-green-700 mb-1">Data in Transit</div>
                          <div className="text-xs text-green-600">TLS 1.3 for all communications</div>
                          <div className="text-xs text-gray-500 mt-1">🌐 Network traffic secured</div>
                        </div>
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-purple-700 mb-1">Key Management</div>
                          <div className="text-xs text-purple-600">Hardware security modules (HSM)</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center justify-center">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                          Military-grade encryption standards
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 4: Secure Student Recordkeeping */}
                <div className="w-full flex-shrink-0 px-2">
                  <div className="flex gap-8 items-start h-96">
                    <div className="group relative bg-white/10 rounded-3xl p-8 hover:shadow-xl transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex flex-col h-full w-1/2">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-red-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <ClipboardCheck className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">Secure Student Recordkeeping</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          Attendance, grades, messages, and reports are logged with tamper-proof history, audit trails, and access logs for transparency.
                        </p>
                      </div>
                    </div>
                    <div className="w-1/2 bg-white rounded-2xl shadow-lg p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">Audit Trail System</div>
                      <div className="space-y-3">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-blue-700 mb-1">Data Access Log</div>
                          <div className="text-xs text-blue-600">Who • What • When • Where</div>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-green-700 mb-1">Change History</div>
                          <div className="text-xs text-green-600">Immutable record of all modifications</div>
                        </div>
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-purple-700 mb-1">Tamper Detection</div>
                          <div className="text-xs text-purple-600">Cryptographic signatures prevent forgery</div>
                        </div>
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-orange-700 mb-1">Compliance Reports</div>
                          <div className="text-xs text-orange-600">Ready for audits & investigations</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center justify-center">
                          <div className="w-2 h-2 bg-orange-500 rounded-full mr-2 animate-pulse"></div>
                          Complete transparency & accountability
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
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <UserCheck className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">Role-Based Access Control</h3>
                      </div>
                      <div className="flex flex-col flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-left mb-6 flex-grow">
                          Every user sees only what they're authorized to see. Teachers, parents, students, and admins have clearly defined permissions—automatically enforced.
                        </p>
                      </div>
                    </div>
                    <div className="w-1/2 bg-white rounded-2xl shadow-lg p-6 border h-full">
                      <div className="text-sm font-medium text-gray-500 mb-3">Access Control Matrix</div>
                      <div className="space-y-4">
                        <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
                          <div className="text-xs font-medium text-blue-700 mb-1">Teacher Role</div>
                          <div className="text-sm text-gray-700">✓ Own class data • ✗ Other classes</div>
                          <div className="text-xs text-gray-500 mt-1">🔒 Automatic permission enforcement</div>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-400">
                          <div className="text-xs font-medium text-green-700 mb-1">Parent Role</div>
                          <div className="text-sm text-gray-700">✓ Own child only • ✗ Other students</div>
                          <div className="text-xs text-gray-500 mt-1">👨‍👩‍👧‍👦 Family data isolation</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
                          Zero trust architecture • Least privilege access
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
        {/* Control Section */}
        <section className="mb-24">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <div className="mb-2">
                <h3 className="text-xl font-medium text-[#4a90e2]" style={{ fontFamily: 'Kalam, Comic Sans MS, cursive' }}>Empowerment</h3>
              </div>
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 px-6">
                Control in the Hands of Educators & Institutions
              </h2>
            </div>

            <div className="grid lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {/* Card 1: Custom Privacy Settings */}
              <div className="group bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <Settings className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors duration-300">Custom Privacy Settings</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">Schools control which data is visible to which users. Parents see only their child's information, and teachers can opt into or out of sharing.</p>
                </div>
              </div>

              {/* Card 2: Private Communication Channels */}
              <div className="group bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <MessageSquare className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-purple-600 transition-colors duration-300">Private Communication Channels</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">Messaging is limited to verified stakeholders, with no open or anonymous access.</p>
                </div>
              </div>

              {/* Card 3: Compliance-Ready */}
              <div className="group bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <CheckSquare className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-green-600 transition-colors duration-300">Compliance-Ready</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">CLASSRAUM is built to align with privacy standards like Korea's Personal Information Protection Act (PIPA), FERPA, and other educational data regulations.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Why It Matters Section */}
        <section className="mb-24">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <div className="mb-2">
                <h3 className="text-xl font-medium text-[#4a90e2]" style={{ fontFamily: 'Kalam, Comic Sans MS, cursive' }}>Real Protection, Not Just Promises</h3>
              </div>
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 px-6">
                Why Privacy by Design Matters for Your Whole Academy
              </h2>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-6">
                <div className="group rounded-2xl border-2 border-gray-200 bg-white p-6 hover:border-indigo-400 hover:bg-indigo-50/30 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 cursor-pointer min-h-[140px] flex items-center">
                  <div className="flex items-start space-x-4 w-full">
                    <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors duration-300">Peace of Mind for Parents & Teachers</h3>
                      <p className="text-gray-700 text-sm">Trust that your data is handled with care, not just convenience. Every feature is built with security at its core.</p>
                    </div>
                  </div>
                </div>

                <div className="group rounded-2xl border-2 border-gray-200 bg-white p-6 hover:border-orange-400 hover:bg-orange-50/30 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 cursor-pointer min-h-[140px] flex items-center">
                  <div className="flex items-start space-x-4 w-full">
                    <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors duration-300">Safer School Ecosystem</h3>
                      <p className="text-gray-700 text-sm">Smart restrictions and automatic protections reduce the risk of leaks, errors, or misuse—keeping your community secure.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <div className="group rounded-2xl border-2 border-gray-200 bg-white p-6 hover:border-blue-400 hover:bg-blue-50/30 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 cursor-pointer min-h-[140px] flex items-center">
                  <div className="flex items-start space-x-4 w-full">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <Globe className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors duration-300">Prepared for the Digital Future</h3>
                      <p className="text-gray-700 text-sm">As education goes online, our system evolves to keep privacy standards high—without sacrificing usability.</p>
                    </div>
                  </div>
                </div>

                <div className="group rounded-2xl border-2 border-gray-200 bg-white p-6 hover:border-green-400 hover:bg-green-50/30 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 cursor-pointer min-h-[140px] flex items-center">
                  <div className="flex items-start space-x-4 w-full">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <CheckSquare className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-green-600 transition-colors duration-300">Compliance Without Complexity</h3>
                      <p className="text-gray-700 text-sm">Meet FERPA, PIPA, and other regulations automatically—no manual policy management or constant audits required.</p>
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
            Ready to Secure Your Institution?
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Join thousands of educators who trust CLASSRAUM to protect their most sensitive data with industry-leading security.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={`${appUrl}/auth`}>
              <Button size="lg" className="text-base px-8">
                Start Free Trial →
              </Button>
            </a>
            <Button variant="outline" size="lg" className="text-base px-8">
              Security Demo
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