/**
 * Localized sample data for help-center demos.
 *
 * Centralizing here so the demos all show consistent fake students /
 * classrooms / families / payments — and so swapping the user's language
 * cleanly swaps the in-demo content too (Korean names with Korean,
 * English names with English).
 *
 * The shape mirrors what each demo needs; not every consumer uses
 * every field.
 */

import type { Teacher, Student as ClassroomStudent } from '@/components/ui/classrooms/hooks/useClassroomsData'
import type { Student as ReportsStudent } from '@/hooks/useReports'

type Lang = 'english' | 'korean'

function pick<T>(lang: string | undefined, en: T, ko: T): T {
  return lang === 'korean' ? ko : en
}

// ─── Classrooms ───────────────────────────────────────────────────────────

export interface DemoClassroom {
  name: string
  teacher: string
  students: number
  grade: string
  subject: string
  color: string
  schedule: string[]
}

export function getClassrooms(lang: Lang | string | undefined): DemoClassroom[] {
  return [
    {
      name: pick(lang, 'Grade 4 Math', '4학년 수학'),
      teacher: pick(lang, 'Ms. Kim', '김선생님'),
      students: 12,
      grade: pick(lang, 'Grade 4', '4학년'),
      subject: pick(lang, 'Mathematics', '수학'),
      color: '#3b82f6',
      schedule: pick(
        lang,
        ['Mon · 4:00 PM – 5:30 PM', 'Wed · 4:00 PM – 5:30 PM'],
        ['월 · 오후 4:00 – 5:30', '수 · 오후 4:00 – 5:30']
      ),
    },
    {
      name: pick(lang, 'Grade 5 English', '5학년 영어'),
      teacher: pick(lang, 'Mr. Park', '박선생님'),
      students: 8,
      grade: pick(lang, 'Grade 5', '5학년'),
      subject: pick(lang, 'English', '영어'),
      color: '#f59e0b',
      schedule: pick(lang, ['Tue · 5:30 PM – 7:00 PM'], ['화 · 오후 5:30 – 7:00']),
    },
    {
      name: pick(lang, 'SAT Prep', 'SAT 준비반'),
      teacher: pick(lang, 'Ms. Lee', '이선생님'),
      students: 15,
      grade: pick(lang, 'High school', '고등학교'),
      subject: pick(lang, 'Test prep', '시험 대비'),
      color: '#10b981',
      schedule: pick(lang, ['Sat · 9:00 AM – 12:00 PM'], ['토 · 오전 9:00 – 12:00']),
    },
  ]
}

// ─── Teachers + students (for the ClassroomCreate / SessionForm demos) ────

export function getTeachers(lang: Lang | string | undefined): Teacher[] {
  return pick<Teacher[]>(
    lang,
    [
      { id: 't1', name: 'Ms. Kim', user_id: 'u1' },
      { id: 't2', name: 'Mr. Park', user_id: 'u2' },
      { id: 't3', name: 'Ms. Lee', user_id: 'u3' },
    ],
    [
      { id: 't1', name: '김선생님', user_id: 'u1' },
      { id: 't2', name: '박선생님', user_id: 'u2' },
      { id: 't3', name: '이선생님', user_id: 'u3' },
    ]
  )
}

export function getStudents(lang: Lang | string | undefined): ClassroomStudent[] {
  return pick<ClassroomStudent[]>(
    lang,
    [
      { id: 's1', name: 'Alice Park', user_id: 'su1', school_name: 'Daewon Elementary' },
      { id: 's2', name: 'Brian Cho', user_id: 'su2', school_name: 'Seoul Foreign' },
      { id: 's3', name: 'Chloe Lim', user_id: 'su3', school_name: 'Daewon Elementary' },
      { id: 's4', name: 'Daniel Han', user_id: 'su4', school_name: 'KIS Jeju' },
    ],
    [
      { id: 's1', name: '박앨리스', user_id: 'su1', school_name: '대원초등학교' },
      { id: 's2', name: '조브라이언', user_id: 'su2', school_name: '서울외국인학교' },
      { id: 's3', name: '임클로이', user_id: 'su3', school_name: '대원초등학교' },
      { id: 's4', name: '한다니엘', user_id: 'su4', school_name: 'KIS 제주' },
    ]
  )
}

// ─── Reports demo's narrower Student shape ────────────────────────────────

export function getReportStudents(lang: Lang | string | undefined): ReportsStudent[] {
  return pick<ReportsStudent[]>(
    lang,
    [
      { user_id: 'r1', name: 'Alice Park', email: 'alice@example.com', school_name: 'Daewon Elementary' },
      { user_id: 'r2', name: 'Brian Cho', email: 'brian@example.com', school_name: 'Seoul Foreign' },
      { user_id: 'r3', name: 'Chloe Lim', email: 'chloe@example.com', school_name: 'Daewon Elementary' },
    ],
    [
      { user_id: 'r1', name: '박앨리스', email: 'alice@example.com', school_name: '대원초등학교' },
      { user_id: 'r2', name: '조브라이언', email: 'brian@example.com', school_name: '서울외국인학교' },
      { user_id: 'r3', name: '임클로이', email: 'chloe@example.com', school_name: '대원초등학교' },
    ]
  )
}

// ─── Families ─────────────────────────────────────────────────────────────

export interface DemoFamily {
  name: string
  parent: string
  parentEmail: string
  parentPhone: string
  students: { name: string; grade: string }[]
}

export function getFamilies(lang: Lang | string | undefined): DemoFamily[] {
  return [
    {
      name: pick(lang, 'Park family', '박씨 가족'),
      parent: pick(lang, 'Mr. & Mrs. Park', '박○○ · 박○○'),
      parentEmail: 'mrpark@example.com',
      parentPhone: '+82 10-1111-1111',
      students: pick(
        lang,
        [{ name: 'Alice Park', grade: 'Grade 4' }],
        [{ name: '박앨리스', grade: '4학년' }]
      ),
    },
    {
      name: pick(lang, 'Cho family', '조씨 가족'),
      parent: pick(lang, 'Mrs. Cho', '조○○'),
      parentEmail: 'mscho@example.com',
      parentPhone: '+82 10-2222-2222',
      students: pick(
        lang,
        [
          { name: 'Brian Cho', grade: 'Grade 5' },
          { name: 'Bella Cho', grade: 'Grade 3' },
        ],
        [
          { name: '조브라이언', grade: '5학년' },
          { name: '조벨라', grade: '3학년' },
        ]
      ),
    },
    {
      name: pick(lang, 'Lim family', '임씨 가족'),
      parent: pick(lang, 'Mr. Lim', '임○○'),
      parentEmail: 'mrlim@example.com',
      parentPhone: '+82 10-3333-3333',
      students: pick(
        lang,
        [{ name: 'Chloe Lim', grade: 'Grade 4' }],
        [{ name: '임클로이', grade: '4학년' }]
      ),
    },
  ]
}

// ─── Payments / invoices ──────────────────────────────────────────────────

// Mirrors usePaymentData's Invoice shape — PaymentStats imports from
// there. InvoiceTable defines its own narrower Invoice internally; the
// caller (PaymentsListDemo) casts at that boundary.
export interface DemoInvoice {
  id: string
  student_id: string
  student_name: string
  student_email: string
  invoice_name: string
  amount: number
  discount_amount: number
  final_amount: number
  due_date: string
  status: 'pending' | 'paid' | 'overdue' | 'cancelled'
  paid_at?: string
  refunded_amount: number
  created_at: string
}

export function getInvoices(lang: Lang | string | undefined): DemoInvoice[] {
  const tuition = pick(lang, 'March 2026 tuition', '2026년 3월 수강료')
  const base = {
    discount_amount: 0,
    refunded_amount: 0,
    created_at: '2026-02-25',
  }
  return pick<DemoInvoice[]>(
    lang,
    [
      { ...base, id: 'inv-1', student_id: 's1', student_name: 'Alice Park', student_email: 'alice@example.com', invoice_name: tuition, amount: 320000, final_amount: 320000, status: 'paid', due_date: '2026-03-05', paid_at: '2026-03-03' },
      { ...base, id: 'inv-2', student_id: 's2', student_name: 'Brian Cho', student_email: 'brian@example.com', invoice_name: tuition, amount: 280000, final_amount: 280000, status: 'pending', due_date: '2026-03-05' },
      { ...base, id: 'inv-3', student_id: 's3', student_name: 'Chloe Lim', student_email: 'chloe@example.com', invoice_name: tuition, amount: 350000, final_amount: 350000, status: 'overdue', due_date: '2026-03-01' },
      { ...base, id: 'inv-4', student_id: 's4', student_name: 'Daniel Han', student_email: 'daniel@example.com', invoice_name: tuition, amount: 200000, final_amount: 200000, status: 'pending', due_date: '2026-03-10' },
    ],
    [
      { ...base, id: 'inv-1', student_id: 's1', student_name: '박앨리스', student_email: 'alice@example.com', invoice_name: tuition, amount: 320000, final_amount: 320000, status: 'paid', due_date: '2026-03-05', paid_at: '2026-03-03' },
      { ...base, id: 'inv-2', student_id: 's2', student_name: '조브라이언', student_email: 'brian@example.com', invoice_name: tuition, amount: 280000, final_amount: 280000, status: 'pending', due_date: '2026-03-05' },
      { ...base, id: 'inv-3', student_id: 's3', student_name: '임클로이', student_email: 'chloe@example.com', invoice_name: tuition, amount: 350000, final_amount: 350000, status: 'overdue', due_date: '2026-03-01' },
      { ...base, id: 'inv-4', student_id: 's4', student_name: '한다니엘', student_email: 'daniel@example.com', invoice_name: tuition, amount: 200000, final_amount: 200000, status: 'pending', due_date: '2026-03-10' },
    ]
  )
}

// ─── Sessions (for Dashboard demo) ────────────────────────────────────────

export function getTodaysSessions(lang: Lang | string | undefined) {
  const c = getClassrooms(lang)
  const today = new Date(2026, 5, 18).toISOString().slice(0, 10)
  return [
    { id: 'ts1', date: today, start_time: '16:00', end_time: '17:30', classroom_name: c[0].name, classroom_color: c[0].color, status: 'scheduled', location: 'offline', pending_attendance_count: 0 },
    { id: 'ts2', date: today, start_time: '17:30', end_time: '19:00', classroom_name: c[2].name, classroom_color: c[2].color, status: 'scheduled', location: 'offline', pending_attendance_count: 3 },
    { id: 'ts3', date: today, start_time: '18:30', end_time: '20:00', classroom_name: c[1].name, classroom_color: c[1].color, status: 'scheduled', location: 'online', pending_attendance_count: 0 },
  ]
}

// ─── Sample classroom IDs/names for SessionForm / Announcements ───────────

export function getSimpleClassrooms(lang: Lang | string | undefined) {
  const c = getClassrooms(lang)
  return [
    { id: 'c1', name: c[0].name, color: c[0].color },
    { id: 'c2', name: c[1].name, color: c[1].color },
    { id: 'c3', name: c[2].name, color: c[2].color },
    { id: 'c4', name: pick(lang, 'Grade 6 Science', '6학년 과학') },
  ]
}
