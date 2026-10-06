/**
 * The classroom FEATURE's Korean name is 클래스룸 — owner decision 2026-10-07.
 *
 * Before it, the same feature (the class unit a manager creates and assigns
 * teachers and students to) was 클래스룸 on the app screens but 교실 in the
 * setup tour, the mobile grades tab, the marketing site and pricing
 * ("사용자 10명, 교실 2개까지"). A manager following the tour was told to
 * open a "교실 페이지" that the sidebar calls 클래스룸.
 *
 * 교실 is still correct Korean for a physical room or for the classroom as a
 * teaching place in prose, so the rule cannot be "the string never appears":
 *
 *   1. A ko.json value may contain 교실 only under a key pinned in PROSE_KEYS
 *      below, each with the reason it is not the feature. A new key fails.
 *   2. No pinned key is a feature key (one on the 클래스룸 allowlist).
 *   3. Other user-facing Korean sources (src/, content/, public/) hold no 교실.
 */
import fs from 'fs'
import path from 'path'
import ko from '../ko.json'
import featureAllowlist from './ko-brand-name-allowlist.json'

const FEATURE_OLD = '교실'
const ROOT = path.resolve(__dirname, '../../..')

/** Keys where 교실 is NOT the feature. Adding one is an owner call. */
const PROSE_KEYS: Record<string, string> = {
  // EN "Room Number": the physical room a session meets in (sessions.room_number).
  'sessions.room': 'physical room',
  'sessions.roomNumber': 'physical room',
  'sessions.roomNumberPlaceholder': 'physical room',
  // EN "classroom behavior insights": behaviour in class, not the entity.
  'features.lessonAssignmentPlanner.smartFeatures.attendanceBehavior.description': 'prose',
  // EN "Designed for Real-World Classrooms": teaching in general.
  'features.lessonAssignmentPlanner.flexibility.sectionTitle': 'prose',
  // EN "Whether you're in the classroom, moving between branches…": a place.
  'features.attendanceRecording.builtForTeachers.features[0].description': 'physical room',
}

function walk(node: unknown, prefix = '', out: [string, string][] = []): [string, string][] {
  if (typeof node === 'string') out.push([prefix, node])
  else if (Array.isArray(node)) node.forEach((v, i) => walk(v, `${prefix}[${i}]`, out))
  else if (node && typeof node === 'object')
    for (const [k, v] of Object.entries(node)) walk(v, prefix ? `${prefix}.${k}` : k, out)
  return out
}

const koEntries = walk(ko)
const koByKey = new Map(koEntries)
const featureKeys = new Set<string>(featureAllowlist.keys)

const SOURCE_DIRS = ['src', 'content', 'public']
const SOURCE_EXT = /\.(tsx?|jsx?|mjs|json|md|mdx|html|txt|xml|webmanifest|svg)$/
const SKIP = [
  path.join('src', 'locales', 'ko.json'), // covered key-by-key above
  path.join('src', 'locales', '__tests__'), // the guards and their allowlists
]

function listFiles(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name.startsWith('.')) continue
    const full = path.join(dir, ent.name)
    if (ent.isDirectory()) listFiles(full, out)
    else if (SOURCE_EXT.test(ent.name)) out.push(full)
  }
  return out
}

describe('Korean classroom feature name is 클래스룸', () => {
  it('reads the locale it is guarding', () => {
    // A guard over an empty walk passes everything.
    expect(koEntries.length).toBeGreaterThan(1000)
    expect(featureKeys.size).toBeGreaterThan(100)
  })

  it('no ko.json value uses 교실 outside the pinned prose/physical-room keys', () => {
    const offenders = koEntries
      .filter(([k, v]) => v.includes(FEATURE_OLD) && !(k in PROSE_KEYS))
      .map(([k, v]) => `${k}: ${v}`)
    expect(offenders).toEqual([])
  })

  it('no feature key uses 교실', () => {
    const wrong = [...featureKeys].filter((k) => (koByKey.get(k) ?? '').includes(FEATURE_OLD))
    expect(wrong).toEqual([])
  })

  it('no pinned prose key is a feature key', () => {
    expect(Object.keys(PROSE_KEYS).filter((k) => featureKeys.has(k))).toEqual([])
  })

  it('the prose pin list has no stale keys', () => {
    const stale = Object.keys(PROSE_KEYS).filter(
      (k) => !(koByKey.get(k) ?? '').includes(FEATURE_OLD),
    )
    expect(stale).toEqual([])
  })

  it('other user-facing sources hold no 교실', () => {
    const files = SOURCE_DIRS.flatMap((d) => listFiles(path.join(ROOT, d)))
    // Denominator check: a broken ROOT would scan nothing and pass.
    expect(files.length).toBeGreaterThan(500)
    const found: Record<string, number> = {}
    for (const f of files) {
      const rel = path.relative(ROOT, f)
      if (SKIP.some((s) => rel === s || rel.startsWith(s + path.sep))) continue
      const n = fs.readFileSync(f, 'utf8').split(FEATURE_OLD).length - 1
      if (n > 0) found[rel.split(path.sep).join('/')] = n
    }
    expect(found).toEqual({})
  })
})
