#!/usr/bin/env node
// check-production-key-balance.mjs <batch.json> [...]
//
// Reports, for an ACT English batch file:
//   (1) the Kept/Yes rate over items whose OPTION SET carries the
//       Kept/Deleted or Yes/No shape, with its denominator, and
//   (2) the key distribution of sentence-placement items (Point A-D),
//       with its denominator.
//
// It REFUSES (exit 2, no rate printed) on any input it cannot score.
// A rate is never printed over an empty or unreadable population.
//
// Reference: the shipped live ACT English bank runs 11/21 = 52.4% Kept/Yes.

import fs from 'node:fs';

const REFERENCE_LIVE = { hit: 11, n: 21 };

class Refusal extends Error {}
function refuse(msg) { throw new Refusal(msg); }

function readBatch(path) {
  let raw;
  try { raw = fs.readFileSync(path, 'utf8'); }
  catch (e) { refuse(`cannot read ${path}: ${e.code || e.message}`); }
  if (raw.trim() === '') refuse(`${path} is empty`);
  let data;
  try { data = JSON.parse(raw); }
  catch (e) { refuse(`${path} is not valid JSON: ${e.message}`); }
  if (!Array.isArray(data)) refuse(`${path} is not a JSON array of items (got ${data === null ? 'null' : typeof data})`);
  if (data.length === 0) refuse(`${path} contains zero items`);
  data.forEach((it, ix) => {
    if (it === null || typeof it !== 'object' || Array.isArray(it)) refuse(`${path} item ${ix} is not an object`);
    for (const f of ['id', 'choices', 'correct_answer', 'domain']) {
      if (!(f in it)) refuse(`${path} item ${ix} (${it.id ?? 'no id'}) has no "${f}" field`);
    }
    if (!Array.isArray(it.choices) || it.choices.length < 2) refuse(`${path} item ${it.id} has no usable choices array`);
    if (!it.choices.some(c => c === it.correct_answer)) {
      refuse(`${path} item ${it.id}: correct_answer is not one of its choices - the key cannot be located, so nothing here is scorable`);
    }
  });
  return data;
}

const startsWord = (s, w) => new RegExp(`^${w}\\b`, 'i').test(String(s).trim());

function shape(item) {
  const ch = item.choices.map(c => String(c).trim());
  if (ch.every(c => /^Point [A-D]\.?$/.test(c))) return 'placement';
  const kd = ch.every(c => startsWord(c, 'Kept') || startsWord(c, 'Deleted'));
  if (kd && ch.some(c => startsWord(c, 'Kept')) && ch.some(c => startsWord(c, 'Deleted'))) return 'kept-deleted';
  const yn = ch.every(c => startsWord(c, 'Yes') || startsWord(c, 'No'));
  if (yn && ch.some(c => startsWord(c, 'Yes')) && ch.some(c => startsWord(c, 'No'))) return 'yes-no';
  return null;
}

// exact two-sided binomial p against p0 = 0.5
function binomP(k, n) {
  if (n === 0) return null;
  const lg = x => { let s = 0; for (let i = 2; i <= x; i++) s += Math.log(i); return s; };
  const pmf = i => Math.exp(lg(n) - lg(i) - lg(n - i) + n * Math.log(0.5));
  const obs = pmf(k) * (1 + 1e-9);
  let p = 0;
  for (let i = 0; i <= n; i++) if (pmf(i) <= obs) p += pmf(i);
  return Math.min(1, p);
}

function report(path) {
  const items = readBatch(path);
  const scorable = [], placement = [], unscorable = [];
  for (const it of items) {
    const s = shape(it);
    if (s === 'placement') placement.push(it);
    else if (s) scorable.push({ it, s });
    else unscorable.push(it);
  }
  const prod = items.filter(i => String(i.domain).toLowerCase().startsWith('production'));
  if (scorable.length === 0 && placement.length === 0) {
    refuse(`${path}: zero items carry a Kept/Deleted, Yes/No or Point A-D option set - there is nothing here this checker can score`);
  }

  console.log(`\n=== ${path}`);
  console.log(`items ${items.length}   Production of Writing ${prod.length}   unscorable by shape ${unscorable.length}`);

  // --- Kept/Yes stratum
  console.log(`\n  Kept/Yes stratum      scorable ${scorable.length} of ${items.length} items`);
  if (scorable.length === 0) {
    console.log('    NOT MEASURED - 0 items carry the Kept/Deleted or Yes/No shape.');
  } else {
    const hit = scorable.filter(({ it, s }) =>
      s === 'kept-deleted' ? startsWord(it.correct_answer, 'Kept') : startsWord(it.correct_answer, 'Yes')).length;
    const p = binomP(hit, scorable.length);
    console.log(`    keys to Kept/Yes      ${hit} of ${scorable.length} = ${(100 * hit / scorable.length).toFixed(1)}%`
      + `   two-sided binomial p vs 50% = ${p.toFixed(4)}`);
    console.log(`    live bank reference   ${REFERENCE_LIVE.hit} of ${REFERENCE_LIVE.n} = `
      + `${(100 * REFERENCE_LIVE.hit / REFERENCE_LIVE.n).toFixed(1)}%`);
    const bySub = new Map();
    for (const { it, s } of scorable) {
      const k = `${it.subskill ?? '(no subskill)'} [${s}]`;
      const e = bySub.get(k) || { hit: 0, n: 0 };
      e.n++;
      if (s === 'kept-deleted' ? startsWord(it.correct_answer, 'Kept') : startsWord(it.correct_answer, 'Yes')) e.hit++;
      bySub.set(k, e);
    }
    console.log('    by subskill:');
    for (const [k, e] of [...bySub].sort()) console.log(`      ${k.padEnd(42)} ${e.hit} of ${e.n}`);
    for (const { it, s } of scorable) {
      console.log(`      ${it.id.padEnd(16)} ${s.padEnd(13)} ${String(it.correct_answer).slice(0, 58)}`);
    }
  }

  // --- placement stratum
  console.log(`\n  Sentence placement    scorable ${placement.length} of ${items.length} items`);
  if (placement.length === 0) {
    console.log('    NOT MEASURED - 0 items carry a Point A-D option set.');
  } else {
    const dist = { A: 0, B: 0, C: 0, D: 0 };
    for (const it of placement) {
      const m = String(it.correct_answer).trim().match(/^Point ([A-D])\.?$/);
      if (!m) refuse(`${path} item ${it.id}: Point A-D option set but the key "${it.correct_answer}" is not a Point`);
      dist[m[1]]++;
    }
    const n = placement.length;
    console.log(`    keys over ${n} items:  ` + ['A', 'B', 'C', 'D']
      .map(l => `${l}:${dist[l]} (${(100 * dist[l] / n).toFixed(0)}%)`).join('   '));
    const zero = ['A', 'B', 'C', 'D'].filter(l => dist[l] === 0);
    if (zero.length) console.log(`    NEVER THE KEY: ${zero.map(l => 'Point ' + l).join(', ')}   <- free elimination on all ${n}`);
    console.log('    ' + placement.map(it => `${it.id}=${String(it.correct_answer).trim()}`).join('  '));
  }

  if (unscorable.length) {
    console.log(`\n  not scored by this checker (option set is neither shape): `
      + unscorable.filter(i => String(i.domain).toLowerCase().startsWith('production')).map(i => i.id).join(', ') || '(none in Production)');
  }
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('REFUSED: no input file given. usage: check-production-key-balance.mjs <batch.json> [...]');
  process.exit(2);
}
try {
  for (const f of files) report(f);
  console.log('');
} catch (e) {
  if (e instanceof Refusal) { console.error(`\nREFUSED: ${e.message}`); process.exit(2); }
  throw e;
}
