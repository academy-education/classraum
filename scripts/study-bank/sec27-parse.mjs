/**
 * sec27-parse.mjs — the option parser of sat-sec-hard-v27 (PREREG-SEC27-2026-10-23.md). COPIED byte-for-byte
 * from sec26-parse.mjs (only these header lines differ), shared by
 * sec27-brief-counts.mjs and sec27-tellsim.mjs so the counts and the cross-item tell check read every
 * option the same way and cannot disagree.
 *
 * MOVED, not rewritten, from sec25-brief-counts.mjs (lines 180-331 of that file, byte-identical apart
 * from `export`): the participle lists, parseItem, possOf, the code features F, dimension, dimKey,
 * sameGrid, FORM/formName and marksOf. Regression-tested in PREREG-SEC27 ("Scripts"): on the frozen
 * v22, v23, v24 and v25 batches, sec27-brief-counts.mjs prints the same per-item classification
 * lines as sec25-brief-counts.mjs.
 */
export const POSS_CLASSES = ['sg', 'sg-poss', 'pl', 'pl-poss']
/* ---------- option parser ---------- */
// NEW v24: the suffix list is cut to -ed/-en; every irregular participle the old
// suffixes caught is in IRREG, and the old list misread shared complement adjectives
// ("silent", "own", "sound", "young", "alone", "solid") as participles.
export const PART_RE = /^\w+(?:ed|en)$/
export const NOT_PART = new Set('own open even often golden wooden woolen sudden green linen oven seven eleven garden kitchen women men children citizen token dozen heaven aspen barren red bed sacred naked wicked rugged ragged jagged crooked kindred hundred need seed speed steed breed creed deed feed weed bleed indeed'.split(' '))
export const IRREG = new Set('shone woven proven swollen molten sewn lain done gone seen born borne worn torn sworn drawn grown known shown thrown blown flown sewn sown mown hewn risen driven written given taken shaken chosen frozen stolen spoken broken woken fallen eaten beaten bitten hidden ridden forgotten gotten begun run sung rung sprung swum drunk sunk shrunk struck stuck hung spun won dug held told sold felt dealt meant kept slept swept wept crept left lost built sent spent bent lent brought bought thought fought sought caught taught made paid laid said read led fed bred fled met set put cut shut hit let spread cast cost hurt burst shed split found bound ground wound stood understood sat lit slid hid bled clung flung swung stung come become overcome'.split(' '))
export const isPart = w => w !== 'been' && w !== 'being' && !NOT_PART.has(w) && (IRREG.has(w) || PART_RE.test(w))
export const ADV = new Set('now still already yet once also then never not ever just always often long soon even again only further first finally evidently rarely seldom thus'.split(' '))
export const isAdv = w => ADV.has(w) || (/ly$/.test(w) && w.length > 4 && !['supply', 'apply', 'reply', 'rely', 'fly', 'ally', 'multiply', 'imply', 'comply', 'family', 'early', 'assembly'].includes(w))
export const MODALS = new Set('will would can could may might must shall should ought'.split(' '))
export const NUM = { is: 'sg', was: 'sg', has: 'sg', does: 'sg', are: 'pl', were: 'pl', have: 'pl', do: 'pl' }
export const PRON = { its: 'sg', it: 'sg', itself: 'sg', their: 'pl', them: 'pl', themselves: 'pl', that: 'sg', those: 'pl' }  // NEW v24: that/those (comparative)
export const toks = s => s.toLowerCase().replace(/[—–]/g, ' ').split(/\s+/).map(w => w.replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, '')).filter(Boolean)

export function parseItem(choices) {
  const raw = choices.map(toks)
  // NEW (v23): pronoun number per option; pronouns removed before the verb parse
  const pron = raw.map(t => { const p = t.filter(w => w in PRON).map(w => PRON[w]); return p.length ? [...new Set(p)].join(',') : null })
  const pronVaries = new Set(pron).size > 1
  const T4 = pronVaries ? raw.map(t => t.filter(w => !(w in PRON))) : raw
  let pre = 0
  while (T4.every(t => t.length > pre + 1 && t[pre] === T4[0][pre])) pre++
  let suf = 0
  const verbish = w => /ing$/.test(w) || isPart(w) || w in NUM || w === 'been' || w === 'being' || w === 'had' || MODALS.has(w)
  while (T4.every(t => t.length > pre + suf + 1 && t[t.length - 1 - suf] === T4[0][T4[0].length - 1 - suf]) && !verbish(T4[0][T4[0].length - 1 - suf])) suf++
  const shared = { pre: T4[0].slice(0, pre), suf: T4[0].slice(T4[0].length - suf) }
  const cores = T4.map(t => t.slice(pre, t.length - suf))
  const singles = new Set(cores.filter(c => c.length === 1).map(c => c[0]))
  const parsed = cores.map((core, ci) => {
    const extras = core.filter(w => isAdv(w))
    const t = core.filter(w => !isAdv(w))
    const out = (code, number, used) => ({ code, number, extras: extras.concat(t.slice(used)), core, pron: pron[ci] })
    if (t.length === 0) return out('?', null, 0)
    const [w0, w1, w2] = t
    if (w0 === 'had') return out('had', null, t.length)
    if (w0 === 'did') return out('did', null, t.length)
    if (MODALS.has(w0)) return out('modal', null, t.length)
    if (w0 === 'is' || w0 === 'are' || w0 === 'was' || w0 === 'were') {
      const pres = w0 === 'is' || w0 === 'are'
      if (!w1) return out(pres ? 'j' : 'i', NUM[w0], 1)
      if (w1 === 'being' && w2 && isPart(w2)) return out(pres ? 'k' : 'l', NUM[w0], 3)
      if (/ing$/.test(w1) && w1 !== 'being') return out(pres ? 'b' : 'g', NUM[w0], 2)
      if (isPart(w1)) return out(pres ? 'c' : 'h', NUM[w0], 2)
      return out(pres ? 'j' : 'i', NUM[w0], 1)
    }
    if (w0 === 'has' || w0 === 'have') {
      if (!w1) return out('n', NUM[w0], 1)
      if (w1 === 'been') {
        if (!w2) return out('r', NUM[w0], 2)
        if (/ing$/.test(w2) && w2 !== 'being') return out('f', NUM[w0], 3)
        if (isPart(w2)) return out('e', NUM[w0], 3)
        return out('r', NUM[w0], 2)
      }
      if (isPart(w1)) return out('d', NUM[w0], 2)
      return out('n', NUM[w0], 1)
    }
    if (w0 === 'does' || w0 === 'do') return out('m', NUM[w0], w1 && !isPart(w1) && !/ing$/.test(w1) ? 2 : 1)
    if (/ing$/.test(w0)) return out('?', null, 0)
    const base = [w0.replace(/ies$/, 'y'), w0.replace(/es$/, ''), w0.replace(/s$/, '')]
    if (/s$/.test(w0) && !/ss$/.test(w0) && base.some(b => b !== w0 && singles.has(b))) return out('a', 'sg', 1)
    if ([w0 + 's', w0 + 'es', w0.replace(/y$/, 'ies')].some(x => x !== w0 && singles.has(x))) return out('a', 'pl', 1)
    if (/ed$/.test(w0)) return out('p', null, 1)
    if (/s$/.test(w0) && !/ss$/.test(w0)) return out('a', 'sg', 1)
    return out('a', 'pl', 1)
  })
  return { shared, parsed, pronVaries }
}

/* NEW (v25): possessive-noun items. Exactly one word varies across the four options and
 * it takes the four forms {X, X's, Xs, Xs'} of one regular noun (curly apostrophes
 * normalised). Returns the class of each option, or null if the item is not one. */
export function possOf(choices) {
  const T = choices.map(c => c.replace(/[’‘]/g, "'").trim().split(/\s+/))
  if (new Set(T.map(t => t.length)).size !== 1) return null
  const diff = T[0].map((_, i) => i).filter(i => new Set(T.map(t => t[i].toLowerCase())).size > 1)
  if (diff.length !== 1) return null
  const forms = T.map(t => t[diff[0]].replace(/[.,;:!?"]+$/, ''))
  const plain = new Set(forms.filter(f => !f.includes("'")).map(f => f.toLowerCase()))
  const cls = forms.map(f => {
    const w = f.toLowerCase()
    if (/s'$/.test(w)) return { c: 'pl-poss', base: w.slice(0, -2) }
    if (/'s$/.test(w)) return { c: 'sg-poss', base: w.slice(0, -2) }
    if (/s$/.test(w) && plain.has(w.slice(0, -1))) return { c: 'pl', base: w.slice(0, -1) }
    return { c: 'sg', base: w }
  })
  if (new Set(cls.map(x => x.base)).size !== 1) return null
  if (!POSS_CLASSES.every(c => cls.some(x => x.c === c))) return null
  return cls.map(x => x.c)
}

/* code features for the 2x2 dimension */
export const F = {
  a: ['pres', 'act', 'simp'], b: ['pres', 'act', 'prog'], c: ['pres', 'pass', 'simp'], d: ['perf', 'act', 'simp'],
  e: ['perf', 'pass', 'simp'], f: ['perf', 'act', 'prog'], g: ['past', 'act', 'prog'], h: ['past', 'pass', 'simp'],
  i: ['past', 'act', 'simp'], j: ['pres', 'act', 'simp'], k: ['pres', 'pass', 'prog'], l: ['past', 'pass', 'prog'],
  m: ['pres', 'aux', 'simp'], n: ['pres', 'aux', 'simp'], r: ['perf', 'act', 'simp'],
}
export const PASSIVE = new Set(['c', 'e', 'h', 'k', 'l'])
export const PERFECT = new Set(['d', 'e', 'f', 'r'])
export function dimension(c1, c2) {
  const [x, y] = [F[c1], F[c2]]
  if (['m', 'n'].includes(c1) || ['m', 'n'].includes(c2)) return 'aux'
  if (PASSIVE.has(c1) !== PASSIVE.has(c2)) return 'voice'
  if (PERFECT.has(c1) !== PERFECT.has(c2)) return 'aspect'
  if (x[0] !== y[0]) return 'tense'
  if (x[2] !== y[2]) return 'progressive'
  return '?'
}
export function dimKey(dim, code) {
  return { voice: PASSIVE.has(code) ? 'passive' : 'active', aspect: PERFECT.has(code) ? 'perfect' : 'non-perfect',
    tense: F[code]?.[0] === 'past' ? 'past' : 'present', progressive: F[code]?.[2] === 'prog' ? 'progressive' : 'simple',
    aux: code === 'm' ? 'do' : code === 'n' ? 'have' : 'be' }[dim] ?? '?'
}
export const sameGrid = (g1, g2) => g1.split('|').sort().join('|') === g2.split('|').sort().join('|')
export const FORM = { a: ['V-s', 'V'], b: ['is V-ing', 'are V-ing'], c: ['is V-en', 'are V-en'], d: ['has V-en', 'have V-en'], e: ['has been V-en', 'have been V-en'], f: ['has been V-ing', 'have been V-ing'], g: ['was V-ing', 'were V-ing'], h: ['was V-en', 'were V-en'], i: ['was', 'were'], j: ['is', 'are'], k: ['is being V-en', 'are being V-en'], l: ['was being V-en', 'were being V-en'], m: ['does', 'do'], n: ['has', 'have'], r: ['has been C', 'have been C'] }
export const formName = (code, num, pron) => (FORM[code] ? FORM[code][num === 'pl' ? 1 : 0] : `${code}${num ? ':' + num : ''}`) + (pron ? ` +${pron} pronoun` : '')

/* ---------- boundary marks ---------- */
export const STRONG = /[;:—–.]/
// The key mark is what the option ADDS: marks present in all four options the same
// number of times (e.g. the commas inside a list every option carries) are discounted.
// NEW v24: "?" is a mark ("question"); each added single mark records the number of
// words before it, and a single mark sitting after a different word than the
// reference position is named "<mark>@shifted" (a misplaced mark). The reference is
// the key's own mark position, or, for a no-mark key, the most common position among
// the marked options.
export const MARK_NAME = { ',': 'comma', ';': 'semicolon', ':': 'colon', '—': 'dash', '.': 'period', '?': 'question' }
export function marksOf(choices, k) {
  const seqs = choices.map(o => {
    const out = []; let w = 0
    for (const t of o.replace(/–/g, '—').match(/[A-Za-z0-9']+|[,;:—.?]/g) || []) { if (/[,;:—.?]/.test(t)) out.push({ c: t, at: w }); else w++ }
    return out
  })
  const common = {}
  for (const c of new Set(seqs.flat().map(x => x.c))) common[c] = Math.min(...seqs.map(m => m.filter(x => x.c === c).length))
  const res = seqs.map(m => { const left = { ...common }, r = []; for (const x of m) { if (left[x.c] > 0) left[x.c]--; else r.push(x) } return r })
  const single = res.map(r => r.length === 1 ? r[0].at : null)
  let ref = single[k]
  if (ref == null) {
    const cnt = {}; single.forEach((a, i) => { if (a != null && i !== k) cnt[a] = (cnt[a] ?? 0) + 1 })
    const best = Object.entries(cnt).sort((x, y) => y[1] - x[1] || x[0] - y[0])[0]
    ref = best ? Number(best[0]) : null
  }
  return res.map(r => {
    if (!r.length) return 'none'
    if (r.length === 2 && r[0].c === '—' && r[1].c === '—') return 'dash pair'
    if (r.length === 2 && r[0].c === ',' && r[1].c === ',') return 'comma pair'
    if (r.length === 1) return MARK_NAME[r[0].c] + (ref != null && r[0].at !== ref ? '@shifted' : '')
    return `mixed ${r.map(x => x.c).join('')}`
  })
}
export const STRONG_RE = STRONG
