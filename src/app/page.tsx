"use client"

import { Button } from "@/components/ui/button"
import { useState, useEffect, useRef, useCallback, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  UserCheck,
  Bell,
  FileText,
  FileQuestion,
  Sparkles,
  BookOpen,
  CreditCard,
  BarChart,
} from "lucide-react"
import {
  DashboardMock,
  PaymentsMock,
  StudyPhoneMock,
  InvoicePhoneMock,
  MiniReports,
  MiniCalendar,
  MiniComms,
  AttendanceMock,
  PushNotificationCard,
  ReportDemo,
} from "@/components/marketing/ProductMocks"
import {
  CARD,
  CARD_HOVER,
  type TFunc,
  ts,
  tOpt,
  prefersReducedMotion,
  useReveal,
} from "@/components/marketing/ui"
import Header from "@/components/shared/Header"
import Footer from "@/components/shared/Footer"
import { useTranslation } from "@/hooks/useTranslation"
import { supabase } from "@/lib/supabase"
import "./home.css"

// Set NEXT_PUBLIC_KAKAO_CHANNEL_URL to show the KakaoTalk inquiry button.
const KAKAO_CHANNEL_URL = process.env.NEXT_PUBLIC_KAKAO_CHANNEL_URL || null
const INQUIRY_URL = "mailto:support@classraum.com"

function SectionTime({ time, when }: { time: string; when: string }) {
  return (
    <div className="md:text-right hv4-fade">
      <b className="block font-mono text-[15px] font-semibold text-primary tabular-nums">{time}</b>
      <span className="text-xs text-gray-400">{when}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// AI 기반 통합 플랫폼 — six module chips scatter in, then get absorbed into
// the Classraum core; each landing expands a module pill inside the card.
// ---------------------------------------------------------------------------
const UNIFY_CHIPS = [
  { key: "chip1", left: "17%", top: "19%", sx: "-70px", sy: "-40px", teal: false },
  { key: "chip2", left: "83%", top: "17%", sx: "70px", sy: "-46px", teal: false },
  { key: "chip3", left: "11%", top: "61%", sx: "-80px", sy: "30px", teal: false },
  { key: "chip4", left: "88%", top: "59%", sx: "80px", sy: "34px", teal: false },
  { key: "chip5", left: "26%", top: "87%", sx: "-50px", sy: "60px", teal: false },
  { key: "chip6", left: "72%", top: "88%", sx: "56px", sy: "58px", teal: true },
]
const UNIFY_LINES = [
  [115, 76],
  [565, 68],
  [75, 244],
  [600, 236],
  [177, 348],
  [490, 352],
] as const

function UnifySection({ t }: { t: TFunc }) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const chipRefs = useRef<(HTMLDivElement | null)[]>([])
  const lineRefs = useRef<(SVGLineElement | null)[]>([])
  const timers = useRef<number[]>([])
  const [landed, setLanded] = useState<boolean[]>(Array(6).fill(false))
  const [absorbed, setAbsorbed] = useState(false)

  const play = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    timers.current.forEach(window.clearTimeout)
    timers.current = []

    if (prefersReducedMotion()) {
      canvas.classList.add("hv4-go", "hv4-absorbed")
      chipRefs.current.forEach((ch) => {
        if (ch) {
          ch.style.transition = "none"
          ch.style.opacity = "0"
        }
      })
      lineRefs.current.forEach((l) => {
        if (l) {
          l.style.transition = "none"
          l.style.strokeDashoffset = "300"
        }
      })
      setLanded(Array(6).fill(true))
      setAbsorbed(true)
      return
    }

    // reset to the pre-animation state, then replay
    canvas.classList.remove("hv4-go", "hv4-absorbed")
    chipRefs.current.forEach((ch) => {
      if (ch) {
        ch.style.transition = ""
        ch.style.transform = ""
        ch.style.opacity = ""
      }
    })
    lineRefs.current.forEach((l) => {
      if (l) {
        l.style.transition = ""
        l.style.strokeDashoffset = ""
      }
    })
    setLanded(Array(6).fill(false))
    setAbsorbed(false)
    void canvas.offsetWidth
    canvas.classList.add("hv4-go")

    // let the scattered chips + lines settle, then absorb them one by one
    timers.current.push(
      window.setTimeout(() => {
        const c = canvas.getBoundingClientRect()
        const cx = c.left + c.width / 2
        const cy = c.top + c.height / 2
        chipRefs.current.forEach((ch, i) => {
          timers.current.push(
            window.setTimeout(() => {
              if (!ch) return
              const r = ch.getBoundingClientRect()
              const dx = cx - (r.left + r.width / 2)
              const dy = cy - (r.top + r.height / 2)
              ch.style.transition = "transform .6s cubic-bezier(.55,0,.7,.4), opacity .25s ease .38s"
              ch.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.25)`
              ch.style.opacity = "0"
              const line = lineRefs.current[i]
              if (line) {
                line.style.transition = "stroke-dashoffset .6s ease"
                line.style.strokeDashoffset = "300"
              }
              timers.current.push(
                window.setTimeout(() => {
                  setLanded((prev) => {
                    const next = [...prev]
                    next[i] = true
                    return next
                  })
                }, 540)
              )
            }, i * 150)
          )
        })
        timers.current.push(
          window.setTimeout(() => {
            canvas.classList.add("hv4-absorbed")
            setAbsorbed(true)
          }, UNIFY_CHIPS.length * 150 + 650)
        )
      }, 1600)
    )
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            play()
            io.disconnect()
          }
        }),
      { threshold: 0.35 }
    )
    io.observe(canvas)
    const currentTimers = timers.current
    return () => {
      io.disconnect()
      currentTimers.forEach(window.clearTimeout)
    }
  }, [play])

  return (
    <section className="py-28 scroll-mt-16" id="platform">
      <div className="max-w-[1080px] mx-auto px-6 sm:px-8">
        <div className="text-center max-w-[620px] mx-auto">
          <span className="text-[12.5px] font-semibold tracking-[0.08em] text-primary">
            {ts(t, "landing.home.unify.eyebrow")}
          </span>
          <h2 className="hv4-fade text-[clamp(28px,3.6vw,40px)] font-bold text-[#163e64] leading-[1.16] tracking-tight mt-3 mb-3.5">
            {ts(t, "landing.home.unify.title1")}
            <br />
            {ts(t, "landing.home.unify.title2")}
          </h2>
          <p className="hv4-fade text-gray-500 leading-[1.75]">{ts(t, "landing.home.unify.sub")}</p>
        </div>

        <div
          ref={canvasRef}
          className="hv4-canvas relative max-w-[680px] h-[400px] max-sm:h-[340px] mx-auto mt-14"
          role="img"
          aria-label={ts(t, "landing.home.unify.aria")}
        >
          <svg className="hv4-usvg absolute inset-0 w-full h-full" viewBox="0 0 680 400" preserveAspectRatio="none" aria-hidden="true">
            {UNIFY_LINES.map(([x2, y2], i) => (
              <line
                key={i}
                ref={(el) => {
                  lineRefs.current[i] = el
                }}
                x1={340}
                y1={200}
                x2={x2}
                y2={y2}
                className="stroke-gray-300"
                strokeWidth={1}
              />
            ))}
          </svg>

          <div className={`hv4-ucenter ${CARD} absolute left-1/2 top-1/2 [transform:translate(-50%,-50%)] z-[2] flex flex-col items-center gap-2 px-7 py-5 shadow-[0_20px_48px_-20px_rgba(22,62,100,0.3)]`}>
            <b className="text-sm font-extrabold tracking-[0.04em] text-[#163e64]">CLASSRAUM</b>
            <div className="hv4-umods flex flex-wrap justify-center gap-[5px] max-w-[200px]">
              {UNIFY_CHIPS.map((chip, i) => (
                <span key={chip.key} className={`${landed[i] ? "hv4-on" : ""} ${chip.teal ? "hv4-teal" : ""}`}>
                  {ts(t, `landing.home.unify.mod${i + 1}`)}
                </span>
              ))}
            </div>
            <i className="not-italic text-[11px] text-gray-400">
              {absorbed ? ts(t, "landing.home.unify.cap2") : ts(t, "landing.home.unify.cap1")}
            </i>
          </div>

          {UNIFY_CHIPS.map((chip, i) => (
            <div
              key={chip.key}
              ref={(el) => {
                chipRefs.current[i] = el
              }}
              className={`hv4-uchip ${CARD} absolute z-[1] flex items-center gap-2 rounded-[10px] px-[15px] py-[9px] text-[12.5px] font-semibold text-gray-900 whitespace-nowrap`}
              style={{ left: chip.left, top: chip.top, "--sx": chip.sx, "--sy": chip.sy } as React.CSSProperties}
            >
              <s className={`w-[7px] h-[7px] rounded-full no-underline shrink-0 ${chip.teal ? "bg-[#00D0AE]" : "bg-primary"}`} />
              {ts(t, `landing.home.unify.chip${i + 1}`)}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={play}
          className="block mx-auto mt-5 font-mono text-[11px] tracking-[0.04em] text-gray-400 hover:text-primary transition-colors"
        >
          {ts(t, "landing.home.unify.replay")}
        </button>

        <div className="grid md:grid-cols-3 gap-4 max-w-[960px] mx-auto mt-14">
          {[
            { n: 1, icons: [UserCheck, Bell, FileText] },
            { n: 2, icons: [FileQuestion, Sparkles, BookOpen] },
            { n: 3, icons: [FileText, CreditCard, BarChart] },
          ].map((f) => (
            <div key={f.n} className={`${CARD} ${CARD_HOVER} hv4-fade p-6`}>
              <div className="flex items-center gap-2 mb-5">
                {f.icons.map((FlowIcon, i) => (
                  <span key={i} className="flex items-center gap-2">
                    <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <FlowIcon size={16} strokeWidth={2.2} />
                    </span>
                    {i < 2 && <span className="text-gray-300 text-sm leading-none">→</span>}
                  </span>
                ))}
              </div>
              <b className="block text-[13px] font-semibold text-[#163e64] leading-snug mb-1.5">
                {ts(t, `landing.home.unify.flow${f.n}t`)}
              </b>
              <span className="block text-[12.5px] text-gray-500 leading-relaxed">
                {ts(t, `landing.home.unify.flow${f.n}b`)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// ROI calculator — hours returned per month, estimation model disclosed below
// ---------------------------------------------------------------------------
function RoiCalculator({ t }: { t: TFunc }) {
  const [students, setStudents] = useState(120)
  const [teachers, setTeachers] = useState(6)
  const hours = Math.round((students * 18) / 60 + teachers * 4)
  const won = hours * 12000
  const wonLabel = `₩${won.toLocaleString("en-US")}`
  const unit = tOpt(t, "landing.home.calc.unit")
  const pct = (v: number, min: number, max: number) => ((v - min) / (max - min)) * 100
  const track = (p: number) => ({ background: `linear-gradient(to right, #2885e8 ${p}%, #e5e7eb ${p}%)` })

  return (
    <section className="bg-[#f8fafc] border-y border-gray-100 py-24" id="calculator">
      <div className="max-w-[1080px] mx-auto px-6 sm:px-8 grid md:grid-cols-2 gap-14 items-center">
        <div className="hv4-fade">
          <h2 className="text-[clamp(26px,3.2vw,36px)] font-bold text-[#163e64] leading-[1.16] tracking-tight mb-3">
            {ts(t, "landing.home.calc.title1")}
            <br />
            {ts(t, "landing.home.calc.title2")}
          </h2>
          <p className="text-gray-500 leading-[1.75]">{ts(t, "landing.home.calc.sub")}</p>
          <div className="mt-6">
            <label className="flex justify-between text-[13.5px] font-semibold text-gray-900 mb-2.5">
              {ts(t, "landing.home.calc.students")}
              <output className="text-primary tabular-nums">{students}{unit}</output>
            </label>
            <input
              type="range"
              min={20}
              max={400}
              step={10}
              value={students}
              onChange={(e) => setStudents(Number(e.target.value))}
              className="hv4-range w-full"
              style={track(pct(students, 20, 400))}
            />
            <div className="flex justify-between text-[11px] text-gray-400 tabular-nums mt-1.5">
              <span>20{unit}</span>
              <span>400{unit}</span>
            </div>
          </div>
          <div className="mt-5">
            <label className="flex justify-between text-[13.5px] font-semibold text-gray-900 mb-2.5">
              {ts(t, "landing.home.calc.teachers")}
              <output className="text-primary tabular-nums">{teachers}{unit}</output>
            </label>
            <input
              type="range"
              min={1}
              max={30}
              step={1}
              value={teachers}
              onChange={(e) => setTeachers(Number(e.target.value))}
              className="hv4-range w-full"
              style={track(pct(teachers, 1, 30))}
            />
            <div className="flex justify-between text-[11px] text-gray-400 tabular-nums mt-1.5">
              <span>1{unit}</span>
              <span>30{unit}</span>
            </div>
          </div>
        </div>
        <div className={`${CARD} hv4-fade p-8 text-center`}>
          <i className="not-italic block text-[12.5px] text-gray-500 mb-1.5">{ts(t, "landing.home.calc.outLabel")}</i>
          <b className="block text-[44px] font-bold text-[#163e64] tracking-tight tabular-nums leading-tight">
            {hours}
            {ts(t, "landing.home.calc.hoursSuffix")}
          </b>
          <p className="text-[15px] text-gray-500 mt-2 tabular-nums">
            {tOpt(t, "landing.home.calc.wonPrefix")}
            {wonLabel}
            {tOpt(t, "landing.home.calc.wonSuffix")}
          </p>
          <p className="text-[11.5px] text-gray-400 mt-4 leading-relaxed">{ts(t, "landing.home.calc.note")}</p>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------

function HomeContent() {
  const { t, language } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [appUrl, setAppUrl] = useState("https://app.classraum.com")
  const [activeMoment, setActiveMoment] = useState(-1)
  useReveal()

  // Scrollspy for the day ruler: highlight the moment currently in view
  useEffect(() => {
    const ids = ["m1", "m2", "m3", "m4", "m5"]
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[]
    if (els.length === 0) return
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) setActiveMoment(ids.indexOf(e.target.id))
        }),
      { rootMargin: "-35% 0px -55% 0px", threshold: 0 }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  // Handle authentication redirects (Supabase auth callback lands on "/")
  useEffect(() => {
    const code = searchParams.get("code")
    const type = searchParams.get("type")

    if (code && type === "recovery") {
      // For password recovery, just redirect to auth page with the reset type
      // Don't exchange the code here - Supabase will handle it differently for password reset
      router.push("/auth?type=reset")
    } else if (code) {
      // Exchange code for session for other auth flows
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          console.error("Code exchange error:", error)
          router.push("/auth?error=invalid_code")
        } else {
          router.push("/dashboard")
        }
      })
    }
  }, [searchParams, router])

  // Set the correct app URL based on environment
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hostname === "localhost") {
      const { protocol, port } = window.location
      setAppUrl(`${protocol}//app.localhost${port ? ":" + port : ""}`)
    }
  }, [])

  const signupUrl = `${appUrl}/auth?lang=${language}`

  const ctaButtons = (startKey: string, inquiryKey: string, kakaoKey: string) => (
    <div className="flex justify-center gap-2.5 flex-wrap">
      <a href={signupUrl}>
        <Button size="lg" className="text-sm sm:text-base px-6">
          {ts(t, startKey)}
        </Button>
      </a>
      <a href={INQUIRY_URL}>
        <Button variant="outline" size="lg" className="text-sm sm:text-base px-6">
          {ts(t, inquiryKey)}
        </Button>
      </a>
      {KAKAO_CHANNEL_URL && (
        <a
          href={KAKAO_CHANNEL_URL}
          className="inline-flex items-center gap-2 h-11 px-[18px] rounded-md bg-[#FEE500] text-[#191919] font-semibold text-sm"
        >
          <i className="not-italic w-[18px] h-[18px] rounded-full bg-[#191919] text-[#FEE500] inline-flex items-center justify-center text-[10px] font-extrabold">
            K
          </i>
          {ts(t, kakaoKey)}
        </a>
      )}
    </div>
  )

  const ruler = [
    { href: "#m1", time: "14:50", label: "attendance", night: false, Icon: UserCheck },
    { href: "#m2", time: "19:30", label: "study", night: true, Icon: BookOpen },
    { href: "#m3", time: "21:04", label: "billing", night: true, Icon: CreditCard },
    { href: "#m4", time: ts(t, "landing.home.ruler.friday"), label: "report", night: false, Icon: FileText },
    { href: "#m5", time: ts(t, "landing.home.ruler.monthEnd"), label: "close", night: false, Icon: BarChart },
  ]

  return (
    <div className="min-h-screen bg-background overflow-x-clip">
      <Header currentPage="home" />

      {/* Hero */}
      <header className="relative pt-20 pb-14 text-center overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(560px 260px at 50% -40px, rgba(40,133,232,.06), transparent 70%)" }}
        />
        <div className="relative max-w-[1080px] mx-auto px-6 sm:px-8">
          <h1 className="text-[clamp(38px,5.4vw,64px)] font-bold text-[#163e64] leading-[1.16] tracking-[-0.024em]">
            {ts(t, "landing.home.hero.title1")}
            <br />
            {ts(t, "landing.home.hero.title2")}
          </h1>
          <span className="block text-[13px] text-gray-400 mt-3 mb-6">{ts(t, "landing.home.hero.tagline")}</span>
          <p className="text-gray-500 text-base sm:text-[16.5px] leading-[1.75] max-w-[52ch] mx-auto mb-8">
            {ts(t, "landing.home.hero.sub")}
          </p>
          {ctaButtons("landing.home.hero.ctaStart", "landing.home.hero.ctaInquiry", "landing.home.hero.ctaKakao")}
          <p className="text-[13px] text-gray-400 mt-4 tabular-nums">{ts(t, "landing.home.hero.anchor")}</p>

          {/* Real product — the manager dashboard, rendered live */}
          <div className="relative max-w-[980px] mx-auto mt-14">
            <div
              aria-hidden="true"
              className="absolute -inset-x-16 -top-10 -bottom-6 pointer-events-none"
              style={{ background: "radial-gradient(60% 55% at 50% 42%, rgba(40,133,232,0.09), rgba(0,208,174,0.05) 55%, transparent 75%)" }}
            />
            <div className="hv4-hero-panel relative">
              <DashboardMock t={t} label={ts(t, "landing.home.shots.dashboard")} />
            </div>
          </div>

          {/* Day ruler */}
          <div className="max-w-[860px] mx-auto mt-14" id="day">
            <div className="relative flex justify-between">
              {/* day → night → day gradient through the tick centers */}
              <div
                className="absolute left-[10%] right-[10%] top-[14px] h-px"
                style={{
                  background:
                    "linear-gradient(90deg, #e5e7eb 0%, #e5e7eb 15%, #16304d 25%, #16304d 50%, #e5e7eb 62%, #e5e7eb 100%)",
                }}
              />
              {ruler.map((tick, i) => {
                const active = activeMoment === i
                return (
                  <a
                    key={tick.href}
                    href={tick.href}
                    onClick={(e) => {
                      e.preventDefault()
                      document
                        .getElementById(tick.href.slice(1))
                        ?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth" })
                    }}
                    className="relative flex-1 text-center no-underline group"
                  >
                    <span
                      className={`w-7 h-7 mx-auto mb-2 rounded-full flex items-center justify-center relative z-[1] transition-all duration-300 ${
                        active
                          ? "bg-primary text-white ring-4 ring-primary/15 scale-110"
                          : tick.night
                            ? "bg-[#0b2138] text-[#8fa8c2] ring-1 ring-[#0b2138] group-hover:text-white"
                            : "bg-white text-gray-400 ring-1 ring-gray-200 group-hover:text-primary group-hover:ring-primary/40"
                      }`}
                    >
                      <tick.Icon size={13} strokeWidth={2.2} />
                    </span>
                    <b
                      className={`block font-mono text-[11px] font-semibold tabular-nums transition-colors ${
                        active ? "text-primary" : "text-[#163e64] group-hover:text-primary"
                      }`}
                    >
                      {tick.time}
                    </b>
                    <span className="text-[10px] sm:text-[11.5px] text-gray-400 group-hover:text-gray-500 transition-colors whitespace-nowrap">
                      {ts(t, `landing.home.ruler.${tick.label}`)}
                    </span>
                  </a>
                )
              })}
            </div>
          </div>
        </div>
      </header>

      {/* The problem — carried over from the original landing page, restyled */}
      <section className="pt-24 pb-4">
        <div className="max-w-[1080px] mx-auto px-6 sm:px-8">
          <div className="text-center max-w-[640px] mx-auto mb-12 hv4-fade">
            <h2 className="text-[clamp(26px,3.2vw,36px)] font-bold text-[#163e64] leading-[1.16] tracking-tight mb-3">
              {ts(t, "landing.problemSection.title")}
            </h2>
            <p className="text-gray-500 leading-[1.75]">
              {ts(t, "landing.problemSection.description")}{" "}
              <span className="font-semibold text-primary">{ts(t, "landing.problemSection.highlightText")}</span>.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                num: "30–50%",
                key: "administrative",
                accent: "text-rose-500",
                rule: "bg-rose-200",
                glow: "hover:shadow-[0_20px_44px_-16px_rgba(244,63,94,0.35)] hover:ring-rose-100",
              },
              {
                num: "5–10",
                key: "fragmented",
                accent: "text-amber-500",
                rule: "bg-amber-200",
                glow: "hover:shadow-[0_20px_44px_-16px_rgba(245,158,11,0.35)] hover:ring-amber-100",
              },
              {
                num: "70%",
                key: "quality",
                accent: "text-purple-500",
                rule: "bg-purple-200",
                glow: "hover:shadow-[0_20px_44px_-16px_rgba(168,85,247,0.35)] hover:ring-purple-100",
              },
            ].map((p) => (
              <div
                key={p.key}
                className={`${CARD} hv4-pcard hv4-fade group px-6 py-6 flex flex-col transition-all duration-300 hover:-translate-y-1 ${p.glow}`}
              >
                {/* Editorial stat header — the number IS the visual.
                    (The pastel icon-chip + stock-glyph row this replaces
                    read as template filler; each card's bespoke chart
                    below carries the imagery instead.) */}
                <div className="mb-4">
                  <b className={`block text-[38px] leading-none font-bold tracking-tight tabular-nums ${p.accent}`}>
                    {p.num}
                  </b>
                  <span className={`block w-8 h-[3px] rounded-full mt-3 transition-all duration-300 group-hover:w-14 ${p.rule}`} />
                </div>
                <h3 className="text-[15px] font-semibold text-gray-900 mb-1.5">
                  {ts(t, `landing.problemSection.painPoints.${p.key}.title`)}
                </h3>
                <p className="text-[13px] text-gray-500 leading-relaxed">
                  {ts(t, `landing.problemSection.painPoints.${p.key}.description`)}
                </p>
                <div className="mt-auto pt-5" aria-hidden="true">
                  {p.key === "administrative" && (
                    <div>
                      {/* gauge: the 30–50% band of educator time lost to admin */}
                      <svg viewBox="0 0 120 64" className="w-full h-[64px]">
                        <defs>
                          <linearGradient id="hv4-grad-rose" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#fda4af" />
                            <stop offset="100%" stopColor="#f43f5e" />
                          </linearGradient>
                        </defs>
                        <path d="M10 58 A50 50 0 0 1 110 58" fill="none" stroke="#ffe4e6" strokeWidth="10" strokeLinecap="round" />
                        <path
                          className="hv4-gauge-band"
                          d="M10 58 A50 50 0 0 1 110 58"
                          fill="none"
                          stroke="url(#hv4-grad-rose)"
                          strokeWidth="10"
                          strokeLinecap="round"
                          strokeDasharray="31.4 999"
                          strokeDashoffset="-47.1"
                        />
                      </svg>
                      <div className="flex justify-between text-[10px] text-gray-300 tabular-nums -mt-1">
                        <span>0%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  )}
                  {p.key === "fragmented" && (
                    <div className="hv4-tiles flex gap-1.5 items-end h-[44px]">
                      {/* 10 tool tiles — 5 to 10 of them juggled daily */}
                      {Array.from({ length: 10 }, (_, i) => (
                        <span
                          key={i}
                          className={`flex-1 rounded-md flex items-start justify-center pt-1 ${
                            i < 5
                              ? "h-full bg-gradient-to-b from-amber-300 to-amber-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]"
                              : "h-[72%] bg-amber-100/80"
                          }`}
                        >
                          <span className={`w-1 h-1 rounded-full ${i < 5 ? "bg-white/80" : "bg-amber-300"}`} />
                        </span>
                      ))}
                    </div>
                  )}
                  {p.key === "quality" && (
                    <svg viewBox="0 0 104 42" className="w-full h-[42px]">
                      <defs>
                        <linearGradient id="hv4-grad-purple" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#c084fc" stopOpacity="0.35" />
                          <stop offset="100%" stopColor="#c084fc" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <line x1="2" y1="8" x2="98" y2="8" stroke="#e9d5ff" strokeDasharray="3 3" strokeWidth="1" />
                      <path d="M2 8 L20 12 L38 15 L56 22 L74 27 L98 33 L98 42 L2 42 Z" fill="url(#hv4-grad-purple)" />
                      <polyline
                        points="2,8 20,12 38,15 56,22 74,27 98,33"
                        fill="none"
                        stroke="#a855f7"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle className="hv4-spark-halo" cx="98" cy="33" r="3.5" fill="#a855f7" opacity="0" />
                      <circle cx="98" cy="33" r="3.5" fill="#a855f7" />
                    </svg>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 14:50 — attendance */}
      <section className="py-24 scroll-mt-16" id="m1">
        <div className="max-w-[1080px] mx-auto px-6 sm:px-8 grid md:grid-cols-[130px_1fr] gap-9">
          <SectionTime time="14:50" when={ts(t, "landing.home.m1.when")} />
          <div className="min-w-0">
            <h2 className="hv4-fade text-[clamp(26px,3.2vw,36px)] font-bold text-[#163e64] leading-[1.16] tracking-tight mb-3">
              {ts(t, "landing.home.m1.title1")}
              <br />
              {ts(t, "landing.home.m1.title2")}
            </h2>
            <p className="hv4-fade text-gray-500 leading-[1.75] max-w-[56ch] mb-8">{ts(t, "landing.home.m1.sub")}</p>
            <div className="grid md:grid-cols-[1.3fr_1fr] gap-4 items-start">
              <AttendanceMock t={t} className="hv4-fade" />
              <div className="hv4-fade">
                <PushNotificationCard t={t} />
                <p className="text-xs text-gray-400 mt-2.5 leading-normal">{ts(t, "landing.home.m1.caption")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Night: 19:30 study + 21:04 billing */}
      <div className="bg-gradient-to-b from-[#0b2138] to-[#0e2846]">
        <section className="py-24 scroll-mt-16" id="m2">
          <div className="max-w-[1080px] mx-auto px-6 sm:px-8 grid md:grid-cols-[130px_1fr] gap-9">
            <div className="md:text-right hv4-fade">
              <b className="block font-mono text-[15px] font-semibold text-[#00D0AE] tabular-nums">19:30</b>
              <span className="text-xs text-[#7e97b2]">{ts(t, "landing.home.m2.when")}</span>
            </div>
            <div className="min-w-0">
              <h2 className="hv4-fade text-[clamp(26px,3.2vw,36px)] font-bold text-white leading-[1.16] tracking-tight mb-3">
                {ts(t, "landing.home.m2.title1")}
                <br />
                {ts(t, "landing.home.m2.title2")}
              </h2>
              <p className="hv4-fade text-[#9db3ca] leading-[1.75] max-w-[56ch] mb-8">{ts(t, "landing.home.m2.sub")}</p>
              <div className="grid md:grid-cols-[230px_1fr_1fr] gap-4 items-start">
                <StudyPhoneMock
                  t={t}
                  label={ts(t, "landing.home.shots.study")}
                  className="hv4-fade max-md:max-w-[230px] max-md:mx-auto"
                />
                <div className="hv4-fade rounded-2xl overflow-hidden bg-white shadow-[0_16px_40px_-16px_rgba(0,0,0,0.5)]">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 text-[12.5px] text-gray-400">
                    <b className="font-bold text-[#163e64]">{ts(t, "landing.home.m2.uiTitle")}</b>
                    <span>{ts(t, "landing.home.m2.streak")}</span>
                  </div>
                  <div className="px-4 py-3.5 border-b border-gray-100">
                    <i className="not-italic block text-[10.5px] text-gray-400 mb-0.5">{ts(t, "landing.home.m2.goalLabel")}</i>
                    <b className="text-base font-bold text-[#163e64] tabular-nums">{ts(t, "landing.home.m2.goalValue")}</b>
                    <div className="h-1 bg-gray-100 rounded-full mt-2.5 overflow-hidden">
                      <span className="block h-full w-[60%] bg-primary" />
                    </div>
                  </div>
                  {[
                    { label: ts(t, "landing.home.m2.item1"), cta: ts(t, "landing.home.m2.item1cta") },
                    { label: ts(t, "landing.home.m2.item2"), cta: ts(t, "landing.home.m2.item2cta") },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between items-center gap-2 px-4 py-2.5 border-b border-gray-100 last:border-0 text-[12.5px] text-gray-700">
                      <span>{item.label}</span>
                      <span className="text-[10px] font-bold text-primary bg-primary/10 rounded-full px-2.5 py-0.5 whitespace-nowrap">{item.cta}</span>
                    </div>
                  ))}
                </div>
                <div className="hv4-fade rounded-2xl overflow-hidden bg-white shadow-[0_16px_40px_-16px_rgba(0,0,0,0.5)]">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 text-[12.5px] text-gray-400">
                    <b className="font-bold text-[#163e64]">{ts(t, "landing.home.m2.snapTitle")}</b>
                    <span className="tabular-nums">19:42</span>
                  </div>
                  {[
                    { time: "19:42:07", text: ts(t, "landing.home.m2.snap1") },
                    { time: "19:42:11", text: ts(t, "landing.home.m2.snap2") },
                    { time: "19:42:14", text: ts(t, "landing.home.m2.snap3") },
                  ].map((step) => (
                    <div key={step.time} className="flex gap-3 px-4 py-2.5 border-b border-gray-100 last:border-0 text-[12.5px] text-gray-700 items-baseline">
                      <b className="font-mono text-[10px] font-semibold text-primary w-14 shrink-0">{step.time}</b>
                      <span>{step.text}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Link
                href="/study"
                className="hv4-fade inline-flex items-center gap-1.5 mt-7 text-sm font-semibold text-[#00D0AE] hover:text-white transition-colors"
              >
                {ts(t, "landing.studySection.cta")}
              </Link>
            </div>
          </div>
        </section>

        <section className="pb-24 scroll-mt-24" id="m3">
          <div className="max-w-[1080px] mx-auto px-6 sm:px-8 grid md:grid-cols-[130px_1fr] gap-9">
            <div className="md:text-right hv4-fade">
              <b className="block font-mono text-[15px] font-semibold text-[#00D0AE] tabular-nums">21:04</b>
              <span className="text-xs text-[#7e97b2]">{ts(t, "landing.home.m3.when")}</span>
            </div>
            <div className="min-w-0">
              <h2 className="hv4-fade text-[clamp(26px,3.2vw,36px)] font-bold text-white leading-[1.16] tracking-tight mb-3">
                {ts(t, "landing.home.m3.title1")}
                <br />
                {ts(t, "landing.home.m3.title2")}
              </h2>
              <p className="hv4-fade text-[#9db3ca] leading-[1.75] max-w-[56ch] mb-8">{ts(t, "landing.home.m3.sub")}</p>
              <div className="grid md:grid-cols-[230px_1fr] gap-6 items-start">
                <InvoicePhoneMock
                  t={t}
                  label={ts(t, "landing.home.shots.payments")}
                  className="hv4-fade max-md:max-w-[230px] max-md:mx-auto"
                />
                <div className="hv4-fade md:pt-2">
                  <div className="rounded-2xl overflow-hidden bg-white shadow-[0_16px_40px_-16px_rgba(0,0,0,0.5)] max-w-[340px]">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 text-[12.5px]">
                      <b className="font-bold text-[#163e64]">{ts(t, "landing.home.m3.uiTitle")}</b>
                      <span className="text-[10px] font-semibold text-gray-400 border border-gray-200 rounded-full px-2 py-0.5">
                        {ts(t, "landing.home.m3.uiApp")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100 text-[12.5px] text-gray-600">
                      <span>{ts(t, "landing.home.m3.row1")}</span>
                      <b className="font-semibold text-[#163e64] tabular-nums">₩380,000</b>
                    </div>
                    <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100 text-[12.5px] text-gray-600">
                      <span>{ts(t, "landing.home.m3.row2")}</span>
                      <b className="font-semibold text-[#163e64] tabular-nums">₩24,000</b>
                    </div>
                    <div className="p-4">
                      <span className="block text-center bg-primary text-white text-[12.5px] font-bold rounded-[10px] py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
                        {ts(t, "landing.home.m3.payBtn")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Friday 15:00 — AI report cards */}
      <section className="py-24 scroll-mt-16" id="m4">
        <div className="max-w-[1080px] mx-auto px-6 sm:px-8 grid md:grid-cols-[130px_1fr] gap-9">
          <SectionTime time={ts(t, "landing.home.ruler.friday")} when={ts(t, "landing.home.m4.when")} />
          <div className="min-w-0">
            <h2 className="hv4-fade text-[clamp(26px,3.2vw,36px)] font-bold text-[#163e64] leading-[1.16] tracking-tight mb-3">
              {ts(t, "landing.home.m4.title1")}
              <br />
              {ts(t, "landing.home.m4.title2")}
            </h2>
            <p className="hv4-fade text-gray-500 leading-[1.75] max-w-[56ch] mb-8">{ts(t, "landing.home.m4.sub")}</p>
            <ReportDemo t={t} />
          </div>
        </div>
      </section>

      {/* Month-end — dashboard */}
      <section className="pt-4 pb-24 scroll-mt-16" id="m5">
        <div className="max-w-[1080px] mx-auto px-6 sm:px-8 grid md:grid-cols-[130px_1fr] gap-9">
          <SectionTime time={ts(t, "landing.home.ruler.monthEnd")} when={ts(t, "landing.home.m5.when")} />
          <div className="min-w-0">
            <h2 className="hv4-fade text-[clamp(26px,3.2vw,36px)] font-bold text-[#163e64] leading-[1.16] tracking-tight mb-3">
              {ts(t, "landing.home.m5.title1")}
              <br />
              {ts(t, "landing.home.m5.title2")}
            </h2>
            <p className="hv4-fade text-gray-500 leading-[1.75] max-w-[56ch] mb-8">{ts(t, "landing.home.m5.sub")}</p>
            <div className="hv4-fade max-w-[820px]">
              <PaymentsMock t={t} label={ts(t, "landing.home.shots.paymentsAdmin")} />
            </div>
          </div>
        </div>
      </section>

      <UnifySection t={t} />

      {/* Everything in one place — feature detail from the original landing page */}
      <section className="pb-24">
        <div className="max-w-[1080px] mx-auto px-6 sm:px-8">
          <div className="text-center max-w-[640px] mx-auto mb-12 hv4-fade">
            <h2 className="text-[clamp(26px,3.2vw,36px)] font-bold text-[#163e64] leading-[1.16] tracking-tight mb-3">
              {ts(t, "landing.solutionSection.title")}
            </h2>
            <p className="text-gray-500 leading-[1.75]">{ts(t, "landing.solutionSection.description")}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { key: "aiReports", items: ["progress", "financial", "attendance"], Mini: MiniReports, alt: "reports" },
              { key: "scheduling", items: ["aiPlanning", "optimization", "resources"], Mini: MiniCalendar, alt: "sessions" },
              { key: "communication", items: ["messaging", "notifications", "emergency"], Mini: MiniComms, alt: "reports" },
            ].map((f) => (
              <div key={f.key} className={`${CARD} ${CARD_HOVER} hv4-fade overflow-hidden p-0`}>
                <div className="h-44 border-b border-gray-100 overflow-hidden">
                  <f.Mini t={t} label={ts(t, `landing.home.shots.${f.alt}`)} />
                </div>
                <div className="p-6">
                <h3 className="text-base font-bold text-[#163e64] mb-2">
                  {ts(t, `landing.solutionSection.features.${f.key}.title`)}
                </h3>
                <p className="text-[13.5px] text-gray-500 leading-relaxed mb-4">
                  {ts(t, `landing.solutionSection.features.${f.key}.description`)}
                </p>
                <ul className="space-y-2">
                  {f.items.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-[13px] text-gray-600">
                      <s className="w-1.5 h-1.5 rounded-full bg-[#00D0AE] no-underline shrink-0 mt-1.5" />
                      {ts(t, `landing.solutionSection.features.${f.key}.items.${item}`)}
                    </li>
                  ))}
                </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <RoiCalculator t={t} />

      {/* CTA */}
      <section className="pt-28 pb-28 text-center">
        <div className="max-w-[1080px] mx-auto px-6 sm:px-8 hv4-fade">
          <h2 className="text-[clamp(30px,4.2vw,48px)] font-bold text-[#163e64] leading-[1.16] tracking-tight mb-3">
            {ts(t, "landing.home.cta.title1")}
            <br />
            {ts(t, "landing.home.cta.title2")}
          </h2>
          <p className="text-gray-500 leading-[1.75] max-w-[44ch] mx-auto mb-8">{ts(t, "landing.home.cta.sub")}</p>
          {ctaButtons("landing.home.cta.ctaStart", "landing.home.cta.ctaInquiry", "landing.home.cta.ctaKakao")}
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default function Home() {
  // Null fallback — the Suspense boundary exists only so client hooks
  // inside HomeContent (useSearchParams, etc.) have somewhere to suspend.
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  )
}
