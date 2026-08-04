import { measureEdgeSilence, advanceAtSeconds, TURN_GAP_MS } from '../audio-trim'

/**
 * Edge-silence measurement, pinned against the real numbers.
 *
 * The reference measurement (ffmpeg silencedetect at -50dB/50ms over 17
 * clips fetched from the production storage cache, 2026-08-04) found
 * mean 53 ms lead and 230 ms trail, trail ranging 0-626 ms. These tests
 * reproduce that shape synthetically so the decoder path can be checked
 * without shipping mp3 fixtures.
 *
 * One history note worth keeping: the first run of that ffmpeg
 * measurement reported 0.000 s of padding on every single clip, and it
 * was wrong — `-v error` suppresses silencedetect, which logs at info
 * level, so the parser was reading an empty string and confidently
 * printing zero. It was caught by splicing a known 250 ms of silence
 * onto a clip and finding the detector still said zero. Hence the
 * positive-control test below: a measurement that cannot report a
 * planted value is not a measurement.
 */

const SR = 24000

/** Build a clip: `lead` seconds of silence, `speech` seconds of tone, `trail` of silence. */
function clip(lead: number, speech: number, trail: number, amp = 0.4): Float32Array {
  const n = Math.round((lead + speech + trail) * SR)
  const out = new Float32Array(n)
  const from = Math.round(lead * SR)
  const to = Math.round((lead + speech) * SR)
  for (let i = from; i < to; i++) out[i] = Math.sin((2 * Math.PI * 220 * i) / SR) * amp
  return out
}

describe('measureEdgeSilence', () => {
  it('reports a planted silence (the control the ffmpeg run failed)', () => {
    // 250 ms spliced onto each end — the exact case that exposed the
    // broken measurement. If this returns 0, the measurement is dead.
    const { lead, trail } = measureEdgeSilence(clip(0.25, 1.0, 0.25), SR)
    expect(lead).toBeGreaterThan(0.2)
    expect(trail).toBeGreaterThan(0.2)
  })

  it('matches the real production profile within a frame', () => {
    // The measured mean: 53 ms lead, 230 ms trail. Guard is 20 ms, so
    // expect the reported values a touch under the true silence.
    const { lead, trail } = measureEdgeSilence(clip(0.053, 2.0, 0.230), SR)
    expect(lead).toBeCloseTo(0.033, 2)
    expect(trail).toBeCloseTo(0.210, 2)
  })

  it('leaves a guard so the first consonant is not clipped', () => {
    const { lead } = measureEdgeSilence(clip(0.3, 1, 0.1), SR)
    // Never trims all the way to the first non-silent sample.
    expect(lead).toBeLessThan(0.3)
    expect(0.3 - lead).toBeCloseTo(0.02, 3)
  })

  it('ignores a short gap so a mid-word pause is not treated as an edge', () => {
    // 20 ms of lead is under the 50 ms minimum run — report nothing
    // rather than shaving a plosive.
    expect(measureEdgeSilence(clip(0.02, 1, 0.02), SR)).toEqual({ lead: 0, trail: 0 })
  })

  it('refuses to trim an all-silent clip', () => {
    // The dangerous case. Reporting the full length as trimmable would
    // make the player skip the turn instantly and the student would
    // never hear that speaker — silence as a silent failure.
    const silent = new Float32Array(SR * 2)
    expect(measureEdgeSilence(silent, SR)).toEqual({ lead: 0, trail: 0 })
  })

  it('degrades to no-trim on junk input rather than throwing', () => {
    expect(measureEdgeSilence(new Float32Array(0), SR)).toEqual({ lead: 0, trail: 0 })
    expect(measureEdgeSilence(clip(0.1, 1, 0.1), 0)).toEqual({ lead: 0, trail: 0 })
    expect(measureEdgeSilence(clip(0.1, 1, 0.1), NaN)).toEqual({ lead: 0, trail: 0 })
  })
})

describe('advanceAtSeconds', () => {
  it('cuts the join from ~633ms to the intended beat', () => {
    // Real numbers: a 2.38 s clip with 592 ms of trailing silence,
    // followed by a clip with 53 ms of lead.
    const gap = TURN_GAP_MS / 1000
    const advanceAt = advanceAtSeconds(2.38, 0.592, gap)
    // Old behaviour: play all 2.38 s, then wait 350 ms, then the next
    // clip spends 53 ms silent before speaking.
    const oldDeadAir = 0.592 + 0.35 + 0.053
    // New: the next clip starts at `advanceAt`, so the silence a student
    // hears is whatever sits between the end of audible speech and that
    // moment — the beat, and nothing else. The next clip's own 53 ms of
    // lead is seeked past, and its trailing silence is never reached
    // because the following clip starts over it.
    const audibleEnd = 2.38 - 0.592
    const newDeadAir = advanceAt - audibleEnd
    expect(oldDeadAir).toBeCloseTo(0.995, 2)
    expect(newDeadAir).toBeCloseTo(gap, 3)
    expect(newDeadAir).toBeLessThan(0.13)
  })

  it('never skips a turn, however silent it measures', () => {
    // A clip that measures as almost all silence must still play. The
    // student losing a speaker turn is far worse than a stray pause.
    expect(advanceAtSeconds(1.0, 0.99, 0.12)).toBeGreaterThanOrEqual(0.15)
    expect(advanceAtSeconds(1.0, 5.0, 0.12)).toBeGreaterThanOrEqual(0.15)
  })

  it('never advances past the end of the clip', () => {
    // Beyond `duration` the timer would never fire before onended, so
    // clamp — otherwise a trailing-silence overestimate stalls the chain.
    expect(advanceAtSeconds(2.0, 0, 0.5)).toBeLessThanOrEqual(2.0 + 0.5)
    expect(advanceAtSeconds(2.0, -1, 0)).toBeLessThanOrEqual(2.0)
  })

  it('handles junk duration without stalling playback', () => {
    expect(advanceAtSeconds(NaN, 0.2, 0.12)).toBe(0.15)
    expect(advanceAtSeconds(0, 0.2, 0.12)).toBe(0.15)
  })

  it('keeps the beat well under the old 350ms', () => {
    // The gap is a conversational beat, not padding. If someone raises
    // this back toward 350 the join regresses, so pin it.
    expect(TURN_GAP_MS).toBeLessThan(200)
    expect(TURN_GAP_MS).toBeGreaterThan(0)
  })
})
