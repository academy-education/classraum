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

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Check, ArrowRight, ArrowDown, ArrowLeft, Plus, Calendar, BookOpen, FileText, BarChart3, Target, Send, MessageSquare, CheckCircle2, Play, Mic, Headphones, PenLine, ClipboardList, Sparkles, Users, School, Bot, TrendingUp, Zap, GraduationCap, Rocket, ShieldCheck, Timer, PieChart } from "lucide-react"
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
/* One colour per stage of the camp cycle, used on the card's top rule,
   its number chip and its bullet dots so a stage keeps its identity
   from the diagram to the card. */
const STAGE_TONE = [
  { border: "border-t-[#2885e8]", chip: "bg-[#2885e8]", dot: "bg-[#2885e8]" },
  { border: "border-t-[#7a5af8]", chip: "bg-[#7a5af8]", dot: "bg-[#7a5af8]" },
  { border: "border-t-[#f79009]", chip: "bg-[#f79009]", dot: "bg-[#f79009]" },
  { border: "border-t-[#00b89c]", chip: "bg-[#00b89c]", dot: "bg-[#00b89c]" },
]

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
  const stats = o<{ l: string; v: string; s: string }[]>("dash.stats")
  const legend = g<{ l: string; v: string }[]>("dash.legend")
  const dashRows = o<{ t: string; g: string }[]>("dash.rows")
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
  const qOpts = o<string[]>("q.opts")
  // Which option is the key and which the sample pick differ per item:
  // SAT geometry keys B with C picked; the TOEFL vocab item keys C
  // ("Justify") with B ("Ignore") picked. Both from real bank rows.
  const keyIdx = isToefl ? 2 : 1
  const pickIdx = isToefl ? 1 : 2
  const QK = isToefl ? C + "toefl.q." : C + "q."
  const qSteps = g<string[]>("q.steps")

  return (
    <div className="min-h-screen bg-background overflow-x-clip">
      <Header currentPage="camp" />

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <header className="relative pt-16 pb-14">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(620px 300px at 50% -60px, ${isToefl ? "rgba(122,90,248,.08)" : "rgba(40,133,232,.07)"}, transparent 70%)` }}
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
              <span className={`whitespace-nowrap bg-gradient-to-r bg-clip-text text-transparent ${isToefl ? "from-[#7a5af8] to-[#2885e8]" : "from-[#2885e8] to-[#00D0AE]"}`}>
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
            <div className={`camp-in rounded-2xl p-7 sm:p-8 text-white bg-gradient-to-br ${isToefl
              ? "from-[#7a5af8] to-[#2885e8] shadow-[0_20px_44px_-24px_rgba(122,90,248,0.9)]"
              : "from-[#2885e8] to-[#00b89c] shadow-[0_20px_44px_-24px_rgba(40,133,232,0.9)]"}`}>
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

      <main>
        {/* ── The cycle ──────────────────────────────────────────── */}
        <section className="py-14 sm:py-20 border-t border-gray-100 bg-white">
        <div className={WRAP}>
          <SectionHead t={t} eyebrow={C + "cycle.eyebrow"} title={C + "cycle.title"} sub={C + "cycle.sub"} />
          {/* The four stages carry their own colour and are physically
              CONNECTED: 1→2 across the top, 2→3 down the right edge,
              3→4 across the bottom — the same Z the reading order takes,
              drawn instead of implied. */}
          <div className="relative grid sm:grid-cols-2 gap-4">
            <FlowJoin dir="right" className="hidden sm:flex left-1/2 top-[25%]" />
            <FlowJoin dir="down"  className="hidden sm:flex left-auto right-[25%] translate-x-1/2 top-1/2" />
            <FlowJoin dir="left"  className="hidden sm:flex left-1/2 top-[75%]" />
            {/* The arrows draw an S (across, down the right edge, back
                across), so at sm+ the bottom row must run right-to-left —
                stage 3 under stage 2, stage 4 under stage 1. That
                reordering belongs to the TWO-COLUMN grid only: done in
                the DOM it survived into the single-column stack, where
                there are no arrows, and mobile read 1, 2, 4, 3. So the
                DOM stays in true sequence and `sm:order-*` moves the
                cards only where the S exists. */}
            {[0, 1, 2, 3].map(i => { const s = steps[i]; return (
              <div key={s.t} className={`${CARD} ${CARD_HOVER} camp-in p-6 flex flex-col border-t-4 ${STAGE_TONE[i].border} ${["sm:order-1", "sm:order-2", "sm:order-4", "sm:order-3"][i]}`} style={{ animationDelay: `${i * 60}ms` }}>
                <div className="flex items-center gap-3 mb-3">
                  <span className={`w-8 h-8 rounded-lg text-white text-[13px] font-bold flex items-center justify-center shrink-0 ${STAGE_TONE[i].chip}`}>
                    {i + 1}
                  </span>
                  <h3 className="text-[17px] font-bold text-[#163e64]">{s.t}</h3>
                </div>
                <p className="text-[13.5px] text-gray-600 leading-[1.7] mb-3">{s.d}</p>
                <ul className="space-y-1.5 mb-4">
                  {(s.b ?? []).map(b => (
                    <li key={b} className="flex items-start gap-2.5 text-[13px] text-gray-600">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-[7px] ${STAGE_TONE[i].dot}`} />
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
            )})}
          </div>

          <FlowCycle t={t} steps={loop} />
          <Statement t={t} k={C + "cycle.quote"} />
        </div>
        </section>

        {/* ── Admin dashboard ────────────────────────────────────── */}
        <section className="py-14 sm:py-20 border-t border-gray-100 bg-[#f8fafc] border-y border-gray-100">
        <div className={WRAP}>
          <SectionHead t={t} eyebrow={C + "dash.eyebrow"} title={C + "dash.title"} sub={C + "dash.sub"} />
          <div className={`${CARD} camp-in overflow-hidden`}>
            <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-gray-100 bg-[#f8fafc]">
              <span className="w-2.5 h-2.5 rounded-full bg-red-300" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-300" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-300" />
            </div>
            <div className="p-5 sm:p-6 bg-[#f8fafc]">
              <div className="flex items-center justify-between mb-4 gap-3">
                <b className="text-[15px] font-bold text-[#163e64] truncate">{ts(t, isToefl ? C + "toefl.dash.overview" : C + "dash.overview")}</b>
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
        </div>
        </section>

        {/* ── Student experience ─────────────────────────────────── */}
        <section className="py-14 sm:py-20 border-t border-gray-100 bg-white">
        <div className={WRAP}>
          <SectionHead t={t} eyebrow={C + "student.eyebrow"} title={C + "student.title"} sub={C + "student.sub"} />
          {/* The real test surface: the geometry item's own figure, its own
              four options, its own worked explanation. The stem is bank
              row 1032e3e7 — a hard tangent-secant question, not "3x + 5
              = 20". Andy asked for a harder, real one and for this to
              look like the actual session. */}
          {/* TOEFL is not one question type — a real sitting has four
              sections, so all four are ON the page at once: reading with
              a passage, listening behind an audio player, speaking into
              a microphone, writing into an editor. Each panel is built
              from a real bank row (ids in the footer) and mirrors the
              session component for that task. No tabs — a school
              skimming this page should see the whole exam without
              clicking. */}
          <div className={`${CARD} camp-in overflow-hidden ${isToefl ? "border-t-4 border-t-[#2885e8]" : ""}`}>
            {isToefl && (
              <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 bg-[#f8fafc]">
                <span className="w-6 h-6 rounded-lg bg-blue-50 text-primary flex items-center justify-center shrink-0"><BookOpen size={13} /></span>
                <span className="text-[12px] font-bold text-[#163e64]">{g<string[]>("toefl.skillsDemo.tabs")[0]}</span>
              </div>
            )}
            <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-gray-100 bg-[#f8fafc]">
              <span className="flex items-center gap-2.5 min-w-0">
                <span className="text-[12px] font-bold text-[#163e64] whitespace-nowrap">{ts(t, QK + "num")}</span>
                <span className="text-[11px] text-gray-400 truncate">{ts(t, QK + "meta")}</span>
              </span>
              <span className="flex items-center gap-2 shrink-0">
                <span className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-rose-600 bg-rose-50 rounded-full px-2 py-0.5">
                  {ts(t, QK + "difficulty")}
                </span>
                <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-gray-500 tabular-nums">
                  <Timer size={12} /> {ts(t, QK + "timer")}
                </span>
              </span>
            </div>
            <div className="grid lg:grid-cols-2">
              <div className="p-5 sm:p-6 border-b lg:border-b-0 lg:border-r border-gray-100">
                {isToefl ? (
                  <div className="rounded-xl bg-[#f8fafc] ring-1 ring-gray-100 p-4 mb-4">
                    <p className="text-[12.5px] text-gray-600 leading-[1.8] font-serif">
                      {ts(t, C + "toefl.q.passage")}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl bg-[#f8fafc] ring-1 ring-gray-100 p-3 mb-4 overflow-x-auto">
                    <QuestionGraphicView graphic={SAT_SAMPLES[0].graphic} />
                  </div>
                )}
                <p className="text-[14px] font-semibold text-[#163e64] leading-[1.6] mb-4">{ts(t, QK + "prompt")}</p>
                {/* Copied from TestResultView, not approximated. The real
                    review rows are plain: bg-emerald-50 / text-emerald-900
                    / ring-emerald-200 for the key, the rose equivalent for
                    the student's pick, gray for the rest — with the label
                    appended inline and the distractor reason underneath.
                    No letter chips, no tick icons; I had invented both. */}
                <div className="space-y-1.5">
                  {qOpts.map((o, i) => {
                    const isCorrect = i === keyIdx
                    const isPick = i === pickIdx
                    return (
                      <div key={o} className={`px-3 py-2 rounded-xl text-xs ring-1 ${
                        isCorrect ? "bg-emerald-50 text-emerald-900 ring-emerald-200/70"
                          : isPick ? "bg-rose-50 text-rose-900 ring-rose-200/70"
                          : "bg-gray-50 text-gray-700 ring-gray-200/50"}`}>
                        <div>
                          <b className="font-bold mr-1.5">{"ABCD"[i]}.</b>
                          {o}
                          {isCorrect && <span className="ml-2 font-semibold">{ts(t, C + "q.correct")}</span>}
                          {isPick && <span className="ml-2 font-semibold">{ts(t, C + "q.yours")}</span>}
                        </div>
                        {isPick && (
                          <div className="mt-1 text-[11px] leading-relaxed text-rose-800">
                            <span className="font-semibold">{ts(t, C + "q.whyWrong")} </span>
                            {ts(t, QK + "trap")}
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
                  <span className="shrink-0"><PathMascot state="thinking" size={40} /></span>
                  <b className="text-[14px] font-bold text-[#163e64]">
                    {ts(t, (isToefl ? C + "toefl.q.explTitle" : C + "q.explTitle"))}
                  </b>
                </div>
                {isToefl && (
                  <p className="text-[13.5px] text-gray-700 leading-[1.8] rounded-lg bg-white ring-1 ring-gray-100 px-3.5 py-3 mb-4">
                    {ts(t, C + "toefl.q.expl")}
                  </p>
                )}
                <ol className={`space-y-2.5 mb-4 ${isToefl ? "hidden" : ""}`}>
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
                  <p className="text-[12.5px] text-amber-900 leading-[1.6]">{ts(t, QK + "trap")}</p>
                </div>
                <RaumiAsk t={t} answerKey={isToefl ? C + "toefl.q.raumiAnswer" : C + "q.raumiAnswer"} />
              </div>
            </div>
          </div>

          {/* the other three sections, stacked below Reading: Listening
              and Speaking side by side, Writing full width — an editor
              deserves the width */}
          {isToefl && (
            <div className="grid lg:grid-cols-2 gap-4 mt-4">
              <ToeflSkillPanel t={t} kind={1} listenOpts={g<string[]>("toefl.skillsDemo.listening.opts")} />
              <ToeflSkillPanel t={t} kind={2} listenOpts={[]} />
              <div className="lg:col-span-2">
                <ToeflSkillPanel t={t} kind={3} listenOpts={[]} />
              </div>
            </div>
          )}
          <p className="camp-in text-[12px] text-gray-400 mt-3">
            {ts(t, C + "raumi.fromBank")} · {isToefl ? "6a165b4f · 21f53cc4 · c46869d1 · f6fb9a64" : SAT_SAMPLES[0].id.slice(0, 8)}
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
                {actions.map((a, i) => (
                  <div key={a.t} className={`${CARD} camp-in p-4 flex items-start gap-3.5`} style={{ animationDelay: `${i * 60}ms` }}>
                    {/* each card shows the SHAPE of the data that triggers
                        it — a dipping bar, a lopsided answer split, an
                        unfinished checklist, a rising line — because the
                        section is about reading data, and an icon of a
                        rocket says nothing about data. */}
                    <span className="w-14 h-11 rounded-lg bg-[#f8fafc] ring-1 ring-gray-100 flex items-center justify-center shrink-0">
                      <ActionVignette kind={i} />
                    </span>
                    <span className="min-w-0">
                      <b className="block text-[13.5px] font-bold text-[#163e64] mb-1">{a.t}</b>
                      <p className="text-[13px] text-gray-600 leading-[1.7]">{a.d}</p>
                    </span>
                  </div>
                ))}
              </div>
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
        {!isToefl && <section className="py-14 sm:py-20 border-t border-gray-100 bg-[#f8fafc] border-y border-gray-100">
        <div className={WRAP}>
          <div className="text-center max-w-[640px] mx-auto mb-9">
            <span className="camp-in block text-[12.5px] font-semibold tracking-[0.08em] text-primary mb-3">
              {ts(t, C + "raumi.fromBank")}
            </span>
            <h2 className="camp-in text-[clamp(24px,2.8vw,32px)] font-bold text-[#163e64] leading-[1.16] tracking-tight">
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
        </div>
        </section>}

        {/* ── What we provide — the night band ───────────────────── */}
        <section className="py-14 sm:py-20 border-t border-gray-100 bg-white">
        <div className={WRAP}>
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

          <h3 className="camp-in text-[clamp(18px,2vw,22px)] font-bold text-[#163e64] mt-12 mb-5">{ts(t, C + "provides.whyTitle")}</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {why.map((w, i) => (
              <div key={w.t} className={`${CARD} ${CARD_HOVER} camp-in p-5 relative overflow-hidden`} style={{ animationDelay: `${i * 50}ms` }}>
                <span className="absolute top-0 left-0 right-0 h-1" style={{ background: WHY_TONE[i]?.bar }} />
                <span className="h-11 flex items-center mb-3 mt-1">
                  <WhyGlyph kind={i} />
                </span>
                <h4 className="text-[13.5px] font-bold text-[#163e64] mb-1.5">{w.t}</h4>
                <p className="text-[12.5px] text-gray-600 leading-[1.65]">{w.d}</p>
              </div>
            ))}
          </div>

          <Converge t={t} tools={onePlatform} />
        </div>
        </section>

        {/* ── Partnership model ──────────────────────────────────── */}
        <section className="py-14 sm:py-20 border-t border-gray-100 bg-[#f8fafc] border-y border-gray-100">
        <div className={WRAP}>
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

          <h3 className="camp-in text-[clamp(18px,2vw,22px)] font-bold text-[#163e64] mt-14 mb-7 text-center">{ts(t, C + "model.stepsTitle")}</h3>
          <WorkflowDiamond steps={implSteps} artefacts={STEP_ARTEFACT} />
        </div>
        </section>

        {/* ── CTA ─────────────────────────────────────────────────────
             Was a centred stack of five things — heading, paragraph,
             four chips, a tagline, two buttons — each competing. Now one
             panel: the night band earns its place at the END of a long
             white page, Raumi anchors the left, and the ask sits alone
             on the right with the formats as quiet supporting chips. */}
        <section className="py-16 sm:py-20 border-t border-gray-100">
        <div className={WRAP}>
          {/* The glow blobs had hard radial edges and the three-stop
              gradient banded through #10315a. One smooth two-stop ramp,
              and the blobs are bigger, dimmer, blurred and pushed
              further out, so they read as light in the room rather than
              stickers on the panel. */}
          <div className="camp-in relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0b2138] to-[#123156] px-6 sm:px-10 py-10 sm:py-12">
            <span aria-hidden className="absolute -right-28 -top-28 w-[26rem] h-[26rem] rounded-full blur-3xl"
                  style={{ background: "radial-gradient(circle, rgba(0,208,174,.14), transparent 70%)" }} />
            <span aria-hidden className="absolute -left-24 -bottom-32 w-[24rem] h-[24rem] rounded-full blur-3xl"
                  style={{ background: "radial-gradient(circle, rgba(40,133,232,.16), transparent 70%)" }} />
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
        </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

/* Shared section opener — the same eyebrow + h2 + sub every other
 * marketing section on this site uses. */
/* A small circled arrow that sits on the seam between two cycle cards.
 * Positioned by the caller; purely decorative, hidden from readers. */
/* ── The figure follows the mouse in 3D ──────────────────────────────
 * perspective + rotateX/rotateY from the cursor position, capped at
 * ±7°, eased back on leave. Mouse-only by construction (mousemove does
 * not fire on touch), and nothing is hidden if it never runs — the
 * figure just sits flat. */
function Tilt({ className = "", children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const onMove = (e: React.MouseEvent) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    el.style.transform = `perspective(900px) rotateX(${(-py * 7).toFixed(2)}deg) rotateY(${(px * 7).toFixed(2)}deg)`
  }
  const onLeave = () => { if (ref.current) ref.current.style.transform = "perspective(900px)" }
  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave}
         className={`transition-transform duration-200 ease-out will-change-transform ${className}`}
         style={{ transform: "perspective(900px)" }}>
      {children}
    </div>
  )
}

/* ── "Ask Raumi about this step" ─────────────────────────────────────
 * A demo of the interaction, not a model call: clicking types out a
 * pre-written explanation of THIS item's first step, with a short
 * typing indicator first. The text is a correct explanation of a real
 * bank item, authored ahead of time — the page never pretends to run
 * inference it is not running. */
function RaumiAsk({ t, answerKey }: { t: TFunc; answerKey: string }) {
  const [phase, setPhase] = useState<"idle" | "typing" | "answer">("idle")
  const [shown, setShown] = useState(0)
  const full = ts(t, answerKey)
  useEffect(() => {
    if (phase !== "answer") return
    if (shown >= full.length) return
    const id = setInterval(() => setShown(n => Math.min(n + 3, full.length)), 24)
    return () => clearInterval(id)
  }, [phase, shown, full.length])
  // a tab switch swaps the answer text — reset so the reveal restarts
  useEffect(() => { setPhase("idle"); setShown(0) }, [answerKey])
  if (phase === "idle") return (
    <button type="button"
      onClick={() => { setPhase("typing"); setTimeout(() => setPhase("answer"), 700) }}
      className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-primary bg-blue-50 hover:bg-blue-100 transition-colors rounded-full px-3.5 py-2">
      <Sparkles size={13} /> {ts(t, C + "q.askAi")}
    </button>
  )
  return (
    <div className="flex items-start gap-2.5">
      <span className="shrink-0 mt-0.5"><PathMascot state={phase === "typing" ? "thinking" : "idle"} size={32} /></span>
      <div className="flex-1 min-w-0 rounded-2xl rounded-tl-sm bg-blue-50/70 ring-1 ring-blue-100 px-3.5 py-2.5">
        {phase === "typing" ? (
          <span className="inline-flex items-center gap-1.5 text-[12px] text-gray-500">
            {ts(t, C + "q.typing")}
            <span className="inline-flex gap-0.5">
              {[0, 1, 2].map(i => (
                <span key={i} className="w-1 h-1 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </span>
          </span>
        ) : (
          <p className="text-[13px] text-gray-700 leading-[1.75]">
            {full.slice(0, shown)}
            {shown < full.length && <span className="inline-block w-0.5 h-3.5 bg-primary/70 align-middle ml-0.5 animate-pulse" />}
          </p>
        )}
      </div>
    </div>
  )
}

function FlowJoin({ dir, className = "" }: { dir: "right" | "down" | "left"; className?: string }) {
  const Icon = dir === "right" ? ArrowRight : dir === "down" ? ArrowDown : ArrowLeft
  return (
    <span aria-hidden className={`absolute z-[2] -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white ring-1 ring-blue-100 shadow-[0_4px_12px_-4px_rgba(22,62,100,0.25)] items-center justify-center text-primary ${className}`}>
      <Icon size={15} strokeWidth={2.4} />
    </span>
  )
}

/* ── The implementation workflow as a diamond rotation ───────────────
 * Four stations on a rotated square, clockwise from the top, curved
 * arrows carrying the eye around. No numbers — the arrows ARE the
 * order. Each station is the step name over the artefact it leaves
 * behind. Falls back to a plain vertical list under sm, where a diamond
 * would collapse into overlap. */
function WorkflowDiamond({ steps, artefacts }: { steps: Tile[]; artefacts: string[] }) {
  const GLYPHS = [Calendar, Users, GraduationCap, Rocket]
  // top, right, bottom, left — clockwise
  const POS = [
    "left-1/2 top-0 -translate-x-1/2",
    "right-0 top-1/2 -translate-y-1/2",
    "left-1/2 bottom-0 -translate-x-1/2",
    "left-0 top-1/2 -translate-y-1/2",
  ]
  const node = (i: number, extra = "") => {
    const Icon = GLYPHS[i]
    return (
      <div key={i} className={`${CARD} px-4 py-3 flex items-center gap-3 ${extra}`}>
        <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-[#00D0AE]/15 text-primary flex items-center justify-center shrink-0">
          <Icon size={19} strokeWidth={2} />
        </span>
        <span className="min-w-0">
          <b className="block text-[13.5px] font-bold text-[#163e64] leading-tight">{steps[i].t}</b>
          <span className="block text-[11px] text-[#00806c] font-medium truncate">{artefacts[i]}</span>
        </span>
      </div>
    )
  }
  return (
    <div className="camp-in">
      {/* diamond, sm and up */}
      <div className="hidden sm:block relative max-w-[560px] h-[340px] mx-auto">
        {/* z-[2] + pointer-events-none: the arcs ride OVER the cards so
            the rotation is never clipped by a card edge. */}
        <svg viewBox="0 0 560 340" className="absolute inset-0 w-full h-full z-[2] pointer-events-none" aria-hidden>
          <defs>
            <marker id="wfArrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5.5" markerHeight="5.5" orient="auto">
              <path d="M0,0 L10,5 L0,10 z" fill="#2885e8" opacity="0.55" />
            </marker>
          </defs>
          {/* four arcs, clockwise: top→right→bottom→left→top */}
          <path d="M356 62 Q470 88 486 138"  fill="none" stroke="#b9cfe6" strokeWidth="1.5" markerEnd="url(#wfArrow)" />
          <path d="M486 202 Q470 252 356 278" fill="none" stroke="#b9cfe6" strokeWidth="1.5" markerEnd="url(#wfArrow)" />
          <path d="M204 278 Q90 252 74 202"   fill="none" stroke="#b9cfe6" strokeWidth="1.5" markerEnd="url(#wfArrow)" />
          <path d="M74 138 Q90 88 204 62"     fill="none" stroke="#b9cfe6" strokeWidth="1.5" markerEnd="url(#wfArrow)" />
        </svg>
        {POS.map((pos, i) => (
          <div key={i} className={`absolute ${pos} w-[220px]`}>{node(i)}</div>
        ))}
      </div>
      {/* stacked fallback under sm */}
      <div className="sm:hidden space-y-3">{steps.map((_, i) => node(i))}</div>
    </div>
  )
}

/* ── The other three TOEFL skills, demoed on their own terms ─────────
 * Listening hides its transcript behind a player, Speaking records
 * into a microphone, Writing goes into an editor with a word count —
 * because that is how the session actually delivers them. The speaking
 * record button is a copy of VoiceRecorder's live state (rose, ping
 * dot, mono timer), and each panel's content is a live bank row. */
function ToeflSkillPanel({ t, kind, listenOpts }: { t: TFunc; kind: number; listenOpts: string[] }) {
  const K = C + "toefl.skillsDemo."
  // Each section wears its own colour so the four-skill spread reads as
  // four different surfaces, not four copies of the SAT card.
  const head = (label: string, Icon: typeof Headphones, chip: string) => (
    <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 bg-[#f8fafc]">
      <span className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${chip}`}><Icon size={13} /></span>
      <span className="text-[12px] font-bold text-[#163e64]">{label}</span>
    </div>
  )
  if (kind === 1) return ( // ── Listening ─────────────────────────────
    <div className={`${CARD} camp-in overflow-hidden h-full border-t-4 border-t-[#7a5af8]`}>
      {head(ts(t, K + "listening.label"), Headphones, "bg-violet-50 text-violet-600")}
      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-3 rounded-xl bg-[#0b2138] px-4 py-3.5 mb-2 text-white">
          <span className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center shrink-0">
            <Play size={16} fill="currentColor" />
          </span>
          <span className="flex-1 h-1.5 rounded-full bg-white/20 overflow-hidden">
            <span className="block h-full w-[60%] rounded-full bg-gradient-to-r from-[#2885e8] to-[#00D0AE]" />
          </span>
          <span className="text-[11.5px] font-mono tabular-nums opacity-90 shrink-0">{ts(t, K + "listening.time")}</span>
        </div>
        <p className="text-[11.5px] text-gray-400 mb-4">{ts(t, K + "listening.note")}</p>
        <p className="text-[14px] font-semibold text-[#163e64] leading-[1.6] mb-3">{ts(t, K + "listening.prompt")}</p>
        <div className="space-y-1.5">
          {listenOpts.map((o, i) => (
            <div key={i} className={`px-3 py-2 rounded-xl text-xs ring-1 ${
              i === 1 ? "bg-emerald-50 text-emerald-900 ring-emerald-200/70" : "bg-gray-50 text-gray-700 ring-gray-200/50"}`}>
              <b className="font-bold mr-1.5">{"ABCD"[i]}.</b>{o}
              {i === 1 && <span className="ml-2 font-semibold">{ts(t, C + "q.correct")}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
  if (kind === 2) return ( // ── Speaking ──────────────────────────────
    <div className={`${CARD} camp-in overflow-hidden h-full border-t-4 border-t-rose-500`}>
      {head(ts(t, K + "speaking.label"), Mic, "bg-rose-50 text-rose-600")}
      <div className="p-5 sm:p-6">
        <div className="rounded-xl bg-[#f8fafc] ring-1 ring-gray-100 px-4 py-3.5 mb-4">
          <p className="text-[14px] text-[#163e64] font-medium leading-[1.7]">“{ts(t, K + "speaking.sentence")}”</p>
        </div>
        {/* VoiceRecorder's live state, verbatim styling */}
        <div className="w-full h-14 rounded-2xl bg-rose-600 text-white inline-flex items-center justify-center gap-3 shadow-[0_2px_6px_-2px_rgba(220,38,38,0.35)] mb-1.5">
          <span className="relative inline-flex w-3 h-3">
            <span className="absolute inset-0 rounded-full bg-white/70 animate-ping" />
            <span className="relative inline-flex w-3 h-3 rounded-full bg-white" />
          </span>
          <span className="text-[15px] font-semibold">{ts(t, K + "speaking.recording")}</span>
          <span className="text-[14px] font-mono tabular-nums opacity-90">{ts(t, K + "speaking.timer")}</span>
        </div>
        <p className="text-center text-[11.5px] text-gray-400 mb-4">{ts(t, K + "speaking.stop")}</p>
        <div className="flex items-center justify-between gap-3 rounded-xl bg-white ring-1 ring-gray-100 px-4 py-3">
          <p className="text-[12.5px] text-gray-600 leading-[1.6] flex-1">{ts(t, K + "speaking.result")}</p>
          <span className="text-[11.5px] font-bold text-[#00806c] bg-[#00D0AE]/15 rounded-full px-2.5 py-1 whitespace-nowrap shrink-0">
            {ts(t, K + "speaking.band")}
          </span>
        </div>
      </div>
    </div>
  )
  return ( // ── Writing ───────────────────────────────────────────────
    <div className={`${CARD} camp-in overflow-hidden h-full border-t-4 border-t-emerald-500`}>
      {head(ts(t, K + "writing.label"), PenLine, "bg-emerald-50 text-emerald-600")}
      <div className="p-5 sm:p-6">
        <div className="rounded-xl bg-amber-50/60 ring-1 ring-amber-100 px-4 py-3 mb-4">
          <p className="text-[12.5px] text-amber-900 leading-[1.7]">{ts(t, K + "writing.brief")}</p>
        </div>
        <div className="rounded-xl ring-1 ring-gray-200 bg-white px-4 py-3.5 min-h-[108px] mb-2">
          <p className="text-[13.5px] text-gray-700 leading-[1.8]">
            {ts(t, K + "writing.draft")}
            <span className="inline-block w-0.5 h-4 bg-primary/70 align-middle ml-0.5 animate-pulse" />
          </p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11.5px] text-gray-400 tabular-nums">{ts(t, K + "writing.words")}</span>
          <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-primary bg-blue-50 rounded-full px-3 py-1.5">
            <Sparkles size={12} /> {ts(t, K + "writing.feedback")}
          </span>
        </div>
      </div>
    </div>
  )
}

function SectionHead({ t, eyebrow, title, sub }: { t: TFunc; eyebrow: string; title: string; sub: string }) {
  return (
    <div className="text-center max-w-[680px] mx-auto mb-9">
      <span className="camp-in block text-[12.5px] font-semibold tracking-[0.08em] text-primary mb-3">{ts(t, eyebrow)}</span>
      <h2 className="camp-in text-[clamp(24px,2.8vw,32px)] font-bold text-[#163e64] leading-[1.16] tracking-tight">{ts(t, title)}</h2>
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
  const R = 150, CX = 280, CY = 190, NODE_W = 110, NODE_H = 48
  const pos = (i: number) => {
    const a = (i / N) * 2 * Math.PI - Math.PI / 2
    return { x: CX + R * Math.cos(a), y: CY + R * Math.sin(a) }
  }
  return (
    <div className="camp-in mt-12">
      <div className="text-center mb-8">
        <h3 className="text-[clamp(20px,2.4vw,28px)] font-bold text-[#163e64] tracking-tight">{ts(t, C + "flow.title")}</h3>
        <p className="text-[15px] text-gray-500 mt-2">{ts(t, C + "flow.sub")}</p>
      </div>
      <Tilt className="mx-auto max-w-[560px]">
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

          {/* centre — the thing every stage belongs to */}
          <g filter="url(#campNodeShadow)">
            <rect x={CX - 62} y={CY - 32} width="124" height="64" rx="16" fill="#fff" stroke="#e6edf5" />
          </g>
          <text x={CX} y={CY - 6} textAnchor="middle"
                style={{ fontSize: 14, fontWeight: 800, letterSpacing: "0.06em", fill: "#163e64" }}>
            CLASSRAUM
          </text>
          <text x={CX} y={CY + 12} textAnchor="middle" style={{ fontSize: 11.5, fontWeight: 600, fill: "#8aa0b5" }}>
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
                <circle cx={x - NODE_W / 2 + 19} cy={y} r="11" fill="url(#campRing)" opacity="0.14" />
                <text x={x - NODE_W / 2 + 19} y={y + 4} textAnchor="middle"
                      style={{ fontSize: 10.5, fontWeight: 800, fill: "#2885e8" }}>
                  {i + 1}
                </text>
                <text x={x + 8} y={y + 4.5} textAnchor="middle"
                      style={{ fontSize: 13, fontWeight: 700, fill: "#163e64" }}>
                  {label}
                </text>
              </g>
            )
          })}
        </svg>
      </Tilt>
    </div>
  )
}


/* ── Eight tools, one platform — third design ────────────────────────
 * The side-by-side version read badly: the bundle svg floated between
 * two unrelated columns. Vertical tells it in reading order instead —
 * the eight separate tools, the lines pulling them together, then ONE
 * full-width brand bar. The bar being wider than any tile IS the
 * argument. */
function Converge({ t, tools }: { t: TFunc; tools: string[] }) {
  return (
    <div className={`${CARD} camp-in mt-10 p-6 sm:p-8`}>
      <b className="block text-[clamp(17px,2.2vw,22px)] font-bold text-[#163e64] mb-7 text-center tracking-tight">
        {ts(t, C + "provides.oneTitle")}
      </b>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-[620px] mx-auto">
        {tools.map((x, i) => {
          const Icon = [BookOpen, ClipboardList, FileText, Send, CheckCircle2, MessageSquare, BarChart3, Users][i] ?? FileText
          return (
            <span key={x} className="camp-shine group flex flex-col items-center gap-1.5 text-[12px] font-medium text-gray-500 bg-[#f8fafc] ring-1 ring-gray-200/80 rounded-xl px-2.5 py-3 text-center transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:ring-primary/30 hover:shadow-[0_14px_28px_-16px_rgba(40,133,232,0.5)] cursor-default">
              <Icon size={16} strokeWidth={2} className="text-gray-400 transition-colors duration-300 group-hover:text-primary" />
              <span className="truncate max-w-full transition-colors duration-300 group-hover:text-[#163e64]">{x}</span>
            </span>
          )
        })}
      </div>
      <svg viewBox="0 0 620 56" className="w-full max-w-[620px] mx-auto block h-[56px]" aria-hidden>
        {[77, 232, 388, 543].map((x, i) => (
          <path key={i} d={`M${x},0 C${x},30 310,22 310,56`} fill="none" stroke="#d5e2ef" strokeWidth="1.25" />
        ))}
        <circle cx="310" cy="52" r="3" fill="#00D0AE" />
      </svg>
      <div className="max-w-[620px] mx-auto rounded-xl px-5 py-4 flex flex-wrap items-center justify-center gap-3 text-white bg-gradient-to-r from-[#2C6EF1] via-[#16ADD4] to-[#00D0AE] shadow-[0_18px_36px_-18px_rgba(40,133,232,0.8)]">
        <LogoMark size={30} radius={9} />
        <b className="text-[14px] font-extrabold tracking-[0.05em]">CLASSRAUM</b>
        <span className="w-px h-4 bg-white/30 hidden sm:block" />
        <span className="text-[12.5px] font-medium text-white/90">{ts(t, C + "provides.quote")}</span>
      </div>
    </div>
  )
}

/* ── Tiny data pictures for "From data to action" ────────────────────
 * Second pass, for cleanliness: one idea per picture, uniform 2px
 * geometry, two colours only (slate track + one signal colour), no
 * baselines, no axis labels. The picture is the trigger, nothing else. */
function ActionVignette({ kind }: { kind: number }) {
  if (kind === 0) return ( // low skill score — one bar sags
    <svg viewBox="0 0 56 44" className="w-12 h-9" aria-hidden>
      {[[8, 18, "#cbd9e8"], [20, 24, "#cbd9e8"], [32, 9, "#fb7185"], [44, 21, "#cbd9e8"]].map(([x, h, c]) => (
        <rect key={x as number} x={(x as number) - 3} y={36 - (h as number)} width="7" height={h as number} rx="3.5" fill={c as string} />
      ))}
    </svg>)
  if (kind === 1) return ( // common wrong answer — one option towers
    <svg viewBox="0 0 56 44" className="w-12 h-9" aria-hidden>
      {[[8, 10, "#cbd9e8"], [20, 26, "#f59e0b"], [32, 8, "#cbd9e8"], [44, 6, "#cbd9e8"]].map(([x, h, c]) => (
        <rect key={x as number} x={(x as number) - 3} y={36 - (h as number)} width="7" height={h as number} rx="3.5" fill={c as string} />
      ))}
    </svg>)
  if (kind === 2) return ( // missing assignment — the row that is not there
    <svg viewBox="0 0 56 44" className="w-12 h-9" aria-hidden>
      <rect x="10" y="8"  width="36" height="7" rx="3.5" fill="#cbd9e8" />
      <rect x="10" y="18.5" width="36" height="7" rx="3.5" fill="none" stroke="#fb7185" strokeWidth="1.6" strokeDasharray="3 3" />
      <rect x="10" y="29" width="36" height="7" rx="3.5" fill="#cbd9e8" />
    </svg>)
  return ( // strong score — the line clears its ceiling
    <svg viewBox="0 0 56 44" className="w-12 h-9" aria-hidden>
      <path d="M8 32 L22 27 L34 20 L47 10" fill="none" stroke="#10b981" strokeWidth="2.4"
            strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="47" cy="10" r="3" fill="#fff" stroke="#10b981" strokeWidth="2.2" />
    </svg>)
}

/* ── Glyphs for "Why schools use Classraum", third pass ──────────────
 * "Too basic." Each is now a small two-layer illustration: a soft
 * tinted disc for depth, a slate secondary shape for context, and the
 * brand-gradient subject on top — a rocket mid-launch, a stack signed
 * off, an arrow in the bull's-eye, a bubble answering with a bolt, a
 * chart climbing past its flag. Still SVG, still no icon font. */
function WhyGlyph({ kind }: { kind: number }) {
  const id = `wg${kind}`
  const g = (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#2885e8" /><stop offset="100%" stopColor="#00D0AE" />
      </linearGradient>
    </defs>
  )
  const grad = `url(#${id})`
  const disc = <circle cx="24" cy="22" r="19" fill={grad} opacity="0.09" />
  if (kind === 0) return ( // launch faster — an unmistakable rocket, 45° up-right
    <svg viewBox="0 0 48 44" className="w-11 h-10" aria-hidden>{g}{disc}
      <g transform="rotate(45 24 22)">
        {/* fins */}
        <path d="M19 26 L14 33 L21 31 Z" fill={grad} opacity="0.6" />
        <path d="M29 26 L34 33 L27 31 Z" fill={grad} opacity="0.6" />
        {/* body with nose cone */}
        <path d="M24 4 C29 8.5 30.5 14 30.5 20 C30.5 25 29 28.5 28 30 H20 C19 28.5 17.5 25 17.5 20 C17.5 14 19 8.5 24 4 Z" fill={grad} opacity="0.92" />
        {/* window */}
        <circle cx="24" cy="15.5" r="3.4" fill="#fff" />
        <circle cx="24" cy="15.5" r="1.7" fill={grad} opacity="0.35" />
        {/* flame */}
        <path d="M21.5 31 C21.5 34.5 23 37 24 39.5 C25 37 26.5 34.5 26.5 31 Z" fill="#f79009" />
        <path d="M23 31 C23 33 23.6 34.6 24 36 C24.4 34.6 25 33 25 31 Z" fill="#fbbf24" />
      </g>
      {/* speed lines trailing behind */}
      <path d="M9 34 L14 29 M6 28 L10 24" stroke="#c7d6e8" strokeWidth="2.2" strokeLinecap="round" />
    </svg>)
  if (kind === 1) return ( // reduce admin — the stack, signed off
    <svg viewBox="0 0 48 44" className="w-11 h-10" aria-hidden>{g}{disc}
      <rect x="11" y="9" width="20" height="26" rx="3" fill="#fff" stroke="#c7d6e8" strokeWidth="1.8" />
      <rect x="15" y="6" width="20" height="26" rx="3" fill="#fff" stroke="#c7d6e8" strokeWidth="1.8" />
      <path d="M20 14 h10 M20 19 h10 M20 24 h6" stroke="#dbe4ee" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="33" cy="30" r="7.5" fill={grad} />
      <path d="M29.5 30 l2.4 2.6 4.6-5.2" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>)
  if (kind === 2) return ( // target instruction — arrow in the bull's-eye
    <svg viewBox="0 0 48 44" className="w-11 h-10" aria-hidden>{g}{disc}
      <circle cx="22" cy="24" r="12" fill="#fff" stroke="#c7d6e8" strokeWidth="2" />
      <circle cx="22" cy="24" r="6.5" fill="none" stroke={grad} strokeWidth="2.2" />
      <circle cx="22" cy="24" r="2" fill={grad} />
      <path d="M22 24 L36 10 M32 10 h4 v4" stroke={grad} strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>)
  if (kind === 3) return ( // fast feedback — the bubble answers with a bolt
    <svg viewBox="0 0 48 44" className="w-11 h-10" aria-hidden>{g}{disc}
      <path d="M10 12 a5 5 0 0 1 5-5 h18 a5 5 0 0 1 5 5 v13 a5 5 0 0 1-5 5 H22 l-7 6 v-6 h0 a5 5 0 0 1-5-5 Z" fill="#fff" stroke="#c7d6e8" strokeWidth="1.8" />
      <path d="M26 10 L20 20 h4.5 L22.5 28 L30 17.5 h-4.5 Z" fill={grad} />
    </svg>)
  return ( // measure progress — bars past the flagged target
    <svg viewBox="0 0 48 44" className="w-11 h-10" aria-hidden>{g}{disc}
      <path d="M8 14 H40" stroke="#c7d6e8" strokeWidth="1.6" strokeDasharray="3 3" />
      <rect x="11" y="28" width="7" height="8" rx="2.5" fill="#c7d6e8" />
      <rect x="21" y="22" width="7" height="14" rx="2.5" fill={grad} opacity="0.55" />
      <rect x="31" y="10" width="7" height="26" rx="2.5" fill={grad} />
      <circle cx="34.5" cy="10" r="2.6" fill="#fff" stroke={grad} strokeWidth="1.8" />
    </svg>)
}
