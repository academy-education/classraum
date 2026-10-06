/**
 * The Korean brand name is 클래스라움 — owner decision 2026-10-07, matching
 * the legal name (주)클래스라움. Before it, ko.json said 클래스룸 118 times.
 *
 * Most of those were NOT the brand: 클래스룸 is also the app's Korean word
 * for the classroom FEATURE (a class unit — "클래스룸 생성", "클래스룸 삭제").
 * Swapping those would read "delete Classraum". So the rule cannot be "the
 * string never appears"; it is:
 *
 *   1. A ko.json value may contain 클래스룸 only under a key the owner has
 *      allowlisted (ko-brand-name-allowlist.json). A new key fails.
 *   2. No allowlisted key may be the brand — if the English value at that
 *      key says "Classraum", 클래스룸 there is the old brand name.
 *   3. Other user-facing Korean sources (src/, content/, public/) may hold
 *      클래스룸 only in the files and counts pinned below.
 */
import fs from 'fs'
import path from 'path'
import en from '../en.json'
import ko from '../ko.json'
import allowlist from './ko-brand-name-allowlist.json'

const OLD = '클래스룸'
const ROOT = path.resolve(__dirname, '../../..')

function walk(node: unknown, prefix = '', out: [string, string][] = []): [string, string][] {
  if (typeof node === 'string') out.push([prefix, node])
  else if (Array.isArray(node)) node.forEach((v, i) => walk(v, `${prefix}[${i}]`, out))
  else if (node && typeof node === 'object')
    for (const [k, v] of Object.entries(node)) walk(v, prefix ? `${prefix}.${k}` : k, out)
  return out
}

const koEntries = walk(ko)
const enByKey = new Map(walk(en))
const allowed = new Set<string>(allowlist.keys)

/**
 * Files outside ko.json where 클래스룸 is the classroom FEATURE noun, with the
 * exact count. Raising a count, or a new file, is an owner call.
 */
const FILE_ALLOWLIST: Record<string, number> = {
  // Help article about the Classrooms feature ("클래스룸 만들기").
  'content/help/ko/02-classrooms.md': 20,
  // That article's Korean title and blurb.
  'content/help/articles.ts': 2,
  // AI report labels and prompt ("모든 클래스룸", "클래스룸별:"), formerly 교실.
  'src/lib/ai-service.ts': 5,
  // Downgrade-blocked message: "클래스룸 수: 현재 N개" (the plan's classroomLimit).
  'src/app/api/subscription/downgrade/route.ts': 1,
}

const SOURCE_DIRS = ['src', 'content', 'public']
const SOURCE_EXT = /\.(tsx?|jsx?|mjs|json|md|mdx|html|txt|xml|webmanifest|svg)$/
const SKIP = [
  path.join('src', 'locales', 'ko.json'), // covered key-by-key above
  path.join('src', 'locales', '__tests__'), // this guard and its allowlist
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

describe('Korean brand name is 클래스라움', () => {
  it('reads the locale it is guarding', () => {
    // A guard over an empty walk passes everything.
    expect(koEntries.length).toBeGreaterThan(1000)
    expect(allowed.size).toBeGreaterThan(0)
  })

  it('no ko.json value uses 클래스룸 outside the owner allowlist', () => {
    const offenders = koEntries
      .filter(([k, v]) => v.includes(OLD) && !allowed.has(k))
      .map(([k, v]) => `${k}: ${v}`)
    expect(offenders).toEqual([])
  })

  // A sentence may name both the brand and the feature ("클래스룸을 만들었습니다.
  // 클래스라움의 나머지 기능은…"). What must never happen is 클래스룸 standing
  // in for the brand, so wherever English says Classraum, Korean must carry
  // 클래스라움 at least as often, and 클래스룸 there must have an English
  // "classroom" to stand for.
  const NEW = '클래스라움'
  const count = (s: string, re: RegExp) => (s.match(re) ?? []).length
  const brandMissing = (k: string, v: string) =>
    count(v, new RegExp(NEW, 'g')) < count(enByKey.get(k) ?? '', /classraum/gi)

  it('no allowlisted key is the brand (English says Classraum and not classroom there)', () => {
    const brand = [...allowed].filter((k) => {
      const enV = enByKey.get(k) ?? ''
      return /classraum/i.test(enV) && !/classroom/i.test(enV)
    })
    expect(brand).toEqual([])
  })

  it('every key whose English names Classraum uses 클래스라움, not 클래스룸', () => {
    const wrong = koEntries
      .filter(([k, v]) => v.includes(OLD) && /classraum/i.test(enByKey.get(k) ?? ''))
      .filter(([k, v]) => brandMissing(k, v) || !/classroom/i.test(enByKey.get(k) ?? ''))
      .map(([k]) => k)
    expect(wrong).toEqual([])
  })

  it('the allowlist has no stale keys', () => {
    const koByKey = new Map(koEntries)
    const stale = [...allowed].filter((k) => !(koByKey.get(k) ?? '').includes(OLD))
    expect(stale).toEqual([])
  })

  it('other user-facing sources hold 클래스룸 only where pinned', () => {
    const files = SOURCE_DIRS.flatMap((d) => listFiles(path.join(ROOT, d)))
    // Denominator check: a broken ROOT would scan nothing and pass.
    expect(files.length).toBeGreaterThan(500)
    const found: Record<string, number> = {}
    for (const f of files) {
      const rel = path.relative(ROOT, f)
      if (SKIP.some((s) => rel === s || rel.startsWith(s + path.sep))) continue
      const n = fs.readFileSync(f, 'utf8').split(OLD).length - 1
      if (n > 0) found[rel.split(path.sep).join('/')] = n
    }
    expect(found).toEqual(FILE_ALLOWLIST)
  })
})
