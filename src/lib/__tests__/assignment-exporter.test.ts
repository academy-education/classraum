import {
  exportAssignmentsToMarkdown,
  downloadFilename,
  type ExportableAssignment,
} from '../assignment-exporter'
import { parseStructuredAssignments } from '../assignment-parser'

describe('exportAssignmentsToMarkdown', () => {
  it('renders a complete assignment', () => {
    const md = exportAssignmentsToMarkdown([
      {
        title: 'Algebra HW',
        assignment_type: 'homework',
        due_date: '2026-05-01',
        description: 'Do problems 1-15',
      },
    ])
    expect(md).toContain('## Algebra HW')
    expect(md).toContain('- Type: homework')
    expect(md).toContain('- Due: 2026-05-01')
    expect(md).toContain('- Description: Do problems 1-15')
  })

  it('omits missing optional fields cleanly', () => {
    const md = exportAssignmentsToMarkdown([{ title: 'Just a title' }])
    expect(md).toContain('## Just a title')
    expect(md).not.toContain('- Type:')
    expect(md).not.toContain('- Due:')
    expect(md).not.toContain('- Description:')
  })

  it('separates multiple assignments with blank lines', () => {
    const md = exportAssignmentsToMarkdown([
      { title: 'A', assignment_type: 'quiz' },
      { title: 'B', assignment_type: 'test' },
    ])
    // Two top-level headings
    expect(md.match(/^## /gm)?.length).toBe(2)
    // There should be a blank line between blocks
    expect(md).toMatch(/## A\n- Type: quiz\n\n## B/)
  })

  it('trims timestamps from due_date to the date portion', () => {
    const md = exportAssignmentsToMarkdown([
      { title: 'T', due_date: '2026-05-01T23:59:00.000Z' },
    ])
    expect(md).toContain('- Due: 2026-05-01')
    expect(md).not.toContain('T23:59')
  })

  it('drops invalid types rather than writing them out', () => {
    const md = exportAssignmentsToMarkdown([
      { title: 'T', assignment_type: 'essay' as unknown as 'quiz' },
    ])
    expect(md).not.toContain('- Type:')
  })

  it('preserves multi-line descriptions', () => {
    const md = exportAssignmentsToMarkdown([
      {
        title: 'Project',
        description: 'Line one\nLine two\nLine three',
      },
    ])
    expect(md).toContain('- Description: Line one')
    expect(md).toContain('\nLine two')
    expect(md).toContain('\nLine three')
  })

  it('adds an optional header comment', () => {
    const md = exportAssignmentsToMarkdown(
      [{ title: 'A' }, { title: 'B' }],
      { header: true, generatedAt: new Date('2026-04-24T00:00:00Z') }
    )
    expect(md.startsWith('<!-- Exported 2026-04-24 · 2 assignments -->')).toBe(true)
  })

  it('pluralizes the header correctly for a single assignment', () => {
    const md = exportAssignmentsToMarkdown([{ title: 'A' }], {
      header: true,
      generatedAt: new Date('2026-04-24T00:00:00Z'),
    })
    expect(md).toContain('1 assignment -->')
    expect(md).not.toContain('1 assignments')
  })

  it('replaces an empty title with "(untitled)"', () => {
    const md = exportAssignmentsToMarkdown([{ title: '   ', assignment_type: 'homework' }])
    expect(md).toContain('## (untitled)')
  })

  it('returns an empty string for an empty list', () => {
    expect(exportAssignmentsToMarkdown([])).toBe('')
  })
})

describe('round-trip: exporter → parser', () => {
  it('preserves title, type, and due_date', () => {
    const input: ExportableAssignment[] = [
      { title: 'A', assignment_type: 'homework', due_date: '2026-05-01' },
      { title: 'B', assignment_type: 'quiz', due_date: '2026-05-05' },
      { title: 'C', assignment_type: 'project' },
    ]
    const md = exportAssignmentsToMarkdown(input)
    const parsed = parseStructuredAssignments(md)

    expect(parsed).toHaveLength(3)
    expect(parsed[0]).toMatchObject({ title: 'A', assignment_type: 'homework', due_date: '2026-05-01' })
    expect(parsed[1]).toMatchObject({ title: 'B', assignment_type: 'quiz', due_date: '2026-05-05' })
    expect(parsed[2]).toMatchObject({ title: 'C', assignment_type: 'project' })
    expect(parsed[2].due_date).toBeUndefined()
  })

  it('preserves single-line descriptions', () => {
    const md = exportAssignmentsToMarkdown([
      { title: 'A', assignment_type: 'homework', description: 'Hello world' },
    ])
    const [parsed] = parseStructuredAssignments(md)
    expect(parsed.description).toBe('Hello world')
  })

  it('preserves multi-line descriptions through the round trip', () => {
    const md = exportAssignmentsToMarkdown([
      { title: 'Project', description: 'Build a histogram\nUse real data' },
    ])
    const [parsed] = parseStructuredAssignments(md)
    expect(parsed.description).toContain('Build a histogram')
    expect(parsed.description).toContain('Use real data')
  })

  it('survives export → parse → re-export unchanged', () => {
    const input: ExportableAssignment[] = [
      { title: 'A', assignment_type: 'quiz', due_date: '2026-05-01', description: 'desc' },
    ]
    const first = exportAssignmentsToMarkdown(input)
    const parsed = parseStructuredAssignments(first)
    const second = exportAssignmentsToMarkdown(parsed)
    expect(second).toBe(first)
  })
})

describe('downloadFilename', () => {
  it('produces an ISO-dated filename', () => {
    expect(downloadFilename(new Date('2026-04-24T12:00:00Z'))).toBe('assignments-2026-04-24.md')
  })
})
