/**
 * Where the silence is at the edges of a TTS clip.
 *
 * ── Why this exists ──────────────────────────────────────────────────
 * A TOEFL Listening conversation is spoken by synthesising each speaker
 * turn as its OWN mp3 and playing them in sequence. Every turn boundary
 * therefore carries whatever silence OpenAI left on the end of one clip
 * plus whatever it left on the start of the next.
 *
 * Measured over 17 real clips pulled from the production cache
 * (2026-08-04): mean 53 ms leading, 230 ms trailing, so ~283 ms of dead
 * air per join before the player adds anything of its own. Trailing
 * silence is the wildly variable one — 0 ms on one clip, 626 ms on
 * another — which is why a fixed fudge factor cannot fix this and the
 * clip has to be measured.
 *
 * At a median 11 turns that is ~2.8 s of pure padding across a
 * conversation, in ten discrete lumps. Real ETS conversations are a
 * single continuous recording of two actors and have none of it. A
 * student hears our version as a stack of separate clips — reported as
 * "too many switches".
 *
 * ── What this does NOT do ────────────────────────────────────────────
 * It does not modify audio. It returns offsets, and the player seeks
 * past the lead and advances early to skip the trail. Nothing is
 * re-encoded, so the storage cache stays byte-identical and this is
 * reversible by ignoring the numbers.
 */

export interface EdgeSilence {
  /** Seconds of silence at the start. Seek here to skip it. */
  lead: number
  /** Seconds of silence at the end. Advance this early to skip it. */
  trail: number
}

export interface TrimOptions {
  /**
   * Amplitude below which a sample counts as silence. -50 dBFS
   * (~0.00316) matches the `silencedetect=n=-50dB` threshold the
   * measurement above used. Real speech never sustains this low, and
   * mp3 decoding noise sits well under it.
   */
  threshold?: number
  /**
   * Shortest run that counts, in seconds. Without this, a plosive gap
   * mid-word reads as silence and we would cut a syllable off. 50 ms
   * matches the `d=0.05` used in measurement.
   */
  minRun?: number
  /**
   * Safety margin left in place at each edge, in seconds. Trimming to
   * the exact first non-silent sample clips the attack of the first
   * consonant, which sounds worse than the padding did.
   */
  guard?: number
}

const DEFAULTS: Required<TrimOptions> = { threshold: 0.00316, minRun: 0.05, guard: 0.02 }

/**
 * Measure the silent runs at each edge of one mono channel.
 *
 * Returns zeroes for anything it cannot make sense of — an empty
 * buffer, a nonsense sample rate, or a clip that is silent end to end.
 * A clip that is ENTIRELY silent is the important one: reporting its
 * full length as trimmable would make the player skip it instantly and
 * the student would lose that speaker turn with no error shown.
 * Silence must never be the failure mode, so an all-silent clip is
 * treated as untrimmable and plays in full.
 */
export function measureEdgeSilence(
  samples: Float32Array,
  sampleRate: number,
  options: TrimOptions = {},
): EdgeSilence {
  const { threshold, minRun, guard } = { ...DEFAULTS, ...options }
  const none: EdgeSilence = { lead: 0, trail: 0 }
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) return none
  if (samples.length === 0) return none

  let first = -1
  for (let i = 0; i < samples.length; i++) {
    if (Math.abs(samples[i]) > threshold) { first = i; break }
  }
  // Entirely silent — see the note above; do not offer to skip it all.
  if (first === -1) return none

  let last = samples.length - 1
  for (let i = samples.length - 1; i >= 0; i--) {
    if (Math.abs(samples[i]) > threshold) { last = i; break }
  }

  const leadSec = first / sampleRate
  const trailSec = (samples.length - 1 - last) / sampleRate

  return {
    lead: leadSec >= minRun ? Math.max(0, leadSec - guard) : 0,
    trail: trailSec >= minRun ? Math.max(0, trailSec - guard) : 0,
  }
}

/**
 * When to start the next turn, given this clip's length and trailing
 * silence, plus the deliberate pause we want between speakers.
 *
 * `gap` is a real conversational beat, not padding — turns that butt
 * together with zero space sound like one person talking to themselves.
 * It is small on purpose: measured human turn transitions cluster near
 * 200 ms and frequently overlap, so the old 350 ms sat on top of ~283 ms
 * of clip padding and produced ~633 ms holes.
 *
 * Never returns less than `minPlay`, so a clip that measures as almost
 * entirely silent still gets audible airtime rather than being skipped.
 */
export function advanceAtSeconds(
  duration: number,
  trail: number,
  gap: number,
  minPlay = 0.15,
): number {
  if (!Number.isFinite(duration) || duration <= 0) return minPlay
  const audible = Math.max(minPlay, duration - Math.max(0, trail))
  return Math.min(duration, audible) + Math.max(0, gap)
}

/** The deliberate beat between speaker turns, in ms. */
export const TURN_GAP_MS = 120
