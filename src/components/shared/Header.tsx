"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu, X, Globe, ChevronUp, Check } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import FeaturesDropdown from "@/components/FeaturesDropdown"

interface HeaderProps {
  currentPage?: 'home' | 'about' | 'pricing' | 'faqs' | 'features'
}

export default function Header({ currentPage = 'home' }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showLanguages, setShowLanguages] = useState(false)
  const [currentLanguage, setCurrentLanguage] = useState("English")
  const [showFeatures, setShowFeatures] = useState(false)
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null)
  const [appUrl, setAppUrl] = useState("https://classraum-korea.vercel.app")
  const featuresRef = useRef<HTMLDivElement>(null)

  // Set the correct app URL based on environment
  useEffect(() => {
    if (window.location.hostname === 'localhost') {
      const { protocol, port } = window.location
      setAppUrl(`${protocol}//app.localhost${port ? ':' + port : ''}`)
    }
  }, [])

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

  const isCurrentPage = (page: string) => currentPage === page

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="mx-auto px-6 py-4" style={{ maxWidth: '1200px' }}>
          <nav className="flex items-center justify-between">
            {/* Logo and Navigation */}
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-lg relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #2C6EF1 0%, #16ADD4 50%, #00D0AE 100%)' }}>
                  <svg width="50" height="50" viewBox="0 0 4096 4096" className="text-white absolute -top-1.25 -left-1.25">
                    <path 
                      d="M2965.11,2503v108a24.006,24.006,0,0,1-24,24H1156a24.006,24.006,0,0,1-24-24V2503c0.03-16.46-1.04-28.43,10-57,9.72-25.17,27.02-50.86,59-82,26.39-25.7,56.22-57.8,87-88,36.79-36.1,63.51-70.77,82-107,7.18-14.06,15.16-37.52,21.88-71.02,3.11-15.53,5.02-35.6,6.12-56.78V1785h0.01c0-309.87,216.8-569.09,506.99-634.27V1110h0a142.367,142.367,0,0,1,142.37-142h0.01a142.367,142.367,0,0,1,142.37,142h0v40.4c290.91,64.65,508.43,324.22,508.43,634.6h0.01v231.42c0.71,29.84,2.73,60.05,7.04,81.56,6.72,33.5,14.7,56.96,21.88,71.02,18.49,36.23,45.21,70.9,82,107,30.78,30.2,60.61,62.3,87,88,31.98,31.14,49.28,56.83,59,82C2966.15,2474.57,2965.08,2486.54,2965.11,2503Zm-600.48,242c0.89,9.72,1.37,19.55,1.37,29.5,0,175.9-142.6,318.5-318.5,318.5S1729,2950.4,1729,2774.5c0-9.95.48-19.78,1.37-29.5h634.26Z"
                      fill="currentColor"
                      fillRule="evenodd"
                    />
                  </svg>
                </div>
                <span className="text-xl font-extrabold" style={{ color: '#163e64' }}>CLASSRAUM</span>
              </Link>
              
              <div className="hidden md:flex items-center space-x-8">
                <FeaturesDropdown
                  showFeatures={showFeatures}
                  setShowFeatures={setShowFeatures}
                  hoveredFeature={hoveredFeature}
                  setHoveredFeature={setHoveredFeature}
                  featuresRef={featuresRef}
                />
                
                <Link 
                  href="/pricing" 
                  className={`text-base font-medium transition-colors ${
                    isCurrentPage('pricing') ? 'text-primary' : 'hover:text-primary'
                  }`}
                >
                  Pricing
                </Link>
                <Link 
                  href="/about" 
                  className={`text-base font-medium transition-colors ${
                    isCurrentPage('about') ? 'text-primary' : 'hover:text-primary'
                  }`}
                >
                  About
                </Link>
                <Link 
                  href="/faqs" 
                  className={`text-base font-medium transition-colors ${
                    isCurrentPage('faqs') ? 'text-primary' : 'hover:text-primary'
                  }`}
                >
                  FAQs
                </Link>
              </div>
            </div>
            
            {/* Right side - Auth buttons and mobile menu */}
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-6">
                <a href={`${appUrl}/auth`} className="text-base font-medium hover:text-primary transition-colors">
                  Log In
                </a>
                <a href={`${appUrl}/auth`}>
                  <Button size="default" className="text-base px-4 py-5">Start Free Trial</Button>
                </a>
              </div>
              
              {/* Mobile menu button */}
              <button 
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </nav>
          
          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 border-t">
              <div className="flex flex-col space-y-4 pt-4">
                <Link href="#features" className="text-base font-medium">Features</Link>
                <Link 
                  href="/pricing" 
                  className={`text-base font-medium ${isCurrentPage('pricing') ? 'text-primary' : ''}`}
                >
                  Pricing
                </Link>
                <Link 
                  href="/about" 
                  className={`text-base font-medium ${isCurrentPage('about') ? 'text-primary' : ''}`}
                >
                  About
                </Link>
                <Link 
                  href="/faqs" 
                  className={`text-base font-medium ${isCurrentPage('faqs') ? 'text-primary' : ''}`}
                >
                  FAQs
                </Link>
                <div className="flex flex-col space-y-4 mt-4">
                  <a href={`${appUrl}/auth`} className="text-base font-medium hover:text-primary transition-colors text-center py-2">
                    Log In
                  </a>
                  <a href={`${appUrl}/auth`}>
                    <Button size="default" className="w-full text-base px-4 py-3">Start Free Trial</Button>
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Floating Language Selector */}
      <div className="fixed bottom-6 right-6 z-50">
        <div className="relative">
          {showLanguages && (
            <div className="absolute bottom-14 right-0 bg-white dark:bg-gray-900 border border-border rounded-lg shadow-lg p-1 min-w-[120px] pointer-events-auto">
              <button
                onClick={() => {
                  setCurrentLanguage("English")
                  setShowLanguages(false)
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors mb-1"
              >
                <span>🇺🇸 English</span>
                {currentLanguage === "English" && <Check className="h-4 w-4 text-primary" />}
              </button>
              <button
                onClick={() => {
                  setCurrentLanguage("한국어")
                  setShowLanguages(false)
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <span>🇰🇷 한국어</span>
                {currentLanguage === "한국어" && <Check className="h-4 w-4 text-primary" />}
              </button>
            </div>
          )}
          <button
            onClick={() => setShowLanguages(!showLanguages)}
            className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-border rounded-full px-4 py-3 shadow-lg hover:shadow-xl transition-shadow pointer-events-auto"
          >
            <Globe className="h-5 w-5" />
            <span className="text-sm font-medium">{currentLanguage}</span>
            <ChevronUp className={`h-4 w-4 opacity-50 transition-transform ${showLanguages ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>
    </>
  )
}