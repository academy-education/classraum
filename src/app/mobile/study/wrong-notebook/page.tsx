"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, BookOpen, Printer, CheckCircle2, XCircle, Pencil, Sparkles, ChevronRight, Bookmark, Image as ImageIcon } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { authHeaders } from '@/lib/auth-headers'
import { StudySubscriptionGate } from '../SubscriptionGate'
import { StudySubPageHeader, StudyEmptyState, StudyPageTransition } from '../_shared/primitives'
import { SkeletonCard, SkeletonIconTile, SkeletonBlock } from '../skeletons'

/**
 * /mobile/study/wrong-notebook — full 오답노트 page.
 *
 * Korean exam-prep convention: students keep a personal wrong-answer
 * notebook and review it cyclically before tests. This page surfaces
 * every wrong answer on file with:
 *   - inline note editor (debounced auto-save)
 *   - topic filter
 *   - print/PDF export (forwards to /print view styled for paper)
 *
 * Reuses /api/study/wrong-notebook which dedupes by question prompt
 * and joins notes in one query.
 */

interface Question {
  prompt: string
  type?: string
  choices?: string[]
  correct_answer: string
  explanation?: string
  difficulty?: string
}

interface Entry {
  attempt_id: string
  question: Question
  student_answer: string
  ai_explanation: string | null
  attempted_at: string
  topic: { id: string; slug: string; name_en: string; name_ko: string } | null
  topic_freeform: string | null
  note: string
  note_updated_at: string | null
}

interface TopicSummary {
  id: string
  slug: string
  name_en: string
  name_ko: string
  count: number
}

interface BookmarkedSnap {
  id: string
  image_url: string | null
  ocr_text: string
  subject_guess: string
  final_answer: string
  bookmarked_at: string
}

export default function WrongNotebookPage() {
  return (
    <StudySubscriptionGate>
      <WrongNotebookInner />
    </StudySubscriptionGate>
  )
}

function WrongNotebookInner() {
  const { t, language } = useTranslation()
  const ko = language === 'korean'
  const [entries, setEntries] = useState<Entry[]>([])
  const [topics, setTopics] = useState<TopicSummary[]>([])
  const [bookmarkedSnaps, setBookmarkedSnaps] = useState<BookmarkedSnap[]>([])
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const headers = await authHeaders()
      const url = selectedTopicId
        ? `/api/study/wrong-notebook?topic_id=${encodeURIComponent(selectedTopicId)}`
        : '/api/study/wrong-notebook'
      const res = await fetch(url, { headers })
      if (!res.ok) throw new Error()
      const json = await res.json()
      setEntries((json.entries ?? []) as Entry[])
      // Only refresh the topic chip list on the all-topics view —
      // filtering should not collapse other topic options.
      if (!selectedTopicId) setTopics((json.topics ?? []) as TopicSummary[])
      setBookmarkedSnaps((json.bookmarkedSnaps ?? []) as BookmarkedSnap[])
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [selectedTopicId])

  useEffect(() => { void load() }, [load])

  const annotated = entries.filter(e => e.note.length > 0).length

  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-48 -z-10 bg-gradient-to-b from-rose-500/[0.03] to-transparent"
      />
      <div className="max-w-3xl mx-auto px-5 pt-6 pb-14 space-y-6">
        <StudySubPageHeader
          backHref="/mobile/study"
          backLabel={String(t('study.wrongNotebook.back'))}
          icon={BookOpen}
          iconColorClass="text-rose-600 bg-rose-50"
          eyebrow={String(t('study.wrongNotebook.eyebrow'))}
          title={String(t('study.wrongNotebook.title'))}
          rightSlot={
            <Link
              href={selectedTopicId
                ? `/mobile/study/wrong-notebook/print?topic_id=${encodeURIComponent(selectedTopicId)}`
                : '/mobile/study/wrong-notebook/print'}
              target="_blank"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-white ring-1 ring-gray-200 text-[12.5px] font-medium text-gray-800 hover:ring-primary/40 hover:text-primary transition"
            >
              <Printer className="w-3.5 h-3.5" />{t('study.wrongNotebook.print')}
            </Link>
          }
        />

        <StudyPageTransition>
          {/* Summary + filter row — 문항 count sits inside the "전체"
              chip below (filter row), so we only surface the annotated
              count here to avoid duplicating info. */}
          {annotated > 0 && (
            <div className="flex items-center gap-2 text-[12px] text-gray-700">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 ring-1 ring-indigo-100">
                <Pencil className="w-3.5 h-3.5 text-indigo-500" />
                <span className="font-semibold tabular-nums">{annotated}</span> {t('study.wrongNotebook.annotatedSuffix')}
              </span>
            </div>
          )}

          {/* Topic filter — horizontal chip row */}
          {topics.length > 0 && (
            <TopicFilter
              topics={topics}
              selectedId={selectedTopicId}
              onSelect={setSelectedTopicId}
              ko={ko}
              allLabel={String(t('study.wrongNotebook.allTopics'))}
            />
          )}

          {loading ? (
            <div className="space-y-3">
              {[0,1,2].map(i => (
                <div key={i} style={{ animationDelay: `${i * 60}ms` }} className="animate-card-in opacity-0">
                  <SkeletonCard className="p-4 min-h-[140px]">
                    <div className="flex items-start gap-3">
                      <SkeletonIconTile size="w-9 h-9" />
                      <div className="flex-1 space-y-2">
                        <SkeletonBlock className="h-2.5 w-1/4 rounded-full" />
                        <SkeletonBlock className="h-3 w-4/5 rounded-full" />
                        <SkeletonBlock className="h-3 w-3/5 rounded-full" />
                      </div>
                    </div>
                  </SkeletonCard>
                </div>
              ))}
            </div>
          ) : entries.length === 0 && bookmarkedSnaps.length === 0 ? (
            <StudyEmptyState
              icon={Sparkles}
              iconColorClass="text-emerald-600 bg-emerald-50"
              headline={String(t('study.wrongNotebook.emptyTitle'))}
              body={String(t('study.wrongNotebook.emptyBody'))}
            />
          ) : (
            <>
              {bookmarkedSnaps.length > 0 && (
                <BookmarkedSnapsSection snaps={bookmarkedSnaps} ko={ko} />
              )}
              {entries.length > 0 && (
                <ol className="space-y-3">
                  {entries.map((e, i) => (
                    <div key={e.attempt_id} style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }} className="animate-card-in opacity-0">
                      <NotebookEntryCard entry={e} index={i + 1} ko={ko} />
                    </div>
                  ))}
                </ol>
              )}
            </>
          )}
        </StudyPageTransition>
      </div>
    </div>
  )
}

function BookmarkedSnapsSection({ snaps, ko }: { snaps: BookmarkedSnap[]; ko: boolean }) {
  return (
    <section>
      <h2 className="text-[13px] font-semibold text-gray-900 mb-2 px-1 inline-flex items-center gap-1.5">
        <Bookmark className="w-3.5 h-3.5 text-amber-600 fill-amber-600" />
        {ko ? '북마크한 사진' : 'Bookmarked snaps'}
        <span className="text-[11px] text-gray-500 font-normal tabular-nums">({snaps.length})</span>
      </h2>
      <div className="grid grid-cols-3 gap-2 mb-5">
        {snaps.map((s, i) => (
          <div key={s.id}
            style={{ animationDelay: `${i * 40}ms` }}
            className="relative rounded-xl overflow-hidden ring-1 ring-amber-200/70 bg-white aspect-square animate-card-in opacity-0">
            {s.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.image_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-50">
                <ImageIcon className="w-5 h-5 text-gray-300" />
              </div>
            )}
            <div className="absolute top-1 right-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white shadow">
              <Bookmark className="w-2.5 h-2.5 fill-current" />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function TopicFilter({
  topics, selectedId, onSelect, ko, allLabel,
}: {
  topics: TopicSummary[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  ko: boolean
  allLabel: string
}) {
  const totalCount = topics.reduce((s, t) => s + t.count, 0)
  return (
    <div className="-mx-5 overflow-x-auto scrollbar-hide">
      <div className="flex gap-2 pl-5 pr-5 pb-1">
        <FilterChip active={selectedId === null} onClick={() => onSelect(null)}>
          {allLabel} <span className="opacity-60 tabular-nums">{totalCount}</span>
        </FilterChip>
        {topics.map(t => (
          <FilterChip key={t.id} active={selectedId === t.id} onClick={() => onSelect(t.id)}>
            {ko ? t.name_ko : t.name_en} <span className="opacity-60 tabular-nums">{t.count}</span>
          </FilterChip>
        ))}
      </div>
    </div>
  )
}

function FilterChip({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button" onClick={onClick}
      className={`whitespace-nowrap inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-[12.5px] font-medium transition ${
        active
          ? 'bg-gray-900 text-white'
          : 'bg-white ring-1 ring-gray-200 text-gray-700 hover:bg-gray-50'
      }`}
    >{children}</button>
  )
}

function NotebookEntryCard({ entry, index, ko }: { entry: Entry; index: number; ko: boolean }) {
  const { t } = useTranslation()
  const [note, setNote] = useState(entry.note)
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [expanded, setExpanded] = useState(false)
  const topicName = entry.topic
    ? (ko ? entry.topic.name_ko : entry.topic.name_en)
    : entry.topic_freeform
      ? entry.topic_freeform.slice(0, 60)
      : '—'

  // Debounced auto-save: 1s after the last keystroke.
  useEffect(() => {
    if (note === entry.note) return
    setSaving('saving')
    const id = setTimeout(async () => {
      try {
        const headers = await authHeaders()
        const res = await fetch('/api/study/wrong-notebook/note', {
          method: 'POST',
          headers,
          body: JSON.stringify({ attemptId: entry.attempt_id, note }),
        })
        if (!res.ok) throw new Error()
        setSaving('saved')
        const fade = setTimeout(() => setSaving('idle'), 1500)
        return () => clearTimeout(fade)
      } catch {
        setSaving('idle')
      }
    }, 1000)
    return () => clearTimeout(id)
  }, [note, entry.attempt_id, entry.note])

  return (
    <li className="rounded-2xl bg-white ring-1 ring-gray-200/70 shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <span className="flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-lg bg-rose-50 ring-1 ring-rose-100 text-rose-700 text-[11px] font-bold tabular-nums">
            {index}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-[0.10em] text-gray-500 mb-1">
              {topicName}
            </div>
            <p className={`text-[13.5px] text-gray-900 leading-relaxed ${expanded ? '' : 'line-clamp-3'}`}>
              {entry.question.prompt}
            </p>
            {entry.question.prompt.length > 160 && (
              <button type="button" onClick={() => setExpanded(v => !v)}
                className="text-[11px] text-gray-500 hover:text-gray-800 mt-1 inline-flex items-center gap-0.5">
                {expanded ? t('study.wrongNotebook.showLess') : t('study.wrongNotebook.showMore')}<ChevronRight className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`} />
              </button>
            )}
          </div>
        </div>

        <div className="mt-3 space-y-1.5 text-[12.5px]">
          <div className="flex items-start gap-2">
            <XCircle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0 mt-0.5" />
            <span className="text-rose-700 line-through flex-1 break-words">{entry.student_answer || '—'}</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <span className="text-emerald-700 font-semibold flex-1 break-words">{entry.question.correct_answer}</span>
          </div>
        </div>

        {entry.ai_explanation && (
          <div className="mt-3 rounded-lg bg-indigo-50/50 ring-1 ring-indigo-100 px-3 py-2 text-[12px] text-gray-700 leading-relaxed">
            <span className="font-medium text-indigo-700">{t('study.wrongNotebook.explanationLabel')}: </span>{entry.ai_explanation}
          </div>
        )}
      </div>

      {/* Note editor */}
      <div className="border-t border-gray-100 bg-gray-50/60 px-4 py-3">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-[0.10em] text-gray-600 inline-flex items-center gap-1.5">
            <Pencil className="w-3 h-3" />{t('study.wrongNotebook.myNoteLabel')}
          </label>
          <span className={`text-[10px] font-medium transition-opacity ${saving === 'idle' ? 'opacity-0' : 'opacity-100'} ${saving === 'saved' ? 'text-emerald-600' : 'text-gray-500'}`}>
            {saving === 'saving' ? t('study.wrongNotebook.saving') : saving === 'saved' ? t('study.wrongNotebook.saved') : ''}
          </span>
        </div>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder={String(t('study.wrongNotebook.notePlaceholder'))}
          rows={2}
          className="w-full rounded-lg bg-white ring-1 ring-gray-200 px-3 py-2 text-[13px] text-gray-900 leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
        />
      </div>
    </li>
  )
}
