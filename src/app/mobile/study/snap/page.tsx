"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Camera, Image as ImageIcon, Loader2, RefreshCw, Sparkles, CheckCircle2, X, AlertCircle, ListChecks, Bookmark, BookmarkCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/hooks/useTranslation'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { authHeaders } from '@/lib/auth-headers'
import { PathMascot } from '../_shared/PathMascot'
import { StudySubscriptionGate } from '../SubscriptionGate'
import { StudyPageHeader, StudyEmptyState, StudyPageTransition } from '../_shared/primitives'
import { useStudyErrorToast, startFailedMessage } from '../_shared/useStudyErrorToast'

/**
 * /mobile/study/snap — Snap-a-Photo problem solver.
 *
 * Flow:
 *   pick   — file/camera picker (defaults to rear camera on mobile)
 *   review — preview the picked image with "Solve" / "Retake" CTAs
 *   solving — spinner
 *   result  — extracted question text + numbered solution steps + final answer
 *   error   — recoverable failure
 *
 * QANDA-style flagship feature for the Korean K-12 market. v1 is upload
 * + gpt-4o vision; later we'll add "practice similar problems" and
 * 오답노트 integration when the student says "I got this wrong."
 */

interface SolutionStep { label: string; detail: string }
interface SolveResult {
  isQuestionDetected: boolean
  ocrText: string
  subjectGuess: string
  solutionSteps: SolutionStep[]
  finalAnswer: string
  confidence: 'low' | 'medium' | 'high'
}

interface SolveResponse {
  captureId: string | null
  imagePath: string | null
  result: SolveResult
}

type Stage = 'pick' | 'review' | 'solving' | 'result' | 'error'

export default function SnapPage() {
  return (
    <StudySubscriptionGate>
      <SnapInner />
    </StudySubscriptionGate>
  )
}

function SnapInner() {
  const { t, language } = useTranslation()
  const ko = language === 'korean'
  const [stage, setStage] = useState<Stage>('pick')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [result, setResult] = useState<SolveResult | null>(null)
  const [captureId, setCaptureId] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [dailyLimited, setDailyLimited] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const handlePick = (f: File) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(f)
    setPreviewUrl(URL.createObjectURL(f))
    setStage('review')
  }

  // Reopen a past capture's saved solution from the "Recent captures"
  // grid — the tiles were dead ends before this.
  const openCapture = (cap: SnapHistory) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(null)
    setPreviewUrl(cap.image_url)
    setResult({
      isQuestionDetected: true,
      ocrText: cap.ocr_text,
      subjectGuess: cap.subject_guess,
      solutionSteps: cap.solution_steps,
      finalAnswer: cap.final_answer,
      confidence: 'medium',
    })
    setCaptureId(cap.id)
    setStage('result')
  }

  const reset = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(null)
    setPreviewUrl(null)
    setResult(null)
    setCaptureId(null)
    setErr(null)
    setStage('pick')
  }, [previewUrl])

  const solve = async () => {
    if (!file) return
    setStage('solving')
    setErr(null)
    setDailyLimited(false)
    try {
      const headers = await authHeaders()
      const form = new FormData()
      form.append('image', file, file.name || 'snap.jpg')
      form.append('language', ko ? 'ko' : 'en')
      const { Authorization } = headers as { Authorization?: string }
      const res = await fetch('/api/study/snap/solve', {
        method: 'POST',
        headers: Authorization ? { Authorization } : {},
        body: form,
      })
      const json = await res.json()
      if (!res.ok) {
        if (json?.code === 'daily_limit') {
          setErr(ko
            ? `오늘 스냅 풀이 ${json.limit ?? 5}회를 모두 사용했어요. 프리미엄으로 업그레이드하면 무제한으로 이용할 수 있어요.`
            : `You've used all ${json.limit ?? 5} snap solves for today. Upgrade to Premium for unlimited snaps.`)
          setDailyLimited(true)
        } else {
          setErr(json?.error ?? 'solve failed')
        }
        setStage('error')
        return
      }
      const typed = json as SolveResponse
      setResult(typed.result)
      setCaptureId(typed.captureId)
      setStage('result')
    } catch (e) {
      console.error(e)
      setErr(String(e))
      setStage('error')
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex-1 overflow-y-auto">
        <StudyPageHeader
          icon={Camera}
          iconColorClass="text-amber-600 bg-amber-50"
          eyebrow={String(t('study.snap.eyebrow'))}
          title={String(t('study.snap.title'))}
        />
        <div className="max-w-3xl lg:max-w-6xl 2xl:max-w-[1600px] mx-auto px-5 lg:px-8 pt-6 pb-14">
        <StudyPageTransition>
        {stage === 'pick' && (
          <PickerStage
            ko={ko}
            onCameraClick={() => cameraInputRef.current?.click()}
            onUploadClick={() => inputRef.current?.click()}
            onOpenCapture={openCapture}
          />
        )}
        {stage === 'review' && previewUrl && (
          <ReviewStage previewUrl={previewUrl} onSolve={solve} onRetake={reset} ko={ko} />
        )}
        {stage === 'solving' && <SolvingStage ko={ko} />}
        {stage === 'result' && result && previewUrl && (
          <ResultStage result={result} captureId={captureId} previewUrl={previewUrl} onAnother={reset} ko={ko} languageHint={language} />
        )}
        {stage === 'error' && (
          <ErrorStage message={err} ko={ko} onRetry={() => setStage('review')} onReset={reset} upsell={dailyLimited} />
        )}
        </StudyPageTransition>
        </div>
      </div>

      {/* Camera capture — uses rear camera on mobile via capture="environment". */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handlePick(f); e.target.value = '' }}
      />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handlePick(f); e.target.value = '' }}
      />
    </div>
  )
}

interface SnapHistory {
  id: string
  image_url: string | null
  ocr_text: string
  subject_guess: string
  final_answer: string
  solution_steps: SolutionStep[]
  created_at: string
}

function PickerStage({ ko, onCameraClick, onUploadClick, onOpenCapture }: {
  ko: boolean
  onCameraClick: () => void
  onUploadClick: () => void
  onOpenCapture: (cap: SnapHistory) => void
}) {
  const [history, setHistory] = useState<SnapHistory[] | null>(null)
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const headers = await authHeaders()
        const res = await fetch('/api/study/snap/history', { headers })
        if (!res.ok) throw new Error()
        const json = await res.json()
        if (!cancelled) setHistory((json.captures ?? []) as SnapHistory[])
      } catch {
        if (!cancelled) setHistory([])
      }
    })()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 text-white p-5 shadow-[0_8px_24px_-8px_rgba(251,146,60,0.45)]">
        <Sparkles className="w-6 h-6 mb-2 opacity-90" />
        <h2 className="text-[17px] font-semibold leading-snug">
          {ko ? '문제를 찍으면 풀이가 나옵니다' : 'Snap a problem, get a solution'}
        </h2>
        <p className="text-[13px] opacity-90 mt-1.5 leading-relaxed">
          {ko ? '수학, 과학, 영어 — 사진 한 장이면 충분합니다.' : 'Math, science, English — one photo is enough.'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={onCameraClick}
          className="rounded-2xl bg-white ring-1 ring-gray-200 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-5 text-center hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] transition-all">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 text-white flex items-center justify-center mx-auto mb-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_4px_8px_rgba(0,0,0,0.10)]">
            <Camera className="w-5 h-5" />
          </div>
          <div className="text-[14px] font-semibold text-gray-900">{ko ? '카메라로 찍기' : 'Use camera'}</div>
          <div className="text-[11px] text-gray-500 mt-1">{ko ? '바로 촬영' : 'Snap now'}</div>
        </button>
        <button type="button" onClick={onUploadClick}
          className="rounded-2xl bg-white ring-1 ring-gray-200 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-5 text-center hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] transition-all">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white flex items-center justify-center mx-auto mb-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_4px_8px_rgba(0,0,0,0.10)]">
            <ImageIcon className="w-5 h-5" />
          </div>
          <div className="text-[14px] font-semibold text-gray-900">{ko ? '갤러리에서 선택' : 'From library'}</div>
          <div className="text-[11px] text-gray-500 mt-1">{ko ? '저장된 이미지' : 'Pick an image'}</div>
        </button>
      </div>

      <div className="rounded-xl bg-gray-50 ring-1 ring-gray-200 p-3 text-[12px] text-gray-600 leading-relaxed">
        <span className="font-medium text-gray-800">{ko ? '팁: ' : 'Tips: '}</span>
        {ko ? '문제 전체가 잘 보이게, 흔들리지 않게 찍어주세요. 손글씨도 잘 인식돼요.' : 'Capture the full problem clearly without blur. Handwriting works too.'}
      </div>

      {history && history.length > 0 && (
        <section className="pt-2">
          <h3 className="text-[13px] font-semibold text-gray-900 mb-2 px-1">
            {ko ? '최근 사진' : 'Recent captures'}
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {history.slice(0, 6).map((cap, i) => {
              const openable = !!cap.image_url && cap.solution_steps.length > 0
              return (
                <button
                  key={cap.id}
                  type="button"
                  disabled={!openable}
                  onClick={() => openable && onOpenCapture(cap)}
                  aria-label={ko ? '저장된 풀이 다시 보기' : 'Reopen saved solution'}
                  style={{ animationDelay: `${i * 50}ms` }}
                  className={`relative rounded-xl overflow-hidden ring-1 ring-gray-200 bg-white aspect-square animate-card-in opacity-0 text-left ${
                    openable ? 'hover:ring-amber-300 active:scale-[0.97] transition-all' : 'cursor-default'
                  }`}
                >
                  {cap.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cap.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-50">
                      <ImageIcon className="w-5 h-5 text-gray-300" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-white truncate">
                      {SUBJECT_LABEL[cap.subject_guess]?.[ko ? 1 : 0] ?? cap.subject_guess}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}

const SUBJECT_LABEL: Record<string, [string, string]> = {
  math: ['Math', '수학'],
  physics: ['Physics', '물리'],
  chemistry: ['Chemistry', '화학'],
  biology: ['Biology', '생물'],
  english: ['English', '영어'],
  korean: ['Korean', '국어'],
  social_studies: ['Social', '사회'],
  history: ['History', '역사'],
  other: ['Other', '기타'],
}

function ReviewStage({ previewUrl, onSolve, onRetake, ko }: { previewUrl: string; onSolve: () => void; onRetake: () => void; ko: boolean }) {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-black overflow-hidden ring-1 ring-gray-300">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={previewUrl} alt="captured problem" className="w-full max-h-[60vh] object-contain bg-black" />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onRetake}
          className="flex-1 h-11 rounded-xl bg-white ring-1 ring-gray-200 text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition inline-flex items-center justify-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" />{ko ? '다시 찍기' : 'Retake'}
        </button>
        <button type="button" onClick={onSolve}
          className="flex-[1.4] h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white text-[14px] font-semibold hover:opacity-95 transition inline-flex items-center justify-center gap-1.5">
          <Sparkles className="w-4 h-4" />{ko ? '풀이 보기' : 'Solve'}
        </button>
      </div>
    </div>
  )
}

function SolvingStage({ ko }: { ko: boolean }) {
  return (
    <div className="py-16 text-center">
      <div className="flex justify-center mb-3"><PathMascot state="thinking" size={96} /></div>
      <p className="text-[14px] font-medium text-gray-900">{ko ? '문제를 읽고 푸는 중…' : 'Reading and solving the problem…'}</p>
      <p className="text-[12px] text-gray-500 mt-1.5">{ko ? '보통 5–15초 걸려요.' : 'Typically 5–15 seconds.'}</p>
    </div>
  )
}

function ResultStage({ result, captureId, previewUrl, onAnother, ko, languageHint }: {
  result: SolveResult; captureId: string | null; previewUrl: string; onAnother: () => void; ko: boolean; languageHint: string
}) {
  const router = useRouter()
  const { user } = usePersistentMobileAuth()
  const [practiceLoading, setPracticeLoading] = useState(false)
  const { errorToast, showError } = useStudyErrorToast()
  const [bookmarked, setBookmarked] = useState(false)
  const toggleBookmark = async () => {
    if (!captureId) return
    const next = !bookmarked
    setBookmarked(next)  // optimistic
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/study/snap/bookmark', {
        method: 'POST',
        headers,
        body: JSON.stringify({ captureId, bookmarked: next }),
      })
      // Server rejection must roll back too — without this a 4xx/5xx
      // left the button showing "Saved" while nothing persisted.
      if (!res.ok) throw new Error()
    } catch {
      setBookmarked(!next)  // rollback
      showError(ko ? '저장하지 못했어요. 다시 시도해 주세요.' : "Couldn't save. Please try again.")
    }
  }
  const startPracticeSimilar = async () => {
    if (!user?.userId || practiceLoading) return
    setPracticeLoading(true)
    // Seed a freeform topic from subject + a short slug of the OCR text.
    // The existing practice generator handles topic_freeform, so we get
    // fresh similar items for free — no new generator needed.
    const subjectLabel = SUBJECT_LABEL[result.subjectGuess]?.[ko ? 1 : 0] ?? result.subjectGuess
    const snippet = result.ocrText.trim().slice(0, 90)
    const topicFreeform = ko
      ? `${subjectLabel} 사진 문제 후속: ${snippet}`
      : `${subjectLabel} snap follow-up: ${snippet}`
    const { data, error } = await supabase
      .from('study_sessions')
      .insert({
        student_id: user.userId,
        topic_id: null,
        topic_freeform: topicFreeform,
        mode: 'practice',
        language: languageHint === 'korean' ? 'ko' : 'en',
        config: { questionCount: 5, difficultyBias: 'similar' },
      })
      .select('id')
      .single()
    if (error || !data) {
      setPracticeLoading(false)
      showError(startFailedMessage(ko))
      return
    }
    router.push(`/mobile/study/session/${data.id}`)
  }
  if (!result.isQuestionDetected) {
    return (
      <div className="space-y-3">
        {errorToast}
        <div className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 p-4 text-[13px] text-amber-800">
          <AlertCircle className="w-4 h-4 inline mr-1.5" />
          {ko ? '문제를 명확하게 인식하지 못했어요. 더 가까이서, 흔들림 없이 다시 찍어보세요.' : 'Could not clearly detect a question. Try a closer, sharper shot.'}
        </div>
        <button type="button" onClick={onAnother}
          className="w-full h-11 rounded-xl bg-gradient-to-b from-primary to-primary/90 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_8px_rgba(40,133,232,0.28)] text-[14px] font-semibold inline-flex items-center justify-center gap-1.5">
          <Camera className="w-4 h-4" />{ko ? '다시 찍기' : 'Try again'}
        </button>
      </div>
    )
  }
  return (
    <div className="space-y-4">
      {/* Compact preview thumbnail of the captured image. */}
      <details className="rounded-xl bg-white ring-1 ring-gray-200/70 overflow-hidden">
        <summary className="cursor-pointer px-3 py-2 text-[12px] font-medium text-gray-700 inline-flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5" />{ko ? '내가 찍은 사진' : 'My capture'}
        </summary>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={previewUrl} alt="captured" className="w-full max-h-[40vh] object-contain bg-black" />
      </details>

      <section>
        <div className="flex items-center justify-between mb-2 px-1">
          <h3 className="text-[11px] font-semibold tracking-[0.12em] uppercase text-gray-500">
            {ko ? '문제' : 'Question'}
          </h3>
          {captureId && (
            <button type="button" onClick={() => void toggleBookmark()}
              aria-pressed={bookmarked}
              className={`inline-flex items-center gap-1 px-2.5 h-7 rounded-full text-[11px] font-semibold transition ${
                bookmarked
                  ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-200'
                  : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'
              }`}>
              {bookmarked
                ? <BookmarkCheck className="w-3.5 h-3.5" />
                : <Bookmark className="w-3.5 h-3.5" />}
              {bookmarked
                ? (ko ? '오답노트에 저장됨' : 'Saved to notebook')
                : (ko ? '오답노트에 저장' : 'Save to notebook')}
            </button>
          )}
        </div>
        <div className="rounded-2xl bg-white ring-1 ring-gray-200/70 p-4">
          <p className="text-[14px] text-gray-900 leading-relaxed whitespace-pre-line">{result.ocrText}</p>
          <div className="mt-3 flex items-center gap-2">
            <SubjectBadge subject={result.subjectGuess} ko={ko} />
            <ConfidenceBadge confidence={result.confidence} ko={ko} />
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-[11px] font-semibold tracking-[0.12em] uppercase text-gray-500 mb-2">
          {ko ? '풀이' : 'Solution'}
        </h3>
        <ol className="space-y-2">
          {result.solutionSteps.map((s, i) => (
            <li key={i} className="rounded-xl bg-white ring-1 ring-gray-200/70 p-3.5 flex gap-3">
              <span className="flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-50 ring-1 ring-amber-100 text-amber-700 text-[11px] font-bold tabular-nums">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-gray-900 mb-1">{s.label}</div>
                <p className="text-[12.5px] text-gray-700 leading-relaxed whitespace-pre-line">{s.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h3 className="text-[11px] font-semibold tracking-[0.12em] uppercase text-emerald-700 mb-2">
          {ko ? '정답' : 'Final answer'}
        </h3>
        <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 ring-1 ring-emerald-200 p-4 inline-flex items-start gap-2 max-w-full">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
          <span className="text-[15px] font-semibold text-emerald-900 break-words">{result.finalAnswer}</span>
        </div>
      </section>

      {/* Practice-similar — the close-the-loop CTA. Generates 5 fresh
          questions on the same subject so the student converts a one-shot
          answer into actual learning. Visually loud because it's the
          highest-value next action after seeing the solution. */}
      <button type="button" onClick={() => void startPracticeSimilar()}
        disabled={practiceLoading}
        className="w-full h-12 rounded-2xl bg-gradient-to-b from-primary to-primary/90 text-white text-[14px] font-semibold inline-flex items-center justify-center gap-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_4px_12px_-4px_rgba(40,133,232,0.45)] hover:opacity-95 active:scale-[0.98] disabled:opacity-60 transition-all">
        {practiceLoading
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <ListChecks className="w-4 h-4" />}
        {ko ? '유사 문제 5개 풀기' : 'Practice 5 similar'}
      </button>

      <button type="button" onClick={onAnother}
        className="w-full h-11 rounded-xl bg-white ring-1 ring-gray-200 text-gray-800 text-[14px] font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-gray-50 transition">
        <Camera className="w-4 h-4" />{ko ? '다른 문제 찍기' : 'Snap another'}
      </button>
    </div>
  )
}

function ErrorStage({ message, ko, onRetry, onReset, upsell }: { message: string | null; ko: boolean; onRetry: () => void; onReset: () => void; upsell?: boolean }) {
  return (
    <div className="py-12 text-center">
      <AlertCircle className="w-7 h-7 text-rose-500 mx-auto mb-2" />
      <p className="text-[14px] font-medium text-gray-900">
        {upsell
          ? (ko ? '오늘은 여기까지!' : 'That’s all for today!')
          : (ko ? '풀이를 가져오지 못했어요' : 'Could not get a solution')}
      </p>
      <p className="text-[12px] text-gray-500 mt-1.5 max-w-xs mx-auto">{message ?? ''}</p>
      <div className="mt-4 flex items-center justify-center gap-2">
        <button type="button" onClick={onReset}
          className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-white ring-1 ring-gray-200 text-gray-700 text-[13px] font-medium hover:bg-gray-50 transition">
          <X className="w-4 h-4 mr-1" />{ko ? '취소' : 'Cancel'}
        </button>
        {upsell ? (
          <Link href="/mobile/study/subscription"
            className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-violet-600 text-white text-[13px] font-medium">
            <Sparkles className="w-4 h-4 mr-1" />{ko ? '프리미엄 알아보기' : 'See Premium'}
          </Link>
        ) : (
          <button type="button" onClick={onRetry}
            className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-gray-900 text-white text-[13px] font-medium">
            <RefreshCw className="w-4 h-4 mr-1" />{ko ? '다시 시도' : 'Retry'}
          </button>
        )}
      </div>
    </div>
  )
}

function SubjectBadge({ subject, ko }: { subject: string; ko: boolean }) {
  const map: Record<string, [string, string, string]> = {
    math: ['Math', '수학', 'bg-sky-100 text-sky-700'],
    physics: ['Physics', '물리', 'bg-indigo-100 text-indigo-700'],
    chemistry: ['Chemistry', '화학', 'bg-emerald-100 text-emerald-700'],
    biology: ['Biology', '생물', 'bg-teal-100 text-teal-700'],
    english: ['English', '영어', 'bg-rose-100 text-rose-700'],
    korean: ['Korean', '국어', 'bg-amber-100 text-amber-700'],
    social_studies: ['Social studies', '사회', 'bg-orange-100 text-orange-700'],
    history: ['History', '역사', 'bg-yellow-100 text-yellow-700'],
    other: ['Other', '기타', 'bg-gray-100 text-gray-700'],
  }
  const [en, k, cls] = map[subject] ?? map.other
  return <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${cls}`}>{ko ? k : en}</span>
}

function ConfidenceBadge({ confidence, ko }: { confidence: 'low' | 'medium' | 'high'; ko: boolean }) {
  const cls = confidence === 'high'
    ? 'bg-emerald-100 text-emerald-700'
    : confidence === 'medium'
      ? 'bg-amber-100 text-amber-700'
      : 'bg-gray-100 text-gray-600'
  const label = confidence === 'high'
    ? (ko ? '확신 높음' : 'High confidence')
    : confidence === 'medium'
      ? (ko ? '보통' : 'Medium')
      : (ko ? '확신 낮음 — 검토 권장' : 'Low — please double-check')
  return <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${cls}`}>{label}</span>
}
