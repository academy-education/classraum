"use client"

import { useEffect, useState } from 'react'
import { db } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { ModalShell } from '@/components/ui/common/ModalShell'
import { StatusPill, type StatusPillTone } from '@/components/ui/status-pill'
import { Calendar, Clock, MapPin, School, UserCheck, GraduationCap } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

/**
 * The session behind a camp assignment, opened from the date chip on the
 * Classrooms tab.
 *
 * Reads the same columns the sessions page shows, so a teacher who taps
 * a date is not sent to a different page to answer "which lesson was
 * that?". Attendance is counted here rather than listed — the point is
 * to confirm the lesson, not to take a register.
 */

interface CampSessionInfoProps {
  sessionId: string
  onClose: () => void
}

interface SessionRow {
  id: string
  date: string
  start_time: string | null
  end_time: string | null
  status: string | null
  location: string | null
  room_number: string | null
  notes: string | null
  classroom_id: string
}

const STATUS_TONES: Record<string, StatusPillTone> = {
  scheduled: 'blue',
  completed: 'emerald',
  cancelled: 'rose',
}

export function CampSessionInfo({ sessionId, onClose }: CampSessionInfoProps) {
  const { t, language } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [session, setSession] = useState<SessionRow | null>(null)
  const [classroomName, setClassroomName] = useState<string | null>(null)
  const [teacherName, setTeacherName] = useState<string | null>(null)
  const [present, setPresent] = useState<number | null>(null)

  useEffect(() => {
    let alive = true
    const load = async () => {
      setLoading(true)
      setError(false)
      try {
        const { data, error: e } = await db
          .from('classroom_sessions')
          .select('id, date, start_time, end_time, status, location, room_number, notes, classroom_id')
          .eq('id', sessionId)
          .maybeSingle()
        if (!alive) return
        if (e || !data) { setError(true); return }
        setSession(data as SessionRow)

        const { data: room } = await db
          .from('classrooms')
          .select('name, teacher_id')
          .eq('id', data.classroom_id)
          .maybeSingle()
        if (!alive) return
        setClassroomName(room?.name ?? null)

        if (room?.teacher_id) {
          const { data: teacher } = await db
            .from('users').select('name').eq('id', room.teacher_id).maybeSingle()
          if (alive) setTeacherName(teacher?.name ?? null)
        }

        // Count only — a head:true count cannot be truncated by the
        // 1000-row cap the way fetching the rows would be.
        const { count } = await db
          .from('attendance')
          .select('id', { count: 'exact', head: true })
          .eq('classroom_session_id', sessionId)
          .eq('status', 'present')
        if (alive) setPresent(count ?? null)
      } finally {
        if (alive) setLoading(false)
      }
    }
    void load()
    return () => { alive = false }
  }, [sessionId])

  const formatDate = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString(language === 'korean' ? 'ko-KR' : 'en-US', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
    })

  const rows: { icon: React.ReactNode; label: string; value: React.ReactNode }[] = session ? [
    {
      icon: <Calendar className="w-4 h-4" strokeWidth={1.75} />,
      label: String(t('camp.sessionInfo.date')),
      value: formatDate(session.date),
    },
    {
      icon: <Clock className="w-4 h-4" strokeWidth={1.75} />,
      label: String(t('camp.sessionInfo.time')),
      value: session.start_time
        ? `${session.start_time.slice(0, 5)}${session.end_time ? ` – ${session.end_time.slice(0, 5)}` : ''}`
        : '—',
    },
    {
      icon: <School className="w-4 h-4" strokeWidth={1.75} />,
      label: String(t('camp.sessionInfo.classroom')),
      value: classroomName ?? '—',
    },
    ...(teacherName ? [{
      icon: <GraduationCap className="w-4 h-4" strokeWidth={1.75} />,
      label: String(t('camp.sessionInfo.teacher')),
      value: teacherName,
    }] : []),
    {
      icon: <MapPin className="w-4 h-4" strokeWidth={1.75} />,
      label: String(t('camp.sessionInfo.location')),
      value: [
        session.location ? t(`camp.sessionInfo.${session.location}`) : null,
        session.room_number,
      ].filter(Boolean).join(' · ') || '—',
    },
    {
      icon: <UserCheck className="w-4 h-4" strokeWidth={1.75} />,
      label: String(t('camp.sessionInfo.attendance')),
      value: present && present > 0
        ? String(t('camp.sessionInfo.present', { n: present }))
        : <span className="text-gray-400">{t('camp.sessionInfo.noAttendance')}</span>,
    },
  ] : []

  return (
    <ModalShell
      isOpen
      onClose={onClose}
      size="sm"
      title={String(t('camp.sessionInfo.title'))}
      subtitle={session ? formatDate(session.date) : undefined}
      footer={
        <ModalShell.Footer>
          <Button variant="outline" onClick={onClose}>{t('common.close')}</Button>
        </ModalShell.Footer>
      }
    >
      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[...Array(5)].map((_, i) => <div key={i} className="h-9 bg-gray-100 rounded-lg" />)}
        </div>
      ) : error || !session ? (
        <p className="text-sm text-rose-600 py-3">{t('camp.sessionInfo.loadFailed')}</p>
      ) : (
        <div className="space-y-4">
          {session.status && (
            <StatusPill tone={STATUS_TONES[session.status] ?? 'gray'} size="md">
              {t(`sessions.${session.status}`)}
            </StatusPill>
          )}

          <dl className="divide-y divide-gray-100 rounded-xl ring-1 ring-gray-100 overflow-hidden">
            {rows.map(r => (
              <div key={r.label} className="flex items-center gap-3 px-4 py-2.5 bg-white">
                <span className="text-gray-400 flex-shrink-0">{r.icon}</span>
                <dt className="text-xs uppercase tracking-[0.08em] text-gray-400 w-24 flex-shrink-0">
                  {r.label}
                </dt>
                <dd className="text-sm text-gray-900 min-w-0 flex-1 tabular-nums">{r.value}</dd>
              </div>
            ))}
          </dl>

          {session.notes && (
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{session.notes}</p>
          )}
        </div>
      )}
    </ModalShell>
  )
}
