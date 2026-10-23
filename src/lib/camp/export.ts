import { kstDate } from '@/lib/camp/dates'

/**
 * CSV export for the camp dashboard (Students table, a classroom's
 * progress grid). Built in the browser from the same API payloads the
 * panels render — /api/camp/students and /api/camp/dashboard — so the
 * file holds exactly what the teacher was shown.
 *
 * UTF-8 with a BOM and CRLF rows: without the BOM, Excel on Windows (the
 * academies' default) opens UTF-8 as the ANSI code page and every Korean
 * name turns to mojibake. Cells are RFC 4180-quoted, and a text cell
 * starting with = + - @ (or tab/CR) gets a leading apostrophe so a name
 * cannot run as a spreadsheet formula.
 *
 * Client-safe: no server imports.
 */

export const CSV_BOM = '\uFEFF'

type Cell = string | number | null | undefined

function cell(v: Cell): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : ''
  let s = v
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Rows to CSV text, BOM included. */
export function toCsv(rows: Cell[][]): string {
  return CSV_BOM + rows.map(r => r.map(cell).join(',')).join('\r\n') + '\r\n'
}

/** A file name safe on Windows and macOS, keeping Korean. */
export function csvFileName(...parts: string[]): string {
  const base = parts
    .map(p => p.trim().replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '-').replace(/\s+/g, '-'))
    .filter(Boolean)
    .join('_')
  return `${base || 'export'}.csv`
}

/** Hand the CSV to the browser as a download. */
export function downloadCsv(fileName: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoke on the next tick: Safari cancels a download whose URL is revoked synchronously.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/* ── Students table ──────────────────────────────────────────────────── */

export interface CampStudentExportRow {
  name: string | null
  email?: string | null
  classroomName: string
  completion: { done: number; total: number }
  avgScorePct: number | null
  lastActive: string | null
  states?: { done: number; inProgress: number; notStarted: number }
}

export interface StudentsCsvLabels {
  name: string
  email: string
  classroom: string
  completed: string
  total: string
  inProgress: string
  notStarted: string
  avgScore: string
  lastActive: string
}

export function studentsCsv(rows: CampStudentExportRow[], l: StudentsCsvLabels): string {
  const header = [l.name, l.email, l.classroom, l.completed, l.total, l.inProgress, l.notStarted, l.avgScore, l.lastActive]
  return toCsv([
    header,
    ...rows.map(r => [
      r.name ?? '',
      r.email ?? '',
      r.classroomName,
      r.completion.done,
      r.completion.total,
      r.states?.inProgress ?? null,
      r.states?.notStarted ?? null,
      r.avgScorePct,
      r.lastActive ? kstDate(r.lastActive) : '',
    ]),
  ])
}

/* ── One classroom's progress grid ───────────────────────────────────── */

export interface ProgressGridPayload {
  roster: Array<{ studentId: string; name: string | null; email?: string | null }>
  assignments: Array<{
    id: string
    title: string
    dueAt: string | null
    students: Array<{
      studentId: string
      state: 'not_started' | 'in_progress' | 'done'
      correctCount: number | null
      totalCount: number | null
    }>
  }>
}

export interface ProgressCsvLabels {
  student: string
  email: string
  completed: string
  notStarted: string
  inProgress: string
  done: string
  /** "Due {date}" already applied by the caller, or a formatter. */
  due: (date: string) => string
}

/**
 * Roster x assignment matrix, one row per student. A done cell carries
 * the score ("8 / 10"); the last column counts completed assignments.
 */
export function progressGridCsv(p: ProgressGridPayload, l: ProgressCsvLabels): string {
  const header: Cell[] = [l.student, l.email]
  for (const a of p.assignments) header.push(a.dueAt ? `${a.title} (${l.due(kstDate(a.dueAt))})` : a.title)
  header.push(`${l.completed} (${p.assignments.length})`)

  const byKey = new Map<string, ProgressGridPayload['assignments'][number]['students'][number]>()
  for (const a of p.assignments) for (const s of a.students) byKey.set(`${a.id}:${s.studentId}`, s)

  const rows: Cell[][] = [header]
  for (const st of p.roster) {
    const row: Cell[] = [st.name ?? '', st.email ?? '']
    let done = 0
    for (const a of p.assignments) {
      const s = byKey.get(`${a.id}:${st.studentId}`)
      if (!s || s.state === 'not_started') row.push(l.notStarted)
      else if (s.state === 'in_progress') row.push(l.inProgress)
      else {
        done += 1
        // Spaced on purpose: Excel reads a bare "8/10" as the date 10 August.
        row.push(s.correctCount !== null && s.totalCount !== null ? `${s.correctCount} / ${s.totalCount}` : l.done)
      }
    }
    row.push(done)
    rows.push(row)
  }
  return toCsv(rows)
}
