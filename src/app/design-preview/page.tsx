/**
 * Design preview sandbox.
 *
 * Standalone page for evaluating proposed visual refinements side-by-side
 * with the current design. NOT linked from anywhere in the app.
 *
 * To remove: delete this file + the `isDesignPreviewRoute` check in
 * src/middleware.ts.
 *
 * Reach it at: localhost:3001/design-preview (main domain)
 *           or app.localhost:3001/design-preview (app subdomain)
 */
"use client"

import {
  Home, School, Calendar, ClipboardList, Search, Plus, Pause,
  Edit, Trash2, GraduationCap, BookOpen, Clock, MessageSquare,
  Bell, BarChart, CreditCard, ArrowUpRight, CheckCircle, XCircle,
  AlertTriangle, Info, ChevronRight, MoreVertical, Sparkles,
  TrendingUp, Users, X, Loader2, ArrowRight, Command, FileText,
  Filter, Download, Inbox, Folder,
} from 'lucide-react'
import { EmptyState } from '@/components/ui/common/EmptyState'

export default function DesignPreviewPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] text-foreground">
      {/* Top header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-8 py-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
            Design preview
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 mt-2">
            Modernization mockups
          </h1>
          <p className="text-gray-500 mt-2 max-w-2xl">
            Each section shows the current design alongside a proposed refinement.
            Nothing here changes the live app — the file is at{' '}
            <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">
              src/app/design-preview/page.tsx
            </code>
            .
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-12 space-y-20">

        {/* 1. Page header */}
        <Section
          number="01"
          title="Page header"
          rationale="Larger, more confident titles. Eyebrow label replaces verbose description. The header has presence without taking more vertical space."
        >
          <Comparison
            before={<CurrentPageHeader />}
            after={<NewPageHeader />}
          />
        </Section>

        {/* 2. Stat card */}
        <Section
          number="02"
          title="Stat card"
          rationale="Number is the hero. Color-tinted icon replaces the colored left border. Trend chip carries meaning that raw subtext can't."
        >
          <Comparison
            before={<CurrentStatCard />}
            after={<NewStatCard />}
          />
        </Section>

        {/* 3. Sidebar nav active state */}
        <Section
          number="03"
          title="Sidebar active state"
          rationale="The current page should be unmistakable from across the room. Left accent bar + primary tint + colored icon."
        >
          <Comparison
            before={<CurrentSidebarNav />}
            after={<NewSidebarNav />}
          />
        </Section>

        {/* 4. Card surface */}
        <Section
          number="04"
          title="Card surface"
          rationale="Soft layered shadow instead of a hard border. Gives depth without visual weight. Same hover feedback, more refined resting state."
        >
          <Comparison
            before={<CurrentCard />}
            after={<NewCard />}
          />
        </Section>

        {/* 5. Input/Select focus */}
        <Section
          number="05"
          title="Input focus state"
          rationale="A 2px primary-tinted ring is unambiguous. Subtle bg shift on focus adds feedback without movement."
        >
          <Comparison
            before={<CurrentInput />}
            after={<NewInput />}
          />
        </Section>

        {/* 6. Primary button */}
        <Section
          number="06"
          title="Primary button"
          rationale="A whisper of inner highlight + hover lift signals quality. Same color, more depth."
        >
          <Comparison
            before={<CurrentButton />}
            after={<NewButton />}
          />
        </Section>

        {/* 7. Empty state */}
        <Section
          number="07"
          title="Empty state"
          rationale="Tinted backdrop behind the icon doubles visual presence. Warmer copy. Secondary action reduces decision fatigue."
        >
          <Comparison
            before={<CurrentEmptyState />}
            after={<NewEmptyState />}
          />
          <div className="mt-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-3">
              Variants — sm / sm subtle / md / lg
            </p>
            <EmptyStateVariants />
          </div>
        </Section>

        {/* 8. Classroom card */}
        <Section
          number="08"
          title="Classroom card (signature variant)"
          rationale="Use the classroom's assigned color as a soft top accent — instantly scannable. Tighter info rhythm. Single primary action."
        >
          <Comparison
            before={<CurrentClassroomCard />}
            after={<NewClassroomCard />}
          />
        </Section>

        {/* 9. Typography scale */}
        <Section
          number="09"
          title="Typography scale"
          rationale="Use weight as much as size for hierarchy. Three weights (400/500/600) with ~5 sizes carries more clarity than 7 sizes alone. Tighter tracking on headings reads more confident."
        >
          <Comparison before={<CurrentTypography />} after={<NewTypography />} />
        </Section>

        {/* 10. Status pills / badges */}
        <Section
          number="10"
          title="Status pills (semantic system)"
          rationale="A consistent semantic palette beats ad-hoc colors. Soft tinted backgrounds + matching text feel modern and accessible. Use these everywhere status appears (attendance, payment, grading, etc.)."
        >
          <Comparison before={<CurrentBadges />} after={<NewBadges />} />
        </Section>

        {/* 11. Modal */}
        <Section
          number="11"
          title="Modal"
          rationale="Backdrop blur softens the cut-out feel. Footer with subtle gray bg distinguishes the action area. Confident shadow signals 'this is the focus right now.'"
        >
          <Comparison before={<CurrentModal />} after={<NewModal />} />
        </Section>

        {/* 12. Loading skeleton */}
        <Section
          number="12"
          title="Loading skeleton"
          rationale="Shimmer feels active where pulse feels paused. Skeletons that match real layout (proportions, count) read as trustworthy preview, not generic placeholder."
        >
          <Comparison before={<CurrentSkeleton />} after={<NewSkeleton />} />
        </Section>

        {/* 13. Toast notification */}
        <Section
          number="13"
          title="Toast notification"
          rationale="Iconified left rail in semantic color makes the kind of message instantly readable. Tighter padding, a closer caption layout, and a subtle action link give it more utility per pixel."
        >
          <Comparison before={<CurrentToast />} after={<NewToast />} />
        </Section>

        {/* 14. Form field */}
        <Section
          number="14"
          title="Form field"
          rationale="Cleaner label hierarchy. Required indicator becomes meaningful (asterisk in primary). Help text below establishes expectations before the user types."
        >
          <Comparison before={<CurrentFormField />} after={<NewFormField />} />
        </Section>

        {/* 15. Data table row */}
        <Section
          number="15"
          title="Data table row"
          rationale="Add scannable hierarchy: avatar/initial cell, name + email stacked, status pill, secondary metadata muted. Hover background creates interaction affordance."
        >
          <Comparison before={<CurrentTableRow />} after={<NewTableRow />} />
        </Section>

        {/* 16. Search → command palette */}
        <Section
          number="16"
          title="Global search → command palette"
          rationale="A ⌘K command palette is the modern SaaS keyboard-first pattern. Replaces page-by-page search with one universal entry point. Power users discover everything; casual users still get a fine plain search."
        >
          <Comparison before={<CurrentSearch />} after={<NewSearch />} />
        </Section>

        {/* 17. Composite — full page mockup */}
        <section>
          <div className="mb-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400 mb-1.5">
              17 — composite
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
              Everything together: Classrooms page reimagined
            </h2>
            <p className="text-sm text-gray-500 mt-2 max-w-2xl">
              Header + stat cards + filter bar + classroom cards composed in
              the new style. This is roughly what the live page would look like
              if you adopted sections 01–08 together.
            </p>
          </div>
          <div className="rounded-2xl bg-[#fafafa] p-8 ring-1 ring-gray-200">
            <CompositeClassroomsPage />
          </div>
        </section>

      </div>

      <div className="max-w-6xl mx-auto px-8 py-12 border-t border-gray-200 mt-12">
        <p className="text-sm text-gray-500">
          End of preview. Each refinement is independent — you can adopt any
          subset. To delete this sandbox: remove{' '}
          <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">
            src/app/design-preview/
          </code>{' '}
          and the{' '}
          <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">
            isDesignPreviewRoute
          </code>{' '}
          check in middleware.ts.
        </p>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   Layout helpers
   ───────────────────────────────────────────────────────────────── */

function Section({
  number,
  title,
  rationale,
  children,
}: {
  number: string
  title: string
  rationale: string
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400 mb-1.5">
          {number}
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
          {title}
        </h2>
        <p className="text-sm text-gray-500 mt-2 max-w-2xl">{rationale}</p>
      </div>
      {children}
    </section>
  )
}

function Comparison({ before, after }: { before: React.ReactNode; after: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <Frame label="Current">{before}</Frame>
      <Frame label="Proposed" highlight>{after}</Frame>
    </div>
  )
}

function Frame({
  label,
  highlight,
  children,
}: {
  label: string
  highlight?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span
          className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${
            highlight ? 'text-primary' : 'text-gray-400'
          }`}
        >
          {label}
        </span>
        {highlight && (
          <span className="text-[10px] font-medium text-primary/70">
            ↗ proposed
          </span>
        )}
      </div>
      <div
        className={`rounded-2xl bg-white p-8 ${
          highlight
            ? 'shadow-[0_2px_8px_-2px_rgba(40,133,232,0.15),0_8px_24px_-8px_rgba(40,133,232,0.1)] ring-1 ring-primary/10'
            : 'border border-gray-200'
        }`}
      >
        {children}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   1. Page header
   ───────────────────────────────────────────────────────────────── */

function CurrentPageHeader() {
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Classrooms</h1>
          <p className="text-gray-500">Manage your classroom settings and schedules</p>
        </div>
        <button className="bg-primary text-white text-sm font-medium px-4 py-2 rounded-md flex items-center gap-2 self-start">
          <Plus className="w-4 h-4" />
          Create Classroom
        </button>
      </div>
    </div>
  )
}

function NewPageHeader() {
  return (
    <div className="pb-6 border-b border-gray-100 -mb-2">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary mb-1.5">
            Classroom management
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
            Classrooms
          </h1>
        </div>
        <button className="bg-primary text-white text-sm font-medium px-4 h-10 rounded-md flex items-center gap-2 self-start sm:self-end shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_1px_2px_rgba(0,0,0,0.08)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_4px_8px_-2px_rgba(40,133,232,0.3)] hover:-translate-y-px transition-all">
          <Plus className="w-4 h-4" strokeWidth={2.25} />
          Create Classroom
        </button>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   2. Stat card
   ───────────────────────────────────────────────────────────────── */

function CurrentStatCard() {
  return (
    <div className="rounded-xl bg-white border border-gray-200 border-l-4 border-l-purple-500 p-6 w-72">
      <div className="space-y-3">
        <p className="text-sm font-medium text-purple-700">Total Active Classrooms</p>
        <div className="flex items-baseline gap-2">
          <p className="text-4xl font-semibold text-gray-900">3</p>
          <p className="text-sm text-gray-500">Classrooms</p>
        </div>
        <p className="text-xs text-gray-500">전체 20개 중</p>
      </div>
    </div>
  )
}

function NewStatCard() {
  return (
    <div className="rounded-2xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] p-6 w-72 ring-1 ring-gray-100">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/8 flex items-center justify-center">
            <School className="w-3.5 h-3.5 text-primary" strokeWidth={2.25} />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500">
            Active classrooms
          </p>
        </div>
      </div>
      <div className="flex items-baseline gap-2 mb-3">
        <p className="text-5xl font-semibold tracking-tight text-gray-900 tabular-nums">3</p>
        <p className="text-sm text-gray-400">/ 20</p>
      </div>
      <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-medium">
        <ArrowUpRight className="w-3 h-3" strokeWidth={2.5} />
        15% of total
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   3. Sidebar active state
   ───────────────────────────────────────────────────────────────── */

function CurrentSidebarNav() {
  const items = [
    { icon: Home, label: 'Dashboard', active: false },
    { icon: School, label: 'Classrooms', active: true },
    { icon: Calendar, label: 'Sessions', active: false },
    { icon: ClipboardList, label: 'Assignments', active: false },
  ]
  return (
    <div className="bg-white py-2">
      {items.map(({ icon: Icon, label, active }) => (
        <button
          key={label}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm font-medium ${
            active
              ? 'bg-gray-100 text-gray-900'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Icon className="w-4 h-4" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  )
}

function NewSidebarNav() {
  const items = [
    { icon: Home, label: 'Dashboard', active: false },
    { icon: School, label: 'Classrooms', active: true },
    { icon: Calendar, label: 'Sessions', active: false },
    { icon: ClipboardList, label: 'Assignments', active: false },
  ]
  return (
    <div className="bg-white py-2">
      {items.map(({ icon: Icon, label, active }) => (
        <button
          key={label}
          className={`relative w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-all ${
            active
              ? 'bg-primary/8 text-primary font-semibold'
              : 'text-gray-600 hover:bg-gray-50 hover:text-primary font-medium'
          }`}
        >
          {active && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r" />
          )}
          <Icon
            className={`w-[18px] h-[18px] ${active ? 'text-primary' : 'text-gray-400'}`}
            strokeWidth={active ? 2.25 : 1.75}
          />
          <span>{label}</span>
        </button>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   4. Card surface
   ───────────────────────────────────────────────────────────────── */

function CurrentCard() {
  return (
    <div className="rounded-xl bg-white border border-gray-200 p-6 w-full">
      <h3 className="text-base font-semibold text-gray-900 mb-1">Card title</h3>
      <p className="text-sm text-gray-500 mb-4">
        Standard card with a 1px gray border. Functional but flat.
      </p>
      <div className="h-12 rounded-md bg-gray-50 border border-gray-100" />
    </div>
  )
}

function NewCard() {
  return (
    <div className="rounded-2xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] p-6 w-full ring-1 ring-gray-100/80 hover:shadow-[0_2px_4px_rgba(0,0,0,0.04),0_8px_24px_-6px_rgba(0,0,0,0.08)] hover:ring-gray-200 transition-all">
      <h3 className="text-base font-semibold text-gray-900 mb-1">Card title</h3>
      <p className="text-sm text-gray-500 mb-4">
        Soft layered shadow + subtle ring. Reads elevated. Hover feels alive.
      </p>
      <div className="h-12 rounded-lg bg-gray-50/80 ring-1 ring-gray-100" />
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   5. Input focus
   ───────────────────────────────────────────────────────────────── */

function CurrentInput() {
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400 font-medium">Default</p>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
        <input
          type="text"
          placeholder="Search classrooms..."
          className="w-full h-10 pl-10 pr-3 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:border-primary"
        />
      </div>
      <p className="text-xs text-gray-400 font-medium pt-2">Focused</p>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
        <input
          type="text"
          placeholder="Search classrooms..."
          className="w-full h-10 pl-10 pr-3 rounded-md border border-primary bg-white text-sm focus:outline-none"
          autoFocus={false}
        />
      </div>
    </div>
  )
}

function NewInput() {
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400 font-medium">Default</p>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" strokeWidth={1.75} />
        <input
          type="text"
          placeholder="Search classrooms..."
          className="w-full h-10 pl-10 pr-3 rounded-lg border border-gray-300 bg-gray-50/50 text-sm focus:outline-none placeholder:text-gray-400"
        />
      </div>
      <p className="text-xs text-gray-400 font-medium pt-2">Focused</p>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary h-4 w-4" strokeWidth={2} />
        <input
          type="text"
          placeholder="Search classrooms..."
          className="w-full h-10 pl-10 pr-3 rounded-lg border border-primary bg-white text-sm focus:outline-none ring-2 ring-primary/20"
        />
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   6. Primary button
   ───────────────────────────────────────────────────────────────── */

function CurrentButton() {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <button className="bg-primary text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-primary/90">
        Create Classroom
      </button>
      <button className="border border-gray-200 bg-white text-gray-700 text-sm font-medium px-4 py-2 rounded-md hover:bg-gray-50">
        Schedule Break
      </button>
      <button className="text-primary text-sm font-medium px-4 py-2 rounded-md hover:bg-primary/5">
        Cancel
      </button>
    </div>
  )
}

function NewButton() {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <button className="bg-primary text-white text-sm font-medium px-4 h-10 rounded-md flex items-center shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_1px_2px_rgba(0,0,0,0.08)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_4px_12px_-2px_rgba(40,133,232,0.4)] hover:-translate-y-px transition-all">
        Create Classroom
      </button>
      <button className="bg-white text-gray-700 text-sm font-medium px-4 h-10 rounded-md flex items-center ring-1 ring-gray-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:ring-gray-300 hover:shadow-[0_2px_6px_-1px_rgba(0,0,0,0.08)] hover:-translate-y-px transition-all">
        Schedule Break
      </button>
      <button className="text-gray-600 text-sm font-medium px-4 h-10 rounded-md hover:bg-gray-100/70 hover:text-gray-900 transition-colors">
        Cancel
      </button>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   7. Empty state
   ───────────────────────────────────────────────────────────────── */

function CurrentEmptyState() {
  return (
    <div className="rounded-xl bg-white border border-dashed border-gray-200 p-12 text-center">
      <BookOpen className="w-10 h-10 text-gray-400 mx-auto mb-3" />
      <h3 className="text-lg font-medium text-gray-900 mb-1">No assignments found</h3>
      <p className="text-sm text-gray-500 mb-4">
        Get started by creating your first assignment
      </p>
      <button className="bg-primary text-white text-sm font-medium px-4 py-2 rounded-md inline-flex items-center gap-2">
        <Plus className="w-4 h-4" />
        Add Assignment
      </button>
    </div>
  )
}

function NewEmptyState() {
  return (
    <div className="rounded-2xl bg-white ring-1 ring-gray-100">
      <EmptyState
        icon={BookOpen}
        title="Your first assignment is one click away"
        description="Create from scratch, import from text, or copy from a template."
        actionLabel="Add Assignment"
        onAction={() => {}}
        secondaryAction={{ label: 'Import from text →', onClick: () => {} }}
        size="md"
      />
    </div>
  )
}

/* EmptyState variant gallery — sm (compact for dropdowns), md default, lg for hero,
   and subtle (no chip) for very tight spaces. */
function EmptyStateVariants() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="rounded-2xl bg-white ring-1 ring-gray-100">
        <div className="px-4 pt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">
          size=&quot;sm&quot;
        </div>
        <EmptyState
          icon={Inbox}
          title="No notifications"
          description="You're all caught up."
          size="sm"
        />
      </div>
      <div className="rounded-2xl bg-white ring-1 ring-gray-100">
        <div className="px-4 pt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">
          size=&quot;sm&quot; variant=&quot;subtle&quot;
        </div>
        <EmptyState
          icon={Search}
          title="No matches"
          description="Try a different search term."
          size="sm"
          variant="subtle"
        />
      </div>
      <div className="rounded-2xl bg-white ring-1 ring-gray-100">
        <div className="px-4 pt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">
          size=&quot;md&quot; (no actions)
        </div>
        <EmptyState
          icon={Folder}
          title="No reports yet"
          description="Reports you create will appear here."
          size="md"
        />
      </div>
      <div className="rounded-2xl bg-white ring-1 ring-gray-100">
        <div className="px-4 pt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">
          size=&quot;lg&quot;
        </div>
        <EmptyState
          icon={GraduationCap}
          title="Welcome to Classraum"
          description="Set up your first classroom to start tracking sessions, attendance, and grades."
          actionLabel="Create classroom"
          onAction={() => {}}
          size="lg"
        />
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   8. Classroom card (signature variant)
   ───────────────────────────────────────────────────────────────── */

function CurrentClassroomCard() {
  return (
    <div className="rounded-xl bg-white border border-gray-200 p-5 w-full max-w-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <h3 className="text-base font-semibold text-gray-900">김시아</h3>
        </div>
        <div className="flex items-center gap-1 text-gray-400">
          <Pause className="w-4 h-4" />
          <Edit className="w-4 h-4" />
          <Trash2 className="w-4 h-4" />
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-sm text-gray-600 mb-4">
        <GraduationCap className="w-4 h-4" />
        Daniel Kim
      </div>
      <div className="space-y-2 text-sm text-gray-600 mb-5">
        <div className="flex items-center gap-1.5">
          <School className="w-4 h-4" /> 1 Students
        </div>
        <div className="flex items-center gap-1.5">
          <BookOpen className="w-4 h-4" /> Grade 9
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-4 h-4" /> Wednesday 8:00 PM - 9:50 PM
        </div>
      </div>
      <div className="space-y-2">
        <button className="w-full h-9 border border-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50">
          View Details
        </button>
        <button className="w-full h-9 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary/90">
          View Sessions
        </button>
      </div>
    </div>
  )
}

function NewClassroomCard() {
  return (
    <div className="rounded-2xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] ring-1 ring-gray-100/80 hover:shadow-[0_2px_4px_rgba(0,0,0,0.04),0_8px_24px_-6px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all w-full max-w-sm overflow-hidden cursor-pointer">
      {/* Top accent in the classroom's color */}
      <div className="h-1 bg-gradient-to-r from-emerald-400 to-emerald-500" />
      <div className="p-5">
        <div className="flex items-start justify-between mb-1">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-600 mb-1">
              Active
            </p>
            <h3 className="text-lg font-semibold text-gray-900 tracking-tight">김시아</h3>
            <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
              <GraduationCap className="w-3.5 h-3.5" strokeWidth={1.75} />
              Daniel Kim
            </p>
          </div>
          <div className="flex items-center gap-0.5 -mr-1">
            <button className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-md transition-colors">
              <Pause className="w-4 h-4" strokeWidth={1.75} />
            </button>
            <button className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-md transition-colors">
              <Edit className="w-4 h-4" strokeWidth={1.75} />
            </button>
            <button className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-red-50 rounded-md transition-colors">
              <Trash2 className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 my-5 py-3 border-y border-gray-100">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400 mb-0.5">Students</p>
            <p className="text-sm font-semibold text-gray-900">1</p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400 mb-0.5">Grade</p>
            <p className="text-sm font-semibold text-gray-900">9</p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400 mb-0.5">Subject</p>
            <p className="text-sm font-semibold text-gray-900">English</p>
          </div>
        </div>
        <p className="text-xs text-gray-500 flex items-center gap-1.5 mb-4">
          <Clock className="w-3.5 h-3.5" strokeWidth={1.75} />
          Wednesday · 8:00 PM – 9:50 PM
        </p>
        <button className="w-full h-10 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 group">
          View Sessions
          <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   9. Typography scale
   ───────────────────────────────────────────────────────────────── */

function CurrentTypography() {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] uppercase text-gray-400 mb-1">Page title</p>
        <h1 className="text-2xl font-bold text-gray-900">Classrooms</h1>
      </div>
      <div>
        <p className="text-[10px] uppercase text-gray-400 mb-1">Card title</p>
        <h3 className="text-base font-semibold text-gray-900">Algebra II — Grade 9</h3>
      </div>
      <div>
        <p className="text-[10px] uppercase text-gray-400 mb-1">Body</p>
        <p className="text-sm text-gray-600">Track student progress, assign homework, and review attendance for this classroom.</p>
      </div>
      <div>
        <p className="text-[10px] uppercase text-gray-400 mb-1">Caption</p>
        <p className="text-xs text-gray-500">Last updated 2 hours ago</p>
      </div>
    </div>
  )
}

function NewTypography() {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] uppercase text-gray-400 mb-1">Eyebrow</p>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
          Classroom management
        </p>
      </div>
      <div>
        <p className="text-[10px] uppercase text-gray-400 mb-1">Display (page title)</p>
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Classrooms</h1>
      </div>
      <div>
        <p className="text-[10px] uppercase text-gray-400 mb-1">Heading</p>
        <h3 className="text-lg font-semibold text-gray-900 tracking-tight">Algebra II — Grade 9</h3>
      </div>
      <div>
        <p className="text-[10px] uppercase text-gray-400 mb-1">Body</p>
        <p className="text-sm text-gray-600 leading-relaxed">Track student progress, assign homework, and review attendance for this classroom.</p>
      </div>
      <div>
        <p className="text-[10px] uppercase text-gray-400 mb-1">Caption (muted)</p>
        <p className="text-xs text-gray-500">Last updated 2 hours ago</p>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   10. Status badges
   ───────────────────────────────────────────────────────────────── */

function CurrentBadges() {
  return (
    <div className="flex flex-wrap gap-2">
      <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Active</span>
      <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-amber-800">Pending</span>
      <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-rose-800">Overdue</span>
      <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">Draft</span>
      <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">In progress</span>
    </div>
  )
}

function NewBadges() {
  const Pill = ({ icon: Icon, label, color }: { icon: React.ElementType; label: string; color: string }) => (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${color}`}>
      <Icon className="w-3 h-3" strokeWidth={2.5} />
      {label}
    </span>
  )
  return (
    <div className="flex flex-wrap gap-2">
      <Pill icon={CheckCircle} label="Active" color="bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100" />
      <Pill icon={Clock} label="Pending" color="bg-amber-50 text-amber-700 ring-1 ring-amber-100" />
      <Pill icon={XCircle} label="Overdue" color="bg-rose-50 text-rose-700 ring-1 ring-rose-100" />
      <Pill icon={Edit} label="Draft" color="bg-gray-50 text-gray-600 ring-1 ring-gray-200" />
      <Pill icon={Loader2} label="In progress" color="bg-sky-50 text-sky-700 ring-1 ring-sky-100" />
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   11. Modal
   ───────────────────────────────────────────────────────────────── */

function CurrentModal() {
  return (
    <div className="relative h-80 rounded-lg bg-gray-100 overflow-hidden">
      <div className="absolute inset-0 bg-black/50" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-80 bg-white rounded-lg shadow-lg flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="text-base font-bold text-gray-900">Delete classroom</h3>
          <button className="text-gray-400 hover:text-gray-700"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-gray-600">Are you sure you want to delete this classroom?</p>
        </div>
        <div className="px-5 py-4 border-t border-gray-200 flex gap-2">
          <button className="flex-1 h-9 border border-gray-200 text-sm font-medium rounded-md hover:bg-gray-50">Cancel</button>
          <button className="flex-1 h-9 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700">Delete</button>
        </div>
      </div>
    </div>
  )
}

function NewModal() {
  return (
    <div className="relative h-80 rounded-lg bg-gray-100 overflow-hidden">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-80 bg-white rounded-2xl shadow-[0_24px_48px_-12px_rgba(0,0,0,0.25)] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-rose-50 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-rose-600" strokeWidth={2.25} />
            </div>
            <h3 className="text-base font-semibold text-gray-900 tracking-tight">Delete classroom</h3>
          </div>
          <button className="text-gray-400 hover:text-gray-700 p-1 -mr-1 rounded-md hover:bg-gray-100"><X className="w-4 h-4" strokeWidth={1.75} /></button>
        </div>
        <div className="px-6 pb-5">
          <p className="text-sm text-gray-600 leading-relaxed">
            This will permanently delete <span className="font-semibold text-gray-900">Algebra II</span> and all of its sessions. This action cannot be undone.
          </p>
        </div>
        <div className="px-6 py-4 bg-gray-50/70 flex gap-2">
          <button className="flex-1 h-10 bg-white text-gray-700 text-sm font-medium rounded-md ring-1 ring-gray-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:ring-gray-300 transition-all">Cancel</button>
          <button className="flex-1 h-10 bg-rose-600 text-white text-sm font-medium rounded-md shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_1px_2px_rgba(0,0,0,0.08)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_4px_12px_-2px_rgba(244,63,94,0.4)] hover:-translate-y-px transition-all">Delete</button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   12. Loading skeleton
   ───────────────────────────────────────────────────────────────── */

function CurrentSkeleton() {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-gray-200 p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
        <div className="h-3 bg-gray-200 rounded w-3/4 mb-2" />
        <div className="h-3 bg-gray-200 rounded w-2/3" />
      </div>
      <div className="rounded-xl border border-gray-200 p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
        <div className="h-3 bg-gray-200 rounded w-3/4 mb-2" />
        <div className="h-3 bg-gray-200 rounded w-2/3" />
      </div>
    </div>
  )
}

function NewSkeleton() {
  const Bar = ({ w }: { w: string }) => (
    <div
      className="h-3 rounded"
      style={{
        width: w,
        background: 'linear-gradient(90deg, rgba(0,0,0,0.06) 0%, rgba(0,0,0,0.10) 50%, rgba(0,0,0,0.06) 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.4s infinite linear',
      }}
    />
  )
  return (
    <div className="space-y-3">
      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      <div className="rounded-2xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] ring-1 ring-gray-100/80 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full" style={{ background: 'rgba(0,0,0,0.06)' }} />
          <div className="space-y-2 flex-1">
            <Bar w="40%" />
            <Bar w="25%" />
          </div>
        </div>
        <div className="space-y-2">
          <Bar w="70%" />
          <Bar w="55%" />
        </div>
      </div>
      <div className="rounded-2xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] ring-1 ring-gray-100/80 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full" style={{ background: 'rgba(0,0,0,0.06)' }} />
          <div className="space-y-2 flex-1">
            <Bar w="55%" />
            <Bar w="30%" />
          </div>
        </div>
        <div className="space-y-2">
          <Bar w="80%" />
          <Bar w="60%" />
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   13. Toast
   ───────────────────────────────────────────────────────────────── */

function CurrentToast() {
  return (
    <div className="space-y-3">
      <div className="rounded-md bg-white border border-green-500/50 p-4 flex items-start gap-3">
        <CheckCircle className="w-4 h-4 text-green-700 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-green-700 mb-0.5">Saved</p>
          <p className="text-sm text-green-700">Your changes have been saved.</p>
        </div>
        <button className="text-green-700/70 hover:text-green-900"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="rounded-md bg-white border border-red-500/50 p-4 flex items-start gap-3">
        <XCircle className="w-4 h-4 text-rose-700 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-rose-700 mb-0.5">Couldn&apos;t save</p>
          <p className="text-sm text-rose-700">Please try again.</p>
        </div>
        <button className="text-rose-700/70 hover:text-red-900"><X className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  )
}

function NewToast() {
  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-white shadow-[0_8px_24px_-6px_rgba(0,0,0,0.12),0_2px_4px_rgba(0,0,0,0.06)] ring-1 ring-gray-100 flex overflow-hidden">
        <div className="w-1 bg-emerald-500 flex-shrink-0" />
        <div className="flex items-start gap-3 p-3.5 flex-1">
          <div className="w-7 h-7 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-4 h-4 text-emerald-600" strokeWidth={2.25} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">Saved</p>
            <p className="text-xs text-gray-500 mt-0.5">Your classroom settings were updated.</p>
            <button className="text-xs font-medium text-emerald-700 hover:underline mt-1.5 underline-offset-2">View changes →</button>
          </div>
          <button className="text-gray-400 hover:text-gray-700 -mr-1 -mt-1 p-1 rounded-md hover:bg-gray-50"><X className="w-3.5 h-3.5" strokeWidth={1.75} /></button>
        </div>
      </div>
      <div className="rounded-xl bg-white shadow-[0_8px_24px_-6px_rgba(0,0,0,0.12),0_2px_4px_rgba(0,0,0,0.06)] ring-1 ring-gray-100 flex overflow-hidden">
        <div className="w-1 bg-rose-500 flex-shrink-0" />
        <div className="flex items-start gap-3 p-3.5 flex-1">
          <div className="w-7 h-7 rounded-full bg-rose-50 flex items-center justify-center flex-shrink-0">
            <XCircle className="w-4 h-4 text-rose-600" strokeWidth={2.25} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">Couldn&apos;t save</p>
            <p className="text-xs text-gray-500 mt-0.5">Network error. Your changes are still in the form.</p>
          </div>
          <button className="text-gray-400 hover:text-gray-700 -mr-1 -mt-1 p-1 rounded-md hover:bg-gray-50"><X className="w-3.5 h-3.5" strokeWidth={1.75} /></button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   14. Form field
   ───────────────────────────────────────────────────────────────── */

function CurrentFormField() {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Classroom name <span className="text-red-500">*</span>
        </label>
        <input className="w-full h-10 px-3 border border-gray-200 rounded-md text-sm" placeholder="e.g. Algebra II" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm" rows={2} placeholder="Optional description..." />
      </div>
    </div>
  )
}

function NewFormField() {
  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <label className="text-sm font-medium text-gray-900">
            Classroom name <span className="text-primary font-semibold">*</span>
          </label>
          <span className="text-[11px] text-gray-400">Required</span>
        </div>
        <input className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm bg-gray-50/50 focus:outline-none placeholder:text-gray-400" placeholder="e.g. Algebra II" />
        <p className="text-xs text-gray-500 mt-1.5">Visible to students and parents.</p>
      </div>
      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <label className="text-sm font-medium text-gray-900">Description</label>
          <span className="text-[11px] text-gray-400">Optional</span>
        </div>
        <textarea className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50/50 focus:outline-none placeholder:text-gray-400" rows={2} placeholder="What's this classroom about?" />
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   15. Data table row
   ───────────────────────────────────────────────────────────────── */

function CurrentTableRow() {
  return (
    <div className="rounded-md border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr className="text-left">
            <th className="px-4 py-2 font-medium text-gray-700">Name</th>
            <th className="px-4 py-2 font-medium text-gray-700">Email</th>
            <th className="px-4 py-2 font-medium text-gray-700">Status</th>
            <th className="px-4 py-2 font-medium text-gray-700">Joined</th>
          </tr>
        </thead>
        <tbody>
          {[
            { name: '김민수', email: 'kim.minsu@example.com', status: 'Active', joined: '2025-09-15' },
            { name: '이지은', email: 'lee.jieun@example.com', status: 'Pending', joined: '2025-10-02' },
          ].map((s) => (
            <tr key={s.email} className="border-t border-gray-200">
              <td className="px-4 py-3 text-gray-900">{s.name}</td>
              <td className="px-4 py-3 text-gray-600">{s.email}</td>
              <td className="px-4 py-3">
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">{s.status}</span>
              </td>
              <td className="px-4 py-3 text-gray-600">{s.joined}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function NewTableRow() {
  return (
    <div className="rounded-2xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] ring-1 ring-gray-100/80 overflow-hidden">
      <div className="grid grid-cols-[1fr_120px_120px] px-5 py-3 bg-gray-50/50">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Student</p>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Status</p>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Joined</p>
      </div>
      {[
        { name: '김민수', email: 'kim.minsu@example.com', status: 'Active', joined: 'Sep 15' },
        { name: '이지은', email: 'lee.jieun@example.com', status: 'Pending', joined: 'Oct 2' },
      ].map((s, i) => (
        <div
          key={s.email}
          className={`grid grid-cols-[1fr_120px_120px] items-center px-5 py-3 hover:bg-gray-50/50 transition-colors cursor-pointer ${i > 0 ? 'border-t border-gray-100' : ''}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white flex items-center justify-center text-sm font-semibold">
              {s.name.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{s.name}</p>
              <p className="text-xs text-gray-500">{s.email}</p>
            </div>
          </div>
          <div>
            {s.status === 'Active' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                <CheckCircle className="w-3 h-3" strokeWidth={2.5} />
                Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-100">
                <Clock className="w-3 h-3" strokeWidth={2.5} />
                Pending
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 tabular-nums">{s.joined}</p>
        </div>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   16. Search → command palette
   ───────────────────────────────────────────────────────────────── */

function CurrentSearch() {
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
        <input
          type="text"
          placeholder="Search classrooms..."
          className="w-full h-10 pl-10 pr-3 rounded-md border border-gray-200 text-sm"
        />
      </div>
      <p className="text-xs text-gray-400">Page-by-page; user must remember which page each thing lives on.</p>
    </div>
  )
}

function NewSearch() {
  return (
    <div className="space-y-3">
      {/* Trigger that lives in the top header */}
      <button className="w-full h-10 rounded-lg bg-gray-50/80 hover:bg-gray-50 ring-1 ring-gray-200 hover:ring-gray-300 px-3 flex items-center gap-2 text-left transition-all">
        <Search className="w-4 h-4 text-gray-400" strokeWidth={1.75} />
        <span className="text-sm text-gray-400 flex-1">Search anything…</span>
        <kbd className="text-[10px] font-medium text-gray-500 bg-white ring-1 ring-gray-200 rounded px-1.5 py-0.5 flex items-center gap-0.5">
          <Command className="w-3 h-3" strokeWidth={2} />K
        </kbd>
      </button>
      {/* Open-state preview */}
      <div className="rounded-2xl bg-white shadow-[0_24px_48px_-12px_rgba(0,0,0,0.18)] ring-1 ring-gray-100 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search…"
            defaultValue="alg"
            className="flex-1 text-sm focus:outline-none placeholder:text-gray-400"
          />
          <kbd className="text-[10px] font-medium text-gray-400 bg-gray-50 rounded px-1.5 py-0.5">esc</kbd>
        </div>
        <div className="p-2">
          <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Classrooms</p>
          <button className="w-full flex items-center gap-3 px-2 py-2 rounded-lg bg-primary/8 text-left">
            <School className="w-4 h-4 text-primary" strokeWidth={1.75} />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Algebra II — Grade 9</p>
              <p className="text-xs text-gray-500">3 sessions this week · Daniel Kim</p>
            </div>
            <span className="text-[10px] font-medium text-gray-400">↵</span>
          </button>
          <button className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 text-left">
            <ClipboardList className="w-4 h-4 text-gray-400" strokeWidth={1.75} />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Algebra HW: Ch. 3 problems 1-15</p>
              <p className="text-xs text-gray-500">Assignment · Due Friday</p>
            </div>
          </button>
          <p className="px-2 py-1 mt-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Actions</p>
          <button className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 text-left">
            <Plus className="w-4 h-4 text-gray-400" strokeWidth={1.75} />
            <p className="text-sm font-medium text-gray-900 flex-1">Create new classroom</p>
            <kbd className="text-[10px] text-gray-400 bg-gray-50 rounded px-1.5 py-0.5">⌘N</kbd>
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   17. Composite — full Classrooms page mockup
   ───────────────────────────────────────────────────────────────── */

function CompositeClassroomsPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="pb-6 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary mb-1.5">
              Classroom management
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Classrooms</h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="bg-white text-gray-700 text-sm font-medium px-4 h-10 rounded-md flex items-center gap-2 ring-1 ring-gray-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:ring-gray-300 hover:-translate-y-px transition-all">
              <Calendar className="w-4 h-4" strokeWidth={1.75} />
              Schedule Break
            </button>
            <button className="bg-primary text-white text-sm font-medium px-4 h-10 rounded-md flex items-center gap-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_1px_2px_rgba(0,0,0,0.08)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_4px_12px_-2px_rgba(40,133,232,0.4)] hover:-translate-y-px transition-all">
              <Plus className="w-4 h-4" strokeWidth={2.25} />
              Create Classroom
            </button>
          </div>
        </div>
      </div>

      {/* Stats row — 3 stat cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCardMini icon={School} label="Active classrooms" value="3" sub="of 20" trend="↑ 15%" trendColor="emerald" />
        <StatCardMini icon={Users} label="Enrolled students" value="42" sub="across 3 grades" trend="↑ 6 this month" trendColor="emerald" />
        <StatCardMini icon={Calendar} label="Sessions this week" value="12" sub="2 today" trend="3 pending" trendColor="amber" />
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" strokeWidth={1.75} />
          <input
            type="text"
            placeholder="Search classrooms…"
            className="w-full h-10 pl-10 pr-3 rounded-lg ring-1 ring-gray-200 bg-white text-sm focus:outline-none placeholder:text-gray-400"
          />
        </div>
        <button className="bg-white text-gray-700 text-sm font-medium px-3 h-10 rounded-lg flex items-center gap-2 ring-1 ring-gray-200 hover:ring-gray-300 transition-all">
          <Filter className="w-4 h-4" strokeWidth={1.75} />
          Active
          <span className="text-xs text-gray-400">▾</span>
        </button>
        <button className="bg-white text-gray-700 text-sm font-medium px-3 h-10 rounded-lg flex items-center gap-2 ring-1 ring-gray-200 hover:ring-gray-300 transition-all">
          <Download className="w-4 h-4" strokeWidth={1.75} />
        </button>
      </div>

      {/* Classroom card grid */}
      <div className="grid grid-cols-3 gap-4">
        <MiniClassroomCard name="김시아" teacher="Daniel Kim" grade="9" subject="English" time="Wed · 8:00 PM" color="emerald" />
        <MiniClassroomCard name="원아영" teacher="Daniel Kim" grade="6" subject="English" time="Tue · 10:00 PM" color="amber" />
        <MiniClassroomCard name="변하형" teacher="Daniel Kim" grade="5" subject="English" time="Mon · 6:00 PM" color="sky" />
      </div>
    </div>
  )
}

function StatCardMini({
  icon: Icon, label, value, sub, trend, trendColor,
}: {
  icon: React.ElementType
  label: string
  value: string
  sub: string
  trend: string
  trendColor: 'emerald' | 'amber'
}) {
  const trendBg = trendColor === 'emerald' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
  return (
    <div className="rounded-2xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] ring-1 ring-gray-100/80 p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-primary/8 flex items-center justify-center">
          <Icon className="w-3.5 h-3.5 text-primary" strokeWidth={2.25} />
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500">{label}</p>
      </div>
      <div className="flex items-baseline gap-2 mb-2">
        <p className="text-3xl font-semibold tracking-tight text-gray-900 tabular-nums">{value}</p>
        <p className="text-xs text-gray-400">{sub}</p>
      </div>
      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${trendBg}`}>
        {trend}
      </div>
    </div>
  )
}

function MiniClassroomCard({
  name, teacher, grade, subject, time, color,
}: {
  name: string; teacher: string; grade: string; subject: string; time: string; color: 'emerald' | 'amber' | 'sky'
}) {
  const accentMap = {
    emerald: 'from-emerald-400 to-emerald-500',
    amber: 'from-amber-400 to-amber-500',
    sky: 'from-sky-400 to-sky-500',
  }
  const labelMap = {
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
    sky: 'text-sky-600',
  }
  return (
    <div className="rounded-2xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] ring-1 ring-gray-100/80 hover:shadow-[0_2px_4px_rgba(0,0,0,0.04),0_8px_24px_-6px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all overflow-hidden cursor-pointer">
      <div className={`h-1 bg-gradient-to-r ${accentMap[color]}`} />
      <div className="p-4">
        <div className="flex items-start justify-between mb-1">
          <div>
            <p className={`text-[10px] font-semibold uppercase tracking-[0.1em] mb-1 ${labelMap[color]}`}>Active</p>
            <h3 className="text-base font-semibold text-gray-900 tracking-tight">{name}</h3>
            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
              <GraduationCap className="w-3 h-3" strokeWidth={1.75} />
              {teacher}
            </p>
          </div>
          <button className="text-gray-400 hover:text-gray-700 p-1 rounded-md hover:bg-gray-50">
            <MoreVertical className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 my-3 py-2.5 border-y border-gray-100">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400">Students</p>
            <p className="text-sm font-semibold text-gray-900">1</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400">Grade</p>
            <p className="text-sm font-semibold text-gray-900">{grade}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400">Subject</p>
            <p className="text-sm font-semibold text-gray-900">{subject}</p>
          </div>
        </div>
        <p className="text-xs text-gray-500 flex items-center gap-1.5 mb-3">
          <Clock className="w-3 h-3" strokeWidth={1.75} />
          {time}
        </p>
        <button className="w-full h-9 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-1.5 group">
          View Sessions
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}
