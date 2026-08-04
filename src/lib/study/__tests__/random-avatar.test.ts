/**
 * The randomiser is held to the SAME bars as the 27 hand-authored
 * presets, because it is a preset author that never gets tired. If it is
 * held to a lower bar it becomes the one path in the product that can
 * produce an avatar a human reviewer would have rejected — and nobody
 * reviews the millionth roll.
 *
 * Both thresholds below are copied from `avatars.test.tsx`, which holds
 * the presets to them. They are duplicated rather than imported so that
 * loosening one for the presets does not silently loosen it here too.
 */
import {
  randomAvatarConfig, normaliseAvatarConfig, contrastRatio,
  SKIN_RAMP, HAIR_COLOURS, HAIR_STYLES, SKIN_TONES,
  FACE_SHAPE_KEYS, EYE_SHAPE_KEYS, BROW_SHAPE_KEYS, MOUTH_SHAPE_KEYS,
  FACIAL_HAIR_KEYS, ACCESSORY_KEYS, HAIR_STYLE_KEYS, HAIR_COLOR_KEYS, IRIS_KEYS,
} from '@/lib/study/avatarConfig'

const MIN_BG_VS_SKIN = 1.14
const MIN_HAIR_VS_SKIN = 1.3

/** Deterministic RNG — a flaky art test is a test that gets deleted. */
function lcg(seed: number) {
  let s = seed >>> 0
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
}

const many = (n: number, seed = 1) => {
  const rand = lcg(seed)
  return Array.from({ length: n }, () => randomAvatarConfig(rand))
}

describe('randomAvatarConfig', () => {
  const SAMPLE = many(600)

  it('only ever emits parts the renderer can draw', () => {
    // A config naming a part that does not exist renders a blank or
    // throws, and it would be stored in the database before anyone saw
    // it.
    for (const c of SAMPLE) {
      expect(SKIN_TONES).toContain(c.skin)
      expect(FACE_SHAPE_KEYS).toContain(c.face)
      expect(EYE_SHAPE_KEYS).toContain(c.eyes)
      expect(IRIS_KEYS).toContain(c.iris)
      expect(BROW_SHAPE_KEYS).toContain(c.brow)
      expect(MOUTH_SHAPE_KEYS).toContain(c.mouth)
      expect(FACIAL_HAIR_KEYS).toContain(c.facialHair)
      expect(HAIR_STYLE_KEYS).toContain(c.hair)
      expect(HAIR_COLOR_KEYS).toContain(c.hairColor)
      expect(ACCESSORY_KEYS).toContain(c.accessory)
      expect(c.top).toMatch(/^#[0-9A-F]{6}$/i)
      expect(c.bg).toMatch(/^#[0-9A-F]{6}$/i)
    }
  })

  it('never puts the backdrop at the skin luminance', () => {
    // The failure this prevents is not ugliness, it is a head with no
    // edge — the silhouette disappears into the disc behind it.
    const bad = SAMPLE
      .filter(c => contrastRatio(c.bg, SKIN_RAMP[c.skin].base) < MIN_BG_VS_SKIN)
      .map(c => `${c.skin} on ${c.bg}`)
    expect(bad).toEqual([])
  })

  it('never puts the hair at the skin luminance', () => {
    const bad = SAMPLE
      .filter(c => {
        const t = HAIR_STYLES[c.hair].texture
        if (t === 'none' || t === 'covered') return false // bald / hijab have no hair mass
        return contrastRatio(SKIN_RAMP[c.skin].base, HAIR_COLOURS[c.hairColor].base) < MIN_HAIR_VS_SKIN
      })
      .map(c => `${c.skin} + ${c.hairColor}`)
    expect(bad).toEqual([])
  })

  it('survives a round-trip through the storage normaliser', () => {
    // What the randomiser makes has to be what comes back out of
    // avatar_config, or "randomise" would look right until reload.
    for (const c of SAMPLE.slice(0, 60)) {
      expect(normaliseAvatarConfig(JSON.parse(JSON.stringify(c)))).toEqual(c)
    }
  })

  it('actually varies — it is not one avatar with a new shirt', () => {
    // The point of the button. A randomiser that reliably lands on the
    // same face passes every check above.
    const faces = new Set(SAMPLE.map(c => `${c.skin}|${c.face}|${c.eyes}|${c.hair}|${c.hairColor}`))
    expect(faces.size).toBeGreaterThan(SAMPLE.length * 0.9)
    // …and each individual axis has to move, not just their combination.
    for (const axis of ['skin', 'face', 'eyes', 'hair', 'accessory'] as const) {
      expect(new Set(SAMPLE.map(c => c[axis])).size).toBeGreaterThan(1)
    }
  })

  it('keeps the audience plausible: uniforms common, beards rare', () => {
    // Not decoration. These students wear a uniform daily, and a
    // middle-schooler with a full beard is a joke that stops being funny
    // on the second roll — an equal-weight pick over the vocabulary
    // would give roughly a quarter of them one.
    const uniformed = SAMPLE.filter(c => c.uniform).length / SAMPLE.length
    const bearded = SAMPLE.filter(c => c.facialHair !== 'none').length / SAMPLE.length
    expect(uniformed).toBeGreaterThan(0.2)
    expect(uniformed).toBeLessThan(0.5)
    expect(bearded).toBeLessThan(0.2)
  })

  it('gives a blazer its own tie colour', () => {
    // A blazer with no tieColor draws its ribbon in the default red
    // whatever the blazer is — the same silent-wrong-colour trap
    // avatars.test.tsx pins for the presets.
    for (const c of SAMPLE.filter(x => x.uniform && x.uniform !== 'shirt-collar')) {
      expect(c.tieColor).toMatch(/^#[0-9A-F]{6}$/i)
    }
  })

  it('is deterministic for a given rand, so a bad roll can be reproduced', () => {
    expect(randomAvatarConfig(lcg(42))).toEqual(randomAvatarConfig(lcg(42)))
    expect(randomAvatarConfig(lcg(42))).not.toEqual(randomAvatarConfig(lcg(43)))
  })
})
