"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu, X, Globe, ChevronUp, Check, ArrowRight } from "lucide-react"
import { useState, useEffect } from "react"
import { useTranslation } from "@/hooks/useTranslation"

interface HeaderProps {
  currentPage?: 'home' | 'about' | 'pricing' | 'faqs' | 'features' | 'study'
}

// Nav model shared by the desktop row and the mobile panel so the two
// can never drift apart. `page` matches the currentPage prop; `tKey`
// is the landing.header.* locale key.
const NAV: Array<{ href: string; page: NonNullable<HeaderProps['currentPage']>; tKey: string }> = [
  { href: "/features", page: "features", tKey: "features" },
  { href: "/pricing", page: "pricing", tKey: "pricing" },
  { href: "/about", page: "about", tKey: "about" },
  { href: "/faqs", page: "faqs", tKey: "faqs" },
  { href: "/study", page: "study", tKey: "forStudents" },
]

export default function Header({ currentPage = 'home' }: HeaderProps) {
  const { t, language, setLanguage } = useTranslation()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showLanguages, setShowLanguages] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [appUrl, setAppUrl] = useState("https://app.classraum.com")

  // Set the correct app URL based on environment
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      const { protocol, port } = window.location
      setAppUrl(`${protocol}//app.localhost${port ? ':' + port : ''}`)
    }
  }, [])

  // Hairline shadow only once the page scrolls — flat bar at top keeps
  // the hero seamless; the shadow separates the bar from content when
  // it's actually floating over something.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const authUrl = `${appUrl}/auth?lang=${language}`

  return (
    <>
      {/* Header */}
      <header
        className={`sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-gray-100 transition-shadow duration-300 ${
          scrolled ? "shadow-[0_8px_24px_-18px_rgba(16,24,40,0.35)]" : ""
        }`}
      >
        <div className="mx-auto px-4 sm:px-6 max-w-[1200px]">
          <nav className="flex items-center justify-between h-16 gap-3">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 sm:gap-3 shrink-0 min-w-0">
              <span
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg relative overflow-hidden shrink-0"
                style={{ background: 'linear-gradient(135deg, #2C6EF1 0%, #16ADD4 50%, #00D0AE 100%)' }}
              >
                <svg width="125%" height="125%" viewBox="0 0 4096 4096" className="text-white absolute -top-[12.5%] -left-[12.5%]">
                  <path
                    d="M2965.11,2503v108a24.006,24.006,0,0,1-24,24H1156a24.006,24.006,0,0,1-24-24V2503c0.03-16.46-1.04-28.43,10-57,9.72-25.17,27.02-50.86,59-82,26.39-25.7,56.22-57.8,87-88,36.79-36.1,63.51-70.77,82-107,7.18-14.06,15.16-37.52,21.88-71.02,3.11-15.53,5.02-35.6,6.12-56.78V1785h0.01c0-309.87,216.8-569.09,506.99-634.27V1110h0a142.367,142.367,0,0,1,142.37-142h0.01a142.367,142.367,0,0,1,142.37,142h0v40.4c290.91,64.65,508.43,324.22,508.43,634.6h0.01v231.42c0.71,29.84,2.73,60.05,7.04,81.56,6.72,33.5,14.7,56.96,21.88,71.02,18.49,36.23,45.21,70.9,82,107,30.78,30.2,60.61,62.3,87,88,31.98,31.14,49.28,56.83,59,82C2966.15,2474.57,2965.08,2486.54,2965.11,2503Zm-600.48,242c0.89,9.72,1.37,19.55,1.37,29.5,0,175.9-142.6,318.5-318.5,318.5S1729,2950.4,1729,2774.5c0-9.95.48-19.78,1.37-29.5h634.26Z"
                    fill="currentColor"
                    fillRule="evenodd"
                  />
                </svg>
              </span>
              <span className="text-[17px] sm:text-xl font-extrabold tracking-tight" style={{ color: '#163e64' }}>
                CLASSRAUM
              </span>
            </Link>

            {/* Desktop nav — lg and up. Five links plus auth do not fit
                between 768-1024px (especially in Korean), so tablets get
                the hamburger too. */}
            <div className="hidden lg:flex items-center gap-1">
              {NAV.map(({ href, page, tKey }) => {
                const active = currentPage === page
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`relative px-3 py-2 rounded-lg text-[15px] font-medium transition-colors ${
                      active
                        ? "text-primary"
                        : "text-gray-600 hover:text-[#163e64] hover:bg-gray-50"
                    }`}
                  >
                    {t(`landing.header.${tKey}`)}
                    {active && (
                      <span aria-hidden className="absolute left-3 right-3 -bottom-[13px] h-[2px] rounded-full bg-primary" />
                    )}
                  </Link>
                )
              })}
            </div>

            {/* Right side — auth on desktop, hamburger below lg */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <a
                href={authUrl}
                className="hidden lg:inline text-[15px] font-medium text-gray-600 hover:text-[#163e64] transition-colors whitespace-nowrap px-2"
              >
                {t('landing.header.login')}
              </a>
              <a href={authUrl} className="hidden sm:inline-block">
                <Button size="default" className="text-sm px-4 whitespace-nowrap">
                  {t('landing.header.startTrial')}
                </Button>
              </a>
              <button
                type="button"
                className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileMenuOpen}
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </nav>
        </div>

        {/* Mobile / tablet menu — full-width sheet under the bar */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-100 bg-white/95 backdrop-blur-md shadow-[0_24px_48px_-24px_rgba(16,24,40,0.25)]">
            <div className="mx-auto px-4 sm:px-6 max-w-[1200px] py-3">
              <div className="flex flex-col gap-0.5">
                {NAV.map(({ href, page, tKey }) => {
                  const active = currentPage === page
                  return (
                    <Link
                      key={href}
                      href={href}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-[15px] font-medium transition-colors ${
                        active
                          ? "bg-primary/[0.07] text-primary"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {t(`landing.header.${tKey}`)}
                      {active && <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-primary" />}
                    </Link>
                  )
                })}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col gap-2 pb-2">
                <a href={authUrl}>
                  <Button className="w-full text-[15px] h-11 inline-flex items-center justify-center gap-1.5">
                    {t('landing.header.startTrial')}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </a>
                <a
                  href={authUrl}
                  className="text-center text-[14px] font-medium text-gray-600 hover:text-[#163e64] transition-colors py-2"
                >
                  {t('landing.header.login')}
                </a>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Floating Language Selector */}
      <div className="fixed bottom-6 right-6 z-50">
        <div className="relative">
          {showLanguages && (
            <div className="absolute bottom-14 right-0 bg-white dark:bg-gray-900 border border-border rounded-lg shadow-lg p-1 min-w-[120px] pointer-events-auto">
              <button
                onClick={() => {
                  setLanguage('english')
                  setShowLanguages(false)
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors mb-1"
              >
                <span>🇺🇸 English</span>
                {language === 'english' && <Check className="h-4 w-4 text-primary" />}
              </button>
              <button
                onClick={() => {
                  setLanguage('korean')
                  setShowLanguages(false)
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <span>🇰🇷 한국어</span>
                {language === 'korean' && <Check className="h-4 w-4 text-primary" />}
              </button>
            </div>
          )}
          <button
            onClick={() => setShowLanguages(!showLanguages)}
            className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-border rounded-full px-4 py-3 shadow-lg hover:shadow-xl transition-shadow pointer-events-auto"
          >
            <Globe className="h-5 w-5" />
            <span className="text-sm font-medium">{language === 'english' ? 'English' : '한국어'}</span>
            <ChevronUp className={`h-4 w-4 opacity-50 transition-transform ${showLanguages ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>
    </>
  )
}
