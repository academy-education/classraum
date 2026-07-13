"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Loader2, RefreshCw, ArrowRight, ArrowLeft, Clock, CheckCircle2,
  AlertTriangle, ChevronDown, ChevronUp,
  Mic, MicOff, CreditCard,
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { authHeaders } from '@/lib/auth-headers'
import { supabase } from '@/lib/supabase'
import { PathMascot } from '../../_shared/PathMascot'
import { hapticSelection } from '@/lib/nativeHaptics'
import type { Question, SpeechSignals, SubmitResult, TestPayload } from './test/types'
import { moduleRemainingMs } from '@/lib/study/sat-adaptive'
import {
  normalizeDisplayText, choiceLabel, formatTime, passageGroupInfo, PassageParagraphs,
} from './test/helpers'
import { QuestionGraphicView } from './test/QuestionGraphicView'
import { ListeningAudioPlayer, LISTENING_PLAY_COUNTS } from './test/ListeningAudioPlayer'
import {
  VoiceRecorderButton, SpeakingTimer, primeMicStream, releaseMicStream, getPrimedMicStream,
} from './test/VoiceRecorder'
import { WritingScenario, BlankLetterInput } from './test/WritingPanels'
import { ReviewView } from './test/ReviewView'
import { SubmitConfirmModal, GenerationProgress } from './test/chrome'

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
  const [micPrimed, setMicPrimed] = useState<boolean>(() => getPrimedMicStream() != null)
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
  // Adaptive per-module timing: total-elapsed value at the moment
  // Module 2 began. null while still in Module 1. Persisted so a
  // mid-Module-2 refresh keeps the module clock correct.
  const [module2StartMs, setModule2StartMs] = useState<number | null>(null)
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
      // Restore the Module 2 start marker so a mid-Module-2 refresh keeps
      // its own module clock (not restarted from the whole-test elapsed).
      if (typeof window !== 'undefined') {
        const m2 = localStorage.getItem(`study:test:${sessionId}:m2StartMs`)
        if (m2) setModule2StartMs(parseInt(m2, 10) || null)
      }
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

  // SAT bank two-module adaptive: the test loads with Module 1 only.
  // When the student finishes Module 1 they tap "Continue to Module 2",
  // which grades M1 server-side, draws the routed Module 2 from the
  // bank, and APPENDS it to the in-memory test — a hard gate, unlike
  // TOEFL's fire-and-forget feedback chip.
  const [module2Loading, setModule2Loading] = useState(false)
  const [module2Error, setModule2Error] = useState(false)
  const routeToModule2 = useCallback(async () => {
    if (!test || module2Loading) return
    setModule2Loading(true)
    setModule2Error(false)
    try {
      const breakIdx = test.moduleBreakIdx ?? test.questions.length
      const headers = await authHeaders()
      const res = await fetch('/api/study/test/route', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          sectionName: test.section ?? '',
          answers: answers.slice(0, breakIdx).map((answer, index) => ({ index, answer })),
        }),
      })
      if (!res.ok) throw new Error('route failed')
      const json = await res.json() as {
        route?: 'easy' | 'hard'
        module1Correct?: number | null
        module1Total?: number
        module2Questions?: Question[]
      }
      const m2 = json.module2Questions ?? []
      if (m2.length === 0) throw new Error('empty module 2')
      // Append M2 to the in-memory test; the server already appended it
      // to the cache row /submit grades against.
      setTest(prev => (prev ? { ...prev, questions: [...prev.questions, ...m2] } : prev))
      if (json.route) {
        setModuleRoute({ route: json.route, correct: json.module1Correct ?? null, total: json.module1Total ?? breakIdx })
      }
      // Start Module 2's own clock from this moment (in whole-test
      // elapsed terms) and persist it for resume.
      const m2Start = currentElapsedMs()
      setModule2StartMs(m2Start)
      if (typeof window !== 'undefined') {
        localStorage.setItem(`study:test:${sessionId}:m2StartMs`, String(m2Start))
      }
      setCurrentIdx(breakIdx) // jump to the first Module 2 question
    } catch {
      setModule2Error(true)
    } finally {
      setModule2Loading(false)
    }
  }, [test, module2Loading, sessionId, answers, currentElapsedMs])

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
  /** Waiting for the network to come back before auto-retrying the
   *  submit. Answers are safe in localStorage the whole time. */
  const [waitingForNetwork, setWaitingForNetwork] = useState(false)
  /** Confirm-before-submit dialog: opens when the student presses
   *  Submit, blocks the actual POST until they confirm. */
  const [confirmOpen, setConfirmOpen] = useState(false)

  // ── Submission path (used by manual Submit + timer expiry) ─────
  const submit = useCallback(async () => {
    if (!test || phase !== 'taking') return
    setSubmitError(null)
    setWaitingForNetwork(false)
    setPhase('submitting')
    try {
      const elapsedSeconds = Math.max(0, Math.round(currentElapsedMs() / 1000))
      const headers = await authHeaders()
      // School wifi is flaky: retry transient failures (network drop,
      // 5xx) with backoff before surfacing an error. 4xx responses are
      // permanent — no retry.
      const body = JSON.stringify({
        sessionId,
        questions: test.questions,
        answers,
        elapsedSeconds,
      })
      let res: Response | null = null
      let lastNetworkError: Error | null = null
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) await new Promise(r => setTimeout(r, attempt * 1500))
        try {
          res = await fetch('/api/study/test/submit', { method: 'POST', headers, body })
          lastNetworkError = null
          if (res.status < 500) break
        } catch (e) {
          lastNetworkError = e as Error
          res = null
        }
      }
      if (!res) {
        // Never reached the server. If the device is offline, park in a
        // "waiting for network" state and auto-retry on reconnect —
        // answers stay in localStorage, nothing is lost.
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          setWaitingForNetwork(true)
          setPhase('taking')
          return
        }
        console.error('[TestSession] submit network failure', lastNetworkError)
        throw new Error(ko
          ? '네트워크 연결이 불안정해요. 답안은 저장되어 있으니 다시 시도해 주세요.'
          : 'Network is unstable. Your answers are saved — try again.')
      }
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
        localStorage.removeItem(`study:test:${sessionId}:m2StartMs`)
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
  }, [test, phase, answers, sessionId, answerAudioPaths, answerSpeechSignals, speakingGradeMode, currentElapsedMs, ko])

  // Auto-resubmit when the connection comes back. The 1s delay lets
  // the radio actually re-establish before we fire (the 'online'
  // event often leads usable connectivity by a moment).
  useEffect(() => {
    if (!waitingForNetwork) return
    const onOnline = () => {
      setTimeout(() => { void submit() }, 1000)
    }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [waitingForNetwork, submit])

  // Auto-submit when the timer hits zero.
  // Total time budget in ms. `now` is here so the effect re-runs
  // every tick to check whether we've exceeded the budget.
  // ONE-SHOT: without the ref, a failed submit dropped phase back to
  // 'taking' with elapsed still past the limit, so every tick
  // re-submitted — endless POSTs and the error banner wiped each
  // cycle. After the single auto attempt, the student retries via the
  // error banner's manual submit.
  const autoSubmitAttemptedRef = useRef(false)
  // Fires once when Module 1's clock expires — auto-advances to Module 2
  // (same path as the "Continue to Module 2" tap).
  const autoRouteAttemptedRef = useRef(false)
  useEffect(() => {
    if (phase !== 'taking' || !test) return
    const isAdaptive = !!test.adaptive && typeof test.moduleBreakIdx === 'number'
    if (isAdaptive) {
      // Per-module clock: each module gets its own budget.
      const perModuleMinutes = test.perModuleMinutes ?? Math.round(test.timeLimitMinutes / 2)
      const inModule2 = currentIdx >= test.moduleBreakIdx!
      const remaining = moduleRemainingMs({
        perModuleMinutes, currentElapsedMs: currentElapsedMs(), module2StartMs, inModule2,
      })
      if (!inModule2) {
        // Module 1 timed out → route + draw Module 2 automatically.
        if (!autoRouteAttemptedRef.current && !module2Loading && remaining <= 0) {
          autoRouteAttemptedRef.current = true
          void routeToModule2()
        }
      } else if (!autoSubmitAttemptedRef.current && remaining <= 0) {
        // Module 2 timed out → submit the whole test.
        autoSubmitAttemptedRef.current = true
        void submit()
      }
      return
    }
    // Non-adaptive: one whole-test timer.
    const timeLimitMs = test.timeLimitMinutes * 60_000
    if (!autoSubmitAttemptedRef.current && timeLimitMs > 0 && currentElapsedMs() >= timeLimitMs) {
      autoSubmitAttemptedRef.current = true
      void submit()
    }
  }, [now, phase, test, currentIdx, module2StartMs, module2Loading, submit, routeToModule2, currentElapsedMs])

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
  // Adaptive tests are timed per module; the countdown shows the CURRENT
  // module's remaining time and resets when Module 2 begins.
  const isAdaptiveTest = !!test.adaptive && typeof test.moduleBreakIdx === 'number'
  const inModule2 = isAdaptiveTest && currentIdx >= test.moduleBreakIdx!
  // `now` in deps forces this to re-derive every tick.
  const remainingMs = isAdaptiveTest
    ? moduleRemainingMs({
        perModuleMinutes: test.perModuleMinutes ?? Math.round(test.timeLimitMinutes / 2),
        currentElapsedMs: currentElapsedMs(),
        module2StartMs,
        inModule2,
      })
    : Math.max(0, test.timeLimitMinutes * 60_000 - currentElapsedMs())
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
            the bar carries the primary progress signal now. Inner row is
            capped + centered so it lines up with the question column on
            wide screens (the bar/border still spans full width). */}
        <div className="px-5 py-2 flex items-center justify-between max-w-3xl mx-auto w-full">
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
          <div className="grid grid-cols-8 gap-1.5 max-w-3xl mx-auto">
            {test.questions.map((_, i) => {
              const isCurrent = i === currentIdx
              const isAnswered = isItemAnswered(i)
              const range = questionRanges[i]
              const cellLabel = range
                ? (range.startAt === range.endAt ? String(range.startAt) : `${range.startAt}–${range.endAt}`)
                : String(i + 1)
              const anyRecording = Object.values(interviewRecordingActive).some(Boolean)
              // In Module 2, Module 1 cells are locked — no jumping back.
              const moduleLocked = inModule2 && i < test.moduleBreakIdx!
              return (
                <button
                  key={i}
                  type="button"
                  disabled={anyRecording || moduleLocked}
                  onClick={() => { if (moduleLocked) return; setCurrentIdx(i); setGridOpen(false) }}
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
      <div key={currentIdx} className="flex-1 overflow-y-auto animate-fade-in">
       <div className="max-w-3xl mx-auto w-full px-5 py-5 lg:py-8">
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
            {/* SAT two-module chip — Module 1 until the routed Module 2
                is drawn + reached. */}
            {test.adaptive && typeof test.moduleBreakIdx === 'number' && (() => {
              const isModule2 = currentIdx >= test.moduleBreakIdx!
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
        {/* SAT "Module 2 begins" banner — shown on the first Module 2
            question with the earned route so the student sees the
            adaptivity happen. */}
        {test.adaptive && typeof test.moduleBreakIdx === 'number'
          && moduleRoute && currentIdx === test.moduleBreakIdx && (
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
              {(() => {
                const scored = moduleRoute.correct != null ? `${moduleRoute.correct}/${moduleRoute.total}` : null
                if (ko) {
                  const band = moduleRoute.route === 'hard' ? '더 어려운' : '더 쉬운'
                  return `모듈 1 ${scored ? `정답 ${scored} — ` : ''}실제 SAT처럼 ${band} 모듈 2로 배정됐어요.`
                }
                const band = moduleRoute.route === 'hard' ? 'a harder' : 'an easier'
                return `Module 1${scored ? `: ${scored} correct` : ''} — like the real SAT, you've been routed to ${band} Module 2.`
              })()}
            </p>
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
        // SAT adaptive: while only Module 1 is loaded (M2 not yet
        // appended), the last question ends Module 1 — show "Continue to
        // Module 2" instead of Submit. Once M2 is appended, questions
        // grows past moduleBreakIdx and this is false again.
        const inModule1 = !!test.adaptive
          && typeof test.moduleBreakIdx === 'number'
          && test.questions.length <= test.moduleBreakIdx
        const atModule1End = inModule1 && currentIdx === (test.moduleBreakIdx! - 1)
        const speakingKey = q.type === 'speaking_repeat' ? `repeat-${currentIdx}` : `interview-${currentIdx}`
        // Next button appears after the student's audio has been
        // PROCESSED — i.e., Whisper transcription completed. Set by
        // VoiceRecorderButton's `onDone` callback and by the safety
        // timeout scheduled from `onFirstPlayEnd` (so the student
        // isn't stuck if auto-record silently fails).
        if (isSpeakingItem && !isLast && !interviewNextReady[speakingKey]) return null
        return (
          <div className="flex-shrink-0 px-5 py-3 border-t border-gray-100 bg-white flex items-center gap-2 max-w-3xl mx-auto w-full">
            {!isSpeakingItem && (
              <button
                type="button"
                // Once in Module 2 the floor is the module break — a
                // student can't return to Module 1 (already graded +
                // routed), matching the real section-adaptive exam.
                onClick={() => setCurrentIdx(i => Math.max(inModule2 ? test.moduleBreakIdx! : 0, i - 1))}
                disabled={currentIdx === (inModule2 ? test.moduleBreakIdx! : 0) || audioPlaying}
                className="h-11 w-11 rounded-full bg-white border border-gray-200 text-gray-700 inline-flex items-center justify-center disabled:opacity-40"
                aria-label={String(t('study.test.previous'))}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            {atModule1End ? (
              // End of Module 1 → grade + draw the routed Module 2.
              <div className="flex-1 flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => void routeToModule2()}
                  disabled={module2Loading || audioPlaying}
                  className="h-11 rounded-full bg-gradient-to-b from-primary to-primary/90 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_8px_rgba(40,133,232,0.28)] text-sm font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  {module2Loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {module2Loading
                    ? (ko ? '모듈 2 준비 중…' : 'Preparing Module 2…')
                    : (ko ? '모듈 2로 계속하기' : 'Continue to Module 2')}
                  {!module2Loading && <ArrowRight className="w-4 h-4" />}
                </button>
                {module2Error && (
                  <span className="text-[11px] text-rose-600 text-center">
                    {ko ? '모듈 2를 불러오지 못했어요. 다시 시도해 주세요.' : "Couldn't load Module 2. Tap to retry."}
                  </span>
                )}
              </div>
            ) : isLast ? (() => {
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

      {/* Offline banner — the device lost its connection at submit
          time. Answers are safe in localStorage; we auto-resubmit the
          moment the browser reports the network is back. */}
      {waitingForNetwork && (
        <div className="absolute inset-x-3 bottom-20 z-40 rounded-xl bg-amber-50 ring-1 ring-amber-200 px-4 py-3 shadow-lg">
          <div className="flex items-start gap-2">
            <Loader2 className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5 animate-spin" />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-amber-900">
                {ko ? '오프라인이에요' : "You're offline"}
              </div>
              <div className="text-[12px] text-amber-800 mt-0.5">
                {ko
                  ? '답안은 안전하게 저장됐어요. 인터넷이 연결되면 자동으로 제출됩니다.'
                  : 'Your answers are saved. We’ll submit automatically once you’re back online.'}
              </div>
            </div>
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
