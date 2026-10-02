/** @jest-environment node */
import { buildExplainPrompt } from '../explain-prompt'

const base = { prompt: 'Which choice is best?', choices: ['alpha', 'beta', 'gamma', 'delta'], mode: 'more' as const }

describe('explain prompt', () => {
  it('labels the correct and chosen answers by letter, whether they arrive as text or as a letter', () => {
    const fromText = buildExplainPrompt({ ...base, correctAnswer: 'beta', studentAnswer: 'gamma', ko: false })
    expect(fromText.prompt).toContain('CORRECT ANSWER: B. beta')
    expect(fromText.prompt).toContain('STUDENT ANSWERED: C. gamma')
    const fromLetter = buildExplainPrompt({ ...base, correctAnswer: '(d)', studentAnswer: 'A', ko: false })
    expect(fromLetter.prompt).toContain('CORRECT ANSWER: D. delta')
    expect(fromLetter.prompt).toContain('STUDENT ANSWERED: A. alpha')
  })
  it('passes free-response answers through unchanged', () => {
    expect(buildExplainPrompt({ prompt: 'x', correctAnswer: '42', mode: 'more', ko: false }).prompt).toContain('CORRECT ANSWER: 42')
  })
  it('"Explain more" asks for every choice by letter, and Korean must be polite', () => {
    const en = buildExplainPrompt({ ...base, correctAnswer: 'beta', ko: false })
    expect(en.system).toMatch(/every other choice by letter/)
    const ko = buildExplainPrompt({ ...base, correctAnswer: 'beta', ko: true })
    expect(ko.system).toContain('존댓말')
    expect(ko.system).toContain('반말은 절대 쓰지 마세요')
    expect(ko.system).toMatch(/알파벳으로 지칭/)
  })
})
