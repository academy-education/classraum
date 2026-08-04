"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Volume2, Play, Eye, EyeOff } from '@/app/mobile/study/_shared/icons'
import { useTranslation } from '@/hooks/useTranslation'
import { authHeaders } from '@/lib/auth-headers'
import { PassageParagraphs } from './helpers'
import { primeMicStream } from './VoiceRecorder'
import { measureEdgeSilence, advanceAtSeconds, TURN_GAP_MS, type EdgeSilence } from '@/lib/study/audio-trim'

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

export function ListeningAudioPlayer({ groupKey, transcript, language, onSpeakingChange, allowTranscriptReveal = false, maxPlays = 2, onFirstPlayEnd, autoPlay = false, paused = false }: {
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
  /** Mirrors the test's manual pause. The player owns the only handle
   *  on the live HTMLAudioElement, so the parent cannot pause it —
   *  it has to be pushed down. Without this the pause overlay froze
   *  the clock while the lecture kept playing behind it, and since
   *  Listening is capped at one play the student lost the recording. */
  paused?: boolean
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
  // Handle on the 350ms breath between dialogue turns. Pausing has to
  // clear this too — otherwise the next segment starts mid-pause and
  // the "paused" audio audibly continues.
  const gapTimerRef = useRef<number | null>(null)
  // Set when a pause lands during that gap, so resuming knows it has
  // to restart the chain itself rather than wait for an onended that
  // is never coming.
  const resumeFromGapRef = useRef<(() => void) | null>(null)
  // Mirror, because playNext() is a closure created at play() time and
  // would otherwise capture a stale `paused`.
  const pausedRef = useRef(paused)

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

  // Per-segment edge silence, measured from the decoded mp3 at prefetch.
  //
  // A conversation is one mp3 PER SPEAKER TURN, so every turn boundary
  // carries the trailing silence of one clip plus the leading silence of
  // the next. Measured across 17 clips pulled from the production cache:
  // mean 53 ms lead, 230 ms trail, trail ranging 0-626 ms. On top of that
  // the player used to wait a further 350 ms, so a join was ~633 ms of
  // dead air — ten of them in a median 11-turn conversation.
  //
  // Real ETS conversations are a single continuous two-actor recording
  // and have none of this. Ours read as a stack of separate clips, which
  // is what "too many switches" describes.
  //
  // Empty means "not measured" and every consumer treats that as zero,
  // so a browser without AudioContext, a decode failure, or a race just
  // gets the old behaviour rather than a broken chain.
  const trimsRef = useRef<EdgeSilence[]>([])
  // The early-advance timer for the segment currently playing. It runs on
  // WALL CLOCK, so a pause has to cancel it — otherwise the chain would
  // march on behind the pause overlay and the student would come back to
  // a conversation two turns further along than the one they stopped.
  const turnTimerRef = useRef<number | null>(null)
  // Re-arms that timer against the element's live currentTime. Held in a
  // ref because the resume effect lives outside playNext's closure.
  const rescheduleAdvanceRef = useRef<(() => void) | null>(null)

  // One <audio> element per segment, built as soon as the URLs resolve so
  // the browser buffers every turn WHILE the student reads the prompt.
  //
  // Without this, playNext() called `new Audio(url)` at the moment the turn
  // was needed, so each turn paid a full download between the previous turn
  // ending and this one making a sound. Measured on broadband over a real
  // 16-turn conversation: a median 663 ms gap per turn, 9.7 s of dead air
  // across the dialogue. The turns are 24 KB-250 KB, so on a phone that
  // scales with bandwidth — which is what a tester reported as "the break
  // between each line lasts 10-15 seconds" and "the conversation is super
  // long". Both complaints are this one gap; the transcripts themselves are
  // a normal 208 words.
  const audioPoolRef = useRef<HTMLAudioElement[]>([])

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
      // Warm EVERY segment, not just the first.
      //
      // The comment that used to sit here said it warmed "each MP3 URL";
      // the code under it warmed `urls.find(u => !!u)` — one file. Turns
      // 2..N were therefore always cold at the moment they were needed.
      // A comment is not evidence the code does what it says.
      //
      // Then hand each URL to a real <audio> with preload='auto' so the
      // browser actually buffers it rather than merely holding it in the
      // HTTP cache. This is what takes the inter-turn gap to ~0.
      //
      // The same fetch also feeds the silence measurement: we already
      // have the bytes here, so decoding them costs one pass and no
      // extra network. Failures resolve to {0,0} — no trim, old
      // behaviour — because a missed trim is a slightly loose join
      // while a wrong trim eats a student's speaker turn.
      const ctx = typeof window !== 'undefined'
        ? (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
        : undefined
      const audioCtx = ctx ? new ctx() : null
      const trims = await Promise.all(urls.map(async u => {
        if (!u) return { lead: 0, trail: 0 }
        try {
          const res = await fetch(u, { method: 'GET', cache: 'force-cache' })
          if (!audioCtx || !res.ok) return { lead: 0, trail: 0 }
          const buf = await audioCtx.decodeAudioData(await res.arrayBuffer())
          return measureEdgeSilence(buf.getChannelData(0), buf.sampleRate)
        } catch {
          return { lead: 0, trail: 0 }
        }
      }))
      void audioCtx?.close().catch(() => {})
      if (cancelled) return
      trimsRef.current = trims
      audioPoolRef.current = urls.map(u => {
        const a = new Audio()
        a.preload = 'auto'
        if (u) { a.src = u; a.load() }
        return a
      })
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
      // Prefer the pre-buffered element. Falls back to a fresh one when the
      // pool is missing (prefetch raced, or this is a replay after the pool
      // was rebuilt) so playback never depends on the optimisation working.
      //
      // The replay case is why this is not a one-liner. maxPlays is 2, so
      // the second play reuses elements that have already ENDED. Seeking
      // before metadata arrives throws, and an element left at its end
      // plays for zero seconds — the turn would be silently skipped and
      // the student would never know they missed a line. So: attempt the
      // rewind, then CONFIRM it took, and fall back to a fresh element if
      // it did not. Silence must never be the failure mode here.
      const pooled = audioPoolRef.current[i]
      let audio: HTMLAudioElement
      if (pooled) {
        try { pooled.currentTime = 0 } catch { /* not seekable yet */ }
        audio = pooled.currentTime < 0.05 ? pooled : new Audio(urls[i]!)
      } else {
        audio = new Audio(urls[i]!)
      }
      audioRef.current = audio
      // A live element is playing again, so any pending gap-resume is
      // stale.
      resumeFromGapRef.current = null
      audio.playbackRate = 1.0
      if (pausedRef.current) {
        // Paused between segments: hold here and let the resume effect
        // start us. Without this the chain runs on behind the overlay.
        resumeFromGapRef.current = playNext
        return
      }
      const trim = trimsRef.current[i] ?? { lead: 0, trail: 0 }

      // Advance to the next turn exactly once, whether we got there by
      // the scheduled trim or by the clip genuinely ending. Both paths
      // stay wired: the timer is the fast path, `onended` the backstop
      // for when duration is unknown, the seek failed, or the trim
      // measured as zero. Without the guard a clip whose trail was
      // overestimated would fire both and skip a turn.
      let advanced = false
      const advance = () => {
        if (advanced || cancelledRef.current) return
        advanced = true
        if (turnTimerRef.current != null) {
          window.clearTimeout(turnTimerRef.current)
          turnTimerRef.current = null
        }
        charsDone += charsPerTurn[i]
        i++
        if (i < urls.length) {
          // A conversational beat, not padding — see TURN_GAP_MS. The
          // trailing silence is already skipped by `advance` firing
          // early, so this is the whole of the pause a student hears.
          resumeFromGapRef.current = playNext
          if (pausedRef.current) return
          gapTimerRef.current = window.setTimeout(() => {
            gapTimerRef.current = null
            resumeFromGapRef.current = null
            playNext()
          }, segments.length > 1 ? TURN_GAP_MS : 0)
        } else {
          playNext()
        }
      }

      // Schedule the early advance once we know how long the clip is.
      // `duration` is NaN until metadata loads, so this runs on the
      // metadata event when it has not arrived yet.
      const scheduleAdvance = () => {
        if (advanced || pausedRef.current || turnTimerRef.current != null) return
        const dur = audio.duration
        if (!Number.isFinite(dur) || dur <= 0 || trim.trail <= 0) return
        const at = advanceAtSeconds(dur, trim.trail, 0)
        const wait = Math.max(0, (at - audio.currentTime) * 1000)
        turnTimerRef.current = window.setTimeout(() => {
          turnTimerRef.current = null
          advance()
        }, wait)
      }

      audio.onended = advance
      audio.onerror = () => { charsDone += charsPerTurn[i]; i++; playNext() }
      audio.onloadedmetadata = scheduleAdvance
      // Recomputed from currentTime, so resuming mid-turn re-arms for
      // the remaining audible time rather than the whole clip again.
      rescheduleAdvanceRef.current = scheduleAdvance

      // Skip the clip's own leading silence. Guarded the same way the
      // rewind above is: if the seek does not take, we simply play the
      // lead — a slightly loose join, never a missing turn.
      if (trim.lead > 0) {
        try { audio.currentTime = trim.lead } catch { /* not seekable yet */ }
      }
      void audio.play().catch(() => { i++; playNext() })
      scheduleAdvance()
    }
    playNext()
  }

  // Mirror the test's manual pause onto the live audio.
  //
  // Deliberately does NOT touch onSpeakingChange: `audioPlaying` still
  // gates nav-lock and the countdown freeze upstream, and clearing it
  // mid-pause would restart the clock while the student is paused.
  // A pause is also not a replay — resume goes through the element
  // directly rather than play(), which would burn a play count.
  useEffect(() => {
    pausedRef.current = paused
    if (cancelledRef.current) return
    if (paused) {
      audioRef.current?.pause()
      if (gapTimerRef.current != null) {
        window.clearTimeout(gapTimerRef.current)
        gapTimerRef.current = null
        // resumeFromGapRef still holds the continuation.
      }
      // The early-advance timer is wall-clock and must not survive a
      // pause; it is re-armed from currentTime on resume.
      if (turnTimerRef.current != null) {
        window.clearTimeout(turnTimerRef.current)
        turnTimerRef.current = null
      }
      return
    }
    const audio = audioRef.current
    if (audio && !audio.ended && audio.currentTime > 0) {
      void audio.play().catch(() => {})
      rescheduleAdvanceRef.current?.()
      return
    }
    // Paused during the inter-segment gap (or before a segment had
    // started): nothing to un-pause, so restart the chain.
    const resume = resumeFromGapRef.current
    if (resume) {
      resumeFromGapRef.current = null
      resume()
    }
  }, [paused])

  // Cleanup: stop any playing audio + release the nav lock on unmount.
  useEffect(() => () => {
    cancelledRef.current = true
    if (gapTimerRef.current != null) {
      window.clearTimeout(gapTimerRef.current)
      gapTimerRef.current = null
    }
    if (turnTimerRef.current != null) {
      window.clearTimeout(turnTimerRef.current)
      turnTimerRef.current = null
    }
    rescheduleAdvanceRef.current = null
    resumeFromGapRef.current = null
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
