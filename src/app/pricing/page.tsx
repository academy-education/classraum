"use client"

import { Button } from "@/components/ui/button"
import { Check, Sparkles, Layers, HeadphonesIcon } from "lucide-react"
import { useState, useEffect } from "react"
import Header from "@/components/shared/Header"
import Footer from "@/components/shared/Footer"
import { useTranslation } from "@/hooks/useTranslation"
import { CARD, CARD_HOVER, WRAP, ts, useReveal } from "@/components/marketing/ui"

export default function PricingPage() {
  const { t, tList, language } = useTranslation()
  const [appUrl, setAppUrl] = useState("https://app.classraum.com")
  useReveal()

  const plans = [
    {
      name: t('pricing.plans.individual.name'),
      price: t('pricing.plans.individual.price'),
      period: t('pricing.plans.individual.period'),
      description: t('pricing.plans.individual.description'),
      features: tList('pricing.plans.individual.features'),
      additionalCosts: tList('pricing.plans.individual.additionalCosts'),
      cta: t('pricing.plans.individual.cta')
    },
    {
      name: t('pricing.plans.smallAcademy.name'),
      price: t('pricing.plans.smallAcademy.price'),
      period: t('pricing.plans.smallAcademy.period'),
      description: t('pricing.plans.smallAcademy.description'),
      features: tList('pricing.plans.smallAcademy.features'),
      additionalCosts: tList('pricing.plans.smallAcademy.additionalCosts'),
      cta: t('pricing.plans.smallAcademy.cta')
    },
    {
      name: t('pricing.plans.mediumAcademy.name'),
      price: t('pricing.plans.mediumAcademy.price'),
      period: t('pricing.plans.mediumAcademy.period'),
      description: t('pricing.plans.mediumAcademy.description'),
      badge: t('pricing.plans.mediumAcademy.badge'),
      features: tList('pricing.plans.mediumAcademy.features'),
      additionalCosts: tList('pricing.plans.mediumAcademy.additionalCosts'),
      cta: t('pricing.plans.mediumAcademy.cta')
    },
    {
      name: t('pricing.plans.largeAcademy.name'),
      price: t('pricing.plans.largeAcademy.price'),
      period: t('pricing.plans.largeAcademy.period'),
      description: t('pricing.plans.largeAcademy.description'),
      features: tList('pricing.plans.largeAcademy.features'),
      additionalCosts: tList('pricing.plans.largeAcademy.additionalCosts'),
      cta: t('pricing.plans.largeAcademy.cta')
    }
  ]

  const benefits = [
    { key: "aiManagement", Icon: Sparkles, chip: "bg-blue-50 text-primary", dot: "bg-primary" },
    { key: "unifiedPlatform", Icon: Layers, chip: "bg-purple-50 text-purple-500", dot: "bg-purple-400" },
    { key: "expertSupport", Icon: HeadphonesIcon, chip: "bg-[#00D0AE]/10 text-[#00a98d]", dot: "bg-[#00D0AE]" },
  ]

  // Set the correct app URL based on environment
  useEffect(() => {
    if (window.location.hostname === 'localhost') {
      const { protocol, port } = window.location
      setAppUrl(`${protocol}//app.localhost${port ? ':' + port : ''}`)
    }
  }, [])

  const signupUrl = `${appUrl}/auth?lang=${language}`

  return (
    <div className="min-h-screen bg-background overflow-x-clip">
      <Header currentPage="pricing" />

      {/* Hero */}
      <header className="relative pt-20 pb-12 text-center">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(560px 260px at 50% -40px, rgba(40,133,232,.06), transparent 70%)" }}
        />
        <div className={`relative ${WRAP}`}>
          <h1 className="text-[clamp(34px,4.6vw,56px)] font-bold text-[#163e64] leading-[1.16] tracking-[-0.024em]">
            {ts(t, 'pricing.hero.title')}
          </h1>
          <p className="text-gray-500 text-base sm:text-[16.5px] leading-[1.75] max-w-[52ch] mx-auto mt-5">
            {ts(t, 'pricing.hero.subtitle')}
          </p>
          <p className="text-[13px] text-gray-400 mt-4 tabular-nums">{ts(t, 'landing.pricingExtras.anchor')}</p>
        </div>
      </header>

      <main className={WRAP}>
        {/* Free tier strip — the app has a real free plan; lead with it */}
        <section className="mb-10">
          <div className={`${CARD} hv4-fade flex flex-col sm:flex-row items-start sm:items-center gap-4 px-6 py-5`}>
            <div className="flex-1">
              <h2 className="text-[16px] font-bold text-[#163e64]">{ts(t, 'landing.pricingExtras.freeTitle')}</h2>
              <p className="text-[13.5px] text-gray-500 mt-0.5">{ts(t, 'landing.pricingExtras.freeDesc')}</p>
            </div>
            <a href={signupUrl} className="shrink-0">
              <Button variant="outline" className="text-sm">
                {ts(t, 'landing.pricingExtras.freeCta')}
              </Button>
            </a>
          </div>
        </section>

        {/* Plan cards */}
        <section className="mb-24">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((plan, index) => {
              const popular = index === 2
              return (
                <div
                  key={index}
                  className={`${CARD} ${CARD_HOVER} hv4-fade relative flex flex-col p-6 ${
                    popular ? "ring-2 ring-primary" : ""
                  }`}
                >
                  {popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
                      {plan.badge as string}
                    </span>
                  )}
                  <h3 className="text-[15px] font-bold text-[#163e64]">{plan.name as string}</h3>
                  <p className="text-[12.5px] text-gray-400 mb-4">{plan.description as string}</p>
                  <div className="flex items-baseline gap-1 mb-5">
                    <span className="text-[26px] font-bold text-[#163e64] tracking-tight tabular-nums">
                      {plan.price as string}
                    </span>
                    <span className="text-[13px] text-gray-400">{plan.period as string}</span>
                  </div>
                  <ul className="space-y-2.5 mb-6 flex-grow">
                    {(Array.isArray(plan.features) ? plan.features : []).map((feature, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <Check className="w-3.5 h-3.5 text-[#00a98d] shrink-0 mt-0.5" strokeWidth={2.6} />
                        <span className="text-gray-600 text-[13px] leading-snug">{feature as string}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mb-4 space-y-0.5">
                    {(Array.isArray(plan.additionalCosts) ? plan.additionalCosts : []).map((cost, i) => (
                      <p key={i} className="text-[11px] text-gray-400 tabular-nums">{cost as string}</p>
                    ))}
                  </div>
                  <a href={signupUrl}>
                    <Button className="w-full text-sm" variant={popular ? "default" : "outline"}>
                      {plan.cta as string}
                    </Button>
                  </a>
                </div>
              )
            })}
          </div>
        </section>

        {/* Enterprise */}
        <section className="mb-24">
          <div className={`${CARD} hv4-fade text-center px-8 py-12 max-w-3xl mx-auto`}>
            <h3 className="text-[clamp(22px,2.6vw,30px)] font-bold text-[#163e64] leading-[1.16] tracking-tight mb-3">
              {ts(t, 'pricing.enterprise.title')}
            </h3>
            <p className="text-gray-500 leading-[1.75] mb-7 max-w-[48ch] mx-auto">
              {ts(t, 'pricing.enterprise.description')}
            </p>
            <a href="mailto:support@classraum.com?subject=Enterprise Inquiry" className="inline-block">
              <Button variant="outline" size="lg" className="text-base px-8">
                {ts(t, 'pricing.enterprise.cta')}
              </Button>
            </a>
          </div>
        </section>

      </main>

      {/* Benefits */}
      <section className="py-20 bg-[#f8fafc] border-t border-gray-100">
        <div className={WRAP}>
          <div className="text-center max-w-[640px] mx-auto mb-12">
            <h2 className="hv4-fade text-[clamp(26px,3.2vw,36px)] font-bold text-[#163e64] leading-[1.16] tracking-tight mb-3">
              {ts(t, 'pricing.benefits.title')}
            </h2>
            <p className="hv4-fade text-gray-500 leading-[1.75]">{ts(t, 'pricing.benefits.subtitle')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {benefits.map(({ key, Icon, chip, dot }) => (
              <div key={key} className={`${CARD} ${CARD_HOVER} hv4-fade group p-7 flex flex-col`}>
                <span
                  className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 ${chip}`}
                >
                  <Icon size={20} strokeWidth={2.2} />
                </span>
                <h3 className="text-[15.5px] font-semibold text-gray-900 mb-1.5">
                  {ts(t, `pricing.benefits.${key}.title`)}
                </h3>
                <p className="text-[13.5px] text-gray-500 leading-relaxed mb-5">
                  {ts(t, `pricing.benefits.${key}.description`)}
                </p>
                <ul className="space-y-2.5 mt-auto border-t border-gray-100 pt-4">
                  {[0, 1, 2].map((i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[13px] text-gray-600">
                      <s className={`w-1.5 h-1.5 rounded-full no-underline shrink-0 mt-1.5 ${dot}`} />
                      {ts(t, `pricing.benefits.${key}.features.${i}`)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
