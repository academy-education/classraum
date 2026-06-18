"use client"

import { useState } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { ModalShell } from '@/components/ui/common/ModalShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TableCheckbox } from '@/components/ui/dashboard'
import { Search, CheckCircle, Upload } from 'lucide-react'
import { NonFunctional } from './NonFunctional'

/**
 * New Announcement modal — composed from the same building blocks the
 * live announcements-page.tsx uses inline (ModalShell, Input, Label,
 * TableCheckbox, Button, FileUpload). The live modal is inline JSX in
 * announcements-page.tsx around line 1080; this is a faithful
 * reconstruction. FileUpload needs a real supabase bucket, so we render
 * a static placeholder for the attachments section.
 */

const SAMPLE_CLASSROOMS = [
  { id: 'c1', name: 'Grade 4 Math' },
  { id: 'c2', name: 'Grade 5 English' },
  { id: 'c3', name: 'SAT Prep' },
  { id: 'c4', name: 'Grade 6 Science' },
]

export function NewAnnouncementDemo() {
  const { t } = useTranslation()
  const [title, setTitle] = useState('Holiday closure — Mar 1')
  const [content, setContent] = useState(
    'The academy will be closed on March 1 for Independence Movement Day. Sessions resume Mar 2.'
  )
  const [selected, setSelected] = useState<string[]>(['c1', 'c2'])
  const [search, setSearch] = useState('')

  const toggle = (id: string) =>
    setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))

  const filtered = SAMPLE_CLASSROOMS.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )
  const allSelected = filtered.length > 0 && filtered.every(c => selected.includes(c.id))
  const toggleAll = () => {
    if (allSelected) {
      setSelected(prev => prev.filter(id => !filtered.find(c => c.id === id)))
    } else {
      setSelected(prev => Array.from(new Set([...prev, ...filtered.map(c => c.id)])))
    }
  }

  return (
    <NonFunctional>
      <ModalShell
        isOpen
        inline
        onClose={() => undefined}
        size="2xl"
        title={String(t('announcements.newAnnouncement'))}
        subtitle={String(t('announcements.description'))}
        bodyClassName="space-y-6"
        footer={
          <ModalShell.Footer>
            <Button variant="outline">{t('common.cancel')}</Button>
            <Button>{t('common.create')}</Button>
          </ModalShell.Footer>
        }
      >
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="demo-ann-title">
            {t('announcements.announcementTitle')} <span className="text-rose-500">*</span>
          </Label>
          <Input
            id="demo-ann-title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={String(t('announcements.announcementTitlePlaceholder'))}
          />
        </div>

        {/* Content */}
        <div className="space-y-2">
          <Label htmlFor="demo-ann-content">{t('announcements.announcementContent')}</Label>
          <textarea
            id="demo-ann-content"
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder={String(t('announcements.announcementContentPlaceholder'))}
            rows={4}
            className="w-full px-3 py-2 border border-input rounded-md bg-transparent text-base md:text-sm placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-0 focus-visible:outline-none resize-none transition-[color,box-shadow]"
          />
        </div>

        {/* Classrooms */}
        <div className="space-y-2">
          <Label>
            {t('announcements.selectClassrooms')} <span className="text-rose-500">*</span>
          </Label>
          <div className="border border-border rounded-lg bg-gray-50 p-4">
            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none" />
              <Input
                type="text"
                placeholder={String(t('announcements.searchClassrooms'))}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-9 pl-10 rounded-lg border border-border bg-white focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
              />
            </div>

            {/* Select All */}
            <div className="mb-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={toggleAll}
                className="h-8 px-3 text-xs text-primary border-primary/20 hover:bg-primary/5 hover:text-primary"
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                {allSelected ? t('announcements.deselectAll') : t('announcements.selectAll')}
              </Button>
            </div>

            {/* Classroom list */}
            <div className="space-y-3 max-h-48 overflow-y-auto scrollbar-hide">
              {filtered.map(c => (
                <div
                  key={c.id}
                  className="border border-gray-200 rounded-lg p-3 hover:border-primary hover:shadow-sm transition-all bg-white"
                >
                  <label className="flex items-center gap-3 cursor-pointer">
                    <TableCheckbox
                      checked={selected.includes(c.id)}
                      ariaLabel={c.name}
                      onChange={() => toggle(c.id)}
                    />
                    <span className="text-sm font-medium text-gray-900">{c.name}</span>
                  </label>
                </div>
              ))}
            </div>
          </div>
          {selected.length > 0 && (
            <p className="text-xs text-gray-500">{selected.length} {t('announcements.selectedClassrooms')}</p>
          )}
        </div>

        {/* Attachments */}
        <div className="space-y-2">
          <Label>{t('announcements.attachments')}</Label>
          <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500 flex items-center gap-2 bg-gray-50">
            <Upload className="w-4 h-4" /> Drop files here · up to 5
          </div>
        </div>
      </ModalShell>
    </NonFunctional>
  )
}
