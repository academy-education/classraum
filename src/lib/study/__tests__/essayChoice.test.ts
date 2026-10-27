import { SSAT_WRITING_SERVED_2026_10_11 } from '@/lib/study/__fixtures__/ssat-writing-served'
import {
  chosenEssaySection, decodeEssayAnswer, encodeEssayAnswer, essayAnswerForSubmit,
  isEssayAnswerBlank, parseEssayChoicePassage, practiceEssayTask,
} from '@/lib/study/essayChoice'

/**
 * The SSAT Writing Sample's prompt sections and the ONE encoding of the
 * student's choice (2026-10-27). The parser is tested on the passage
 * production actually served, not on a tidied copy.
 */
const SERVED = SSAT_WRITING_SERVED_2026_10_11.questions[0]!
const ESSAY_TEXT = 'When a school team or club has more people who want to join than it has places'
const STORY_SENTENCE = 'The vending machine gave back more money than I had put in, and the next day it did it again.'

describe('parseEssayChoicePassage', () => {
  it('splits the served live passage into its two labelled prompts', () => {
    const s = parseEssayChoicePassage(SERVED.passage)
    expect(s.map(x => x.label)).toEqual(['Essay', 'Story Starter'])
    expect(s[0]!.text.startsWith(ESSAY_TEXT)).toBe(true)
    expect(s[0]!.text).not.toContain('[Story Starter]')
    expect(s[0]!.text).not.toContain('vending machine')
    expect(s[1]!.text).toContain(STORY_SENTENCE)
  })

  it('is generic over the labels and the count, and tolerates CRLF and stray spaces', () => {
    const p = 'Intro line that is not a prompt.\r\n  [Option One]  \r\nFirst.\r\n[Second]\r\nSecond body\r\nmore.\r\n[Third]\r\nThird.'
    const s = parseEssayChoicePassage(p)
    expect(s).toEqual([
      { label: 'Option One', text: 'First.' },
      { label: 'Second', text: 'Second body\nmore.' },
      { label: 'Third', text: 'Third.' },
    ])
    expect(parseEssayChoicePassage('[Only]\nOne prompt.')).toEqual([{ label: 'Only', text: 'One prompt.' }])
  })

  it('does not treat a bracket inside a sentence as a header, and drops empty sections', () => {
    const s = parseEssayChoicePassage('[A]\nHe wrote [sic] in the margin.\n[B]\n\n[C]\nThree.')
    expect(s).toEqual([
      { label: 'A', text: 'He wrote [sic] in the margin.' },
      { label: 'C', text: 'Three.' },
    ])
  })

  it('returns [] when there are no headers or no passage', () => {
    expect(parseEssayChoicePassage('Just one block of prompt text.')).toEqual([])
    expect(parseEssayChoicePassage(null)).toEqual([])
    expect(parseEssayChoicePassage('')).toEqual([])
  })
})

describe('the choice encoding', () => {
  it('round-trips the label and the text exactly', () => {
    const body = 'First line.\n\n  Indented second paragraph.\n'
    const raw = encodeEssayAnswer('Story Starter', body)
    expect(decodeEssayAnswer(raw)).toEqual({ label: 'Story Starter', body })
  })

  it('round-trips an empty body (a pick with nothing written yet)', () => {
    expect(decodeEssayAnswer(encodeEssayAnswer('Essay', ''))).toEqual({ label: 'Essay', body: '' })
  })

  it('leaves unmarked answers alone: ISEE essays and answers written before the choice UI', () => {
    expect(encodeEssayAnswer(null, 'An essay.')).toBe('An essay.')
    expect(decodeEssayAnswer('I chose the Essay prompt. Schools should...'))
      .toEqual({ label: null, body: 'I chose the Essay prompt. Schools should...' })
    expect(decodeEssayAnswer(null)).toEqual({ label: null, body: '' })
  })

  it('only reads the marker on the first line', () => {
    const raw = 'My essay.\n[[prompt: Essay]]\nmore'
    expect(decodeEssayAnswer(raw)).toEqual({ label: null, body: raw })
  })

  it('a pick with no writing is blank, and submits as null', () => {
    const picked = encodeEssayAnswer('Essay', '   \n ')
    expect(isEssayAnswerBlank(picked)).toBe(true)
    expect(essayAnswerForSubmit(picked)).toBeNull()
    expect(essayAnswerForSubmit(null)).toBeNull()
    const written = encodeEssayAnswer('Essay', 'Words.')
    expect(isEssayAnswerBlank(written)).toBe(false)
    expect(essayAnswerForSubmit(written)).toBe(written)
  })

  it('resolves the chosen section by label, case- and space-insensitively', () => {
    expect(chosenEssaySection(SERVED.passage, encodeEssayAnswer('story  starter', 'x'))?.label).toBe('Story Starter')
    expect(chosenEssaySection(SERVED.passage, encodeEssayAnswer('Poem', 'x'))).toBeNull()
    expect(chosenEssaySection(SERVED.passage, 'no marker')).toBeNull()
  })
})

describe('practiceEssayTask — what the grader reads', () => {
  it('sends ONLY the chosen story-starter prompt, with the essay text unmarked', () => {
    const raw = encodeEssayAnswer('Story Starter', `${STORY_SENTENCE} I kept the coins.`)
    const t = practiceEssayTask(SERVED, raw)
    expect(t.chosenLabel).toBe('Story Starter')
    expect(t.kind).toBe('story')
    expect(t.starterSentence).toBe(STORY_SENTENCE)
    expect(t.taskText).toContain(STORY_SENTENCE)
    expect(t.taskText).not.toContain(ESSAY_TEXT)
    expect(t.essayText).toBe(`${STORY_SENTENCE} I kept the coins.`)
    expect(t.essayText).not.toContain('[[prompt:')
    expect(t.kindUncertain).toBe(false)
  })

  it('sends ONLY the chosen essay prompt', () => {
    const t = practiceEssayTask(SERVED, encodeEssayAnswer('Essay', 'Schools should...'))
    expect(t.kind).toBe('essay')
    expect(t.taskText).toContain(ESSAY_TEXT)
    expect(t.taskText).not.toContain('vending machine')
  })

  it('without a recorded choice, says so and lists every prompt (legacy answers only)', () => {
    const t = practiceEssayTask(SERVED, 'I picked the essay. Schools should...')
    expect(t.chosenLabel).toBeNull()
    expect(t.kindUncertain).toBe(true)
    expect(t.taskText).toContain('chose ONE of them')
    expect(t.taskText).toContain(ESSAY_TEXT)
    expect(t.taskText).toContain(STORY_SENTENCE)
  })

  it('ISEE essay: the prompt is the task', () => {
    const prompt = 'Some students learn best when they work through a problem alone. Which way teaches you more?'
    const t = practiceEssayTask({ type: 'essay', prompt, passage: null }, 'Alone, because...')
    expect(t).toMatchObject({ taskText: prompt, essayText: 'Alone, because...', chosenLabel: null, kind: 'essay' })
  })
})
