"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Volume2, Play, Eye, EyeOff } from '@/app/mobile/study/_shared/icons'
import { useTranslation } from '@/hooks/useTranslation'
import { authHeaders } from '@/lib/auth-headers'
import { PassageParagraphs } from './helpers'
import { primeMicStream } from './VoiceRecorder'

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
export const LISTENING_PLAY_COUNTS: Record<string, number> = {}

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

export function ListeningAudioPlayer({ groupKey, transcript, language, onSpeakingChange, allowTranscriptReveal = false, maxPlays = 2, onFirstPlayEnd, autoPlay = false }: {
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
