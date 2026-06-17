"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/hooks/useTranslation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import {
  X,
  Compass,
  Sparkles,
  HelpCircle,
  BookOpen,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react'

/**
 * Welcome modal — shown once on first login.
 *
 * Three short slides: nav overview → most-people-start-here → escalation.
 * The modal exists to answer the question "what is this app and where
 * do I start?" without forcing users through a brittle spotlight tour.
 *
 * Persistence is via localStorage (one flag per user-id). Skipping a
 * migration for v1 because the welcome is browser-local — if a user
 * sets the app up on a new device, briefly seeing the welcome again is
 * acceptable behaviour. Migrating to a DB-backed flag is a drop-in:
 * change the read/write of `localStorage.setItem` to a Supabase update.
 *
 * Replay path: Settings has a "Show welcome screen again" toggle that
 * clears the localStorage key so the modal returns on the next mount.
 * The replay handler lives in this same file (see WELCOME_STORAGE_KEY).
 */

const WELCOME_STORAGE_KEY_PREFIX = 'classraum:welcome_seen:'

export function welcomeStorageKey(userId: string): string {
  return `${WELCOME_STORAGE_KEY_PREFIX}${userId}`
}

/** Imperative reset — used by the "Show welcome screen again" Settings toggle. */
export function resetWelcomeSeen(userId: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(welcomeStorageKey(userId))
  } catch {
    // localStorage might be disabled (private mode, full quota). No-op
    // because the user can just refresh to see the modal anyway.
  }
}

interface Slide {
  icon: React.ComponentType<{ className?: string }>
  title: string
  body: string
  bullets?: string[]
  cta?: { label: string; href: string }
}

export function WelcomeModal() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [slideIndex, setSlideIndex] = useState(0)

  // Read the flag on mount. Wrapped in a try because localStorage can
  // throw in private/incognito modes and a Sentry breadcrumb every page
  // load isn't useful.
  useEffect(() => {
    if (!user?.id || typeof window === 'undefined') return
    try {
      const seen = localStorage.getItem(welcomeStorageKey(user.id))
      if (!seen) setOpen(true)
    } catch {
      // Disabled localStorage → don't pester the user every page load.
    }
  }, [user?.id])

  const close = (markSeen: boolean) => {
    if (markSeen && user?.id && typeof window !== 'undefined') {
      try {
        localStorage.setItem(welcomeStorageKey(user.id), '1')
      } catch {
        // see comment above
      }
    }
    setOpen(false)
    setSlideIndex(0)
  }

  if (!open || !user?.id) return null

  const slides: Slide[] = [
    {
      icon: Compass,
      title: String(t('welcome.slide1.title')),
      body: String(t('welcome.slide1.body')),
      bullets: [
        String(t('welcome.slide1.bullet1')),
        String(t('welcome.slide1.bullet2')),
        String(t('welcome.slide1.bullet3')),
      ],
    },
    {
      icon: Sparkles,
      title: String(t('welcome.slide2.title')),
      body: String(t('welcome.slide2.body')),
      bullets: [
        String(t('welcome.slide2.bullet1')),
        String(t('welcome.slide2.bullet2')),
        String(t('welcome.slide2.bullet3')),
      ],
      cta: { label: String(t('welcome.slide2.cta')), href: '/dashboard/help/getting-started' },
    },
    {
      icon: HelpCircle,
      title: String(t('welcome.slide3.title')),
      body: String(t('welcome.slide3.body')),
      cta: { label: String(t('welcome.slide3.cta')), href: '/dashboard/help' },
    },
  ]

  const isLastSlide = slideIndex === slides.length - 1
  const slide = slides[slideIndex]
  const SlideIcon = slide.icon

  return (
    // Fixed overlay with a backdrop. z-[400] sits above the toast layer
    // (z-300) and below the chat widget so a notification toast can't
    // obscure the welcome.
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
        onClick={() => close(true)}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-modal-title"
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        {/* Close + skip controls. Skip is a small text link so the user
            can dismiss without going through all three slides. */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <button
            onClick={() => close(true)}
            className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
          >
            {t('welcome.skip')}
          </button>
          <button
            onClick={() => close(true)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"
            aria-label={String(t('common.close'))}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-8 pt-12">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
            <SlideIcon className="w-7 h-7 text-primary" />
          </div>

          <h2 id="welcome-modal-title" className="text-2xl font-semibold tracking-tight text-gray-900 mb-2">
            {slide.title}
          </h2>
          <p className="text-gray-600 leading-relaxed mb-5">{slide.body}</p>

          {slide.bullets && (
            <ul className="space-y-2 mb-5">
              {slide.bullets.map((bullet, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          )}

          {slide.cta && (
            <Link
              href={slide.cta.href}
              onClick={() => close(true)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline underline-offset-4 mb-2"
            >
              <BookOpen className="w-4 h-4" />
              {slide.cta.label}
            </Link>
          )}
        </div>

        <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-between">
          {/* Slide dots — visual progress indicator. Click to jump. */}
          <div className="flex items-center gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlideIndex(i)}
                aria-label={`Slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === slideIndex ? 'bg-primary w-6' : 'bg-gray-300 w-1.5 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {slideIndex > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSlideIndex(slideIndex - 1)}
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                {t('welcome.back')}
              </Button>
            )}
            {!isLastSlide ? (
              <Button
                size="sm"
                onClick={() => setSlideIndex(slideIndex + 1)}
              >
                {t('welcome.next')}
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            ) : (
              <Button size="sm" onClick={() => close(true)}>
                {t('welcome.getStarted')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
