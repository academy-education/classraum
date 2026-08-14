"use client"

import { Button } from "@/components/ui/button"
import { Sparkles, Clock, GraduationCap, Heart, Check, ArrowRight, School, BookOpen } from "lucide-react"
import { useState, useEffect } from "react"
import Link from "next/link"
import Header from "@/components/shared/Header"
import Footer from "@/components/shared/Footer"
import { useTranslation } from "@/hooks/useTranslation"
import { languages } from "@/locales"
import { LogoMark } from "@/components/marketing/ProductMocks"
import { CARD, CARD_HOVER, WRAP, ts, useReveal } from "@/components/marketing/ui"

const VALUE_ICONS = [GraduationCap, Sparkles, Clock, Heart]
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
            <div className="bg-gray-50/70 p-7 sm:p-9">
              <span className="text-[11.5px] font-semibold tracking-[0.09em] uppercase text-gray-400">
                {ts(t, 'about.problemSolution.problem.title')}
              </span>
              <p className="text-[15px] text-gray-500 leading-[1.75] mt-3 mb-5">
                {ts(t, 'about.problemSolution.problem.description')}
              </p>
              <ul className="space-y-3">
                {problemIssues.map((issue, i) => (
                  <li key={i} className="flex items-start gap-3 text-[14px] text-gray-500">
                    <span className="w-4 h-px bg-gray-300 shrink-0 mt-[11px]" />
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white p-7 sm:p-9">
              <span className="text-[11.5px] font-semibold tracking-[0.09em] uppercase text-primary">
                {ts(t, 'about.problemSolution.solution.title')}
              </span>
              <p className="text-[15px] text-gray-600 leading-[1.75] mt-3 mb-5">
                {ts(t, 'about.problemSolution.solution.description')}
              </p>
              <ul className="space-y-3">
                {solutionBenefits.map((benefit, i) => (
                  <li key={i} className="flex items-start gap-3 text-[14px] text-gray-700">
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
                  <p className="text-[16px] sm:text-[17px] text-white/80 leading-[1.85] mt-3">
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
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-10">
            {values.map((value, i) => {
              const Icon = VALUE_ICONS[i % VALUE_ICONS.length]
              return (
                <div key={i} className="hv4-fade">
                  <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                    <Icon size={19} strokeWidth={2.2} />
                  </span>
                  <h3 className="text-[15px] font-semibold text-[#163e64] mb-1.5">{value.title}</h3>
                  <p className="text-[13.5px] text-gray-500 leading-[1.7]">{value.description}</p>
                </div>
              )
            })}
          </div>
        </section>

        {/* Two products */}
        <section className="mb-24">
          <div className="text-center max-w-[640px] mx-auto mb-10">
            <h2 className="hv4-fade text-[clamp(24px,2.8vw,32px)] font-bold text-[#163e64] leading-[1.16] tracking-tight">
              {ts(t, 'landing.aboutExtras.prodTitle')}
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { href: "/features", Icon: School, chip: "bg-primary/10 text-primary", t1: 'landing.aboutExtras.prod1t', b: 'landing.aboutExtras.prod1b', c: 'landing.aboutExtras.prod1cta' },
              { href: "/study", Icon: BookOpen, chip: "bg-[#00D0AE]/10 text-[#00a98d]", t1: 'landing.aboutExtras.prod2t', b: 'landing.aboutExtras.prod2b', c: 'landing.aboutExtras.prod2cta' },
            ].map((p) => (
              <Link key={p.href} href={p.href} className={`${CARD} ${CARD_HOVER} hv4-fade group p-7 block`}>
                <span className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 ${p.chip}`}>
                  <p.Icon size={20} strokeWidth={2.2} />
                </span>
                <h3 className="text-[16px] font-bold text-[#163e64] mb-1.5">{ts(t, p.t1)}</h3>
                <p className="text-[13.5px] text-gray-500 leading-relaxed mb-4">{ts(t, p.b)}</p>
                <span className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-primary">
                  {ts(t, p.c)}
                  <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
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
