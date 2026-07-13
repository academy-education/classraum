"use client"

import { useEffect, useRef, useState } from 'react'
import { Loader2, Mic } from 'lucide-react'
import { authHeaders } from '@/lib/auth-headers'
import { hapticImpact } from '@/lib/nativeHaptics'
import type { SpeechSignals } from './types'

// Global mic stream cache — Speaking auto-record works around browser
// "must be a user gesture" policy by requesting getUserMedia the FIRST
// time an autoplay-enabled audio player mounts. That mount happens
// during the propagated user-activation window from the "Start Test"
// tap, so permission grants without an extra prompt on the second and
// later Speaking items. Once granted, the stream is held open here
// and reused by every VoiceRecorderButton on the page.
let PRIMED_MIC_STREAM: MediaStream | null = null
let PRIMED_MIC_ATTEMPTED = false
export async function primeMicStream(opts?: { force?: boolean }): Promise<MediaStream | null> {
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
export function releaseMicStream() {
  if (PRIMED_MIC_STREAM) {
    for (const track of PRIMED_MIC_STREAM.getTracks()) track.stop()
    PRIMED_MIC_STREAM = null
  }
  PRIMED_MIC_ATTEMPTED = false
}

// Read accessor for the module-private primed stream. TestSession's
// micPrimed useState initializer reads the CURRENT value at mount
// time; a getter (rather than exporting the mutable `let` binding)
// keeps the single-copy mutation semantics unambiguous across the
// module boundary.
export function getPrimedMicStream(): MediaStream | null {
  return PRIMED_MIC_STREAM
}

/** Mic-only recorder for Speaking answers. Captures audio via
 *  MediaRecorder, uploads to /api/study/response/transcribe (Whisper),
 *  and hands both the transcribed text AND the storage path back via
 *  onTranscript so the parent can persist them together. Storage path
 *  lets the review pane play back the recording + lets future audio-
 *  native grading models score the recording itself. */
export function VoiceRecorderButton({ sessionId, language, ko, disabled, onTranscript, autoStartToken, maxDurationSec, onRecordingChange, hideManualButton, onDone }: {
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
export function SpeakingTimer({ active, paused, prepSec, responseSec, onPhaseChange, onExpire, ko, t }: {
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
