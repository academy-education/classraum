"use client"

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useTranslation } from '@/hooks/useTranslation'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'

/**
 * Account reactivation page.
 *
 * Users land here in two ways:
 *   1. They tried to sign in to a banned (scheduled-for-deletion) account
 *      and the auth page redirected them.
 *   2. They clicked a "reactivate your account" link in a future email.
 *
 * The page asks for email + password (re-auth), calls /api/account/reactivate,
 * and on success redirects to /auth so they can sign in fresh.
 *
 * Defensive design: we don't pre-fill email from URL query unless it was
 * passed by /auth — and even then it's editable. We never auto-execute
 * reactivation — always require the user to enter password.
 */
function ReactivatePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { t } = useTranslation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [reactivated, setReactivated] = useState(false)

  // Pre-fill email if /auth passed it after detecting a ban.
  useEffect(() => {
    const queryEmail = searchParams?.get('email')
    if (queryEmail) setEmail(queryEmail)
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/account/reactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        toast({
          title: String(t('account.reactivate.failedTitle')),
          description:
            (data as { error?: string })?.error ||
            String(t('account.reactivate.failedDescription')),
          variant: 'destructive',
        })
        setSubmitting(false)
        return
      }

      setReactivated(true)
      toast({
        title: String(t('account.reactivate.successTitle')),
        description: String(t('account.reactivate.successDescription')),
      })

      // Brief pause so the user sees the success state, then off to login.
      setTimeout(() => {
        router.push('/auth')
      }, 1800)
    } catch (err) {
      console.error('[reactivate] request failed:', err)
      toast({
        title: String(t('account.reactivate.failedTitle')),
        description: String(t('account.reactivate.failedDescription')),
        variant: 'destructive',
      })
      setSubmitting(false)
    }
  }

  if (reactivated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            {String(t('account.reactivate.successTitle'))}
          </h1>
          <p className="text-gray-600">
            {String(t('account.reactivate.redirecting'))}
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md w-full p-8">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-3">
            <AlertCircle className="w-6 h-6 text-amber-600" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            {String(t('account.reactivate.title'))}
          </h1>
          <p className="text-sm text-gray-600">
            {String(t('account.reactivate.subtitle'))}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">{String(t('account.reactivate.email'))}</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              autoComplete="email"
            />
          </div>
          <div>
            <Label htmlFor="password">{String(t('account.reactivate.password'))}</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              autoComplete="current-password"
            />
          </div>
          <Button
            type="submit"
            disabled={submitting || !email || !password}
            className="w-full"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {String(t('account.reactivate.submitting'))}
              </>
            ) : (
              String(t('account.reactivate.submit'))
            )}
          </Button>
          <p className="text-xs text-gray-500 text-center">
            {String(t('account.reactivate.helpText'))}
          </p>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200 text-center">
          <button
            type="button"
            onClick={() => router.push('/auth')}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            {String(t('account.reactivate.backToSignIn'))}
          </button>
        </div>
      </Card>
    </div>
  )
}

export default function ReactivatePage() {
  return (
    <Suspense fallback={null}>
      <ReactivatePageContent />
    </Suspense>
  )
}
