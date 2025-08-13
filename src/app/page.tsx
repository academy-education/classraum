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
  const [appUrl, setAppUrl] = useState("https://classraum-korea.vercel.app")
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
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center mb-2 flex-shrink-0">
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-xs font-semibold text-white leading-tight text-center">Privacy by Design</div>
                </div>
              </div>

              {/* Box 7 - Smart Linking */}
              <div 
                ref={(el) => { featureBoxRefs.current[6] = el }}
                className="z-10"
                style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
              >
                <div className="w-36 h-24 bg-black/20 backdrop-blur-md border border-white/30 rounded-xl flex flex-col items-center justify-center text-center shadow-xl group p-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center mb-2 flex-shrink-0">
                    <Link2 className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-xs font-semibold text-white leading-tight text-center">Smart Linking System</div>
                </div>
              </div>

              {/* Box 8 - AI Automation */}
              <div 
                ref={(el) => { featureBoxRefs.current[7] = el }}
                className="z-10"
                style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
              >
                <div className="w-36 h-24 bg-black/20 backdrop-blur-md border border-white/30 rounded-xl flex flex-col items-center justify-center text-center shadow-xl group p-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center mb-2 flex-shrink-0">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-xs font-semibold text-white leading-tight text-center">AI Automation</div>
                </div>
              </div>
            </div>

            {/* Header Text Below Animation */}
            <div className="text-center mb-2 opacity-0" id="header-text">
              <h2 className="text-4xl lg:text-5xl font-bold mb-6">
                All-in-One <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500">Solution</span>
              </h2>
              <p className="text-lg text-blue-100 max-w-3xl mx-auto mb-4">
                Eliminate the hassle of managing multiple tools. CLASSRAUM brings together years of insight from educators across various fields to streamline and simplify time-consuming administrative tasks. Our intelligent, real-time platform centralizes all key academic operations—built by educators, for educators.
              </p>
            </div>

            {/* Bottom Content */}
            <div className="relative z-20 text-center bg-black/30 backdrop-blur-md border border-white/40 rounded-2xl p-8 max-w-5xl mx-auto shadow-xl mt-16 mb-12">
              <h3 className="text-2xl lg:text-3xl font-bold mb-6 text-white drop-shadow-lg">
                One Platform. Intelligent Analysis. Unlimited Time Savings.
              </h3>
              <p className="text-blue-100 max-w-4xl mx-auto mb-8">
                No more switching between different apps, losing data, or spending hours on manual tasks. Our unified solution handles the repetitive work while you focus on what matters: teaching and managing your institution.
              </p>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6 max-w-3xl mx-auto">
                <div className="text-center bg-black/30 backdrop-blur-sm border border-white/20 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-3xl lg:text-4xl font-bold text-purple-400 mb-2">70%</div>
                  <div className="text-base font-semibold text-purple-200">Automated</div>
                </div>
                <div className="text-center bg-black/30 backdrop-blur-sm border border-white/20 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col items-center justify-center">
                  <div className="text-2xl lg:text-3xl font-bold text-cyan-400 whitespace-nowrap">AI-Powered</div>
                </div>
                <div className="text-center bg-black/30 backdrop-blur-sm border border-white/20 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-3xl lg:text-4xl font-bold text-green-400 mb-2">15hrs</div>
                  <div className="text-base font-semibold text-green-200">Time Saved</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* AI-Powered Features Section */}
        <section className="py-24 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-24">
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
                Simple Yet Detailed Features for <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500">Modern Educators</span>
              </h2>
              <p className="text-lg text-[#163e64] max-w-3xl mx-auto">
                Every tool you need to automate administrative work and focus on what matters most: teaching and student success.
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-16 mb-16">
              {/* AI-Generated Smart Report Cards */}
              <div className="group relative bg-gray-100 rounded-3xl p-8 hover:shadow-xl transition-all duration-300 hover:bg-gray-50 flex flex-col h-full">
                <div className="absolute -top-6 left-6 w-12 h-12 bg-gradient-to-br from-blue-600 to-teal-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div className="pt-8 flex flex-col flex-grow">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 text-left">AI-Generated Smart Report Cards</h3>
                  <p className="text-gray-600 text-sm leading-relaxed text-left mb-6 flex-grow">
                    Auto-generated based on teacher inputs—personalized, real-time, visualized reports with zero additional writing time. AI analyzes data to create detailed, insightful progress reports.
                  </p>
                  <Link href="/features/ai-report-cards" className="mt-auto self-start">
                    <button className="group/btn relative text-gray-700 font-semibold text-sm transition-all duration-300 hover:text-blue-600">
                      <span className="flex items-center space-x-2">
                        <span className="relative">
                          Learn More
                          <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover/btn:w-full"></span>
                        </span>
                        <svg className="w-4 h-4 transform transition-all duration-300 group-hover/btn:translate-x-2 group-hover/btn:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </span>
                    </button>
                  </Link>
                </div>
              </div>

              {/* Customized Dashboard */}
              <div className="group relative bg-gray-100 rounded-3xl p-8 hover:shadow-xl transition-all duration-300 hover:bg-gray-50 flex flex-col h-full">
                <div className="absolute -top-6 left-6 w-12 h-12 bg-gradient-to-br from-blue-600 to-teal-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div className="pt-8 flex flex-col flex-grow">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 text-left">Customized Dashboard</h3>
                  <p className="text-gray-600 text-sm leading-relaxed text-left mb-6 flex-grow">
                    Full visibility into every classroom, every student, and every staff member—with task tracking and oversight tools. Monitor institutional performance in real-time.
                  </p>
                  <Link href="/features/customized-dashboard" className="mt-auto self-start">
                    <button className="group/btn relative text-gray-700 font-semibold text-sm transition-all duration-300 hover:text-blue-600">
                      <span className="flex items-center space-x-2">
                        <span className="relative">
                          Learn More
                          <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover/btn:w-full"></span>
                        </span>
                        <svg className="w-4 h-4 transform transition-all duration-300 group-hover/btn:translate-x-2 group-hover/btn:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </span>
                    </button>
                  </Link>
                </div>
              </div>

              {/* Lesson, Syllabus & Assignment Planning */}
              <div className="group relative bg-gray-100 rounded-3xl p-8 hover:shadow-xl transition-all duration-300 hover:bg-gray-50 flex flex-col h-full">
                <div className="absolute -top-6 left-6 w-12 h-12 bg-gradient-to-br from-blue-600 to-teal-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div className="pt-8 flex flex-col flex-grow">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 text-left">Lesson, Syllabus & Assignment Planning</h3>
                  <p className="text-gray-600 text-sm leading-relaxed text-left mb-6 flex-grow">
                    Streamline your planning process with AI-assisted lesson planning, automated syllabus generation, and smart assignment scheduling. Collaborate with colleagues and maintain consistent academic standards.
                  </p>
                  <Link href="/features/lesson-assignment-planner" className="mt-auto self-start">
                    <button className="group/btn relative text-gray-700 font-semibold text-sm transition-all duration-300 hover:text-blue-600">
                      <span className="flex items-center space-x-2">
                        <span className="relative">
                          Learn More
                          <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover/btn:w-full"></span>
                        </span>
                        <svg className="w-4 h-4 transform transition-all duration-300 group-hover/btn:translate-x-2 group-hover/btn:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </span>
                    </button>
                  </Link>
                </div>
              </div>

              {/* Attendance, Recordings & Catch-up Tools */}
              <div className="group relative bg-gray-100 rounded-3xl p-8 hover:shadow-xl transition-all duration-300 hover:bg-gray-50 flex flex-col h-full">
                <div className="absolute -top-6 left-6 w-12 h-12 bg-gradient-to-br from-blue-600 to-teal-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div className="pt-8 flex flex-col flex-grow">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 text-left">Attendance, Recordings & Catch-up Tools</h3>
                  <p className="text-gray-600 text-sm leading-relaxed text-left mb-6 flex-grow">
                    Automated attendance tracking with smart alerts, seamless class recordings, and integrated catch-up tools for absent students. Never miss a moment of learning.
                  </p>
                  <Link href="/features/attendance-recording" className="mt-auto self-start">
                    <button className="group/btn relative text-gray-700 font-semibold text-sm transition-all duration-300 hover:text-blue-600">
                      <span className="flex items-center space-x-2">
                        <span className="relative">
                          Learn More
                          <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover/btn:w-full"></span>
                        </span>
                        <svg className="w-4 h-4 transform transition-all duration-300 group-hover/btn:translate-x-2 group-hover/btn:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </span>
                    </button>
                  </Link>
                </div>
              </div>

              {/* Live Notifications */}
              <div className="group relative bg-gray-100 rounded-3xl p-8 hover:shadow-xl transition-all duration-300 hover:bg-gray-50 flex flex-col h-full">
                <div className="absolute -top-6 left-6 w-12 h-12 bg-gradient-to-br from-blue-600 to-teal-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Bell className="w-6 h-6 text-white" />
                </div>
                <div className="pt-8 flex flex-col flex-grow">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 text-left">Live Notifications (Push, Email, Kakao)</h3>
                  <p className="text-gray-600 text-sm leading-relaxed text-left mb-6 flex-grow">
                    Multi-channel real-time notifications through push, email, and KakaoTalk. Keep everyone informed with instant updates about classes, assignments, and important announcements.
                  </p>
                  <Link href="/features/real-time-notifications" className="mt-auto self-start">
                    <button className="group/btn relative text-gray-700 font-semibold text-sm transition-all duration-300 hover:text-blue-600">
                      <span className="flex items-center space-x-2">
                        <span className="relative">
                          Learn More
                          <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover/btn:w-full"></span>
                        </span>
                        <svg className="w-4 h-4 transform transition-all duration-300 group-hover/btn:translate-x-2 group-hover/btn:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </span>
                    </button>
                  </Link>
                </div>
              </div>

              {/* Smart Linking System */}
              <div className="group relative bg-gray-100 rounded-3xl p-8 hover:shadow-xl transition-all duration-300 hover:bg-gray-50 flex flex-col h-full">
                <div className="absolute -top-6 left-6 w-12 h-12 bg-gradient-to-br from-blue-600 to-teal-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Link2 className="w-6 h-6 text-white" />
                </div>
                <div className="pt-8 flex flex-col flex-grow">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 text-left">Smart Linking System</h3>
                  <p className="text-gray-600 text-sm leading-relaxed text-left mb-6 flex-grow">
                    Intelligent integration with existing educational tools and platforms. Seamlessly connect with Google Classroom, Zoom, and other essential services through smart linking technology.
                  </p>
                  <Link href="/features/smart-linking-system" className="mt-auto self-start">
                    <button className="group/btn relative text-gray-700 font-semibold text-sm transition-all duration-300 hover:text-blue-600">
                      <span className="flex items-center space-x-2">
                        <span className="relative">
                          Learn More
                          <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover/btn:w-full"></span>
                        </span>
                        <svg className="w-4 h-4 transform transition-all duration-300 group-hover/btn:translate-x-2 group-hover/btn:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </span>
                    </button>
                  </Link>
                </div>
              </div>

              {/* Privacy by Design */}
              <div className="group relative bg-gray-100 rounded-3xl p-8 hover:shadow-xl transition-all duration-300 hover:bg-gray-50 flex flex-col h-full">
                <div className="absolute -top-6 left-6 w-12 h-12 bg-gradient-to-br from-blue-600 to-teal-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div className="pt-8 flex flex-col flex-grow">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 text-left">Privacy by Design</h3>
                  <p className="text-gray-600 text-sm leading-relaxed text-left mb-6 flex-grow">
                    Built-in privacy protection with enterprise-grade security. GDPR compliant data handling, encrypted communications, and granular permission controls for student and staff data.
                  </p>
                  <Link href="/features/privacy-by-design" className="mt-auto self-start">
                    <button className="group/btn relative text-gray-700 font-semibold text-sm transition-all duration-300 hover:text-blue-600">
                      <span className="flex items-center space-x-2">
                        <span className="relative">
                          Learn More
                          <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover/btn:w-full"></span>
                        </span>
                        <svg className="w-4 h-4 transform transition-all duration-300 group-hover/btn:translate-x-2 group-hover/btn:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </span>
                    </button>
                  </Link>
                </div>
              </div>

              {/* AI Automation Engine */}
              <div className="group relative bg-gray-100 rounded-3xl p-8 hover:shadow-xl transition-all duration-300 hover:bg-gray-50 flex flex-col h-full">
                <div className="absolute -top-6 left-6 w-12 h-12 bg-gradient-to-br from-blue-600 to-teal-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div className="pt-8 flex flex-col flex-grow">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 text-left">AI Automation Engine</h3>
                  <p className="text-gray-600 text-sm leading-relaxed text-left mb-6 flex-grow">
                    Advanced AI that learns your workflow and automates repetitive tasks. From scheduling to grading assistance, our engine handles the routine work so you can focus on teaching.
                  </p>
                  <button className="group/btn relative text-gray-700 font-semibold text-sm transition-all duration-300 hover:text-blue-600 mt-auto self-start">
                    <span className="flex items-center space-x-2">
                      <span className="relative">
                        Learn More
                        <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover/btn:w-full"></span>
                      </span>
                      <svg className="w-4 h-4 transform transition-all duration-300 group-hover/btn:translate-x-2 group-hover/btn:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Make It Yours Section */}
        <section className="py-24 bg-gray-50">
          <div className="max-w-6xl mx-auto px-6">
            {/* Header */}
            <div className="text-center mb-20">
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
                Make It <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500">Yours</span>
              </h2>
              <p className="text-lg text-[#163e64] max-w-2xl mx-auto">
                Customize to match your institution&apos;s brand and identity. Your colors, your logo, your style.
              </p>
            </div>

            {/* Content Grid */}
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              {/* Left Side - Features */}
              <div className="space-y-8">
                {/* Custom Color Schemes */}
                <div className="group p-6 rounded-2xl border-2 border-gray-200 hover:border-blue-400 transition-all duration-300 hover:shadow-lg hover:bg-blue-50/30 cursor-pointer transform hover:-translate-y-1 bg-white">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors duration-300">Custom Color Schemes</h3>
                      <p className="text-gray-600 text-sm leading-relaxed">
                        Choose from unlimited color combinations or use your institution&apos;s brand colors. Every element adapts to your chosen palette automatically.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Upload Your Logo */}
                <div className="group p-6 rounded-2xl border-2 border-gray-200 hover:border-purple-400 transition-all duration-300 hover:shadow-lg hover:bg-purple-50/30 cursor-pointer transform hover:-translate-y-1 bg-white">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors duration-300">Upload Your Logo</h3>
                      <p className="text-gray-600 text-sm leading-relaxed">
                        Add your institution&apos;s logo to the dashboard, reports, and all communications. Maintain brand consistency across all touchpoints.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Layout Customization */}
                <div className="group p-6 rounded-2xl border-2 border-gray-200 hover:border-orange-400 transition-all duration-300 hover:shadow-lg hover:bg-orange-50/30 cursor-pointer transform hover:-translate-y-1 bg-white">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors duration-300">Layout Customization</h3>
                      <p className="text-gray-600 text-sm leading-relaxed">
                        Arrange dashboard elements, customize navigation, and organize features to match your workflow and preferences.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Real-time Preview */}
                <div className="group p-6 rounded-2xl border-2 border-gray-200 hover:border-green-400 transition-all duration-300 hover:shadow-lg hover:bg-green-50/30 cursor-pointer transform hover:-translate-y-1 bg-white">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-green-600 transition-colors duration-300">Real-time Preview</h3>
                      <p className="text-gray-600 text-sm leading-relaxed">
                        See your changes instantly with our live preview feature. No waiting, no guesswork - just perfect customization.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side - Dashboard Preview */}
              <div className="relative">
                <div className="bg-white rounded-2xl shadow-2xl p-6 border">
                  {/* Dashboard Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 ${selectedColor} rounded-lg flex items-center justify-center transition-colors duration-300`}>
                        <span className="text-white text-sm font-bold">L</span>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">Lincoln Academy</div>
                        <div className="text-xs text-gray-500">Dashboard</div>
                      </div>
                    </div>
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="w-4 h-4 text-blue-600" />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600 mb-1">248</div>
                      <div className="text-xs text-gray-500">Students</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-500 mb-1">94%</div>
                      <div className="text-xs text-gray-500">Attendance</div>
                    </div>
                  </div>

                  {/* Schedule */}
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">Math Class</span>
                      <span className="text-blue-600 font-medium">9:00 AM</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">Science Lab</span>
                      <span className="text-green-600 font-medium">11:30 AM</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">History</span>
                      <span className="text-purple-600 font-medium">2:00 PM</span>
                    </div>
                  </div>

                  {/* Color Picker */}
                  <div className="border-t pt-4">
                    <div className="text-xs font-medium text-gray-600 mb-3">Choose Your Color</div>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => setSelectedColor('bg-blue-600')}
                        className={`w-6 h-6 bg-blue-500 rounded-full transition-transform ${selectedColor === 'bg-blue-600' ? '' : 'border-2 border-gray-200 hover:scale-110'}`}
                      />
                      <button 
                        onClick={() => setSelectedColor('bg-green-600')}
                        className={`w-6 h-6 bg-green-500 rounded-full transition-transform ${selectedColor === 'bg-green-600' ? '' : 'border-2 border-gray-200 hover:scale-110'}`}
                      />
                      <button 
                        onClick={() => setSelectedColor('bg-purple-600')}
                        className={`w-6 h-6 bg-purple-500 rounded-full transition-transform ${selectedColor === 'bg-purple-600' ? '' : 'border-2 border-gray-200 hover:scale-110'}`}
                      />
                      <button 
                        onClick={() => setSelectedColor('bg-orange-600')}
                        className={`w-6 h-6 bg-orange-500 rounded-full transition-transform ${selectedColor === 'bg-orange-600' ? '' : 'border-2 border-gray-200 hover:scale-110'}`}
                      />
                      <button 
                        onClick={() => setSelectedColor('bg-red-600')}
                        className={`w-6 h-6 bg-red-500 rounded-full transition-transform ${selectedColor === 'bg-red-600' ? '' : 'border-2 border-gray-200 hover:scale-110'}`}
                      />
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Bottom Section */}
            <div className="mt-24 text-center">
              <h3 className="text-5xl font-bold text-gray-900 mb-6">Your Brand, Your Way</h3>
              <p className="text-lg text-[#163e64] max-w-2xl mx-auto mb-16">
                Every institution is unique. CLASSRAUM adapts to your identity, not the other way around. Create a platform that truly represents your educational vision.
              </p>

              {/* Feature Steps */}
              <div className="flex justify-center items-stretch space-x-8 mb-12">
                {/* Step 1 - Color Options Card */}
                <div className="group relative bg-white rounded-2xl p-8 pt-12 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border border-gray-200 w-64 flex flex-col">
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-8 h-8 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-md border-2 border-white" style={{ backgroundColor: '#163e64' }}>1</div>
                  <div className="text-center">
                    <div className="w-24 h-20 bg-gray-50 border-2 border-gray-200 rounded-xl flex items-center justify-center mx-auto mb-6 hover:border-blue-400 transition-colors duration-300 cursor-pointer">
                      <div className="flex space-x-1.5">
                        <div className="w-4 h-4 bg-blue-500 rounded-full hover:scale-125 transition-transform cursor-pointer shadow-sm"></div>
                        <div className="w-4 h-4 bg-green-500 rounded-full hover:scale-125 transition-transform cursor-pointer shadow-sm"></div>
                        <div className="w-4 h-4 bg-purple-500 rounded-full hover:scale-125 transition-transform cursor-pointer shadow-sm"></div>
                        <div className="w-4 h-4 bg-orange-500 rounded-full hover:scale-125 transition-transform cursor-pointer shadow-sm"></div>
                      </div>
                    </div>
                    <div className="text-lg font-semibold text-gray-800 mb-2">Choose Colors</div>
                    <div className="text-sm text-gray-600 leading-relaxed">Select your institution&apos;s brand colors to customize the platform</div>
                  </div>
                </div>
                
                {/* Connector Arrow */}
                <div className="flex items-center justify-center self-center">
                  <svg className="w-8 h-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M13.025 1l-2.847 2.828 6.176 6.176h-16.354v3.992h16.354l-6.176 6.176 2.847 2.828 10.975-11z"/>
                  </svg>
                </div>
                
                {/* Step 2 - File Upload Card */}
                <div className="group relative bg-white rounded-2xl p-8 pt-12 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border border-gray-200 w-64 flex flex-col">
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-8 h-8 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-md border-2 border-white" style={{ backgroundColor: '#163e64' }}>2</div>
                  <div className="text-center">
                    <button className="group/btn relative w-24 h-20 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-6 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 overflow-hidden">
                      <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700"></div>
                      <svg className="w-8 h-8 text-white z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </button>
                    <div className="text-lg font-semibold text-gray-800 mb-2">Upload Logo</div>
                    <div className="text-sm text-gray-600 leading-relaxed">Add your institution&apos;s logo for brand consistency</div>
                  </div>
                </div>
                
                {/* Connector Arrow */}
                <div className="flex items-center justify-center self-center">
                  <svg className="w-8 h-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M13.025 1l-2.847 2.828 6.176 6.176h-16.354v3.992h16.354l-6.176 6.176 2.847 2.828 10.975-11z"/>
                  </svg>
                </div>
                
                {/* Step 3 - Save Button Card */}
                <div className="group relative bg-white rounded-2xl p-8 pt-12 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border border-gray-200 w-64 flex flex-col">
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-8 h-8 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-md border-2 border-white" style={{ backgroundColor: '#163e64' }}>3</div>
                  <div className="text-center">
                    <button className="group/btn relative w-24 h-20 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-6 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent transform scale-x-0 group-hover/btn:scale-x-100 transition-transform duration-500 origin-left"></div>
                      <svg className="w-7 h-7 text-white z-10 group-hover/btn:animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <div className="text-lg font-semibold text-gray-800 mb-2">Save & Apply</div>
                    <div className="text-sm text-gray-600 leading-relaxed">Preview your changes instantly and save settings</div>
                  </div>
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
                  All-In-One management solutions for academies, schools, and educational institutions. We give educators back their most valuable asset: time. Simplify administrative tasks and focus on what maters most – teaching. 
                </p>
                <div className="text-gray-400 text-sm">
                  <p>support@classraum.com</p>
                </div>
              </div>

              {/* Quick Links */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Quick Links</h3>
                <div className="space-y-2">
                  <Link href="#about" className="block text-gray-400 hover:text-white transition-colors text-sm">
                    About
                  </Link>
                  <Link href="#pricing" className="block text-gray-400 hover:text-white transition-colors text-sm">
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
  );
}
