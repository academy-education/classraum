"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle, FileText, BarChart3, Calendar, Users, Bell, Link2, Shield, Zap, Clock, AlertTriangle, Layers, TrendingDown } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import Header from "@/components/shared/Header"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

// Register GSAP plugins
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger)
}

// Ticking Clock Component
function TickingClock() {
  const [time, setTime] = useState<Date | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setTime(new Date())
    
    let animationId: number
    let lastUpdate = Date.now()
    
    const updateClock = () => {
      const now = Date.now()
      // Update every 1000ms (1 second) for efficiency
      if (now - lastUpdate >= 1000) {
        setTime(new Date())
        lastUpdate = now
      }
      animationId = requestAnimationFrame(updateClock)
    }
    
    animationId = requestAnimationFrame(updateClock)

    return () => cancelAnimationFrame(animationId)
  }, [])

  // Don't render on server to avoid hydration mismatch
  if (!mounted || !time) {
    return (
      <div className="relative inline-block ml-3" style={{ verticalAlign: 'middle', transform: 'translateY(-2px)' }}>
        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-teal-500 rounded-full p-0.5 shadow-lg">
          <svg width="32" height="32" viewBox="0 0 48 48" className="w-full h-full">
            {/* Static clock face for SSR */}
            <circle
              cx="24"
              cy="24"
              r="20"
              fill="white"
              stroke="none"
            />
            
            {/* Hour markers - only show 12, 3, 6, 9 */}
            {[0, 3, 6, 9].map((hour) => {
              const angle = (hour * 30) * (Math.PI / 180)
              const x1 = Math.round((24 + 16 * Math.sin(angle)) * 1000) / 1000
              const y1 = Math.round((24 - 16 * Math.cos(angle)) * 1000) / 1000
              const x2 = Math.round((24 + 18 * Math.sin(angle)) * 1000) / 1000
              const y2 = Math.round((24 - 18 * Math.cos(angle)) * 1000) / 1000
              
              return (
                <line
                  key={hour}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#163e64"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              )
            })}

            {/* Hour dots for other positions */}
            {[1, 2, 4, 5, 7, 8, 10, 11].map((hour) => {
              const angle = (hour * 30) * (Math.PI / 180)
              const x = Math.round((24 + 17 * Math.sin(angle)) * 1000) / 1000
              const y = Math.round((24 - 17 * Math.cos(angle)) * 1000) / 1000
              
              return (
                <circle
                  key={hour}
                  cx={x}
                  cy={y}
                  r="1.5"
                  fill="#163e64"
                />
              )
            })}

            {/* Static hands pointing to 3:00 */}
            <line x1="24" y1="24" x2="34" y2="24" stroke="#163e64" strokeWidth="3" strokeLinecap="round" />
            <line x1="24" y1="24" x2="24" y2="10" stroke="#163e64" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="24" y1="24" x2="24" y2="8" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
            
            <circle cx="24" cy="24" r="2" fill="#163e64" />
          </svg>
        </div>
      </div>
    )
  }

  const hours = time.getHours() % 12 || 12
  const minutes = time.getMinutes()
  const seconds = time.getSeconds()

  // Calculate angles for clock hands
  const hourAngle = (hours * 30) + (minutes * 0.5)
  const minuteAngle = minutes * 6
  const secondAngle = seconds * 6

  return (
    <div className="relative inline-block ml-3" style={{ verticalAlign: 'middle', transform: 'translateY(-2px)' }}>
      <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-teal-500 rounded-full p-0.5 shadow-lg">
        <svg width="32" height="32" viewBox="0 0 48 48" className="w-full h-full">
          {/* Clock face */}
          <circle
            cx="24"
            cy="24"
            r="20"
            fill="white"
            stroke="none"
          />
          
          {/* Hour markers - only show 12, 3, 6, 9 */}
          {[0, 3, 6, 9].map((hour) => {
            const angle = (hour * 30) * (Math.PI / 180)
            const x1 = Math.round((24 + 16 * Math.sin(angle)) * 1000) / 1000
            const y1 = Math.round((24 - 16 * Math.cos(angle)) * 1000) / 1000
            const x2 = Math.round((24 + 18 * Math.sin(angle)) * 1000) / 1000
            const y2 = Math.round((24 - 18 * Math.cos(angle)) * 1000) / 1000
            
            return (
              <line
                key={hour}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#163e64"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            )
          })}

          {/* Hour dots for other positions */}
          {[1, 2, 4, 5, 7, 8, 10, 11].map((hour) => {
            const angle = (hour * 30) * (Math.PI / 180)
            const x = Math.round((24 + 17 * Math.sin(angle)) * 1000) / 1000
            const y = Math.round((24 - 17 * Math.cos(angle)) * 1000) / 1000
            
            return (
              <circle
                key={hour}
                cx={x}
                cy={y}
                r="1.5"
                fill="#163e64"
              />
            )
          })}

          {/* Hour hand */}
          <line
            x1="24"
            y1="24"
            x2={Math.round((24 + 10 * Math.sin(hourAngle * Math.PI / 180)) * 1000) / 1000}
            y2={Math.round((24 - 10 * Math.cos(hourAngle * Math.PI / 180)) * 1000) / 1000}
            stroke="#163e64"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Minute hand */}
          <line
            x1="24"
            y1="24"
            x2={Math.round((24 + 14 * Math.sin(minuteAngle * Math.PI / 180)) * 1000) / 1000}
            y2={Math.round((24 - 14 * Math.cos(minuteAngle * Math.PI / 180)) * 1000) / 1000}
            stroke="#163e64"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Second hand */}
          <line
            x1="24"
            y1="24"
            x2={Math.round((24 + 16 * Math.sin(secondAngle * Math.PI / 180)) * 1000) / 1000}
            y2={Math.round((24 - 16 * Math.cos(secondAngle * Math.PI / 180)) * 1000) / 1000}
            stroke="#ef4444"
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          {/* Center dot */}
          <circle
            cx="24"
            cy="24"
            r="2"
            fill="#163e64"
          />
        </svg>
      </div>
    </div>
  )
}

export default function Home() {
  const [selectedColor, setSelectedColor] = useState('bg-blue-600')
  const [appUrl, setAppUrl] = useState("https://app.classraum.com")
  const unifiedSectionRef = useRef<HTMLDivElement>(null)
  const centerBoxRef = useRef<HTMLDivElement>(null)
  const featureBoxRefs = useRef<(HTMLDivElement | null)[]>([])
  const animationContainerRef = useRef<HTMLDivElement>(null)
  const timelineRef = useRef<gsap.core.Timeline | null>(null)
  
  // Set the correct app URL based on environment
  useEffect(() => {
    if (window.location.hostname === 'localhost') {
      const { protocol, port } = window.location
      setAppUrl(`${protocol}//app.localhost${port ? ':' + port : ''}`)
    }
  }, [])

  // GSAP ScrollTrigger animation system
  useEffect(() => {
    if (typeof window === "undefined" || !unifiedSectionRef.current || !animationContainerRef.current) return

    const section = unifiedSectionRef.current
    const container = animationContainerRef.current
    const centerBox = centerBoxRef.current
    const featureBoxes = featureBoxRefs.current.filter(Boolean)

    if (featureBoxes.length === 0 || !centerBox) {
      console.log("Missing elements:", { featureBoxes: featureBoxes.length, centerBox: !!centerBox })
      return
    }

    console.log("Found feature boxes:", featureBoxes.length)
    console.log("Animation container bounds:", container.getBoundingClientRect())

    // Define initial scattered positions (relative to center)
    const positions = [
      { x: -250, y: -150 }, // Box 0 - Top left
      { x: 250, y: -150 },  // Box 1 - Top right
      { x: -300, y: 0 },    // Box 2 - Middle left
      { x: 300, y: 0 },     // Box 3 - Middle right
      { x: -250, y: 150 },  // Box 4 - Bottom left
      { x: 0, y: 220 },     // Box 5 - Bottom center
      { x: 250, y: 150 },   // Box 6 - Bottom right
      { x: 0, y: -220 }     // Box 7 - Top center
    ]

    // Set initial positions for all feature boxes
    featureBoxes.forEach((box, index) => {
      const pos = positions[index]
      if (pos && box) {
        // Set initial scattered position with GSAP immediately
        gsap.set(box, {
          x: pos.x,
          y: pos.y,
          scale: 1,
          opacity: 1,
          transformOrigin: "center center",
          force3D: true,
          immediateRender: true
        })
        console.log(`Set initial position for box ${index}:`, pos)
      }
    })

    // Create the main timeline
    const tl = gsap.timeline({
      paused: true,
      ease: "power2.inOut"
    })

    // Add convergence animations for each box - animate from current position to center
    featureBoxes.forEach((box, index) => {
      if (box) {
        const pos = positions[index]
        if (pos) {
          console.log(`Adding animation for box ${index}`)
          tl.to(box, {
            x: 0, // Move to center (0 offset from 50% 50%)
            y: 0,
            scale: 0.8,
            opacity: 0.5,
            duration: 1,
            ease: "power2.inOut",
            force3D: true,
            transformOrigin: "center center"
          }, index * 0.15) // Stagger by 0.15 seconds
        }
      }
    })

    console.log("Timeline duration:", tl.duration())

    // Add text transition at the end
    if (centerBox) {
      const allInOneText = centerBox.querySelector('.all-in-one-text')
      const classraumText = centerBox.querySelector('.classraum-text')
      
      if (allInOneText && classraumText) {
        tl.to(allInOneText, {
          opacity: 0,
          y: -15,
          duration: 0.5
        }, "-=0.3")
        .to(classraumText, {
          opacity: 1,
          y: 0,
          duration: 0.5
        }, "-=0.3")
      }
    }

    // Add header text fade-in after the cards animation
    const headerText = document.getElementById('header-text')
    if (headerText) {
      tl.to(headerText, {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: "power2.out"
      }, "-=0.2") // Start slightly before the center text finishes
    }

    // Store timeline reference
    timelineRef.current = tl

    // Create ScrollTrigger
    const scrollTrigger = ScrollTrigger.create({
      trigger: container,
      start: "top 20%",
      end: "+=250%",
      pin: section,
      pinSpacing: true,
      scrub: 2,
      anticipatePin: 1,
      refreshPriority: -1,
      invalidateOnRefresh: false,
      onUpdate: (self) => {
        // Manually control timeline progress based on scroll
        const progress = self.progress
        tl.progress(progress)
        console.log("ScrollTrigger progress:", progress)
        
        // Debug: Check if first box is actually moving
        if (featureBoxes[0]) {
          const transform = window.getComputedStyle(featureBoxes[0]).transform
          console.log("Box 0 transform:", transform)
        }
      },
      onToggle: (self) => {
        console.log("ScrollTrigger toggled:", self.isActive)
      }
    })

    console.log("GSAP ScrollTrigger initialized")

    // Cleanup
    return () => {
      scrollTrigger.kill()
      tl.kill()
      timelineRef.current = null
    }
  }, [])

  
  return (
    <div className="min-h-screen bg-background">
      <Header currentPage="home" />

      {/* Hero Section */}
      <main className="mx-auto px-6 py-16" style={{ maxWidth: '1200px' }}>
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-4">
            <div className="w-fit flex items-center gap-2 bg-primary/10 px-4 py-2 text-[#163e64] text-sm font-semibold rounded-full">
              <Zap className="h-4 w-4 text-[#163e64]" />
              AI-Powered Academy Management
            </div>
            
            <div className="space-y-6">
              <h1 className="text-4xl lg:text-6xl font-bold leading-none">
                Give Educators Back Their{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500">Most Valuable Asset: Time</span><TickingClock />
              </h1>
              
              <p className="text-lg text-[#163e64] max-w-lg">
                All-in-one, AI-powered platform built for educators, directors, and academic institutions.
              </p>
              <p className="text-lg text-[#163e64] max-w-lg">
                Simplify time-consuming tasks like report generation, lesson scheduling, and communication—turning fragmented workflows into a unified, intelligent system.
              </p>
            </div>
            
            <div className="space-y-4">
              <a href={`${appUrl}/dashboard`}>
                <Button size="lg" className="text-base px-8">
                  Start Free Trial →
                </Button>
              </a>
              
              <div className="flex items-center space-x-6 text-sm text-[#163e64] mt-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Free 10-day trial</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>No setup required</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Cancel anytime</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Dashboard Preview */}
          <div className="relative">
            <Card className="bg-white shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-300 ease-in-out hover:shadow-3xl scale-90">
              <CardContent className="p-5">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-900">AI-Powered Customized Dashboard</h3>
                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 px-3 py-1">Real-Time Insights</Badge>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <div className="w-3 h-3 bg-white rounded-full"></div>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="text-base font-semibold text-gray-900">Lincoln Academy</div>
                        <div className="text-sm text-gray-500">Overview • All Departments</div>
                      </div>
                    </div>
                    
                    <div className="space-y-4 mt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Users className="w-4 h-4 text-gray-600" />
                          </div>
                          <span className="text-sm font-medium text-gray-700">Overall Attendance</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-20 h-2 bg-gray-200 rounded-full">
                            <div className="bg-green-500 h-2 rounded-full" style={{width: '94%'}}></div>
                          </div>
                          <span className="text-sm font-bold text-gray-900 w-8">94%</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Zap className="w-4 h-4 text-gray-600" />
                          </div>
                          <span className="text-sm font-medium text-gray-700">Task Automation</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-20 h-2 bg-gray-200 rounded-full">
                            <div className="bg-blue-500 h-2 rounded-full" style={{width: '70%'}}></div>
                          </div>
                          <span className="text-sm font-bold text-gray-900 w-8">70%</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Clock className="w-4 h-4 text-gray-600" />
                          </div>
                          <span className="text-sm font-medium text-gray-700">Time Saved</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-20 h-2 bg-gray-200 rounded-full">
                            <div className="bg-purple-500 h-2 rounded-full" style={{width: '75%'}}></div>
                          </div>
                          <span className="text-sm font-bold text-gray-900">15hrs/week</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg mt-6">
                      <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                        <Zap className="h-4 w-4" />
                        <span className="font-medium">AI automates 70% of administrative tasks</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Floating elements */}
            <div className="absolute -top-1 -right-1 w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white animate-bounce">
              <Zap className="h-6 w-6" />
            </div>
          </div>
        </div>
        
        {/* Problem Section */}
        <section className="py-24">
          <div className="text-center mb-16">
            <div className="mb-2">
              <h3 className="text-xl font-medium text-primary" style={{ fontFamily: 'Kalam, Comic Sans MS, cursive' }}>The Solution</h3>
            </div>
            <h2 className="text-5xl font-bold mb-6">The Problem We Solve</h2>
            <p className="text-lg text-[#163e64] max-w-2xl mx-auto">
              Administrative overhead and fragmented systems steal precious hours from what matters most: <span className="font-bold text-primary">Teaching and Learning</span>.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300 p-6">
              <div className="text-center space-y-4">
                <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-7 h-7 text-red-500" />
                </div>
                <div>
                  <div className="text-4xl font-bold text-red-500 mb-2">30-50%</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Administrative Burden</h3>
                  <p className="text-sm text-gray-600">Time spent on paperwork instead of teaching</p>
                </div>
              </div>
            </Card>
            
            <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300 p-6">
              <div className="text-center space-y-4">
                <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                  <Layers className="w-7 h-7 text-orange-500" />
                </div>
                <div>
                  <div className="text-4xl font-bold text-orange-500 mb-2">5-10</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Fragmented Systems</h3>
                  <p className="text-sm text-gray-600">Different platforms educators must juggle daily</p>
                </div>
              </div>
            </Card>
            
            <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300 p-6">
              <div className="text-center space-y-4">
                <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                  <TrendingDown className="w-7 h-7 text-purple-500" />
                </div>
                <div>
                  <div className="text-4xl font-bold text-purple-500 mb-2">70%</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Quality Decline</h3>
                  <p className="text-sm text-gray-600">Reduction in meaningful student engagement</p>
                </div>
              </div>
            </Card>
          </div>
        </section>
      </main>

      {/* AI-Powered Unified Platform Section - Full Width */}
      <section ref={unifiedSectionRef} className="py-20 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 text-white relative overflow-hidden" style={{ minHeight: '100vh' }}>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30"></div>
          
          <div className="relative z-10 max-w-7xl mx-auto px-6">
            {/* Animated Feature Boxes */}
            <div ref={animationContainerRef} className="relative max-w-8xl mx-auto h-[500px] mb-16 mt-20">
              {/* Center AI-Powered Box */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
                <div className="w-52 h-36 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex flex-col items-center justify-center text-center shadow-2xl border-2 border-white/30">
                  <div ref={centerBoxRef} className="relative w-full h-10 flex items-center justify-center">
                    <div className="classraum-text text-xl font-bold text-white tracking-wider absolute inset-0 flex items-center justify-center transform translate-y-5 opacity-0">
                      CLASSRAUM
                    </div>
                    <div className="all-in-one-text text-xl font-bold text-white tracking-wider flex items-center justify-center">
                      All-In-One
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature Boxes - Initially scattered, positioned by animation system */}
              {/* Box 1 - AI-Generated Reports */}
              <div 
                ref={(el) => { featureBoxRefs.current[0] = el }}
                className="z-10"
                style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
              >
                <div className="w-36 h-24 bg-black/20 backdrop-blur-md border border-white/30 rounded-xl flex flex-col items-center justify-center text-center shadow-xl group p-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mb-2 flex-shrink-0">
                    <FileText className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-xs font-semibold text-white leading-tight text-center">AI-Generated Smart Reports</div>
                </div>
              </div>

              {/* Box 2 - Customized Dashboard */}
              <div 
                ref={(el) => { featureBoxRefs.current[1] = el }}
                className="z-10"
                style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
              >
                <div className="w-36 h-24 bg-black/20 backdrop-blur-md border border-white/30 rounded-xl flex flex-col items-center justify-center text-center shadow-xl group p-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mb-2 flex-shrink-0">
                    <BarChart3 className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-xs font-semibold text-white leading-tight text-center">Customized Dashboard</div>
                </div>
              </div>

              {/* Box 3 - Lesson Planning */}
              <div 
                ref={(el) => { featureBoxRefs.current[2] = el }}
                className="z-10"
                style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
              >
                <div className="w-36 h-24 bg-black/20 backdrop-blur-md border border-white/30 rounded-xl flex flex-col items-center justify-center text-center shadow-xl group p-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center mb-2 flex-shrink-0">
                    <Calendar className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-xs font-semibold text-white leading-tight text-center">Lesson and Assignment Planning</div>
                </div>
              </div>

              {/* Box 4 - Attendance */}
              <div 
                ref={(el) => { featureBoxRefs.current[3] = el }}
                className="z-10"
                style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
              >
                <div className="w-36 h-24 bg-black/20 backdrop-blur-md border border-white/30 rounded-xl flex flex-col items-center justify-center text-center shadow-xl group p-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center mb-2 flex-shrink-0">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-xs font-semibold text-white leading-tight text-center">Attendance and Recordings</div>
                </div>
              </div>

              {/* Box 5 - Notifications */}
              <div 
                ref={(el) => { featureBoxRefs.current[4] = el }}
                className="z-10"
                style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
              >
                <div className="w-36 h-24 bg-black/20 backdrop-blur-md border border-white/30 rounded-xl flex flex-col items-center justify-center text-center shadow-xl group p-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-pink-600 rounded-lg flex items-center justify-center mb-2 flex-shrink-0">
                    <Bell className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-xs font-semibold text-white leading-tight text-center">Live Notifications</div>
                </div>
              </div>

              {/* Box 6 - Privacy by Design */}
              <div 
                ref={(el) => { featureBoxRefs.current[5] = el }}
                className="z-10"
                style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
              >
                <div className="w-36 h-24 bg-black/20 backdrop-blur-md border border-white/30 rounded-xl flex flex-col items-center justify-center text-center shadow-xl group p-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-cyan-500 rounded-lg flex items-center justify-center mb-2 flex-shrink-0">
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-xs font-semibold text-white leading-tight text-center">Privacy by Design</div>
                </div>
              </div>

              {/* Box 7 - Seamless Integration */}
              <div 
                ref={(el) => { featureBoxRefs.current[6] = el }}
                className="z-10"
                style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
              >
                <div className="w-36 h-24 bg-black/20 backdrop-blur-md border border-white/30 rounded-xl flex flex-col items-center justify-center text-center shadow-xl group p-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center mb-2 flex-shrink-0">
                    <Link2 className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-xs font-semibold text-white leading-tight text-center">Seamless Integration</div>
                </div>
              </div>

              {/* Box 8 - Real-Time Analytics */}
              <div 
                ref={(el) => { featureBoxRefs.current[7] = el }}
                className="z-10"
                style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
              >
                <div className="w-36 h-24 bg-black/20 backdrop-blur-md border border-white/30 rounded-xl flex flex-col items-center justify-center text-center shadow-xl group p-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center mb-2 flex-shrink-0">
                    <BarChart3 className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-xs font-semibold text-white leading-tight text-center">Real-Time Analytics</div>
                </div>
              </div>
            </div>
            
            {/* Header text that appears after animation */}
            <div id="header-text" className="text-center mb-16 transform translate-y-10 opacity-0">
              <h2 className="text-4xl lg:text-6xl font-bold mb-6">
                AI-Powered <span className="text-cyan-400">Unified Platform</span>
              </h2>
              <p className="text-xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
                Watch as fragmented tools converge into one intelligent ecosystem that learns, adapts, and grows with your institution.
              </p>
            </div>
          </div>
        </section>

      {/* Features Section */}
      <section className="py-24 bg-gray-50">
        <div className="mx-auto px-6" style={{ maxWidth: '1200px' }}>
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">Everything You Need in One Place</h2>
            <p className="text-lg text-[#163e64] max-w-2xl mx-auto">
              Comprehensive tools designed for modern educational institutions. From classroom management to financial tracking, we've got you covered.
            </p>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-8">
            <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-6">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-4 text-gray-900">AI-Generated Reports</h3>
                <p className="text-gray-600 mb-6">
                  Generate comprehensive reports automatically. Track student progress, attendance patterns, financial metrics, and institutional performance with intelligent insights.
                </p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span>Automated student progress reports</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span>Financial and billing analytics</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span>Attendance and engagement metrics</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-6">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-4 text-gray-900">Smart Scheduling & Planning</h3>
                <p className="text-gray-600 mb-6">
                  Intelligent lesson planning and scheduling tools that adapt to your curriculum needs. Create assignments, manage resources, and optimize time allocation.
                </p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span>AI-powered lesson planning</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span>Dynamic schedule optimization</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span>Resource allocation tracking</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-6">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-4 text-gray-900">Unified Communication Hub</h3>
                <p className="text-gray-600 mb-6">
                  Streamline communication between teachers, students, parents, and administration. Real-time notifications, messaging, and updates in one central hub.
                </p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span>Multi-stakeholder messaging</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span>Automated parent notifications</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span>Emergency communication system</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <main className="mx-auto px-6 py-24" style={{ maxWidth: '1200px' }}>
        <section className="text-center py-20 bg-gradient-to-r from-primary/10 to-blue-600/10 rounded-3xl">
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 px-6">
            Ready to Transform Your Institution?
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Join hundreds of educational institutions already saving time and improving operations with CLASSRAUM.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={`${appUrl}/dashboard`}>
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
                <div className="w-8 h-8 rounded-lg relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #2C6EF1 0%, #16ADD4 50%, #00D0AE 100%)' }}>
                  <svg width="40" height="40" viewBox="0 0 4096 4096" className="text-white absolute -top-1 -left-1">
                    <path 
                      d="M2965.11,2503v108a24.006,24.006,0,0,1-24,24H1156a24.006,24.006,0,0,1-24-24V2503c0.03-16.46-1.04-28.43,10-57,9.72-25.17,27.02-50.86,59-82,26.39-25.7,56.22-57.8,87-88,36.79-36.1,63.51-70.77,82-107,7.18-14.06,15.16-37.52,21.88-71.02,3.11-15.53,5.02-35.6,6.12-56.78V1785h0.01c0-309.87,216.8-569.09,506.99-634.27V1110h0a142.367,142.367,0,0,1,142.37-142h0.01a142.367,142.367,0,0,1,142.37,142h0v40.4c290.91,64.65,508.43,324.22,508.43,634.6h0.01v231.42c0.71,29.84,2.73,60.05,7.04,81.56,6.72,33.5,14.7,56.96,21.88,71.02,18.49,36.23,45.21,70.9,82,107,30.78,30.2,60.61,62.3,87,88,31.98,31.14,49.28,56.83,59,82C2966.15,2474.57,2965.08,2486.54,2965.11,2503Zm-600.48,242c0.89,9.72,1.37,19.55,1.37,29.5,0,175.9-142.6,318.5-318.5,318.5S1729,2950.4,1729,2774.5c0-9.95.48-19.78,1.37-29.5h634.26Z"
                      fill="currentColor"
                      fillRule="evenodd"
                    />
                  </svg>
                </div>
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
                <Link href="/faqs" className="block text-gray-400 hover:text-white transition-colors text-sm">
                  FAQs
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
                <a href={`${appUrl}/auth`} className="block text-gray-400 hover:text-white transition-colors text-sm">
                  Sign In
                </a>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-700 mt-12 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <p className="text-gray-400 text-sm">&copy; 2025 CLASSRAUM. All rights reserved.</p>
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