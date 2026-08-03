"use client"

import { useEffect, useMemo, useState } from 'react'
import { authHeaders } from '@/lib/auth-headers'
import { useTranslation } from '@/hooks/useTranslation'
import { Card } from '@/components/ui/card'
import { Eyebrow } from '@/components/ui/eyebrow'
import { Check, Loader2, Student } from '@/app/mobile/study/_shared/icons'
import { PersonAvatar } from '@/app/mobile/study/_shared/avatars'
import {
  STUDY_AVATAR_LIST, getStudyAvatar, presetConfig, normaliseAvatarConfig,
  DEFAULT_AVATAR_CONFIG, ensureVisibleBackdrop, backdropIsVisible,
  SKIN_RAMP, IRIS,
  SKIN_TONES, FACE_SHAPE_KEYS, EYE_SHAPE_KEYS, IRIS_KEYS, BROW_SHAPE_KEYS,
  MOUTH_SHAPE_KEYS, HAIR_STYLE_KEYS, HAIR_COLOR_KEYS, ACCESSORY_KEYS,
  FACIAL_HAIR_KEYS, UNIFORM_KEYS, GARMENT_PALETTE, BACKDROP_PALETTE,
  TIE_PALETTE, COVER_PALETTE,
  type AvatarConfig,
} from '@/lib/study/avatarConfig'

/**
 * The avatar BUILDER — the study section's identity setting.
 *
 * ── Why this replaced a preset grid ──────────────────────────────────
 * The picker this grew out of offered 27 finished people and nothing
 * else, so two students who both wanted "me, but with my hair" had to
 * settle for the same face. The builder keeps every one of those 27 —
 * prominently, as the FIRST thing on the card — because a parts-only
 * builder has the opposite failure: faced with a blank slate and eleven
 * dropdowns, almost everybody keeps the defaults, and the set collapses
 * onto one face from the other direction. Presets are the starting
 * point; the tabs are what you do next.
 *
 * ── What is saved ────────────────────────────────────────────────────
 *   avatar_config  the config. The source of truth for rendering.
 *   avatar_id      which preset it was seeded from, or NULL once the
 *                  student has changed anything (they built it), and
 *                  NULL if they never touched a preset.
 *
 * "Use my initials" writes NULL to both. That is the way back, and it
 * has to exist: without it, choosing an avatar would be one-way.
 *
 * ── Degrading with migration 072 unapplied ───────────────────────────
 * 072 IS NOT APPLIED. The GET simply has no `avatar_config` field, so
 * the card opens on whatever preset the student has (or initials). A
 * save comes back 200 with `unsupported: ['avatar_config']` — or 503 if
 * there was nothing else to write — and the card says so rather than
 * showing a face that the next reload will undo. Nothing here throws,
 * and nothing here shows a blank disc.
 *
 * ── Saving is explicit ───────────────────────────────────────────────
 * Every other setting on this page saves on tap. This one does not: a
 * student trying hairstyles produces a tap per style, and auto-save
 * would mean a PUT per tap plus a leaderboard that flickers through
 * every rejected face. The Save button appears only when the draft
 * differs from what is stored.
 */

type Tab = 'skin' | 'face' | 'hair' | 'color' | 'extras' | 'clothes'
const TABS: Tab[] = ['skin', 'face', 'hair', 'color', 'extras', 'clothes']

/** What the server currently holds, as far as this card knows. */
interface Stored {
  config: AvatarConfig | null
  presetId: string | null
}

export function StudyAvatarCard() {
  const { t } = useTranslation()

  const [stored, setStored] = useState<Stored | null>(null)
  const [draft, setDraft] = useState<Stored | null>(null)
  const [tab, setTab] = useState<Tab>('skin')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [failed, setFailed] = useState(false)
  const [unsupported, setUnsupported] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const headers = await authHeaders()
        const res = await fetch('/api/study/prefs', { headers })
        if (!res.ok) { if (!cancelled) setLoadFailed(true); return }
        const json = await res.json()
        // `avatar_config` is simply ABSENT while 072 is unapplied, which
        // normaliseAvatarConfig turns into null — the initials state.
        // The preset id (071) is read separately so a student who has
        // one still sees it selected.
        const config = normaliseAvatarConfig(json?.prefs?.avatar_config)
        const presetId = (json?.prefs?.avatar_id as string | null) ?? null
        const seed: Stored = {
          config: config ?? (getStudyAvatar(presetId) ? presetConfig(getStudyAvatar(presetId)!) : null),
          presetId,
        }
        if (cancelled) return
        setStored(seed)
        setDraft(seed)
      } catch {
        if (!cancelled) setLoadFailed(true)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const dirty = useMemo(
    () => !!stored && !!draft && JSON.stringify(stored) !== JSON.stringify(draft),
    [stored, draft],
  )

  /** Change one part. Seeding from a preset keeps its id; changing any
   *  part afterwards clears it — they built this one now. */
  const setPart = <K extends keyof AvatarConfig>(key: K, value: AvatarConfig[K]) => {
    setSaved(false)
    setDraft(d => {
      const base = d?.config ?? DEFAULT_AVATAR_CONFIG
      const next = { ...base, [key]: value }
      // The backdrop is corrected HERE and not at render time: changing
      // to white hair on a pale disc erases the whole avatar, and the
      // student has no way to know that until they see themselves on the
      // leaderboard. Picking a backdrop directly is exempt — the grid
      // already disables the ones that would vanish.
      return {
        config: key === 'bg' ? next : ensureVisibleBackdrop(next),
        presetId: null,
      }
    })
  }

  const applyPreset = (id: string) => {
    const spec = getStudyAvatar(id)
    if (!spec) return
    setSaved(false)
    setDraft({ config: presetConfig(spec), presetId: id })
  }

  const useInitials = () => {
    setSaved(false)
    setDraft({ config: null, presetId: null })
  }

  const save = async () => {
    if (!draft || saving) return
    setSaving(true)
    setFailed(false)
    setUnsupported(false)
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/study/prefs', {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_config: draft.config, avatar_id: draft.presetId }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.status === 503 || (Array.isArray(json?.unsupported) && json.unsupported.length > 0)) {
        // The column does not exist yet. Say so — do NOT leave the draft
        // looking saved, because the next reload will silently undo it.
        setUnsupported(true)
        return
      }
      if (!res.ok) { setFailed(true); return }
      setStored(draft)
      setSaved(true)
    } catch {
      setFailed(true)
    } finally {
      setSaving(false)
    }
  }

  const preview = draft?.config ?? null

  return (
    <div className="mb-6">
      <Eyebrow as="h3" className="mb-2 px-1 text-[12px] tracking-[0.10em] text-gray-600">
        {t('study.avatar.title')}
      </Eyebrow>
      <Card className="p-4 gap-0 overflow-hidden">
        {/* ── Preview ───────────────────────────────────────────────── */}
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            {preview
              ? <PersonAvatar config={preview} size={72} label={String(t('study.avatar.previewLabel'))} />
              : (
                <div
                  role="img"
                  aria-label={String(t('study.avatar.previewLabel'))}
                  className="w-[72px] h-[72px] rounded-full bg-gray-100 ring-1 ring-gray-200/80 flex items-center justify-center"
                >
                  <Student className="w-8 h-8 text-gray-400" />
                </div>
              )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] text-gray-500 leading-snug">{t('study.avatar.hint')}</p>
            <p className="mt-1 text-[11.5px] text-gray-400">
              {!preview
                ? t('study.avatar.usingInitials')
                : draft?.presetId
                  ? t('study.avatar.startedFrom', {
                      name: String(t(getStudyAvatar(draft.presetId)!.nameKey)),
                    })
                  : t('study.avatar.builtFromScratch')}
            </p>
          </div>
        </div>

        {loadFailed && (
          <p className="mt-3 text-[12.5px] text-rose-600">{t('study.avatar.loadFailed')}</p>
        )}

        {draft && (
          <>
            {/* ── Presets: the starting points, kept first and kept big ─ */}
            <Section label={String(t('study.avatar.startFrom'))} hint={String(t('study.avatar.startFromHint'))}>
              <TileRow>
                {STUDY_AVATAR_LIST.map(spec => (
                  <Tile
                    key={spec.id}
                    selected={draft.presetId === spec.id}
                    label={String(t(spec.nameKey))}
                    onSelect={() => applyPreset(spec.id)}
                    /* shrink-0 or flex squeezes 27 tiles into the row's
                       width and every face becomes a sliver. snap-start
                       pairs with the container's snap-x. */
                    className="shrink-0 snap-start"
                  >
                    <PersonAvatar config={spec} size={44} />
                  </Tile>
                ))}
              </TileRow>
            </Section>

            {/* ── Parts ────────────────────────────────────────────── */}
            <Section label={String(t('study.avatar.customise'))}>
              {/* WRAPPING pills, not a 6-up segmented control and not a
                  scrolling row. Six labels across 303px of card at 375px
                  is 50px each, which is where "Accessories" becomes
                  "Acce…"; and a scrolling row was worse still — rendered
                  at 375px the sixth pill sat half off the edge with no
                  affordance saying it could be dragged, so one whole
                  category read as decoration. Wrapping costs a second
                  row and clips nothing. */}
              <div role="tablist" aria-label={String(t('study.avatar.customise'))} className="flex items-center gap-1.5 flex-wrap">
                {TABS.map(id => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={tab === id}
                    onClick={() => setTab(id)}
                    className={`h-8 px-3.5 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all active:scale-[0.96] ${
                      tab === id
                        ? 'bg-primary text-white shadow-[0_6px_14px_-6px_rgba(40,133,232,0.6)]'
                        : 'text-gray-500 bg-gray-100 hover:text-gray-700'
                    }`}
                  >
                    {t(`study.avatar.tab.${id}`)}
                  </button>
                ))}
              </div>

              <div className="mt-3 space-y-4">
                <PartsForTab tab={tab} config={draft.config ?? DEFAULT_AVATAR_CONFIG} setPart={setPart} />
              </div>
            </Section>

            {/* ── Actions ──────────────────────────────────────────── */}
            <div className="mt-5 flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => void save()}
                disabled={!dirty || saving}
                className="h-10 px-4 rounded-xl bg-primary text-white text-[13.5px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97] transition"
              >
                {saving
                  ? <span className="inline-flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" />{t('study.avatar.saving')}</span>
                  : t('study.avatar.save')}
              </button>
              {dirty && !saving && (
                <button
                  type="button"
                  onClick={() => { setDraft(stored); setFailed(false); setUnsupported(false) }}
                  className="h-10 px-3 rounded-xl text-[13px] font-medium text-gray-600 hover:bg-gray-100 transition"
                >
                  {t('study.avatar.discard')}
                </button>
              )}
              {draft.config && (
                <button
                  type="button"
                  onClick={useInitials}
                  className="h-10 px-3 rounded-xl text-[13px] font-medium text-gray-500 hover:bg-gray-100 transition ml-auto"
                >
                  {t('study.avatar.useInitials')}
                </button>
              )}
            </div>

            {saved && !dirty && (
              <p className="mt-2 text-[12.5px] text-emerald-600 inline-flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />{t('study.avatar.saved')}
              </p>
            )}
            {failed && <p className="mt-2 text-[12.5px] text-rose-600">{t('study.avatar.saveFailed')}</p>}
            {unsupported && (
              <p className="mt-2 text-[12.5px] text-amber-700 bg-amber-50 ring-1 ring-amber-200 rounded-lg px-3 py-2">
                {t('study.avatar.unavailable')}
              </p>
            )}
          </>
        )}

        {!draft && !loadFailed && (
          <div className="mt-4 h-24 rounded-xl bg-gray-100 animate-pulse" aria-hidden />
        )}
      </Card>
    </div>
  )
}

// ── The part grids, per tab ──────────────────────────────────────────

function PartsForTab({ tab, config, setPart }: {
  tab: Tab
  config: AvatarConfig
  setPart: <K extends keyof AvatarConfig>(key: K, value: AvatarConfig[K]) => void
}) {
  const { t } = useTranslation()
  const on = <K extends keyof AvatarConfig>(key: K) => (value: AvatarConfig[K]) => setPart(key, value)
  /** The localised name of one part category. Used TWICE per group — as
   *  the visible heading and as the stem of each option's accessible
   *  name — so it is resolved once rather than repeated. */
  const L = (key: string) => String(t(`study.avatar.part.${key}`))

  switch (tab) {
    case 'skin':
      return (
        <Part label={L('skin')}>
          <Dots
            name={L('skin')}
            values={SKIN_TONES}
            colour={tone => SKIN_RAMP[tone].base}
            selected={config.skin}
            onSelect={on('skin')}
          />
        </Part>
      )

    case 'face':
      return (
        <>
          <Part label={L('faceShape')}>
            <Faces name={L('faceShape')} values={FACE_SHAPE_KEYS} config={config} field="face" onSelect={on('face')} />
          </Part>
          <Part label={L('eyes')}>
            <Faces name={L('eyes')} values={EYE_SHAPE_KEYS} config={config} field="eyes" onSelect={on('eyes')} />
          </Part>
          <Part label={L('iris')}>
            <Dots name={L('iris')} values={IRIS_KEYS} colour={k => IRIS[k]} selected={config.iris} onSelect={on('iris')} />
          </Part>
          <Part label={L('brow')}>
            <Faces name={L('brow')} values={BROW_SHAPE_KEYS} config={config} field="brow" onSelect={on('brow')} />
          </Part>
          <Part label={L('mouth')}>
            <Faces name={L('mouth')} values={MOUTH_SHAPE_KEYS} config={config} field="mouth" onSelect={on('mouth')} />
          </Part>
        </>
      )

    case 'hair':
      return (
        <Part label={L('hairStyle')}>
          <Faces name={L('hairStyle')} values={HAIR_STYLE_KEYS} config={config} field="hair" onSelect={on('hair')} />
        </Part>
      )

    case 'color':
      return (
        <>
          <Part label={L('hairColor')}>
            {/* Mini avatars, not swatches: the same brown reads completely
                differently on a buzz cut and on shoulder-length hair, and
                a 28px dot cannot say which one you are choosing. */}
            <Faces name={L('hairColor')} values={HAIR_COLOR_KEYS} config={config} field="hairColor" onSelect={on('hairColor')} />
          </Part>
          {config.hair === 'hijab' && (
            <Part label={L('coverColor')}>
              <Dots
                name={L('coverColor')}
                values={COVER_PALETTE}
                colour={c => c}
                selected={config.coverColor ?? COVER_PALETTE[0]}
                onSelect={on('coverColor')}
              />
            </Part>
          )}
        </>
      )

    case 'extras':
      return (
        <>
          <Part label={L('accessory')}>
            <Faces name={L('accessory')} values={ACCESSORY_KEYS} config={config} field="accessory" onSelect={on('accessory')} />
          </Part>
          <Part label={L('facialHair')}>
            <Faces name={L('facialHair')} values={FACIAL_HAIR_KEYS} config={config} field="facialHair" onSelect={on('facialHair')} />
          </Part>
        </>
      )

    case 'clothes':
      return (
        <>
          <Part label={L('uniform')}>
            <TileGrid>
              {UNIFORM_KEYS.map((kind, i) => {
                // 'none' is the ABSENCE of the optional key, not a value
                // for it — writing uniform: 'none' would fail the type
                // and, worse, would have drawn a collar with no uniform.
                const value = kind === 'none' ? undefined : kind
                return (
                  <Tile
                    key={kind}
                    selected={(config.uniform ?? 'none') === kind}
                    label={`${L('uniform')} ${i + 1}`}
                    onSelect={() => setPart('uniform', value)}
                  >
                    <PersonAvatar config={{ ...config, uniform: value }} size={44} />
                  </Tile>
                )
              })}
            </TileGrid>
          </Part>
          {(config.uniform === 'blazer-ribbon' || config.uniform === 'blazer-tie') && (
            <Part label={L('tieColor')}>
              <Dots
                name={L('tieColor')}
                values={TIE_PALETTE}
                colour={c => c}
                selected={config.tieColor ?? TIE_PALETTE[0]}
                onSelect={on('tieColor')}
              />
            </Part>
          )}
          <Part label={L('top')}>
            <Dots name={L('top')} values={GARMENT_PALETTE} colour={c => c} selected={config.top} onSelect={on('top')} />
          </Part>
          <Part label={L('backdrop')}>
            {/* Rendered as whole avatars and DISABLED when the subject
                would disappear into the disc. A plain swatch grid here
                would happily offer a white disc under white hair, which
                is precisely the defect the previous avatar set shipped. */}
            <TileGrid>
              {BACKDROP_PALETTE.map((bg, i) => {
                const ok = backdropIsVisible(config, bg)
                return (
                  <Tile
                    key={bg}
                    selected={config.bg === bg}
                    disabled={!ok}
                    label={`${L('backdrop')} ${i + 1}`}
                    onSelect={() => setPart('bg', bg)}
                  >
                    <PersonAvatar config={{ ...config, bg }} size={44} />
                  </Tile>
                )
              })}
            </TileGrid>
          </Part>
        </>
      )
  }
}

// ── Small building blocks ────────────────────────────────────────────

function Section({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <p className="text-[12px] font-semibold uppercase tracking-[0.10em] text-gray-600">{label}</p>
      {hint && <p className="mt-0.5 text-[11.5px] text-gray-400">{hint}</p>}
      <div className="mt-2">{children}</div>
    </section>
  )
}

function Part({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[11.5px] font-medium text-gray-500">{label}</p>
      {children}
    </div>
  )
}

/**
 * Five columns, and five is a measurement not a preference: inside a
 * `p-4` Card inside the page's `px-5`, a 375px viewport leaves 303px.
 * Five 52px tiles plus four 8px gaps is 292. Six would be 344 and the
 * PAGE would scroll sideways.
 */
function TileGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-5 gap-2">{children}</div>
}

/**
 * The presets, as ONE horizontally-scrolling row.
 *
 * A 5-wide grid turned 27 presets into six stacked rows, which pushed the
 * parts editor — the thing the card is actually for — below the fold. A row
 * costs one row of height regardless of how many presets exist, which also
 * means adding a 28th preset never re-lays-out the card.
 *
 * Follows the app's existing scroll-row recipe (topic/[slug]/page.tsx:1072):
 * bleed to the card's edges with `-mx-4 px-4` so the first and last tiles
 * sit flush and a partly-visible next tile is what tells you it scrolls;
 * `snap-x` + `scroll-px-4` so a flick lands on a tile rather than between
 * two; `scrollbar-hide` because iOS draws none anyway and a visible one on
 * desktop just adds a grey bar under the faces.
 *
 * `py-2` is NOT decoration. `overflow-x-auto` establishes a scroll container
 * that clips VERTICALLY too, and Tile's selected badge sits at
 * `-top-1 -right-1` — without the padding the tick on the chosen preset is
 * sliced off. The same note appears on the path page's scroller for the
 * same reason.
 */
function TileRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide snap-x -mx-4 px-4 scroll-px-4 py-2">
      {children}
    </div>
  )
}

function Tile({ selected, disabled, label, onSelect, children, className = '' }: {
  selected: boolean
  disabled?: boolean
  label: string
  onSelect: () => void
  children: React.ReactNode
  /** Extra layout classes. Used by the preset row, where each tile must
   *  opt out of flex-shrink and become a scroll-snap target. */
  className?: string
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onSelect}
      className={`${className} relative flex items-center justify-center rounded-2xl p-1 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
        disabled
          ? 'opacity-30 cursor-not-allowed ring-1 ring-gray-200/70'
          : selected
            ? 'bg-primary/10 ring-2 ring-primary'
            : 'bg-white ring-1 ring-gray-200/70 hover:ring-primary/30 active:scale-[0.96]'
      }`}
    >
      {children}
      {selected && !disabled && (
        <span aria-hidden className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center shadow-sm ring-2 ring-white">
          <Check className="w-2.5 h-2.5" />
        </span>
      )}
    </button>
  )
}

/**
 * One tile per value, each drawing the STUDENT'S OWN avatar with that
 * part swapped in. The alternative — an abstract icon per option — was
 * rejected after looking at it: "square" and "heart" are
 * indistinguishable as outlines at 44px, and the whole point of a
 * builder is seeing yourself change.
 */
function Faces<K extends keyof AvatarConfig, V extends AvatarConfig[K]>({
  name, values, config, field, onSelect,
}: {
  name: string
  values: readonly V[]
  config: AvatarConfig
  field: K
  onSelect: (v: V) => void
}) {
  return (
    <TileGrid>
      {values.map((value, i) => (
        <Tile
          key={String(value)}
          // "Hair style 12", not "middle-part-mid". The part KEY is a
          // database string in English; announcing it is worse than
          // useless to a Korean screen-reader user, and translating 70
          // part names to say "the twelfth one" is not worth the drift.
          // The group is named by <Part>, aria-pressed carries state.
          label={`${name} ${i + 1}`}
          selected={config[field] === value}
          onSelect={() => onSelect(value)}
        >
          <PersonAvatar config={{ ...config, [field]: value }} size={44} />
        </Tile>
      ))}
    </TileGrid>
  )
}

/** A colour-only row. Eight 30px dots plus seven 8px gaps is 296 — the
 *  same 303px budget as TileGrid, from the other direction. */
function Dots<V extends string>({ name, values, colour, selected, onSelect }: {
  name: string
  values: readonly V[]
  colour: (v: V) => string
  selected: string | undefined
  onSelect: (v: V) => void
}) {
  return (
    <div className="grid grid-cols-8 gap-2">
      {values.map((value, i) => {
        const isSelected = selected === value
        return (
          <button
            key={value}
            type="button"
            aria-pressed={isSelected}
            aria-label={`${name} ${i + 1}`}
            title={`${name} ${i + 1}`}
            onClick={() => onSelect(value)}
            className={`relative aspect-square rounded-full transition-all active:scale-[0.94] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
              isSelected ? 'ring-2 ring-primary ring-offset-2' : 'ring-1 ring-gray-300/70'
            }`}
            style={{ backgroundColor: colour(value) }}
          >
            {isSelected && (
              <span aria-hidden className="absolute inset-0 flex items-center justify-center">
                <Check className="w-3.5 h-3.5 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]" />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
