/**
 * Mobile design preview sandbox.
 *
 * Side-by-side mockups of the current mobile UI vs. the proposed refinements.
 * NOT linked from anywhere in the app and NOT an attempt to ship — pure design
 * exploration to align before touching real mobile code.
 *
 * To remove: delete this file + the `mobile-preview` branch in
 * src/middleware.ts (currently OR'd into isDesignPreviewRoute).
 *
 * Reach it at: localhost:3001/mobile-preview (main domain)
 *           or app.localhost:3001/mobile-preview (app subdomain)
 */
"use client"

import {
  Bell, MessageSquare, Home, Calendar, ClipboardList, BarChart, User,
  ChevronRight, MapPin, Clock, GraduationCap, FileText, CreditCard,
  CheckCircle, AlertCircle, Search, Plus, Filter, ArrowLeft,
  School, Settings, Globe, LogOut, Megaphone, Send, MoreHorizontal,
  X, Paperclip, Eye, Download, Inbox,
} from 'lucide-react'

export default function MobilePreviewPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] text-foreground">
      {/* Top header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-8 py-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
            Mobile preview
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 mt-2">
            Mobile UI revamp — current vs. proposed
          </h1>
          <p className="text-gray-500 mt-2 max-w-2xl">
            The mobile experience (used by students and parents) was built with the
            old visual language: flat white cards with shadow-sm, gray-200 borders,
            hardcoded green/red status colors, and blue gradients in avatars. It
            functions but feels disconnected from the polished desktop. This page
            mocks up where it should land.
          </p>
          <p className="text-xs text-gray-400 mt-3">
            Sandbox file:{' '}
            <code className="bg-gray-100 px-1.5 py-0.5 rounded">
              src/app/mobile-preview/page.tsx
            </code>
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-12 space-y-20">
        <Section
          number="01"
          title="Mobile header"
          rationale="Today: flat white + hard gray-200 border. Proposed: same height but lose the border in favor of a soft shadow on scroll, larger logo presence, notification + message buttons get pill chrome with proper unread badges using the soft palette."
        >
          <Comparison
            before={<PhoneFrame label="Current"><CurrentHeader /></PhoneFrame>}
            after={<PhoneFrame label="Proposed" highlight><NewHeader /></PhoneFrame>}
          />
        </Section>

        <Section
          number="02"
          title="Bottom navigation"
          rationale="Today: flat icons with text-primary on active — no visual lift, no clear hit target signal. Proposed: active item gets a soft primary chip behind the icon, subtle scale on tap, and the inactive icons get a touch more weight so they don't feel ghosted."
        >
          <Comparison
            before={<PhoneFrame label="Current"><CurrentBottomNav /></PhoneFrame>}
            after={<PhoneFrame label="Proposed" highlight><NewBottomNav /></PhoneFrame>}
          />
        </Section>

        <Section
          number="03"
          title="Home page session card"
          rationale="Today: status dots use raw bg-green-400 / bg-red-400 / bg-primary; the card is white-with-shadow-sm + colored left border. Proposed: the card adopts the same rounded-2xl + ring chrome we use on desktop, status becomes a soft-palette pill, and metadata stacks with proper visual rhythm."
        >
          <Comparison
            before={<PhoneFrame label="Current"><CurrentSessionCard /></PhoneFrame>}
            after={<PhoneFrame label="Proposed" highlight><NewSessionCard /></PhoneFrame>}
          />
        </Section>

        <Section
          number="04"
          title="List items (assignments / schedule / notifications)"
          rationale="Today: every list item looks identical — same p-4 white card. Proposed: subtle category chip, primary-tinted left edge for unread/pending items, soft-palette grade pill, and a clearer right-side affordance. Easier to scan when you have 20 of them."
        >
          <Comparison
            before={<PhoneFrame label="Current"><CurrentList /></PhoneFrame>}
            after={<PhoneFrame label="Proposed" highlight><NewList /></PhoneFrame>}
          />
        </Section>

        <Section
          number="05"
          title="Status pills (attendance / invoice / grade)"
          rationale="Today: hardcoded bg-green-100/text-green-800 and bg-red-100/text-rose-800 directly in JSX, sometimes bg-green-400 dots. Proposed: the same soft-palette system we use on desktop — emerald/sky/amber/rose-50 backgrounds with -700 text. One token, every surface."
        >
          <Comparison
            before={<PhoneFrame label="Current"><CurrentStatusPills /></PhoneFrame>}
            after={<PhoneFrame label="Proposed" highlight><NewStatusPills /></PhoneFrame>}
          />
        </Section>

        <Section
          number="06"
          title="Avatar treatment"
          rationale="Today: every avatar is `from-blue-400 to-blue-600` — same gradient regardless of who. Proposed: role-based gradients (sky=parent, emerald=teacher, blue=student, violet=family) so the avatar carries information at a glance. Matches the pattern we shipped on desktop tables."
        >
          <Comparison
            before={<PhoneFrame label="Current"><CurrentAvatars /></PhoneFrame>}
            after={<PhoneFrame label="Proposed" highlight><NewAvatars /></PhoneFrame>}
          />
        </Section>

        <Section
          number="07"
          title="Bottom sheet (comments / file viewer)"
          rationale="Today: gray-300 grab handle, plain header. Proposed: thinner refined handle, shadow over backdrop blur (matches command palette chrome), header with section eyebrow + count chip, soft-palette unread dot in input."
        >
          <Comparison
            before={<PhoneFrame label="Current"><CurrentBottomSheet /></PhoneFrame>}
            after={<PhoneFrame label="Proposed" highlight><NewBottomSheet /></PhoneFrame>}
          />
        </Section>

        <Section
          number="08"
          title="Profile page sections"
          rationale="Today: every setting is its own identical card — visual flatness makes everything feel equally important. Proposed: settings group under uppercase eyebrow labels (Account / Preferences / Data) with cards stacked into one panel per group. Same chrome we shipped on dashboard."
        >
          <Comparison
            before={<PhoneFrame label="Current" tall><CurrentProfile /></PhoneFrame>}
            after={<PhoneFrame label="Proposed" highlight tall><NewProfile /></PhoneFrame>}
          />
        </Section>

        <Section
          number="09"
          title="Empty state"
          rationale="Today: inline div with a gray icon and a plain paragraph. Proposed: the EmptyState component we just built for desktop — primary-tinted icon chip, proper title hierarchy, single CTA. Already exists; mobile just needs to use it."
        >
          <Comparison
            before={<PhoneFrame label="Current"><CurrentEmpty /></PhoneFrame>}
            after={<PhoneFrame label="Proposed" highlight><NewEmpty /></PhoneFrame>}
          />
        </Section>

        <Section
          number="10"
          title="Detail page (session)"
          rationale="Today: dense data crammed into a cards-within-cards stack. Proposed: hero strip with classroom color + primary action, info rows with proper icon color tokens, attendance grouped under a section header instead of inline."
        >
          <Comparison
            before={<PhoneFrame label="Current" tall><CurrentDetail /></PhoneFrame>}
            after={<PhoneFrame label="Proposed" highlight tall><NewDetail /></PhoneFrame>}
          />
        </Section>

        {/* 11. Composite */}
        <section>
          <div className="mb-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400 mb-1.5">
              11 — composite
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
              Everything together: home screen reimagined
            </h2>
            <p className="text-sm text-gray-500 mt-2 max-w-2xl">
              Header + greeting + today&apos;s sessions + bottom nav composed in
              the new style. This is roughly what the home screen would look like
              if you adopted sections 01-10 together.
            </p>
          </div>
          <div className="rounded-2xl bg-[#fafafa] p-8 ring-1 ring-gray-200 flex justify-center">
            <PhoneFrame label="" tall hideLabel>
              <CompositeHomeScreen />
            </PhoneFrame>
          </div>
        </section>

        {/* What this implies — the migration scope */}
        <section className="rounded-2xl bg-white ring-1 ring-gray-100 p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400 mb-1.5">
            Scope
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
            What adopting this would touch
          </h2>
          <ul className="mt-4 space-y-3 text-sm text-gray-700">
            <li className="flex gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mt-0.5 w-20 flex-shrink-0">2 files</span>
              <span><span className="font-medium">Header + bottom nav primitives</span> — `MobileHeader.tsx`, `BottomNavigation.tsx` (also `BottomNavigationWithShelf.tsx`). Visual chrome only; APIs stay.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mt-0.5 w-20 flex-shrink-0">12 pages</span>
              <span><span className="font-medium">Mobile route pages</span> — page (home), schedule, assignments, messages, invoices, announcements, profile, notifications, reports + dynamic routes for session/[id], invoice/[id], report/[id]. Card chrome → new pattern; status pills → soft palette; avatars → role-based; empty states → EmptyState component.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mt-0.5 w-20 flex-shrink-0">2 sheets</span>
              <span><span className="font-medium">Bottom sheets</span> — `CommentBottomSheet.tsx`, `FileViewerBottomSheet.tsx`. Refine handle, header pattern, soft-palette dots.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mt-0.5 w-20 flex-shrink-0">+sweep</span>
              <span><span className="font-medium">Color sweep across all 12 pages</span> — bg-green-400 → emerald-500 dots, bg-red-100/text-rose-800 → rose-50/700 pills, from-blue-400 to-blue-600 avatars → role gradients, gray-200 borders → ring-gray-100 / removed entirely where shadow carries the edge.</span>
            </li>
          </ul>
          <p className="mt-6 text-sm text-gray-500">
            None of this is structural — it&apos;s all visual treatment. No new
            features, no new routes, no API changes. Estimated as a single
            focused session per page-pattern (header + nav, list pages, detail
            pages, profile, sheets) — call it 5 sittings.
          </p>
        </section>

      </div>

      <div className="max-w-6xl mx-auto px-8 py-12 border-t border-gray-200 mt-12">
        <p className="text-sm text-gray-500">
          End of preview. To delete this sandbox: remove this file + the{' '}
          <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">
            mobile-preview
          </code>{' '}
          branch in middleware.ts (currently OR&apos;d into isDesignPreviewRoute).
        </p>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   Layout helpers — copied from /design-preview pattern
   ───────────────────────────────────────────────────────────────── */

function Section({
  number, title, rationale, children,
}: { number: string; title: string; rationale: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400 mb-1.5">
          {number}
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-gray-900">{title}</h2>
        <p className="text-sm text-gray-500 mt-2 max-w-2xl">{rationale}</p>
      </div>
      {children}
    </section>
  )
}

function Comparison({ before, after }: { before: React.ReactNode; after: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {before}
      {after}
    </div>
  )
}

/** A fake "phone" frame that renders mobile content at realistic mobile width. */
function PhoneFrame({
  label,
  highlight,
  tall,
  hideLabel,
  children,
}: {
  label: string
  highlight?: boolean
  tall?: boolean
  hideLabel?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center">
      {!hideLabel && (
        <div className="flex items-center justify-between mb-3 w-full max-w-[360px]">
          <p className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${highlight ? 'text-primary' : 'text-gray-400'}`}>
            {label}
          </p>
          {highlight && (
            <span className="text-[10px] font-medium text-primary/70">
              proposed
            </span>
          )}
        </div>
      )}
      <div
        className={`
          relative w-full max-w-[360px] bg-white overflow-hidden
          rounded-[2.5rem] ${highlight ? 'ring-1 ring-primary/30 shadow-[0_24px_48px_-12px_rgba(40,133,232,0.15)]' : 'ring-1 ring-gray-200 shadow-[0_12px_24px_-12px_rgba(0,0,0,0.12)]'}
          ${tall ? 'h-[680px]' : 'h-[520px]'}
        `}
      >
        {/* Faux notch */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-5 bg-black rounded-full z-50" />
        {children}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   01. Headers
   ───────────────────────────────────────────────────────────────── */

function CurrentHeader() {
  return (
    <div className="pt-10 bg-white">
      <div className="bg-white border-b border-gray-200 flex items-center justify-between px-3 py-3">
        <div className="text-2xl font-bold text-primary tracking-tight">classraum</div>
        <div className="flex items-center gap-1">
          <button className="relative p-2 hover:bg-gray-100 rounded-lg">
            <MessageSquare className="w-6 h-6 text-gray-600" />
            <span className="absolute top-1 right-1 w-4 h-4 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              3
            </span>
          </button>
          <button className="relative p-2 hover:bg-gray-100 rounded-lg">
            <Bell className="w-6 h-6 text-gray-600" />
            <span className="absolute top-1 right-1 w-4 h-4 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              5
            </span>
          </button>
        </div>
      </div>
      {/* parent-role student selector */}
      <div className="px-3 py-2 bg-blue-50 border-b border-blue-200 flex items-center gap-2">
        <School className="w-4 h-4 text-blue-700" />
        <span className="text-sm font-medium text-blue-700">김민지 ▾</span>
      </div>
      <div className="p-4 text-xs text-gray-400">page content…</div>
    </div>
  )
}

function NewHeader() {
  return (
    <div className="pt-10 bg-[#fafafa]">
      <div className="bg-white shadow-[0_1px_0_rgba(0,0,0,0.04)] flex items-center justify-between px-4 py-3.5">
        <div className="text-2xl font-bold text-primary tracking-tight">classraum</div>
        <div className="flex items-center gap-2">
          <button className="relative w-10 h-10 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-gray-700" strokeWidth={1.75} />
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
              3
            </span>
          </button>
          <button className="relative w-10 h-10 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center">
            <Bell className="w-5 h-5 text-gray-700" strokeWidth={1.75} />
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
              5
            </span>
          </button>
        </div>
      </div>
      {/* parent-role student selector — softer chip */}
      <div className="px-4 pt-3">
        <button className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-primary/5 rounded-xl ring-1 ring-primary/15">
          <span className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-semibold">민</div>
            <div className="text-left">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-primary/70">Viewing as parent</div>
              <div className="text-sm font-medium text-gray-900">김민지</div>
            </div>
          </span>
          <ChevronRight className="w-4 h-4 text-primary/60 rotate-90" />
        </button>
      </div>
      <div className="p-4 text-xs text-gray-400">page content…</div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   02. Bottom navigation
   ───────────────────────────────────────────────────────────────── */

const navItems: { icon: typeof Home; label: string }[] = [
  { icon: Home, label: 'Home' },
  { icon: Calendar, label: 'Schedule' },
  { icon: ClipboardList, label: 'Assignments' },
  { icon: BarChart, label: 'Reports' },
  { icon: User, label: 'Profile' },
]

function CurrentBottomNav() {
  return (
    <div className="h-full bg-white flex flex-col">
      <div className="flex-1 p-4 text-xs text-gray-400">page content…</div>
      <nav className="bg-white border-t border-gray-200 h-16 flex items-center justify-around">
        {navItems.map((item, i) => {
          const isActive = i === 0
          const Icon = item.icon
          return (
            <button
              key={item.label}
              className="flex flex-col items-center gap-1 px-2 py-1"
            >
              <Icon className={`w-6 h-6 ${isActive ? 'text-primary' : 'text-gray-500'}`} />
              <span className={`text-xs font-medium ${isActive ? 'text-primary' : 'text-gray-500'}`}>
                {item.label}
              </span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

function NewBottomNav() {
  return (
    <div className="h-full bg-[#fafafa] flex flex-col">
      <div className="flex-1 p-4 text-xs text-gray-400">page content…</div>
      <nav className="bg-white shadow-[0_-1px_0_rgba(0,0,0,0.04)] h-[72px] flex items-center justify-around px-2">
        {navItems.map((item, i) => {
          const isActive = i === 0
          const Icon = item.icon
          return (
            <button
              key={item.label}
              className="flex flex-col items-center gap-1 py-1.5 px-3 transition-transform active:scale-95"
            >
              <div
                className={`flex items-center justify-center w-11 h-7 rounded-full transition-colors ${
                  isActive ? 'bg-primary/10' : ''
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-gray-500'}`}
                  strokeWidth={isActive ? 2.25 : 1.75}
                />
              </div>
              <span
                className={`text-[10px] font-semibold tracking-tight ${
                  isActive ? 'text-primary' : 'text-gray-500'
                }`}
              >
                {item.label}
              </span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   03. Session card
   ───────────────────────────────────────────────────────────────── */

function CurrentSessionCard() {
  return (
    <div className="pt-12 p-4 bg-white h-full">
      <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">today</div>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-3 border-l-4 border-l-blue-500">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm text-gray-500 mb-1">
              <span className="font-semibold text-gray-900">14:00</span> – 15:30
            </div>
            <div className="font-semibold text-base text-gray-900">SAT Math Prep</div>
            <div className="text-sm text-gray-600 mt-1">Mr. Kim • Room 204</div>
          </div>
          <span className="w-2.5 h-2.5 rounded-full bg-green-400 mt-2"></span>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <span className="text-[11px] font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Present</span>
        </div>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 border-l-4 border-l-purple-500">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm text-gray-500 mb-1">
              <span className="font-semibold text-gray-900">16:00</span> – 17:00
            </div>
            <div className="font-semibold text-base text-gray-900">English Conversation</div>
            <div className="text-sm text-gray-600 mt-1">Ms. Park • Online</div>
          </div>
          <span className="w-2.5 h-2.5 rounded-full bg-primary mt-2"></span>
        </div>
      </div>
    </div>
  )
}

function NewSessionCard() {
  return (
    <div className="pt-12 p-4 bg-[#fafafa] h-full">
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-3">today</div>
      <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] p-4 mb-3">
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center pt-0.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#3b82f6' }} />
            <div className="w-px flex-1 bg-gray-200 mt-1 min-h-[24px]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm tabular-nums text-gray-500">
                <span className="font-semibold text-gray-900">14:00</span> – 15:30
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                Present
              </span>
            </div>
            <div className="font-semibold text-base text-gray-900 mb-1.5">SAT Math Prep</div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" strokeWidth={1.75} />Mr. Kim</span>
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" strokeWidth={1.75} />Room 204</span>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] p-4">
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center pt-0.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#a855f7' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm tabular-nums text-gray-500">
                <span className="font-semibold text-gray-900">16:00</span> – 17:00
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-700">
                Scheduled
              </span>
            </div>
            <div className="font-semibold text-base text-gray-900 mb-1.5">English Conversation</div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" strokeWidth={1.75} />Ms. Park</span>
              <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" strokeWidth={1.75} />Online</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   04. List items
   ───────────────────────────────────────────────────────────────── */

function CurrentList() {
  return (
    <div className="pt-12 p-4 bg-white h-full space-y-3">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="font-semibold text-base text-gray-900">Trigonometry Quiz #4</div>
          <span className="w-2 h-2 rounded-full bg-red-500 mt-2 flex-shrink-0" />
        </div>
        <div className="text-sm text-gray-600 mb-2">SAT Math Prep • Due Apr 30</div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-rose-600 bg-red-100 px-2 py-0.5 rounded-full">Overdue</span>
          <span className="text-sm font-semibold text-rose-600">62%</span>
        </div>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="font-semibold text-base text-gray-900">Reading Comprehension</div>
          <span className="w-2 h-2 rounded-full bg-green-500 mt-2 flex-shrink-0" />
        </div>
        <div className="text-sm text-gray-600 mb-2">English Lit • Due May 3</div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Submitted</span>
          <span className="text-sm font-semibold text-green-600">94%</span>
        </div>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="font-semibold text-base text-gray-900">Project Outline</div>
          <span className="w-2 h-2 rounded-full bg-orange-500 mt-2 flex-shrink-0" />
        </div>
        <div className="text-sm text-gray-600 mb-2">Science • Due May 8</div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">Pending</span>
          <span className="text-xs text-gray-500">— %</span>
        </div>
      </div>
    </div>
  )
}

function NewList() {
  return (
    <div className="pt-12 p-4 bg-[#fafafa] h-full space-y-2.5">
      <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] p-4 border-l-4 border-l-rose-400">
        <div className="flex items-start justify-between mb-1.5">
          <div className="min-w-0">
            <div className="font-semibold text-base text-gray-900 truncate">Trigonometry Quiz #4</div>
            <div className="text-xs text-gray-500 mt-0.5">SAT Math Prep · Due Apr 30</div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1" />
        </div>
        <div className="flex items-center gap-2 mt-3">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700">Overdue</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 tabular-nums">62%</span>
        </div>
      </div>
      <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] p-4">
        <div className="flex items-start justify-between mb-1.5">
          <div className="min-w-0">
            <div className="font-semibold text-base text-gray-900 truncate">Reading Comprehension</div>
            <div className="text-xs text-gray-500 mt-0.5">English Lit · Due May 3</div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1" />
        </div>
        <div className="flex items-center gap-2 mt-3">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">Submitted</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 tabular-nums">94%</span>
        </div>
      </div>
      <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] p-4 border-l-4 border-l-amber-400">
        <div className="flex items-start justify-between mb-1.5">
          <div className="min-w-0">
            <div className="font-semibold text-base text-gray-900 truncate">Project Outline</div>
            <div className="text-xs text-gray-500 mt-0.5">Science · Due May 8</div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1" />
        </div>
        <div className="flex items-center gap-2 mt-3">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700">Pending</span>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   05. Status pills
   ───────────────────────────────────────────────────────────────── */

function CurrentStatusPills() {
  return (
    <div className="pt-12 p-4 bg-white h-full">
      <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-2">Attendance</div>
      <div className="flex flex-wrap gap-2 mb-5">
        <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Present</span>
        <span className="text-xs font-medium text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">Late</span>
        <span className="text-xs font-medium text-rose-600 bg-red-100 px-2 py-0.5 rounded-full">Absent</span>
      </div>
      <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-2">Invoice</div>
      <div className="flex flex-wrap gap-2 mb-5">
        <span className="text-xs font-medium text-green-800 bg-green-100 px-2 py-0.5 rounded-full">Paid</span>
        <span className="text-xs font-medium text-rose-800 bg-red-100 px-2 py-0.5 rounded-full">Failed</span>
        <span className="text-xs font-medium text-amber-800 bg-orange-100 px-2 py-0.5 rounded-full">Pending</span>
      </div>
      <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-2">Grade</div>
      <div className="flex flex-wrap gap-2">
        <span className="text-sm font-semibold text-green-600">94%</span>
        <span className="text-sm font-semibold text-orange-600">73%</span>
        <span className="text-sm font-semibold text-rose-600">52%</span>
      </div>
    </div>
  )
}

function NewStatusPills() {
  return (
    <div className="pt-12 p-4 bg-[#fafafa] h-full">
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-2">Attendance</div>
      <div className="flex flex-wrap gap-2 mb-5">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">Present</span>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">Late</span>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700">Absent</span>
      </div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-2">Invoice</div>
      <div className="flex flex-wrap gap-2 mb-5">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">Paid</span>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700">Failed</span>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">Pending</span>
      </div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-2">Grade</div>
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 tabular-nums">94%</span>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 tabular-nums">73%</span>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 tabular-nums">52%</span>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   06. Avatars
   ───────────────────────────────────────────────────────────────── */

const fakePeople = [
  { name: '김민지', role: 'parent' as const, initial: '민' },
  { name: '박선생', role: 'teacher' as const, initial: '박' },
  { name: '이지훈', role: 'student' as const, initial: '이' },
  { name: '최가족', role: 'family' as const, initial: '최' },
]

function CurrentAvatars() {
  return (
    <div className="pt-12 p-4 bg-white h-full space-y-3">
      {fakePeople.map(p => (
        <div key={p.name} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
            {p.initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900 text-sm">{p.name}</div>
            <div className="text-xs text-gray-500 capitalize">{p.role}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

const roleGradient: Record<string, string> = {
  parent: 'from-sky-400 to-sky-600',
  teacher: 'from-emerald-400 to-emerald-600',
  student: 'from-blue-400 to-blue-600',
  family: 'from-violet-400 to-violet-600',
}

function NewAvatars() {
  return (
    <div className="pt-12 p-4 bg-[#fafafa] h-full space-y-2.5">
      {fakePeople.map(p => (
        <div key={p.name} className="flex items-center gap-3 p-3 bg-white rounded-2xl ring-1 ring-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)]">
          <div className={`w-10 h-10 bg-gradient-to-br ${roleGradient[p.role]} rounded-full flex items-center justify-center text-white font-semibold text-sm`}>
            {p.initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900 text-sm">{p.name}</div>
            <div className="text-xs text-gray-500 capitalize">{p.role}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   07. Bottom sheets
   ───────────────────────────────────────────────────────────────── */

function CurrentBottomSheet() {
  return (
    <div className="h-full bg-gray-200/40 relative">
      <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl h-[75%] flex flex-col">
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Comments (3)</h3>
          <button className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="flex-1 p-4 space-y-4 overflow-hidden">
          <div className="flex gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-medium">박</div>
            <div className="flex-1">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium text-gray-900">Mr. Park</span>
                <span className="text-xs text-gray-500">2h ago</span>
              </div>
              <p className="text-sm text-gray-700 mt-1">Good work on this — review your trig identities.</p>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-200 p-3 flex items-center gap-2">
          <textarea placeholder="Add a comment…" className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none" rows={1} />
          <button className="p-2 bg-primary text-white rounded-lg"><Send className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  )
}

function NewBottomSheet() {
  return (
    <div className="h-full bg-black/30 backdrop-blur-sm relative">
      <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-3xl h-[75%] flex flex-col shadow-[0_-24px_48px_-12px_rgba(0,0,0,0.18)]">
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">Discussion</div>
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              Comments
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-semibold bg-primary/10 text-primary rounded-full">3</span>
            </h3>
          </div>
          <button className="w-9 h-9 rounded-full hover:bg-gray-50 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="flex-1 p-4 space-y-4 overflow-hidden">
          <div className="flex gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">박</div>
            <div className="flex-1 bg-gray-50 rounded-2xl px-3 py-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-gray-900">Mr. Park</span>
                <span className="text-[10px] text-gray-400 tabular-nums">2h ago</span>
              </div>
              <p className="text-sm text-gray-700 mt-1">Good work on this — review your trig identities.</p>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-100 p-3 flex items-end gap-2 bg-gray-50/50">
          <textarea placeholder="Add a comment…" className="flex-1 text-sm bg-white rounded-2xl px-3 py-2 resize-none ring-1 ring-gray-200 focus:ring-primary outline-none" rows={1} />
          <button className="w-9 h-9 bg-primary text-white rounded-full flex items-center justify-center shadow-[0_4px_12px_-4px_rgba(40,133,232,0.5)]"><Send className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   08. Profile page
   ───────────────────────────────────────────────────────────────── */

function CurrentProfile() {
  return (
    <div className="pt-12 p-4 bg-white h-full overflow-hidden">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Profile</h1>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-3 flex items-center gap-3">
        <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">민</div>
        <div>
          <div className="font-semibold text-gray-900">김민지</div>
          <div className="text-sm text-gray-500">student@classraum.com</div>
        </div>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-2 flex items-center justify-between">
        <div className="flex items-center gap-3"><Globe className="w-5 h-5 text-gray-400" /><span className="text-sm text-gray-900">Language</span></div>
        <span className="text-sm text-gray-500">English ▾</span>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-2 flex items-center justify-between">
        <div className="flex items-center gap-3"><Bell className="w-5 h-5 text-gray-400" /><span className="text-sm text-gray-900">Notifications</span></div>
        <ChevronRight className="w-4 h-4 text-gray-400" />
      </div>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-2 flex items-center justify-between">
        <div className="flex items-center gap-3"><Settings className="w-5 h-5 text-gray-400" /><span className="text-sm text-gray-900">Account settings</span></div>
        <ChevronRight className="w-4 h-4 text-gray-400" />
      </div>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 flex items-center justify-between">
        <div className="flex items-center gap-3"><LogOut className="w-5 h-5 text-red-500" /><span className="text-sm text-rose-600">Sign out</span></div>
      </div>
    </div>
  )
}

function NewProfile() {
  return (
    <div className="pt-12 p-4 bg-[#fafafa] h-full overflow-hidden">
      <h1 className="text-2xl font-semibold tracking-tight text-gray-900 mb-4">Profile</h1>
      {/* Profile summary card */}
      <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] p-4 mb-5 flex items-center gap-3">
        <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">민</div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-gray-900">김민지</div>
          <div className="text-xs text-gray-500 truncate">student@classraum.com</div>
        </div>
        <button className="text-[10px] font-semibold uppercase tracking-wider text-primary px-3 py-1.5 rounded-full bg-primary/8">Edit</button>
      </div>

      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-2 px-1">Preferences</div>
      <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] divide-y divide-gray-100 mb-5">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3"><Globe className="w-5 h-5 text-gray-500" strokeWidth={1.75} /><span className="text-sm text-gray-900">Language</span></div>
          <span className="text-sm text-gray-500">English</span>
        </div>
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3"><Bell className="w-5 h-5 text-gray-500" strokeWidth={1.75} /><span className="text-sm text-gray-900">Notifications</span></div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </div>
      </div>

      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-2 px-1">Account</div>
      <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] divide-y divide-gray-100">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3"><Settings className="w-5 h-5 text-gray-500" strokeWidth={1.75} /><span className="text-sm text-gray-900">Account settings</span></div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </div>
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3"><LogOut className="w-5 h-5 text-rose-600" strokeWidth={1.75} /><span className="text-sm text-rose-700 font-medium">Sign out</span></div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   09. Empty state
   ───────────────────────────────────────────────────────────────── */

function CurrentEmpty() {
  return (
    <div className="pt-12 p-4 bg-white h-full flex items-center justify-center">
      <div className="text-center">
        <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-700">No assignments</p>
        <p className="text-xs text-gray-500 mt-1">You&apos;re all caught up.</p>
      </div>
    </div>
  )
}

function NewEmpty() {
  return (
    <div className="pt-12 p-4 bg-[#fafafa] h-full flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-primary/8 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-7 h-7 text-primary" strokeWidth={1.75} />
        </div>
        <h3 className="text-base font-semibold text-gray-900 mb-1">All caught up</h3>
        <p className="text-sm text-gray-500 mb-5 max-w-[220px] mx-auto">
          No assignments due. New ones will show up here when your teachers post them.
        </p>
        <button className="text-sm font-medium text-primary hover:underline underline-offset-4">
          View past assignments →
        </button>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   10. Detail page
   ───────────────────────────────────────────────────────────────── */

function CurrentDetail() {
  return (
    <div className="pt-12 bg-white h-full overflow-hidden">
      <div className="px-4 py-2 flex items-center gap-3 border-b border-gray-200">
        <button className="p-1"><ArrowLeft className="w-5 h-5 text-gray-700" /></button>
        <h1 className="font-semibold text-gray-900">SAT Math Prep</h1>
      </div>
      <div className="p-4 space-y-3">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <div className="text-sm text-gray-600 mb-1">Date</div>
          <div className="font-medium text-gray-900">Tuesday, April 30, 2026</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <div className="text-sm text-gray-600 mb-1">Time</div>
          <div className="font-medium text-gray-900">14:00 – 15:30</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <div className="text-sm text-gray-600 mb-1">Location</div>
          <div className="font-medium text-gray-900">Room 204</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <div className="text-sm text-gray-600 mb-2">Attendance</div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-sm text-gray-900">Present</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function NewDetail() {
  return (
    <div className="pt-12 bg-[#fafafa] h-full overflow-hidden">
      <div className="px-4 py-2 flex items-center justify-between">
        <button className="w-9 h-9 rounded-full bg-white ring-1 ring-gray-100 flex items-center justify-center">
          <ArrowLeft className="w-4 h-4 text-gray-700" />
        </button>
        <button className="w-9 h-9 rounded-full bg-white ring-1 ring-gray-100 flex items-center justify-center">
          <MoreHorizontal className="w-4 h-4 text-gray-700" />
        </button>
      </div>
      {/* Hero */}
      <div className="px-4 mt-2">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">SAT Math Prep</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 leading-tight">Trigonometry & Identities</h1>
        <p className="text-sm text-gray-500 mt-1">Tuesday · Apr 30 · 14:00 – 15:30</p>
        <div className="flex items-center gap-2 mt-3">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">Present</span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">Room 204</span>
        </div>
      </div>
      {/* Section */}
      <div className="px-4 mt-6">
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-2 px-1">Details</div>
        <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] divide-y divide-gray-100">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3"><GraduationCap className="w-4 h-4 text-gray-500" strokeWidth={1.75} /><span className="text-sm text-gray-700">Teacher</span></div>
            <span className="text-sm font-medium text-gray-900">Mr. Kim</span>
          </div>
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3"><MapPin className="w-4 h-4 text-gray-500" strokeWidth={1.75} /><span className="text-sm text-gray-700">Location</span></div>
            <span className="text-sm font-medium text-gray-900">Room 204</span>
          </div>
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3"><FileText className="w-4 h-4 text-gray-500" strokeWidth={1.75} /><span className="text-sm text-gray-700">Assignments</span></div>
            <span className="text-sm font-medium text-gray-900">2</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   11. Composite home screen
   ───────────────────────────────────────────────────────────────── */

function CompositeHomeScreen() {
  return (
    <div className="bg-[#fafafa] h-full flex flex-col">
      {/* Header */}
      <div className="pt-10">
        <div className="bg-white shadow-[0_1px_0_rgba(0,0,0,0.04)] flex items-center justify-between px-4 py-3.5">
          <div className="text-2xl font-bold text-primary tracking-tight">classraum</div>
          <div className="flex items-center gap-2">
            <button className="relative w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-gray-700" strokeWidth={1.75} />
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">3</span>
            </button>
            <button className="relative w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
              <Bell className="w-5 h-5 text-gray-700" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </div>
      {/* Body */}
      <div className="flex-1 overflow-hidden">
        <div className="px-4 pt-5 pb-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">Tuesday · Apr 30</div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 mt-1">Good afternoon, 민지</h1>
        </div>
        <div className="px-4 space-y-2.5">
          {/* Today's session */}
          <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] p-4">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full mt-2" style={{ backgroundColor: '#3b82f6' }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm tabular-nums text-gray-500"><span className="font-semibold text-gray-900">14:00</span> – 15:30</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-700">Up next</span>
                </div>
                <div className="font-semibold text-base text-gray-900 mb-1.5">SAT Math Prep</div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" strokeWidth={1.75} />Mr. Kim</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" strokeWidth={1.75} />Room 204</span>
                </div>
              </div>
            </div>
          </div>
          {/* Pending assignment */}
          <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] p-4 border-l-4 border-l-rose-400">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <div className="font-semibold text-sm text-gray-900 truncate">Trigonometry Quiz #4</div>
                <div className="text-xs text-gray-500 mt-0.5">Due today</div>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 flex-shrink-0">Overdue</span>
            </div>
          </div>
          {/* New invoice */}
          <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-primary" strokeWidth={1.75} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">May tuition</div>
                <div className="text-xs text-gray-500">Due May 15 · ₩450,000</div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        </div>
      </div>
      {/* Bottom nav */}
      <nav className="bg-white shadow-[0_-1px_0_rgba(0,0,0,0.04)] h-[72px] flex items-center justify-around px-2 flex-shrink-0">
        {navItems.map((item, i) => {
          const isActive = i === 0
          const Icon = item.icon
          return (
            <button key={item.label} className="flex flex-col items-center gap-1 py-1.5 px-3">
              <div className={`flex items-center justify-center w-11 h-7 rounded-full ${isActive ? 'bg-primary/10' : ''}`}>
                <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-gray-500'}`} strokeWidth={isActive ? 2.25 : 1.75} />
              </div>
              <span className={`text-[10px] font-semibold tracking-tight ${isActive ? 'text-primary' : 'text-gray-500'}`}>{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
