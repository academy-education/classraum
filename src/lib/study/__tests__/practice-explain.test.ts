import { practiceExplainContext } from '../practice-explain'

describe('practiceExplainContext', () => {
  it('splits a folded "passage\\n\\nstem" prompt', () => {
    expect(practiceExplainContext({ prompt: 'Long text.\n\nWhat is it?', passage: 'Long text.' }))
      .toEqual({ prompt: 'What is it?', passage: 'Long text.' })
  })

  it('keeps the question when the passage alone exceeds the route clamp', () => {
    const passage = 'x'.repeat(5000)
    const out = practiceExplainContext({ prompt: `${passage}\n\nWhich one?`, passage })
    expect(out.prompt).toBe('Which one?')
    expect(out.passage).toHaveLength(5000)
  })

  it('sends an old cached question (no passage field) unchanged', () => {
    expect(practiceExplainContext({ prompt: 'P\n\nQ' })).toEqual({ prompt: 'P\n\nQ' })
  })

  it('does not split when the prompt does not start with the passage', () => {
    expect(practiceExplainContext({ prompt: 'Q only', passage: 'Other' })).toEqual({ prompt: 'Q only' })
  })

  it('does not send an empty prompt when the prompt is only the passage', () => {
    expect(practiceExplainContext({ prompt: 'Text.', passage: 'Text.' })).toEqual({ prompt: 'Text.' })
  })
})
