"use client"

/**
 * /camp — the school-partnership program page, built from the SAT Camp
 * deck.
 *
 * TABS, not separate routes. Andy asked for "camp on the menu, SAT as a
 * tab": the offering is Camp, and SAT is the first programme inside it.
 * TOEFL is rendered as a DISABLED tab labelled "coming soon" rather
 * than a live one — the study bank supports TOEFL, but a TOEFL Camp is
 * not a thing a school can buy today, and this page is what a school
 * reads before signing. Two feature claims on other pages have already
 * had to be pulled this week for exactly that (Snap on /study and
 * /about).
 *
 * SAMPLE DATA IS LABELLED AS SAMPLE. The dashboard numbers (48
 * students, 91%, 1,240) and the skill bars come from the deck and are
 * illustrative. The deck marks them; so does this page, in the same
 * places. They must not be quietly promoted to "results".
 */

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Check, ArrowRight, Plus } from "lucide-react"
import Header from "@/components/shared/Header"
import Footer from "@/components/shared/Footer"
import { useTranslation } from "@/hooks/useTranslation"
import { languages } from "@/locales"
import { CARD, CARD_HOVER, WRAP, ts, useReveal } from "@/components/marketing/ui"
import { PathMascot } from "@/app/mobile/study/_shared/PathMascot"
import { QuestionGraphicView } from "@/app/mobile/study/session/[id]/test/QuestionGraphicView"
import { SAT_SAMPLES } from "@/components/marketing/satSamples"

const C = "landing.camp."

/* Same constant the landing page uses. There is no /contact route, and
 * this page's primary CTA is the one thing on it that must not 404. */
const INQUIRY_URL = "mailto:support@classraum.com"

type Step = { t: string; d: string; b?: string[] }
type Tile = { t: string; d: string }

export default function CampPage() {
  const { t, language } = useTranslation()
  useReveal()
  const [tab, setTab] = useState<"sat" | "toefl">("sat")

  // Arrays come straight off the locale object — t() flattens them.
  const L = languages[language] as unknown as Record<string, never>
  const camp = (L as unknown as { landing: { camp: Record<string, never> } }).landing.camp
  const g = <T,>(path: string): T => path.split(".").reduce<unknown>((a, k) => (a as Record<string, unknown>)?.[k], camp) as T

  const heroChips = g<string[]>("hero.chips")
  const steps = g<Step[]>("cycle.steps")
  const loop = g<string[]>("cycle.loop")
  const stats = g<{ l: string; v: string; s: string }[]>("dash.stats")
  const legend = g<{ l: string; v: string }[]>("dash.legend")
  const dashRows = g<{ t: string; g: string }[]>("dash.rows")
  const dashTiles = g<Tile[]>("dash.tiles")
  const opts = g<string[]>("student.opts")
  const skills = g<[string, number][]>("student.skills")
  const actions = g<Tile[]>("student.actions")
  const schoolList = g<string[]>("provides.school")
  const usList = g<string[]>("provides.us")
  const why = g<Tile[]>("provides.why")
  const onePlatform = g<string[]>("provides.one")
  const formats = g<Tile[]>("model.formats")
  const implSteps = g<Tile[]>("model.steps")
  const ctaChips = g<string[]>("cta.chips")

  return (
    <div className="min-h-screen bg-background overflow-x-clip">
      <Header currentPage="camp" />

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <header className="relative pt-16 pb-14">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(620px 300px at 50% -60px, rgba(40,133,232,.07), transparent 70%)" }}
        />
        <div className={`relative ${WRAP}`}>
          {/* programme tabs */}
          <div className="hv4-fade flex justify-center gap-2 mb-9">
            <button
              type="button"
              onClick={() => setTab("sat")}
              aria-pressed={tab === "sat"}
              className={`text-[13.5px] font-semibold rounded-full px-4 py-2 transition-colors duration-200 ${
                tab === "sat" ? "bg-primary text-white shadow-[0_8px_18px_-10px_rgba(40,133,232,0.8)]"
                              : "bg-white text-gray-500 ring-1 ring-gray-200 hover:text-primary"
              }`}
            >
              {ts(t, C + "tabs.sat")}
            </button>
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="text-[13.5px] font-semibold rounded-full px-4 py-2 bg-gray-50 text-gray-400 ring-1 ring-gray-200 cursor-not-allowed inline-flex items-center gap-2"
            >
              {ts(t, C + "tabs.toefl")}
              <span className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-gray-400">
                {ts(t, C + "tabs.soon")}
              </span>
            </button>
          </div>

          <div className="text-center max-w-[760px] mx-auto">
            <span className="hv4-fade inline-block text-[12px] font-bold tracking-[0.12em] text-primary mb-4">
              {ts(t, C + "hero.eyebrow")}
            </span>
            <h1 className="hv4-fade text-[clamp(32px,4.4vw,52px)] font-bold text-[#163e64] leading-[1.14] tracking-[-0.022em]">
              {ts(t, C + "hero.title1")}{" "}
              <span className="bg-gradient-to-r from-[#2885e8] to-[#00D0AE] bg-clip-text text-transparent">
                {ts(t, C + "hero.titleAccent")}
              </span>{" "}
              {ts(t, C + "hero.title2")}
            </h1>
            <p className="hv4-fade text-gray-500 text-base sm:text-[16.5px] leading-[1.75] max-w-[62ch] mx-auto mt-6">
              {ts(t, C + "hero.sub")}
            </p>
            <div className="hv4-fade flex flex-wrap justify-center gap-2 mt-7">
              {heroChips.map(c => (
                <span key={c} className="text-[12.5px] font-semibold text-[#163e64] bg-white ring-1 ring-gray-200 rounded-full px-3.5 py-1.5">
                  {c}
                </span>
              ))}
            </div>
            {/* Raumi, as in the deck. The real mascot component the app
                ships — Rive-backed with an SVG fallback — not a picture
                of one. `celebrate` is the state the deck's pose reads as. */}
            <div className="hv4-fade flex items-center justify-center gap-3 mt-9">
              <span className="camp-float shrink-0">
                <PathMascot state="celebrate" size={76} />
              </span>
              <span className="text-left text-[13.5px] font-semibold text-[#163e64] bg-white ring-1 ring-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 max-w-[260px] shadow-[0_8px_20px_-14px_rgba(22,62,100,0.5)]">
                {ts(t, C + "raumi.meet")}
              </span>
            </div>

            <div className="hv4-fade flex flex-wrap justify-center gap-3 mt-8">
              <a href={INQUIRY_URL}><Button size="lg" className="text-sm sm:text-base px-6">{ts(t, C + "hero.cta")}</Button></a>
              <Link href="/features"><Button size="lg" variant="outline" className="text-sm sm:text-base px-6">{ts(t, C + "hero.ctaAlt")}</Button></Link>
            </div>
          </div>

          {/* school + us */}
          <div className="grid md:grid-cols-[1fr_auto_1fr] items-center gap-4 mt-14">
            <div className={`${CARD} hv4-fade p-6`}>
              <h3 className="text-[15px] font-bold text-[#163e64] mb-1.5">{ts(t, C + "hero.schoolTitle")}</h3>
              <p className="text-[13.5px] text-gray-600 leading-[1.7]">{ts(t, C + "hero.schoolBody")}</p>
            </div>
            <span className="hidden md:flex w-9 h-9 rounded-full bg-[#00D0AE]/15 text-[#00806c] items-center justify-center shrink-0">
              <Plus size={17} strokeWidth={2.6} />
            </span>
            <div className={`${CARD} hv4-fade p-6`}>
              <h3 className="text-[15px] font-bold text-[#163e64] mb-1.5">{ts(t, C + "hero.usTitle")}</h3>
              <p className="text-[13.5px] text-gray-600 leading-[1.7]">{ts(t, C + "hero.usBody")}</p>
            </div>
          </div>
          <p className="hv4-fade mt-4 border-l-[3px] border-[#00D0AE] bg-[#00D0AE]/[0.07] rounded-r-xl px-5 py-4 text-[15px] font-bold text-[#163e64]">
            {ts(t, C + "hero.quote")}
          </p>
        </div>
      </header>

      <main className={WRAP}>
        {/* ── The cycle ──────────────────────────────────────────── */}
        <section className="mb-20 md:mb-24">
          <SectionHead t={t} eyebrow={C + "cycle.eyebrow"} title={C + "cycle.title"} sub={C + "cycle.sub"} />
          <div className="grid sm:grid-cols-2 gap-4">
            {steps.map((s, i) => (
              <div key={s.t} className={`${CARD} ${CARD_HOVER} hv4-fade p-6`} style={{ transitionDelay: `${i * 60}ms` }}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2885e8] to-[#00D0AE] text-white text-[13px] font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <h3 className="text-[17px] font-bold text-[#163e64]">{s.t}</h3>
                </div>
                <p className="text-[13.5px] text-gray-600 leading-[1.7] mb-3">{s.d}</p>
                <ul className="space-y-1.5">
                  {(s.b ?? []).map(b => (
                    <li key={b} className="flex items-start gap-2.5 text-[13px] text-gray-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-[7px]" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <h3 className="hv4-fade text-[15px] font-bold text-[#163e64] mt-9 mb-3">{ts(t, C + "cycle.loopTitle")}</h3>
          <div className="hv4-fade flex flex-wrap gap-2">
            {loop.map((l, i) => (
              <span key={l} className="camp-loop-step inline-flex items-center gap-2 text-[12.5px] font-bold uppercase tracking-[0.06em] text-[#163e64] ring-1 ring-blue-100 rounded-full px-3.5 py-2"
                    style={{ animationDelay: `${i * 0.8}s` }}>
                {l}
                {i < loop.length - 1 && <ArrowRight size={12} className="text-primary/50" />}
              </span>
            ))}
          </div>
          <p className="hv4-fade mt-5 border-l-[3px] border-primary bg-blue-50/50 rounded-r-xl px-5 py-4 text-[15px] font-bold text-[#163e64]">
            {ts(t, C + "cycle.quote")}
          </p>
        </section>

        {/* ── Admin dashboard ────────────────────────────────────── */}
        <section className="mb-20 md:mb-24">
          <SectionHead t={t} eyebrow={C + "dash.eyebrow"} title={C + "dash.title"} sub={C + "dash.sub"} />
          <div className={`${CARD} hv4-fade overflow-hidden`}>
            <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-gray-100 bg-[#f8fafc]">
              <span className="w-2.5 h-2.5 rounded-full bg-red-300" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-300" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-300" />
            </div>
            <div className="p-5 sm:p-6 bg-[#f8fafc]">
              <div className="flex items-center justify-between mb-4 gap-3">
                <b className="text-[15px] font-bold text-[#163e64]">{ts(t, C + "dash.overview")}</b>
                <span className="text-[10.5px] font-bold uppercase tracking-[0.07em] text-[#00806c] bg-[#00D0AE]/15 rounded-full px-2.5 py-1 whitespace-nowrap">
                  {ts(t, C + "dash.mockLabel")}
                </span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                {stats.map(s => (
                  <div key={s.l} className="bg-white ring-1 ring-gray-100 rounded-xl p-4">
                    <p className="text-[11.5px] text-gray-500 mb-1">{s.l}</p>
                    <p className="text-[24px] font-bold text-[#163e64] tabular-nums leading-none">{s.v}</p>
                    <p className="text-[11px] text-primary mt-1.5">{s.s}</p>
                  </div>
                ))}
              </div>
              <div className="grid lg:grid-cols-[1.4fr_1fr] gap-3 mb-4">
                <div className="bg-white ring-1 ring-gray-100 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <b className="text-[13px] font-bold text-[#163e64]">{ts(t, C + "dash.trend")}</b>
                    <span className="text-[11px] font-semibold text-primary">{ts(t, C + "dash.trendTag")}</span>
                  </div>
                  <TrendChart />
                </div>
                <div className="bg-white ring-1 ring-gray-100 rounded-xl p-4">
                  <b className="block text-[13px] font-bold text-[#163e64] mb-3">{ts(t, C + "dash.status")}</b>
                  <div className="flex items-center gap-4">
                    <Donut />
                    <ul className="space-y-1.5 flex-1">
                      {legend.map((l, i) => (
                        <li key={l.l} className="flex items-center gap-2 text-[12px] text-gray-600">
                          <span className={`w-2 h-2 rounded-full ${["bg-[#00D0AE]", "bg-amber-400", "bg-gray-200"][i]}`} />
                          <span className="flex-1">{l.l}</span>
                          <b className="font-semibold text-[#163e64] tabular-nums">{l.v}</b>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
              <div className="bg-white ring-1 ring-gray-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3 gap-3">
                  <b className="text-[13px] font-bold text-[#163e64]">{ts(t, C + "dash.review")}</b>
                  <span className="text-[11px] text-gray-400 whitespace-nowrap">{ts(t, C + "dash.reviewTag")}</span>
                </div>
                <ul className="divide-y divide-gray-100">
                  {dashRows.map(r => (
                    <li key={r.t} className="flex items-center justify-between gap-3 py-2.5 text-[13px] text-gray-700">
                      {r.t}
                      <span className="text-[11px] font-semibold text-[#00806c] bg-[#00D0AE]/15 rounded-full px-2.5 py-0.5 whitespace-nowrap">{r.g}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <p className="hv4-fade text-[12px] text-gray-400 mt-3">{ts(t, C + "dash.disclaimer")}</p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {dashTiles.map((x, i) => (
              <div key={x.t} className={`${CARD} ${CARD_HOVER} hv4-fade p-5`} style={{ transitionDelay: `${i * 60}ms` }}>
                <h4 className="text-[14px] font-bold text-[#163e64] mb-1.5">{x.t}</h4>
                <p className="text-[13px] text-gray-600 leading-[1.7]">{x.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Student experience ─────────────────────────────────── */}
        <section className="mb-20 md:mb-24">
          <SectionHead t={t} eyebrow={C + "student.eyebrow"} title={C + "student.title"} sub={C + "student.sub"} />
          <div className={`${CARD} hv4-fade overflow-hidden`}>
            <div className="flex items-center justify-between gap-3 px-5 py-3 bg-gradient-to-r from-[#2885e8] to-[#00D0AE] text-white">
              <b className="text-[12.5px] font-bold uppercase tracking-[0.07em]">{ts(t, C + "student.qTag")}</b>
              <span className="text-[11px] opacity-90 whitespace-nowrap">{ts(t, C + "dash.mockLabel")}</span>
            </div>
            <div className="grid lg:grid-cols-2">
              <div className="p-5 sm:p-6 border-b lg:border-b-0 lg:border-r border-gray-100">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-primary mb-2">{ts(t, C + "student.qMeta")}</p>
                <p className="text-[15px] font-bold text-[#163e64] mb-4">{ts(t, C + "student.q")}</p>
                <ul className="space-y-2">
                  {opts.map((o, i) => {
                    const wrong = i === 1, right = i === 2
                    return (
                      <li key={o} className={`rounded-lg px-3.5 py-2.5 text-[13.5px] ring-1 ${
                        wrong ? "bg-rose-50 ring-rose-200 text-rose-700"
                        : right ? "bg-emerald-50 ring-emerald-200 text-emerald-800"
                        : "bg-white ring-gray-100 text-gray-600"}`}>
                        <b className="font-semibold mr-1.5">{"ABCD"[i]}.</b>{o}
                        {wrong && <span className="ml-2 text-[12px] font-semibold">— {ts(t, C + "student.yours")}</span>}
                        {right && <span className="ml-2 text-[12px] font-semibold">— {ts(t, C + "student.correct")}</span>}
                      </li>
                    )
                  })}
                </ul>
              </div>
              <div className="p-5 sm:p-6 bg-[#f8fafc]">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-gradient-to-br from-[#2885e8] to-[#00D0AE] text-white text-[10px] font-bold flex items-center justify-center">AI</span>
                  <b className="text-[14px] font-bold text-[#163e64]">{ts(t, C + "student.explTitle")}</b>
                </div>
                <p className="text-[13.5px] text-gray-600 leading-[1.75] mb-3">{ts(t, C + "student.expl")}</p>
                <div className="bg-white ring-1 ring-gray-100 rounded-xl px-4 py-4 text-center font-mono text-[14px] text-[#163e64] leading-[2]">
                  <div>3x + 5 = 20</div><div>3x = 15</div><div><b>x = 5</b></div>
                </div>
                <p className="text-[12.5px] text-gray-500 leading-[1.7] mt-3">{ts(t, C + "student.explNote")}</p>
              </div>
            </div>
          </div>
          <p className="hv4-fade text-[12px] text-gray-400 mt-3">{ts(t, C + "student.qDisclaimer")}</p>

          <div className="grid lg:grid-cols-2 gap-4 mt-6">
            <div className={`${CARD} hv4-fade p-6`}>
              <h4 className="text-[15px] font-bold text-[#163e64] mb-4">{ts(t, C + "student.skillTitle")}</h4>
              <ul className="space-y-3">
                {skills.map(([name, pct], i) => (
                  <li key={name} className="flex items-center gap-3">
                    <span className="text-[13px] text-gray-700 flex-1 min-w-0 truncate">{name}</span>
                    <span className="w-24 sm:w-32 h-2 rounded-full bg-gray-100 overflow-hidden shrink-0">
                      <span className="camp-grow-x block h-full rounded-full bg-gradient-to-r from-[#2885e8] to-[#00D0AE]"
                            style={{ width: `${pct}%`, animationDelay: `${i * 90}ms` }} />
                    </span>
                    <b className="text-[12.5px] font-bold text-[#163e64] tabular-nums w-9 text-right shrink-0">{pct}%</b>
                  </li>
                ))}
              </ul>
              <p className="text-[12px] text-gray-400 mt-4">{ts(t, C + "student.skillNote")}</p>
            </div>
            <div>
              <h4 className="hv4-fade text-[15px] font-bold text-[#163e64] mb-4">{ts(t, C + "student.actionTitle")}</h4>
              <div className="space-y-3">
                {actions.map((a, i) => (
                  <div key={a.t} className={`${CARD} hv4-fade p-4`} style={{ transitionDelay: `${i * 60}ms` }}>
                    <b className="block text-[13.5px] font-bold text-[#163e64] mb-1">{a.t}</b>
                    <p className="text-[13px] text-gray-600 leading-[1.7]">{a.d}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Real figures from the bank ─────────────────────────────
             Andy: "put some actual graphics from sat math". These are
             three LIVE study_item_bank rows (ids in satSamples.ts),
             drawn by QuestionGraphicView — the same component the test
             session uses. A school looking at this is looking at what a
             student gets, which is the only version of this section
             worth shipping. ──────────────────────────────────────── */}
        <section className="mb-20 md:mb-24">
          <div className="text-center max-w-[640px] mx-auto mb-9">
            <span className="hv4-fade block text-[12.5px] font-semibold tracking-[0.08em] text-primary mb-3">
              {ts(t, C + "raumi.fromBank")}
            </span>
            <h2 className="hv4-fade text-[clamp(24px,3vw,34px)] font-bold text-[#163e64] leading-[1.16] tracking-tight">
              {ts(t, C + "raumi.figuresTitle")}
            </h2>
            <p className="hv4-fade text-gray-500 leading-[1.75] mt-3">{ts(t, C + "raumi.figuresSub")}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {SAT_SAMPLES.map((q, i) => (
              <div key={q.id} className={`${CARD} ${CARD_HOVER} hv4-fade p-4 flex flex-col`} style={{ transitionDelay: `${i * 80}ms` }}>
                <span className="text-[10.5px] font-bold uppercase tracking-[0.07em] text-primary bg-blue-50 rounded-full px-2.5 py-1 self-start mb-3">
                  {q.domain}
                </span>
                <div className="rounded-xl bg-[#f8fafc] ring-1 ring-gray-100 p-3 mb-3 overflow-x-auto">
                  <QuestionGraphicView graphic={q.graphic} />
                </div>
                <p className="text-[13px] text-gray-700 leading-[1.65] flex-1">
                  {q.prompt.length > 130 ? q.prompt.slice(0, 130) + "…" : q.prompt}
                </p>
                <p className="text-[12px] font-semibold text-[#00806c] mt-3">
                  {ts(t, C + "raumi.answer")} · {q.correct}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── What we provide — the night band ───────────────────── */}
        <section className="mb-20 md:mb-24">
          <SectionHead t={t} eyebrow={C + "provides.eyebrow"} title={C + "provides.title"} sub={C + "provides.sub"} />
          <div className="hv4-fade rounded-3xl bg-gradient-to-b from-[#0b2138] to-[#0e2846] p-6 sm:p-9 text-white">
            <div className="grid lg:grid-cols-2 gap-8">
              <div>
                <h4 className="text-[11.5px] font-bold uppercase tracking-[0.09em] text-white/60 mb-4">{ts(t, C + "provides.schoolHead")}</h4>
                <ul className="space-y-2.5">
                  {schoolList.map(x => (
                    <li key={x} className="flex items-start gap-3 text-[14px] text-white/85">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/40 shrink-0 mt-[8px]" />{x}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-[11.5px] font-bold uppercase tracking-[0.09em] text-[#00D0AE] mb-4">{ts(t, C + "provides.usHead")}</h4>
                <ul className="space-y-2.5">
                  {usList.map(x => (
                    <li key={x} className="flex items-start gap-3 text-[14px] text-white">
                      <Check size={15} strokeWidth={2.8} className="text-[#00D0AE] shrink-0 mt-[3px]" />{x}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="mt-8 pt-6 border-t border-white/10 text-[16px] font-bold text-[#00D0AE]">
              {ts(t, C + "provides.quote")}
            </p>
          </div>

          <h3 className="hv4-fade text-[17px] font-bold text-[#163e64] mt-10 mb-4">{ts(t, C + "provides.whyTitle")}</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {why.map((w, i) => (
              <div key={w.t} className={`${CARD} ${CARD_HOVER} hv4-fade p-5`} style={{ transitionDelay: `${i * 50}ms` }}>
                <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary text-[12px] font-bold flex items-center justify-center mb-3">{i + 1}</span>
                <h4 className="text-[13.5px] font-bold text-[#163e64] mb-1.5">{w.t}</h4>
                <p className="text-[12.5px] text-gray-600 leading-[1.65]">{w.d}</p>
              </div>
            ))}
          </div>

          <div className="hv4-fade mt-6 rounded-2xl bg-blue-50/60 ring-1 ring-blue-100 p-5">
            <b className="block text-[14px] font-bold text-[#163e64] mb-3">{ts(t, C + "provides.oneTitle")}</b>
            <div className="flex flex-wrap gap-2">
              {onePlatform.map(x => (
                <span key={x} className="text-[12.5px] font-semibold text-[#163e64] bg-white ring-1 ring-gray-200 rounded-full px-3 py-1.5">{x}</span>
              ))}
            </div>
          </div>
        </section>

        {/* ── Partnership model ──────────────────────────────────── */}
        <section className="mb-20 md:mb-24">
          <SectionHead t={t} eyebrow={C + "model.eyebrow"} title={C + "model.title"} sub={C + "model.sub"} />
          <h3 className="hv4-fade text-[17px] font-bold text-[#163e64] mb-4">{ts(t, C + "model.formatsTitle")}</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {formats.map((f, i) => (
              <div key={f.t} className={`${CARD} ${CARD_HOVER} hv4-fade p-5`} style={{ transitionDelay: `${i * 50}ms` }}>
                <h4 className="text-[14px] font-bold text-[#163e64] mb-1.5">{f.t}</h4>
                <p className="text-[13px] text-gray-600 leading-[1.7]">{f.d}</p>
              </div>
            ))}
          </div>
          <p className="hv4-fade mt-6 border-l-[3px] border-[#00D0AE] bg-[#00D0AE]/[0.07] rounded-r-xl px-5 py-4 text-[15px] font-bold text-[#163e64]">
            {ts(t, C + "model.quote")}
          </p>

          <h3 className="hv4-fade text-[17px] font-bold text-[#163e64] mt-10 mb-4">{ts(t, C + "model.stepsTitle")}</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {implSteps.map((s, i) => (
              <div key={s.t} className={`${CARD} ${CARD_HOVER} hv4-fade p-5`} style={{ transitionDelay: `${i * 60}ms` }}>
                <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2885e8] to-[#00D0AE] text-white text-[13px] font-bold flex items-center justify-center mb-3">{i + 1}</span>
                <h4 className="text-[14px] font-bold text-[#163e64] mb-1.5">{s.t}</h4>
                <p className="text-[13px] text-gray-600 leading-[1.7]">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ────────────────────────────────────────────────── */}
        <section className="pb-24 text-center">
          <div className="hv4-fade">
            <h2 className="text-[clamp(26px,3.4vw,40px)] font-bold text-[#163e64] leading-[1.16] tracking-tight mb-3 max-w-[20ch] mx-auto">
              {ts(t, C + "cta.title")}
            </h2>
            <p className="text-gray-500 leading-[1.75] max-w-[54ch] mx-auto mb-6">{ts(t, C + "cta.sub")}</p>
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {ctaChips.map(c => (
                <span key={c} className="text-[12.5px] font-semibold text-primary bg-blue-50 rounded-full px-3.5 py-1.5">{c}</span>
              ))}
            </div>
            <div className="flex flex-col items-center gap-2 mb-7">
              <span className="camp-float"><PathMascot state="idle" size={84} /></span>
              <p className="text-[13px] font-semibold text-[#00806c]">{ts(t, C + "raumi.learn")}</p>
            </div>
            <p className="text-[15px] font-bold text-[#163e64] mb-7">{ts(t, C + "cta.tagline")}</p>
            <div className="flex flex-wrap justify-center gap-3">
              <a href={INQUIRY_URL}><Button size="lg" className="text-sm sm:text-base px-6">{ts(t, C + "cta.button")}</Button></a>
              <Link href="/pricing"><Button size="lg" variant="outline" className="text-sm sm:text-base px-6">{ts(t, C + "cta.alt")}</Button></Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

/* Shared section opener — the same eyebrow + h2 + sub every other
 * marketing section on this site uses. */
function SectionHead({ t, eyebrow, title, sub }: { t: ReturnType<typeof useTranslation>["t"]; eyebrow: string; title: string; sub: string }) {
  return (
    <div className="text-center max-w-[680px] mx-auto mb-9">
      <span className="hv4-fade block text-[12.5px] font-semibold tracking-[0.08em] text-primary mb-3">{ts(t, eyebrow)}</span>
      <h2 className="hv4-fade text-[clamp(24px,3vw,34px)] font-bold text-[#163e64] leading-[1.16] tracking-tight">{ts(t, title)}</h2>
      <p className="hv4-fade text-gray-500 leading-[1.75] mt-3">{ts(t, sub)}</p>
    </div>
  )
}

/* Static SVG, deliberately: this is a picture of a trend, not a chart
 * bound to data. Drawing it as DOM keeps it sharp at any width and
 * avoids shipping a chart library for one decorative figure. */
function TrendChart() {
  const pts = [[0, 74], [88, 60], [176, 48], [264, 30], [352, 8]]
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ")
  return (
    <svg viewBox="0 0 352 90" className="w-full h-[90px]" role="img" aria-label="Illustrative upward score trend">
      <defs>
        <linearGradient id="campTrend" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2885e8" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#2885e8" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[8, 30, 52, 74].map(y => <line key={y} x1="0" y1={y} x2="352" y2={y} stroke="#eef2f7" strokeWidth="1" />)}
      <path d={`${d} L352,90 L0,90 Z`} fill="url(#campTrend)" />
      <path d={d} fill="none" stroke="#2885e8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map(p => <circle key={p[0]} cx={p[0]} cy={p[1]} r="3.5" fill="#fff" stroke="#2885e8" strokeWidth="2.5" />)}
    </svg>
  )
}

function Donut() {
  const R = 26, CIRC = 2 * Math.PI * R
  const seg = [[82, "#00D0AE"], [11, "#fbbf24"], [7, "#e5e7eb"]] as const
  let off = 0
  return (
    <svg viewBox="0 0 72 72" className="w-[72px] h-[72px] shrink-0" role="img" aria-label="Illustrative assignment status">
      {seg.map(([pct, col]) => {
        const el = (
          <circle key={col} cx="36" cy="36" r={R} fill="none" stroke={col} strokeWidth="10"
            strokeDasharray={`${(pct / 100) * CIRC} ${CIRC}`}
            strokeDashoffset={-off} transform="rotate(-90 36 36)" />
        )
        off += (pct / 100) * CIRC
        return el
      })}
      <text x="36" y="40" textAnchor="middle" className="fill-[#163e64]" style={{ fontSize: 15, fontWeight: 700 }}>91%</text>
    </svg>
  )
}
