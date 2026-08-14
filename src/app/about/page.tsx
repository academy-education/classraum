"use client"

import { Button } from "@/components/ui/button"
import { Sparkles, Clock, GraduationCap, Heart, Check, ArrowRight } from "lucide-react"
import { useState, useEffect } from "react"
import Link from "next/link"
import Header from "@/components/shared/Header"
import Footer from "@/components/shared/Footer"
import { useTranslation } from "@/hooks/useTranslation"
import { languages } from "@/locales"
import { LogoMark, BrowserShell, PhoneShell, MiniReports, MiniCalendar, MiniComms, StudyPhoneMock } from "@/components/marketing/ProductMocks"
import { WRAP, ts, useReveal } from "@/components/marketing/ui"

type TFunc = ReturnType<typeof useTranslation>["t"]

const VALUE_ICONS = [GraduationCap, Sparkles, Clock, Heart]
/* Auto-advancing preview of the three academy surfaces. Pausing on
 * hover and on prefers-reduced-motion are both required: this sits in a
 * marketing page that people read, and a screen that swaps itself every
 * three seconds under someone trying to look at it is worse than a
 * static image. The pills are real controls, not decoration — clicking
 * one stops the auto-advance for good, because a person who has chosen
 * a screen has said what they want to look at. */
function ScreenCycler({ t }: { t: TFunc }) {
  const SCREENS = [
    { key: "reports", Mock: MiniReports },
    { key: "schedule", Mock: MiniCalendar },
    { key: "messages", Mock: MiniComms },
  ] as const
  const [i, setI] = useState(0)
  const [auto, setAuto] = useState(true)
  const [hover, setHover] = useState(false)

  useEffect(() => {
    if (!auto || hover) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const id = setInterval(() => setI((n) => (n + 1) % SCREENS.length), 3200)
    return () => clearInterval(id)
  }, [auto, hover, SCREENS.length])

  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <BrowserShell url="app.classraum.com" label={ts(t, "landing.aboutExtras.screens.live")}>
        <div className="relative h-[150px]">
          {SCREENS.map((s, n) => (
            <div
              key={s.key}
              aria-hidden={n !== i}
              className={`absolute inset-0 transition-all duration-500 ease-out ${
                n === i ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
              }`}
            >
              <s.Mock t={t} label={ts(t, `landing.aboutExtras.screens.${s.key}`)} />
            </div>
          ))}
        </div>
      </BrowserShell>
      <div className="flex flex-wrap gap-1.5 mt-3">
        {SCREENS.map((s, n) => (
          <button
            key={s.key}
            type="button"
            onClick={() => { setI(n); setAuto(false) }}
            aria-pressed={n === i}
            className={`text-[11.5px] font-semibold rounded-full px-2.5 py-1 transition-colors duration-200 ${
              n === i ? "bg-primary text-white" : "bg-white text-gray-500 ring-1 ring-gray-200 hover:text-primary hover:ring-primary/40"
            }`}
          >
            {ts(t, `landing.aboutExtras.screens.${s.key}`)}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function AboutPage() {
  const { t, language } = useTranslation()
  const [appUrl, setAppUrl] = useState("https://app.classraum.com")
  useReveal()

  // Access arrays directly from translations
  const translations = languages[language]
  const problemIssues: string[] = translations.about?.problemSolution?.problem?.issues || []
  const solutionBenefits: string[] = translations.about?.problemSolution?.solution?.benefits || []
  const values: { title: string; description: string }[] = translations.about?.values?.valuesList || []

  // Set the correct app URL based on environment
  useEffect(() => {
    if (window.location.hostname === 'localhost') {
      const { protocol, port } = window.location
      setAppUrl(`${protocol}//app.localhost${port ? ':' + port : ''}`)
    }
  }, [])

  return (
    <div className="min-h-screen bg-background overflow-x-clip">
      <Header currentPage="about" />

      {/* Hero */}
      <header className="relative pt-20 pb-16 text-center">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(560px 260px at 50% -40px, rgba(40,133,232,.06), transparent 70%)" }}
        />
        <div className={`relative ${WRAP}`}>
          <div className="flex justify-center mb-6">
            <LogoMark size={56} radius={16} />
          </div>
          <span className="text-[12.5px] font-semibold tracking-[0.08em] text-primary">{ts(t, 'landing.aboutExtras.eyebrow')}</span>
          <h1 className="text-[clamp(34px,4.6vw,56px)] font-bold text-[#163e64] leading-[1.16] tracking-[-0.024em] mt-3">
            {ts(t, 'about.hero.title')}
          </h1>
          <p className="text-gray-500 text-base sm:text-[16.5px] leading-[1.75] max-w-[58ch] mx-auto mt-6">
            {ts(t, 'about.mission.description')}
          </p>
        </div>
      </header>

      <main className={WRAP}>
        {/* ── The problem, then the answer. Deliberately asymmetric: the
             problem sits back — grey ground, muted type, dashes — and the
             answer carries the colour. Two matching cards gave a complaint
             and its fix the same weight, which is the wrong story for the
             page that exists to argue one replaced the other. One shared
             frame, split by a hairline, so they read as a single before/
             after rather than two unrelated tiles. ──────────────────── */}
        <section className="mb-20 md:mb-24">
          <div className="hv4-fade grid lg:grid-cols-2 gap-px bg-gray-200/70 rounded-2xl overflow-hidden border border-gray-200/70">
            <div className="bg-gradient-to-br from-rose-50/80 to-orange-50/50 p-7 sm:p-9">
              <span className="inline-flex items-center gap-2 text-[11.5px] font-bold tracking-[0.09em] uppercase text-rose-600">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                {ts(t, 'about.problemSolution.problem.title')}
              </span>
              <p className="text-[15px] font-medium text-[#7c2d3a] leading-[1.7] mt-3 mb-5">
                {ts(t, 'about.problemSolution.problem.description')}
              </p>
              <ul className="space-y-3">
                {problemIssues.map((issue, i) => (
                  <li key={i} className="flex items-start gap-3 text-[14px] text-gray-700">
                    <span className="w-4 h-px bg-rose-300 shrink-0 mt-[11px]" />
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gradient-to-br from-[#00D0AE]/[0.09] to-blue-50/50 p-7 sm:p-9">
              <span className="inline-flex items-center gap-2 text-[11.5px] font-bold tracking-[0.09em] uppercase text-[#00806c]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00D0AE]" />
                {ts(t, 'about.problemSolution.solution.title')}
              </span>
              <p className="text-[15px] font-medium text-[#163e64] leading-[1.7] mt-3 mb-5">
                {ts(t, 'about.problemSolution.solution.description')}
              </p>
              <ul className="space-y-3">
                {solutionBenefits.map((benefit, i) => (
                  <li key={i} className="flex items-start gap-3 text-[14px] font-medium text-gray-800">
                    <Check className="w-4 h-4 text-[#00a98d] shrink-0 mt-[3px]" strokeWidth={2.6} />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── The one dark section. Mission and vision are the only part
             of this page that is a claim rather than a list, so they get
             the landing page's night band instead of two more cards. */}
        <section className="mb-20 md:mb-24">
          <div className="hv4-fade rounded-3xl bg-gradient-to-b from-[#0b2138] to-[#0e2846] text-white p-8 sm:p-12">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-14">
              {(["mission", "vision"] as const).map((key) => (
                <div key={key}>
                  <span className="text-[11.5px] font-semibold tracking-[0.09em] uppercase text-[#00D0AE]">
                    {ts(t, `about.missionVision.${key}.title`)}
                  </span>
                  <p className="text-[16px] sm:text-[17px] text-white/90 leading-[1.8] mt-3">
                    {ts(t, `about.missionVision.${key}.description`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="mb-24">
          <div className="text-center max-w-[640px] mx-auto mb-12">
            <h2 className="hv4-fade text-[clamp(26px,3.2vw,36px)] font-bold text-[#163e64] leading-[1.16] tracking-tight mb-3">
              {ts(t, 'about.values.title')}
            </h2>
            <p className="hv4-fade text-gray-500 leading-[1.75]">{ts(t, 'about.values.subtitle')}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {values.map((value, i) => {
              const Icon = VALUE_ICONS[i % VALUE_ICONS.length]
              return (
                <div key={i} className="hv4-fade group rounded-2xl bg-gradient-to-b from-blue-50/70 to-white ring-1 ring-blue-100/80 p-5 transition-all duration-300 hover:ring-primary/30 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-16px_rgba(40,133,232,0.45)]">
                  <span className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center mb-4 shadow-[0_6px_14px_-6px_rgba(40,133,232,0.7)] transition-transform duration-300 group-hover:scale-105">
                    <Icon size={19} strokeWidth={2.2} />
                  </span>
                  <h3 className="text-[15px] font-bold text-[#163e64] mb-1.5">{value.title}</h3>
                  <p className="text-[13.5px] text-gray-600 leading-[1.7]">{value.description}</p>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── Two products, one system. The section used to be two text
             cards with an icon — it ASSERTED there were two products and
             showed neither. Now the academy side runs a live preview
             that cycles its three surfaces, and the study side shows the
             real phone UI. The claim is demonstrated instead of stated.

             Only the academy side cycles: there is exactly one study
             mock in ProductMocks, so a second study screen would have to
             be invented, and an invented screen on an About page is a
             lie with a rounded corner. ─────────────────────────────── */}
        <section className="mb-24">
          <div className="text-center max-w-[640px] mx-auto mb-10">
            <h2 className="hv4-fade text-[clamp(24px,2.8vw,32px)] font-bold text-[#163e64] leading-[1.16] tracking-tight">
              {ts(t, 'landing.aboutExtras.prodTitle')}
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            <div className="hv4-fade rounded-2xl bg-gradient-to-b from-blue-50/70 to-white ring-1 ring-blue-100/80 p-5 sm:p-6">
              <ScreenCycler t={t} />
              <h3 className="text-[16px] font-bold text-[#163e64] mt-5 mb-1.5">{ts(t, 'landing.aboutExtras.prod1t')}</h3>
              <p className="text-[13.5px] text-gray-600 leading-[1.7] mb-4">{ts(t, 'landing.aboutExtras.prod1b')}</p>
              <Link href="/features" className="group inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-primary">
                {ts(t, 'landing.aboutExtras.prod1cta')}
                <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            </div>

            <div className="hv4-fade rounded-2xl bg-gradient-to-b from-[#00D0AE]/[0.09] to-white ring-1 ring-[#00D0AE]/25 p-5 sm:p-6">
              <div className="h-[196px] flex items-center justify-center overflow-hidden">
                <PhoneShell label={ts(t, 'landing.aboutExtras.prod2t')} className="w-[124px] shrink-0 translate-y-3">
                  <StudyPhoneMock t={t} label={ts(t, 'landing.aboutExtras.prod2t')} />
                </PhoneShell>
              </div>
              <h3 className="text-[16px] font-bold text-[#163e64] mt-5 mb-1.5">{ts(t, 'landing.aboutExtras.prod2t')}</h3>
              <p className="text-[13.5px] text-gray-600 leading-[1.7] mb-4">{ts(t, 'landing.aboutExtras.prod2b')}</p>
              <Link href="/study" className="group inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[#00806c]">
                {ts(t, 'landing.aboutExtras.prod2cta')}
                <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="pb-24 text-center">
          <div className="hv4-fade">
            <h2 className="text-[clamp(28px,3.6vw,42px)] font-bold text-[#163e64] leading-[1.16] tracking-tight mb-3">
              {ts(t, 'about.cta.title')}
            </h2>
            <p className="text-gray-500 leading-[1.75] max-w-[48ch] mx-auto mb-8">{ts(t, 'about.cta.description')}</p>
            <a href={`${appUrl}/auth?lang=${language}`}>
              <Button size="lg" className="text-sm sm:text-base px-6">
                {ts(t, 'about.cta.startTrial')}
              </Button>
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
