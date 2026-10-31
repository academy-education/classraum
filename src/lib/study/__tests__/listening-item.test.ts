import { isListeningItem } from '../listening-item'

describe('isListeningItem', () => {
  it('is decided by the item, not the family', () => {
    expect(isListeningItem({ type: 'multiple_choice', passage: 'Transcript: W: Hi.\nM: Hello.' })).toBe(true)
    expect(isListeningItem({ type: 'multiple_choice', passage: '  transcript : A lecture.' })).toBe(true)
  })
  it('is false for reading passages, empty passages and speaking items', () => {
    expect(isListeningItem({ type: 'multiple_choice', passage: 'The transcript: of the trial was long.' })).toBe(false)
    expect(isListeningItem({ type: 'multiple_choice', passage: null })).toBe(false)
    expect(isListeningItem({ type: 'speaking_repeat', passage: 'Transcript: Repeat me.' })).toBe(false)
    expect(isListeningItem({ type: 'speaking_interview', passage: 'Transcript: Q?' })).toBe(false)
    expect(isListeningItem(null)).toBe(false)
  })
})
