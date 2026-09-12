#!/usr/bin/env node
// build-act-english-r2.mjs [--selftest]
//
// Builds act-english-v5r2.batch.json / act-english-v6r2.batch.json from the
// v5r / v6r inputs by patching ONLY Production of Writing items.
//
// Asserts, and refuses to write unless:
//   - item count, order, ids, passage grouping and every `domain` are unchanged
//   - every Conventions of Standard English and Knowledge of Language item is
//     EQUAL AS AN OBJECT to its v5r/v6r input, except that in a passage group
//     whose passage text is deliberately edited (declared below, one group in
//     v6 only) equality is required on every field except `passage`, AND every
//     string that item quotes must still occur verbatim in the new passage.
//   - every patched item's key is one of its own choices
//
// --selftest corrupts each guarded property in turn and requires the assertion
// to fail. A guard that has not been made to fail is not evidence.

import fs from 'node:fs';
import path from 'node:path';

const DIR = path.dirname(new URL(import.meta.url).pathname);
const PROTECTED = ['Conventions of Standard English', 'Knowledge of Language'];

// ---------------------------------------------------------------- passage edits
// Declared, exact, and the ONLY passage text allowed to differ.
const PASSAGE_EDITS = {
  'act-english-v6r.batch.json': [{
    passage_id: 'en6-p1',
    find: 'and she kept a thermometer clipped to her apron. On a strip of masking tape',
    replace: 'and she kept a thermometer clipped to her apron. Thermometers of that type have been sold for kitchen use since the 1970s. On a strip of masking tape',
  }],
};

// ---------------------------------------------------------------- item patches
const PATCHES = {
'act-english-v5r.batch.json': {

'ACT-EN5-P2-Q02': {
  prompt: 'The writer is considering adding the following sentence after "It holds water." in paragraph 1: "The tower has been repainted twice in the last forty years." Should the writer make this addition?',
  choices: [
    'No, because the essay elsewhere states that the town\'s water comes from three wells rather than from the tower.',
    'Yes, because it gives a sense of how long the town has looked after the one part of the system residents can see.',
    'Yes, because it explains why the tower is the least complicated part of the system.',
    'No, because the opening sentence has already reported the two repaintings, so the addition only delays the turn to the arrangements nobody in town could describe.',
  ],
  correct_answer: 'No, because the opening sentence has already reported the two repaintings, so the addition only delays the turn to the arrangements nobody in town could describe.',
  explanation: 'The paragraph\'s first sentence already calls the tower "a white cylinder on four legs that has been repainted twice in forty years," so the proposed sentence returns the reader to a fact the essay has given and holds up the move from the visible part to the arrangements almost nobody could describe. How long the town has maintained the tower is therefore not new information; a repainting schedule says nothing about how complicated the tower is; and the wells, introduced in the next paragraph, contradict nothing about what the tower holds.',
},

'ACT-EN5-P3-Q10': {
  prompt: 'Consider the essay as a whole. Suppose the writer\'s goal had been to describe how the production staff of a regional theater work together. Would this essay accomplish that goal?',
  choices: [
    'Yes, because it shows Ramanathan taking instructions from the director and calling down to someone standing in the beam while he focuses.',
    'Yes, because it describes the technical rehearsals at which the whole company is present.',
    'No, because it keeps to one person\'s work, and the only other people in it are a director quoted for a phrase and an unnamed helper in the beam.',
    'No, because it never says which theater Ramanathan works at.',
  ],
  correct_answer: 'No, because it keeps to one person\'s work, and the only other people in it are a director quoted for a phrase and an unnamed helper in the beam.',
  explanation: 'The essay is a portrait of one technician: his vocabulary, his legal pad, his two weeks on a ladder, and the photograph he keeps. The director supplies a single remark that Ramanathan then has to translate, and the person standing in the beam is not even named, so neither amounts to an account of a staff working together. The technical rehearsals are named as where he writes cues rather than described, and the theater is identified as the Fenner Playhouse in the first sentence.',
},

'ACT-EN5-P5-Q04': {
  prompt: 'The writer is considering adding the following sentence to paragraph 2: "That comparison is what the eleven riders had spent the spring saying to one another." The sentence would most logically be placed at which point?',
  correct_answer: 'Point D',
  explanation: '"That comparison" can only refer to the two halves set against each other in "at the old company a rider handed over half of every fare; at the co-op a busy rider handed over almost nothing," so the sentence has to follow that sentence, and placed there it closes the paragraph by carrying the arithmetic back to the eleven riders who walked out in the spring of 1994. At Points A, B, and C no comparison has been made yet and the phrase has nothing to refer to.',
},

'ACT-EN5-P5-Q10': {
  prompt: 'Consider the essay as a whole. Suppose the writer\'s goal had been to describe the daily work of a bicycle courier. Would this essay accomplish that goal?',
  choices: [
    'No, because the essay is taken up with the fee, the bylaws, the rota, and the hardship fund, and a rider\'s actual day appears only as a short list of injuries.',
    'Yes, because it lists the hazards riders faced and the winters in which a third of the roster left.',
    'No, because the essay never says what the couriers carried or for whom.',
    'Yes, because it follows the riders from the walkout in 1994 to the co-op\'s closing in 2014.',
  ],
  correct_answer: 'No, because the essay is taken up with the fee, the bylaws, the rota, and the hardship fund, and a rider\'s actual day appears only as a short list of injuries.',
  explanation: 'Paragraph 2 is the money, paragraph 3 is the governing, and paragraph 5 is the decline; the only sentences about a shift are "Riders were hit by cars, doored, and ticketed" and the winter attrition beside it. A list of hazards is part of that same paragraph rather than a description of the work, a chronology of the organization is not a day\'s work either, and the essay does say what was carried, ending on blood samples ferried between two hospitals.',
},

},
'act-english-v6r.batch.json': {

'ACT-EN6-P1-Q09': {
  prompt: 'The writer is considering deleting the sentence "Thermometers of that type have been sold for kitchen use since the 1970s." from paragraph 3. Should it be kept or deleted?',
  choices: [
    'Kept, because it establishes that the tool Marisol relies on is a standard one rather than something she improvised.',
    'Kept, because it explains why Marisol trusted the thermometer rather than the clock.',
    'Deleted, because the essay has already described the thermometer clipped to her apron in an earlier paragraph.',
    'Deleted, because the paragraph is about what Marisol did with her measurements, and when the instrument reached the market is a fact the essay never uses.',
  ],
  correct_answer: 'Deleted, because the paragraph is about what Marisol did with her measurements, and when the instrument reached the market is a fact the essay never uses.',
  explanation: 'Paragraph 3 moves from how Marisol measured to why the numbers mattered — dough cannot read a clock — and the decade a thermometer became a retail item does nothing for that line of thought and is never picked up again. Whether the tool is standard or improvised is a question the essay never raises; the sentence says nothing about clocks; and the thermometer is introduced in the sentence immediately before this one, in the same paragraph, not an earlier one.',
},

'ACT-EN6-P2-Q10': {
  prompt: 'Considering the essay as a whole, suppose the park had asked the writer for a brochure explaining how the tides that create the pools work. Would this essay meet that request?',
  choices: [
    'No, because it tells a visitor what the tide leaves behind and how to behave on the shelf, but never what makes the water rise and fall.',
    'No, because the essay never says how long the pools stay uncovered.',
    'Yes, because it explains that the bands form as the tide reaches different levels for different lengths of time.',
    'Yes, because it reports that the sea leaves part of itself behind twice a day and that the shelf is covered again within the hour.',
  ],
  correct_answer: 'No, because it tells a visitor what the tide leaves behind and how to behave on the shelf, but never what makes the water rise and fall.',
  explanation: 'The brochure opens with water that "cannot drain away," works through the bands and the ochre sea star, and closes with three instructions; nowhere does it name a cause of the tide or describe how one works. The banding explains what the tide\'s timing does to the animals rather than what produces the tide, and "twice a day" and "within the hour" report the schedule without accounting for it. The essay does say the basins hold water for a few hours at a time.',
},

'ACT-EN6-P3-Q10': {
  prompt: 'Considering the essay as a whole, suppose the writer had intended to explain how a person becomes an American Sign Language interpreter. Would the essay accomplish that purpose?',
  choices: [
    'Yes, because it describes the twenty hours of preparation Ruiz puts into a two-hour set.',
    'Yes, because it reports that Ruiz studies a set list for a week before a show.',
    'No, because it follows Ruiz through one night\'s work and never mentions training, certification, or how she entered the field.',
    'No, because it never says what an American Sign Language interpreter actually does.',
  ],
  correct_answer: 'No, because it follows Ruiz through one night\'s work and never mentions training, certification, or how she entered the field.',
  explanation: 'Everything the profile supplies is about the practice of the job — the advance reading, the choice between fingerspelling a name and giving it a sign, where in the space a character stands, the reading of the platform — and none of it concerns how a person qualifies to do it. Preparing for one set, whether over twenty hours or a week, is part of doing the work rather than of entering it, and the essay defines the job plainly in its first paragraph.',
},

'ACT-EN6-P4-Q08': {
  prompt: 'The writer wants to add the sentence "That distinction, between the record and the honor, is the whole of the case." to paragraph 2. It would most logically be placed at which point: Point A, Point B, Point C, or Point D?',
  correct_answer: 'Point D',
  explanation: 'The sentence names two things at once, so both have to have appeared before it: the record, which the supporters did not ask to have the land company erased from, and the honor, which they asked to have spent on someone else. At Point A neither has been introduced, at Point B only the claim about daily repetition has, and at Point C the record has been named but the honor has not. Only at Point D are both behind it, and there it closes the paragraph on the distinction the paragraph has been building.',
},

'ACT-EN6-P5-Q09': {
  prompt: 'The writer is considering adding the following sentence after "Commercial stations sold audiences to advertisers." in paragraph 3: "The first commercial radio advertisement in the United States was broadcast in 1922." Should the writer make this addition?',
  choices: [
    'Yes, because it establishes how long the practice KMRW refused had been in place.',
    'Yes, because it explains why commercial stations were able to outspend a station like KMRW.',
    'No, because paragraph 1 has already given the year in which the station\'s founders raised their first money.',
    'No, because it pushes a date the essay never returns to between the two halves of the contrast the paragraph is drawing.',
  ],
  correct_answer: 'No, because it pushes a date the essay never returns to between the two halves of the contrast the paragraph is drawing.',
  explanation: 'The paragraph sets "Commercial stations sold audiences to advertisers" directly against "KMRW sold nothing; it asked," and the two sentences have to stand next to each other for the second to have anything to negate. How old the practice of advertising is never comes up again, nothing in the essay concerns the relative budgets of commercial stations, and the 1974 chili supper in paragraph 1 is about KMRW\'s own funding rather than about advertising, so it does not make a 1922 broadcast redundant.',
},

},
};

// ---------------------------------------------------------------- build
function build(inName, outName, { corrupt } = {}) {
  const inPath = path.join(DIR, inName);
  const src = JSON.parse(fs.readFileSync(inPath, 'utf8'));
  const patches = PATCHES[inName];
  const edits = PASSAGE_EDITS[inName] || [];
  const editedGroups = new Set(edits.map(e => e.passage_id));

  const out = src.map(it => {
    const copy = JSON.parse(JSON.stringify(it));
    for (const e of edits) {
      if (copy.passage_id !== e.passage_id) continue;
      const n = copy.passage.split(e.find).length - 1;
      if (n !== 1) fail(`${inName} ${copy.id}: passage edit anchor occurs ${n} times, expected exactly 1`);
      copy.passage = copy.passage.replace(e.find, e.replace);
    }
    if (patches[copy.id]) Object.assign(copy, patches[copy.id]);
    return copy;
  });

  const seen = new Set(out.map(i => i.id));
  for (const id of Object.keys(patches)) if (!seen.has(id)) fail(`${inName}: patch targets unknown id ${id}`);

  if (corrupt) corrupt(out);
  assert(inName, src, out, editedGroups);
  fs.writeFileSync(path.join(DIR, outName), JSON.stringify(out, null, 2) + '\n');
  return out;
}

class Fail extends Error {}
function fail(m) { throw new Fail(m); }

function assert(inName, src, out, editedGroups) {
  if (out.length !== src.length) fail(`${inName}: item count ${out.length} != ${src.length}`);

  const groups = {};
  out.forEach((a, ix) => {
    const b = src[ix];
    if (a.id !== b.id) fail(`${inName}: item ${ix} id changed ${b.id} -> ${a.id}`);
    if (a.passage_id !== b.passage_id) fail(`${inName}: ${a.id} passage_id changed`);
    if (a.domain !== b.domain) fail(`${inName}: ${a.id} domain changed "${b.domain}" -> "${a.domain}"`);
    groups[a.passage_id] = (groups[a.passage_id] || 0) + 1;

    if (!Array.isArray(a.choices) || !a.choices.includes(a.correct_answer)) {
      fail(`${inName}: ${a.id} correct_answer is not one of its choices`);
    }
    if (new Set(a.choices).size !== a.choices.length) fail(`${inName}: ${a.id} has duplicate choices`);

    if (!PROTECTED.includes(a.domain)) return;

    // --- the protected-stratum guard
    const allowPassage = editedGroups.has(a.passage_id);
    const fields = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const f of fields) {
      if (f === 'passage' && allowPassage) continue;
      if (JSON.stringify(a[f]) !== JSON.stringify(b[f])) {
        fail(`${inName}: PROTECTED item ${a.id} (${a.domain}) field "${f}" differs from its input`);
      }
    }
    if (allowPassage) {
      // everything the item quotes must survive the passage edit verbatim
      const quoted = [...String(b.prompt).matchAll(/"([^"]{8,})"/g)].map(m => m[1]);
      for (const q of quoted) {
        if (!a.passage.includes(q)) {
          fail(`${inName}: PROTECTED item ${a.id} quotes "${q.slice(0, 40)}..." which the passage edit destroyed`);
        }
      }
      if (a.passage === b.passage) fail(`${inName}: ${a.id} is in a declared passage-edit group but its passage did not change`);
    }
  });

  const sizes = Object.values(groups);
  if (sizes.length !== 5 || sizes.some(n => n !== 10)) fail(`${inName}: grouping is ${JSON.stringify(groups)}, expected 5 x 10`);

  const dom = {};
  for (const i of out) dom[i.domain] = (dom[i.domain] || 0) + 1;
  const want = { 'Conventions of Standard English': 27, 'Production of Writing': 15, 'Knowledge of Language': 8 };
  for (const [k, v] of Object.entries(want)) if (dom[k] !== v) fail(`${inName}: domain ${k} is ${dom[k]}, expected ${v}`);
}

// ---------------------------------------------------------------- selftest
const CORRUPTIONS = [
  ['a Conventions item’s choices are edited', o => { o.find(i => i.domain === PROTECTED[0]).choices[0] = 'tampered'; }],
  ['a Conventions item’s key is edited', o => { const i = o.find(x => x.domain === PROTECTED[0]); i.correct_answer = i.choices.find(c => c !== i.correct_answer); }],
  ['a Knowledge item’s explanation is edited', o => { o.find(i => i.domain === PROTECTED[1]).explanation += ' x'; }],
  ['a Knowledge item gains a field', o => { o.find(i => i.domain === PROTECTED[1]).note = 'x'; }],
  ['a Conventions item loses a field', o => { delete o.find(i => i.domain === PROTECTED[0]).subskill; }],
  ['a domain is changed', o => { o.find(i => i.domain === 'Production of Writing').domain = PROTECTED[0]; }],
  ['an item is dropped', o => { o.splice(4, 1); }],
  ['an item is reordered', o => { const t = o[0]; o[0] = o[1]; o[1] = t; }],
  ['a passage group loses an item', o => { const g = o[0].passage_id; const ix = o.findIndex(i => i.passage_id === g); o[ix].passage_id = o[49].passage_id; }],
  ['a patched key is not among its choices', o => { o.find(i => i.domain === 'Production of Writing').correct_answer = 'nope'; }],
  ['an unprotected passage is edited', o => { const i = o.find(x => x.passage_id.endsWith('p4')); i.passage = i.passage + ' tampered'; }],
  ['a protected item’s quoted string is destroyed by the passage edit', o => {
    for (const i of o) if (i.passage_id === 'en6-p1') i.passage = i.passage.replace('A cold kitchen meant a slow rise', 'A cool kitchen meant a slow rise');
  }, 'act-english-v6r.batch.json'],
];

function selftest() {
  let bad = 0;
  for (const file of Object.keys(PATCHES)) {
    for (const [name, corrupt, onlyFile] of CORRUPTIONS) {
      if (onlyFile && onlyFile !== file) { console.log(`  n/a   ${file.padEnd(28)} ${name} (no declared passage edit in this file)`); continue; }
      let threw = null;
      const tmp = file.replace('r.batch.json', 'r2.SELFTEST.json');
      try { build(file, tmp, { corrupt }); } catch (e) { threw = e; }
      try { fs.unlinkSync(path.join(DIR, tmp)); } catch {}
      if (threw instanceof Fail) {
        console.log(`  PASS  ${file.padEnd(28)} caught: ${name}\n           -> ${threw.message}`);
      } else if (threw) {
        console.log(`  PASS* ${file.padEnd(28)} caught (by a crash): ${name} -> ${threw.message}`);
      } else {
        console.log(`  FAIL  ${file.padEnd(28)} NOT caught: ${name}`);
        bad++;
      }
    }
  }
  if (bad) { console.error(`\n${bad} corruption(s) slipped through the assertion. The guard is not evidence.`); process.exit(1); }
  console.log('\nall corruptions caught.');
}

// ---------------------------------------------------------------- main
try {
  if (process.argv.includes('--selftest')) {
    console.log('break-testing the protected-stratum assertion:');
    selftest();
  } else {
    for (const [inN, outN] of [
      ['act-english-v5r.batch.json', 'act-english-v5r2.batch.json'],
      ['act-english-v6r.batch.json', 'act-english-v6r2.batch.json'],
    ]) {
      const o = build(inN, outN);
      console.log(`wrote ${outN}  (${o.length} items, ${Object.keys(PATCHES[inN]).length} patched)`);
    }
  }
} catch (e) {
  if (e instanceof Fail) { console.error(`ASSERTION FAILED: ${e.message}`); process.exit(1); }
  throw e;
}
