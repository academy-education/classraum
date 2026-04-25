/**
 * Pure text-to-assignment parsing helpers.
 *
 * Two paths:
 *   1. parseStructuredAssignments() — deterministic Markdown parser for the
 *      format produced by the export feature. No API calls.
 *   2. parseFreeformAssignments()    — calls OpenAI (gpt-4o-mini) to extract
 *      assignment drafts from arbitrary natural-language notes.
 *
 * Both return ParsedAssignmentDraft[]. The UI then lets the user pick
 * session_id and category_id per row before insert.
 */
import OpenAI from 'openai'

export type AssignmentType = 'quiz' | 'homework' | 'test' | 'project'

const ASSIGNMENT_TYPES: AssignmentType[] = ['quiz', 'homework', 'test', 'project']

export interface ParsedAssignmentDraft {
  title: string
  description?: string
  assignment_type: AssignmentType
  due_date?: string // YYYY-MM-DD; undefined if AI couldn't resolve
  /** Category name matched against the provided whitelist (AI path only) */
  category_name?: string
  source_line?: number // 1-indexed; helps users locate the original
  warnings?: string[] // e.g. "due date ambiguous"
}

export interface CategoryOption {
  id: string
  name: string
}

// ----------------------------------------------------------------------------
// Structured parser (round-trip from our exporter)
// ----------------------------------------------------------------------------

/**
 * Parse Markdown produced by the assignments exporter. Format:
 *
 * ## <title>
 * - Type: homework | quiz | test | project
 * - Due: YYYY-MM-DD
 * - Description: <free text, may be multi-line until next ## or EOF>
 *
 * Tolerant: case-insensitive field names, missing fields allowed (will surface
 * as warnings), extra blank lines fine. Unknown lines are appended to the
 * current description.
 */
export function parseStructuredAssignments(text: string): ParsedAssignmentDraft[] {
  const lines = text.split(/\r?\n/)
  const drafts: ParsedAssignmentDraft[] = []
  let current: ParsedAssignmentDraft | null = null
  let currentLine = 0
  let inDescription = false
  let descriptionLines: string[] = []

  const flush = () => {
    if (!current) return
    if (descriptionLines.length > 0) {
      const desc = descriptionLines.join('\n').trim()
      if (desc) current.description = desc
    }
    drafts.push(current)
    current = null
    descriptionLines = []
    inDescription = false
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const line = raw.trim()
    const lineNum = i + 1

    if (line.startsWith('## ')) {
      flush()
      currentLine = lineNum
      current = {
        title: line.slice(3).trim(),
        assignment_type: 'homework', // default; may be overridden
        source_line: currentLine,
        warnings: [],
      }
      inDescription = false
      continue
    }

    if (!current) continue

    // Field lines like "- Type: homework", tolerant of leading "- " or "* "
    const fieldMatch = line.match(/^[-*]\s*([A-Za-z]+)\s*:\s*(.+)$/)
    if (fieldMatch && !inDescription) {
      const key = fieldMatch[1].toLowerCase()
      const val = fieldMatch[2].trim()
      if (key === 'type') {
        const t = val.toLowerCase()
        if ((ASSIGNMENT_TYPES as string[]).includes(t)) {
          current.assignment_type = t as AssignmentType
        } else {
          current.warnings!.push(`Unknown type "${val}", defaulted to homework`)
        }
      } else if (key === 'due' || key === 'duedate') {
        const iso = normalizeDate(val)
        if (iso) current.due_date = iso
        else current.warnings!.push(`Could not parse due date "${val}"`)
      } else if (key === 'description') {
        descriptionLines.push(val)
        inDescription = true
      }
      continue
    }

    // Anything else is description continuation (once we've left the field block)
    if (line || descriptionLines.length > 0) {
      descriptionLines.push(raw)
      // Once we hit a non-field line, treat the rest as description until next ##
      inDescription = true
    }
  }

  flush()

  // Drop empties and clean up warnings
  return drafts
    .filter(d => d.title.length > 0)
    .map(d => {
      if (d.warnings && d.warnings.length === 0) delete d.warnings
      return d
    })
}

/**
 * Try to coerce a date string into YYYY-MM-DD. Accepts the canonical export
 * format and a couple of common variants (YYYY/MM/DD, MM/DD/YYYY).
 * Returns null if it can't be parsed safely.
 */
export function normalizeDate(input: string): string | null {
  const s = input.trim()
  if (!s) return null

  // YYYY-MM-DD or YYYY/MM/DD
  const iso = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/)
  if (iso) {
    const [, y, m, d] = iso
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  // MM/DD/YYYY (US-style — only used when 4-digit year is at the END)
  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (us) {
    const [, m, d, y] = us
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  return null
}

// ----------------------------------------------------------------------------
// Free-form parser (OpenAI)
// ----------------------------------------------------------------------------

// Lazy: importing this module shouldn't crash in environments (e.g. tests)
// where OPENAI_API_KEY isn't set. Only the AI path actually needs the client.
let _openai: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return _openai
}

export const MAX_PARSE_INPUT_CHARS = 10_000

/**
 * Send arbitrary text to OpenAI and get back structured assignment drafts.
 * The current date is required so phrases like "due Friday" can be resolved.
 */
export async function parseFreeformAssignments(
  text: string,
  opts: {
    currentDate: string
    language?: 'english' | 'korean'
    /**
     * Optional whitelist of existing category names for the classroom.
     * When provided, the AI is instructed to pick a category name verbatim
     * from this list (or return null). Server post-processing validates the
     * match to protect against hallucinations.
     */
    categories?: CategoryOption[]
  }
): Promise<ParsedAssignmentDraft[]> {
  if (!text.trim()) return []
  if (text.length > MAX_PARSE_INPUT_CHARS) {
    throw new Error(`Input exceeds ${MAX_PARSE_INPUT_CHARS} characters`)
  }

  const langInstr = opts.language === 'korean'
    ? 'Titles and descriptions should preserve the original language of the input. If the input is Korean, keep them in Korean.'
    : 'Titles and descriptions should preserve the original language of the input.'

  const categoryNames = (opts.categories ?? []).map(c => c.name).filter(Boolean)
  const categoryInstr = categoryNames.length > 0
    ? `CATEGORIES: Each classroom has a fixed list of assignment categories. For each assignment, pick the ONE best matching category name from this EXACT list:\n${categoryNames.map(n => `  - ${n}`).join('\n')}\n\nRules:\n- Return the category name VERBATIM (same capitalization and spacing as the list above).\n- If no category clearly fits, return null for category_name. Do NOT guess, do NOT invent new categories.\n- Match by topic: e.g. "vocabulary quiz" → a category called "Vocabulary" if present.`
    : 'CATEGORIES: No category list provided — omit the category_name field or set it to null.'

  const prompt = `You extract a list of graded student coursework from a teacher's free-form notes.

EXTRACT ONLY:
- Homework, reading, problem sets, practice work students must complete
- Quizzes, tests, exams students will take
- Projects, presentations, essays, reports students must produce
- Any graded or required student deliverable

DO NOT EXTRACT (return these as NOTHING):
- Announcements or information ("picture day Wednesday", "library closed")
- Events without required student work ("school play auditions", "field trip")
- Teacher/admin tasks ("submit budget by Friday", "finish grade reports")
- Parent-teacher conferences, meetings, appointments
- Personal notes, shopping lists, reminders to self
- Optional or extracurricular activities (unless clearly graded)
- Greetings, signatures, general prose with no coursework

If the input contains no graded student coursework, return an empty assignments array. It is much better to return zero assignments than to invent ones from unrelated text.

Today's date is ${opts.currentDate}. Use this to resolve relative dates like "Friday", "next week", "tomorrow". Output dates as YYYY-MM-DD. If a date is genuinely missing or ambiguous, omit due_date — do NOT guess.

For each assignment, classify the type as one of: quiz, homework, test, project. If unclear, default to "homework".

${categoryInstr}

${langInstr}

Notes from teacher:
"""
${text}
"""

Return ONLY valid JSON in this exact shape (no markdown, no commentary):
{
  "assignments": [
    {
      "title": "short assignment title",
      "description": "optional longer description, can be empty string if none",
      "assignment_type": "quiz" | "homework" | "test" | "project",
      "due_date": "YYYY-MM-DD",
      "category_name": "exact name from the category list, or null"
    }
  ]
}

If due_date is unknown, omit the key entirely (do not return null or empty string). Return an empty assignments array if the input contains no graded student coursework.`

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are a strict extractor. You only extract graded student coursework that is explicitly present in the input. You never invent assignments, never extract announcements or teacher tasks, and never fill in missing dates. If no graded coursework is present, you return an empty array. Return only valid JSON.' },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  })

  const content = response.choices[0]?.message?.content
  if (!content) throw new Error('OpenAI returned empty response')

  let parsed: { assignments?: unknown }
  try {
    parsed = JSON.parse(content)
  } catch {
    // Don't leak the raw response to clients — it can contain HTML error pages,
    // partial prompt context, or other content unsafe to surface. Log it for
    // debugging instead.
    console.error('[assignment-parser] OpenAI returned non-JSON:', content.slice(0, 500))
    throw new Error('AI returned an invalid response. Please try again.')
  }

  const items = Array.isArray(parsed.assignments) ? parsed.assignments : []
  return items
    .map(raw => validateDraft(raw, opts.categories))
    .filter((d): d is ParsedAssignmentDraft => d !== null)
}

/**
 * Match an AI-returned category name against the whitelist. Case-insensitive,
 * whitespace-insensitive. Returns the original (canonical) name from the list
 * if matched, or undefined if not. Never trusts a string that isn't in the list.
 */
export function matchCategoryName(
  aiName: string | null | undefined,
  whitelist: CategoryOption[] | undefined
): string | undefined {
  if (!aiName || typeof aiName !== 'string') return undefined
  if (!whitelist || whitelist.length === 0) return undefined
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')
  const target = norm(aiName)
  if (!target) return undefined
  const hit = whitelist.find(c => norm(c.name) === target)
  return hit?.name
}

function validateDraft(
  raw: unknown,
  categories?: CategoryOption[]
): ParsedAssignmentDraft | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>

  const title = typeof r.title === 'string' ? r.title.trim() : ''
  if (!title) return null

  const warnings: string[] = []

  let assignment_type: AssignmentType = 'homework'
  if (typeof r.assignment_type === 'string') {
    const t = r.assignment_type.toLowerCase()
    if ((ASSIGNMENT_TYPES as string[]).includes(t)) {
      assignment_type = t as AssignmentType
    } else {
      warnings.push(`Unknown type "${r.assignment_type}"`)
    }
  }

  let due_date: string | undefined
  if (typeof r.due_date === 'string' && r.due_date.trim()) {
    const iso = normalizeDate(r.due_date)
    if (iso) due_date = iso
    else warnings.push(`Could not parse due date "${r.due_date}"`)
  }

  const description = typeof r.description === 'string' && r.description.trim()
    ? r.description.trim()
    : undefined

  const category_name = matchCategoryName(
    typeof r.category_name === 'string' ? r.category_name : null,
    categories
  )

  const draft: ParsedAssignmentDraft = { title, assignment_type }
  if (description) draft.description = description
  if (due_date) draft.due_date = due_date
  if (category_name) draft.category_name = category_name
  if (warnings.length > 0) draft.warnings = warnings
  return draft
}

// ----------------------------------------------------------------------------
// Heuristic: which parser to use?
// ----------------------------------------------------------------------------

/**
 * Quick sniff: does the input look like our structured Markdown export?
 * If so, the deterministic parser is preferred (free, instant, no AI errors).
 */
export function looksStructured(text: string): boolean {
  const t = text.trim()
  if (!t.startsWith('## ')) return false
  // Must have at least one recognizable field line
  return /^[-*]\s*(Type|Due|Description)\s*:/im.test(t)
}
