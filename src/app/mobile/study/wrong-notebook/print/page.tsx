"use client"

import { Suspense, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Loader2, ArrowLeft } from '@/app/mobile/study/_shared/icons'
import { authHeaders } from '@/lib/auth-headers'
import { useTranslation } from '@/hooks/useTranslation'

/**
 * /mobile/study/wrong-notebook/print — printable HTML view of the
 * 오답노트. Opens in a new tab; the student uses the browser's
 * built-in "Save as PDF" or "Print" dialog to export.
 *
 * Chose browser-native printing over server-side puppeteer because
 * the latter triples cold-start size and the UX (open-tab → ⌘P) is
 * already familiar to Korean students who export EBSi 오답노트.
 *
 * Print CSS:
 *   - Hides the on-screen "Print" button when @media print
 *   - Page-break-inside avoid on each entry
 *   - Black-on-white only, no gradients
 */

interface Entry {
  attempt_id: string
  question: { prompt: string; correct_answer: string; explanation?: string }
  student_answer: string
  ai_explanation: string | null
  attempted_at: string
  topic: { name_en: string; name_ko: string } | null
  note: string
  reviewed_at: string | null
  difficulty: string | null
}

type SortKey = 'newest' | 'oldest' | 'hardest'
type DifficultyKey = 'all' | 'easy' | 'medium' | 'hard'

export default function PrintPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-500">Loading…</div>}>
      <PrintInner />
    </Suspense>
  )
}

function PrintInner() {
  const search = useSearchParams()
  const topicId = search.get('topic_id')
  const difficultyFilter = (['easy', 'medium', 'hard'].includes(search.get('difficulty') ?? '')
    ? search.get('difficulty')
    : 'all') as DifficultyKey
  const sortKey = (['oldest', 'hardest'].includes(search.get('sort') ?? '')
    ? search.get('sort')
    : 'newest') as SortKey
  const rawQuery = (search.get('q') ?? '').trim()
  const { language } = useTranslation()
  const ko = language === 'korean'
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const headers = await authHeaders()
        const url = topicId
          ? `/api/study/wrong-notebook?topic_id=${encodeURIComponent(topicId)}`
          : '/api/study/wrong-notebook'
        const res = await fetch(url, { headers })
        if (!res.ok) throw new Error()
        const json = await res.json()
        if (!cancelled) { setEntries((json.entries ?? []) as Entry[]); setLoadFailed(false) }
      } catch {
        // Never render an empty "no wrong answers" state on a fetch failure —
        // that misleads the student into thinking they have none. Flag it.
        if (!cancelled) setLoadFailed(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [topicId])

  // Mirror the on-screen 오답노트 exactly: the page's primary list shows
  // active (non-reviewed) entries, filtered by difficulty + search and
  // ordered by the chosen sort. Topic is already scoped server-side via
  // the topic_id query param.
  const visible = useMemo(() => {
    const rank = (d: string | null): number => {
      switch ((d ?? '').toLowerCase()) {
        case 'hard': return 3
        case 'medium': return 2
        case 'easy': return 1
        default: return 0
      }
    }
    const q = rawQuery.toLowerCase()
    let list = entries.filter(e => e.reviewed_at === null)
    if (difficultyFilter !== 'all') {
      list = list.filter(e => (e.difficulty ?? '').toLowerCase() === difficultyFilter)
    }
    if (q) {
      list = list.filter(e =>
        [e.question.prompt, e.question.correct_answer, e.student_answer, e.note]
          .some(p => p && p.toLowerCase().includes(q)))
    }
    const copy = [...list]
    if (sortKey === 'oldest') {
      copy.sort((a, b) => new Date(a.attempted_at).getTime() - new Date(b.attempted_at).getTime())
    } else if (sortKey === 'hardest') {
      copy.sort((a, b) => rank(b.difficulty) - rank(a.difficulty)
        || new Date(b.attempted_at).getTime() - new Date(a.attempted_at).getTime())
    }
    return copy
  }, [entries, difficultyFilter, sortKey, rawQuery])

  // Human-readable summary of the active filters, shown under the title so
  // the printed sheet self-documents what it was scoped to.
  const filterLabels: string[] = []
  if (visible[0]?.topic && topicId) filterLabels.push(ko ? visible[0].topic.name_ko : visible[0].topic.name_en)
  if (difficultyFilter !== 'all') {
    const diffLabel: Record<Exclude<DifficultyKey, 'all'>, [string, string]> = {
      easy: ['쉬움', 'Easy'], medium: ['보통', 'Medium'], hard: ['어려움', 'Hard'],
    }
    filterLabels.push(ko ? diffLabel[difficultyFilter][0] : diffLabel[difficultyFilter][1])
  }
  if (sortKey !== 'newest') {
    const sortLabel: Record<Exclude<SortKey, 'newest'>, [string, string]> = {
      oldest: ['오래된순', 'Oldest first'], hardest: ['어려운순', 'Hardest first'],
    }
    filterLabels.push(ko ? sortLabel[sortKey][0] : sortLabel[sortKey][1])
  }
  if (rawQuery) filterLabels.push(ko ? `검색: "${rawQuery}"` : `Search: "${rawQuery}"`)

  if (loading) {
    return (
      <div className="p-8 flex items-center gap-2 text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" />Loading wrong-answer notebook…
      </div>
    )
  }

  const today = new Date().toLocaleDateString(ko ? 'ko-KR' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <>
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .entry { break-inside: avoid; page-break-inside: avoid; }
          @page { margin: 16mm; }
        }
        .entry { break-inside: avoid; }
      `}</style>

      <div className="min-h-screen bg-white text-black">
        <div className="max-w-3xl mx-auto px-8 py-10 print:px-0 print:py-0">

          <div className="no-print mb-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Link
                href="/mobile/study/wrong-notebook"
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg ring-1 ring-gray-200 text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                {ko ? '오답노트' : 'Back'}
              </Link>
              <span className="text-[12px] text-gray-500 truncate">{ko ? '인쇄 미리보기' : 'Print preview'}</span>
            </div>
            <button type="button" onClick={() => window.print()}
              className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-black text-white text-[13px] font-semibold hover:bg-gray-800 transition">
              {ko ? '인쇄 / PDF로 저장' : 'Print / Save as PDF'}
            </button>
          </div>

          <header className="border-b-2 border-black pb-4 mb-6">
            <div className="flex items-center justify-between gap-4 mb-3">
              <Image
                src="/text_logo.png"
                alt="Classraum"
                width={180}
                height={39}
                priority
                className="h-7 w-auto"
              />
            </div>
            <h1 className="text-[28px] font-bold tracking-tight">{ko ? '오답노트' : 'Wrong-Answer Notebook'}</h1>
            <p className="text-[12px] text-gray-600 mt-1 tabular-nums">{today} · {visible.length} {ko ? '문항' : 'items'}</p>
            {filterLabels.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {filterLabels.map((label, i) => (
                  <span key={i} className="inline-flex items-center rounded-full border border-gray-300 px-2 py-0.5 text-[10.5px] font-medium text-gray-700">
                    {label}
                  </span>
                ))}
              </div>
            )}
          </header>

          {loadFailed ? (
            <p className="text-gray-500">{ko ? '오답노트를 불러오지 못했습니다. 다시 시도해 주세요.' : "Couldn't load the notebook. Please try again."}</p>
          ) : visible.length === 0 ? (
            <p className="text-gray-500">{ko ? '해당 조건의 틀린 문제가 없습니다.' : 'No wrong answers match this filter.'}</p>
          ) : (
            <ol className="space-y-6">
              {visible.map((e, i) => (
                <li key={e.attempt_id} className="entry">
                  <div className="flex items-baseline gap-3 mb-2">
                    <span className="text-[16px] font-bold tabular-nums">{i + 1}.</span>
                    {e.topic && (
                      <span className="text-[10px] uppercase tracking-[0.14em] font-semibold text-gray-600">
                        {ko ? e.topic.name_ko : e.topic.name_en}
                      </span>
                    )}
                  </div>
                  <p className="text-[14px] leading-relaxed mb-3">{e.question.prompt}</p>

                  <div className="space-y-1 text-[13px] mb-3">
                    <div><span className="font-semibold text-gray-500 inline-block w-[88px]">{ko ? '내가 쓴 답' : 'My answer'}:</span> <span className="line-through">{e.student_answer || '—'}</span></div>
                    <div><span className="font-semibold text-gray-500 inline-block w-[88px]">{ko ? '정답' : 'Correct'}:</span> <span className="font-semibold">{e.question.correct_answer}</span></div>
                  </div>

                  {e.ai_explanation && (
                    <div className="text-[12.5px] leading-relaxed border-l-2 border-gray-300 pl-3 mb-3 text-gray-800">
                      <span className="font-semibold">{ko ? '해설' : 'Explanation'}:</span> {e.ai_explanation}
                    </div>
                  )}

                  {e.note && (
                    <div className="text-[12.5px] leading-relaxed border border-gray-300 rounded p-3 bg-gray-50 print:bg-white">
                      <span className="font-semibold text-gray-700">{ko ? '내 메모' : 'My note'}:</span> {e.note}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </>
  )
}
