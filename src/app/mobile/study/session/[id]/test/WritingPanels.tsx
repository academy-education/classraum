"use client"

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { authHeaders } from '@/lib/auth-headers'
import { supabase } from '@/lib/supabase'
import { normalizeDisplayText } from './helpers'
import type { GradeResponse, RubricGrade, SpeechSignals } from './types'

/** TOEFL Writing scenario renderer — makes Email + Academic Discussion
 *  passages easier to scan than a wall of prose. Email: bold the
 *  From: / To: / Subject: headers, underline the numbered bullets in
 *  the "Write a reply that:" block. Discussion: split into per-speaker
 *  cards so the professor's prompt and each student's opinion are
 *  visually distinct instead of running together as one paragraph. */
export function WritingScenario({ text, kind }: { text: string; kind: 'email' | 'discussion' }) {
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
export function DiscussionScenario({ normalized }: { normalized: string }) {
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

/** TOEFL Complete-the-Words letter grid — renders one small input per
 *  missing letter (OTP-style) so students can't type more than the
 *  expected count. Auto-advances focus on entry and backs up on
 *  Backspace. The parent stores the concatenated string as the blank's
 *  answer; this component just presents it as N single-char cells. */
export function BlankLetterInput({ id, expectedLen, value, onChange, isFilled, ko }: {
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

export function WritingFeedbackPanel({
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
  const [premiumUpsell, setPremiumUpsell] = useState(false)
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
      let premiumFallback = false
      if (useAudio) {
        res = await fetch('/api/study/speaking/grade-audio', {
          method: 'POST', headers: authH, body: JSON.stringify(commonBody),
        })
        // If the audio route fails on the server (transcode error,
        // OpenAI 5xx, model 404, etc.), auto-retry with text-mode so
        // the student still gets *some* grade instead of a dead-end.
        // A 403 `premium_required` means the student picked real-audio
        // grading without a Premium plan — rather than dead-ending on a
        // raw error, fall back to text grading and nudge the upgrade.
        // Other 4xx (too short, wrong mode) are legitimate failures.
        if (!res.ok && (res.status >= 500 || res.status === 403)) {
          premiumFallback = res.status === 403
          console.warn('[WritingFeedbackPanel] audio grade unavailable, falling back to text', res.status)
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
      if (fellBack) {
        setPremiumUpsell(premiumFallback)
        setGradeNotice(premiumFallback
          ? (ko
              ? '실음성(ETS급) 채점은 프리미엄 기능이에요 — 텍스트 기반 채점 결과를 표시합니다.'
              : 'Real-audio (ETS-parity) grading is a Premium feature — showing a text-based grade instead.')
          : (ko
              ? '오디오 채점에 실패해 텍스트 채점 결과를 표시합니다.'
              : 'Audio grading failed — showing text-based grade instead.'))
      }
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
            {premiumUpsell && (
              <a href="/mobile/study/subscription" className="ml-1 font-semibold text-primary underline underline-offset-2">
                {ko ? '프리미엄 보기' : 'See Premium'}
              </a>
            )}
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
