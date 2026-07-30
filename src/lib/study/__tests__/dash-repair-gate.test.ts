/**
 * PLANTED FAILURES. Every assertion below breaks a repair in one specific
 * way and demands the gate name THAT way — not merely "rejected".
 *
 * The repo standard is that a passing check is evidence only if it would
 * have failed, so a green "checkRepair returned something" would be worth
 * nothing here: the gate returns 14 different messages and a bug in any one
 * of them lets a different defect through while the other 13 keep the suite
 * green. Each case therefore matches its own message, and one case asserts
 * the CLEAN payload passes — without that, a gate that rejected everything
 * would score 100%.
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import {
  checkRepair, planRepair, lengthRank, retention, quotedRuns, classify,
  substituteConcentration,
  TELL_RULES, ODD_RULES, HEDGE, ABSOLUTE, DASH, scoreRule,
  type DashPayload,
} from '../dash-repair-gate'

// A key-only item: the key uniquely carries the dash. Lengths are 104 / 96 /
// 88 / 80, so the key sits at rank 1 with ~8 chars of headroom either side —
// enough to rephrase, not enough to hide a deletion.
const KEY = 'Diversity improves a stand under typical dry conditions — but not under the most severe droughts at all'
const D1 = 'Greater diversity reliably increases a forest stand resistance to drought whatever the severity is'
const D2 = 'During moderate droughts monoculture stands lose less biomass than diverse stands of that size'
const D3 = 'The fast growing species that diversity favors tolerate extreme water stress the best'

function base(over: Partial<DashPayload> = {}): DashPayload {
  const choices = [D1, KEY, D2, D3]
  return {
    id: '00000000-0000-0000-0000-000000000000',
    prompt: 'Which choice best states the main idea?',
    passage: null,
    choices,
    correct_answer: KEY,
    explanation: 'The passage says diversity helps in ordinary dry spells but not in extremes.',
    key_slot: 1,
    key_length_rank: lengthRank(KEY, choices),
    target_distractor_dashes: 1,
    ...over,
  }
}

/** The repair as it is meant to be done: key rephrased, dash relocated. */
const GOOD_KEY = 'Diversity improves a stand under typical dry conditions, though not under the most severe droughts at all'
const GOOD_D1 = 'Greater diversity reliably increases resistance to drought — whatever the severity of that drought is'
const good = () => base({
  repaired_choices: [GOOD_D1, GOOD_KEY, D2, D3],
  repaired_correct_answer: GOOD_KEY,
})

/** Same repair, 7 chars longer, for the spread cases. Rank and content hold. */
const LONG_KEY = 'Diversity improves a stand under typical dry conditions, though really not under the most severe droughts at all'
const SHORT_68 = 'Monoculture stands always lose the very least biomass in any drought'
const SHORT_63 = 'Monoculture stands lose the least biomass in any drought at all'
const SHORT_63_DASH = 'Monoculture stands lose the least biomass — in any drought at all'

const errs = (p: DashPayload) => checkRepair(p).join(' | ')

describe('the clean repair passes', () => {
  it('accepts a key rephrased without a dash and a distractor that gained one', () => {
    expect(checkRepair(good())).toEqual([])
  })

  it('the fixture really is the shape the repair targets', () => {
    // If the fixture stopped being a key-only item, every planted failure
    // below would still "fail" — for the wrong reason.
    expect(classify({ key: KEY, choices: base().choices })).toBe('key-only')
    expect(lengthRank(KEY, base().choices)).toBe(1)
    expect(lengthRank(GOOD_KEY, good().repaired_choices!)).toBe(1)
  })
})

describe('planted failure: the repair was not actually made', () => {
  it('rejects an untouched payload, naming the dash', () => {
    const p = base({ repaired_choices: base().choices, repaired_correct_answer: KEY })
    expect(errs(p)).toContain('key still carries a dash')
  })

  it('rejects an em dash swapped for a spaced hyphen', () => {
    // The verifier's rule is /[—–]| - /, so " - " is the same tell in ASCII.
    const sneaky = KEY.replace('—', '-')
    const p = base({ repaired_choices: [GOOD_D1, sneaky, D2, D3], repaired_correct_answer: sneaky })
    expect(errs(p)).toContain('key still carries a dash')
  })

  it('rejects an en dash swapped for an em dash', () => {
    const sneaky = KEY.replace('—', '–')
    const p = base({ repaired_choices: [GOOD_D1, sneaky, D2, D3], repaired_correct_answer: sneaky })
    expect(errs(p)).toContain('key still carries a dash')
  })
})

describe('planted failure: the dash was stripped, not moved', () => {
  it('rejects a de-dashed key when no distractor picked the dash up', () => {
    const p = base({ repaired_choices: [D1, GOOD_KEY, D2, D3], repaired_correct_answer: GOOD_KEY })
    expect(errs(p)).toContain('0 distractor(s) carry a dash, target 1')
  })

  it('rejects a target of zero, which would license stripping', () => {
    const p = base({
      target_distractor_dashes: 0,
      repaired_choices: [D1, GOOD_KEY, D2, D3], repaired_correct_answer: GOOD_KEY,
    })
    expect(errs(p)).toContain('target_distractor_dashes must be >= 1')
  })

  it('rejects a dash tacked onto the end of a distractor', () => {
    const tacked = D1 + ' — indeed'
    const p = base({ repaired_choices: [tacked, GOOD_KEY, D2, D3], repaired_correct_answer: GOOD_KEY })
    expect(errs(p)).toContain('fewer than 3 words on one side')
  })
})

describe('planted failure: the qualification was deleted rather than rephrased', () => {
  it('rejects a key that lost the clause after the dash', () => {
    const gutted = 'Diversity improves a stand under typical dry conditions'
    const p = base({ repaired_choices: [GOOD_D1, gutted, D2, D3], repaired_correct_answer: gutted })
    expect(errs(p)).toMatch(/the qualification was deleted, not rephrased/)
  })

  it('rejects a key padded back to length with unrelated words', () => {
    // Same character count as the original, so the length floor passes; the
    // content-word check is what has to catch this one.
    const stuffed = 'Diversity improves a stand under typical dry conditions in many different situations and settings.'
    const p = base({ repaired_choices: [GOOD_D1, stuffed, D2, D3], repaired_correct_answer: stuffed })
    expect(stuffed.length).toBeGreaterThan(KEY.length * 0.92)
    expect(errs(p)).toMatch(/retains only \d+% of its content words/)
  })
})

describe('planted failure: one measured tell traded for another', () => {
  it('rejects a dash rewritten as a semicolon', () => {
    const semi = KEY.replace('—', ';')
    const p = base({ repaired_choices: [GOOD_D1, semi, D2, D3], repaired_correct_answer: semi })
    expect(errs(p)).toContain('traded its dash for a semicolon')
  })

  it('rejects a dash rewritten as a colon', () => {
    const colon = KEY.replace('—', ':')
    const p = base({ repaired_choices: [GOOD_D1, colon, D2, D3], repaired_correct_answer: colon })
    expect(errs(p)).toContain('traded its dash for a colon')
  })
})

describe('planted failure: the length rank moved', () => {
  it('rejects a key that dropped a rank, and shows the arithmetic', () => {
    // 97 chars: shorter than D1 (98) but above the 0.92 floor (94.76) with
    // 92% of the content words kept, so ONLY the rank check can catch it.
    const shorter = 'Diversity improves stands under typical dry conditions, not under the most severe droughts at all'
    const p = base({ repaired_choices: [GOOD_D1, shorter, D2, D3], repaired_correct_answer: shorter })
    expect(shorter.length).toBeGreaterThan(KEY.length * 0.92)
    expect(retention(KEY, shorter)).toBeGreaterThan(0.85)
    expect(errs(p)).toMatch(/key length-rank moved 1 -> 2/)
  })

  it('rejects a key that gained a rank by lengthening a distractor past it', () => {
    const longer = GOOD_D1 + ' in any stand at all'
    const p = base({ repaired_choices: [longer, GOOD_KEY, D2, D3], repaired_correct_answer: GOOD_KEY })
    expect(errs(p)).toMatch(/key length-rank moved 1 -> 2/)
  })
})

describe('planted failure: structural integrity', () => {
  it('rejects a key that changed slot', () => {
    const p = base({ repaired_choices: [GOOD_KEY, GOOD_D1, D2, D3], repaired_correct_answer: GOOD_KEY })
    expect(errs(p)).toContain('key moved from slot 1 to 0')
  })

  it('rejects correct_answer that is not byte-identical to a choice', () => {
    const p = base({ repaired_choices: [GOOD_D1, GOOD_KEY, D2, D3], repaired_correct_answer: GOOD_KEY + ' ' })
    expect(errs(p)).toContain('not byte-identical to any repaired choice')
  })

  it('rejects a duplicated option', () => {
    const p = base({ repaired_choices: [GOOD_D1, GOOD_KEY, GOOD_D1, D3], repaired_correct_answer: GOOD_KEY })
    expect(errs(p)).toContain('duplicate choices')
  })

  it('rejects an emptied option', () => {
    const p = base({ repaired_choices: [GOOD_D1, GOOD_KEY, '  ', D3], repaired_correct_answer: GOOD_KEY })
    expect(errs(p)).toContain('empty choice')
  })

  it('rejects a spread pushed beyond 1.6x', () => {
    // Original 103/68 = 1.52x, legal. The repaired key at 112 makes it 1.65x
    // while every other check still passes, so the spread rule is the only
    // thing that can catch it.
    const choices = [D1, KEY, D2, SHORT_68]
    const p = base({
      choices, key_length_rank: lengthRank(KEY, choices),
      repaired_choices: [GOOD_D1, LONG_KEY, D2, SHORT_68],
      repaired_correct_answer: LONG_KEY,
    })
    expect(errs(p)).toBe('length spread 1.65x exceeds 1.6x')
  })

  it('rejects a distractor rewritten past the surgical band', () => {
    const bloated = D2 + ' and also several further considerations about the stands in question'
    const p = base({ repaired_choices: [GOOD_D1, GOOD_KEY, bloated, D3], repaired_correct_answer: GOOD_KEY })
    expect(errs(p)).toMatch(/outside 0\.8-1\.25x/)
  })
})

describe('a pre-existing spread violation is grandfathered, not blamed on the author', () => {
  // Two of the ten live SAT items sit at 1.72x and 3.07x already. A flat 1.6x
  // gate would reject every repair of them for a defect the repair did not
  // introduce and a punctuation pass cannot fix. 103/63 = 1.63x here.
  const wide = (over: Partial<DashPayload> = {}) => {
    const choices = [D1, KEY, D2, SHORT_63]
    return base({ choices, key_length_rank: lengthRank(KEY, choices), ...over })
  }

  it('the fixture is over the cap to begin with', () => {
    const lens = wide().choices.map(c => c.length)
    expect(Math.max(...lens) / Math.min(...lens)).toBeGreaterThan(1.6)
  })

  it('accepts a repair that leaves an over-cap spread no worse', () => {
    // 105/65 = 1.62x — still over 1.6, but narrower than it was, because the
    // option that gained the dash was the short one. This is the live shape
    // of SAT item 3537c297.
    const p = wide({ repaired_choices: [D1, GOOD_KEY, D2, SHORT_63_DASH], repaired_correct_answer: GOOD_KEY })
    expect(checkRepair(p)).toEqual([])
  })

  it('still rejects a repair that widens an over-cap spread', () => {
    const p = wide({ repaired_choices: [D1, LONG_KEY, D2, SHORT_63_DASH], repaired_correct_answer: LONG_KEY })
    expect(errs(p)).toBe('length spread 1.72x worsens a pre-existing 1.63x')
  })
})

describe('planted failure: the payload lies about itself', () => {
  it('rejects a tampered key_length_rank stamp', () => {
    const p = good(); p.key_length_rank = 3
    expect(errs(p)).toContain('key_length_rank stamp 3 disagrees with the item (1)')
  })

  it('rejects a tampered key_slot stamp', () => {
    const p = good(); p.key_slot = 0
    expect(errs(p)).toContain('key_slot stamp 0 disagrees with the item (1)')
  })
})

describe('planted failure: the explanation is left describing prose that is gone', () => {
  const EXPL = 'Correct because diversity improves a stand under typical dry conditions, which the graph shows.'

  it('demands a repaired explanation when the rewrite breaks a quoted phrase', () => {
    const reworded = 'Diverse stands do better through ordinary dry spells, yet not through the most severe droughts'
    const p = base({
      explanation: EXPL,
      repaired_choices: [GOOD_D1, reworded, D2, D3], repaired_correct_answer: reworded,
    })
    expect(quotedRuns(KEY, EXPL).length).toBeGreaterThan(0)
    expect(errs(p)).toMatch(/breaks \d+ phrase\(s\) the explanation quotes/)
  })

  it('rejects a repaired explanation that still quotes the removed phrase', () => {
    const reworded = 'Diverse stands do better through ordinary dry spells, yet not through the most severe droughts'
    const p = base({
      explanation: EXPL,
      repaired_choices: [GOOD_D1, reworded, D2, D3], repaired_correct_answer: reworded,
      repaired_explanation: EXPL,
    })
    expect(errs(p)).toMatch(/still quotes the removed phrase/)
  })

  it('stays quiet when the rewrite preserves what the explanation quotes', () => {
    // GOOD_KEY only swaps "— but" for ", though", so the quoted run survives.
    // NOTE THE ORDER: `{ explanation: EXPL, ...good() }` put base()'s default
    // explanation back on top, so this assertion ran against prose that
    // quotes nothing and would have passed however broken the check was.
    // tsc caught it (TS2783); the green did not.
    const p = { ...good(), explanation: EXPL }
    expect(quotedRuns(p.correct_answer, p.explanation).length).toBeGreaterThan(0)
    expect(checkRepair(p)).toEqual([])
  })
})

// ── the plan arithmetic ──────────────────────────────────────────────────

describe('planRepair lands the section at 25%, not at zero', () => {
  const withDash = (n: number, key: boolean): ScoredLike[] =>
    Array.from({ length: n }, (_, i) => ({
      key: key ? `key ${i} — qualified` : `key ${i} plain`,
      choices: [
        key ? `key ${i} — qualified` : `key ${i} plain`,
        key ? `dist a ${i} plain` : `dist a ${i} — qualified`,
        `dist b ${i} plain`, `dist c ${i} plain`,
      ],
    }))
  type ScoredLike = { key: string; choices: string[] }

  it('repairs a fraction, leaving the rule at chance rather than inverted', () => {
    // 15 key-only + 5 distractor-only is the live SAT R&W shape.
    const items = [...withDash(15, true), ...withDash(5, false)]
    const plan = planRepair(items)
    expect(plan.usableBefore).toBe(20)
    expect(plan.keyBefore).toBe(15)
    expect(plan.move).toBe(10)
    expect(plan.rateAfter).toBeCloseTo(0.25, 6)
  })

  it('does NOT drive the rule to zero', () => {
    const items = [...withDash(15, true), ...withDash(5, false)]
    expect(planRepair(items).move).toBeLessThan(15)
  })

  it('takes every key-plus item, because each is a free parity win', () => {
    const keyPlus = Array.from({ length: 4 }, (_, i) => ({
      key: `key ${i} — qualified`,
      choices: [`key ${i} — qualified`, `dist a ${i} — also qualified`, `dist b ${i}`, `dist c ${i}`],
    }))
    const plan = planRepair([...withDash(15, true), ...withDash(5, false), ...keyPlus])
    expect(plan.keyPlus).toBe(4)
    // Those 4 join the usable set as non-keys, so the denominator grows.
    expect(plan.usableAfter).toBe(24)
  })
})

describe('the batch-level guard on what replaced the dash', () => {
  it('flags a batch that turned every dash into parentheses', () => {
    const pairs = Array.from({ length: 10 }, (_, i) => ({
      before: `key ${i} — qualified here`,
      after: `key ${i} (qualified here)`,
    }))
    const paren = substituteConcentration(pairs).find(c => c.name === 'parentheses')!
    expect(paren.share).toBe(1)
  })

  it('stays quiet when the substitute varies', () => {
    const pairs = [
      { before: 'a — b', after: 'a (b)' },
      { before: 'a — b', after: 'a, b' },
      { before: 'a — b', after: 'a although b' },
      { before: 'a — b', after: 'a so that b' },
      { before: 'a — b', after: 'b, which a' },
    ]
    expect(substituteConcentration(pairs).every(c => c.share <= 0.4)).toBe(true)
  })

  it('does not credit a mark the key already had', () => {
    const pairs = [{ before: 'a (already) — b', after: 'a (already), b' }]
    expect(substituteConcentration(pairs).find(c => c.name === 'parentheses')!.n).toBe(0)
  })
})

describe('quoted-run detection is punctuation-blind on both sides', () => {
  it('finds a quote the explanation punctuates differently', () => {
    // The raw-substring version of this returned [] — and every rewrite in
    // this repair is a punctuation change, so it would have found nothing at
    // all on exactly the cases it exists for.
    const option = 'In a single, not-yet-replicated greenhouse trial, plants grew taller.'
    const expl = 'Only the sentence reporting that in a single not yet replicated greenhouse trial the plants grew does both.'
    expect(quotedRuns(option, expl).length).toBeGreaterThan(0)
  })

  it('finds nothing when the explanation does not quote the option', () => {
    expect(quotedRuns('Wholly unrelated wording about otters and kelp forests', 'The answer concerns printing presses.')).toEqual([])
  })
})

// ── the projection cannot silently measure something else ────────────────

describe('the mirrored rule table matches scripts/verify-option-tells.ts', () => {
  const src = readFileSync(resolve(process.cwd(), 'scripts/verify-option-tells.ts'), 'utf8')

  it('every rule name in the verifier has a counterpart here, and vice versa', () => {
    const names = [...src.matchAll(/\{ name: '([^']+)', hit:/g)].map(m => m[1]!)
    const mine = [...TELL_RULES.map(r => r.name), ...ODD_RULES.map(r => r.name)]
    // ODD rules are declared as ['name', fn] tuples in the verifier.
    const oddNames = [...src.matchAll(/\['([^']+)', c =>/g)].map(m => m[1]!)
    expect(new Set([...names, ...oddNames])).toEqual(new Set(mine))
  })

  it('every regex here appears verbatim in the verifier', () => {
    for (const r of [...TELL_RULES, ...ODD_RULES]) {
      if (!r.source) continue
      expect({ rule: r.name, present: src.includes(r.source.source) }).toEqual({ rule: r.name, present: true })
    }
    expect(src).toContain(HEDGE.source)
    expect(src).toContain(ABSOLUTE.source)
    expect(src).toContain(DASH.source)
  })

  it('scores a rule the same way the verifier does', () => {
    // One item, exactly one dashed option, and it is the key: 1/1.
    const s = scoreRule([{ key: 'a — b', choices: ['a — b', 'c', 'd', 'e'] }],
      TELL_RULES.find(r => r.name === 'contains an em dash')!)
    expect(s).toEqual({ name: 'contains an em dash', usable: 1, correct: 1 })
    // Two dashed options: no target, so the item is not usable.
    const t = scoreRule([{ key: 'a — b', choices: ['a — b', 'c — d', 'e', 'f'] }],
      TELL_RULES.find(r => r.name === 'contains an em dash')!)
    expect(t.usable).toBe(0)
  })
})
