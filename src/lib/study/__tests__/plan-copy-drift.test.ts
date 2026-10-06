/**
 * Student-facing Study copy must agree with the constants that gate and
 * charge — and must never offer a plan that is not on sale.
 *
 * On 2026-10-07 the subscription page still read "SAT · TOEFL 모의고사" and
 * "1 mock test = 1–2 credits" long after ACT, SSAT and ISEE shipped and the
 * 2026-09-04 reprice put every section at 2–3 credits; the marketing page
 * listed TOEIC, IELTS and KSAT (never shipped) and promised "2 months free"
 * on an annual plan Study does not sell; and three landing strings said
 * academy students get Study included, which they do not (only their
 * academy's assignments are free).
 *
 * Every one was a literal. This test scans the surfaces that carry those
 * claims and fails when a quoted test list or credit range disagrees with
 * SHIPPED_TEST_FAMILIES / the section price table, or when annual billing
 * or "included with your academy" reappears.
 */
import fs from 'fs'
import path from 'path'
import { SHIPPED_TEST_FAMILIES } from '@/lib/study/shipped-tests'
import { creditCostForTest } from '@/lib/study/plans'
import { DAILY_CHALLENGE_QUESTION_COUNT } from '@/lib/study/daily-challenge-count'
import {
  shippedTestNames, shippedTestList, familyCreditRange, sectionCreditRange,
  formatCreditRange, familyCreditCosts,
} from '@/lib/study/plan-copy'

const ROOT = path.resolve(__dirname, '../../../..')
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8')

/** Sections a student can actually start, per family — written out here
 *  independently of the price table so plan-copy is checked against
 *  creditCostForTest (what the routes charge), not against itself. */
const SERVED_SECTIONS: Record<string, string[]> = {
  sat: ['reading_writing', 'math'],
  act: ['english', 'math', 'reading'],
  toefl: ['reading', 'writing', 'speaking', 'listening'],
  ssat: ['math', 'reading', 'verbal', 'writing'],
  isee: ['quant', 'verbal', 'reading', 'mathach', 'essay'],
}

function chargedRange(family: string) {
  const sections = SERVED_SECTIONS[family]
  if (!sections) throw new Error(`test needs SERVED_SECTIONS for newly shipped family "${family}"`)
  const costs = sections.map(s => creditCostForTest(family, s))
  return { min: Math.min(...costs), max: Math.max(...costs) }
}

const SHIPPED = [...SHIPPED_TEST_FAMILIES]

describe('plan-copy derives from the constants', () => {
  it('names exactly the shipped families', () => {
    expect(SHIPPED.length).toBeGreaterThanOrEqual(5)
    expect(shippedTestNames().map(n => n.toLowerCase()).sort()).toEqual([...SHIPPED].sort())
  })

  it('per-family ranges match what creditCostForTest charges', () => {
    for (const f of SHIPPED) expect(familyCreditRange(f)).toEqual(chargedRange(f))
  })

  it('the overall range spans every shipped family', () => {
    const all = SHIPPED.map(chargedRange)
    expect(sectionCreditRange()).toEqual({
      min: Math.min(...all.map(r => r.min)),
      max: Math.max(...all.map(r => r.max)),
    })
    // Never quote a section as cheaper than any real price (the old "1–2").
    expect(sectionCreditRange().min).toBeGreaterThan(1)
  })

  it('formats lists and ranges per language', () => {
    expect(shippedTestList(true).split(' · ')).toEqual(shippedTestNames())
    expect(shippedTestList(false)).toMatch(/^[A-Z, ]+ & [A-Z]+$/)
    expect(formatCreditRange({ min: 2, max: 3 }, true)).toBe('2~3')
    expect(formatCreditRange({ min: 2, max: 3 }, false)).toBe('2–3')
    expect(formatCreditRange({ min: 3, max: 3 }, false)).toBe('3')
    expect(familyCreditCosts(false).map(([n]) => n)).toEqual(shippedTestNames())
  })
})

// ---------------------------------------------------------------------------
// Surface scan
// ---------------------------------------------------------------------------

const SOURCE_SURFACES = [
  'src/app/mobile/study/subscription/page.tsx',
  'src/app/mobile/study/session/[id]/TestSession.tsx',
  'src/app/mobile/study/_shared/PredictedScore.tsx',
  'src/app/mobile/study/topic/[slug]/page.tsx',
  'src/app/study/page.tsx',
  'src/app/invite/[code]/InviteLanding.tsx',
  'src/app/invite/[code]/page.tsx',
  'src/app/page.tsx',
  'src/app/features/page.tsx',
  'src/components/marketing/ProductMocks.tsx',
]

/** Locale subtrees that carry Study plan / marketing claims. */
const LOCALE_SUBTREES = [
  'study.subscription',
  'study.lockedTopic',
  'landing.studyPage',
  'landing.studySection',
  'landing.home.m2',
  'landing.home.mock',
  'landing.featuresPage.study',
  'faqs',
  'about.mission',
]

/** Drop comments so rationale prose ("used to say 1–2") is not scanned. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\s\/\/\s.*$/gm, '')
}

function flatten(node: unknown, prefix: string, out: [string, string][]) {
  if (typeof node === 'string') out.push([prefix, node])
  else if (Array.isArray(node)) node.forEach((v, i) => flatten(v, `${prefix}.${i}`, out))
  else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) flatten(v, `${prefix}.${k}`, out)
  }
}

function localeStrings(lang: 'en' | 'ko'): [string, string][] {
  const json = JSON.parse(read(`src/locales/${lang}.json`))
  const out: [string, string][] = []
  for (const sub of LOCALE_SUBTREES) {
    const node = sub.split('.').reduce<unknown>((n, k) => (n as Record<string, unknown> | undefined)?.[k], json)
    if (node === undefined) throw new Error(`${lang}.json has no ${sub} — update LOCALE_SUBTREES`)
    flatten(node, sub, out)
  }
  return out
}

/** Every text unit to scan, labelled for the failure message. */
function corpus(): [string, string][] {
  const units: [string, string][] = SOURCE_SURFACES.map(f => [f, stripComments(read(f))])
  for (const lang of ['en', 'ko'] as const) {
    for (const [k, v] of localeStrings(lang)) units.push([`${lang}:${k}`, v])
  }
  return units
}

const TEST_NAME = '(?<![A-Za-z])(?:SSAT|ISEE|SAT|ACT|TOEFL|TOEIC|IELTS|KSAT|GRE|수능)(?![A-Za-z])'
const SEP = '\\s*(?:·|,\\s*and|,|&|\\+|/|\\band\\b|와|과)\\s*'
const ENUMERATION = new RegExp(`${TEST_NAME}(?:${SEP}${TEST_NAME})+`, 'g')

function norm(name: string) {
  return name === '수능' ? 'ksat' : name.toLowerCase()
}

describe('student-facing surfaces agree with the constants', () => {
  const units = corpus()

  it('scans a real corpus (guards against an empty or truncated read)', () => {
    expect(units.length).toBeGreaterThan(SOURCE_SURFACES.length + 50)
    // The subscription page must actually be among them and non-trivial.
    expect(units[0]![1].length).toBeGreaterThan(20_000)
  })

  it('every literal test enumeration names exactly the shipped tests', () => {
    const bad: string[] = []
    let seen = 0
    for (const [where, text] of units) {
      for (const m of text.matchAll(ENUMERATION)) {
        seen++
        const names = [...m[0].matchAll(new RegExp(TEST_NAME, 'g'))].map(x => norm(x[0]))
        const set = [...new Set(names)].sort()
        if (JSON.stringify(set) !== JSON.stringify([...SHIPPED].sort())) bad.push(`${where}: "${m[0]}"`)
      }
    }
    expect(bad).toEqual([])
    // The hardcoded lists (FAQ, features, studySection) must have been seen;
    // a regex that matches nothing passes every time.
    expect(seen).toBeGreaterThanOrEqual(6)
  })

  it('every quoted credit range equals the charged range', () => {
    const want = sectionCreditRange()
    const range = /(\d+)\s*[~–-]\s*(\d+)\s*(?:개|credits?)|크레딧\s*(\d+)\s*[~–-]\s*(\d+)/g
    const bad: string[] = []
    for (const [where, text] of units) {
      for (const m of text.matchAll(range)) {
        const lo = Number(m[1] ?? m[3]); const hi = Number(m[2] ?? m[4])
        if (lo !== want.min || hi !== want.max) bad.push(`${where}: "${m[0]}"`)
      }
    }
    expect(bad).toEqual([])
  })

  it('no surface offers annual billing or "2 months free"', () => {
    const annual = /annual|annually|yearly|per year|\/\s*yr\b|1-year|2 months free|연간|1년|2개월 무료|두 달 무료/i
    const hits = units.filter(([, text]) => annual.test(text)).map(([where, text]) => `${where}: ${text.match(annual)![0]}`)
    expect(hits).toEqual([])
  })

  it('no surface says academy students get Study included', () => {
    const included = /included (?:for every student|with your academy)|Study, included|학원 학생 모두에게 제공|기본 포함|모든 학생에게[^.]*(?:스터디|AI 학습 파트너)|every student in (?:your|the) academy/i
    const hits = units.filter(([, text]) => included.test(text)).map(([where]) => where)
    expect(hits).toEqual([])
  })

  it('marketing does not overstate the product (owner review 2026-10-07)', () => {
    // Shipped tests are drawn from a reviewed bank, not generated per sitting,
    // and form capacity is finite: "never the same test twice" is false.
    // Plans differ in features (planFeatures: Premium adds audio speaking
    // grading and analytics), so "every plan unlocks all study modes" is false.
    const overstated = /generated fresh|never the same test twice|매번 새로 만들어지는|같은 시험은 두 번|every plan unlocks all study modes|모든 요금제에서 전체 학습 모드/i
    const hits = units.filter(([, text]) => overstated.test(text)).map(([where, text]) => `${where}: ${text.match(overstated)![0]}`)
    expect(hits).toEqual([])
  })

  it('the daily challenge is quoted at its real size, never a literal', () => {
    // The server route reads the same constant (daily-challenge.ts re-exports
    // it), so the copy below can only drift by typing a number.
    expect(read('src/lib/study/daily-challenge.ts')).toMatch(/export \{ DAILY_CHALLENGE_QUESTION_COUNT \} from '\.\/daily-challenge-count'/)
    expect(DAILY_CHALLENGE_QUESTION_COUNT).toBeGreaterThan(0)
    const literal = /\d+\s*-?\s*(?:question quiz|weak[- ]spot|문제 퀴즈|문항)|\d+ \/ \d+/i  // "3 / 5" progress, not the "1/2" answer option
    const bad: string[] = []
    let checked = 0
    for (const lang of ['en', 'ko'] as const) {
      for (const [k, v] of localeStrings(lang)) {
        if (!/daily|challenge|item2/i.test(k)) continue
        checked++
        if (literal.test(v)) bad.push(`${lang}:${k}: ${v}`)
      }
    }
    expect(bad).toEqual([])
    expect(checked).toBeGreaterThanOrEqual(8)
  })

  it('Snap (switched off) is not advertised on /study', () => {
    for (const lang of ['en', 'ko'] as const) {
      const json = JSON.parse(read(`src/locales/${lang}.json`))
      expect(json.landing.studyPage.snap).toBeUndefined()
    }
    expect(read('src/app/study/page.tsx')).not.toMatch(/snap/i)
  })

  it('templated strings keep their placeholders (so the list stays derived)', () => {
    for (const lang of ['en', 'ko'] as const) {
      const map = new Map(localeStrings(lang))
      expect(map.get('landing.studyPage.hero.subtitle')).toContain('{tests}')
      expect(map.get('landing.studyPage.testPrep.items.fullTests.description')).toContain('{tests}')
      expect(map.get('study.lockedTopic.body')).toContain('{tests}')
      expect(map.get('landing.studyPage.pricing.creditNote')).toContain('{range}')
      expect(map.get('landing.studyPage.pricing.creditNote')).toContain('{summary}')
      expect(map.has('landing.studyPage.pricing.annualNote')).toBe(false)
      expect(map.get('landing.studyPage.review.items.daily.description')).toContain('{count}')
      expect(map.get('landing.studyPage.notebookScreen.dailyPos')).toBe('{pos} / {count}')
      expect(map.get('landing.home.mock.challengeSub')).toContain('{count}')
      expect(map.get('landing.home.m2.item2')).toContain('{count}')
    }
  })
})
