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
import { Check, ArrowRight, Plus, Calendar, BookOpen, ClipboardList, BarChart3, Sparkles, Users, School, FileText, Bot, Target, TrendingUp, Zap, Settings2, GraduationCap, Rocket, ShieldCheck, Timer, PieChart } from "lucide-react"
import Header from "@/components/shared/Header"
import Footer from "@/components/shared/Footer"
import { useTranslation } from "@/hooks/useTranslation"
import { languages } from "@/locales"
import { CARD, CARD_HOVER, WRAP, ts } from "@/components/marketing/ui"
import { LogoMark, MiniReports, MiniMockTest, MiniNotebook, MiniProgress } from "@/components/marketing/ProductMocks"
import { PathMascot } from "@/app/mobile/study/_shared/PathMascot"
import { QuestionGraphicView } from "@/app/mobile/study/session/[id]/test/QuestionGraphicView"
import { SAT_SAMPLES } from "@/components/marketing/satSamples"

const C = "landing.camp."

/* Same constant the landing page uses. There is no /contact route, and
 * this page's primary CTA is the one thing on it that must not 404. */
const INQUIRY_URL = "mailto:support@classraum.com"

type TFunc = ReturnType<typeof useTranslation>["t"]
type Step = { t: string; d: string; b?: string[] }
type Tile = { t: string; d: string }

/* Five reasons, five tones. Not decoration by index — each pairs with
   the icon for that reason, and the top rule gives the row a shape at a
   glance instead of five identical white boxes. */
const WHY_TONE = [
  { bar: "linear-gradient(90deg,#2885e8,#5aa9f5)", chip: "bg-blue-50 text-primary" },
  { bar: "linear-gradient(90deg,#7a5af8,#a78bfa)", chip: "bg-violet-50 text-violet-600" },
  { bar: "linear-gradient(90deg,#f79009,#fbbf24)", chip: "bg-amber-50 text-amber-600" },
  { bar: "linear-gradient(90deg,#00D0AE,#5eead4)", chip: "bg-[#00D0AE]/15 text-[#00806c]" },
  { bar: "linear-gradient(90deg,#12b76a,#4ade80)", chip: "bg-emerald-50 text-emerald-600" },
]

export default function CampPage() {
  const { t, language } = useTranslation()
  const [tab, setTab] = useState<"sat" | "toefl">("sat")

  // Arrays come straight off the locale object — t() flattens them.
  const L = languages[language] as unknown as Record<string, never>
  const camp = (L as unknown as { landing: { camp: Record<string, never> } }).landing.camp
  const g = <T,>(path: string): T => path.split(".").reduce<unknown>((a, k) => (a as Record<string, unknown>)?.[k], camp) as T

  /* TOEFL overrides. The two programmes share a structure — a school
   * buys the same thing either way — so the page is one layout with a
   * per-tab content layer rather than two near-duplicate pages that
   * drift apart. `o()` returns the TOEFL value when the TOEFL tab is
   * active and the SAT value otherwise.
   *
   * What genuinely DIFFERS is stated, not glossed: TOEFL is four
   * skills with AI grading of speech and essays, so its chips, skill
   * rows, formats and CTA are its own. What is identical — the cycle,
   * the dashboard, the partnership model — stays identical, because
   * pretending otherwise would be marketing invention. */
  const isToefl = tab === "toefl"
  const o = <T,>(path: string): T => (isToefl ? (g<T>("toefl." + path) ?? g<T>(path)) : g<T>(path))

  const heroChips = o<string[]>("hero.chips")
  const steps = g<Step[]>("cycle.steps")
  const loop = g<string[]>("cycle.loop")
  const stats = g<{ l: string; v: string; s: string }[]>("dash.stats")
  const legend = g<{ l: string; v: string }[]>("dash.legend")
  const dashRows = g<{ t: string; g: string }[]>("dash.rows")
  const dashTiles = g<Tile[]>("dash.tiles")
  const skills = o<[string, number][]>("skills") ?? g<[string, number][]>("student.skills")
  const actions = g<Tile[]>("student.actions")
  const schoolList = g<string[]>("provides.school")
  const usList = g<string[]>("provides.us")
  const why = g<Tile[]>("provides.why")
  const onePlatform = g<string[]>("provides.one")
  const formats = o<Tile[]>("formats") ?? g<Tile[]>("model.formats")
  const implSteps = g<Tile[]>("model.steps")
  const STEP_ARTEFACT = g<string[]>("model.artefacts")
  const ctaChips = o<string[]>("cta.chips")
  const qOpts = g<string[]>("q.opts")
  const qSteps = g<string[]>("q.steps")

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
          <div className="camp-in flex justify-center gap-2 mb-9">
            <button
              type="button"
              onClick={() => setTab("sat")}
              aria-pressed={tab === "sat"}
              className={`text-[13.5px] font-semibold rounded-full px-4 py-2 transition-colors duration-200 ${
                !isToefl ? "bg-primary text-white shadow-[0_8px_18px_-10px_rgba(40,133,232,0.8)]"
                              : "bg-white text-gray-500 ring-1 ring-gray-200 hover:text-primary"
              }`}
            >
              {ts(t, C + "tabs.sat")}
            </button>
            <button
              type="button"
              onClick={() => setTab("toefl")}
              aria-pressed={isToefl}
              className={`text-[13.5px] font-semibold rounded-full px-4 py-2 transition-colors duration-200 ${
                isToefl ? "bg-primary text-white shadow-[0_8px_18px_-10px_rgba(40,133,232,0.8)]"
                        : "bg-white text-gray-500 ring-1 ring-gray-200 hover:text-primary"
              }`}
            >
              {ts(t, C + "tabs.toefl")}
            </button>
          </div>

          <div className="text-center max-w-[760px] mx-auto">
            <span className="camp-in inline-block text-[12px] font-bold tracking-[0.12em] text-primary mb-4">
              {ts(t, C + "hero.eyebrow")}
            </span>
            <h1 className="camp-in text-[clamp(32px,4.4vw,52px)] font-bold text-[#163e64] leading-[1.14] tracking-[-0.022em]">
              {ts(t, C + "hero.title1")}{" "}
              <span className="whitespace-nowrap bg-gradient-to-r from-[#2885e8] to-[#00D0AE] bg-clip-text text-transparent">
                {isToefl ? ts(t, C + "toefl.hero.titleAccent") : ts(t, C + "hero.titleAccent")}
              </span>{" "}
              {ts(t, C + "hero.title2")}
            </h1>
            <p className="camp-in text-gray-500 text-base sm:text-[16.5px] leading-[1.75] max-w-[62ch] mx-auto mt-6">
              {isToefl ? ts(t, C + "toefl.hero.sub") : ts(t, C + "hero.sub")}
            </p>
            <div className="camp-in flex flex-wrap justify-center gap-2 mt-7">
              {heroChips.map(c => (
                <span key={c} className="text-[12.5px] font-semibold text-[#163e64] bg-white ring-1 ring-gray-200 rounded-full px-3.5 py-1.5">
                  {c}
                </span>
              ))}
            </div>
            {/* Raumi, as in the deck. The real mascot component the app
                ships — Rive-backed with an SVG fallback — not a picture
                of one. `celebrate` is the state the deck's pose reads as. */}
            <div className="camp-in flex items-center justify-center gap-3 mt-9">
              <span className="camp-float shrink-0">
                <PathMascot state="celebrate" size={76} />
              </span>
              <span className="text-left text-[13.5px] font-semibold text-[#163e64] bg-white ring-1 ring-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 max-w-[260px] shadow-[0_8px_20px_-14px_rgba(22,62,100,0.5)]">
                {ts(t, C + "raumi.meet")}
              </span>
            </div>

            <div className="camp-in flex flex-wrap justify-center gap-3 mt-8">
              <a href={INQUIRY_URL}><Button size="lg" className="text-sm sm:text-base px-6">{ts(t, C + "hero.cta")}</Button></a>
              <Link href="/features"><Button size="lg" variant="outline" className="text-sm sm:text-base px-6">{ts(t, C + "hero.ctaAlt")}</Button></Link>
            </div>
          </div>

          {/* school + us */}
          <div className="grid md:grid-cols-[1fr_auto_1fr] items-center gap-4 mt-14">
            <div className={`${CARD} camp-in p-7 sm:p-8`}>
              <div className="flex items-center gap-2.5 mb-5">
                <span className="w-9 h-9 rounded-xl bg-[#163e64] text-white flex items-center justify-center shrink-0">
                  <School size={17} strokeWidth={2.2} />
                </span>
                <h3 className="text-[15px] font-bold text-[#163e64]">{ts(t, C + "hero.schoolTitle")}</h3>
              </div>
              <ul className="grid grid-cols-2 gap-x-3 gap-y-3.5">
                {schoolList.slice(0, 4).map((x, i) => (
                  <li key={x} className="flex items-center gap-2 text-[12.5px] text-gray-600">
                    <span className="w-6 h-6 rounded-lg bg-gray-50 text-gray-400 flex items-center justify-center shrink-0">
                      {[<Users key="a" size={12} />, <School key="b" size={12} />, <Calendar key="c" size={12} />, <GraduationCap key="d" size={12} />][i]}
                    </span>
                    <span className="min-w-0 truncate">{x}</span>
                  </li>
                ))}
              </ul>
            </div>
            <span className="hidden md:flex w-9 h-9 rounded-full bg-[#00D0AE]/15 text-[#00806c] items-center justify-center shrink-0">
              <Plus size={17} strokeWidth={2.6} />
            </span>
            <div className="camp-in rounded-2xl p-7 sm:p-8 text-white bg-gradient-to-br from-[#2885e8] to-[#00b89c] shadow-[0_20px_44px_-24px_rgba(40,133,232,0.9)]">
              <div className="flex items-center gap-2.5 mb-5">
                <span className="shrink-0"><LogoMark size={36} radius={11} /></span>
                <h3 className="text-[15px] font-bold">{ts(t, C + "hero.usTitle")}</h3>
              </div>
              <ul className="grid grid-cols-2 gap-x-3 gap-y-3.5">
                {[FileText, ClipboardList, Bot, BarChart3].map((Icon, i) => (
                  <li key={i} className="flex items-center gap-2 text-[12.5px] text-white/95">
                    <span className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                      <Icon size={12} />
                    </span>
                    <span className="min-w-0 truncate">{heroChips[i]}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <Statement t={t} k={C + "hero.quote"} />
        </div>
      </header>

      <main className={WRAP}>
        {/* ── The cycle ──────────────────────────────────────────── */}
        <section className="mb-20 md:mb-24">
          <SectionHead t={t} eyebrow={C + "cycle.eyebrow"} title={C + "cycle.title"} sub={C + "cycle.sub"} />
          <div className="grid sm:grid-cols-2 gap-4">
            {steps.map((s, i) => (
              <div key={s.t} className={`${CARD} ${CARD_HOVER} camp-in p-6 flex flex-col`} style={{ animationDelay: `${i * 60}ms` }}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2885e8] to-[#00D0AE] text-white text-[13px] font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <h3 className="text-[17px] font-bold text-[#163e64]">{s.t}</h3>
                </div>
                <p className="text-[13.5px] text-gray-600 leading-[1.7] mb-3">{s.d}</p>
                <ul className="space-y-1.5 mb-4">
                  {(s.b ?? []).map(b => (
                    <li key={b} className="flex items-start gap-2.5 text-[13px] text-gray-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-[7px]" />
                      {b}
                    </li>
                  ))}
                </ul>
                {/* the surface this stage actually happens on — the same
                    mini components the /about product preview uses, so
                    each claim is shown rather than listed */}
                <div className="rounded-xl ring-1 ring-gray-100 overflow-hidden h-[132px] mt-auto">
                  {[<MiniMockTest key="0" t={t} label={s.t} />,
                    <MiniNotebook key="1" t={t} label={s.t} />,
                    <MiniProgress key="2" t={t} label={s.t} />,
                    <MiniReports key="3" t={t} label={s.t} />][i]}
                </div>
              </div>
            ))}
          </div>

          <FlowCycle t={t} steps={loop} />
          <Statement t={t} k={C + "cycle.quote"} />
        </section>

        {/* ── Admin dashboard ────────────────────────────────────── */}
        <section className="mb-20 md:mb-24">
          <SectionHead t={t} eyebrow={C + "dash.eyebrow"} title={C + "dash.title"} sub={C + "dash.sub"} />
          <div className={`${CARD} camp-in overflow-hidden`}>
            <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-gray-100 bg-[#f8fafc]">
              <span className="w-2.5 h-2.5 rounded-full bg-red-300" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-300" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-300" />
            </div>
            <div className="p-5 sm:p-6 bg-[#f8fafc]">
              <div className="flex items-center justify-between mb-4 gap-3">
                <span className="flex items-center gap-2.5 min-w-0">
                  <span className="shrink-0"><PathMascot state="idle" size={34} /></span>
                  <b className="text-[15px] font-bold text-[#163e64] truncate">{ts(t, C + "dash.overview")}</b>
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-500">
                  <Calendar size={12} /> {ts(t, C + "dash.trendTag")}
                </span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                {stats.map((s, i) => {
                  const Icon = [Users, ClipboardList, TrendingUp, Target][i] ?? Users
                  const tint = ["text-primary bg-blue-50", "text-emerald-600 bg-emerald-50",
                                "text-violet-600 bg-violet-50", "text-amber-600 bg-amber-50"][i]
                  return (
                    <div key={s.l} className="bg-white ring-1 ring-gray-100 rounded-xl p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-[11.5px] text-gray-500">{s.l}</p>
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${tint}`}>
                          <Icon size={13} strokeWidth={2.3} />
                        </span>
                      </div>
                      <p className="text-[24px] font-bold text-[#163e64] tabular-nums leading-none">{s.v}</p>
                      <p className="text-[11px] text-gray-400 mt-1.5">{s.s}</p>
                    </div>
                  )
                })}
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
          <p className="camp-in text-[12px] text-gray-400 mt-3">{ts(t, C + "dash.disclaimer")}</p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {dashTiles.map((x, i) => {
              const Icon = [Users, ClipboardList, TrendingUp, Target][i] ?? Users
              const tone = ["bg-blue-50 text-primary", "bg-amber-50 text-amber-600",
                            "bg-[#00D0AE]/15 text-[#00806c]", "bg-violet-50 text-violet-600"][i]
              return (
                <div key={x.t} className={`${CARD} ${CARD_HOVER} camp-in p-5`} style={{ animationDelay: `${i * 60}ms` }}>
                  {/* same header shape as the stat cards in the mockup
                      directly above: label left, tinted icon right. The
                      previous version had a big icon stacked over a
                      heading, which matched nothing else on the page. */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h4 className="text-[14px] font-bold text-[#163e64]">{x.t}</h4>
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${tone}`}>
                      <Icon size={13} strokeWidth={2.3} />
                    </span>
                  </div>
                  <p className="text-[13px] text-gray-600 leading-[1.7]">{x.d}</p>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── Student experience ─────────────────────────────────── */}
        <section className="mb-20 md:mb-24">
          <SectionHead t={t} eyebrow={C + "student.eyebrow"} title={C + "student.title"} sub={C + "student.sub"} />
          {/* The real test surface: the geometry item's own figure, its own
              four options, its own worked explanation. The stem is bank
              row 1032e3e7 — a hard tangent-secant question, not "3x + 5
              = 20". Andy asked for a harder, real one and for this to
              look like the actual session. */}
          <div className={`${CARD} camp-in overflow-hidden`}>
            <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-gray-100 bg-[#f8fafc]">
              <span className="flex items-center gap-2.5 min-w-0">
                <span className="text-[12px] font-bold text-[#163e64] whitespace-nowrap">{ts(t, C + "q.num")}</span>
                <span className="text-[11px] text-gray-400 truncate">{ts(t, C + "q.meta")}</span>
              </span>
              <span className="flex items-center gap-2 shrink-0">
                <span className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-rose-600 bg-rose-50 rounded-full px-2 py-0.5">
                  {ts(t, C + "q.difficulty")}
                </span>
                <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-gray-500 tabular-nums">
                  <Timer size={12} /> {ts(t, C + "q.timer")}
                </span>
              </span>
            </div>
            <div className="grid lg:grid-cols-2">
              <div className="p-5 sm:p-6 border-b lg:border-b-0 lg:border-r border-gray-100">
                <div className="rounded-xl bg-[#f8fafc] ring-1 ring-gray-100 p-3 mb-4 overflow-x-auto">
                  <QuestionGraphicView graphic={SAT_SAMPLES[0].graphic} />
                </div>
                <p className="text-[14px] font-semibold text-[#163e64] leading-[1.6] mb-4">{ts(t, C + "q.prompt")}</p>
                {/* Copied from TestResultView, not approximated. The real
                    review rows are plain: bg-emerald-50 / text-emerald-900
                    / ring-emerald-200 for the key, the rose equivalent for
                    the student's pick, gray for the rest — with the label
                    appended inline and the distractor reason underneath.
                    No letter chips, no tick icons; I had invented both. */}
                <div className="space-y-1.5">
                  {qOpts.map((o, i) => {
                    const isCorrect = i === 1
                    const isPick = i === 2
                    return (
                      <div key={o} className={`px-3 py-2 rounded-xl text-xs ring-1 ${
                        isCorrect ? "bg-emerald-50 text-emerald-900 ring-emerald-200/70"
                          : isPick ? "bg-rose-50 text-rose-900 ring-rose-200/70"
                          : "bg-gray-50 text-gray-700 ring-gray-200/50"}`}>
                        <div>
                          {o}
                          {isCorrect && <span className="ml-2 font-semibold">{ts(t, C + "q.correct")}</span>}
                          {isPick && <span className="ml-2 font-semibold">{ts(t, C + "q.yours")}</span>}
                        </div>
                        {isPick && (
                          <div className="mt-1 text-[11px] leading-relaxed text-rose-800">
                            <span className="font-semibold">{ts(t, C + "q.whyWrong")} </span>
                            {ts(t, C + "q.trap")}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* AI explanation — worked steps, then the specific trap */}
              <div className="p-5 sm:p-6 bg-gradient-to-b from-[#f8fafc] to-white">
                <div className="flex items-center gap-2.5 mb-4">
                  <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#2885e8] to-[#00D0AE] text-white flex items-center justify-center shrink-0">
                    <Bot size={15} strokeWidth={2.4} />
                  </span>
                  <b className="text-[14px] font-bold text-[#163e64]">{ts(t, C + "q.explTitle")}</b>
                </div>
                <ol className="space-y-2.5 mb-4">
                  {qSteps.map((st, i) => (
                    <li key={st} className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-lg bg-white ring-1 ring-blue-100 text-primary text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="flex-1 rounded-lg bg-white ring-1 ring-gray-100 px-3 py-2 font-mono text-[12.5px] text-[#163e64]">
                        {st}
                      </span>
                    </li>
                  ))}
                </ol>
                <div className="rounded-xl bg-amber-50 ring-1 ring-amber-200 px-3.5 py-3 mb-4">
                  <p className="text-[12.5px] text-amber-900 leading-[1.6]">{ts(t, C + "q.trap")}</p>
                </div>
                <span className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-primary bg-blue-50 rounded-full px-3.5 py-2">
                  <Sparkles size={13} /> {ts(t, C + "q.askAi")}
                </span>
              </div>
            </div>
          </div>
          <p className="camp-in text-[12px] text-gray-400 mt-3">
            {ts(t, C + "raumi.fromBank")} · {SAT_SAMPLES[0].id.slice(0, 8)}
          </p>

          <div className="grid lg:grid-cols-2 gap-4 mt-6">
            <div className={`${CARD} camp-in p-6`}>
              <h4 className="text-[15px] font-bold text-[#163e64] mb-4">{ts(t, C + "student.skillTitle")}</h4>
              <ul className="space-y-3">
                {skills.map(([name, pct], i) => {
                  /* A bar alone says "some number". The band says what a
                     teacher should DO about it, which is the whole point
                     of the panel. Thresholds match the session summary. */
                  const band = pct >= 80 ? "strong" : pct >= 70 ? "watch" : "weak"
                  const tone = { strong: "bg-emerald-500", watch: "bg-amber-400", weak: "bg-rose-400" }[band]
                  const chip = { strong: "text-emerald-700 bg-emerald-50",
                                 watch: "text-amber-700 bg-amber-50",
                                 weak: "text-rose-700 bg-rose-50" }[band]
                  return (
                    <li key={name} className="flex items-center gap-3">
                      <span className="text-[13px] text-gray-700 w-[38%] min-w-0 truncate">{name}</span>
                      <span className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                        <span className={`camp-grow-x block h-full rounded-full ${tone}`}
                              style={{ width: `${pct}%`, animationDelay: `${i * 90}ms` }} />
                      </span>
                      <b className="text-[12.5px] font-bold text-[#163e64] tabular-nums w-9 text-right shrink-0">{pct}%</b>
                      <span className={`text-[10.5px] font-bold rounded-full px-2 py-0.5 w-[62px] text-center shrink-0 ${chip}`}>
                        {ts(t, C + "skill." + band)}
                      </span>
                    </li>
                  )
                })}
              </ul>
              <p className="text-[12px] text-gray-400 mt-4">{ts(t, C + "student.skillNote")}</p>
            </div>
            <div>
              <h4 className="camp-in text-[15px] font-bold text-[#163e64] mb-4">{ts(t, C + "student.actionTitle")}</h4>
              <div className="space-y-3">
                {actions.map((a, i) => {
                  const tone = ["bg-rose-50 text-rose-600", "bg-amber-50 text-amber-600",
                                "bg-blue-50 text-primary", "bg-emerald-50 text-emerald-600"][i]
                  const Icon = [TrendingUp, Users, ClipboardList, Rocket][i] ?? Target
                  return (
                    <div key={a.t} className={`${CARD} camp-in p-4 flex items-start gap-3`} style={{ animationDelay: `${i * 60}ms` }}>
                      <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${tone}`}>
                        <Icon size={16} strokeWidth={2.2} />
                      </span>
                      <span className="min-w-0">
                        <b className="block text-[13.5px] font-bold text-[#163e64] mb-1">{a.t}</b>
                        <p className="text-[13px] text-gray-600 leading-[1.7]">{a.d}</p>
                      </span>
                      <ArrowRight size={14} className="text-gray-300 shrink-0 mt-2.5" />
                    </div>
                  )
                })}
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
            <span className="camp-in block text-[12.5px] font-semibold tracking-[0.08em] text-primary mb-3">
              {ts(t, C + "raumi.fromBank")}
            </span>
            <h2 className="camp-in text-[clamp(24px,3vw,34px)] font-bold text-[#163e64] leading-[1.16] tracking-tight">
              {ts(t, C + "raumi.figuresTitle")}
            </h2>
            <p className="camp-in text-gray-500 leading-[1.75] mt-3">{ts(t, C + "raumi.figuresSub")}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {SAT_SAMPLES.map((q, i) => (
              <div key={q.id} className={`${CARD} ${CARD_HOVER} camp-in p-4 flex flex-col`} style={{ animationDelay: `${i * 80}ms` }}>
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
          {/* Was white/85 text on a dark band — Andy: "horrible
              visibility". A ten-item checklist is a READING task, and
              reading tasks belong on white. The two sides are now
              distinguished by weight and accent, not by darkness. */}
          <div className="grid lg:grid-cols-2 gap-4">
            <div className={`${CARD} camp-in p-6`}>
              <div className="flex items-center gap-2.5 mb-4 pb-4 border-b border-gray-100">
                <span className="w-9 h-9 rounded-xl bg-[#163e64] text-white flex items-center justify-center shrink-0">
                  <School size={17} strokeWidth={2.2} />
                </span>
                <h4 className="text-[15px] font-bold text-[#163e64]">{ts(t, C + "provides.schoolHead")}</h4>
              </div>
              <ul className="space-y-3">
                {schoolList.map((x, i) => (
                  <li key={x} className="flex items-center gap-3 text-[13.5px] text-gray-700">
                    <span className="w-7 h-7 rounded-lg bg-gray-50 text-gray-500 flex items-center justify-center shrink-0">
                      {[<Users key="0" size={13} />, <School key="1" size={13} />, <Calendar key="2" size={13} />,
                        <ClipboardList key="3" size={13} />, <GraduationCap key="4" size={13} />][i] ?? <Check size={13} />}
                    </span>
                    {x}
                  </li>
                ))}
              </ul>
            </div>

            <div className="camp-in rounded-2xl bg-gradient-to-b from-blue-50/80 to-white ring-1 ring-blue-100 p-6">
              <div className="flex items-center gap-2.5 mb-4 pb-4 border-b border-blue-100">
                <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2885e8] to-[#00D0AE] text-white flex items-center justify-center shrink-0">
                  <Zap size={17} strokeWidth={2.4} />
                </span>
                <h4 className="text-[15px] font-bold text-[#163e64]">{ts(t, C + "provides.usHead")}</h4>
              </div>
              <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-2.5">
                {usList.map(x => (
                  <li key={x} className="flex items-start gap-2.5 text-[13px] text-gray-700">
                    <Check size={14} strokeWidth={3} className="text-[#00806c] shrink-0 mt-[3px]" />
                    <span className="min-w-0">{x}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <Statement t={t} k={C + "provides.quote"} />

          <h3 className="camp-in text-[17px] font-bold text-[#163e64] mt-10 mb-4">{ts(t, C + "provides.whyTitle")}</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {why.map((w, i) => (
              <div key={w.t} className={`${CARD} ${CARD_HOVER} camp-in p-5 relative overflow-hidden`} style={{ animationDelay: `${i * 50}ms` }}>
                <span className="absolute top-0 left-0 right-0 h-1" style={{ background: WHY_TONE[i]?.bar }} />
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3.5 mt-1 ${WHY_TONE[i]?.chip}`}>
                  {[<Rocket key="0" size={18} strokeWidth={2.2} />, <Settings2 key="1" size={18} strokeWidth={2.2} />,
                    <Target key="2" size={18} strokeWidth={2.2} />, <Sparkles key="3" size={18} strokeWidth={2.2} />,
                    <TrendingUp key="4" size={18} strokeWidth={2.2} />][i]}
                </span>
                <h4 className="text-[13.5px] font-bold text-[#163e64] mb-1.5">{w.t}</h4>
                <p className="text-[12.5px] text-gray-600 leading-[1.65]">{w.d}</p>
              </div>
            ))}
          </div>

          <Converge t={t} tools={onePlatform} />
        </section>

        {/* ── Partnership model ──────────────────────────────────── */}
        <section className="mb-20 md:mb-24">
          <SectionHead t={t} eyebrow={C + "model.eyebrow"} title={C + "model.title"} sub={C + "model.sub"} />
          <h3 className="camp-in text-[17px] font-bold text-[#163e64] mb-4">{ts(t, C + "model.formatsTitle")}</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {formats.map((f, i) => (
              <div key={f.t} className={`${CARD} ${CARD_HOVER} camp-in p-5 flex gap-3.5`} style={{ animationDelay: `${i * 50}ms` }}>
                <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-[#00D0AE]/15 text-primary flex items-center justify-center shrink-0">
                  {[<Timer key="0" size={18} />, <ShieldCheck key="1" size={18} />, <Zap key="2" size={18} />,
                    <Calendar key="3" size={18} />, <BookOpen key="4" size={18} />, <PieChart key="5" size={18} />][i]}
                </span>
                <span className="min-w-0">
                  <h4 className="text-[14px] font-bold text-[#163e64] mb-1">{f.t}</h4>
                  <p className="text-[13px] text-gray-600 leading-[1.7]">{f.d}</p>
                </span>
              </div>
            ))}
          </div>
          <Statement t={t} k={C + "model.quote"} />

          <h3 className="camp-in text-[17px] font-bold text-[#163e64] mt-12 mb-6">{ts(t, C + "model.stepsTitle")}</h3>
          {/* Four numbered boxes in a row was, as Andy said, super basic —
              it showed the COUNT of steps and nothing about them. Each
              step now carries the artefact it actually produces, on a
              connected spine so the order is structural rather than
              implied by reading direction. */}
          <div className="camp-in relative">
            <span aria-hidden className="hidden lg:block absolute left-0 right-0 top-[26px] h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent" />
            <div className="relative grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {implSteps.map((st, i) => (
                <div key={st.t} className={`${CARD} ${CARD_HOVER} p-5`} style={{ animationDelay: `${i * 70}ms` }}>
                  <span className="w-[52px] h-[52px] rounded-2xl bg-white ring-1 ring-blue-100 shadow-[0_6px_16px_-8px_rgba(40,133,232,0.5)] flex items-center justify-center mb-4 relative z-[1]">
                    <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2885e8] to-[#00D0AE] text-white text-[14px] font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                  </span>
                  <h4 className="text-[14px] font-bold text-[#163e64] mb-1.5">{st.t}</h4>
                  <p className="text-[13px] text-gray-600 leading-[1.7] mb-3.5">{st.d}</p>
                  {/* the artefact the step leaves behind */}
                  <div className="rounded-lg bg-[#f8fafc] ring-1 ring-gray-100 px-3 py-2 flex items-center gap-2">
                    {[<Calendar key="0" size={13} className="text-primary" />,
                      <Users key="1" size={13} className="text-primary" />,
                      <GraduationCap key="2" size={13} className="text-primary" />,
                      <Rocket key="3" size={13} className="text-primary" />][i]}
                    <span className="text-[11.5px] font-medium text-gray-600 truncate">{STEP_ARTEFACT[i]}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────────────────────────
             Was a centred stack of five things — heading, paragraph,
             four chips, a tagline, two buttons — each competing. Now one
             panel: the night band earns its place at the END of a long
             white page, Raumi anchors the left, and the ask sits alone
             on the right with the formats as quiet supporting chips. */}
        <section className="pb-24">
          <div className="camp-in relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0b2138] via-[#10315a] to-[#0e2846] px-6 sm:px-10 py-10 sm:py-12">
            <span aria-hidden className="absolute -right-16 -top-16 w-64 h-64 rounded-full"
                  style={{ background: "radial-gradient(circle, rgba(0,208,174,.22), transparent 65%)" }} />
            <span aria-hidden className="absolute -left-10 -bottom-20 w-56 h-56 rounded-full"
                  style={{ background: "radial-gradient(circle, rgba(40,133,232,.25), transparent 65%)" }} />
            <div className="relative grid lg:grid-cols-[auto_1fr] items-center gap-8 lg:gap-12">
              <div className="flex flex-col items-center gap-3 shrink-0 mx-auto lg:mx-0">
                <span className="camp-float"><PathMascot state="celebrate" size={116} /></span>
              </div>
              <div className="text-center lg:text-left">
                <h2 className="text-[clamp(24px,3.2vw,36px)] font-bold text-white leading-[1.18] tracking-tight mb-3">
                  {isToefl ? ts(t, C + "toefl.cta.title") : ts(t, C + "cta.title")}
                </h2>
                <p className="text-white/70 leading-[1.75] max-w-[52ch] mx-auto lg:mx-0 mb-5">
                  {ts(t, C + "cta.sub")}
                </p>
                <div className="flex flex-wrap justify-center lg:justify-start gap-2 mb-7">
                  {ctaChips.map(c => (
                    <span key={c} className="text-[12px] font-semibold text-white/85 bg-white/10 ring-1 ring-white/15 rounded-full px-3 py-1.5">
                      {c}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap justify-center lg:justify-start items-center gap-3">
                  <a href={INQUIRY_URL}>
                    <Button size="lg" className="text-sm sm:text-base px-6 bg-white text-[#0b2138] hover:bg-white/90">
                      {ts(t, C + "cta.button")}
                    </Button>
                  </a>
                  <Link href="/pricing" className="text-[13.5px] font-semibold text-white/80 hover:text-white inline-flex items-center gap-1.5">
                    {ts(t, C + "cta.alt")}
                    <ArrowRight size={14} />
                  </Link>
                  <span className="w-px h-5 bg-white/15 hidden sm:block" />
                  <span className="text-[13px] font-bold text-white/90">{ts(t, C + "cta.tagline")}</span>
                </div>
              </div>
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
function SectionHead({ t, eyebrow, title, sub }: { t: TFunc; eyebrow: string; title: string; sub: string }) {
  return (
    <div className="text-center max-w-[680px] mx-auto mb-9">
      <span className="camp-in block text-[12.5px] font-semibold tracking-[0.08em] text-primary mb-3">{ts(t, eyebrow)}</span>
      <h2 className="camp-in text-[clamp(24px,3vw,34px)] font-bold text-[#163e64] leading-[1.16] tracking-tight">{ts(t, title)}</h2>
      <p className="camp-in text-gray-500 leading-[1.75] mt-3">{ts(t, sub)}</p>
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


/* ── A statement, not a highlighted bar ──────────────────────────────
   The three pull-quotes were border-left strips in tinted boxes — the
   visual language of a callout in documentation, not of a claim a
   school is meant to weigh. Centred, larger, with a rule above and the
   accent used once, they read as the page's own voice. */
function Statement({ t, k }: { t: TFunc; k: string }) {
  return (
    <div className="camp-in mt-10 text-center max-w-[46ch] mx-auto">
      <p className="text-[clamp(17px,2.1vw,22px)] font-bold text-[#163e64] leading-[1.5] tracking-[-0.01em]">
        {ts(t, k)}
      </p>
    </div>
  )
}

/* ── The improvement cycle ───────────────────────────────────────────
 * Rebuilt twice. The first ring was CLIPPED — viewBox 400x300 with the
 * nodes at r=132 around cy=150 put their outer edge at y=-9 and y=309,
 * so the top and bottom stages were cut off. Andy also called the
 * design horrendous, which it was: six flat circles and a dashed line.
 *
 * The home page already solves this exact problem in "The whole day you
 * just scrolled through? One system." — scattered pieces, thin
 * connecting lines, and ONE card at the centre that everything belongs
 * to. This borrows that composition: the stages ring a central
 * Classraum card, each on its own connector, and a pulse travels the
 * loop so the "it comes back round" point is visible rather than
 * asserted. Same idea, stated for a camp instead of a day.
 *
 * viewBox is 560x400 with r=150 about (280,190): outer edge sits at
 * y=12 and y=368, inside the box with room to spare. */
function FlowCycle({ t, steps }: { t: TFunc; steps: string[] }) {
  const N = steps.length
  const R = 150, CX = 280, CY = 190, NODE_W = 92, NODE_H = 42
  const pos = (i: number) => {
    const a = (i / N) * 2 * Math.PI - Math.PI / 2
    return { x: CX + R * Math.cos(a), y: CY + R * Math.sin(a) }
  }
  return (
    <div className="camp-in mt-12">
      <div className="text-center mb-7">
        <h3 className="text-[17px] font-bold text-[#163e64]">{ts(t, C + "flow.title")}</h3>
        <p className="text-[13.5px] text-gray-500 mt-1.5">{ts(t, C + "flow.sub")}</p>
      </div>
      <div className="mx-auto max-w-[560px]">
        <svg viewBox="0 0 560 400" className="w-full" role="img"
             aria-label={ts(t, C + "flow.title") + ": " + steps.join(" → ")}>
          <defs>
            <linearGradient id="campRing" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#2885e8" /><stop offset="100%" stopColor="#00D0AE" />
            </linearGradient>
            <filter id="campNodeShadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor="#163e64" floodOpacity="0.10" />
            </filter>
          </defs>

          {/* connectors first, so nodes sit on top of them */}
          {steps.map((_, i) => {
            const p = pos(i)
            return <line key={"l" + i} x1={CX} y1={CY} x2={p.x} y2={p.y} stroke="#dbe4ee" strokeWidth="1" />
          })}

          {/* the loop itself, with the pulse that makes it a loop */}
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="url(#campRing)"
                  strokeWidth="1.5" strokeDasharray="4 8" opacity="0.5" />
          <circle r="5.5" fill="#00D0AE">
            <animateMotion dur="11s" repeatCount="indefinite"
              path={`M${CX},${CY - R} A${R},${R} 0 1 1 ${CX - 0.01},${CY - R} Z`} />
          </circle>

          {/* centre — the thing every stage belongs to */}
          <g filter="url(#campNodeShadow)">
            <rect x={CX - 62} y={CY - 32} width="124" height="64" rx="16" fill="#fff" stroke="#e6edf5" />
          </g>
          <text x={CX} y={CY - 6} textAnchor="middle"
                style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: "0.06em", fill: "#163e64" }}>
            CLASSRAUM
          </text>
          <text x={CX} y={CY + 12} textAnchor="middle" style={{ fontSize: 10, fontWeight: 600, fill: "#8aa0b5" }}>
            {"\u0053AT Camp"}
          </text>

          {/* stages */}
          {steps.map((label, i) => {
            const { x, y } = pos(i)
            return (
              <g key={label}>
                <g filter="url(#campNodeShadow)">
                  <rect x={x - NODE_W / 2} y={y - NODE_H / 2} width={NODE_W} height={NODE_H}
                        rx="12" fill="#fff" stroke="#e6edf5" />
                </g>
                <circle cx={x - NODE_W / 2 + 17} cy={y} r="10" fill="url(#campRing)" opacity="0.14" />
                <text x={x - NODE_W / 2 + 17} y={y + 3.5} textAnchor="middle"
                      style={{ fontSize: 9, fontWeight: 800, fill: "#2885e8" }}>
                  {i + 1}
                </text>
                <text x={x + 6} y={y + 4} textAnchor="middle"
                      style={{ fontSize: 11, fontWeight: 700, fill: "#163e64" }}>
                  {label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}


/* ── Eight tools, one platform ───────────────────────────────────────
 * Andy: "get creative with showing this portion, but make it clean",
 * and separately that the chip row read as AI slop. It did — eight
 * identical pills in a tinted box.
 *
 * The home page makes this exact argument visually in "The whole day
 * you just scrolled through? One system.": scattered pieces, hairline
 * connectors, one card they all belong to. This is that composition at
 * section scale — the eight tools a school would otherwise run sit on
 * the left as separate, greyed cards, and a single connector bundle
 * gathers them into the Classraum card on the right.
 *
 * Static by construction. The home version animates because it is a
 * hero moment; here it sits mid-page under a heading and a moving
 * diagram would compete with the reading. */
function Converge({ t, tools }: { t: TFunc; tools: string[] }) {
  return (
    <div className="camp-in mt-8 rounded-2xl bg-gradient-to-b from-[#f7fafd] to-white ring-1 ring-gray-150 p-6 sm:p-8">
      <b className="block text-[14px] font-bold text-[#163e64] mb-6 text-center">
        {ts(t, C + "provides.oneTitle")}
      </b>
      <div className="grid md:grid-cols-[1fr_auto_auto] items-center gap-5 md:gap-7">
        {/* the eight things a school otherwise stitches together */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-2 gap-2">
          {tools.map(x => (
            <span key={x} className="text-[12px] font-medium text-gray-500 bg-white ring-1 ring-gray-200 rounded-lg px-2.5 py-2 text-center truncate">
              {x}
            </span>
          ))}
        </div>

        {/* the bundle */}
        <svg viewBox="0 0 76 150" className="w-[76px] h-[150px] hidden md:block shrink-0" aria-hidden="true">
          {[18, 40, 62, 84, 106, 128].map((y, i) => (
            <path key={i} d={`M0,${y} C34,${y} 42,75 76,75`} fill="none"
                  stroke="#cbd9e8" strokeWidth="1.25" />
          ))}
          <circle cx="76" cy="75" r="3" fill="#00D0AE" />
        </svg>

        {/* the one they belong to */}
        <div className="rounded-2xl bg-white ring-1 ring-gray-200 shadow-[0_18px_40px_-22px_rgba(22,62,100,0.45)] px-6 py-5 flex flex-col items-center gap-2.5 mx-auto">
          <LogoMark size={38} radius={12} />
          <b className="text-[13px] font-extrabold tracking-[0.05em] text-[#163e64]">CLASSRAUM</b>
          <span className="text-[11.5px] text-gray-400">{ts(t, C + "tabs.sat")}</span>
        </div>
      </div>
    </div>
  )
}
