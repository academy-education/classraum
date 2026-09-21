/**
 * seeded-shuffle.mjs — one deterministic, UNBIASED shuffle for every render.
 *
 * WHY THIS EXISTS. On 2026-09-21 the ad-hoc renderers in this directory each
 * carried their own copy of
 *
 *     seed = (seed * 1103515245 + 12345) & 0x7fffffff;  rnd = seed / 0x7fffffff
 *
 * a 31-bit LCG with notoriously poor low-order bits. Used as the source for a
 * Fisher-Yates swap it is measurably biased: over 5,000 four-option shuffles
 * the key landed A 1173 / B 1226 / C 1290 / D 1311, chi-square 9.46 on 3 df
 * (p < 0.05). On one 36-item with-source render it dealt the key to B or C in
 * 26 of 36 items — 72.2% against a 50% expectation — and a grader reported
 * that back as a DEFECT OF THE ITEMS. It was a defect of my renderer.
 *
 * The blind attack was less exposed because `score-oo.mjs` derives its control
 * from the key distribution it actually observes, so a skewed deal RAISES the
 * control and makes the test conservative. The with-source path had no such
 * protection. Either way the fix belongs in one place, not in each script.
 *
 * mulberry32 below passes the same test comfortably. Anything that shuffles
 * options for a render imports this; nothing re-implements it.
 */

/** mulberry32 — small, fast, and good enough that the bias test passes. */
export function rng(seed) {
  let a = (seed >>> 0) || 1
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Fisher-Yates, in place, using `rand`. Returns the array. */
export function shuffleWith(arr, rand) {
  for (let j = arr.length - 1; j > 0; j--) {
    const k = Math.floor(rand() * (j + 1))
    ;[arr[j], arr[k]] = [arr[k], arr[j]]
  }
  return arr
}

/** Chi-square of the key's landing slot over `trials` shuffles of `width`
 *  options. Exported so any caller can assert its own deal, and so the
 *  self-test below is the same code a caller would run. */
export function biasChiSquare(width, trials, seed) {
  const rand = rng(seed)
  const counts = new Array(width).fill(0)
  for (let t = 0; t < trials; t++) {
    const c = Array.from({ length: width }, (_, i) => i)
    shuffleWith(c, rand)
    counts[c.indexOf(0)]++
  }
  const expected = trials / width
  return { counts, chi: counts.reduce((a, n) => a + (n - expected) ** 2 / expected, 0) }
}

const RUN_AS_CLI = process.argv[1] && process.argv[1].endsWith('seeded-shuffle.mjs')
if (RUN_AS_CLI) {
  const CRIT = { 3: 7.81, 4: 9.49 }          // p = 0.05
  let bad = 0
  for (const width of [4, 5]) {
    for (const seed of [1, 40881, 55219, 991733, 123456789]) {
      const { counts, chi } = biasChiSquare(width, 20000, seed)
      const crit = CRIT[width - 1]
      const ok = chi <= crit
      if (!ok) bad++
      console.log(`width ${width} seed ${String(seed).padStart(9)}  chi=${chi.toFixed(2).padStart(6)}  crit=${crit}  ${ok ? 'ok' : 'BIASED'}  ${counts.join('/')}`)
    }
  }
  /* Break-test: the OLD generator must fail the same assertion, or the test
   * is not testing anything. */
  let s = 40881
  const oldRand = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff }
  const counts = new Array(4).fill(0)
  for (let t = 0; t < 20000; t++) { const c = [0, 1, 2, 3]; shuffleWith(c, oldRand); counts[c.indexOf(0)]++ }
  const chiOld = counts.reduce((a, n) => a + (n - 5000) ** 2 / 5000, 0)
  console.log(`\nbreak-test, OLD LCG:   chi=${chiOld.toFixed(2)}  crit=7.81  ${chiOld > 7.81 ? 'FAILS as it must' : 'PASSES - the test is not testing anything'}  ${counts.join('/')}`)
  if (chiOld <= 7.81) { console.error('SELF-TEST INVALID: the old generator passes, so this assertion cannot detect bias'); process.exit(2) }
  if (bad) { console.error(`SELF-TEST FAILED: ${bad} seed/width combinations are biased`); process.exit(2) }
  console.log('\nseeded-shuffle: all seeds unbiased, and the generator it replaces fails the same check.')
}
