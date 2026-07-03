"use client"

import React, { useEffect, useRef, useState } from "react"
import {
  Home,
  School,
  Calendar,
  ClipboardList,
  UserCheck,
  Megaphone,
  Bell,
  MessageSquare,
  FileQuestion,
  BarChart,
  CreditCard,
  GraduationCap,
  Zap,
  LogOut,
  HelpCircle,
  Settings2,
  PanelLeft,
  Search,
  MoreHorizontal,
  Play,
  CheckCircle2,
  Target,
  ChevronRight,
  X,
  Camera,
  Shuffle,
  Trophy,
  User,
  BookOpen,
  DollarSign,
  Clock,
  FileText,
  TrendingUp,
  ChevronsUpDown,
  ArrowLeft,
  Send,
  RefreshCw,
} from "lucide-react"

// High-fidelity, presentational replicas of the real app UI for the marketing
// homepage, rebuilt to match the captured product screenshots 1:1 — same
// layout, icons (the app's own lucide set), type scale, and status colors.
// Rendered as DOM so they stay razor-sharp at any viewport size.

type TFunc = (key: string, params?: Record<string, string | number | undefined>) => string

const M = "landing.home.mock."
const NAVY = "#163e64"

export function BrowserShell({
  url,
  label,
  children,
}: {
  url: string
  label: string
  children: React.ReactNode
}) {
  return (
    <div
      role="img"
      aria-label={label}
      className="rounded-2xl ring-1 ring-gray-200 shadow-[0_1px_2px_rgba(16,24,40,0.05),0_32px_64px_-32px_rgba(22,62,100,0.3)] overflow-hidden bg-white text-left [container-type:inline-size]"
    >
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-gray-100 bg-[#f8fafc]">
        <span className="w-2.5 h-2.5 rounded-full bg-gray-200" />
        <span className="w-2.5 h-2.5 rounded-full bg-gray-200" />
        <span className="w-2.5 h-2.5 rounded-full bg-gray-200" />
        <span className="ml-3 flex-1 max-w-[320px] bg-white border border-gray-100 rounded-md text-[11px] text-gray-400 px-2.5 py-1 truncate">
          {url}
        </span>
      </div>
      {children}
    </div>
  )
}

export function PhoneShell({
  label,
  className = "",
  children,
}: {
  label: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      role="img"
      aria-label={label}
      className={`rounded-[32px] bg-gray-900 p-2 shadow-[0_24px_48px_-24px_rgba(0,0,0,0.5)] text-left ${className}`}
    >
      <div className="rounded-[24px] overflow-hidden bg-white">{children}</div>
    </div>
  )
}

export function LogoMark({ size = 22, radius = 7 }: { size?: number; radius?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center shrink-0 text-white"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: "linear-gradient(135deg,#2C6EF1 0%,#16ADD4 50%,#00D0AE 100%)",
      }}
    >
      <Bell size={size * 0.55} strokeWidth={2.5} fill="currentColor" />
    </span>
  )
}

// ---------------------------------------------------------------------------
// Manager dashboard — hero visual (mirrors /dashboard)
// ---------------------------------------------------------------------------
export function DashboardMock({ t, label }: { t: TFunc; label: string }) {
  const nav: { key: string; Icon: React.ElementType; on?: boolean }[] = [
    { key: "navDashboard", Icon: Home, on: true },
    { key: "navClassrooms", Icon: School },
    { key: "navSessions", Icon: Calendar },
    { key: "navAssignments", Icon: ClipboardList },
    { key: "navAttendance", Icon: UserCheck },
    { key: "navAnnouncements", Icon: Megaphone },
    { key: "navNotifications", Icon: Bell },
    { key: "navMessages", Icon: MessageSquare },
    { key: "navExams", Icon: FileQuestion },
    { key: "navReports", Icon: BarChart },
    { key: "navPayments", Icon: CreditCard },
  ]
  const stats = [
    { key: "kRevenue", Icon: CreditCard, value: "₩12,450,000", sub: t(M + "kRevenueDelta"), bar: "#12b76a" },
    { key: "kUsers", Icon: UserCheck, value: "316", bar: "#2885e8" },
    { key: "kClassrooms", Icon: School, value: "20", bar: "#7a5af8" },
    { key: "kSessions", Icon: Calendar, value: "42", bar: "#f79009" },
  ]
  const rows = [
    { time: "15:00", cls: t(M + "cls1"), tch: t(M + "tch1"), n: "14 / 14", st: t(M + "stDone"), dot: "#12b76a" },
    { time: "16:30", cls: t(M + "cls2"), tch: t(M + "tch2"), n: "11 / 12", st: t(M + "stLive"), dot: "#2885e8" },
    { time: "18:00", cls: t(M + "cls3"), tch: t(M + "tch3"), n: "— / 16", st: t(M + "stWait"), dot: "#d0d5dd" },
  ]

  return (
    <BrowserShell url="app.classraum.com/dashboard" label={label}>
      <div className="grid @[620px]:grid-cols-[190px_1fr]">
        {/* Sidebar */}
        <aside className="hidden @[620px]:flex flex-col border-r border-gray-100 bg-white px-3 pt-4 pb-3">
          <div className="flex items-center gap-2 px-1.5 mb-4">
            <LogoMark size={24} radius={7} />
            <b className="text-[11px] font-extrabold tracking-[0.05em]" style={{ color: NAVY }}>
              CLASSRAUM
            </b>
          </div>
          {nav.map(({ key, Icon, on }) => (
            <div
              key={key}
              className={`relative flex items-center gap-2.5 rounded-lg px-2.5 py-[6px] text-[11px] mb-px ${
                on ? "bg-blue-50 text-primary font-semibold" : "text-gray-500 font-medium"
              }`}
            >
              {on && <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full bg-primary" />}
              <Icon size={13} strokeWidth={on ? 2.4 : 2} className="shrink-0" />
              {t(M + key)}
            </div>
          ))}
          <p className="text-[8px] font-bold tracking-[0.12em] uppercase text-gray-300 px-2.5 mt-3 mb-1.5">
            {t(M + "contacts")}
          </p>
          <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-[6px] text-[11px] text-gray-500 font-medium">
            <GraduationCap size={13} strokeWidth={2} className="shrink-0" />
            {t(M + "navTeachers")}
          </div>
          <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-[6px] text-[11px] text-gray-500 font-medium">
            <Home size={13} strokeWidth={2} className="shrink-0" />
            {t(M + "navFamilies")}
          </div>
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-[7px] mt-3 text-[10.5px] font-bold text-white"
            style={{ background: "linear-gradient(90deg,#2885e8,#00D0AE)" }}
          >
            <Zap size={12} strokeWidth={2.4} fill="currentColor" />
            {t(M + "upgrade")}
          </div>
          <div className="flex items-center justify-between border-t border-gray-100 mt-3 pt-2.5 px-1">
            <span className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center">
                김
              </span>
              <b className="text-[10.5px] font-semibold text-gray-700">김**</b>
            </span>
            <LogOut size={12} className="text-gray-300" />
          </div>
        </aside>

        {/* Main */}
        <div className="bg-white">
          <div className="flex items-center justify-between px-5 py-2.5 border-b border-gray-100">
            <PanelLeft size={13} className="text-gray-400" />
            <span className="flex items-center gap-3.5 text-gray-400">
              <HelpCircle size={13} />
              <MessageSquare size={13} />
              <Bell size={13} />
            </span>
          </div>

          <div className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-[9px] font-bold tracking-[0.14em] uppercase text-primary mb-1">{t(M + "overview")}</p>
                <h4 className="text-[19px] font-bold leading-tight" style={{ color: "#111827" }}>
                  {t(M + "dashTitle")}
                </h4>
                <p className="text-[10.5px] text-gray-400">{t(M + "dashSub")}</p>
              </div>
              <span className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-600 border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                <Settings2 size={11} />
                {t(M + "customizeFull")}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              {stats.map((s) => (
                <div key={s.key} className="ring-1 ring-gray-100 rounded-2xl px-4 pt-3.5 pb-3 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-50 text-primary flex items-center justify-center">
                      <s.Icon size={12} strokeWidth={2.2} />
                    </span>
                    <i className="not-italic text-[9px] font-semibold uppercase tracking-[0.08em] text-gray-400 truncate">
                      {t(M + s.key)}
                    </i>
                  </div>
                  <b className="block text-[clamp(11px,2.8cqw,22px)] font-bold tabular-nums leading-tight whitespace-nowrap" style={{ color: "#111827" }}>
                    {s.value}
                  </b>
                  <span className="block text-[9px] text-gray-400 h-3.5 truncate">{s.sub || ""}</span>
                  <span className="block h-[2px] rounded-full mt-2" style={{ background: s.bar }} />
                </div>
              ))}
            </div>

            <div className="grid @[620px]:grid-cols-[1.5fr_1fr] gap-3">
              <div className="ring-1 ring-gray-100 rounded-2xl overflow-hidden bg-white shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-blue-50 text-primary flex items-center justify-center">
                      <Calendar size={10.5} strokeWidth={2.2} />
                    </span>
                    <b className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-gray-500">{t(M + "sessionToday")}</b>
                  </span>
                  <span className="flex items-center text-[9.5px] font-semibold text-primary">
                    {t(M + "viewAllSessions")}
                    <ChevronRight size={10} />
                  </span>
                </div>
                {rows.map((r) => (
                  <div key={r.time} className="flex items-center gap-3 px-4 py-2 border-b border-gray-100 last:border-0">
                    <span className="font-mono text-[9.5px] text-gray-400 tabular-nums w-8 shrink-0">{r.time}</span>
                    <span className="text-[10.5px] font-medium text-gray-900 flex-1 truncate">{r.cls}</span>
                    <span className="text-[9.5px] text-gray-400 hidden md:block">{r.tch}</span>
                    <span className="text-[9.5px] text-gray-500 tabular-nums">{r.n}</span>
                    <span className="text-[9.5px] text-gray-500 whitespace-nowrap">
                      <span className="inline-block w-[6px] h-[6px] rounded-full mr-1.5 align-[1px]" style={{ background: r.dot }} />
                      {r.st}
                    </span>
                  </div>
                ))}
              </div>
              <div className="ring-1 ring-gray-100 rounded-2xl overflow-hidden bg-white shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-blue-50 text-primary flex items-center justify-center">
                      <BarChart size={10.5} strokeWidth={2.2} />
                    </span>
                    <b className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-gray-500">{t(M + "recentActivity")}</b>
                  </span>
                  <span className="flex items-center text-[9.5px] font-semibold text-primary">
                    {t(M + "viewAll")}
                    <ChevronRight size={10} />
                  </span>
                </div>
                {[
                  { Icon: Calendar, text: t(M + "activity1") },
                  { Icon: BarChart, text: t(M + "activity2") },
                ].map(({ Icon, text }) => (
                  <div key={text} className="flex items-center gap-2.5 px-4 py-2.5 border-b border-gray-100 last:border-0">
                    <span className="w-5 h-5 rounded-md bg-blue-50 text-primary flex items-center justify-center shrink-0">
                      <Icon size={10.5} strokeWidth={2.2} />
                    </span>
                    <span className="text-[10px] font-medium text-gray-700 truncate">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </BrowserShell>
  )
}

// ---------------------------------------------------------------------------
// Payments dashboard — month-end visual (mirrors /payments)
// ---------------------------------------------------------------------------
export function PaymentsMock({ t, label }: { t: TFunc; label: string }) {
  const stats = [
    { key: "kTotal", Icon: DollarSign, value: "₩269,425,000", chip: "bg-emerald-50 text-emerald-600" },
    { key: "kPending", Icon: Clock, value: "₩5,400,000", chip: "bg-amber-50 text-amber-600" },
    { key: "kTemplates", Icon: FileText, value: "11", chip: "bg-blue-50 text-primary" },
    { key: "kMrr", Icon: TrendingUp, value: "₩1,600,000", chip: "bg-purple-50 text-purple-600" },
  ]
  const rows = [
    { name: "최**", email: "student1@demo...", inv: t(M + "inv1"), amt: "₩300,000", due: t(M + "due1"), paid: false },
    { name: "송**", email: "student150@demo...", inv: t(M + "inv2"), amt: "₩80,000", due: t(M + "due2"), paid: true },
    { name: "박**", email: "student149@demo...", inv: t(M + "inv3"), amt: "₩50,000", due: t(M + "due3"), paid: true },
  ]

  return (
    <BrowserShell url="app.classraum.com/payments" label={label}>
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[9px] font-bold tracking-[0.14em] uppercase text-primary mb-1">{t(M + "billingEyebrow")}</p>
            <h4 className="text-[19px] font-bold leading-tight" style={{ color: "#111827" }}>
              {t(M + "payTitle")}
            </h4>
            <p className="text-[10.5px] text-gray-400">{t(M + "paySub")}</p>
          </div>
          <span className="text-[10px] font-bold text-white bg-primary rounded-lg px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_1px_2px_rgba(0,0,0,0.08)]">
            {t(M + "addPayment")}
          </span>
        </div>

        <div className="grid grid-cols-2 @[640px]:grid-cols-4 gap-3 mb-3.5">
          {stats.map((s) => (
            <div key={s.key} className="ring-1 ring-gray-100 rounded-2xl px-3.5 pt-3 pb-3.5 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`w-6 h-6 rounded-lg flex items-center justify-center ${s.chip}`}>
                  <s.Icon size={12} strokeWidth={2.2} />
                </span>
                <i className="not-italic text-[8.5px] font-semibold uppercase tracking-[0.07em] text-gray-400 truncate">
                  {t(M + s.key)}
                </i>
              </div>
              <b className="block text-[clamp(10px,2.6cqw,15px)] font-bold tabular-nums whitespace-nowrap" style={{ color: "#111827" }}>
                {s.value}
              </b>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="inline-flex ring-1 ring-gray-200 rounded-xl p-0.5 bg-white">
            <span className="text-[9.5px] font-semibold text-white bg-primary rounded-[10px] px-3 py-1.5 whitespace-nowrap">{t(M + "tabOne")}</span>
            <span className="text-[9.5px] font-medium text-gray-500 px-3 py-1.5 whitespace-nowrap">{t(M + "tabRecurring")}</span>
            <span className="text-[9.5px] font-medium text-gray-500 px-3 py-1.5 whitespace-nowrap">{t(M + "tabPlans")}</span>
          </div>
          <div className="flex-1 min-w-[140px] flex items-center gap-2 ring-1 ring-gray-200 rounded-xl px-3 py-1.5 bg-white">
            <Search size={11} className="text-gray-300 shrink-0" />
            <span className="text-[9.5px] text-gray-300 flex-1 truncate">{t(M + "searchPh")}</span>
            <span className="font-mono text-[8.5px] text-gray-300 border border-gray-200 rounded px-1.5">/</span>
          </div>
        </div>

        <div className="ring-1 ring-gray-100 rounded-2xl overflow-hidden bg-white">
          <div className="overflow-x-auto">
          <div className="min-w-[430px]">
          <div className="grid grid-cols-[16px_1.2fr_1fr_auto_auto_auto] gap-3 items-center px-4 py-2 border-b border-gray-100 bg-[#f8fafc] text-[8px] font-bold uppercase tracking-[0.08em] text-gray-400">
            <span className="w-3 h-3 rounded border border-gray-200 bg-white" />
            <span className="flex items-center gap-1">{t(M + "thStudent")}<ChevronsUpDown size={8} /></span>
            <span className="flex items-center gap-1">{t(M + "thInvoice")}<ChevronsUpDown size={8} /></span>
            <span className="flex items-center gap-1 justify-end">{t(M + "thAmount")}<ChevronsUpDown size={8} /></span>
            <span>{t(M + "thDue")}</span>
            <span>{t(M + "thStatus")}</span>
          </div>
          {rows.map((r) => (
            <div key={r.name + r.inv} className="grid grid-cols-[16px_1.2fr_1fr_auto_auto_auto] gap-3 items-center px-4 py-2.5 border-b border-gray-100 last:border-0">
              <span className="w-3 h-3 rounded border border-gray-200" />
              <span className="min-w-0">
                <b className="block text-[10.5px] font-semibold text-gray-900 leading-tight">{r.name}</b>
                <span className="block text-[8.5px] text-gray-400 truncate">{r.email}</span>
              </span>
              <span className="text-[10px] text-gray-600 truncate">{r.inv}</span>
              <span className="text-[10.5px] font-bold tabular-nums text-right" style={{ color: "#111827" }}>
                {r.amt}
              </span>
              <span className="text-[9.5px] text-gray-400 tabular-nums whitespace-nowrap">{r.due}</span>
              <span
                className={`inline-flex items-center gap-1 text-[8.5px] font-semibold rounded-full px-2 py-0.5 whitespace-nowrap ${
                  r.paid ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                }`}
              >
                {r.paid ? <CheckCircle2 size={9} /> : <Clock size={9} />}
                {r.paid ? t(M + "paid") : t(M + "pendingBadge")}
              </span>
            </div>
          ))}
          </div>
          </div>
        </div>
      </div>
    </BrowserShell>
  )
}

// ---------------------------------------------------------------------------
// Classraum Study phone — night band, 19:30 (mirrors /mobile/study)
// ---------------------------------------------------------------------------
export function StudyPhoneMock({ t, label, className }: { t: TFunc; label: string; className?: string }) {
  const tabs: { key: string; Icon: React.ElementType }[] = [
    { key: "tab1", Icon: BookOpen },
    { key: "tab2", Icon: Camera },
    { key: "tab3", Icon: Shuffle },
    { key: "tab4", Icon: Trophy },
    { key: "tab5", Icon: User },
  ]
  return (
    <PhoneShell label={label} className={className}>
      <div className="bg-gradient-to-b from-[#3b82f6] to-[#2563eb] px-3.5 pt-3.5 pb-8 text-white relative">
        <div className="flex justify-end gap-1.5 mb-1.5">
          <span className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center"><Search size={10} /></span>
          <span className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center"><MoreHorizontal size={10} /></span>
        </div>
        <p className="text-[8.5px] opacity-75 mb-0.5">{t(M + "date")}</p>
        <div className="flex items-start justify-between gap-2">
          <b className="text-[12.5px] font-bold leading-snug">{t(M + "greeting")}</b>
          <span className="text-[8px] font-semibold bg-white/20 rounded-full px-2 py-0.5 whitespace-nowrap mt-0.5">
            {t("landing.home.m2.streak")}
          </span>
        </div>
      </div>
      <div className="bg-[#f4f7fb] px-2.5 pb-2.5">
        {/* overlapping goal card, like the real app */}
        <div className="bg-white rounded-2xl shadow-[0_4px_12px_-4px_rgba(16,24,40,0.12)] p-3 -mt-5 relative mb-2.5">
          <div className="flex items-center justify-between mb-0.5">
            <i className="not-italic text-[8.5px] text-gray-400 font-medium">{t("landing.home.m2.goalLabel")}</i>
            <span className="text-[7.5px] font-bold text-primary bg-blue-50 rounded-full px-1.5 py-px">↗ 60%</span>
          </div>
          <b className="text-[14px] font-bold tabular-nums" style={{ color: NAVY }}>
            {t("landing.home.m2.goalValue")}
          </b>
          <div className="h-[3px] bg-gray-100 rounded-full mt-1.5 overflow-hidden">
            <span className="block h-full w-[60%] rounded-full bg-primary" />
          </div>
          <p className="text-[7.5px] text-gray-400 mt-1">{t(M + "remaining")}</p>
          <div className="grid grid-cols-3 border-t border-gray-100 mt-2 pt-2 text-center">
            {[
              { label: t(M + "statStreak"), value: "12", color: "#f79009" },
              { label: t(M + "statSessions"), value: "4", color: "#2885e8" },
              { label: t(M + "statProblems"), value: "32", color: "#7a5af8" },
            ].map((s) => (
              <span key={s.label}>
                <i className="not-italic block text-[7px] text-gray-400 font-medium">{s.label}</i>
                <b className="text-[11px] font-bold tabular-nums" style={{ color: s.color }}>
                  {s.value}
                </b>
              </span>
            ))}
          </div>
        </div>

        <p className="text-[8px] font-bold text-gray-400 px-1 mb-1">{t(M + "todayLabel")}</p>

        <div className="bg-white rounded-xl shadow-[0_1px_2px_rgba(16,24,40,0.05)] px-2.5 py-2 mb-1.5 flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#7a5af8] text-white flex items-center justify-center shrink-0">
            <Play size={9} fill="currentColor" />
          </span>
          <span className="flex-1 min-w-0">
            <i className="not-italic block text-[7px] text-gray-400">{t(M + "resumeTitle")}</i>
            <b className="block text-[8.5px] font-semibold text-gray-800 truncate">{t(M + "resumeSub")}</b>
          </span>
          <X size={9} className="text-gray-300 shrink-0" />
        </div>

        <div className="bg-emerald-50 ring-1 ring-emerald-100 rounded-xl px-2.5 py-2 mb-1.5 flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
            <CheckCircle2 size={10} />
          </span>
          <span className="flex-1 min-w-0">
            <b className="block text-[8.5px] font-bold text-emerald-800">{t(M + "readyTitle")}</b>
            <i className="not-italic block text-[7.5px] text-emerald-600">{t(M + "readySub")}</i>
          </span>
          <ChevronRight size={10} className="text-emerald-500 shrink-0" />
        </div>

        <div className="bg-white rounded-xl shadow-[0_1px_2px_rgba(16,24,40,0.05)] px-2.5 py-2 mb-2 flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#f79009] to-[#f04438] text-white flex items-center justify-center shrink-0">
            <Target size={10} />
          </span>
          <span className="flex-1 min-w-0">
            <i className="not-italic block text-[7px] text-gray-400">{t(M + "challengeTitle")}</i>
            <b className="block text-[8.5px] font-semibold text-gray-800 truncate">
              {t(M + "challengeSub")} · {t(M + "xp")}
            </b>
          </span>
          <ChevronRight size={10} className="text-gray-300 shrink-0" />
        </div>

        <div className="bg-white rounded-xl shadow-[0_1px_2px_rgba(16,24,40,0.05)] px-1 py-1.5 grid grid-cols-5">
          {tabs.map(({ key, Icon }, i) => (
            <span key={key} className={`flex flex-col items-center gap-0.5 text-[6.5px] font-semibold ${i === 0 ? "text-primary" : "text-gray-400"}`}>
              <Icon size={11} strokeWidth={i === 0 ? 2.4 : 2} />
              {t(M + key)}
            </span>
          ))}
        </div>
      </div>
    </PhoneShell>
  )
}

// ---------------------------------------------------------------------------
// Parent payment phone — night band, 21:04 (mirrors the checkout screen)
// ---------------------------------------------------------------------------
export function InvoicePhoneMock({ t, label, className }: { t: TFunc; label: string; className?: string }) {
  const tabs: { key: string; Icon: React.ElementType }[] = [
    { key: "mtab1", Icon: Home },
    { key: "mtab2", Icon: ClipboardList },
    { key: "mtab3", Icon: FileText },
    { key: "mtab4", Icon: User },
  ]
  return (
    <PhoneShell label={label} className={className}>
      <div className="px-3 pt-3 pb-1.5 flex items-center justify-between">
        <LogoMark size={20} radius={6} />
        <span className="flex gap-1.5">
          <span className="w-5 h-5 rounded-full bg-gray-50 flex items-center justify-center"><MessageSquare size={9} className="text-gray-500" /></span>
          <span className="w-5 h-5 rounded-full bg-gray-50 flex items-center justify-center"><Bell size={9} className="text-gray-500" /></span>
        </span>
      </div>
      <div className="px-3 pb-2 flex items-center gap-2">
        <ArrowLeft size={11} className="text-gray-600" />
        <span>
          <b className="block text-[13px] font-bold leading-tight" style={{ color: "#111827" }}>
            {t(M + "payTitleM")}
          </b>
          <i className="not-italic block text-[8px] text-gray-400">{t(M + "payAcademy")}</i>
        </span>
      </div>
      <div className="bg-[#f4f7fb] p-2.5">
        <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgba(16,24,40,0.05)] p-3 mb-2">
          <div className="flex items-start justify-between mb-2.5">
            <span className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-blue-50 text-primary flex items-center justify-center">
                <FileText size={12} />
              </span>
              <span>
                <b className="block text-[10px] font-bold" style={{ color: "#111827" }}>{t(M + "summary")}</b>
                <i className="not-italic block text-[8px] text-gray-400">{t(M + "billTo")}</i>
              </span>
            </span>
            <span className="text-[7.5px] font-semibold text-gray-500 border border-gray-200 rounded-full px-1.5 py-0.5 whitespace-nowrap">
              {t(M + "dueChip")}
            </span>
          </div>
          <div className="border-t border-gray-100 pt-2">
            <div className="flex justify-between text-[9px] py-0.5">
              <span className="text-gray-500">{t(M + "subtotal")}</span>
              <b className="font-semibold tabular-nums" style={{ color: "#111827" }}>₩450,000</b>
            </div>
            <div className="flex justify-between text-[9px] py-0.5">
              <span className="text-emerald-600">{t(M + "discount")}</span>
              <b className="font-semibold tabular-nums text-emerald-600">-₩50,000</b>
            </div>
            <div className="flex justify-between text-[10px] pt-1.5 mt-1 border-t border-gray-100">
              <b className="font-bold" style={{ color: "#111827" }}>{t(M + "totalAmt")}</b>
              <b className="font-bold tabular-nums" style={{ color: "#111827" }}>₩400,000</b>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgba(16,24,40,0.05)] p-3 mb-2">
          <b className="block text-[10px] font-bold mb-2" style={{ color: "#111827" }}>{t(M + "methodTitle")}</b>
          <div className="border-[1.5px] border-primary bg-blue-50/50 rounded-xl py-3 flex flex-col items-center gap-1">
            <CreditCard size={14} className="text-primary" />
            <span className="text-[8.5px] font-semibold text-primary">{t(M + "cardBtn")}</span>
          </div>
        </div>

        <span
          className="block text-center text-white text-[9.5px] font-bold rounded-xl py-2 mb-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
          style={{ background: "#2885e8" }}
        >
          {t("landing.home.m3.payBtn")}
        </span>

        <div className="bg-white rounded-xl shadow-[0_1px_2px_rgba(16,24,40,0.05)] px-1 py-1.5 grid grid-cols-4">
          {tabs.map(({ key, Icon }, i) => (
            <span key={key} className={`flex flex-col items-center gap-0.5 text-[6.5px] font-semibold ${i === 0 ? "text-gray-700" : "text-gray-400"}`}>
              <Icon size={11} strokeWidth={2} />
              {t(M + key)}
            </span>
          ))}
        </div>
      </div>
    </PhoneShell>
  )
}

// ---------------------------------------------------------------------------
// Mini mocks — headers for the three feature cards
// ---------------------------------------------------------------------------
export function MiniReports({ t, label }: { t: TFunc; label: string }) {
  const rows = [{ name: t("landing.home.m4.uiTitle") }, { name: t(M + "rpt2") }]
  return (
    <div role="img" aria-label={label} className="h-full bg-[#f8fafc] p-3.5 flex flex-col justify-center gap-2 text-left">
      {rows.map((r) => (
        <div key={r.name} className="bg-white ring-1 ring-gray-100 rounded-lg px-3 py-2.5 flex items-center gap-2.5 shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
          <span className="w-5 h-5 rounded-md bg-blue-50 text-primary flex items-center justify-center shrink-0">
            <FileText size={10} />
          </span>
          <span className="text-[10.5px] font-medium text-gray-800 truncate flex-1">{r.name}</span>
          <span className="inline-flex items-center gap-1 text-[8.5px] font-semibold text-primary bg-blue-50 rounded-full px-2 py-0.5 whitespace-nowrap">
            <CheckCircle2 size={9} />
            {t(M + "finished")}
          </span>
        </div>
      ))}
      <div className="bg-white ring-1 ring-gray-100 rounded-lg px-3 py-2.5 shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
        <span className="block h-[7px] w-[85%] rounded-full bg-gradient-to-r from-[#2885e8]/60 to-gray-100 mb-1.5" />
        <span className="block h-[7px] w-[60%] rounded-full bg-gray-100" />
      </div>
    </div>
  )
}

export function MiniCalendar({ t, label }: { t: TFunc; label: string }) {
  const sessionDays = [2, 4, 8, 9, 11, 15, 16, 18, 22, 23, 25]
  const today = 16
  return (
    <div role="img" aria-label={label} className="h-full bg-[#f8fafc] p-3.5 flex flex-col justify-center text-left">
      <div className="bg-white ring-1 ring-gray-100 rounded-lg p-3 shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
        <div className="flex items-center justify-between mb-2">
          <b className="text-[10.5px] font-bold" style={{ color: NAVY }}>{t(M + "month")}</b>
          <span className="w-4 h-4 rounded bg-blue-50 text-primary flex items-center justify-center">
            <Calendar size={9} />
          </span>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 28 }, (_, i) => {
            const day = i + 1
            const has = sessionDays.includes(day)
            const isToday = day === today
            return (
              <span
                key={day}
                className={`h-5 rounded-md flex items-center justify-center text-[7.5px] font-medium tabular-nums ${
                  isToday ? "bg-primary text-white font-bold" : has ? "bg-blue-50 text-primary" : "text-gray-300"
                }`}
              >
                {day}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function MiniComms({ t, label }: { t: TFunc; label: string }) {
  return (
    <div role="img" aria-label={label} className="h-full bg-[#f8fafc] p-3.5 flex flex-col justify-center gap-2 text-left">
      <div className="bg-[#163e64] text-white rounded-xl px-3 py-2.5 shadow-[0_8px_16px_-8px_rgba(22,62,100,0.4)] max-w-[92%]">
        <i className="not-italic flex justify-between items-center text-[7.5px] opacity-70 mb-0.5">
          <span className="flex items-center gap-1"><Bell size={7} /> CLASSRAUM</span>
          <span>14:51</span>
        </i>
        <span className="text-[10px] font-medium leading-snug">{t("landing.home.m1.notifTitle")}</span>
      </div>
      <div className="bg-white ring-1 ring-gray-100 rounded-xl px-3 py-2.5 shadow-[0_1px_2px_rgba(16,24,40,0.03)] max-w-[92%] self-end">
        <i className="not-italic flex justify-between items-center text-[7.5px] text-gray-400 mb-0.5">
          <span className="flex items-center gap-1"><Bell size={7} /> CLASSRAUM</span>
          <span>18:00</span>
        </i>
        <span className="text-[10px] font-medium text-gray-800 leading-snug">{t(M + "msg2")}</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared building blocks extracted from the homepage so other marketing pages
// (features, study) can reuse the same product demos.
// ---------------------------------------------------------------------------
export function UiBar({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 text-[12.5px] text-gray-500">
      <b className="font-semibold text-[#163e64]">{title}</b>
      {right}
    </div>
  )
}

// Attendance roster card (14:50 moment) — uses landing.home.m1.* keys
export function AttendanceMock({ t, className = "" }: { t: TFunc; className?: string }) {
  const rows = [
    { name: t("landing.home.m1.st1n"), late: false },
    { name: t("landing.home.m1.st2n"), late: false },
    { name: t("landing.home.m1.st3n"), late: true },
  ]
  return (
    <div className={`bg-white rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_4px_12px_-4px_rgba(16,24,40,0.06)] overflow-hidden text-left ${className}`}>
      <UiBar title={t("landing.home.m1.uiTitle")} right={<span>14:50</span>} />
      <div className="px-4 py-1">
        {rows.map((st) => (
          <div key={st.name} className="flex items-center gap-2.5 py-2 border-b border-gray-100 last:border-0 text-[13px]">
            <span className="w-[26px] h-[26px] rounded-full bg-primary/10 flex items-center justify-center text-[10.5px] font-bold text-primary">
              {st.name.slice(0, 1)}
            </span>
            <span className="flex-1 text-gray-900">{st.name}</span>
            <span
              className={`text-[10.5px] font-semibold rounded-full px-2.5 py-0.5 ${
                st.late ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {st.late ? t("landing.home.m1.late") : t("landing.home.m1.present")}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// The push notification parents receive, with the app icon
export function PushNotificationCard({ t, className = "" }: { t: TFunc; className?: string }) {
  return (
    <div className={`rounded-2xl bg-white ring-1 ring-gray-100 shadow-[0_16px_32px_-12px_rgba(22,62,100,0.28)] p-3.5 text-left ${className}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <LogoMark size={18} radius={5} />
        <span className="text-[10px] font-semibold tracking-[0.04em] text-gray-400 flex-1">CLASSRAUM</span>
        <span className="text-[10px] text-gray-400 tabular-nums">14:51</span>
      </div>
      <b className="block text-[12.5px] font-bold text-gray-900">{t("landing.home.m1.notifTitle")}</b>
      <span className="text-[12px] text-gray-500">{t("landing.home.m1.notifBody")}</span>
    </div>
  )
}

// AI report card that types itself in when scrolled into view — m4 keys
export function ReportDemo({ t }: { t: TFunc }) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState("")
  const [done, setDone] = useState(false)
  const [started, setStarted] = useState(false)
  const full = t("landing.home.m4.typed")

  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setStarted(true)
            io.disconnect()
          }
        }),
      { threshold: 0.5 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!started) return
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(full)
      setDone(true)
      return
    }
    setDone(false)
    let i = 0
    const id = window.setInterval(() => {
      i += 2
      setShown(full.slice(0, i))
      if (i > full.length) {
        window.clearInterval(id)
        setDone(true)
      }
    }, 24)
    return () => window.clearInterval(id)
  }, [started, full])

  return (
    <div
      ref={boxRef}
      className="bg-white rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_4px_12px_-4px_rgba(16,24,40,0.06)] overflow-hidden max-w-[560px] hv4-fade text-left"
    >
      <UiBar
        title={t("landing.home.m4.uiTitle")}
        right={
          <span className="text-[11px] font-semibold text-primary bg-primary/10 rounded-md px-2 py-0.5">
            {done ? t("landing.home.m4.stateDone") : t("landing.home.m4.stateWriting")}
          </span>
        }
      />
      <div className="p-4">
        <p className={`hv4-typed text-[13px] text-gray-500 leading-[1.8] min-h-[96px] ${done ? "hv4-done" : ""}`}>
          {shown}
        </p>
        <div className="flex gap-2 mt-4">
          <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold rounded-[10px] px-4 py-2 bg-primary text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_1px_2px_rgba(0,0,0,0.08)]">
            <Send size={11} strokeWidth={2.4} />
            {t("landing.home.m4.btnSend")}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold rounded-[10px] px-4 py-2 bg-white ring-1 ring-gray-200 text-gray-600 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <RefreshCw size={11} strokeWidth={2.2} />
            {t("landing.home.m4.btnRewrite")}
          </span>
        </div>
      </div>
    </div>
  )
}

// Level tests panel (Exams & Scores) — landing.featuresPage.examsMock.* keys
export function ExamsMock({ t, className = "" }: { t: TFunc; className?: string }) {
  const F = "landing.featuresPage.examsMock."
  const rows = [
    { n: t(F + "r1n"), m: t(F + "r1m"), b: t(F + "r1b"), chip: "bg-primary/10 text-primary" },
    { n: t(F + "r2n"), m: t(F + "r2m"), b: t(F + "r2b"), chip: "bg-emerald-50 text-emerald-700" },
    { n: t(F + "r3n"), m: t(F + "r3m"), b: t(F + "r3b"), chip: "bg-purple-50 text-purple-600" },
  ]
  return (
    <div className={`bg-white rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_4px_12px_-4px_rgba(16,24,40,0.06)] overflow-hidden text-left ${className}`}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
        <b className="text-[12.5px] font-semibold text-[#163e64]">{t(F + "title")}</b>
        <span className="text-[10px] font-bold text-white bg-primary rounded-lg px-2.5 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
          {t(F + "newBtn")}
        </span>
      </div>
      {rows.map((r) => (
        <div key={r.n} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 last:border-0">
          <span className="w-7 h-7 rounded-lg bg-blue-50 text-primary flex items-center justify-center shrink-0">
            <FileQuestion size={13} strokeWidth={2.2} />
          </span>
          <span className="flex-1 min-w-0">
            <b className="block text-[12px] font-semibold text-gray-900 truncate">{r.n}</b>
            <i className="not-italic block text-[10.5px] text-gray-400">{r.m}</i>
          </span>
          <span className={`text-[10px] font-semibold rounded-full px-2.5 py-0.5 whitespace-nowrap ${r.chip}`}>{r.b}</span>
        </div>
      ))}
    </div>
  )
}

// Assignments panel — landing.featuresPage.asgMock.* keys
export function AssignmentsMock({ t, className = "" }: { t: TFunc; className?: string }) {
  const A = "landing.featuresPage.asgMock."
  const rows = [
    { n: t(A + "a1n"), m: t(A + "a1m"), b: t(A + "a1b"), chip: "bg-primary/10 text-primary" },
    { n: t(A + "a2n"), m: t(A + "a2m"), b: t(A + "a2b"), chip: "bg-emerald-50 text-emerald-700" },
    { n: t(A + "a3n"), m: t(A + "a3m"), b: t(A + "a3b"), chip: "bg-purple-50 text-purple-600" },
  ]
  return (
    <div className={`bg-white rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_4px_12px_-4px_rgba(16,24,40,0.06)] overflow-hidden text-left ${className}`}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
        <b className="text-[12.5px] font-semibold text-[#163e64]">{t(A + "title")}</b>
        <ClipboardList size={13} className="text-gray-300" />
      </div>
      {rows.map((r) => (
        <div key={r.n} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 last:border-0">
          <span className="w-7 h-7 rounded-lg bg-blue-50 text-primary flex items-center justify-center shrink-0">
            <ClipboardList size={13} strokeWidth={2.2} />
          </span>
          <span className="flex-1 min-w-0">
            <b className="block text-[12px] font-semibold text-gray-900 truncate">{r.n}</b>
            <i className="not-italic block text-[10.5px] text-gray-400">{r.m}</i>
          </span>
          <span className={`text-[10px] font-semibold rounded-full px-2.5 py-0.5 whitespace-nowrap ${r.chip}`}>{r.b}</span>
        </div>
      ))}
    </div>
  )
}
