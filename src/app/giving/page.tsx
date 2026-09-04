"use client"

import Header from "@/components/shared/Header"
import Footer from "@/components/shared/Footer"
import { Check, ArrowUpRight } from "lucide-react"
import { useState } from "react"
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
  href: string
  /** null when the organisation has no mark of its own to show. */
  logo: string | null
  /** Used when `logo` is null, and as the fallback if a file goes missing. */
  monogram: string
}

const ENTRIES: readonly Entry[] = [
  {
    key: "occ",
    href: "https://www.samaritanspurse.org/operation-christmas-child/",
    // Official file from Samaritan's Purse's own printable-resources page,
    // used with their written permission (2026-09-04). Downscaled
    // proportionally 1200 -> 192; their style guide forbids distorting the
    // mark or changing its proportions, and requires the (R), which is part
    // of the artwork itself rather than something we add.
    logo: "/giving/samaritans-purse.png",
    monogram: "SP",
  },
  {
    key: "victree",
    href: "http://victree.or.kr/",
    // Their own header wordmark from victree.or.kr, at native 269x54. Not
    // upscaled: it is already small and enlarging it would only soften it.
    // The ~5:1 shape against OCC's 1:1 is why OrgMark constrains height.
    logo: "/giving/victree.png",
    monogram: "빅",
  },
]

/* An organisation's own mark, rendered as a LOCKUP.
 *
 * The two marks have very different shapes — Operation Christmas Child is a
 * 1:1 roundel, Victree is a ~5:1 horizontal wordmark — so the box constrains
 * HEIGHT and lets width fall out. Forcing both into the same square made the
 * wordmark render as a sliver, which is the usual reason logo rows look
 * broken. Nothing is boxed, ringed or padded: a mark on its own ground reads
 * as the organisation's, a mark in our chrome reads as our badge for them.
 */
function OrgMark({ src, monogram, name }: { src: string | null; monogram: string; name: string }) {
  const [failed, setFailed] = useState(false)
  // onError ALONE is not enough. The browser fetches the image from the
  // server-rendered HTML and fires its error event before hydration attaches
  // the React handler, so a missing file left a broken-image box on screen
  // with `failed` still false. The ref callback catches that case: an image
  // that is already `complete` with `naturalWidth === 0` has failed.
  const check = (el: HTMLImageElement | null) => {
    if (el && el.complete && el.naturalWidth === 0) setFailed(true)
  }
  if (!src || failed) {
    return (
      <div
        aria-hidden
        className="h-14 min-w-[56px] px-4 rounded-xl bg-gray-100 ring-1 ring-gray-200 inline-flex items-center justify-center text-lg font-semibold text-gray-500 select-none"
      >
        {monogram}
      </div>
    )
  }
  return (
    // A plain img, not next/image: the fallback needs onError, and next/image
    // renders its own broken-image box on a missing file.
    <img
      ref={check}
      src={src}
      alt={`${name} logo`}
      onError={() => setFailed(true)}
      className="h-14 w-auto max-w-[260px] object-contain object-left"
    />
  )
}

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
      <Header currentPage="giving" />
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

          {/* Summary strip. A giving page's first question is "how much, when,
              to whom" — the prose answers it in the third sentence, this
              answers it at a glance. Values sit above labels, tabular so the
              figures align. */}
          <dl className="mt-10 mb-9 grid grid-cols-3 gap-px overflow-hidden rounded-2xl bg-gray-200 ring-1 ring-gray-200">
            {facts("landing.giving.stats").map(([value, label]) => (
              <div key={label} className="flex flex-col-reverse bg-white px-4 py-4 sm:px-5 sm:py-5">
                <dt className="text-[11.5px] text-gray-500 leading-snug mt-1">{label}</dt>
                <dd className="text-[17px] sm:text-[19px] font-semibold text-gray-900 leading-tight tabular-nums">
                  {value}
                </dd>
              </div>
            ))}
          </dl>

          {/* Entries */}
          <div className="space-y-5">
            {ENTRIES.map(({ key, href, logo, monogram }) => (
              <section
                key={key}
                className="rounded-2xl bg-white ring-1 ring-gray-200 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-6 sm:p-8"
              >
                {/* The mark gets its own row rather than a slot beside the
                    heading: the two are different shapes, and a row lets each
                    sit at its natural width without the heading jumping. */}
                <div className="flex items-center justify-between gap-4 pb-5 mb-5 border-b border-gray-100">
                  <OrgMark src={logo} monogram={monogram} name={t(`landing.giving.${key}.org`)} />
                  <span className="flex-shrink-0 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-gray-400">
                    {t("landing.giving.orgLabel")}
                  </span>
                </div>
                <h2 className="text-[19px] font-semibold text-gray-900 leading-snug">
                  {t(`landing.giving.${key}.org`)}
                </h2>
                <p className="text-[13px] text-gray-500 mt-1 mb-4">
                  {t(`landing.giving.${key}.sub`)}
                </p>

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
