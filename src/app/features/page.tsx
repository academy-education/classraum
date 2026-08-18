"use client"

import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import Header from "@/components/shared/Header"
import Footer from "@/components/shared/Footer"
import { useTranslation } from "@/hooks/useTranslation"
import {
  MessageSquare,
  Megaphone,
  Users,
  Archive,
  HelpCircle,
  Globe,
  ShieldCheck,
  KeyRound,
  Database,
  Lock,
} from "lucide-react"
import {
  DashboardMock,
  PaymentsMock,
  StudyPhoneMock,
  AttendanceMock,
  PushNotificationCard,
  ReportDemo,
  ExamsMock,
  AssignmentsMock,
  MiniCalendar,
} from "@/components/marketing/ProductMocks"
import { CARD, CARD_HOVER, WRAP, type TFunc, ts, useReveal, NightBadge, NightLink } from "@/components/marketing/ui"

const F = "landing.featuresPage."

/* Corner glyphs for the "everything else" grid. Each is drawn in the
 * card's own accent at low opacity and animates only while its card is
 * hovered, so the section has motion without six things competing for
 * attention at rest. Deliberately inline SVG rather than an icon font:
 * these are diagrams of the feature, not symbols of it. */
const GLYPH_WRAP =
  "pointer-events-none absolute -right-3 -top-3 w-[104px] h-[104px] text-primary opacity-[0.13] transition-opacity duration-300 group-hover:opacity-[0.26]"

function GlyphThread() {
  return (
    <svg className={GLYPH_WRAP} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          className="ft-thread"
          x={18 + i * 6}
          y={20 + i * 20}
          width={54 - i * 8}
          height="14"
          rx="7"
          fill="currentColor"
          style={{ animationDelay: `${i * 160}ms` }}
        />
      ))}
    </svg>
  )
}

function GlyphBroadcast() {
  return (
    <svg className={GLYPH_WRAP} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <circle cx="34" cy="52" r="6" fill="currentColor" />
      {[16, 28, 40].map((r, i) => (
        <circle
          key={r}
          className="ft-wave"
          cx="34"
          cy="52"
          r={r}
          stroke="currentColor"
          strokeWidth="2.5"
          style={{ animationDelay: `${i * 320}ms` }}
        />
      ))}
    </svg>
  )
}

function GlyphRoster() {
  return (
    <svg className={GLYPH_WRAP} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <circle cx="50" cy="50" r="9" fill="currentColor" />
      <g className="ft-orbit" style={{ transformOrigin: "50px 50px" }}>
        <circle cx="50" cy="50" r="26" stroke="currentColor" strokeWidth="2" strokeDasharray="4 6" />
        {[0, 120, 240].map((deg) => (
          <circle key={deg} cx={50 + 26 * Math.cos((deg * Math.PI) / 180)} cy={50 + 26 * Math.sin((deg * Math.PI) / 180)} r="5" fill="currentColor" />
        ))}
      </g>
    </svg>
  )
}

function GlyphArchive() {
  return (
    <svg className={GLYPH_WRAP} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <rect x="20" y="44" width="60" height="34" rx="6" fill="currentColor" opacity="0.55" />
      <rect className="ft-lid" x="16" y="30" width="68" height="14" rx="5" fill="currentColor" />
      <rect x="42" y="56" width="16" height="4" rx="2" fill="#fff" opacity="0.8" />
    </svg>
  )
}

function GlyphHelp() {
  return (
    <svg className={GLYPH_WRAP} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <circle className="ft-pulse" cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="2.5" style={{ transformOrigin: "50px 50px" }} />
      <path d="M42 42a8 8 0 1 1 10 11v5" stroke="currentColor" strokeWidth="5" strokeLinecap="round" fill="none" />
      <circle cx="52" cy="66" r="3.2" fill="currentColor" />
    </svg>
  )
}

function GlyphGlobe() {
  return (
    <svg className={GLYPH_WRAP} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <circle cx="50" cy="50" r="28" stroke="currentColor" strokeWidth="2.5" />
      <g className="ft-spin" style={{ transformOrigin: "50px 50px" }}>
        <ellipse cx="50" cy="50" rx="12" ry="28" stroke="currentColor" strokeWidth="2" />
        <ellipse cx="50" cy="50" rx="24" ry="28" stroke="currentColor" strokeWidth="1.4" opacity="0.7" />
      </g>
      <path d="M22 50h56" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function FeatureSection({
  id,
  t,
  section,
  reverse = false,
  children,
}: {
  id: string
  t: TFunc
  section: string
  reverse?: boolean
  children: React.ReactNode
}) {
  return (
    <section id={id} className="py-16 sm:py-20 scroll-mt-16 border-t border-gray-100 first:border-t-0">
      <div className={`${WRAP} grid md:grid-cols-2 gap-10 md:gap-14 items-center`}>
        <div className={`min-w-0 ${reverse ? "md:order-2" : ""}`}>
          <h2 className="hv4-fade text-[clamp(24px,2.8vw,32px)] font-bold text-[#163e64] leading-[1.16] tracking-tight mb-3">
            {ts(t, `${F}${section}.title`)}
          </h2>
          <p className="hv4-fade text-gray-500 leading-[1.75] max-w-[52ch]">{ts(t, `${F}${section}.sub`)}</p>
        </div>
        <div className={`min-w-0 hv4-fade ${reverse ? "md:order-1" : ""}`}>{children}</div>
      </div>
    </section>
  )
}

export default function FeaturesPage() {
  const { t, language } = useTranslation()
  const [appUrl, setAppUrl] = useState("https://app.classraum.com")
  useReveal()

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hostname === "localhost") {
      const { protocol, port } = window.location
      setAppUrl(`${protocol}//app.localhost${port ? ":" + port : ""}`)
    }
  }, [])

  const signupUrl = `${appUrl}/auth?lang=${language}`

  return (
    <div className="min-h-screen bg-background overflow-x-clip">
      <Header currentPage="features" />

      {/* Hero */}
      <header className="relative pt-20 pb-16 text-center">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(560px 260px at 50% -40px, rgba(40,133,232,.06), transparent 70%)" }}
        />
        <div className={`relative ${WRAP}`}>
          <span className="text-[12.5px] font-semibold tracking-[0.08em] text-primary">{ts(t, F + "hero.eyebrow")}</span>
          <h1 className="text-[clamp(34px,4.6vw,56px)] font-bold text-[#163e64] leading-[1.16] tracking-[-0.024em] mt-3">
            {ts(t, F + "hero.title1")}
            <br />
            {ts(t, F + "hero.title2")}
          </h1>
          <p className="text-gray-500 text-base sm:text-[16.5px] leading-[1.75] max-w-[52ch] mx-auto mt-5">
            {ts(t, F + "hero.sub")}
          </p>
        </div>
      </header>

      <FeatureSection id="dashboard" t={t} section="dashboard">
        <DashboardMock t={t} label={ts(t, "landing.home.shots.dashboard")} />
      </FeatureSection>

      <FeatureSection id="sessions" t={t} section="sessions" reverse>
        <div className={`${CARD} overflow-hidden h-[260px]`}>
          <MiniCalendar t={t} label={ts(t, "landing.home.shots.sessions")} />
        </div>
      </FeatureSection>

      <FeatureSection id="attendance" t={t} section="attendance">
        <div className="space-y-4">
          <AttendanceMock t={t} />
          <PushNotificationCard t={t} className="max-w-[340px] ml-auto" />
        </div>
      </FeatureSection>

      <FeatureSection id="assignments" t={t} section="assignments" reverse>
        <AssignmentsMock t={t} />
      </FeatureSection>

      <FeatureSection id="reports" t={t} section="reports">
        <ReportDemo t={t} />
      </FeatureSection>

      <FeatureSection id="payments" t={t} section="payments" reverse>
        <PaymentsMock t={t} label={ts(t, "landing.home.shots.paymentsAdmin")} />
      </FeatureSection>

      <FeatureSection id="communication" t={t} section="communication">
        <div className="space-y-3 max-w-[400px]">
          <PushNotificationCard t={t} />
          <PushNotificationCard
            t={t}
            className="ml-6 sm:ml-10"
            title={ts(t, "landing.home.mock.msg2")}
            body={ts(t, "landing.home.mock.rpt2")}
            time="18:00"
          />
          <PushNotificationCard
            t={t}
            className="ml-12 sm:ml-20"
            title={ts(t, `${F}commMock.n3t`)}
            body={ts(t, `${F}commMock.n3b`)}
            time={ts(t, `${F}commMock.n3time`)}
          />
        </div>
      </FeatureSection>

      <FeatureSection id="exams" t={t} section="exams" reverse>
        <ExamsMock t={t} />
      </FeatureSection>

      {/* Study — night band, consistent with the homepage's evening moment */}
      <section id="study" className="scroll-mt-16 bg-gradient-to-b from-[#0b2138] to-[#0e2846] py-16 sm:py-20 mt-4">
        <div className={`${WRAP} grid md:grid-cols-2 gap-10 md:gap-14 items-center`}>
          <div className="min-w-0">
            <span className="hv4-fade inline-block mb-4">
              <NightBadge>{ts(t, "landing.studySection.eyebrow")}</NightBadge>
            </span>
            <h2 className="hv4-fade text-[clamp(24px,2.8vw,32px)] font-bold text-white leading-[1.16] tracking-tight mb-3">
              {ts(t, F + "study.title")}
            </h2>
            <p className="hv4-fade text-[#9db3ca] leading-[1.75] max-w-[52ch] mb-6">{ts(t, F + "study.sub")}</p>
            <span className="hv4-fade inline-block">
              <NightLink href="/study">{ts(t, "landing.studySection.cta").replace(/\s*→\s*$/, "")}</NightLink>
            </span>
          </div>
          <div className="min-w-0 hv4-fade">
            <StudyPhoneMock
              t={t}
              label={ts(t, "landing.home.shots.study")}
              className="max-w-[250px] mx-auto"
            />
          </div>
        </div>
      </section>

      {/* ── Everything else.

           This was six flat cards, each in a different hue — the one
           thing the rest of the site never does, and with nothing moving
           it read as a footnote to the page rather than part of it.

           Now: one accent, a drifting aurora behind the grid, and a
           per-card glyph that animates on hover — the orbit rings turn,
           the signal arcs pulse outward, the archive lid lifts. Each
           graphic says something about its own feature rather than being
           decoration applied six times. Every animation is paused under
           prefers-reduced-motion (see home.css). */}
      <section id="more" className="relative overflow-hidden py-16 sm:py-20 scroll-mt-16 border-t border-gray-100">
        <span aria-hidden="true" className="ft-aurora ft-aurora-a" />
        <span aria-hidden="true" className="ft-aurora ft-aurora-b" />
        <div className={`relative ${WRAP}`}>
          <div className="text-center max-w-[640px] mx-auto mb-10">
            <h2 className="hv4-fade text-[clamp(24px,2.8vw,32px)] font-bold text-[#163e64] leading-[1.16] tracking-tight">
              {ts(t, F + "more.title")}
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { n: 1, Icon: MessageSquare, Glyph: GlyphThread },
              { n: 2, Icon: Megaphone, Glyph: GlyphBroadcast },
              { n: 3, Icon: Users, Glyph: GlyphRoster },
              { n: 4, Icon: Archive, Glyph: GlyphArchive },
              { n: 5, Icon: HelpCircle, Glyph: GlyphHelp },
              { n: 6, Icon: Globe, Glyph: GlyphGlobe },
            ].map(({ n, Icon, Glyph }) => (
              <div
                key={n}
                className={`${CARD} ${CARD_HOVER} hv4-fade group relative overflow-hidden px-6 py-6`}
                style={{ transitionDelay: `${(n - 1) * 60}ms` }}
              >
                <span className="absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,#2885e8,#00D0AE)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                {/* the graphic lives in the corner, quiet until hover */}
                <Glyph />
                <span className="relative w-11 h-11 rounded-xl bg-[linear-gradient(140deg,rgba(40,133,232,0.14),rgba(0,208,174,0.16))] ring-1 ring-primary/15 text-primary flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                  <Icon size={19} strokeWidth={2.2} />
                </span>
                <h3 className="relative text-[15px] font-semibold text-gray-900">{ts(t, `${F}more.m${n}t`)}</h3>
                <p className="relative text-[13px] text-gray-500 leading-relaxed mt-1">{ts(t, `${F}more.m${n}b`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy — hidden at Andy's request (2026-08-18). Kept in place
          rather than deleted: the copy and the three sub-cards are still
          live in the locale files, so this is a one-line revert. */}
      <section id="privacy" hidden className="py-16 sm:py-20 scroll-mt-16 bg-[#f8fafc] border-y border-gray-100">
        <div className={WRAP}>
          <div className="text-center max-w-[640px] mx-auto mb-10">
            <span className="mx-auto mb-5 w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center hv4-fade">
              <ShieldCheck size={22} strokeWidth={2.2} />
            </span>
            <h2 className="hv4-fade text-[clamp(24px,2.8vw,32px)] font-bold text-[#163e64] leading-[1.16] tracking-tight mb-3">
              {ts(t, F + "privacy.title")}
            </h2>
            <p className="hv4-fade text-gray-500 leading-[1.75]">{ts(t, F + "privacy.sub")}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { n: 1, Icon: KeyRound },
              { n: 2, Icon: Database },
              { n: 3, Icon: Lock },
            ].map(({ n, Icon }) => (
              <div key={n} className={`${CARD} ${CARD_HOVER} hv4-fade group px-6 py-6`}>
                <span className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                  <Icon size={19} strokeWidth={2.2} />
                </span>
                <h3 className="text-[15px] font-semibold text-gray-900 mb-1.5">{ts(t, `${F}privacy.p${n}t`)}</h3>
                <p className="text-[13px] text-gray-500 leading-relaxed">{ts(t, `${F}privacy.p${n}b`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pt-8 pb-24 text-center">
        <div className={`${WRAP} hv4-fade`}>
          <h2 className="text-[clamp(28px,3.6vw,42px)] font-bold text-[#163e64] leading-[1.16] tracking-tight mb-3">
            {ts(t, "landing.home.cta.title1")}
            <br />
            {ts(t, "landing.home.cta.title2")}
          </h2>
          <p className="text-gray-500 leading-[1.75] max-w-[44ch] mx-auto mb-8">{ts(t, "landing.home.cta.sub")}</p>
          <div className="flex justify-center gap-2.5 flex-wrap">
            <a href={signupUrl}>
              <Button size="lg" className="text-sm sm:text-base px-6">
                {ts(t, "landing.home.cta.ctaStart")}
              </Button>
            </a>
            <a href="mailto:support@classraum.com">
              <Button variant="outline" size="lg" className="text-sm sm:text-base px-6">
                {ts(t, "landing.home.cta.ctaInquiry")}
              </Button>
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
