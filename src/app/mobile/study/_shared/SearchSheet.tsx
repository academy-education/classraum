"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, X, BookOpen, Camera, AlertCircle, Compass, Loader2 } from '@/app/mobile/study/_shared/icons'
import { authHeaders } from '@/lib/auth-headers'
import { useTranslation } from '@/hooks/useTranslation'

/**
 * SearchSheet — universal-search full-screen overlay across topics,
 * sessions, snaps, and wrong-answer entries.
 *
 * Triggered from a search icon in the study landing header. 250ms
 * debounced GET /api/study/search?q=, results grouped by type. Tap a
 * result → close + navigate.
 */

interface SearchResults {
  topics: Array<{ id: string; slug: string; name: string; category: string }>
  sessions: Array<{ id: string; title: string; mode: string; topic_slug: string | null; last_active_at: string }>
  snaps: Array<{ id: string; ocr_text: string; subject_guess: string; created_at: string }>
  mistakes: Array<{ attempt_id: string; prompt: string; topic_slug: string | null; created_at: string }>
}

const EMPTY: SearchResults = { topics: [], sessions: [], snaps: [], mistakes: [] }

export function SearchSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const { t, language } = useTranslation()
  const ko = language === 'korean'
  const [q, setQ] = useState('')
  const [results, setResults] = useState<SearchResults>(EMPTY)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus the input + lock body scroll when the sheet opens.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    setTimeout(() => inputRef.current?.focus(), 120)
    return () => { document.body.style.overflow = prev }
  }, [open])

  // Reset state when the sheet closes (so reopening is a clean slate).
  useEffect(() => {
    if (open) return
    setQ('')
    setResults(EMPTY)
    setLoading(false)
  }, [open])

  // 250ms debounced search. Empty/short queries return cleared state.
  useEffect(() => {
    if (!open) return
    if (q.trim().length < 2) { setResults(EMPTY); setLoading(false); return }
    setLoading(true)
    const handle = setTimeout(async () => {
      try {
        const headers = await authHeaders()
        const res = await fetch(`/api/study/search?q=${encodeURIComponent(q.trim())}`, { headers })
        if (!res.ok) throw new Error()
        const json = await res.json() as SearchResults
        setResults(json)
      } catch {
        setResults(EMPTY)
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => clearTimeout(handle)
  }, [q, open])

  // ESC closes.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const go = useCallback((href: string) => {
    onClose()
    router.push(href)
  }, [onClose, router])

  if (!open) return null

  const totalResults =
    results.topics.length + results.sessions.length + results.snaps.length + results.mistakes.length
  const showEmptyHint = q.trim().length >= 2 && !loading && totalResults === 0
  const showStartHint = q.trim().length < 2 && !loading

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] bg-white flex flex-col animate-in fade-in duration-200"
    >
      {/* Search input */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 h-11 px-3 rounded-xl bg-gray-100">
            <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <input
              ref={inputRef}
              type="search"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder={ko ? '주제, 세션, 사진, 오답 검색…' : 'Search topics, sessions, snaps, mistakes…'}
              className="flex-1 bg-transparent outline-none text-[14px] text-gray-900 placeholder:text-gray-400"
              autoComplete="off"
              spellCheck={false}
            />
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
          </div>
          <button type="button" onClick={onClose}
            aria-label={ko ? '닫기' : 'Close'}
            className="inline-flex items-center justify-center w-10 h-10 rounded-full text-gray-600 hover:bg-gray-100 transition">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {showStartHint && (
          <div className="py-16 px-6 text-center">
            <Search className="w-7 h-7 text-gray-300 mx-auto mb-3" />
            <p className="text-[14px] font-medium text-gray-900">
              {ko ? '무엇을 찾고 있나요?' : 'What are you looking for?'}
            </p>
            <p className="text-[12px] text-gray-500 mt-1.5 max-w-xs mx-auto leading-relaxed">
              {ko ? '주제 이름, 세션 제목, 찍은 문제, 틀린 문제 모두 검색할 수 있어요.' : 'Search topics, recent sessions, snaps, and wrong-answer entries.'}
            </p>
          </div>
        )}

        {showEmptyHint && (
          <div className="py-16 px-6 text-center">
            <AlertCircle className="w-7 h-7 text-gray-300 mx-auto mb-3" />
            <p className="text-[14px] font-medium text-gray-900">
              {ko ? '결과 없음' : 'No matches'}
            </p>
            <p className="text-[12px] text-gray-500 mt-1.5">
              &quot;{q}&quot;
            </p>
          </div>
        )}

        {totalResults > 0 && (
          <div className="px-3 py-3 space-y-4">
            {results.topics.length > 0 && (
              <ResultGroup label={ko ? '주제' : 'Topics'} icon={Compass}>
                {results.topics.map((t, i) => (
                  <ResultRow key={t.id} delay={i * 30}
                    onClick={() => go(`/mobile/study/topic/${t.slug}`)}
                    icon={Compass} accent="text-primary"
                    title={t.name}
                    sub={t.category === 'test_prep' ? (ko ? '시험 대비' : 'Test prep') : (ko ? '과목' : 'Subject')}
                    highlight={q} />
                ))}
              </ResultGroup>
            )}
            {results.sessions.length > 0 && (
              <ResultGroup label={ko ? '내 세션' : 'My sessions'} icon={BookOpen}>
                {results.sessions.map((s, i) => (
                  <ResultRow key={s.id} delay={(results.topics.length + i) * 30}
                    onClick={() => go(`/mobile/study/session/${s.id}`)}
                    icon={BookOpen} accent="text-violet-600"
                    title={s.title || (ko ? '제목 없음' : 'Untitled')}
                    sub={String(t(`study.modes.${s.mode}.title`)) + (s.last_active_at ? ` · ${formatAgo(s.last_active_at, ko)}` : '')}
                    highlight={q} />
                ))}
              </ResultGroup>
            )}
            {results.snaps.length > 0 && (
              <ResultGroup label={ko ? '사진 풀이' : 'Snap captures'} icon={Camera}>
                {results.snaps.map((s, i) => (
                  <ResultRow key={s.id} delay={(results.topics.length + results.sessions.length + i) * 30}
                    onClick={() => go('/mobile/study/snap')}
                    icon={Camera} accent="text-amber-600"
                    title={s.ocr_text.slice(0, 80)}
                    sub={`${s.subject_guess} · ${formatAgo(s.created_at, ko)}`}
                    highlight={q} />
                ))}
              </ResultGroup>
            )}
            {results.mistakes.length > 0 && (
              <ResultGroup label={ko ? '오답' : 'Mistakes'} icon={AlertCircle}>
                {results.mistakes.map((m, i) => (
                  <ResultRow key={m.attempt_id} delay={(results.topics.length + results.sessions.length + results.snaps.length + i) * 30}
                    onClick={() => go('/mobile/study/wrong-notebook')}
                    icon={AlertCircle} accent="text-rose-600"
                    title={m.prompt.slice(0, 80)}
                    sub={formatAgo(m.created_at, ko)}
                    highlight={q} />
                ))}
              </ResultGroup>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ResultGroup({ label, icon: Icon, children }: { label: string; icon: typeof Search; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="px-2 mb-1.5 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">
        <Icon className="w-3 h-3" />{label}
      </h3>
      <div className="space-y-1">{children}</div>
    </section>
  )
}

function ResultRow({ onClick, icon: Icon, accent, title, sub, highlight, delay }: {
  onClick: () => void
  icon: typeof Search
  accent: string
  title: string
  sub: string
  highlight: string
  delay: number
}) {
  return (
    <button type="button" onClick={onClick}
      style={{ animationDelay: `${delay}ms` }}
      className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl hover:bg-gray-50 active:scale-[0.99] transition-all text-left animate-card-in opacity-0">
      <div className={`flex-shrink-0 w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center ${accent}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] text-gray-900 truncate">
          <Highlighted text={title} query={highlight} />
        </div>
        <div className="text-[11px] text-gray-500 truncate mt-0.5">{sub}</div>
      </div>
    </button>
  )
}

/** Bold the matched substring in result titles for scannability. */
function Highlighted({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>
  const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig')
  const parts = text.split(re)
  return (
    <>
      {parts.map((p, i) =>
        re.test(p)
          ? <span key={i} className="font-semibold text-primary">{p}</span>
          : <span key={i}>{p}</span>
      )}
    </>
  )
}

function formatAgo(iso: string, ko: boolean): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime())
  const min = Math.floor(diff / 60_000)
  const hr = Math.floor(diff / 3_600_000)
  const day = Math.floor(diff / 86_400_000)
  if (day >= 1) return ko ? `${day}일 전` : `${day}d ago`
  if (hr >= 1) return ko ? `${hr}시간 전` : `${hr}h ago`
  if (min >= 1) return ko ? `${min}분 전` : `${min}m ago`
  return ko ? '방금' : 'now'
}
