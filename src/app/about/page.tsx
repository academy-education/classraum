"use client"

import { Button } from "@/components/ui/button"
import { Sparkles, Clock, GraduationCap, Heart, Check, ArrowRight } from "lucide-react"
import { useState, useEffect } from "react"
import Link from "next/link"
import Header from "@/components/shared/Header"
import Footer from "@/components/shared/Footer"
import { useTranslation } from "@/hooks/useTranslation"
import { languages } from "@/locales"
import { LogoMark, BrowserShell, MiniReports, MiniCalendar, MiniComms, MiniMockTest, MiniNotebook, MiniProgress } from "@/components/marketing/ProductMocks"
import { CARD, CARD_HOVER, WRAP, ts, useReveal, NightBadge } from "@/components/marketing/ui"

type TFunc = ReturnType<typeof useTranslation>["t"]

const VALUE_ICONS = [GraduationCap, Sparkles, Clock, Heart]
/* Auto-advancing preview of the three academy surfaces. Pausing on
 * hover and on prefers-reduced-motion are both required: this sits in a
 * marketing page that people read, and a screen that swaps itself every
 * three seconds under someone trying to look at it is worse than a
 * static image. The pills are real controls, not decoration — clicking
 * one stops the auto-advance for good, because a person who has chosen
 * a screen has said what they want to look at. */
type Screen = { key: string; Mock: (p: { t: TFunc; label: string }) => React.ReactElement }

/* Auto-advancing preview, used by BOTH product cards. Pausing on hover
 * and honouring prefers-reduced-motion are both required: this sits in a
 * page people read, and a panel that swaps itself every three seconds
 * under a reader is worse than a static image. The pills are real
 * controls — clicking one stops the auto-advance for good, because
 * someone who picked a screen has said what they want to look at.
 *
 * The two cards are given different periods (3.2s / 3.9s) so they do not
 * flip in lockstep, which reads as one animation rather than two
 * independent products. */
function ScreenCycler({ t, screens, url, period, accent }: {
  t: TFunc; screens: readonly Screen[]; url: string; period: number; accent: "blue" | "teal"
}) {
  const [i, setI] = useState(0)
  const [auto, setAuto] = useState(true)
  const [hover, setHover] = useState(false)
  const n = screens.length

  useEffect(() => {
    if (!auto || hover) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const id = setInterval(() => setI((v) => (v + 1) % n), period)
    return () => clearInterval(id)
  }, [auto, hover, n, period])

  const on = accent === "teal"
    ? "bg-[#00806c] text-white"
    : "bg-primary text-white"

  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <BrowserShell url={url} label={ts(t, "landing.aboutExtras.screens.live")}>
        <div className="relative h-[150px]">
          {screens.map((sc, k) => (
            <div
              key={sc.key}
              aria-hidden={k !== i}
              className={`absolute inset-0 transition-all duration-500 ease-out ${
                k === i ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
              }`}
            >
              <sc.Mock t={t} label={ts(t, `landing.aboutExtras.screens.${sc.key}`)} />
            </div>
          ))}
        </div>
      </BrowserShell>
      <div className="flex flex-wrap gap-1.5 mt-3">
        {screens.map((sc, k) => (
          <button
            key={sc.key}
            type="button"
            onClick={() => { setI(k); setAuto(false) }}
            aria-pressed={k === i}
            className={`text-[11.5px] font-semibold rounded-full px-2.5 py-1 transition-colors duration-200 ${
              k === i ? on : "bg-white text-gray-500 ring-1 ring-gray-200 hover:text-primary hover:ring-primary/40"
            }`}
          >
            {ts(t, `landing.aboutExtras.screens.${sc.key}`)}
          </button>
        ))}
      </div>
    </div>
  )
}

const ACADEMY_SCREENS = [
  { key: "reports", Mock: MiniReports },
  { key: "schedule", Mock: MiniCalendar },
  { key: "messages", Mock: MiniComms },
] as const
const STUDY_SCREENS = [
  { key: "test", Mock: MiniMockTest },
  { key: "notebook", Mock: MiniNotebook },
  { key: "progress", Mock: MiniProgress },
] as const

/* The one number on the page, drawn rather than asserted. The 30-50%
 * figure is the page's own claim; the bar shows what it MEANS to a week,
 * which a sentence does not.
 *
 * No JS state. The first version animated `width` from 0 via a timer,
 * which meant a throttled or dropped timer left the bar at zero width —
 * the graphic simply absent. Segments are now always laid out at their
 * true width and scaled in by a CSS keyframe, so the worst case is an
 * un-animated bar rather than a missing one.
 *
 * The "after" bar carries no percentage. Shrinking the admin block is
 * already a claim; putting a number on it would be inventing one, and
 * nothing here measures a real customer's week. */
function WeekBar({ t, variant }: { t: TFunc; variant: "before" | "after" }) {
  const before = variant === "before"
  const admin = before ? 42 : 9
  const dot = before ? "bg-rose-400" : "bg-rose-200"
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-gray-500">
          {ts(t, `landing.aboutExtras.week.${before ? "today" : "after"}`)}
        </span>
        <span className={`text-[10.5px] font-bold ${before ? "text-rose-600" : "text-[#00806c]"}`}>
          {ts(t, `landing.aboutExtras.week.${before ? "admin" : "auto"}`)}
        </span>
      </div>
      <div className="flex h-3.5 rounded-full overflow-hidden bg-gray-100 ring-1 ring-black/[0.04]">
        <span
          className="hv-grow-x h-full"
          style={{ width: `${100 - admin}%`, background: "linear-gradient(90deg,#2885e8,#00D0AE)" }}
        />
        <span
          className={`hv-grow-x h-full ${before ? "bg-rose-400" : "bg-rose-200"}`}
          style={{ width: `${admin}%`, animationDelay: "140ms" }}
        />
      </div>
      <div className="flex items-center gap-3.5 mt-2 text-[10.5px] font-medium text-gray-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: "linear-gradient(90deg,#2885e8,#00D0AE)" }} />
          {ts(t, "landing.aboutExtras.week.teaching")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${dot}`} />
          {ts(t, "landing.aboutExtras.week.admin")}
        </span>
      </div>
    </div>
  )
}

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
        {/* ── The problem, then the answer.

             Rebuilt AGAIN, because the previous version was consistent
             with nothing. It was a single two-tone slab — one rounded
             frame split by a hairline, each half flooded with a tinted
             gradient — and every other section on this site, and on
             /features and the landing page, is built from the SAME
             primitive: a white CARD with a hairline ring, a soft shadow,
             an icon chip and a heading. A flat coloured block sitting
             under the hero read as a foreign element, which is what
             "still looks weird" meant.

             It also had no section header. Every other section opens
             with a centred eyebrow + h2; this one began abruptly after
             the hero paragraph, so the page seemed to start twice.

             The semantic colour survives where it carries meaning — the
             chip, the list markers, the week bar — but the GROUND is
             white, like everywhere else. Colour marks the content; it no
             longer replaces the container. ─────────────────────────── */}
        <section className="mb-20 md:mb-24">
          <div className="text-center max-w-[640px] mx-auto mb-10">
            <span className="hv4-fade block text-[12.5px] font-semibold tracking-[0.08em] text-primary mb-3">
              {ts(t, 'about.problemSolution.eyebrow')}
            </span>
            <h2 className="hv4-fade text-[clamp(26px,3.2vw,36px)] font-bold text-[#163e64] leading-[1.16] tracking-tight">
              {ts(t, 'about.problemSolution.sectionTitle')}
            </h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-4 sm:gap-5">
            <div className={`${CARD} ${CARD_HOVER} hv4-fade p-7 sm:p-8 flex flex-col`}>
              <h3 className="text-[17px] font-bold text-[#163e64] mb-4">
                {ts(t, 'about.problemSolution.problem.title')}
              </h3>
              <p className="text-[14.5px] font-medium text-gray-700 leading-[1.7] mb-4">
                {ts(t, 'about.problemSolution.problem.description')}
              </p>
              <ul className="space-y-2.5">
                {problemIssues.map((issue, i) => (
                  <li key={i} className="hv4-fade flex items-start gap-3 text-[14px] text-gray-600" style={{ transitionDelay: `${i * 70}ms` }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-300 shrink-0 mt-[7px]" />
                    {issue}
                  </li>
                ))}
              </ul>
              <div className="mt-auto"><WeekBar t={t} variant="before" /></div>
            </div>

            <div className={`${CARD} ${CARD_HOVER} hv4-fade p-7 sm:p-8 flex flex-col`}>
              <h3 className="text-[17px] font-bold text-[#163e64] mb-4">
                {ts(t, 'about.problemSolution.solution.title')}
              </h3>
              <p className="text-[14.5px] font-medium text-gray-700 leading-[1.7] mb-4">
                {ts(t, 'about.problemSolution.solution.description')}
              </p>
              <ul className="space-y-2.5">
                {solutionBenefits.map((benefit, i) => (
                  <li key={i} className="hv4-fade flex items-start gap-3 text-[14px] text-gray-700" style={{ transitionDelay: `${i * 70}ms` }}>
                    <Check className="w-4 h-4 text-[#00a98d] shrink-0 mt-0.5" strokeWidth={2.6} />
                    {benefit}
                  </li>
                ))}
              </ul>
              <div className="mt-auto"><WeekBar t={t} variant="after" /></div>
            </div>
          </div>
        </section>

        {/* ── The one dark section. Mission and vision are the only part
             of this page that is a claim rather than a list, so they get
             the landing page's night band instead of two more cards. */}
        <section className="mb-20 md:mb-24">
          <div className="hv4-fade relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#0b2138] to-[#0e2846] text-white p-8 sm:p-12">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{ background: "radial-gradient(620px 260px at 12% 0%, rgba(0,208,174,0.14), transparent 66%)" }}
            />
            {/* Two claims, not two lists — so each gets a teal rule and the
                statement is set at reading size. The labels were bare teal
                caps; they are badges now, like every other teal label on
                the site. */}
            <div className="relative grid lg:grid-cols-2 gap-10 lg:gap-14">
              {(["mission", "vision"] as const).map((key) => (
                <div key={key} className="lg:pl-6 lg:border-l lg:border-white/10 lg:first:pl-0 lg:first:border-l-0">
                  <NightBadge className="uppercase">{ts(t, `about.missionVision.${key}.title`)}</NightBadge>
                  <span className="block h-px w-14 mt-5 bg-gradient-to-r from-[#00D0AE]/60 to-transparent" />
                  <p className="text-[16px] sm:text-[17px] text-white/90 leading-[1.8] mt-4">
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
          {/* Values are numbered because there are four of them and the
              order is the order they were written in — the count is the
              only structure here, so it carries the rhythm. The card is
              the site's white CARD, not a fifth gradient treatment. */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {values.map((value, i) => {
              const Icon = VALUE_ICONS[i % VALUE_ICONS.length]
              return (
                <div
                  key={i}
                  className={`${CARD} ${CARD_HOVER} hv4-fade group relative overflow-hidden p-5 pt-6`}
                  style={{ transitionDelay: `${i * 60}ms` }}
                >
                  <span className="absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,#2885e8,#00D0AE)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="flex items-center justify-between mb-4">
                    <span className="w-10 h-10 rounded-xl bg-[linear-gradient(140deg,#2885e8,#1f6fc9)] text-white flex items-center justify-center shadow-[0_8px_18px_-8px_rgba(40,133,232,0.8)] transition-transform duration-300 group-hover:scale-105">
                      <Icon size={19} strokeWidth={2.2} />
                    </span>
                    <b className="font-mono text-[12px] font-semibold text-gray-300 tabular-nums transition-colors duration-300 group-hover:text-[#00806c]">
                      {String(i + 1).padStart(2, "0")}
                    </b>
                  </div>
                  <h3 className="text-[15px] font-bold text-[#163e64] mb-1.5">{value.title}</h3>
                  <p className="text-[13.5px] text-gray-600 leading-[1.7]">{value.description}</p>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── Two products, one system. Both sides now run the SAME live
             preview treatment, which is the only way the section makes
             its own point: one system, two faces of it.

             The study side used to be a 124px phone. At that width the
             UI was a grey smudge — Andy's word was "not seeable", and he
             was right; nothing in it was legible. Three study screens
             were built for ProductMocks instead (mock test, mistake
             notebook, daily progress), each a DOM replica of a surface
             that SHIPS. Snap is deliberately not among them: it is still
             behind the coming-soon lock. ──────────────────────────── */}
        <section className="mb-24">
          <div className="text-center max-w-[640px] mx-auto mb-10">
            <h2 className="hv4-fade text-[clamp(24px,2.8vw,32px)] font-bold text-[#163e64] leading-[1.16] tracking-tight">
              {ts(t, 'landing.aboutExtras.prodTitle')}
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            <div className="hv4-fade rounded-2xl bg-gradient-to-b from-blue-50/70 to-white ring-1 ring-blue-100/80 p-5 sm:p-6">
              <ScreenCycler t={t} screens={ACADEMY_SCREENS} url="app.classraum.com" period={3200} accent="blue" />
              <h3 className="text-[16px] font-bold text-[#163e64] mt-5 mb-1.5">{ts(t, 'landing.aboutExtras.prod1t')}</h3>
              <p className="text-[13.5px] text-gray-600 leading-[1.7] mb-4">{ts(t, 'landing.aboutExtras.prod1b')}</p>
              <Link href="/features" className="group inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-primary">
                {ts(t, 'landing.aboutExtras.prod1cta')}
                <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            </div>

            <div className="hv4-fade rounded-2xl bg-gradient-to-b from-[#00D0AE]/[0.09] to-white ring-1 ring-[#00D0AE]/25 p-5 sm:p-6">
              <ScreenCycler t={t} screens={STUDY_SCREENS} url="app.classraum.com/study" period={3900} accent="teal" />
              <h3 className="text-[16px] font-bold text-[#163e64] mt-5 mb-1.5">{ts(t, 'landing.aboutExtras.prod2t')}</h3>
              <p className="text-[13.5px] text-gray-600 leading-[1.7] mb-4">{ts(t, 'landing.aboutExtras.prod2b')}</p>
              <Link href="/study" className="group inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[#00806c]">
                {ts(t, 'landing.aboutExtras.prod2cta')}
                <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            </div>
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
