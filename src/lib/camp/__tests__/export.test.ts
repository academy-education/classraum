/** @jest-environment node */
/**
 * Camp CSV export (2026-10-23): UTF-8 with BOM so Excel opens Korean,
 * RFC 4180 quoting, no formula injection, and a progress grid that
 * matches the dashboard payload.
 */
import { CSV_BOM, csvFileName, progressGridCsv, studentsCsv, toCsv } from '@/lib/camp/export'

const lines = (csv: string) => csv.slice(CSV_BOM.length).split('\r\n').filter(Boolean)

it('starts with a BOM and uses CRLF rows', () => {
  const csv = toCsv([['a', 'b'], [1, 2]])
  expect(csv.startsWith('\uFEFF')).toBe(true)
  expect(csv).toBe('\uFEFFa,b\r\n1,2\r\n')
})

it('quotes commas, quotes and newlines, and keeps Korean as is', () => {
  expect(lines(toCsv([['김민수', 'a,b', 'say "hi"', 'two\nlines']]))[0])
    .toBe('김민수,"a,b","say ""hi""","two\nlines"')
})

it('defuses text that a spreadsheet would run as a formula, but not numbers', () => {
  expect(lines(toCsv([['=HYPERLINK("x")', '+1', '@a', -5]]))[0]).toBe(`"'=HYPERLINK(""x"")",'+1,'@a,-5`)
})

it('builds a file name that keeps Korean and drops path characters', () => {
  expect(csvFileName('여름 캠프/SAT', '학생', '2026-10-23')).toBe('여름-캠프-SAT_학생_2026-10-23.csv')
})

it('writes one Students row per (student, classroom) with the dashboard numbers', () => {
  const csv = studentsCsv([
    { name: '김민수', email: 'k@x.kr', classroomName: 'A반', completion: { done: 2, total: 3 }, avgScorePct: 81,
      lastActive: '2026-10-21T20:00:00Z', states: { done: 2, inProgress: 1, notStarted: 0 } },
  ], { name: 'N', email: 'E', classroom: 'C', completed: 'D', total: 'T', inProgress: 'I', notStarted: 'S', avgScore: 'A', lastActive: 'L' })
  // Last active is the Korean date: 20:00Z on the 21st is the 22nd in Seoul.
  expect(lines(csv)).toEqual(['N,E,C,D,T,I,S,A,L', '김민수,k@x.kr,A반,2,3,1,0,81,2026-10-22'])
})

it('lays the progress grid out as roster x assignments, with scores Excel will not read as dates', () => {
  const csv = progressGridCsv({
    roster: [{ studentId: 's1', name: 'Kim', email: null }, { studentId: 's2', name: 'Lee', email: 'l@x' }],
    assignments: [
      { id: 'a1', title: 'Week 1', dueAt: null, students: [
        { studentId: 's1', state: 'done', correctCount: 8, totalCount: 10 },
        { studentId: 's2', state: 'in_progress', correctCount: null, totalCount: null },
      ] },
      { id: 'a2', title: 'Week 2', dueAt: '2026-10-25T14:59:59Z', students: [
        { studentId: 's1', state: 'not_started', correctCount: null, totalCount: null },
      ] },
    ],
  }, { student: 'Student', email: 'Email', completed: 'Completed', notStarted: '-', inProgress: '…', done: 'done', due: d => `due ${d}` })
  expect(lines(csv)).toEqual([
    'Student,Email,Week 1,Week 2 (due 2026-10-25),Completed (2)',
    'Kim,,8 / 10,\'-,1',
    'Lee,l@x,…,\'-,0',
  ])
})
