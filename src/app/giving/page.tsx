"use client"

import Header from "@/components/shared/Header"
import Footer from "@/components/shared/Footer"
import { Gift, Heart, Check, ArrowUpRight } from "lucide-react"
import { useTranslation } from "@/hooks/useTranslation"
import { languages } from "@/locales"

/* The Giving page.
 *
 * Adapted from a standalone HTML draft (classraum-giving-back_2.html). The
 * draft carried its own identity — Lora serif, a navy/teal palette, its own
 * header and footer — and none of that came across: the site already has a
 * design system, and a marketing page in a second visual language reads as
 * a page from a different company. What came across is the CONTENT, and the
 * one structural idea worth keeping: two entries, each with a short factual
 * body, a sentence naming what was actually given, and three facts.
 *
 * Copy lives in locales under landing.giving so the page is bilingual like
 * every other marketing route. The draft was English-only.
 */

type Entry = {
  key: "occ" | "victree"
  Icon: typeof Gift
  href: string
}

const ENTRIES: readonly Entry[] = [
  { key: "occ", Icon: Gift, href: "https://www.samaritanspurse.org/operation-christmas-child/" },
  { key: "victree", Icon: Heart, href: "http://victree.or.kr/" },
]

export default function GivingPage() {
  const { t, language } = useTranslation()

  // The locale files hold arrays (body paragraphs, and [value, label] fact
  // pairs). useTranslation returns strings, so arrays are read directly.
  const pick = (path: string): unknown => {
    let cur: unknown = languages[language]
    for (const part of path.split(".")) {
      cur = (cur as Record<string, unknown> | undefined)?.[part]
    }
    return cur
  }
  const strings = (path: string): string[] => {
    const v = pick(path)
    return Array.isArray(v) ? (v as string[]) : []
  }
  const facts = (path: string): Array<[string, string]> => {
    const v = pick(path)
    return Array.isArray(v) ? (v as Array<[string, string]>) : []
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-background">
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          {/* Hero */}
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary mb-4">
            {t("landing.giving.eyebrow")}
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 mb-6">
            {t("landing.giving.title")}
          </h1>
          {/* The lead names the amount, and is the only place the draft used
              bold. dangerouslySetInnerHTML is used for that one <strong>;
              the string is ours, from the locale file, not user input. */}
          <p
            className="text-lg leading-relaxed text-gray-700 mb-6"
            dangerouslySetInnerHTML={{ __html: t("landing.giving.lead") }}
          />
          <div className="space-y-4 text-[15px] leading-relaxed text-gray-600">
            {strings("landing.giving.body").map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>

          <hr className="my-10 h-0.5 w-16 border-0 bg-primary rounded-full" />

          {/* Entries */}
          <div className="space-y-5">
            {ENTRIES.map(({ key, Icon, href }) => (
              <section
                key={key}
                className="rounded-2xl bg-white ring-1 ring-gray-200 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-6 sm:p-8"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex-shrink-0 w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" strokeWidth={1.9} />
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <h2 className="text-lg font-semibold text-gray-900 leading-snug">
                      {t(`landing.giving.${key}.org`)}
                    </h2>
                    <p className="text-[13px] text-gray-500 mt-0.5">
                      {t(`landing.giving.${key}.sub`)}
                    </p>
                  </div>
                </div>

                <p className="text-[14.5px] leading-relaxed text-gray-600 mb-3">
                  {t(`landing.giving.${key}.body`)}
                </p>
                <p className="text-[14.5px] leading-relaxed text-gray-600">
                  {t(`landing.giving.${key}.gift`)}
                </p>

                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-4 mt-5 pt-5 border-t border-gray-100">
                  {/* dt is the label and dd the value, which is the correct
                      pairing; flex-col-reverse shows the value above the
                      label without duplicating either. The first version had
                      an sr-only dt AND a visible label, so a screen reader
                      read every label twice. */}
                  {facts(`landing.giving.${key}.facts`).map(([value, label]) => (
                    <div key={label} className="flex flex-col-reverse">
                      <dt className="text-[11px] text-gray-500 leading-snug mt-0.5">
                        {label}
                      </dt>
                      <dd className="text-[16px] font-semibold text-gray-900 leading-tight">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>

                <div className="flex flex-wrap items-center justify-between gap-3 mt-5">
                  <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-gray-700 bg-gray-100 rounded-full px-3 py-1.5">
                    <Check className="w-3.5 h-3.5 text-primary" strokeWidth={2.6} />
                    {t("landing.giving.donationMade")}
                  </span>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-primary hover:underline"
                  >
                    {t("landing.giving.learnMore")}
                    <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.4} />
                  </a>
                </div>
              </section>
            ))}
          </div>

          {/* Closing */}
          <div className="mt-12">
            <p className="text-[15px] leading-relaxed text-gray-600">
              {t("landing.giving.closing")}
            </p>
            <p className="mt-6 text-[15px] italic text-gray-700">
              {t("landing.giving.signoff")}
            </p>
          </div>
        </main>
      </div>
      <Footer />
    </>
  )
}
