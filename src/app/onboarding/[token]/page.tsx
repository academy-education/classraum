"use client"

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Loader2, AlertTriangle, Building2, Mail, Lock, Phone, MapPin,
  User as UserIcon, ArrowRight, ArrowLeft, Check, Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'

// =====================================================================
// Onboarding wizard — full-bleed split layout.
//
// Left panel: dark brand surface with logo, academy name as the hero,
//             vertical step rail, supporting copy.
// Right panel: white workspace with the active step's content.
//
// On mobile the left panel collapses to a slim top header (logo + step
// counter) so the form has the full viewport.
//
// Public page (no auth wrapper). Token-gated by middleware allowlist.
// i18n is self-contained — no dependency on the post-auth LanguageProvider.
// =====================================================================

type View = 'loading' | 'invalid' | 'wizard' | 'success'
type InvalidReason = 'not_found' | 'expired' | 'completed'
type Lang = 'en' | 'ko'
type Step = 'language' | 'welcome' | 'account' | 'academy' | 'review'

const STEP_ORDER: Step[] = ['language', 'welcome', 'account', 'academy', 'review']

interface AcademyPreview {
  name: string
  address: string | null
  subscriptionTier: string
}

const T = {
  en: {
    validating: 'Validating your invitation',
    invalid: {
      not_found: { title: 'Invitation not found', body: 'This onboarding link is invalid. Double-check the URL or ask your administrator for a new invitation.' },
      expired: { title: 'Invitation expired', body: 'This onboarding link has expired. Ask your administrator to send a new invitation.' },
      completed: { title: 'Already onboarded', body: 'This invitation has already been used. If you have an account, sign in below.' },
    },
    goSignIn: 'Sign in',
    // Brand panel
    brandTagline: 'The operating system for modern academies.',
    brandFooter: 'Trusted by hundreds of teachers and academies.',
    invitedBy: 'You’ve been invited to manage',
    // Steps
    stepLanguage: 'Language',
    stepWelcome: 'Welcome',
    stepAccount: 'Your account',
    stepAcademy: 'Your academy',
    stepReview: 'Review',
    // Language step
    languageTitle: 'Choose your language',
    languageBody: 'Select the language you’d like to use. You can change this anytime in settings.',
    english: 'English',
    korean: '한국어',
    continue: 'Continue',
    back: 'Back',
    // Welcome step
    welcomeKicker: 'Welcome',
    welcomeTitle: 'Let’s set up your academy.',
    welcomeBody: 'A few quick steps to create your account and get you into the dashboard.',
    welcomePoint1: 'Create your sign-in credentials',
    welcomePoint2: 'Confirm your academy details',
    welcomePoint3: 'Review and finish — about 2 minutes',
    welcomePlan: 'Plan',
    tierFree: 'Free', tierIndividual: 'Individual', tierBasic: 'Basic', tierPro: 'Pro', tierEnterprise: 'Enterprise',
    getStarted: 'Get started',
    // Account step
    accountTitle: 'Create your account',
    accountBody: 'This is how you’ll sign in. Use an email you check often.',
    fullName: 'Full name',
    fullNamePh: 'Your name',
    email: 'Email',
    emailPh: 'you@example.com',
    password: 'Password',
    passwordPh: 'At least 8 characters',
    passwordHelp: 'Use at least 8 characters with a mix of letters and numbers.',
    confirmPassword: 'Confirm password',
    confirmPasswordPh: 'Re-enter your password',
    phone: 'Phone',
    phoneOptional: 'Phone number',
    phonePh: 'Optional',
    phoneHelp: 'Used for account recovery. Optional.',
    // Academy step
    academyTitle: 'About your academy',
    academyBody: 'A few details so parents and students recognize you. Everything is editable later.',
    academyName: 'Academy name',
    academyNamePh: 'e.g. Pinewood Academy',
    address: 'Address',
    addressOptional: 'Street address',
    addressPh: 'Street, city, postal code',
    addressHelp: 'Optional. Helps with local search and invoices.',
    contactEmail: 'Contact email',
    contactEmailOptional: 'Public contact email',
    contactEmailPh: 'contact@academy.com',
    contactEmailHelp: 'Optional. Shown to parents and students. Defaults to your personal email.',
    academyPhone: 'Academy phone',
    academyPhoneOptional: 'Academy phone number',
    academyPhoneHelp: 'Optional. Shown to parents and students.',
    // Review step
    reviewTitle: 'Review your information',
    reviewBody: 'Double-check the details below, then finish setup.',
    edit: 'Edit',
    notProvided: '—',
    create: 'Create account',
    creating: 'Creating account',
    terms: 'By continuing you agree to our Terms of Service and Privacy Policy.',
    next: 'Continue',
    sectionAccount: 'Account',
    sectionAcademy: 'Academy',
    // Success
    successTitle: 'You’re all set.',
    successBody: 'Taking you to your dashboard.',
    // Errors
    errReq: 'Please fill out all required fields.',
    errPw: 'Password must be at least 8 characters.',
    errPwMatch: 'Passwords don’t match.',
    errAcademy: 'Academy name is required.',
    errEmail: 'Please enter a valid email address.',
    optional: 'Optional',
    required: 'Required',
  },
  ko: {
    validating: '초대장을 확인하는 중',
    invalid: {
      not_found: { title: '초대장을 찾을 수 없습니다', body: '이 가입 링크가 올바르지 않습니다. URL을 다시 확인하거나 관리자에게 새 초대장을 요청해 주세요.' },
      expired: { title: '초대장이 만료되었습니다', body: '이 가입 링크는 만료되었습니다. 관리자에게 새 초대장을 요청해 주세요.' },
      completed: { title: '이미 가입이 완료되었습니다', body: '이 초대장은 이미 사용되었습니다. 계정이 있다면 로그인하세요.' },
    },
    goSignIn: '로그인',
    brandTagline: '현대 학원을 위한 운영 체계.',
    brandFooter: '수많은 교사와 학원이 신뢰하는 플랫폼.',
    invitedBy: '운영을 위해 초대되었습니다',
    stepLanguage: '언어',
    stepWelcome: '환영',
    stepAccount: '계정',
    stepAcademy: '학원',
    stepReview: '검토',
    languageTitle: '언어를 선택하세요',
    languageBody: '사용하실 언어를 선택해 주세요. 설정에서 언제든 변경할 수 있습니다.',
    english: 'English',
    korean: '한국어',
    continue: '계속',
    back: '뒤로',
    welcomeKicker: '환영합니다',
    welcomeTitle: '학원을 시작해 봅시다.',
    welcomeBody: '계정을 만들고 대시보드에 들어가기까지 몇 가지 간단한 단계만 거치면 됩니다.',
    welcomePoint1: '로그인 정보 만들기',
    welcomePoint2: '학원 정보 확인하기',
    welcomePoint3: '검토 후 완료 — 약 2분 소요',
    welcomePlan: '플랜',
    tierFree: '무료', tierIndividual: '개인', tierBasic: '베이직', tierPro: '프로', tierEnterprise: '엔터프라이즈',
    getStarted: '시작하기',
    accountTitle: '계정 만들기',
    accountBody: '로그인 시 사용할 정보입니다. 자주 확인하는 이메일을 사용해 주세요.',
    fullName: '이름',
    fullNamePh: '이름을 입력하세요',
    email: '이메일',
    emailPh: 'you@example.com',
    password: '비밀번호',
    passwordPh: '8자 이상',
    passwordHelp: '영문, 숫자를 조합해 8자 이상 사용해 주세요.',
    confirmPassword: '비밀번호 확인',
    confirmPasswordPh: '비밀번호를 다시 입력하세요',
    phone: '전화번호',
    phoneOptional: '전화번호',
    phonePh: '선택 사항',
    phoneHelp: '계정 복구에 사용됩니다. 선택 사항입니다.',
    academyTitle: '학원 정보',
    academyBody: '학부모와 학생이 알아볼 수 있도록 간단한 정보를 입력하세요. 모두 나중에 수정할 수 있습니다.',
    academyName: '학원 이름',
    academyNamePh: '예: 송파 영어학원',
    address: '주소',
    addressOptional: '주소',
    addressPh: '도로명, 도시, 우편번호',
    addressHelp: '선택 사항. 검색과 청구서에 사용됩니다.',
    contactEmail: '대표 이메일',
    contactEmailOptional: '공개 대표 이메일',
    contactEmailPh: 'contact@academy.com',
    contactEmailHelp: '선택 사항. 학부모/학생에게 공개됩니다. 비워두면 본인 이메일이 사용됩니다.',
    academyPhone: '학원 전화번호',
    academyPhoneOptional: '학원 전화번호',
    academyPhoneHelp: '선택 사항. 학부모/학생에게 공개됩니다.',
    reviewTitle: '입력하신 정보를 확인해 주세요',
    reviewBody: '아래 내용을 확인한 후 설정을 완료해 주세요.',
    edit: '수정',
    notProvided: '—',
    create: '계정 만들기',
    creating: '계정 생성 중',
    terms: '계속 진행하면 이용약관 및 개인정보처리방침에 동의하게 됩니다.',
    next: '계속',
    sectionAccount: '계정',
    sectionAcademy: '학원',
    successTitle: '준비가 완료되었습니다.',
    successBody: '대시보드로 이동합니다.',
    errReq: '필수 항목을 모두 입력해 주세요.',
    errPw: '비밀번호는 8자 이상이어야 합니다.',
    errPwMatch: '비밀번호가 일치하지 않습니다.',
    errAcademy: '학원 이름을 입력해 주세요.',
    errEmail: '올바른 이메일 주소를 입력해 주세요.',
    optional: '선택',
    required: '필수',
  },
} as const

function detectLang(): Lang {
  if (typeof navigator === 'undefined') return 'en'
  return (navigator.language || '').toLowerCase().startsWith('ko') ? 'ko' : 'en'
}

export default function OnboardingPage({ params }: { params: Promise<{ token: string }> }) {
  const router = useRouter()
  const { token } = use(params)

  const [view, setView] = useState<View>('loading')
  const [invalidReason, setInvalidReason] = useState<InvalidReason | null>(null)
  const [academy, setAcademy] = useState<AcademyPreview | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [lang, setLang] = useState<Lang>('en')
  const [stepIdx, setStepIdx] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')
  const [animKey, setAnimKey] = useState(0)

  const tt = T[lang]
  const step = STEP_ORDER[stepIdx]

  // Form state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [academyName, setAcademyName] = useState('')
  const [academyAddress, setAcademyAddress] = useState('')
  const [academyEmail, setAcademyEmail] = useState('')
  const [academyPhone, setAcademyPhone] = useState('')

  useEffect(() => {
    setLang(detectLang())
    let cancelled = false
    const validate = async () => {
      try {
        const res = await fetch(`/api/onboarding/${token}`)
        const body = await res.json()
        if (cancelled) return
        if (!body.ok) {
          setInvalidReason((body.reason || 'not_found') as InvalidReason)
          setView('invalid')
          return
        }
        setAcademy(body.academy)
        setAcademyName(body.academy.name || '')
        setAcademyAddress(body.academy.address || '')
        setView('wizard')
      } catch (e) {
        console.error('[Onboarding] Validation error:', e)
        if (!cancelled) {
          setInvalidReason('not_found')
          setView('invalid')
        }
      }
    }
    validate()
    return () => { cancelled = true }
  }, [token])

  const goNext = () => {
    setError(null)
    if (!validateStep(step)) return
    setDirection('forward')
    setStepIdx(i => Math.min(i + 1, STEP_ORDER.length - 1))
    setAnimKey(k => k + 1)
  }
  const goBack = () => {
    setError(null)
    setDirection('backward')
    setStepIdx(i => Math.max(i - 1, 0))
    setAnimKey(k => k + 1)
  }
  const goTo = (target: Step) => {
    setError(null)
    const newIdx = STEP_ORDER.indexOf(target)
    setDirection(newIdx > stepIdx ? 'forward' : 'backward')
    setStepIdx(newIdx)
    setAnimKey(k => k + 1)
  }

  function validateStep(s: Step): boolean {
    if (s === 'account') {
      if (!fullName.trim() || !email.trim() || !password) { setError(tt.errReq); return false }
      if (!/^\S+@\S+\.\S+$/.test(email)) { setError(tt.errEmail); return false }
      if (password.length < 8) { setError(tt.errPw); return false }
      if (password !== confirmPassword) { setError(tt.errPwMatch); return false }
    }
    if (s === 'academy') {
      if (!academyName.trim()) { setError(tt.errAcademy); return false }
    }
    return true
  }

  const handleSubmit = async () => {
    if (submitting) return
    setError(null)
    if (!validateStep('account') || !validateStep('academy')) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/onboarding/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email, password, fullName,
          phone: phone || undefined,
          academyName,
          academyAddress: academyAddress || undefined,
          academyEmail: academyEmail || undefined,
          academyPhone: academyPhone || undefined,
          // Language preference picked on the language step. Maps EN→english,
          // KO→korean to match the user_preferences enum.
          language: lang === 'ko' ? 'korean' : 'english',
        }),
      })
      const body = await res.json()
      if (!res.ok || !body.ok) {
        setError(body.error || body.detail || 'Failed to complete onboarding.')
        setSubmitting(false)
        return
      }

      setView('success')

      // Persist the picked language in a cookie too. user_preferences is the
      // source of truth, but the cookie lets the dashboard render in the
      // right language on the very first paint without an extra round trip.
      try {
        const value = lang === 'ko' ? 'korean' : 'english'
        const oneYear = 60 * 60 * 24 * 365
        document.cookie = `classraum_language=${value}; path=/; max-age=${oneYear}; SameSite=Lax`
      } catch { /* cookie set is best-effort */ }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        console.error('[Onboarding] Auto sign-in failed:', signInError)
        router.replace('/auth')
        return
      }
      setTimeout(() => router.replace('/dashboard'), 1400)
    } catch (e) {
      console.error('[Onboarding] Submit error:', e)
      setError(e instanceof Error ? e.message : 'Unexpected error')
      setSubmitting(false)
    }
  }

  // ---- Loading ----
  if (view === 'loading') {
    return (
      <CenteredState lang={lang}>
        <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
        <p className="text-sm text-gray-500 mt-3">{T[lang].validating}</p>
      </CenteredState>
    )
  }

  // ---- Invalid ----
  if (view === 'invalid') {
    const m = T[lang].invalid[invalidReason || 'not_found']
    return (
      <CenteredState lang={lang}>
        <div className="w-12 h-12 rounded-full bg-amber-50 ring-1 ring-amber-100 flex items-center justify-center mb-5">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">{m.title}</h1>
        <p className="text-gray-500 max-w-sm mt-2 leading-relaxed">{m.body}</p>
        {invalidReason === 'completed' && (
          <Button onClick={() => router.replace('/auth')} className="mt-6 h-10">
            {T[lang].goSignIn}
          </Button>
        )}
      </CenteredState>
    )
  }

  // ---- Success ----
  if (view === 'success') {
    return (
      <CenteredState lang={lang}>
        <div className="relative">
          <span className="ob-ping-lg absolute inset-0 rounded-full bg-[#2885e8]/30" />
          <span className="ob-ping-lg absolute inset-0 rounded-full bg-[#2885e8]/20" style={{ animationDelay: '300ms' }} />
          <div className="ob-pop relative w-16 h-16 rounded-full bg-gradient-to-br from-[#2885e8] to-[#1f6fc7] flex items-center justify-center shadow-[0_12px_40px_-8px_rgba(40,133,232,0.6)]">
            <Check className="w-8 h-8 text-white" strokeWidth={3} />
          </div>
        </div>
        <h1 className="text-3xl font-semibold text-gray-900 tracking-tight mt-7 ob-fade-up" style={{ animationDelay: '200ms' }}>{T[lang].successTitle}</h1>
        <p className="text-gray-500 mt-2 ob-fade-up" style={{ animationDelay: '300ms' }}>{T[lang].successBody}</p>
      </CenteredState>
    )
  }

  // ---- Wizard ----
  const currentStepNumber = stepIdx + 1
  const totalSteps = STEP_ORDER.length

  return (
    <div className={`min-h-screen w-full bg-white ${lang === 'ko' ? 'font-[family-name:var(--font-noto-sans-kr,inherit)]' : ''}`}>
      {/* Onboarding-scoped animations.
          We can't rely on tailwindcss-animate (not installed in this v4
          setup), so all transitions use these custom keyframes. */}
      <style jsx global>{`
        @keyframes ob-orb-drift {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.85; }
          50% { transform: translate3d(40px, -30px, 0) scale(1.1); opacity: 1; }
        }
        @keyframes ob-slide-in-right {
          from { opacity: 0; transform: translate3d(40px, 0, 0); }
          to   { opacity: 1; transform: translate3d(0, 0, 0); }
        }
        @keyframes ob-slide-in-left {
          from { opacity: 0; transform: translate3d(-40px, 0, 0); }
          to   { opacity: 1; transform: translate3d(0, 0, 0); }
        }
        @keyframes ob-fade-up {
          from { opacity: 0; transform: translate3d(0, 12px, 0); }
          to   { opacity: 1; transform: translate3d(0, 0, 0); }
        }
        @keyframes ob-fade-up-sm {
          from { opacity: 0; transform: translate3d(0, 6px, 0); }
          to   { opacity: 1; transform: translate3d(0, 0, 0); }
        }
        @keyframes ob-pop {
          0%   { opacity: 0; transform: scale(0.6); }
          70%  { opacity: 1; transform: scale(1.08); }
          100% { transform: scale(1); }
        }
        @keyframes ob-ping-lg {
          0%   { transform: scale(0.9); opacity: 0.7; }
          80%, 100% { transform: scale(2.2); opacity: 0; }
        }

        .ob-orb        { animation: ob-orb-drift 12s ease-in-out infinite; }
        .ob-enter-right { animation: ob-slide-in-right 0.55s cubic-bezier(0.22, 0.9, 0.32, 1) both; }
        .ob-enter-left  { animation: ob-slide-in-left  0.55s cubic-bezier(0.22, 0.9, 0.32, 1) both; }
        .ob-fade-up    { animation: ob-fade-up 0.55s cubic-bezier(0.22, 0.9, 0.32, 1) both; }
        .ob-fade-up-sm { animation: ob-fade-up-sm 0.45s cubic-bezier(0.22, 0.9, 0.32, 1) both; }
        .ob-pop        { animation: ob-pop 0.5s cubic-bezier(0.22, 1.2, 0.36, 1) both; }
        .ob-ping-lg    { animation: ob-ping-lg 1.4s cubic-bezier(0, 0, 0.2, 1) infinite; }
      `}</style>
      <div className="grid lg:grid-cols-[440px_1fr] min-h-screen">
        {/* ============================================================ */}
        {/* LEFT: brand panel (desktop) / slim header (mobile)            */}
        {/* ============================================================ */}
        <aside className="relative hidden lg:flex flex-col justify-between bg-gradient-to-br from-[#0b3a7a] via-[#0e4ea1] to-[#163e64] text-white p-10 overflow-hidden">
          {/* Ambient brand-color glows + grid texture */}
          <div className="pointer-events-none absolute inset-0">
            {/* Slow drifting brand orbs — give the panel real depth */}
            <div className="ob-orb absolute -top-32 -left-24 w-[520px] h-[520px] rounded-full bg-[#2885e8]/40 blur-3xl" />
            <div className="ob-orb absolute top-1/3 -right-32 w-[420px] h-[420px] rounded-full bg-[#5ba3ff]/25 blur-3xl" style={{ animationDuration: '15s', animationDirection: 'reverse' }} />
            <div className="ob-orb absolute -bottom-32 left-1/4 w-[480px] h-[480px] rounded-full bg-[#1d6fd0]/30 blur-3xl" style={{ animationDuration: '18s' }} />
            {/* Hairline grid */}
            <div
              className="absolute inset-0 opacity-[0.05]"
              style={{
                backgroundImage:
                  'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
                backgroundSize: '32px 32px',
              }}
            />
            {/* Top sheen */}
            <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/[0.06] to-transparent" />
          </div>

          {/* Top: logo */}
          <div className="relative">
            <Image
              src="/text_logo.png"
              alt="Classraum"
              width={140}
              height={36}
              className="h-8 w-auto brightness-0 invert"
              priority
            />
          </div>

          {/* Middle: invitation hero + step rail */}
          <div className="relative space-y-10">
            {academy && (
              <div className="space-y-3 ob-fade-up" style={{ animationDuration: '700ms' }}>
                <p className="text-xs uppercase tracking-[0.18em] text-white/50 font-medium">
                  {tt.invitedBy}
                </p>
                <h1 className="text-4xl font-semibold tracking-tight leading-tight">
                  {academy.name}
                </h1>
              </div>
            )}

            <StepRail currentStep={step} lang={lang} />
          </div>

          {/* Bottom: tagline */}
          <div className="relative">
            <p className="text-sm text-white/60 leading-relaxed max-w-xs">
              {tt.brandTagline}
            </p>
            <p className="text-xs text-white/30 mt-3">{tt.brandFooter}</p>
          </div>
        </aside>

        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white sticky top-0 z-10">
          <Image
            src="/text_logo.png"
            alt="Classraum"
            width={120}
            height={30}
            className="h-7 w-auto"
            priority
          />
          <div className="text-xs text-gray-500 tabular-nums">
            {currentStepNumber} / {totalSteps}
          </div>
        </header>

        {/* ============================================================ */}
        {/* RIGHT: workspace                                              */}
        {/* ============================================================ */}
        <main className="relative flex flex-col">
          {/* Top utility bar (language switcher) */}
          <div className="flex items-center justify-end px-6 lg:px-12 pt-6">
            <LangSwitch lang={lang} onChange={setLang} />
          </div>

          {/* Mobile progress bar */}
          <div className="lg:hidden px-5 mt-2">
            <div className="h-0.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#2885e8] to-[#5ba3ff] transition-all duration-700 ease-out"
                style={{ width: `${(currentStepNumber / totalSteps) * 100}%` }}
              />
            </div>
          </div>

          {/* Step content — centered column */}
          <div className="flex-1 flex flex-col px-6 lg:px-16 py-8 lg:py-12">
            <div className="w-full max-w-[480px] mx-auto flex-1 flex flex-col">
              <div
                key={animKey}
                className={`flex-1 ${direction === 'forward' ? 'ob-enter-right' : 'ob-enter-left'}`}
              >
                {step === 'language' && (
                  <LanguageStep lang={lang} onPick={setLang} />
                )}
                {step === 'welcome' && academy && (
                  <WelcomeStep academy={academy} lang={lang} />
                )}
                {step === 'account' && (
                  <AccountStep
                    lang={lang}
                    fullName={fullName} setFullName={setFullName}
                    email={email} setEmail={setEmail}
                    password={password} setPassword={setPassword}
                    confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword}
                    phone={phone} setPhone={setPhone}
                  />
                )}
                {step === 'academy' && (
                  <AcademyStep
                    lang={lang}
                    academyName={academyName} setAcademyName={setAcademyName}
                    academyAddress={academyAddress} setAcademyAddress={setAcademyAddress}
                    academyEmail={academyEmail} setAcademyEmail={setAcademyEmail}
                    academyPhone={academyPhone} setAcademyPhone={setAcademyPhone}
                  />
                )}
                {step === 'review' && (
                  <ReviewStep
                    lang={lang}
                    fullName={fullName} email={email} phone={phone}
                    academyName={academyName} academyAddress={academyAddress}
                    academyEmail={academyEmail} academyPhone={academyPhone}
                    onEdit={goTo}
                  />
                )}
              </div>

              {/* Error toast (inline) */}
              {error && (
                <div className="mt-6 rounded-lg border border-rose-100 bg-rose-50/70 px-3.5 py-2.5 flex items-start gap-2 ob-fade-up-sm">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-rose-700">{error}</p>
                </div>
              )}

              {/* Footer actions */}
              <div className="mt-10 pt-6 border-t border-gray-100 flex items-center justify-between gap-3">
                {stepIdx > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={goBack}
                    disabled={submitting}
                    className="text-gray-500 hover:text-gray-900 -ml-3 gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    {tt.back}
                  </Button>
                ) : <span />}

                {step === 'review' ? (
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="h-11 px-5 gap-2 bg-gradient-to-b from-[#2885e8] to-[#1f6fc7] hover:from-[#3590ec] hover:to-[#2885e8] text-white shadow-[0_8px_24px_-8px_rgba(40,133,232,0.6)] hover:shadow-[0_12px_28px_-6px_rgba(40,133,232,0.7)] transition-all duration-300 hover:-translate-y-px"
                  >
                    {submitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" />{tt.creating}</>
                    ) : (
                      <>{tt.create}<ArrowRight className="w-4 h-4" /></>
                    )}
                  </Button>
                ) : step === 'welcome' ? (
                  <Button
                    type="button"
                    onClick={goNext}
                    className="h-11 px-5 gap-2 bg-gradient-to-b from-[#2885e8] to-[#1f6fc7] hover:from-[#3590ec] hover:to-[#2885e8] text-white shadow-[0_8px_24px_-8px_rgba(40,133,232,0.6)] hover:shadow-[0_12px_28px_-6px_rgba(40,133,232,0.7)] transition-all duration-300 hover:-translate-y-px"
                  >
                    {tt.getStarted}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={goNext}
                    className="h-11 px-5 gap-2 bg-gradient-to-b from-[#2885e8] to-[#1f6fc7] hover:from-[#3590ec] hover:to-[#2885e8] text-white shadow-[0_8px_24px_-8px_rgba(40,133,232,0.6)] hover:shadow-[0_12px_28px_-6px_rgba(40,133,232,0.7)] transition-all duration-300 hover:-translate-y-px"
                  >
                    {tt.next}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {step === 'review' && (
                <p className="mt-4 text-xs text-gray-400 text-center">{tt.terms}</p>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

// =====================================================================
// Brand-panel step rail (desktop only)
// =====================================================================
function StepRail({ currentStep, lang }: { currentStep: Step; lang: Lang }) {
  const tt = T[lang]
  const items: { key: Step; label: string }[] = [
    { key: 'language', label: tt.stepLanguage },
    { key: 'welcome', label: tt.stepWelcome },
    { key: 'account', label: tt.stepAccount },
    { key: 'academy', label: tt.stepAcademy },
    { key: 'review', label: tt.stepReview },
  ]
  const currentIdx = items.findIndex(i => i.key === currentStep)

  return (
    <ol className="space-y-4">
      {items.map((item, i) => {
        const state: 'done' | 'current' | 'upcoming' =
          i < currentIdx ? 'done' : i === currentIdx ? 'current' : 'upcoming'
        return (
          <li key={item.key} className="flex items-center gap-3.5">
            <div
              className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-medium tabular-nums transition-all duration-300 ${
                state === 'done'
                  ? 'bg-white text-gray-900'
                  : state === 'current'
                  ? 'bg-[#2885e8] text-white ring-4 ring-[#2885e8]/20'
                  : 'bg-white/10 text-white/40'
              }`}
            >
              {state === 'done' ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : i + 1}
            </div>
            <span
              className={`text-sm transition-colors duration-300 ${
                state === 'current'
                  ? 'text-white font-medium'
                  : state === 'done'
                  ? 'text-white/70'
                  : 'text-white/40'
              }`}
            >
              {item.label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

// =====================================================================
// Language switcher (top-right, minimal)
// =====================================================================
function LangSwitch({ lang, onChange }: { lang: Lang; onChange: (l: Lang) => void }) {
  return (
    <div className="inline-flex items-center rounded-full border border-gray-200 bg-white p-0.5 shadow-sm">
      {(['en', 'ko'] as Lang[]).map(l => (
        <button
          key={l}
          type="button"
          onClick={() => onChange(l)}
          className={`px-3 h-7 rounded-full text-xs font-medium tracking-wide transition-all duration-300 ${
            lang === l
              ? 'bg-gradient-to-b from-[#2885e8] to-[#1f6fc7] text-white shadow-[0_4px_12px_-4px_rgba(40,133,232,0.5)]'
              : 'text-gray-500 hover:text-[#2885e8]'
          }`}
        >
          {l === 'en' ? 'EN' : '한국어'}
        </button>
      ))}
    </div>
  )
}

// =====================================================================
// Step screens
// =====================================================================

function StepHeader({ kicker, title, body }: { kicker?: string; title: string; body: string }) {
  return (
    <div className="mb-8">
      {kicker && (
        <p
          className="text-xs uppercase tracking-[0.16em] text-[#2885e8] font-semibold mb-3 ob-fade-up-sm"
          style={{ animationDelay: '60ms' }}
        >
          {kicker}
        </p>
      )}
      <h1
        className="text-3xl font-semibold text-gray-900 tracking-tight leading-[1.15] ob-fade-up"
        style={{ animationDelay: '120ms' }}
      >
        {title}
      </h1>
      <p
        className="text-[15px] text-gray-500 mt-3 leading-relaxed ob-fade-up"
        style={{ animationDelay: '180ms' }}
      >
        {body}
      </p>
    </div>
  )
}

function LanguageStep({ lang, onPick }: { lang: Lang; onPick: (l: Lang) => void }) {
  const tt = T[lang]
  return (
    <div>
      <StepHeader title={tt.languageTitle} body={tt.languageBody} />
      <div className="space-y-2.5">
        {(['en', 'ko'] as Lang[]).map((l, i) => {
          const selected = lang === l
          const native = l === 'en' ? T.en.english : T.ko.korean
          const sub = l === 'en' ? 'English' : 'Korean · 대한민국'
          return (
            <button
              key={l}
              type="button"
              onClick={() => onPick(l)}
              style={{ animationDelay: `${140 + i * 80}ms` }}
              className={`group w-full text-left rounded-xl border px-5 py-4 flex items-center justify-between transition-[colors,box-shadow,transform] duration-300 ob-fade-up ${
                selected
                  ? 'border-[#2885e8] bg-gradient-to-br from-[#2885e8]/8 to-[#5ba3ff]/4 shadow-[inset_0_0_0_1px_#2885e8,0_8px_24px_-12px_rgba(40,133,232,0.4)]'
                  : 'border-gray-200 hover:border-[#2885e8]/40 hover:bg-[#2885e8]/[0.02]'
              }`}
            >
              <div>
                <div className="text-[15px] font-medium text-gray-900">{native}</div>
                <div className="text-xs text-gray-500 mt-0.5">{sub}</div>
              </div>
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300 ${
                  selected
                    ? 'bg-[#2885e8] scale-100 shadow-[0_0_0_4px_rgba(40,133,232,0.15)]'
                    : 'border border-gray-300 scale-90'
                }`}
              >
                {selected && (
                  <Check className="w-3 h-3 text-white ob-pop" strokeWidth={3} />
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function WelcomeStep({ academy, lang }: { academy: AcademyPreview; lang: Lang }) {
  const tt = T[lang]
  const tierKey = `tier${academy.subscriptionTier.charAt(0).toUpperCase()}${academy.subscriptionTier.slice(1)}` as keyof typeof tt
  const tierLabel = (tt[tierKey] as string) || academy.subscriptionTier
  const points = [tt.welcomePoint1, tt.welcomePoint2, tt.welcomePoint3]

  return (
    <div>
      <StepHeader kicker={tt.welcomeKicker} title={tt.welcomeTitle} body={tt.welcomeBody} />

      {/* What we'll do */}
      <ol className="space-y-3 mb-8">
        {points.map((p, i) => (
          <li
            key={i}
            className="flex items-start gap-3 ob-fade-up"
            style={{ animationDelay: `${150 + i * 100}ms` }}
          >
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-[#2885e8]/15 to-[#5ba3ff]/8 text-[#2885e8] text-xs font-semibold flex items-center justify-center ring-1 ring-[#2885e8]/20">
              {i + 1}
            </div>
            <span className="text-[15px] text-gray-700 leading-relaxed pt-0.5">{p}</span>
          </li>
        ))}
      </ol>

      {/* Plan card */}
      <div
        className="relative overflow-hidden rounded-xl border border-[#2885e8]/20 bg-gradient-to-br from-[#2885e8]/5 via-white to-[#5ba3ff]/5 p-4 flex items-center justify-between ob-fade-up"
        style={{ animationDelay: '500ms' }}
      >
        <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-[#2885e8]/10 blur-2xl" />
        <div className="relative">
          <div className="text-xs uppercase tracking-wider text-[#2885e8] font-semibold">{tt.welcomePlan}</div>
          <div className="text-base font-semibold text-gray-900 mt-0.5">{tierLabel}</div>
        </div>
        <Sparkles className="relative w-5 h-5 text-[#2885e8]" />
      </div>
    </div>
  )
}

interface AccountStepProps {
  lang: Lang
  fullName: string; setFullName: (v: string) => void
  email: string; setEmail: (v: string) => void
  password: string; setPassword: (v: string) => void
  confirmPassword: string; setConfirmPassword: (v: string) => void
  phone: string; setPhone: (v: string) => void
}
function AccountStep(p: AccountStepProps) {
  const tt = T[p.lang]
  return (
    <div>
      <StepHeader title={tt.accountTitle} body={tt.accountBody} />
      <div className="space-y-5">
        <Field id="full-name" label={tt.fullName} required icon={<UserIcon className="w-4 h-4" />}
               value={p.fullName} onChange={p.setFullName} placeholder={tt.fullNamePh} delay={120} />
        <Field id="email" label={tt.email} required type="email" icon={<Mail className="w-4 h-4" />}
               value={p.email} onChange={p.setEmail} placeholder={tt.emailPh} delay={180} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field id="password" label={tt.password} required type="password" icon={<Lock className="w-4 h-4" />}
                 value={p.password} onChange={p.setPassword} placeholder={tt.passwordPh} delay={240} />
          <Field id="confirm-password" label={tt.confirmPassword} required type="password" icon={<Lock className="w-4 h-4" />}
                 value={p.confirmPassword} onChange={p.setConfirmPassword} placeholder={tt.confirmPasswordPh} delay={280} />
        </div>
        <p className="text-xs text-gray-400 -mt-3 ob-fade-up-sm" style={{ animationDelay: '320ms' }}>{tt.passwordHelp}</p>
        <Field id="phone" label={tt.phoneOptional} icon={<Phone className="w-4 h-4" />}
               value={p.phone} onChange={p.setPhone} placeholder={tt.phonePh}
               optionalLabel={tt.optional} delay={360} />
      </div>
    </div>
  )
}

interface AcademyStepProps {
  lang: Lang
  academyName: string; setAcademyName: (v: string) => void
  academyAddress: string; setAcademyAddress: (v: string) => void
  academyEmail: string; setAcademyEmail: (v: string) => void
  academyPhone: string; setAcademyPhone: (v: string) => void
}
function AcademyStep(p: AcademyStepProps) {
  const tt = T[p.lang]
  return (
    <div>
      <StepHeader title={tt.academyTitle} body={tt.academyBody} />
      <div className="space-y-5">
        <Field id="academy-name" label={tt.academyName} required icon={<Building2 className="w-4 h-4" />}
               value={p.academyName} onChange={p.setAcademyName} placeholder={tt.academyNamePh} delay={120} />
        <Field id="academy-address" label={tt.addressOptional} icon={<MapPin className="w-4 h-4" />}
               value={p.academyAddress} onChange={p.setAcademyAddress} placeholder={tt.addressPh}
               optionalLabel={tt.optional} delay={180} />
        <Field id="academy-email" label={tt.contactEmailOptional} type="email" icon={<Mail className="w-4 h-4" />}
               value={p.academyEmail} onChange={p.setAcademyEmail} placeholder={tt.contactEmailPh}
               helperText={tt.contactEmailHelp} optionalLabel={tt.optional} delay={240} />
        <Field id="academy-phone" label={tt.academyPhoneOptional} icon={<Phone className="w-4 h-4" />}
               value={p.academyPhone} onChange={p.setAcademyPhone} placeholder={tt.phonePh}
               optionalLabel={tt.optional} delay={300} />
      </div>
    </div>
  )
}

interface ReviewStepProps {
  lang: Lang
  fullName: string; email: string; phone: string
  academyName: string; academyAddress: string; academyEmail: string; academyPhone: string
  onEdit: (target: Step) => void
}
function ReviewStep(p: ReviewStepProps) {
  const tt = T[p.lang]
  return (
    <div>
      <StepHeader title={tt.reviewTitle} body={tt.reviewBody} />
      <div className="space-y-3">
        <ReviewCard
          title={tt.sectionAccount}
          editLabel={tt.edit}
          onEdit={() => p.onEdit('account')}
          rows={[
            { label: tt.fullName, value: p.fullName },
            { label: tt.email, value: p.email },
            { label: tt.phone, value: p.phone || tt.notProvided, muted: !p.phone },
          ]}
          delay={140}
        />
        <ReviewCard
          title={tt.sectionAcademy}
          editLabel={tt.edit}
          onEdit={() => p.onEdit('academy')}
          rows={[
            { label: tt.academyName, value: p.academyName },
            { label: tt.address, value: p.academyAddress || tt.notProvided, muted: !p.academyAddress },
            { label: tt.contactEmail, value: p.academyEmail || tt.notProvided, muted: !p.academyEmail },
            { label: tt.academyPhone, value: p.academyPhone || tt.notProvided, muted: !p.academyPhone },
          ]}
          delay={220}
        />
      </div>
    </div>
  )
}

// =====================================================================
// Field — borderless variant with bottom rule, native-feeling
// =====================================================================
interface FieldProps {
  id: string
  label: string
  required?: boolean
  type?: string
  icon?: React.ReactNode
  value: string
  onChange: (v: string) => void
  placeholder?: string
  helperText?: string
  optionalLabel?: string
  delay?: number
}
function Field({
  id, label, required, type = 'text', icon, value, onChange,
  placeholder, helperText, optionalLabel, delay = 0,
}: FieldProps) {
  return (
    <div
      className="space-y-2 ob-fade-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-xs font-medium text-gray-700 tracking-wide">
          {label}
        </Label>
        {!required && optionalLabel && (
          <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">
            {optionalLabel}
          </span>
        )}
      </div>
      <div className="relative group">
        {icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-colors duration-200 peer-focus-visible:text-[#2885e8] group-focus-within:text-[#2885e8]">
            {icon}
          </div>
        )}
        <Input
          id={id}
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          autoComplete={type === 'password' ? 'new-password' : type === 'email' ? 'email' : 'off'}
          className={`${icon ? 'pl-10' : ''} peer h-11 bg-white border-gray-200 rounded-lg shadow-none focus-visible:ring-4 focus-visible:ring-[#2885e8]/15 focus-visible:border-[#2885e8] transition-all duration-200`}
        />
      </div>
      {helperText && (
        <p className="text-xs text-gray-400 leading-relaxed">{helperText}</p>
      )}
    </div>
  )
}

interface ReviewCardProps {
  title: string
  rows: { label: string; value: string; muted?: boolean }[]
  onEdit: () => void
  editLabel: string
  delay?: number
}
function ReviewCard({ title, rows, onEdit, editLabel, delay = 0 }: ReviewCardProps) {
  return (
    <div
      className="rounded-xl border border-gray-200 bg-white overflow-hidden hover:border-[#2885e8]/30 hover:shadow-[0_8px_24px_-12px_rgba(40,133,232,0.2)] transition-[colors,box-shadow] duration-300 ob-fade-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          className="text-xs font-medium text-[#2885e8] hover:text-[#1f6fc7] transition-colors"
        >
          {editLabel}
        </button>
      </div>
      <dl className="divide-y divide-gray-100">
        {rows.map(r => (
          <div key={r.label} className="flex items-baseline justify-between gap-3 px-5 py-3 text-sm">
            <dt className="text-gray-500">{r.label}</dt>
            <dd className={`text-right truncate ${r.muted ? 'text-gray-400' : 'text-gray-900 font-medium'}`}>
              {r.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

// =====================================================================
// Centered state (loading / invalid / success) — full viewport, no card
// =====================================================================
function CenteredState({ children, lang }: { children: React.ReactNode; lang: Lang }) {
  return (
    <div className={`min-h-screen w-full bg-white flex flex-col ${lang === 'ko' ? 'font-[family-name:var(--font-noto-sans-kr,inherit)]' : ''}`}>
      <header className="px-6 lg:px-12 py-6">
        <Image
          src="/text_logo.png"
          alt="Classraum"
          width={130}
          height={32}
          className="h-8 w-auto"
          priority
        />
      </header>
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 -mt-16">
        {children}
      </div>
    </div>
  )
}
