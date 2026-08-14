"use client"

import { Button } from "@/components/ui/button"
import {
  CheckCircle, FileText, Headphones, Mic,
  Target, NotebookPen, Repeat, CalendarCheck, Flame, Zap, Trophy, Building2
} from "lucide-react"
import { useState, useEffect } from "react"
import Link from "next/link"
import Header from "@/components/shared/Header"
import Footer from "@/components/shared/Footer"
import { useTranslation } from "@/hooks/useTranslation"
import { StudyPhoneMock } from "@/components/marketing/ProductMocks"
import { CARD, CARD_HOVER, WRAP, ts, useReveal } from "@/components/marketing/ui"
import { STUDY_PLANS } from "@/lib/study/plans"

const TEST_FAMILIES = ["SAT", "TOEFL", "TOEIC", "IELTS", "KSAT"]
const P = "landing.studyPage."

export default function StudyLandingPage() {
  const { t, language } = useTranslation()
  const [appUrl, setAppUrl] = useState("https://app.classraum.com")
  useReveal()

  // Set the correct app URL based on environment
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      const { protocol, port } = window.location
      setAppUrl(`${protocol}//app.localhost${port ? ':' + port : ''}`)
    }
  }, [])

  const signupUrl = `${appUrl}/auth?lang=${language}`

  return (
    <div className="min-h-screen bg-background overflow-x-clip">
      <Header currentPage="study" />

      {/* Hero — Study lives in the night band */}
      <header className="bg-gradient-to-b from-[#0b2138] to-[#0e2846] text-white">
        <div className={`${WRAP} py-20 grid md:grid-cols-[1.1fr_0.9fr] gap-12 items-center`}>
          <div className="min-w-0">
            <span className="text-[12.5px] font-semibold tracking-[0.08em] text-[#00D0AE]">
              {ts(t, P + "hero.badge")}
            </span>
            <h1 className="text-[clamp(34px,4.6vw,56px)] font-bold leading-[1.16] tracking-[-0.024em] mt-3">
              {ts(t, P + "hero.title")}
              <br />
              <span className="text-[#00D0AE]">{ts(t, P + "hero.titleHighlight")}</span>
            </h1>
            <p className="text-[#9db3ca] text-base sm:text-[16.5px] leading-[1.75] max-w-[52ch] mt-5 mb-6">
              {ts(t, P + "hero.subtitle")}
            </p>
            <div className="flex flex-wrap gap-2 mb-8">
              {TEST_FAMILIES.map((family) => (
                <span key={family} className="px-3 py-1 bg-white/[0.07] ring-1 ring-white/15 text-[#cfe0f2] text-xs font-semibold rounded-full">
                  {family}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <a href={signupUrl}>
                <Button size="lg" className="text-sm sm:text-base px-6 bg-white text-[#0b2138] hover:bg-white shadow-none">
                  {ts(t, P + "hero.ctaPrimary")}
                </Button>
              </a>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 mt-7 text-[13px] text-[#9db3ca]">
              {(["freeTrial", "anyDevice", "cancelAnytime"] as const).map((k) => (
                <span key={k} className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-[#00D0AE]" />
                  {ts(t, `${P}hero.features.${k}`)}
                </span>
              ))}
            </div>
          </div>
          <div className="min-w-0">
            <StudyPhoneMock t={t} label={ts(t, "landing.home.shots.study")} className="max-w-[260px] mx-auto" />
          </div>
        </div>
      </header>

      {/* ── Test prep: the reason anyone is here. Given the landing
           page's timestamped-rail treatment rather than another centred
           card grid, and shown next to the real phone UI. ──────────── */}
      <section className="py-24">
        <div className={`${WRAP} grid md:grid-cols-[130px_1fr] gap-9`}>
          <div className="md:text-right hv4-fade">
            <b className="block font-mono text-[15px] font-semibold text-primary tabular-nums">01</b>
            <span className="text-xs text-gray-400">{ts(t, P + "testPrep.eyebrow")}</span>
          </div>
          <div className="min-w-0">
            <h2 className="hv4-fade text-[clamp(26px,3.2vw,36px)] font-bold text-[#163e64] leading-[1.16] tracking-tight mb-3">
              {ts(t, P + "testPrep.title")}
            </h2>
            <p className="hv4-fade text-gray-500 leading-[1.75] max-w-[56ch] mb-8">{ts(t, P + "testPrep.description")}</p>
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-5">
              {[
                { key: "fullTests", Icon: FileText },
                { key: "listening", Icon: Headphones },
                { key: "speaking", Icon: Mic },
                { key: "adaptive", Icon: Target },
              ].map(({ key, Icon }) => (
                <div key={key} className="hv4-fade flex gap-3.5">
                  <span className="w-9 h-9 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Icon size={17} strokeWidth={2.2} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-[14.5px] font-semibold text-[#163e64] mb-1">{ts(t, `${P}testPrep.items.${key}.title`)}</h3>
                    <p className="text-[13px] text-gray-500 leading-relaxed">{ts(t, `${P}testPrep.items.${key}.description`)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Review: the night band, borrowed from the landing page. The
           dark section is what breaks four identical white grids into a
           page with a rhythm. ─────────────────────────────────────── */}
      <div className="bg-gradient-to-b from-[#0b2138] to-[#0e2846]">
        <section className="py-24">
          <div className={`${WRAP} grid md:grid-cols-[130px_1fr] gap-9`}>
            <div className="md:text-right hv4-fade">
              <b className="block font-mono text-[15px] font-semibold text-[#00D0AE] tabular-nums">02</b>
              <span className="text-xs text-[#7e97b2]">{ts(t, P + "review.eyebrow")}</span>
            </div>
            <div className="min-w-0">
              <h2 className="hv4-fade text-[clamp(26px,3.2vw,36px)] font-bold text-white leading-[1.16] tracking-tight mb-3">
                {ts(t, P + "review.title")}
              </h2>
              <p className="hv4-fade text-[#9fb3c8] leading-[1.75] max-w-[56ch] mb-8">{ts(t, P + "review.description")}</p>
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { key: "notebook", Icon: NotebookPen },
                  { key: "srs", Icon: Repeat },
                  { key: "daily", Icon: CalendarCheck },
                ].map(({ key, Icon }) => (
                  <div key={key} className="hv4-fade rounded-2xl bg-white/[0.055] ring-1 ring-white/10 p-5">
                    <span className="w-10 h-10 rounded-xl bg-[#00D0AE]/15 text-[#00D0AE] flex items-center justify-center mb-3.5">
                      <Icon size={18} strokeWidth={2.2} />
                    </span>
                    <h3 className="text-[14.5px] font-semibold text-white mb-1.5">{ts(t, `${P}review.items.${key}.title`)}</h3>
                    <p className="text-[13px] text-[#9fb3c8] leading-relaxed">{ts(t, `${P}review.items.${key}.description`)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ── Motivation: the one place a coloured chip earns its keep, so
           it keeps the per-item colours the old version had — but paired
           with the real phone UI instead of floating in a grid. ────── */}
      <section className="py-24">
        <div className={`${WRAP} grid md:grid-cols-[130px_1fr] gap-9`}>
          <div className="md:text-right hv4-fade">
            <b className="block font-mono text-[15px] font-semibold text-primary tabular-nums">03</b>
            <span className="text-xs text-gray-400">{ts(t, P + "motivation.eyebrow")}</span>
          </div>
          <div className="min-w-0">
            <h2 className="hv4-fade text-[clamp(26px,3.2vw,36px)] font-bold text-[#163e64] leading-[1.16] tracking-tight mb-8">
              {ts(t, P + "motivation.title")}
            </h2>
            <div className="grid md:grid-cols-[1fr_240px] gap-8 items-center">
              <div className="space-y-5">
                {[
                  { key: "streaks", Icon: Flame, chip: "bg-amber-50 text-amber-500" },
                  { key: "xp", Icon: Zap, chip: "bg-purple-50 text-purple-500" },
                  { key: "league", Icon: Trophy, chip: "bg-emerald-50 text-emerald-600" },
                ].map(({ key, Icon, chip }) => (
                  <div key={key} className="hv4-fade flex gap-3.5">
                    <span className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center ${chip}`}>
                      <Icon size={17} strokeWidth={2.2} />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-[14.5px] font-semibold text-[#163e64] mb-1">{ts(t, `${P}motivation.items.${key}.title`)}</h3>
                      <p className="text-[13px] text-gray-500 leading-relaxed">{ts(t, `${P}motivation.items.${key}.description`)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <StudyPhoneMock t={t} label={ts(t, "landing.home.shots.study")} className="hv4-fade hidden md:block" />
            </div>
          </div>
        </div>
      </section>

      {/* Pricing — cards read live from STUDY_PLANS so the marketing page
          can never drift from what checkout actually charges. */}
      <section className="pb-20" id="pricing">
        <div className={WRAP}>
          <div className="text-center max-w-[640px] mx-auto mb-12">
            <span className="text-[12.5px] font-semibold tracking-[0.08em] text-primary">{ts(t, P + "pricing.eyebrow")}</span>
            <h2 className="hv4-fade text-[clamp(26px,3.2vw,36px)] font-bold text-[#163e64] leading-[1.16] tracking-tight mt-3 mb-3">
              {ts(t, P + "pricing.title")}
            </h2>
            <p className="text-gray-500 text-[14.5px] leading-[1.75]">{ts(t, P + "pricing.subtitle")}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto items-stretch">
            {[
              { plan: STUDY_PLANS.general_v1, key: "general", featured: false },
              { plan: STUDY_PLANS.premium_v1, key: "premium", featured: true },
              { plan: STUDY_PLANS.premium_plus_v1, key: "premiumPlus", featured: false },
            ].map(({ plan, key, featured }) => (
              <div
                key={key}
                className={`${CARD} ${CARD_HOVER} hv4-fade relative p-6 flex flex-col ${
                  featured ? "ring-2 ring-primary shadow-[0_12px_32px_-12px_rgba(40,133,232,0.35)]" : ""
                }`}
              >
                {featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-white text-[11px] font-bold whitespace-nowrap">
                    {ts(t, P + "pricing.popular")}
                  </span>
                )}
                <h3 className="text-[15px] font-bold text-gray-900">
                  {language === "korean" ? plan.name_ko : plan.name_en}
                </h3>
                <p className="text-[12.5px] text-gray-500 mt-0.5 mb-4">{ts(t, `${P}pricing.plans.${key}.blurb`)}</p>
                <div className="mb-4">
                  <span className="text-[28px] font-bold text-[#163e64] tabular-nums">
                    ₩{plan.priceWon.toLocaleString()}
                  </span>
                  <span className="text-[13px] text-gray-400 font-medium">{ts(t, P + "pricing.perMonth")}</span>
                </div>
                <div className="text-[12.5px] font-semibold text-primary mb-4">
                  {String(t(P + "pricing.creditsPerMonth", { count: plan.monthlyCredits }))}
                </div>
                <ul className="space-y-2.5 mb-6 flex-1">
                  {["f1", "f2", "f3"].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13px] text-gray-600 leading-relaxed">
                      <CheckCircle size={15} strokeWidth={2.2} className="text-[#00b894] mt-0.5 shrink-0" />
                      {ts(t, `${P}pricing.plans.${key}.${f}`)}
                    </li>
                  ))}
                </ul>
                <a href={signupUrl} className="mt-auto">
                  <Button variant={featured ? "default" : "outline"} className="w-full text-sm">
                    {ts(t, P + "pricing.cta")}
                  </Button>
                </a>
              </div>
            ))}
          </div>
          <p className="text-center text-[13px] text-gray-500 mt-6">{ts(t, P + "pricing.annualNote")}</p>
        </div>
      </section>

      {/* CTA + academy bridge */}
      <section className="pb-24">
        <div className={WRAP}>
          <div className="text-center hv4-fade mb-14">
            <h2 className="text-[clamp(28px,3.6vw,42px)] font-bold text-[#163e64] leading-[1.16] tracking-tight mb-3">
              {ts(t, P + "cta.title")}
            </h2>
            <p className="text-gray-500 leading-[1.75] max-w-[44ch] mx-auto mb-8">{ts(t, P + "cta.description")}</p>
            <a href={signupUrl}>
              <Button size="lg" className="text-sm sm:text-base px-6">
                {ts(t, P + "cta.button")}
              </Button>
            </a>
          </div>

          <div className={`${CARD} hv4-fade flex flex-col sm:flex-row items-start sm:items-center gap-4 px-6 py-5 max-w-3xl mx-auto`}>
            <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Building2 size={18} strokeWidth={2.2} />
            </span>
            <div className="flex-1">
              <h3 className="text-[15px] font-bold text-[#163e64]">{ts(t, P + "bridge.title")}</h3>
              <p className="text-[13.5px] text-gray-500 mt-0.5">{ts(t, P + "bridge.description")}</p>
            </div>
            <Link href="/" className="shrink-0">
              <Button variant="outline" className="text-sm">
                {ts(t, P + "bridge.cta")}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
