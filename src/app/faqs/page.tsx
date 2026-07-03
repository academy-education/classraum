"use client"

import { Button } from "@/components/ui/button"
import { ChevronDown, School, Users, Download, Clock, Eye, CreditCard, Smartphone, Baby, Shield, HelpCircle, GraduationCap } from "lucide-react"
import { useState } from "react"
import Header from "@/components/shared/Header"
import Footer from "@/components/shared/Footer"
import { useTranslation } from "@/hooks/useTranslation"
import { languages } from "@/locales"
import { CARD, WRAP, ts, useReveal } from "@/components/marketing/ui"

export default function FAQsPage() {
  const { t, language } = useTranslation()
  const [openFAQ, setOpenFAQ] = useState<number | null>(null)
  useReveal()

  // Access FAQ data directly from translations
  const translations = languages[language]
  const faqData = translations.faqs?.questions || []
  const icons = [School, Users, Download, Clock, Eye, CreditCard, Smartphone, Baby, Shield, HelpCircle, GraduationCap]

  const faqs = faqData.map((faq: { id: number; question: string; answer: string }, index: number) => ({
    ...faq,
    icon: icons[index] || HelpCircle,
  }))

  const toggleFAQ = (id: number) => {
    setOpenFAQ(openFAQ === id ? null : id)
  }

  return (
    <div className="min-h-screen bg-background overflow-x-clip">
      <Header currentPage="faqs" />

      {/* Hero */}
      <header className="relative pt-20 pb-14 text-center">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(560px 260px at 50% -40px, rgba(40,133,232,.06), transparent 70%)" }}
        />
        <div className={`relative ${WRAP}`}>
          <h1 className="text-[clamp(34px,4.6vw,56px)] font-bold text-[#163e64] leading-[1.16] tracking-[-0.024em]">
            {ts(t, 'faqs.hero.title')}
          </h1>
          <p className="text-gray-500 text-base sm:text-[16.5px] leading-[1.75] max-w-[52ch] mx-auto mt-5">
            {ts(t, 'faqs.hero.subtitle')}
          </p>
        </div>
      </header>

      <main className={WRAP}>
        {/* Accordion */}
        <section className="mb-20">
          <div className={`${CARD} hv4-fade max-w-3xl mx-auto overflow-hidden`}>
            {faqs.map((faq) => {
              const open = openFAQ === faq.id
              return (
                <div key={faq.id} className="border-b border-gray-100 last:border-0">
                  <button
                    onClick={() => toggleFAQ(faq.id)}
                    aria-expanded={open}
                    className="w-full px-5 sm:px-7 py-5 text-left flex items-center gap-4 hover:bg-[#f8fafc] transition-colors"
                  >
                    <span
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        open ? "bg-primary text-white" : "bg-primary/10 text-primary"
                      }`}
                    >
                      <faq.icon size={16} strokeWidth={2.2} />
                    </span>
                    <span className={`flex-1 text-[15px] font-semibold transition-colors ${open ? "text-primary" : "text-[#163e64]"}`}>
                      {faq.question}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`shrink-0 text-gray-400 transition-transform duration-200 ${open ? "rotate-180 text-primary" : ""}`}
                    />
                  </button>
                  {open && (
                    <div className="px-5 sm:px-7 pb-6 pl-[72px] sm:pl-[80px]">
                      <p className="text-[14px] text-gray-500 leading-[1.8]">{faq.answer}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* Still have questions */}
        <section className="pb-24">
          <div className={`${CARD} hv4-fade text-center px-8 py-12 max-w-3xl mx-auto`}>
            <h2 className="text-[clamp(22px,2.6vw,30px)] font-bold text-[#163e64] leading-[1.16] tracking-tight mb-3">
              {ts(t, 'faqs.support.title')}
            </h2>
            <p className="text-gray-500 leading-[1.75] mb-7 max-w-[48ch] mx-auto">{ts(t, 'faqs.support.description')}</p>
            <a href="mailto:support@classraum.com">
              <Button size="lg" className="text-base px-8">
                {ts(t, 'faqs.support.cta')}
              </Button>
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
