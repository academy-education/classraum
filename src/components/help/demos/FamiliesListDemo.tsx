"use client"

import { useMemo, useState } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { Card } from '@/components/ui/card'
import { getFamilies } from './sample-data'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, Upload, Users, Rows3, Grid3X3, Mail, Phone, GraduationCap } from 'lucide-react'
import { NonFunctional } from './NonFunctional'

export function FamiliesListDemo() {
  const { t, language } = useTranslation()
  const families = useMemo(() => getFamilies(language), [language])
  const [view, setView] = useState<'table' | 'card'>('card')

  return (
    <NonFunctional>
      <div className="my-6 p-4 bg-white rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary mb-1.5">{t('eyebrows.families')}</p>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{t('families.title')}</h1>
            <p className="text-gray-500 text-sm">{t('families.description')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-9">
              <Upload className="w-4 h-4" /> {t('families.import')}
            </Button>
            <Button size="sm" className="h-9">
              <Plus className="w-4 h-4" /> {t('families.createFamily')}
            </Button>
          </div>
        </div>

        <div className="flex justify-end mb-3">
          <div className="flex items-center gap-1 border border-border rounded-lg p-1 bg-white">
            <Button
              variant={view === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('table')}
              className={`h-9 px-3 ${view === 'table' ? 'bg-primary text-primary-foreground' : 'text-gray-600'}`}
            >
              <Rows3 className="w-4 h-4" />
            </Button>
            <Button
              variant={view === 'card' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('card')}
              className={`h-9 px-3 ${view === 'card' ? 'bg-primary text-primary-foreground' : 'text-gray-600'}`}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="relative mb-4 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5 pointer-events-none" />
          <Input
            placeholder={String(t('families.searchPlaceholder'))}
            className="h-12 pl-12 pr-12 rounded-lg border border-border bg-white text-sm shadow-sm"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {families.map(f => (
            <Card key={f.name} className="!gap-0 !py-0 overflow-hidden">
              <div className="h-1 bg-primary w-full" />
              <div className="p-4 flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-primary mb-1">
                      {t('families.family')}
                    </p>
                    <h3 className="text-base font-semibold text-gray-900 truncate">{f.name}</h3>
                  </div>
                  <Users className="w-4 h-4 text-gray-300" strokeWidth={1.75} />
                </div>
                <div className="space-y-1 text-xs text-gray-600">
                  <div className="font-medium text-gray-900">{f.parent}</div>
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3 h-3 text-gray-400" strokeWidth={1.75} /> {f.parentEmail}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-gray-400" strokeWidth={1.75} /> {f.parentPhone}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400 mb-1.5">
                    {t('families.students')} ({f.students.length})
                  </p>
                  <ul className="space-y-1">
                    {f.students.map(s => (
                      <li key={s.name} className="text-xs text-gray-700 flex items-center gap-1.5">
                        <GraduationCap className="w-3 h-3 text-gray-400" strokeWidth={1.75} />
                        <span>{s.name}</span>
                        <span className="text-gray-400">· {s.grade}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Button variant="outline" size="sm" className="mt-4 w-full text-xs h-9">
                  {t('families.copyLink')}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </NonFunctional>
  )
}
