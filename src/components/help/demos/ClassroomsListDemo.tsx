"use client"

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Plus,
  Search,
  School,
  GraduationCap,
  Pause,
  Edit,
  Trash2,
  Clock,
  Rows3,
  Grid3X3,
  CalendarOff,
} from 'lucide-react'
import { NonFunctional } from './NonFunctional'

/**
 * Faithful Classrooms list view — composed from the same primitives the
 * real classrooms-page.tsx uses (Card, Button, Input, Select). Sample
 * classrooms render with the brand-correct color accent bar, three-column
 * metric strip, schedule display, and action stack at the bottom.
 *
 * The real ClassroomsPage owns ~2000 lines of state + supabase fetches —
 * not feasible to live-embed wholesale. This composition reuses the same
 * visual building blocks so the demo and live page render identically.
 */

const SAMPLE_CLASSROOMS = [
  {
    name: 'Grade 4 Math',
    teacher: 'Ms. Kim',
    students: 12,
    grade: 'Grade 4',
    subject: 'Mathematics',
    color: '#3b82f6',
    schedule: ['Mon · 4:00 PM – 5:30 PM', 'Wed · 4:00 PM – 5:30 PM'],
  },
  {
    name: 'Grade 5 English',
    teacher: 'Mr. Park',
    students: 8,
    grade: 'Grade 5',
    subject: 'English',
    color: '#f59e0b',
    schedule: ['Tue · 5:30 PM – 7:00 PM'],
  },
  {
    name: 'SAT Prep',
    teacher: 'Ms. Lee',
    students: 15,
    grade: 'High school',
    subject: 'Test prep',
    color: '#10b981',
    schedule: ['Sat · 9:00 AM – 12:00 PM'],
  },
]

export function ClassroomsListDemo() {
  const [pauseFilter, setPauseFilter] = useState<'active' | 'paused' | 'all'>('active')
  const [view, setView] = useState<'table' | 'card'>('card')
  const [search, setSearch] = useState('')

  return (
    <NonFunctional>
      <div className="my-6 p-4 bg-white rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary mb-1.5">
              Manage
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Classrooms</h1>
            <p className="text-gray-500 text-sm">Set up and organize all your classes from here.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-9">
              <CalendarOff className="w-4 h-4" />
              Schedule breaks
            </Button>
            <Button size="sm" className="h-9">
              <Plus className="w-4 h-4" />
              Create a Classroom
            </Button>
          </div>
        </div>

        {/* Hero stats card */}
        <div className="mb-6">
          <Card className="w-full sm:w-80 p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <School className="w-3.5 h-3.5 text-primary" strokeWidth={2.25} />
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                Total active classrooms
              </p>
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <p className="text-4xl font-semibold tracking-tight text-gray-900 tabular-nums">3</p>
              <p className="text-sm text-gray-400">classrooms</p>
            </div>
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-medium">
              100% of total
            </div>
          </Card>
        </div>

        {/* View toggle */}
        <div className="flex justify-end mb-3">
          <div className="flex items-center gap-1 border border-border rounded-lg p-1 bg-white">
            <Button
              variant={view === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('table')}
              className={`h-9 px-3 ${view === 'table' ? 'bg-primary text-primary-foreground' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <Rows3 className="w-4 h-4" />
            </Button>
            <Button
              variant={view === 'card' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('card')}
              className={`h-9 px-3 ${view === 'card' ? 'bg-primary text-primary-foreground' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Search + pause filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5 pointer-events-none" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search classrooms"
              className="h-12 pl-12 pr-12 rounded-lg border border-border bg-white text-sm shadow-sm"
            />
          </div>
          <Select value={pauseFilter} onValueChange={v => setPauseFilter(v as 'active' | 'paused' | 'all')}>
            <SelectTrigger className="h-12 w-full sm:w-60 rounded-lg border border-border bg-white text-sm shadow-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active classrooms</SelectItem>
              <SelectItem value="paused">Paused classrooms</SelectItem>
              <SelectItem value="all">All classrooms</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Card grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
          {SAMPLE_CLASSROOMS.map(c => (
            <Card
              key={c.name}
              className="!gap-0 !py-0 flex flex-col h-full overflow-hidden"
            >
              <div className="h-1 w-full" style={{ backgroundColor: c.color }} />
              <div className="p-4 sm:p-5 flex flex-col flex-1">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] mb-1 text-emerald-600">
                      Active
                    </p>
                    <h3 className="text-lg font-semibold text-gray-900 tracking-tight truncate">
                      {c.name}
                    </h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                      <GraduationCap className="w-3.5 h-3.5" strokeWidth={1.75} />
                      <span className="truncate">{c.teacher}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 -mr-1 flex-shrink-0">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-gray-700">
                      <Pause className="w-4 h-4" strokeWidth={1.75} />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-gray-700">
                      <Edit className="w-4 h-4" strokeWidth={1.75} />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-rose-600 hover:bg-rose-50">
                      <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                    </Button>
                  </div>
                </div>

                {/* 3-column metric strip */}
                <div className="grid grid-cols-3 gap-2 my-3 py-3 border-y border-gray-100">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400 mb-0.5">
                      Students
                    </p>
                    <p className="text-sm font-semibold text-gray-900">{c.students}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400 mb-0.5">
                      Grade
                    </p>
                    <p className="text-sm font-semibold text-gray-900 truncate">{c.grade}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400 mb-0.5">
                      Subject
                    </p>
                    <p className="text-sm font-semibold text-gray-900 truncate">{c.subject}</p>
                  </div>
                </div>

                {/* Schedule */}
                <div className="flex items-start gap-1.5 text-xs text-gray-500 mb-3">
                  <Clock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" strokeWidth={1.75} />
                  <div className="flex flex-col min-w-0">
                    {c.schedule.map((s, i) => (
                      <span key={i} className="truncate">{s}</span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-auto pt-3 space-y-1.5">
                  <Button variant="outline" size="sm" className="w-full text-xs h-9">
                    View details
                  </Button>
                  <Button size="sm" className="w-full text-xs h-9">
                    View sessions
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </NonFunctional>
  )
}
