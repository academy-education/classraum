"use client"

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Library as LibraryIcon, ListChecks, Layers, ClipboardList, ChevronDown, ChevronRight, Search, X, ArrowRight, Check } from '@/app/mobile/study/_shared/icons'
import { StudyPageHeader, StudyScrollShell, StudyEmptyState, StudyPager, StudyFilterChip } from '../_shared/primitives'
import { studyButtonClass } from '../_shared/StudyButton'
import { SkeletonRowList } from '../skeletons'
import { authHeaders } from '@/lib/auth-headers'
import { useTranslation } from '@/hooks/useTranslation'
import { StudySubscriptionGate } from '../SubscriptionGate'

/**
 * /mobile/study/library — browse the whole verified SAT bank, not just
 * what a session happens to draw. Three tabs mirror the study modes:
 *   • Practice   — every bank question (paginated, domain-filterable);
 *                  tap a card to reveal the answer + explanation.
 *   • Flashcards — every bank card for the section (front/back/hint).
 *   • Full tests — links to the student's mock-test history + a start.
 *
 * Section (Math / Reading & Writing) is a top toggle. Reads ?section and
 * ?tab from the entry point so the test-prep page can deep-link. Same
 * shell, chips, search, and pagination as the sessions / tests pages.
 */

type Section = 'math' | 'reading_writing'
type Tab = 'practice' | 'flashcards' | 'full_test'

interface PracticeItem {
  id: string; prompt: string; choices: string[]; correct_answer: string
  explanation: string; domain: string | null; difficulty: string | null
}
interface FlashItem { front: string; back: string; hint: string | null; domain: string | null; difficulty: string | null }

export default function StudyLibraryPage() {
  return (
    <StudySubscriptionGate>
      <Suspense fallback={null}>
        <LibraryInner />
      </Suspense>
    </StudySubscriptionGate>
  )
}

function LibraryInner() {
  const { t, language } = useTranslation()
  const ko = language === 'korean'
  const params = useSearchParams()

  const initialSection: Section = params.get('section') === 'math' ? 'math' : 'reading_writing'
  const initialTab: Tab = (['practice', 'flashcards', 'full_test'] as const).includes(params.get('tab') as Tab)
    ? (params.get('tab') as Tab) : 'practice'

  const [section, setSection] = useState<Section>(initialSection)
  const [tab, setTab] = useState<Tab>(initialTab)

  return (
    <StudyScrollShell
      header={
        <StudyPageHeader
          backHref="/mobile/study"
          backLabel={String(t('study.topic.backToStudy'))}
          icon={LibraryIcon}
          iconColorClass="text-primary bg-primary/10"
          eyebrow={ko ? 'SAT · 문제 은행' : 'SAT · Question bank'}
          title={ko ? '라이브러리' : 'Library'}
          subtitle={ko ? '모든 연습 문제·플래시카드·모의고사를 둘러보세요.' : 'Browse every practice question, flashcard, and mock test.'}
        />
      }
    >
      {/* Section toggle */}
      <div className="grid grid-cols-2 gap-2">
        {(['reading_writing', 'math'] as Section[]).map(s => {
          const active = section === s
          return (
            <button key={s} type="button" onClick={() => setSection(s)}
              className={`h-10 rounded-xl text-[13px] font-semibold transition ${
                active ? 'bg-primary text-white shadow-[0_2px_8px_-2px_rgba(40,133,232,0.4)]' : 'bg-white ring-1 ring-gray-200/70 text-gray-700 hover:bg-gray-50'
              }`}>
              {s === 'math' ? (ko ? '수학' : 'Math') : (ko ? '읽기·쓰기' : 'Reading & Writing')}
            </button>
          )
        })}
      </div>

      {/* Tab chips */}
      <div className="-mx-5 overflow-x-auto scrollbar-hide">
        <div className="flex gap-2 pl-5 pr-5 pt-1 pb-1">
          {([
            { key: 'practice', label: ko ? '연습 문제' : 'Practice', Icon: ListChecks },
            { key: 'flashcards', label: ko ? '플래시카드' : 'Flashcards', Icon: Layers },
            { key: 'full_test', label: ko ? '모의고사' : 'Full tests', Icon: ClipboardList },
          ] as { key: Tab; label: string; Icon: typeof ListChecks }[]).map(({ key, label, Icon }) => (
            <StudyFilterChip key={key} label={label} icon={Icon} active={tab === key} onClick={() => setTab(key)} />
          ))}
        </div>
      </div>

      {tab === 'practice' && <PracticeBrowser section={section} ko={ko} />}
      {tab === 'flashcards' && <FlashcardBrowser section={section} ko={ko} />}
      {tab === 'full_test' && <FullTestPanel section={section} ko={ko} />}
    </StudyScrollShell>
  )
}

// ── Practice ─────────────────────────────────────────────────────────
function PracticeBrowser({ section, ko }: { section: Section; ko: boolean }) {
  const [items, setItems] = useState<PracticeItem[]>([])
  const [domains, setDomains] = useState<string[]>([])
  const [domain, setDomain] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => { setPage(0); setDomain(null) }, [section])

  useEffect(() => {
    let cancelled = false
    setLoading(true); setFailed(false)
    void (async () => {
      try {
        const headers = await authHeaders()
        const qs = new URLSearchParams({ section, type: 'practice', page: String(page) })
        if (domain) qs.set('domain', domain)
        const res = await fetch(`/api/study/bank/browse?${qs.toString()}`, { headers })
        if (!res.ok) throw new Error()
        const json = await res.json()
        if (cancelled) return
        setItems(json.items ?? [])
        setTotal(json.total ?? 0)
        setPageSize(json.pageSize ?? 20)
        setDomains(json.domains ?? [])
      } catch { if (!cancelled) setFailed(true) }
      finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [section, page, domain])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="space-y-4">
      {domains.length > 0 && (
        <div className="-mx-5 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 pl-5 pr-5 pt-1 pb-1">
            <StudyFilterChip label={ko ? '전체' : 'All'} active={domain === null} onClick={() => { setDomain(null); setPage(0) }} />
            {domains.map(d => <StudyFilterChip key={d} label={d} active={domain === d} onClick={() => { setDomain(d); setPage(0) }} />)}
          </div>
        </div>
      )}

      {loading ? (
        <SkeletonRowList count={6} />
      ) : failed ? (
        <ErrorCard ko={ko} />
      ) : items.length === 0 ? (
        <div className="rounded-2xl bg-white ring-1 ring-gray-200/70">
          <StudyEmptyState icon={ListChecks} iconColorClass="text-primary bg-primary/10"
            headline={ko ? '문제가 없어요' : 'No questions'}
            body={ko ? '이 영역에는 아직 문제가 없습니다.' : 'No questions in this filter yet.'} />
        </div>
      ) : (
        <>
          <ol className="space-y-2.5">
            {items.map((it, i) => <PracticeCard key={it.id} item={it} ko={ko} index={i} />)}
          </ol>
          <StudyPager page={page} totalPages={totalPages} total={total} ko={ko} onPrev={() => setPage(p => Math.max(0, p - 1))} onNext={() => setPage(p => Math.min(totalPages - 1, p + 1))} />
        </>
      )}
    </div>
  )
}

function PracticeCard({ item, ko, index }: { item: PracticeItem; ko: boolean; index: number }) {
  const [open, setOpen] = useState(false)
  const paras = item.prompt.split(/\n{2,}/).filter(Boolean)
  return (
    <li style={{ animationDelay: `${Math.min(index, 10) * 35}ms` }}
      className="animate-card-in opacity-0 rounded-2xl bg-white ring-1 ring-gray-200/70 overflow-hidden">
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full text-left p-4">
        <div className="flex items-center gap-2 mb-2">
          {item.domain && <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-600 text-[10.5px] font-semibold px-2 py-0.5">{item.domain}</span>}
          {item.difficulty && <DifficultyPill d={item.difficulty} ko={ko} />}
          <ChevronDown className={`w-4 h-4 text-gray-400 ml-auto transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
        <div className="text-[13.5px] text-gray-900 leading-relaxed space-y-1.5">
          {paras.map((p, i) => <p key={i} className={i > 0 ? 'indent-4' : ''}>{p}</p>)}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-1.5">
          {item.choices.map((c, i) => {
            const isAns = c === item.correct_answer
            return (
              <div key={i} className={`flex items-start gap-2 rounded-xl px-3 py-2 text-[13px] ring-1 ${isAns ? 'bg-emerald-50 ring-emerald-200 text-emerald-900 font-medium' : 'bg-gray-50 ring-gray-200/70 text-gray-700'}`}>
                <span className="flex-shrink-0 font-bold tabular-nums">{String.fromCharCode(65 + i)}.</span>
                <span className="flex-1">{c}</span>
                {isAns && <Check className="w-4 h-4 flex-shrink-0 text-emerald-600" />}
              </div>
            )
          })}
          {item.explanation && (
            <div className="mt-2 rounded-xl bg-primary/[0.04] ring-1 ring-primary/10 px-3 py-2.5">
              <p className="text-[10.5px] font-bold uppercase tracking-wide text-primary/70 mb-1">{ko ? '해설' : 'Explanation'}</p>
              <p className="text-[12.5px] text-gray-700 leading-relaxed">{item.explanation}</p>
            </div>
          )}
        </div>
      )}
    </li>
  )
}

// ── Flashcards ───────────────────────────────────────────────────────
function FlashcardBrowser({ section, ko }: { section: Section; ko: boolean }) {
  const [items, setItems] = useState<FlashItem[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true); setFailed(false); setQuery('')
    void (async () => {
      try {
        const headers = await authHeaders()
        const res = await fetch(`/api/study/bank/browse?section=${section}&type=flashcards`, { headers })
        if (!res.ok) throw new Error()
        const json = await res.json()
        if (!cancelled) setItems(json.items ?? [])
      } catch { if (!cancelled) setFailed(true) }
      finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [section])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(c => `${c.front} ${c.back} ${c.domain ?? ''}`.toLowerCase().includes(q))
  }, [items, query])

  if (loading) return <SkeletonRowList count={6} />
  if (failed) return <ErrorCard ko={ko} />
  if (items.length === 0) {
    return (
      <div className="rounded-2xl bg-white ring-1 ring-gray-200/70">
        <StudyEmptyState icon={Layers} iconColorClass="text-primary bg-primary/10"
          headline={ko ? '플래시카드가 없어요' : 'No flashcards'}
          body={section === 'math'
            ? (ko ? '수학 플래시카드는 아직 준비 중이에요.' : 'Math flashcards are not available yet.')
            : (ko ? '이 영역의 플래시카드가 아직 없어요.' : 'No flashcards for this section yet.')} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <label className="relative block">
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input type="text" value={query} onChange={e => setQuery(e.target.value)}
          placeholder={ko ? '카드 검색' : 'Search cards'}
          className="w-full h-11 pl-10 pr-10 rounded-2xl bg-white ring-1 ring-gray-200/70 text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40 transition" />
        {query && (
          <button type="button" onClick={() => setQuery('')} aria-label={ko ? '지우기' : 'Clear'}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 inline-flex items-center justify-center rounded-full hover:bg-gray-100 transition">
            <X className="w-3.5 h-3.5 text-gray-500" />
          </button>
        )}
      </label>
      <p className="text-[12px] text-gray-500 px-1">{ko ? `${filtered.length}개 카드` : `${filtered.length} cards`}</p>
      <ol className="space-y-2.5">
        {filtered.map((c, i) => (
          <li key={i} style={{ animationDelay: `${Math.min(i, 10) * 35}ms` }}
            className="animate-card-in opacity-0 rounded-2xl bg-white ring-1 ring-gray-200/70 p-4">
            <div className="flex items-center gap-2 mb-1.5">
              {c.domain && <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-600 text-[10.5px] font-semibold px-2 py-0.5">{c.domain}</span>}
              {c.difficulty && <DifficultyPill d={c.difficulty} ko={ko} />}
            </div>
            <p className="text-[14px] font-semibold text-gray-900 leading-snug">{c.front}</p>
            <p className="mt-1.5 text-[13px] text-gray-600 leading-relaxed">{c.back}</p>
            {c.hint && <p className="mt-1.5 text-[11.5px] text-gray-400 italic">{ko ? '힌트' : 'Hint'}: {c.hint}</p>}
          </li>
        ))}
      </ol>
    </div>
  )
}

// ── Full tests ───────────────────────────────────────────────────────
function FullTestPanel({ section, ko }: { section: Section; ko: boolean }) {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-white ring-1 ring-gray-200/70 p-5">
        <div className="flex items-start gap-3">
          <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ClipboardList className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-gray-900">{ko ? '전체 모의고사' : 'Full-length mock tests'}</p>
            <p className="text-[12.5px] text-gray-500 leading-snug mt-0.5">
              {ko ? '적응형 디지털 SAT를 실전처럼 — 모듈 2개, 자동 채점.' : 'Adaptive Digital SAT under real conditions — 2 modules, auto-scored.'}
            </p>
          </div>
        </div>
        <Link href={`/mobile/study/topic/${section === 'math' ? 'sat-math' : 'sat-reading-writing'}`}
          className={studyButtonClass({ variant: 'primary', fullWidth: true, className: 'mt-4' })}>
          {ko ? '모의고사 시작' : 'Start a full test'}<ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      <Link href="/mobile/study/tests"
        className="flex items-center gap-3 rounded-2xl bg-white ring-1 ring-gray-200/70 p-4 hover:ring-primary/30 transition">
        <span className="flex-shrink-0 w-9 h-9 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center"><ClipboardList className="w-4 h-4" /></span>
        <span className="flex-1 text-[13.5px] font-medium text-gray-800">{ko ? '내 모의고사 기록 보기' : 'View my mock-test history'}</span>
        <ChevronRight className="w-4 h-4 text-gray-400" />
      </Link>
    </div>
  )
}

// ── Small shared bits ────────────────────────────────────────────────
function DifficultyPill({ d, ko }: { d: string; ko: boolean }) {
  const key = d.toLowerCase()
  const cls = key === 'hard' ? 'bg-rose-50 text-rose-700' : key === 'medium' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
  const label = key === 'hard' ? (ko ? '어려움' : 'Hard') : key === 'medium' ? (ko ? '보통' : 'Medium') : (ko ? '쉬움' : 'Easy')
  return <span className={`inline-flex items-center rounded-full text-[10.5px] font-semibold px-2 py-0.5 ${cls}`}>{label}</span>
}

function ErrorCard({ ko }: { ko: boolean }) {
  return (
    <div className="rounded-2xl bg-white ring-1 ring-gray-200/70 px-5 py-10 text-center">
      <p className="text-[13.5px] text-gray-600">{ko ? '불러오지 못했어요.' : "Couldn't load the bank."}</p>
    </div>
  )
}
