"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Loader2, RefreshCw, ArrowRight, ArrowLeft, Clock, CheckCircle2,
  XCircle, AlertTriangle, ChevronDown, ChevronUp, Sparkles,
  Volume2, Mic, MicOff,
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { authHeaders } from '@/lib/auth-headers'
import { supabase } from '@/lib/supabase'

interface Question {
  passage?: string | null
  passageGroupId?: string | null
  prompt: string
  /** See generator route schema for full type docs. */
  type: 'multiple_choice' | 'numeric_entry' | 'multi_select' | 'three_choice' | 'quant_comparison'
    | 'fill_in_blanks' | 'arrange_words' | 'speaking_repeat' | 'speaking_interview'
  choices: string[]
  correct_answer: string
  correct_answers?: string[]
  acceptable_answers?: string[]
  /** TOEFL Complete-the-Words: per-blank correct fragment, ordered by id. */
  blanks?: { id: number; answer: string; alternates?: string[] }[]
  difficulty: 'easy' | 'medium' | 'hard'
  explanation: string
  distractor_rationales?: { choice: string; reason: string }[]
  graphic?: QuestionGraphic | null
}

interface QuestionGraphic {
  type?: string | null
  xLabel?: string | null
  yLabel?: string | null
  points?: unknown[] | null
  series?: unknown[] | null
  bestFit?: unknown
  bars?: unknown[] | null
  values?: unknown[] | null
  rowLabels?: string[] | null
  colLabels?: string[] | null
  cells?: unknown[][] | null
  shape?: string | null
  spec?: unknown
  labels?: unknown
  svg?: string | null
  caption?: string | null
}

interface TestPayload {
  title: string
  timeLimitMinutes: number
  section: string | null
  /** Test family used to pick label style for choice buttons —
   *  KSAT renders ①②③④⑤; everything else renders A B C D (E). */
  family?: string | null
  questions: Question[]
}

interface SubmitResult {
  totalQuestions: number
  correctCount: number
  scorePercent: number
  verdicts: { index: number; correct: boolean; correctAnswer: string }[]
}

/**
 * Full-test mode UI.
 *
 * Three phases:
 *   1. Loading  — fetch the generated test.
 *   2. Taking   — single-question view with prev/next + a question-
 *                 grid sheet for jumping. Countdown timer in the
 *                 header; running out auto-submits whatever the
 *                 student has so far.
 *   3. Reviewing — score summary card + per-question review
 *                 collapsibles so the student can study what they
 *                 missed.
 *
 * Timer state lives in localStorage keyed by session id, so a
 * refresh mid-test resumes from the elapsed-time the page left off.
 */
export function TestSession({ sessionId, language }: { sessionId: string; language: 'en' | 'ko' }) {
  const { t } = useTranslation()
  const ko = language === 'ko'

  // Phase machine — splits the old single 'loading' state into three
  // distinct entry phases so we never flash the wrong UI on resume:
  //   detecting → blank/minimal spinner while we ask the DB whether
  //               this session already has a built test.
  //   resuming  → server says we have a cached test; show a neutral
  //               "Loading your test" spinner, NEVER the multi-step
  //               build checklist.
  //   generating → server has no cached test; show full
  //               GenerationProgress with phase events.
  // taking/submitting/reviewing/error unchanged.
  const [phase, setPhase] = useState<
    'detecting' | 'resuming' | 'generating' | 'taking' | 'submitting' | 'reviewing' | 'error'
  >('detecting')
  const [test, setTest] = useState<TestPayload | null>(null)
  const [answers, setAnswers] = useState<(string | null)[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [gridOpen, setGridOpen] = useState(false)
  const [result, setResult] = useState<SubmitResult | null>(null)
  /** Generation progress — populated by the NDJSON event stream from
   *  /api/study/test/generate. Each phase event carries an i18n key
   *  and an integer percent. Null until the first event arrives. */
  const [progress, setProgress] = useState<{ name: string; labelKey: string; percent: number } | null>(null)

  // Timer plumbing. startedAt lives in localStorage so a refresh
  // doesn't reset elapsed; expiresAt is derived from
  // startedAt + timeLimitMinutes. We tick a re-render every second
  // to update the countdown display.
  const startedAtRef = useRef<number | null>(null)
  const [now, setNow] = useState(Date.now())

  // ── Phase 1: load (or resume) ───────────────────────────────────
  // Streams NDJSON events from the generator route: phase events
  // update the progress bar, result event hands over the test payload,
  // error event drops us to the error branch.
  const load = useCallback(async () => {
    // Phase 1: detect whether this is a resume or a fresh build by
    // asking the DB for generation_status. We MUST do this before
    // showing any loading UI — otherwise the user sees a flash of
    // GenerationProgress ("Writing your questions…") even when the
    // test is already built and we're just fetching it from cache.
    // Default to 'generating' on error so we don't silently hide
    // legitimate generation progress.
    setPhase('detecting')
    let isResume = false
    try {
      const { data: pre } = await supabase
        .from('study_sessions')
        .select('generation_status')
        .eq('id', sessionId)
        .maybeSingle()
      // 'ready' = built; null = freshly created session that hasn't
      // been generated yet; 'pending' = generation in flight on
      // another tab (we'll join that stream and show progress).
      // 'failed' = treat as fresh attempt so the user can retry.
      isResume = pre?.generation_status === 'ready'
    } catch { /* fall through to 'generating' */ }
    setPhase(isResume ? 'resuming' : 'generating')
    setProgress({ name: 'starting', labelKey: 'study.test.progress.starting', percent: 0 })
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/study/test/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({ sessionId }),
      })
      if (!res.ok || !res.body) throw new Error()

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      let payload: TestPayload | null = null
      let streamError = false

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue
          let event: { type: string; [k: string]: unknown }
          try { event = JSON.parse(trimmed) } catch { continue }
          if (event.type === 'phase') {
            setProgress({
              name: String(event.name ?? ''),
              labelKey: String(event.label ?? ''),
              percent: Math.max(0, Math.min(100, Number(event.percent ?? 0))),
            })
          } else if (event.type === 'result') {
            payload = event.test as TestPayload
          } else if (event.type === 'error') {
            streamError = true
          }
        }
      }
      if (streamError || !payload) throw new Error()

      setTest(payload)
      setAnswers(new Array(payload.questions.length).fill(null))

      const storageKey = `study:test:${sessionId}:startedAt`
      const stored = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null
      const startedAt = stored ? parseInt(stored, 10) : Date.now()
      if (!stored && typeof window !== 'undefined') {
        localStorage.setItem(storageKey, String(startedAt))
      }
      startedAtRef.current = startedAt
      setPhase('taking')
    } catch {
      setPhase('error')
    }
  }, [sessionId])

  useEffect(() => { void load() }, [load])

  // Re-render every second while taking so the timer ticks down.
  useEffect(() => {
    if (phase !== 'taking') return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [phase])

  /** Surfaces the actual submit error so the student knows what went
   *  wrong instead of seeing the Submit button silently do nothing. */
  const [submitError, setSubmitError] = useState<string | null>(null)
  /** Confirm-before-submit dialog: opens when the student presses
   *  Submit, blocks the actual POST until they confirm. */
  const [confirmOpen, setConfirmOpen] = useState(false)

  // ── Submission path (used by manual Submit + timer expiry) ─────
  const submit = useCallback(async () => {
    if (!test || phase !== 'taking') return
    setSubmitError(null)
    setPhase('submitting')
    try {
      const elapsedSeconds = startedAtRef.current
        ? Math.max(0, Math.round((Date.now() - startedAtRef.current) / 1000))
        : test.timeLimitMinutes * 60
      const headers = await authHeaders()
      const res = await fetch('/api/study/test/submit', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sessionId,
          questions: test.questions,
          answers,
          elapsedSeconds,
        }),
      })
      if (!res.ok) {
        // Pull the actual error message from the response so the user
        // sees something specific instead of a silent no-op.
        let detail = `HTTP ${res.status}`
        try {
          const errJson = await res.json() as { error?: string; details?: string }
          detail = errJson.error
            ? (errJson.details ? `${errJson.error} — ${errJson.details}` : errJson.error)
            : detail
        } catch { /* not JSON */ }
        throw new Error(detail)
      }
      const json = await res.json() as SubmitResult
      setResult(json)
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`study:test:${sessionId}:startedAt`)
      }
      setPhase('reviewing')
    } catch (err) {
      console.error('[TestSession] submit failed', err)
      setSubmitError((err as Error).message || 'submit failed')
      // Drop back to taking so the student can retry instead of
      // losing the test to a transient error.
      setPhase('taking')
    }
  }, [test, phase, answers, sessionId])

  // Auto-submit when the timer hits zero.
  const expiresAt = useMemo(() => {
    if (!test || !startedAtRef.current) return null
    return startedAtRef.current + test.timeLimitMinutes * 60_000
  }, [test])
  useEffect(() => {
    if (phase !== 'taking' || !expiresAt) return
    if (now >= expiresAt) void submit()
  }, [now, expiresAt, phase, submit])

  // ── Render branches ─────────────────────────────────────────────
  // 'detecting' — DB ping in flight. Minimal neutral spinner so we
  // never flash a misleading "we're building your test" UI before
  // we know what's actually happening.
  if (phase === 'detecting') {
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }
  // 'resuming' — server has a cached test; we're just fetching it.
  // Show a friendly "Loading your test" message, NOT the multi-step
  // build checklist (which implies fresh generation).
  if (phase === 'resuming') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
        <p className="text-sm text-gray-600">{String(t('study.test.loadingTest'))}</p>
      </div>
    )
  }
  // 'generating' — fresh build from scratch. Show the full
  // GenerationProgress checklist with phase events from the stream.
  if (phase === 'generating') {
    return <GenerationProgress progress={progress} t={t} />
  }

  if (phase === 'error' || !test) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-3">
        <p className="text-sm text-gray-600">{t('study.test.generateFailed')}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 px-4 h-10 rounded-full bg-primary text-white text-sm font-medium"
        >
          <RefreshCw className="w-4 h-4" />
          {t('study.test.tryAgain')}
        </button>
      </div>
    )
  }

  if (phase === 'reviewing' && result) {
    return <ReviewView test={test} answers={answers} result={result} ko={ko} sessionId={sessionId} />
  }

  // phase === 'taking' or 'submitting'
  const q = test.questions[currentIdx]
  const remainingMs = expiresAt ? Math.max(0, expiresAt - now) : 0
  const answered = answers.filter(a => a != null).length

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Sticky timer + progress strip */}
      <div className="flex-shrink-0 px-5 py-2.5 border-b border-gray-100 bg-white flex items-center justify-between">
        <button
          type="button"
          onClick={() => setGridOpen(v => !v)}
          className="text-xs text-gray-600 inline-flex items-center gap-1"
        >
          {t('study.test.questionN', { current: String(currentIdx + 1), total: String(test.questions.length) })}
          {gridOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        <div className={`inline-flex items-center gap-1 text-xs font-mono tabular-nums ${
          remainingMs < 60_000 ? 'text-rose-600 font-bold' : remainingMs < 5 * 60_000 ? 'text-amber-700' : 'text-gray-600'
        }`}>
          <Clock className="w-3.5 h-3.5" />
          {formatTime(remainingMs)}
        </div>
      </div>

      {/* Question grid sheet — slide-down picker for quick jumps */}
      {gridOpen && (
        <div className="flex-shrink-0 border-b border-gray-100 bg-gray-50/60 px-3 py-3">
          <div className="grid grid-cols-8 gap-1.5">
            {test.questions.map((_, i) => {
              const isCurrent = i === currentIdx
              const isAnswered = answers[i] != null
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => { setCurrentIdx(i); setGridOpen(false) }}
                  className={`h-8 rounded-md text-xs font-medium transition-colors ${
                    isCurrent
                      ? 'bg-primary text-white'
                      : isAnswered
                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                        : 'bg-white text-gray-700 ring-1 ring-gray-200'
                  }`}
                >
                  {i + 1}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Question + answer choices */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        {/* Difficulty chip — hidden for SAT (the customization sheet
            already locks SAT to challenge and hides the picker, so
            surfacing per-item difficulty here would be inconsistent).
            Other families still show it so students can pace based on
            difficulty mix. */}
        {test.family !== 'sat' && (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {t(`study.practice.difficulty.${q.difficulty}`)}
            </span>
          </div>
        )}
        {q.passage && (() => {
          // Passage-group header: when the test has shared passages
          // (TOEFL/IELTS/ACT Reading), show "Passage X — Question Y
          // of Z" so the student knows where they are in the section.
          const groupInfo = passageGroupInfo(test.questions, currentIdx)
          return (
            <>
              {groupInfo && (
                <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.10em] text-primary">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10">
                    {ko
                      ? `지문 ${groupInfo.groupIndex} / ${groupInfo.totalGroups}`
                      : `Passage ${groupInfo.groupIndex} of ${groupInfo.totalGroups}`}
                  </span>
                  <span className="text-gray-500 font-normal normal-case tracking-normal">
                    {ko
                      ? `이 지문의 ${groupInfo.indexInGroup} / ${groupInfo.totalInGroup}번 문항`
                      : `Question ${groupInfo.indexInGroup} of ${groupInfo.totalInGroup} in this passage`}
                  </span>
                </div>
              )}
              <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-[14px] text-gray-800 leading-relaxed">
                <PassageParagraphs text={q.passage} />
              </div>
            </>
          )
        })()}
        <p className="text-base text-gray-900 leading-relaxed whitespace-pre-wrap mb-4">
          {normalizeDisplayText(q.prompt)}
        </p>
        {q.graphic && <QuestionGraphicView graphic={q.graphic} />}
        {q.type === 'numeric_entry' ? (
          // SAT Math SPR / GRE NE / KSAT 단답형: free-text numeric input.
          <div className="space-y-2">
            <label className="block">
              <span className="block text-[12px] uppercase tracking-[0.10em] text-gray-500 mb-1.5">
                {ko ? '답 입력' : 'Enter answer'}
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={answers[currentIdx] ?? ''}
                onChange={(e) => {
                  const val = e.target.value
                  setAnswers(prev => {
                    const next = [...prev]
                    next[currentIdx] = val
                    return next
                  })
                }}
                placeholder={ko ? '예: 12, 3.44, 5/8' : 'e.g. 12, 3.44, 5/8'}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <p className="text-[11px] text-gray-500">
              {ko ? '정수·소수·분수 모두 입력 가능합니다.' : 'Integers, decimals, or fractions are all accepted.'}
            </p>
          </div>
        ) : q.type === 'multi_select' ? (
          // GRE SE / RC "select all that apply": checkboxes with target count.
          (() => {
            const targetCount = q.correct_answers?.length ?? 2
            const current = (() => {
              const raw = answers[currentIdx]
              if (!raw) return [] as string[]
              try { return JSON.parse(raw) as string[] } catch { return [] }
            })()
            const toggle = (choice: string) => {
              const next = current.includes(choice)
                ? current.filter(c => c !== choice)
                : [...current, choice]
              setAnswers(prev => {
                const out = [...prev]
                out[currentIdx] = JSON.stringify(next)
                return out
              })
            }
            return (
              <>
                <p className="text-[12px] text-amber-700 mb-2 font-medium">
                  {ko ? `정확히 ${targetCount}개 선택` : `Select exactly ${targetCount}`}
                </p>
                <div className="space-y-2">
                  {q.choices.map(choice => {
                    const selected = current.includes(choice)
                    return (
                      <button
                        key={choice}
                        type="button"
                        onClick={() => toggle(choice)}
                        className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors flex items-start gap-3 ${
                          selected
                            ? 'border-primary bg-primary/5 text-gray-900'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <span className={`flex-shrink-0 w-5 h-5 rounded border-2 mt-0.5 ${selected ? 'border-primary bg-primary' : 'border-gray-300 bg-white'}`}>
                          {selected && <CheckCircle2 className="w-full h-full text-white" />}
                        </span>
                        <span className="flex-1">{choice}</span>
                      </button>
                    )
                  })}
                </div>
              </>
            )
          })()
        ) : q.type === 'fill_in_blanks' ? (
          // TOEFL Complete-the-Words (Jan 2026): passage contains
          // [1] [2] [3]… placeholders. Render each placeholder as a
          // narrow inline text input. Student's answer is stored as
          // JSON {"1":"s","2":"to",…} in answers[currentIdx].
          (() => {
            const blanks = q.blanks ?? []
            const parsed = (() => {
              const raw = answers[currentIdx]
              if (!raw) return {} as Record<string, string>
              try {
                const obj = JSON.parse(raw)
                return (obj && typeof obj === 'object') ? obj as Record<string, string> : {}
              } catch { return {} }
            })()
            const setBlank = (id: number, val: string) => {
              const next = { ...parsed, [String(id)]: val }
              setAnswers(prev => {
                const out = [...prev]
                out[currentIdx] = JSON.stringify(next)
                return out
              })
            }
            // Split passage on [N] tokens and render inputs inline.
            const passageText = q.passage ?? ''
            const segments = passageText.split(/(\[\d+\])/g)
            return (
              <div className="space-y-3">
                <p className="text-[12px] uppercase tracking-[0.10em] text-gray-500">
                  {ko ? '빈칸에 알맞은 글자를 입력하세요' : 'Type the missing letters'}
                </p>
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-[15px] text-gray-900 leading-[1.9]">
                  {segments.map((seg, i) => {
                    const match = seg.match(/^\[(\d+)\]$/)
                    if (!match) return <span key={i}>{normalizeDisplayText(seg)}</span>
                    const id = parseInt(match[1], 10)
                    return (
                      <input
                        key={i}
                        type="text"
                        value={parsed[String(id)] ?? ''}
                        onChange={(e) => setBlank(id, e.target.value)}
                        className="inline-block min-w-[40px] mx-0.5 px-1.5 py-0.5 align-baseline border-b-2 border-primary/40 bg-white text-primary font-semibold focus:outline-none focus:border-primary"
                        style={{ width: `${Math.max(40, ((parsed[String(id)] ?? '').length + 2) * 9)}px` }}
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        aria-label={`Blank ${id}`}
                      />
                    )
                  })}
                </div>
                <p className="text-[11px] text-gray-500">
                  {ko ? `총 ${blanks.length}개의 빈칸` : `${blanks.length} blanks total`}
                </p>
              </div>
            )
          })()
        ) : q.type === 'arrange_words' ? (
          // TOEFL Build-a-Sentence (Jan 2026): choices are word/phrase
          // chips. Student clicks them in order to build a sentence.
          // Answer stored as chips joined by " | " in answers[currentIdx].
          (() => {
            const current = (answers[currentIdx] ?? '').split(' | ').filter(Boolean)
            const remaining = q.choices.filter(c => !current.includes(c))
            const setOrder = (next: string[]) => {
              setAnswers(prev => {
                const out = [...prev]
                out[currentIdx] = next.join(' | ')
                return out
              })
            }
            return (
              <div className="space-y-4">
                <p className="text-[12px] uppercase tracking-[0.10em] text-gray-500">
                  {ko ? '단어를 순서대로 눌러 문장을 만드세요' : 'Tap the words in order to build the sentence'}
                </p>
                {/* Slot row — assembled sentence so far */}
                <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-3 py-3 min-h-[60px] flex flex-wrap gap-2">
                  {current.length === 0
                    ? <span className="text-[13px] text-gray-400 italic">{ko ? '비어 있음' : 'empty'}</span>
                    : current.map((chip, i) => (
                        <button
                          key={`${chip}-${i}`}
                          type="button"
                          onClick={() => setOrder(current.filter((_, j) => j !== i))}
                          className="px-3 py-1.5 rounded-lg bg-primary text-white text-[13px] font-medium hover:opacity-90"
                        >
                          {normalizeDisplayText(chip)}
                        </button>
                      ))}
                </div>
                {/* Chip pool — unused words */}
                <div className="flex flex-wrap gap-2">
                  {remaining.map(chip => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setOrder([...current, chip])}
                      className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-[13px] text-gray-800 hover:border-primary hover:text-primary"
                    >
                      {normalizeDisplayText(chip)}
                    </button>
                  ))}
                </div>
                {current.length > 0 && (
                  <button type="button" onClick={() => setOrder([])}
                    className="text-[11px] text-gray-500 underline">
                    {ko ? '다시 시작' : 'Start over'}
                  </button>
                )}
              </div>
            )
          })()
        ) : q.type === 'speaking_repeat' ? (
          // TOEFL Listen-and-Repeat (Jan 2026): audio script shown as
          // text + optional TTS playback. Student can type the sentence
          // back OR record their voice and let Whisper transcribe.
          // Either way the answer text is compared verbatim by the grader.
          <div className="space-y-3">
            <p className="text-[12px] uppercase tracking-[0.10em] text-gray-500">
              {ko ? '들은 문장을 그대로 입력하세요' : 'Type back the sentence exactly'}
            </p>
            <AudioPracticeBar
              // Strip 'Transcript: ' prefix + surrounding quotes for TTS.
              sourceText={(q.passage ?? '').replace(/^transcript:\s*/i, '').replace(/^"|"$/g, '').trim() || q.correct_answer}
              sessionId={sessionId}
              language={language}
              ko={ko}
              onTranscript={(text) => {
                setAnswers(prev => {
                  const next = [...prev]
                  next[currentIdx] = (next[currentIdx] ? next[currentIdx] + ' ' : '') + text
                  return next
                })
              }}
            />
            <textarea
              value={answers[currentIdx] ?? ''}
              onChange={(e) => {
                const val = e.target.value
                setAnswers(prev => {
                  const next = [...prev]
                  next[currentIdx] = val
                  return next
                })
              }}
              rows={3}
              placeholder={ko ? '예: I can\'t believe how heavy this box is...' : 'e.g. I can\'t believe how heavy this box is...'}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-base text-gray-900 leading-relaxed placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <p className="text-[11px] text-gray-500">
              {ko ? '대소문자·구두점은 평가에 영향 없음.' : 'Case and punctuation are not graded.'}
            </p>
          </div>
        ) : q.type === 'speaking_interview' ? (
          // TOEFL Take-an-Interview (Jan 2026): open response to an
          // interviewer prompt + optional TTS playback of the question
          // and voice-recorded answer. Auto-grader checks for a
          // substantive (>20 char) answer; rubric grading routes
          // through /api/study/response/grade separately.
          <div className="space-y-3">
            <p className="text-[12px] uppercase tracking-[0.10em] text-gray-500">
              {ko ? '면접관의 질문에 자유롭게 답변하세요' : 'Answer the interviewer as fully as you can'}
            </p>
            <AudioPracticeBar
              // Strip "[Interview]" prefix for cleaner TTS.
              sourceText={q.prompt.replace(/^\s*\[[^\]]+\]\s*/, '')}
              sessionId={sessionId}
              language={language}
              ko={ko}
              onTranscript={(text) => {
                setAnswers(prev => {
                  const next = [...prev]
                  next[currentIdx] = (next[currentIdx] ? next[currentIdx] + ' ' : '') + text
                  return next
                })
              }}
            />
            <textarea
              value={answers[currentIdx] ?? ''}
              onChange={(e) => {
                const val = e.target.value
                setAnswers(prev => {
                  const next = [...prev]
                  next[currentIdx] = val
                  return next
                })
              }}
              rows={6}
              placeholder={ko ? '여러 문장으로 답변하세요...' : 'Respond in several sentences...'}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-base text-gray-900 leading-relaxed placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <p className="text-[11px] text-gray-500">
              {ko ? '근거·예시를 포함한 풍부한 답변을 권장합니다.' : 'Strong answers include reasons or examples.'}
            </p>
          </div>
        ) : (
          // multiple_choice / three_choice / quant_comparison — all
          // render the same way: vertical list of choice buttons with
          // a test-format-aware label prefix (KSAT ①②③④⑤, others A B C D).
          <div className="space-y-2">
            {q.choices.map((choice, i) => {
              const selected = answers[currentIdx] === choice
              const label = choiceLabel(test.family, i)
              return (
                <button
                  key={choice}
                  type="button"
                  onClick={() => {
                    setAnswers(prev => {
                      const next = [...prev]
                      next[currentIdx] = choice
                      return next
                    })
                  }}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors flex items-start gap-3 ${
                    selected
                      ? 'border-primary bg-primary/5 text-gray-900'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className={`flex-shrink-0 inline-flex items-center justify-center min-w-[28px] h-6 px-1.5 rounded-md text-[12.5px] font-semibold tabular-nums ${
                    selected ? 'bg-primary/15 text-primary' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {label}
                  </span>
                  <span className="flex-1">{normalizeDisplayText(choice)}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer — prev / next / submit */}
      <div className="flex-shrink-0 px-5 py-3 border-t border-gray-100 bg-white flex items-center gap-2">
        <button
          type="button"
          onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
          disabled={currentIdx === 0}
          className="h-11 w-11 rounded-full bg-white border border-gray-200 text-gray-700 inline-flex items-center justify-center disabled:opacity-40"
          aria-label={String(t('study.test.previous'))}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        {currentIdx === test.questions.length - 1 ? (
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={phase === 'submitting'}
            className="flex-1 h-11 rounded-full bg-primary text-white text-sm font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            {phase === 'submitting'
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : null}
            {answered < test.questions.length
              ? t('study.test.submitWithUnanswered', { count: String(test.questions.length - answered) })
              : t('study.test.submit')}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setCurrentIdx(i => Math.min(test.questions.length - 1, i + 1))}
            className="flex-1 h-11 rounded-full bg-gray-900 text-white text-sm font-semibold inline-flex items-center justify-center gap-1.5"
          >
            {t('study.test.next')}
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Submit-failed banner — surfaces the actual error instead of
          silently reverting to the test view. Auto-clears when the
          student edits any answer (handled implicitly: state change
          re-renders without the banner if submitError is cleared). */}
      {submitError && (
        <div className="absolute inset-x-3 bottom-20 z-40 rounded-xl bg-rose-50 ring-1 ring-rose-200 px-4 py-3 shadow-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-rose-900">
                {String(t('study.test.submitError.title'))}
              </div>
              <div className="text-[12px] text-rose-800 mt-0.5 break-words">{submitError}</div>
            </div>
            <button
              type="button"
              onClick={() => setSubmitError(null)}
              className="text-rose-600 hover:text-rose-800 text-[11px] font-medium px-1"
            >
              {String(t('study.test.submitError.dismiss'))}
            </button>
          </div>
        </div>
      )}

      {/* Confirm-before-submit modal — warns about unanswered and
          asks "are you sure?" before locking in the score. Empty
          answers grade as incorrect, so this is a real choice point. */}
      {confirmOpen && (
        <SubmitConfirmModal
          unanswered={test.questions.length - answered}
          totalQuestions={test.questions.length}
          t={t}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => { setConfirmOpen(false); void submit() }}
        />
      )}
    </div>
  )
}

/** Pre-submit confirmation. Highlights unanswered count so students
 *  don't accidentally lock in a score they meant to revisit. */
function SubmitConfirmModal({
  unanswered, totalQuestions, t, onCancel, onConfirm,
}: {
  unanswered: number
  totalQuestions: number
  /** UI-language translator (from useTranslation) — not the test's
   *  content language, which is locked per family. A Korean user
   *  taking SAT sees Korean chrome via this t(). */
  t: (key: string, params?: Record<string, string | number>) => string | string[]
  onCancel: () => void
  onConfirm: () => void
}) {
  const bodyKey = unanswered === 0
    ? 'study.test.submitConfirm.bodyAllAnswered'
    : unanswered === 1
      ? 'study.test.submitConfirm.bodyUnansweredOne'
      : 'study.test.submitConfirm.bodyUnansweredMany'
  return (
    <>
      <div
        className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onCancel}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[71] max-w-sm mx-auto rounded-2xl bg-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] animate-slide-up"
      >
        <div className="px-5 pt-5 pb-3">
          <h3 className="text-[17px] font-semibold tracking-tight text-gray-900">
            {String(t('study.test.submitConfirm.titleSubmit'))}
          </h3>
          <p className="text-[13.5px] text-gray-600 mt-1.5 leading-relaxed">
            {String(t(bodyKey, { count: unanswered, total: totalQuestions }))}
          </p>
        </div>
        <div className="px-3 py-3 border-t border-gray-100 flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 h-11 rounded-xl bg-gray-100 text-gray-900 text-sm font-semibold hover:bg-gray-200 active:scale-[0.98] transition-all"
          >
            {String(t('study.test.submitConfirm.cancel'))}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 h-11 rounded-xl text-white text-sm font-semibold active:scale-[0.98] transition-all ${
              unanswered > 0
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-primary hover:bg-primary/90'
            }`}
          >
            {String(t('study.test.submitConfirm.confirm'))}
          </button>
        </div>
      </div>
    </>
  )
}

/**
 * Post-submit review. Shows the score + a per-question accordion so
 * the student can revisit what they missed without re-running the
 * whole test.
 */
function ReviewView({
  test, answers, result, ko, sessionId,
}: { test: TestPayload; answers: (string | null)[]; result: SubmitResult; ko: boolean; sessionId: string }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState<number | null>(null)

  return (
    <div className="flex-1 overflow-y-auto" style={{ overscrollBehavior: 'contain' }}>
      <div className="px-5 py-6 space-y-5">
        {/* Summary CTA — links to the dedicated summary page with
            mistake review, streak update, and "try again" surface. */}
        <Link
          href={`/mobile/study/session/${sessionId}/summary`}
          className="block rounded-2xl bg-gradient-to-br from-primary/[0.08] via-indigo-50/40 to-white ring-1 ring-primary/25 p-4 hover:shadow-[0_2px_8px_-2px_rgba(40,133,232,0.18)] active:scale-[0.99] transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-primary to-indigo-600 text-white flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] ring-1 ring-primary/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14.5px] font-semibold text-gray-900 leading-tight">
                {String(t('study.test.viewSummaryTitle'))}
              </div>
              <div className="text-[12px] text-gray-500 mt-0.5">
                {String(t('study.test.viewSummarySubtitle'))}
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400" />
          </div>
        </Link>

        {/* Score summary */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary mb-1">
            {t('study.test.resultEyebrow')}
          </p>
          <h2 className="text-3xl font-semibold text-gray-900 tabular-nums">
            {result.correctCount} / {result.totalQuestions}
            <span className="text-base text-gray-500 ml-2">({result.scorePercent}%)</span>
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t(`study.test.resultMessage.${
              result.scorePercent >= 85 ? 'excellent' :
              result.scorePercent >= 65 ? 'solid' :
              result.scorePercent >= 40 ? 'keepGoing' : 'startOver'
            }`)}
          </p>
          {/* TOEFL Jan 2026: surface the new 1-6 band score (avg of 4
              sections, 0.5 increments) AND the transitional 0-30 per-
              section score that ETS still publishes during the 2-year
              transition. Practice covers ONE section, so we show
              that section's band + 0-30, not the overall 0-120. */}
          {test.family === 'toefl' && (() => {
            const band = percentToToeflBand(result.scorePercent)
            const score030 = Math.round((result.scorePercent / 100) * 30)
            return (
              <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3 text-left">
                <div>
                  <div className="text-[10.5px] font-semibold uppercase tracking-[0.10em] text-gray-500">
                    {ko ? '밴드 점수 (1-6)' : 'Band score (1–6)'}
                  </div>
                  <div className="text-2xl font-semibold text-gray-900 tabular-nums mt-0.5">
                    {band.toFixed(1)}
                  </div>
                </div>
                <div>
                  <div className="text-[10.5px] font-semibold uppercase tracking-[0.10em] text-gray-500">
                    {ko ? '섹션 점수 (0-30)' : 'Section (0–30)'}
                  </div>
                  <div className="text-2xl font-semibold text-gray-900 tabular-nums mt-0.5">
                    {score030}
                  </div>
                </div>
                <p className="col-span-2 text-[11px] text-gray-400 mt-1 leading-relaxed">
                  {ko
                    ? 'ETS는 1-6 밴드 점수와 0-120 환산 점수를 2년 전환 기간 동안 모두 제공합니다.'
                    : 'ETS issues both the 1–6 band and the 0–120 score during the 2-year transition.'}
                </p>
              </div>
            )
          })()}
        </div>

        {/* Per-question review accordion */}
        <section>
          <h3 className="text-sm font-semibold text-gray-900 mb-2 px-1">
            {t('study.test.reviewTitle')}
          </h3>
          <div className="space-y-2">
            {test.questions.map((q, i) => {
              const verdict = result.verdicts[i]
              const studentAnswer = answers[i]
              const isOpen = expanded === i
              return (
                <div
                  key={i}
                  className={`rounded-xl border bg-white overflow-hidden ${
                    verdict.correct ? 'border-gray-200' : 'border-rose-200'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setExpanded(prev => prev === i ? null : i)}
                    className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50"
                  >
                    {verdict.correct
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      : studentAnswer == null
                        ? <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        : <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-500">
                        {t('study.test.questionN', { current: String(i + 1), total: String(test.questions.length) })}
                      </div>
                      <div className="text-sm text-gray-900 line-clamp-2 mt-0.5">
                        {normalizeDisplayText(q.prompt)}
                      </div>
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />}
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 space-y-2 border-t border-gray-100 pt-3 text-sm">
                      {q.passage && (
                        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-800">
                          <PassageParagraphs text={q.passage} />
                        </div>
                      )}
                      <p className="text-gray-900 whitespace-pre-wrap">{normalizeDisplayText(q.prompt)}</p>
                      {q.graphic && <QuestionGraphicView graphic={q.graphic} />}
                      {/* Type-aware verdict rendering. MC/three_choice/quant
                          render per-choice rows; the four Jan-2026 TOEFL
                          item types each have their own answer/correct
                          comparison shape. */}
                      {(q.type === 'fill_in_blanks' || q.type === 'arrange_words'
                        || q.type === 'speaking_repeat' || q.type === 'speaking_interview') ? (
                        <div className="space-y-2 mt-2">
                          <div className="px-3 py-2 rounded-lg bg-emerald-50 text-emerald-900 text-xs border border-emerald-200">
                            <div className="font-semibold mb-0.5">{ko ? '정답' : 'Correct answer'}</div>
                            <div className="whitespace-pre-wrap">{normalizeDisplayText(verdict.correctAnswer)}</div>
                          </div>
                          {studentAnswer != null ? (
                            <div className={`px-3 py-2 rounded-lg text-xs border ${
                              verdict.correct
                                ? 'bg-gray-50 text-gray-700 border-gray-200'
                                : 'bg-rose-50 text-rose-900 border-rose-200'
                            }`}>
                              <div className="font-semibold mb-0.5">{ko ? '내 답' : 'Your answer'}</div>
                              <div className="whitespace-pre-wrap">{normalizeDisplayText(studentAnswer)}</div>
                            </div>
                          ) : (
                            <div className="px-3 py-2 rounded-lg bg-amber-50 text-amber-900 text-xs border border-amber-200">
                              {ko ? '답하지 않음' : 'Not answered'}
                            </div>
                          )}
                        </div>
                      ) : (
                      <div className="space-y-1.5 mt-2">
                        {q.choices.map(choice => {
                          const isCorrect = choice === q.correct_answer
                          const isStudentPick = choice === studentAnswer
                          // Lookup the per-distractor rationale by
                          // choice text. Only shown on WRONG choices
                          // (correct choice's rationale lives in the
                          // single `explanation` field below).
                          const distractorReason = !isCorrect
                            ? q.distractor_rationales?.find(d => d.choice === choice)?.reason
                            : undefined
                          return (
                            <div
                              key={choice}
                              className={`px-3 py-2 rounded-lg text-xs ${
                                isCorrect
                                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                                  : isStudentPick
                                    ? 'bg-rose-50 text-rose-900 border border-rose-200'
                                    : 'bg-gray-50 text-gray-700 border border-gray-100'
                              }`}
                            >
                              <div>
                                {normalizeDisplayText(choice)}
                                {isCorrect && <span className="ml-2 font-semibold">{ko ? '정답' : 'Correct'}</span>}
                                {isStudentPick && !isCorrect && <span className="ml-2 font-semibold">{ko ? '내 답' : 'Your answer'}</span>}
                              </div>
                              {distractorReason && (
                                <div className={`mt-1 text-[11px] leading-relaxed ${
                                  isStudentPick ? 'text-rose-800' : 'text-gray-600'
                                }`}>
                                  <span className="font-semibold">{ko ? '오답 이유: ' : 'Why wrong: '}</span>
                                  {normalizeDisplayText(distractorReason)}
                                </div>
                              )}
                            </div>
                          )
                        })}
                        {studentAnswer == null && (
                          <div className="px-3 py-2 rounded-lg bg-amber-50 text-amber-900 text-xs border border-amber-200">
                            {ko ? '답하지 않음' : 'Not answered'}
                          </div>
                        )}
                      </div>
                      )}
                      <p className="text-xs text-gray-600 leading-relaxed mt-2">
                        {normalizeDisplayText(q.explanation)}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        <Link
          href="/mobile/study"
          className="w-full inline-flex items-center justify-center h-11 rounded-full bg-white border border-gray-200 text-sm font-medium text-gray-700"
        >
          {t('study.test.backToStudy')}
        </Link>
      </div>
    </div>
  )
}

/** Renders a passage as one `<p>` per paragraph, with first-line
 *  indent on every paragraph after the first. Splits on `\n\n` (the
 *  encoding the generator uses). Single-paragraph passages render
 *  flat (no indent) since there's nothing to differentiate. Multi-
 *  paragraph passages get an indent on paragraphs 2+ so the reader
 *  can immediately see "this is a new paragraph" without having to
 *  notice the vertical gap. */
/** Visual asset renderer for math + data questions. Restyled to
 *  match the College Board's SAT PDF aesthetic: pure black strokes
 *  on white, thin axes, sans-serif labels, no color fills, no grid
 *  decoration. Dispatches on `graphic.type`; each branch tolerates
 *  missing fields and falls through to the rawSvg / caption-only
 *  fallback so a malformed graphic never blocks the question. */
function QuestionGraphicView({ graphic }: { graphic: QuestionGraphic | null | undefined }) {
  if (!graphic || !graphic.type) {
    // Edge case — model emitted a graphic.svg but forgot to set type
    if (graphic?.svg) return <RawSvgFigure svg={graphic.svg} caption={graphic.caption ?? undefined} />
    return null
  }
  const t = graphic.type.toLowerCase()

  // ─ Two-way table (PSD: conditional probability items) ──────────
  if (t === 'twowaytable' || t === 'table') {
    const rows = (graphic.rowLabels ?? []).filter(Boolean)
    const cols = (graphic.colLabels ?? []).filter(Boolean)
    const cells = (graphic.cells ?? []) as (number | string)[][]
    if (rows.length === 0 && cells.length === 0) return null
    return (
      <figure className="my-3 mx-auto max-w-md">
        <table className="w-full text-[12px] text-black border border-black border-collapse">
          <thead>
            <tr>
              <th className="px-2 py-1.5 border border-black bg-white font-normal" />
              {cols.map((c, i) => (
                <th key={i} className="px-2 py-1.5 border border-black font-semibold text-center bg-white">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((rowLabel, r) => (
              <tr key={r}>
                <td className="px-2 py-1.5 border border-black font-semibold bg-white">{rowLabel}</td>
                {(cells[r] ?? []).map((v, c) => (
                  <td key={c} className="px-2 py-1.5 border border-black text-right tabular-nums bg-white">
                    {String(v ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {graphic.caption && <figcaption className="text-[11px] text-black text-center italic mt-2">{graphic.caption}</figcaption>}
      </figure>
    )
  }

  // ─ Bar chart / histogram ───────────────────────────────────────
  if (t === 'bar' || t === 'histogram') {
    const bars = ((graphic.bars ?? []) as Array<{ label?: string; value?: number }>).filter(b => b && typeof b.value === 'number')
    if (bars.length === 0) return null
    const maxVal = Math.max(...bars.map(b => b.value ?? 0), 1)
    const W = 300, H = 180
    const padL = 32, padB = 28, padT = 10, padR = 10
    const innerW = W - padL - padR
    const innerH = H - padT - padB
    const barW = innerW / bars.length
    // Build clean y-axis ticks at 0, max/4, max/2, 3max/4, max
    const ticks = [0, maxVal * 0.25, maxVal * 0.5, maxVal * 0.75, maxVal]
    return (
      <figure className="my-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-md mx-auto bg-white">
          {/* y-axis ticks + gridlines (light) */}
          {ticks.map((v, i) => {
            const y = padT + innerH - (v / maxVal) * innerH
            return (
              <g key={i}>
                <line x1={padL - 3} y1={y} x2={padL} y2={y} stroke="black" strokeWidth={0.75} />
                <text x={padL - 5} y={y + 3} fontSize="9" textAnchor="end" fill="black">
                  {Number.isInteger(v) ? v : v.toFixed(1)}
                </text>
              </g>
            )
          })}
          {/* axes */}
          <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="black" strokeWidth={1} />
          <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="black" strokeWidth={1} />
          {bars.map((b, i) => {
            const h = ((b.value ?? 0) / maxVal) * innerH
            const x = padL + i * barW + barW * 0.2
            const y = H - padB - h
            return (
              <g key={i}>
                <rect x={x} y={y} width={barW * 0.6} height={h} fill="black" />
                <text x={x + barW * 0.3} y={H - padB + 11} fontSize="9" textAnchor="middle" fill="black">
                  {b.label ?? ''}
                </text>
              </g>
            )
          })}
          {graphic.xLabel && (
            <text x={padL + innerW / 2} y={H - 2} fontSize="10" textAnchor="middle" fill="black" fontStyle="italic">{graphic.xLabel}</text>
          )}
          {graphic.yLabel && (
            <text x={10} y={padT + innerH / 2} fontSize="10" textAnchor="middle" fill="black" fontStyle="italic" transform={`rotate(-90 10 ${padT + innerH / 2})`}>{graphic.yLabel}</text>
          )}
        </svg>
        {graphic.caption && <figcaption className="text-[11px] text-black text-center italic mt-2">{graphic.caption}</figcaption>}
      </figure>
    )
  }

  // ─ Scatter plot / line graph ───────────────────────────────────
  if (t === 'scatter' || t === 'linegraph' || t === 'line') {
    const W = 300, H = 220
    const padL = 32, padB = 28, padT = 10, padR = 12
    const innerW = W - padL - padR
    const innerH = H - padT - padB
    const seriesList: Array<{ label?: string; points: Array<[number, number]> }> = []
    if (t === 'scatter') {
      const pts: Array<[number, number]> = []
      ;(graphic.points ?? []).forEach(p => {
        if (Array.isArray(p) && p.length >= 2) pts.push([Number(p[0]), Number(p[1])])
        else if (p && typeof p === 'object' && 'x' in p) pts.push([Number((p as { x: number }).x), Number((p as { y: number }).y)])
      })
      seriesList.push({ points: pts })
    } else {
      ((graphic.series ?? []) as Array<{ label?: string; points?: Array<[number, number]> }>).forEach(s => {
        const pts: Array<[number, number]> = []
        ;(s.points ?? []).forEach(p => { if (Array.isArray(p) && p.length >= 2) pts.push([Number(p[0]), Number(p[1])]) })
        seriesList.push({ label: s.label, points: pts })
      })
    }
    const allPts = seriesList.flatMap(s => s.points)
    if (allPts.length === 0) return null
    const xs = allPts.map(p => p[0]); const ys = allPts.map(p => p[1])
    const xMin = Math.min(...xs, 0); const xMax = Math.max(...xs)
    const yMin = Math.min(...ys, 0); const yMax = Math.max(...ys)
    const xR = (xMax - xMin) || 1; const yR = (yMax - yMin) || 1
    const sx = (x: number) => padL + ((x - xMin) / xR) * innerW
    const sy = (y: number) => padT + innerH - ((y - yMin) / yR) * innerH
    // Build tick labels — 5 evenly-spaced on each axis
    const xTicks = Array.from({ length: 5 }, (_, i) => xMin + (xR * i) / 4)
    const yTicks = Array.from({ length: 5 }, (_, i) => yMin + (yR * i) / 4)
    // Best-fit line if provided
    const bestFit = graphic.bestFit as { m?: number; b?: number } | undefined
    return (
      <figure className="my-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-md mx-auto bg-white">
          {/* axes */}
          <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="black" strokeWidth={1} />
          <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="black" strokeWidth={1} />
          {/* x ticks */}
          {xTicks.map((v, i) => (
            <g key={i}>
              <line x1={sx(v)} y1={H - padB} x2={sx(v)} y2={H - padB + 3} stroke="black" strokeWidth={0.75} />
              <text x={sx(v)} y={H - padB + 12} fontSize="8" textAnchor="middle" fill="black">{fmtTick(v)}</text>
            </g>
          ))}
          {/* y ticks */}
          {yTicks.map((v, i) => (
            <g key={i}>
              <line x1={padL - 3} y1={sy(v)} x2={padL} y2={sy(v)} stroke="black" strokeWidth={0.75} />
              <text x={padL - 5} y={sy(v) + 3} fontSize="8" textAnchor="end" fill="black">{fmtTick(v)}</text>
            </g>
          ))}
          {/* best-fit line — drawn first so points sit on top */}
          {bestFit && typeof bestFit.m === 'number' && typeof bestFit.b === 'number' && (
            <line x1={sx(xMin)} y1={sy(bestFit.m * xMin + bestFit.b)} x2={sx(xMax)} y2={sy(bestFit.m * xMax + bestFit.b)} stroke="black" strokeWidth={0.75} strokeDasharray="3 2" />
          )}
          {/* points / line series */}
          {seriesList.map((s, si) => (
            <g key={si}>
              {t !== 'scatter' && s.points.length > 1 && (
                <polyline
                  points={s.points.map(p => `${sx(p[0])},${sy(p[1])}`).join(' ')}
                  fill="none" stroke="black" strokeWidth={1}
                />
              )}
              {s.points.map((p, i) => (
                <circle key={i} cx={sx(p[0])} cy={sy(p[1])} r={2.5} fill="black" />
              ))}
            </g>
          ))}
          {graphic.xLabel && <text x={padL + innerW / 2} y={H - 2} fontSize="10" textAnchor="middle" fill="black" fontStyle="italic">{graphic.xLabel}</text>}
          {graphic.yLabel && <text x={10} y={padT + innerH / 2} fontSize="10" textAnchor="middle" fill="black" fontStyle="italic" transform={`rotate(-90 10 ${padT + innerH / 2})`}>{graphic.yLabel}</text>}
        </svg>
        {graphic.caption && <figcaption className="text-[11px] text-black text-center italic mt-2">{graphic.caption}</figcaption>}
      </figure>
    )
  }

  // ─ Dot plot ────────────────────────────────────────────────────
  if (t === 'dotplot') {
    const values = ((graphic.values ?? []) as number[]).map(Number).filter(n => !isNaN(n))
    if (values.length === 0) return null
    // Stack dots by integer value
    const counts: Record<string, number> = {}
    values.forEach(v => { counts[String(v)] = (counts[String(v)] ?? 0) + 1 })
    const keys = Object.keys(counts).map(Number).sort((a, b) => a - b)
    const minK = keys[0], maxK = keys[keys.length - 1]
    const maxStack = Math.max(...Object.values(counts))
    const W = 300, H = 160
    const padL = 24, padB = 26, padT = 10, padR = 12
    const innerW = W - padL - padR
    const innerH = H - padT - padB
    const range = (maxK - minK) || 1
    const sx = (v: number) => padL + ((v - minK) / range) * innerW
    const dotR = Math.min(5, innerH / (maxStack + 1) / 2.4)
    return (
      <figure className="my-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-md mx-auto bg-white">
          {keys.map((k, i) => (
            <g key={i}>
              {Array.from({ length: counts[String(k)] }).map((_, j) => (
                <circle key={j} cx={sx(k)} cy={H - padB - dotR - j * (dotR * 2 + 1)} r={dotR} fill="black" />
              ))}
              <text x={sx(k)} y={H - padB + 12} fontSize="9" textAnchor="middle" fill="black">{k}</text>
            </g>
          ))}
          <line x1={padL - 6} y1={H - padB} x2={W - padR + 6} y2={H - padB} stroke="black" strokeWidth={1} />
          {graphic.xLabel && <text x={padL + innerW / 2} y={H - 2} fontSize="10" textAnchor="middle" fill="black" fontStyle="italic">{graphic.xLabel}</text>}
        </svg>
        {graphic.caption && <figcaption className="text-[11px] text-black text-center italic mt-2">{graphic.caption}</figcaption>}
      </figure>
    )
  }

  // ─ Coordinate plane (functions, points, lines) ─────────────────
  if (t === 'coordinateplane' || t === 'coordinate' || t === 'plane') {
    const W = 280, H = 280
    const padL = 30, padB = 30, padT = 14, padR = 14
    const innerW = W - padL - padR
    const innerH = H - padT - padB
    const pts = ((graphic.points ?? []) as Array<{ x: number; y: number; label?: string }>)
      .filter(p => p && typeof p.x === 'number' && typeof p.y === 'number')
    const lines = ((graphic.spec as { lines?: Array<{ m: number; b: number }> } | undefined)?.lines
      ?? (graphic as unknown as { lines?: Array<{ m: number; b: number }> }).lines ?? [])
    const xVals = pts.map(p => p.x)
    const yVals = pts.map(p => p.y)
    const xMin = Math.min(-5, ...xVals); const xMax = Math.max(5, ...xVals)
    const yMin = Math.min(-5, ...yVals); const yMax = Math.max(5, ...yVals)
    const xR = xMax - xMin; const yR = yMax - yMin
    const sx = (x: number) => padL + ((x - xMin) / xR) * innerW
    const sy = (y: number) => padT + innerH - ((y - yMin) / yR) * innerH
    const xOrigin = sx(0), yOrigin = sy(0)
    return (
      <figure className="my-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-md mx-auto bg-white">
          {/* grid */}
          {Array.from({ length: Math.floor(xR) + 1 }).map((_, i) => {
            const v = Math.ceil(xMin) + i
            return <line key={`vg${i}`} x1={sx(v)} y1={padT} x2={sx(v)} y2={H - padB} stroke="#d4d4d4" strokeWidth={0.4} />
          })}
          {Array.from({ length: Math.floor(yR) + 1 }).map((_, i) => {
            const v = Math.ceil(yMin) + i
            return <line key={`hg${i}`} x1={padL} y1={sy(v)} x2={W - padR} y2={sy(v)} stroke="#d4d4d4" strokeWidth={0.4} />
          })}
          {/* axes */}
          <line x1={padL} y1={yOrigin} x2={W - padR} y2={yOrigin} stroke="black" strokeWidth={1} />
          <line x1={xOrigin} y1={padT} x2={xOrigin} y2={H - padB} stroke="black" strokeWidth={1} />
          {/* tick labels */}
          {[-4, -2, 2, 4].map(v => v >= xMin && v <= xMax && (
            <text key={`xt${v}`} x={sx(v)} y={yOrigin + 11} fontSize="8" textAnchor="middle" fill="black">{v}</text>
          ))}
          {[-4, -2, 2, 4].map(v => v >= yMin && v <= yMax && (
            <text key={`yt${v}`} x={xOrigin - 5} y={sy(v) + 3} fontSize="8" textAnchor="end" fill="black">{v}</text>
          ))}
          {/* lines */}
          {lines.map((ln, i) => (
            <line key={i} x1={sx(xMin)} y1={sy(ln.m * xMin + ln.b)} x2={sx(xMax)} y2={sy(ln.m * xMax + ln.b)} stroke="black" strokeWidth={1} />
          ))}
          {/* points */}
          {pts.map((p, i) => (
            <g key={i}>
              <circle cx={sx(p.x)} cy={sy(p.y)} r={2.5} fill="black" />
              {p.label && <text x={sx(p.x) + 5} y={sy(p.y) - 4} fontSize="9" fill="black" fontWeight="600">{p.label}</text>}
            </g>
          ))}
        </svg>
        {graphic.caption && <figcaption className="text-[11px] text-black text-center italic mt-2">{graphic.caption}</figcaption>}
      </figure>
    )
  }

  // ─ Inscribed triangle in circle ────────────────────────────────
  // The model emits {type:"inscribedTriangle", r, vertexAngles:[a1,a2,a3], vertexLabels?, sideLabels?}.
  // We compute vertex positions exactly via cos/sin so they're
  // GUARANTEED to lie on the circle — eliminates "vertex floating
  // inside circle" errors from raw SVG attempts.
  if (t === 'inscribedtriangle' || (graphic.shape ?? '').toLowerCase() === 'inscribedtriangle') {
    const spec = (graphic.spec ?? {}) as { r?: number; vertexAngles?: number[] }
    const labels = (graphic.labels ?? {}) as { vertices?: string[]; sides?: string[] }
    const r = typeof spec.r === 'number' ? spec.r : 70
    const angles = (spec.vertexAngles ?? [0, 120, 240]).slice(0, 3)
    const cx = 100, cy = 100
    const toRad = (deg: number) => (deg - 90) * Math.PI / 180 // 0° = top
    const pts = angles.map(a => [cx + r * Math.cos(toRad(a)), cy + r * Math.sin(toRad(a))] as [number, number])
    const path = `M ${pts[0][0]},${pts[0][1]} L ${pts[1][0]},${pts[1][1]} L ${pts[2][0]},${pts[2][1]} Z`
    const vL = labels.vertices ?? []
    const sL = labels.sides ?? []
    return (
      <figure className="my-3 flex flex-col items-center">
        <div className="max-w-md w-full bg-white rounded-lg ring-1 ring-gray-200 p-4">
          <svg viewBox="0 0 200 200" className="w-full h-auto max-h-[300px] overflow-visible">
            <circle cx={cx} cy={cy} r={r} stroke="black" strokeWidth={1.5} fill="none" />
            <path d={path} stroke="black" strokeWidth={1.5} fill="none" />
            {pts.map((p, i) => {
              // Push label away from center along the vertex radius
              const dx = p[0] - cx, dy = p[1] - cy
              const len = Math.hypot(dx, dy) || 1
              const lx = p[0] + (dx / len) * 10
              const ly = p[1] + (dy / len) * 10
              return vL[i] ? (
                <text key={i} x={lx} y={ly} fontSize={11} fill="black" textAnchor="middle" dominantBaseline="middle">{vL[i]}</text>
              ) : null
            })}
            {[0, 1, 2].map(i => {
              if (!sL[i]) return null
              const a = pts[i], b = pts[(i + 1) % 3]
              const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2
              // Push label outward from centroid
              const dx = mx - cx, dy = my - cy
              const len = Math.hypot(dx, dy) || 1
              const lx = mx + (dx / len) * 10
              const ly = my + (dy / len) * 10
              return <text key={`s${i}`} x={lx} y={ly} fontSize={11} fill="black" textAnchor="middle" dominantBaseline="middle">{sL[i]}</text>
            })}
          </svg>
        </div>
        {graphic.caption && <figcaption className="text-[11px] text-black text-center italic mt-2">{graphic.caption}</figcaption>}
      </figure>
    )
  }

  // ─ Right triangle (with optional inscribed circle) ─────────────
  // Model emits {type:"rightTriangle", legA, legB, labels?:{a,b,c,vertices?:[A,B,C]}, incircle?:true}.
  // We compute incircle radius via the correct formula r = (a+b-c)/2.
  if (t === 'righttriangle' || (graphic.shape ?? '').toLowerCase() === 'righttriangle') {
    const spec = (graphic.spec ?? {}) as { legA?: number; legB?: number; incircle?: boolean }
    const labels = (graphic.labels ?? {}) as { a?: string; b?: string; c?: string; vertices?: string[] }
    const a = typeof spec.legA === 'number' ? spec.legA : 6
    const b = typeof spec.legB === 'number' ? spec.legB : 8
    const c = Math.hypot(a, b)
    // Scale to fit in 160×160 drawing area (20-unit margin).
    const scale = 140 / Math.max(a, b)
    const pxA = a * scale, pxB = b * scale
    // Right angle at bottom-left (30, 170); legs run +x and -y.
    const blX = 30, blY = 170
    const brX = blX + pxA, brY = blY
    const tlX = blX, tlY = blY - pxB
    return (
      <figure className="my-3 flex flex-col items-center">
        <div className="max-w-md w-full bg-white rounded-lg ring-1 ring-gray-200 p-4">
          <svg viewBox="0 0 200 200" className="w-full h-auto max-h-[300px] overflow-visible">
            <polygon points={`${blX},${blY} ${brX},${brY} ${tlX},${tlY}`} stroke="black" strokeWidth={1.5} fill="none" />
            {/* Right-angle square mark at the right-angle vertex */}
            <polyline points={`${blX + 8},${blY} ${blX + 8},${blY - 8} ${blX},${blY - 8}`} stroke="black" strokeWidth={1} fill="none" />
            {/* Optional inscribed circle (correct radius) */}
            {spec.incircle && (() => {
              const rScaled = ((a + b - c) / 2) * scale
              return <circle cx={blX + rScaled} cy={blY - rScaled} r={rScaled} stroke="black" strokeWidth={1.5} fill="none" />
            })()}
            {/* Leg labels at midpoints, offset outward */}
            {labels.a && <text x={(blX + brX) / 2} y={blY + 14} fontSize={11} fill="black" textAnchor="middle">{labels.a}</text>}
            {labels.b && <text x={blX - 6} y={(blY + tlY) / 2} fontSize={11} fill="black" textAnchor="end" dominantBaseline="middle">{labels.b}</text>}
            {labels.c && <text x={(brX + tlX) / 2 + 6} y={(brY + tlY) / 2 - 6} fontSize={11} fill="black" textAnchor="start">{labels.c}</text>}
            {labels.vertices && labels.vertices[0] && <text x={tlX - 6} y={tlY - 4} fontSize={11} fill="black" textAnchor="end" fontWeight="600">{labels.vertices[0]}</text>}
            {labels.vertices && labels.vertices[1] && <text x={blX - 6} y={blY + 12} fontSize={11} fill="black" textAnchor="end" fontWeight="600">{labels.vertices[1]}</text>}
            {labels.vertices && labels.vertices[2] && <text x={brX + 6} y={brY + 12} fontSize={11} fill="black" textAnchor="start" fontWeight="600">{labels.vertices[2]}</text>}
          </svg>
        </div>
        {graphic.caption && <figcaption className="text-[11px] text-black text-center italic mt-2">{graphic.caption}</figcaption>}
      </figure>
    )
  }

  // ─ Circle with chord / diameter / tangent / inscribed angle ────
  // Model emits {type:"circleWithChord", r, chords:[{angle1, angle2, label?}], showCenter?, points?:[{angle, label?}]}.
  if (t === 'circlewithchord' || (graphic.shape ?? '').toLowerCase() === 'circlewithchord') {
    const spec = (graphic.spec ?? {}) as { r?: number; chords?: Array<{ angle1: number; angle2: number; label?: string }>; showCenter?: boolean; points?: Array<{ angle: number; label?: string }> }
    const r = typeof spec.r === 'number' ? spec.r : 70
    const cx = 100, cy = 100
    const toRad = (deg: number) => (deg - 90) * Math.PI / 180
    const pt = (deg: number) => [cx + r * Math.cos(toRad(deg)), cy + r * Math.sin(toRad(deg))] as [number, number]
    const chords = spec.chords ?? []
    const points = spec.points ?? []
    return (
      <figure className="my-3 flex flex-col items-center">
        <div className="max-w-md w-full bg-white rounded-lg ring-1 ring-gray-200 p-4">
          <svg viewBox="0 0 200 200" className="w-full h-auto max-h-[300px] overflow-visible">
            <circle cx={cx} cy={cy} r={r} stroke="black" strokeWidth={1.5} fill="none" />
            {spec.showCenter && <circle cx={cx} cy={cy} r={2} fill="black" />}
            {chords.map((ch, i) => {
              const p1 = pt(ch.angle1), p2 = pt(ch.angle2)
              return (
                <g key={i}>
                  <line x1={p1[0]} y1={p1[1]} x2={p2[0]} y2={p2[1]} stroke="black" strokeWidth={1.5} />
                  {ch.label && (
                    <text x={(p1[0] + p2[0]) / 2 + 6} y={(p1[1] + p2[1]) / 2 - 6} fontSize={11} fill="black">{ch.label}</text>
                  )}
                </g>
              )
            })}
            {points.map((p, i) => {
              const [x, y] = pt(p.angle)
              const dx = x - cx, dy = y - cy
              const len = Math.hypot(dx, dy) || 1
              const lx = x + (dx / len) * 10
              const ly = y + (dy / len) * 10
              return (
                <g key={i}>
                  <circle cx={x} cy={y} r={2} fill="black" />
                  {p.label && <text x={lx} y={ly} fontSize={11} fill="black" textAnchor="middle" dominantBaseline="middle" fontWeight="600">{p.label}</text>}
                </g>
              )
            })}
          </svg>
        </div>
        {graphic.caption && <figcaption className="text-[11px] text-black text-center italic mt-2">{graphic.caption}</figcaption>}
      </figure>
    )
  }

  // ─ Raw SVG escape hatch (geometry, irregular figures) ──────────
  if (t === 'rawsvg' || graphic.svg) {
    return <RawSvgFigure svg={graphic.svg ?? ''} caption={graphic.caption ?? undefined} />
  }

  // ─ Caption-only fallback ───────────────────────────────────────
  return graphic.caption ? (
    <div className="my-3 px-3 py-2 text-[11px] text-black text-center italic">
      [{graphic.caption}]
    </div>
  ) : null
}

function RawSvgFigure({ svg, caption }: { svg: string; caption?: string }) {
  if (!svg) return null
  return (
    <figure className="my-3 flex flex-col items-center">
      {/* Wrap the SVG in a padded white card with a light gray
       *  ring. Models frequently draw shapes flush against the
       *  viewBox edges (polygon vertices at (0,200), circles with
       *  r=95 in a 200x200 viewBox); without the padding the
       *  figure cuts at the card boundary and labels touch the
       *  surrounding prose. overflow-visible on the svg lets text
       *  labels positioned just outside the viewBox still render. */}
      <div className="max-w-md w-full bg-white rounded-lg ring-1 ring-gray-200 p-4">
        <div
          className="w-full [&_svg]:w-full [&_svg]:h-auto [&_svg]:max-h-[300px] [&_svg]:overflow-visible"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
      {caption && <figcaption className="text-[11px] text-black text-center italic mt-2">{caption}</figcaption>}
    </figure>
  )
}

function fmtTick(v: number): string {
  if (Number.isInteger(v)) return String(v)
  return v.toFixed(Math.abs(v) < 1 ? 2 : 1)
}

/**
 * TOEFL Speaking audio practice control bar — used for both
 * speaking_repeat ("Listen and Repeat") and speaking_interview
 * ("Take an Interview") item types.
 *
 *  • Speak button — browser SpeechSynthesisUtterance reads `sourceText`
 *    aloud (no API call). Always present where TTS is supported.
 *  • Record button — MediaRecorder captures the student's voice, POSTs
 *    to /api/study/response/transcribe, then appends the returned
 *    transcript to whatever they've already typed via `onTranscript`.
 *
 * Both controls are additive: the student can also just type in the
 * existing textarea, so this works on platforms without mic or TTS.
 */
function AudioPracticeBar({ sourceText, sessionId, language, onTranscript, ko }: {
  sourceText: string
  sessionId: string
  language: 'en' | 'ko'
  onTranscript: (text: string) => void
  ko: boolean
}) {
  const [speaking, setSpeaking] = useState(false)
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const recRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const micSupported = typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined'

  const play = () => {
    if (!ttsSupported || speaking) return
    const u = new SpeechSynthesisUtterance(sourceText)
    u.lang = language === 'ko' ? 'ko-KR' : 'en-US'
    u.rate = 0.95
    u.onend = () => setSpeaking(false)
    u.onerror = () => setSpeaking(false)
    setSpeaking(true)
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  }

  const startRec = async () => {
    if (!micSupported || recording || transcribing) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : ''
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
      chunksRef.current = []
      rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      rec.onstop = async () => {
        setTranscribing(true)
        try {
          const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || 'audio/webm' })
          const headers = await authHeaders()
          const form = new FormData()
          form.append('audio', blob, 'voice.webm')
          form.append('sessionId', sessionId)
          form.append('language', language)
          const { Authorization } = headers as { Authorization?: string }
          const res = await fetch('/api/study/response/transcribe', {
            method: 'POST',
            headers: Authorization ? { Authorization } : {},
            body: form,
          })
          const json = await res.json()
          if (res.ok && typeof json.text === 'string' && json.text.trim()) {
            onTranscript(json.text.trim())
          }
        } catch {
          // Silent fail — student can retry or type.
        } finally {
          setTranscribing(false)
        }
      }
      recRef.current = rec
      rec.start()
      setRecording(true)
    } catch {
      // Permission denied / no mic.
    }
  }

  const stopRec = () => {
    const rec = recRef.current
    if (!rec || rec.state === 'inactive') return
    rec.stop()
    streamRef.current?.getTracks().forEach(t => t.stop())
    setRecording(false)
  }

  // Stop TTS / release mic on unmount.
  useEffect(() => () => {
    if (ttsSupported) window.speechSynthesis.cancel()
    streamRef.current?.getTracks().forEach(t => t.stop())
  }, [ttsSupported])

  if (!ttsSupported && !micSupported) return null

  return (
    <div className="flex flex-wrap items-center gap-2 mb-3">
      {ttsSupported && (
        <button type="button" onClick={play} disabled={speaking}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-[12.5px] text-gray-800 hover:border-primary hover:text-primary disabled:opacity-60"
        >
          <Volume2 className={`w-3.5 h-3.5 ${speaking ? 'text-primary' : ''}`} />
          {speaking
            ? (ko ? '재생 중…' : 'Playing…')
            : (ko ? '듣기' : 'Play')}
        </button>
      )}
      {micSupported && (
        recording ? (
          <button type="button" onClick={stopRec}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-[12.5px] hover:bg-rose-700"
          >
            <MicOff className="w-3.5 h-3.5" />
            {ko ? '녹음 중지' : 'Stop'}
          </button>
        ) : (
          <button type="button" onClick={startRec} disabled={transcribing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-[12.5px] text-gray-800 hover:border-primary hover:text-primary disabled:opacity-60"
          >
            {transcribing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mic className="w-3.5 h-3.5" />}
            {transcribing
              ? (ko ? '받아쓰는 중…' : 'Transcribing…')
              : (ko ? '녹음' : 'Record')}
          </button>
        )
      )}
    </div>
  )
}

/**
 * Normalize display text so students don't see raw \n or **bold**
 * markers when the model leaks JSON-escapes or markdown into passage /
 * prompt / choice fields:
 *   - Literal "\n" (backslash + n as two chars, from double-encoded
 *     JSON strings the model occasionally emits) → real newline
 *   - Literal "\t" → real tab
 *   - "**bold**" → bold
 *   - "*italic*" → italic (single-star pairs only; won't touch a lone
 *     "*" or math like "2*3")
 *   - Leading "# " / "## " / "### " heading markers stripped
 *   - Escaped quotes \" → "
 *
 * Applied at every user-facing render site (passage, prompt, choice,
 * correct-answer display).
 */
function normalizeDisplayText(text: string | null | undefined): string {
  if (!text) return ''
  let s = String(text)
  // Escaped whitespace + quote fixes first — order matters so later
  // regexes see real newlines.
  s = s.replace(/\\n/g, '\n')
       .replace(/\\t/g, '\t')
       .replace(/\\"/g, '"')
       .replace(/\\'/g, "'")
  // Markdown bold/italic — only inline pairs, not standalone stars.
  s = s.replace(/\*\*([^*\n]+?)\*\*/g, '$1')
       .replace(/(?<![*\w])\*([^*\n]+?)\*(?![*\w])/g, '$1')
  // Heading markers at line start.
  s = s.replace(/^#{1,4}\s+/gm, '')
  return s
}

function PassageParagraphs({ text }: { text: string }) {
  const normalized = normalizeDisplayText(text)
  // Split on one-or-more blank lines. Trim each paragraph so leading
  // whitespace from the model doesn't fight the indent we're adding.
  const paragraphs = normalized.split(/\n\s*\n+/).map(p => p.trim()).filter(Boolean)
  if (paragraphs.length <= 1) {
    // No paragraph breaks — render with whitespace-pre-wrap so any
    // intra-paragraph line breaks the model emits still show.
    return <p className="whitespace-pre-wrap">{normalized}</p>
  }
  return (
    <div className="space-y-3">
      {paragraphs.map((p, i) => (
        <p
          key={i}
          className="whitespace-pre-wrap"
          // First paragraph flush left; subsequent paragraphs get a
          // first-line indent. Bumped from 2em → 2.5em and space-y
          // 2 → 3 because the previous spacing was too tight for
          // students to perceive paragraph breaks at a glance.
          style={i === 0 ? undefined : { textIndent: '2.5em' }}
        >
          {p}
        </p>
      ))}
    </div>
  )
}

/** Test-format-aware choice label. KSAT uses circled digits ①-⑤,
 *  everything else uses Latin letters A-F. Falls back to numeric
 *  index if `family` is unknown or index out of range. */
function choiceLabel(family: string | null | undefined, index: number): string {
  if (family === 'ksat') {
    const circled = ['①', '②', '③', '④', '⑤', '⑥']
    return circled[index] ?? `${index + 1}.`
  }
  const letters = ['A', 'B', 'C', 'D', 'E', 'F']
  return letters[index] ?? `${index + 1}.`
}

/**
 * Convert a per-section percent (0-100) into the TOEFL Jan 2026
 * 1-6 band score (0.5 increments). ETS aligns the band to CEFR;
 * the mapping below is calibrated against the pre-2026 0-30 band
 * descriptors (Advanced ≥24, High-Int 18-23, Low-Int 4-17, Below 0-3)
 * extrapolated into the new scale. ETS hasn't published an exact
 * crosswalk yet, so this is best-effort and worth re-tuning when
 * official descriptors land.
 */
function percentToToeflBand(percent: number): number {
  if (percent >= 95) return 6.0
  if (percent >= 88) return 5.5
  if (percent >= 80) return 5.0
  if (percent >= 70) return 4.5
  if (percent >= 60) return 4.0
  if (percent >= 50) return 3.5
  if (percent >= 38) return 3.0
  if (percent >= 25) return 2.5
  if (percent >= 15) return 2.0
  if (percent >= 5) return 1.5
  return 1.0
}

function formatTime(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

/** Compute passage-group context for the current question — used to
 *  show "Passage X — Question Y of Z in this passage" labels on
 *  shared-passage tests (TOEFL/IELTS/ACT Reading). Returns null when
 *  the test has no passage groups or the current question is
 *  ungrouped. */
function passageGroupInfo(questions: Question[], currentIdx: number): {
  groupIndex: number
  totalGroups: number
  indexInGroup: number
  totalInGroup: number
} | null {
  const currentGroupId = questions[currentIdx]?.passageGroupId
  if (!currentGroupId) return null
  // Walk the list in order. Each new groupId increments groupIndex.
  // Within a group, count items to find this question's position.
  const groupOrder: string[] = []
  for (const q of questions) {
    const id = q.passageGroupId
    if (id && !groupOrder.includes(id)) groupOrder.push(id)
  }
  const totalGroups = groupOrder.length
  if (totalGroups < 2) return null // not worth showing for single group
  const groupIndex = groupOrder.indexOf(currentGroupId) + 1
  const inGroup = questions
    .map((q, i) => ({ q, i }))
    .filter(({ q }) => q.passageGroupId === currentGroupId)
  const totalInGroup = inGroup.length
  const indexInGroup = inGroup.findIndex(({ i }) => i === currentIdx) + 1
  return { groupIndex, totalGroups, indexInGroup, totalInGroup }
}

/** Stepped progress UI driven by the NDJSON event stream from the
 *  generator route. Each step lights up when the server emits its
 *  phase event; the progress bar tracks the carried percent. */
const PROGRESS_STEPS: { name: string; labelKey: string; minPercent: number }[] = [
  { name: 'format', labelKey: 'study.test.progress.format', minPercent: 5 },
  { name: 'drafting_questions', labelKey: 'study.test.progress.draftingQuestions', minPercent: 15 },
  { name: 'drafting_hard', labelKey: 'study.test.progress.draftingHard', minPercent: 40 },
  { name: 'verifying', labelKey: 'study.test.progress.verifying', minPercent: 60 },
  { name: 'assembling', labelKey: 'study.test.progress.assembling', minPercent: 92 },
  { name: 'done', labelKey: 'study.test.progress.done', minPercent: 100 },
]

function GenerationProgress({
  progress, t,
}: {
  progress: { name: string; labelKey: string; percent: number } | null
  t: (key: string) => string | string[]
}) {
  const percent = progress?.percent ?? 0
  const activeStepIndex = progress
    ? PROGRESS_STEPS.findIndex(s => s.name === progress.name)
    : -1
  // Special-case the polling stream — when the client connects to a
  // session whose server-side generation is already in flight on a
  // prior request, we get 'resuming' phase events. Tell the user
  // we're waiting for the existing run, not starting a new one.
  const isResuming = progress?.name === 'resuming'
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-3">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
          <h2 className="text-[17px] font-semibold tracking-tight text-gray-900">
            {String(t('study.test.progress.title'))}
          </h2>
          <p className="text-[12.5px] text-gray-500 mt-1">
            {String(t('study.test.progress.subtitle'))}
          </p>
        </div>

        {isResuming && (
          <div className="mb-4 rounded-xl bg-amber-50 ring-1 ring-amber-200 px-3 py-2.5 text-[12.5px] text-amber-900 leading-relaxed">
            {String(t('study.test.progress.resuming'))}
          </div>
        )}

        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden mb-5">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary/80 transition-[width] duration-500 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>

        <ul className="space-y-2.5">
          {PROGRESS_STEPS.filter(s => s.name !== 'done').map((step, i) => {
            const done = activeStepIndex > i || percent >= 100
            const active = activeStepIndex === i && percent < 100
            return (
              <li key={step.name} className="flex items-center gap-3">
                <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                  done ? 'bg-primary text-white' : active ? 'bg-primary/15 ring-2 ring-primary/30' : 'bg-gray-100'
                }`}>
                  {done
                    ? <CheckCircle2 className="w-3.5 h-3.5" />
                    : active
                      ? <Loader2 className="w-3 h-3 text-primary animate-spin" />
                      : <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />}
                </div>
                <span className={`text-[13.5px] ${
                  done ? 'text-gray-500' : active ? 'text-gray-900 font-medium' : 'text-gray-400'
                }`}>
                  {String(t(step.labelKey))}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
