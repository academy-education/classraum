"use client"

import { useState } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { languageCookies } from '@/lib/cookies'

export function LanguageDebugger() {
  const { t, language, setLanguage } = useTranslation()
  const [isVisible, setIsVisible] = useState(false)

  const handleTestCookie = () => {
    console.log('=== Language Debugger Test ===')

    // Test cookie functions
    const currentCookie = languageCookies.get()
    console.log('Current cookie value:', currentCookie)

    // Test setting Korean
    languageCookies.set('korean')
    console.log('Set cookie to Korean')

    // Test getting after set
    const afterSet = languageCookies.get()
    console.log('Cookie after setting Korean:', afterSet)

    // Show all cookies
    console.log('All cookies:', document.cookie)

    // Test useTranslation hook
    console.log('useTranslation language:', language)
    console.log('Sample translation:', t('landing.header.features'))
  }

  if (process.env.NODE_ENV !== 'development') return null

  return (
    <div className="fixed bottom-4 left-4 z-[9999]">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="px-3 py-2 text-xs font-mono rounded-lg shadow-lg bg-blue-500 text-white hover:bg-blue-600"
        title="Toggle language debug info"
      >
        Lang Debug
      </button>

      {isVisible && (
        <div className="mt-2 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-w-sm">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Language Debug</h3>

            <div className="text-xs">
              <strong>Current Language:</strong> {language}
            </div>

            <div className="text-xs">
              <strong>Cookie Value:</strong> {languageCookies.get()}
            </div>

            <div className="text-xs">
              <strong>All Cookies:</strong><br />
              <code className="text-xs break-all">
                {typeof document !== 'undefined' ? document.cookie : 'N/A'}
              </code>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setLanguage('korean')}
                className="px-2 py-1 text-xs bg-green-500 text-white rounded"
              >
                Set Korean
              </button>
              <button
                onClick={() => setLanguage('english')}
                className="px-2 py-1 text-xs bg-red-500 text-white rounded"
              >
                Set English
              </button>
            </div>

            <button
              onClick={handleTestCookie}
              className="w-full px-2 py-1 text-xs bg-purple-500 text-white rounded"
            >
              Run Cookie Test
            </button>
          </div>
        </div>
      )}
    </div>
  )
}