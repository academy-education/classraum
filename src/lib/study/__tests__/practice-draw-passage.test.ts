/** @jest-environment node */
/**
 * drawBankPractice folds the passage into `prompt` (the practice UI has no
 * passage pane) AND carries it as `passage`, so "Explain more" can send the
 * passage and the bare question separately instead of one string the explain
 * route clamps from the front.
 */
import { drawBankPractice } from '@/lib/study/assemble'
import { dbAdmin } from '@/lib/supabase-admin'
import { practiceExplainContext } from '@/lib/study/practice-explain'
import { tableRouter } from '@/tests/study-route-helpers'

jest.mock('@/lib/supabase-admin', () => ({ dbAdmin: { from: jest.fn() } }))

const item = (id: string, passage?: string) => ({
  id,
  item: {
    prompt: `Question ${id}?`,
    type: 'multiple_choice',
    choices: ['w', 'x', 'y', 'z'],
    correct_answer: 'x',
    difficulty: 'medium',
    explanation: 'because',
    ...(passage ? { passage } : {}),
  },
})

describe('drawBankPractice passage', () => {
  it('carries the passage beside the folded prompt, and only when there is one', async () => {
    const enqueue = tableRouter(dbAdmin.from as unknown as jest.Mock)
    enqueue('study_item_bank', { data: [item('a', '  The passage text.  '), item('b')] })
    const qs = await drawBankPractice({ section: 'reading_writing', count: 2, seed: 's' })
    const withP = qs.find(q => q.prompt.includes('Question a?'))!
    const without = qs.find(q => q.prompt.includes('Question b?'))!
    expect(withP.prompt).toBe('The passage text.\n\nQuestion a?')
    expect(withP.passage).toBe('The passage text.')
    expect('passage' in without).toBe(false)
    // The pair round-trips into the split the explain call sends.
    expect(practiceExplainContext(withP)).toEqual({ prompt: 'Question a?', passage: 'The passage text.' })
  })
})
