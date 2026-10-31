/**
 * @jest-environment jsdom
 *
 * The co-founder's review panel must present iTEP items the way the test does (pre-release audit, 2026-10-31):
 *  (a) an error-identification item shows its sentence with "[A: ...]" drawn as underlined, lettered segments, and
 *      the options stay in the sentence's A..D order;
 *  (b) a listening item is HEARD — the student audio player (TTS on first play) — and its transcript, which is the
 *      answer key, appears neither in the blind phase nor as text in the reveal (only behind the player's toggle).
 * Before this the reveal printed every stimulus as raw text: "[A: has bought]" literally, and a listening item's
 * whole transcript with no audio at all. Fixtures are real staged rows (itep-grammar-v3, itep-listening-v1).
 */
import React from 'react'
import { act, render, screen } from '@testing-library/react'
import { ReviewPanel } from '../ReviewPanel'

jest.mock('@/lib/supabase', () => ({
  db: { auth: { getSession: async () => ({ data: { session: { access_token: 't' } } }) } },
}))
jest.mock('@/app/mobile/study/session/[id]/test/QuestionGraphicView', () => ({ QuestionGraphicView: () => null }))
const playerProps: Array<Record<string, unknown>> = []
jest.mock('@/app/mobile/study/session/[id]/test/ListeningAudioPlayer', () => ({
  // Stands in for the real player (it needs the TTS route and a LanguageProvider); records what it was handed and
  // renders none of the transcript, as the real one does until its toggle is pressed.
  ListeningAudioPlayer: (p: Record<string, unknown>) => { playerProps.push(p); return <div data-testid="audio-player" /> },
}))

const ERROR_ID = {
  passage: 'Yesterday, Ji-woo [A: has bought] a used bicycle [B: from her neighbor] for thirty dollars, and she [C: is going to] paint it [D: herself].',
  prompt: 'Choose the underlined word or phrase that is NOT correct.',
  choices: ['has bought', 'from her neighbor', 'is going to', 'herself'],
}
const DIALOGUE = {
  passage: "Transcript: M: Are you waiting for the secretary? She's out until two.\nW: Oh. I'm new, and I want to join the volleyball team. I came to get the form.\nM: You don't need a form. Just come to the gym on Thursday after school. That's what I did.",
  prompt: 'Why did the woman come to the office?',
  choices: ['To get the form for joining the volleyball team', 'To ask when volleyball practice starts', 'To find out where the gym is located', 'To see the secretary about her timetable'],
}

let nextBody: Record<string, unknown> = {}
beforeEach(() => {
  playerProps.length = 0
  global.fetch = jest.fn(async (url: string) => {
    const body = url.includes('next=1') ? nextBody : { runs: [], agreement: [], openRun: 'itep-audit-cofounder-2026-10-31' }
    return { ok: true, json: async () => body } as Response
  }) as unknown as typeof fetch
})
const flush = () => act(async () => { await new Promise(r => setTimeout(r, 0)) })
const reveal = (it: typeof ERROR_ID, options: string[]) => ({
  itemId: 'i1', options,
  reveal: { stimulus: it.passage, prompt: it.prompt, graphic: null, options, keySlot: 'A', wasCorrect: false },
})

describe('error identification', () => {
  it('blind phase lists the segments in the sentence order, lettered A-D', async () => {
    nextBody = { itemId: 'i1', options: ERROR_ID.choices }
    render(<ReviewPanel domains={['Part 2: Error Identification']} />)
    await flush()
    const buttons = screen.getAllByRole('button').filter(b => ERROR_ID.choices.some(c => b.textContent?.includes(c)))
    expect(buttons.map(b => b.textContent)).toEqual(['Ahas bought', 'Bfrom her neighbor', 'Cis going to', 'Dherself'])
  })

  it('reveal draws [A:]..[D:] as underlined lettered segments, never as raw markers', async () => {
    nextBody = reveal(ERROR_ID, ERROR_ID.choices)
    const { container } = render(<ReviewPanel domains={['Part 2: Error Identification']} />)
    await flush()
    const box = screen.getByTestId('review-segments')
    expect(box.textContent).not.toContain('[A:')
    expect(box.textContent).toContain('has bought')
    for (const L of ['A', 'B', 'C', 'D']) expect(container.querySelector(`[aria-label="segment ${L}"]`)).not.toBeNull()
  })

  it('a shuffled option order is not drawn as segments (its letters would disagree with the sentence)', async () => {
    nextBody = reveal(ERROR_ID, [ERROR_ID.choices[2], ERROR_ID.choices[0], ERROR_ID.choices[1], ERROR_ID.choices[3]])
    render(<ReviewPanel domains={['Part 2: Error Identification']} />)
    await flush()
    expect(screen.queryByTestId('review-segments')).toBeNull()
  })
})

describe('listening', () => {
  it('blind phase shows the options only: no transcript, no player', async () => {
    nextBody = { itemId: 'i1', options: DIALOGUE.choices }
    render(<ReviewPanel domains={['Part 1: Short Conversations']} />)
    await flush()
    expect(screen.getByText(DIALOGUE.choices[1])).toBeTruthy()
    expect(document.body.textContent).not.toContain('I came to get the form')
    expect(screen.queryByTestId('audio-player')).toBeNull()
  })

  it('reveal plays the audio and does not print the transcript', async () => {
    nextBody = reveal(DIALOGUE, DIALOGUE.choices)
    render(<ReviewPanel domains={['Part 1: Short Conversations']} />)
    await flush()
    expect(screen.getByTestId('audio-player')).toBeTruthy()
    expect(document.body.textContent).not.toContain('I came to get the form')
    expect(document.body.textContent).not.toContain('Transcript:')
    const p = playerProps[playerProps.length - 1]
    expect(p.transcript).toBe(DIALOGUE.passage)
    expect(p.allowTranscriptReveal).toBe(true)
    expect(screen.getByText(DIALOGUE.prompt)).toBeTruthy()
  })
})
