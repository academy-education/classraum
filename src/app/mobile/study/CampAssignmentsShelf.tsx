"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  GraduationCap, ArrowRight, Clock, CheckCircle2, Loader2, ListChecks,
} from '@/app/mobile/study/_shared/icons'
import { useTranslation } from '@/hooks/useTranslation'
import { resolveCampSessionId, campSessionHref } from '@/lib/camp/open-assignment'
import { useLandingData } from './LandingDataProvider'
import type { StudentCampAssignment } from '@/lib/camp/student'

/**
 * "From your teacher" shelf on the study landing — camp assignments
 * delivered into Study mode.
 *
 * Data comes from the batched landing payload (LandingDataProvider),
 * so the shelf paints with the rest of the page. Self-hides when the
 * student has no live camp assignments (i.e. for everyone outside a
 * camp classroom) — same convention as ResumableShelf.
 *
 * Tap behavior:
 *   not started  → POST /api/study/camp/start (idempotent) → session
 *   in progress / done → straight to the existing session (the session
 *   page shows the review screen for completed full tests).
 */
export function CampAssignmentsShelf() {
  const { t, language } = useTranslation()
  const router = useRouter()
  const landing = useLandingData()
  const ko = language === 'korean'
  const [startingId, setStartingId] = useState<string | null>(null)
  const [errorId, setErrorId] = useState<string | null>(null)

  const rows = landing?.campAssignments ?? []
  if (rows.length === 0) return null

  // Start/resume lives in src/lib/camp/open-assignment.ts — the Camp card
  // on the Grades surfaces opens the same assignments and must not carry
  // a second copy of this rule.
  const open = async (a: StudentCampAssignment) => {
    if (startingId) return
    setStartingId(a.id)
    setErrorId(null)
    const sessionId = await resolveCampSessionId(a)
    setStartingId(null)
    if (!sessionId) { setErrorId(a.id); return }
    router.push(campSessionHref(sessionId))
  }

  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-[17px] font-semibold tracking-tight text-gray-900">
          {String(t('study.camp.shelfTitle'))}
        </h2>
      </div>
      <div className="space-y-2">
        {rows.map(a => {
          const done = a.state === 'done'
          const inProgress = a.state === 'in_progress'
          const busy = startingId === a.id
          const dueLabel = a.dueAt
            ? new Date(a.dueAt).toLocaleDateString(ko ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric' })
            : null
          const from = [a.teacherName, a.classroomName].filter(Boolean).join(' · ')
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => void open(a)}
              disabled={busy}
              className="group flex items-center gap-3 w-full text-left rounded-2xl bg-gradient-to-br from-blue-50/60 via-white to-white ring-1 ring-blue-100 px-4 py-3 hover:ring-primary/40 hover:shadow-[0_2px_8px_-4px_rgba(40,133,232,0.15)] active:scale-[0.995] transition-all disabled:opacity-60"
            >
              <div className="flex-shrink-0 w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center ring-1 ring-black/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]">
                {done
                  ? <CheckCircle2 className="w-5 h-5" strokeWidth={2.25} />
                  : <GraduationCap className="w-5 h-5" strokeWidth={2.25} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14.5px] font-semibold text-gray-900 truncate leading-snug">
                  {a.title}
                </div>
                {from && (
                  <div className="text-[11.5px] text-gray-500 truncate mt-0.5">{from}</div>
                )}
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gray-100 text-[11px] font-medium text-gray-600 tabular-nums">
                    <ListChecks className="w-3 h-3 opacity-70" />
                    {String(t('study.camp.questionCount', { count: a.questionCount }))}
                  </span>
                  {dueLabel && !done && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 text-[11px] font-medium text-amber-700 tabular-nums">
                      <Clock className="w-3 h-3 opacity-70" />
                      {String(t('study.camp.due', { date: dueLabel }))}
                    </span>
                  )}
                  {done ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-[11px] font-semibold text-emerald-700 tabular-nums">
                      {a.correctCount != null && a.totalCount != null
                        ? String(t('study.camp.doneWithScore', { correct: a.correctCount, total: a.totalCount }))
                        : String(t('study.camp.done'))}
                    </span>
                  ) : inProgress ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 text-[11px] font-semibold text-blue-700">
                      {String(t('study.camp.inProgress'))}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gray-100 text-[11px] font-medium text-gray-600">
                      {String(t('study.camp.notStarted'))}
                    </span>
                  )}
                </div>
                {errorId === a.id && (
                  <div className="text-[11px] text-red-600 mt-1">{String(t('study.camp.startFailed'))}</div>
                )}
              </div>
              {busy
                ? <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                : <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />}
            </button>
          )
        })}
      </div>
    </section>
  )
}
