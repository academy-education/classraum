/**
 * THE REGRESSION CHECK FOR THE CONFIG REFACTOR.
 *
 * Rendering used to take a preset spec with its own field names
 * (`hairColour`, `clothes`). It now takes an AvatarConfig
 * (`hairColor`, `top`), and the 27 presets were rewritten AS configs.
 * That rewrite was a bulk rename across 27 hand-authored entries and
 * roughly 300 field values, and the failure mode is silent: a preset
 * that quietly loses its uniform, or picks up the default backdrop, or
 * swaps two skin tones, still renders a perfectly plausible person.
 * Nothing in avatars.test.tsx would notice — every assertion there is
 * about the SHAPE of the set (how many tones, how many textures), and a
 * swap between two presets leaves all of those numbers unchanged.
 *
 * So the check is not a property, it is an identity: the exact SVG
 * markup every preset produced BEFORE the refactor, captured from the
 * old renderer and checked in as __fixtures__/preset-render-baseline
 * .json, must still be produced byte for byte.
 *
 * Why a fixture and not a jest snapshot: `--ci` aside, a snapshot file
 * is rewritten by `-u` and by any run that finds it missing, so the
 * baseline could be silently re-blessed to whatever the code now does —
 * which is exactly the thing being guarded. This fixture was generated
 * once, from the pre-refactor code, and updating it means deliberately
 * editing 100 KB of markup.
 *
 * ── What this CANNOT tell you ────────────────────────────────────────
 * It cannot tell you the presets look right — only that they look the
 * same as they did. The baseline was captured from code that had
 * already shipped its own visual defects and fixes; if a preset was
 * ugly on 2026-08-02 it is equally ugly now and this passes. Nor does
 * it cover anything the builder can produce that no preset uses: a
 * hijab over a blazer, freckles at tone-8, teal hair with a necktie.
 * Those combinations have no baseline and were checked by rendering
 * them and looking.
 */
import { render } from '@testing-library/react'
import baseline from './__fixtures__/preset-render-baseline.json'
import {
  PersonAvatar, STUDY_AVATAR_LIST, presetConfig, normaliseAvatarConfig,
} from '@/app/mobile/study/_shared/avatars'
import { STUDY_AVATAR_IDS } from '@/lib/study/avatars'

const BASELINE = baseline as Record<string, string>

/** Exactly how the baseline was captured: size 120, label = the id. */
function renderPreset(spec: (typeof STUDY_AVATAR_LIST)[number]): string {
  const { container } = render(
    <PersonAvatar config={spec} size={120} label={spec.id} />,
  )
  return container.innerHTML
}

describe('the 27 presets survive the move to configs', () => {
  it('has a baseline for every id, and no baseline for anything else', () => {
    // Guards the test itself: a preset dropped from the fixture would
    // otherwise stop being checked and the suite would stay green.
    expect(Object.keys(BASELINE).sort()).toEqual([...STUDY_AVATAR_IDS].sort())
    expect(Object.keys(BASELINE)).toHaveLength(27)
  })

  it.each(STUDY_AVATAR_LIST.map(s => [s.id, s] as const))(
    '%s renders byte-identically to the pre-refactor markup',
    (id, spec) => {
      expect(renderPreset(spec)).toBe(BASELINE[id])
    },
  )

  it('renders the same whether the config arrives as a preset or as raw jsonb', () => {
    // The path a stored avatar_config actually takes: JSON off the wire,
    // through normaliseAvatarConfig, into the renderer. If normalise
    // drops or reorders a field, the preset a student picked and the
    // config saved for them would drift apart AFTER they hit save —
    // long after any of the checks above ran.
    for (const spec of STUDY_AVATAR_LIST) {
      const overWire = JSON.parse(JSON.stringify(presetConfig(spec)))
      const config = normaliseAvatarConfig(overWire)
      expect(config).not.toBeNull()
      const { container } = render(
        <PersonAvatar config={config!} size={120} label={spec.id} />,
      )
      expect(container.innerHTML).toBe(BASELINE[spec.id])
    }
  })

  it('survives a config carrying junk keys and retired part values', () => {
    // A config written by a future build, read by this one. The unknown
    // parts degrade; the parts this build knows are untouched; nothing
    // blanks.
    const spec = STUDY_AVATAR_LIST[0]
    const config = normaliseAvatarConfig({
      ...presetConfig(spec),
      hair: 'mullet-2029',        // a style this build cannot draw
      __proto__: { evil: true },
      unknownCategory: 'whatever',
    })
    expect(config).not.toBeNull()
    expect(config!.skin).toBe(spec.skin)
    expect(config!.top).toBe(spec.top)
    // Degraded, not dropped.
    expect(config!.hair).toBe('crop-neat')
    expect(config).not.toHaveProperty('unknownCategory')
    const { container } = render(<PersonAvatar config={config!} size={120} />)
    expect(container.querySelectorAll('svg *').length).toBeGreaterThan(12)
  })
})
