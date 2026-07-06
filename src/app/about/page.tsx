"use client"

import { Button } from "@/components/ui/button"
import { AlertTriangle, Sparkles, Target, Eye, Clock, GraduationCap, Heart, Check, ArrowRight, School, BookOpen } from "lucide-react"
import { useState, useEffect } from "react"
import Link from "next/link"
import Header from "@/components/shared/Header"
import Footer from "@/components/shared/Footer"
import { useTranslation } from "@/hooks/useTranslation"
import { languages } from "@/locales"
import { LogoMark } from "@/components/marketing/ProductMocks"
import { CARD, CARD_HOVER, WRAP, ts, useReveal } from "@/components/marketing/ui"

const VALUE_ICONS = [GraduationCap, Sparkles, Clock, Heart]
const VALUE_CHIPS = [
  "bg-blue-50 text-primary",
  "bg-purple-50 text-purple-500",
  "bg-amber-50 text-amber-500",
  "bg-rose-50 text-rose-500",
]

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
        {/* Problem & Solution */}
        <section className="mb-20">
          <div className="grid lg:grid-cols-2 gap-4">
            <div className={`${CARD} ${CARD_HOVER} hv4-fade group p-7 flex flex-col`}>
              <div className="flex items-center gap-3 mb-4">
                <span className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                  <AlertTriangle size={18} strokeWidth={2.2} />
                </span>
                <h2 className="text-[19px] font-bold text-[#163e64]">{ts(t, 'about.problemSolution.problem.title')}</h2>
              </div>
              <p className="text-[14px] text-gray-500 leading-relaxed mb-4">
                {ts(t, 'about.problemSolution.problem.description')}
              </p>
              <ul className="space-y-2.5">
                {problemIssues.map((issue, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[13.5px] text-gray-600">
                    <s className="w-1.5 h-1.5 rounded-full bg-rose-300 no-underline shrink-0 mt-[7px]" />
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
            <div className={`${CARD} ${CARD_HOVER} hv4-fade group p-7 flex flex-col`}>
              <div className="flex items-center gap-3 mb-4">
                <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                  <Sparkles size={18} strokeWidth={2.2} />
                </span>
                <h2 className="text-[19px] font-bold text-[#163e64]">{ts(t, 'about.problemSolution.solution.title')}</h2>
              </div>
              <p className="text-[14px] text-gray-500 leading-relaxed mb-4">
                {ts(t, 'about.problemSolution.solution.description')}
              </p>
              <ul className="space-y-2.5">
                {solutionBenefits.map((benefit, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[13.5px] text-gray-600">
                    <Check className="w-3.5 h-3.5 text-[#00a98d] shrink-0 mt-0.5" strokeWidth={2.6} />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Mission & Vision */}
        <section className="mb-20">
          <div className="grid lg:grid-cols-2 gap-4">
            {([
              { key: "mission", Icon: Target, chip: "bg-primary/10 text-primary" },
              { key: "vision", Icon: Eye, chip: "bg-[#00D0AE]/10 text-[#00a98d]" },
            ] as const).map(({ key, Icon, chip }) => (
              <div key={key} className={`${CARD} ${CARD_HOVER} hv4-fade group p-7`}>
                <div className="flex items-center gap-3 mb-3">
                  <span className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 ${chip}`}>
                    <Icon size={18} strokeWidth={2.2} />
                  </span>
                  <h2 className="text-[19px] font-bold text-[#163e64]">{ts(t, `about.missionVision.${key}.title`)}</h2>
                </div>
                <p className="text-[14px] text-gray-500 leading-[1.8]">{ts(t, `about.missionVision.${key}.description`)}</p>
              </div>
            ))}
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
              const chip = VALUE_CHIPS[i % VALUE_CHIPS.length]
              return (
                <div key={i} className={`${CARD} ${CARD_HOVER} hv4-fade group p-6`}>
                  <span className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 ${chip}`}>
                    <Icon size={20} strokeWidth={2.2} />
                  </span>
                  <h3 className="text-[15px] font-semibold text-gray-900 mb-1.5">{value.title}</h3>
                  <p className="text-[13px] text-gray-500 leading-relaxed">{value.description}</p>
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
