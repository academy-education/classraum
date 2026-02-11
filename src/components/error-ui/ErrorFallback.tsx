"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Home, MessageSquare } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

interface ErrorFallbackProps {
  error?: Error
  resetError?: () => void
  title?: string
  message?: string
  showDetails?: boolean
  errorCount?: number
}

// Fallback translations for when context is not available
const fallbackTranslations = {
  en: {
    somethingWentWrong: 'Something went wrong',
    apologizeMessage: 'We apologize for the inconvenience. Please try again or contact support if the problem persists.',
    tryAgain: 'Try Again',
    reloadPage: 'Reload Page',
    goToDashboard: 'Go to Dashboard',
    contactSupport: 'Contact Support',
    errorDetails: 'Error Details:'
  },
  ko: {
    somethingWentWrong: '문제가 발생했습니다',
    apologizeMessage: '불편을 끼쳐 드려 죄송합니다. 다시 시도하시거나 문제가 지속되면 고객 지원팀에 문의해 주세요.',
    tryAgain: '다시 시도',
    reloadPage: '페이지 새로고침',
    goToDashboard: '대시보드로 이동',
    contactSupport: '고객 지원 문의',
    errorDetails: '오류 세부 정보:'
  }
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
  title,
  message,
  showDetails = process.env.NODE_ENV === 'development',
  errorCount = 0
}) => {
  // Try to get translations, but fall back to hardcoded values if context is not available
  let translations = fallbackTranslations.en
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { t, language } = useTranslation()

    // Check if we got valid translations
    const testTranslation = t('errors.somethingWentWrong')
    if (testTranslation && typeof testTranslation === 'string' && !testTranslation.includes('errors.')) {
      translations = {
        somethingWentWrong: String(t('errors.somethingWentWrong')),
        apologizeMessage: String(t('errors.apologizeMessage')),
        tryAgain: String(t('errors.tryAgain')),
        reloadPage: String(t('errors.reloadPage')),
        goToDashboard: String(t('errors.goToDashboard')),
        contactSupport: String(t('errors.contactSupport')),
        errorDetails: String(t('errors.errorDetails'))
      }
    } else if (language === 'korean') {
      translations = fallbackTranslations.ko
    }
  } catch {
    // If translation context is not available, try to detect language from localStorage or browser
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('classraum-language')
      if (savedLanguage === 'korean' || navigator.language.startsWith('ko')) {
        translations = fallbackTranslations.ko
      }
    }
  }

  const displayTitle = title || translations.somethingWentWrong
  const displayMessage = message || translations.apologizeMessage

  const handleRefresh = () => {
    if (resetError) {
      resetError()
    } else {
      window.location.reload()
    }
  }

  const handleGoHome = () => {
    window.location.href = '/dashboard'
  }

  const handleContactSupport = () => {
    // Open chat widget or support page
    window.location.href = 'mailto:support@classraum.com'
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <AlertTriangle className="mx-auto h-16 w-16 text-red-500 mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">{displayTitle}</h1>
          <p className="text-gray-600 text-sm leading-relaxed">{displayMessage}</p>
        </div>

        {showDetails && error && (
          <div className="mb-6 p-4 bg-red-50 rounded-lg text-left">
            <h3 className="text-sm font-medium text-red-800 mb-2">{translations.errorDetails}</h3>
            <pre className="text-xs text-red-700 whitespace-pre-wrap break-words">
              {error.message}
            </pre>
          </div>
        )}

        <div className="space-y-3">
          <Button
            onClick={handleRefresh}
            className="w-full"
            variant="default"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {errorCount > 2 ? translations.reloadPage : translations.tryAgain}
          </Button>

          <Button
            onClick={handleGoHome}
            className="w-full"
            variant="outline"
          >
            <Home className="w-4 h-4 mr-2" />
            {translations.goToDashboard}
          </Button>

          <Button
            onClick={handleContactSupport}
            className="w-full"
            variant="ghost"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            {translations.contactSupport}
          </Button>
        </div>
      </div>
    </div>
  )
}
