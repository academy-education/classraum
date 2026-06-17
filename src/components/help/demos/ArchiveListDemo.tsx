"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, RotateCcw, Trash2, School, Calendar, ClipboardList, FileText, Users } from 'lucide-react'
import { NonFunctional } from './NonFunctional'

const SAMPLE_ITEMS = [
  {
    id: 'a1',
    name: 'Grade 6 Science',
    type: 'Classroom',
    deletedAt: '12 days ago',
    icon: School,
    iconBg: 'bg-sky-100 text-sky-600',
  },
  {
    id: 'a2',
    name: 'Worksheet 3B',
    type: 'Assignment',
    deletedAt: '1 month ago',
    icon: ClipboardList,
    iconBg: 'bg-amber-100 text-amber-600',
  },
  {
    id: 'a3',
    name: 'Mar 1 holiday notice',
    type: 'Announcement',
    deletedAt: '2 months ago',
    icon: FileText,
    iconBg: 'bg-purple-100 text-purple-600',
  },
  {
    id: 'a4',
    name: 'Park family',
    type: 'Family',
    deletedAt: '3 months ago',
    icon: Users,
    iconBg: 'bg-emerald-100 text-emerald-600',
  },
  {
    id: 'a5',
    name: 'March 14 session',
    type: 'Session',
    deletedAt: '5 months ago',
    icon: Calendar,
    iconBg: 'bg-rose-100 text-rose-600',
  },
]

export function ArchiveListDemo() {
  const [filter, setFilter] = useState('all')

  return (
    <NonFunctional>
      <div className="my-6 p-4 bg-white rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary mb-1.5">Archive</p>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Archive</h1>
            <p className="text-gray-500 text-sm">Restore deleted items or permanently delete them. Auto-cleared after 1 year.</p>
          </div>
          <Button variant="outline" size="sm" className="h-9 text-rose-600 hover:text-rose-700">
            <Trash2 className="w-4 h-4" /> Delete all
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5 pointer-events-none" />
            <Input
              placeholder="Search archived items"
              className="h-12 pl-12 rounded-lg border border-border bg-white text-sm shadow-sm"
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="h-12 w-full sm:w-60 rounded-lg border border-border bg-white text-sm shadow-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="classrooms">Classrooms</SelectItem>
              <SelectItem value="sessions">Sessions</SelectItem>
              <SelectItem value="assignments">Assignments</SelectItem>
              <SelectItem value="families">Families</SelectItem>
              <SelectItem value="invoices">Invoices</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          {SAMPLE_ITEMS.map(i => {
            const Icon = i.icon
            return (
              <div
                key={i.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${i.iconBg}`}>
                    <Icon className="w-5 h-5" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">{i.name}</h4>
                    <p className="text-sm text-gray-500">{i.type} · deleted {i.deletedAt}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="sm" className="text-emerald-600 hover:text-emerald-700">
                    <RotateCcw className="w-4 h-4 sm:mr-1" />
                    <span className="hidden sm:inline">Restore</span>
                  </Button>
                  <Button variant="outline" size="sm" className="text-rose-600 hover:text-rose-700">
                    <Trash2 className="w-4 h-4 sm:mr-1" />
                    <span className="hidden sm:inline">Delete forever</span>
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </NonFunctional>
  )
}
