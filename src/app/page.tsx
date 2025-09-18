"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle, FileText, BarChart3, Calendar, Users, Bell, Link2, Shield, Zap, Clock, AlertTriangle, Layers, TrendingDown } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import Header from "@/components/shared/Header"
import Footer from "@/components/shared/Footer"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useTranslation } from "@/hooks/useTranslation"

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
  const { t, language } = useTranslation()
  const [appUrl, setAppUrl] = useState("https://app.classraum.com")
  const unifiedSectionRef = useRef<HTMLDivElement>(null)
  const centerBoxRef = useRef<HTMLDivElement>(null)
  const featureBoxRefs = useRef<(HTMLDivElement | null)[]>([])
  const animationContainerRef = useRef<HTMLDivElement>(null)
  const timelineRef = useRef<gsap.core.Timeline | null>(null)
  
  
  // Set the correct app URL based on environment
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
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
      return
    }

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
    const headerText = typeof document !== 'undefined' ? document.getElementById('header-text') : null
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
      }
    })


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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <div className="space-y-4">
            <div className="w-fit flex items-center gap-2 bg-primary/10 px-4 py-2 text-[#163e64] text-sm font-semibold rounded-full">
              <Zap className="h-4 w-4 text-[#163e64]" />
              {t('landing.hero.badge')}
            </div>
            
            <div className="space-y-4 sm:space-y-6">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight">
                {t('landing.hero.title')}{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500">{t('landing.hero.titleHighlight')}</span><TickingClock />
              </h1>
              
              <p className="text-base sm:text-lg text-[#163e64] max-w-2xl">
                {t('landing.hero.subtitle')}
              </p>
            </div>
            
            <div className="space-y-6 sm:space-y-8">
              <div className="mb-6 sm:mb-8">
                <a href={`${appUrl}/auth?lang=${language}`}>
                  <Button size="lg" className="text-sm sm:text-base px-6 sm:px-8 w-full sm:w-auto">
                    {t('landing.hero.ctaPrimary')}
                  </Button>
                </a>
              </div>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 text-xs sm:text-sm text-[#163e64]">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>{t('landing.hero.features.freeTrial')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>{t('landing.hero.features.noSetup')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>{t('landing.hero.features.cancelAnytime')}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Dashboard Preview */}
          <div className="relative mt-8 lg:mt-0">
            <Card className="bg-white shadow-2xl transform rotate-1 sm:rotate-3 hover:rotate-0 transition-transform duration-300 ease-in-out hover:shadow-3xl scale-90 sm:scale-90">
              <CardContent className="p-3 sm:p-5">
                <div className="space-y-4 sm:space-y-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900">{t('landing.hero.dashboardCard.title')}</h3>
                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 px-2 sm:px-3 py-1">{t('landing.hero.dashboardCard.badge')}</Badge>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <div className="w-8 h-8 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <div className="w-4 h-4 sm:w-6 sm:h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 sm:w-3 sm:h-3 bg-white rounded-full"></div>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm sm:text-base font-semibold text-gray-900 truncate">{t('landing.hero.dashboardCard.companyName')}</div>
                        <div className="text-xs sm:text-sm text-gray-500">{t('landing.hero.dashboardCard.subtitle')}</div>
                      </div>
                    </div>
                    
                    <div className="space-y-4 mt-6">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-100 rounded-full flex items-center justify-center">
                            <Users className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" />
                          </div>
                          <span className="text-xs sm:text-sm font-medium text-gray-700">{t('landing.hero.dashboardCard.metrics.attendance')}</span>
                        </div>
                        <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto">
                          <div className="w-16 sm:w-20 h-2 bg-gray-200 rounded-full">
                            <div className="bg-green-500 h-2 rounded-full" style={{width: '94%'}}></div>
                          </div>
                          <span className="text-xs sm:text-sm font-bold text-gray-900 w-6 sm:w-8">94%</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-100 rounded-full flex items-center justify-center">
                            <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" />
                          </div>
                          <span className="text-xs sm:text-sm font-medium text-gray-700">{t('landing.hero.dashboardCard.metrics.automation')}</span>
                        </div>
                        <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto">
                          <div className="w-16 sm:w-20 h-2 bg-gray-200 rounded-full">
                            <div className="bg-blue-500 h-2 rounded-full" style={{width: '70%'}}></div>
                          </div>
                          <span className="text-xs sm:text-sm font-bold text-gray-900 w-6 sm:w-8">70%</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-100 rounded-full flex items-center justify-center">
                            <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" />
                          </div>
                          <span className="text-xs sm:text-sm font-medium text-gray-700">{t('landing.hero.dashboardCard.metrics.timeSaved')}</span>
                        </div>
                        <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto">
                          <div className="w-16 sm:w-20 h-2 bg-gray-200 rounded-full">
                            <div className="bg-purple-500 h-2 rounded-full" style={{width: '75%'}}></div>
                          </div>
                          <span className="text-xs sm:text-sm font-bold text-gray-900">{t('landing.hero.dashboardCard.timeSavedValue')}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-3 sm:p-4 rounded-lg mt-4 sm:mt-6">
                      <div className="flex items-center justify-center space-x-2 text-xs sm:text-sm text-gray-600">
                        <Zap className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="font-medium text-center">{t('landing.hero.dashboardCard.automationText')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Floating elements */}
            <div className="absolute -top-1 -right-1 w-8 h-8 sm:w-12 sm:h-12 bg-purple-500 rounded-full flex items-center justify-center text-white animate-bounce">
              <Zap className="h-4 w-4 sm:h-6 sm:w-6" />
            </div>
          </div>
        </div>
        
        {/* Problem Section */}
        <section className="py-12 sm:py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 sm:mb-16">
              <div className="mb-2">
                <h3 className="text-lg sm:text-xl font-medium text-primary" style={{ fontFamily: 'Kalam, Comic Sans MS, cursive' }}>{t('landing.problemSection.solutionLabel')}</h3>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6">{t('landing.problemSection.title')}</h2>
              <p className="text-base sm:text-lg text-[#163e64] max-w-2xl mx-auto">
                {t('landing.problemSection.description')} <span className="font-bold text-primary">{t('landing.problemSection.highlightText')}</span>.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300 p-4 sm:p-6">
                <div className="text-center space-y-3 sm:space-y-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                    <AlertTriangle className="w-6 h-6 sm:w-7 sm:h-7 text-red-500" />
                  </div>
                  <div>
                    <div className="text-3xl sm:text-4xl font-bold text-red-500 mb-2">30-50%</div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">{t('landing.problemSection.painPoints.administrative.title')}</h3>
                    <p className="text-xs sm:text-sm text-gray-600">{t('landing.problemSection.painPoints.administrative.description')}</p>
                  </div>
                </div>
              </Card>
            
              <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300 p-4 sm:p-6">
                <div className="text-center space-y-3 sm:space-y-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                    <Layers className="w-6 h-6 sm:w-7 sm:h-7 text-orange-500" />
                  </div>
                  <div>
                    <div className="text-3xl sm:text-4xl font-bold text-orange-500 mb-2">5-10</div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">{t('landing.problemSection.painPoints.fragmented.title')}</h3>
                    <p className="text-xs sm:text-sm text-gray-600">{t('landing.problemSection.painPoints.fragmented.description')}</p>
                  </div>
                </div>
              </Card>
            
              <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300 p-4 sm:p-6">
                <div className="text-center space-y-3 sm:space-y-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                    <TrendingDown className="w-6 h-6 sm:w-7 sm:h-7 text-purple-500" />
                  </div>
                  <div>
                    <div className="text-3xl sm:text-4xl font-bold text-purple-500 mb-2">70%</div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">{t('landing.problemSection.painPoints.quality.title')}</h3>
                    <p className="text-xs sm:text-sm text-gray-600">{t('landing.problemSection.painPoints.quality.description')}</p>
                  </div>
                </div>
              </Card>
            </div>
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
                      {t('landing.allInOneSection.animatedBox.classraum')}
                    </div>
                    <div className="all-in-one-text text-xl font-bold text-white tracking-wider flex items-center justify-center">
                      {t('landing.allInOneSection.animatedBox.allInOne')}
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
                <div className="w-24 h-16 sm:w-28 sm:h-20 lg:w-36 lg:h-24 bg-black/20 backdrop-blur-md border border-white/30 rounded-lg sm:rounded-xl flex flex-col items-center justify-center text-center shadow-xl group p-1 sm:p-2 lg:p-3">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mb-1 sm:mb-1 lg:mb-2 flex-shrink-0">
                    <FileText className="w-2 h-2 sm:w-3 sm:h-3 lg:w-4 lg:h-4 text-white" />
                  </div>
                  <div className="text-[10px] sm:text-xs font-semibold text-white leading-tight text-center">{t('landing.allInOneSection.featureCards.aiReports')}</div>
                </div>
              </div>

              {/* Box 2 - Customized Dashboard */}
              <div 
                ref={(el) => { featureBoxRefs.current[1] = el }}
                className="z-10"
                style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
              >
                <div className="w-24 h-16 sm:w-28 sm:h-20 lg:w-36 lg:h-24 bg-black/20 backdrop-blur-md border border-white/30 rounded-lg sm:rounded-xl flex flex-col items-center justify-center text-center shadow-xl group p-1 sm:p-2 lg:p-3">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mb-1 sm:mb-1 lg:mb-2 flex-shrink-0">
                    <BarChart3 className="w-2 h-2 sm:w-3 sm:h-3 lg:w-4 lg:h-4 text-white" />
                  </div>
                  <div className="text-[10px] sm:text-xs font-semibold text-white leading-tight text-center">{t('landing.allInOneSection.featureCards.dashboard')}</div>
                </div>
              </div>

              {/* Box 3 - Lesson Planning */}
              <div 
                ref={(el) => { featureBoxRefs.current[2] = el }}
                className="z-10"
                style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
              >
                <div className="w-24 h-16 sm:w-28 sm:h-20 lg:w-36 lg:h-24 bg-black/20 backdrop-blur-md border border-white/30 rounded-lg sm:rounded-xl flex flex-col items-center justify-center text-center shadow-xl group p-1 sm:p-2 lg:p-3">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mb-1 sm:mb-1 lg:mb-2 flex-shrink-0">
                    <Calendar className="w-2 h-2 sm:w-3 sm:h-3 lg:w-4 lg:h-4 text-white" />
                  </div>
                  <div className="text-[10px] sm:text-xs font-semibold text-white leading-tight text-center">{t('landing.allInOneSection.featureCards.planning')}</div>
                </div>
              </div>

              {/* Box 4 - Attendance */}
              <div 
                ref={(el) => { featureBoxRefs.current[3] = el }}
                className="z-10"
                style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
              >
                <div className="w-24 h-16 sm:w-28 sm:h-20 lg:w-36 lg:h-24 bg-black/20 backdrop-blur-md border border-white/30 rounded-lg sm:rounded-xl flex flex-col items-center justify-center text-center shadow-xl group p-1 sm:p-2 lg:p-3">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mb-1 sm:mb-1 lg:mb-2 flex-shrink-0">
                    <Users className="w-2 h-2 sm:w-3 sm:h-3 lg:w-4 lg:h-4 text-white" />
                  </div>
                  <div className="text-[10px] sm:text-xs font-semibold text-white leading-tight text-center">{t('landing.allInOneSection.featureCards.attendance')}</div>
                </div>
              </div>

              {/* Box 5 - Notifications */}
              <div 
                ref={(el) => { featureBoxRefs.current[4] = el }}
                className="z-10"
                style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
              >
                <div className="w-24 h-16 sm:w-28 sm:h-20 lg:w-36 lg:h-24 bg-black/20 backdrop-blur-md border border-white/30 rounded-lg sm:rounded-xl flex flex-col items-center justify-center text-center shadow-xl group p-1 sm:p-2 lg:p-3">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 bg-gradient-to-br from-pink-500 to-pink-600 rounded-full flex items-center justify-center mb-1 sm:mb-1 lg:mb-2 flex-shrink-0">
                    <Bell className="w-2 h-2 sm:w-3 sm:h-3 lg:w-4 lg:h-4 text-white" />
                  </div>
                  <div className="text-[10px] sm:text-xs font-semibold text-white leading-tight text-center">{t('landing.allInOneSection.featureCards.notifications')}</div>
                </div>
              </div>

              {/* Box 6 - Privacy by Design */}
              <div 
                ref={(el) => { featureBoxRefs.current[5] = el }}
                className="z-10"
                style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
              >
                <div className="w-24 h-16 sm:w-28 sm:h-20 lg:w-36 lg:h-24 bg-black/20 backdrop-blur-md border border-white/30 rounded-lg sm:rounded-xl flex flex-col items-center justify-center text-center shadow-xl group p-1 sm:p-2 lg:p-3">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 bg-gradient-to-br from-green-500 to-cyan-500 rounded-full flex items-center justify-center mb-1 sm:mb-1 lg:mb-2 flex-shrink-0">
                    <Shield className="w-2 h-2 sm:w-3 sm:h-3 lg:w-4 lg:h-4 text-white" />
                  </div>
                  <div className="text-[10px] sm:text-xs font-semibold text-white leading-tight text-center">{t('landing.allInOneSection.featureCards.privacy')}</div>
                </div>
              </div>

              {/* Box 7 - Seamless Integration */}
              <div 
                ref={(el) => { featureBoxRefs.current[6] = el }}
                className="z-10"
                style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
              >
                <div className="w-24 h-16 sm:w-28 sm:h-20 lg:w-36 lg:h-24 bg-black/20 backdrop-blur-md border border-white/30 rounded-lg sm:rounded-xl flex flex-col items-center justify-center text-center shadow-xl group p-1 sm:p-2 lg:p-3">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mb-1 sm:mb-1 lg:mb-2 flex-shrink-0">
                    <Link2 className="w-2 h-2 sm:w-3 sm:h-3 lg:w-4 lg:h-4 text-white" />
                  </div>
                  <div className="text-[10px] sm:text-xs font-semibold text-white leading-tight text-center">{t('landing.allInOneSection.featureCards.integration')}</div>
                </div>
              </div>

              {/* Box 8 - Real-Time Analytics */}
              <div 
                ref={(el) => { featureBoxRefs.current[7] = el }}
                className="z-10"
                style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
              >
                <div className="w-24 h-16 sm:w-28 sm:h-20 lg:w-36 lg:h-24 bg-black/20 backdrop-blur-md border border-white/30 rounded-lg sm:rounded-xl flex flex-col items-center justify-center text-center shadow-xl group p-1 sm:p-2 lg:p-3">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center mb-1 sm:mb-1 lg:mb-2 flex-shrink-0">
                    <BarChart3 className="w-2 h-2 sm:w-3 sm:h-3 lg:w-4 lg:h-4 text-white" />
                  </div>
                  <div className="text-[10px] sm:text-xs font-semibold text-white leading-tight text-center">{t('landing.allInOneSection.featureCards.analytics')}</div>
                </div>
              </div>
            </div>
            
            {/* Header text that appears after animation */}
            <div id="header-text" className="text-center mb-16 transform translate-y-10 opacity-0">
              <h2 className="text-4xl lg:text-6xl font-bold mb-6">
                {t('landing.allInOneSection.title')} <span className="text-cyan-400">{t('landing.allInOneSection.titleHighlight')}</span>
              </h2>
              <p className="text-xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
                {t('landing.allInOneSection.description')}
              </p>
            </div>
          </div>
        </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16 lg:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6">{t('landing.solutionSection.title')}</h2>
            <p className="text-base sm:text-lg text-[#163e64] max-w-2xl mx-auto">
              {t('landing.solutionSection.description')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardContent className="p-4 sm:p-6 lg:p-8">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mb-4 sm:mb-6">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-gray-900">{t('landing.solutionSection.features.aiReports.title')}</h3>
                <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                  {t('landing.solutionSection.features.aiReports.description')}
                </p>
                <ul className="space-y-2 text-xs sm:text-sm text-gray-600">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" />
                    <span>{t('landing.solutionSection.features.aiReports.items.progress')}</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" />
                    <span>{t('landing.solutionSection.features.aiReports.items.financial')}</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" />
                    <span>{t('landing.solutionSection.features.aiReports.items.attendance')}</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardContent className="p-4 sm:p-6 lg:p-8">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mb-4 sm:mb-6">
                  <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-gray-900">{t('landing.solutionSection.features.scheduling.title')}</h3>
                <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                  {t('landing.solutionSection.features.scheduling.description')}
                </p>
                <ul className="space-y-2 text-xs sm:text-sm text-gray-600">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" />
                    <span>{t('landing.solutionSection.features.scheduling.items.aiPlanning')}</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" />
                    <span>{t('landing.solutionSection.features.scheduling.items.optimization')}</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" />
                    <span>{t('landing.solutionSection.features.scheduling.items.resources')}</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardContent className="p-4 sm:p-6 lg:p-8">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mb-4 sm:mb-6">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-gray-900">{t('landing.solutionSection.features.communication.title')}</h3>
                <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                  {t('landing.solutionSection.features.communication.description')}
                </p>
                <ul className="space-y-2 text-xs sm:text-sm text-gray-600">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" />
                    <span>{t('landing.solutionSection.features.communication.items.messaging')}</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" />
                    <span>{t('landing.solutionSection.features.communication.items.notifications')}</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" />
                    <span>{t('landing.solutionSection.features.communication.items.emergency')}</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">
        <section className="text-center py-12 sm:py-16 lg:py-20 bg-gradient-to-r from-primary/10 to-blue-600/10 rounded-2xl sm:rounded-3xl">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6 px-4 sm:px-6">
            {t('landing.ctaSection.title')}
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto mb-6 sm:mb-8 px-4">
            {t('landing.ctaSection.description')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
            <a href={`${appUrl}/auth?lang=${language}`} className="w-full sm:w-auto">
              <Button size="lg" className="text-sm sm:text-base px-6 sm:px-8 w-full sm:w-auto">
                {t('landing.hero.ctaPrimary')}
              </Button>
            </a>
            <Button variant="outline" size="lg" className="text-sm sm:text-base px-6 sm:px-8 w-full sm:w-auto">
              {t('landing.hero.ctaSecondary')}
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}