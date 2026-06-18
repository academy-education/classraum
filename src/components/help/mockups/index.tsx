"use client"

import type { ReactNode } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { ClassroomCreateDemo } from '@/components/help/demos/ClassroomCreateDemo'
import { DashboardDemo } from '@/components/help/demos/DashboardDemo'
import { ScheduleUpdateDemo } from '@/components/help/demos/ScheduleUpdateDemo'
import { SessionFormDemo } from '@/components/help/demos/SessionFormDemo'
import { AddReportDemo } from '@/components/help/demos/AddReportDemo'
import { ReportsListDemo } from '@/components/help/demos/ReportsListDemo'
import { ReportPreviewDemo } from '@/components/help/demos/ReportPreviewDemo'
import { PendingAttendanceDemo } from '@/components/help/demos/PendingAttendanceDemo'
import { NewAnnouncementDemo } from '@/components/help/demos/NewAnnouncementDemo'
import { AssignmentCreateDemo } from '@/components/help/demos/AssignmentCreateDemo'
import { LevelTestCreateDemo } from '@/components/help/demos/LevelTestCreateDemo'
import { LevelTestDetailDemo } from '@/components/help/demos/LevelTestDetailDemo'
import { LevelTestShareDemo } from '@/components/help/demos/LevelTestShareDemo'
import { ClassroomsListDemo } from '@/components/help/demos/ClassroomsListDemo'
import { PaymentsListDemo } from '@/components/help/demos/PaymentsListDemo'
import { AddPlanDemo } from '@/components/help/demos/AddPlanDemo'
import { AddOneTimePaymentDemo } from '@/components/help/demos/AddOneTimePaymentDemo'
import { AssignRecurringDemo } from '@/components/help/demos/AssignRecurringDemo'
import { FamiliesListDemo } from '@/components/help/demos/FamiliesListDemo'
import { ArchiveListDemo } from '@/components/help/demos/ArchiveListDemo'
import { SettingsListDemo } from '@/components/help/demos/SettingsListDemo'
import { MessagesNotificationsDemo } from '@/components/help/demos/MessagesNotificationsDemo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Clock,
  ChevronDown,
  Users,
  FileText,
  Sparkles,
  Eye,
  Bell,
  Megaphone,
  Mail,
  Upload,
  Undo2,
  Wifi,
  WifiOff,
  X,
  Calendar as CalendarIcon,
} from 'lucide-react'

/**
 * Inline UI mockups for help articles.
 *
 * Built on top of the same primitives the real app uses — `Button`,
 * `Input`, `Label`, `Badge`, `Checkbox` from `@/components/ui/*` — so the
 * buttons, inputs, badges, and form fields are pixel-identical to what
 * the user actually sees when they click through. Layout is hand-
 * assembled to match the corresponding real page or modal (field order,
 * section structure, footer button positioning).
 *
 * Routing: a fenced markdown block of language `mockup` whose body is a
 * registry id (see `MOCKUPS` below) gets replaced by the matching
 * component. Unknown ids render a visible warning so typos surface in
 * dev rather than vanishing silently.
 *
 * When the real app changes:
 * - Tweaks to Button/Input/Label styles propagate automatically.
 * - New page-level layout patterns (e.g. a different header pattern on
 *   Classrooms) need a manual update here. The brief is "looks the same
 *   as the real screen at first glance," not "renders the real screen."
 */

// ─── Frame ────────────────────────────────────────────────────────────────

/**
 * The modal-ish card frame matching ModalShell: rounded-2xl, ring + soft
 * shadow, three-stack header / body / footer. Page-style mockups omit
 * the title chrome and just use the frame as a card.
 */
function Shell({
  title,
  children,
  footer,
  bodyPadding = true,
}: {
  title?: ReactNode
  children: ReactNode
  footer?: ReactNode
  bodyPadding?: boolean
}) {
  return (
    <div className="my-6 rounded-2xl bg-white ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] overflow-hidden">
      {title && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="text-sm font-semibold text-gray-900">{title}</div>
          <button className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <div className={bodyPadding ? 'p-6' : ''}>{children}</div>
      {footer && (
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          {footer}
        </div>
      )}
    </div>
  )
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary mb-1">
      {children}
    </div>
  )
}

function PageHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string
  title: string
  action?: ReactNode
}) {
  return (
    <div className="flex items-end justify-between mb-5">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="text-xl font-semibold tracking-tight text-gray-900">{title}</h2>
      </div>
      {action}
    </div>
  )
}

/**
 * Pre-populated readable form field — uses the real Input so border,
 * focus colour, height, and typography match the live UI. The "value"
 * is rendered into the input via defaultValue (uncontrolled) so the
 * mockup stays static without React warnings.
 */
function ReadInput({
  label,
  value,
  placeholder,
  required,
  trailing,
}: {
  label: string
  value?: string
  placeholder?: string
  required?: boolean
  trailing?: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <div className="relative">
        <Input
          readOnly
          defaultValue={value || ''}
          placeholder={placeholder}
          className="h-9 text-sm"
        />
        {trailing && (
          <div className="absolute inset-y-0 right-2 flex items-center text-gray-400">
            {trailing}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Individual mockups ───────────────────────────────────────────────────

function DashboardOverview() {
  const stats = [
    { label: 'Students', v: '47', accent: 'bg-primary' },
    { label: 'Classrooms', v: '8', accent: 'bg-sky-400' },
    { label: 'Pending attendance', v: '3', accent: 'bg-amber-400' },
    { label: 'Open invoices', v: '5', accent: 'bg-emerald-400' },
  ]
  return (
    <Shell>
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        action={
          <Button variant="outline" size="sm">
            Customize Dashboard
            <ChevronDown className="w-3.5 h-3.5" />
          </Button>
        }
      />
      <div className="grid grid-cols-4 gap-3 mb-5">
        {stats.map(s => (
          <div key={s.label} className="rounded-2xl ring-1 ring-gray-100/80 bg-white overflow-hidden">
            <div className={`h-1 ${s.accent}`} />
            <div className="p-4">
              <div className="text-[11px] text-gray-500 uppercase tracking-wide font-medium">
                {s.label}
              </div>
              <div className="text-2xl font-semibold tracking-tight text-gray-900 mt-1">
                {s.v}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="text-sm font-semibold text-gray-900 mb-2">Today&apos;s sessions</div>
      <ul className="divide-y divide-gray-100 text-sm">
        {['Grade 4 Math · 4:00 PM', 'SAT Prep · 5:30 PM', 'Grade 5 English · 6:30 PM'].map(s => (
          <li key={s} className="py-2.5 text-gray-700">{s}</li>
        ))}
      </ul>
    </Shell>
  )
}

function ClassroomsListWithButton() {
  const items = [
    { name: 'Grade 4 Math', teacher: 'Ms. Kim', meta: 'Grade 4 · Mathematics', accent: 'bg-sky-400' },
    { name: 'Grade 5 English', teacher: 'Mr. Park', meta: 'Grade 5 · English', accent: 'bg-amber-400' },
    { name: 'SAT Prep', teacher: 'Ms. Lee', meta: 'High school · Test prep', accent: 'bg-emerald-400' },
  ]
  return (
    <Shell>
      <PageHeader
        eyebrow="Manage"
        title="Classrooms"
        action={
          <Button size="sm">
            <Plus className="w-3.5 h-3.5" /> Create a Classroom
          </Button>
        }
      />
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input readOnly placeholder="Search classrooms" className="h-9 pl-8 text-sm" />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="w-3.5 h-3.5" /> Filter
        </Button>
        <Button variant="outline" size="sm" className="ml-auto">
          Card view <ChevronDown className="w-3.5 h-3.5" />
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {items.map(c => (
          <div key={c.name} className="rounded-2xl ring-1 ring-gray-100/80 bg-white overflow-hidden">
            <div className={`h-1 ${c.accent}`} />
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div className="text-sm font-semibold text-gray-900">{c.name}</div>
                <MoreHorizontal className="w-4 h-4 text-gray-400" />
              </div>
              <div className="text-xs text-gray-500 mt-1">{c.teacher}</div>
              <div className="text-xs text-gray-500">{c.meta}</div>
            </div>
          </div>
        ))}
      </div>
    </Shell>
  )
}

function CreateClassroomForm() {
  const colors = [
    'bg-primary', 'bg-sky-400', 'bg-emerald-400', 'bg-amber-400',
    'bg-rose-400', 'bg-purple-400', 'bg-indigo-400', 'bg-pink-400',
    'bg-teal-400', 'bg-orange-400', 'bg-lime-400', 'bg-fuchsia-400',
  ]
  return (
    <Shell
      title="Create a Classroom"
      footer={
        <>
          <Button variant="ghost" size="sm">Cancel</Button>
          <Button size="sm">
            <Plus className="w-3.5 h-3.5" /> Create a Classroom
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <ReadInput label="Classroom Name" value="Grade 4 Math" required />
        <div className="grid grid-cols-2 gap-3">
          <ReadInput label="Grade" value="Grade 4" />
          <ReadInput label="Subject" value="Mathematics" />
        </div>
        <ReadInput label="Teacher" value="Ms. Kim" required trailing={<ChevronDown className="w-4 h-4" />} />

        <div className="space-y-1.5">
          <Label className="text-xs">Schedule</Label>
          <div className="rounded-lg border border-gray-200 divide-y divide-gray-100">
            <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700">
              <span className="w-12 text-xs font-medium">Mon</span>
              <span className="rounded-md border border-gray-200 px-2 py-1 text-xs bg-white">4:00 PM</span>
              <span className="text-gray-400">–</span>
              <span className="rounded-md border border-gray-200 px-2 py-1 text-xs bg-white">5:30 PM</span>
              <button className="ml-auto text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <button className="text-xs text-primary inline-flex items-center gap-1 mt-1">
            <Plus className="w-3 h-3" /> Add Schedule
          </button>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Select Students</Label>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="default" className="gap-1">
              Alice Park <X className="w-3 h-3" />
            </Badge>
            <Badge variant="default" className="gap-1">
              Brian Cho <X className="w-3 h-3" />
            </Badge>
            <Badge variant="outline">+ Add students</Badge>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Color</Label>
          <div className="flex flex-wrap gap-2 items-center">
            {colors.map((c, i) => (
              <button
                key={c}
                className={`w-6 h-6 rounded-full ${c} ${
                  i === 0 ? 'ring-2 ring-offset-2 ring-primary' : ''
                }`}
              />
            ))}
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs">Custom</Button>
          </div>
        </div>

        <ReadInput label="Notes" placeholder="Optional reminders for this class" />
      </div>
    </Shell>
  )
}

function AddScheduleFromClassroom() {
  return (
    <Shell
      title="Update Schedule"
      footer={
        <>
          <Button variant="ghost" size="sm">Cancel</Button>
          <Button size="sm">Update Schedule</Button>
        </>
      }
    >
      <p className="text-sm text-gray-700 mb-4">
        This classroom already has sessions on the calendar. Choose how the
        schedule change applies to future sessions:
      </p>
      <div className="space-y-2">
        {[
          { label: 'Move future sessions to the new times', selected: true },
          { label: 'Delete future sessions and regenerate from the new schedule', selected: false },
          { label: 'Keep all sessions unchanged (apply only to new ones)', selected: false },
        ].map(o => (
          <label
            key={o.label}
            className={`flex items-start gap-2.5 p-3 rounded-lg border text-sm cursor-pointer ${
              o.selected ? 'border-primary bg-primary/[0.02]' : 'border-gray-200'
            }`}
          >
            <span
              className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${
                o.selected ? 'border-primary' : 'border-gray-300'
              }`}
            >
              {o.selected && <span className="w-2 h-2 rounded-full bg-primary" />}
            </span>
            <span className="text-gray-800">{o.label}</span>
          </label>
        ))}
      </div>
    </Shell>
  )
}

function CreateSessionPopup() {
  return (
    <Shell
      title="Add Session"
      footer={
        <>
          <Button variant="ghost" size="sm">Cancel</Button>
          <Button size="sm">
            <Plus className="w-3.5 h-3.5" /> Create Session
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <ReadInput label="Classroom" value="Grade 4 Math" required trailing={<ChevronDown className="w-4 h-4" />} />
          <ReadInput label="Status" value="Scheduled" required trailing={<ChevronDown className="w-4 h-4" />} />
        </div>
        <ReadInput label="Date" value="Mar 14, 2026" required trailing={<CalendarIcon className="w-4 h-4" />} />
        <div className="grid grid-cols-2 gap-3">
          <ReadInput label="Start Time" value="4:00 PM" required trailing={<ChevronDown className="w-4 h-4" />} />
          <ReadInput label="End Time" value="5:30 PM" required trailing={<ChevronDown className="w-4 h-4" />} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Location <span className="text-red-500">*</span></Label>
          <div className="grid grid-cols-2 gap-2">
            <button className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm border-2 border-primary bg-primary/5 text-primary">
              <WifiOff className="w-4 h-4" /> Offline
            </button>
            <button className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm border border-gray-200 text-gray-600 bg-white">
              <Wifi className="w-4 h-4" /> Online
            </button>
          </div>
        </div>
        <ReadInput label="Notes" placeholder="What will be covered today?" />
        <ReadInput label="Substitute Teacher" placeholder="Optional" trailing={<ChevronDown className="w-4 h-4" />} />
      </div>
    </Shell>
  )
}

function AddMakeupSession() {
  return (
    <Shell>
      <PageHeader
        eyebrow="Schedule"
        title="Sessions"
        action={
          <Button size="sm">
            <Plus className="w-3.5 h-3.5" /> Add Session
          </Button>
        }
      />
      <div className="flex gap-1 mb-4 text-xs">
        <span className="px-2.5 py-1 rounded-md bg-primary/10 text-primary font-medium">All</span>
        <span className="px-2.5 py-1 rounded-md text-gray-500">Upcoming</span>
        <span className="px-2.5 py-1 rounded-md text-gray-500">Past</span>
      </div>
      <ul className="divide-y divide-gray-100 text-sm">
        {[
          { day: 'Mar 14 · 4:00 PM', name: 'Grade 4 Math', status: 'Scheduled', kind: 'info' as const },
          { day: 'Mar 15 · 5:30 PM', name: 'SAT Prep (rescheduled)', status: 'Scheduled', kind: 'warning' as const },
          { day: 'Mar 12 · 4:00 PM', name: 'Grade 5 English', status: 'Completed', kind: 'success' as const },
        ].map(s => (
          <li key={s.day} className="py-3 flex items-center justify-between">
            <div>
              <div className="text-gray-900 font-medium">{s.name}</div>
              <div className="text-xs text-gray-500">{s.day}</div>
            </div>
            <Badge variant={s.kind}>{s.status}</Badge>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-gray-500 italic">
        Make-up classes use the same Add Session flow — pick the new date and Status: Scheduled.
      </p>
    </Shell>
  )
}

function EditSessionAssignments() {
  return (
    <Shell
      title="Edit Assignment"
      footer={
        <>
          <Button variant="ghost" size="sm">Cancel</Button>
          <Button size="sm">Save</Button>
        </>
      }
    >
      <div className="space-y-4">
        <ReadInput label="Title" value="Worksheet 4A — fractions" required />
        <div className="grid grid-cols-2 gap-3">
          <ReadInput label="Type" value="Homework" required trailing={<ChevronDown className="w-4 h-4" />} />
          <ReadInput label="Classroom" value="Grade 4 Math" required trailing={<ChevronDown className="w-4 h-4" />} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <ReadInput label="Date" value="Mar 14, 2026" trailing={<CalendarIcon className="w-4 h-4" />} />
          <ReadInput label="Due Date" value="Mar 16, 2026" required trailing={<CalendarIcon className="w-4 h-4" />} />
        </div>
        <ReadInput label="Category" value="Practice" trailing={<ChevronDown className="w-4 h-4" />} />
        <div className="space-y-1.5">
          <Label className="text-xs">Instructions</Label>
          <div className="rounded-lg border border-gray-200 p-3 text-sm text-gray-700 min-h-[80px]">
            Complete questions 1–10 from the worksheet. Show your work for partial credit.
          </div>
        </div>
      </div>
    </Shell>
  )
}

function PendingAttendanceEditor() {
  const rows: { name: string; status: 'Present' | 'Late' | 'Pending' | 'Absent' }[] = [
    { name: 'Alice Park', status: 'Present' },
    { name: 'Brian Cho', status: 'Late' },
    { name: 'Chloe Lim', status: 'Pending' },
    { name: 'Daniel Han', status: 'Absent' },
  ]
  // Pre-written class strings — Tailwind JIT can't expand `bg-${color}-100`.
  const activeClass: Record<string, string> = {
    Present: 'bg-emerald-100 text-emerald-700 border-emerald-100',
    Late: 'bg-amber-100 text-amber-700 border-amber-100',
    Excused: 'bg-sky-100 text-sky-700 border-sky-100',
    Absent: 'bg-rose-100 text-rose-700 border-rose-100',
  }
  return (
    <Shell
      title="Update Attendance"
      footer={
        <>
          <Button variant="outline" size="sm">Mark all present</Button>
          <Button variant="ghost" size="sm">Cancel</Button>
          <Button size="sm">Save</Button>
        </>
      }
    >
      <Eyebrow>Pending Attendance</Eyebrow>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-900">Grade 4 Math · Mar 14</h3>
        <span className="text-xs text-gray-500 inline-flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" /> 4 students
        </span>
      </div>
      <ul className="divide-y divide-gray-100">
        {rows.map(r => (
          <li key={r.name} className="py-2.5 flex items-center justify-between text-sm">
            <span className="text-gray-900">{r.name}</span>
            <div className="flex gap-1.5">
              {(['Present', 'Late', 'Excused', 'Absent'] as const).map(s => (
                <span
                  key={s}
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                    r.status === s ? activeClass[s] : 'border-gray-200 text-gray-400 bg-white'
                  }`}
                >
                  {s}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-4 rounded-lg border border-dashed border-gray-300 p-3 text-xs text-gray-600">
        <strong className="text-gray-700">Missing students:</strong> 1 student enrolled but not in this record — click to add.
      </div>
    </Shell>
  )
}

function NewAnnouncementForm() {
  return (
    <Shell
      title="New Announcement"
      footer={
        <>
          <Button variant="ghost" size="sm">Cancel</Button>
          <Button size="sm">
            <Megaphone className="w-3.5 h-3.5" /> Create
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <ReadInput label="Title" value="Holiday closure — Mar 1" required />
        <div className="space-y-1.5">
          <Label className="text-xs">Content</Label>
          <div className="rounded-lg border border-gray-200 p-3 text-sm text-gray-700 min-h-[96px]">
            The academy will be closed on March 1 for Independence Movement Day. Sessions resume Mar 2.
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Select Classrooms <span className="text-red-500">*</span></Label>
          <div className="rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
              <Search className="w-3.5 h-3.5 text-gray-400" />
              <input
                readOnly
                placeholder="Search classrooms"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
              />
              <Button variant="ghost" size="sm" className="h-7 text-xs">Select All</Button>
            </div>
            <ul className="text-sm divide-y divide-gray-100 max-h-32 overflow-hidden">
              {[
                { name: 'Grade 4 Math', checked: true },
                { name: 'Grade 5 English', checked: true },
                { name: 'SAT Prep', checked: false },
              ].map(c => (
                <li key={c.name} className="flex items-center gap-2.5 px-3 py-2">
                  <Checkbox checked={c.checked} readOnly />
                  <span className="text-gray-700">{c.name}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Attachments</Label>
          <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500 flex items-center gap-2">
            <Upload className="w-4 h-4" /> Drop files here · up to 5
          </div>
        </div>
      </div>
    </Shell>
  )
}

function AddReportFlow() {
  return (
    <Shell
      title="Add Report"
      footer={
        <>
          <Button variant="ghost" size="sm">Cancel</Button>
          <Button variant="outline" size="sm">
            <Eye className="w-3.5 h-3.5" /> Preview Report
          </Button>
          <Button size="sm">
            <FileText className="w-3.5 h-3.5" /> Create Report
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <ReadInput label="Student" value="Alice Park" required trailing={<ChevronDown className="w-4 h-4" />} />
        <ReadInput label="Report Name" value="February 2026 progress report" required />
        <div className="grid grid-cols-2 gap-3">
          <ReadInput label="Start Date" value="Feb 1, 2026" required trailing={<CalendarIcon className="w-4 h-4" />} />
          <ReadInput label="End Date" value="Feb 28, 2026" required trailing={<CalendarIcon className="w-4 h-4" />} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Subjects</Label>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="default">Math</Badge>
            <Badge variant="default">English</Badge>
            <Badge variant="outline">+ Add</Badge>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Classrooms</Label>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="default">Grade 4 Math</Badge>
            <Badge variant="default">Grade 5 English</Badge>
          </div>
        </div>
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-center gap-2.5">
          <span className="relative inline-flex items-center w-9 h-5 rounded-full bg-primary flex-shrink-0">
            <span className="absolute right-0.5 w-4 h-4 rounded-full bg-white shadow-sm" />
          </span>
          <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
          <div className="text-sm">
            <strong className="text-primary">AI Feedback</strong>
            <span className="text-gray-600"> — draft personalized comments from attendance and scores</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {['Category averages', 'Individual grades', 'Percentile ranking'].map(o => (
            <label key={o} className="flex items-center gap-2 text-xs text-gray-700">
              <Checkbox defaultChecked readOnly /> {o}
            </label>
          ))}
        </div>
      </div>
    </Shell>
  )
}

function MessagesAndNotifications() {
  return (
    <Shell>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <Eyebrow>Messages</Eyebrow>
          <div className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
            <Mail className="w-4 h-4" /> Inbox
          </div>
          <ul className="space-y-1.5 text-sm">
            {['Ms. Kim · "Quiz tomorrow"', 'Parent (Alice) · "Late pickup"', 'Brian Cho · "Question about HW"'].map((m, i) => (
              <li
                key={m}
                className={`p-2.5 rounded-lg ${
                  i === 0 ? 'bg-primary/5 border-l-2 border-primary text-gray-800' : 'bg-gray-50 text-gray-700'
                }`}
              >
                {m}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <Eyebrow>Notifications</Eyebrow>
          <div className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
            <Bell className="w-4 h-4" /> Recent
          </div>
          <ul className="space-y-1.5 text-sm">
            {[
              { text: 'Payment received · Alice Park', when: '2m ago' },
              { text: 'Attendance pending · Grade 4 Math', when: '1h ago' },
              { text: 'New announcement posted', when: 'Yesterday' },
            ].map(n => (
              <li key={n.text} className="p-2.5 rounded-lg border border-gray-100 flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                <div className="flex-1">
                  <div className="text-gray-800">{n.text}</div>
                  <div className="text-xs text-gray-400">{n.when}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Shell>
  )
}

function PaymentsList() {
  const rows: { name: string; amt: string; kind: 'success' | 'destructive' | 'gray' | 'default'; status: string; due: string }[] = [
    { name: 'Alice Park', amt: '₩ 320,000', kind: 'success', status: 'Approved', due: 'Mar 5' },
    { name: 'Brian Cho', amt: '₩ 280,000', kind: 'default', status: 'Sent', due: 'Mar 5' },
    { name: 'Chloe Lim', amt: '₩ 350,000', kind: 'destructive', status: 'Error', due: 'Mar 1' },
    { name: 'Daniel Han', amt: '₩ 200,000', kind: 'gray', status: 'Draft', due: '—' },
  ]
  return (
    <Shell>
      <PageHeader
        eyebrow="Billing"
        title="Payments"
        action={
          <Button size="sm">
            <Plus className="w-3.5 h-3.5" /> Add Payment
          </Button>
        }
      />
      <div className="flex gap-1 border-b border-gray-200 mb-4">
        {['One-time', 'Recurring', 'Plans'].map((t, i) => (
          <span
            key={t}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              i === 0 ? 'text-primary border-primary' : 'text-gray-500 border-transparent'
            }`}
          >
            {t}
          </span>
        ))}
      </div>
      <ul className="divide-y divide-gray-100 text-sm">
        {rows.map(r => (
          <li key={r.name} className="py-3 flex items-center justify-between">
            <div>
              <div className="text-gray-900 font-medium">{r.name}</div>
              <div className="text-xs text-gray-500">March 2026 tuition · due {r.due}</div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-900 font-medium">{r.amt}</span>
              <Badge variant={r.kind}>{r.status}</Badge>
            </div>
          </li>
        ))}
      </ul>
    </Shell>
  )
}

function FamiliesPanel() {
  return (
    <Shell>
      <PageHeader
        eyebrow="Contacts"
        title="Families"
        action={
          <Button size="sm">
            <Upload className="w-3.5 h-3.5" /> Import Families
          </Button>
        }
      />
      <div className="relative max-w-xs mb-4">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <Input readOnly placeholder="Search families" className="h-9 pl-8 text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[
          { p: 'Mr. & Mrs. Park', count: '2 parents · 1 student', s: ['Alice Park (G4)'] },
          { p: 'Mrs. Cho', count: '1 parent · 2 students', s: ['Brian Cho (G5)', 'Bella Cho (G3)'] },
        ].map(f => (
          <div key={f.p} className="rounded-2xl ring-1 ring-gray-100/80 bg-white overflow-hidden">
            <div className="h-1 bg-primary" />
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-semibold text-gray-900">{f.p}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{f.count}</div>
                </div>
                <Users className="w-4 h-4 text-gray-400" />
              </div>
              <ul className="text-xs text-gray-600 space-y-0.5 mt-3">
                {f.s.map(s => <li key={s}>↳ {s}</li>)}
              </ul>
              <Button variant="ghost" size="sm" className="mt-2 h-7 px-2 text-xs">Copy invite link</Button>
            </div>
          </div>
        ))}
      </div>
    </Shell>
  )
}

function ArchivePanel() {
  return (
    <Shell>
      <PageHeader
        eyebrow="Archive"
        title="Archive"
        action={
          <Button variant="outline" size="sm">
            All types <ChevronDown className="w-3.5 h-3.5" />
          </Button>
        }
      />
      <div className="relative max-w-md mb-4">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <Input readOnly placeholder="Search archived items" className="h-9 pl-8 text-sm" />
      </div>
      <ul className="divide-y divide-gray-100 text-sm">
        {[
          { name: 'Grade 6 Science', type: 'Classroom', when: '12 days ago', kind: 'info' as const },
          { name: 'Worksheet 3B', type: 'Assignment', when: '1 month ago', kind: 'gray' as const },
          { name: 'Mar 1 holiday notice', type: 'Announcement', when: '2 months ago', kind: 'warning' as const },
        ].map(i => (
          <li key={i.name} className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant={i.kind}>{i.type}</Badge>
              <div>
                <div className="text-gray-900 font-medium">{i.name}</div>
                <div className="text-xs text-gray-500">Deleted {i.when}</div>
              </div>
            </div>
            <Button variant="outline" size="sm">
              <Undo2 className="w-3.5 h-3.5" /> Restore
            </Button>
          </li>
        ))}
      </ul>
    </Shell>
  )
}

function SettingsPanel() {
  return (
    <Shell>
      <Eyebrow>Preferences</Eyebrow>
      <h2 className="text-xl font-semibold tracking-tight text-gray-900 mb-5">Settings</h2>
      <div className="grid grid-cols-[180px_1fr] gap-6">
        <ul className="space-y-0.5 text-sm">
          {['Account', 'Notifications', 'Preferences', 'Security'].map((s, i) => (
            <li
              key={s}
              className={`px-3 py-2 rounded-md ${
                i === 0 ? 'bg-primary/10 text-primary font-medium' : 'text-gray-600'
              }`}
            >
              {s}
            </li>
          ))}
        </ul>
        <div className="space-y-4">
          <ReadInput label="Name" value="Andy Lee" />
          <ReadInput label="Email" value="andy@classraum.com" />
          <ReadInput label="Phone" value="+82 10-0000-0000" />
          <ReadInput label="Academy" value="Classraum Academy" />
          <div className="text-xs text-gray-400 italic">Changes auto-save</div>
        </div>
      </div>
    </Shell>
  )
}

function ExamsBuilder() {
  return (
    <Shell
      title="Create Assignment · Test"
      footer={
        <>
          <Button variant="ghost" size="sm">Cancel</Button>
          <Button size="sm">
            <Sparkles className="w-3.5 h-3.5" /> Generate with AI
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <ReadInput label="Title" value="Midterm — Algebra" required />
        <div className="grid grid-cols-2 gap-3">
          <ReadInput label="Type" value="Test" required trailing={<ChevronDown className="w-4 h-4" />} />
          <ReadInput label="Classroom" value="Grade 4 Math" required trailing={<ChevronDown className="w-4 h-4" />} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <ReadInput label="Due Date" value="Apr 5, 2026" required trailing={<CalendarIcon className="w-4 h-4" />} />
          <ReadInput label="Points possible" value="100" />
        </div>
        <ReadInput label="Category" value="Exams" trailing={<ChevronDown className="w-4 h-4" />} />
        <div className="space-y-1.5">
          <Label className="text-xs">Instructions</Label>
          <div className="rounded-lg border border-gray-200 p-3 text-sm text-gray-700 min-h-[80px]">
            Closed book. 50 minutes. Cover all topics from Chapters 3–5.
          </div>
        </div>
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <div className="font-medium text-primary mb-0.5">AI question generation</div>
            <div className="text-gray-700">
              Generate a starter test calibrated to this classroom&apos;s level — you can edit before publishing.
            </div>
          </div>
        </div>
      </div>
    </Shell>
  )
}

function ImportFromTextModal() {
  const { t, language } = useTranslation()
  const ko = language === 'korean'
  return (
    <Shell
      title={ko ? '텍스트에서 가져오기' : 'Import from Text'}
      footer={
        <>
          <Button variant="ghost" size="sm">{t('common.cancel')}</Button>
          <Button size="sm">
            <Sparkles className="w-3.5 h-3.5" /> {ko ? 'AI로 분석' : 'Parse with AI'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-gray-700 bg-primary/5 rounded-lg p-3">
          <Sparkles className="w-4 h-4 text-primary" />
          {ko
            ? '일정, 강의계획서, 메모를 붙여넣으세요 — AI가 수업 정보를 추출합니다.'
            : 'Paste a schedule, syllabus, or notes — AI will pull out the session details.'}
        </div>
        <div className="rounded-lg border border-gray-200 p-4 text-sm text-gray-700 font-mono leading-relaxed min-h-[120px] bg-gray-50">
          {ko ? (
            <>
              4주차 — 3월 14일 (월)<br />
              오후 4시–5시 30분, A실<br />
              주제: 분수 복습 + 워크시트 4A
            </>
          ) : (
            <>
              Week 4 — Mar 14 (Mon)<br />
              4–5:30pm, Room A<br />
              Topic: fractions review + Worksheet 4A
            </>
          )}
        </div>
        <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500 flex items-center gap-2">
          <Upload className="w-4 h-4" />
          {ko ? '…또는 .txt / .csv 파일을 끌어다 놓으세요' : '…or drop a .txt / .csv file'}
        </div>
      </div>
    </Shell>
  )
}

// ─── Registry ─────────────────────────────────────────────────────────────

const MOCKUPS: Record<string, () => ReactNode> = {
  'dashboard-overview': DashboardDemo,
  'classrooms-list': ClassroomsListDemo,
  'create-classroom-form': ClassroomCreateDemo,
  'add-schedule': ScheduleUpdateDemo,
  'create-session': SessionFormDemo,
  'import-from-text': ImportFromTextModal,
  'add-makeup-session': SessionFormDemo,
  'edit-session-assignments': () => <AssignmentCreateDemo />,
  'pending-attendance': PendingAttendanceDemo,
  'new-announcement': NewAnnouncementDemo,
  'add-report': AddReportDemo,
  'reports-list': ReportsListDemo,
  'report-preview': ReportPreviewDemo,
  'messages-notifications': MessagesNotificationsDemo,
  'payments-list': PaymentsListDemo,
  'add-payment-plan': AddPlanDemo,
  'add-one-time-payment': AddOneTimePaymentDemo,
  'assign-recurring-payment': AssignRecurringDemo,
  'families-panel': FamiliesListDemo,
  'archive-panel': ArchiveListDemo,
  'settings-panel': SettingsListDemo,
  'exams-builder': LevelTestCreateDemo,
  'exam-detail': LevelTestDetailDemo,
  'exam-share': LevelTestShareDemo,
}

export function HelpMockup({ id }: { id: string }) {
  const Cmp = MOCKUPS[id.trim()]
  if (!Cmp) {
    return (
      <div className="my-4 p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-800">
        Missing mockup: <code>{id}</code>
      </div>
    )
  }
  return <Cmp />
}
