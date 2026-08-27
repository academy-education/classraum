"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/hooks/useTranslation'
import { useLanguage } from '@/contexts/LanguageContext'
import { useEffectiveUserId } from '@/hooks/useEffectiveUserId'
import { authHeaders } from '@/lib/auth-headers'
import { resolveCampSessionId, campSessionHref } from '@/lib/camp/open-assignment'
import type { StudentCampAssignment } from '@/lib/camp/student'
import { CheckCircle2, ChevronRight, Clock, ListChecks, Loader2, Tent } from 'lucide-react'

/**
 * "Camp" card for the GRADES surfaces (/mobile home, /mobile/assignments).
 *
 * WHY this exists, and why camp work is not merged into the assignments
 * list instead:
 *
 * A camp student's work lives in `camp_assignments` and is solved as a
 * bank-assembled study session, while the "My Assignments" page reads
 * the `assignments` table — academy homework, attached to a classroom
 * session, graded by a teacher into `assignment_grades`. They share a
 * word and nothing else: no session, no submission, no teacher grade, no
 * per-assignment detail route, and no place in the grade average or the
 * trend chart. Folding one into the other would have meant either
 * inventing empty columns for camp rows or quietly changing what
 * "Pending" and "Average grade" count.
 *
 * So the camp gets its own card that says what it is and links straight
 * through to the work. Before this, a camp-only student opened the app,
 * landed in Grades, and read "Pending assignments: 0" while their
 * teacher's dashboard showed three sets waiting — the app told them they
 * had no work.
 *
 * Self-hides for any student with no live camp assignment (which is
 * everyone outside a camp classroom), so an ordinary academy student's
 * home is byte-for-byte what it was.
 */

/** Outstanding work first — that is the point of the card — then the
 *  finished sets, most recent first (the API already orders by
 *  created_at desc within each state). */
function outstandingFirst(rows: StudentCampAssignment[]): StudentCampAssignment[] {
  const rank = (s: StudentCampAssignment['state']) =>
    s === 'in_progress' ? 0 : s === 'not_started' ? 1 : 2
  return [...rows].sort((a, b) => rank(a.state) - rank(b.state))
}

const PREVIEW_COUNT = 3

export function CampWorkCard({ className = 'mb-6' }: { className?: string }) {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const router = useRouter()
  const { effectiveUserId, isReady } = useEffectiveUserId()
  const ko = language === 'korean'

  const [rows, setRows] = useState<StudentCampAssignment[] | null>(null)
  const [startingId, setStartingId] = useState<string | null>(null)
  const [errorId, setErrorId] = useState<string | null>(null)

  useEffect(() => {
    if (!effectiveUserId || !isReady) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/camp/my-work?studentId=${effectiveUserId}`, {
          headers: await authHeaders(),
        })
        if (!res.ok) { if (!cancelled) setRows([]); return }
        const json = (await res.json()) as { assignments?: StudentCampAssignment[] }
        if (!cancelled) setRows(json.assignments ?? [])
      } catch {
        // A camp fetch failure must not break the Grades home: fall back
        // to "no camp", which is the pre-existing rendering.
        if (!cancelled) setRows([])
      }
    })()
    return () => { cancelled = true }
  }, [effectiveUserId, isReady])

  // No skeleton: this card is absent for most students, and a skeleton
  // that resolves to nothing is a worse flash than a card that appears.
  if (!rows || rows.length === 0) return null

  const ordered = outstandingFirst(rows)
  const todo = rows.filter(a => a.state !== 'done').length
  const preview = ordered.slice(0, PREVIEW_COUNT)
  const programNames = [...new Set(rows.map(a => a.campProgramName).filter(Boolean))] as string[]
  const heading = programNames.length === 1
    ? programNames[0]
    : String(t('mobile.campWork.multiPrograms', { count: programNames.length }))

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
    /* A SECTION, not a Card.
       This used to be a Card wrapping rows that were themselves cards —
       three nested rounded containers, each costing ~12px of padding a
       side. At 390px that is a fifth of the width spent on borders, and
       it is why the titles truncated. The camp is now a heading with
       flat rows under it, which is what the classroom groups below it
       already do. */
    <section className={className}>
      <div className="flex items-center gap-2 mb-2 px-0.5">
        <Tent className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" strokeWidth={2} />
        <p className="text-2xs font-semibold uppercase tracking-[0.09em] text-indigo-600 truncate">
          {heading}
        </p>
        <span className={`ml-auto flex-shrink-0 text-2xs font-semibold px-1.5 py-0.5 rounded-md tabular-nums ${
          todo > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
        }`}>
          {todo > 0
            ? String(t('mobile.campWork.toDo', { count: todo }))
            : String(t('mobile.campWork.allDone'))}
        </span>
      </div>

      <div className="space-y-2">
        {preview.map(a => {
          const done = a.state === 'done'
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
              // min-h-[56px]: tap target stays comfortable at 375 even
              // when the row is a single line of text.
              // min-h uses the 44px floor from globals; 56 keeps a
              // single-line row comfortable at 375px.
              className="flex items-center gap-3 w-full text-left rounded-xl ring-1 ring-gray-200 bg-white px-3.5 py-3 min-h-[56px] active:scale-[0.995] transition-all disabled:opacity-60"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-900 truncate leading-snug">
                  {a.title}
                </div>
                {from && <div className="text-2xs text-gray-500 truncate mt-0.5">{from}</div>}
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  {/* Status first, then the due date, then the count.
                      A student scans for "is this done / when is it due";
                      the question count is the least useful number here
                      and used to lead the row. */}
                  {done ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-2xs font-semibold text-emerald-700 tabular-nums">
                      <CheckCircle2 className="w-3 h-3" />
                      {a.correctCount != null && a.totalCount != null
                        ? String(t('study.camp.doneWithScore', { correct: a.correctCount, total: a.totalCount }))
                        : String(t('study.camp.done'))}
                    </span>
                  ) : a.state === 'in_progress' ? (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-blue-50 text-2xs font-semibold text-blue-700">
                      {String(t('study.camp.inProgress'))}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-gray-100 text-2xs font-medium text-gray-600">
                      {String(t('study.camp.notStarted'))}
                    </span>
                  )}
                  {dueLabel && !done && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 text-2xs font-medium text-amber-700 tabular-nums">
                      <Clock className="w-3 h-3 opacity-70" />
                      {String(t('study.camp.due', { date: dueLabel }))}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gray-100 text-2xs font-medium text-gray-500 tabular-nums">
                    <ListChecks className="w-3 h-3 opacity-70" />
                    {String(t('study.camp.questionCount', { count: a.questionCount }))}
                  </span>
                </div>
                {errorId === a.id && (
                  <div className="text-2xs text-red-600 mt-1">{String(t('study.camp.startFailed'))}</div>
                )}
              </div>
              {busy
                ? <Loader2 className="w-4 h-4 text-gray-400 animate-spin flex-shrink-0" />
                : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
            </button>
          )
        })}
      </div>

      {rows.length > PREVIEW_COUNT && (
        <button
          type="button"
          onClick={() => router.push('/mobile/study')}
          className="mt-3 w-full min-h-[44px] rounded-xl text-sm font-semibold text-primary hover:bg-primary/[0.06] transition-colors"
        >
          {String(t('mobile.campWork.viewAll', { count: rows.length }))}
        </button>
      )}
    </section>
  )
}
