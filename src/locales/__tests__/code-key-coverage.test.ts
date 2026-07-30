/** @jest-environment node */
/**
 * Guards keys that CODE references but NEITHER locale defines.
 *
 * key-parity.test.ts compares en.json against ko.json. That comparison
 * structurally cannot see a key missing from both — the two files agree
 * perfectly about a key neither of them has. On 2026-07-31 there were
 * 108 such keys: `payments.status.overdue`, `reports.status.draft`,
 * `common.days.monday` and friends, all rendering as their own dotted
 * path on screen in BOTH languages, because `getNestedValue` returns the
 * path on a miss and `t()` hands that straight to JSX.
 *
 * Nearly all of them were half-finished renames: the string already
 * existed under a different name (`payments.overdue`, `reports.draft`,
 * `sessions.days.mon`) and only the call site was stale. That is why
 * this test asserts against the CODE, not against the locale files —
 * the locales were internally consistent the whole time.
 *
 * Two rules, because there are two ways to name a key. (Example calls
 * are written without their leading t( on purpose — this file walks
 * every other source file looking for exactly that shape, and an
 * illustration in a comment would read as a real call site.)
 *
 *   1. Literal keys — a plain quoted 'payments.overdue' — must resolve
 *      to a string or array in both locales.
 *
 *   2. Interpolated keys — a template of the form payments.$OPEN status
 *      $CLOSE — cannot be resolved without knowing the domain of the
 *      variable, so instead the NAMESPACE (everything up to the last
 *      dot before the first hole) must resolve to an OBJECT in both
 *      locales. This is not a formality: `assignments.type` is the
 *      string "Type", so the per-type label lookup in AssignmentCard
 *      could never resolve for ANY value of assignment_type, and every
 *      assignment card rendered the literal text
 *      "assignments.type.homework". Rule 1 cannot see that call at all.
 *
 * Rule 2 deliberately does not attempt to enumerate every variable's
 * domain — most come from the database. DOMAINS below pins the ones
 * whose values are fixed by a literal list or a TypeScript union in the
 * source, so that renaming a locale key out from under them fails here.
 */
import fs from 'fs'
import path from 'path'
import { languages } from '@/locales'

const SRC = path.resolve(__dirname, '../..')
const SELF = __filename

type Json = string | number | boolean | null | Json[] | { [k: string]: Json }

const walk = (dir: string, out: string[] = []): string[] => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(p, out)
    else if (/\.(ts|tsx)$/.test(entry.name) && p !== SELF) out.push(p)
  }
  return out
}

const FILES = walk(SRC)

// A t/tList call whose argument is a quoted string with no
// interpolation in it. (Deliberately not spelled out as an example
// call here: this file scans every other .ts/.tsx under src, and an
// illustrative key in a comment would be picked up by a future variant
// of this scan as a real reference to a key nobody defined.)
const LITERAL = /\b(?:t|tList)\s*\(\s*(['"`])([^'"`$\n]+?)\1/g
// A t/tList call on a template literal containing at least one ${} hole;
// captures the whole template body.
const TEMPLATE = /\b(?:t|tList)\s*\(\s*`([^`]*\$\{[^`]*)`/g

interface Ref { key: string; where: string }

const literalRefs: Ref[] = []
const namespaceRefs: Ref[] = []

for (const file of FILES) {
  const text = fs.readFileSync(file, 'utf8')
  const rel = path.relative(SRC, file)
  const lineAt = (index: number) => text.slice(0, index).split('\n').length

  let m: RegExpExecArray | null
  LITERAL.lastIndex = 0
  while ((m = LITERAL.exec(text))) {
    // Several call sites pass already-resolved plain text through t() as
    // a convenience; a dot is what distinguishes a key from prose.
    if (m[2].includes('.')) literalRefs.push({ key: m[2], where: `${rel}:${lineAt(m.index)}` })
  }

  TEMPLATE.lastIndex = 0
  while ((m = TEMPLATE.exec(text))) {
    const body = m[1]
    const beforeFirstHole = body.slice(0, body.indexOf('${'))
    const namespace = beforeFirstHole.slice(0, beforeFirstHole.lastIndexOf('.'))
    // `${arrayPath}.${i}` in terms/page.tsx has no static namespace at
    // all — the whole path is computed. Nothing to check.
    if (namespace) namespaceRefs.push({ key: namespace, where: `${rel}:${lineAt(m.index)}` })
  }
}

const resolve = (locale: Json, key: string): Json | undefined =>
  key.split('.').reduce<Json | undefined>(
    (node, part) =>
      node && typeof node === 'object' && !Array.isArray(node)
        ? (node as Record<string, Json>)[part]
        : undefined,
    locale,
  )

const en = languages.english as unknown as Json
const ko = languages.korean as unknown as Json

const isLeaf = (v: Json | undefined) => typeof v === 'string' || Array.isArray(v)
const isBranch = (v: Json | undefined) => !!v && typeof v === 'object' && !Array.isArray(v)

/**
 * Interpolated lookups whose variable domain is fixed by the source, not
 * by a database column. Each entry cites where the values come from.
 * These turn rule 2 (namespace exists) into a full check for the cases
 * where a full check is actually possible.
 */
const DOMAINS: ReadonlyArray<{ ns: string; values: readonly string[]; suffix?: string; source: string }> = [
  {
    ns: 'study.modes',
    values: ['practice', 'flashcards', 'response', 'full_test'],
    suffix: 'title',
    source: "STUDY_MODES in src/app/mobile/study/modes.ts — StudyMode is typeof STUDY_MODES[number]['key']",
  },
  {
    ns: 'payments.paymentMethods',
    values: ['cash', 'card', 'bank_transfer', 'other'],
    source:
      "the literal filter list ['all','card','bank_transfer','cash'] in TemplatePaymentsModal " +
      'plus the invoices.payment_method values the same component renders — snake_case, ' +
      'which is why the camelCase bankTransfer key never resolved',
  },
  {
    ns: 'sessions',
    values: ['scheduled', 'completed', 'cancelled', 'online', 'offline'],
    source: 'the status/location switch arms in SessionCard and sessions-page',
  },
  {
    ns: 'assignments',
    values: ['homework', 'quiz', 'test', 'project'],
    source: 'assignment_type values enumerated in the type selector in assignments-page',
  },
  {
    ns: 'study.practice.type',
    values: ['multiple_choice', 'true_false', 'short_answer'],
    source: 'the question `type` union in the study practice session',
  },
  {
    ns: 'admin.users.roles',
    values: ['student', 'parent', 'teacher', 'manager', 'admin', 'superAdmin'],
    source: 'the role options in admin/users/EditUserModal (super_admin is mapped to superAdmin at the call site)',
  },
]

describe('translation keys referenced by code exist in both locales', () => {
  it('found a plausible number of call sites (the scan itself is not broken)', () => {
    // A regex that silently stops matching would make every assertion
    // below pass over an empty list. There were ~4000 literal refs and
    // ~120 interpolated ones when this was written.
    expect(FILES.length).toBeGreaterThan(500)
    expect(literalRefs.length).toBeGreaterThan(3000)
    expect(namespaceRefs.length).toBeGreaterThan(80)
  })

  it('every literal key resolves in English', () => {
    const missing = literalRefs
      .filter(r => !isLeaf(resolve(en, r.key)))
      .map(r => `${r.key}  (${r.where})`)
    expect([...new Set(missing)]).toEqual([])
  })

  it('every literal key resolves in Korean', () => {
    const missing = literalRefs
      .filter(r => !isLeaf(resolve(ko, r.key)))
      .map(r => `${r.key}  (${r.where})`)
    expect([...new Set(missing)]).toEqual([])
  })

  it('every interpolated key has a namespace that is an object in both locales', () => {
    const broken = namespaceRefs
      .filter(r => !isBranch(resolve(en, r.key)) || !isBranch(resolve(ko, r.key)))
      .map(r => `${r.key}  (${r.where})`)
    expect([...new Set(broken)]).toEqual([])
  })

  it('interpolated keys with a source-fixed domain resolve for every value', () => {
    const missing: string[] = []
    for (const { ns, values, suffix } of DOMAINS) {
      for (const value of values) {
        const key = suffix ? `${ns}.${value}.${suffix}` : `${ns}.${value}`
        if (!isLeaf(resolve(en, key))) missing.push(`en: ${key}`)
        if (!isLeaf(resolve(ko, key))) missing.push(`ko: ${key}`)
      }
    }
    expect(missing).toEqual([])
  })

  it('every DOMAINS entry cites where its values come from', () => {
    for (const { ns, source } of DOMAINS) {
      expect(ns.length).toBeGreaterThan(0)
      expect(source.length).toBeGreaterThan(30)
    }
  })
})
