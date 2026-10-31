/** @jest-environment node */
/**
 * listening-voice (2026-10-31, iTEP Listening v1): W/M are pinned to nova/onyx whatever the order, other labels keep
 * the order-of-appearance rotation, and the two script replicas (prewarm-toefl-audio.mjs, bank-integrity-sweep.mjs)
 * produce the same segments as the module the player uses. Break-tested when written: removing the W/M pin from
 * FIXED_SPEAKER_VOICE fails the first test, and from either replica fails the parity test.
 */
import { listeningSegments, voiceForSpeaker, type TtsVoice } from '@/lib/study/listening-voice'
import { listeningSegments as prewarmSegments } from '../../../../scripts/study-bank/prewarm-toefl-audio.mjs'
import { execFileSync } from 'node:child_process'

// bank-integrity-sweep.mjs has top-level await, which jest's CJS transform cannot load: run it in real node.
const sweepSegments = (passage: string) => JSON.parse(execFileSync('node', ['--input-type=module', '-e',
  `import { audioSegments } from './scripts/study-bank/bank-integrity-sweep.mjs'; process.stdout.write(JSON.stringify(audioSegments({ family: 'toefl', section: 'listening', item: { type: 'multiple_choice', passage: ${JSON.stringify(passage)} } })))`,
], { encoding: 'utf8', cwd: process.cwd() }))

const MAN_FIRST = "Transcript: M: Did you bring the list?\nW: It's in my bag.\nM: Great, let's go."
const TOEFL_AB = 'Transcript: A: Is the lab open today? B: Only until four. A: Then I will hurry.'
const LECTURE = 'Transcript: So today we look at why rivers bend. Here is the interesting part.'

describe('listening voices', () => {
  it('pins the man to onyx and the woman to nova even when the man speaks first', () => {
    expect(listeningSegments(MAN_FIRST).map(s => s.voice)).toEqual(['onyx', 'nova', 'onyx'])
  })
  it('keeps the order-of-appearance rotation for TOEFL A/B transcripts (no cached clip changes)', () => {
    expect(listeningSegments(TOEFL_AB).map(s => s.voice)).toEqual(['nova', 'onyx', 'nova'])
  })
  it('reads a monologue as one nova segment', () => {
    expect(listeningSegments(LECTURE)).toEqual([{ text: 'So today we look at why rivers bend. Here is the interesting part.', voice: 'nova' }])
  })
  it('voiceForSpeaker remembers an assignment; a pinned label ignores the order', () => {
    const m = new Map<string, TtsVoice>()
    expect([voiceForSpeaker('M', m), voiceForSpeaker('W', m), voiceForSpeaker('M', m)]).toEqual(['onyx', 'nova', 'onyx'])
  })
  it('the prewarm and integrity-sweep replicas match the module on every fixture', () => {
    for (const p of [MAN_FIRST, TOEFL_AB, LECTURE]) {
      expect(prewarmSegments(p)).toEqual(listeningSegments(p))
      expect(sweepSegments(p)).toEqual(listeningSegments(p))
    }
  })
})
