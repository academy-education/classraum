"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Loader2, Mic, Square, RotateCcw, Sparkles, AlertCircle,
  ArrowRight, Clock, Pencil, Volume2, Award, ChevronRight, Info,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/hooks/useTranslation'
import { authHeaders } from '@/lib/auth-headers'

type Family = 'toefl' | 'ielts'
type Skill = 'speaking' | 'writing'

interface CriterionScore { key: string; score: number; evidence: string }
interface Annotation {
  quote: string
  category: 'grammar' | 'vocabulary' | 'coherence' | 'task' | 'pronunciation' | 'delivery'
  severity: 'nit' | 'minor' | 'major'
  issue: string
  suggestion: string
}
interface Grade {
  overallBand: number
  summary: string
  criteria: CriterionScore[]
  annotations: Annotation[]
  modelRewrite: string
}

type Stage = 'skill' | 'brief' | 'capture' | 'grading' | 'result' | 'error'

interface SessionMeta {
  topicSlug: string | null
  /** Hardcoded scaleMax for header band display. */
  scaleMax: number
}

/**
 * ResponseSession — AI Speaking + Writing grader.
 *
 * Flow:
 *   skill   — student picks speaking vs writing (gated by topic).
 *   brief   — task prompt + timer + start button.
 *   capture — textarea (writing) or recorder (speaking) with countdown.
 *   grading — loading state while gpt-4o scores against the rubric.
 *   result  — overall band, per-criterion scores, sentence annotations,
 *             single-paragraph rewrite, retry CTA.
 *
 * v1 ships behind a BETA badge — we have no human-rater calibration
 * study yet. The disclosure panel on the result screen explains this.
 */
export function ResponseSession({
  sessionId,
  language,
}: { sessionId: string; language: 'en' | 'ko' }) {
  const { t } = useTranslation()
  const ko = language === 'ko'
  const [stage, setStage] = useState<Stage>('skill')
  const [skill, setSkill] = useState<Skill | null>(null)
  const [family, setFamily] = useState<Family | null>(null)
  const [topicSlug, setTopicSlug] = useState<string | null>(null)
  const [prompt, setPrompt] = useState<string>('')
  const [response, setResponse] = useState<string>('')
  const [grade, setGrade] = useState<Grade | null>(null)
  const [scaleMax, setScaleMax] = useState(9)
  const [errMsg, setErrMsg] = useState<string | null>(null)
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null)
  const [audioPath, setAudioPath] = useState<string | null>(null)

  // Load session topic to determine TOEFL vs IELTS.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const { data } = await supabase
        .from('study_sessions')
        .select('topic_id')
        .eq('id', sessionId)
        .maybeSingle()
      if (!data?.topic_id || cancelled) return
      const { data: topic } = await supabase
        .from('study_topics')
        .select('slug')
        .eq('id', data.topic_id)
        .maybeSingle()
      if (!topic || cancelled) return
      setTopicSlug(topic.slug)
      if (topic.slug.startsWith('toefl-')) setFamily('toefl')
      else if (topic.slug.startsWith('ielts-')) setFamily('ielts')
      if (topic.slug.endsWith('-speaking')) setSkill('speaking')
      else if (topic.slug.endsWith('-writing')) setSkill('writing')
    })()
    return () => { cancelled = true }
  }, [sessionId])

  // Auto-skip skill picker if topic slug is unambiguous.
  useEffect(() => {
    if (stage === 'skill' && skill && family) {
      const next = pickPrompt(family, skill)
      setPrompt(next)
      setScaleMax(family === 'ielts' ? 9 : skill === 'writing' ? 5 : 4)
      setStage('brief')
    }
  }, [stage, skill, family])

  const submit = useCallback(async (text: string, opts?: { audioPath?: string; durationSeconds?: number }) => {
    if (!family || !skill) return
    setStage('grading')
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/study/response/grade', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sessionId,
          testFamily: family,
          skill,
          promptText: prompt,
          responseText: text,
          audioPath: opts?.audioPath ?? audioPath ?? null,
          durationSeconds: opts?.durationSeconds ?? durationSeconds ?? null,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setErrMsg(json?.error ?? 'grading failed')
        setStage('error')
        return
      }
      setGrade(json.grade as Grade)
      setScaleMax(json.scaleMax as number)
      setStage('result')
    } catch (e) {
      console.error(e)
      setErrMsg(String(e))
      setStage('error')
    }
  }, [audioPath, durationSeconds, family, prompt, sessionId, skill])

  const reset = useCallback(() => {
    setResponse('')
    setGrade(null)
    setAudioPath(null)
    setDurationSeconds(null)
    setErrMsg(null)
    if (family && skill) setPrompt(pickPrompt(family, skill))
    setStage('brief')
  }, [family, skill])

  const meta: SessionMeta = { topicSlug, scaleMax }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="px-5 py-5">
        {stage === 'skill' && (
          <SkillPicker onPick={(f, s) => {
            setFamily(f); setSkill(s)
            setPrompt(pickPrompt(f, s))
            setScaleMax(f === 'ielts' ? 9 : s === 'writing' ? 5 : 4)
            setStage('brief')
          }} ko={ko} />
        )}
        {stage === 'brief' && family && skill && (
          <BriefScreen
            family={family} skill={skill} prompt={prompt} ko={ko}
            onStart={() => setStage('capture')}
            onReroll={() => setPrompt(pickPrompt(family, skill))}
          />
        )}
        {stage === 'capture' && family && skill && (
          skill === 'writing'
            ? <WritingCapture
                family={family} prompt={prompt} ko={ko}
                value={response} onChange={setResponse}
                onSubmit={(text) => submit(text)}
              />
            : <SpeakingCapture
                family={family} prompt={prompt} ko={ko}
                sessionId={sessionId} languageHint={language}
                onComplete={(text, audioPath, durationSeconds) => {
                  setResponse(text)
                  setAudioPath(audioPath)
                  setDurationSeconds(durationSeconds)
                  void submit(text, { audioPath, durationSeconds })
                }}
              />
        )}
        {stage === 'grading' && <GradingScreen ko={ko} />}
        {stage === 'result' && grade && family && skill && (
          <ResultScreen
            grade={grade} family={family} skill={skill}
            scaleMax={meta.scaleMax} prompt={prompt} response={response} ko={ko}
            onRetry={reset}
          />
        )}
        {stage === 'error' && (
          <ErrorScreen message={errMsg} ko={ko} onRetry={() => setStage('capture')} />
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Skill picker — only shown when the topic slug is ambiguous (rare in v1
// because TOEFL/IELTS speaking/writing are leaf topics, but kept for
// safety in case students enter from the parent test_prep page).
// ---------------------------------------------------------------------------
function SkillPicker({ onPick, ko }: { onPick: (f: Family, s: Skill) => void; ko: boolean }) {
  const options: Array<{ f: Family; s: Skill; icon: typeof Mic; title: string; body: string; iconBg: string }> = [
    { f: 'toefl', s: 'writing', icon: Pencil, title: ko ? 'TOEFL 작문' : 'TOEFL Writing', body: ko ? '독립형 에세이 (30분)' : 'Independent essay (30 min)', iconBg: 'bg-gradient-to-br from-indigo-400 to-blue-600' },
    { f: 'toefl', s: 'speaking', icon: Mic, title: ko ? 'TOEFL 말하기' : 'TOEFL Speaking', body: ko ? '독립형 응답 (45초)' : 'Independent response (45 sec)', iconBg: 'bg-gradient-to-br from-sky-400 to-blue-600' },
    { f: 'ielts', s: 'writing', icon: Pencil, title: ko ? 'IELTS 작문 Task 2' : 'IELTS Writing Task 2', body: ko ? '에세이 (40분)' : 'Essay (40 min)', iconBg: 'bg-gradient-to-br from-rose-400 to-pink-600' },
    { f: 'ielts', s: 'speaking', icon: Mic, title: ko ? 'IELTS 말하기 Part 2' : 'IELTS Speaking Part 2', body: ko ? '독백 1–2분' : 'Long-turn 1–2 min', iconBg: 'bg-gradient-to-br from-amber-400 to-orange-600' },
  ]
  return (
    <div className="space-y-3">
      <BetaPill ko={ko} />
      <h2 className="text-[15px] font-semibold text-gray-900">
        {ko ? '평가할 항목을 선택하세요' : 'Choose what to practice'}
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {options.map(opt => {
          const Icon = opt.icon
          return (
            <button key={`${opt.f}-${opt.s}`} type="button" onClick={() => onPick(opt.f, opt.s)}
              className="text-left rounded-2xl bg-white ring-1 ring-gray-200/70 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-4 hover:-translate-y-0.5 hover:shadow-md transition-all">
              <div className={`w-10 h-10 rounded-xl text-white flex items-center justify-center ${opt.iconBg} mb-3`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="text-[14px] font-semibold text-gray-900">{opt.title}</div>
              <div className="text-[12px] text-gray-600 mt-1">{opt.body}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Brief screen — show the task prompt + timer + start button.
// ---------------------------------------------------------------------------
function BriefScreen({
  family, skill, prompt, ko, onStart, onReroll,
}: {
  family: Family; skill: Skill; prompt: string; ko: boolean
  onStart: () => void; onReroll: () => void
}) {
  const timer = TIME_LIMITS[`${family}_${skill}`]
  const target = TARGETS[`${family}_${skill}`]
  return (
    <div className="space-y-4">
      <BetaPill ko={ko} />
      <div className="rounded-2xl bg-white ring-1 ring-gray-200/70 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-5">
        <div className="text-[11px] font-semibold tracking-[0.12em] uppercase text-indigo-600 mb-2">
          {family.toUpperCase()} · {skill === 'speaking' ? (ko ? '말하기' : 'Speaking') : (ko ? '작문' : 'Writing')}
        </div>
        <h2 className="text-[16px] font-semibold text-gray-900 leading-snug mb-3">
          {ko ? '오늘의 과제' : "Today's task"}
        </h2>
        <p className="text-[14px] text-gray-800 leading-relaxed whitespace-pre-line">{prompt}</p>
        <div className="mt-4 flex items-center gap-4 text-[12px] text-gray-600">
          <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{timer}</span>
          <span className="inline-flex items-center gap-1.5"><Pencil className="w-3.5 h-3.5" />{target}</span>
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onReroll}
          className="flex-1 h-11 rounded-xl bg-white ring-1 ring-gray-200 text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition inline-flex items-center justify-center gap-1.5">
          <RotateCcw className="w-3.5 h-3.5" />{ko ? '다른 문제' : 'New prompt'}
        </button>
        <button type="button" onClick={onStart}
          className="flex-[1.4] h-11 rounded-xl bg-indigo-600 text-white text-[14px] font-semibold hover:bg-indigo-700 transition inline-flex items-center justify-center gap-1.5">
          {ko ? '시작' : 'Start'}<ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Writing capture — textarea + word count + countdown timer. Soft-stops
// at 0 (we don't force-submit so the student isn't surprised).
// ---------------------------------------------------------------------------
function WritingCapture({
  family, prompt, ko, value, onChange, onSubmit,
}: {
  family: Family; prompt: string; ko: boolean
  value: string; onChange: (v: string) => void
  onSubmit: (text: string) => void
}) {
  const minutes = family === 'ielts' ? 40 : 30
  const [remaining, setRemaining] = useState(minutes * 60)
  const wordCount = useMemo(() => value.trim().split(/\s+/).filter(Boolean).length, [value])
  useEffect(() => {
    if (remaining <= 0) return
    const id = setInterval(() => setRemaining(r => Math.max(0, r - 1)), 1000)
    return () => clearInterval(id)
  }, [remaining])
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')
  const min = family === 'ielts' ? 250 : 300
  const canSubmit = wordCount >= 30
  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-indigo-50/60 ring-1 ring-indigo-100 p-3 text-[12px] text-gray-700 leading-relaxed">
        <span className="font-medium text-indigo-700">{ko ? '과제' : 'Prompt'}: </span>{prompt}
      </div>
      <div className="flex items-center justify-between text-[12px]">
        <span className="inline-flex items-center gap-1.5 font-mono tabular-nums text-gray-700">
          <Clock className="w-3.5 h-3.5" />{mm}:{ss}
        </span>
        <span className={`tabular-nums ${wordCount >= min ? 'text-emerald-600 font-medium' : 'text-gray-500'}`}>
          {wordCount} {ko ? '단어' : 'words'} <span className="text-gray-400">/ {min}+</span>
        </span>
      </div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={ko ? '여기에 작성하세요…' : 'Type your response here…'}
        rows={14}
        className="w-full rounded-2xl bg-white ring-1 ring-gray-200/70 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-4 text-[14px] text-gray-900 leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
      />
      <button
        type="button"
        disabled={!canSubmit}
        onClick={() => onSubmit(value)}
        className="w-full h-11 rounded-xl bg-indigo-600 text-white text-[14px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition inline-flex items-center justify-center gap-1.5"
      >
        <Sparkles className="w-4 h-4" />{ko ? '제출하고 평가 받기' : 'Submit for grading'}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Speaking capture — prep timer, then recorder. MediaRecorder API — on
// iOS Safari this falls back to mp4 automatically.
// ---------------------------------------------------------------------------
function SpeakingCapture({
  family, prompt, ko, sessionId, languageHint, onComplete,
}: {
  family: Family; prompt: string; ko: boolean
  sessionId: string; languageHint: 'en' | 'ko'
  onComplete: (text: string, audioPath: string, durationSeconds: number) => void
}) {
  const prepLimit = family === 'ielts' ? 60 : 15
  const recLimit = family === 'ielts' ? 120 : 45
  type State = 'prep' | 'recording' | 'uploading' | 'failed'
  const [state, setState] = useState<State>('prep')
  const [prepRemaining, setPrepRemaining] = useState(prepLimit)
  const [recRemaining, setRecRemaining] = useState(recLimit)
  const [err, setErr] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startedAtRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Prep countdown.
  useEffect(() => {
    if (state !== 'prep') return
    if (prepRemaining <= 0) { void startRecording(); return }
    const id = setInterval(() => setPrepRemaining(r => Math.max(0, r - 1)), 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, prepRemaining])

  // Recording countdown — auto-stops at 0.
  useEffect(() => {
    if (state !== 'recording') return
    if (recRemaining <= 0) { stopRecording(); return }
    const id = setInterval(() => setRecRemaining(r => Math.max(0, r - 1)), 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, recRemaining])

  // Cleanup mic stream on unmount.
  useEffect(() => () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      // Safari prefers mp4; everywhere else webm/opus.
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : ''
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
      chunksRef.current = []
      rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      rec.onstop = () => { void uploadAndTranscribe() }
      mediaRecorderRef.current = rec
      startedAtRef.current = Date.now()
      rec.start()
      setState('recording')
    } catch (e) {
      console.error(e)
      setErr(ko ? '마이크 접근이 거부되었습니다.' : 'Microphone access was denied.')
      setState('failed')
    }
  }

  const stopRecording = () => {
    const rec = mediaRecorderRef.current
    if (!rec || rec.state === 'inactive') return
    rec.stop()
    streamRef.current?.getTracks().forEach(t => t.stop())
    setState('uploading')
  }

  const uploadAndTranscribe = async () => {
    const duration = startedAtRef.current
      ? Math.round((Date.now() - startedAtRef.current) / 1000)
      : recLimit - recRemaining
    const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || 'audio/webm' })
    try {
      const headers = await authHeaders()
      const form = new FormData()
      form.append('audio', blob, 'response.webm')
      form.append('sessionId', sessionId)
      form.append('language', languageHint)
      // Manually drop content-type so the browser sets the multipart boundary.
      const { Authorization } = headers as { Authorization?: string }
      const res = await fetch('/api/study/response/transcribe', {
        method: 'POST',
        headers: Authorization ? { Authorization } : {},
        body: form,
      })
      const json = await res.json()
      if (!res.ok) {
        setErr(json?.error ?? 'transcription failed')
        setState('failed')
        return
      }
      onComplete(String(json.text ?? ''), String(json.audioPath ?? ''), duration)
    } catch (e) {
      console.error(e)
      setErr(String(e))
      setState('failed')
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-indigo-50/60 ring-1 ring-indigo-100 p-3 text-[12px] text-gray-700 leading-relaxed">
        <span className="font-medium text-indigo-700">{ko ? '과제' : 'Prompt'}: </span>{prompt}
      </div>

      {state === 'prep' && (
        <div className="rounded-2xl bg-white ring-1 ring-gray-200/70 p-6 text-center">
          <div className="text-[11px] font-semibold tracking-[0.12em] uppercase text-amber-600 mb-2">
            {ko ? '준비 시간' : 'Prep time'}
          </div>
          <div className="text-5xl font-bold tabular-nums text-gray-900 leading-none">{prepRemaining}s</div>
          <p className="text-[12px] text-gray-500 mt-3">
            {ko ? '메모하세요. 자동으로 녹음이 시작됩니다.' : 'Take notes. Recording starts automatically.'}
          </p>
          <button type="button" onClick={() => { setPrepRemaining(0); void startRecording() }}
            className="mt-4 inline-flex items-center justify-center h-9 px-4 rounded-lg bg-gray-900 text-white text-[13px] font-medium hover:bg-gray-800 transition">
            {ko ? '바로 시작' : 'Start now'}
          </button>
        </div>
      )}

      {state === 'recording' && (
        <div className="rounded-2xl bg-white ring-1 ring-gray-200/70 p-6 text-center">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.12em] uppercase text-rose-600 mb-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            {ko ? '녹음 중' : 'Recording'}
          </div>
          <div className="text-5xl font-bold tabular-nums text-gray-900 leading-none">{recRemaining}s</div>
          <button type="button" onClick={stopRecording}
            className="mt-5 inline-flex items-center justify-center gap-1.5 h-11 px-5 rounded-xl bg-rose-600 text-white text-[14px] font-semibold hover:bg-rose-700 transition">
            <Square className="w-4 h-4 fill-white" />{ko ? '녹음 종료' : 'Stop'}
          </button>
        </div>
      )}

      {state === 'uploading' && (
        <div className="rounded-2xl bg-white ring-1 ring-gray-200/70 p-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-3" />
          <p className="text-[13px] text-gray-700">
            {ko ? '음성을 텍스트로 변환 중…' : 'Transcribing your audio…'}
          </p>
        </div>
      )}

      {state === 'failed' && (
        <div className="rounded-2xl bg-rose-50 ring-1 ring-rose-200 p-4 text-[13px] text-rose-800">
          <div className="inline-flex items-center gap-1.5 font-medium mb-1">
            <AlertCircle className="w-4 h-4" />{ko ? '오류' : 'Error'}
          </div>
          {err ?? (ko ? '알 수 없는 오류' : 'Unknown error')}
          <button type="button" onClick={() => { setState('prep'); setPrepRemaining(prepLimit); setRecRemaining(recLimit) }}
            className="mt-3 inline-flex items-center justify-center h-9 px-3 rounded-lg bg-white ring-1 ring-rose-200 text-rose-800 text-[12px] font-medium">
            {ko ? '다시 시도' : 'Retry'}
          </button>
        </div>
      )}
    </div>
  )
}

function GradingScreen({ ko }: { ko: boolean }) {
  return (
    <div className="py-16 text-center">
      <Loader2 className="w-7 h-7 animate-spin text-indigo-600 mx-auto mb-3" />
      <p className="text-[14px] font-medium text-gray-900">{ko ? '평가 중…' : 'Grading your response…'}</p>
      <p className="text-[12px] text-gray-500 mt-1.5">{ko ? '약 10–20초 소요됩니다.' : 'Typically 10–20 seconds.'}</p>
    </div>
  )
}

function ErrorScreen({ message, ko, onRetry }: { message: string | null; ko: boolean; onRetry: () => void }) {
  return (
    <div className="py-12 text-center">
      <AlertCircle className="w-7 h-7 text-rose-500 mx-auto mb-2" />
      <p className="text-[14px] font-medium text-gray-900">{ko ? '문제가 발생했습니다' : 'Something went wrong'}</p>
      <p className="text-[12px] text-gray-500 mt-1.5 max-w-xs mx-auto">{message ?? ''}</p>
      <button type="button" onClick={onRetry}
        className="mt-4 inline-flex items-center justify-center h-10 px-4 rounded-xl bg-gray-900 text-white text-[13px] font-medium">
        {ko ? '다시 시도' : 'Try again'}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Result screen — overall band, criteria breakdown, annotations, rewrite.
// ---------------------------------------------------------------------------
function ResultScreen({
  grade, family, skill, scaleMax, prompt, response, ko, onRetry,
}: {
  grade: Grade; family: Family; skill: Skill; scaleMax: number
  prompt: string; response: string; ko: boolean; onRetry: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-700 text-white p-5 shadow-[0_8px_24px_-8px_rgba(79,70,229,0.45)]">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[10px] font-semibold tracking-[0.14em] uppercase opacity-80">
              {family.toUpperCase()} · {skill === 'speaking' ? (ko ? '말하기' : 'Speaking') : (ko ? '작문' : 'Writing')}
            </div>
            <div className="text-[11px] uppercase tracking-[0.12em] opacity-70 mt-1">{ko ? '종합 점수' : 'Overall'}</div>
          </div>
          <Award className="w-6 h-6 opacity-90" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-5xl font-bold tabular-nums leading-none">
            {Number.isInteger(grade.overallBand) ? grade.overallBand : grade.overallBand.toFixed(1)}
          </span>
          <span className="text-[16px] opacity-80">/ {scaleMax}</span>
        </div>
        <p className="text-[13px] mt-3 leading-relaxed opacity-95">{grade.summary}</p>
      </div>

      <section>
        <h3 className="text-[13px] font-semibold text-gray-900 mb-2 px-1">{ko ? '항목별 평가' : 'By criterion'}</h3>
        <div className="space-y-2">
          {grade.criteria.map(c => {
            const max = family === 'ielts' ? 9 : skill === 'writing' ? 5 : 4
            const pct = Math.max(0, Math.min(100, (c.score / max) * 100))
            return (
              <div key={c.key} className="rounded-xl bg-white ring-1 ring-gray-200/70 p-3.5">
                <div className="flex items-center justify-between">
                  <div className="text-[13px] font-medium text-gray-900">{labelFor(c.key, ko)}</div>
                  <div className="text-[13px] font-mono tabular-nums text-gray-900">
                    {Number.isInteger(c.score) ? c.score : c.score.toFixed(1)}<span className="text-gray-400"> / {max}</span>
                  </div>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-indigo-400 to-blue-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[12px] text-gray-600 mt-2 leading-relaxed">{c.evidence}</p>
              </div>
            )
          })}
        </div>
      </section>

      {grade.annotations.length > 0 && (
        <section>
          <h3 className="text-[13px] font-semibold text-gray-900 mb-2 px-1">{ko ? '문장 단위 피드백' : 'Sentence-level feedback'}</h3>
          <div className="space-y-2">
            {grade.annotations.map((a, i) => (
              <div key={i} className="rounded-xl bg-white ring-1 ring-gray-200/70 p-3.5">
                <div className="flex items-start gap-2 mb-1.5">
                  <SeverityBadge severity={a.severity} ko={ko} />
                  <span className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">{categoryLabel(a.category, ko)}</span>
                </div>
                <blockquote className="text-[13px] text-gray-900 border-l-2 border-indigo-200 pl-2.5 italic mb-2">
                  &ldquo;{a.quote}&rdquo;
                </blockquote>
                <div className="text-[12px] text-gray-700 leading-relaxed"><span className="font-medium text-rose-700">{ko ? '문제' : 'Issue'}:</span> {a.issue}</div>
                <div className="text-[12px] text-gray-700 leading-relaxed mt-1"><span className="font-medium text-emerald-700">{ko ? '개선' : 'Fix'}:</span> {a.suggestion}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {grade.modelRewrite && (
        <section>
          <h3 className="text-[13px] font-semibold text-gray-900 mb-2 px-1 inline-flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />{ko ? '한 단계 위 모범 답안' : 'Next-band rewrite'}
          </h3>
          <div className="rounded-xl bg-indigo-50/60 ring-1 ring-indigo-100 p-3.5 text-[13px] text-gray-800 leading-relaxed whitespace-pre-line">
            {grade.modelRewrite}
          </div>
        </section>
      )}

      <details className="rounded-xl bg-gray-50 ring-1 ring-gray-200 p-3 text-[12px] text-gray-600">
        <summary className="cursor-pointer font-medium text-gray-800 inline-flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5" />{ko ? '이 점수가 정확한가요?' : 'How accurate is this score?'}
        </summary>
        <p className="mt-2 leading-relaxed">
          {ko
            ? '이 기능은 BETA입니다. AI 채점은 공식 채점관과 다를 수 있습니다. 우리는 30개 샘플에 대한 인간 채점관과의 상관관계 검증 연구를 진행 중이며, 향후 점수 보정 결과를 공개할 예정입니다.'
            : 'This feature is in BETA. AI grading can diverge from official examiners. We are running a 30-sample human-rater calibration study and will publish the correlation results before removing the beta badge.'}
        </p>
      </details>

      <details className="rounded-xl bg-white ring-1 ring-gray-200/70 p-3 text-[12px] text-gray-600">
        <summary className="cursor-pointer font-medium text-gray-800 inline-flex items-center gap-1.5">
          <Volume2 className="w-3.5 h-3.5" />{ko ? '내가 작성한 응답 보기' : 'View my response'}
        </summary>
        <div className="mt-2 leading-relaxed whitespace-pre-line text-gray-800">{response}</div>
      </details>

      <div className="pt-1">
        <button type="button" onClick={onRetry}
          className="w-full h-11 rounded-xl bg-gray-900 text-white text-[14px] font-semibold hover:bg-gray-800 transition inline-flex items-center justify-center gap-1.5">
          {ko ? '다른 문제 풀기' : 'Try another prompt'}<ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Small UI bits.
// ---------------------------------------------------------------------------
function BetaPill({ ko }: { ko: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold tracking-wider uppercase">
      <Sparkles className="w-3 h-3" />Beta{ko ? '' : ''}
    </span>
  )
}

function SeverityBadge({ severity, ko }: { severity: Annotation['severity']; ko: boolean }) {
  const cls = severity === 'major'
    ? 'bg-rose-100 text-rose-700'
    : severity === 'minor'
      ? 'bg-amber-100 text-amber-700'
      : 'bg-gray-100 text-gray-600'
  const label = severity === 'major'
    ? (ko ? '중요' : 'Major')
    : severity === 'minor'
      ? (ko ? '보통' : 'Minor')
      : (ko ? '경미' : 'Nit')
  return <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${cls}`}>{label}</span>
}

function labelFor(key: string, ko: boolean): string {
  const map: Record<string, [string, string]> = {
    development: ['Development & support', '전개와 근거'],
    organization: ['Organisation & coherence', '구조와 응집성'],
    language: ['Language use', '언어 사용'],
    delivery: ['Delivery', '전달력'],
    topic_development: ['Topic development', '주제 전개'],
    task_response: ['Task response', '과제 응답'],
    coherence_cohesion: ['Coherence & cohesion', '응집과 결속'],
    lexical_resource: ['Lexical resource', '어휘 자원'],
    grammatical_range: ['Grammatical range & accuracy', '문법 범위와 정확성'],
    fluency_coherence: ['Fluency & coherence', '유창성과 응집성'],
    pronunciation: ['Pronunciation', '발음'],
  }
  const pair = map[key]
  return pair ? (ko ? pair[1] : pair[0]) : key
}

function categoryLabel(cat: Annotation['category'], ko: boolean): string {
  const map: Record<Annotation['category'], [string, string]> = {
    grammar: ['Grammar', '문법'],
    vocabulary: ['Vocabulary', '어휘'],
    coherence: ['Coherence', '응집성'],
    task: ['Task', '과제'],
    pronunciation: ['Pronunciation', '발음'],
    delivery: ['Delivery', '전달력'],
  }
  return ko ? map[cat][1] : map[cat][0]
}

// ---------------------------------------------------------------------------
// Prompt bank + time-limit/target hints. Five prompts per
// (family, skill); random pick each load. Hand-curated to mirror the
// official test format without infringing on copyrighted prompts.
// ---------------------------------------------------------------------------
const PROMPT_BANK: Record<`${Family}_${Skill}`, string[]> = {
  toefl_writing: [
    'Some people prefer to live in a small town. Others prefer to live in a big city. Which place would you prefer to live in? Use specific reasons and details to support your answer.',
    'Do you agree or disagree with the following statement? Technology has made the world a better place to live. Use specific reasons and examples to support your opinion.',
    'Some students like classes where teachers lecture in class. Other students prefer classes where the students do some of the talking. Which type of class do you prefer? Explain why.',
    'It has recently been announced that a new restaurant may be built in your neighborhood. Do you support or oppose this plan? Why? Use specific reasons and details.',
    'Some people believe that university students should be required to attend classes. Others believe that going to classes should be optional for students. Which point of view do you agree with? Explain why.',
  ],
  toefl_speaking: [
    'Some students like to study alone. Others prefer to study with a group. Which do you prefer, and why?',
    'Talk about an important decision you have made recently. Explain why you made this decision and what the result was.',
    'Some people think that children should begin learning a foreign language as soon as they start school. Others believe children should learn a foreign language only when they reach secondary school. Which do you prefer, and why?',
    'If you could change one thing about your hometown, what would it be? Use specific reasons and examples.',
    'Do you prefer to receive feedback from a teacher in person, or in writing? Explain why with specific examples.',
  ],
  ielts_writing: [
    'Some people believe that universities should focus on providing academic skills, while others think they should also prepare students for their future careers. Discuss both views and give your own opinion.',
    'In many countries, the proportion of older people is steadily increasing. Does this trend have positive or negative effects on society? Give reasons and include relevant examples.',
    'Some people think that the best way to reduce crime is to give longer prison sentences. Others believe there are better alternatives. Discuss both views and give your opinion.',
    'Many people believe that social-networking sites have had a huge negative impact on both individuals and society. To what extent do you agree or disagree?',
    'It is often said that the main purpose of advertising is to inform consumers, but in reality it persuades them to buy things they do not need. To what extent do you agree or disagree?',
  ],
  ielts_speaking: [
    'Describe a skill you would like to learn. You should say: what the skill is, how you would learn it, how long it might take, and explain why you want to learn this skill.',
    'Describe a memorable journey you have taken. You should say: where you went, who you went with, what you did, and explain why it was memorable.',
    'Describe a book that had a strong influence on you. You should say: what it was, when you read it, what it was about, and explain how it influenced you.',
    'Describe a person who has had an important influence on your life. You should say: who the person is, how you know them, what they have done, and explain why they have influenced you.',
    'Describe a piece of technology you use every day. You should say: what it is, how often you use it, what you use it for, and explain how your life would change without it.',
  ],
}

const TIME_LIMITS: Record<`${Family}_${Skill}`, string> = {
  toefl_writing: '30 min',
  toefl_speaking: '15s prep · 45s response',
  ielts_writing: '40 min',
  ielts_speaking: '60s prep · 1–2 min response',
}

const TARGETS: Record<`${Family}_${Skill}`, string> = {
  toefl_writing: '300+ words',
  toefl_speaking: '~45s',
  ielts_writing: '250+ words',
  ielts_speaking: '1–2 min',
}

function pickPrompt(family: Family, skill: Skill): string {
  const bank = PROMPT_BANK[`${family}_${skill}`]
  return bank[Math.floor(Math.random() * bank.length)]
}
