"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { useTranslation } from "@/hooks/useTranslation"

export default function Footer() {
  const { t, language } = useTranslation()
  const [appUrl, setAppUrl] = useState("https://app.classraum.com")

  // Set the correct app URL based on environment
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.location.hostname === 'localhost') {
        const { protocol, port } = window.location
        setAppUrl(`${protocol}//app.localhost${port ? ':' + port : ''}`)
      }
    }
  }, [])

  return (
    <footer className="bg-gray-900 text-white py-12 sm:py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
          {/* Company Info */}
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-10 h-10 rounded-lg relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #2C6EF1 0%, #16ADD4 50%, #00D0AE 100%)' }}>
                <svg width="50" height="50" viewBox="0 0 4096 4096" className="text-white absolute -top-1.25 -left-1.25">
                  <path 
                    d="M2965.11,2503v108a24.006,24.006,0,0,1-24,24H1156a24.006,24.006,0,0,1-24-24V2503c0.03-16.46-1.04-28.43,10-57,9.72-25.17,27.02-50.86,59-82,26.39-25.7,56.22-57.8,87-88,36.79-36.1,63.51-70.77,82-107,7.18-14.06,15.16-37.52,21.88-71.02,3.11-15.53,5.02-35.6,6.12-56.78V1785h0.01c0-309.87,216.8-569.09,506.99-634.27V1110h0a142.367,142.367,0,0,1,142.37-142h0.01a142.367,142.367,0,0,1,142.37,142h0v40.4c290.91,64.65,508.43,324.22,508.43,634.6h0.01v231.42c0.71,29.84,2.73,60.05,7.04,81.56,6.72,33.5,14.7,56.96,21.88,71.02,18.49,36.23,45.21,70.9,82,107,30.78,30.2,60.61,62.3,87,88,31.98,31.14,49.28,56.83,59,82C2966.15,2474.57,2965.08,2486.54,2965.11,2503Zm-600.48,242c0.89,9.72,1.37,19.55,1.37,29.5,0,175.9-142.6,318.5-318.5,318.5S1729,2950.4,1729,2774.5c0-9.95.48-19.78,1.37-29.5h634.26Z"
                    fill="currentColor"
                    fillRule="evenodd"
                  />
                </svg>
              </div>
              <span className="text-lg sm:text-xl font-bold">CLASSRAUM</span>
            </div>
            <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
              {t('landing.footer.companyDescription')}
            </p>
            <div className="text-gray-400 text-xs sm:text-sm">
              <p>support@classraum.com</p>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-base sm:text-lg font-semibold">{t('landing.footer.quickLinks')}</h3>
            <div className="space-y-2">
              <Link href="/about" className="block text-gray-400 hover:text-white transition-colors text-sm">
                {t('landing.footer.about')}
              </Link>
              <Link href="/pricing" className="block text-gray-400 hover:text-white transition-colors text-sm">
                {t('landing.footer.pricing')}
              </Link>
              <Link href="/faqs" className="block text-gray-400 hover:text-white transition-colors text-sm">
                {t('landing.footer.faqs')}
              </Link>
              <Link href="/terms" className="block text-gray-400 hover:text-white transition-colors text-sm">
                {t('landing.footer.terms')}
              </Link>
              <Link href="/privacy-policy" className="block text-gray-400 hover:text-white transition-colors text-sm">
                {t('landing.footer.privacy')}
              </Link>
              <Link href="/refund-policy" className="block text-gray-400 hover:text-white transition-colors text-sm">
                {t('landing.footer.refund')}
              </Link>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t('landing.footer.contact')}</h3>
            <div className="space-y-2">
              <p className="text-gray-400 text-sm">support@classraum.com</p>
              <a href={`${appUrl}/auth?lang=${language}`} className="block text-gray-400 hover:text-white transition-colors text-sm">
                {t('landing.footer.signIn')}
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-700 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-gray-400 text-sm">{t('landing.footer.copyright')}</p>
            <div className="flex space-x-6">
              <Link href="/privacy-policy" className="text-gray-400 hover:text-white transition-colors text-sm">
                {t('landing.footer.privacy')}
              </Link>
              <Link href="/terms" className="text-gray-400 hover:text-white transition-colors text-sm">
                {t('landing.footer.termsService')}
              </Link>
              <Link href="/refund-policy" className="text-gray-400 hover:text-white transition-colors text-sm">
                {t('landing.footer.refund')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}