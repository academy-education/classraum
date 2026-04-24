import {
  parseStructuredAssignments,
  normalizeDate,
  looksStructured,
  matchCategoryName,
} from '../assignment-parser'

describe('normalizeDate', () => {
  it('accepts ISO dates unchanged', () => {
    expect(normalizeDate('2026-04-24')).toBe('2026-04-24')
  })

  it('pads single-digit month and day', () => {
    expect(normalizeDate('2026-4-2')).toBe('2026-04-02')
  })

  it('accepts YYYY/MM/DD', () => {
    expect(normalizeDate('2026/04/24')).toBe('2026-04-24')
  })

  it('accepts US-style MM/DD/YYYY', () => {
    expect(normalizeDate('4/24/2026')).toBe('2026-04-24')
  })

  it('returns null for unparseable input', () => {
    expect(normalizeDate('Friday')).toBeNull()
    expect(normalizeDate('next week')).toBeNull()
    expect(normalizeDate('')).toBeNull()
  })
})

describe('looksStructured', () => {
  it('recognizes the export format', () => {
    const text = `## Algebra HW\n- Type: homework\n- Due: 2026-05-01`
    expect(looksStructured(text)).toBe(true)
  })

  it('rejects free-form text', () => {
    expect(looksStructured('Mon 4/28 — Algebra HW due Friday')).toBe(false)
  })

  it('rejects text with ## but no recognizable fields', () => {
    expect(looksStructured('## Some heading\nRandom paragraph')).toBe(false)
  })
})

describe('parseStructuredAssignments', () => {
  it('parses a single complete assignment', () => {
    const text = `## Algebra HW
- Type: homework
- Due: 2026-05-01
- Description: Do problems 1-15 from chapter 3`

    const drafts = parseStructuredAssignments(text)
    expect(drafts).toHaveLength(1)
    expect(drafts[0]).toMatchObject({
      title: 'Algebra HW',
      assignment_type: 'homework',
      due_date: '2026-05-01',
      description: 'Do problems 1-15 from chapter 3',
    })
  })

  it('parses multiple assignments separated by ## headings', () => {
    const text = `## HW 1
- Type: homework
- Due: 2026-05-01

## Quiz 1
- Type: quiz
- Due: 2026-05-05`

    const drafts = parseStructuredAssignments(text)
    expect(drafts).toHaveLength(2)
    expect(drafts[0].title).toBe('HW 1')
    expect(drafts[0].assignment_type).toBe('homework')
    expect(drafts[1].title).toBe('Quiz 1')
    expect(drafts[1].assignment_type).toBe('quiz')
  })

  it('is case-insensitive on field names and type values', () => {
    const text = `## Test
- type: QUIZ
- DUE: 2026-05-05`
    const drafts = parseStructuredAssignments(text)
    expect(drafts[0].assignment_type).toBe('quiz')
    expect(drafts[0].due_date).toBe('2026-05-05')
  })

  it('warns on unknown type and defaults to homework', () => {
    const text = `## Thing
- Type: essay
- Due: 2026-05-05`
    const drafts = parseStructuredAssignments(text)
    expect(drafts[0].assignment_type).toBe('homework')
    expect(drafts[0].warnings).toEqual(
      expect.arrayContaining([expect.stringContaining('Unknown type')])
    )
  })

  it('warns on unparseable due date', () => {
    const text = `## Thing
- Type: homework
- Due: sometime next week`
    const drafts = parseStructuredAssignments(text)
    expect(drafts[0].due_date).toBeUndefined()
    expect(drafts[0].warnings).toEqual(
      expect.arrayContaining([expect.stringContaining('Could not parse due date')])
    )
  })

  it('accepts multi-line descriptions', () => {
    const text = `## Project
- Type: project
- Due: 2026-06-01
- Description: Build a histogram
Use real class data
Present to the class`

    const drafts = parseStructuredAssignments(text)
    expect(drafts[0].description).toContain('Build a histogram')
    expect(drafts[0].description).toContain('Use real class data')
    expect(drafts[0].description).toContain('Present to the class')
  })

  it('returns an empty array when there are no ## headings', () => {
    expect(parseStructuredAssignments('just some random text')).toEqual([])
  })

  it('skips entries with empty titles', () => {
    const text = `## \n- Type: homework\n\n## Real One\n- Type: quiz`
    const drafts = parseStructuredAssignments(text)
    expect(drafts).toHaveLength(1)
    expect(drafts[0].title).toBe('Real One')
  })

  it('records source_line for each draft', () => {
    const text = `Top matter line

## First
- Type: homework

## Second
- Type: quiz`
    const drafts = parseStructuredAssignments(text)
    expect(drafts[0].source_line).toBe(3)
    expect(drafts[1].source_line).toBe(6)
  })

  it('omits warnings field when there are no warnings', () => {
    const text = `## Clean
- Type: homework
- Due: 2026-05-01`
    const drafts = parseStructuredAssignments(text)
    expect(drafts[0].warnings).toBeUndefined()
  })
})

describe('matchCategoryName', () => {
  const categories = [
    { id: 'c1', name: 'Vocabulary' },
    { id: 'c2', name: 'Reading Comprehension' },
    { id: 'c3', name: '문법' }, // Korean category
  ]

  it('returns the canonical name on exact match', () => {
    expect(matchCategoryName('Vocabulary', categories)).toBe('Vocabulary')
  })

  it('is case-insensitive', () => {
    expect(matchCategoryName('vocabulary', categories)).toBe('Vocabulary')
    expect(matchCategoryName('VOCABULARY', categories)).toBe('Vocabulary')
  })

  it('is whitespace-insensitive (collapses extra spaces)', () => {
    expect(matchCategoryName('Reading   Comprehension', categories)).toBe('Reading Comprehension')
    expect(matchCategoryName('  reading comprehension  ', categories)).toBe('Reading Comprehension')
  })

  it('matches Korean category names', () => {
    expect(matchCategoryName('문법', categories)).toBe('문법')
  })

  it('returns undefined for a hallucinated category not in the list', () => {
    expect(matchCategoryName('Grammar', categories)).toBeUndefined()
    expect(matchCategoryName('Made Up Category', categories)).toBeUndefined()
  })

  it('returns undefined for null/empty input', () => {
    expect(matchCategoryName(null, categories)).toBeUndefined()
    expect(matchCategoryName('', categories)).toBeUndefined()
    expect(matchCategoryName('   ', categories)).toBeUndefined()
  })

  it('returns undefined when the whitelist is empty', () => {
    expect(matchCategoryName('Vocabulary', [])).toBeUndefined()
    expect(matchCategoryName('Vocabulary', undefined)).toBeUndefined()
  })

  it('never returns a name that was not in the list (guards against AI invention)', () => {
    // Defensive: a partial match shouldn't count as a match
    expect(matchCategoryName('Vocab', categories)).toBeUndefined()
    expect(matchCategoryName('Reading', categories)).toBeUndefined()
  })
})
