"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, BookOpen, Printer, CheckCircle2, XCircle, Pencil, Sparkles, ChevronRight, Bookmark, Image as ImageIcon } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { authHeaders } from '@/lib/auth-headers'
import { StudySubscriptionGate } from '../SubscriptionGate'
import { StudySubPageHeader, StudyEmptyState, StudyPageTransition } from '../_shared/primitives'
import { groupByDate } from '../_shared/dateGroups'
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
  reviewed_at: string | null
  difficulty: string | null
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

type SortKey = 'newest' | 'oldest' | 'hardest'
type DifficultyKey = 'all' | 'easy' | 'medium' | 'hard'

function WrongNotebookInner() {
  const { t, language } = useTranslation()
  const ko = language === 'korean'
  const [entries, setEntries] = useState<Entry[]>([])
  const [topics, setTopics] = useState<TopicSummary[]>([])
  const [bookmarkedSnaps, setBookmarkedSnaps] = useState<BookmarkedSnap[]>([])
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null)
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyKey>('all')
  const [sortKey, setSortKey] = useState<SortKey>('newest')
  const [showReviewed, setShowReviewed] = useState(false)
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

  // Optimistic reviewed toggle — persist to server in the background.
  const toggleReviewed = useCallback(async (attemptId: string, next: boolean) => {
    setEntries(prev => prev.map(e =>
      e.attempt_id === attemptId
        ? { ...e, reviewed_at: next ? new Date().toISOString() : null }
        : e
    ))
    try {
      const headers = await authHeaders()
      await fetch('/api/study/wrong-notebook/reviewed', {
        method: 'POST', headers,
        body: JSON.stringify({ attemptId, reviewed: next }),
      })
    } catch { /* server will resync on next load; UI stays optimistic */ }
  }, [])

  const activeEntries = entries.filter(e => e.reviewed_at === null)
  const reviewedEntries = entries.filter(e => e.reviewed_at !== null)

  const filterByDifficulty = (list: Entry[]) => difficultyFilter === 'all'
    ? list
    : list.filter(e => (e.difficulty ?? '').toLowerCase() === difficultyFilter)

  const difficultyRank = (d: string | null): number => {
    switch ((d ?? '').toLowerCase()) {
      case 'hard': return 3
      case 'medium': return 2
      case 'easy': return 1
      default: return 0
    }
  }
  const sortEntries = (list: Entry[]): Entry[] => {
    const copy = [...list]
    if (sortKey === 'oldest') {
      copy.sort((a, b) => new Date(a.attempted_at).getTime() - new Date(b.attempted_at).getTime())
    } else if (sortKey === 'hardest') {
      copy.sort((a, b) => difficultyRank(b.difficulty) - difficultyRank(a.difficulty)
        || new Date(b.attempted_at).getTime() - new Date(a.attempted_at).getTime())
    }
    return copy
  }

  const visibleActive = sortEntries(filterByDifficulty(activeEntries))
  const visibleReviewed = sortEntries(filterByDifficulty(reviewedEntries))

  const difficultyCounts: Record<DifficultyKey, number> = {
    all: activeEntries.length,
    easy: activeEntries.filter(e => (e.difficulty ?? '').toLowerCase() === 'easy').length,
    medium: activeEntries.filter(e => (e.difficulty ?? '').toLowerCase() === 'medium').length,
    hard: activeEntries.filter(e => (e.difficulty ?? '').toLowerCase() === 'hard').length,
  }

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
          subtitle={ko
            ? `틀린 문제 ${entries.length}개를 다시 풀어보고 메모를 남겨보세요.`
            : `Revisit ${entries.length} wrong answers and jot down what tripped you up.`}
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

        {/* Topic filter — horizontal chip row. No StudyPageTransition
            wrapper: it collapses space-y-6 into one child, so all
            sub-sections would stack tightly. Direct children of the
            outer container keep proper 24px gaps between them. */}
        {topics.length > 0 && (
          <TopicFilter
            topics={topics}
            selectedId={selectedTopicId}
            onSelect={setSelectedTopicId}
            ko={ko}
            allLabel={String(t('study.wrongNotebook.allTopics'))}
          />
        )}

        <StudyPageTransition>
          {/* Annotated count chip (only when > 0). */}
          {annotated > 0 && (
            <div className="flex items-center gap-2 text-[12px] text-gray-700 mb-6">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 ring-1 ring-indigo-100">
                <Pencil className="w-3.5 h-3.5 text-indigo-500" />
                <span className="font-semibold tabular-nums">{annotated}</span> {t('study.wrongNotebook.annotatedSuffix')}
              </span>
            </div>
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
                <>
                  {/* Difficulty filter chips + sort dropdown row. */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex gap-1.5">
                      {([
                        { key: 'all', label: ko ? '전체' : 'All' },
                        { key: 'easy', label: ko ? '쉬움' : 'Easy' },
                        { key: 'medium', label: ko ? '보통' : 'Medium' },
                        { key: 'hard', label: ko ? '어려움' : 'Hard' },
                      ] as Array<{ key: DifficultyKey; label: string }>).map(item => {
                        const active = difficultyFilter === item.key
                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => setDifficultyFilter(item.key)}
                            className={`whitespace-nowrap inline-flex items-center gap-1 px-2.5 h-7 rounded-full text-[11.5px] font-medium transition ${
                              active
                                ? 'bg-gray-900 text-white'
                                : 'bg-white ring-1 ring-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {item.label}
                            <span className="opacity-60 tabular-nums">{difficultyCounts[item.key]}</span>
                          </button>
                        )
                      })}
                    </div>
                    <select
                      value={sortKey}
                      onChange={e => setSortKey(e.target.value as SortKey)}
                      className="h-7 rounded-full bg-white ring-1 ring-gray-200 text-[11.5px] font-medium text-gray-700 pl-2.5 pr-2 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <option value="newest">{ko ? '최신순' : 'Newest'}</option>
                      <option value="oldest">{ko ? '오래된순' : 'Oldest'}</option>
                      <option value="hardest">{ko ? '어려운순' : 'Hardest'}</option>
                    </select>
                  </div>

                  {visibleActive.length > 0 && (
                    <div className="space-y-6">
                      {(() => {
                        let indexOffset = 0
                        return groupByDate(visibleActive, e => e.attempted_at).map(group => {
                          const startIdx = indexOffset
                          indexOffset += group.rows.length
                          return (
                            <section key={group.bucket.key === 'earlier' ? `e:${group.bucket.monthKey}` : group.bucket.key}>
                              <h3 className="text-[11px] font-bold uppercase tracking-[0.10em] text-gray-500 mb-2 px-1">
                                {group.bucket.label(ko)}
                              </h3>
                              <ol className="space-y-3">
                                {group.rows.map((e, i) => (
                                  <div key={e.attempt_id} style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }} className="animate-card-in opacity-0">
                                    <NotebookEntryCard entry={e} index={startIdx + i + 1} ko={ko} onToggleReviewed={toggleReviewed} />
                                  </div>
                                ))}
                              </ol>
                            </section>
                          )
                        })
                      })()}
                    </div>
                  )}

                  {visibleActive.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-5 py-10 text-center">
                      <p className="text-[13.5px] text-gray-500">
                        {ko ? '해당 조건의 문제가 없어요' : 'No entries match this filter'}
                      </p>
                    </div>
                  )}

                  {visibleReviewed.length > 0 && (
                    <details className="rounded-2xl bg-white ring-1 ring-gray-200 open:ring-primary/40 transition-all">
                      <summary
                        onClick={() => setShowReviewed(v => !v)}
                        className="cursor-pointer flex items-center justify-between px-4 py-3 select-none"
                      >
                        <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-gray-800">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                          {ko ? `복습 완료 ${visibleReviewed.length}개` : `Reviewed · ${visibleReviewed.length}`}
                        </span>
                        <span className="text-[11px] text-gray-500">
                          {showReviewed ? (ko ? '숨기기' : 'Hide') : (ko ? '보기' : 'Show')}
                        </span>
                      </summary>
                      <ol className="px-4 pb-4 space-y-3">
                        {visibleReviewed.map((e, i) => (
                          <NotebookEntryCard key={e.attempt_id} entry={e} index={i + 1} ko={ko} onToggleReviewed={toggleReviewed} />
                        ))}
                      </ol>
                    </details>
                  )}
                </>
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
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[13px] font-semibold text-gray-900 inline-flex items-center gap-1.5">
          <Bookmark className="w-3.5 h-3.5 text-amber-600 fill-amber-600" />
          {ko ? '북마크한 사진' : 'Bookmarked snaps'}
        </h2>
        <span className="text-[11px] text-gray-500 font-normal tabular-nums">
          {snaps.length}{ko ? '개' : ''}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {snaps.map((s, i) => (
          <div key={s.id}
            style={{ animationDelay: `${i * 40}ms` }}
            className="relative rounded-2xl overflow-hidden ring-1 ring-gray-200 bg-white aspect-square animate-card-in opacity-0">
            {s.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.image_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-50">
                <ImageIcon className="w-5 h-5 text-gray-300" />
              </div>
            )}
            <div className="absolute top-1.5 right-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white shadow-sm">
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

function NotebookEntryCard({ entry, index, ko, onToggleReviewed }: {
  entry: Entry
  index: number
  ko: boolean
  onToggleReviewed?: (attemptId: string, next: boolean) => void
}) {
  const { t } = useTranslation()
  const [note, setNote] = useState(entry.note)
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [expanded, setExpanded] = useState(false)
  const reviewed = entry.reviewed_at !== null
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
          <span className={`flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-lg text-[11px] font-bold tabular-nums ring-1 ${
            reviewed
              ? 'bg-emerald-50 ring-emerald-100 text-emerald-700'
              : 'bg-rose-50 ring-rose-100 text-rose-700'
          }`}>
            {index}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="text-[10px] font-semibold uppercase tracking-[0.10em] text-gray-500 flex-1 truncate">
                {topicName}
              </div>
              {entry.difficulty && (
                <span className={`text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                  entry.difficulty.toLowerCase() === 'hard'
                    ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                    : entry.difficulty.toLowerCase() === 'medium'
                      ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                      : 'bg-gray-50 text-gray-600 ring-1 ring-gray-200'
                }`}>
                  {entry.difficulty}
                </span>
              )}
              {onToggleReviewed && (
                <button
                  type="button"
                  onClick={() => onToggleReviewed(entry.attempt_id, !reviewed)}
                  aria-pressed={reviewed}
                  aria-label={reviewed ? (ko ? '복습 완료 취소' : 'Mark as not reviewed') : (ko ? '복습 완료로 표시' : 'Mark as reviewed')}
                  className={`inline-flex items-center gap-1 h-6 px-2 rounded-full text-[10px] font-semibold transition-all ${
                    reviewed
                      ? 'bg-emerald-50 ring-1 ring-emerald-200 text-emerald-700 hover:bg-emerald-100'
                      : 'bg-white ring-1 ring-gray-200 text-gray-500 hover:ring-emerald-300 hover:text-emerald-700'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  {reviewed ? (ko ? '완료' : 'Reviewed') : (ko ? '완료로 표시' : 'Mark reviewed')}
                </button>
              )}
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
