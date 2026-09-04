/** @jest-environment node */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * The home screen's "pending assignments" count must not include grade rows
 * whose assignment has been soft-deleted.
 *
 * Until 2026-09-04 it did: the query filtered only on student and status, so
 * students were told to do work that no longer existed, and the number
 * disagreed with the assignments page — which has always filtered
 * `deleted_at`. Measured against production that day: 79 pending rows with a
 * deleted parent, across 15 of the 141 students who had any pending work.
 * One student's home screen read 17 while their assignments page correctly
 * read 0. Confirmed by running both query shapes: 23 -> 2 and 17 -> 0.
 *
 * This is a SOURCE guard rather than a behavioural test, and that is a real
 * limitation worth stating: useMobileDashboard builds a ten-query
 * Promise.all against a live PostgREST client, and a test that mocked the
 * whole builder chain would mostly be asserting the shape of the mock. What
 * this catches is the regression that actually happened — someone editing
 * the select and dropping the join. It would NOT catch PostgREST changing
 * the meaning of `!inner`, or the filter being applied to the wrong embed.
 *
 * BREAK-TEST: delete `.is('assignments.deleted_at', null)` from the pending
 * query and both assertions below fail.
 */
const SRC = readFileSync(
  join(process.cwd(), 'src/app/mobile/hooks/useMobileDashboard.ts'),
  'utf8',
)

// The pending-grades query, isolated from the other nine in the array.
function pendingQuery(): string {
  const start = SRC.indexOf("Pending assignment grades")
  expect(start).toBeGreaterThan(-1)
  // up to the close of the fetchPromises array literal
  const end = SRC.indexOf(']', start)
  return SRC.slice(start, end)
}

describe('home pending-assignment count', () => {
  it('joins assignments so a deleted parent cannot be counted', () => {
    expect(pendingQuery()).toContain('assignments!inner')
  })

  it('filters out soft-deleted assignments', () => {
    expect(pendingQuery()).toContain(".is('assignments.deleted_at', null)")
  })

  it('still scopes to the student and to pending status', () => {
    const q = pendingQuery()
    expect(q).toContain(".eq('student_id', studentId)")
    expect(q).toContain(".eq('status', 'pending')")
  })
})
