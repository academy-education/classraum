"use client"

import { useMemo, useState } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { getDateLocale } from '@/utils/dateUtils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, RotateCcw, Trash2, School, Calendar, ClipboardList, FileText, Users } from 'lucide-react'
import { NonFunctional } from './NonFunctional'

interface ArchiveItem {
  id: string
  name: string
  typeKey: string
  deletedAgoDays: number
  deletedAt: string
  icon: typeof School
  iconBg: string
}

// Anchor relative to which `deletedAgoDays` is subtracted. Fixed (rather
// than Date.now()) so server + client renders are stable and snapshots
// are deterministic.
const ANCHOR = new Date(2026, 5, 18).getTime()

function sampleItemsFor(lang: string): Omit<ArchiveItem, 'deletedAt'>[] {
  const ko = lang === 'korean'
  return [
    { id: 'a1', name: ko ? '6학년 과학' : 'Grade 6 Science', typeKey: 'navigation.classrooms', deletedAgoDays: 12, icon: School, iconBg: 'bg-sky-100 text-sky-600' },
    { id: 'a2', name: ko ? '워크시트 3B' : 'Worksheet 3B', typeKey: 'navigation.assignments', deletedAgoDays: 30, icon: ClipboardList, iconBg: 'bg-amber-100 text-amber-600' },
    { id: 'a3', name: ko ? '3월 1일 휴원 안내' : 'Mar 1 holiday notice', typeKey: 'navigation.announcements', deletedAgoDays: 60, icon: FileText, iconBg: 'bg-purple-100 text-purple-600' },
    { id: 'a4', name: ko ? '박씨 가족' : 'Park family', typeKey: 'families.family', deletedAgoDays: 90, icon: Users, iconBg: 'bg-emerald-100 text-emerald-600' },
    { id: 'a5', name: ko ? '3월 14일 세션' : 'March 14 session', typeKey: 'navigation.sessions', deletedAgoDays: 150, icon: Calendar, iconBg: 'bg-rose-100 text-rose-600' },
  ]
}

export function ArchiveListDemo() {
  const { t, language } = useTranslation()
  const [filter, setFilter] = useState('all')

  // Compute the localized "deleted on …" strings client-side so they
  // follow the user's locale (toLocaleDateString respects language).
  // Item names also swap with the active language.
  const items: ArchiveItem[] = useMemo(() => {
    const locale = getDateLocale(language)
    return sampleItemsFor(language).map(item => ({
      ...item,
      deletedAt: new Date(ANCHOR - item.deletedAgoDays * 86400000).toLocaleDateString(locale),
    }))
  }, [language])

  return (
    <NonFunctional>
      <div className="my-6 p-4 bg-white rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary mb-1.5">{t('eyebrows.archive')}</p>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{t('archive.title')}</h1>
            <p className="text-gray-500 text-sm">{t('archive.description')}</p>
          </div>
          <Button variant="outline" size="sm" className="h-9 text-rose-600 hover:text-rose-700">
            <Trash2 className="w-4 h-4" /> {t('archive.deleteForever')}
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5 pointer-events-none" />
            <Input
              placeholder={String(t('archive.searchPlaceholder'))}
              className="h-12 pl-12 rounded-lg border border-border bg-white text-sm shadow-sm"
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="h-12 w-full sm:w-60 rounded-lg border border-border bg-white text-sm shadow-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('archive.allTypes')}</SelectItem>
              <SelectItem value="classrooms">{t('navigation.classrooms')}</SelectItem>
              <SelectItem value="sessions">{t('navigation.sessions')}</SelectItem>
              <SelectItem value="assignments">{t('navigation.assignments')}</SelectItem>
              <SelectItem value="families">{t('navigation.families')}</SelectItem>
              <SelectItem value="invoices">{t('payments.invoices')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          {items.map(i => {
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
                    <p className="text-sm text-gray-500">{t(i.typeKey)} · {String(t('archive.deletedOn', { date: i.deletedAt }))}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="sm" className="text-emerald-600 hover:text-emerald-700">
                    <RotateCcw className="w-4 h-4 sm:mr-1" />
                    <span className="hidden sm:inline">{t('archive.restore')}</span>
                  </Button>
                  <Button variant="outline" size="sm" className="text-rose-600 hover:text-rose-700">
                    <Trash2 className="w-4 h-4 sm:mr-1" />
                    <span className="hidden sm:inline">{t('archive.deleteForever')}</span>
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
