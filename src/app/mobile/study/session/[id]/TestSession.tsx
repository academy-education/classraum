"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Loader2, RefreshCw, ArrowRight, ArrowLeft, Clock, CheckCircle2,
  XCircle, AlertTriangle, ChevronDown, ChevronUp, Sparkles,
  Volume2, Mic, MicOff, Play, Eye, EyeOff, CreditCard,
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { authHeaders } from '@/lib/auth-headers'
import { supabase } from '@/lib/supabase'
import { PathMascot } from '../../_shared/PathMascot'
import { hapticImpact, hapticSelection } from '@/lib/nativeHaptics'

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
  /** TOEFL adaptive-module boundary. Index of the FIRST question in
   *  Module 2. Undefined for non-modular sections; server computes this
   *  post-pipeline so the UI knows exactly where M2 starts (Module 1
   *  and Module 2 may be different sizes — e.g. Listening ships 8 CaR
   *  in M1 and 3 in M2, so the boundary is NOT the midpoint). */
  moduleBreakIdx?: number
}

interface SubmitResult {
  totalQuestions: number
  correctCount: number
  scorePercent: number
  /** ungraded = open-response item (interview / email / discussion):
   *  rubric-graded in review, excluded from the auto-score. */
  verdicts: { index: number; correct: boolean; correctAnswer: string; ungraded?: boolean }[]
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
  // TOEFL adaptive routing (Reading/Listening). When the student
  // crosses the module break we grade module 1 server-side and show
  // where the real ETS test would have routed them. Content itself is
  // pre-generated, so this is feedback + analytics, not regeneration.
  const [moduleRoute, setModuleRoute] = useState<{
    route: 'easy' | 'medium' | 'hard'
    correct: number | null
    total: number
  } | null>(null)
  const moduleRouteRequested = useRef(false)
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
  // Increments once per (timerKey) when the prep phase ends. The
  // VoiceRecorderButton starts recording on token change.
  const [interviewAutoRecToken, setInterviewAutoRecToken] = useState<Record<string, number>>({})
  // Currently-recording flag per timerKey. Used to lock prev/next
  // navigation while the student is speaking so they can't skip mid-
  // answer.
  const [interviewRecordingActive, setInterviewRecordingActive] = useState<Record<string, boolean>>({})
  // Marks per speaking key when the Next button should be revealed —
  // either because Whisper transcription completed, or because the
  // auto-record safety window expired without a recording ever
  // starting (mic denied, permission blocked, etc.).
  const [interviewNextReady, setInterviewNextReady] = useState<Record<string, boolean>>({})
  // True per speaking key from "recording stopped" until Whisper
  // returns (onDone). Blocks Submit so the LAST question's answer
  // can't be lost to a submit racing the in-flight transcription.
  const [interviewProcessing, setInterviewProcessing] = useState<Record<string, boolean>>({})
  // Mirror of interviewRecordingActive as a ref so async timeout
  // callbacks can read the CURRENT recording state without capturing
  // a stale closure. Used by the safety-net timeout to skip flipping
  // Next-ready when a recording is genuinely in progress.
  const interviewRecordingActiveRef = useRef<Record<string, boolean>>({})
  useEffect(() => {
    interviewRecordingActiveRef.current = interviewRecordingActive
  }, [interviewRecordingActive])
  // Whether the shared mic stream has been granted this session. Used
  // to gate the "Start Speaking" one-tap prime button (fires only on
  // the FIRST speaking question when mic hasn't been primed yet).
  const [micPrimed, setMicPrimed] = useState<boolean>(() => PRIMED_MIC_STREAM != null)
  // True when the student tapped the Start Speaking gate but the
  // browser denied mic access — shows a visible notice instead of
  // silently proceeding without recording.
  const [micDenied, setMicDenied] = useState(false)
  // Monotonic high-water mark for the top progress bar — navigating
  // BACK to an earlier question must not shrink the bar.
  const furthestProgressRef = useRef(0)
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
  /** Server-classified generation failure — drives the error screen's
   *  explanation + retry copy. reason: quota | rate_limit |
   *  in_progress | timeout | content | unknown. */
  const [genError, setGenError] = useState<{ message: string; reason: string } | null>(null)

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
    setGenError(null)
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
            // Server classifies failures coarsely (quota / rate_limit /
            // in_progress / timeout / content / unknown) so the error
            // screen can say something actionable instead of a bare
            // "failed".
            setGenError({
              message: String(event.message ?? ''),
              reason: String((event as { reason?: string }).reason ?? 'unknown'),
            })
          }
        }
      }
      if (streamError || !payload) throw new Error()

      setTest(payload)
      // Restore answers + question position from a previous visit so
      // a refresh / exit-and-return drops the student exactly where
      // they left off instead of back at question 1 with blank answers.
      let restoredAnswers: (string | null)[] | null = null
      let restoredIdx = 0
      if (typeof window !== 'undefined') {
        try {
          const rawAnswers = localStorage.getItem(`study:test:${sessionId}:answers`)
          if (rawAnswers) {
            const parsed = JSON.parse(rawAnswers)
            if (Array.isArray(parsed) && parsed.length === payload.questions.length) {
              restoredAnswers = parsed as (string | null)[]
            }
          }
          const rawIdx = localStorage.getItem(`study:test:${sessionId}:currentIdx`)
          if (rawIdx != null) {
            const n = parseInt(rawIdx, 10)
            if (Number.isFinite(n)) restoredIdx = Math.min(Math.max(0, n), payload.questions.length - 1)
          }
          // Speaking metadata (storage path of the recorded answer +
          // Whisper delivery signals). Without this a refresh dropped
          // the audio link, so the review pane's rubric grade lost
          // playback + real delivery metrics.
          const rawSpeech = localStorage.getItem(`study:test:${sessionId}:speech`)
          if (rawSpeech) {
            const parsed = JSON.parse(rawSpeech) as {
              audioPaths?: Record<number, string>
              signals?: Record<number, SpeechSignals>
            }
            if (parsed.audioPaths) setAnswerAudioPaths(parsed.audioPaths)
            if (parsed.signals) setAnswerSpeechSignals(parsed.signals)
          }
        } catch { /* corrupted storage — start fresh */ }
      }
      setAnswers(restoredAnswers ?? new Array(payload.questions.length).fill(null))
      if (restoredIdx > 0) setCurrentIdx(restoredIdx)

      // Speaking resume semantics. The play-count store is module-
      // level, so it survives navigating away and back WITHOUT a
      // refresh — a question the student left mid-flow would show
      // "Playback complete" but never fire onFirstPlayEnd again:
      // frozen timer, no recording, no Next. Stuck.
      //   - UNANSWERED speaking question → wipe its play count so the
      //     audio replays from the top when they land on it.
      //   - ANSWERED speaking question → pre-seed timer state + Next-
      //     ready so it renders as completed (no forced replay).
      const timerStateInit: Record<string, 'started'> = {}
      const nextReadyInit: Record<string, boolean> = {}
      payload.questions.forEach((qq, i) => {
        if (qq.type !== 'speaking_repeat' && qq.type !== 'speaking_interview') return
        const shortKey = qq.type === 'speaking_repeat' ? `repeat-${i}` : `interview-${i}`
        const playKey = `${sessionId}:${shortKey}`
        const answered = !!(restoredAnswers?.[i] ?? '').trim()
        if (answered) {
          timerStateInit[shortKey] = 'started'
          nextReadyInit[shortKey] = true
        } else {
          delete LISTENING_PLAY_COUNTS[playKey]
        }
      })
      if (Object.keys(timerStateInit).length > 0) {
        setInterviewTimerState(s => ({ ...timerStateInit, ...s }))
        setInterviewNextReady(s => ({ ...nextReadyInit, ...s }))
      }

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

  // Persist position + answers on every change so a refresh or
  // exit-and-return resumes exactly where the student left off.
  // (Cleared on submit alongside elapsedMs.)
  useEffect(() => {
    if (phase !== 'taking' || typeof window === 'undefined') return
    localStorage.setItem(`study:test:${sessionId}:currentIdx`, String(currentIdx))
  }, [phase, sessionId, currentIdx])
  useEffect(() => {
    if (phase !== 'taking' || typeof window === 'undefined') return
    try {
      localStorage.setItem(`study:test:${sessionId}:answers`, JSON.stringify(answers))
    } catch { /* quota exceeded — non-fatal, resume just loses answers */ }
  }, [phase, sessionId, answers])
  useEffect(() => {
    if (phase !== 'taking' || typeof window === 'undefined') return
    if (Object.keys(answerAudioPaths).length === 0 && Object.keys(answerSpeechSignals).length === 0) return
    try {
      localStorage.setItem(`study:test:${sessionId}:speech`, JSON.stringify({
        audioPaths: answerAudioPaths,
        signals: answerSpeechSignals,
      }))
    } catch { /* quota exceeded — resume loses audio links only */ }
  }, [phase, sessionId, answerAudioPaths, answerSpeechSignals])

  // TOEFL adaptive routing: the first time the student crosses the
  // module break in a Reading/Listening test, send module-1 answers
  // for server-side grading. The server stores module1_correct/total
  // + module2_route on the session; we surface the routing verdict in
  // the Module 2 banner. Fire-and-forget — a failure here must never
  // block the test.
  useEffect(() => {
    if (phase !== 'taking' || !test || moduleRouteRequested.current) return
    if (test.family !== 'toefl' || !test.section) return
    const sectionName = /reading/i.test(test.section) ? 'Reading'
      : /listening/i.test(test.section) ? 'Listening' : null
    if (!sectionName) return
    const breakIdx = test.moduleBreakIdx ?? Math.ceil(test.questions.length / 2)
    if (currentIdx < breakIdx) return
    moduleRouteRequested.current = true
    void (async () => {
      try {
        const headers = await authHeaders()
        const res = await fetch('/api/study/test/route', {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            sectionName,
            answers: answers.slice(0, breakIdx).map((answer, index) => ({ index, answer })),
          }),
        })
        if (!res.ok) return
        const json = await res.json() as { route?: 'easy' | 'medium' | 'hard' | null; module1Correct?: number | null; module1Total?: number }
        if (json.route) {
          setModuleRoute({ route: json.route, correct: json.module1Correct ?? null, total: json.module1Total ?? breakIdx })
        }
      } catch { /* non-fatal */ }
    })()
  }, [phase, test, currentIdx, answers, sessionId])

  // Freeze the timer when the tab is hidden, resume when visible.
  // This makes practice tests non-hostile: a student who takes a call
  // mid-test doesn't lose time. Real ETS behaviour differs but that's
  // not this app's job.
  // (Declared here, ABOVE the visibility effect that reads it — the
  // value is assigned each render further down once the speaking
  // freeze condition is derivable.)
  const speakingFreezeRef = useRef(false)
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
        // Resume: only restart the clock if the student hasn't ALSO
        // manually paused AND the Speaking flow isn't holding its own
        // freeze (audio preparing/playing). Otherwise tab-away during
        // Speaking audio + tab-back would restart the clock while the
        // question audio was still running.
        if (!paused && !speakingFreezeRef.current && resumedAtRef.current == null) {
          resumedAtRef.current = Date.now()
        }
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [phase, paused])

  // TOEFL Speaking: freeze the test countdown from the moment a
  // speaking question mounts until its audio has finished playing.
  // This covers BOTH the TTS-preparation window (loading spinner)
  // and the playback itself — neither is the student's answering
  // time, so neither should eat into the 7 minutes. Mirrors the
  // manual-pause freeze/flush logic. Only Speaking gets this
  // treatment: Listening audio IS part of the timed experience.
  const isSpeakingSection = test?.family === 'toefl'
    && test?.section != null && /speaking/i.test(test.section)
  const currentSpeakingAudioPending = (() => {
    if (!isSpeakingSection || !test) return false
    const item = test.questions[currentIdx]
    if (!item || (item.type !== 'speaking_repeat' && item.type !== 'speaking_interview')) return false
    const key = item.type === 'speaking_repeat' ? `repeat-${currentIdx}` : `interview-${currentIdx}`
    // Pending until onFirstPlayEnd flips the state to started/expired.
    return interviewTimerState[key] === undefined || interviewTimerState[key] === 'idle'
  })()
  // Ref mirror so the visibilitychange handler (whose effect deps
  // deliberately exclude these fast-changing values) can check the
  // speaking freeze before resuming the clock. Without it, tab-away
  // during Speaking audio → tab-back would restart the clock while
  // audio was still playing.
  speakingFreezeRef.current = isSpeakingSection && (audioPlaying || currentSpeakingAudioPending)
  useEffect(() => {
    if (!isSpeakingSection || phase !== 'taking') return
    if (audioPlaying || currentSpeakingAudioPending) {
      // Freeze: flush accumulated time.
      if (resumedAtRef.current != null) {
        activeElapsedMsRef.current += Date.now() - resumedAtRef.current
        resumedAtRef.current = null
      }
    } else if (!paused && (typeof document === 'undefined' || document.visibilityState === 'visible')) {
      // Resume — unless a manual pause or hidden tab is also holding
      // the timer frozen.
      if (resumedAtRef.current == null) {
        resumedAtRef.current = Date.now()
      }
    }
  }, [audioPlaying, currentSpeakingAudioPending, isSpeakingSection, phase, paused])

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

  // Release the primed mic stream when the student leaves the test
  // page entirely — otherwise the browser's recording indicator stays
  // lit until the tab is closed.
  useEffect(() => {
    return () => { releaseMicStream() }
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
        localStorage.removeItem(`study:test:${sessionId}:currentIdx`)
        localStorage.removeItem(`study:test:${sessionId}:answers`)
        localStorage.removeItem(`study:test:${sessionId}:speech`)
      }
      // Test is over — stop holding the mic open (browser tab keeps
      // showing the red recording dot while the primed stream lives).
      releaseMicStream()
      // Pre-grade every open-response answer now (fire-and-forget) so
      // the rubric submission + grade rows exist without the student
      // having to expand each review panel — the panels then load
      // instantly from the grade route's dedupe cache. Server-side
      // idempotency (same session+prompt) makes duplicates harmless,
      // and XP pays out at most once per task regardless.
      if (test.family === 'toefl' || test.family === 'ielts') {
        test.questions.forEach((q, i) => {
          const isOpen = q.type === 'speaking_interview'
            || q.type === 'writing_email' || q.type === 'writing_discussion'
          const response = (answers[i] ?? '').trim()
          // Grade route requires ≥20-char responses; shorter ones have
          // nothing gradeable anyway.
          if (!isOpen || response.length < 20 || q.prompt.trim().length < 10) return
          const signals = answerSpeechSignals[i]
          // Speaking interviews on an audio-mode session pre-grade via
          // the audio-native route — the SAME route the review panel
          // calls — so the panel's request hits that route's dedupe
          // cache instead of triggering a second gpt-4o-audio call.
          const useAudio = q.type === 'speaking_interview'
            && speakingGradeMode === 'audio'
            && !!answerAudioPaths[i]
          const common = {
            sessionId,
            taskType: q.type === 'writing_email' ? 'email'
              : q.type === 'writing_discussion' ? 'academic_discussion' : null,
            promptText: q.prompt.slice(0, 2000),
            responseText: response.slice(0, 8000),
            audioPath: answerAudioPaths[i] ?? null,
            durationSeconds: signals?.durationSec ?? null,
            wpm: signals?.wpm ?? null,
            pauseCount: signals?.pauseCount ?? null,
            clarity: signals?.clarity ?? null,
          }
          void fetch(useAudio ? '/api/study/speaking/grade-audio' : '/api/study/response/grade', {
            method: 'POST',
            headers,
            body: JSON.stringify(useAudio ? common : {
              ...common,
              testFamily: test.family,
              skill: q.type === 'speaking_interview' ? 'speaking' : 'writing',
            }),
          }).catch(() => { /* review panel re-requests on demand */ })
        })
      }
      setPhase('reviewing')
    } catch (err) {
      console.error('[TestSession] submit failed', err)
      setSubmitError((err as Error).message || 'submit failed')
      // Drop back to taking so the student can retry instead of
      // losing the test to a transient error.
      setPhase('taking')
    }
  }, [test, phase, answers, sessionId, answerAudioPaths, answerSpeechSignals, speakingGradeMode, currentElapsedMs])

  // Auto-submit when the timer hits zero.
  // Total time budget in ms. `now` is here so the effect re-runs
  // every tick to check whether we've exceeded the budget.
  const timeLimitMs = test ? test.timeLimitMinutes * 60_000 : 0
  useEffect(() => {
    if (phase !== 'taking' || !timeLimitMs) return
    if (currentElapsedMs() >= timeLimitMs) void submit()
  }, [now, timeLimitMs, phase, submit, currentElapsedMs])

  // ── Render branches ─────────────────────────────────────────────
  // Both pre-'generating' phases share the same shell so the test-
  // making flow feels consistent — mascot in thinking state + short
  // copy — instead of one path getting a bare spinner and another
  // getting a friendly message.
  //
  // 'detecting' — DB ping in flight. Neutral copy: don't imply we're
  //               building a test until we know we are.
  // 'resuming'  — server has a cached test; we're just fetching it.
  //               Explicit "loading" copy so students who bounced
  //               back in mid-generation know they'll join the
  //               existing run.
  if (phase === 'detecting' || phase === 'resuming') {
    const label = phase === 'resuming'
      ? String(t('study.test.loadingTest'))
      : undefined
    return (
      // role="status" + aria-live so screen readers announce the wait —
      // the mascot alone is decorative and says nothing about loading.
      <div role="status" aria-live="polite" className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
        {/* Short waits (DB check / cached-test fetch): calm "thinking"
            — the 2.7s loading gag would get cut off mid-spin here. */}
        <PathMascot state="thinking" size={72} />
        {label
          ? <p className="text-[13px] text-gray-600">{label}</p>
          : <span className="sr-only">{String(t('study.test.loadingTest'))}</span>}
      </div>
    )
  }
  // 'generating' — fresh build from scratch. Show the full
  // GenerationProgress checklist with phase events from the stream.
  if (phase === 'generating') {
    return <GenerationProgress progress={progress} t={t} />
  }

  if (phase === 'error' || !test) {
    // Reason-specific copy so students know whether to wait, retry
    // now, or that it isn't their fault. Falls back to the generic
    // "couldn't create" line for unclassified failures.
    const reason = genError?.reason ?? 'unknown'
    const stillWorking = reason === 'in_progress'
    const copy = ((): { title: string; body: string; cta: string; href?: string } => {
      switch (reason) {
        case 'in_progress':
          return {
            title: ko ? '아직 문제를 만들고 있어요' : 'Your test is still being created',
            body: ko
              ? '전체 모의고사 생성에는 몇 분 정도 걸릴 수 있어요. 잠시 후 아래 버튼으로 다시 확인해 주세요.'
              : 'Building a full mock test can take a few minutes. Check again shortly with the button below.',
            cta: ko ? '다시 확인' : 'Check again',
          }
        case 'no_credits':
        case 'no_subscription':
          return {
            title: ko ? '테스트 크레딧이 부족해요' : 'You’re out of test credits',
            body: ko
              ? '모의고사 1회 생성에 크레딧 1개가 사용돼요. 구독을 업그레이드하거나 다음 갱신을 기다리면 크레딧이 충전됩니다.'
              : 'Each mock test uses 1 credit. Upgrade your plan or wait for your next renewal to get more.',
            cta: ko ? '구독 관리' : 'Manage plan',
            href: '/mobile/study/subscription',
          }
        case 'quota':
          return {
            title: ko ? '지금은 문제를 만들 수 없어요' : 'Test creation is temporarily unavailable',
            body: ko
              ? 'AI 서비스 사용량 한도에 도달했어요. 보통 곧 해결되니 잠시 후 다시 시도해 주세요.'
              : 'The AI service has hit its usage limit. This usually resolves soon — please try again in a little while.',
            cta: ko ? '다시 시도' : 'Try again',
          }
        case 'rate_limit':
          return {
            title: ko ? '지금 요청이 많아요' : 'Lots of tests are being created right now',
            body: ko
              ? '1~2분 후에 다시 시도하면 정상적으로 만들어져요.'
              : 'Give it a minute or two and retry — it should go through.',
            cta: ko ? '다시 시도' : 'Try again',
          }
        case 'timeout':
        case 'content':
        default:
          return {
            title: ko ? '테스트를 만들지 못했어요' : 'We couldn’t create your test',
            body: ko
              ? '일시적인 문제일 가능성이 높아요. 다시 시도하면 새로 생성을 시작합니다.'
              : 'This is usually temporary. Retrying starts a fresh attempt.',
            cta: ko ? '다시 시도' : 'Try again',
          }
      }
    })()
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-3">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-1 ${
          stillWorking ? 'bg-primary/10 text-primary' : 'bg-amber-50 text-amber-500'
        }`}>
          {stillWorking ? <Loader2 className="w-6 h-6 animate-spin" /> : <AlertTriangle className="w-6 h-6" />}
        </div>
        <p className="text-[15px] font-semibold text-gray-900">{copy.title}</p>
        <p className="text-[13px] text-gray-500 leading-relaxed max-w-[300px]">{copy.body}</p>
        {copy.href ? (
          <Link
            href={copy.href}
            className="mt-2 inline-flex items-center gap-1.5 px-5 h-11 rounded-full bg-primary text-white text-sm font-semibold"
          >
            <CreditCard className="w-4 h-4" />
            {copy.cta}
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => void load()}
            className="mt-2 inline-flex items-center gap-1.5 px-5 h-11 rounded-full bg-primary text-white text-sm font-semibold"
          >
            <RefreshCw className="w-4 h-4" />
            {copy.cta}
          </button>
        )}
        <Link href="/mobile/study" className="text-[12.5px] text-gray-400 underline mt-1">
          {ko ? '학습 홈으로 돌아가기' : 'Back to Study home'}
        </Link>
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
  // Answered detection — type-aware so partially-typed items don't
  // read as complete: fill_in_blanks needs EVERY blank filled; other
  // types need a non-empty answer string (a cleared arrange_words
  // leaves "" which must not count).
  const isItemAnswered = (idx: number): boolean => {
    const raw = answers[idx]
    if (raw == null || raw.trim() === '') return false
    const item = test.questions[idx]
    if (item?.type === 'fill_in_blanks') {
      const blanksArr = item.blanks ?? []
      if (blanksArr.length === 0) return true
      try {
        const parsed = JSON.parse(raw) as Record<string, string>
        return blanksArr.every(b => (parsed[String(b.id)] ?? '').trim().length > 0)
      } catch { return false }
    }
    return true
  }
  const answered = test.questions.reduce((n, _, i) => n + (isItemAnswered(i) ? 1 : 0), 0)
  // Weighted totals: TOEFL Complete-the-Words is ONE screen with 10
  // blanks — ETS scores it as 10 of the ~50 Reading questions. The
  // student expects to see a 50-item total, not 41. We treat every
  // fill_in_blanks item as `blanks.length` for the counter and
  // progress bar, but keep it as a single navigable card so the UI
  // stays coherent.
  const questionWeight = (idx: number): number => {
    const item = test.questions[idx]
    if (item?.type === 'fill_in_blanks') return item.blanks?.length ?? 1
    return 1
  }
  // Weighted answered/unanswered — matches the weighted "of 50"
  // header so the submit-confirm dialog speaks the same units. A
  // partially-filled CtW contributes its FILLED blank count.
  const weightedAnsweredFor = (idx: number): number => {
    const raw = answers[idx]
    const item = test.questions[idx]
    if (item?.type === 'fill_in_blanks') {
      const blanksArr = item.blanks ?? []
      if (!raw) return 0
      try {
        const parsed = JSON.parse(raw) as Record<string, string>
        return blanksArr.filter(b => (parsed[String(b.id)] ?? '').trim().length > 0).length
      } catch { return 0 }
    }
    return isItemAnswered(idx) ? 1 : 0
  }
  const weightedAnswered = test.questions.reduce((n, _, i) => n + weightedAnsweredFor(i), 0)
  // Effective 1-indexed range each question occupies within the
  // weighted total: startAt[i] = position of first sub-question,
  // endAt[i] = position of last sub-question.
  const questionRanges: { startAt: number; endAt: number }[] = []
  {
    let acc = 0
    for (let i = 0; i < test.questions.length; i++) {
      const w = questionWeight(i)
      questionRanges.push({ startAt: acc + 1, endAt: acc + w })
      acc += w
    }
  }
  const totalQuestions = questionRanges.length > 0
    ? questionRanges[questionRanges.length - 1]!.endAt
    : 0
  // Progress reflects the FURTHEST question the student has landed on,
  // not just the count answered. Duolingo-style: the bar fills as the
  // student advances through the test, even if they skip and come back.
  const furthestIdx = Math.max(currentIdx, answered - 1)
  const furthestNow = questionRanges[Math.min(furthestIdx, questionRanges.length - 1)]?.endAt
    ?? Math.max(currentIdx + 1, answered)
  // High-water mark: going back to review an earlier question keeps
  // the bar where it was.
  if (furthestNow > furthestProgressRef.current) furthestProgressRef.current = furthestNow
  const furthest = furthestProgressRef.current
  const progressPct = totalQuestions > 0 ? Math.min(100, (furthest / totalQuestions) * 100) : 0
  const currentRange = questionRanges[currentIdx]
  const currentLabel = currentRange
    ? (currentRange.startAt === currentRange.endAt
        ? String(currentRange.startAt)
        : `${currentRange.startAt}–${currentRange.endAt}`)
    : String(currentIdx + 1)
  const timeCritical = remainingMs < 60_000
  const timeWarning = !timeCritical && remainingMs < 5 * 60_000

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {/* Sticky progress + controls strip. Single top-of-screen bar
          is the primary signal (Duolingo pattern); N/M label + timer
          are demoted to small pills underneath. */}
      <div className="flex-shrink-0 bg-white border-b border-gray-100">
        {/* Row 1: full-width gray→green progress bar (2px). */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-emerald-500 transition-[width] duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
            role="progressbar"
            aria-valuenow={furthest}
            aria-valuemin={0}
            aria-valuemax={totalQuestions}
          />
        </div>
        {/* Row 2: N/M · timer · pause. Everything demoted vs. before —
            the bar carries the primary progress signal now. */}
        <div className="px-5 py-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setGridOpen(v => !v)}
            disabled={audioPlaying}
            className="text-[11px] text-gray-500 tabular-nums inline-flex items-center gap-1 disabled:opacity-40"
          >
            {t('study.test.questionN', { current: currentLabel, total: String(totalQuestions) })}
            {gridOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          <div className="inline-flex items-center gap-1.5">
            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono tabular-nums border ${
              paused ? 'bg-primary/10 text-primary border-primary/30 font-semibold'
                // animate-pulse in the last 60s so the urgency registers
                // peripherally even while the student reads the question
                : timeCritical ? 'bg-rose-50 text-rose-700 border-rose-200 font-semibold animate-pulse'
                : timeWarning ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-gray-50 text-gray-600 border-gray-200'
            }`}>
              <Clock className="w-3 h-3" />
              {formatTime(remainingMs)}
            </div>
            <button
              type="button"
              onClick={togglePause}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-colors ${
                paused
                  ? 'bg-primary text-white border-primary hover:bg-primary/90'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary'
              }`}
              aria-label={paused ? (ko ? '재개' : 'Resume') : (ko ? '일시정지' : 'Pause')}
            >
              {paused ? (ko ? '재개' : 'Resume') : (ko ? '일시정지' : 'Pause')}
            </button>
          </div>
        </div>
      </div>

      {/* Question grid sheet — slide-down picker for quick jumps.
          Cells use the same WEIGHTED numbering as the header ("11-20"
          for a 10-blank CtW item) and the same type-aware answered
          detection, so all surfaces speak identical units. Jumping is
          locked while a Speaking recording is in progress — leaving
          mid-recording would upload the audio against the wrong
          question. */}
      {gridOpen && (
        <div className="flex-shrink-0 border-b border-gray-100 bg-gray-50/60 px-3 py-3">
          <div className="grid grid-cols-8 gap-1.5">
            {test.questions.map((_, i) => {
              const isCurrent = i === currentIdx
              const isAnswered = isItemAnswered(i)
              const range = questionRanges[i]
              const cellLabel = range
                ? (range.startAt === range.endAt ? String(range.startAt) : `${range.startAt}–${range.endAt}`)
                : String(i + 1)
              const anyRecording = Object.values(interviewRecordingActive).some(Boolean)
              return (
                <button
                  key={i}
                  type="button"
                  disabled={anyRecording}
                  onClick={() => { setCurrentIdx(i); setGridOpen(false) }}
                  className={`h-8 rounded-md text-xs font-medium transition-colors tabular-nums disabled:opacity-40 ${
                    isCurrent
                      ? 'bg-primary text-white'
                      : isAnswered
                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                        : 'bg-white text-gray-700 ring-1 ring-gray-200'
                  }`}
                >
                  {cellLabel}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Question + answer choices. Keyed by question index so each
          Next/Prev remounts the body: scroll resets to the top and the
          fade-in makes navigation read as movement, not a text swap. */}
      <div key={currentIdx} className="flex-1 overflow-y-auto px-5 py-5 animate-fade-in">
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
            {/* TOEFL adaptive-module chip (Reading + Listening).
                Prefers the server-computed `moduleBreakIdx`; falls
                back to a midpoint split for older cached tests. */}
            {test.family === 'toefl' && test.section != null
              && /(reading|listening)/i.test(test.section)
              && test.questions.length >= 4 && (() => {
              const breakIdx = test.moduleBreakIdx ?? Math.ceil(test.questions.length / 2)
              const isModule2 = currentIdx >= breakIdx
              return (
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ring-1 ${
                  isModule2
                    ? 'bg-amber-50 text-amber-800 ring-amber-200'
                    : 'bg-primary/10 text-primary ring-primary/20'
                }`}>
                  {isModule2 ? 'Module 2' : 'Module 1'}
                </span>
              )
            })()}
          </div>
        )}
        {/* "Module 2 begins" banner — shown on the FIRST question of
            module 2 so the student registers the transition. */}
        {test.family === 'toefl' && test.section != null
          && /(reading|listening)/i.test(test.section)
          && test.questions.length >= 4 && (() => {
          const breakIdx = test.moduleBreakIdx ?? Math.ceil(test.questions.length / 2)
          if (currentIdx !== breakIdx) return null
          const isReading = /reading/i.test(test.section ?? '')
          return (
            <div className="mb-4 rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-50/40 px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider">
                  Module 2
                </span>
                <span className="text-[13px] font-bold text-amber-900">
                  {ko ? '모듈 2 시작' : 'Module 2 begins'}
                </span>
              </div>
              <p className="text-[12px] text-amber-800 leading-relaxed">
                {ko
                  ? (isReading
                      ? '나머지 문제는 모듈 2에 속합니다. 두 번째 Complete-the-Words 지문이 포함됩니다.'
                      : '나머지 문제는 모듈 2에 속합니다. Choose-a-Response 3문항과 나머지 대화·강의가 포함됩니다.')
                  : (isReading
                      ? 'The remaining questions are in Module 2, including a second Complete-the-Words paragraph.'
                      : 'The remaining questions are in Module 2, including 3 Choose-a-Response items and the second half of the conversations, announcements, and talks.')}
              </p>
              {/* Adaptive-routing verdict — where the real ETS test
                  would branch you based on Module 1 performance. */}
              {moduleRoute && (
                <p className="text-[12px] text-amber-900 leading-relaxed mt-1.5 font-medium">
                  {(() => {
                    const scored = moduleRoute.correct != null
                      ? `${moduleRoute.correct}/${moduleRoute.total}`
                      : null
                    if (ko) {
                      const band = moduleRoute.route === 'hard' ? '더 어려운' : moduleRoute.route === 'easy' ? '더 쉬운' : '표준 난이도의'
                      return `모듈 1 ${scored ? `정답 ${scored} — ` : ''}실제 TOEFL이라면 ${band} 모듈 2로 배정됩니다.`
                    }
                    const band = moduleRoute.route === 'hard' ? 'a harder' : moduleRoute.route === 'easy' ? 'an easier' : 'a standard'
                    return `Module 1${scored ? `: ${scored} correct` : ''} — on the real TOEFL you'd be routed to ${band} Module 2.`
                  })()}
                </p>
              )}
            </div>
          )
        })()}
        {/* Speaking start screen — shown INSTEAD of the question until
            the student taps Start. Nothing plays and nothing records
            before this tap: the audio player, timers, and recorder are
            all gated behind micPrimed (the speaking question body
            below renders null while unprimed). The tap is a direct
            user gesture, guaranteeing getUserMedia is allowed by
            browser policy; after grant, every speaking item auto-plays
            and auto-records off the cached PRIMED_MIC_STREAM. */}
        {(q.type === 'speaking_repeat' || q.type === 'speaking_interview') && !micPrimed && (
          <div className="mb-4 rounded-2xl border border-primary/25 bg-gradient-to-b from-primary/[0.06] via-white to-white px-6 py-10 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 ring-1 ring-primary/25 flex items-center justify-center mb-4">
              <Mic className="w-7 h-7 text-primary" />
            </div>
            <div className="text-[17px] font-semibold text-gray-900 mb-1.5">
              {ko ? '스피킹 테스트 준비' : 'Ready for the Speaking test'}
            </div>
            <p className="text-[12.5px] text-gray-600 mb-6 leading-relaxed max-w-[280px] mx-auto">
              {ko
                ? '시작을 누르면 마이크가 설정되고 첫 문제의 오디오가 재생됩니다. 각 문항은 자동으로 재생되고 자동으로 녹음됩니다.'
                : 'Tap start to set up your microphone. The first question’s audio will then play — every item auto-plays and auto-records.'}
            </p>
            <button
              type="button"
              onClick={async () => {
                // force: this tap is a fresh user gesture, so retry
                // even if an earlier silent attempt was denied.
                const stream = await primeMicStream({ force: true })
                if (!stream) setMicDenied(true)
                // Unblock the flow either way so the student isn't
                // stuck on this gate forever; without a mic the
                // safety net still reveals Next, and the notice
                // below tells them recording is off.
                setMicPrimed(true)
              }}
              className="inline-flex items-center gap-2 px-7 h-12 rounded-full bg-primary text-white text-[15px] font-semibold shadow-[0_2px_8px_-2px_rgba(40,133,232,0.40)] active:scale-[0.99] transition"
            >
              <Mic className="w-4 h-4" />
              {ko ? '테스트 시작' : 'Start Test'}
            </button>
          </div>
        )}
        {(q.type === 'speaking_repeat' || q.type === 'speaking_interview') && micDenied && (
          <div role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-800 leading-relaxed">
            {ko
              ? '마이크 권한이 거부되어 답변이 녹음되지 않습니다. 브라우저 설정에서 마이크를 허용한 뒤 새로고침하면 녹음이 다시 활성화됩니다.'
              : 'Microphone access was denied, so your answers will not be recorded. Allow the microphone in your browser settings and refresh to re-enable recording.'}
          </div>
        )}
        {q.passage
          && q.type !== 'fill_in_blanks'
          // Speaking items handle their OWN audio + no-transcript
          // reveal in the branch below. If we let the top passage box
          // render, the student sees the sentence text they're
          // supposed to REPEAT — defeating the whole listen-and-
          // repeat task. speaking_interview shouldn't show its
          // interviewer question as prose either; the audio does that.
          && q.type !== 'speaking_repeat'
          && q.type !== 'speaking_interview'
          && (() => {
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
                  // ETS Jan-2026: Listening plays ONCE per item on the
                  // real test. No replays allowed.
                  maxPlays={1}
                  onSpeakingChange={setAudioPlaying}
                />
              ) : (q.type === 'writing_email' || q.type === 'writing_discussion') ? (
                <div className="mb-4 rounded-xl border border-primary/25 bg-white px-4 py-4 text-[14px] text-gray-800 leading-relaxed shadow-[0_1px_2px_-1px_rgba(15,23,42,0.06)]">
                  <WritingScenario text={q.passage} kind={q.type === 'writing_email' ? 'email' : 'discussion'} />
                </div>
              ) : (
                <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-[14px] text-gray-800 leading-relaxed">
                  <PassageParagraphs text={q.passage} />
                </div>
              )}
            </>
          )
        })()}
        {q.type !== 'speaking_repeat' && q.type !== 'speaking_interview' && (
          // Skip the prompt text for Speaking — the interview question
          // and repeat sentence are audio-only. Showing the text
          // defeats the whole listening task. The inner branch below
          // renders task-specific instructions instead.
          <p className="text-base text-gray-900 leading-relaxed whitespace-pre-wrap mb-4">
            {normalizeDisplayText(q.prompt)}
          </p>
        )}
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
                        onClick={() => { hapticSelection(); toggle(choice) }}
                        className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors active:scale-[0.99] flex items-start gap-3 ${
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
            // Filled-count for the progress chip at the top.
            const filledCount = blanks.filter(b =>
              (parsed[String(b.id)] ?? '').trim().length > 0,
            ).length
            const allFilled = blanks.length > 0 && filledCount === blanks.length
            return (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-[12px] uppercase tracking-[0.10em] text-gray-500">
                    {ko ? '빈칸에 알맞은 글자를 입력하세요' : 'Type the missing letters'}
                  </p>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums transition ${
                    allFilled
                      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {filledCount} / {blanks.length}
                  </span>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 text-[15px] text-gray-900 leading-[2.4]">
                  {segments.map((seg, i) => {
                    const match = seg.match(/^\[(\d+)\]$/)
                    if (!match) return <span key={i}>{normalizeDisplayText(seg)}</span>
                    const id = parseInt(match[1], 10)
                    // Expected length from the blanks answer key —
                    // used to size the input and hint how many letters
                    // are missing. Falls back to a reasonable minimum
                    // if the answer key is missing.
                    const blank = blanks.find(b => b.id === id)
                    const expectedLen = Math.max(1, (blank?.answer ?? '').length)
                    const currentVal = parsed[String(id)] ?? ''
                    const isFilled = currentVal.trim().length > 0
                    return (
                      <BlankLetterInput
                        key={i}
                        id={id}
                        expectedLen={expectedLen}
                        value={currentVal}
                        onChange={(v) => setBlank(id, v)}
                        isFilled={isFilled}
                        ko={ko}
                      />
                    )
                  })}
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  {ko
                    ? `총 ${blanks.length}개의 빈칸. 각 빈칸 위 숫자는 문항 번호입니다. 회색 밑줄 = 미입력, 초록 밑줄 = 입력 완료.`
                    : `${blanks.length} blanks total. The number above each blank is the question number. Gray underline = empty, green = filled.`}
                </p>
              </div>
            )
          })()
        ) : q.type === 'arrange_words' ? (
          // TOEFL Build-a-Sentence (Jan 2026): choices are word/phrase
          // chips. Student clicks them in order to build a sentence.
          // Answer stored as chips joined by " | " in answers[currentIdx].
          //
          // Display rules (don't touch stored data — answer must match
          // correct_answer verbatim):
          //   - Pool: force first letter LOWERCASE on every chip so the
          //     capitalization of "The" / "Maria" doesn't telegraph
          //     which chip is the first word.
          //   - Slot row: capitalize first letter of the chip in slot 0
          //     so the sentence reads naturally. Later chips keep their
          //     underlying case (proper nouns like "Maria" stay
          //     capitalized).
          //   - When every chip is placed, append a period/question
          //     mark as a static visible token (inferred from the
          //     correct_answer's ending, default ".").
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
            const lcFirst = (s: string) => s ? s.charAt(0).toLowerCase() + s.slice(1) : s
            const ucFirst = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s
            const complete = current.length === q.choices.length && q.choices.length > 0
            // Infer ending punctuation from the correct answer. If the
            // model didn't emit one, default to a period.
            const endPunct = (() => {
              const last = (q.correct_answer ?? '').trim().slice(-1)
              return /[.?!]/.test(last) ? last : '.'
            })()
            return (
              <div className="space-y-4">
                <p className="text-[12px] uppercase tracking-[0.10em] text-gray-500">
                  {ko ? '단어를 순서대로 눌러 문장을 만드세요' : 'Tap the words in order to build the sentence'}
                </p>
                {/* Slot row — assembled sentence so far */}
                <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-3 py-3 min-h-[60px] flex flex-wrap items-center gap-2">
                  {current.length === 0
                    ? <span className="text-[13px] text-gray-400 italic">{ko ? '비어 있음' : 'empty'}</span>
                    : current.map((chip, i) => (
                        <button
                          key={`${chip}-${i}`}
                          type="button"
                          onClick={() => setOrder(current.filter((_, j) => j !== i))}
                          className="px-3 py-1.5 rounded-lg bg-primary text-white text-[13px] font-medium hover:opacity-90"
                        >
                          {i === 0
                            ? ucFirst(normalizeDisplayText(chip))
                            : normalizeDisplayText(chip)}
                        </button>
                      ))}
                  {complete && (
                    <span
                      aria-hidden
                      className="text-[16px] font-semibold text-gray-800 leading-none pl-0.5"
                    >
                      {endPunct}
                    </span>
                  )}
                </div>
                {/* Chip pool — unused words. First letter forced lowercase
                    so the "obviously-first" chip doesn't stand out. */}
                <div className="flex flex-wrap gap-2">
                  {remaining.map(chip => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setOrder([...current, chip])}
                      className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-[13px] text-gray-800 hover:border-primary hover:text-primary"
                    >
                      {lcFirst(normalizeDisplayText(chip))}
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
          // TOEFL Listen-and-Repeat (Jan 2026, hands-off): audio auto-
          // plays on mount → recording auto-starts when the audio ends
          // → auto-stops at 15 sec → auto-advances to the next question.
          // No manual buttons, no transcript display.
          (() => {
            // Behind the Start screen: render nothing until the mic
            // is primed — no player card, no timers, no track.
            if (!micPrimed) return null
            // Strip BOTH the "audio script:" and "transcript:" prefixes
            // (model uses them interchangeably) plus wrapping quotes,
            // so ListeningAudioPlayer speaks just the sentence.
            const src = (q.passage ?? '')
              .replace(/^\s*(?:audio\s*script|transcript)\s*:\s*/i, '')
              .replace(/^"|"$/g, '')
              .trim() || q.correct_answer
            const timerKey = `repeat-${currentIdx}`
            const autoRecToken = interviewAutoRecToken[timerKey]
            const isRecording = !!interviewRecordingActive[timerKey]
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
                  {ko ? '문장을 들은 뒤 그대로 따라 말하세요' : 'Listen, then repeat the sentence exactly'}
                </p>
                <ListeningAudioPlayer
                  key={`repeat-${currentIdx}`}
                  groupKey={`${sessionId}:repeat-${currentIdx}`}
                  transcript={src}
                  language={language}
                  maxPlays={1}
                  // Don't autoplay until mic has been primed — otherwise
                  // the audio starts behind the "Start Speaking" gate.
                  autoPlay={micPrimed}
                  onSpeakingChange={setAudioPlaying}
                  onFirstPlayEnd={() => {
                    // Mark audio as finished. Auto-record is triggered
                    // IMMEDIATELY (no setTimeout) so we stay inside the
                    // same user-activation window that audio.onended
                    // fires under — needed for getUserMedia to succeed
                    // without a fresh tap.
                    setInterviewTimerState(s => ({ ...s, [timerKey]: 'started' }))
                    setInterviewAutoRecToken(s => {
                      const next = (typeof s[timerKey] === 'number' ? (s[timerKey] as number) : 0) + 1
                      return { ...s, [timerKey]: next }
                    })
                    // Safety net: check at 3 s whether recording has
                    // actually begun. If not, auto-record silently
                    // failed → reveal Next so the student isn't stuck.
                    // If recording IS in progress, we do nothing here
                    // — `onDone` (fired after Whisper transcription
                    // completes) is the sole thing that flips Next
                    // ready, so students see "Processing…" between
                    // stop and Next appearing.
                    window.setTimeout(() => {
                      const isCurrentlyRecording = !!interviewRecordingActiveRef.current[timerKey]
                      if (!isCurrentlyRecording) {
                        setInterviewNextReady(s => s[timerKey] ? s : { ...s, [timerKey]: true })
                      }
                    }, 3000)
                  }}
                />
                {isRecording && (
                  <div role="status" aria-live="assertive" className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-[12px] text-emerald-800 flex items-center gap-2">
                    <span className="relative inline-flex w-2.5 h-2.5">
                      <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping" />
                      <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    </span>
                    <span className="font-semibold">
                      {ko ? '녹음 중 (최대 15초, 다른 문제로 이동 불가)' : 'Recording (max 15 sec — navigation is locked)'}
                    </span>
                  </div>
                )}
                {/* Post-recording status: amber "processing" while the
                    upload + Whisper transcription is in flight, then a
                    green "recording complete" confirmation once the
                    answer has landed. */}
                {!isRecording && interviewProcessing[timerKey] && (
                  <div role="status" aria-live="polite" className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-[12px] text-amber-800 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                    <span className="font-semibold">
                      {ko ? '답변 처리 중…' : 'Processing your answer…'}
                    </span>
                  </div>
                )}
                {!isRecording && !interviewProcessing[timerKey]
                  && !!interviewNextReady[timerKey]
                  && !!(answers[currentIdx] ?? '').trim() && (
                  <div role="status" className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-[12px] text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span className="font-semibold">
                      {ko ? '녹음 완료 — 답변이 저장되었습니다' : 'Recording complete — your answer was captured'}
                    </span>
                  </div>
                )}
                <VoiceRecorderButton
                  // Keyed per question — without this the SAME component
                  // instance survives across questions and its internal
                  // lastTokenRef still holds the previous question's
                  // token value. Since each question's token also starts
                  // at 1, the "token changed?" check false-negatives and
                  // auto-record never fires on question 2+.
                  // NOTE the "rec-" prefix: the sibling ListeningAudio-
                  // Player uses `repeat-${currentIdx}` as ITS key, and
                  // two siblings with the same key makes React duplicate
                  // children (the "stacked audio players" bug).
                  key={`rec-${timerKey}`}
                  sessionId={sessionId} language={language} ko={ko}
                  onTranscript={appendTranscript}
                  autoStartToken={typeof autoRecToken === 'number' ? autoRecToken : undefined}
                  maxDurationSec={15}
                  hideManualButton
                  onRecordingChange={(rec) => {
                    // Track recording flag only. Next-ready stays
                    // false until `onDone` fires, so students see the
                    // "Processing your answer…" pill between stop and
                    // Next appearing. A stop transition also flips
                    // "processing" on — Submit stays disabled until
                    // the transcription lands (onDone).
                    setInterviewRecordingActive(s => ({ ...s, [timerKey]: rec }))
                    if (!rec) setInterviewProcessing(s => ({ ...s, [timerKey]: true }))
                  }}
                  onDone={() => {
                    setInterviewNextReady(s => ({ ...s, [timerKey]: true }))
                    setInterviewProcessing(s => ({ ...s, [timerKey]: false }))
                  }}
                />
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
                    ? (ko ? '여기에 이메일을 작성하세요…' : 'Type your email here…')
                    : (ko ? '여기에 토론 기여글을 작성하세요…' : 'Type your contribution here…')}
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
          // TOEFL Take-an-Interview (Jan 2026, ETS-faithful, hands-off
          // flow): audio auto-plays on mount → 15-sec prep countdown
          // fires when audio ends → recording auto-starts when prep
          // hits 0 → recording auto-stops at 45 sec (ETS response
          // window). Textarea + navigation locked while recording is
          // in progress so students can't skip out mid-answer.
          (() => {
            // Behind the Start screen — same gating as speaking_repeat.
            if (!micPrimed) return null
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
            // autoRecTokens tracks the "response phase reached" moment
            // — when it flips to `${timerKey}:response`, VoiceRecorder-
            // Button reacts and starts the mic.
            const autoRecToken = interviewAutoRecToken[timerKey]
            const isRecording = !!interviewRecordingActive[timerKey]
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
                  autoPlay={micPrimed}
                  onSpeakingChange={setAudioPlaying}
                  onFirstPlayEnd={() => setInterviewTimerState(s => ({ ...s, [timerKey]: 'started' }))}
                />
                <SpeakingTimer
                  // Keyed per question — SpeakingTimer keeps its phase
                  // ('idle'→'prep'→'response'→'expired') in INTERNAL
                  // state. Without a key the same instance survives to
                  // the next question stuck at 'expired' and the
                  // countdown never restarts. This was the "interview
                  // countdown not working" bug.
                  key={`timer-${timerKey}`}
                  active={timerActive}
                  paused={paused}
                  prepSec={15}
                  responseSec={45}
                  ko={ko}
                  t={t}
                  onPhaseChange={(p) => {
                    // Prep just ended → response phase → trigger the
                    // recorder imperatively. Skip when this question
                    // was already completed on a previous visit (its
                    // Next-ready flag is pre-seeded on resume) — we
                    // must not re-record over an existing answer.
                    if (p === 'response' && !interviewNextReady[timerKey]) {
                      setInterviewAutoRecToken(s => ({ ...s, [timerKey]: (typeof s[timerKey] === 'number' ? s[timerKey] as number : 0) + 1 }))
                    }
                  }}
                  onExpire={() => {
                    setInterviewTimerState(s => ({ ...s, [timerKey]: 'expired' }))
                    // Fallback: if recording never fired (mic blocked),
                    // transcription will never set Next-ready — reveal
                    // it here so the student isn't stuck. No-op when
                    // onDone already flipped it.
                    setInterviewNextReady(s => s[timerKey] ? s : { ...s, [timerKey]: true })
                  }}
                />
                {isRecording && (
                  <div role="status" aria-live="assertive" className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-[12px] text-emerald-800 flex items-center gap-2">
                    <span className="relative inline-flex w-2.5 h-2.5">
                      <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping" />
                      <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    </span>
                    <span className="font-semibold">
                      {ko ? '녹음 중 (최대 45초, 다른 문제로 이동 불가)' : 'Recording (max 45 sec — navigation is locked)'}
                    </span>
                  </div>
                )}
                {(phase === 'idle' || timerExpired) && !isRecording && (
                  <div className="text-[11px] text-gray-500 text-center">
                    {phase === 'idle'
                      ? t('study.test.speakingWaitForAudio')
                      : t('study.test.speakingTimeUp')}
                  </div>
                )}
                <VoiceRecorderButton
                  // Keyed per question — same stale-lastTokenRef fix as
                  // speaking_repeat. "rec-" prefix avoids colliding with
                  // the sibling ListeningAudioPlayer's key (duplicate
                  // sibling keys make React duplicate/stack children).
                  key={`rec-${timerKey}`}
                  sessionId={sessionId} language={language} ko={ko}
                  disabled={phase === 'idle' || timerExpired}
                  onTranscript={appendTranscript}
                  autoStartToken={typeof autoRecToken === 'number' ? autoRecToken : undefined}
                  maxDurationSec={45}
                  hideManualButton
                  onRecordingChange={(rec) => {
                    // Only flip the recording flag here. Next-ready
                    // stays false until `onDone` fires — that way the
                    // student sees a "Processing your answer…" state
                    // between recording stop and Next appearing. A
                    // stop transition also flips "processing" on so
                    // Submit waits for the in-flight transcription.
                    setInterviewRecordingActive(s => ({ ...s, [timerKey]: rec }))
                    if (!rec) setInterviewProcessing(s => ({ ...s, [timerKey]: true }))
                  }}
                  onDone={() => {
                    // Reveal Next after transcription finishes — the
                    // student clicks it to advance manually.
                    setInterviewNextReady(s => ({ ...s, [timerKey]: true }))
                    setInterviewProcessing(s => ({ ...s, [timerKey]: false }))
                  }}
                />
                {/* Post-recording status: amber "processing" while the
                    upload + Whisper transcription is in flight… */}
                {!isRecording && interviewProcessing[timerKey] && (
                  <div role="status" aria-live="polite" className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-[12px] text-amber-800 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                    <span className="font-semibold">
                      {ko ? '답변 처리 중…' : 'Processing your answer…'}
                    </span>
                  </div>
                )}
                {/* …then a green confirmation. Voice-only flow — no
                    textarea and no transcript preview. The Whisper
                    transcript still lands in answers[currentIdx] via
                    appendTranscript for grading; showing it mid-test
                    invites students to fixate on transcription
                    glitches instead of moving on (real ETS never
                    shows a transcript either). */}
                {(answers[currentIdx] ?? '').trim() && !isRecording && !interviewProcessing[timerKey] && (
                  <div role="status" className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-[12px] text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span className="font-semibold">
                      {ko ? '녹음 완료 — 답변이 저장되었습니다' : 'Recording complete — your answer was captured'}
                    </span>
                  </div>
                )}
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
                    hapticSelection()
                    setAnswers(prev => {
                      const next = [...prev]
                      next[currentIdx] = choice
                      return next
                    })
                  }}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors active:scale-[0.99] flex items-start gap-3 ${
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

      {/* Footer — prev / next / submit. Speaking items: Next appears
          ONLY after both the audio finished AND the recording is done.
          audioFinished flips true from `onFirstPlayEnd`. recordingDone
          is derived from `interviewRecordingActive` — true when the
          recorder either hasn't started yet after the auto-record
          safety window OR has stopped after starting. */}
      {(() => {
        const isSpeakingItem = q.type === 'speaking_repeat' || q.type === 'speaking_interview'
        const isLast = currentIdx === test.questions.length - 1
        const speakingKey = q.type === 'speaking_repeat' ? `repeat-${currentIdx}` : `interview-${currentIdx}`
        // Next button appears after the student's audio has been
        // PROCESSED — i.e., Whisper transcription completed. Set by
        // VoiceRecorderButton's `onDone` callback and by the safety
        // timeout scheduled from `onFirstPlayEnd` (so the student
        // isn't stuck if auto-record silently fails).
        if (isSpeakingItem && !isLast && !interviewNextReady[speakingKey]) return null
        return (
          <div className="flex-shrink-0 px-5 py-3 border-t border-gray-100 bg-white flex items-center gap-2">
            {!isSpeakingItem && (
              <button
                type="button"
                onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
                disabled={currentIdx === 0 || audioPlaying}
                className="h-11 w-11 rounded-full bg-white border border-gray-200 text-gray-700 inline-flex items-center justify-center disabled:opacity-40"
                aria-label={String(t('study.test.previous'))}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            {isLast ? (() => {
              // Submit waits for any in-flight recording OR Whisper
              // transcription — otherwise a fast Submit on the last
              // speaking question races the transcription and the
              // final answer submits as blank.
              const speechBusy = Object.values(interviewRecordingActive).some(Boolean)
                || Object.values(interviewProcessing).some(Boolean)
              return (
                <button
                  type="button"
                  onClick={() => setConfirmOpen(true)}
                  disabled={phase === 'submitting' || audioPlaying || speechBusy}
                  className="flex-1 h-11 rounded-full bg-primary text-white text-sm font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  {(phase === 'submitting' || speechBusy)
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : null}
                  {speechBusy
                    ? (ko ? '답변 처리 중…' : 'Processing answer…')
                    : weightedAnswered < totalQuestions
                      ? t('study.test.submitWithUnanswered', { count: String(totalQuestions - weightedAnswered) })
                      : t('study.test.submit')}
                </button>
              )
            })() : (
              <button
                type="button"
                onClick={() => setCurrentIdx(i => Math.min(test.questions.length - 1, i + 1))}
                disabled={audioPlaying}
                className="flex-1 h-11 rounded-full bg-gradient-to-b from-primary to-primary/90 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_8px_rgba(40,133,232,0.28)] text-sm font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                {t('study.test.next')}
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )
      })()}
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
          unanswered={totalQuestions - weightedAnswered}
          totalQuestions={totalQuestions}
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

  // Auto-request on mount (the panel only mounts when the review item
  // is expanded). Since submit pre-grades every open response, this
  // usually returns the STORED grade from the dedupe cache instantly —
  // no extra model call and no extra tap.
  useEffect(() => {
    if (response.trim().length >= 20) void requestGrade()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  // Weighted question numbering — mirrors the taking view: a CtW item
  // with 10 blanks occupies positions N..N+9 of the weighted total, so
  // review labels match the "Question 12–21 of 50" numbering the
  // student saw during the test.
  const reviewRanges: { startAt: number; endAt: number }[] = []
  {
    let acc = 0
    for (const q of test.questions) {
      const w = q.type === 'fill_in_blanks' ? Math.max(1, q.blanks?.length ?? 1) : 1
      reviewRanges.push({ startAt: acc + 1, endAt: acc + w })
      acc += w
    }
  }
  const reviewTotal = reviewRanges.length > 0 ? reviewRanges[reviewRanges.length - 1]!.endAt : 0

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
                    verdict.ungraded || verdict.correct ? 'border-gray-200' : 'border-rose-200'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setExpanded(prev => prev === i ? null : i)}
                    className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50"
                  >
                    {verdict.ungraded
                      // Open-response: no ✓/✗ — scored by the rubric
                      // panel inside, not the answer key, and excluded
                      // from the auto-score.
                      ? <Sparkles className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      : verdict.correct
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        : studentAnswer == null
                          ? <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                          : <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-500">
                        {(() => {
                          const r = reviewRanges[i]
                          const cur = r
                            ? (r.startAt === r.endAt ? String(r.startAt) : `${r.startAt}–${r.endAt}`)
                            : String(i + 1)
                          return t('study.test.questionN', { current: cur, total: String(reviewTotal) })
                        })()}
                        {verdict.ungraded && (
                          <span className="ml-1.5 text-primary font-medium">
                            · {ko ? '루브릭 채점 (점수 미포함)' : 'rubric-graded (not in score)'}
                          </span>
                        )}
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
                      {q.type === 'fill_in_blanks' && (q.blanks?.length ?? 0) > 0 ? (
                        // Complete-the-Words: per-blank rows with the
                        // student's letters vs the expected word — the
                        // stored answer is a JSON map of blankId→text,
                        // which would otherwise render as a raw blob.
                        <div className="space-y-1.5 mt-2">
                          {(() => {
                            let parsed: Record<string, string> = {}
                            try {
                              if (studentAnswer) parsed = JSON.parse(studentAnswer) as Record<string, string>
                            } catch { /* unanswered or legacy format */ }
                            const baseNum = reviewRanges[i]?.startAt ?? 1
                            return q.blanks!.map((b, bi) => {
                              const student = (parsed[String(b.id)] ?? '').trim()
                              const accepted = [b.answer, ...(b.alternates ?? [])]
                              const ok = !!student && accepted.some(a => a.trim().toLowerCase() === student.toLowerCase())
                              return (
                                <div key={b.id} className={`px-3 py-2 rounded-lg text-xs border flex items-center gap-2 ${
                                  ok ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                     : 'bg-rose-50 border-rose-200 text-rose-900'
                                }`}>
                                  <span className="font-semibold tabular-nums flex-shrink-0">{baseNum + bi}.</span>
                                  <span className="flex-1 min-w-0">
                                    {student || (ko ? '무응답' : 'not answered')}
                                    {!ok && (
                                      <span className="ml-2 font-semibold text-emerald-700">→ {b.answer}</span>
                                    )}
                                  </span>
                                  {ok
                                    ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                                    : <XCircle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />}
                                </div>
                              )
                            })
                          })()}
                        </div>
                      ) : (q.type === 'fill_in_blanks' || q.type === 'arrange_words'
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
        else if (p && typeof p === 'object' && 'x' in p && 'y' in p) {
          const o = p as Record<string, unknown>
          pts.push([Number(o.x), Number(o.y)])
        }
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
      .filter(ln => ln && typeof ln.m === 'number' && typeof ln.b === 'number')
    const xVals = pts.map(p => p.x)
    const yVals = pts.map(p => p.y)
    // Fit the window to the DATA (pad 1.5 units) — the old fixed
    // [-5,5]-anchored window put e.g. R(6,11) at the extreme top edge
    // with tick labels that stopped at 4, so figures with points
    // beyond ±5 looked wrong/cut off.
    const xMin = Math.floor(Math.min(-2, ...xVals) - 1.5)
    const xMax = Math.ceil(Math.max(2, ...xVals) + 1.5)
    const yMin = Math.floor(Math.min(-2, ...yVals) - 1.5)
    const yMax = Math.ceil(Math.max(2, ...yVals) + 1.5)
    const xR = xMax - xMin; const yR = yMax - yMin
    const sx = (x: number) => padL + ((x - xMin) / xR) * innerW
    const sy = (y: number) => padT + innerH - ((y - yMin) / yR) * innerH
    const xOrigin = sx(0), yOrigin = sy(0)
    // Adaptive tick step → ~4-6 labels per axis at any range.
    const tickStep = (r: number) => r <= 12 ? 2 : r <= 30 ? 5 : 10
    const ticksIn = (min: number, max: number, step: number) => {
      const out: number[] = []
      for (let v = Math.ceil(min / step) * step; v <= max; v += step) if (v !== 0) out.push(v)
      return out
    }
    const xTicks = ticksIn(xMin, xMax, tickStep(xR))
    const yTicks = ticksIn(yMin, yMax, tickStep(yR))
    // If 3-8 labeled points form a figure and the lines are (or were
    // meant to be) its side lines, draw the closed polygon through
    // the POINTS and drop the lines. Two triggers:
    //   - every line passes through ≥2 of the points (exact sides), or
    //   - there are at least as many lines as points (the model
    //     clearly attempted one side-line per edge — prod data shows
    //     it often gets the m/b arithmetic WRONG, e.g. y=2x−9 for the
    //     side through (2,3)-(6,11), while the points themselves match
    //     the prompt; the points are the ground truth).
    // Drawing side lines as infinite lines is what turned triangles
    // into asterisks of crossing lines. Fewer lines than points =
    // genuine function graphs → keep them, clipped to the window.
    const onLine = (ln: { m: number; b: number }, p: { x: number; y: number }) =>
      Math.abs(ln.m * p.x + ln.b - p.y) < 1e-6
    const linesMatchPts = lines.length > 0
      && lines.every(ln => pts.filter(p => onLine(ln, p)).length >= 2)
    const polygonMode = pts.length >= 3 && pts.length <= 8
      && (linesMatchPts || lines.length >= pts.length)
    const freeLines = polygonMode ? [] : lines
    // Clip y = mx + b to the [xMin,xMax]×[yMin,yMax] window so steep
    // lines don't shoot across the whole figure.
    const clipLine = (ln: { m: number; b: number }): [number, number, number, number] | null => {
      if (ln.m === 0) {
        if (ln.b < yMin || ln.b > yMax) return null
        return [xMin, ln.b, xMax, ln.b]
      }
      const cand = ([
        [xMin, ln.m * xMin + ln.b],
        [xMax, ln.m * xMax + ln.b],
        [(yMin - ln.b) / ln.m, yMin],
        [(yMax - ln.b) / ln.m, yMax],
      ] as Array<[number, number]>).filter(([x, y]) => x >= xMin - 1e-9 && x <= xMax + 1e-9 && y >= yMin - 1e-9 && y <= yMax + 1e-9)
      if (cand.length < 2) return null
      cand.sort((a, b) => a[0] - b[0])
      const [x1, y1] = cand[0]!
      const [x2, y2] = cand[cand.length - 1]!
      return [x1, y1, x2, y2]
    }
    return (
      <figure className="my-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-md mx-auto bg-white">
          {/* grid — at unit density for small ranges, tick density for large */}
          {ticksIn(xMin, xMax, xR <= 16 ? 1 : tickStep(xR)).concat(0).map((v, i) => (
            <line key={`vg${i}`} x1={sx(v)} y1={padT} x2={sx(v)} y2={H - padB} stroke="#d4d4d4" strokeWidth={0.4} />
          ))}
          {ticksIn(yMin, yMax, yR <= 16 ? 1 : tickStep(yR)).concat(0).map((v, i) => (
            <line key={`hg${i}`} x1={padL} y1={sy(v)} x2={W - padR} y2={sy(v)} stroke="#d4d4d4" strokeWidth={0.4} />
          ))}
          {/* axes (only when 0 is inside the window) */}
          {yMin <= 0 && yMax >= 0 && <line x1={padL} y1={yOrigin} x2={W - padR} y2={yOrigin} stroke="black" strokeWidth={1} />}
          {xMin <= 0 && xMax >= 0 && <line x1={xOrigin} y1={padT} x2={xOrigin} y2={H - padB} stroke="black" strokeWidth={1} />}
          {/* tick labels */}
          {xTicks.map(v => (
            <text key={`xt${v}`} x={sx(v)} y={(yMin <= 0 && yMax >= 0 ? yOrigin : H - padB) + 11} fontSize="8" textAnchor="middle" fill="black">{v}</text>
          ))}
          {yTicks.map(v => (
            <text key={`yt${v}`} x={(xMin <= 0 && xMax >= 0 ? xOrigin : padL) - 5} y={sy(v) + 3} fontSize="8" textAnchor="end" fill="black">{v}</text>
          ))}
          {/* polygon through the labeled points (side lines collapsed) */}
          {polygonMode && (
            <polygon
              points={pts.map(p => `${sx(p.x)},${sy(p.y)}`).join(' ')}
              fill="rgba(0,0,0,0.04)" stroke="black" strokeWidth={1.2} strokeLinejoin="round"
            />
          )}
          {/* free lines, clipped to the window */}
          {freeLines.map((ln, i) => {
            const seg = clipLine(ln)
            if (!seg) return null
            return <line key={i} x1={sx(seg[0])} y1={sy(seg[1])} x2={sx(seg[2])} y2={sy(seg[3])} stroke="black" strokeWidth={1} />
          })}
          {/* points */}
          {pts.map((p, i) => (
            <g key={i}>
              <circle cx={sx(p.x)} cy={sy(p.y)} r={2.5} fill="black" />
              {p.label && (
                <text
                  x={sx(p.x) + (sx(p.x) > W - padR - 20 ? -6 : 5)}
                  y={sy(p.y) < padT + 14 ? sy(p.y) + 12 : sy(p.y) - 4}
                  fontSize="9" fill="black" fontWeight="600"
                  textAnchor={sx(p.x) > W - padR - 20 ? 'end' : 'start'}
                >{p.label}</text>
              )}
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
    // IMPORTANT: spec.r is the MATH radius (e.g. "13 units" in the
    // problem text) — do NOT use it as the SVG drawing size. Prior
    // version drew radius=13 pixels inside a 200×200 viewBox, making
    // a 6%-of-canvas circle with all three vertex labels clustered
    // unreadably on top of each other. The renderer always draws at
    // a fixed comfortable size; the numeric radius reaches the
    // student via the question text + caption.
    const DRAW_R = 72
    const angles = (spec.vertexAngles ?? [0, 120, 240]).slice(0, 3)
    const cx = 100, cy = 100
    const toRad = (deg: number) => (deg - 90) * Math.PI / 180 // 0° = top
    const pts = angles.map(a => [cx + DRAW_R * Math.cos(toRad(a)), cy + DRAW_R * Math.sin(toRad(a))] as [number, number])
    const path = `M ${pts[0][0]},${pts[0][1]} L ${pts[1][0]},${pts[1][1]} L ${pts[2][0]},${pts[2][1]} Z`
    const vL = labels.vertices ?? []
    const sL = labels.sides ?? []
    return (
      <figure className="my-3 flex flex-col items-center">
        <div className="max-w-md w-full bg-white rounded-lg ring-1 ring-gray-200 p-4">
          <svg viewBox="0 0 200 200" className="w-full h-auto max-h-[300px] overflow-visible">
            <circle cx={cx} cy={cy} r={DRAW_R} stroke="black" strokeWidth={1.5} fill="none" />
            <path d={path} stroke="black" strokeWidth={1.5} fill="none" />
            {pts.map((p, i) => {
              // Push vertex label OUTWARD from center by 14px so it
              // sits clearly outside the circle stroke. Prior 10px
              // offset put labels on top of the circle stroke on
              // small draws.
              const dx = p[0] - cx, dy = p[1] - cy
              const len = Math.hypot(dx, dy) || 1
              const lx = p[0] + (dx / len) * 14
              const ly = p[1] + (dy / len) * 14
              return vL[i] ? (
                <text key={i} x={lx} y={ly} fontSize={13} fontWeight={600} fill="black" textAnchor="middle" dominantBaseline="middle">{vL[i]}</text>
              ) : null
            })}
            {[0, 1, 2].map(i => {
              if (!sL[i]) return null
              const a = pts[i], b = pts[(i + 1) % 3]
              const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2
              // Side label pushed 12px outward from centroid, larger
              // font so the value is legible on phones.
              const dx = mx - cx, dy = my - cy
              const len = Math.hypot(dx, dy) || 1
              const lx = mx + (dx / len) * 12
              const ly = my + (dy / len) * 12
              return <text key={`s${i}`} x={lx} y={ly} fontSize={12} fill="black" textAnchor="middle" dominantBaseline="middle">{sL[i]}</text>
            })}
          </svg>
        </div>
        {graphic.caption && <figcaption className="text-[11px] text-black text-center italic mt-2">{graphic.caption}</figcaption>}
      </figure>
    )
  }

  // ─ Inscribed triangle by INTERIOR ANGLES ────────────────────────
  // Semantic-constraint variant of inscribedTriangle. Model provides
  // the INTERIOR angles from the item text (A + B + C = 180°); the
  // renderer applies the inscribed-angle theorem to place vertices so
  // the figure is guaranteed to actually SHOW those angles at those
  // vertices — impossible to render an item where "angle A = 60°" is
  // claimed in the prompt but the drawing shows something else.
  //
  // Model emits {type:"inscribedTriangleByAngles",
  //   spec:{ interiorAngles:[A,B,C] },
  //   labels?:{ vertices?:["A","B","C"], sides?:["a","b","c"] } }
  //
  // Geometry: by the inscribed-angle theorem, the arc opposite each
  // vertex has measure 2·(interior angle at that vertex). Walking the
  // circle counterclockwise, if we start vertex A at angle θ_A:
  //   θ_B = θ_A + 2·C (arc AB opposite C)
  //   θ_C = θ_B + 2·A (arc BC opposite A)
  // Sum check: 2A + 2B + 2C = 360°, always closes.
  if (t === 'inscribedtrianglebyangles' || (graphic.shape ?? '').toLowerCase() === 'inscribedtrianglebyangles') {
    const spec = (graphic.spec ?? {}) as { interiorAngles?: [number, number, number] }
    const labels = (graphic.labels ?? {}) as { vertices?: string[]; sides?: string[] }
    const angles = spec.interiorAngles ?? [60, 60, 60]
    const [A, B, C] = angles
    const angleSum = A + B + C
    // Sanity check: refuse to render obviously-broken input (won't
    // close a triangle). Show caption-only fallback instead of a
    // wrong figure.
    if (Math.abs(angleSum - 180) > 1 || A <= 0 || B <= 0 || C <= 0) {
      return graphic.caption ? (
        <figure className="my-3 flex flex-col items-center">
          <figcaption className="text-[11px] text-gray-500 text-center italic">{graphic.caption}</figcaption>
        </figure>
      ) : null
    }
    const DRAW_R = 72
    const cx = 100, cy = 100
    const toRad = (deg: number) => (deg - 90) * Math.PI / 180
    // Rotate so the triangle sits with vertex A near the top. Start
    // vertex A at position that puts the triangle centroid roughly
    // at the visual centre — angle -90° would put A at the top.
    const thA = -90 - C  // shift so triangle looks balanced
    const thB = thA + 2 * C
    const thC = thB + 2 * A
    const positions = [thA, thB, thC]
    const pts = positions.map(a => [cx + DRAW_R * Math.cos(toRad(a)), cy + DRAW_R * Math.sin(toRad(a))] as [number, number])
    const path = `M ${pts[0][0]},${pts[0][1]} L ${pts[1][0]},${pts[1][1]} L ${pts[2][0]},${pts[2][1]} Z`
    const vL = labels.vertices ?? ['A', 'B', 'C']
    const sL = labels.sides ?? []
    return (
      <figure className="my-3 flex flex-col items-center">
        <div className="max-w-md w-full bg-white rounded-lg ring-1 ring-gray-200 p-4">
          <svg viewBox="0 0 200 200" className="w-full h-auto max-h-[300px] overflow-visible">
            <circle cx={cx} cy={cy} r={DRAW_R} stroke="black" strokeWidth={1.5} fill="none" />
            <path d={path} stroke="black" strokeWidth={1.5} fill="none" />
            {pts.map((p, i) => {
              const dx = p[0] - cx, dy = p[1] - cy
              const len = Math.hypot(dx, dy) || 1
              const lx = p[0] + (dx / len) * 14
              const ly = p[1] + (dy / len) * 14
              return vL[i] ? (
                <text key={i} x={lx} y={ly} fontSize={13} fontWeight={600} fill="black" textAnchor="middle" dominantBaseline="middle">{vL[i]}</text>
              ) : null
            })}
            {[0, 1, 2].map(i => {
              if (!sL[i]) return null
              const a = pts[i], b = pts[(i + 1) % 3]
              const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2
              // Side labels: push toward center (inward) so they sit
              // clearly inside the triangle rather than overlapping
              // the circle stroke outside.
              const dx = cx - mx, dy = cy - my
              const len = Math.hypot(dx, dy) || 1
              const lx = mx + (dx / len) * 10
              const ly = my + (dy / len) * 10
              return <text key={`s${i}`} x={lx} y={ly} fontSize={12} fill="black" textAnchor="middle" dominantBaseline="middle">{sL[i]}</text>
            })}
          </svg>
        </div>
        {graphic.caption && <figcaption className="text-[11px] text-black text-center italic mt-2">{graphic.caption}</figcaption>}
      </figure>
    )
  }

  // ─ Inscribed triangle by SIDE LENGTHS ────────────────────────────
  // Model provides three side lengths (a, b, c opposite vertices A,
  // B, C); renderer applies the law of cosines to derive interior
  // angles, then uses the inscribed-angle theorem for placement.
  // Same guarantee as inscribedTriangleByAngles: the figure is
  // derived from the numerical claims in the prompt, so it cannot
  // disagree with them.
  //
  // Model emits {type:"inscribedTriangleBySides",
  //   spec:{ sides:[a,b,c] },
  //   labels?:{ vertices?:["A","B","C"], sides?:["a","b","c"] } }
  if (t === 'inscribedtrianglebysides' || (graphic.shape ?? '').toLowerCase() === 'inscribedtrianglebysides') {
    const spec = (graphic.spec ?? {}) as { sides?: [number, number, number] }
    const labels = (graphic.labels ?? {}) as { vertices?: string[]; sides?: string[] }
    const sides = spec.sides ?? [5, 5, 5]
    const [a, b, c] = sides
    // Triangle-inequality sanity — refuse impossible side triples.
    if (a + b <= c || b + c <= a || a + c <= b || a <= 0 || b <= 0 || c <= 0) {
      return graphic.caption ? (
        <figure className="my-3 flex flex-col items-center">
          <figcaption className="text-[11px] text-gray-500 text-center italic">{graphic.caption}</figcaption>
        </figure>
      ) : null
    }
    // Law of cosines → interior angles (degrees).
    const A = Math.acos((b * b + c * c - a * a) / (2 * b * c)) * 180 / Math.PI
    const B = Math.acos((a * a + c * c - b * b) / (2 * a * c)) * 180 / Math.PI
    const C = 180 - A - B
    const DRAW_R = 72
    const cx = 100, cy = 100
    const toRad = (deg: number) => (deg - 90) * Math.PI / 180
    const thA = -90 - C
    const thB = thA + 2 * C
    const thC = thB + 2 * A
    const pts = [thA, thB, thC].map(t => [cx + DRAW_R * Math.cos(toRad(t)), cy + DRAW_R * Math.sin(toRad(t))] as [number, number])
    const path = `M ${pts[0][0]},${pts[0][1]} L ${pts[1][0]},${pts[1][1]} L ${pts[2][0]},${pts[2][1]} Z`
    const vL = labels.vertices ?? ['A', 'B', 'C']
    const sL = labels.sides ?? [String(a), String(b), String(c)]
    return (
      <figure className="my-3 flex flex-col items-center">
        <div className="max-w-md w-full bg-white rounded-lg ring-1 ring-gray-200 p-4">
          <svg viewBox="0 0 200 200" className="w-full h-auto max-h-[300px] overflow-visible">
            <circle cx={cx} cy={cy} r={DRAW_R} stroke="black" strokeWidth={1.5} fill="none" />
            <path d={path} stroke="black" strokeWidth={1.5} fill="none" />
            {pts.map((p, i) => {
              const dx = p[0] - cx, dy = p[1] - cy
              const len = Math.hypot(dx, dy) || 1
              const lx = p[0] + (dx / len) * 14
              const ly = p[1] + (dy / len) * 14
              return vL[i] ? (
                <text key={i} x={lx} y={ly} fontSize={13} fontWeight={600} fill="black" textAnchor="middle" dominantBaseline="middle">{vL[i]}</text>
              ) : null
            })}
            {[0, 1, 2].map(i => {
              // Side i sits opposite vertex i (SAT convention: side a
              // opposite vertex A). The side runs between vertices
              // (i+1)%3 and (i+2)%3.
              if (!sL[i]) return null
              const p1 = pts[(i + 1) % 3], p2 = pts[(i + 2) % 3]
              const mx = (p1[0] + p2[0]) / 2, my = (p1[1] + p2[1]) / 2
              const dx = cx - mx, dy = cy - my
              const len = Math.hypot(dx, dy) || 1
              const lx = mx + (dx / len) * 10
              const ly = my + (dy / len) * 10
              return <text key={`s${i}`} x={lx} y={ly} fontSize={12} fill="black" textAnchor="middle" dominantBaseline="middle">{sL[i]}</text>
            })}
          </svg>
        </div>
        {graphic.caption && <figcaption className="text-[11px] text-black text-center italic mt-2">{graphic.caption}</figcaption>}
      </figure>
    )
  }

  // ─ Chord at perpendicular distance from center ─────────────────
  // Model emits {type:"chordAtDistance",
  //   spec:{ distanceFromCenter:d }, // r fixed by renderer; d ≤ r
  //   labels?:{ chord?:string, center?:string, endpoints?:["A","B"] } }
  //
  // Renderer places a horizontal chord d units below the center. If
  // d ≥ DRAW_R the spec is impossible; fall back to caption-only.
  if (t === 'chordatdistance' || (graphic.shape ?? '').toLowerCase() === 'chordatdistance') {
    const spec = (graphic.spec ?? {}) as { r?: number; distanceFromCenter?: number }
    const labels = (graphic.labels ?? {}) as { chord?: string; center?: string; endpoints?: string[] }
    const DRAW_R = 72
    // Interpret d as a fraction of the math radius if the model
    // provided one — otherwise assume d/r ratio matches the drawing.
    const mathR = spec.r ?? 1
    const mathD = spec.distanceFromCenter ?? 0
    if (mathD < 0 || mathD >= mathR || mathR <= 0) {
      return graphic.caption ? (
        <figure className="my-3 flex flex-col items-center">
          <figcaption className="text-[11px] text-gray-500 text-center italic">{graphic.caption}</figcaption>
        </figure>
      ) : null
    }
    const cx = 100, cy = 100
    const d = (mathD / mathR) * DRAW_R
    // Chord horizontal, offset d below the center. Half-length by
    // Pythagoras: sqrt(R² - d²) in drawing units.
    const half = Math.sqrt(DRAW_R * DRAW_R - d * d)
    const chordY = cy + d
    const x1 = cx - half, x2 = cx + half
    const [labA, labB] = labels.endpoints ?? ['A', 'B']
    return (
      <figure className="my-3 flex flex-col items-center">
        <div className="max-w-md w-full bg-white rounded-lg ring-1 ring-gray-200 p-4">
          <svg viewBox="0 0 200 200" className="w-full h-auto max-h-[300px] overflow-visible">
            <circle cx={cx} cy={cy} r={DRAW_R} stroke="black" strokeWidth={1.5} fill="none" />
            <line x1={x1} y1={chordY} x2={x2} y2={chordY} stroke="black" strokeWidth={1.5} />
            {/* Perpendicular from center to chord midpoint */}
            <line x1={cx} y1={cy} x2={cx} y2={chordY} stroke="black" strokeWidth={1} strokeDasharray="3,3" />
            {/* Center dot */}
            <circle cx={cx} cy={cy} r={2.5} fill="black" />
            {labels.center && <text x={cx + 6} y={cy - 4} fontSize={12} fill="black">{labels.center}</text>}
            {/* Endpoint dots + labels */}
            <circle cx={x1} cy={chordY} r={2.5} fill="black" />
            <circle cx={x2} cy={chordY} r={2.5} fill="black" />
            {labA && <text x={x1 - 10} y={chordY + 4} fontSize={13} fontWeight={600} fill="black" textAnchor="end">{labA}</text>}
            {labB && <text x={x2 + 10} y={chordY + 4} fontSize={13} fontWeight={600} fill="black" textAnchor="start">{labB}</text>}
            {labels.chord && <text x={cx} y={chordY + 14} fontSize={12} fill="black" textAnchor="middle">{labels.chord}</text>}
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
    // Same fix as inscribedTriangle: spec.r is the MATH radius, not
    // the drawing size. Draw at a fixed comfortable pixel radius so
    // the figure is legible regardless of the problem's stated
    // radius value.
    const DRAW_R = 72
    const cx = 100, cy = 100
    const toRad = (deg: number) => (deg - 90) * Math.PI / 180
    const pt = (deg: number) => [cx + DRAW_R * Math.cos(toRad(deg)), cy + DRAW_R * Math.sin(toRad(deg))] as [number, number]
    const chords = spec.chords ?? []
    // Two model-misuse patterns to sanitize (both seen in prod):
    //   - a circumference point labeled "Center"/"O" (the center is
    //     drawn separately via showCenter — a rim point with that
    //     label is contradictory), and
    //   - a point label duplicating a chord label ("Tangent" on both
    //     → the doubled "Tangent Tangent" render).
    const chordLabels = new Set(chords.map(c => (c.label ?? '').trim().toLowerCase()).filter(Boolean))
    const points = (spec.points ?? []).filter(p => {
      const l = (p.label ?? '').trim().toLowerCase()
      if (l === 'center' || l === '중심') return false
      return true
    }).map(p => chordLabels.has((p.label ?? '').trim().toLowerCase()) ? { ...p, label: undefined } : p)
    return (
      <figure className="my-3 flex flex-col items-center">
        <div className="max-w-md w-full bg-white rounded-lg ring-1 ring-gray-200 p-4">
          <svg viewBox="0 0 200 200" className="w-full h-auto max-h-[300px] overflow-visible">
            <circle cx={cx} cy={cy} r={DRAW_R} stroke="black" strokeWidth={1.5} fill="none" />
            {spec.showCenter && <circle cx={cx} cy={cy} r={2.5} fill="black" />}
            {chords.map((ch, i) => {
              const p1 = pt(ch.angle1), p2 = pt(ch.angle2)
              return (
                <g key={i}>
                  <line x1={p1[0]} y1={p1[1]} x2={p2[0]} y2={p2[1]} stroke="black" strokeWidth={1.5} />
                  {ch.label && (
                    <text x={(p1[0] + p2[0]) / 2 + 6} y={(p1[1] + p2[1]) / 2 - 6} fontSize={12} fill="black">{ch.label}</text>
                  )}
                </g>
              )
            })}
            {points.map((p, i) => {
              const [x, y] = pt(p.angle)
              const dx = x - cx, dy = y - cy
              const len = Math.hypot(dx, dy) || 1
              // Push point labels 14px outward (matches inscribedTriangle)
              const lx = x + (dx / len) * 14
              const ly = y + (dy / len) * 14
              return (
                <g key={i}>
                  <circle cx={x} cy={y} r={2.5} fill="black" />
                  {p.label && <text x={lx} y={ly} fontSize={13} fontWeight={600} fill="black" textAnchor="middle" dominantBaseline="middle">{p.label}</text>}
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

function VoiceRecorderButton({ sessionId, language, ko, disabled, onTranscript, autoStartToken, maxDurationSec, onRecordingChange, hideManualButton, onDone }: {
  sessionId: string
  language: 'en' | 'ko'
  ko: boolean
  disabled?: boolean
  onTranscript: (text: string, signals?: SpeechSignals) => void
  /** When this token value CHANGES (increment / new key), the recorder
   *  is triggered imperatively. Used by TOEFL Speaking to auto-start
   *  recording the moment the prep timer expires or the audio ends —
   *  no manual tap required. Pass undefined for manual-only use. */
  autoStartToken?: number | string
  /** Auto-stop the recording after this many seconds. Trims the final
   *  blob so the Whisper upload only includes audio inside the window. */
  maxDurationSec?: number
  /** Fires whenever `recording` state flips, so a parent can gate
   *  navigation (e.g., lock prev/next while recording). */
  onRecordingChange?: (recording: boolean) => void
  /** When true, the manual "Answer with your voice" button is hidden —
   *  only the live recording indicator is shown. Used by TOEFL Speaking
   *  where the entire flow is hands-off (autoplay → prep → auto-record
   *  → auto-advance) and a mic button would be confusing. */
  hideManualButton?: boolean
  /** Fires ONCE after the audio has finished uploading + Whisper has
   *  returned a transcript. Used by TOEFL Speaking to auto-advance to
   *  the next question without a manual "Next" tap. */
  onDone?: () => void
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
      // Prefer the mic stream primed earlier by the audio player's
      // autoplay effect — that request happened during the still-
      // valid user-activation window from the Start Test click, so we
      // dodge browser policy that would reject a fresh getUserMedia
      // call from this deferred timer callback. Falls back to a live
      // request only if priming didn't happen (e.g., Speaking item was
      // reached without ever playing an autoplay audio, unlikely).
      let stream = PRIMED_MIC_STREAM
      if (stream && stream.getTracks().some(t => t.readyState === 'ended')) {
        // Cached stream went stale — release and re-request.
        stream.getTracks().forEach(t => t.stop())
        PRIMED_MIC_STREAM = null
        stream = null
      }
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      }
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
          // Fire onDone regardless of transcription success so the
          // parent's auto-advance flow doesn't get stuck if Whisper
          // errors out. Empty answer beats stuck screen.
          onDone?.()
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
      hapticImpact('medium')
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
    // Only stop the tracks if this is NOT the shared primed stream —
    // otherwise the next Speaking question's recording can't reuse it.
    if (streamRef.current && streamRef.current !== PRIMED_MIC_STREAM) {
      streamRef.current.getTracks().forEach(t => t.stop())
    }
    setRecording(false)
    if (tickRef.current) { window.clearInterval(tickRef.current); tickRef.current = null }
    hapticImpact('medium')
  }
  useEffect(() => () => {
    // Discard any in-flight recording on unmount: detach onstop FIRST
    // so the stop doesn't trigger an upload — the component instance
    // is per-question (keyed), so a late transcript would otherwise
    // land in the NEXT question's answer via a stale closure.
    const rec = recRef.current
    if (rec && rec.state !== 'inactive') {
      rec.onstop = null
      rec.ondataavailable = null
      try { rec.stop() } catch { /* already stopping */ }
    }
    // Same guard as stopRec — don't kill the shared primed stream
    // when the current speaking item unmounts.
    if (streamRef.current && streamRef.current !== PRIMED_MIC_STREAM) {
      streamRef.current.getTracks().forEach(t => t.stop())
    }
    if (tickRef.current) window.clearInterval(tickRef.current)
  }, [])

  // Auto-start on token change — used by Speaking Interview to fire
  // the mic the moment the prep countdown hits zero. Guarded against
  // firing on initial mount when token is undefined; only reacts to
  // token TRANSITIONS.
  const lastTokenRef = useRef<number | string | undefined>(autoStartToken)
  useEffect(() => {
    if (autoStartToken === undefined) return
    if (lastTokenRef.current === autoStartToken) return
    lastTokenRef.current = autoStartToken
    void startRec()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStartToken])

  // Auto-stop at maxDurationSec — used by Speaking Interview (45s cap).
  useEffect(() => {
    if (!recording || !maxDurationSec) return
    if (elapsedSec >= maxDurationSec) stopRec()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedSec, recording, maxDurationSec])

  // Bubble recording state up so parent can lock navigation.
  const lastRecRef = useRef<boolean>(false)
  useEffect(() => {
    if (lastRecRef.current !== recording) {
      lastRecRef.current = recording
      onRecordingChange?.(recording)
    }
  }, [recording, onRecordingChange])

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

  // Speaking test "hands-off" mode — hide the manual mic button and
  // show only the recording indicator. The recorder is started by
  // `autoStartToken` (from the prep-timer expire) and stopped
  // automatically at `maxDurationSec`.
  if (hideManualButton) {
    return (
      <div className="w-full">
        {transcribing && (
          <div className="rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 text-[12px] text-primary flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="font-semibold">
              {ko ? '답변 처리 중…' : 'Processing your answer…'}
            </span>
          </div>
        )}
        {errorText && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-800">
            {errorText}
          </div>
        )}
      </div>
    )
  }

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
function SpeakingTimer({ active, paused, prepSec, responseSec, onPhaseChange, onExpire, ko, t }: {
  active: boolean
  paused?: boolean
  prepSec: number
  responseSec: number
  onPhaseChange?: (phase: 'prep' | 'response' | 'expired') => void
  onExpire: () => void
  ko: boolean
  t: (key: string, params?: Record<string, string>) => string | React.ReactNode
}) {
  const [phase, setPhase] = useState<'idle' | 'prep' | 'response' | 'expired'>('idle')
  const [remaining, setRemaining] = useState(0)
  // Latest-callback refs — the parent recreates onPhaseChange/onExpire
  // inline on EVERY render (and the test clock re-renders it every
  // second), so putting them in effect deps used to tear down and
  // recreate the countdown interval ~every second, racing its own
  // 1-second tick. That was the "prep timer is buggy" bug: the
  // countdown stuttered or froze because the interval rarely survived
  // long enough to fire. Refs keep the interval stable while still
  // calling the freshest callbacks.
  const onPhaseChangeRef = useRef(onPhaseChange)
  const onExpireRef = useRef(onExpire)
  useEffect(() => { onPhaseChangeRef.current = onPhaseChange }, [onPhaseChange])
  useEffect(() => { onExpireRef.current = onExpire }, [onExpire])

  useEffect(() => {
    if (!active || phase !== 'idle') return
    if (prepSec > 0) {
      setPhase('prep'); setRemaining(prepSec); onPhaseChangeRef.current?.('prep')
    } else {
      setPhase('response'); setRemaining(responseSec); onPhaseChangeRef.current?.('response')
    }
  }, [active, phase, prepSec, responseSec])

  // Stable 1-second countdown — deps are ONLY [phase], so the
  // interval survives parent re-renders. Pure decrement; phase
  // transitions happen in the boundary effect below (never inside
  // the setState updater, which StrictMode double-invokes).
  useEffect(() => {
    if (phase === 'idle' || phase === 'expired' || paused) return
    const id = window.setInterval(() => {
      setRemaining(r => Math.max(0, r - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [phase, paused])

  // Phase-boundary transitions when the countdown hits zero.
  useEffect(() => {
    if (remaining > 0) return
    if (phase === 'prep') {
      setPhase('response')
      setRemaining(responseSec)
      onPhaseChangeRef.current?.('response')
    } else if (phase === 'response') {
      setPhase('expired')
      onPhaseChangeRef.current?.('expired')
      onExpireRef.current()
    }
  }, [remaining, phase, responseSec])

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

/** TOEFL Complete-the-Words letter grid — renders one small input per
 *  missing letter (OTP-style) so students can't type more than the
 *  expected count. Auto-advances focus on entry and backs up on
 *  Backspace. The parent stores the concatenated string as the blank's
 *  answer; this component just presents it as N single-char cells. */
function BlankLetterInput({ id, expectedLen, value, onChange, isFilled, ko }: {
  id: number
  expectedLen: number
  value: string
  onChange: (val: string) => void
  isFilled: boolean
  ko: boolean
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([])
  const chars: string[] = Array.from({ length: expectedLen }, (_, i) => value[i] ?? '')

  const setCharAt = (i: number, ch: string) => {
    const next = chars.slice()
    next[i] = ch
    // Trim trailing empties for a clean stored value ("do", not "do  ").
    let end = next.length
    while (end > 0 && next[end - 1] === '') end--
    onChange(next.slice(0, end).join(''))
  }

  const focusAt = (i: number) => {
    const el = refs.current[i]
    if (el) { el.focus(); el.select() }
  }

  return (
    <span
      className="relative inline-flex items-end gap-[3px] align-baseline mx-1"
      style={{ paddingTop: 16 }}
      role="group"
      aria-label={ko ? `${id}번 빈칸 (${expectedLen}글자)` : `Blank ${id} (${expectedLen} letters)`}
    >
      {/* Blank-number badge above the row */}
      <span
        aria-hidden
        className={`absolute -top-0 left-1/2 -translate-x-1/2 inline-flex items-center justify-center text-[9.5px] font-bold h-3.5 min-w-3.5 px-1 rounded-full tabular-nums leading-none ${
          isFilled ? 'bg-emerald-500 text-white' : 'bg-primary text-white'
        }`}
      >
        {id}
      </span>
      {chars.map((ch, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el }}
          type="text"
          inputMode="text"
          value={ch}
          onChange={(e) => {
            const raw = e.target.value
            // Handle paste: user might paste "hello" into cell 0.
            if (raw.length > 1) {
              const chunk = raw.slice(0, expectedLen - i)
              const next = chars.slice()
              for (let k = 0; k < chunk.length; k++) next[i + k] = chunk[k]!
              let end = next.length
              while (end > 0 && next[end - 1] === '') end--
              onChange(next.slice(0, end).join(''))
              const target = Math.min(i + chunk.length, expectedLen - 1)
              setTimeout(() => focusAt(target), 0)
              return
            }
            const last = raw.slice(-1)
            setCharAt(i, last)
            if (last && i < expectedLen - 1) setTimeout(() => focusAt(i + 1), 0)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace') {
              if (!chars[i] && i > 0) {
                e.preventDefault()
                setCharAt(i - 1, '')
                setTimeout(() => focusAt(i - 1), 0)
              }
            } else if (e.key === 'ArrowLeft' && i > 0) {
              e.preventDefault()
              focusAt(i - 1)
            } else if (e.key === 'ArrowRight' && i < expectedLen - 1) {
              e.preventDefault()
              focusAt(i + 1)
            }
          }}
          onFocus={(e) => e.currentTarget.select()}
          maxLength={1}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className={`w-[22px] h-[26px] text-center text-[15px] font-semibold rounded-md border-b-2 bg-white focus:outline-none tabular-nums ${
            ch
              ? 'border-emerald-500 text-emerald-700'
              : 'border-primary/40 text-primary focus:border-primary'
          }`}
          aria-label={ko ? `${id}번 빈칸 ${i + 1}번째 글자` : `Blank ${id} letter ${i + 1}`}
        />
      ))}
    </span>
  )
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

// Global mic stream cache — Speaking auto-record works around browser
// "must be a user gesture" policy by requesting getUserMedia the FIRST
// time an autoplay-enabled audio player mounts. That mount happens
// during the propagated user-activation window from the "Start Test"
// tap, so permission grants without an extra prompt on the second and
// later Speaking items. Once granted, the stream is held open here
// and reused by every VoiceRecorderButton on the page.
let PRIMED_MIC_STREAM: MediaStream | null = null
let PRIMED_MIC_ATTEMPTED = false
async function primeMicStream(opts?: { force?: boolean }): Promise<MediaStream | null> {
  if (PRIMED_MIC_STREAM) return PRIMED_MIC_STREAM
  // `force` (a fresh user gesture, e.g. the Start Speaking gate tap)
  // retries even after an earlier silent denial — some browsers only
  // show the permission prompt inside a gesture.
  if (PRIMED_MIC_ATTEMPTED && !opts?.force) return null
  PRIMED_MIC_ATTEMPTED = true
  if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) return null
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    PRIMED_MIC_STREAM = stream
    return stream
  } catch (err) {
    console.warn('[primeMicStream] denied or unavailable', err)
    return null
  }
}
// Stop the cached mic tracks (the browser's red recording indicator
// stays lit while the stream is open) and reset the attempt flag so a
// later test on the same page load can re-prompt.
function releaseMicStream() {
  if (PRIMED_MIC_STREAM) {
    for (const track of PRIMED_MIC_STREAM.getTracks()) track.stop()
    PRIMED_MIC_STREAM = null
  }
  PRIMED_MIC_ATTEMPTED = false
}

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
 *  exists in storage; otherwise generates + uploads a new MP3. Retries
 *  transient failures (network error, 429, 5xx) once before giving up
 *  — OpenAI TTS occasionally returns 502 on heavy load and Supabase
 *  Storage sometimes 5xx on upload; a single retry catches most of
 *  these without perceptibly delaying the student. */
async function fetchAudioUrl(text: string, voice: OpenAiVoice): Promise<string | null> {
  const cacheKey = `${voice}\n${text}`
  if (AUDIO_URL_CACHE[cacheKey]) return AUDIO_URL_CACHE[cacheKey]
  const headers = { 'Content-Type': 'application/json', ...(await authHeaders()) }
  const body = JSON.stringify({ text, voice, model: 'tts-1' })
  const attempt = async (): Promise<{ ok: boolean; url?: string; status?: number; err?: string }> => {
    try {
      const res = await fetch('/api/study/listening/tts', { method: 'POST', headers, body })
      if (!res.ok) {
        // Read the body so we can log WHY the server failed. Fall back
        // gracefully if the body isn't JSON.
        const errBody = await res.text().catch(() => '')
        return { ok: false, status: res.status, err: errBody.slice(0, 200) }
      }
      const { url } = await res.json() as { url: string }
      return { ok: true, url }
    } catch (e) {
      return { ok: false, err: e instanceof Error ? e.message : String(e) }
    }
  }
  let result = await attempt()
  // Retry once on transient failures. 4xx other than 429 = don't retry
  // (bad request / auth won't fix itself). 429 + 5xx + network = retry.
  const shouldRetry = !result.ok
    && (result.status == null || result.status === 429 || result.status >= 500)
  if (shouldRetry) {
    await new Promise(r => setTimeout(r, 600))
    result = await attempt()
  }
  if (!result.ok) {
    console.warn('[fetchAudioUrl] TTS failed', {
      voice,
      textPreview: text.slice(0, 60),
      status: result.status,
      err: result.err,
    })
    return null
  }
  AUDIO_URL_CACHE[cacheKey] = result.url!
  return result.url!
}

function ListeningAudioPlayer({ groupKey, transcript, language, onSpeakingChange, allowTranscriptReveal = false, maxPlays = 2, onFirstPlayEnd, autoPlay = false }: {
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
  /** Auto-play as soon as the URLs are ready. Used by TOEFL Speaking
   *  where the student lands on the question and audio must start
   *  immediately — no tap. Waits for the prefetch effect to resolve
   *  URLs before firing so we don't try to play() with an empty src. */
  autoPlay?: boolean
}) {
  const { t } = useTranslation()
  const [state, setState] = useState<'idle' | 'loading' | 'playing' | 'error'>('idle')
  const [playCount, setPlayCount] = useState(() => LISTENING_PLAY_COUNTS[groupKey] ?? 0)
  const [showTranscript, setShowTranscript] = useState(false)
  const [progress, setProgress] = useState<{ current: number; total: number; charsDone: number; charsTotal: number }>({ current: 0, total: 0, charsDone: 0, charsTotal: 0 })
  const speakingRef = useRef(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const cancelledRef = useRef(false)
  // Set when autoplay could not start (blocked by browser policy or
  // TTS prefetch failure). Re-enables the manual Play button so the
  // student can start/retry with a real tap instead of being stuck
  // on "Getting audio ready…" forever.
  const [autoPlayStalled, setAutoPlayStalled] = useState(false)
  // True once playback has EVER started for this player. The 4s
  // autoplay stall check tests this instead of speakingRef — a short
  // clip that starts and FINISHES within 4s would otherwise read as
  // "not speaking" and wrongly resurface the manual Play button.
  const hasStartedRef = useRef(false)

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
    if (v) hasStartedRef.current = true
    speakingRef.current = v
    setState(prev => v ? 'playing' : (prev === 'error' ? 'error' : 'idle'))
    onSpeakingChange?.(v)
  }, [onSpeakingChange])

  // Prefetched URLs (and warmed MP3 bytes) live here so `play()` can
  // reuse them instead of round-tripping the API again. Keyed by
  // segment index. Populated by the prefetch effect below.
  const prefetchedUrlsRef = useRef<Array<string | null>>([])

  // Prefetch on mount: kick off /api/study/listening/tts for every
  // segment as soon as the player mounts. This overlaps the ~1-3 s
  // per-segment TTS generation with the student reading the prompt,
  // so hitting Play is instant on warm cache and much faster on cold.
  //
  // We also warm the browser cache by firing a HEAD to each MP3 URL
  // once it resolves — this makes `<audio>.src = url` inside playNext
  // near-instantaneous instead of waiting on a fresh first-byte round
  // trip. Guarded so the second play (which reuses the same URLs)
  // doesn't re-warm.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const urls = await Promise.all(
        segments.map((s, i) =>
          prefetchedUrlsRef.current[i] ?? fetchAudioUrl(s.text, s.voice),
        ),
      )
      if (cancelled) return
      prefetchedUrlsRef.current = urls
      // Warm the CDN edge for the first segment so the audio element
      // can start playing without waiting on first-byte. Fire-and-
      // forget; ignore errors.
      const firstUrl = urls.find(u => !!u)
      if (firstUrl) {
        void fetch(firstUrl, { method: 'GET', cache: 'force-cache' }).catch(() => {})
      }
      // TOEFL Speaking auto-play — kick off playback as soon as the
      // URLs resolve and the browser cache is warm. If any URL failed
      // to prefetch, or the browser blocks programmatic play(), we DO
      // NOT silently skip the audio — instead we flip autoPlayStalled,
      // which re-enables the Play button so the student can start
      // playback with a real tap (a user gesture the browser always
      // honours). The audio is part of the task; skipping it would
      // leave the student answering a question they never heard.
      if (autoPlay && playCount === 0) {
        if (urls.every(u => !!u)) {
          void primeMicStream()
          void play()
          // 4s stall check: if playback has never STARTED by then,
          // surface the manual Play button instead of skipping. Uses
          // hasStartedRef, not speakingRef — a short clip can start
          // AND finish inside 4s and must not count as stalled.
          window.setTimeout(() => {
            if (!cancelled && !hasStartedRef.current) {
              console.warn('[ListeningAudioPlayer] autoplay stalled — enabling manual Play as fallback')
              setAutoPlayStalled(true)
            }
          }, 4000)
        } else {
          console.warn('[ListeningAudioPlayer] prefetch incomplete — enabling manual Play (tap retries TTS)')
          setAutoPlayStalled(true)
          setState('error')
        }
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments, autoPlay])

  const play = async () => {
    if (state === 'playing' || state === 'loading' || playCount >= maxPlays) return
    const nextCount = playCount + 1
    setPlayCount(nextCount)
    LISTENING_PLAY_COUNTS[groupKey] = nextCount
    cancelledRef.current = false
    setState('loading')

    // Fetch all segment URLs up front. Cached hits are instant; misses
    // trigger OpenAI TTS on the server (~1-3 s per segment). Fetching
    // in parallel minimises perceived latency for dialogues. If the
    // prefetch effect already resolved the URLs, we skip the network
    // hop entirely.
    const urls = prefetchedUrlsRef.current.length === segments.length
      && prefetchedUrlsRef.current.every(u => u != null)
      ? prefetchedUrlsRef.current
      : await Promise.all(segments.map((s, i) =>
          prefetchedUrlsRef.current[i] ?? fetchAudioUrl(s.text, s.voice),
        ))
    prefetchedUrlsRef.current = urls
    if (cancelledRef.current) { setSpeaking(false); return }
    if (urls.some(u => !u)) {
      console.error('[ListeningAudioPlayer] one or more TTS fetches failed')
      setState('error')
      // Refund the play — the student didn't actually hear anything.
      setPlayCount(nextCount - 1)
      LISTENING_PLAY_COUNTS[groupKey] = nextCount - 1
      // Surface the manual Play button (error state enables it) so
      // the student can retry — a tap re-runs this function and the
      // per-URL fetch retries the failed segments. Do NOT fire
      // onFirstPlayEnd here: skipping the audio would let the flow
      // continue on a question the student never heard, and a later
      // successful retry would then double-fire the flow.
      setAutoPlayStalled(true)
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
          // When autoPlay is on and healthy, the button is a status
          // indicator — disabled. But if autoplay STALLS (browser
          // blocked play(), or TTS prefetch failed), we re-enable it
          // so the student can start/retry playback with a real tap.
          // A permanently-dead button was the "stuck at Getting audio
          // ready" bug.
          disabled={
            state === 'playing' || state === 'loading' || playCount >= maxPlays
            || (autoPlay && !autoPlayStalled && state !== 'error')
          }
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
                  : autoPlay
                    // Speaking auto-flow labels. When stalled, tell
                    // the student to tap Play (the button is enabled
                    // in that state); otherwise show pure status.
                    ? (playCount === 0
                        ? (autoPlayStalled
                            ? String(t('study.test.audioPlayCta'))
                            : (language === 'ko' ? '오디오 준비 중…' : 'Getting audio ready…'))
                        : (language === 'ko' ? '재생 완료' : 'Playback complete'))
                    : playCount === 0
                      ? t('study.test.audioPlayCta')
                      : t('study.test.audioReplayCta')}
          </div>
          <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
            {!autoPlay && (
              <span>
                {t(replaysLeft === 1 ? 'study.test.audioPlaysLeft' : 'study.test.audioPlaysLeftPlural', { count: String(replaysLeft) })}
              </span>
            )}
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

/** TOEFL Writing scenario renderer — makes Email + Academic Discussion
 *  passages easier to scan than a wall of prose. Email: bold the
 *  From: / To: / Subject: headers, underline the numbered bullets in
 *  the "Write a reply that:" block. Discussion: split into per-speaker
 *  cards so the professor's prompt and each student's opinion are
 *  visually distinct instead of running together as one paragraph. */
function WritingScenario({ text, kind }: { text: string; kind: 'email' | 'discussion' }) {
  // UI-language for the section labels (the scenario TEXT stays in the
  // test's own language; only our chrome should follow the app locale).
  const { language: uiLanguage } = useTranslation()
  const koUi = uiLanguage === 'korean'
  const normalized = normalizeDisplayText(text)

  if (kind === 'discussion') {
    return <DiscussionScenario normalized={normalized} />
  }

  // ETS Jan-2026 Email format: SITUATION PARAGRAPH + "In your email
  // to X, be sure to:" intro + 3 bullets. NO From:/To:/Subject:
  // headers. We do our best to split the passage into
  //   [situation, intro, bullet1, bullet2, bullet3]
  // even when the model doesn't use `•` markers, doesn't put the
  // intro on its own line, or emits the whole thing as one paragraph.
  //
  // Legacy From:/To:/Subject: format (pre-format-fix cached tests)
  // gets its own fallback further down so in-flight sessions still
  // render.
  const legacyHeader = /^\s*(From|To|Subject|CC|BCC|Date)\s*:\s*/i
  const bulletLead = /^\s*(?:[•●◦▪□■\-*·]|\(?\d+\)|\d+\.)\s+/
  // Broad intro detector — any line signalling "here comes the task
  // list". Matches "In your email …:", "In your response …:", "Your
  // email should …:", "Include the following …:", "Be sure to …:",
  // "Address the following:", etc.
  const introBroad = /(?:^|\n)\s*((?:in\s+your\s+(?:email|reply|response|message)|your\s+email\s+should|be\s+sure\s+to|include\s+the\s+following|address\s+the\s+following|make\s+sure\s+to|remember\s+to|the\s+email\s+should|write\s+(?:an?\s+email|a\s+reply|your\s+email)|please\s+(?:include|address)|your\s+email\s+must)\b[^\n:]{0,120}?:)\s*(?:\n|$)/i

  const introMatch = normalized.match(introBroad)
  let situationText = ''
  let introLine: string | null = null
  let taskBlock = ''
  if (introMatch && introMatch.index != null) {
    const introStart = introMatch.index + introMatch[0].indexOf(introMatch[1]!)
    const introEnd = introStart + introMatch[1]!.length
    situationText = normalized.slice(0, introStart).trim()
    introLine = introMatch[1]!.trim()
    taskBlock = normalized.slice(introEnd).trim()
  }

  // Extract bullets from taskBlock. Preference order:
  //   1. Lines that start with a bullet marker (•, -, *, 1., (1))
  //   2. Every non-empty line (model forgot bullet markers)
  //   3. Sentence split (model emitted "Do X. Do Y. Do Z." on one line)
  const extractBullets = (block: string): string[] => {
    const lines = block.split(/\n/).map(l => l.trim()).filter(Boolean)
    const markered = lines.filter(l => bulletLead.test(l))
    if (markered.length >= 2) {
      return markered.map(l => l.replace(bulletLead, '').trim())
    }
    if (lines.length >= 2) {
      return lines.map(l => l.replace(bulletLead, '').trim())
    }
    if (lines.length === 1) {
      // Split "Do X. Do Y. Do Z." into three items when each half
      // starts with an imperative-style capital letter.
      const parts = lines[0]!
        .split(/(?<=[.!?])\s+(?=[A-Z])/)
        .map(s => s.trim())
        .filter(Boolean)
      if (parts.length >= 2) return parts
    }
    return []
  }
  const bullets = extractBullets(taskBlock)

  // Modern format detected — render situation card + task list.
  if (introLine && bullets.length >= 2) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg bg-primary/[0.04] border border-primary/15 px-3.5 py-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1.5">
            {koUi ? '상황' : 'Situation'}
          </div>
          <p className="text-[13.5px] text-gray-800 leading-relaxed whitespace-pre-wrap">
            {situationText}
          </p>
        </div>
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3.5 py-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800 mb-2 flex items-center gap-1.5">
            <span>{koUi ? '이메일에 포함할 내용' : 'Include in your email'}</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[9px] font-bold">
              {bullets.length}
            </span>
          </div>
          <ul className="space-y-2">
            {bullets.map((body, i) => (
              <li key={i} className="flex gap-2 text-[13.5px]">
                <span className="flex-shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-[11px] font-bold tabular-nums mt-0.5">
                  {i + 1}
                </span>
                <span className="text-gray-900 leading-relaxed">{body}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    )
  }

  // Legacy fallback — From:/To:/Subject: headers + numbered bullets.
  // Kept for compatibility with tests generated under the prior spec.
  const lines = normalized.split(/\n/)
  return (
    <div className="space-y-2">
      {lines.map((raw, i) => {
        const line = raw
        if (!line.trim()) return <div key={i} className="h-2" aria-hidden />

        const hm = line.match(legacyHeader)
        if (hm) {
          const label = hm[1]
          const rest = line.slice(hm[0].length)
          return (
            <div key={i} className="flex gap-2 text-[13.5px]">
              <span className="font-bold text-gray-900 min-w-[68px]">{label}:</span>
              <span className="text-gray-800">{rest}</span>
            </div>
          )
        }
        if (/^\s*(?:write|please write|reply|in your email|be sure to)\b.*:\s*$/i.test(line)) {
          return (
            <p key={i} className="mt-2 text-[13.5px] font-semibold text-primary underline underline-offset-4">
              {line.trim()}
            </p>
          )
        }
        if (bulletLead.test(line)) {
          const m = line.match(bulletLead)!
          const marker = m[0].trim()
          const body = line.slice(m[0].length)
          return (
            <div key={i} className="flex gap-2 text-[13.5px] pl-1">
              <span className="font-bold text-primary tabular-nums">{marker}</span>
              <span className="text-gray-800">{body}</span>
            </div>
          )
        }

        return (
          <p key={i} className="text-[13.5px] text-gray-800 whitespace-pre-wrap">
            {line}
          </p>
        )
      })}
    </div>
  )
}

/** Splits an Academic Discussion passage into speaker blocks
 *  [Professor's prompt, Student 1, Student 2, …] and renders each as
 *  a distinct card with a role tag + name header so opinions don't
 *  run together as one paragraph.
 *
 *  The parser handles three ways the model formats speakers:
 *    (a) newline-separated:  "Professor Chen:\n<text>\n\nAisha:\n<text>"
 *    (b) inline on the same line:  "Professor Chen: <question> Aisha: <reply>"
 *    (c) mixed (some newlines, some inline).
 *
 *  Speaker detection uses a global regex that matches a Title-Cased
 *  word (optionally prefixed with Professor/Dr/Prof/Student) followed
 *  by "<optional last name>: ". We deliberately require the first
 *  letter to be uppercase so we don't accidentally match "e.g.:" or
 *  "note:" inside prose. */
function DiscussionScenario({ normalized }: { normalized: string }) {
  // Match: optional role prefix + capitalized name (up to two words)
  // + colon. Requires at least 2-char first-word and a space or
  // newline (or start-of-string) beforehand so we don't cut prose in
  // the middle of a sentence like "the goal: X".
  const speakerRegex =
    /(?:^|(?<=[\s\n]))((?:Professor|Prof\.?|Dr\.?|Student|Mr\.?|Ms\.?|Mrs\.?)\s+[A-Z][A-Za-zÀ-ÿ'’.-]{1,30}(?:\s+[A-Z][A-Za-zÀ-ÿ'’.-]{1,30})?|[A-Z][a-zÀ-ÿ'’.-]{1,20}(?:\s+[A-Z][a-zÀ-ÿ'’.-]{1,20})?)\s*:\s*/g

  interface Block { role: 'professor' | 'student'; name: string; body: string }
  interface Match { start: number; end: number; header: string }

  const matches: Match[] = []
  let m: RegExpExecArray | null
  while ((m = speakerRegex.exec(normalized)) != null) {
    matches.push({
      start: m.index + (m[0].length - m[0].trimStart().length),
      end: m.index + m[0].length,
      header: m[1]!.trim(),
    })
  }

  // Drop false positives — a "match" whose body is only a few chars
  // is almost certainly a bad hit (e.g., "Aisha: yes" mid-sentence).
  // We keep it only if the following body is >= 15 chars OR it's the
  // first/last match (they define the structural bounds).
  const trimmed: Match[] = []
  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i]!
    const next = matches[i + 1]
    const bodyLen = (next ? next.start : normalized.length) - cur.end
    if (i === 0 || i === matches.length - 1 || bodyLen >= 15) trimmed.push(cur)
  }

  if (trimmed.length < 2) {
    // Structure not detected — fall back to plain text so the student
    // still sees the passage instead of an empty card.
    return (
      <div className="text-[13.5px] text-gray-800 leading-relaxed whitespace-pre-wrap">
        {normalized}
      </div>
    )
  }

  const blocks: Block[] = []
  for (let i = 0; i < trimmed.length; i++) {
    const h = trimmed[i]!
    const next = trimmed[i + 1]
    const body = normalized
      .slice(h.end, next ? next.start : undefined)
      .replace(/^\s+|\s+$/g, '')
    // First speaker whose header starts with Professor/Prof/Dr is the
    // professor. Any speaker AFTER a professor is a student unless
    // their name is also role-prefixed with Professor/Prof/Dr.
    const isProf =
      /^(Professor|Prof\.?|Dr\.?)\b/i.test(h.header) ||
      (i === 0 && !blocks.some(b => b.role === 'professor') && /\?/.test(body))
    const cleanName = h.header
      .replace(/^(?:Professor|Prof\.?|Dr\.?|Student|Mr\.?|Ms\.?|Mrs\.?)\s+/i, '')
      .trim() || h.header
    blocks.push({ role: isProf ? 'professor' : 'student', name: cleanName, body })
  }

  // Number the students 1, 2, 3… so the "which classmate" reference
  // is unambiguous when the model reuses similar first names.
  let studentIndex = 0
  return (
    <div className="space-y-3">
      {blocks.map((b, i) => {
        const isProf = b.role === 'professor'
        if (!isProf) studentIndex++
        return (
          <div
            key={i}
            className={`rounded-xl px-4 py-3.5 shadow-[0_1px_2px_-1px_rgba(15,23,42,0.06)] ${
              isProf
                ? 'bg-gradient-to-br from-primary/[0.08] to-primary/[0.03] border border-primary/30'
                : 'bg-white border border-emerald-200'
            }`}
          >
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-current/10">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  isProf
                    ? 'bg-primary text-white'
                    : 'bg-emerald-500 text-white'
                }`}
              >
                {isProf ? 'Professor' : `Student ${studentIndex}`}
              </span>
              <span className={`text-[13.5px] font-bold ${isProf ? 'text-primary' : 'text-emerald-800'}`}>
                {b.name}
              </span>
            </div>
            <p className="text-[13.5px] text-gray-800 leading-relaxed whitespace-pre-wrap">
              {b.body}
            </p>
          </div>
        )
      })}
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
          {/* Mascot in loading state — the grab→spin→catch gag runs on
              a 2.7s loop, so the ~90s test-gen wait is the one place it
              has time to land (short waits get "thinking" instead). */}
          <div className="inline-flex items-center justify-center mb-3">
            <PathMascot state="loading" size={72} />
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
