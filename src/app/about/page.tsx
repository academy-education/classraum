"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Target, Zap, Clock, GraduationCap, Check } from "lucide-react"
import { useState, useEffect } from "react"
import Header from "@/components/shared/Header"

export default function AboutPage() {
  const [appUrl, setAppUrl] = useState("https://app.classraum-9vh678u89-daniel-kims-projects-7acd367a.vercel.app")

  // Set the correct app URL based on environment
  useEffect(() => {
    if (window.location.hostname === 'localhost') {
      const { protocol, port } = window.location
      setAppUrl(`${protocol}//app.localhost${port ? ':' + port : ''}`)
    }
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <Header currentPage="about" />

      {/* Main Content */}
      <main className="mx-auto px-6 py-16" style={{ maxWidth: '1200px' }}>
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-6xl font-bold mb-6">
            About <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500">CLASSRAUM</span>
          </h1>
        </div>

        {/* Mission Section */}
        <section className="mb-20">
          <div className="text-center mb-12">
            {/* Mission Graphic */}
            <div className="flex justify-center items-center mb-12">
              <div className="relative">
                {/* Central Mission Circle */}
                <div className="w-32 h-32 bg-gradient-to-br from-blue-600 to-teal-500 rounded-full flex items-center justify-center shadow-2xl relative z-0">
                  {/* Custom Bell SVG - Even Bigger */}
                  <svg className="w-20 h-20" viewBox="0 0 4096 4096" fill="white">
                    <path d="M2965.11,2503v108a24.006,24.006,0,0,1-24,24H1156a24.006,24.006,0,0,1-24-24V2503c0.03-16.46-1.04-28.43,10-57,9.72-25.17,27.02-50.86,59-82,26.39-25.7,56.22-57.8,87-88,36.79-36.1,63.51-70.77,82-107,7.18-14.06,15.16-37.52,21.88-71.02,3.11-15.53,5.02-35.6,6.12-56.78V1785h0.01c0-309.87,216.8-569.09,506.99-634.27V1110h0a142.367,142.367,0,0,1,142.37-142h0.01a142.367,142.367,0,0,1,142.37,142h0v40.4c290.91,64.65,508.43,324.22,508.43,634.6h0.01v231.42c0.71,29.84,2.73,60.05,7.04,81.56,6.72,33.5,14.7,56.96,21.88,71.02,18.49,36.23,45.21,70.9,82,107,30.78,30.2,60.61,62.3,87,88,31.98,31.14,49.28,56.83,59,82C2966.15,2474.57,2965.08,2486.54,2965.11,2503Zm-600.48,242c0.89,9.72,1.37,19.55,1.37,29.5,0,175.9-142.6,318.5-318.5,318.5S1729,2950.4,1729,2774.5c0-9.95.48-19.78,1.37-29.5h634.26Z"/>
                  </svg>
                </div>
                
                {/* Green Target - Orbiting animation (above blue circle) */}
                <div className="absolute top-1/2 left-1/2 w-0 h-0 z-10" style={{ animation: 'orbit 8s linear infinite', transformOrigin: 'center' }}>
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg" style={{ transform: 'translate(-50%, -50%)' }}>
                    <Target className="w-5 h-5 text-white animate-ping" />
                  </div>
                </div>
                
                {/* Orbiting Elements with Diverse Animations */}
                {/* Purple Zap - Floating up and down */}
                <div className="absolute -top-2 -right-2 w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center shadow-lg animate-bounce z-20" style={{ animationDuration: '2s' }}>
                  <Zap className="w-6 h-6 text-white animate-pulse" />
                </div>
                
                {/* Orange Clock - Scale pulsing */}
                <div className="absolute -bottom-2 -left-2 w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center shadow-lg z-20" style={{ animation: 'pulse 3s infinite, scale 2s infinite alternate' }}>
                  <Clock className="w-6 h-6 text-white animate-spin" style={{ animationDuration: '3s' }} />
                </div>
              </div>
            </div>
            
            {/* Custom Animation Keyframes */}
            <style jsx>{`
              @keyframes scale {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
              }
              @keyframes orbit {
                0% { transform: rotate(0deg) translateX(59px); }
                100% { transform: rotate(360deg) translateX(59px); }
              }
            `}</style>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <p className="text-lg text-[#163e64] leading-relaxed mb-6 text-center">
              CLASSRAUM is an all-in-one, AI-powered academy management platform built to serve educators, directors, and academic institutions. Unlike typical EdTech tools focused on student learning or parent engagement, CLASSRAUM solves the real operational pain points of teachers and directors—those responsible for running schools and delivering education.
            </p>
          </div>
        </section>

        {/* Problem & Solution Section */}
        <section className="mb-20">
          <div className="grid lg:grid-cols-2 gap-16">
            {/* The Problem We Solve */}
            <div className="relative group">
              <Card className="bg-gradient-to-br from-red-50 to-orange-50 border-red-200 shadow-xl h-full overflow-hidden transition-all duration-500 ease-out hover:shadow-2xl hover:-translate-y-3 hover:border-red-300">
                <CardContent className="p-8 h-full flex flex-col relative">
                  {/* Animated background overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-red-100/0 via-red-100/30 to-orange-100/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out"></div>
                  
                  {/* Problem Icon */}
                  <div className="flex items-center mb-6 relative z-10">
                    <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mr-4 shadow-lg transition-all duration-500 ease-out group-hover:bg-red-600 group-hover:scale-110 group-hover:shadow-xl">
                      <svg className="w-6 h-6 text-white transition-transform duration-500 ease-out group-hover:rotate-12" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 transition-colors duration-500 ease-out group-hover:text-red-800">The Problem We Solve</h3>
                  </div>
                  
                  <div className="space-y-6 flex-grow relative z-10">
                    <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 border border-red-100 transition-all duration-500 ease-out group-hover:bg-white/90 group-hover:border-red-200 group-hover:shadow-md">
                      <p className="text-[#163e64] leading-relaxed font-medium transition-colors duration-500 ease-out group-hover:text-gray-800">
                        Educators spend <span className="font-bold text-red-600 transition-colors duration-500 ease-out group-hover:text-red-700">30–50%</span> of their time on non-teaching administrative work:
                      </p>
                    </div>
                    
                    <ul className="space-y-4">
                      <li className="flex items-center space-x-4 bg-white/50 rounded-lg p-3 transition-all duration-500 ease-out group-hover:bg-white/80 group-hover:shadow-sm group-hover:translate-x-1">
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm transition-all duration-500 ease-out group-hover:bg-red-200 group-hover:scale-110">
                          <div className="w-4 h-4 bg-red-500 rounded-full transition-colors duration-500 ease-out group-hover:bg-red-600"></div>
                        </div>
                        <span className="text-[#163e64] font-medium transition-colors duration-500 ease-out group-hover:text-gray-800">Manual report card creation and grading</span>
                      </li>
                      <li className="flex items-center space-x-4 bg-white/50 rounded-lg p-3 transition-all duration-500 ease-out group-hover:bg-white/80 group-hover:shadow-sm group-hover:translate-x-1" style={{transitionDelay: '50ms'}}>
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm transition-all duration-500 ease-out group-hover:bg-red-200 group-hover:scale-110">
                          <div className="w-4 h-4 bg-red-500 rounded-full transition-colors duration-500 ease-out group-hover:bg-red-600"></div>
                        </div>
                        <span className="text-[#163e64] font-medium transition-colors duration-500 ease-out group-hover:text-gray-800">Juggling 5-10 different platforms daily</span>
                      </li>
                      <li className="flex items-center space-x-4 bg-white/50 rounded-lg p-3 transition-all duration-500 ease-out group-hover:bg-white/80 group-hover:shadow-sm group-hover:translate-x-1" style={{transitionDelay: '100ms'}}>
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm transition-all duration-500 ease-out group-hover:bg-red-200 group-hover:scale-110">
                          <div className="w-4 h-4 bg-red-500 rounded-full transition-colors duration-500 ease-out group-hover:bg-red-600"></div>
                        </div>
                        <span className="text-[#163e64] font-medium transition-colors duration-500 ease-out group-hover:text-gray-800">Repetitive scheduling and communication tasks</span>
                      </li>
                      <li className="flex items-center space-x-4 bg-white/50 rounded-lg p-3 transition-all duration-500 ease-out group-hover:bg-white/80 group-hover:shadow-sm group-hover:translate-x-1" style={{transitionDelay: '150ms'}}>
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm transition-all duration-500 ease-out group-hover:bg-red-200 group-hover:scale-110">
                          <div className="w-4 h-4 bg-red-500 rounded-full transition-colors duration-500 ease-out group-hover:bg-red-600"></div>
                        </div>
                        <span className="text-[#163e64] font-medium transition-colors duration-500 ease-out group-hover:text-gray-800">Disconnected data across multiple systems</span>
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
              
              {/* Decorative Elements */}
              <div className="absolute -top-3 -right-3 w-6 h-6 bg-red-400 rounded-full opacity-60 animate-pulse"></div>
              <div className="absolute -bottom-3 -left-3 w-4 h-4 bg-orange-400 rounded-full opacity-60 animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            {/* Our AI-Powered Solution */}
            <div className="relative group">
              <Card className="bg-gradient-to-br from-green-50 to-blue-50 border-green-200 shadow-xl h-full overflow-hidden transition-all duration-500 ease-out hover:shadow-2xl hover:-translate-y-3 hover:border-green-300">
                <CardContent className="p-8 h-full flex flex-col relative">
                  {/* Animated background overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-green-100/0 via-green-100/30 to-blue-100/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out"></div>
                  
                  {/* Solution Icon */}
                  <div className="flex items-center mb-6 relative z-10">
                    <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mr-4 shadow-lg transition-all duration-500 ease-out group-hover:from-green-600 group-hover:to-blue-600 group-hover:scale-110 group-hover:shadow-xl">
                      <Zap className="w-6 h-6 text-white transition-transform duration-500 ease-out group-hover:rotate-12" />
                    </div>
                    <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 transition-colors duration-500 ease-out group-hover:text-green-800">Our AI-Powered Solution</h3>
                  </div>
                  
                  <div className="space-y-6 flex-grow relative z-10">
                    <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 border border-green-100 transition-all duration-500 ease-out group-hover:bg-white/90 group-hover:border-green-200 group-hover:shadow-md">
                      <p className="text-[#163e64] leading-relaxed font-medium transition-colors duration-500 ease-out group-hover:text-gray-800">
                        CLASSRAUM is a <span className="font-bold text-green-600 transition-colors duration-500 ease-out group-hover:text-green-700">centralized platform</span> powered by AI that makes school operations smoother, faster, and smarter:
                      </p>
                    </div>
                    
                    <ul className="space-y-4">
                      <li className="flex items-center space-x-4 bg-white/50 rounded-lg p-3 transition-all duration-500 ease-out group-hover:bg-white/80 group-hover:shadow-sm group-hover:translate-x-1">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm transition-all duration-500 ease-out group-hover:bg-green-200 group-hover:scale-110">
                          <Check className="w-5 h-5 text-green-600 transition-colors duration-500 ease-out group-hover:text-green-700" />
                        </div>
                        <span className="text-[#163e64] font-medium transition-colors duration-500 ease-out group-hover:text-gray-800">AI-generated personalized report cards in seconds</span>
                      </li>
                      <li className="flex items-center space-x-4 bg-white/50 rounded-lg p-3 transition-all duration-500 ease-out group-hover:bg-white/80 group-hover:shadow-sm group-hover:translate-x-1" style={{transitionDelay: '50ms'}}>
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm transition-all duration-500 ease-out group-hover:bg-green-200 group-hover:scale-110">
                          <Check className="w-5 h-5 text-green-600 transition-colors duration-500 ease-out group-hover:text-green-700" />
                        </div>
                        <span className="text-[#163e64] font-medium transition-colors duration-500 ease-out group-hover:text-gray-800">Unified dashboard for all school operations</span>
                      </li>
                      <li className="flex items-center space-x-4 bg-white/50 rounded-lg p-3 transition-all duration-500 ease-out group-hover:bg-white/80 group-hover:shadow-sm group-hover:translate-x-1" style={{transitionDelay: '100ms'}}>
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm transition-all duration-500 ease-out group-hover:bg-green-200 group-hover:scale-110">
                          <Check className="w-5 h-5 text-green-600 transition-colors duration-500 ease-out group-hover:text-green-700" />
                        </div>
                        <span className="text-[#163e64] font-medium transition-colors duration-500 ease-out group-hover:text-gray-800">Automated scheduling and smart notifications</span>
                      </li>
                      <li className="flex items-center space-x-4 bg-white/50 rounded-lg p-3 transition-all duration-500 ease-out group-hover:bg-white/80 group-hover:shadow-sm group-hover:translate-x-1" style={{transitionDelay: '150ms'}}>
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm transition-all duration-500 ease-out group-hover:bg-green-200 group-hover:scale-110">
                          <Check className="w-5 h-5 text-green-600 transition-colors duration-500 ease-out group-hover:text-green-700" />
                        </div>
                        <span className="text-[#163e64] font-medium transition-colors duration-500 ease-out group-hover:text-gray-800">Seamless integration with existing tools</span>
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
              
              {/* Decorative Elements */}
              <div className="absolute -top-3 -right-3 w-6 h-6 bg-green-400 rounded-full opacity-60 animate-pulse"></div>
              <div className="absolute -bottom-3 -left-3 w-4 h-4 bg-blue-400 rounded-full opacity-60 animate-pulse" style={{ animationDelay: '1.5s' }}></div>
            </div>
          </div>
        </section>

        {/* Mission & Vision Section */}
        <section className="mb-20 mt-32">
          <div className="space-y-12 max-w-4xl mx-auto">
            {/* Our Mission */}
            <div className="group cursor-pointer">
              <div className="relative bg-white border-l-4 border-blue-500 rounded-lg shadow-lg p-8 overflow-hidden transition-all duration-500 ease-out hover:shadow-xl hover:border-l-6 hover:-translate-y-2">
                {/* Subtle background color shift on hover */}
                <div className="absolute inset-0 bg-blue-50/0 group-hover:bg-blue-50/20 transition-colors duration-500 ease-out"></div>
                
                <div className="relative z-10 text-center">
                  <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-6 transition-colors duration-500 ease-out group-hover:text-blue-800">Our Mission</h3>
                  <p className="text-lg text-[#163e64] leading-relaxed transition-colors duration-500 ease-out group-hover:text-gray-700">
                    By automating time-consuming tasks like <span className="font-semibold text-blue-600 transition-colors duration-500 ease-out group-hover:text-blue-700">report generation</span>, <span className="font-semibold text-blue-600 transition-colors duration-500 ease-out group-hover:text-blue-700">lesson scheduling</span>, <span className="font-semibold text-blue-600 transition-colors duration-500 ease-out group-hover:text-blue-700">attendance tracking</span>, and <span className="font-semibold text-blue-600 transition-colors duration-500 ease-out group-hover:text-blue-700">communication</span>, CLASSRAUM gives educators back their most valuable asset: <span className="font-bold text-blue-700 transition-colors duration-500 ease-out group-hover:text-blue-800">time</span>. Our platform turns fragmented, manual workflows into a unified, intelligent, real-time system.
                  </p>
                </div>
              </div>
            </div>

            {/* Our Vision */}
            <div className="group cursor-pointer">
              <div className="relative bg-white border-l-4 border-teal-500 rounded-lg shadow-lg p-8 overflow-hidden transition-all duration-500 ease-out hover:shadow-xl hover:border-l-6 hover:-translate-y-2">
                {/* Subtle background color shift on hover */}
                <div className="absolute inset-0 bg-teal-50/0 group-hover:bg-teal-50/20 transition-colors duration-500 ease-out"></div>
                
                <div className="relative z-10 text-center">
                  <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-6 transition-colors duration-500 ease-out group-hover:text-teal-800">Our Vision</h3>
                  <p className="text-lg text-[#163e64] leading-relaxed transition-colors duration-500 ease-out group-hover:text-gray-700">
                    A world where educators can focus on what they do best—<span className="font-semibold text-teal-600 transition-colors duration-500 ease-out group-hover:text-teal-700">teaching and nurturing students</span>—while AI handles the administrative burden that currently consumes <span className="font-bold text-teal-700 transition-colors duration-500 ease-out group-hover:text-teal-800">30-50%</span> of their time.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* Values Section */}
      <section className="mb-24 bg-gray-50 py-16 lg:py-24">
        <div className="mx-auto px-6" style={{ maxWidth: '1200px' }}>
          <div className="text-center mb-24">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">Our Core Values</h2>
            <p className="text-lg text-[#163e64] max-w-3xl mx-auto">
              Everything we build is guided by these fundamental principles that drive our mission to empower educators.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {/* Educator-First */}
            <div className="group">
              <Card className="bg-white shadow-lg border-0 transition-all duration-500 ease-out hover:shadow-2xl hover:-translate-y-3 hover:scale-105 relative overflow-hidden h-full">
                {/* Animated background overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 via-blue-50/50 to-blue-100/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out"></div>
                <CardContent className="p-8 text-center relative z-10 flex flex-col h-full">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 transition-all duration-500 ease-out group-hover:bg-blue-200 group-hover:scale-110 group-hover:shadow-lg">
                    <GraduationCap className="w-8 h-8 text-blue-600 transition-all duration-500 ease-out group-hover:text-blue-700 group-hover:scale-110" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 transition-colors duration-300 group-hover:text-blue-800">Educator-First Design</h3>
                  <p className="text-gray-600 leading-relaxed transition-colors duration-300 group-hover:text-gray-700 flex-grow">
                    Every feature is designed by educators, for educators. We understand the real challenges teachers face because we&apos;ve been there.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* AI-Powered Efficiency */}
            <div className="group">
              <Card className="bg-white shadow-lg border-0 transition-all duration-500 ease-out hover:shadow-2xl hover:-translate-y-3 hover:scale-105 relative overflow-hidden h-full">
                {/* Animated background overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-50/0 via-purple-50/50 to-purple-100/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out"></div>
                <CardContent className="p-8 text-center relative z-10 flex flex-col h-full">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6 transition-all duration-500 ease-out group-hover:bg-purple-200 group-hover:scale-110 group-hover:shadow-lg">
                    <Zap className="w-8 h-8 text-purple-600 transition-all duration-500 ease-out group-hover:text-purple-700 group-hover:scale-110" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 transition-colors duration-300 group-hover:text-purple-800">AI-Powered Efficiency</h3>
                  <p className="text-gray-600 leading-relaxed transition-colors duration-300 group-hover:text-gray-700 flex-grow">
                    We leverage cutting-edge AI to automate repetitive tasks, giving educators back their most valuable asset: time.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Time is Sacred */}
            <div className="group">
              <Card className="bg-white shadow-lg border-0 transition-all duration-500 ease-out hover:shadow-2xl hover:-translate-y-3 hover:scale-105 relative overflow-hidden h-full">
                {/* Animated background overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-orange-50/0 via-orange-50/50 to-orange-100/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out"></div>
                <CardContent className="p-8 text-center relative z-10 flex flex-col h-full">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6 transition-all duration-500 ease-out group-hover:bg-orange-200 group-hover:scale-110 group-hover:shadow-lg">
                    <Clock className="w-8 h-8 text-orange-600 transition-all duration-500 ease-out group-hover:text-orange-700 group-hover:scale-110" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 transition-colors duration-300 group-hover:text-orange-800">Time is Sacred</h3>
                  <p className="text-gray-600 leading-relaxed transition-colors duration-300 group-hover:text-gray-700 flex-grow">
                    We believe educator time should be spent on teaching, not paperwork. Our AI gives time back to educators.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Institutional Excellence */}
            <div className="group">
              <Card className="bg-white shadow-lg border-0 transition-all duration-500 ease-out hover:shadow-2xl hover:-translate-y-3 hover:scale-105 relative overflow-hidden h-full">
                {/* Animated background overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-green-50/0 via-green-50/50 to-green-100/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out"></div>
                <CardContent className="p-8 text-center relative z-10 flex flex-col h-full">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 transition-all duration-500 ease-out group-hover:bg-green-200 group-hover:scale-110 group-hover:shadow-lg">
                    <Target className="w-8 h-8 text-green-600 transition-all duration-500 ease-out group-hover:text-green-700 group-hover:scale-110" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 transition-colors duration-300 group-hover:text-green-800">Institutional Excellence</h3>
                  <p className="text-gray-600 leading-relaxed transition-colors duration-300 group-hover:text-gray-700 flex-grow">
                    We help educational institutions operate more efficiently while maintaining the highest standards.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Impact Stats */}
      <section className="mb-20">
        <div className="mx-auto px-6" style={{ maxWidth: '1200px' }}>
          <div className="text-center mb-16">
            <h2 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6">Our Impact</h2>
            <p className="text-lg text-[#163e64] max-w-3xl mx-auto">
              See how CLASSRAUM is transforming educational institutions worldwide.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {/* Tasks Automated - Robot/Automation Theme */}
            <div className="group relative bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl p-8 text-white overflow-hidden hover:shadow-2xl transition-all duration-500 hover:scale-105 hover:-translate-y-3">
              {/* Animated background pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-4 right-4 w-20 h-20 border-2 border-white rounded-full animate-spin" style={{animationDuration: '8s'}}></div>
                <div className="absolute bottom-4 left-4 w-12 h-12 border border-white rounded-lg animate-pulse"></div>
                <div className="absolute top-1/2 left-1/2 w-6 h-6 bg-white rounded-full opacity-20 animate-bounce" style={{animationDelay: '1s'}}></div>
              </div>
              
              <div className="relative z-10 text-center">
                {/* Checkbox Icon */}
                <div className="w-20 h-20 mx-auto mb-6 relative">
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto backdrop-blur-sm transition-all duration-500 group-hover:bg-white/30 group-hover:scale-110 group-hover:rotate-6">
                    <svg className="w-10 h-10 text-white transition-transform duration-500 group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  </div>
                </div>
                
                <div className="text-4xl lg:text-5xl font-black mb-3 text-white drop-shadow-lg transition-all duration-500 group-hover:scale-110">70%</div>
                <div className="text-white/90 font-semibold text-lg mb-2">Tasks Automated</div>
                <div className="text-white/70 text-sm">AI handles the repetitive work</div>
              </div>
            </div>

            {/* Time Saved - Clock/Hourglass Theme */}
            <div className="group relative bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-8 text-white overflow-hidden hover:shadow-2xl transition-all duration-500 hover:scale-105 hover:-translate-y-3">
              {/* Animated time particles */}
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-6 right-6 w-3 h-3 bg-white rounded-full animate-ping"></div>
                <div className="absolute bottom-8 left-6 w-2 h-2 bg-white rounded-full animate-ping" style={{animationDelay: '1s'}}></div>
                <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-white rounded-full animate-ping" style={{animationDelay: '2s'}}></div>
              </div>
              
              <div className="relative z-10 text-center">
                {/* Hourglass Icon */}
                <div className="w-20 h-20 mx-auto mb-6 relative">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto backdrop-blur-sm transition-all duration-500 group-hover:bg-white/30 group-hover:scale-110">
                    <svg className="w-10 h-10 text-white transition-transform duration-500 group-hover:rotate-180" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 2v6h.01L6 8.01 10 12l-4 4 .01.01H6V22h12v-5.99h-.01L18 16l-4-4 4-3.99-.01-.01H18V2H6zm10 14.5V20H8v-3.5l4-4 4 4zm-4-5l-4-4V4h8v3.5l-4 4z"/>
                    </svg>
                  </div>
                  {/* Time indicators */}
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-2 border-white/60 rounded-full animate-pulse"></div>
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-white/60 rounded-full animate-bounce" style={{animationDelay: '0.5s'}}></div>
                </div>
                
                <div className="text-4xl lg:text-5xl font-black mb-3 text-white drop-shadow-lg transition-all duration-500 group-hover:scale-110">15hrs</div>
                <div className="text-white/90 font-semibold text-lg mb-2">Time Saved Weekly</div>
                <div className="text-white/70 text-sm">Focus on what matters most</div>
              </div>
            </div>

            {/* Schools Served - Building/Network Theme */}
            <div className="group relative bg-gradient-to-br from-purple-500 to-violet-600 rounded-3xl p-8 text-white overflow-hidden hover:shadow-2xl transition-all duration-500 hover:scale-105 hover:-translate-y-3">
              {/* Network connection lines */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-1/2 w-px h-full bg-white transform -translate-x-1/2"></div>
                <div className="absolute top-1/2 left-0 w-full h-px bg-white transform -translate-y-1/2"></div>
              </div>
              
              <div className="relative z-10 text-center">
                {/* School building */}
                <div className="w-20 h-20 mx-auto mb-6 relative">
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto backdrop-blur-sm transition-all duration-500 group-hover:bg-white/30 group-hover:scale-110">
                    <svg className="w-10 h-10 text-white transition-transform duration-500 group-hover:scale-110" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
                    </svg>
                  </div>
                </div>
                
                <div className="text-4xl lg:text-5xl font-black mb-3 text-white drop-shadow-lg transition-all duration-500 group-hover:scale-110">500+</div>
                <div className="text-white/90 font-semibold text-lg mb-2">Schools Served</div>
                <div className="text-white/70 text-sm">Growing educational network</div>
              </div>
            </div>

            {/* Satisfaction Rate - Heart/Trophy Theme */}
            <div className="group relative bg-gradient-to-br from-rose-500 to-pink-600 rounded-3xl p-8 text-white overflow-hidden hover:shadow-2xl transition-all duration-500 hover:scale-105 hover:-translate-y-3">
              {/* Floating hearts */}
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-4 right-6 text-white animate-bounce" style={{fontSize: '12px', animationDelay: '0s'}}>♥</div>
                <div className="absolute bottom-6 left-4 text-white animate-bounce" style={{fontSize: '10px', animationDelay: '1s'}}>♥</div>
                <div className="absolute top-1/2 right-8 text-white animate-bounce" style={{fontSize: '8px', animationDelay: '0.5s'}}>♥</div>
                <div className="absolute top-6 left-1/3 text-white animate-bounce" style={{fontSize: '14px', animationDelay: '1.5s'}}>★</div>
              </div>
              
              <div className="relative z-10 text-center">
                {/* Trophy with heart */}
                <div className="w-20 h-20 mx-auto mb-6 relative">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto backdrop-blur-sm transition-all duration-500 group-hover:bg-white/30 group-hover:scale-110">
                    <svg className="w-10 h-10 text-white transition-transform duration-500 group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                  </div>
                  {/* Sparkles */}
                  <div className="absolute -top-1 -right-1 w-4 h-4 text-white/80 animate-ping">✨</div>
                  <div className="absolute -bottom-1 -left-1 w-3 h-3 text-white/80 animate-ping" style={{animationDelay: '0.7s'}}>⭐</div>
                </div>
                
                <div className="text-4xl lg:text-5xl font-black mb-3 text-white drop-shadow-lg transition-all duration-500 group-hover:scale-110">98%</div>
                <div className="text-white/90 font-semibold text-lg mb-2">Satisfaction Rate</div>
                <div className="text-white/70 text-sm">Educators love our platform</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="mb-32">
        <div className="mx-auto px-6" style={{ maxWidth: '1200px' }}>
          <div className="text-center py-20 bg-gradient-to-r from-primary/10 to-blue-600/10 rounded-3xl">
            <div className="mx-auto px-6" style={{ maxWidth: '800px' }}>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 px-6">Ready to Transform Your Institution?</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
              Join hundreds of educational institutions already saving time and improving operations with CLASSRAUM.
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
          </div>
        </div>
      </div>
      </section>

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
                All-In-One management solutions for academies, schools, and educational institutions. We give educators back their most valuable asset: time. Simplify administrative tasks and focus on what matters most – teaching.
              </p>
              <div className="text-gray-400 text-sm">
                <p>support@classraum.com</p>
              </div>
            </div>

            {/* Quick Links */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Quick Links</h3>
              <div className="space-y-2">
                <Link href="/about" className="block text-gray-400 hover:text-white transition-colors text-sm">
                  About
                </Link>
                <Link href="/pricing" className="block text-gray-400 hover:text-white transition-colors text-sm">
                  Pricing
                </Link>
                <Link href="#" className="block text-gray-400 hover:text-white transition-colors text-sm">
                  Terms & Conditions
                </Link>
                <Link href="#" className="block text-gray-400 hover:text-white transition-colors text-sm">
                  Privacy Policy
                </Link>
                <Link href="#" className="block text-gray-400 hover:text-white transition-colors text-sm">
                  Refund Policy
                </Link>
              </div>
            </div>

            {/* Contact */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Contact</h3>
              <div className="space-y-2">
                <p className="text-gray-400 text-sm">support@classraum.com</p>
                <Link href="#" className="block text-gray-400 hover:text-white transition-colors text-sm">
                  Contact Support
                </Link>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-700 mt-12 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <p className="text-gray-400 text-sm">© 2025 CLASSRAUM. All rights reserved.</p>
              <div className="flex space-x-6">
                <Link href="#" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Privacy Policy
                </Link>
                <Link href="#" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Terms of Service
                </Link>
                <Link href="#" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Refund Policy
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}