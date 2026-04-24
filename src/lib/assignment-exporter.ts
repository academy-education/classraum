/**
 * Renders a list of assignments into Markdown consumable by
 * parseStructuredAssignments() — the round-trip format.
 *
 * Format (stable; if you change it, update both the parser and the tests):
 *
 *   ## <title>
 *   - Type: homework | quiz | test | project
 *   - Due: YYYY-MM-DD
 *   - Description: <first description line>
 *   <additional description lines, indented under the same block>
 *
 *   ## <next title>
 *   ...
 *
 * Only the `title` field is required. Due, type (when defaulting to
 * homework), and description are written only when present so the round
 * trip through the parser is clean.
 */

export type AssignmentType = 'quiz' | 'homework' | 'test' | 'project'

export interface ExportableAssignment {
  title: string
  assignment_type?: AssignmentType | string | null
  due_date?: string | null
  description?: string | null
}

const VALID_TYPES: AssignmentType[] = ['quiz', 'homework', 'test', 'project']

/**
 * Produce Markdown for the given assignments.
 *
 * An optional `header` adds a top-of-file comment with the generation
 * timestamp and total count. Useful for users who download the .md file —
 * they can see when it was produced and whether it was truncated.
 */
export function exportAssignmentsToMarkdown(
  assignments: ExportableAssignment[],
  opts: { header?: boolean; generatedAt?: Date } = {}
): string {
  const parts: string[] = []

  if (opts.header) {
    const when = (opts.generatedAt ?? new Date()).toISOString().slice(0, 10)
    parts.push(`<!-- Exported ${when} · ${assignments.length} assignment${assignments.length === 1 ? '' : 's'} -->`)
    parts.push('')
  }

  for (const a of assignments) {
    parts.push(renderOne(a))
    parts.push('') // blank line between blocks
  }

  // trim trailing blank line
  while (parts.length > 0 && parts[parts.length - 1] === '') parts.pop()

  return parts.join('\n')
}

function renderOne(a: ExportableAssignment): string {
  const lines: string[] = []
  const title = (a.title ?? '').trim() || '(untitled)'
  lines.push(`## ${title}`)

  const typ = normalizeType(a.assignment_type)
  if (typ) lines.push(`- Type: ${typ}`)

  const due = normalizeDueDate(a.due_date)
  if (due) lines.push(`- Due: ${due}`)

  const desc = (a.description ?? '').trim()
  if (desc) {
    const [first, ...rest] = desc.split(/\r?\n/)
    lines.push(`- Description: ${first}`)
    for (const extra of rest) lines.push(extra)
  }

  return lines.join('\n')
}

function normalizeType(t: ExportableAssignment['assignment_type']): AssignmentType | null {
  if (typeof t !== 'string') return null
  const lower = t.toLowerCase() as AssignmentType
  return (VALID_TYPES as string[]).includes(lower) ? lower : null
}

function normalizeDueDate(d: ExportableAssignment['due_date']): string | null {
  if (!d) return null
  // Accept "YYYY-MM-DD" or ISO timestamps; extract the date prefix.
  const m = String(d).match(/^(\d{4}-\d{2}-\d{2})/)
  return m ? m[1] : null
}

/**
 * Build a filename-safe slug for a downloaded .md file.
 * Example: downloadFilename(new Date('2026-04-24')) => "assignments-2026-04-24.md"
 */
export function downloadFilename(date: Date = new Date()): string {
  return `assignments-${date.toISOString().slice(0, 10)}.md`
}
