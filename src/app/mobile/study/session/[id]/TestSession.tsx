"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Loader2, RefreshCw, ArrowRight, ArrowLeft, Clock, CheckCircle2,
  XCircle, AlertTriangle, ChevronDown, ChevronUp, Sparkles,
  Volume2, Mic, MicOff, Play, Eye, EyeOff,
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
    | 'writing_email' | 'writing_discussion'
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
  // TOEFL Listening audio is playing — locks Prev/Next/Grid so students
  // can't skim ahead while a recording is speaking (ETS-faithful:
  // question navigation is disabled while audio plays).
  const [audioPlaying, setAudioPlaying] = useState(false)
  // TOEFL Speaking Take-an-Interview timer state, keyed per-question.
  // 'idle' before the audio finishes, 'started' during prep+response,
  // 'expired' after the response window closes. Locks the textarea +
  // recorder when expired.
  const [interviewTimerState, setInterviewTimerState] = useState<Record<string, 'idle' | 'started' | 'expired'>>({})
  // Storage paths + speech signals for the student's voice recordings,
  // keyed by question index. Persist so the review pane can play the
  // recording back + so the rubric grader has real delivery metrics
  // (WPM, pause count, transcription clarity) for the speaking rubric.
  // Reset per session; not persisted across page reload.
  const [answerAudioPaths, setAnswerAudioPaths] = useState<Record<number, string>>({})
  const [answerSpeechSignals, setAnswerSpeechSignals] = useState<Record<number, SpeechSignals>>({})
  // TOEFL Speaking grade mode picked at test start — routes the
  // rubric feedback request to either the text-only endpoint or the
  // gpt-4o-audio-preview endpoint. Fetched from the session row on
  // mount; defaults to 'text' if unset or non-Speaking test.
  const [speakingGradeMode, setSpeakingGradeMode] = useState<'text' | 'audio'>('text')
  /** Generation progress — populated by the NDJSON event stream from
   *  /api/study/test/generate. Each phase event carries an i18n key
   *  and an integer percent. Null until the first event arrives. */
  const [progress, setProgress] = useState<{ name: string; labelKey: string; percent: number } | null>(null)

  // Timer plumbing (active-time model):
  //   - activeElapsedMsRef = total ms accumulated while the tab was
  //     visible AND the student hadn't paused. Persisted to
  //     localStorage so a refresh mid-test doesn't lose time.
  //   - resumedAtRef = Date.now() of the last "became active"
  //     transition. When null, the timer is FROZEN (either paused
  //     manually or the tab is hidden). Effective elapsed at any
  //     moment = activeElapsedMs + (resumedAt ? now - resumedAt : 0).
  //   - `now` state exists solely to trigger re-renders every second.
  //   - `paused` = manual pause. Distinguished from tab-hidden pause
  //     so the paused overlay only shows for manual pauses (the tab
  //     being hidden means the user can't see the overlay anyway).
  const activeElapsedMsRef = useRef<number>(0)
  const resumedAtRef = useRef<number | null>(null)
  const [paused, setPaused] = useState(false)
  const [now, setNow] = useState(Date.now())
  // Helper to compute the total elapsed at any moment. Cheap, no
  // state — called wherever we need the current elapsed value.
  const currentElapsedMs = useCallback(() => {
    const base = activeElapsedMsRef.current
    return resumedAtRef.current ? base + (Date.now() - resumedAtRef.current) : base
  }, [])

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
        .select('generation_status, speaking_grade_mode')
        .eq('id', sessionId)
        .maybeSingle()
      // 'ready' = built; null = freshly created session that hasn't
      // been generated yet; 'pending' = generation in flight on
      // another tab (we'll join that stream and show progress).
      // 'failed' = treat as fresh attempt so the user can retry.
      isResume = pre?.generation_status === 'ready'
      if (pre?.speaking_grade_mode === 'audio') setSpeakingGradeMode('audio')
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

      // Restore or initialise the active-time accumulator. Old
      // sessions used `:startedAt` (wall-clock); those are read and
      // migrated to the new elapsed-based key so students who're
      // mid-test on the day of deploy don't lose their progress.
      const elapsedKey = `study:test:${sessionId}:elapsedMs`
      const legacyStartedAtKey = `study:test:${sessionId}:startedAt`
      let restored = 0
      if (typeof window !== 'undefined') {
        const storedElapsed = localStorage.getItem(elapsedKey)
        if (storedElapsed) {
          restored = parseInt(storedElapsed, 10) || 0
        } else {
          const legacyStartedAt = localStorage.getItem(legacyStartedAtKey)
          if (legacyStartedAt) {
            // Legacy migration: treat legacy startedAt as if it were
            // all active time (approximation — undercharges by any
            // hidden-tab time, which is fine for the transition).
            restored = Math.max(0, Date.now() - parseInt(legacyStartedAt, 10))
            localStorage.setItem(elapsedKey, String(restored))
            localStorage.removeItem(legacyStartedAtKey)
          }
        }
      }
      activeElapsedMsRef.current = restored
      resumedAtRef.current = Date.now()  // start the clock immediately on taking
      setPhase('taking')
    } catch {
      setPhase('error')
    }
  }, [sessionId])

  useEffect(() => { void load() }, [load])

  // Re-render every second while taking so the timer ticks down.
  // Also persist the current elapsed to localStorage so an accidental
  // refresh doesn't lose progress.
  useEffect(() => {
    if (phase !== 'taking') return
    const id = setInterval(() => {
      setNow(Date.now())
      if (typeof window !== 'undefined') {
        localStorage.setItem(`study:test:${sessionId}:elapsedMs`, String(currentElapsedMs()))
      }
    }, 1000)
    return () => clearInterval(id)
  }, [phase, sessionId, currentElapsedMs])

  // Freeze the timer when the tab is hidden, resume when visible.
  // This makes practice tests non-hostile: a student who takes a call
  // mid-test doesn't lose time. Real ETS behaviour differs but that's
  // not this app's job.
  useEffect(() => {
    if (phase !== 'taking') return
    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        // Freeze: flush the currently-accumulating span into the
        // ref and null out resumedAt so ticks stop advancing.
        if (resumedAtRef.current != null) {
          activeElapsedMsRef.current += Date.now() - resumedAtRef.current
          resumedAtRef.current = null
        }
      } else {
        // Resume: only restart the clock if the student hasn't
        // ALSO manually paused. If they paused before switching
        // away, coming back keeps them paused.
        if (!paused && resumedAtRef.current == null) {
          resumedAtRef.current = Date.now()
        }
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [phase, paused])

  // Manual pause / resume toggle.
  const togglePause = useCallback(() => {
    setPaused(p => {
      const nextPaused = !p
      if (nextPaused) {
        // Pausing: flush accumulated time + freeze.
        if (resumedAtRef.current != null) {
          activeElapsedMsRef.current += Date.now() - resumedAtRef.current
          resumedAtRef.current = null
        }
      } else {
        // Resuming: only if tab is currently visible. If the tab is
        // hidden right now (rare edge — student toggled from a
        // different context) the visibility handler will kick in on
        // the next 'visible' transition.
        if (typeof document === 'undefined' || document.visibilityState === 'visible') {
          resumedAtRef.current = Date.now()
        }
      }
      return nextPaused
    })
  }, [])

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
      const elapsedSeconds = Math.max(0, Math.round(currentElapsedMs() / 1000))
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
        localStorage.removeItem(`study:test:${sessionId}:elapsedMs`)
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
  // Total time budget in ms. `now` is here so the effect re-runs
  // every tick to check whether we've exceeded the budget.
  const timeLimitMs = test ? test.timeLimitMinutes * 60_000 : 0
  useEffect(() => {
    if (phase !== 'taking' || !timeLimitMs) return
    if (currentElapsedMs() >= timeLimitMs) void submit()
  }, [now, timeLimitMs, phase, submit, currentElapsedMs])

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
    return <ReviewView test={test} answers={answers} answerAudioPaths={answerAudioPaths} answerSpeechSignals={answerSpeechSignals} speakingGradeMode={speakingGradeMode} result={result} ko={ko} sessionId={sessionId} />
  }

  // phase === 'taking' or 'submitting'
  const q = test.questions[currentIdx]
  // `now` in deps forces this to re-derive every tick.
  const remainingMs = Math.max(0, timeLimitMs - currentElapsedMs())
  void now
  const answered = answers.filter(a => a != null).length

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {/* Sticky timer + progress strip */}
      <div className="flex-shrink-0 px-5 py-2.5 border-b border-gray-100 bg-white flex items-center justify-between">
        <button
          type="button"
          onClick={() => setGridOpen(v => !v)}
          disabled={audioPlaying}
          className="text-xs text-gray-600 inline-flex items-center gap-1 disabled:opacity-40"
        >
          {t('study.test.questionN', { current: String(currentIdx + 1), total: String(test.questions.length) })}
          {gridOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        <div className="inline-flex items-center gap-2">
          <div className={`inline-flex items-center gap-1 text-xs font-mono tabular-nums ${
            paused ? 'text-primary font-semibold'
              : remainingMs < 60_000 ? 'text-rose-600 font-bold'
              : remainingMs < 5 * 60_000 ? 'text-amber-700'
              : 'text-gray-600'
          }`}>
            <Clock className="w-3.5 h-3.5" />
            {formatTime(remainingMs)}
          </div>
          <button
            type="button"
            onClick={togglePause}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-colors ${
              paused
                ? 'bg-primary text-white border-primary hover:bg-primary/90'
                : 'bg-white text-gray-700 border-gray-200 hover:border-primary hover:text-primary'
            }`}
            aria-label={paused ? (ko ? '재개' : 'Resume') : (ko ? '일시정지' : 'Pause')}
          >
            {paused ? (ko ? '재개' : 'Resume') : (ko ? '일시정지' : 'Pause')}
          </button>
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
        {q.passage && q.type !== 'fill_in_blanks' && (() => {
          // Passage-group header + read-only passage box. Skipped for
          // fill_in_blanks (TOEFL Complete-the-Words) because the
          // interactive fill-in renderer below shows the SAME passage
          // with inline inputs — rendering it twice would duplicate
          // the paragraph on screen and let students think the header
          // "Question X of Y" applies to unrelated passages.
          const groupInfo = passageGroupInfo(test.questions, currentIdx)
          // TOEFL Listening items ship the spoken script inside the
          // passage field prefixed with "Transcript:". Detect and route
          // to the audio player so students actually LISTEN instead of
          // reading. Falls back to the transcript view on browsers
          // without SpeechSynthesis.
          const isListeningItem = test.family === 'toefl'
            && test.section != null
            && /listening/i.test(test.section)
            && /^\s*transcript:/i.test(q.passage ?? '')
          return (
            <>
              {groupInfo && (
                <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.10em] text-primary">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10">
                    {isListeningItem
                      ? (ko
                          ? `녹음 ${groupInfo.groupIndex} / ${groupInfo.totalGroups}`
                          : `Recording ${groupInfo.groupIndex} of ${groupInfo.totalGroups}`)
                      : (ko
                          ? `지문 ${groupInfo.groupIndex} / ${groupInfo.totalGroups}`
                          : `Passage ${groupInfo.groupIndex} of ${groupInfo.totalGroups}`)}
                  </span>
                  <span className="text-gray-500 font-normal normal-case tracking-normal">
                    {isListeningItem
                      ? (ko
                          ? `이 녹음의 ${groupInfo.indexInGroup} / ${groupInfo.totalInGroup}번 문항`
                          : `Question ${groupInfo.indexInGroup} of ${groupInfo.totalInGroup} for this recording`)
                      : (ko
                          ? `이 지문의 ${groupInfo.indexInGroup} / ${groupInfo.totalInGroup}번 문항`
                          : `Question ${groupInfo.indexInGroup} of ${groupInfo.totalInGroup} in this passage`)}
                  </span>
                </div>
              )}
              {isListeningItem ? (
                <ListeningAudioPlayer
                  // Remount when the passage group changes; play count
                  // persists in a module-level store keyed by group so
                  // the counter survives remount when the student
                  // navigates back to the same recording.
                  key={q.passageGroupId ?? `standalone-${currentIdx}`}
                  groupKey={`${sessionId}:${q.passageGroupId ?? `standalone-${currentIdx}`}`}
                  transcript={q.passage!}
                  language={language}
                  onSpeakingChange={setAudioPlaying}
                />
              ) : (
                <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-[14px] text-gray-800 leading-relaxed">
                  <PassageParagraphs text={q.passage} />
                </div>
              )}
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
          // TOEFL Listen-and-Repeat (Jan 2026, ETS-faithful): 1 play,
          // no transcript, must actually listen. Voice-record or type.
          (() => {
            const src = (q.passage ?? '').replace(/^transcript:\s*/i, '').replace(/^"|"$/g, '').trim() || q.correct_answer
            const appendTranscript = (text: string, signals?: SpeechSignals) => {
              setAnswers(prev => {
                const next = [...prev]
                next[currentIdx] = (next[currentIdx] ? next[currentIdx] + ' ' : '') + text
                return next
              })
              if (signals?.audioPath) setAnswerAudioPaths(prev => ({ ...prev, [currentIdx]: signals.audioPath! }))
              if (signals) setAnswerSpeechSignals(prev => ({ ...prev, [currentIdx]: signals }))
            }
            return (
              <div className="space-y-3">
                <p className="text-[12px] uppercase tracking-[0.10em] text-gray-500">
                  {ko ? '한 번만 재생됩니다. 들은 문장을 그대로 말하거나 입력하세요.' : 'You hear it ONCE. Speak or type it back exactly.'}
                </p>
                <ListeningAudioPlayer
                  key={`repeat-${currentIdx}`}
                  groupKey={`${sessionId}:repeat-${currentIdx}`}
                  transcript={src}
                  language={language}
                  maxPlays={1}
                  onSpeakingChange={setAudioPlaying}
                />
                <VoiceRecorderButton sessionId={sessionId} language={language} ko={ko} onTranscript={appendTranscript} />
                <textarea
                  value={answers[currentIdx] ?? ''}
                  onChange={(e) => {
                    const val = e.target.value
                    setAnswers(prev => { const next = [...prev]; next[currentIdx] = val; return next })
                  }}
                  rows={3}
                  placeholder={ko ? '들은 문장을 그대로 입력…' : 'Type back the sentence exactly…'}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-base text-gray-900 leading-relaxed placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <p className="text-[11px] text-gray-500">
                  {ko ? '대소문자·구두점은 평가에 영향 없음.' : 'Case and punctuation are not graded.'}
                </p>
              </div>
            )
          })()
        ) : (q.type === 'writing_email' || q.type === 'writing_discussion') ? (
          // TOEFL Writing Email / Academic Discussion (Jan 2026): open
          // free-response. Student reads the scenario in the passage
          // box above and writes a real reply (target 100+ words).
          // Rubric-scored post-submit via /api/study/response/grade.
          (() => {
            const target = q.type === 'writing_email' ? 100 : 150
            const student = answers[currentIdx] ?? ''
            const wordCount = student.trim().split(/\s+/).filter(Boolean).length
            return (
              <div className="space-y-3">
                <p className="text-[12px] uppercase tracking-[0.10em] text-gray-500">
                  {q.type === 'writing_email'
                    ? (ko ? '이메일 답장을 작성하세요' : 'Write your email reply')
                    : (ko ? '토론에 기여할 글을 작성하세요' : 'Write your contribution to the discussion')}
                </p>
                <textarea
                  value={student}
                  onChange={(e) => {
                    const val = e.target.value
                    setAnswers(prev => {
                      const next = [...prev]
                      next[currentIdx] = val
                      return next
                    })
                  }}
                  rows={12}
                  placeholder={q.type === 'writing_email'
                    ? (ko ? '수신자에게 어울리는 어조로 답장하세요. 3개 항목을 모두 다루세요.' : 'Reply in the register appropriate to the recipient. Address all 3 bullets.')
                    : (ko ? '입장을 명확히 하고, 최소 한 명의 동료를 이름으로 언급하며, 구체적 근거나 예시를 제시하세요.' : 'Stake a clear position, engage at least one classmate by name, and give a specific reason or example.')}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-base text-gray-900 leading-relaxed placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <div className="flex items-center justify-between text-[11px] text-gray-500">
                  <span>
                    {ko ? '목표' : 'Target'}: {target}+ {ko ? '단어' : 'words'}
                  </span>
                  <span className={wordCount >= target ? 'text-emerald-600 font-semibold' : ''}>
                    {wordCount} {ko ? '단어' : 'words'}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  {ko ? '자동 채점: 최소 길이 확인. 세부 밴드 점수는 시험 후 리뷰에서 확인 가능합니다.' : 'Auto-grading: length check only. Full rubric band is available in the post-test review.'}
                </p>
              </div>
            )
          })()
        ) : q.type === 'speaking_interview' ? (
          // TOEFL Take-an-Interview (Jan 2026, ETS-faithful): the
          // interviewer question is SPOKEN via TTS (real ETS is
          // audio-only for the prompt), then a 15-sec prep countdown
          // fires, then a 45-sec response window. Textarea locks when
          // the response window expires so students can't spend 5
          // minutes crafting a written answer.
          (() => {
            const questionText = q.prompt.replace(/^\s*\[[^\]]+\]\s*/, '')
            const appendTranscript = (text: string, signals?: SpeechSignals) => {
              setAnswers(prev => {
                const next = [...prev]
                next[currentIdx] = (next[currentIdx] ? next[currentIdx] + ' ' : '') + text
                return next
              })
              if (signals?.audioPath) setAnswerAudioPaths(prev => ({ ...prev, [currentIdx]: signals.audioPath! }))
              if (signals) setAnswerSpeechSignals(prev => ({ ...prev, [currentIdx]: signals }))
            }
            const timerKey = `interview-${currentIdx}`
            const phase = interviewTimerState[timerKey] ?? 'idle'
            const timerActive = phase === 'started'
            const timerExpired = phase === 'expired'
            return (
              <div className="space-y-3">
                <p className="text-[12px] uppercase tracking-[0.10em] text-gray-500">
                  {ko ? '면접관의 질문을 듣고, 준비 시간 후 답변하세요' : 'Listen to the interviewer, then respond after the prep window'}
                </p>
                <ListeningAudioPlayer
                  key={`interview-${currentIdx}`}
                  groupKey={`${sessionId}:interview-${currentIdx}`}
                  transcript={questionText}
                  language={language}
                  maxPlays={1}
                  onSpeakingChange={setAudioPlaying}
                  onFirstPlayEnd={() => setInterviewTimerState(s => ({ ...s, [timerKey]: 'started' }))}
                />
                <SpeakingTimer
                  active={timerActive}
                  prepSec={15}
                  responseSec={45}
                  ko={ko}
                  t={t}
                  onExpire={() => setInterviewTimerState(s => ({ ...s, [timerKey]: 'expired' }))}
                />
                {(phase === 'idle' || timerExpired) && (
                  <div className="text-[11px] text-gray-500 text-center">
                    {phase === 'idle'
                      ? t('study.test.speakingWaitForAudio')
                      : t('study.test.speakingTimeUp')}
                  </div>
                )}
                <VoiceRecorderButton
                  sessionId={sessionId} language={language} ko={ko}
                  disabled={phase === 'idle' || timerExpired}
                  onTranscript={appendTranscript}
                />
                <textarea
                  value={answers[currentIdx] ?? ''}
                  onChange={(e) => {
                    if (timerExpired) return
                    const val = e.target.value
                    setAnswers(prev => { const next = [...prev]; next[currentIdx] = val; return next })
                  }}
                  disabled={timerExpired}
                  rows={6}
                  placeholder={ko ? '여러 문장으로 답변하세요...' : 'Respond in several sentences...'}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-base text-gray-900 leading-relaxed placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-gray-50 disabled:text-gray-500"
                />
                <p className="text-[11px] text-gray-500">
                  {ko ? '근거·예시를 포함한 풍부한 답변을 권장합니다.' : 'Strong answers include reasons or examples.'}
                </p>
              </div>
            )
          })()
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
          disabled={currentIdx === 0 || audioPlaying}
          className="h-11 w-11 rounded-full bg-white border border-gray-200 text-gray-700 inline-flex items-center justify-center disabled:opacity-40"
          aria-label={String(t('study.test.previous'))}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        {currentIdx === test.questions.length - 1 ? (
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={phase === 'submitting' || audioPlaying}
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
            disabled={audioPlaying}
            className="flex-1 h-11 rounded-full bg-gray-900 text-white text-sm font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            {t('study.test.next')}
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
      {audioPlaying && (
        <div className="absolute bottom-16 left-4 right-4 rounded-lg bg-primary/95 text-white text-[12px] px-3 py-2 shadow-lg pointer-events-none text-center">
          {t('study.test.audioLockedNav')}
        </div>
      )}
      {paused && (
        // Fullscreen paused overlay — blocks all input while paused
        // (no answering, no navigating, no scrolling). Timer chip
        // stays visible in the header behind the overlay so students
        // can see remaining time. Resume via Pause button (still
        // clickable since the header sits above the overlay).
        <div
          className="absolute inset-0 z-30 bg-white/85 backdrop-blur-sm flex items-center justify-center px-6"
          role="dialog"
          aria-modal="true"
          aria-label={ko ? '시험 일시정지' : 'Test paused'}
        >
          <div className="text-center max-w-xs">
            <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 ring-1 ring-primary/25 flex items-center justify-center mb-3">
              <Clock className="w-6 h-6 text-primary" />
            </div>
            <div className="text-[17px] font-semibold text-gray-900">
              {ko ? '시험 일시정지됨' : 'Test paused'}
            </div>
            <p className="text-[13px] text-gray-600 mt-1.5 leading-relaxed">
              {ko
                ? '타이머가 멈추고 답변할 수 없습니다. 상단의 재개 버튼을 눌러 계속하세요.'
                : 'The timer is stopped and answers are locked. Tap Resume in the header to continue.'}
            </p>
            <button
              type="button"
              onClick={togglePause}
              className="mt-5 inline-flex items-center justify-center gap-1.5 h-11 px-5 rounded-full bg-primary text-white text-[14px] font-semibold shadow-[0_2px_6px_-2px_rgba(40,133,232,0.35)] active:scale-[0.99] transition"
            >
              {ko ? '재개' : 'Resume test'}
            </button>
          </div>
        </div>
      )}

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
type RubricGrade = {
  overallBand: number
  summary: string
  modelRewrite: string
  criteria: Array<{ key: string; score: number; evidence: string }>
}
type GradeResponse = { grade: RubricGrade; scaleMax: number }

function WritingFeedbackPanel({
  sessionId, prompt, response, skill, taskType, audioPath, speechSignals, speakingGradeMode, ko,
}: {
  sessionId: string
  prompt: string
  response: string
  /** Which rubric to apply. writing = email/discussion; speaking =
   *  interview response scored on delivery + language + topic dev. */
  skill: 'writing' | 'speaking'
  taskType?: 'email' | 'academic_discussion'
  /** Speaking only — path in the study-response-audio bucket. When
   *  present, the panel offers a playback button so the student can
   *  hear their own recording next to the rubric grade. Also sent to
   *  the grade endpoint so the submission row links to the audio. */
  audioPath?: string
  /** Speaking only — WPM / pause / clarity metrics extracted from
   *  the audio by Whisper's verbose_json output. Rendered as a
   *  "delivery snapshot" and sent to the grader so the delivery
   *  criterion reflects real audio signals. */
  speechSignals?: SpeechSignals
  /** Speaking only — 'audio' routes to gpt-4o-audio-preview grading
   *  (requires audioPath). Otherwise text-only via /response/grade. */
  speakingGradeMode?: 'text' | 'audio'
  ko: boolean
}) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [gradeNotice, setGradeNotice] = useState<string | null>(null)
  // Fetch a signed URL for the private audio file on demand so the
  // student can play it back. We defer the fetch until they open the
  // review section — nothing to fetch if audioPath is empty.
  useEffect(() => {
    if (!audioPath) { setAudioUrl(null); return }
    let cancelled = false
    ;(async () => {
      const { data } = await supabase.storage.from('study-response-audio').createSignedUrl(audioPath, 60 * 60)
      if (!cancelled) setAudioUrl(data?.signedUrl ?? null)
    })()
    return () => { cancelled = true }
  }, [audioPath])
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [grade, setGrade] = useState<RubricGrade | null>(null)
  const [scaleMax, setScaleMax] = useState<number>(30)
  const [errMsg, setErrMsg] = useState('')

  const requestGrade = async () => {
    if (response.trim().length < 20) {
      setErrMsg(ko ? '답변이 너무 짧아 채점할 수 없습니다.' : 'Response too short to grade.')
      setState('error')
      return
    }
    setState('loading')
    try {
      // Route to audio-native grading when the session was started in
      // 'audio' mode AND we actually have a recording to grade. Fall
      // back to text-only if the student typed their answer or if the
      // mode is 'text'.
      const useAudio = skill === 'speaking' && speakingGradeMode === 'audio' && !!audioPath
      const commonBody = {
        sessionId,
        taskType,
        promptText: prompt,
        responseText: response,
        audioPath,
        durationSeconds: speechSignals?.durationSec ?? undefined,
        wpm: speechSignals?.wpm ?? undefined,
        pauseCount: speechSignals?.pauseCount ?? undefined,
        clarity: speechSignals?.clarity ?? undefined,
      }
      const textBody = { ...commonBody, testFamily: 'toefl', skill }
      const authH = { 'Content-Type': 'application/json', ...(await authHeaders()) }

      const callText = () => fetch('/api/study/response/grade', {
        method: 'POST', headers: authH, body: JSON.stringify(textBody),
      })

      let res: Response
      let fellBack = false
      if (useAudio) {
        res = await fetch('/api/study/speaking/grade-audio', {
          method: 'POST', headers: authH, body: JSON.stringify(commonBody),
        })
        // If the audio route fails on the server (transcode error,
        // OpenAI 5xx, model 404, etc.), auto-retry with text-mode so
        // the student still gets *some* grade instead of a dead-end.
        // 4xx errors (too short, wrong mode) are legitimate user-
        // facing failures — don't retry those.
        if (!res.ok && res.status >= 500) {
          console.warn('[WritingFeedbackPanel] audio grade failed, falling back to text', res.status)
          res = await callText()
          fellBack = true
        }
      } else {
        res = await callText()
      }
      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        setErrMsg(errJson?.error ?? 'grading failed')
        setState('error')
        return
      }
      const data = await res.json() as GradeResponse
      setGrade(data.grade)
      setScaleMax(data.scaleMax)
      if (fellBack) setGradeNotice(ko
        ? '오디오 채점에 실패해 텍스트 채점 결과를 표시합니다.'
        : 'Audio grading failed — showing text-based grade instead.')
      setState('done')
    } catch (e) {
      setErrMsg((e as Error).message)
      setState('error')
    }
  }

  if (state === 'done' && grade) {
    return (
      <div className="mt-2 rounded-lg border border-primary/20 bg-primary/[0.03] px-3 py-3 space-y-2">
        <div className="flex items-baseline justify-between">
          <div className="text-xs font-semibold text-primary">{ko ? 'AI 루브릭 채점' : 'AI rubric grade'}</div>
          <div className="text-sm font-semibold text-gray-900 tabular-nums">
            {grade.overallBand.toFixed(1)} <span className="text-xs text-gray-500">/ {scaleMax}</span>
          </div>
        </div>
        {gradeNotice && (
          <div className="text-[11px] text-amber-700 bg-amber-50 rounded px-2 py-1 border border-amber-200">
            {gradeNotice}
          </div>
        )}
        <div className="text-[12px] text-gray-700 leading-relaxed">{grade.summary}</div>
        <div className="space-y-1 pt-1">
          {grade.criteria.map(c => (
            <div key={c.key} className="text-[11px] leading-relaxed">
              <span className="font-semibold text-gray-800 capitalize">{c.key}: {c.score.toFixed(1)}</span>
              <span className="text-gray-600"> — {c.evidence}</span>
            </div>
          ))}
        </div>
        {grade.modelRewrite && (
          <div className="pt-2 border-t border-primary/15">
            <div className="text-[11px] font-semibold text-primary mb-1">{ko ? '한 단계 위 표현 예시' : 'One-band-up rewrite'}</div>
            <div className="text-[11px] text-gray-700 leading-relaxed italic">{grade.modelRewrite}</div>
          </div>
        )}
      </div>
    )
  }

  const paceLabel = (wpm: number) => {
    // TOEFL Speaking natural pace: 130-170 WPM. Under 100 reads as
    // halting; over 190 reads as rushed / uncomfortable.
    if (wpm < 100) return { text: ko ? '느림' : 'Slow', color: 'text-amber-700' }
    if (wpm > 190) return { text: ko ? '빠름' : 'Fast', color: 'text-amber-700' }
    return { text: ko ? '자연스러움' : 'Natural', color: 'text-emerald-700' }
  }
  const clarityLabel = (c: number) => {
    // Rough thresholds on Whisper's clarity proxy (0-1).
    if (c < 0.5) return { text: ko ? '불명확' : 'Unclear', color: 'text-rose-700' }
    if (c < 0.75) return { text: ko ? '보통' : 'Fair', color: 'text-amber-700' }
    return { text: ko ? '뚜렷함' : 'Clear', color: 'text-emerald-700' }
  }

  return (
    <div className="mt-2 space-y-2">
      {audioUrl && (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <audio controls src={audioUrl} className="w-full h-8 rounded">
          {ko ? '이 브라우저에서 오디오 재생이 지원되지 않습니다.' : 'Audio playback not supported.'}
        </audio>
      )}
      {skill === 'speaking' && speechSignals && (speechSignals.wpm != null || speechSignals.clarity != null || speechSignals.pauseCount != null) && (
        <div className="rounded-lg border border-gray-200 bg-white/70 px-3 py-2 space-y-1">
          <div className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide">
            {ko ? '발화 분석' : 'Delivery snapshot'}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
            {speechSignals.durationSec != null && (
              <span className="text-gray-700">{ko ? '길이' : 'Length'} · <span className="tabular-nums">{speechSignals.durationSec.toFixed(1)}s</span></span>
            )}
            {speechSignals.wpm != null && (
              <span className="text-gray-700">
                {ko ? '속도' : 'Pace'} · <span className="tabular-nums">{speechSignals.wpm} wpm</span>
                <span className={`ml-1 ${paceLabel(speechSignals.wpm).color}`}>· {paceLabel(speechSignals.wpm).text}</span>
              </span>
            )}
            {speechSignals.pauseCount != null && (
              <span className="text-gray-700">{ko ? '멈춤' : 'Pauses'} · <span className="tabular-nums">{speechSignals.pauseCount}</span></span>
            )}
            {speechSignals.clarity != null && (
              <span className="text-gray-700">
                {ko ? '발음 명확도' : 'Clarity'}
                <span className={`ml-1 ${clarityLabel(speechSignals.clarity).color}`}>· {clarityLabel(speechSignals.clarity).text}</span>
              </span>
            )}
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={requestGrade}
        disabled={state === 'loading'}
        className="text-xs font-medium text-primary hover:underline disabled:opacity-60 disabled:cursor-wait"
      >
        {state === 'loading'
          ? (ko ? 'AI가 채점 중...' : 'AI grading…')
          : (ko ? 'AI 피드백 받기' : 'Get AI feedback')}
      </button>
      {state === 'error' && (
        <div className="mt-1 text-[11px] text-rose-600">{errMsg}</div>
      )}
    </div>
  )
}

function ReviewView({
  test, answers, answerAudioPaths, answerSpeechSignals, speakingGradeMode, result, ko, sessionId,
}: {
  test: TestPayload
  answers: (string | null)[]
  /** Per-question audio storage paths captured during Speaking.
   *  Used to offer playback next to the rubric grade. */
  answerAudioPaths: Record<number, string>
  /** Per-question WPM / pause / clarity metrics from Whisper. */
  answerSpeechSignals: Record<number, SpeechSignals>
  /** Grade mode picked at test start. Routes rubric calls. */
  speakingGradeMode: 'text' | 'audio'
  result: SubmitResult
  ko: boolean
  sessionId: string
}) {
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
                        || q.type === 'speaking_repeat' || q.type === 'speaking_interview'
                        || q.type === 'writing_email' || q.type === 'writing_discussion') ? (
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
                          {(q.type === 'writing_email' || q.type === 'writing_discussion') && studentAnswer != null && (
                            <WritingFeedbackPanel
                              sessionId={sessionId}
                              prompt={q.prompt}
                              response={studentAnswer}
                              skill="writing"
                              taskType={q.type === 'writing_email' ? 'email' : 'academic_discussion'}
                              ko={ko}
                            />
                          )}
                          {q.type === 'speaking_interview' && studentAnswer != null && (
                            // Rubric grading for Take-an-Interview. The response
                            // is either the voice transcript (Whisper) or typed
                            // text — either way we grade what got captured.
                            // audioPath is available when the student recorded
                            // instead of typing; the panel shows a playback UI.
                            // speechSignals feed the grader real delivery
                            // metrics (WPM / pauses / clarity) so the delivery
                            // criterion reflects the actual audio.
                            <WritingFeedbackPanel
                              sessionId={sessionId}
                              prompt={q.prompt}
                              response={studentAnswer}
                              skill="speaking"
                              audioPath={answerAudioPaths[i]}
                              speechSignals={answerSpeechSignals[i]}
                              speakingGradeMode={speakingGradeMode}
                              ko={ko}
                            />
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

/** Mic-only recorder for Speaking answers. Captures audio via
 *  MediaRecorder, uploads to /api/study/response/transcribe (Whisper),
 *  and hands both the transcribed text AND the storage path back via
 *  onTranscript so the parent can persist them together. Storage path
 *  lets the review pane play back the recording + lets future audio-
 *  native grading models score the recording itself. */
/** Speech signals extracted from the audio by Whisper's verbose_json
 *  output. Used to inform the "delivery" criterion in the speaking
 *  rubric grade — a fluent 45-sec response with normal WPM and low
 *  pause count scores higher than a halting one, without needing an
 *  audio-native LLM. */
type SpeechSignals = {
  audioPath?: string
  durationSec?: number | null
  wpm?: number | null
  pauseCount?: number | null
  clarity?: number | null
}

function VoiceRecorderButton({ sessionId, language, ko, disabled, onTranscript }: {
  sessionId: string
  language: 'en' | 'ko'
  ko: boolean
  disabled?: boolean
  onTranscript: (text: string, signals?: SpeechSignals) => void
}) {
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [micError, setMicError] = useState<'permission' | 'unavailable' | 'unknown' | null>(null)
  const recRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const startTimeRef = useRef<number>(0)
  const tickRef = useRef<number | null>(null)

  const micSupported = typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined'

  const startRec = async () => {
    if (!micSupported || recording || transcribing || disabled) return
    setMicError(null)
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
            onTranscript(json.text.trim(), {
              audioPath: typeof json.audioPath === 'string' ? json.audioPath : undefined,
              durationSec: typeof json.durationSec === 'number' ? json.durationSec : null,
              wpm: typeof json.wpm === 'number' ? json.wpm : null,
              pauseCount: typeof json.pauseCount === 'number' ? json.pauseCount : null,
              clarity: typeof json.clarity === 'number' ? json.clarity : null,
            })
          }
        } catch { /* silent */ } finally {
          setTranscribing(false)
          setElapsedSec(0)
        }
      }
      recRef.current = rec
      rec.start()
      setRecording(true)
      startTimeRef.current = Date.now()
      setElapsedSec(0)
      tickRef.current = window.setInterval(() => {
        setElapsedSec(Math.round((Date.now() - startTimeRef.current) / 1000))
      }, 250)
      // Haptic feedback on start — consistency with rest of the app's
      // primary-CTA tactile pattern.
      if ('vibrate' in navigator) navigator.vibrate(15)
    } catch (err) {
      // Real permission handling — distinguish "user said no" from
      // "no mic device" from other failure so the message is useful.
      const e = err as DOMException
      if (e?.name === 'NotAllowedError' || e?.name === 'PermissionDeniedError') {
        setMicError('permission')
      } else if (e?.name === 'NotFoundError' || e?.name === 'DevicesNotFoundError') {
        setMicError('unavailable')
      } else {
        setMicError('unknown')
      }
    }
  }
  const stopRec = () => {
    const rec = recRef.current
    if (!rec || rec.state === 'inactive') return
    rec.stop()
    streamRef.current?.getTracks().forEach(t => t.stop())
    setRecording(false)
    if (tickRef.current) { window.clearInterval(tickRef.current); tickRef.current = null }
    if ('vibrate' in navigator) navigator.vibrate(15)
  }
  useEffect(() => () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    if (tickRef.current) window.clearInterval(tickRef.current)
  }, [])

  // Mic entirely unsupported (older browser / WebView) — show a
  // fallback so students know voice-answer isn't available AT ALL,
  // not just that the button is missing.
  if (!micSupported) {
    return (
      <div className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-[12px] text-gray-600 text-center">
        {ko ? '이 브라우저는 음성 녹음을 지원하지 않습니다. 아래에 답변을 입력하세요.' : 'Voice recording is unavailable in this browser. Type your answer below.'}
      </div>
    )
  }

  const errorText = micError == null ? null
    : micError === 'permission' ? (ko ? '마이크 접근이 차단되어 있습니다. 브라우저 설정에서 허용해 주세요.' : 'Mic access is blocked. Enable it in your browser settings, then tap again.')
    : micError === 'unavailable' ? (ko ? '마이크를 찾을 수 없습니다. 기기를 연결하고 다시 시도해 주세요.' : 'No microphone detected. Plug one in and try again.')
    : (ko ? '녹음을 시작할 수 없습니다. 다시 시도해 주세요.' : "Couldn't start recording. Try again.")

  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className="w-full space-y-2">
      {recording ? (
        <button
          type="button"
          onClick={stopRec}
          className="w-full h-14 rounded-2xl bg-rose-600 text-white inline-flex items-center justify-center gap-3 shadow-[0_2px_6px_-2px_rgba(220,38,38,0.35)] active:scale-[0.99] transition"
          aria-label={ko ? '녹음 중지' : 'Stop recording'}
        >
          <span className="relative inline-flex w-3 h-3">
            <span className="absolute inset-0 rounded-full bg-white/70 animate-ping" />
            <span className="relative inline-flex w-3 h-3 rounded-full bg-white" />
          </span>
          <span className="text-[15px] font-semibold">
            {ko ? '녹음 중지' : 'Stop recording'}
          </span>
          <span className="text-[14px] font-mono tabular-nums opacity-90 min-w-[3.2ch] text-right">
            {mmss(elapsedSec)}
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={startRec}
          disabled={transcribing || disabled}
          className="w-full h-14 rounded-2xl bg-primary text-white inline-flex items-center justify-center gap-3 shadow-[0_2px_6px_-2px_rgba(40,133,232,0.35)] active:scale-[0.99] transition disabled:opacity-60 disabled:cursor-not-allowed"
          aria-label={ko ? '음성으로 답변 녹음' : 'Record voice answer'}
        >
          {transcribing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-[15px] font-semibold">
                {ko ? '음성을 텍스트로 변환 중…' : 'Transcribing your answer…'}
              </span>
            </>
          ) : (
            <>
              <Mic className="w-5 h-5" />
              <span className="text-[15px] font-semibold">
                {ko ? '음성으로 답변하기' : 'Answer with your voice'}
              </span>
            </>
          )}
        </button>
      )}
      {errorText && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-800">
          {errorText}
        </div>
      )}
      {recording && (
        <div className="text-[11px] text-gray-500 text-center">
          {ko ? '말하세요. 끝나면 위 버튼을 눌러 정지.' : 'Speak clearly. Tap the button above to stop.'}
        </div>
      )}
    </div>
  )
}

/** Prep-then-response timer for TOEFL Speaking. Fires onExpire once
 *  the response window ends so the parent can lock the textarea +
 *  stop the recorder. Matches ETS timing: 15 s prep → 45 s response
 *  for Take-an-Interview, or a single 15 s response for Listen-and-
 *  Repeat (pass prepSec=0). */
function SpeakingTimer({ active, prepSec, responseSec, onPhaseChange, onExpire, ko, t }: {
  active: boolean
  prepSec: number
  responseSec: number
  onPhaseChange?: (phase: 'prep' | 'response' | 'expired') => void
  onExpire: () => void
  ko: boolean
  t: (key: string, params?: Record<string, string>) => string | React.ReactNode
}) {
  const [phase, setPhase] = useState<'idle' | 'prep' | 'response' | 'expired'>('idle')
  const [remaining, setRemaining] = useState(0)
  const tickRef = useRef<number | null>(null)

  useEffect(() => {
    if (!active || phase !== 'idle') return
    if (prepSec > 0) {
      setPhase('prep'); setRemaining(prepSec); onPhaseChange?.('prep')
    } else {
      setPhase('response'); setRemaining(responseSec); onPhaseChange?.('response')
    }
  }, [active, phase, prepSec, responseSec, onPhaseChange])

  useEffect(() => {
    if (phase === 'idle' || phase === 'expired') return
    tickRef.current = window.setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          window.clearInterval(tickRef.current!)
          if (phase === 'prep') {
            setPhase('response'); onPhaseChange?.('response')
            return responseSec
          }
          setPhase('expired'); onPhaseChange?.('expired'); onExpire()
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => { if (tickRef.current) window.clearInterval(tickRef.current) }
  }, [phase, responseSec, onExpire, onPhaseChange])

  if (phase === 'idle') return null

  const total = phase === 'prep' ? prepSec : phase === 'response' ? responseSec : 1
  const pct = phase === 'expired' ? 100 : Math.round(100 * (total - remaining) / total)
  const label = phase === 'prep'
    ? String(t('study.test.speakingPrep'))
    : phase === 'response'
      ? String(t('study.test.speakingRespond'))
      : String(t('study.test.speakingTimeUp'))

  return (
    <div className={`mt-2 rounded-lg px-3 py-2 border ${
      phase === 'expired' ? 'bg-rose-50 border-rose-200' :
      phase === 'response' ? 'bg-emerald-50 border-emerald-200' :
      'bg-amber-50 border-amber-200'
    }`}>
      <div className="flex items-baseline justify-between">
        <span className={`text-[12px] font-semibold ${
          phase === 'expired' ? 'text-rose-800' :
          phase === 'response' ? 'text-emerald-800' :
          'text-amber-800'
        }`}>{label}</span>
        {phase !== 'expired' && (
          <span className="text-[13px] font-mono tabular-nums text-gray-900">
            {ko ? `${remaining}초` : `${remaining}s`}
          </span>
        )}
      </div>
      <div className="mt-1 h-1 rounded-full bg-black/5 overflow-hidden">
        <div className={`h-full transition-all duration-500 ${
          phase === 'expired' ? 'bg-rose-500' :
          phase === 'response' ? 'bg-emerald-500' :
          'bg-amber-500'
        }`} style={{ width: `${pct}%` }} />
      </div>
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

/** TOEFL Listening audio player. Plays the transcript via browser TTS
 *  and hides the text until the student opts to reveal it. Enforces the
 *  ETS "up to 2 plays" convention with a hidden replay counter. When
 *  the passage contains "A: ..." / "B: ..." speaker turns, splits into
 *  alternating utterances and swaps between a lower and higher voice
 *  for a poor-man's dual-speaker feel. */
// Module-level play-count store — survives ListeningAudioPlayer remount
// when the student navigates away and back to the same passage group.
// Keyed by "<sessionId>:<groupKey>" so multiple tests don't collide.
// Cleared when the browser tab closes; that's fine, mid-test resume
// already loses playback state.
const LISTENING_PLAY_COUNTS: Record<string, number> = {}

// Per-URL cache so we only fetch each MP3 once per browser session even
// if the student replays. Keyed by (voice + text) hash — matches what
// the server computes.
const AUDIO_URL_CACHE: Record<string, string> = {}

// OpenAI TTS voices. We rotate speakers through these for dialogues;
// non-dialogue passages use the first voice.
//   - "nova" = warm female, natural cadence — default announcement/lecture
//   - "onyx" = deep male — good second speaker in office-hours convos
//   - "shimmer" = brighter female — third-speaker rotate
//   - "echo" = neutral male — fourth-speaker rotate
type OpenAiVoice = 'alloy' | 'echo' | 'fable' | 'nova' | 'onyx' | 'shimmer'
const DIALOGUE_VOICE_ROTATION: OpenAiVoice[] = ['nova', 'onyx', 'shimmer', 'echo']
const MONOLOGUE_VOICE: OpenAiVoice = 'nova'

/** Parse a TOEFL Listening transcript into speaker turns. Robust to
 *  two encoding styles the model uses interchangeably:
 *    (a) newline-separated: "A: hi\nB: hello"
 *    (b) inline: "A: hi B: hello"
 *  Returns [] for non-dialogue (monologue: announcement / lecture). */
function parseTurns(cleaned: string): Array<{ speaker: string; text: string }> {
  const turnRegex = /(?:^|\s)([A-Z]):\s+([\s\S]*?)(?=(?:\s[A-Z]:\s+)|$)/g
  const turns: Array<{ speaker: string; text: string }> = []
  let match: RegExpExecArray | null
  while ((match = turnRegex.exec(cleaned)) != null) {
    turns.push({ speaker: match[1], text: match[2].trim().replace(/^"|"$/g, '') })
  }
  const uniqueSpeakers = new Set(turns.map(t => t.speaker)).size
  return turns.length >= 2 && uniqueSpeakers >= 2 ? turns : []
}

/** Server call — returns cached URL if the (voice, text) hash already
 *  exists in storage; otherwise generates + uploads a new MP3. */
async function fetchAudioUrl(text: string, voice: OpenAiVoice): Promise<string | null> {
  const cacheKey = `${voice}\n${text}`
  if (AUDIO_URL_CACHE[cacheKey]) return AUDIO_URL_CACHE[cacheKey]
  try {
    const res = await fetch('/api/study/listening/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
      body: JSON.stringify({ text, voice, model: 'tts-1' }),
    })
    if (!res.ok) return null
    const { url } = await res.json() as { url: string }
    AUDIO_URL_CACHE[cacheKey] = url
    return url
  } catch {
    return null
  }
}

function ListeningAudioPlayer({ groupKey, transcript, language, onSpeakingChange, allowTranscriptReveal = false, maxPlays = 2, onFirstPlayEnd }: {
  /** Stable per-passage key (e.g., "sessionId:convo-1"). Play count
   *  is stored against this key so it persists across navigation. */
  groupKey: string
  transcript: string
  language: 'en' | 'ko'
  /** Fires when playback starts/stops so the parent can lock navigation. */
  onSpeakingChange?: (speaking: boolean) => void
  /** ETS TOEFL is audio-only during the test — the transcript is not
   *  shown. Left as false during test-taking; the review pane already
   *  shows the transcript in text form so we don't lose access to it. */
  allowTranscriptReveal?: boolean
  /** ETS caps replays: Listening = 2, Speaking = 1. Default 2. */
  maxPlays?: number
  /** Fires exactly once after the FIRST playthrough completes. Used
   *  by Speaking to kick off the prep-then-response timer. */
  onFirstPlayEnd?: () => void
}) {
  const { t } = useTranslation()
  const [state, setState] = useState<'idle' | 'loading' | 'playing' | 'error'>('idle')
  const [playCount, setPlayCount] = useState(() => LISTENING_PLAY_COUNTS[groupKey] ?? 0)
  const [showTranscript, setShowTranscript] = useState(false)
  const [progress, setProgress] = useState<{ current: number; total: number; charsDone: number; charsTotal: number }>({ current: 0, total: 0, charsDone: 0, charsTotal: 0 })
  const speakingRef = useRef(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const cancelledRef = useRef(false)

  const cleaned = transcript.replace(/^\s*transcript:\s*/i, '').trim()

  // Build the ordered list of (text, voice) segments. Dialogue turns
  // rotate through distinct OpenAI voices per speaker; monologues use
  // a single voice.
  const segments = useMemo(() => {
    const turns = parseTurns(cleaned)
    if (turns.length === 0) {
      return [{ text: cleaned.replace(/^"|"$/g, ''), voice: MONOLOGUE_VOICE }]
    }
    const speakerVoice = new Map<string, OpenAiVoice>()
    return turns.map(({ speaker, text }) => {
      if (!speakerVoice.has(speaker)) {
        speakerVoice.set(speaker, DIALOGUE_VOICE_ROTATION[speakerVoice.size % DIALOGUE_VOICE_ROTATION.length])
      }
      return { text, voice: speakerVoice.get(speaker)! }
    })
  }, [cleaned])

  const setSpeaking = useCallback((v: boolean) => {
    speakingRef.current = v
    setState(prev => v ? 'playing' : (prev === 'error' ? 'error' : 'idle'))
    onSpeakingChange?.(v)
  }, [onSpeakingChange])

  const play = async () => {
    if (state === 'playing' || state === 'loading' || playCount >= maxPlays) return
    const nextCount = playCount + 1
    setPlayCount(nextCount)
    LISTENING_PLAY_COUNTS[groupKey] = nextCount
    cancelledRef.current = false
    setState('loading')

    // Fetch all segment URLs up front. Cached hits are instant; misses
    // trigger OpenAI TTS on the server (~1-3 s per segment). Fetching
    // in parallel minimises perceived latency for dialogues.
    const urls = await Promise.all(segments.map(s => fetchAudioUrl(s.text, s.voice)))
    if (cancelledRef.current) { setSpeaking(false); return }
    if (urls.some(u => !u)) {
      console.error('[ListeningAudioPlayer] one or more TTS fetches failed')
      setState('error')
      // Refund the play — the student didn't actually hear anything.
      setPlayCount(nextCount - 1)
      LISTENING_PLAY_COUNTS[groupKey] = nextCount - 1
      return
    }

    const charsPerTurn = segments.map(s => s.text.length)
    const charsTotal = charsPerTurn.reduce((a, b) => a + b, 0)
    setProgress({ current: 0, total: segments.length, charsDone: 0, charsTotal })
    setSpeaking(true)

    let i = 0
    let charsDone = 0
    const playNext = () => {
      if (cancelledRef.current || i >= urls.length) {
        setSpeaking(false)
        setProgress(p => ({ ...p, current: p.total, charsDone: p.charsTotal }))
        audioRef.current = null
        // Fire once, after the first successful playthrough. Used by
        // Speaking to auto-start prep+response timers.
        if (nextCount === 1 && !cancelledRef.current) onFirstPlayEnd?.()
        return
      }
      setProgress({ current: i + 1, total: segments.length, charsDone, charsTotal })
      const audio = new Audio(urls[i]!)
      audioRef.current = audio
      audio.playbackRate = 1.0
      audio.onended = () => {
        charsDone += charsPerTurn[i]
        i++
        if (i < urls.length) {
          // 350 ms breath between dialogue turns.
          window.setTimeout(playNext, segments.length > 1 ? 350 : 0)
        } else {
          playNext()
        }
      }
      audio.onerror = () => { charsDone += charsPerTurn[i]; i++; playNext() }
      void audio.play().catch(() => { i++; playNext() })
    }
    playNext()
  }

  // Cleanup: stop any playing audio + release the nav lock on unmount.
  useEffect(() => () => {
    cancelledRef.current = true
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (speakingRef.current) onSpeakingChange?.(false)
  }, [onSpeakingChange])

  const replaysLeft = Math.max(0, maxPlays - playCount)
  // Audio always "supported" for the UI — we drive playback via
  // HTML5 <audio>, which is universal. Preserved as a flag in case
  // /api/study/listening/tts is unreachable (see error state below).
  const ttsSupported = true

  return (
    <div className="mb-4 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/[0.04] to-white px-4 py-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={play}
          disabled={state === 'playing' || state === 'loading' || playCount >= maxPlays}
          className="w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          aria-label={String(t('study.test.audioPlaying'))}
        >
          {state === 'loading'
            ? <Loader2 className="w-5 h-5 animate-spin" />
            : state === 'playing'
              ? <Volume2 className="w-5 h-5 animate-pulse" />
              : <Play className="w-5 h-5 ml-0.5" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium text-gray-900">
            {state === 'loading'
              ? t('study.test.audioLoading')
              : state === 'playing'
                ? t('study.test.audioPlaying')
                : state === 'error'
                  ? t('study.test.audioError')
                  : playCount === 0
                    ? t('study.test.audioPlayCta')
                    : t('study.test.audioReplayCta')}
          </div>
          <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
            <span>
              {t(replaysLeft === 1 ? 'study.test.audioPlaysLeft' : 'study.test.audioPlaysLeftPlural', { count: String(replaysLeft) })}
            </span>
            {state === 'playing' && progress.total > 1 && (
              <span className="text-primary font-semibold tabular-nums">
                {t('study.test.audioTurnProgress', { current: String(progress.current), total: String(progress.total) })}
              </span>
            )}
          </div>
          {state === 'playing' && progress.charsTotal > 0 && (
            <div className="mt-1.5 h-1 rounded-full bg-primary/10 overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-200"
                style={{ width: `${Math.min(100, Math.round(100 * progress.charsDone / progress.charsTotal))}%` }}
              />
            </div>
          )}
        </div>
        {allowTranscriptReveal && (
          <button
            type="button"
            onClick={() => setShowTranscript(v => !v)}
            className="text-[11px] font-medium text-primary hover:underline flex items-center gap-1"
          >
            {showTranscript ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showTranscript ? t('study.test.audioHideTranscript') : t('study.test.audioShowTranscript')}
          </button>
        )}
      </div>
      {(showTranscript || !ttsSupported) && (
        <div className="mt-3 rounded-lg border border-gray-200 bg-white/70 px-3 py-2 text-[13px] text-gray-800 leading-relaxed">
          <PassageParagraphs text={cleaned} />
        </div>
      )}
    </div>
  )
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
  const currentQuestion = questions[currentIdx]
  const currentGroupId = currentQuestion?.passageGroupId
  if (!currentGroupId) return null
  // Complete-the-Words items stand alone by design (one paragraph =
  // one item with 10 blanks). If the model erroneously emits a
  // passageGroupId on a fill_in_blanks item, the grouper would
  // display "Question X of Y in this passage" but each item has a
  // different passage — confusing. Force-treat as ungrouped.
  if (currentQuestion?.type === 'fill_in_blanks') return null
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
